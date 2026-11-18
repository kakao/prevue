package prevue.infrastructure.render

import java.awt.Color
import java.awt.image.BufferedImage
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.ChromeLayout
import prevue.application.domain.model.ChromeMark
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.DpBox
import prevue.application.domain.model.InkBand
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

    private val wDp = 200.0
    private val hDp = 60.0
    private val density = 3

    private class Ink(val count: Int, val x0: Double, val x1: Double, val y0: Double, val y1: Double)

    private fun inkOf(time: ChromeMark.Time): Ink {
        val image = BufferedImage((wDp * density).toInt(), (hDp * density).toInt(), BufferedImage.TYPE_INT_RGB)
        image.createGraphics().apply { color = Color.WHITE; fillRect(0, 0, image.width, image.height); dispose() }
        val layout = ChromeLayout(wDp, hDp, listOf(0.0, 0.0, 0.0, 0.0), emptyList(), emptyList(), listOf(time), mapOf(InkBand.STATUS to DpBox(0.0, 0.0, wDp, hDp)))
        DeviceChromePainter.paint(image, layout, clearCorners = false)
        var count = 0
        var x0 = Int.MAX_VALUE
        var x1 = -1
        var y0 = Int.MAX_VALUE
        var y1 = -1
        for (y in 0 until image.height) for (x in 0 until image.width) {
            if (image.getRGB(x, y) and 0xff >= 128) continue
            count++
            x0 = minOf(x0, x); x1 = maxOf(x1, x); y0 = minOf(y0, y); y1 = maxOf(y1, y)
        }
        return Ink(count, x0.toDouble() / density, (x1 + 1.0) / density, y0.toDouble() / density, (y1 + 1.0) / density)
    }

    private fun centered(weight: Int) = ChromeMark.Time(100.0, 30.0, 17.0, weight, centered = true, middleBaseline = true)

    @Test
    fun `시각 잉크는 윤곽 글자 폭 안에 들고 middleBaseline 이면 세로 가운데가 y에 온다`() {
        for ((weight, glyphs) in listOf(600 to ChromeShapes.iosTime, 500 to ChromeShapes.androidTime)) {
            val ink = inkOf(centered(weight))
            val advance = glyphs.advance * 17.0
            assertTrue(ink.x1 - ink.x0 in advance * .85..advance, "weight $weight: 잉크 폭 ${ink.x1 - ink.x0} · 글자 폭 $advance")
            assertEquals(30.0, (ink.y0 + ink.y1) / 2, 1.0, "weight $weight: 세로 가운데")
        }
    }

    @Test
    fun `가운데 맞춤이면 iOS 시각의 잉크가 x를 가운데에 둔다`() {
        val ink = inkOf(centered(600))
        assertEquals(100.0, (ink.x0 + ink.x1) / 2, .5)
    }

    @Test
    fun `기준선 맞춤이면 숫자 아래끝이 y에 놓인다`() {
        val ink = inkOf(ChromeMark.Time(100.0, 40.0, 17.0, 600, centered = true, middleBaseline = false))
        assertEquals(40.0, ink.y1, .5)
    }

    @Test
    fun `왼쪽 맞춤이면 잉크가 x에서 시작한다`() {
        val ink = inkOf(ChromeMark.Time(20.0, 30.0, 14.0, 500, centered = false, middleBaseline = true))
        assertEquals(20.0, ink.x0, 1.5)
    }

    @Test
    fun `iOS 세미볼드 윤곽은 같은 크기의 안드로이드 미디엄보다 획이 굵다`() {
        val ios = inkOf(centered(600))
        val android = inkOf(centered(500))
        val iosDensity = ios.count / ((ios.x1 - ios.x0) * (ios.y1 - ios.y0))
        val androidDensity = android.count / ((android.x1 - android.x0) * (android.y1 - android.y0))
        assertTrue(iosDensity > androidDensity, "iOS $iosDensity · 안드로이드 $androidDensity")
    }
}
