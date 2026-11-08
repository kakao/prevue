package prevue.application.port

import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.model.WorkspaceState

interface WorkspaceStore {
    val state: StateFlow<WorkspaceState>
    val events: SharedFlow<WorkspaceEvent>

    fun edit(f: (WorkspaceState) -> WorkspaceState): WorkspaceState

    fun emit(ev: WorkspaceEvent)
}
