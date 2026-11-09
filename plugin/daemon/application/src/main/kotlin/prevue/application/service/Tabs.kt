package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import prevue.application.domain.model.PhraseException
import prevue.application.domain.model.ensure
import prevue.application.domain.model.phrase
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import prevue.application.domain.model.PreviewSpec
import prevue.application.port.PreviewRepository
import prevue.application.port.SourceFileRepository
import prevue.application.domain.model.Board
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.CloseResult
import prevue.application.domain.model.ReloadResult
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.Tab
import prevue.application.domain.model.TabMove
import prevue.application.domain.model.Vacancy
import prevue.application.domain.model.VacantTab
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.rule.PreviewExpansion
import prevue.application.domain.rule.StaleReasons
import prevue.application.domain.rule.TabPolicy

@SingleIn(AppScope::class)
class Tabs @Inject internal constructor(
    private val ws: Workspace,
    private val engine: Engine,
    private val previews: PreviewRepository,
    private val live: LiveShot,
    private val boards: Boards,
    private val modules: StaleCallers,
    private val sources: SourceFileRepository,
    private val catalog: PreviewCatalog,
) {
    suspend fun openPreview(target: String, index: Int?, params: Map<String, String>, by: String, since: Long? = null): ShowResult = ws.exclusive { ed ->
        val link = deepLink(target, index)
        switchTo(ed, link?.first ?: keyOf(target), link?.second ?: Pick(index), params, by, since)
    }

    suspend fun openFile(path: String, function: String?, by: String): ShowResult? = ws.exclusive { ed ->
        val key = keyOf(path)
        if (key == ws.now.activeTab && ws.now.board != null) {
            if (ws.now.interactive) boards.leave(ed, by)
            null
        } else switchTo(ed, key, Pick(function = function), emptyMap(), by, null)
    }

    private suspend fun switchTo(ed: WorkspaceEditor, key: String, pick: Pick, params: Map<String, String>, by: String, since: Long?): ShowResult {
        val move = if (find(key) == null) TabMove.OPENED else TabMove.SWITCHED
        val r = enter(ed, key, pick, params, by, since)
        val evicted = TabPolicy.evict(ws.now.tabs, ws.now.activeTab)?.also { drop(ed, it) }
        evicted?.let { ws.emit(WorkspaceEvent.TabEvicted(it)) }
        return r.copy(tab = move, closedTab = evicted?.key)
    }

    suspend fun closeTab(target: String, by: String): CloseResult = ws.exclusive { ed ->
        val key = if (isPath(target)) keyOf(target) else fqnFile(target)?.canonicalPath ?: target
        val tab = find(key) ?: error("열린 탭이 아니다: $target")
        val wasActive = key == ws.now.activeTab
        drop(ed, tab)
        if (wasActive) TabPolicy.next(ws.now.tabs, key)?.let { activateOrVacant(ed, it.key, by) }
        CloseResult(key, ws.now.activeTab, ws.now.tabViews(ws.graph))
    }

    suspend fun showPreview(by: String): ShowResult = ws.exclusive { ed ->
        live.show(ed, ws.now.current ?: error("보여 주는 프리뷰가 없다 — 먼저 show"), by)
    }

    suspend fun trackFiles(created: List<File>, deleted: List<File>, by: String = "watch"): Unit = ws.exclusive { ed ->
        val tab = ws.now.activeTabOrNull() ?: return@exclusive
        val f = tab.file.canonicalPath
        fun has(files: List<File>) = files.any { it.canonicalPath == f }
        when {
            has(deleted) && tab.vacant != Vacancy.DELETED && !sources.has(File(f)) -> markVacant(ed, tab, Vacancy.DELETED)
            has(created) && tab.vacant == Vacancy.DELETED -> activateOrVacant(ed, tab.key, by)
        }
    }

    suspend fun catchUp(by: String): ShowResult? = ws.exclusive { ed ->
        if (ws.now.current == null) null else live.catchUp(ed, by)
    }

    private fun isPath(target: String) = sources.has(File(target)) || target.endsWith(".kt") || target.contains('/')

    internal fun keyOf(target: String): String = File(target).let { if (sources.has(it)) it.canonicalPath else target }

    internal fun find(key: String): Tab? = ws.now.tabs.firstOrNull { it.key == key }

    internal suspend fun activateOrVacant(ed: WorkspaceEditor, key: String, by: String, since: Long? = null): ShowResult? =
        try { activate(ed, key, Pick(), emptyMap(), by, since) } catch (_: VacantTab) { null }

    internal class Pick(val index: Int? = null, private val fqn: String? = null, private val function: String? = null) {
        val interactive: Boolean get() = fqn != null

        fun within(specs: List<PreviewSpec>): Boolean = specs.any { it.fqn == fqn }

        fun of(specs: List<PreviewSpec>, file: String): Int? {
            if (function != null) return specs.indexOfFirst { it.functionName == function }.takeIf { it >= 0 }
            if (fqn == null) return index?.also { ensure(it in specs.indices) { noIndex(file, specs.size, it) } }
            val mine = specs.indices.filter { specs[it].fqn == fqn }
            val nth = index ?: 0
            ensure(nth in mine.indices) { noIndex(fqn, mine.size, nth) }
            return mine[nth]
        }

        private fun noIndex(file: String, n: Int, index: Int) = phrase("tabs.noIndex", "file" to file, "n" to n, "index" to index)
    }

    private suspend fun deepLink(target: String, index: Int?): Pair<String, Pick>? {
        if (isPath(target)) return null
        ensure(target.contains('.')) { phrase("tabs.notFqn", "target" to target) }
        val f = fqnFile(target) ?: throw PhraseException(phrase("tabs.fqnNoSource", "target" to target))
        return f.canonicalPath to Pick(index, target)
    }

    private suspend fun enter(ed: WorkspaceEditor, key: String, pick: Pick, params: Map<String, String>, by: String, since: Long?): ShowResult {
        val specs = ws.now.board?.takeIf { pick.interactive && key == ws.now.activeTab && params.isEmpty() }?.cards?.map { it.spec }
        val i = specs?.takeIf(pick::within)?.let { pick.of(it, key) } ?: return activate(ed, key, pick, params, by, since)
        return boards.enter(ed, i, by, since = since)
    }

    internal suspend fun activate(ed: WorkspaceEditor, key: String, pick: Pick, params: Map<String, String>, by: String, since: Long? = null): ShowResult {
        val tab = find(key)
        val wasActive = key == ws.now.activeTab
        val before = (if (wasActive) ws.now.board else null) ?: tab?.board
        park(ed)
        if (tab != null) {
            val hidden = tab.board?.takeIf { !wasActive && !tab.stale && params.isEmpty() }
            vacateIfLost(ed, tab, restoring = hidden != null)
            if (hidden != null) return restore(ed, tab, hidden, pick, by, since)
        }
        val kept = if (params.isEmpty()) tab?.params.orEmpty() else params
        return open(ed, Opening(key, pick, before?.focusCard?.spec?.previewId, kept), by, since)
    }

    private fun vacateIfLost(ed: WorkspaceEditor, tab: Tab, restoring: Boolean) {
        val f = tab.file
        val why = if (restoring) Vacancy.DELETED.takeIf { !sources.has(f) } else vacancy(f)
        why?.let { vacate(ed, tab, it) }
    }

    private class Opening(val key: String, val pick: Pick, val focusId: String?, val kept: Map<String, String>)

    private suspend fun open(ed: WorkspaceEditor, o: Opening, by: String, since: Long?): ShowResult {
        engine.forgetShapes()
        val openedAt = ws.nowMs()
        ed.update { it.copy(openedAtMs = openedAt) }
        val compiled = compileBeforeOpen(ed, o.key, by)
        val (file, all) = locate(o.key)
        val i = o.pick.of(all, file.name) ?: all.indexOfFirst { it.previewId == o.focusId }.coerceAtLeast(0)
        val board = Board.open(file, all.map { it.copy(params = it.params + o.kept) }, i)
        val shown = board.focusCard.spec
        val tab = Tab(o.key, board.file, o.kept, null, seenAtMs = ws.nowMs())
        ed.update { s -> s.withTab(tab).copy(board = board, current = shown, renderModules = s.renderModules + ws.graph.ownerOf(file)) }
        compiled?.let { (batch, t) -> recordOpenCompile(ed, batch, t, shown, by) }
        return showFocus(ed, board, o.pick.interactive, by, since)
    }

    private suspend fun showFocus(ed: WorkspaceEditor, b: Board, interactive: Boolean, by: String, since: Long?): ShowResult {
        if (interactive) return boards.enter(ed, b.focus, by, since = since)
        val r = live.show(ed, b.focusCard.spec, by, since)
        live.recordFocus(ed, r.shot)
        boards.fill(by, r.startedAtMs)
        return r
    }

    private suspend fun restore(ed: WorkspaceEditor, tab: Tab, hidden: Board, pick: Pick, by: String, since: Long?): ShowResult {
        var b = hidden.settled()
        val gone = b.cards.indices.filter { i -> (b.cards[i].result as? CardResult.Drawn)?.shot?.out?.let(engine::lost) == true }
        b = b.forget(gone)
        pick.of(b.cards.map { it.spec }, b.file.name)?.let { b = b.focusOn(it) }
        val at = ws.nowMs()
        ed.update {
            it.withTab(tab.copy(board = null, stale = false, seenAtMs = at))
                .copy(board = b, current = b.focusCard.spec, openedAtMs = at)
        }
        return showFocus(ed, b, pick.interactive, by, since)
    }

    private suspend fun compileBeforeOpen(ed: WorkspaceEditor, key: String, by: String): Pair<StaleCallers.Batch, Long>? {
        val f = File(key).takeIf { sources.has(it) && modules.dueOnOpen(it) { previewClasses(it) } }?.canonicalFile ?: return null
        if (modules.holdExpectActual(ed, listOf(f)).isEmpty()) return null
        val t = System.nanoTime()
        live.compiling(ed, listOf(f), by)
        val batch = coroutineScope {
            if (f.path !in ws.now.newFiles) launch { warmRenderer(f) }
            modules.compileOpening(ed, listOf(f))
        }
        if (batch.result.ok) engine.codeChanged()
        ed.markCompiled(batch.seen)
        return batch to t
    }

    private suspend fun warmRenderer(f: File) {
        val p = runCatching { previews.inFile(f) }.getOrDefault(emptyList()).firstOrNull { it.methodParams.isEmpty() } ?: return
        try {
            val out = engine.warmIfCold(p.copy(previewId = p.previewId + WARM_SUFFIX)) ?: return
            engine.discard(engine.written(out))
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { System.err.println("[prevue] 렌더러를 미리 데우지 못했다 — 첫 그림이 데우기를 맡는다: $e") }
    }

    private fun previewClasses(f: File): List<String> =
        runCatching { previews.inFile(f) }.getOrDefault(emptyList()).map { it.fqn.substringBeforeLast('.') }.distinct()

    private fun recordOpenCompile(ed: WorkspaceEditor, batch: StaleCallers.Batch, t: Long, p: PreviewSpec, by: String) {
        val c = batch.result
        if (c.ok) {
            ed.markHiddenTabsStale()
            modules.releaseHeld(ed, batch.files)
            val done = batch.files.map { it.canonicalPath }.toSet()
            if (ws.now.lastCompileFailure?.compile?.files?.all { File(it).canonicalPath in done } == true)
                ed.update { it.copy(lastCompileFailure = null, stale = it.stale - StaleReasons.COMPILE) }
            return
        }
        ed.markStale(StaleReasons.COMPILE, StaleReasons.compileFailed(batch.files, c.messages, c.hint))
        val failed = ReloadResult.CompileFailed(p, c, ws.now.stale, (System.nanoTime() - t) / 1_000_000, by, null, Lines.of(batch.files, sources::read))
        live.failed(ed, failed, recordLast = false)
    }

    private fun park(ed: WorkspaceEditor) {
        val at = ws.nowMs()
        ed.update { s ->
            val parked = s.tabs.map { if (it.key == s.activeTab) it.copy(board = s.board ?: it.board.takeIf { _ -> it.vacant != null }, seenAtMs = at) else it }
            s.copy(tabs = parked, interactive = false, cardOverride = null)
        }
    }

    internal fun drop(ed: WorkspaceEditor, t: Tab) {
        ed.update { s ->
            val mine = s.selectionTab == t.key
            val left = s.copy(
                tabs = s.tabs.filter { it.key != t.key },
                activeTab = s.activeTab.takeIf { it != t.key },
                selection = s.selection.takeUnless { mine },
                selectionTab = s.selectionTab.takeUnless { mine },
            )
            if (s.activeTab == t.key) left.copy(board = null, current = null, interactive = false, cardOverride = null) else left
        }
    }

    internal suspend fun reread(ed: WorkspaceEditor, p: PreviewSpec): PreviewSpec {
        val b = ws.now.board ?: return p
        return ws.now.sized(rereadBoard(ed, b)?.focusCard?.spec ?: p)
    }

    private suspend fun rereadBoard(ed: WorkspaceEditor, b: Board): Board? {
        val kept = ws.now.activeTabOrNull()?.params.orEmpty()
        val found = previews.inFile(b.file).let { PreviewExpansion.expand(it, engine.instances(it)::getValue) }.map { it.copy(params = it.params + kept) }
        if (found.isEmpty() || found == b.cards.map { it.spec }) return b
        return ed.updateBoard(b.epoch) { it.reread(found) }
    }

    internal fun vacancy(f: File): Vacancy? = when {
        !sources.has(f) -> Vacancy.DELETED
        previews.inFile(f).isEmpty() -> Vacancy.NO_PREVIEWS
        else -> null
    }

    internal fun vacate(ed: WorkspaceEditor, tab: Tab, why: Vacancy): Nothing = throw VacantTab(markVacant(ed, tab, why))

    internal fun markVacant(ed: WorkspaceEditor, tab: Tab, why: Vacancy): Tab {
        val s = ws.now
        val kept = s.board?.takeIf { tab.key == s.activeTab } ?: tab.board
        val t = tab.copy(board = kept, stale = true, vacant = why, seenAtMs = ws.nowMs())
        ed.update { it.withTab(t).copy(board = null, current = null, interactive = false, cardOverride = null) }
        if (tab.vacant != why) ws.emit(WorkspaceEvent.TabVacated(t))
        return t
    }

    private suspend fun locate(target: String): Pair<File, List<PreviewSpec>> {
        val f = File(target)
        ensure(sources.has(f)) { phrase("tabs.noFile", "target" to target) }
        val found = previews.inFile(f).let { PreviewExpansion.expand(it, engine.instances(it)::getValue) }
        ensure(found.isNotEmpty()) { phrase("tabs.noPreviewFn", "file" to f.name) }
        return f to found
    }

    private suspend fun fqnFile(fqn: String): File? {
        val facade = fqn.substringBeforeLast('.').substringAfterLast('.')
        val fn = fqn.substringAfterLast('.')
        val named = sources.sourceFiles().asSequence().filter { it.nameWithoutExtension.replaceFirstChar(Char::uppercase) + "Kt" == facade }
        val listed = catalog.list()?.asSequence()?.filter { fn in it.functions }?.map { it.file }
            ?: sources.sourceFiles().asSequence().filter { sources.read(it)?.contains("fun $fn") == true }
        return (named + listed).firstOrNull { f -> previews.inFile(f).any { it.fqn == fqn } }
    }
}

private const val WARM_SUFFIX = "-warm"
