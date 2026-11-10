package prevue.infrastructure.render

import android.graphics.Insets
import android.view.DisplayCutout
import android.view.View
import android.view.ViewGroup
import android.view.ViewRootImpl
import android.view.WindowInsets
import com.android.layoutlib.bridge.impl.Layout
import kotlin.math.roundToInt
import prevue.application.domain.model.AppInsets
import prevue.application.domain.model.InsetEdges

internal object LayoutlibInsets {
    fun apply(root: ViewGroup, insets: AppInsets) {
        val layout = find(root) ?: error("layoutlib 의 바 레이아웃을 찾지 못했다")
        val impl = root.parent as? ViewRootImpl ?: error("창의 ViewRootImpl 을 찾지 못했다")
        val density = layout.context.resources.displayMetrics.density
        layout.dispatchApplyWindowInsets(overridden(windowInsets(impl), insets, density))
        layout.requestLayout()
    }

    fun overridden(original: WindowInsets, insets: AppInsets, density: Float): WindowInsets {
        val builder = WindowInsets.Builder(original)
        val cutout = insets.displayCutout.pixels(density)
        val waterfall = original.displayCutout?.waterfallInsets ?: Insets.NONE
        builder.setDisplayCutout(DisplayCutout(cutout, null, null, null, null, waterfall))
        for ((type, edges) in listOf(
            WindowInsets.Type.statusBars() to insets.statusBars,
            WindowInsets.Type.navigationBars() to insets.navigationBars,
            WindowInsets.Type.captionBar() to insets.captionBar,
            WindowInsets.Type.displayCutout() to insets.displayCutout,
        )) {
            val px = edges.pixels(density)
            builder.setInsets(type, px)
            builder.setInsetsIgnoringVisibility(type, px)
        }
        return builder.build()
    }

    private fun InsetEdges.pixels(density: Float): Insets = Insets.of(
        (left * density).roundToInt(), (top * density).roundToInt(), (right * density).roundToInt(), (bottom * density).roundToInt(),
    )

    private fun windowInsets(impl: ViewRootImpl): WindowInsets =
        ViewRootImpl::class.java.getDeclaredMethod("getWindowInsets", java.lang.Boolean.TYPE)
            .apply { isAccessible = true }.invoke(impl, true) as WindowInsets

    private fun find(v: View): Layout? {
        if (v is Layout) return v
        if (v is ViewGroup) for (i in 0 until v.childCount) find(v.getChildAt(i))?.let { return it }
        return null
    }
}
