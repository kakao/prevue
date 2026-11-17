package prevue.infrastructure.render

import com.android.ide.common.rendering.api.RenderSession
import com.android.tools.rendering.RenderAsyncActionExecutor
import com.android.tools.rendering.RenderService
import com.android.tools.rendering.RenderTask
import com.android.tools.rendering.classloading.ModuleClassLoader
import com.android.tools.rendering.classloading.ModuleClassLoaderManager
import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer
import java.lang.ref.Reference
import java.lang.reflect.Modifier
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

internal class SessionDisposal(private val surfaces: SessionSurfaces) {
    private val threadLocalsField by lazy { Thread::class.java.getDeclaredField("threadLocals").apply { isAccessible = true } }
    private val entryValueField by lazy {
        Class.forName("java.lang.ThreadLocal\$ThreadLocalMap\$Entry").getDeclaredField("value").apply { isAccessible = true }
    }

    fun dispose(task: RenderTask) {
        try {
            val session = surfaces.renderSession.value.get(task) as? RenderSession ?: return
            val loader = (surfaces.loaderReference.value.get(task) as ModuleClassLoaderManager.Reference<*>).classLoader
            val inflated = session.rootViews != null
            surfaces.renderSession.value.set(task, null)
            session.releaseRender()
            runCatching { (surfaces.cleaner.value.invoke(null, session, loader) as CompletableFuture<*>).get(CLEAN_SEC, TimeUnit.SECONDS) }
                .onFailure { if (inflated || generateSequence(it) { e -> e.cause }.none { e -> e is NullPointerException }) throw it }
            onRenderThread { dropThreadLocals(loader); dropComposeViews(loader) }
        } finally {
            (surfaces.layoutlibCallback.value.get(task) as? Disposable)?.let { Disposer.dispose(it) }
        }
    }

    private fun dropThreadLocals(loader: ModuleClassLoader) {
        val map = threadLocalsField.get(Thread.currentThread()) ?: return
        val table = map.javaClass.getDeclaredField("table").apply { isAccessible = true }.get(map) as Array<*>
        for (e in table) {
            val v = e?.let { entryValueField.get(it) } ?: continue
            if (v.javaClass.classLoader !== loader) continue
            ((e as Reference<*>).get() as? ThreadLocal<*>)?.remove() ?: entryValueField.set(e, null)
        }
    }

    private fun dropComposeViews(loader: ModuleClassLoader) {
        if (!loader.hasLoadedClass(COMPOSE_VIEW)) return
        val list = Class.forName(COMPOSE_VIEW, false, loader).declaredFields
            .firstOrNull { it.name == "composeViews" && Modifier.isStatic(it.modifiers) }
            ?.apply { isAccessible = true }?.get(null) ?: return
        list.javaClass.getMethod("clear").invoke(list)
    }

    private fun onRenderThread(block: () -> Unit) {
        RenderService.getRenderAsyncActionExecutor().runAsyncAction(RenderAsyncActionExecutor.RenderingTopic.CLEAN, Runnable(block))
            .get(RENDER_THREAD_SEC, TimeUnit.SECONDS)
    }

    private companion object {
        const val COMPOSE_VIEW = "androidx.compose.ui.platform.AndroidComposeView"
        const val CLEAN_SEC = 5L
        const val RENDER_THREAD_SEC = 2L
    }
}
