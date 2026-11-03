package prevue.adapter.render

import java.awt.image.BufferedImage
import java.awt.image.DataBufferInt
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotSame
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Test

class BitmapsTest {
    private fun pixels(img: BufferedImage) = (img.raster.dataBuffer as DataBufferInt).data

    @Test fun `렌더러가 주는 미리 곱한 ARGB 는 픽셀 배열을 복사하지 않고 나눠 쓴다`() {
        val img = BufferedImage(3, 2, BufferedImage.TYPE_INT_ARGB_PRE).apply { setRGB(1, 1, 0x80ff0000.toInt()) }
        val b = img.toBitmap()
        assertSame(pixels(img), b.pixels)
        assertEquals(true, b.premultiplied)
    }

    @Test fun `ARGB 도 나눠 쓴다`() {
        val img = BufferedImage(3, 2, BufferedImage.TYPE_INT_ARGB).apply { setRGB(1, 1, 0x80ff0000.toInt()) }
        val b = img.toBitmap()
        assertSame(pixels(img), b.pixels)
        assertEquals(false, b.premultiplied)
    }

    @Test fun `다른 형식은 ARGB 로 옮겨 담는다`() {
        val img = BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB).apply { setRGB(0, 1, 0x00ff00) }
        val b = img.toBitmap()
        assertNotSame(pixels(img), b.pixels)
        assertEquals(false, b.premultiplied)
        assertArrayEquals(intArrayOf(0xff000000.toInt(), 0xff000000.toInt(), 0xff00ff00.toInt(), 0xff000000.toInt()), b.pixels)
    }
}
