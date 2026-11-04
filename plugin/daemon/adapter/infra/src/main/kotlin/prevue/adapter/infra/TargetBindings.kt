package prevue.adapter.infra

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.adapter.dump.ClasspathSpec
import prevue.adapter.dump.WatchGraph
import prevue.entity.ModuleGraph
import prevue.entity.ModuleInfo

@ContributesTo(AppScope::class)
@BindingContainer
public object TargetBindings {
    @Provides @SingleIn(AppScope::class)
    internal fun dumps(config: InfraConfig): Dumps = Dumps.load(config)

    @Provides @SingleIn(AppScope::class)
    internal fun androidJar(config: InfraConfig): AndroidJar = AndroidJar(config.androidJar ?: AndroidPlatforms.findJar())

    @Provides @SingleIn(AppScope::class)
    internal fun paths(config: InfraConfig, dumps: Dumps): DaemonPaths =
        DaemonPaths.of(config, dumps.target.project).apply { reset(); thumbs.deleteRecursively() }

    @Provides @SingleIn(AppScope::class)
    internal fun graph(dumps: Dumps): ModuleGraph =
        dumps.renderedApp?.let { WatchGraph.ofApp(dumps.home, it) } ?: WatchGraph.of(dumps.home, dumps.app ?: dumps.home)

    @Provides @SingleIn(AppScope::class)
    internal fun module(dumps: Dumps, renderSpec: ClasspathSpec, graph: ModuleGraph): ModuleInfo {
        val spec = dumps.target
        return ModuleInfo(
            spec.repoRoot.absolutePath, spec.project, spec.variant, spec.kotlinModuleName,
            renderSpec.borrowedFrom, renderSpec.borrowedCount.takeIf { it > 0 },
            modules = if (dumps.renderedApp != null) graph.nodes.map { it.path } else listOf(dumps.home.project),
        )
    }
}
