package prevue.adapter.browser

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import prevue.entity.phrase
import prevue.domain.FocusCardUseCase
import prevue.domain.ReadStatusUseCase
import prevue.domain.ResizeUseCase
import prevue.domain.ScrollUseCase
import prevue.domain.TouchUseCase
import prevue.domain.model.ScreenSize
import prevue.domain.port.PrevueDispatchers

@SingleIn(AppScope::class)
@Inject
internal class BrowserInput(
    private val core: BrowserPresenter,
    private val focusCard: FocusCardUseCase,
    private val resizeScreen: ResizeUseCase,
    private val touchScreen: TouchUseCase,
    private val scroll: ScrollUseCase,
    private val readStatus: ReadStatusUseCase,
    dispatchers: PrevueDispatchers,
) {
    private val sizes = Channel<ScreenSize>(Channel.CONFLATED)
    private var wheelWarned = false

    init {
        core.scope.launch(dispatchers.default) {
            for (s in sizes) {
                try { resized(s) } catch (e: CancellationException) { throw e }
                catch (e: Exception) { core.flash(phrase("resize.failed", "why" to core.why(e))) }
            }
        }
    }

    fun enterFocus(index: Int) = core.post { focusCard(index, on = true, by = "viewer") }

    fun exitFocus() = core.post { focusCard.offCurrent(by = "viewer") }

    fun setSingleInteractive(on: Boolean) = core.post {
        if (!on) sizes.trySend(ScreenSize.Original)
        core.onLine {
            val at = System.currentTimeMillis()
            core.side.update {
                if (on) it.copy(singleInteractive = core.state.value.focus?.previewId, streamStamp = at)
                else it.copy(singleInteractive = null, stillStamp = at)
            }
        }
    }

    fun resize(size: ScreenSize) { sizes.trySend(size) }

    private suspend fun resized(s: ScreenSize) {
        val single = readStatus().board == null
        if (single && s != ScreenSize.Original && core.onLine { core.side.value.singleInteractive } == null) return
        resizeScreen(s, by = "viewer") ?: return
        if (readStatus().board != null) return
        core.onLine {
            val at = System.currentTimeMillis()
            core.side.update { if (it.singleInteractive != null) it.copy(streamStamp = at) else it }
        }
    }

    fun touch(type: String, x: Int, y: Int) = core.post { touchScreen(type, x, y, by = "viewer", settle = false) }

    fun wheel(x: Int, y: Int, dx: Float, dy: Float) = core.post {
        if (!scroll(x, y, dx, dy, by = "viewer") && core.onLine { !wheelWarned.also { wheelWarned = true } }) {
            core.flash(phrase("input.wheel.failed"))
        }
    }
}
