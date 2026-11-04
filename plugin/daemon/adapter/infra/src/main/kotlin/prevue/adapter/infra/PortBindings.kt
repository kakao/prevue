package prevue.adapter.infra

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.adapter.compile.HotCompiler
import prevue.adapter.render.BootingEngine
import prevue.adapter.watch.PollingBuildWatcher
import prevue.adapter.watch.PollingSourceWatcher
import prevue.domain.port.MemoryMeter
import prevue.domain.port.Ports
import prevue.domain.port.PreviewRepository
import prevue.domain.port.SourceFileRepository
import prevue.domain.port.Watchers

@ContributesTo(AppScope::class)
@BindingContainer
public object PortBindings {
    @Provides @SingleIn(AppScope::class)
    internal fun ports(
        engine: BootingEngine, compiler: HotCompiler, previews: PreviewRepository, sourceFiles: SourceFileRepository, memory: MemoryMeter,
    ): Ports =
        Ports(engine, engine, compiler, previews, sourceFiles, memory = memory, resources = engine.resources)

    @Provides @SingleIn(AppScope::class)
    internal fun watchers(watches: Watches): Watchers = if (!watches.watching) Watchers() else Watchers(
        sources = PollingSourceWatcher(watches.roots),
        builds = PollingBuildWatcher(watches.buildGroups()),
        values = PollingSourceWatcher(watches.valueDirs, extension = "xml").apply { statSliceTicks = 1 },
    )
}
