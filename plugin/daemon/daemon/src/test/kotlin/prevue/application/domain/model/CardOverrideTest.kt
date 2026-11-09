package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class CardOverrideTest {
    private fun spec(vararg params: Pair<String, String>) = PreviewSpec("demo.CardsKt.Card0", "demo.CardsKt.Card0", mapOf(*params), null, 0)

    @Test fun `켬은 showSystemUi 를 넣고 끔은 어노테이션의 true 를 걷는다`() {
        assertEquals("true", SystemUi.ON.applyTo(spec("widthDp" to "360")).params["showSystemUi"])
        assertEquals(mapOf("device" to "id:pixel_7"), SystemUi.OFF.applyTo(spec("showSystemUi" to "true", "device" to "id:pixel_7")).params)
        assertEquals(spec("showSystemUi" to "true"), SystemUi.ANNOTATED.applyTo(spec("showSystemUi" to "true")))
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

    @Test fun `둘 다 기본이면 덮어쓰기가 없고 하나만 바꾸면 다른 하나는 남는다`() {
        assertNull(CardOverride.of("id", ScreenSize.Original, SystemUi.ANNOTATED))
        val both = CardOverride("id", ScreenSize.Dp(320, 640), SystemUi.ON)
        assertEquals(CardOverride("id", ScreenSize.Original, SystemUi.ON), both.with(ScreenSize.Original, null))
        assertEquals(CardOverride("id", ScreenSize.Dp(320, 640)), both.with(null, SystemUi.ANNOTATED))
        assertNull(both.with(ScreenSize.Original, SystemUi.ANNOTATED))
    }

    @Test fun `세 값 밖은 받지 않는다`() {
        assertEquals(SystemUi.OFF, SystemUi.parse("off"))
        assertNull(SystemUi.parse(null))
        assertThrows<IllegalArgumentException> { SystemUi.parse("true") }
    }
}
