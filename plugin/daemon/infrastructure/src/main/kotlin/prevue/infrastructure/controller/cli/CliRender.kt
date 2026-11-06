package prevue.infrastructure.controller.cli

import dev.zacsweers.metro.Inject
import java.io.File
import prevue.application.service.HotReload
import prevue.application.service.Live
import prevue.application.service.Status
import prevue.application.service.Tabs
import prevue.application.domain.model.ReloadResult
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.WaitResult

@Inject
internal class CliRender(
    private val live: Live,
    private val tabs: Tabs,
    private val hotReload: HotReload,
    private val status: Status,
) {
    suspend fun render(at: Long?, fresh: Boolean, by: String): ShowResult = when {
        at != null -> live.renderAt(at, by)
        fresh -> tabs.showPreview(by)
        else -> live.rerender(by)
    }

    suspend fun reload(files: List<File>, by: String): ReloadResult = hotReload.applySave(files, by)
    suspend fun await(files: List<File>, timeoutMs: Long): WaitResult = status.awaitRender(files, timeoutMs)
}
