package prevue.adapter.cli

import dev.zacsweers.metro.Inject
import java.io.File
import prevue.domain.ApplySaveUseCase
import prevue.domain.AwaitRenderUseCase
import prevue.domain.RenderAtUseCase
import prevue.domain.RerenderUseCase
import prevue.domain.ShowPreviewUseCase
import prevue.domain.model.ReloadResult
import prevue.domain.model.ShowResult
import prevue.domain.model.WaitResult

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
