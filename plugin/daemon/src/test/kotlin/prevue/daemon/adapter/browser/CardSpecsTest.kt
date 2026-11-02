package prevue.daemon.adapter.browser

import prevue.daemon.entity.phrase
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** `@Preview` 인자 → 이름표 칸. nowinandroid 멀티프리뷰(phone · landscape · foldable · tablet · desktop)의 실제 인자와 PNG 크기다. */
class CardSpecsTest {
    private fun of(px: Pair<Int, Int>?, vararg p: Pair<String, String>) = CardSpecs.of(p.toMap(), px?.first, px?.second)

    @Test fun `크기는 인자가 말하는 dp 이고 dpi 를 준 spec 도 dp 그대로다`() {
        assertEquals(listOf(CardSpec("size", "411×891")), of(1079 to 2339, "showBackground" to "true", "device" to "spec:width=411dp,height=891dp"))
        assertEquals(listOf(CardSpec("size", "891×411")), of(2339 to 1079, "widthDp" to "891", "heightDp" to "411"))
        assertEquals(listOf(CardSpec("size", "1280×800")), of(1920 to 1200, "device" to "spec:width=1280dp,height=800dp,dpi=240"))
    }

    @Test fun `크기를 말하지 않으면 그린 PNG 를 밀도로 나눈다 — 기본 420dpi`() {
        assertEquals(listOf(CardSpec("size", "411×120")), of(1079 to 315))
        assertEquals(listOf(CardSpec("size", "1080×1920")), of(1080 to 1920, "device" to "spec:width=1080px,height=1920px,dpi=160"))
        assertEquals(emptyList<CardSpec>(), of(null))
    }

    @Test fun `이름 붙은 기기는 밀도를 몰라 크기 대신 이름이다`() {
        assertEquals(listOf(CardSpec("device", "pixel_5")), of(1080 to 2340, "device" to "id:pixel_5"))
    }

    @Test fun `다크 · 글자 배율 · 로케일 · API · 시스템 UI 는 고정 순서로 붙고 기본값은 칸이 되지 않는다`() {
        assertEquals(
            listOf(CardSpec("size", "411×891"), CardSpec("dark", phrase("spec.dark")), CardSpec("font", "1.5×"), CardSpec("locale", "ko"), CardSpec("api", "API 34"), CardSpec("systemUi", phrase("spec.systemUi"))),
            of(1079 to 2339, "showSystemUi" to "true", "apiLevel" to "34", "locale" to "ko", "fontScale" to "1.5", "uiMode" to "33", "widthDp" to "411", "heightDp" to "891"),
        )
        assertEquals(listOf(CardSpec("size", "411×891")), of(1079 to 2339, "uiMode" to "17", "fontScale" to "1", "widthDp" to "411", "heightDp" to "891"))
    }

    // 보드 배율(D-62)의 입력 — nowinandroid 기기 세트의 실제 PNG. 데스크톱(dpi=160)은 PNG 가 곧 dp 다.
    @Test fun `그림의 dp — 그렸으면 PNG ÷ 밀도라 dpi 를 준 spec 도 맞는다`() {
        assertEquals(DpSize(1280.0, 800.0, false), CardSpecs.dpSize(mapOf("device" to "spec:width=1280dp,height=800dp,dpi=240"), 1920, 1200))
        assertEquals(DpSize(1920.0, 1080.0, false), CardSpecs.dpSize(mapOf("device" to "spec:width=1920dp,height=1080dp,dpi=160"), 1920, 1080))
        assertEquals(DpSize(48.0, 48.0, false), CardSpecs.dpSize(emptyMap(), 126, 126))
    }

    // 인자는 그리기 전의 예상이다 — 기기 spec 을 줘도 내용 크기로 그려지면 PNG 가 맞다. 인자를 앞세우면 179px 그림을 1280dp 칸으로 늘린다.
    @Test fun `그렸으면 인자와 어긋나도 PNG 가 이긴다`() {
        assertEquals(DpSize(119.33, 48.0, false), CardSpecs.dpSize(mapOf("device" to "spec:width=1280dp,height=800dp,dpi=240"), 179, 72))
        assertEquals(DpSize(48.0, 48.0, false), CardSpecs.dpSize(mapOf("widthDp" to "360", "heightDp" to "900"), 126, 126))
    }

    @Test fun `그리기 전이면 인자가 말하는 dp — widthDp · heightDp 가 spec 보다 앞서고, 말하지 않으면 모른다`() {
        assertEquals(DpSize(891.0, 411.0, false), CardSpecs.dpSize(mapOf("widthDp" to "891", "heightDp" to "411"), null, null))
        assertEquals(DpSize(673.0, 841.0, false), CardSpecs.dpSize(mapOf("device" to "spec:width=673dp,height=841dp"), null, null))
        assertEquals(DpSize(891.0, 411.0, false), CardSpecs.dpSize(mapOf("device" to "spec:width=411dp,height=891dp,orientation=landscape"), null, null))
        assertEquals(DpSize(360.0, null, false), CardSpecs.dpSize(mapOf("widthDp" to "360"), null, null))
        assertEquals(DpSize(null, null, false), CardSpecs.dpSize(emptyMap(), null, null))
    }

    @Test fun `이름 붙은 기기는 PNG 를 기본 420 으로 나눠 짐작하고 짐작이라고 표시한다`() {
        assertEquals(DpSize(411.43, 891.43, true), CardSpecs.dpSize(mapOf("device" to "id:pixel_5"), 1080, 2340))
        assertEquals(DpSize(null, null, true), CardSpecs.dpSize(mapOf("device" to "id:pixel_5"), null, null))
    }

    @Test fun `1dp 의 px — spec 의 dpi, 없으면 렌더러 기본 420, 이름 붙은 기기는 모른다`() {
        assertEquals(420.0 / 160, CardSpecs.pxPerDp(mapOf("widthDp" to "411")))
        assertEquals(1.5, CardSpecs.pxPerDp(mapOf("device" to "spec:width=1280dp,height=800dp,dpi=240")))
        assertEquals(null, CardSpecs.pxPerDp(mapOf("device" to "id:pixel_5")))
    }
}
