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
import prevue.domain.port.BuildWatcher
import prevue.domain.port.Compiler
import prevue.domain.port.LiveSessionFactory
import prevue.domain.port.PreviewRenderer
import prevue.domain.port.PrevueDispatchers
import prevue.domain.port.ResourceValues
import prevue.domain.port.SourceWatcher
import prevue.domain.port.ValueFiles

@ContributesTo(AppScope::class)
@BindingContainer
public object PortBindings {
    @Provides
    internal fun renderer(engine: BootingEngine): PreviewRenderer = engine

    @Provides
    internal fun sessions(engine: BootingEngine): LiveSessionFactory = engine

    @Provides
    internal fun compiler(compiler: HotCompiler): Compiler = compiler

    @Provides
    internal fun resources(engine: BootingEngine): ResourceValues? = engine.resources

    @Provides @SingleIn(AppScope::class)
    internal fun sources(watches: Watches, dispatchers: PrevueDispatchers): SourceWatcher? =
        if (watches.watching) PollingSourceWatcher(watches.roots, dispatchers) else null

    @Provides @SingleIn(AppScope::class)
    internal fun builds(watches: Watches, dispatchers: PrevueDispatchers): BuildWatcher? =
        if (watches.watching) PollingBuildWatcher(watches.buildGroups(), dispatchers) else null

    @Provides @SingleIn(AppScope::class) @ValueFiles
    internal fun values(watches: Watches, dispatchers: PrevueDispatchers): SourceWatcher? =
        if (watches.watching) PollingSourceWatcher(watches.valueDirs, dispatchers, extension = "xml").apply { statSliceTicks = 1 } else null
}
