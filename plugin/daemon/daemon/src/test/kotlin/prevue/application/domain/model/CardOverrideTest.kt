package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class CardOverrideTest {
    private fun spec(vararg params: Pair<String, String>) = PreviewSpec("demo.CardsKt.Card0", "demo.CardsKt.Card0", mapOf(*params), null, 0)

    @Test fun `켬은 showSystemUi 를 넣고 끔은 어노테이션의 true 를 걷는다`() {
        assertEquals("true", SystemUi.ON.applyTo(spec("widthDp" to "360")).params["showSystemUi"])
        assertEquals(mapOf("device" to "id:pixel_7"), SystemUi.OFF.applyTo(spec("showSystemUi" to "true", "device" to "id:pixel_7")).params)
        assertEquals(spec("showSystemUi" to "true"), SystemUi.ANNOTATED.applyTo(spec("showSystemUi" to "true")))
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

    @Test fun `보이는 값은 고른 값이 어노테이션을 이긴다`() {
        assertTrue(SystemUiState(SystemUi.ANNOTATED, annotated = true).shown)
        assertFalse(SystemUiState(SystemUi.OFF, annotated = true).shown)
        assertTrue(SystemUiState(SystemUi.ON, annotated = false).shown)
    }

    @Test fun `세 값 밖은 받지 않는다`() {
        assertEquals(SystemUi.OFF, SystemUi.parse("off"))
        assertNull(SystemUi.parse(null))
        assertThrows<IllegalArgumentException> { SystemUi.parse("true") }
    }
}
