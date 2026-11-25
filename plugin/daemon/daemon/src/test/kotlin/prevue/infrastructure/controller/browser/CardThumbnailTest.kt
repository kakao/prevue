package prevue.infrastructure.controller.browser

import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import javax.imageio.ImageIO
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test

class CardThumbnailTest {
    private val dir = Files.createTempDirectory("prevue-thumb").toFile()

    private fun png(w: Int, h: Int) = File(dir, "P-0.png").apply { ImageIO.write(BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB), "PNG", this) }

    @Test fun `넓은 그림은 폭 600 으로 비율을 지켜 줄인 옆 파일이 된다`() {
        val src = png(1080, 2400)
        val t = CardThumbnail.of(src, 1080, 2400)
        assertEquals("P-0.card.png", t.file.name)
        assertEquals(600 to 1333, t.width to t.height)
        val read = ImageIO.read(t.file)
        assertEquals(600 to 1333, read.width to read.height)
    }

    @Test fun `폭 600 이하는 키우지 않고 원본을 그대로 쓴다`() {
        val src = png(400, 800)
        val t = CardThumbnail.of(src, 400, 800)
        assertSame(src, t.file)
        assertEquals(400 to 800, t.width to t.height)
    }
}
