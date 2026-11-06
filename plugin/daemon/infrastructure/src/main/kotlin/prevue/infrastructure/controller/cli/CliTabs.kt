package prevue.infrastructure.controller.cli

import dev.zacsweers.metro.Inject
import java.io.File
import prevue.application.domain.model.PreviewSpec
import prevue.application.service.Boards
import prevue.application.service.Status
import prevue.application.service.Tabs
import prevue.application.domain.model.BoardView
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.CloseResult
import prevue.application.domain.model.FocusResult
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.Status as StatusView

@Inject
internal class CliTabs(
    private val status: Status,
    private val tabs: Tabs,
    private val boards: Boards,
) {
    suspend fun status(): StatusView { tabs.catchUp("status"); return status.read() }

    suspend fun show(target: String, index: Int?, params: Map<String, String>, by: String): Pair<ShowResult, BoardView?> =
        tabs.openPreview(target, index, params, by) to status.board()

    suspend fun close(target: String, by: String): CloseResult = tabs.closeTab(target, by)

    fun activeTab(): String? = status.activeTab()?.let { it.file?.absolutePath ?: it.fqn }

    suspend fun card(index: Int, force: Boolean, by: String): CardResult = boards.drawCard(index, force, by)
    suspend fun focus(index: Int, on: Boolean, by: String, size: ScreenSize? = null): FocusResult = boards.focus(index, on, by, size)
    fun board(): BoardView? = status.board()

    fun previews(file: File): List<PreviewSpec> = status.listPreviews(file)
}
