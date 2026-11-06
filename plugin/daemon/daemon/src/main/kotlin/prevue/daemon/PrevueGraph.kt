package prevue.daemon

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.DependencyGraph
import dev.zacsweers.metro.Provides
import kotlinx.coroutines.CoroutineScope
import prevue.infrastructure.bindings.EntryPoints
import prevue.infrastructure.bindings.PrevueCheckout
import prevue.infrastructure.bindings.Closer
import prevue.infrastructure.bindings.CompilerWarmUp
import prevue.infrastructure.bindings.InfraConfig
import prevue.infrastructure.bindings.RendererLoss
import prevue.application.service.RememberValuesUseCase
import prevue.application.service.StartDaemonUseCase
import prevue.application.service.Status
import prevue.application.service.Tabs
import prevue.application.port.PrevueDispatchers

@DependencyGraph(AppScope::class)
internal interface PrevueGraph {
    val rendererLoss: RendererLoss
    val startDaemon: StartDaemonUseCase
    val rememberValues: RememberValuesUseCase
    val status: Status
    val tabs: Tabs
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
            @Provides dispatchers: PrevueDispatchers,
        ): PrevueGraph
    }
}
