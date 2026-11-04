package prevue.daemon

import java.io.File
import java.lang.management.ManagementFactory
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import dev.zacsweers.metro.createGraphFactory
import prevue.adapter.entry.EntryPoints
import prevue.adapter.entry.PrevueCheckout
import prevue.adapter.infra.InfraConfig
import prevue.adapter.infra.RendererLoss

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

private class Boot(val argv: List<String>, val args: DaemonArgs, val startedNs: Long) {
    val infra = InfraConfig(args.classpath, args.layoutlib, args.compiler, args.bridge, args.port,
        resourcesFrom = args.resourcesFrom, out = args.out, overlay = args.overlay, androidJar = args.androidJar,
        watching = args.watching, extraWatch = args.extraWatch, preload = args.preload)
}

fun main(argv: Array<String>) {
    val args = try { DaemonArgs.parse(argv) } catch (e: UsageException) { usage() }
    val idleMin = PrevueDaemon.idleMinutes(System.getenv("PREVUE_IDLE_MIN"))
    Respawn.writePid()
    val daemon = PrevueDaemon(idleTimeoutMs = idleMin * 60_000, log = ::log)
    val boot = Boot(argv.toList(), args, System.nanoTime())
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
    val graph = createGraphFactory<PrevueGraph.Factory>()
        .create(boot.infra, scope, PrevueCheckout(boot.args.viewer, root = boot.args.root), DaemonHooks(::log) { requestStop("HTTP /shutdown") }, closer)
    val renderer = graph.rendererLoss
    graph.startDaemon()
    log("values XML ${graph.rememberValues()}개")
    indexPreviewFiles(graph)
    val ui = graph.entryPoints
    watchRenderer(renderer, boot, graph, ui)
    val readStatus = graph.readStatus
    serve(ui) { readStatus().lastRenderMs }
    log("http://127.0.0.1:${boot.args.port}/  (${(System.nanoTime() - boot.startedNs) / 1_000_000}ms)")
    val initial = boot.args.show?.let { showInitial(it, graph) }
    graph.compilerWarmUp.start(boot.args.show, after = initial)
}

private fun PrevueDaemon.watchRenderer(loss: RendererLoss, boot: Boot, graph: PrevueGraph, ui: EntryPoints) {
    scope.launch(CoroutineName("prevue-lost")) {
        val lost = try { loss.await() }
            catch (e: CancellationException) { throw e }
            catch (e: Throwable) { requestFailure("렌더러를 띄우지 못했다", e); return@launch }
        respawnLater(boot.argv, graph, ui, lost.first, lost.second)
    }
}

private fun PrevueDaemon.indexPreviewFiles(graph: PrevueGraph) {
    scope.launch(Dispatchers.IO + CoroutineName("prevue-preview-files")) {
        val t = System.nanoTime()
        runCatching { graph.indexPreviewFiles() }.onSuccess {
            log("프리뷰 파일 ${graph.readPreviewFiles()?.size ?: 0}개 (${(System.nanoTime() - t) / 1_000_000}ms)")
        }.onFailure { if (it is CancellationException) throw it else log("프리뷰 파일 색인 실패: $it") }
    }
}

private fun PrevueDaemon.respawnLater(
    argv: List<String>,
    graph: PrevueGraph,
    ui: EntryPoints,
    reason: String,
    hung: File?,
) {
    log(reason)
    scope.launch(CoroutineName("prevue-respawn")) {
        kotlinx.coroutines.delay(500)
        val board = runCatching { graph.readStatus().board?.file }.getOrNull()
        val respawn = if (Respawn.allowed()) Respawn.args(argv, board, hung) else null
        if (respawn != null) { ui.announceRestart(); requestRestart(reason, respawn) }
        else requestStop("1분 안에 또 렌더 스레드를 잃었다 — 다시 띄우지 않는다. 루프를 고치고 prevue start")
    }
}

private fun PrevueDaemon.showInitial(target: String, graph: PrevueGraph): Job =
    scope.launch(CoroutineName("prevue-initial-preview")) {
        val (t, idx) = target.substringBefore('#') to target.substringAfter('#', "").toIntOrNull()
        try {
            val r = graph.openPreview(t, idx, emptyMap(), "cli", since = ManagementFactory.getRuntimeMXBean().startTime).shot.out
            val n = graph.readStatus().board?.cards?.size
            log("show ${r.preview.previewId}: ok=${r.ok} task=${r.taskMs}ms render=${r.renderMs}ms" +
                (n?.let { " board=${it}장" } ?: "") + " ${r.failure ?: ""} ${r.image ?: r.message?.text}")
        } catch (e: CancellationException) { throw e }
        catch (e: Exception) { log("show 실패: $e"); e.printStackTrace() }
    }

private fun log(s: String) = println("[prevue ${java.time.LocalTime.now().withNano(0)}] $s")
