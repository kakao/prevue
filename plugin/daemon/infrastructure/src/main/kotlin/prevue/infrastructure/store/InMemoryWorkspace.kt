package prevue.infrastructure.store

import java.io.File
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.flow.updateAndGet
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.yield
import prevue.application.domain.model.BoardEpoch
import prevue.application.domain.model.BoardFill
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.ModuleGraph
import prevue.application.domain.model.ModuleInfo
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.Shot
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.model.WorkspaceState
import prevue.application.port.Clock
import prevue.application.port.Workspace
import prevue.application.port.WorkspaceEditor

public class InMemoryWorkspace(
    override val module: ModuleInfo,
    private val clock: Clock,
    override val graph: ModuleGraph,
    override val watchRoots: List<File> = emptyList(),
) : Workspace {
    private val _state = MutableStateFlow(WorkspaceState(lastRenderMs = clock.nowMs()))
    override val state: StateFlow<WorkspaceState> = _state

    override fun nowMs(): Long = clock.nowMs()

    override fun recordCard(epoch: BoardEpoch, index: Int, gen: Int, r: CardResult) {
        _state.update { it.withCard(epoch, index, gen, r) }
    }

    override fun recordFill(fill: BoardFill) {
        _state.update { it.withFill(fill) }
    }

    override fun recordPosture(round: Long, d: ScreenSize, shot: Shot) {
        _state.update { it.withPosture(round, d, shot) }
    }

    override fun noteCreated(created: List<File>, deleted: List<File>) {
        if (created.isEmpty() && deleted.isEmpty()) return
        val added = created.map { it.canonicalPath }; val gone = deleted.map { it.canonicalPath }.toSet()
        _state.update { it.withCreated(added, gone) }
    }

    private val turn = Mutex()
    private val savesWaiting = MutableStateFlow(0)

    override suspend fun <T> exclusive(block: suspend (WorkspaceEditor) -> T): T = turn.withLock {
        yield()
        val ed = Editor(clock) { f -> _state.updateAndGet(f) }
        try { block(ed) } finally {
            ed.close()
            if (_state.value.work != null) _state.update { it.copy(work = null) }
        }
    }

    override suspend fun <T> saving(block: suspend (WorkspaceEditor) -> T): T {
        savesWaiting.update { it + 1 }
        try { return exclusive(block) } finally { savesWaiting.update { it - 1 } }
    }

    override val reloadPending: Boolean get() = savesWaiting.value > 0

    private val _events = MutableSharedFlow<WorkspaceEvent>(extraBufferCapacity = Channel.UNLIMITED)
    override val events: SharedFlow<WorkspaceEvent> = _events

    override fun emit(ev: WorkspaceEvent) { _events.tryEmit(ev) }

    private class Editor(clock: Clock, private val write: ((WorkspaceState) -> WorkspaceState) -> WorkspaceState) : WorkspaceEditor(clock) {
        private var open = true

        fun close() { open = false }

        override fun update(f: (WorkspaceState) -> WorkspaceState): WorkspaceState {
            check(open) { "줄 밖에서 쓴다" }
            return write(f)
        }
    }
}
