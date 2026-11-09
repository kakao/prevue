package prevue.infrastructure.render

import com.android.ide.common.rendering.api.SessionParams
import com.android.tools.rendering.RenderTask
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.SystemBars
import prevue.application.domain.model.systemBars

internal object LayoutlibBars {
    private const val BARS_THEME = "@android:style/Theme.Material.Light.NoActionBar"

    // 외부: compose-preview-renderer 부트스트랩이 모든 태스크 빌더에 disableDecorations · SHRINK 를 걸어 showSystemUi 여도 바가 없다
    fun decorated(task: RenderTask, p: PreviewSpec): RenderTask = task.also {
        when (p.systemBars) {
            SystemBars.Hidden -> Unit
            is SystemBars.Shown -> {
                it.context.configuration.setTheme(BARS_THEME)
                it.setDecorations(true)
                it.setRenderingMode(SessionParams.RenderingMode.NORMAL)
            }
        }
    }
}
