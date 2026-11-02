package prevue.daemon.adapter.render

import prevue.daemon.entity.phrase
import prevue.daemon.entity.Phrase
import com.android.tools.rendering.RenderService
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import prevue.daemon.entity.PreviewSpec

class Lost(val reason: Phrase, val preview: PreviewSpec)

internal class RenderThreadWatch {
    private val _lost = MutableStateFlow<Lost?>(null)
    val lost: StateFlow<Lost?> = _lost.asStateFlow()
    val reason: Phrase? get() = _lost.value?.reason

    suspend fun hung(p: PreviewSpec, timedOut: Boolean): Boolean = withContext(NonCancellable) {
        if (reason != null) return@withContext true
        val until = System.nanoTime() + (if (timedOut) 0 else GRACE_MS) * 1_000_000
        while (RenderService.isBusy()) {
            if (System.nanoTime() >= until) {
                _lost.value = Lost(phrase("render.threadLost", "preview" to p.previewId), p)
                return@withContext true
            }
            delay(POLL_MS)
        }
        false
    }

    private companion object {
        const val GRACE_MS = 2_000L
        const val POLL_MS = 20L
    }
}
