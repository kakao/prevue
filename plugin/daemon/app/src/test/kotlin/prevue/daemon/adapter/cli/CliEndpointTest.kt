package prevue.daemon.adapter.cli

import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.URI
import java.nio.charset.StandardCharsets.UTF_8
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import prevue.json.Json
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.ViewNode
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class CliEndpointTest {
    private val fx = Fixture(previews = 2)
    private val port = ServerSocket(0).use { it.localPort }
    private val uc = fx.useCases()
    private val server = fx.entryPoints(uc, port)

    @BeforeAll fun up() {
        server.start()
        post("/show", mapOf("target" to fx.file.path, "by" to "cli"))
        uc.workspace.awaitBoardFilled()
    }

    @AfterAll fun down() { runBlocking { server.stop() }; fx.close() }

    @Test fun `빠진 인자는 500으로 무엇이 필요한지 답한다`() {
        fun error(path: String, body: Map<String, Any?>): Pair<Int, String> =
            request("POST", path, body).let { (code, json) -> code to (json as Map<*, *>)["error"].toString() }
        val f = fx.file.path
        assertEquals(500 to "java.lang.IllegalStateException: target(파일 경로 또는 FQN)이 필요하다", error("/show", emptyMap()))
        assertEquals(500 to "java.lang.IllegalStateException: target(파일 경로 또는 FQN)이 필요하다", error("/close", mapOf("fqn" to "demo.X")))
        assertEquals(500 to "java.lang.IllegalStateException: file(풀패스)이 필요하다", error("/selection", mapOf("file" to " ", "line" to 3)))
        assertEquals(500 to "java.lang.IllegalStateException: line이 필요하다", error("/selection", mapOf("file" to f, "line" to 0)))
        assertEquals(500 to "java.lang.IllegalStateException: file이 필요하다", error("/previews", emptyMap()))
    }

    @Test fun `status 와 board 는 메서드를 가리지 않는다`() {
        val status = request("POST", "/status", emptyMap())
        assertEquals(200, status.first)
        val body = status.second as Map<*, *>
        assertEquals(port, (body["port"] as Number).toInt())
        assertEquals("http://127.0.0.1:$port/", body["viewer"])
        assertTrue("root" in body)
        assertEquals(200, request("POST", "/board", emptyMap()).first)
    }

    @Test fun `POST 만 받는 경로는 GET 이면 이 입구가 답하지 않는다`() {
        for (p in listOf("/show", "/close", "/card", "/focus", "/previews", "/render", "/reload", "/wait", "/touch", "/scroll", "/type")) {
            assertEquals(404, request("GET", p, null).first, p)
        }
    }

    @Test fun `selection 은 POST 면 가리킨 곳을 적고 그 밖의 메서드면 읽는다`() {
        val posted = request("POST", "/selection", mapOf("file" to fx.file.path, "line" to 4, "node" to "Text"))
        assertEquals(200, posted.first)
        val read = request("GET", "/selection", null)
        assertEquals(200, read.first)
        assertEquals(4, ((read.second as Map<*, *>)["line"] as Number).toInt())
        assertEquals(200, request("PUT", "/selection", emptyMap()).first)
    }

    @Test fun `scroll 이 빗나가면 422, 후보가 여럿이면 409`() {
        fun n(line: Int, top: Int) = ViewNode("Row", "Cards.kt", line, 0, top, 100, top + 50)
        fx.renderer.liveTree = LiveTree(1080, 1920, listOf(n(3, 100), n(3, 300)))
        assertEquals(422, request("POST", "/scroll", mapOf("at" to "Cards.kt:9")).first)
        assertEquals(409, request("POST", "/scroll", mapOf("at" to "Cards.kt:3")).first)
        assertEquals(422, request("POST", "/scroll", mapOf("at" to "Cards.kt:x")).first)
        assertEquals(200, request("POST", "/scroll", emptyMap()).first)
    }

    @Test fun `wait 는 지금 탭을 싣는다`() {
        val r = request("POST", "/wait", mapOf("files" to listOf(fx.file.path), "timeoutMs" to 5_000))
        assertEquals(fx.file.canonicalPath, (r.second as Map<*, *>)["tab"])
    }

    private fun post(path: String, body: Map<String, Any?>) = request("POST", path, body)

    private fun request(method: String, path: String, body: Map<String, Any?>?): Pair<Int, Any?> {
        val c = URI("http://127.0.0.1:$port$path").toURL().openConnection() as HttpURLConnection
        c.requestMethod = method
        if (body != null) { c.doOutput = true; c.outputStream.use { it.write(Json.str(body).toByteArray(UTF_8)) } }
        val code = c.responseCode
        val text = (if (code < 400) c.inputStream else c.errorStream)?.use { it.readBytes().toString(UTF_8) }.orEmpty()
        c.disconnect()
        return code to (if (text.isBlank()) null else Json.parse(text))
    }
}
