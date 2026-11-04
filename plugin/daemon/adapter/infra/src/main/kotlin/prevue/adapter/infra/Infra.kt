package prevue.adapter.infra

import java.io.File
import java.io.IOException
import java.io.UncheckedIOException
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import prevue.adapter.compile.HotCompiler
import prevue.adapter.dump.AppIdentity
import prevue.adapter.dump.ClasspathSpec
import prevue.adapter.dump.WatchGraph
import prevue.adapter.process.Reveal
import prevue.adapter.render.ApkWithAssets
import prevue.adapter.render.BootingEngine
import prevue.adapter.render.RenderEngine
import prevue.adapter.source.GitHead
import prevue.adapter.source.ProjectFiles
import prevue.adapter.source.SourcePreviewRepository
import prevue.adapter.watch.PollingBuildWatcher
import prevue.adapter.watch.PollingSourceWatcher
import prevue.domain.port.MemoryMeter
import prevue.domain.port.Ports
import prevue.domain.port.Watchers
import prevue.entity.ModuleGraph
import prevue.entity.ModuleInfo

public class Infra(
    private val config: InfraConfig,
    private val scope: CoroutineScope,
    memory: MemoryMeter,
    private val log: (String) -> Unit,
) : AutoCloseable {
    private val resources = ArrayDeque<AutoCloseable>()
    private val home = initialSpec(config.classpath)
    private val app = config.resourcesFrom?.let(::initialSpec)
    private val spec = app?.let { home.withResourcesFrom(it) } ?: home
    private val paths = DaemonPaths.of(config, spec.project)
    private val androidJar = config.androidJar ?: AndroidPlatforms.findJar()
    private val compiler: HotCompiler
    private val engine: BootingEngine
    private val identity = (app ?: home).let { AppIdentity(it.manifests, it.resourceDirs.map(::File)) }

    public val graph: ModuleGraph
    public val module: ModuleInfo
    public val ports: Ports
    public val watchers: Watchers
    public val watchRoots: List<File>
    public val outDir: File get() = paths.out
    public val appName: String? get() = identity.name
    public val appIcon: ByteArray? get() = identity.icon

    init {
        try {
            require(spec.resourceApkPath.isNotBlank()) {
                "${spec.project}(${spec.variant})에 리소스 APK가 없다 — 라이브러리 모듈은 혼자서는 못 그린다. " +
                    "이 모듈을 포함하는 앱 모듈의 덤프를 --resources-from <app.json>으로 준다"
            }
            log("부트스트랩: ${spec.project} ${spec.variant} / kotlin module '${spec.kotlinModuleName}' / android.jar ${androidJar.name}")
            paths.reset()
            val jars = CompilerJars.find(config.compiler)
            val (renderSpec, onApp) = ClasspathSpec.forRender(home, app, paths.overlay)
            if (app != null && !onApp) log("${app.project}가 ${home.project}를 담지 않는다 — 모듈 클래스패스에 ${app.project}의 리소스를 빌려 그린다")
            val renderApp = if (app == null) home else app.takeIf { onApp }
            graph = renderApp?.let { WatchGraph.ofApp(home, it) } ?: WatchGraph.of(home, app ?: home)
            compiler = own(HotCompiler(::specOf, jars.jars, config.bridge, jars.composePlugin, androidJar, paths.overlay, paths.overlayModules))
            paths.thumbs.deleteRecursively()
            engine = own(bootEngine(renderSpec))
            module = moduleInfo(renderSpec, rendersApp = renderApp != null)
            val files = ProjectFiles(spec.repoRoot, graph.roots).apply { buildInBackground(scope) }
            val watches = Watches.of(config, graph, spec)
            watchRoots = watches.roots + watches.valueDirs
            ports = Ports(engine, engine, compiler, SourcePreviewRepository(renderSpec.classPath), files,
                memory = memory, resources = engine.resources)
            watchers = Watchers(
                sources = if (watches.watching) PollingSourceWatcher(watches.roots) else null,
                builds = if (watches.watching) PollingBuildWatcher(watches.buildGroups()) else null,
                values = if (watches.watching) PollingSourceWatcher(watches.valueDirs, extension = "xml").apply { statSliceTicks = 1 } else null,
            )
            if (watches.watching) watches.report(graph, log)
        } catch (e: Throwable) {
            close()
            throw e
        }
    }

    private fun <T : AutoCloseable> own(resource: T): T = resource.also { resources.addLast(it) }

    public override fun close(): Unit {
        while (resources.isNotEmpty()) {
            val resource = resources.removeLast()
            try { resource.close() } catch (e: Exception) { log("${resource.javaClass.simpleName} 정리 실패: $e") }
        }
    }

    public fun branch(): String? = GitHead.read(spec.repoRoot)
    public fun reveal(): Unit = Reveal.open(spec.repoRoot)

    public suspend fun lost(): Pair<String, File?> {
        val lost = engine.await().lost.filterNotNull().first()
        return lost.reason.text to lost.preview.file
    }

    private fun initialSpec(file: File): ClasspathSpec = try { ClasspathSpec.load(file) }
        catch (e: IOException) { throw UncheckedIOException(e) }

    private fun specOf(module: String): ClasspathSpec = when {
        module == home.project -> home
        app != null && module == app.project -> app
        else -> paths.dumpOf(module, home.variant).takeIf { it.isFile }?.let(ClasspathSpec::load) ?: (app ?: home).dependency(module)
    }

    private fun bootEngine(renderSpec: ClasspathSpec) = BootingEngine(scope, paths.out) {
        val original = File(renderSpec.resourceApkPath)
        val t = System.nanoTime()
        val apk = runCatching { ApkWithAssets.of(original, renderSpec.assetsDirs.map(::File), paths.mine) }
            .onFailure { log("CMP 리소스를 리소스 APK에 합치지 못해 원본으로 그린다 — Res 글꼴 · 문자열이 빠진다: $it") }
            .getOrDefault(original)
        if (apk != original) log("리소스 APK에 CMP 리소스를 합친 사본 ${(System.nanoTime() - t) / 1_000_000}ms: $apk")
        RenderEngine(renderSpec, config.layoutlib, paths.out, apk).apply { preloadNext = config.preload }.also { e ->
            log("렌더러 준비 ${e.bootstrapMs}ms" + (e.negatives?.let { " · APK 음수 치수 ${it.count}개 바로잡음 ${it.ms}ms" } ?: ""))
        }
    }

    private fun moduleInfo(renderSpec: ClasspathSpec, rendersApp: Boolean): ModuleInfo {
        return ModuleInfo(
            spec.repoRoot.absolutePath, spec.project, spec.variant, spec.kotlinModuleName,
            renderSpec.borrowedFrom, renderSpec.borrowedCount.takeIf { it > 0 },
            modules = if (rendersApp) graph.nodes.map { it.path } else listOf(home.project),
        )
    }

    public fun warmUp(file: String?, after: Job?): Unit {
        scope.launch(CoroutineName("prevue-warmup")) {
            after?.join()
            val warmFile = file?.substringBefore('#')?.let { File(it) }?.takeIf { it.isFile }
                ?: spec.sourceRoots.asSequence().flatMap { it.walkTopDown() }.takeWhile { isActive }.firstOrNull {
                    it.extension == "kt" && it.readText().contains("@Preview")
                }
            if (warmFile == null || !isActive) return@launch
            val r = compiler.warmUp(graph.ownerOf(warmFile.canonicalFile), warmFile, paths.warmup, shouldContinue = { isActive })
            val last = r.lastOrNull()
            log("컴파일러 웜업 ${r.size}회 ${r.joinToString("·") { it.ms.toString() }}ms ${last?.exitCode}" +
                if (last?.ok == false) "\n${last.messages}" else "")
        }
    }
}
