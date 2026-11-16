package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class CardOverrideTest {
    private fun spec(vararg params: Pair<String, String>) = PreviewSpec("demo.CardsKt.Card0", "demo.CardsKt.Card0", mapOf(*params), null, 0)

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
}
