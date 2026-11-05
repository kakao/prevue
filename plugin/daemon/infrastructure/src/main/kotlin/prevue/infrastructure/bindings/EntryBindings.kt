package prevue.infrastructure.bindings

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.infrastructure.controller.browser.BrowserEndpoint
import prevue.infrastructure.controller.browser.FrameStreamer
import prevue.infrastructure.controller.browser.ViewerTarget
import prevue.infrastructure.controller.http.EntryLog
import prevue.infrastructure.controller.http.HttpEndpoint
import prevue.infrastructure.controller.http.HttpSeat
import prevue.infrastructure.controller.http.LiveStats
import prevue.infrastructure.controller.http.Relay
import prevue.infrastructure.controller.http.Server
import prevue.application.service.ObserveScreenUseCase
import prevue.application.port.PrevueDispatchers

@ContributesTo(AppScope::class)
@BindingContainer
public object EntryBindings {
    @Provides
    internal fun seat(hooks: EntryHooks, checkout: PrevueCheckout): HttpSeat = HttpSeat(hooks.port, checkout.root)

    @Provides
    internal fun log(hooks: EntryHooks): EntryLog = EntryLog(hooks.log)

    @Provides @SingleIn(AppScope::class)
    internal fun viewerTarget(target: TargetRepo, checkout: PrevueCheckout): ViewerTarget =
        ViewerTarget(target.app, checkout.version(), target.branch, target.reveal)

    @Provides @SingleIn(AppScope::class)
    internal fun frames(screen: ObserveScreenUseCase, relay: Relay, log: EntryLog, dispatchers: PrevueDispatchers): FrameStreamer =
        FrameStreamer(screen.screen, screen.watching, relay.scope, log::invoke, dispatchers)

    @Provides
    internal fun liveStats(screen: ObserveScreenUseCase, frames: FrameStreamer, browser: BrowserEndpoint): LiveStats = LiveStats {
        val report = screen.frames.value
        mapOf(
            "frames" to report.stats, "frameTrace" to report.trace,
            "streamSubscribers" to frames.hasSubscribers, "stream" to frames.stats.value.toJson(),
            "viewers" to browser.viewerCount,
        )
    }

    @Provides @SingleIn(AppScope::class)
    internal fun server(
        endpoints: Set<HttpEndpoint>, hooks: EntryHooks, checkout: PrevueCheckout, target: TargetRepo, relay: Relay, browser: BrowserEndpoint,
    ): Server =
        Server(hooks.port, endpoints.toList(), checkout.viewer, target.outDir, relay.scope.coroutineContext, relay.dispatchers) { restart ->
            if (restart) browser.announceRestart()
            hooks.onShutdown()
        }
}
