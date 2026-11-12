package prevue.infrastructure.render

import android.view.View
import android.view.ViewGroup
import java.lang.reflect.InvocationTargetException
import java.lang.reflect.Method

internal object ComposeRestart {
    fun withPlacedInsets(root: View): String? {
        val views = try {
            topComposeViews(root).map { it to Lifecycle(it.javaClass.getMethod("disposeComposition"), it.javaClass.getMethod("createComposition")) }
        } catch (e: Exception) {
            return failed(e)
        }
        return runCatching {
            views.forEach { (v, m) -> m.dispose.invoke(v) }
            views.forEach { (v, m) -> m.create.invoke(v) }
            null
        }.getOrElse(::failed)
    }

    fun warning(why: String) = "$FAILED: $why"

    private fun failed(e: Throwable): String = ((e as? InvocationTargetException)?.cause ?: e).toString()

    private class Lifecycle(val dispose: Method, val create: Method)

    private fun topComposeViews(v: View): List<View> = when {
        isComposeView(v.javaClass) -> listOf(v)
        v is ViewGroup -> (0 until v.childCount).flatMap { topComposeViews(v.getChildAt(it)) }
        else -> emptyList()
    }

    private tailrec fun isComposeView(c: Class<*>?): Boolean = when {
        c == null -> false
        c.name == COMPOSE_VIEW -> true
        else -> isComposeView(c.superclass)
    }

    private const val COMPOSE_VIEW = "androidx.compose.ui.platform.AbstractComposeView"
    private const val FAILED = "인셋을 넣은 뒤 컴포지션을 다시 만들지 못했다 — 옆 인셋 자세에서는 칸이 인셋 전 자리에서 움직이는 중인 그림일 수 있다"
}
