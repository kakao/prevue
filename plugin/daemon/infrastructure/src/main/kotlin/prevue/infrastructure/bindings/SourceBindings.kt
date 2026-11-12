package prevue.infrastructure.bindings

import java.io.File
import kotlinx.coroutines.CoroutineScope
import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.Qualifier
import dev.zacsweers.metro.SingleIn
import prevue.infrastructure.source.ProjectFiles
import prevue.application.port.SourceFileRepository
import prevue.application.port.PrevueDispatchers
import prevue.application.domain.model.ModuleGraph

@Qualifier
public annotation class WatchRoots

@ContributesTo(AppScope::class)
@BindingContainer
public object SourceBindings {
    @Provides @SingleIn(AppScope::class)
    internal fun sourceFiles(dumps: Dumps, graph: ModuleGraph, scope: CoroutineScope, dispatchers: PrevueDispatchers): SourceFileRepository =
        ProjectFiles(dumps.target.repoRoot, graph.roots, dispatchers, scope)

    @Provides @SingleIn(AppScope::class)
    internal fun watches(config: InfraConfig, graph: ModuleGraph, dumps: Dumps, log: InfraLog): Watches =
        Watches.of(config, graph, dumps.target).also { if (it.watching) it.report(graph, log::invoke) }

    @Provides @SingleIn(AppScope::class) @WatchRoots
    internal fun watchRoots(watches: Watches): List<File> = watches.roots + watches.valueDirs
}
