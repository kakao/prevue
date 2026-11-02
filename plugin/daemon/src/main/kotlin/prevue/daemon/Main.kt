package prevue.daemon

import java.io.File
import java.lang.management.ManagementFactory
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import prevue.daemon.adapter.compile.HotCompiler
import prevue.daemon.adapter.dump.AppIdentity
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.daemon.adapter.dump.WatchGraph
import prevue.daemon.adapter.process.ProcessMemory
import prevue.daemon.adapter.process.Respawn
import prevue.daemon.adapter.process.Reveal
import prevue.daemon.adapter.render.ApkWithAssets
import prevue.daemon.adapter.render.BootingEngine
import prevue.daemon.adapter.render.RenderEngine
import prevue.daemon.adapter.source.GitHead
import prevue.daemon.adapter.source.ProjectFiles
import prevue.daemon.adapter.source.SourcePreviewRepository
import prevue.daemon.adapter.watch.PollingBuildWatcher
import prevue.daemon.adapter.watch.PollingSourceWatcher
import prevue.daemon.entity.ModuleGraph
import prevue.daemon.domain.Ports
import prevue.daemon.domain.UseCases
import prevue.daemon.domain.Watchers
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.domain.port.Clock
import prevue.daemon.domain.model.ModuleInfo

private fun usage(): Nothing {
    System.err.println(
        """
        prevue.daemon.MainKt --classpath <module-classpath.json> --layoutlib <layoutlib-data dir> --compiler <compiler jars dir>
                          --bridge <bridge classes dir> --viewer <viewer dir> [--out <dir>] [--overlay <dir>] [--port ${DaemonArgs.DEFAULT_PORT}]
                          [--android-jar <path>] [--show <file|FQN>[#index]] [--no-watch] [--watch <extra dir>]... [--no-preload]
                          [--resources-from <app-classpath.json>]   라이브러리 모듈용: 앱 모듈의 리소스 APK와 R.jar를 빌려 쓴다
                          [--root <prevue 체크아웃>]   status 에 싣는다 — CLI 는 자기 체크아웃이 띄운 데몬만 쓴다
        """.trimIndent(),
    )
    System.exit(2); throw IllegalStateException()
}

private class Specs(val home: ClasspathSpec, val app: ClasspathSpec?) {
    val spec: ClasspathSpec = app?.let { home.withResourcesFrom(it) } ?: home
}

private class Boot(
    val argv: List<String>,
    val args: DaemonArgs,
    val specs: Specs,
    val paths: DaemonPaths,
    val androidJar: File,
    val compilerJars: CompilerJars,
    val startedNs: Long,
) {
    val home get() = specs.home
    val app get() = specs.app
    val spec get() = specs.spec

    fun specOf(module: String): ClasspathSpec {
        val app = app
        return when {
            module == home.project -> home
            app != null && module == app.project -> app
            else -> paths.dumpOf(module, home.variant).takeIf { it.isFile }?.let(ClasspathSpec::load) ?: (app ?: home).dependency(module)
        }
    }

    fun hotCompiler() = HotCompiler(
        ::specOf, compilerJars.jars, args.bridge, compilerJars.composePlugin, androidJar, paths.overlay, paths.overlayModules,
    )
}

fun main(argv: Array<String>) {
    val args = try { DaemonArgs.parse(argv) } catch (e: UsageException) { usage() }
    val specs = Specs(ClasspathSpec.load(args.classpath), args.resourcesFrom?.let { ClasspathSpec.load(it) })
    val spec = specs.spec
    val paths = DaemonPaths.of(args, spec.project)
    val androidJar = args.androidJar ?: AndroidPlatforms.findJar()
    require(spec.resourceApkPath.isNotBlank()) {
        "${spec.project}(${spec.variant})에 리소스 APK가 없다 — 라이브러리 모듈은 혼자서는 못 그린다. " +
            "이 모듈을 포함하는 앱 모듈의 덤프를 --resources-from <app.json>으로 준다"
    }
    val t0 = System.nanoTime()
    log("부트스트랩: ${spec.project} ${spec.variant} / kotlin module '${spec.kotlinModuleName}' / android.jar ${androidJar.name}")
    paths.reset()
    val compilerJars = CompilerJars.find(args.compiler)
    val idleMin = PrevueDaemon.idleMinutes(System.getenv("PREVUE_IDLE_MIN"))
    Respawn.writePid()
    val daemon = PrevueDaemon(idleTimeoutMs = idleMin * 60_000, log = ::log)
    val boot = Boot(argv.toList(), args, specs, paths, androidJar, compilerJars, t0)
    runDaemon(daemon, boot)?.let { respawn(it) }
    kotlin.system.exitProcess(0)
}

