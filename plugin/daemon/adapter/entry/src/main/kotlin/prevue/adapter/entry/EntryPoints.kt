package prevue.adapter.entry

import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import prevue.domain.UseCases
import prevue.adapter.cli.CliEndpoint
import prevue.adapter.http.Server
import prevue.adapter.browser.BrowserEndpoint
import prevue.adapter.browser.FrameStreamer
import prevue.adapter.cli.CliHandler
import prevue.adapter.browser.BrowserPresenter
import prevue.adapter.hotswap.HotSwapRunner

public class PrevueCheckout(internal val viewer: File, internal val root: String? = null) {
    internal fun version(): String? = File(viewer.absoluteFile.parentFile, "VERSION").takeIf { it.isFile }?.readText()?.trim()
}

public class TargetRepo(
    internal val app: () -> Pair<String?, ByteArray?> = { null to null },
    internal val branch: (() -> String?)? = null,
    internal val reveal: (() -> Unit)? = null,
)

public class EntryPoints(
    uc: UseCases, port: Int, checkout: PrevueCheckout, outDir: File,
    parentScope: CoroutineScope,
    onShutdown: () -> Unit,
    log: (String) -> Unit = {},
    target: TargetRepo = TargetRepo(),
) {
    private val job = SupervisorJob(parentScope.coroutineContext[Job])
    private val relay = CoroutineScope(parentScope.coroutineContext + job + Dispatchers.Default)

    internal val frames = FrameStreamer(uc.screen, uc.watching, relay, log)

    internal val browser = BrowserPresenter(uc,
        CoroutineScope(relay.coroutineContext + Dispatchers.Default.limitedParallelism(1, "prevue-viewer")), target.branch)
    internal val cli = CliHandler(uc)
    internal val hotSwap = HotSwapRunner(uc, relay)

    private val browserEndpoint = BrowserEndpoint(browser, frames, relay, target.app,
        version = checkout.version(), reveal = target.reveal, log = log)

    internal val server = Server(port, listOf(
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

    public val lastActivityMs: Long get() = server.lastActivityMs

    public fun start(): Unit { server.start(); hotSwap.start() }
    public fun announceRestart(): Unit = browserEndpoint.announceRestart()
    public fun stopInputs(): Unit {
        try { server.stopAccepting() } finally {
            try { browserEndpoint.close() } finally { frames.stop() }
        }
    }
    public suspend fun awaitStopped(): Unit { frames.awaitStopped(); server.awaitStopped() }
    internal suspend fun stop() {
        try { stopInputs() } finally {
            relay.cancel()
            job.join()
            awaitStopped()
        }
    }
}
