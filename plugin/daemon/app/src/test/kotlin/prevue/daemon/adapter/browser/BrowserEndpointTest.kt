package prevue.daemon.adapter.browser

import prevue.daemon.entity.Verbatim
import com.sun.net.httpserver.Headers
import com.sun.net.httpserver.HttpContext
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpPrincipal
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.URI
import java.nio.charset.StandardCharsets.UTF_8
import java.util.concurrent.CountDownLatch
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.Timeout
import prevue.json.Json
import prevue.daemon.fake.Fixture

@Timeout(20)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BrowserEndpointTest {
    private val fx = Fixture(previews = 1)
    private val port = ServerSocket(0).use { it.localPort }
    private val server = fx.entryPoints(fx.useCases(), port)

    @BeforeAll fun up() = server.start()

    @AfterAll fun down() = fx.close()

    @Test fun `POST viewer state 는 상태 읽기가 아니라 모르는 의도다`() {
        assertEquals(200, request("GET", "/viewer/state", null).first)
        assertEquals(404 to "no intent state", error("POST", "/viewer/state", emptyMap()))
        assertEquals(404 to "no intent nope", error("POST", "/viewer/nope", emptyMap()))
    }

    @Test fun `GET 만 받는 경로는 POST 면 이 입구가 답하지 않는다`() {
        for (p in listOf("/events", "/stream", "/app-icon.png")) assertEquals(404 to "no route POST $p", error("POST", p, emptyMap()), p)
    }

    @Test fun `viewport 는 POST 만 받고 받았다고 답한다`() {
        assertEquals(200 to mapOf("ok" to true), request("POST", "/stream/viewport", mapOf("width" to 320)))
        assertEquals(200 to mapOf("ok" to true), request("POST", "/stream/viewport", emptyMap()))
        assertTrue(error("GET", "/stream/viewport", null).let { it.first == 404 && it.second.startsWith("not found") })
    }

    @Test fun `파일 목록과 앱 정보는 메서드를 가리지 않는다`() {
        for (m in listOf("GET", "POST")) {
            assertEquals(200, request(m, "/project-files.json", if (m == "POST") emptyMap() else null).first, m)
            assertEquals(200, request(m, "/preview-files.json", if (m == "POST") emptyMap() else null).first, m)
            assertEquals(200 to mapOf("name" to null, "icon" to false, "prevue" to null, "reveal" to false),
                request(m, "/app.json", if (m == "POST") emptyMap() else null), m)
        }
    }

    @Test fun `아이콘이 없으면 404 이고 폴더를 열 수 없으면 reveal 이 404 다`() {
        assertEquals(404, request("GET", "/app-icon.png", null).first)
        assertEquals(404 to "열 수 없다", error("POST", "/viewer/reveal", emptyMap()))
    }

    @Test fun `stream 은 multipart 로 답하고 닫지 않는다`() {
        val c = open("/stream")
        assertEquals(200, c.responseCode)
        assertEquals("multipart/x-mixed-replace; boundary=${FrameStreamer.BOUNDARY}", c.contentType)
        assertEquals("no-store", c.getHeaderField("Cache-Control"))
        c.disconnect()
    }

    @Test fun `SSE 는 연결하자마자 지금 상태를 받고 입구를 닫으면 끝난다`() {
        Fixture(previews = 1).use { own ->
            val p = ServerSocket(0).use { it.localPort }
            val module = own.entryPoints(own.useCases(), p)
            module.start()
            val c = URI("http://127.0.0.1:$p/events").toURL().openConnection() as HttpURLConnection
            assertEquals("text/event-stream", c.contentType)
            val reader = c.inputStream.bufferedReader(UTF_8)
            val first = generateSequence { reader.readLine() }.first { it.startsWith("data: ") }
            assertEquals("state", (Json.parse(first.removePrefix("data: ")) as Map<*, *>)["type"])
            module.stopInputs()
            try { reader.readLines() } catch (_: IOException) { }
        }
    }

    @Test fun `뷰어가 새로 붙어도 인터랙티브는 그대로다`() {
        Fixture(previews = 2).use { own ->
            val p = ServerSocket(0).use { it.localPort }
            val uc = own.useCases()
            val module = own.entryPoints(uc, p)
            module.start()
            runBlocking { uc.openPreview(own.file.path, null, emptyMap(), "test"); uc.focusCard(1, on = true, by = "cli") }
            val c = URI("http://127.0.0.1:$p/events").toURL().openConnection() as HttpURLConnection
            val reader = c.inputStream.bufferedReader(UTF_8)
            val first = generateSequence { reader.readLine() }.first { it.startsWith("data: ") }
            assertEquals("state", (Json.parse(first.removePrefix("data: ")) as Map<*, *>)["type"])
            assertTrue(uc.readStatus().interactive)
            module.stopInputs()
            try { reader.readLines() } catch (_: IOException) { }
        }
    }

    @Test fun `멈춘 뷰어 연결이 다른 뷰어의 알림을 막지 않는다`() {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        val endpoint = BrowserEndpoint(server.browser, server.frames, scope)
        val stuck = StuckStream()
        val live = Lines()
        try {
            runBlocking {
                endpoint.route(FakeExchange(stuck), "/events", "GET")
                endpoint.route(FakeExchange(live), "/events", "GET")
            }
            assertTrue(live.next()!!.contains("\"type\":\"state\""))
            repeat(100) {
                endpoint.pushUi(UiEvent.Flash(Verbatim("알림 $it")))
                assertTrue(live.next()?.contains("알림 $it") == true, "살아 있는 뷰어가 ${it}번째 알림을 받지 못했다")
            }
        } finally { stuck.release.countDown(); endpoint.close(); scope.cancel() }
    }

    @Test fun `다시 시작 알림은 바로 닫아도 뷰어에 닿고 상태는 데몬 실행 id 를 싣는다`() {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        val endpoint = BrowserEndpoint(server.browser, server.frames, scope)
        val live = Lines()
        try {
            runBlocking { endpoint.route(FakeExchange(live), "/events", "GET") }
            val state = Json.parse(live.next()!!.removePrefix("data: ").trim()) as Map<*, *>
            assertTrue(((state["state"] as Map<*, *>)["boot"] as String).isNotEmpty())
            assertEquals(1, endpoint.viewerCount)
            endpoint.announceRestart()
            endpoint.close()
            assertTrue(live.next()?.contains("\"kind\":\"restart\"") == true, "닫기 전에 보낸 다시 시작 알림이 뷰어에 닿지 않았다")
        } finally { endpoint.close(); scope.cancel() }
    }

    /** 놓아 줄 때까지 쓰기가 멈춘다 — 읽지 않는 브라우저 탭. */
    private class StuckStream : OutputStream() {
        val release = CountDownLatch(1)
        override fun write(b: Int) { release.await(); throw IOException("닫혔다") }
        override fun write(b: ByteArray, off: Int, len: Int) { release.await(); throw IOException("닫혔다") }
    }

    private class Lines : OutputStream() {
        private val lines = LinkedBlockingQueue<String>()
        fun next(): String? = lines.poll(5, TimeUnit.SECONDS)
        override fun write(b: Int) = throw UnsupportedOperationException()
        override fun write(b: ByteArray, off: Int, len: Int) { lines.put(String(b, off, len, UTF_8)) }
    }

    private class FakeExchange(private val body: OutputStream) : HttpExchange() {
        private val headers = Headers()
        override fun getRequestHeaders() = Headers()
        override fun getResponseHeaders() = headers
        override fun getRequestURI(): URI = URI("/events")
        override fun getRequestMethod() = "GET"
        override fun getHttpContext(): HttpContext = throw UnsupportedOperationException()
        override fun close() = body.close()
        override fun getRequestBody(): InputStream = InputStream.nullInputStream()
        override fun getResponseBody() = body
        override fun sendResponseHeaders(rCode: Int, responseLength: Long) {}
        override fun getRemoteAddress() = InetSocketAddress(0)
        override fun getResponseCode() = 200
        override fun getLocalAddress() = InetSocketAddress(0)
        override fun getProtocol() = "HTTP/1.1"
        override fun getAttribute(name: String?): Any? = null
        override fun setAttribute(name: String?, value: Any?) {}
        override fun setStreams(i: InputStream?, o: OutputStream?) {}
        override fun getPrincipal(): HttpPrincipal? = null
    }

    private fun open(path: String) = URI("http://127.0.0.1:$port$path").toURL().openConnection() as HttpURLConnection

    private fun error(method: String, path: String, body: Map<String, Any?>?): Pair<Int, String> =
        request(method, path, body).let { (code, json) -> code to (json as Map<*, *>)["error"].toString() }

    private fun request(method: String, path: String, body: Map<String, Any?>?): Pair<Int, Any?> {
        val c = open(path)
        c.requestMethod = method
        if (body != null) { c.doOutput = true; c.outputStream.use { it.write(Json.str(body).toByteArray(UTF_8)) } }
        val code = c.responseCode
        val text = (if (code < 400) c.inputStream else c.errorStream)?.use { it.readBytes().toString(UTF_8) }.orEmpty()
        c.disconnect()
        return code to (if (text.isBlank()) null else Json.parse(text))
    }
}
