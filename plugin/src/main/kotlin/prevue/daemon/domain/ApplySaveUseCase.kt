package prevue.daemon.domain

import prevue.daemon.entity.Phrase
import java.io.File
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.SaveTiming
import prevue.daemon.domain.model.VacantTab
import prevue.daemon.domain.port.SourceChange
import prevue.daemon.domain.policy.ExpectActual
import prevue.daemon.domain.policy.StaleReasons
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.Lines
import prevue.daemon.domain.runtime.LiteralPatches
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.ResourcePatches
import prevue.daemon.domain.runtime.StaleCallers
import prevue.daemon.domain.runtime.Tabs
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.domain.runtime.WorkspaceEditor

class ApplySaveUseCase(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val modules: StaleCallers,
    private val literals: LiteralPatches,
    private val resources: ResourcePatches,
    private val live: LiveShot,
    private val fillBoard: FillBoardUseCase,
    private val tabs: Tabs,
) {
    private data class Save(
        val ed: WorkspaceEditor, val t: Long, val by: String, val change: SourceChange?, val valuesSeen: Map<String, Long>,
        val texts: Map<String, String?> = emptyMap(),
    ) {
        val timing = change?.let { SaveTiming(detectMs = it.firedMs - it.mtimeMs, waitMs = (t - it.firedNs) / 1_000_000) }
        val since = change?.mtimeMs ?: System.currentTimeMillis()
    }

    suspend operator fun invoke(asked: List<File>, by: String, change: SourceChange? = null): ReloadResult = ws.saving { ed ->
        val t = System.nanoTime()
        val values = asked.filter(ResourcePatches::isValues)
        val valuesSeen = values.associate { it.canonicalPath to it.lastModified() }
        val r = if (values.isEmpty()) null else resources.apply(values)
        r?.stale?.let { markResourcesStale(ed, values, it) }
        val shown = ws.now
        val p = (shown.board?.focusCard?.spec ?: shown.current)?.let(shown::sized)
            ?: return@saving revive(ed, asked - values.toSet(), valuesSeen, by, change) ?: nothingShown(ed, valuesSeen)
        val save = Save(ed, t, by, change, valuesSeen)
        if (r != null && values.size == asked.size) return@saving applyValues(p, r, values, save)
        val files = (asked - values.toSet()).ifEmpty { listOfNotNull(ws.now.current?.file) }
        require(files.isNotEmpty()) { "files가 없고 현재 프리뷰에 파일도 없다" }
        val seenNow = files.associate { it.canonicalPath to it.lastModified() }
        val texts = literals.read(files)
        val multiplatform = files.filter { f -> (texts[f.absolutePath] ?: runCatching { f.readText() }.getOrNull())?.let(ExpectActual::declares) == true }
        if (multiplatform.isNotEmpty()) return@saving needsGradleBuild(ed, multiplatform, seenNow + valuesSeen)
        val coded = save.copy(texts = texts)
        val patched = if (change == null) null else applyLiterals(p, files, texts, seenNow, r?.compile != null, coded)
        patched ?: compileAndRender(p, files, texts, coded)
    }

    private fun needsGradleBuild(ed: WorkspaceEditor, files: List<File>, seen: Map<String, Long>): ReloadResult {
        val why = StaleReasons.expectActual(files)
        ed.markStale(StaleReasons.BUILD, why)
        ed.markCompiled(seen)
        return ReloadResult.NeedsGradleBuild(files, why.what, ws.now.stale)
    }

    private fun nothingShown(ed: WorkspaceEditor, valuesSeen: Map<String, Long>): ReloadResult {
        ed.markCompiled(valuesSeen)
        return ReloadResult.NothingShown
    }

    private suspend fun applyValues(p: PreviewSpec, r: ResourcePatches.Outcome, values: List<File>, save: Save): ReloadResult {
        if (r.compile == null) {
            if (r.stale != null) {
                save.ed.markCompiled(save.valuesSeen)
                return ReloadResult.ResourcesStale(values, r.stale, ws.now.stale)
            }
            if (save.change != null && !failing()) {
                save.ed.markCompiled(save.valuesSeen)
                return ReloadResult.Unchanged(values)
            }
        }
        return render(p, r.compile, values, save.valuesSeen, save, repair = false)
    }

    private suspend fun applyLiterals(
        p: PreviewSpec, files: List<File>, texts: Map<String, String?>, seenNow: Map<String, Long>, valuesPatched: Boolean, save: Save,
    ): ReloadResult? = when (val o = literals.tryApply(texts, patch = !ws.now.interactive, same = !failing() && !valuesPatched)) {
        LiteralPatches.Outcome.Same -> {
            save.ed.markCompiled(seenNow + save.valuesSeen)
            ReloadResult.Unchanged(files)
        }
        is LiteralPatches.Outcome.Patched -> render(p, o.compile, files, seenNow + save.valuesSeen, save, repair = false)
        is LiteralPatches.Outcome.Compile -> {
            if (!o.routine) println("[prevue] 리터럴 빠른 경로 아님(${files.joinToString { it.name }}): ${o.why}")
            null
        }
    }

    private suspend fun compileAndRender(p: PreviewSpec, files: List<File>, texts: Map<String, String?>, save: Save): ReloadResult {
        val ed = save.ed
        live.compiling(ed, files, save.by)
        val batch = modules.compileWithNew(ed, files, texts)
        val seen = batch.seen + save.valuesSeen
        if (!batch.result.ok) return compileFailed(p, batch, seen, save)
        ed.update { it.copy(stale = it.stale - StaleReasons.COMPILE, lastCompileFailure = null) }
        engine.codeChanged()
        if (vacateIfPreviewLost(ed, files, seen)) return ReloadResult.NothingShown
        val reread = tabs.reread(ed, p)
        return render(reread, batch.result, batch.files, seen, save, repair = true)
    }

    private fun compileFailed(p: PreviewSpec, batch: StaleCallers.Batch, seen: Map<String, Long>, save: Save): ReloadResult {
        val c = batch.result
        save.ed.markStale(StaleReasons.COMPILE, StaleReasons.compileFailed(batch.files, c.messages, c.hint))
        val ms = (System.nanoTime() - save.t) / 1_000_000
        val failed = ReloadResult.CompileFailed(p, c, ws.now.stale, ms, save.by, save.timing, Lines.of(batch.files, save.texts))
        live.failed(save.ed, failed, recordLast = true)
        save.ed.markCompiled(seen)
        return failed
    }

    private fun vacateIfPreviewLost(ed: WorkspaceEditor, files: List<File>, seen: Map<String, Long>): Boolean {
        val tab = ws.now.activeTabOrNull() ?: return false
        val why = tab.file?.takeIf { f -> files.any { it.canonicalPath == f.canonicalPath } }
            ?.let(tabs::vacancy) ?: return false
        ed.markHiddenTabsStale()
        tabs.markVacant(ed, tab, why)
        ed.markCompiled(seen)
        return true
    }

    private suspend fun revive(ed: WorkspaceEditor, code: List<File>, valuesSeen: Map<String, Long>, by: String, change: SourceChange?): ReloadResult? {
        val tab = ws.now.activeTabOrNull()?.takeIf { it.vacant != null } ?: return null
        val files = code.ifEmpty { listOfNotNull(tab.file) }.filter { it.isFile }
        if (files.isNotEmpty()) {
            live.compiling(ed, files, by)
            val batch = modules.compileWithNew(ed, files)
            if (!batch.result.ok) {
                val why = StaleReasons.compileFailed(batch.files, batch.result.messages, batch.result.hint)
                ed.update { it.copy(stale = it.stale + (StaleReasons.COMPILE to why), lastCompileFailure = null) }
                ed.markCompiled(batch.seen + valuesSeen)
                return ReloadResult.NothingShown
            }
            ed.markStale(StaleReasons.COMPILE, null)
            ed.markCompiled(batch.seen + valuesSeen)
            engine.codeChanged()
            ed.markHiddenTabsStale()
        }
        val f = tab.file ?: return ReloadResult.NothingShown
        if (tabs.vacancy(f) != null) return ReloadResult.NothingShown
        return try { ReloadResult.Rendered(tabs.activate(ed, tab.key, null, emptyMap(), by, change?.mtimeMs ?: System.currentTimeMillis())) }
               catch (_: VacantTab) { ReloadResult.NothingShown }
    }

    private suspend fun render(p: PreviewSpec, c: CompileResult?, files: List<File>, seen: Map<String, Long>, save: Save, repair: Boolean): ReloadResult {
        val ed = save.ed
        ed.updateBoard { it.advance() }
        ed.markHiddenTabsStale()
        ed.markCompiled(seen)
        live.rendering(ed, p, save.by)
        live.dropPostures(ed)
        val shown = engine.show(p, ws.now.interactive)
        val out = if (repair) modules.repair(ed, shown, p, files) else shown
        val kept = live.keepPosture(out)
        val r = live.finish(ed, out, c, save.t, save.by) {
            it.copy(
                timing = save.timing, saveToScreenMs = save.change?.let { ch -> System.currentTimeMillis() - ch.mtimeMs },
                startedAtMs = save.since, lines = c?.let { Lines.of(it.files.map(::File), save.texts) },
            )
        }
        ed.update { it.copy(current = p) }
        live.recordFocus(ed, r.shot)
        live.seedPostures(ed, kept, keep = false)
        fillBoard(save.by, save.since)
        return ReloadResult.Rendered(r)
    }

    private fun markResourcesStale(ed: WorkspaceEditor, files: List<File>, why: Phrase) {
        val next = StaleReasons.resources(files, ws.now.current?.file, why)
        val prev = ws.now.stale[StaleReasons.RESOURCES]
        ed.markStale(StaleReasons.RESOURCES, prev?.let { next.copy(files = (it.files + next.files).distinct(), since = it.since) } ?: next)
    }

    private fun failing(): Boolean = ws.now.let { s -> s.lastResult?.ok == false || s.board?.cards.orEmpty().any { c ->
        when (val r = c.result) { is CardResult.Drawn -> !r.shot.ok; is CardResult.WriteFailed -> true; else -> false }
    } }
}
