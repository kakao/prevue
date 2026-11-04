package prevue.adapter.infra

import java.io.File
import kotlinx.coroutines.CoroutineScope
import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.adapter.compile.HotCompiler
import prevue.adapter.dump.ClasspathSpec
import prevue.adapter.render.ApkWithAssets
import prevue.adapter.render.BootingEngine
import prevue.adapter.render.RenderEngine
import prevue.adapter.source.SourcePreviewRepository
import prevue.domain.port.PreviewRepository
import prevue.domain.port.PrevueDispatchers

@ContributesTo(AppScope::class)
@BindingContainer
public object RenderBindings {
    @Provides @SingleIn(AppScope::class)
    internal fun renderSpec(dumps: Dumps, compiler: HotCompiler, log: InfraLog): ClasspathSpec {
        val (spec, onApp) = ClasspathSpec.forRender(dumps.home, dumps.app, compiler.overlayDir)
        val app = dumps.app
        if (app != null && !onApp) log("${app.project}가 ${dumps.home.project}를 담지 않는다 — 모듈 클래스패스에 ${app.project}의 리소스를 빌려 그린다")
        return spec
    }

    @Provides @SingleIn(AppScope::class)
    internal fun engine(boot: EngineBoot, paths: DaemonPaths, scope: CoroutineScope, closer: Closer, dispatchers: PrevueDispatchers): BootingEngine =
        closer.own(BootingEngine(scope, paths.out, dispatchers, boot::boot))

    @Provides @SingleIn(AppScope::class)
    internal fun previews(renderSpec: ClasspathSpec): PreviewRepository = SourcePreviewRepository(renderSpec.classPath)
}

public class EngineBoot @Inject internal constructor(
    private val config: InfraConfig,
    private val renderSpec: ClasspathSpec,
    private val paths: DaemonPaths,
    private val log: InfraLog,
    private val dispatchers: PrevueDispatchers,
) {
    internal fun boot(): RenderEngine {
        val original = File(renderSpec.resourceApkPath)
        val t = System.nanoTime()
        val apk = runCatching { ApkWithAssets.of(original, renderSpec.assetsDirs.map(::File), paths.mine) }
            .onFailure { log("CMP 리소스를 리소스 APK에 합치지 못해 원본으로 그린다 — Res 글꼴 · 문자열이 빠진다: $it") }
            .getOrDefault(original)
        if (apk != original) log("리소스 APK에 CMP 리소스를 합친 사본 ${(System.nanoTime() - t) / 1_000_000}ms: $apk")
        return RenderEngine(renderSpec, config.layoutlib, paths.out, dispatchers, apk).apply { preloadNext = config.preload }.also { engine ->
            log("렌더러 준비 ${engine.bootstrapMs}ms" + (engine.negatives?.let { " · APK 음수 치수 ${it.count}개 바로잡음 ${it.ms}ms" } ?: ""))
        }
    }
}
