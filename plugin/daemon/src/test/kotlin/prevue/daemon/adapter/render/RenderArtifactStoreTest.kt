package prevue.daemon.adapter.render

import java.awt.Color
import java.awt.image.BufferedImage
import java.nio.file.Path
import javax.imageio.ImageIO
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import prevue.json.Json

class RenderArtifactStoreTest {
    @TempDir lateinit var directory: Path

    private fun image(color: Color) = BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB).apply {
        createGraphics().let { g -> try { g.color = color; g.fillRect(0, 0, width, height) } finally { g.dispose() } }
    }

    @Test fun `같은 프리뷰의 마지막 이미지와 트리가 남고 완료 뒤 읽을 수 있다`() = runBlocking {
        RenderArtifactStore(directory.toFile()).use { store ->
            store.write("card", image(Color.RED), mapOf("revision" to 1), false)
            store.write("card", image(Color.BLUE), mapOf("revision" to 2), false).await()
            store.awaitWrites()
            assertEquals(Color.BLUE.rgb, ImageIO.read(store.imageFile("card")).getRGB(0, 0))
            assertEquals(2, ((Json.parse(store.treeFile("card").readText()) as Map<*, *>)["revision"] as Number).toInt())
            assertFalse(directory.toFile().listFiles().orEmpty().any { it.name.endsWith(".tmp") })
        }
    }

    @Test fun `보호한 산출물은 상한을 넘어도 남는다`() = runBlocking {
        RenderArtifactStore(directory.toFile()).use { store ->
            store.maxBytes = 0
            store.protect { setOf("keep") }
            store.write("keep", image(Color.RED), emptyMap(), false).await()
            store.write("drop", image(Color.BLUE), emptyMap(), false).await()
            assertTrue(store.imageFile("keep").isFile)
            assertTrue(store.treeFile("keep").isFile)
            assertFalse(store.imageFile("drop").exists())
            assertFalse(store.treeFile("drop").exists())
        }
    }

    @Test fun `쓰기 실패를 완료 대기에서 전달한다`() {
        RenderArtifactStore(directory.toFile()).use { store ->
            store.imageFile("broken").mkdirs()
            assertThrows(Exception::class.java) {
                runBlocking { store.write("broken", image(Color.RED), emptyMap(), false).await() }
            }
        }
    }

    @Test fun `성공 뒤 실패도 같은 줄에서 처리하여 이전 그림을 남기지 않는다`() = runBlocking {
        RenderArtifactStore(directory.toFile()).use { store ->
            store.write("card", image(Color.RED), emptyMap(), false)
            store.write("card", null, mapOf("failure" to "EXCEPTION"), true).await()
            assertFalse(store.imageFile("card").exists())
            assertEquals("EXCEPTION", (Json.parse(store.treeFile("card").readText()) as Map<*, *>)["failure"])
        }
    }

    @Test fun `쓰기 단계를 쓰기의 결과로 돌려준다`() = runBlocking {
        RenderArtifactStore(directory.toFile()).use { store ->
            val phases = store.write("card", image(Color.RED), emptyMap(), false).await()
            assertEquals(setOf("writeQueueMs", "pngMs", "jsonMs", "pruneMs"), phases.keys)
        }
    }

    @Test fun `닫으면 남은 쓰기를 마치고 그 뒤의 쓰기는 받지 않는다`() {
        val store = RenderArtifactStore(directory.toFile())
        val pending = (0 until 6).map { store.write("card$it", image(Color.RED), mapOf("i" to it), false) }
        store.close()
        assertTrue(pending.all { it.isCompleted })
        assertTrue((0 until 6).all { store.imageFile("card$it").isFile && store.treeFile("card$it").isFile })
        assertThrows(Exception::class.java) { store.write("late", image(Color.RED), emptyMap(), false) }
    }

    // NFR-10. 기본값을 바꾸면 기획의 숫자부터 고친다.
    @Test fun `산출물 상한 기본은 64MB다`() {
        assertEquals(64, outMaxMb(null))
        assertEquals(8, outMaxMb("8"))
    }
}
