package prevue.infrastructure.store

import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import javax.imageio.ImageIO
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.PreviewSpec
import prevue.application.port.RenderOutput
import prevue.daemon.fake.realDispatchers

class FileGalleryShotsTest {
    private val dir = Files.createTempDirectory("prevue-gallery").toFile()
    private val root = File(dir, "gallery")
    private var clock = 1_000L

    @AfterEach fun cleanup() { dir.deleteRecursively() }

    private fun store(maxBytes: Long = Long.MAX_VALUE) = FileGalleryShots(root, realDispatchers, maxBytes) { clock }

    private fun out(name: String, w: Int, h: Int, label: String? = null): RenderOutput {
        val png = File(dir, "$name-0.png").apply { ImageIO.write(BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB), "PNG", this) }
        val spec = PreviewSpec("demo.$name", name, emptyMap(), null, 0, paramLabel = label)
        return RenderOutput(true, spec, png, null, w, h, 1, 1, "SUCCESS", null, null, false)
    }

    @Test fun `넓은 그림은 폭 600 으로 비율을 지켜 줄이고 좁은 그림은 키우지 않는다`() = runBlocking {
        val s = store()
        val wide = s.keep(File("/r/A.kt"), 2, 0, out("A0", 1080, 2400))
        val narrow = s.keep(File("/r/A.kt"), 2, 1, out("A1", 400, 800, "dark"))
        assertEquals(600 to 1333, wide.width to wide.height)
        assertEquals(600 to 1333, ImageIO.read(s.image(wide.id)).let { it.width to it.height })
        assertEquals(400 to 800, narrow.width to narrow.height)
        assertEquals("A1" to "dark", narrow.name to narrow.variant)
    }

    @Test fun `다시 띄워도 남은 그림과 이름 · 그린 시각을 읽는다`() = runBlocking {
        store().keep(File("/r/A.kt"), 4, 0, out("A0", 100, 200))
        clock = 2_000L
        store().keep(File("/r/A.kt"), 4, 2, out("A2", 100, 200))
        val kept = store().kept(File("/r/A.kt"))!!
        assertEquals(4, kept.sheets)
        assertEquals(listOf(0 to 1_000L, 2 to 2_000L), kept.shots.map { it.index to it.drawnAt })
        assertTrue(store().image(kept.shots[1].id)!!.isFile)
        assertNull(store().kept(File("/r/B.kt")))
    }

    @Test fun `장 수가 줄면 범위 밖 장을 지운다`() = runBlocking {
        val s = store()
        s.keep(File("/r/A.kt"), 3, 2, out("A2", 100, 200))
        val first = s.keep(File("/r/A.kt"), 1, 0, out("A0", 100, 200))
        assertEquals(listOf(0), s.kept(File("/r/A.kt"))!!.shots.map { it.index })
        assertNull(s.image(first.id.dropLast(1) + "2"))
    }

    @Test fun `상한을 넘으면 오래 쓴 파일부터 통째로 지운다`() = runBlocking {
        val s = store()
        s.keep(File("/r/Old.kt"), 1, 0, out("Old", 300, 600))
        File(root.listFiles()!!.single(), "shots.json").setLastModified(1_000)
        val one = root.walk().filter { it.isFile }.sumOf { it.length() }
        s.maxBytes = one + one / 2
        s.keep(File("/r/New.kt"), 1, 0, out("New", 300, 600))
        assertNull(s.kept(File("/r/Old.kt")))
        assertNotNull(s.kept(File("/r/New.kt")))
        assertTrue(root.walk().filter { it.isFile }.sumOf { it.length() } <= s.maxBytes)
    }

    @Test fun `모르는 id 는 그림이 없다`() {
        assertNull(store().image("nope-0"))
        assertNull(store().image("../x"))
    }
}
