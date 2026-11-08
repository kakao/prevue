package prevue.infrastructure.store

import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.updateAndGet
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.model.WorkspaceState
import prevue.application.port.WorkspaceStore

public class InMemoryWorkspaceStore : WorkspaceStore {
    private val _state = MutableStateFlow(WorkspaceState())
    override val state: StateFlow<WorkspaceState> = _state

    private val _events = MutableSharedFlow<WorkspaceEvent>(extraBufferCapacity = Channel.UNLIMITED)
    override val events: SharedFlow<WorkspaceEvent> = _events

    override fun edit(f: (WorkspaceState) -> WorkspaceState): WorkspaceState = _state.updateAndGet(f)

    override fun emit(ev: WorkspaceEvent) { _events.tryEmit(ev) }
}
