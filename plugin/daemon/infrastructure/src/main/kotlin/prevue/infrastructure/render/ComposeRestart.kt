package prevue.infrastructure.render

import android.view.View
import android.view.ViewGroup

internal object ComposeRestart {
    fun withPlacedInsets(root: View): String? = runCatching {
        val views = topComposeViews(root)
        views.forEach { it.javaClass.getMethod("disposeComposition").invoke(it) }
        forgetToolingRecords(root)
        views.forEach { it.javaClass.getMethod("createComposition").invoke(it) }
        null
    }.getOrElse { (it.cause ?: it).toString() }

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

    private fun forgetToolingRecords(v: View) {
        if (v.javaClass.name == ADAPTER) {
            val record = v.javaClass.getDeclaredField("slotTableRecord").apply { isAccessible = true }.get(v)
            val store = record.javaClass.getMethod("getStore").apply { isAccessible = true }.invoke(record) as MutableSet<*>
            store.clear()
        }
        if (v is ViewGroup) for (i in 0 until v.childCount) forgetToolingRecords(v.getChildAt(i))
    }

    private const val COMPOSE_VIEW = "androidx.compose.ui.platform.AbstractComposeView"
    private const val ADAPTER = "androidx.compose.ui.tooling.ComposeViewAdapter"
}
