package prevue.application.service

import dev.zacsweers.metro.Inject
import kotlinx.coroutines.flow.StateFlow
import prevue.application.domain.model.LiveFrame
@Inject
class ObserveScreenUseCase(private val engine: Engine) {
    val screen: StateFlow<LiveFrame?> get() = engine.screen
    val frames: StateFlow<LiveLoop.Report> get() = engine.frames
    val watching: StateFlow<Boolean> get() = engine.watching

    suspend fun watch(on: Boolean) = engine.watch(on)
}
