package prevue.domain

import dev.zacsweers.metro.Inject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import prevue.domain.port.PreviewRenderer
import prevue.domain.runtime.EngineActor
import prevue.domain.runtime.Workspace

@Inject
class StartDaemonUseCase(
    private val ws: Workspace,
    private val renderer: PreviewRenderer,
    private val engine: EngineActor,
    private val settle: SettleUseCase,
    private val postures: DrawPosturesUseCase,
    private val scope: CoroutineScope,
) {
    operator fun invoke() {
        renderer.protect { ws.now.keepIds() }
        postures.start()
        scope.launch {
            engine.shots.collect { shot ->
                if (shot.claimed) return@collect
                try { settle(shot) } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    System.err.println("[prevue] 정착을 기록하지 못했다: $e")
                }
            }
        }
    }
}