private fun runDaemon(daemon: PrevueDaemon, boot: Boot): List<String>? {
    try {
        return daemon.run { assemble(boot) }
    } catch (e: java.net.BindException) {
        log("포트를 열지 못했다 — 이미 데몬이 있거나 자리가 물려 있다: $e")
        kotlin.system.exitProcess(3)
    } catch (e: java.io.IOException) {
        log("데몬 시작·실행 실패 — 경로·포트·입출력을 확인한다: $e")
        kotlin.system.exitProcess(3)
    } catch (e: Throwable) {
        log("데몬 실패: $e"); e.printStackTrace()
        kotlin.system.exitProcess(1)
    }
}

private fun respawn(args: List<String>) {
    log("같은 자리에 다시 띄운다: ${args.windowed(2).firstOrNull { it[0] == "--show" }?.get(1) ?: "보드 없이"}")
    runCatching { Respawn.start("prevue.daemon.MainKt", args) }.onFailure { log("다시 띄우지 못했다: $it") }
}

private fun PrevueDaemon.assemble(boot: Boot) {
    val (renderSpec, onApp) = ClasspathSpec.forRender(boot.home, boot.app, boot.paths.overlay)
    val app = boot.app
    if (app != null && !onApp) log("${app.project}가 ${boot.home.project}를 담지 않는다 — 모듈 클래스패스에 ${app.project}의 리소스를 빌려 그린다")
    val renderApp = if (app == null) boot.home else app.takeIf { onApp }
    val graph = renderApp?.let { WatchGraph.ofApp(boot.home, it) } ?: WatchGraph.of(boot.home, app ?: boot.home)
    val compiler = own(boot.hotCompiler())
    boot.paths.thumbs.deleteRecursively()
    val engine = own(bootEngine(boot, renderSpec))
    val module = moduleInfo(boot, renderSpec, graph, rendersApp = renderApp != null)
    val files = ProjectFiles(boot.spec.repoRoot, graph.roots).apply { buildInBackground(scope) }
    val watches = Watches.of(boot.args, graph, boot.spec)
    val ws = Workspace(module, Clock(System::currentTimeMillis), graph, watches.roots + watches.valueDirs)
    val uc = useCases(ws, engine, compiler, SourcePreviewRepository(renderSpec.classPath), files, watches)
    log("values XML ${uc.rememberValues()}개")
    indexPreviewFiles(uc)
    val ui = entryPoints(uc, boot)
    watchRenderer(engine, boot, uc, ui)
    serve(ui) { uc.readStatus().lastRenderMs }
    log("http://127.0.0.1:${boot.args.port}/  (${(System.nanoTime() - boot.startedNs) / 1_000_000}ms)")
    if (watches.watching) watches.report(graph)
    val initial = boot.args.show?.let { showInitial(it, uc) }
    warmUp(boot, compiler, graph, after = initial)
}

private fun PrevueDaemon.bootEngine(boot: Boot, renderSpec: ClasspathSpec) = BootingEngine(scope, boot.paths.out) {
    val original = File(renderSpec.resourceApkPath)
    val t = System.nanoTime()
    val apk = runCatching { ApkWithAssets.of(original, renderSpec.assetsDirs.map(::File), boot.paths.mine) }
        .onFailure { log("CMP 리소스를 리소스 APK에 합치지 못해 원본으로 그린다 — Res 글꼴 · 문자열이 빠진다: $it") }
        .getOrDefault(original)
    if (apk != original) log("리소스 APK에 CMP 리소스를 합친 사본 ${(System.nanoTime() - t) / 1_000_000}ms: $apk")
    RenderEngine(renderSpec, boot.args.layoutlib, boot.paths.out, apk).apply { preloadNext = boot.args.preload }.also { e ->
        log("렌더러 준비 ${e.bootstrapMs}ms" + (e.negatives?.let { " · APK 음수 치수 ${it.count}개 바로잡음 ${it.ms}ms" } ?: ""))
    }
}

