package prevue.daemon

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.DependencyGraph
import dev.zacsweers.metro.Provides
import kotlinx.coroutines.CoroutineScope
import prevue.adapter.entry.EntryPoints
import prevue.adapter.entry.PrevueCheckout
import prevue.adapter.infra.Closer
import prevue.adapter.infra.CompilerWarmUp
import prevue.adapter.infra.InfraConfig
import prevue.adapter.infra.RendererLoss
import prevue.domain.IndexPreviewFilesUseCase
import prevue.domain.OpenPreviewUseCase
import prevue.domain.ReadPreviewFilesUseCase
import prevue.domain.ReadStatusUseCase
import prevue.domain.RememberValuesUseCase
import prevue.domain.StartDaemonUseCase

@DependencyGraph(AppScope::class)
internal interface PrevueGraph {
    val rendererLoss: RendererLoss
    val startDaemon: StartDaemonUseCase
    val rememberValues: RememberValuesUseCase
    val indexPreviewFiles: IndexPreviewFilesUseCase
    val readPreviewFiles: ReadPreviewFilesUseCase
    val readStatus: ReadStatusUseCase
    val openPreview: OpenPreviewUseCase
    val entryPoints: EntryPoints
    val compilerWarmUp: CompilerWarmUp

    @DependencyGraph.Factory
    fun interface Factory {
        fun create(
            @Provides config: InfraConfig,
            @Provides scope: CoroutineScope,
            @Provides checkout: PrevueCheckout,
            @Provides hooks: DaemonHooks,
            @Provides closer: Closer,
        ): PrevueGraph
    }
}
