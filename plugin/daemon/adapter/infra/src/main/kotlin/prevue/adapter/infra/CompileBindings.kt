package prevue.adapter.infra

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.adapter.compile.HotCompiler
import prevue.domain.port.PrevueDispatchers

@ContributesTo(AppScope::class)
@BindingContainer
public object CompileBindings {
    @Provides @SingleIn(AppScope::class)
    internal fun compiler(
        toolchain: CompilerToolchain, dumps: Dumps, paths: DaemonPaths, closer: Closer, log: InfraLog, dispatchers: PrevueDispatchers,
    ): HotCompiler {
        val spec = dumps.target
        log("부트스트랩: ${spec.project} ${spec.variant} / kotlin module '${spec.kotlinModuleName}' / android.jar ${toolchain.androidJar.name}")
        val jars = CompilerJars.find(toolchain.compilerDir)
        return closer.own(HotCompiler({ dumps.specOf(it, paths) }, jars.jars, toolchain.bridge, jars.composePlugin, toolchain.androidJar,
            paths.overlay, paths.overlayModules, dispatchers))
    }
}
