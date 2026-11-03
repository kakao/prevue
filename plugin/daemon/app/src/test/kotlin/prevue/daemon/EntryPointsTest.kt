package prevue.daemon

import java.io.File
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.URI
import java.util.concurrent.atomic.AtomicInteger
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.daemon.fake.Fixture
import prevue.json.Json

class EntryPointsTest {
    private val fx = Fixture()

    @AfterEach fun tearDown() = fx.close()

    private fun get(port: Int, path: String): String =
        (URI("http://127.0.0.1:$port$path").toURL().openConnection() as HttpURLConnection).run { inputStream.use { it.readBytes().decodeToString() }.also { disconnect() } }

    @Test fun `버전은 뷰어 옆 VERSION 에서 읽고 앱 정보는 처음 물을 때 한 번 읽는다`() {
        File(fx.root, "VERSION").writeText("1.2.3\n")
        val asked = AtomicInteger()
        val port = ServerSocket(0).use { it.localPort }
        fx.entryPoints(fx.useCases(), port, TargetRepo(app = { asked.incrementAndGet(); "포켓덱스" to null })).start()
        assertEquals(0, asked.get())
        val first = Json.parse(get(port, "/app.json")) as Map<*, *>
        get(port, "/app.json")
        assertEquals(mapOf("name" to "포켓덱스", "icon" to false, "prevue" to "1.2.3", "reveal" to false), first)
        assertEquals(1, asked.get())
    }
}
