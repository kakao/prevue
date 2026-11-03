package prevue.daemon.adapter.http

import java.io.File
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.Socket
import java.net.URI
import java.nio.file.Files
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import kotlin.coroutines.EmptyCoroutineContext
import java.net.InetAddress
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import prevue.daemon.fake.Fixture

class ServerTest {
    private val fx = Fixture()

    @AfterEach fun tearDown() = fx.close()

    // ⑥ 의 절반. prevue 가 /daemon 으로 살아 있나를 폴링한다 — 이것까지 세면 유휴가 영영 안 온다.
    @Test fun `daemon 확인은 활동이 아니고 다른 요청은 활동이다`() {
        val port = ServerSocket(0).use { it.localPort }
        val ui = fx.entryPoints(fx.useCases(), port)
        val server = ui.server
        ui.start()
        try {
            fun get(path: String) = (URI("http://127.0.0.1:$port$path").toURL().openConnection() as HttpURLConnection).run { responseCode.also { disconnect() } }
            val t0 = server.lastActivityMs
            Thread.sleep(5)                                  // 실제 시간 — Server 가 활동을 벽시계 ms 로 적는다. 시각이 넘어가야 바뀜이 보인다
            assertEquals(200, get("/daemon"))
            assertEquals(t0, server.lastActivityMs)

            Thread.sleep(5)                                  // 위와 같다
            assertEquals(200, get("/status"))
            assertTrue(server.lastActivityMs > t0)
        } finally { runBlocking { ui.stop() } }
    }

    @Test fun `정적 파일은 확장자로 Content-Type 을 고르고 산출물이 뷰어보다 먼저다`() {
        val viewer = File(fx.root, "viewer-static").apply { mkdirs() }
        val out = File(fx.root, "out-static").apply { mkdirs() }
        for (n in listOf("index.html", "a.png", "a.json", "a.js", "a.css", "a.svg", "a.bin")) File(viewer, n).writeText(n)
        File(out, "a.json").writeText("from out")
        val port = ServerSocket(0).use { it.localPort }
        val server = Server(port, emptyList(), viewer, out, EmptyCoroutineContext) {}
        server.start()
        try {
            fun get(path: String) = (URI("http://127.0.0.1:$port$path").toURL().openConnection() as HttpURLConnection).run {
                Triple(responseCode, getHeaderField("Content-Type"), if (responseCode == 200) inputStream.use { String(it.readBytes()) } else null)
                    .also { disconnect() }
            }
            assertEquals(Triple(200, "text/html; charset=utf-8", "index.html"), get("/"))
            assertEquals("image/png", get("/a.png").second)
            assertEquals(Triple(200, "application/json", "from out"), get("/a.json"))
            assertEquals("text/javascript", get("/a.js").second)
            assertEquals("text/css", get("/a.css").second)
            assertEquals("image/svg+xml", get("/a.svg").second)
            assertEquals("application/octet-stream", get("/a.bin").second)
            assertEquals(404, get("/nope.html").first)
        } finally { runBlocking { server.stop() } }
    }

    @Test fun `정적 파일은 하위 디렉터리를 내주고 뷰어 · 산출물 밖으로 나가지 못한다`() {
        val viewer = File(fx.root, "viewer-static").apply { mkdirs() }
        val out = File(fx.root, "out-static").apply { mkdirs() }
        File(viewer, "js").mkdirs(); File(viewer, "js/app.js").writeText("app")
        File(out, "mod").mkdirs(); File(out, "mod/p.png").writeText("png")
        File(fx.root, "secret.txt").writeText("SECRET")
        File(fx.root, "viewer-static-evil").mkdirs(); File(fx.root, "viewer-static-evil/x.txt").writeText("SECRET")
        Files.createSymbolicLink(File(out, "link").toPath(), fx.root.toPath())
        val port = ServerSocket(0).use { it.localPort }
        val server = Server(port, emptyList(), viewer, out, EmptyCoroutineContext) {}
        server.start()
        try {
            fun raw(target: String) = Socket("127.0.0.1", port).use { s ->
                s.getOutputStream().write("GET $target HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n".toByteArray())
                String(s.getInputStream().readBytes())
            }
            assertTrue(raw("/js/app.js").let { it.startsWith("HTTP/1.1 200") && it.endsWith("app") })
            assertTrue(raw("/mod/p.png").let { it.startsWith("HTTP/1.1 200") && it.endsWith("png") })
            for (t in listOf("/../secret.txt", "/../../../secret.txt", "/%2e%2e/secret.txt", "/%2e%2e/%2e%2e/%2e%2e/secret.txt",
                "/js/../../secret.txt", "/../viewer-static-evil/x.txt", "/..%2fsecret.txt", "/link/secret.txt")) {
                val res = raw(t)
                assertTrue(res.startsWith("HTTP/1.1 404"), "$t -> ${res.lineSequence().first()}")
                assertFalse(res.contains("SECRET"), t)
            }
        } finally { runBlocking { server.stop() } }
    }

    @Test fun `멈춘 뒤의 기다림은 진행 중인 요청의 입구 코드가 끝날 때까지다`() {
        val entered = CompletableDeferred<Unit>()
        val release = CompletableDeferred<Unit>()
        val finished = CompletableDeferred<Unit>()
        val slow = HttpEndpoint { ex, path, _ ->
            if (path != "/slow") return@HttpEndpoint false
            entered.complete(Unit)
            try { release.await() } finally { ex.close() }
            finished.complete(Unit)
            true
        }
        val port = ServerSocket(0).use { it.localPort }
        val server = Server(port, listOf(slow), fx.root, fx.root, EmptyCoroutineContext) {}
        server.start()
        val client = getAsync(port, "/slow")
        try {
            runBlocking {
                withTimeout(5_000) { entered.await() }
                server.stopAccepting()
                val waiting = launch(Dispatchers.IO) { server.awaitStopped() }
                delay(200)
                assertFalse(waiting.isCompleted, "진행 중인 요청을 기다리지 않았다")
                release.complete(Unit)
                withTimeout(5_000) { waiting.join() }
                assertTrue(finished.isCompleted)
            }
        } finally {
            release.complete(Unit)
            runBlocking { withTimeout(5_000) { server.stop() } }
            runCatching { client.get(5, TimeUnit.SECONDS) }
        }
    }

    @Test fun `부모 스코프가 먼저 취소돼도 멈추면 포트를 놓는다`() {
        val parent = Job()
        val port = ServerSocket(0).use { it.localPort }
        val server = Server(port, emptyList(), fx.root, fx.root, parent) {}
        server.start()
        parent.cancel()
        runBlocking { withTimeout(5_000) { server.stop() } }
        ServerSocket(port, 1, InetAddress.getByName("127.0.0.1")).close()
    }

    private fun getAsync(port: Int, path: String) = CompletableFuture.supplyAsync {
        (URI("http://127.0.0.1:$port$path").toURL().openConnection() as HttpURLConnection).run { responseCode.also { disconnect() } }
    }
}
