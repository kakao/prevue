package prevue.infrastructure.render

import java.awt.image.BufferedImage
import java.awt.image.DataBufferInt
import org.junit.jupiter.api.Assertions.assertEquals
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
}
