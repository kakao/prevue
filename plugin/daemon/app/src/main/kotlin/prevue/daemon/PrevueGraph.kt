package prevue.daemon

import java.io.File
import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.DependencyGraph
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CoroutineScope
import prevue.adapter.entry.EntryPoints
import prevue.adapter.entry.PrevueCheckout
import prevue.adapter.entry.TargetRepo
import prevue.adapter.infra.Closer
import prevue.adapter.infra.CompilerWarmUp
import prevue.adapter.infra.InfraConfig
import prevue.adapter.infra.InfraLog
import prevue.adapter.infra.RendererLoss
import prevue.adapter.infra.TargetCheckout
import prevue.adapter.infra.WatchRoots
import prevue.domain.UseCases
import prevue.domain.port.Clock
import prevue.domain.port.Ports
import prevue.domain.port.Watchers
import prevue.domain.runtime.Workspace
import prevue.entity.ModuleGraph
import prevue.entity.ModuleInfo

internal class DaemonHooks(val log: (String) -> Unit, val onShutdown: () -> Unit)

@DependencyGraph(AppScope::class)
internal interface PrevueGraph {
    val workspace: Workspace
    val useCases: UseCases
    val entryPoints: EntryPoints
    val target: TargetCheckout
    val rendererLoss: RendererLoss
    val compilerWarmUp: CompilerWarmUp

    @Provides
    fun infraLog(hooks: DaemonHooks): InfraLog = InfraLog { hooks.log(it) }

    @Provides @SingleIn(AppScope::class)
    fun workspace(module: ModuleInfo, graph: ModuleGraph, @WatchRoots roots: List<File>): Workspace =
        Workspace(module, Clock(System::currentTimeMillis), graph, roots)

    @Provides @SingleIn(AppScope::class)
    fun useCases(workspace: Workspace, ports: Ports, scope: CoroutineScope, watchers: Watchers): UseCases = UseCases(workspace, ports, scope, watchers)

    @Provides @SingleIn(AppScope::class)
    fun entryPoints(
        uc: UseCases, config: InfraConfig, checkout: PrevueCheckout, scope: CoroutineScope, hooks: DaemonHooks, target: TargetCheckout,
    ): EntryPoints =
        EntryPoints(uc, config.port, checkout, target.outDir, scope, hooks.onShutdown, hooks.log,
            TargetRepo(app = { target.appName to target.appIcon }, branch = target::branch, reveal = target::reveal))

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
