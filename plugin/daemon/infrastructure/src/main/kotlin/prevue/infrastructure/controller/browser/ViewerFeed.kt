package prevue.infrastructure.controller.browser

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.IOException
import java.io.OutputStream
import java.nio.charset.StandardCharsets.UTF_8
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.getAndUpdate
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.flow.updateAndGet
import kotlinx.coroutines.launch
import kotlinx.coroutines.selects.select
import prevue.application.port.PrevueDispatchers
import prevue.infrastructure.controller.http.EntryLog
import prevue.infrastructure.controller.http.Relay
import prevue.infrastructure.json.Json

@SingleIn(AppScope::class)
public class ViewerFeed @Inject internal constructor(
    private val presenter: BrowserPresenter,
    private val relay: Relay,
    private val dispatchers: PrevueDispatchers,
    private val log: EntryLog,
) {
    private class Viewer(val out: OutputStream) {
        val state = Channel<ByteArray>(Channel.CONFLATED)
        val ui = Channel<ByteArray>(UI_BACKLOG)
        fun hangUp() { state.close(); ui.close() }
    }

    private val viewers = MutableStateFlow<List<Viewer>?>(emptyList())
    private val boot = UUID.randomUUID().toString()

    internal val viewerCount: Int get() = viewers.value.orEmpty().size

    internal fun announceRestart() {
        val line = line(mapOf("type" to "ui", "event" to mapOf("kind" to "restart")))
        for (v in viewers.value.orEmpty()) v.ui.trySend(line)
    }

    internal fun close() {
        viewers.getAndUpdate { null }?.forEach(Viewer::hangUp)
    }

    internal fun pushState(st: BrowserState) {
        val line = stateLine(st)
        for (v in viewers.value.orEmpty()) v.state.trySend(line)
    }

    internal fun pushUi(ev: UiEvent) {
        val line = line(mapOf("type" to "ui", "event" to ev.toJson()))
        for (v in viewers.value.orEmpty()) if (v.ui.trySend(line).isFailure) drop(v)
    }

    internal fun attach(out: OutputStream) {
        val v = Viewer(out)
        if (viewers.updateAndGet { it?.plus(v) } == null) v.hangUp()
        else v.state.trySend(stateLine(presenter.state.value))
        relay.scope.launch(dispatchers.io + CoroutineName("prevue-sse-out"), CoroutineStart.ATOMIC) { pump(v) }
    }

    private fun stateLine(st: BrowserState) = line(mapOf("type" to "state", "state" to st.toJson() + ("boot" to boot)))

    private fun line(ev: Map<String, Any?>) = ("data: " + Json.str(ev) + "\n\n").toByteArray(UTF_8)

    private suspend fun pump(v: Viewer) {
        try {
            while (true) {
                val line = select<ByteArray?> {
                    v.state.onReceiveCatching { it.getOrNull() }
                    v.ui.onReceiveCatching { it.getOrNull() }
                } ?: break
                v.out.write(line)
                v.out.flush()
            }
            while (true) v.out.write(v.ui.tryReceive().getOrNull() ?: break)
            v.out.flush()
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            if (e !is IOException) log("뷰어 연결에 쓰지 못했다: $e")
        } finally {
            drop(v)
            closeQuietly(v.out)
        }
    }

    private fun drop(v: Viewer) {
        viewers.update { it?.minus(v) }
        v.hangUp()
    }

    private fun closeQuietly(out: OutputStream) {
        runCatching { out.close() }.onFailure { if (it !is IOException) log("뷰어 연결을 닫지 못했다: $it") }
    }

    private companion object {
        const val UI_BACKLOG = 64
    }
}
