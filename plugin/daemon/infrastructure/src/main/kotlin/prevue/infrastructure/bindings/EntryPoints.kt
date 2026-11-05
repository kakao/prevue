package prevue.infrastructure.bindings

import java.io.File
import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import prevue.infrastructure.controller.http.EntryLog
import prevue.infrastructure.controller.http.Relay
import prevue.infrastructure.controller.http.Server
import prevue.infrastructure.controller.browser.BrowserEndpoint
import prevue.infrastructure.controller.browser.FrameStreamer
import prevue.infrastructure.controller.browser.BrowserPresenter
import prevue.infrastructure.controller.hotswap.HotSwapRunner

public class PrevueCheckout(internal val viewer: File, internal val root: String? = null) {
    internal fun version(): String? = File(viewer.absoluteFile.parentFile, "VERSION").takeIf { it.isFile }?.readText()?.trim()
}

public class TargetRepo(
    internal val outDir: File,
    internal val app: () -> Pair<String?, ByteArray?> = { null to null },
    internal val branch: (() -> String?)? = null,
    internal val reveal: (() -> Unit)? = null,
)

public class EntryHooks(
    internal val port: Int,
    internal val log: (String) -> Unit = {},
    internal val onShutdown: () -> Unit = {},
)

@SingleIn(AppScope::class)
public class EntryPoints @Inject internal constructor(
    internal val server: Server,
    internal val browser: BrowserEndpoint,
    internal val frames: FrameStreamer,
    presenter: BrowserPresenter,
    internal val hotSwap: HotSwapRunner,
    private val relay: Relay,
    log: EntryLog,
) {
    init {
        relay.scope.launch { presenter.state.collect(browser::pushState) }
        relay.scope.launch { presenter.events.collect(browser::pushUi) }
        relay.scope.launch { hotSwap.logs.collect(log::invoke) }
    }

    public val lastActivityMs: Long get() = server.lastActivityMs

    public fun start(): Unit { server.start(); startWatching() }
    internal fun startWatching() = hotSwap.start(relay.scope)
    public fun announceRestart(): Unit = browser.announceRestart()
    public fun stopInputs(): Unit {
        try { server.stopAccepting() } finally {
            try { browser.close() } finally { frames.stop() }
        }
    }
    public suspend fun awaitStopped(): Unit { frames.awaitStopped(); server.awaitStopped() }
    internal suspend fun stop() {
        try { stopInputs() } finally {
            relay.scope.cancel()
            relay.job.join()
            awaitStopped()
        }
    }
}
