package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.selects.onTimeout
import kotlinx.coroutines.selects.select
import prevue.application.domain.model.PreviewSpec
import prevue.application.port.LiveSession
import prevue.application.port.LiveSessionFactory
import prevue.application.port.PrevueDispatchers
import prevue.application.port.PreviewRenderer
import prevue.application.port.RenderOutput
import prevue.application.domain.rule.Scrolling
import prevue.application.domain.model.LiveFrame
import prevue.application.domain.model.SettledShot

@SingleIn(AppScope::class)
@Inject
class Engine(
    private val renderer: PreviewRenderer,
    sessions: LiveSessionFactory,
    scope: CoroutineScope,
    dispatchers: PrevueDispatchers,
    private val now: () -> Long = { System.nanoTime() / 1_000_000 },
    private val log: (String) -> Unit = { System.err.println("[prevue] $it") },
) {
    private val inbox = Channel<Command<*>>(Channel.UNLIMITED) { it.reply.cancel() }
    private val loop = LiveLoop(sessions, now, log)

    init {
        scope.launch(dispatchers.io.limitedParallelism(1, "prevue-engine") + CoroutineName("prevue-engine")) {
            try {
                renderer.ready()
                while (isActive) {
                    val c = next() ?: continue
                    if (!isActive) { c.reply.cancel(); break }
                    c.run()
                }
            } finally {
                inbox.cancel()
                loop.close()
            }
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    private suspend fun next(): Command<*>? {
        inbox.tryReceive().getOrNull()?.let { return it }
        val wait = loop.dueInMs() ?: return inbox.receive()
        if (wait <= 0) { step(); return null }
        return select {
            inbox.onReceive { it }
            onTimeout(wait) { step(); null }
        }
    }

    private suspend fun step() {
        try {
            loop.step()
        } catch (e: Throwable) {
            if (e is CancellationException) throw e
            log("프레임 루프가 멈췄다 — 세션을 닫는다: $e")
            runCatching { loop.close() }.onFailure { log("세션을 닫지 못했다: $it") }
        }
    }

    private class Command<T>(private val block: suspend () -> T) {
        val reply = CompletableDeferred<T>()
        suspend fun run() {
            if (reply.isCancelled) return
            try {
                reply.complete(block())
            } catch (e: CancellationException) {
                reply.cancel(e)
                throw e
            } catch (e: Throwable) {
                reply.completeExceptionally(e)
            }
        }
    }

    private suspend fun <T> call(block: suspend () -> T): T {
        val c = Command(block)
        inbox.send(c)
        try {
            return c.reply.await()
        } catch (e: CancellationException) {
            c.reply.cancel()
            throw e
        }
    }

    val screen: StateFlow<LiveFrame?> get() = loop.screen
    val shots: SharedFlow<SettledShot> get() = loop.shots
    val watching: StateFlow<Boolean> get() = loop.watching
    val frames: StateFlow<LiveLoop.Report> get() = loop.report
    fun isLatest(shot: SettledShot): Boolean = loop.isLatest(shot)

    private var drewOnce = false

    suspend fun show(p: PreviewSpec, interactive: Boolean = false, ownLoader: Boolean = false): RenderOutput = call {
        drewOnce = true
        loop.close()
        if (interactive) loop.open(p, interactive = true) else renderer.show(p, ownLoader)
    }
    suspend fun showAside(p: PreviewSpec, tree: Boolean = false): RenderOutput = call { drewOnce = true; renderer.showAside(p, tree) }
    suspend fun warmIfCold(p: PreviewSpec): RenderOutput? = call { if (drewOnce) null else { drewOnce = true; renderer.showAside(p) } }
    fun keepImage(out: RenderOutput, previewId: String): RenderOutput = renderer.copyImage(out, previewId)
    fun msSinceInput(): Long = loop.lastInputAt.value?.let { now() - it } ?: Long.MAX_VALUE
    suspend fun rerender(p: PreviewSpec): RenderOutput = call { drewOnce = true; if (loop.preview != null) loop.look(false).out else renderer.show(p) }
    suspend fun renderAt(p: PreviewSpec, ms: Long): RenderOutput = call { drewOnce = true; loop.renderAt(p, ms) }
    suspend fun codeChanged() = call { loop.close(); renderer.codeChanged() }
    suspend fun patchLiterals(owner: String, values: Map<String, Any>): Boolean = call { renderer.patchLiterals(owner, values) }
    suspend fun dropLiterals(owners: Collection<String>) = call { renderer.dropLiterals(owners) }
    suspend fun buildChanged() = call { loop.close(); renderer.buildChanged() }
    suspend fun forgetShapes() = call { renderer.forgetShapes() }
    suspend fun instances(found: List<PreviewSpec>): Map<PreviewSpec, List<String?>> =
        if (found.none { it.methodParams.isNotEmpty() }) found.associateWith { listOf(null) } else call { found.associateWith(renderer::instances) }

    suspend fun ensure(p: PreviewSpec, interactive: Boolean): RenderOutput? = call { drewOnce = true; loop.ensure(p, interactive) }
    suspend fun changed(): Boolean = call { loop.changed }
    suspend fun look(semantics: Boolean = false): LiveSession.Look = call { loop.look(semantics) }
    suspend fun touch(type: String, x: Int, y: Int): Long = call { loop.touch(type, x, y) }
    suspend fun type(text: String): Pair<Long, String?> = call { loop.type(text) }
    suspend fun wheel(x: Int, y: Int, dx: Float, dy: Float): Pair<Long, Boolean> = call { loop.wheel(x, y, dx, dy) }
    suspend fun seek(x: Int, y: Int, dx: Float, dy: Float, pieces: Int, rider: Scrolling.Rider): Pair<Long, Boolean> =
        call { loop.seek(x, y, dx, dy, pieces, rider) }
    suspend fun watch(on: Boolean) = call { loop.watch(on) }
    suspend fun settled(seq: Long, semantics: Boolean = false): SettledShot = call { loop.await(seq, semantics) }.await()
    suspend fun settledLatest(semantics: Boolean = false): SettledShot = call { loop.await(loop.lastInput, semantics) }.await()

    suspend fun written(out: RenderOutput) = renderer.written(out)
    suspend fun awaitWrites() = renderer.awaitWrites()
    fun discard(out: RenderOutput) = renderer.discard(out)
    fun lost(out: RenderOutput): Boolean = renderer.lost(out)
}
