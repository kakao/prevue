package prevue.infrastructure.bindings

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.ContributesTo
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.SingleIn
import prevue.infrastructure.controller.browser.FrameStreamer
import prevue.infrastructure.controller.browser.ViewerFeed
import prevue.infrastructure.controller.browser.ViewerTarget
import prevue.infrastructure.controller.http.EntryLog
import prevue.infrastructure.controller.http.HttpEndpoint
import prevue.infrastructure.controller.http.HttpSeat
import prevue.infrastructure.controller.http.LiveStats
import prevue.infrastructure.controller.http.Relay
import prevue.infrastructure.controller.http.Server
import prevue.application.service.Live
import prevue.application.port.PrevueDispatchers

@ContributesTo(AppScope::class)
@BindingContainer
public object EntryBindings {
    @Provides
    internal fun seat(hooks: EntryHooks, checkout: PrevueCheckout, target: TargetRepo): HttpSeat =
        HttpSeat(hooks.port, checkout.root, checkout.viewer, target.outDir)

    @Provides
    internal fun log(hooks: EntryHooks): EntryLog = EntryLog(hooks.log)

    @Provides @SingleIn(AppScope::class)
    internal fun viewerTarget(target: TargetRepo, checkout: PrevueCheckout): ViewerTarget =
        ViewerTarget(target.app, checkout.version(), target.branch, target.reveal)

    @Provides @SingleIn(AppScope::class)
    internal fun frames(live: Live, relay: Relay, log: EntryLog, dispatchers: PrevueDispatchers): FrameStreamer =
        FrameStreamer(live.screen, live.watching, relay.scope, log::invoke, dispatchers)

    @Provides
    internal fun liveStats(live: Live, frames: FrameStreamer, feed: ViewerFeed): LiveStats = LiveStats {
        val report = live.frames.value
        mapOf(
            "frames" to report.stats, "frameTrace" to report.trace,
            "streamSubscribers" to frames.hasSubscribers, "stream" to frames.stats.value.toJson(),
            "viewers" to feed.viewerCount,
        )
    }

    @Provides @SingleIn(AppScope::class)
    internal fun server(
        endpoints: Set<HttpEndpoint>, seat: HttpSeat, hooks: EntryHooks, relay: Relay, dispatchers: PrevueDispatchers, feed: ViewerFeed,
    ): Server =
        Server(seat.port, endpoints.toList(), seat.viewerDir, seat.outDir, relay.scope.coroutineContext, dispatchers) { restart ->
            if (restart) feed.announceRestart()
            hooks.onShutdown()
        }
}
