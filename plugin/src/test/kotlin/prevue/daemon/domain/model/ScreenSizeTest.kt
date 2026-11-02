package prevue.daemon.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import prevue.daemon.entity.PreviewSpec

class ScreenSizeTest {
    private fun spec(vararg params: Pair<String, String>) = PreviewSpec("demo.CardsKt.Card0", "demo.CardsKt.Card0", mapOf(*params), null, 0)

    @Test fun `프리셋은 dp만 바꾸고 다른 인자는 둔다`() {
        val p = ScreenSize.parse("narrow", null, folded = false, landscape = false)!!.applyTo(spec("widthDp" to "411", "uiMode" to "32"))
        assertEquals(mapOf("widthDp" to "320", "heightDp" to "640", "uiMode" to "32"), p.params)
    }

    @Test fun `크기 인자 없는 프리뷰에도 폭과 높이를 둘 다 넣는다`() {
        assertEquals(mapOf("widthDp" to "500", "heightDp" to "900"), ScreenSize.Dp(500, 900).applyTo(spec()).params)
    }

    @Test fun `시스템 UI 프리뷰는 렌더러가 dp 인자를 건너뛰어 기기 spec 으로 넣고 원래 밀도를 지킨다`() {
        val p = ScreenSize.Dp(320, 640).applyTo(spec("showSystemUi" to "true", "device" to "spec:width=1080px,height=2400px,dpi=480"))
        assertEquals("spec:width=960px,height=1920px,dpi=480", p.params["device"])
        assertEquals(ScreenSize.Dp(320, 640).applyTo(spec("showSystemUi" to "true")).params["device"], "spec:width=840px,height=1680px,dpi=420")
    }

    @Test fun `기기는 px 와 밀도에 화면 dp 를 반올림해 함께 넣는다 — 가로는 폭과 높이를 바꾼다`() {
        val open = ScreenSize.parse(null, "fold8", folded = false, landscape = false)!!.applyTo(spec("widthDp" to "411", "heightDp" to "891"))
        assertEquals(mapOf("device" to "spec:width=2448px,height=1848px,dpi=420,orientation=landscape", "widthDp" to "933", "heightDp" to "704"), open.params)
        val turned = ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8_ULTRA, folded = true, landscape = true)
        assertEquals("spec:width=2520px,height=1080px,dpi=480,orientation=landscape", turned.applyTo(spec()).params["device"])
        assertEquals(840.0, turned.widthDp)
        assertNull(turned.hingeDp)
    }

    @Test fun `내용 크기 컴포넌트가 기기 화면을 채우게 시스템 UI 가 아니면 dp 를 함께 넣고 시스템 UI 면 spec 만 넣는다`() {
        val s26 = ScreenSize.Device(DeviceModel.GALAXY_S26)
        assertEquals(mapOf("device" to "spec:width=1080px,height=2340px,dpi=480", "widthDp" to "360", "heightDp" to "780"), s26.applyTo(spec("widthDp" to "200")).params)
        assertEquals(mapOf("showSystemUi" to "true", "device" to "spec:width=1080px,height=2340px,dpi=480"), s26.applyTo(spec("showSystemUi" to "true")).params)
        assertEquals(s26.applyTo(spec()), s26.applyTo(s26.applyTo(spec())))
    }

    @Test fun `기기의 dp 크기와 힌지는 볼트 실측값과 같다`() {
        val fold8 = ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8)
        assertEquals(listOf(932.57, 704.0, 466.29), listOf(fold8.widthDp, fold8.heightDp, fold8.hingeDp))
        val cover = ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8, folded = true)
        assertEquals(listOf(475.43, 751.24), listOf(cover.widthDp, cover.heightDp))
        assertEquals(listOf(360.0, 780.0), ScreenSize.Device(DeviceModel.GALAXY_S26).let { listOf(it.widthDp, it.heightDp) })
        assertEquals(listOf(890.0, 626.0, 445.0), ScreenSize.Device(DeviceModel.IPHONE_DUO).let { listOf(it.widthDp, it.heightDp, it.hingeDp) })
    }

    @Test fun `새 기기의 dp 크기는 공개 스펙의 px 과 밀도로 나온다`() {
        fun dp(id: String, folded: Boolean = false) = ScreenSize.parse(null, id, folded, landscape = false) as ScreenSize.Device
        assertEquals(listOf(411.43, 923.43), dp("pixel9").let { listOf(it.widthDp, it.heightDp) })
        assertEquals(listOf(851.69, 882.87, 425.85), dp("pixelfold").let { listOf(it.widthDp, it.heightDp, it.hingeDp) })
        assertEquals(listOf(443.08, 994.46), dp("pixelfold", folded = true).let { listOf(it.widthDp, it.heightDp) })
        assertEquals(listOf(1280.0, 800.0), dp("tablet").let { listOf(it.widthDp, it.heightDp) })
        assertEquals(listOf(402.0, 874.0), dp("ip17").let { listOf(it.widthDp, it.heightDp) })
        assertEquals(listOf(420.0, 912.0), dp("ipair").let { listOf(it.widthDp, it.heightDp) })
        assertEquals(listOf(440.0, 956.0), dp("ip17pm").let { listOf(it.widthDp, it.heightDp) })
        assertEquals("spec:width=2076px,height=2152px,dpi=390", dp("pixelfold").applyTo(spec()).params["device"])
        assertEquals("spec:width=2560px,height=1600px,dpi=320,orientation=landscape", dp("tablet").applyTo(spec()).params["device"])
    }

    @Test fun `시스템 UI 프리뷰의 spec 기기는 크기 말고 다른 키를 그대로 둔다`() {
        val p = ScreenSize.Dp(673, 600).applyTo(spec("showSystemUi" to "true", "device" to "spec:width=1080px,height=2400px,dpi=480,cutout=punch_hole,orientation=portrait"))
        assertEquals("spec:width=2019px,height=1800px,dpi=480,orientation=landscape,cutout=punch_hole", p.params["device"])
    }

    @Test fun `덮어쓰기는 두 번 얹어도 같다`() {
        val s = ScreenSize.Dp(320, 640)
        val p = spec("showSystemUi" to "true", "device" to "spec:width=1080px,height=2400px,dpi=480")
        assertEquals(s.applyTo(p), s.applyTo(s.applyTo(p)))
    }

    @Test fun `읽을 수 없는 크기는 거절한다`() {
        assertEquals(ScreenSize.Dp(600, 960), ScreenSize.parse("600x960", null, folded = false, landscape = false))
        assertEquals(ScreenSize.Original, ScreenSize.parse("original", null, folded = false, landscape = false))
        assertNull(ScreenSize.parse(null, null, folded = false, landscape = false))
        assertThrows<IllegalArgumentException> { ScreenSize.parse("100x100", null, folded = false, landscape = false) }
        assertThrows<IllegalArgumentException> { ScreenSize.parse("huge", null, folded = false, landscape = false) }
        assertThrows<IllegalArgumentException> { ScreenSize.parse(null, "pixel", folded = false, landscape = false) }
        assertThrows<IllegalArgumentException> { ScreenSize.parse(null, "s26", folded = true, landscape = false) }
        assertThrows<IllegalArgumentException> { ScreenSize.parse("narrow", null, folded = true, landscape = false) }
    }
}
