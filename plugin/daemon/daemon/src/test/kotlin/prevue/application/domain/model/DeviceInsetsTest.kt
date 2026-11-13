package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import prevue.application.domain.model.DeviceOrientation.*

class DeviceInsetsTest {
    private val all = DeviceModel.entries.flatMap { it.postures }

    @Test fun `기기의 화면마다 세 방향을 갖고 이름표가 모두 다르다`() {
        assertEquals(DeviceModel.entries.sumOf { if (it.cover == null) 1 else 2 } * DeviceOrientation.entries.size, all.size)
        assertEquals(all.size, all.map { it.key }.toSet().size)
        all.groupBy { it.model to it.folded }.values.forEach { devices ->
            assertEquals(DeviceOrientation.entries.toSet(), devices.map { it.orientation }.toSet())
        }
        all.forEach { d ->
            assertEquals(d, ScreenSize.postureOf(d.key))
            assertEquals(d.orientation != PORTRAIT, d.widthPx > d.heightPx)
            val plan = Postures.plan(d).filterIsInstance<ScreenSize.Device>().filter { it.model == d.model }
            assertEquals(d.model.postures.toSet() - d, plan.toSet())
            assertEquals(plan.size, plan.map { Postures.idOf(spec(), it) }.toSet().size)
        }
    }

    @Test fun `기존 가로 요청은 원래 패널에서 돌린 크기를 유지한다`() {
        DeviceModel.entries.forEach { model ->
            listOf(false, true).filter { !it || model.cover != null }.forEach { folded ->
                val panel = model.panel(folded)
                val native = ScreenSize.parse(null, model.id, folded, false) as ScreenSize.Device
                val rotated = ScreenSize.parse(null, model.id, folded, true) as ScreenSize.Device
                assertEquals(panel.widthPx to panel.heightPx, native.widthPx to native.heightPx)
                assertEquals(panel.heightPx to panel.widthPx, rotated.widthPx to rotated.heightPx)
                assertFalse(native.landscape)
                assertTrue(rotated.landscape)
            }
        }
    }

    @Test fun `Duo 여섯 자세는 Xcode 27점1 공개 자료의 safe area와 해상도다`() {
        fun expect(folded: Boolean, direction: DeviceOrientation, px: Pair<Int, Int>, edges: InsetEdges) {
            val d = ScreenSize.Device(DeviceModel.IPHONE_DUO, folded, direction)
            val p = d.insetProfile
            assertEquals(px, d.widthPx to d.heightPx)
            assertEquals(edges, p.safeArea)
            assertEquals("off", p.evidence!!.conditions["splitView"])
            assertEquals("off", p.evidence.conditions["innerCamera"])
            assertEquals("off", p.evidence.conditions["horizontalToolbar"])
            assertEquals("pt", p.evidence.conditions["unit"])
            assertNull(p.measured)
        }
        expect(true, PORTRAIT, 1398 to 2034, InsetEdges(right = 84.0, bottom = 34.0))
        expect(true, LANDSCAPE_LEFT, 2034 to 1398, InsetEdges(left = 84.0, bottom = 34.0))
        expect(true, LANDSCAPE_RIGHT, 2034 to 1398, InsetEdges(right = 84.0, bottom = 34.0))
        expect(false, PORTRAIT, 2007 to 2853, InsetEdges(top = 82.0, bottom = 34.0))
        expect(false, LANDSCAPE_LEFT, 2853 to 2007, InsetEdges(right = 84.0, bottom = 34.0))
        expect(false, LANDSCAPE_RIGHT, 2853 to 2007, InsetEdges(right = 84.0, bottom = 34.0))
        assertEquals(475.5, ScreenSize.Device(DeviceModel.IPHONE_DUO).hingeDp)
    }

    @Test fun `iOS 가로는 Apple 방향 이름의 반대로 든 자세다 — 가로 왼쪽은 위가 왼쪽`() {
        all.filter { it.model.look == BarLook.IOS }.forEach { d ->
            val apple = d.insetProfile.evidence!!.conditions["orientation"]
            val expected = when (d.orientation) { PORTRAIT -> "portrait"; LANDSCAPE_LEFT -> "landscape-right"; LANDSCAPE_RIGHT -> "landscape-left" }
            assertEquals(expected, apple, d.key)
        }
    }

    @Test fun `S26 각 가로 방향의 컷아웃은 자체 캡처를 쓴다`() {
        val left = ScreenSize.Device(DeviceModel.GALAXY_S26, orientation = LANDSCAPE_LEFT).insetProfile
        val right = ScreenSize.Device(DeviceModel.GALAXY_S26, orientation = LANDSCAPE_RIGHT).insetProfile
        assertEquals(InsetEdges(left = 37.0), left.measured!!.displayCutout)
        assertEquals(InsetEdges(right = 37.0), right.measured!!.displayCutout)
        assertEquals(InsetEdges(top = 30.0), left.measured.statusBars)
        assertEquals(InsetEdges(bottom = 15.0), right.measured.navigationBars)
        assertEquals("1", left.evidence!!.conditions["rotation"])
        assertEquals("3", right.evidence!!.conditions["rotation"])
        assertNotEquals(left.evidence.url, right.evidence.url)
    }

    @Test fun `모든 프로필의 출처 해상도와 밀도는 해당 자세와 일치한다`() {
        assertEquals(all.size - 1, all.count { it.insetProfile.evidence != null })
        all.forEach { d ->
            val p = d.insetProfile
            p.evidence?.let { evidence ->
                assertEquals("${d.widthPx}x${d.heightPx}", evidence.conditions["resolutionPx"])
                assertTrue(evidence.url.startsWith("https://"))
                if (d.model.look != BarLook.IOS) {
                    assertEquals(d.model.dpi.toString(), evidence.conditions["densityDpi"])
                    assertEquals("gesture", evidence.conditions["navigation"])
                    assertEquals("false", evidence.conditions["multiWindow"])
                    assertTrue(evidence.url.contains("3884efc51ee56798d139ae64d730719b1083573c"))
                }
            }
        }
    }

    @Test fun `원자료는 사이트가 준 것만 갖고 폴드8 펼친 가로 오른쪽은 자기 자료가 없다`() {
        val missing = ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8, orientation = LANDSCAPE_RIGHT).insetProfile
        assertEquals(DeviceInsetProfile(), missing)
        assertEquals(listOf("fold8-right"), all.filter { it.insetProfile.evidence == null }.map { it.key })
        assertTrue(all.filter { it.model.look == BarLook.IOS }.all { it.insetProfile.measured == null && it.insetProfile.safeArea != null })
        assertTrue(all.filter { it.model.look != BarLook.IOS && it.insetProfile.evidence != null }.all { it.insetProfile.measured != null })
    }

    private fun spec() = PreviewSpec("demo.Card", "demo.Card", emptyMap(), null, 0)
}
