package prevue.daemon

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.DependencyGraph
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CoroutineScope
import prevue.adapter.entry.EntryPoints
import prevue.adapter.entry.PrevueCheckout
import prevue.adapter.entry.TargetRepo
import prevue.adapter.infra.Infra
import prevue.adapter.infra.InfraConfig
import prevue.domain.UseCases
import prevue.domain.port.Clock
import prevue.domain.port.MemoryMeter
import prevue.domain.runtime.Workspace

internal class DaemonHooks(val log: (String) -> Unit, val onShutdown: () -> Unit)

@DependencyGraph(AppScope::class)
internal interface PrevueGraph {
    val infra: Infra
    val useCases: UseCases
    val entryPoints: EntryPoints

    @Provides @SingleIn(AppScope::class)
    fun infra(config: InfraConfig, scope: CoroutineScope, memory: MemoryMeter, hooks: DaemonHooks): Infra =
        Infra(config, scope, memory, hooks.log)

    @Provides @SingleIn(AppScope::class)
    fun workspace(infra: Infra): Workspace = Workspace(infra.module, Clock(System::currentTimeMillis), infra.graph, infra.watchRoots)

    @Provides @SingleIn(AppScope::class)
    fun useCases(workspace: Workspace, infra: Infra, scope: CoroutineScope): UseCases = UseCases(workspace, infra.ports, scope, infra.watchers)

    @Provides @SingleIn(AppScope::class)
    fun entryPoints(uc: UseCases, infra: Infra, config: InfraConfig, checkout: PrevueCheckout, scope: CoroutineScope, hooks: DaemonHooks): EntryPoints =
        EntryPoints(uc, config.port, checkout, infra.outDir, scope, hooks.onShutdown, hooks.log,
            TargetRepo(app = { infra.appName to infra.appIcon }, branch = infra::branch, reveal = infra::reveal))

    @DependencyGraph.Factory
    fun interface Factory {
        fun create(
            @Provides config: InfraConfig,
            @Provides scope: CoroutineScope,
            @Provides checkout: PrevueCheckout,
            @Provides hooks: DaemonHooks,
        ): PrevueGraph
    }
}
