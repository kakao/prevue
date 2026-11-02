package prevue.daemon.adapter.http

import prevue.daemon.entity.PhraseException
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.io.File
import java.net.InetSocketAddress
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch

/**
 * HTTP 껍데기 — 소켓 · 입구 고르기 · 정적 파일 · 활동 시각만 갖는다. 무엇을 할지는 입구([CliEndpoint] · [BrowserEndpoint])가 정한다.
 */
class Server(
    private val port: Int,
    private val endpoints: List<HttpEndpoint>,
    viewerDir: File,
    outDir: File,
    requestContext: CoroutineContext,
    private val onShutdown: (restart: Boolean) -> Unit,
) {
    private val server = HttpServer.create()
    private val requests = SupervisorJob(requestContext[Job])
    private val scope = CoroutineScope(requestContext + requests + Dispatchers.IO.limitedParallelism(64, "prevue-http") + CoroutineName("prevue-http"))
    private val stopped = MutableStateFlow(false)
    private val staticRoots = listOf(outDir, viewerDir).map { it.canonicalFile.toPath() }

    init {
        server.createContext("/") { ex ->
            if (stopped.value) ex.close()
            else scope.launch { handle(ex) }.invokeOnCompletion { if (it != null) ex.close() }
        }
    }

    private suspend fun handle(ex: HttpExchange) {
        try {
            route(ex)
        } catch (e: Throwable) {
            if (e is CancellationException) throw e
            if (stopped.value) { ex.close(); return }
            e.printStackTrace()
            runCatching { ex.json(500, mapOf("ok" to false, "error" to if (e is PhraseException) e.phrase.text else e.toString())) }.onFailure { ex.close() }
        }
    }

    val boundPort: Int get() = server.address.port
    fun start() {
        check(!stopped.value)
        server.bind(InetSocketAddress("127.0.0.1", port), 16)
        server.start()
    }
    fun stopAccepting() {
        if (stopped.compareAndSet(expect = false, update = true)) {
            try { server.stop(0) } finally { requests.complete() }
        }
    }
    suspend fun awaitStopped() = requests.join()
    suspend fun stop() { stopAccepting(); awaitStopped() }

    private val activity = MutableStateFlow(System.currentTimeMillis())
    /** NFR-6. 마지막으로 사람·에이전트가 만진 시각. 유휴 종료의 근거다. */
    val lastActivityMs: Long get() = activity.value

    private suspend fun route(ex: HttpExchange) {
        val path = ex.requestURI.path
        val method = ex.requestMethod
        // /daemon(살아 있나 확인)은 활동이 아니다 — prevue가 폴링하므로 이것까지 세면 유휴가 영영 안 온다.
        if (path == "/daemon") { ex.sendResponseHeaders(200, -1); ex.close(); return }
        activity.value = System.currentTimeMillis()
        if (path == "/shutdown" && method == "POST") {
            val restart = runCatching { ex.body()["restart"] == true }.getOrDefault(false)
            ex.json(200, mapOf("ok" to true)); onShutdown(restart); return
        }
        if (endpoints.any { it.route(ex, path, method) }) return
        if (method == "GET") static(ex, path) else ex.json(404, mapOf("ok" to false, "error" to "no route $method $path"))
    }

    private fun static(ex: HttpExchange, path: String) {
        val rel = path.trimStart('/').ifEmpty { "index.html" }
        val f = staticRoots.firstNotNullOfOrNull { root -> File(root.toFile(), rel).canonicalFile.takeIf { it.isFile && it.toPath().startsWith(root) } }
        if (f == null) { ex.json(404, mapOf("ok" to false, "error" to "not found: $rel")); return }
        ex.responseHeaders.add("Content-Type", CONTENT_TYPES[f.extension] ?: "application/octet-stream")
        ex.responseHeaders.add("Cache-Control", "no-store")
        val bytes = f.readBytes()
        ex.sendResponseHeaders(200, bytes.size.toLong())
        ex.responseBody.use { it.write(bytes) }
    }
}

private val CONTENT_TYPES = mapOf(
    "html" to "text/html; charset=utf-8", "png" to "image/png", "json" to "application/json",
    "js" to "text/javascript", "css" to "text/css", "svg" to "image/svg+xml",
)
