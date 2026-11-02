package prevue.daemon.domain

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.map
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.runtime.Workspace

class ObserveWorkspaceUseCase(private val ws: Workspace) {
    operator fun invoke(): Flow<WorkspaceEvent> = ws.events

    fun changes(): Flow<Unit> = ws.state.drop(1).map { }
}
