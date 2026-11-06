package prevue.application.service

import dev.zacsweers.metro.Inject
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.onStart
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.ExternalResult
import prevue.application.domain.model.Phrase
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.ReloadResult
import prevue.application.domain.model.SaveTiming
import prevue.application.domain.model.VacantTab
import prevue.application.domain.model.Verbatim
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.model.phrase
import prevue.application.domain.rule.ExternalPolicy
import prevue.application.domain.rule.ExternalPolicy.Plan
import prevue.application.domain.rule.StaleReasons
import prevue.application.port.BuildChange
import prevue.application.port.BuildNotice
import prevue.application.port.BuildWatcher
import prevue.application.port.CompileResult
import prevue.application.port.Compiler
import prevue.application.port.FailureKind
import prevue.application.port.SourceChange
import prevue.application.port.SourceFileRepository
import prevue.application.port.SourceWatcher
import prevue.application.port.ValueFiles
import prevue.application.port.Workspace
import prevue.application.port.WorkspaceEditor

@Inject
class HotReload(
    private val ws: Workspace,
    private val engine: Engine,
    private val modules: StaleCallers,
    private val literals: LiteralPatches,
    private val resources: ResourcePatches,
    private val live: LiveShot,
    private val boards: Boards,
    private val tabs: Tabs,
    private val compiler: Compiler,
    private val sources: SourceWatcher?,
    @ValueFiles private val valueWatcher: SourceWatcher?,
    private val builds: BuildWatcher?,
    private val sourceFiles: SourceFileRepository,
) {
    private data class Save(
        val ed: WorkspaceEditor, val t: Long, val by: String, val change: SourceChange?, val valuesSeen: Map<String, Long>,
        val texts: Map<String, String?> = emptyMap(),
    ) {
        val timing = change?.let { SaveTiming(detectMs = it.firedMs - it.mtimeMs, waitMs = (t - it.firedNs) / 1_000_000) }
        val since = change?.mtimeMs ?: System.currentTimeMillis()
    }

    suspend fun applySave(asked: List<File>, by: String, change: SourceChange? = null): ReloadResult = ws.saving { ed ->
        val t = System.nanoTime()
        val values = asked.filter(ResourcePatches::isValues)
        val valuesSeen = modules.seen(values)
        val r = if (values.isEmpty()) null else resources.apply(values)
        r?.stale?.let { markResourcesStale(ed, values, it) }
        val shown = ws.now
        val p = (shown.board?.focusCard?.spec ?: shown.current)?.let(shown::sized)
            ?: return@saving revive(ed, asked - values.toSet(), valuesSeen, by, change) ?: nothingShown(ed, valuesSeen)
        val save = Save(ed, t, by, change, valuesSeen)
        if (r != null && values.size == asked.size) return@saving applyValues(p, r, values, save)
        val files = (asked - values.toSet()).ifEmpty { listOfNotNull(ws.now.current?.file) }
        require(files.isNotEmpty()) { "files가 없고 현재 프리뷰에 파일도 없다" }
        val seenNow = modules.seen(files)
        val texts = literals.read(files)
        val coded = save.copy(texts = texts)
        val patched = if (change == null) null else applyLiterals(p, files, texts, seenNow, r?.compile != null, coded)
        patched ?: compileOrHold(p, files, r?.compile, coded)
    }

    private suspend fun compileOrHold(p: PreviewSpec, files: List<File>, values: CompileResult?, save: Save): ReloadResult {
        val code = modules.holdExpectActual(save.ed, files, save.texts)
        if (code.isNotEmpty()) return compileAndRender(p, code, save.texts, save)
        if (values != null) return render(p, values, emptyList(), save.valuesSeen, save, repair = false)
        save.ed.markCompiled(save.valuesSeen)
        return ReloadResult.NeedsGradleBuild(files, StaleReasons.expectActual(files).what, ws.now.stale)
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
        modules.releaseHeld(ed, batch.files)
        engine.codeChanged()
        if (vacateIfPreviewLost(ed, files, seen)) return ReloadResult.NothingShown
        val reread = tabs.reread(ed, p)
        return render(reread, batch.result, batch.files, seen, save, repair = true)
    }

    private fun linesOf(files: List<File>, save: Save): Int? = Lines.of(files) { save.texts[it.absolutePath] ?: modules.text(it) }

    private fun compileFailed(p: PreviewSpec, batch: StaleCallers.Batch, seen: Map<String, Long>, save: Save): ReloadResult {
        val c = batch.result
        save.ed.markStale(StaleReasons.COMPILE, StaleReasons.compileFailed(batch.files, c.messages, c.hint))
        val ms = (System.nanoTime() - save.t) / 1_000_000
        val failed = ReloadResult.CompileFailed(p, c, ws.now.stale, ms, save.by, save.timing, linesOf(batch.files, save))
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
        val files = modules.holdExpectActual(ed, modules.present(code.ifEmpty { listOfNotNull(tab.file) }))
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
            modules.releaseHeld(ed, batch.files)
            ed.markCompiled(batch.seen + valuesSeen)
            engine.codeChanged()
            ed.markHiddenTabsStale()
        } else ed.markCompiled(valuesSeen)
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
                startedAtMs = save.since, lines = c?.let { linesOf(it.files.map(::File), save) },
            )
        }
        ed.update { it.copy(current = p) }
        live.recordFocus(ed, r.shot)
        live.seedPostures(ed, kept, keep = false)
        boards.fill(save.by, save.since)
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

    suspend fun externalBuild(change: BuildChange, done: Boolean): ExternalResult = ws.exclusive { ed ->
        if (change.resources.isNotEmpty()) ed.markStaleOnce(StaleReasons.RESOURCES, StaleReasons.resources(change.resources, ws.now.current?.file))
        if (change.buildFiles.isNotEmpty()) ed.markStaleOnce(StaleReasons.BUILD_FILES, StaleReasons.buildFiles(change.buildFiles))
        if (ws.now.current == null) return@exclusive ExternalResult.NoPreview

        val p = ws.now.let { it.board?.focusCard?.spec ?: it.current }
        val own = change.own.isNotEmpty()
        val rebuilt = ws.graph.builtBy(change.own)
        when (val plan = ExternalPolicy.plan(change, done, p != null, rebuilt)) {
            Plan.Noted -> ExternalResult.Noted(ws.now.stale)
            Plan.NoPreview -> ExternalResult.NoPreview
            Plan.OutputsGone -> { ed.markStale(StaleReasons.BUILD, StaleReasons.outputsGone(change.built)); ExternalResult.OutputsGone }
            Plan.BuildPending -> { ed.markStale(StaleReasons.BUILD, StaleReasons.buildPending(change.built, own)); ExternalResult.BuildPending }
            is Plan.Redraw -> redraw(ed, change, p!!, plan.clear)
        }
    }

    private suspend fun redraw(ed: WorkspaceEditor, change: BuildChange, preview: PreviewSpec, clear: List<String>): ExternalResult {
        clear.forEach { compiler.clearOverlay(it) }
        literals.externalBuild(clear)
        engine.buildChanged()
        val owner = preview.file?.let(ws.graph::ownerOf) ?: ws.graph.home
        val className = preview.fqn.substringBeforeLast('.')
        if (!compiler.hasClass(owner, className))
            return pending(ed, change, preview, phrase("stale.classMissing", "class" to className))
        val r = live.show(ed, preview, "gradle", deferMissing = true)
        if (r.shot.out.failure == FailureKind.NOT_FOUND)
            return pending(ed, change, preview, r.shot.out.message ?: Verbatim(""))
        ed.markStale(StaleReasons.BUILD, if (r.ok) null else StaleReasons.redrawFailed(change.built, change.own.isNotEmpty()))
        if (r.ok) ed.markStale(StaleReasons.EXPECT_ACTUAL, null)
        val out = r.copy(stale = ws.now.stale)
        ed.update { s -> s.copy(lastResult = out, board = s.board?.advance()) }
        ed.markHiddenTabsStale()
        live.recordFocus(ed, out.shot)
        boards.fill("gradle", out.startedAtMs)
        return ExternalResult.Redrawn(out)
    }

    private fun pending(ed: WorkspaceEditor, change: BuildChange, preview: PreviewSpec, message: Phrase): ExternalResult {
        ed.markStale(StaleReasons.BUILD, StaleReasons.classPending(change.built, preview.file, message))
        ed.markHiddenTabsStale()
        return ExternalResult.BuildPending
    }

    fun observeSourceChanges(): Flow<SourceChange> = sources?.let { repo ->
        repo.changes { listOfNotNull(ws.now.board?.file ?: ws.now.current?.file) }.onStart { noteBehindBuild() }.onEach {
            try {
                note(it.created, it.deleted)
                if (sourceFiles.update(it.created, it.deleted)) ws.emit(WorkspaceEvent.ProjectFilesChanged)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                System.err.println("[prevue] 새 파일을 적지 못했다: $e")
            }
        }
    } ?: emptyFlow()

    suspend fun noteBehindBuild() {
        try {
            val behind = modules.behindBuild()
            if (behind.size > MAX_BEHIND_BUILD) {
                System.err.println("[prevue] 빌드 뒤에 바뀐 소스가 ${behind.size}개라 함께 싣지 않는다 — 부르는 쪽이 저장될 때 실린다")
                return
            }
            note(behind, emptyList())
            if (behind.isNotEmpty()) System.err.println("[prevue] 빌드 뒤에 바뀐 소스 ${behind.size}개를 다음 컴파일에 함께 싣는다")
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            System.err.println("[prevue] 빌드 뒤에 바뀐 소스를 찾지 못했다: $e")
        }
    }

    private fun note(created: List<File>, deleted: List<File>) = ws.noteCreated(created, deleted)

    fun observeBuildChanges(): Flow<BuildNotice> = builds?.changes() ?: emptyFlow()

    fun observeResourceChanges(): Flow<SourceChange> = valueWatcher?.changes { emptyList() } ?: emptyFlow()

    fun rememberValues(): Int {
        val files = resources.valueFiles(ws.graph.resRoots)
        resources.remember(files)
        return files.size
    }

    private companion object {
        const val MAX_BEHIND_BUILD = 64
    }
}
