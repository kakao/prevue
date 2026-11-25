package prevue.infrastructure.store

import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import javax.imageio.ImageIO
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
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
        assertEquals(emptyMap<Int, Long>(), kept.failedAt)
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
        assertEquals(listOf("0.png", "shots.json"), s.image(first.id)!!.parentFile.list()!!.sorted())
    }

    @Test fun `상한을 넘으면 오래 쓴 파일부터 통째로 지운다`() = runBlocking {
        val s = store()
        s.keep(File("/r/Old.kt"), 1, 0, out("Old", 300, 600))
        File(root.listFiles()!!.single(), "shots.json").setLastModified(1_000)
        val one = root.walk().filter { it.isFile }.sumOf { it.length() }
        val capped = store(maxBytes = one + one / 2)
        capped.keep(File("/r/New.kt"), 1, 0, out("New", 300, 600))
        assertNull(capped.kept(File("/r/Old.kt")))
        assertNotNull(capped.kept(File("/r/New.kt")))
        assertTrue(root.walk().filter { it.isFile }.sumOf { it.length() } <= one + one / 2)
    }

    @Test fun `같은 장을 동시에 남겨도 온전한 그림 하나만 남는다`() = runBlocking {
        val s = store()
        val outs = (0 until 8).map { out("C$it", 1080, 2400) }
        outs.map { o -> async(Dispatchers.IO) { s.keep(File("/r/C.kt"), 1, 0, o) } }.awaitAll()
        val shot = s.kept(File("/r/C.kt"))!!.shots.single()
        assertEquals(600 to 1333, ImageIO.read(s.image(shot.id)).let { it.width to it.height })
        assertEquals(listOf("0.png", "shots.json"), s.image(shot.id)!!.parentFile.list()!!.sorted())
    }

    @Test fun `파일이 사라진 장은 남은 것으로 치지 않는다`() = runBlocking {
        val s = store()
        val shot = s.keep(File("/r/A.kt"), 2, 0, out("A0", 100, 200))
        s.keep(File("/r/A.kt"), 2, 1, out("A1", 100, 200))
        s.image(shot.id)!!.delete()
        assertEquals(listOf(1), s.kept(File("/r/A.kt"))!!.shots.map { it.index })
        assertNull(s.image(shot.id))
    }

    @Test fun `못 그린 장도 시각과 함께 남고 그리면 지워지며 장 수가 바뀌면 옛 기록을 버린다`() = runBlocking {
        val s = store()
        s.keep(File("/r/A.kt"), 4, 0, out("A0", 100, 200))
        clock = 2_000L
        s.fail(File("/r/A.kt"), 4, 1)
        assertEquals(mapOf(1 to 2_000L), store().kept(File("/r/A.kt"))!!.failedAt)
        s.keep(File("/r/A.kt"), 4, 1, out("A1", 100, 200))
        assertEquals(emptyMap<Int, Long>(), s.kept(File("/r/A.kt"))!!.failedAt)
        s.fail(File("/r/A.kt"), 5, 2)
        val k = s.kept(File("/r/A.kt"))!!
        assertEquals(5 to emptyList<Int>(), k.sheets to k.shots.map { it.index })
        assertEquals(setOf(2), k.failedAt.keys)
        assertEquals(listOf("shots.json"), root.listFiles()!!.single().list()!!.toList())
    }

    @Test fun `빌드가 바뀌면 못 그린 기록을 잊고 그린 장은 남긴다`() = runBlocking {
        val s = store()
        s.keep(File("/r/A.kt"), 2, 0, out("A0", 100, 200))
        s.fail(File("/r/A.kt"), 2, 1)
        s.forgetFailures()
        val k = store().kept(File("/r/A.kt"))!!
        assertEquals(listOf(0) to emptyMap<Int, Long>(), k.shots.map { it.index } to k.failedAt)
    }

    @Test fun `모르는 id 는 그림이 없다`() {
        assertNull(store().image("nope-0"))
        assertNull(store().image("../x"))
    }
}
