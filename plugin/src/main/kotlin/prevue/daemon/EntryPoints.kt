package prevue.daemon

import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import prevue.daemon.domain.UseCases
import prevue.daemon.adapter.cli.CliEndpoint
import prevue.daemon.adapter.http.Server
import prevue.daemon.adapter.browser.BrowserEndpoint
import prevue.daemon.adapter.browser.FrameStreamer
import prevue.daemon.adapter.cli.CliHandler
import prevue.daemon.adapter.browser.BrowserPresenter
import prevue.daemon.adapter.hotswap.HotSwapRunner

class PrevueCheckout(val viewer: File, val root: String? = null) {
    fun version(): String? = File(viewer.absoluteFile.parentFile, "VERSION").takeIf { it.isFile }?.readText()?.trim()
}

class TargetRepo(
    val app: () -> Pair<String?, ByteArray?> = { null to null },
    val branch: (() -> String?)? = null,
    val reveal: (() -> Unit)? = null,
)

class EntryPoints(
    uc: UseCases, port: Int, checkout: PrevueCheckout, outDir: File,
    parentScope: CoroutineScope,
    onShutdown: () -> Unit,
    log: (String) -> Unit = {},
    target: TargetRepo = TargetRepo(),
) {
    private val job = SupervisorJob(parentScope.coroutineContext[Job])
    private val relay = CoroutineScope(parentScope.coroutineContext + job + Dispatchers.Default)

    val frames = FrameStreamer(uc.screen, uc.watching, relay, log)

    val browser = BrowserPresenter(uc, CoroutineScope(relay.coroutineContext + Dispatchers.Default.limitedParallelism(1, "prevue-viewer")), target.branch)
    val cli = CliHandler(uc)
    val hotSwap = HotSwapRunner(uc, relay)

    private val browserEndpoint = BrowserEndpoint(browser, frames, relay, target.app,
        version = checkout.version(), reveal = target.reveal, log = log)

    val server = Server(port, listOf(
        CliEndpoint(cli, port, checkout.root) {
            val report = uc.frames.value
            mapOf(
                "frames" to report.stats, "frameTrace" to report.trace,
                "streamSubscribers" to frames.hasSubscribers, "stream" to frames.stats.value.toJson(),
                "viewers" to browserEndpoint.viewerCount,
            )
        },
        browserEndpoint,
    ), checkout.viewer, outDir, relay.coroutineContext) { restart -> if (restart) announceRestart(); onShutdown() }

    init {
        relay.launch { browser.state.collect(browserEndpoint::pushState) }
        relay.launch { browser.events.collect(browserEndpoint::pushUi) }
        relay.launch { hotSwap.logs.collect(log) }
    }

    fun start() { server.start(); hotSwap.start() }
    fun announceRestart() = browserEndpoint.announceRestart()
    fun stopInputs() {
        try { server.stopAccepting() } finally {
            try { browserEndpoint.close() } finally { frames.stop() }
        }
    }
    suspend fun awaitStopped() { frames.awaitStopped(); server.awaitStopped() }
    suspend fun stop() {
        try { stopInputs() } finally {
            relay.cancel()
            job.join()
            awaitStopped()
        }
    }
}
