package prevue.daemon

import java.io.File
import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.application.port.Workspace
import prevue.infrastructure.bindings.EntryHooks
import prevue.infrastructure.bindings.TargetRepo
import prevue.infrastructure.bindings.InfraConfig
import prevue.infrastructure.bindings.InfraLog
import prevue.infrastructure.bindings.TargetCheckout
import prevue.infrastructure.bindings.WatchRoots
import prevue.application.port.Clock
import prevue.application.domain.model.ModuleGraph
import prevue.application.domain.model.ModuleInfo
import prevue.infrastructure.store.InMemoryWorkspace

internal class DaemonHooks(val log: (String) -> Unit, val onShutdown: () -> Unit)

@ContributesTo(AppScope::class)
@BindingContainer
internal object DaemonBindings {
    @Provides
    fun infraLog(hooks: DaemonHooks): InfraLog = InfraLog { hooks.log(it) }

    @Provides @SingleIn(AppScope::class)
    fun workspace(module: ModuleInfo, graph: ModuleGraph, @WatchRoots roots: List<File>): Workspace =
        InMemoryWorkspace(module, Clock(System::currentTimeMillis), graph, roots)

    @Provides
    fun entryHooks(config: InfraConfig, hooks: DaemonHooks): EntryHooks = EntryHooks(config.port, hooks.log, hooks.onShutdown)

    @Provides
    fun targetRepo(target: TargetCheckout): TargetRepo =
        TargetRepo(target.outDir, app = { target.appName to target.appIcon }, branch = target::branch, reveal = target::reveal)
}
