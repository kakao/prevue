package prevue.infrastructure.controller.http.mapper

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import prevue.application.domain.model.DeviceInsetInputs
import prevue.application.domain.model.DeviceInsetState
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.DeviceOrientation
import prevue.infrastructure.json.Json

class DeviceInsetMapperTest {
    @Test fun `기기 응답은 모든 자세의 네 방향 값과 지원 이유와 조건을 구분한다`() {
        DeviceModel.entries.flatMap { it.postures }.forEach { d ->
            val json = d.toJson()!!
            val profile = json["insetProfile"] as Map<*, *>
            assertEquals(d.orientation.key, json["orientation"])
            assertEquals(d.widthPx to d.heightPx, json["widthPx"] to json["heightPx"])
            assertFalse(profile.containsKey("supported"), d.key)
            assertEquals(d.insetProfile.verified, profile["verified"])
            assertEquals(d.insetProfile.issue, profile["issue"])
            assertEquals(d.insetProfile.evidence?.conditions, (profile["evidence"] as? Map<*, *>)?.get("conditions"))
            assertNotNull(Json.parse(Json.str(json)))
        }
    }

    @Test fun `Duo 원자료의 측면 값은 safeArea에만 있고 Android 종류별 값이 아니다`() {
        val cover = DeviceModel.IPHONE_DUO.postures.single { it.folded && it.orientation == DeviceOrientation.LANDSCAPE_RIGHT }
        val p = cover.toJson()!!["insetProfile"] as Map<*, *>
        assertEquals(mapOf("left" to 84.0, "top" to 0.0, "right" to 0.0, "bottom" to 34.0), p["safeArea"])
        assertEquals(false, p["verified"])
        assertNull(p["measured"])
        val evidence = p["evidence"] as Map<*, *>
        assertEquals("safearea.info", evidence["source"])
        assertNull(evidence["capturedAt"])
    }

    @Test fun `기기 인셋 상태는 켬끔 필드 없이 늘 전달하는 값과 근거만 응답한다`() {
        DeviceModel.entries.flatMap { it.postures }.forEach { d ->
            val json = DeviceInsetState(d).toJson()
            assertEquals(setOf("issue", "posture", "approximate", "note", "basisPosture", "values", "evidence"), json.keys, d.key)
            val input = DeviceInsetInputs.of(d)
            assertEquals(input.values.toJson(), json["values"], d.key)
            assertEquals(d.key, json["posture"])
            assertEquals(input.approximate, json["approximate"])
            assertEquals(input.basisPosture, json["basisPosture"])
        }
    }

    @Test fun `Android 개별 종류의 미측정 값은 영으로 응답하지 않는다`() {
        val p = DeviceModel.GALAXY_S26.postures.first().toJson()!!["insetProfile"] as Map<*, *>
        assertTrue((p["issue"] as String).contains("systemOverlays"))
        val measured = p["measured"] as Map<*, *>
        assertTrue(measured.containsKey("systemOverlays"))
        assertNull(measured["systemOverlays"])
    }
}
