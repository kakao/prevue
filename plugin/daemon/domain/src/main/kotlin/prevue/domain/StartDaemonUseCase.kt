package prevue.domain

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import prevue.domain.port.PreviewRenderer
import prevue.domain.runtime.EngineActor
import prevue.domain.runtime.Workspace

@SingleIn(AppScope::class)
@Inject
class StartDaemonUseCase(
    private val ws: Workspace,
    private val renderer: PreviewRenderer,
    private val engine: EngineActor,
    private val settle: SettleUseCase,
    private val postures: DrawPosturesUseCase,
    private val scope: CoroutineScope,
) {
    private val started = MutableStateFlow(false)

    operator fun invoke() {
        if (!started.compareAndSet(expect = false, update = true)) return
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
