package prevue.infrastructure.controller.browser

import prevue.application.domain.model.Verbatim
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
import java.net.URLEncoder
import java.io.File
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
import prevue.infrastructure.json.Json
import prevue.daemon.fake.Fixture
import prevue.infrastructure.bindings.EntryHooks
import prevue.infrastructure.controller.http.EntryLog
import prevue.infrastructure.controller.http.Relay
import prevue.daemon.fake.realDispatchers

@Timeout(20)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BrowserEndpointTest {
    private val fx = Fixture(previews = 1)
    private val port = ServerSocket(0).use { it.localPort }
    private val g = fx.graph(hooks = EntryHooks(port))
    private val server = fx.entryPoints(g)

    @BeforeAll fun up() = server.start()

    @AfterAll fun down() = fx.close()

    @Test fun `POST viewer state 는 상태 읽기가 아니라 모르는 의도다`() {
        assertEquals(200, request("GET", "/viewer/state", null).first)
        assertEquals(404 to "no intent state", error("POST", "/viewer/state", emptyMap()))
        assertEquals(404 to "no intent nope", error("POST", "/viewer/nope", emptyMap()))
    }

    @Test fun `파일 목록과 앱 정보는 메서드를 가리지 않는다`() {
        for (m in listOf("GET", "POST")) {
            assertEquals(200, request(m, "/project-files.json", if (m == "POST") emptyMap() else null).first, m)
            assertEquals(200, request(m, "/preview-files.json", if (m == "POST") emptyMap() else null).first, m)
            assertEquals(200 to mapOf("name" to null, "icon" to false, "prevue" to null, "reveal" to false),
                request(m, "/app.json", if (m == "POST") emptyMap() else null), m)
        }
    }

    private fun card(path: String, at: Int = port) = request("GET", "/gallery/card?file=" + URLEncoder.encode(path, UTF_8), null, at)

    private fun front(body: Any?) = ((body as Map<*, *>)["front"] as List<*>).map { it as Map<*, *> }

    @Test fun `갤러리 카드는 앞 세 장을 옆에서 그리고 장마다 이름과 센 장 수를 준다`() {
        Fixture(previews = 4).use { own ->
            val p = ServerSocket(0).use { it.localPort }
            val module = own.entryPoints(own.graph(hooks = EntryHooks(p)))
            module.start()
            val before = own.renderer.asides.size
            val (code, body) = card(own.file.path, p)
            assertEquals(200, code)
            assertEquals(4L, (body as Map<*, *>)["sheets"])
            val front = front(body)
            assertEquals(listOf(0L to "Card0", 1L to "Card1", 2L to "Card2"), front.map { it["i"] to it["name"] })
            assertTrue(front.all { it["variant"] == null }, front.toString())
            assertEquals(null, body["failure"])
            val image = front[1]["image"] as Map<*, *>
            assertTrue((image["url"] as String).startsWith("/gallery/shot/"), image.toString())
            assertEquals(100L to 100L, image["w"] to image["h"])
            assertEquals(listOf("Card0@gallery", "Card1@gallery", "Card2@gallery"), own.renderer.asides.drop(before).map { it.previewId })
            assertTrue(own.compiler.compiled.isEmpty(), "갤러리 카드가 컴파일했다")
            module.stopInputs()
        }
    }

    @Test fun `갤러리가 그린 앞 장은 파일 목록에 같은 모양으로 실리고 그림 주소로 받는다`() {
        Fixture(previews = 2).use { own ->
            val p = ServerSocket(0).use { it.localPort }
            val graph = own.graph(hooks = EntryHooks(p))
            val module = own.entryPoints(graph)
            module.start()
            runBlocking { graph.watchers.indexPreviewFiles() }
            val drawn = front(card(own.file.path, p).second)
            val files = ((request("GET", "/preview-files.json", null, p).second as Map<*, *>)["files"] as List<*>).map { it as Map<*, *> }
            val shots = files.single { it["path"] == own.file.path }["shots"] as Map<*, *>
            assertEquals(2L, shots["sheets"])
            assertEquals(drawn, front(shots))
            assertEquals(200, open((drawn[0]["image"] as Map<*, *>)["url"] as String, p).responseCode)
            assertEquals(404, open("/gallery/shot/nope-0.png", p).responseCode)
            assertTrue(files.filter { it["path"] != own.file.path }.all { it["shots"] == null })
            module.stopInputs()
        }
    }

    @Test fun `캐시에 남은 장은 갤러리가 다시 그리지 않는다`() {
        Fixture(previews = 3).use { own ->
            val p = ServerSocket(0).use { it.localPort }
            val graph = own.graph(hooks = EntryHooks(p))
            val module = own.entryPoints(graph)
            module.start()
            card(own.file.path, p)
            graph.galleryShots.image(graph.galleryShots.kept(own.file)!!.shots[1].id)!!.delete()
            val before = own.renderer.asides.size
            assertEquals(3, front(card(own.file.path, p).second).count { it["image"] != null })
            assertEquals(listOf("Card1@gallery"), own.renderer.asides.drop(before).map { it.previewId })
            module.stopInputs()
        }
    }

    @Test fun `갤러리 카드는 제공자 값 이름을 변주로 주고 못 그린 장만 실패다`() {
        File(fx.srcRoot, "demo/Names.kt").writeText("package demo\nclass Names : PreviewParameterProvider<String> { override val values = sequenceOf(\"a\", \"b\") }\n")
        val source = fx.file.readText()
        fx.file.writeText("package demo\nimport androidx.compose.ui.tooling.preview.Preview\n@Preview\nfun Card0(@PreviewParameter(Names::class) n: String) {}\n")
        fx.renderer.providerLabels["demo.Names"] = listOf("a", "b")
        try {
            val (code, body) = card(fx.file.path)
            assertEquals(200, code)
            assertEquals(listOf("Card0" to "a", "Card0" to "b"), front(body).map { it["name"] to it["variant"] })
        } finally { fx.file.writeText(source) }
    }

    @Test fun `못 그린 장은 건너뛰고 여섯 장 안에서 그려진 세 장을 모은다`() {
        Fixture(previews = 8).use { own ->
            val p = ServerSocket(0).use { it.localPort }
            val module = own.entryPoints(own.graph(hooks = EntryHooks(p)))
            module.start()
            own.renderer.asideFails = "가짜 실패"
            own.renderer.asideFailsIf = { it.functionName in setOf("Card0", "Card2") }
            val before = own.renderer.asides.size
            val (_, body) = card(own.file.path, p)
            assertEquals(listOf("Card1", "Card3", "Card4"), front(body).map { it["name"] })
            assertEquals("가짜 실패", (body as Map<*, *>)["failure"])
            assertEquals((0..4).map { "Card$it@gallery" }, own.renderer.asides.drop(before).map { it.previewId })

            val again = own.renderer.asides.size
            assertEquals(listOf("Card1", "Card3", "Card4"), front(card(own.file.path, p).second).map { it["name"] })
            assertEquals(again, own.renderer.asides.size, "파일이 그대로면 못 그린 장도 다시 그리지 않는다")

            own.renderer.asideFailsIf = { true }
            own.file.setLastModified(System.currentTimeMillis() + 60_000)
            val after = own.renderer.asides.size
            front(card(own.file.path, p).second)
            assertEquals(listOf("Card0@gallery", "Card2@gallery"), own.renderer.asides.drop(after).map { it.previewId }, "파일이 바뀌면 못 그린 장만 다시")
            module.stopInputs()
        }
    }

    @Test fun `여섯 장이 모두 실패하면 그 뒤는 시도하지 않고 실패 카드다`() {
        Fixture(previews = 8).use { own ->
            val p = ServerSocket(0).use { it.localPort }
            val module = own.entryPoints(own.graph(hooks = EntryHooks(p)))
            module.start()
            own.renderer.asideFails = "가짜 실패"
            val before = own.renderer.asides.size
            val (_, body) = card(own.file.path, p)
            assertTrue(front(body).isEmpty())
            assertEquals(8L to "가짜 실패", (body as Map<*, *>)["sheets"] to body["failure"])
            assertEquals(6, own.renderer.asides.size - before)
            module.stopInputs()
        }
    }

    @Test fun `갤러리 카드는 프리뷰 소스가 아니면 404 다`() {
        assertEquals(404 to mapOf("ok" to false), card(File(fx.root, "Nope.kt").path))
        assertEquals(404 to mapOf("ok" to false), request("GET", "/gallery/card", null))
        assertEquals(404, open("/gallery/sheet?file=" + URLEncoder.encode(fx.file.path, UTF_8)).responseCode)
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
            val module = own.entryPoints(own.graph(hooks = EntryHooks(p)))
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
            val uc = own.graph(hooks = EntryHooks(p))
            val module = own.entryPoints(uc)
            module.start()
            runBlocking { uc.tabs.openPreview(own.file.path, null, emptyMap(), "test"); uc.boards.focus(1, by = "cli") }
            val c = URI("http://127.0.0.1:$p/events").toURL().openConnection() as HttpURLConnection
            val reader = c.inputStream.bufferedReader(UTF_8)
            val first = generateSequence { reader.readLine() }.first { it.startsWith("data: ") }
            assertEquals("state", (Json.parse(first.removePrefix("data: ")) as Map<*, *>)["type"])
            assertTrue(uc.status.read().interactive)
            module.stopInputs()
            try { reader.readLines() } catch (_: IOException) { }
        }
    }

    @Test fun `멈춘 뷰어 연결이 다른 뷰어의 알림을 막지 않는다`() {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        val side = sideEndpoint(scope)
        val endpoint = side.endpoint
        val feed = side.feed
        val stuck = StuckStream()
        val live = Lines()
        try {
            runBlocking {
                endpoint.route(FakeExchange(stuck), "/events", "GET")
                endpoint.route(FakeExchange(live), "/events", "GET")
            }
            assertTrue(live.next()!!.contains("\"type\":\"state\""))
            repeat(100) {
                feed.pushUi(UiEvent.Flash(Verbatim("알림 $it")))
                assertTrue(live.next()?.contains("알림 $it") == true, "살아 있는 뷰어가 ${it}번째 알림을 받지 못했다")
            }
        } finally { stuck.release.countDown(); feed.close(); scope.cancel() }
    }

    @Test fun `다시 시작 알림은 바로 닫아도 뷰어에 닿고 상태는 데몬 실행 id 를 싣는다`() {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        val side = sideEndpoint(scope)
        val endpoint = side.endpoint
        val feed = side.feed
        val live = Lines()
        try {
            runBlocking { endpoint.route(FakeExchange(live), "/events", "GET") }
            val state = Json.parse(live.next()!!.removePrefix("data: ").trim()) as Map<*, *>
            assertTrue(((state["state"] as Map<*, *>)["boot"] as String).isNotEmpty())
            assertEquals(1, feed.viewerCount)
            feed.announceRestart()
            feed.close()
            assertTrue(live.next()?.contains("\"kind\":\"restart\"") == true, "닫기 전에 보낸 다시 시작 알림이 뷰어에 닿지 않았다")
        } finally { feed.close(); scope.cancel() }
    }

    private class Side(val endpoint: BrowserEndpoint, val feed: ViewerFeed)

    private fun sideEndpoint(scope: CoroutineScope): Side {
        val feed = ViewerFeed(g.presenter, Relay(scope, realDispatchers), realDispatchers, EntryLog {})
        return Side(BrowserEndpoint(g.presenter, g.browserTabs, g.browserGallery, g.browserInput, g.browserPointing, server.frames, feed, ViewerTarget({ null to null }, null, null, null)), feed)
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

    private fun open(path: String, at: Int = port) = URI("http://127.0.0.1:$at$path").toURL().openConnection() as HttpURLConnection

    private fun error(method: String, path: String, body: Map<String, Any?>?): Pair<Int, String> =
        request(method, path, body).let { (code, json) -> code to (json as Map<*, *>)["error"].toString() }

    private fun request(method: String, path: String, body: Map<String, Any?>?, at: Int = port): Pair<Int, Any?> {
        val c = open(path, at)
        c.requestMethod = method
        if (body != null) { c.doOutput = true; c.outputStream.use { it.write(Json.str(body).toByteArray(UTF_8)) } }
        val code = c.responseCode
        val text = (if (code < 400) c.inputStream else c.errorStream)?.use { it.readBytes().toString(UTF_8) }.orEmpty()
        c.disconnect()
        return code to (if (text.isBlank()) null else Json.parse(text))
    }
}
