package prevue.infrastructure.render

import com.android.ide.common.rendering.api.SessionParams
import com.android.tools.configurations.Configuration
import com.android.tools.rendering.RenderTask
import prevue.application.domain.model.SystemBars

internal object LayoutlibBars {
    private const val BARS_THEME = "@android:style/Theme.Material.Light.NoActionBar"

    fun configure(cfg: Configuration, bars: SystemBars) = when (bars) {
        SystemBars.Hidden -> Unit
        is SystemBars.Shown -> cfg.setTheme(BARS_THEME)
    }

    // 외부: compose-preview-renderer 부트스트랩이 모든 태스크 빌더에 disableDecorations · SHRINK 를 걸어 showSystemUi 여도 바가 없다
    fun configure(task: RenderTask, bars: SystemBars) = when (bars) {
        SystemBars.Hidden -> Unit
        is SystemBars.Shown -> {
            task.setDecorations(true)
            task.setRenderingMode(SessionParams.RenderingMode.NORMAL)
        }
    }
}
