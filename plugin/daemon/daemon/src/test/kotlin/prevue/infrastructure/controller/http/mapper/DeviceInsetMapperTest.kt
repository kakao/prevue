package prevue.infrastructure.controller.http.mapper

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.DeviceOrientation
import prevue.infrastructure.json.Json

class DeviceInsetMapperTest {
    @Test fun `기기 응답은 모든 자세의 네 방향 값과 출처 조건을 담고 검증 판정은 없다`() {
        DeviceModel.entries.flatMap { it.postures }.forEach { d ->
            val json = d.toJson()!!
            val profile = json["insetProfile"] as Map<*, *>
            assertEquals(d.orientation.key, json["orientation"])
            assertEquals(d.widthPx to d.heightPx, json["widthPx"] to json["heightPx"])
            assertFalse(profile.containsKey("supported"), d.key)
            assertEquals(setOf("safeArea", "measured", "evidence"), profile.keys, d.key)
            (profile["measured"] as? Map<*, *>)?.let { assertEquals(setOf("statusBars", "navigationBars", "captionBar", "displayCutout"), it.keys, d.key) }
            assertEquals(d.insetProfile.evidence?.conditions, (profile["evidence"] as? Map<*, *>)?.get("conditions"))
            assertNotNull(Json.parse(Json.str(json)))
        }
    }

    @Test fun `Duo 원자료의 측면 값은 safeArea에만 있고 Android 종류별 값이 아니다`() {
        val cover = DeviceModel.IPHONE_DUO.postures.single { it.folded && it.orientation == DeviceOrientation.LANDSCAPE_LEFT }
        val p = cover.toJson()!!["insetProfile"] as Map<*, *>
        assertEquals(mapOf("left" to 84.0, "top" to 0.0, "right" to 0.0, "bottom" to 34.0), p["safeArea"])
        assertNull(p["measured"])
        val evidence = p["evidence"] as Map<*, *>
        assertEquals("safearea.info", evidence["source"])
        assertNull(evidence["capturedAt"])
    }
}
