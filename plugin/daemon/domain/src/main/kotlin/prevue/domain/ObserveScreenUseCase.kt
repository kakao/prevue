package prevue.domain

import dev.zacsweers.metro.Inject
import kotlinx.coroutines.flow.StateFlow
import prevue.domain.model.LiveFrame
import prevue.domain.runtime.EngineActor
import prevue.domain.runtime.LiveLoop

@Inject
class ObserveScreenUseCase(private val engine: EngineActor) {
    val screen: StateFlow<LiveFrame?> get() = engine.screen
    val frames: StateFlow<LiveLoop.Report> get() = engine.frames
    val watching: StateFlow<Boolean> get() = engine.watching

    suspend fun watch(on: Boolean) = engine.watch(on)
}
