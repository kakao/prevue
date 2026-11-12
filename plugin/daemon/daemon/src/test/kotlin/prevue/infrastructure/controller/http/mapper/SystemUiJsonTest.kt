package prevue.infrastructure.controller.http.mapper

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.application.domain.model.BarInsets
import prevue.application.domain.model.BarLook
import prevue.application.domain.model.InsetSource
import prevue.application.domain.model.SystemBars
import prevue.application.domain.model.SystemUi
import prevue.application.domain.model.SystemUiState

/** status · 뷰어 상태의 systemUi.bars — 에이전트(스킬 · 도움말)와 뷰어 툴팁이 이 키로 기기 바의 값과 출처를 읽는다. */
class SystemUiJsonTest {
    @Test fun `기기 바는 모양 · 상태바 · 하단 dp 와 출처 사이트 · 측정 방식 · 주소를 싣는다`() {
        val bars = SystemBars.Shown(BarLook.ONE_UI, BarInsets(37.0, 15.0, InsetSource.SAMSUNG_RTL, "https://example.test/s26"))
        assertEquals(
            mapOf(
                "choice" to "on", "annotated" to false, "shown" to true,
                "bars" to mapOf(
                    "look" to "oneui",
                    "insets" to mapOf("statusDp" to 37.0, "navDp" to 15.0, "source" to "windowinsets.info", "kind" to "samsung-rtl", "sourceUrl" to "https://example.test/s26"),
                ),
            ),
            SystemUiState(SystemUi.ON, annotated = false, bars).toJson(),
        )
    }

    @Test fun `공통 바는 aosp 에 값이 없고 바가 없으면 bars 가 null 이다`() {
        assertEquals(mapOf("look" to "aosp", "insets" to null), SystemUiState(SystemUi.ON, false, SystemBars.COMMON).toJson()["bars"])
        assertEquals(null, SystemUiState(SystemUi.OFF, true).toJson()["bars"])
    }
}
