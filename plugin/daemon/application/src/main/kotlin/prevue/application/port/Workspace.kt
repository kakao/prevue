package prevue.application.port

import java.io.File
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
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

interface Workspace {
    val module: ModuleInfo
    val graph: ModuleGraph
    val watchRoots: List<File>
    val state: StateFlow<WorkspaceState>
    val now: WorkspaceState get() = state.value
    val reloadPending: Boolean
    val events: SharedFlow<WorkspaceEvent>

    fun nowMs(): Long

    fun hosts(f: File): Boolean {
        val c = f.canonicalFile
        return graph.contains(c) || watchRoots.any { c.path.startsWith(it.path + File.separator) }
    }

    fun recordCard(epoch: BoardEpoch, index: Int, gen: Int, r: CardResult)

    fun recordFill(fill: BoardFill)

    fun recordPosture(round: Long, d: ScreenSize, shot: Shot)

    fun noteCreated(created: List<File>, deleted: List<File>)

    suspend fun <T> exclusive(block: suspend (WorkspaceEditor) -> T): T

    suspend fun <T> saving(block: suspend (WorkspaceEditor) -> T): T

    fun emit(ev: WorkspaceEvent)
}

abstract class WorkspaceEditor(private val clock: Clock) {
    abstract fun update(f: (WorkspaceState) -> WorkspaceState): WorkspaceState

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
