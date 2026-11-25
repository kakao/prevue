package prevue.infrastructure.controller.browser

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.getAndUpdate
import kotlinx.coroutines.launch
import prevue.application.domain.model.phrase
import prevue.application.service.Boards
import prevue.application.service.Live
import prevue.application.service.Status
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.SystemUi
import prevue.application.port.PrevueDispatchers

@SingleIn(AppScope::class)
@Inject
internal class BrowserInput(
    private val core: BrowserPresenter,
    private val boards: Boards,
    private val live: Live,
    private val status: Status,
    dispatchers: PrevueDispatchers,
) {
    private val sizes = Channel<ScreenSize>(Channel.CONFLATED)
    private val wheelWarned = MutableStateFlow(false)
    private val gestures = GestureLine()

    init {
        core.scope.launch(dispatchers.default) {
            for (s in sizes) {
                try { resized(s) } catch (e: CancellationException) { throw e }
                catch (e: Exception) { core.flash(phrase("resize.failed", "why" to core.why(e))) }
            }
        }
    }

    fun enterFocus(index: Int) = enqueue(GestureLine.Step.Kept { boards.focus(index, by = "viewer") })

    fun exitFocus() = enqueue(GestureLine.Step.Kept { boards.unfocusCurrent(by = "viewer") })

    fun resize(size: ScreenSize) { sizes.trySend(size) }

    fun systemUi(choice: SystemUi) = enqueue(GestureLine.Step.Kept { if (status.board() != null) live.setSystemUi(choice, by = "viewer") })

    private suspend fun resized(s: ScreenSize) {
        if (status.board() == null) return
        live.resize(s, by = "viewer")
    }

    fun touch(type: String, x: Int, y: Int) {
        val step = suspend { live.touch(type, x, y, by = "viewer", settle = false); Unit }
        enqueue(if (type.equals(DRAG, ignoreCase = true)) GestureLine.Step.Drag(step) else GestureLine.Step.Kept(step))
    }

    fun wheel(x: Int, y: Int, dx: Float, dy: Float) = enqueue(GestureLine.Step.Kept {
        if (!live.wheel(x, y, dx, dy, by = "viewer") && !wheelWarned.getAndUpdate { true }) {
            core.flash(phrase("input.wheel.failed"))
        }
    })

    private fun enqueue(step: GestureLine.Step) {
        if (gestures.add(step)) core.post { gestures.drain { core.guarded(it.run) } }
    }

    private companion object {
        const val DRAG = "drag"
    }
}
