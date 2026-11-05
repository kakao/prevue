package prevue.application.service

import dev.zacsweers.metro.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.map
import prevue.application.domain.model.WorkspaceEvent
@Inject
class ObserveWorkspaceUseCase(private val ws: Workspace) {
    operator fun invoke(): Flow<WorkspaceEvent> = ws.events

    fun changes(): Flow<Unit> = ws.state.drop(1).map { }
}
