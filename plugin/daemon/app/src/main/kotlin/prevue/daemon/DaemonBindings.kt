package prevue.daemon

import java.io.File
import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.adapter.entry.EntryHooks
import prevue.adapter.entry.TargetRepo
import prevue.adapter.infra.InfraConfig
import prevue.adapter.infra.InfraLog
import prevue.adapter.infra.TargetCheckout
import prevue.adapter.infra.WatchRoots
import prevue.domain.port.Clock
import prevue.domain.runtime.Workspace
import prevue.entity.ModuleGraph
import prevue.entity.ModuleInfo

internal class DaemonHooks(val log: (String) -> Unit, val onShutdown: () -> Unit)

@ContributesTo(AppScope::class)
@BindingContainer
internal object DaemonBindings {
    @Provides
    fun infraLog(hooks: DaemonHooks): InfraLog = InfraLog { hooks.log(it) }

    @Provides @SingleIn(AppScope::class)
    fun workspace(module: ModuleInfo, graph: ModuleGraph, @WatchRoots roots: List<File>): Workspace =
        Workspace(module, Clock(System::currentTimeMillis), graph, roots)

    @Provides
    fun entryHooks(config: InfraConfig, hooks: DaemonHooks): EntryHooks = EntryHooks(config.port, hooks.log, hooks.onShutdown)

    @Provides
    fun targetRepo(target: TargetCheckout): TargetRepo =
        TargetRepo(target.outDir, app = { target.appName to target.appIcon }, branch = target::branch, reveal = target::reveal)
}
