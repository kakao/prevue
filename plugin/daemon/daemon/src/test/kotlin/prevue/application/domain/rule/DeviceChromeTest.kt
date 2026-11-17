package prevue.application.domain.rule

import kotlin.math.abs
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import prevue.application.domain.model.ChromeMark
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.IconSet
import prevue.application.domain.model.InkBand
import prevue.application.domain.model.ScreenSize
import prevue.infrastructure.json.Json

// 기준값 viewer-bars.json 은 기기 바를 뷰어(SystemBars.tsx · resize-scene.js 의 camBox)가 그리던 마지막 판이 모든 자세에 낸 수치다.
// 데몬으로 옮기며 위치가 조금이라도 움직이면 여기서 잡힌다 — 그림(픽셀)이 아니라 자리를 견준다.
class DeviceChromeTest {
    private val all = DeviceModel.entries.flatMap { it.postures }

    @Suppress("UNCHECKED_CAST")
    private val viewer = Json.parse(javaClass.getResource("/device-chrome/viewer-bars.json")!!.readText()) as Map<String, Map<String, Any?>>

    private fun Any?.d() = (this as Number).toDouble()

    private fun near(a: Double, b: Double) = abs(a - b) < 1e-3

    private fun kind(m: ChromeMark): String = when (m) {
        is ChromeMark.Time -> "time"
        is ChromeMark.Handle -> "handle"
        is ChromeMark.DuoIndicator -> "sb-duo-indicator"
        is ChromeMark.Icons -> when (m.set) {
            IconSet.IOS_LEFT -> "sb-icons sb-icons-left"
            IconSet.IOS_RIGHT -> "sb-icons sb-icons-right"
            else -> "sb-icons"
        }
    }

    private fun numbers(m: ChromeMark): List<Double> = when (m) {
        is ChromeMark.Time -> listOf(m.x, m.y, m.size, m.weight.toDouble())
        is ChromeMark.Handle -> listOf(m.box.x, m.box.y, m.box.w, m.box.h, m.rx)
        is ChromeMark.DuoIndicator -> listOf(m.x, m.y, 1.0)
        is ChromeMark.Icons -> listOf(m.x, m.y, m.scale)
    }

    private fun numbers(m: Map<String, Any?>): List<Double> = when (m["kind"]) {
        "time" -> listOf(m["x"].d(), m["y"].d(), m["size"].d(), m["weight"].d())
        "handle" -> listOf(m["x"].d(), m["y"].d(), m["w"].d(), m["h"].d(), m["rx"].d())
        else -> listOf(m["x"].d(), m["y"].d(), m["scale"].d())
    }

    @Test fun `모든 기기 자세가 기준값에 있다`() {
        assertEquals(viewer.keys.sorted(), all.map { it.key }.sorted())
    }

    @Test fun `모든 자세의 바 자리가 뷰어가 그리던 자리와 같다`() {
        all.forEach { d ->
            val want = viewer.getValue(d.key)
            val got = DeviceChrome.of(d)
            @Suppress("UNCHECKED_CAST")
            val marks = want["marks"] as List<Map<String, Any?>>
            assertEquals(marks.map { it["kind"] }, got.marks.map(::kind), d.key)
            marks.zip(got.marks).forEach { (w, g) ->
                val a = numbers(w)
                val b = numbers(g)
                assertTrue(a.zip(b).all { (x, y) -> near(x, y) }, "${d.key} ${w["kind"]}: 뷰어 $a · 데몬 $b")
            }
        }
    }

    @Test fun `모든 자세의 카메라와 화면 모서리가 장면과 같다`() {
        all.forEach { d ->
            val want = viewer.getValue(d.key)
            val got = DeviceChrome.of(d)
            assertTrue(near(want["w"].d(), got.widthDp) && near(want["h"].d(), got.heightDp), d.key)
            assertEquals((want["radius"] as List<*>).map { it.d() }, got.radius, d.key)
            @Suppress("UNCHECKED_CAST")
            val cam = want["camera"] as Map<String, Any?>?
            val box = got.camera?.box
            if (cam == null) assertNull(got.camera, d.key)
            else {
                val a = listOf(cam["x"].d(), cam["y"].d(), cam["w"].d(), cam["h"].d()) + (cam["corners"] as List<*>).map { it.d() }
                val b = listOf(box!!.x, box.y, box.w, box.h) + got.camera!!.corners
                assertTrue(a.zip(b).all { (x, y) -> near(x, y) }, "${d.key} 카메라: 장면 $a · 데몬 $b")
            }
        }
    }

    @Test fun `글자색을 고르는 띠는 그리는 바가 있는 띠뿐이다`() {
        val duo = DeviceChrome.of(ScreenSize.Device(DeviceModel.IPHONE_DUO))
        assertEquals(setOf(InkBand.STATUS), duo.inkRegions.keys)
        assertEquals(84.0, duo.inkRegions.getValue(InkBand.STATUS).w)
        val pixel = DeviceChrome.of(ScreenSize.Device(DeviceModel.PIXEL_9))
        assertEquals(setOf(InkBand.STATUS, InkBand.NAVIGATION), pixel.inkRegions.keys)
        assertEquals(65.9, pixel.inkRegions.getValue(InkBand.STATUS).h)
    }
}
