package prevue.infrastructure.render

import android.graphics.Insets
import android.view.View
import android.view.ViewGroup
import android.view.ViewRootImpl
import android.view.WindowInsets
import android.widget.RelativeLayout
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

    fun fitsContent(task: RenderTask, p: PreviewSpec): Boolean = p.systemBars is SystemBars.Shown && !task.context.configuration.isEdgeToEdge

    // 외부: layoutlib 17 은 창을 붙일 때 바 높이를 프레임워크 dimen 으로 InsetsFrameProvider 에 한 번 넣고, 바 뷰의 보임과 상관없이 그 inset 을 앱에 준다
    fun place(root: ViewGroup, bars: SystemBars.Shown, fitContent: Boolean = false) {
        val layout = find(root) ?: error("layoutlib 의 바 레이아웃을 찾지 못했다")
        val impl = root.parent as? ViewRootImpl ?: error("창의 ViewRootImpl 을 찾지 못했다")
        bars.insets?.let { resize(layout, it) }
        hideDeviceBars(root, bars)
        InsetUtil.setupSysUiInsets(layout.context, impl.insetsController, layout.insetsFrameProviders)
        LayoutlibInsets.apply(root, null, fitContent)
    }

    private fun resize(layout: Layout, insets: BarInsets) {
        val density = layout.context.resources.displayMetrics.density
        val status = (insets.statusDp * density).roundToInt()
        val nav = (insets.navDp * density).roundToInt()
        for (provider in layout.insetsFrameProviders) {
            val size = provider.insetsSize ?: continue
            if (provider.type and BAR_TYPES == 0) continue
            when {
                size.top > 0 -> provider.setInsetsSize(Insets.of(size.left, status, size.right, 0))
                size.bottom > 0 -> provider.setInsetsSize(Insets.of(size.left, 0, size.right, nav))
            }
        }
    }

    private val BAR_TYPES: Int
        get() = WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars() or WindowInsets.Type.tappableElement()

    // 외부: layoutlib 17 은 앱 targetSdk 대신 시뮬 API 35 로 edge-to-edge 를 강제하므로 앱 창의 배치와 소비를 함께 맞춘다
    fun fitContent(layout: Layout, original: WindowInsets): WindowInsets {
        val edges = original.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
        val content = layout.contentRoot
        val params = content.layoutParams as RelativeLayout.LayoutParams
        if (params.leftMargin != edges.left || params.topMargin != edges.top || params.rightMargin != edges.right || params.bottomMargin != edges.bottom ||
            params.rules.any { it != 0 }) {
            content.layoutParams = RelativeLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT).apply {
                setMargins(edges.left, edges.top, edges.right, edges.bottom)
            }
        }
        return original.inset(edges.left, edges.top, edges.right, edges.bottom)
    }

    private fun find(v: View): Layout? {
        if (v is Layout) return v
        if (v is ViewGroup) for (i in 0 until v.childCount) find(v.getChildAt(i))?.let { return it }
        return null
    }

    fun hideDeviceBars(root: View, bars: SystemBars) {
        if (bars is SystemBars.Shown && bars.insets != null) hideBars(root)
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