private fun PrevueDaemon.watchRenderer(engine: BootingEngine, boot: Boot, uc: UseCases, ui: EntryPoints) {
    scope.launch(CoroutineName("prevue-lost")) {
        val booted = try { engine.await() }
            catch (e: CancellationException) { throw e }
            catch (e: Throwable) { requestFailure("렌더러를 띄우지 못했다", e); return@launch }
        val lost = booted.lost.filterNotNull().first()
        respawnLater(boot.argv, uc, ui, lost.reason.text, lost.preview.file)
    }
}

private fun moduleInfo(boot: Boot, renderSpec: ClasspathSpec, graph: ModuleGraph, rendersApp: Boolean): ModuleInfo {
    val spec = boot.spec
    return ModuleInfo(
        spec.repoRoot.absolutePath, spec.project, spec.variant, spec.kotlinModuleName,
        renderSpec.borrowedFrom, renderSpec.borrowedCount.takeIf { it > 0 },
        modules = if (rendersApp) graph.nodes.map { it.path } else listOf(boot.home.project),
    )
}

private class Watches(
    val watching: Boolean,
    val roots: List<File>,
    val valueDirs: List<File>,
    val ownOut: List<File>,
    val depOut: List<File>,
    val resources: List<File>,
    val buildFiles: List<File>,
) {
    fun buildGroups() = listOf("own" to ownOut, "deps" to depOut, "resources" to resources, "build-files" to buildFiles)

    fun report(graph: ModuleGraph) {
        log("감시 중: 모듈 ${graph.nodes.size}개 · 루트 ${roots.size}개 (${graph.nodes.joinToString { it.path }})")
        log("밖의 변화 감시: 산출물 ${ownOut.size}+${depOut.size} · 리소스 ${resources.size} · 빌드 파일 ${buildFiles.size}")
    }

    companion object {
        fun of(args: DaemonArgs, graph: ModuleGraph, spec: ClasspathSpec): Watches {
            val watching = args.watching
            val roots = if (!watching) emptyList() else
                (graph.roots + args.extraWatch.filter { it.isDirectory }).map { it.canonicalFile }.distinct()
            val valueDirs = if (!watching) emptyList() else graph.valueDirs.map { it.canonicalFile }
            val rJars = spec.rClassJars.map { File(it) }
            val ownOut = graph.nodes.flatMap { it.outputs }.filter { it !in rJars && it.exists() }
            val depOut = spec.projectClassPath.map { File(it) }.filter { it !in ownOut && it !in rJars && it.exists() }
            val resDirs = graph.nodes.flatMap { it.resRoots }
                .flatMap { r -> r.walkTopDown().filter { it.isDirectory } }
                .filter { it.canonicalFile !in valueDirs }
            val assetDirs = ApkWithAssets.cmpRoots(spec.assetsDirs.map(::File)).flatMap { r -> r.walkTopDown().filter { it.isDirectory } }
            val resources = (listOfNotNull(spec.resourceApkPath.takeIf { it.isNotBlank() }?.let { File(it) }) + rJars)
                .filter { it.exists() } + resDirs + assetDirs
            return Watches(watching, roots, valueDirs, ownOut, depOut, resources, spec.buildFiles)
        }
    }
}

private fun PrevueDaemon.useCases(
    ws: Workspace,
    engine: BootingEngine,
    compiler: HotCompiler,
    previews: SourcePreviewRepository,
    files: ProjectFiles,
    w: Watches,
): UseCases = UseCases(ws,
    Ports(engine, engine, compiler, previews, files, memory = ProcessMemory, resources = engine.resources), scope,
    Watchers(
        sources = if (w.watching) PollingSourceWatcher(w.roots) else null,
        builds = if (w.watching) PollingBuildWatcher(w.buildGroups()) else null,
        values = if (w.watching) PollingSourceWatcher(w.valueDirs, extension = "xml").apply { statSliceTicks = 1 } else null,
    ),
)

