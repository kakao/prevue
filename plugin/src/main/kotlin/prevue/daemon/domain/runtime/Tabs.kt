package prevue.daemon.domain.runtime

import prevue.daemon.entity.ensure
import prevue.daemon.entity.phrase
import java.io.File
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.PreviewRepository
import prevue.daemon.domain.port.SourceFileRepository
import prevue.daemon.domain.model.Board
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.model.Tab
import prevue.daemon.domain.model.Vacancy
import prevue.daemon.domain.model.VacantTab
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.policy.PreviewExpansion
import prevue.daemon.domain.policy.StaleReasons

class Tabs(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val previews: PreviewRepository,
    private val live: LiveShot,
    private val fillBoard: (by: String, since: Long?) -> Unit,
    private val modules: StaleCallers,
    private val sources: SourceFileRepository,
) {
    fun keyOf(target: String): String = File(target).let { if (it.isFile) it.canonicalPath else target }

    fun find(key: String): Tab? = ws.now.tabs.firstOrNull { it.key == key }

    suspend fun activate(ed: WorkspaceEditor, key: String, index: Int?, params: Map<String, String>, by: String, since: Long? = null): ShowResult {
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
        val why = if (restoring) Vacancy.DELETED.takeIf { !f.isFile } else vacancy(f)
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
        val gone = b.cards.indices.filter { i -> (b.cards[i].result as? CardResult.Drawn)?.shot?.out?.image?.isFile == false }
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
        val f = File(key).takeIf { it.isFile && modules.dueOnOpen(it) { previewClasses(it) } }?.canonicalFile ?: return null
        val t = System.nanoTime()
        live.compiling(ed, listOf(f), by)
        val batch = coroutineScope {
            launch { warmRenderer(f) }
            modules.compileWithNew(ed, listOf(f))
        }
        if (batch.result.ok) engine.codeChanged()
        ed.markCompiled(batch.seen)
        return batch to t
    }

    private suspend fun warmRenderer(f: File) {
        val p = runCatching { previews.inFile(f) }.getOrDefault(emptyList()).firstOrNull { it.methodParams.isEmpty() } ?: return
        engine.warmIfCold(p.copy(previewId = p.previewId + WARM_SUFFIX))
    }

    private fun previewClasses(f: File): List<String> =
        runCatching { previews.inFile(f) }.getOrDefault(emptyList()).map { it.fqn.substringBeforeLast('.') }.distinct()

    private fun recordOpenCompile(ed: WorkspaceEditor, batch: StaleCallers.Batch, t: Long, p: PreviewSpec, by: String) {
        val c = batch.result
        if (c.ok) {
            ed.markHiddenTabsStale()
            val done = batch.files.map { it.canonicalPath }.toSet()
            if (ws.now.lastCompileFailure?.compile?.files?.all { File(it).canonicalPath in done } == true)
                ed.update { it.copy(lastCompileFailure = null, stale = it.stale - StaleReasons.COMPILE) }
            return
        }
        ed.markStale(StaleReasons.COMPILE, StaleReasons.compileFailed(batch.files, c.messages, c.hint))
        val failed = ReloadResult.CompileFailed(p, c, ws.now.stale, (System.nanoTime() - t) / 1_000_000, by, null, Lines.of(batch.files))
        live.failed(ed, failed, recordLast = false)
    }

    private fun park(ed: WorkspaceEditor) {
        val at = ws.nowMs()
        ed.update { s ->
            val parked = s.tabs.map { if (it.key == s.activeTab) it.copy(board = s.board ?: it.board.takeIf { _ -> it.vacant != null }, seenAtMs = at) else it }
            s.copy(tabs = parked, interactive = false, resize = null)
        }
    }

    fun drop(ed: WorkspaceEditor, t: Tab) {
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

    suspend fun reread(ed: WorkspaceEditor, p: PreviewSpec): PreviewSpec {
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

    fun vacancy(f: File): Vacancy? = when {
        !f.isFile -> Vacancy.DELETED
        previews.inFile(f).isEmpty() -> Vacancy.NO_PREVIEWS
        else -> null
    }

    fun vacate(ed: WorkspaceEditor, tab: Tab, why: Vacancy): Nothing = throw VacantTab(markVacant(ed, tab, why))

    fun markVacant(ed: WorkspaceEditor, tab: Tab, why: Vacancy): Tab {
        val s = ws.now
        val kept = s.board?.takeIf { tab.key == s.activeTab } ?: tab.board
        val t = tab.copy(board = kept, stale = true, vacant = why, seenAtMs = ws.nowMs())
        ed.update { it.withTab(t).copy(board = null, current = null, interactive = false, resize = null) }
        if (tab.vacant != why) ws.emit(WorkspaceEvent.TabVacated(t))
        return t
    }

    private suspend fun locate(target: String, index: Int?, focusId: String?, params: Map<String, String>): Pair<PreviewSpec, List<PreviewSpec>> {
        val f = File(target)
        if (f.isFile) {
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
