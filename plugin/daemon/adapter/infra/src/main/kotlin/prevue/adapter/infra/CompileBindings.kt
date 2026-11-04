package prevue.adapter.infra

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.adapter.compile.HotCompiler

@ContributesTo(AppScope::class)
@BindingContainer
public object CompileBindings {
    @Provides @SingleIn(AppScope::class)
    internal fun compiler(config: InfraConfig, dumps: Dumps, androidJar: AndroidJar, paths: DaemonPaths, closer: Closer, log: InfraLog): HotCompiler {
        val spec = dumps.target
        log("부트스트랩: ${spec.project} ${spec.variant} / kotlin module '${spec.kotlinModuleName}' / android.jar ${androidJar.file.name}")
        val jars = CompilerJars.find(config.compiler)
        return closer.own(HotCompiler({ dumps.specOf(it, paths) }, jars.jars, config.bridge, jars.composePlugin, androidJar.file,
            paths.overlay, paths.overlayModules))
    }
}