private fun PrevueDaemon.indexPreviewFiles(uc: UseCases) {
    scope.launch(Dispatchers.IO + CoroutineName("prevue-preview-files")) {
        val t = System.nanoTime()
        runCatching { uc.indexPreviewFiles() }.onSuccess {
            log("프리뷰 파일 ${uc.readPreviewFiles()?.size ?: 0}개 (${(System.nanoTime() - t) / 1_000_000}ms)")
        }.onFailure { if (it is CancellationException) throw it else log("프리뷰 파일 색인 실패: $it") }
    }
}

private fun PrevueDaemon.entryPoints(uc: UseCases, boot: Boot): EntryPoints {
    val identity = (boot.app ?: boot.home).let { AppIdentity(it.manifests, it.resourceDirs.map(::File)) }
    val repoRoot = boot.spec.repoRoot
    return EntryPoints(uc, boot.args.port,
        checkout = PrevueCheckout(boot.args.viewer, root = boot.args.root),
        outDir = boot.paths.out,
        parentScope = scope,
        onShutdown = { requestStop("HTTP /shutdown") },
        log = ::log,
        target = TargetRepo(app = { identity.name to identity.icon }, branch = { GitHead.read(repoRoot) }, reveal = { Reveal.open(repoRoot) }),
    )
}

private fun PrevueDaemon.respawnLater(
    argv: List<String>,
    uc: UseCases,
    ui: EntryPoints,
    reason: String,
    hung: File?,
) {
    log(reason)
    scope.launch(CoroutineName("prevue-respawn")) {
        kotlinx.coroutines.delay(500)
        val board = runCatching { uc.readStatus().board?.file }.getOrNull()
        val respawn = if (Respawn.allowed()) Respawn.args(argv, board, hung) else null
        if (respawn != null) { ui.announceRestart(); requestRestart(reason, respawn) }
        else requestStop("1분 안에 또 렌더 스레드를 잃었다 — 다시 띄우지 않는다. 루프를 고치고 prevue start")
    }
}

private fun PrevueDaemon.warmUp(boot: Boot, compiler: HotCompiler, graph: ModuleGraph, after: Job?) {
    scope.launch(CoroutineName("prevue-warmup")) {
        after?.join()
        val warmFile = boot.args.show?.substringBefore('#')?.let { File(it) }?.takeIf { it.isFile }
            ?: boot.spec.sourceRoots.asSequence().flatMap { it.walkTopDown() }.takeWhile { isActive }.firstOrNull {
                it.extension == "kt" && it.readText().contains("@Preview")
            }
        if (warmFile == null || !isActive) return@launch
        val r = compiler.warmUp(graph.ownerOf(warmFile.canonicalFile), warmFile, boot.paths.warmup, shouldContinue = { isActive })
        val last = r.lastOrNull()
        log("컴파일러 웜업 ${r.size}회 ${r.joinToString("·") { it.ms.toString() }}ms ${last?.exitCode}" +
            if (last?.ok == false) "\n${last.messages}" else "")
    }
}

private fun PrevueDaemon.showInitial(target: String, uc: UseCases): Job =
    scope.launch(CoroutineName("prevue-initial-preview")) {
        val (t, idx) = target.substringBefore('#') to target.substringAfter('#', "").toIntOrNull()
        try {
            val r = uc.openPreview(t, idx, emptyMap(), "cli", since = ManagementFactory.getRuntimeMXBean().startTime).shot.out
            val n = uc.readStatus().board?.cards?.size
            log("show ${r.preview.previewId}: ok=${r.ok} task=${r.taskMs}ms render=${r.renderMs}ms" +
                (n?.let { " board=${it}장" } ?: "") + " ${r.failure ?: ""} ${r.image ?: r.message?.text}")
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { log("show 실패: $e"); e.printStackTrace() }
    }

private fun log(s: String) = println("[prevue ${java.time.LocalTime.now().withNano(0)}] $s")
