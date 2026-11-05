package prevue.infrastructure.controller.cli

import dev.zacsweers.metro.Inject
import java.io.File
import prevue.application.domain.model.PreviewSpec
import prevue.application.service.CatchUpUseCase
import prevue.application.service.CloseTabUseCase
import prevue.application.service.DrawCardUseCase
import prevue.application.service.FocusCardUseCase
import prevue.application.service.ListPreviewsUseCase
import prevue.application.service.OpenPreviewUseCase
import prevue.application.service.ReadStatusUseCase
import prevue.application.domain.model.BoardView
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.CloseResult
import prevue.application.domain.model.FocusResult
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.Status

@Inject
internal class CliTabs(
    private val readStatus: ReadStatusUseCase,
    private val catchUp: CatchUpUseCase,
    private val openPreview: OpenPreviewUseCase,
    private val closeTab: CloseTabUseCase,
    private val drawCard: DrawCardUseCase,
    private val focusCard: FocusCardUseCase,
    private val listPreviews: ListPreviewsUseCase,
) {
    suspend fun status(): Status { catchUp("status"); return readStatus() }

    suspend fun show(target: String, index: Int?, params: Map<String, String>, by: String): Pair<ShowResult, BoardView?> =
        openPreview(target, index, params, by) to readStatus().board

    suspend fun close(target: String, by: String): CloseResult = closeTab(target, by)

    fun activeTab(): String? = readStatus().tabs.firstOrNull { it.active }?.let { it.file?.absolutePath ?: it.fqn }

    suspend fun card(index: Int, force: Boolean, by: String): CardResult = drawCard(index, force, by)
    suspend fun focus(index: Int, on: Boolean, by: String, size: ScreenSize? = null): FocusResult = focusCard(index, on, by, size)
    fun board(): BoardView? = readStatus().board

    fun previews(file: File): List<PreviewSpec> = listPreviews(file)
}
