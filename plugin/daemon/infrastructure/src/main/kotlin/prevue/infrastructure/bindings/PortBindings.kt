package prevue.infrastructure.bindings

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.infrastructure.compile.HotCompiler
import prevue.infrastructure.render.BootingEngine
import prevue.infrastructure.watch.PollingBuildWatcher
import prevue.infrastructure.watch.PollingSourceWatcher
import prevue.application.port.BuildWatcher
import prevue.application.port.Compiler
import prevue.application.port.LiveSessionFactory
import prevue.application.port.PreviewRenderer
import prevue.application.port.PrevueDispatchers
import prevue.application.port.ResourceValues
import prevue.application.port.SourceWatcher
import prevue.application.port.ValueFiles

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
