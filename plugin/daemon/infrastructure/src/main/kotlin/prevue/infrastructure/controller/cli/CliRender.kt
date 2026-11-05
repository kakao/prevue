package prevue.infrastructure.controller.cli

import dev.zacsweers.metro.Inject
import java.io.File
import prevue.application.service.ApplySaveUseCase
import prevue.application.service.AwaitRenderUseCase
import prevue.application.service.RenderAtUseCase
import prevue.application.service.RerenderUseCase
import prevue.application.service.ShowPreviewUseCase
import prevue.application.domain.model.ReloadResult
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.WaitResult

@Inject
internal class CliRender(
    private val renderAt: RenderAtUseCase,
    private val showPreview: ShowPreviewUseCase,
    private val rerender: RerenderUseCase,
    private val applySave: ApplySaveUseCase,
    private val awaitRender: AwaitRenderUseCase,
) {
    suspend fun render(at: Long?, fresh: Boolean, by: String): ShowResult = when {
        at != null -> renderAt(at, by)
        fresh -> showPreview(by)
        else -> rerender(by)
    }

    suspend fun reload(files: List<File>, by: String): ReloadResult = applySave(files, by)
    suspend fun await(files: List<File>, timeoutMs: Long): WaitResult = awaitRender(files, timeoutMs)
}
