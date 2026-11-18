package prevue.infrastructure.render

import java.awt.Color
import java.awt.image.BufferedImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.rule.DeviceChrome

class DeviceChromePainterTest {
    private val camera = 0xff050505.toInt()
    private val white = Color.WHITE.rgb

    private fun flip8Cover(): (Double, Double) -> Int {
        val device = ScreenSize.Device(DeviceModel.GALAXY_Z_FLIP8, folded = true)
        val image = BufferedImage(device.widthPx, device.heightPx, BufferedImage.TYPE_INT_ARGB)
        image.createGraphics().apply { color = Color.WHITE; fillRect(0, 0, image.width, image.height); dispose() }
        DeviceChromePainter.paint(image, DeviceChrome.of(device), clearCorners = false)
        val k = image.width / device.widthDp
        return { x, y -> image.getRGB((x * k).toInt(), (y * k).toInt()) }
    }

    private fun lighter(rgb: Int) = (rgb and 0xff) > 0x05 && rgb != white

    @Test fun `Flip8 커버 PNG 는 구멍 셋만 카메라 색이고 배제 상자의 나머지는 화면 내용이 보인다`() {
        val px = flip8Cover()
        listOf(206.3 to 394.2, 271.2 to 396.5, 351.8 to 397.3).forEach { (x, y) -> assertEquals(camera, px(x, y), "구멍 가운데 ($x, $y)") }
        listOf(227.0 to 395.0, 395.0 to 360.0, 185.0 to 437.0).forEach { (x, y) -> assertEquals(white, px(x, y), "상자 안 구멍 밖 ($x, $y)") }
    }

    @Test fun `렌즈 구멍에만 테와 유리 반점이 있다`() {
        val px = flip8Cover()
        listOf(271.2 to 396.5, 351.8 to 397.3).forEach { (cx, cy) ->
            assertTrue(lighter(px(cx + 34, cy)), "렌즈 ($cx, $cy) 테")
            assertTrue(lighter(px(cx - 76 * .12, cy - 76 * .12)), "렌즈 ($cx, $cy) 반점")
            assertEquals(camera, px(cx + 30, cy), "렌즈 ($cx, $cy) 테 안쪽")
        }
        assertEquals(camera, px(206.3 - 29 * .12, 394.2 - 29 * .12), "플래시에는 반점이 없다")
    }
}
