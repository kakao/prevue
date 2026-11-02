package prevue.daemon.adapter.browser

import java.awt.image.BufferedImage
import java.awt.image.DataBufferInt
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test
import prevue.daemon.adapter.render.toBitmap
import prevue.daemon.entity.Bitmap

class BitmapImageTest {
    @Test fun `Bitmap 을 복사 없이 ARGB 그림으로 감싼다`() {
        val px = intArrayOf(0xffff0000.toInt(), 0x8000ff00.toInt(), 0xff0000ff.toInt(), 0)
        val img = Bitmap(2, 2, px).toImage()
        assertSame(px, (img.raster.dataBuffer as DataBufferInt).data)
        assertEquals(BufferedImage.TYPE_INT_ARGB, img.type)
        assertEquals(px.toList(), listOf(img.getRGB(0, 0), img.getRGB(1, 0), img.getRGB(0, 1), img.getRGB(1, 1)))
    }

    @Test fun `미리 곱한 그림은 그 형식 그대로 되감아 같은 색을 낸다`() {
        val src = BufferedImage(2, 1, BufferedImage.TYPE_INT_ARGB_PRE).apply { setRGB(0, 0, 0xffff0000.toInt()); setRGB(1, 0, 0x80336699.toInt()) }
        val img = src.toBitmap().toImage()
        assertEquals(BufferedImage.TYPE_INT_ARGB_PRE, img.type)
        assertEquals(listOf(src.getRGB(0, 0), src.getRGB(1, 0)), listOf(img.getRGB(0, 0), img.getRGB(1, 0)))
    }
}
