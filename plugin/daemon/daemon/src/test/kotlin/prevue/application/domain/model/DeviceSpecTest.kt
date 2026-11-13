package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import prevue.application.domain.model.DeviceOrientation.*

data class DeviceReading(val insetsPx: Map<String, InsetEdges>?, val safeAreaSize: Pair<Double, Double>?)

class DeviceSpecTest {
    private val all = DeviceModel.entries.flatMap { it.postures }

    private fun reading(d: ScreenSize.Device) = DEVICE_READINGS[Triple(d.model.id, d.folded, d.orientation.key)]

    @Test fun `출처가 있는 자세마다 원 측정 읽음이 있고 출처 없는 자세는 폴드8 펼친 가로 오른쪽뿐이다`() {
        val sourced = all.filter { it.insetProfile.evidence != null }.map { it.key }
        assertEquals(sourced, all.filter { reading(it) != null }.map { it.key })
        assertEquals(DEVICE_READINGS.size, sourced.size)
        assertEquals(listOf("fold8-right"), all.filter { it.insetProfile.evidence == null }.map { it.key })
    }

    @Test fun `모든 자세의 인셋이 원 측정과 맞는다 — Android는 px 나누기 밀도, iOS는 화면에서 인셋을 뺀 safe area 크기`() {
        all.forEach { d ->
            val r = reading(d) ?: return@forEach
            assertEquals(emptyList<String>(), violations(d, d.insetProfile, r), d.key)
        }
    }

    @Test fun `출처의 해상도가 그 자세의 화면 크기다 — 가로 두 방향도 같은 크기`() {
        all.forEach { d ->
            val evidence = d.insetProfile.evidence ?: return@forEach
            assertEquals("${d.widthPx}x${d.heightPx}", evidence.conditions["resolutionPx"], d.key)
        }
    }

    @Test fun `인셋 한 칸을 잘못 옮기면 검산이 잡는다`() {
        val pixel = ScreenSize.Device(DeviceModel.PIXEL_9)
        val p = pixel.insetProfile
        val status = p.copy(measured = p.measured!!.copy(statusBars = InsetEdges(top = 65.89)))
        val safe = p.copy(safeArea = p.safeArea!!.copy(bottom = 24.01))
        assertNotEquals(emptyList<String>(), violations(pixel, status, reading(pixel)!!))
        assertNotEquals(emptyList<String>(), violations(pixel, safe, reading(pixel)!!))

        val iphone = ScreenSize.Device(DeviceModel.IPHONE_17, orientation = LANDSCAPE_LEFT)
        val q = iphone.insetProfile
        assertNotEquals(emptyList<String>(), violations(iphone, q.copy(safeArea = q.safeArea!!.copy(left = 61.0)), reading(iphone)!!))
    }

    private fun violations(d: ScreenSize.Device, p: DeviceInsetProfile, r: DeviceReading): List<String> {
        val found = mutableListOf<String>()
        r.insetsPx?.let { px ->
            val m = p.measured ?: return listOf("측정 인셋이 없다")
            val dp = mapOf("statusBars" to m.statusBars, "navigationBars" to m.navigationBars, "captionBar" to m.captionBar, "displayCutout" to m.displayCutout)
            dp.forEach { (kind, edges) ->
                val expected = dpOf(px.getValue(kind), d.model.dpi)
                if (edges != expected) found += "$kind $edges ≠ $expected"
            }
            val widest = px.values.reduce { a, b -> InsetEdges(maxOf(a.left, b.left), maxOf(a.top, b.top), maxOf(a.right, b.right), maxOf(a.bottom, b.bottom)) }
            val expected = dpOf(widest, d.model.dpi)
            if (p.safeArea != expected) found += "safeArea ${p.safeArea} ≠ 변마다 max $expected"
        }
        r.safeAreaSize?.let { size ->
            val s = p.safeArea ?: return listOf("safe area가 없다")
            val left = round2(d.widthDp - s.left - s.right) to round2(d.heightDp - s.top - s.bottom)
            if (left != size) found += "화면 − 인셋 $left ≠ 사이트 safe area 크기 $size"
        }
        return found
    }

    private fun dpOf(px: InsetEdges, dpi: Int) = InsetEdges(
        round2(px.left * 160 / dpi), round2(px.top * 160 / dpi), round2(px.right * 160 / dpi), round2(px.bottom * 160 / dpi),
    )

    private fun round2(v: Double) = Math.round(v * 100) / 100.0
}
