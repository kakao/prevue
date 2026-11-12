package prevue.application.service

import java.io.File
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.yield
import prevue.application.domain.model.Board
import prevue.application.domain.model.BoardEpoch
import prevue.application.domain.model.BoardFill
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.ModuleGraph
import prevue.application.domain.model.ModuleInfo
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.Shot
import prevue.application.domain.model.StaleReason
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.model.WorkspaceState
import prevue.application.domain.model.isUnder
import prevue.application.port.Clock
import prevue.application.port.WorkspaceStore

class Workspace(
    val module: ModuleInfo,
    private val clock: Clock,
    val graph: ModuleGraph,
    roots: List<File>,
    private val store: WorkspaceStore,
) {
    val watchRoots: List<File> = roots.map { it.canonicalFile }.distinct()

    init { store.edit { it.copy(lastRenderMs = clock.nowMs()) } }

    val state: StateFlow<WorkspaceState> get() = store.state
    val now: WorkspaceState get() = store.state.value
    val events: SharedFlow<WorkspaceEvent> get() = store.events

    fun nowMs(): Long = clock.nowMs()

    fun hosts(f: File): Boolean {
        val c = f.canonicalFile
        return graph.contains(c) || watchRoots.any { c.isUnder(it) }
    }

    fun recordCard(epoch: BoardEpoch, index: Int, gen: Int, r: CardResult) {
        store.edit { it.withCard(epoch, index, gen, r) }
    }

    fun recordFill(fill: BoardFill) {
        store.edit { it.withFill(fill) }
    }

    fun recordPosture(round: Long, d: ScreenSize, shot: Shot) {
        store.edit { it.withPosture(round, d, shot) }
    }

    fun noteCreated(created: List<File>, deleted: List<File>) {
        if (created.isEmpty() && deleted.isEmpty()) return
        val added = created.map { it.canonicalPath }; val gone = deleted.map { it.canonicalPath }.toSet()
        store.edit { it.withCreated(added, gone) }
    }

    private val seeding = MutableStateFlow<Job?>(null)

    fun seededBy(job: Job) { seeding.value = job }

    suspend fun seedsNoted() { seeding.value?.join() }

    private val turn = Mutex()
    private val savesWaiting = MutableStateFlow(0)

    suspend fun <T> exclusive(block: suspend (WorkspaceEditor) -> T): T = turn.withLock {
        yield()
        var open = true
        val ed = WorkspaceEditor(clock) { f -> check(open) { "줄 밖에서 쓴다" }; store.edit(f) }
        try { block(ed) } finally {
            open = false
            if (store.state.value.work != null) store.edit { it.copy(work = null) }
        }
    }

    suspend fun <T> saving(block: suspend (WorkspaceEditor) -> T): T {
        savesWaiting.update { it + 1 }
        try { return exclusive(block) } finally { savesWaiting.update { it - 1 } }
    }

    val reloadPending: Boolean get() = savesWaiting.value > 0

    fun emit(ev: WorkspaceEvent) { store.emit(ev) }
}

class WorkspaceEditor internal constructor(
    private val clock: Clock,
    private val write: ((WorkspaceState) -> WorkspaceState) -> WorkspaceState,
) {
    fun update(f: (WorkspaceState) -> WorkspaceState): WorkspaceState = write(f)

    fun openBoard(b: Board?) { update { it.copy(board = b) } }

    fun updateBoard(epoch: BoardEpoch? = null, f: (Board) -> Board): Board? =
        update { s -> s.board?.takeIf { epoch == null || it.epoch == epoch }?.let { s.copy(board = f(it)) } ?: s }.board

    fun markCompiled(seen: Map<String, Long>) {
        val now = clock.nowMs()
        update { it.copy(compiledMtime = it.compiledMtime + seen.mapValues { (_, m) -> m to now }) }
    }

    fun forgetNew(files: List<File>) {
        if (files.isEmpty()) return
        val done = files.map { it.canonicalPath }.toSet()
        update { it.copy(newFiles = it.newFiles - done) }
    }

    fun markStale(reason: String, detail: StaleReason?) {
        update { it.copy(stale = if (detail == null) it.stale - reason else it.stale + (reason to detail)) }
    }

    fun markStaleOnce(reason: String, detail: StaleReason) {
        update { if (reason in it.stale) it else it.copy(stale = it.stale + (reason to detail)) }
    }

    fun markHiddenTabsStale() {
        update { s -> s.copy(tabs = s.tabs.map { if (it.key != s.activeTab && !it.stale) it.copy(stale = true) else it }) }
    }
}
