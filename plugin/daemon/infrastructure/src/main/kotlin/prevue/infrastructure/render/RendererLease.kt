package prevue.infrastructure.render

import com.android.tools.rendering.RenderService
import com.android.tools.rendering.RenderTask
import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer

internal class RendererLease {
    private val root = Disposer.newCheckedDisposable()

    val released: Boolean get() = root.isDisposed

    fun build(builder: RenderService.RenderTaskBuilder): RenderTask? = builder.build(root).get()

    fun onRelease(action: () -> Unit) {
        Disposer.register(root, Disposable(action))
    }

    fun release() {
        if (!released) Disposer.dispose(root)
    }

    fun releaseQuietly() {
        runCatching { release() }.onFailure { e -> System.err.println("[prevue] 렌더러 임대 정리 실패: $e") }
    }

    companion object {
        fun releaseCallback(callback: Any?) {
            (callback as? Disposable)?.let(Disposer::dispose)
        }
    }
}
