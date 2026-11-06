package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
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
import prevue.application.port.Workspace
import prevue.application.port.WorkspaceEditor

@SingleIn(AppScope::class)
@Inject
class Tabs(
    private val ws: Workspace,
    private val engine: Engine,
    private val previews: PreviewRepository,
    private val live: LiveShot,
    private val fillBoard: BoardFiller,
    private val modules: StaleCallers,
    private val sources: SourceFileRepository,
) {
    suspend fun openPreview(target: String, index: Int?, params: Map<String, String>, by: String, since: Long? = null): ShowResult = ws.exclusive { ed ->
        val key = keyOf(target)
        val move = if (find(key) == null) TabMove.OPENED else TabMove.SWITCHED
        val r = activate(ed, key, index, params, by, since)
        val evicted = TabPolicy.evict(ws.now.tabs, ws.now.activeTab)?.also { drop(ed, it) }
        evicted?.let { ws.emit(WorkspaceEvent.TabEvicted(it)) }
        r.copy(tab = move, closedTab = evicted?.key)
    }

    suspend fun closeTab(target: String, by: String): CloseResult = ws.exclusive { ed ->
        val key = keyOf(target)
        val tab = find(key) ?: error("열린 탭이 아니다: $target")
        val wasActive = key == ws.now.activeTab
        drop(ed, tab)
        if (wasActive) TabPolicy.next(ws.now.tabs, key)?.let {
            runCatching { activate(ed, it.key, null, emptyMap(), by) }.onFailure { e -> if (e !is VacantTab) throw e }
        }
        CloseResult(key, ws.now.activeTab, ws.now.tabViews(ws.graph))
    }

    suspend fun showPreview(by: String): ShowResult = ws.exclusive { ed ->
        live.show(ed, ws.now.current ?: error("보여 주는 프리뷰가 없다 — 먼저 show"), by)
    }

    suspend fun trackFiles(created: List<File>, deleted: List<File>, by: String = "watch"): Unit = ws.exclusive { ed ->
        val tab = ws.now.activeTabOrNull() ?: return@exclusive
        val f = tab.file?.canonicalPath ?: return@exclusive
        fun has(files: List<File>) = files.any { it.canonicalPath == f }
        when {
            has(deleted) && tab.vacant != Vacancy.DELETED && !sources.has(File(f)) -> markVacant(ed, tab, Vacancy.DELETED)
            has(created) && tab.vacant == Vacancy.DELETED ->
                runCatching { activate(ed, tab.key, null, emptyMap(), by) }.onFailure { if (it !is VacantTab) throw it }
        }
    }

    suspend fun catchUp(by: String): ShowResult? = ws.exclusive { ed ->
        if (ws.now.current == null) null else live.catchUp(ed, by)
    }

    internal fun keyOf(target: String): String = File(target).let { if (sources.has(it)) it.canonicalPath else target }

    internal fun find(key: String): Tab? = ws.now.tabs.firstOrNull { it.key == key }

    internal suspend fun activate(ed: WorkspaceEditor, key: String, index: Int?, params: Map<String, String>, by: String, since: Long? = null): ShowResult {
        val tab = find(key)
        val wasActive = key == ws.now.activeTab
        val before = (if (wasActive) ws.now.board else null) ?: tab?.board
        park(ed)
        if (tab != null) {
            val hidden = tab.board?.takeIf { !wasActive && !tab.stale && params.isEmpty() }
            vacateIfLost(ed, tab, restoring = hidden != null)
            if (hidden != null) return restore(ed, tab, hidden, index, by, since)
        }
        val kept = if (params.isEmpty()) tab?.params.orEmpty() else params
        return open(ed, Opening(key, index, before?.focusCard?.spec?.previewId, kept), by, since)
    }

    private fun vacateIfLost(ed: WorkspaceEditor, tab: Tab, restoring: Boolean) {
        val f = tab.file ?: return
        val why = if (restoring) Vacancy.DELETED.takeIf { !sources.has(f) } else vacancy(f)
        why?.let { vacate(ed, tab, it) }
    }

    private class Opening(val key: String, val index: Int?, val focusId: String?, val kept: Map<String, String>)

    private suspend fun open(ed: WorkspaceEditor, o: Opening, by: String, since: Long?): ShowResult {
        engine.forgetShapes()
        val openedAt = ws.nowMs()
        ed.update { it.copy(openedAtMs = openedAt) }
        val compiled = compileBeforeOpen(ed, o.key, by)
        val (p, all) = locate(o.key, o.index, o.focusId, o.kept)
        val board = if (all.isEmpty()) null else Board.open(p.file!!, all.map { it.copy(params = it.params + o.kept) }, p.index)
        val shown = board?.focusCard?.spec ?: p
        val tab = Tab(o.key, board?.file, if (board == null) p else null, o.kept, null, seenAtMs = ws.nowMs())
        ed.update { s ->
            val modules = (board?.file ?: p.file)?.let { s.renderModules + ws.graph.ownerOf(it) } ?: s.renderModules
            s.withTab(tab).copy(board = board, current = shown, renderModules = modules)
        }
        compiled?.let { (batch, t) -> recordOpenCompile(ed, batch, t, shown, by) }
        val r = live.show(ed, shown, by, since)
        live.recordFocus(ed, r.shot)
        fillBoard(by, r.startedAtMs)
        return r
    }

    private suspend fun restore(ed: WorkspaceEditor, tab: Tab, hidden: Board, index: Int?, by: String, since: Long?): ShowResult {
        var b = hidden.settled()
        val gone = b.cards.indices.filter { i -> (b.cards[i].result as? CardResult.Drawn)?.shot?.out?.let(engine::lost) == true }
        b = b.forget(gone)
        if (index != null) {
            ensure(index in b.cards.indices) { phrase("tabs.noIndex", "file" to b.file.name, "n" to b.cards.size, "index" to index) }
            b = b.focusOn(index)
        }
        val at = ws.nowMs()
        ed.update { it.withTab(tab.copy(board = null, stale = false, seenAtMs = at)).copy(board = b, current = b.focusCard.spec, openedAtMs = at) }
        val r = live.show(ed, b.focusCard.spec, by, since)
        live.recordFocus(ed, r.shot)
        fillBoard(by, r.startedAtMs)
        return r
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
            s.copy(tabs = parked, interactive = false, resize = null)
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
            if (s.activeTab == t.key) left.copy(board = null, current = null, interactive = false, resize = null) else left
        }
    }

    internal suspend fun reread(ed: WorkspaceEditor, p: PreviewSpec): PreviewSpec {
        ws.now.board?.let { return ws.now.sized(rereadBoard(ed, it)?.focusCard?.spec ?: p) }
        val tab = ws.now.activeTabOrNull()?.takeIf { it.spec != null } ?: return p
        val found = fqnMatches(tab.key).firstOrNull { it.previewId == p.previewId } ?: return ws.now.sized(p)
        val next = found.copy(params = found.params + tab.params, index = 0)
        if (next != tab.spec) ed.update { it.withTab(tab.copy(spec = next)) }
        return ws.now.sized(next)
    }

    private suspend fun rereadBoard(ed: WorkspaceEditor, b: Board): Board? {
        val kept = ws.now.activeTabOrNull()?.params.orEmpty()
        val found = previews.inFile(b.file).let { PreviewExpansion.expand(it, engine.instanceCounts(it)::getValue) }.map { it.copy(params = it.params + kept) }
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
        ed.update { it.withTab(t).copy(board = null, current = null, interactive = false, resize = null) }
        if (tab.vacant != why) ws.emit(WorkspaceEvent.TabVacated(t))
        return t
    }

    private suspend fun locate(target: String, index: Int?, focusId: String?, params: Map<String, String>): Pair<PreviewSpec, List<PreviewSpec>> {
        val f = File(target)
        if (sources.has(f)) {
            val found = previews.inFile(f).let { PreviewExpansion.expand(it, engine.instanceCounts(it)::getValue) }
            ensure(found.isNotEmpty()) { phrase("tabs.noPreviewFn", "file" to f.name) }
            val i = index ?: found.indexOfFirst { it.previewId == focusId }.coerceAtLeast(0)
            ensure(i in found.indices) { phrase("tabs.noIndex", "file" to f.name, "n" to found.size, "index" to i) }
            val p = found[i]
            return p.copy(params = p.params + params) to found
        }
        ensure(target.contains('.')) { phrase("tabs.notFqn", "target" to target) }
        ensure(!target.endsWith(".kt") && !target.contains('/')) { phrase("tabs.noFile", "target" to target) }
        val matches = fqnMatches(target)
        if (matches.isEmpty()) return previews.byFqn(target, params) to emptyList()
        val i = index ?: 0
        ensure(i in matches.indices) { phrase("tabs.noIndex", "file" to target, "n" to matches.size, "index" to i) }
        val p = matches[i]
        return p.copy(params = p.params + params, index = 0) to emptyList()
    }

    private suspend fun fqnMatches(fqn: String): List<PreviewSpec> {
        val facade = fqn.substringBeforeLast('.').substringAfterLast('.')
        return sources.sourceFiles().asSequence()
            .filter { it.nameWithoutExtension.replaceFirstChar(Char::uppercase) + "Kt" == facade }
            .map { f -> previews.inFile(f).filter { it.fqn == fqn } }
            .firstOrNull { it.isNotEmpty() }.orEmpty()
    }
}

private const val WARM_SUFFIX = "-warm"
