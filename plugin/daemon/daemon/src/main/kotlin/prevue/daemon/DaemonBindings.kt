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
import prevue.infrastructure.bindings.InfraLog
import prevue.infrastructure.bindings.TargetCheckout
import prevue.infrastructure.bindings.WatchRoots
import prevue.application.port.Clock
import prevue.application.port.EngineLog
import prevue.application.port.MonotonicClock
import prevue.application.domain.model.ModuleGraph
import prevue.application.domain.model.ModuleInfo
import prevue.infrastructure.store.InMemoryWorkspace

@ContributesTo(AppScope::class)
@BindingContainer
internal object DaemonBindings {
    @Provides
    fun infraLog(hooks: EntryHooks): InfraLog = InfraLog { hooks.log(it) }

    @Provides
    fun engineLog(hooks: EntryHooks): EngineLog = EngineLog { hooks.log(it) }

    @Provides
    fun monotonicClock(): MonotonicClock = MonotonicClock.SYSTEM

    @Provides @SingleIn(AppScope::class)
    fun workspace(module: ModuleInfo, graph: ModuleGraph, @WatchRoots roots: List<File>): Workspace =
        InMemoryWorkspace(module, Clock(System::currentTimeMillis), graph, roots)

    @Provides
    fun targetRepo(target: TargetCheckout): TargetRepo =
        TargetRepo(target.outDir, app = { target.appName to target.appIcon }, branch = target::branch, reveal = target::reveal)
}
