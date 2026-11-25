package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class CardOverrideTest {
    private fun spec(vararg params: Pair<String, String>) = PreviewSpec("demo.CardsKt.Card0", "demo.CardsKt.Card0", mapOf(*params), null, 0)

    @Test fun `명시적 edge-to-edge는 기기와 시스템 UI 크기 변경 뒤에도 남고 auto만 그 선택을 지운다`() {
        val on = CardOverride("demo.CardsKt.Card0", edgeToEdge = EdgeToEdge.ON)
        val device = on.with(ScreenSize.Device(DeviceModel.GALAXY_S26), null)!!
        assertEquals("true", device.applyTo(spec()).params[EdgeToEdge.PARAM])
        val original = device.with(ScreenSize.Original, SystemUi.ON)!!
        assertEquals("true", original.applyTo(spec()).params[EdgeToEdge.PARAM])
        val auto = original.with(null, null, EdgeToEdge.AUTO)!!
        assertNull(auto.applyTo(spec()).params[EdgeToEdge.PARAM])
        assertEquals(SystemUi.ON, auto.systemUi)
    }

    @Test fun `켬은 어노테이션의 dp 크기를 같은 크기의 기기 spec 으로 옮긴다 — 렌더러가 바가 있으면 dp 인자를 건너뛴다`() {
        assertEquals(mapOf("showSystemUi" to "true", "device" to "spec:width=945px,height=2048px,dpi=420"),
            SystemUi.ON.applyTo(spec("widthDp" to "360", "heightDp" to "780")).params)
        assertEquals(mapOf("showSystemUi" to "true", "widthDp" to "360"), SystemUi.ON.applyTo(spec("widthDp" to "360")).params)
        val annotatedOn = spec("showSystemUi" to "true", "widthDp" to "360", "heightDp" to "780")
        assertEquals(annotatedOn, SystemUi.ON.applyTo(annotatedOn))
        assertEquals(mapOf("showSystemUi" to "true", "widthDp" to "360", "heightDp" to "780", "device" to "id:pixel_7"),
            SystemUi.ON.applyTo(spec("widthDp" to "360", "heightDp" to "780", "device" to "id:pixel_7")).params)
    }

    @Test fun `시스템 UI 를 먼저 얹고 크기를 넣어 켜면 크기가 기기 spec 으로 간다`() {
        val on = CardOverride("demo.CardsKt.Card0", ScreenSize.Dp(320, 640), SystemUi.ON).applyTo(spec())
        assertEquals("spec:width=840px,height=1680px,dpi=420", on.params["device"])
        assertNull(on.params["widthDp"])
        val off = CardOverride("demo.CardsKt.Card0", ScreenSize.Dp(320, 640), SystemUi.OFF).applyTo(spec("showSystemUi" to "true"))
        assertEquals(mapOf("widthDp" to "320", "heightDp" to "640"), off.params)
    }

    @Test fun `기본값 판정은 건드리지 않음과 기본값을 같게 본다`() {
        assertTrue(CardOverride.isDefault(null, null, null))
        assertTrue(CardOverride.isDefault(ScreenSize.Original, SystemUi.ANNOTATED, EdgeToEdge.AUTO))
        assertFalse(CardOverride.isDefault(null, SystemUi.ON, null))
        assertNull(CardOverride.of("demo.CardsKt.Card0", ScreenSize.Original, SystemUi.ANNOTATED))
    }
}
