package prevue.infrastructure.controller.browser

import com.sun.net.httpserver.HttpExchange
import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.ContributesIntoSet
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.IOException
import java.io.OutputStream
import java.nio.charset.StandardCharsets.UTF_8
import java.util.UUID
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.getAndUpdate
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.flow.updateAndGet
import kotlinx.coroutines.launch
import kotlinx.coroutines.selects.select
import prevue.infrastructure.json.Json
import prevue.infrastructure.controller.http.mapper.toJson
import prevue.infrastructure.controller.http.mapper.toPointed
import prevue.infrastructure.controller.http.mapper.toScreenSize
import prevue.infrastructure.json.string
import prevue.infrastructure.controller.http.EntryLog
import prevue.infrastructure.controller.http.HttpEndpoint
import prevue.infrastructure.controller.http.Relay
import prevue.infrastructure.controller.http.body
import prevue.infrastructure.controller.http.json

@SingleIn(AppScope::class)
@ContributesIntoSet(AppScope::class)
public class BrowserEndpoint @Inject internal constructor(
    private val presenter: BrowserPresenter,
    private val tabs: BrowserTabs,
    input: BrowserInput,
    private val pointing: BrowserPointing,
    private val frames: FrameStreamer,
    relay: Relay,
    target: ViewerTarget,
    private val log: EntryLog,
) : HttpEndpoint {
    private val scope = relay.scope
    private val write = relay.dispatchers.io
    private val identity by lazy(target.app)
    private val version = target.version
    private val reveal = target.reveal

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

    override suspend fun route(ex: HttpExchange, path: String, method: String): Boolean =
        routeLive(ex, path, method) || routeData(ex, path, method)

    private suspend fun routeLive(ex: HttpExchange, path: String, method: String): Boolean {
        when {
            path == "/events" && method == "GET" -> events(ex)
            path == "/stream" && method == "GET" -> stream(ex)
            path == "/stream/viewport" && method == "POST" -> viewport(ex)
            path.startsWith("/viewer/") && method == "POST" -> intent(ex, path.removePrefix("/viewer/"), ex.body())
            else -> return false
        }
        return true
    }

    private suspend fun routeData(ex: HttpExchange, path: String, method: String): Boolean {
        when {
            path == "/project-files.json" -> ex.json(200, tabs.sourceIndex()?.toJson() ?: emptyMap<String, Any?>())
            path == "/preview-files.json" -> ex.json(200, tabs.previewFiles())
            path == "/viewer/state" -> ex.json(200, presenter.current().toJson())
            path == "/app.json" -> ex.json(200, appJson())
            path == "/app-icon.png" && method == "GET" -> png(ex, identity.second, "max-age=3600")
            else -> return false
        }
        return true
    }

    private fun stream(ex: HttpExchange) {
        ex.responseHeaders.add("Content-Type", "multipart/x-mixed-replace; boundary=${FrameStreamer.BOUNDARY}")
        ex.responseHeaders.add("Cache-Control", "no-store")
        ex.sendResponseHeaders(200, 0)
        // 외부: WebKit 은 <img> 가 보던 MJPEG 를 src 를 바꾸거나 지워도 닫지 않는다
        frames.subscribe(ex.responseBody, streamViewer(ex))
    }

    private fun streamViewer(ex: HttpExchange): String? =
        ex.requestURI.query?.split('&')?.firstNotNullOfOrNull { pair -> pair.removePrefix("v=").takeIf { it != pair && it.isNotEmpty() } }

    private fun viewport(ex: HttpExchange) {
        val body = ex.body()
        frames.viewport((body["width"] as? Number)?.toInt(), body["viewer"] as? String)
        ex.json(200, ACCEPTED)
    }

    private fun appJson() =
        mapOf("name" to identity.first, "icon" to (identity.second != null), "prevue" to version, "reveal" to (reveal != null))

    private fun png(ex: HttpExchange, bytes: ByteArray?, cache: String) {
        if (bytes == null) { ex.sendResponseHeaders(404, -1); ex.close(); return }
        ex.responseHeaders.add("Content-Type", "image/png")
        ex.responseHeaders.add("Cache-Control", cache)
        ex.sendResponseHeaders(200, bytes.size.toLong())
        ex.responseBody.use { it.write(bytes) }
    }

    private fun events(ex: HttpExchange) {
        ex.responseHeaders.add("Content-Type", "text/event-stream")
        ex.responseHeaders.add("Cache-Control", "no-store")
        ex.sendResponseHeaders(200, 0)
        val v = Viewer(ex.responseBody)
        if (viewers.updateAndGet { it?.plus(v) } == null) v.hangUp()
        else v.state.trySend(stateLine(presenter.state.value))
        scope.launch(write + CoroutineName("prevue-sse-out"), CoroutineStart.ATOMIC) { pump(v) }
    }

    private suspend fun intent(ex: HttpExchange, intent: String, b: Map<String, Any?>) {
        val fire = fireAndForget[intent]
        if (fire == null) answer(ex, intent, b)
        else { fire(b); ex.json(200, ACCEPTED) }
    }

    private val fireAndForget: Map<String, (Map<String, Any?>) -> Unit> = mapOf(
        "focus" to { b -> input.enterFocus(b.int("index")) },
        "exit" to { _ -> input.exitFocus() },
        "touch" to { b -> input.touch(b.string("type") ?: "tap", b.int("x"), b.int("y")) },
        "wheel" to { b -> input.wheel(b.int("x"), b.int("y"), b.float("dx"), b.float("dy")) },
        "cancel" to { _ -> pointing.cancelChoice() },
        "resize" to { b -> input.resize(b.toScreenSize() ?: error("size나 device가 필요하다")) },
        "tab" to { b -> tabs.switchTab(b.string("key") ?: error("key가 필요하다")) },
        "close" to { b -> tabs.closeTab(b.string("key") ?: error("key가 필요하다")) },
    )

    private suspend fun answer(ex: HttpExchange, intent: String, b: Map<String, Any?>) {
        when (intent) {
            "point" -> ex.json(200, pointing.point(
                b.string("fileName") ?: error("fileName이 필요하다"), (b["line"] as? Number)?.toInt() ?: error("line이 필요하다"), b.toPointed(),
            ).toJson())
            "choose" -> ex.json(200, pointing.choose(b.string("path") ?: error("path가 필요하다")).toJson())
            "open" -> ex.json(200, tabs.open(b.string("file") ?: error("file(풀패스)이 필요하다")).toJson())
            "reveal" -> revealRepo(ex)
            "catchup" -> ex.json(200, mapOf("ok" to true, "treeUrl" to pointing.catchUp()))
            else -> ex.json(404, mapOf("ok" to false, "error" to "no intent $intent"))
        }
    }

    private fun revealRepo(ex: HttpExchange) {
        val r = reveal
        if (r == null) ex.json(404, mapOf("ok" to false, "error" to "열 수 없다")) else { r(); ex.json(200, ACCEPTED) }
    }

    private fun Map<String, Any?>.int(key: String) = (this[key] as Number).toInt()
    private fun Map<String, Any?>.float(key: String) = (this[key] as Number).toFloat()

    private companion object {
        val ACCEPTED = mapOf("ok" to true)
        const val UI_BACKLOG = 64
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
}
