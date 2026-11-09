package prevue.infrastructure.render

import android.graphics.Insets
import android.view.View
import android.view.ViewGroup
import android.view.ViewRootImpl
import android.view.WindowInsets
import com.android.ide.common.rendering.api.SessionParams
import com.android.layoutlib.bridge.impl.Layout
import com.android.layoutlib.bridge.util.InsetUtil
import com.android.tools.rendering.RenderTask
import kotlin.math.roundToInt
import prevue.application.domain.model.BarInsets
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.SystemBars
import prevue.application.domain.model.systemBars

internal object LayoutlibBars {
    private const val LIGHT_BARS_THEME = "@android:style/Theme.Material.Light.NoActionBar"
    private const val DARK_BARS_THEME = "@android:style/Theme.Material.NoActionBar"
    private const val UI_MODE_NIGHT_MASK = 0x30
    private const val UI_MODE_NIGHT_YES = 0x20
    private const val BAR_VIEWS = "com.android.layoutlib.bridge.bars."
    private const val CUTOUT_VIEW = "com.android.layoutlib.bridge.impl.DisplayCutoutView"

    // 외부: compose-preview-renderer 부트스트랩이 모든 태스크 빌더에 disableDecorations · SHRINK 를 걸어 showSystemUi 여도 바가 없다
    fun decorated(task: RenderTask, p: PreviewSpec): RenderTask = task.also {
        when (p.systemBars) {
            SystemBars.Hidden -> Unit
            is SystemBars.Shown -> {
                it.context.configuration.setTheme(if (night(p)) DARK_BARS_THEME else LIGHT_BARS_THEME)
                it.setDecorations(true)
                it.setRenderingMode(SessionParams.RenderingMode.NORMAL)
            }
        }
    }

    fun insetsOf(p: PreviewSpec): BarInsets? = (p.systemBars as? SystemBars.Shown)?.insets

    // 외부: layoutlib 17 은 창을 붙일 때 바 높이를 프레임워크 dimen 으로 InsetsFrameProvider 에 한 번 넣고, 바 뷰의 보임과 상관없이 그 inset 을 앱에 준다
    fun measured(root: ViewGroup, insets: BarInsets): String? {
        val layout = find(root) ?: return "layoutlib 의 바 레이아웃을 찾지 못했다"
        val impl = root.parent as? ViewRootImpl ?: return "창의 ViewRootImpl 을 찾지 못했다"
        hideBars(root)
        val density = layout.context.resources.displayMetrics.density
        val status = (insets.statusDp * density).roundToInt()
        val nav = (insets.navDp * density).roundToInt()
        for (provider in layout.insetsFrameProviders) {
            val size = provider.insetsSize ?: continue
            when {
                size.top > 0 -> provider.setInsetsSize(Insets.of(size.left, status, size.right, 0))
                size.bottom > 0 -> provider.setInsetsSize(Insets.of(size.left, 0, size.right, nav))
            }
        }
        InsetUtil.setupSysUiInsets(layout.context, impl.insetsController, layout.insetsFrameProviders)
        layout.dispatchApplyWindowInsets(windowInsets(impl))
        layout.requestLayout()
        return null
    }

    // 외부: DecorView 부터 다시 나눠 주면 DecorView 가 inset 을 먹고 앱을 edge-to-edge 밖으로 민다 — 바 레이아웃부터 나눠 준다
    private fun windowInsets(impl: ViewRootImpl): WindowInsets =
        ViewRootImpl::class.java.getDeclaredMethod("getWindowInsets", java.lang.Boolean.TYPE).apply { isAccessible = true }.invoke(impl, true) as WindowInsets

    private fun find(v: View): Layout? {
        if (v is Layout) return v
        if (v is ViewGroup) for (i in 0 until v.childCount) find(v.getChildAt(i))?.let { return it }
        return null
    }

    private fun hideBars(v: View) {
        val name = v.javaClass.name
        if (name.startsWith(BAR_VIEWS) || name == CUTOUT_VIEW) {
            v.visibility = View.INVISIBLE
            return
        }
        if (v is ViewGroup) for (i in 0 until v.childCount) hideBars(v.getChildAt(i))
    }

    private fun night(p: PreviewSpec): Boolean = (p.params["uiMode"]?.toIntOrNull() ?: 0) and UI_MODE_NIGHT_MASK == UI_MODE_NIGHT_YES
}
