package prevue.application.domain.rule

import kotlin.math.abs
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import prevue.application.domain.model.ChromeLayout
import prevue.application.domain.model.ChromeMark
import prevue.application.domain.model.DpBox
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.IconSet
import prevue.application.domain.model.InkBand
import prevue.application.domain.model.ScreenSize
import prevue.infrastructure.json.Json

// 기준값 viewer-bars.json 은 기기 바를 뷰어(SystemBars.tsx · resize-scene.js 의 camBox)가 그리던 마지막 판이 그때의 67자세에 낸 수치다(34ca9d6 — Duo 커버 가로는 상태 표시가 없다).
// 옮기기의 기록으로 얼렸다 — 그 자세들은 자리가 조금이라도 움직이면 잡히고, 뒤에 더한 기기는 아래 불변식(띠 · 컷아웃 · 카메라 · 둥근 모서리 안)이 지킨다.
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

    @Test fun `기준값의 자세는 모두 지금도 있다`() {
        assertEquals(emptyList<String>(), (viewer.keys - all.map { it.key }.toSet()).toList())
    }

    @Test fun `기준값 자세의 바 자리가 뷰어가 그리던 자리와 같다`() {
        all.filter { it.key in viewer }.forEach { d ->
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

    @Test fun `기준값 자세의 카메라와 화면 모서리가 장면과 같다`() {
        all.filter { it.key in viewer }.forEach { d ->
            val want = viewer.getValue(d.key)
            val got = DeviceChrome.of(d)
            assertTrue(near(want["w"].d(), got.widthDp) && near(want["h"].d(), got.heightDp), d.key)
            assertEquals((want["radius"] as List<*>).map { it.d() }, got.radius, d.key)
            @Suppress("UNCHECKED_CAST")
            val cam = want["camera"] as Map<String, Any?>?
            if (cam == null) assertTrue(got.cutouts.isEmpty(), d.key)
            else {
                val box = got.cutouts.single()
                val a = listOf(cam["x"].d(), cam["y"].d(), cam["w"].d(), cam["h"].d()) + (cam["corners"] as List<*>).map { it.d() }
                val b = listOf(box.box.x, box.box.y, box.box.w, box.box.h) + box.corners
                assertTrue(a.zip(b).all { (x, y) -> near(x, y) }, "${d.key} 카메라: 장면 $a · 데몬 $b")
            }
        }
    }

    @Test fun `구멍이 없는 컷아웃은 배제 상자 모양 그대로 그린다`() {
        all.filter { d -> d.panel.face.cutouts.all { it.holes.isEmpty() } }.forEach { d ->
            val chrome = DeviceChrome.of(d)
            assertEquals(chrome.cutouts, chrome.cameras, d.key)
        }
    }

    @Test fun `Flip8 커버는 배제 상자 안에 실물에서 잰 플래시와 렌즈 둘을 그린다`() {
        val cover = DeviceChrome.of(ScreenSize.Device(DeviceModel.GALAXY_Z_FLIP8, folded = true))
        val box = cover.cutouts.single().box
        val want = listOf(Triple(206.3, 394.2, 29.0), Triple(271.2, 396.5, 76.0), Triple(351.8, 397.3, 76.0))
        assertEquals(listOf(false, true, true), cover.cameras.map { it.lens })
        cover.cameras.zip(want).forEach { (got, w) ->
            val b = got.box
            assertTrue(near(b.x + b.w / 2, w.first) && near(b.y + b.h / 2, w.second) && near(b.w, w.third) && near(b.h, w.third), "구멍 $b · 잰 값 $w")
            assertTrue(got.corners.all { near(it, w.third / 2) }, "구멍은 원이다: ${got.corners}")
            assertTrue(inside(b, box), "구멍 $b 가 배제 상자 $box 안")
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

    private val slop = 1.0

    private fun iconBox(m: ChromeMark.Icons): DpBox = when (m.set) {
        IconSet.ANDROID -> DpBox(m.x, m.y, 46 * m.scale, 13 * m.scale)
        IconSet.IOS_ALL -> DpBox(m.x, m.y, 78.33 * m.scale, 12.33 * m.scale)
        IconSet.IOS_LEFT -> DpBox(m.x, m.y, 48.0 * m.scale, 12.33 * m.scale)
        IconSet.IOS_RIGHT -> DpBox(m.x + 51.5 * m.scale, m.y, 26.83 * m.scale, 12.33 * m.scale)
    }

    private fun apart(a: DpBox, b: DpBox) = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y

    private fun inRound(layout: ChromeLayout, x: Double, y: Double): Boolean {
        val right = x > layout.widthDp / 2
        val bottom = y > layout.heightDp / 2
        val r = layout.radius[if (bottom) (if (right) 2 else 3) else (if (right) 1 else 0)]
        val cx = x.coerceIn(r, layout.widthDp - r)
        val cy = y.coerceIn(r, layout.heightDp - r)
        return Math.hypot(x - cx, y - cy) <= r + slop
    }

    private fun corners(b: DpBox) = listOf(b.x to b.y, b.x + b.w to b.y, b.x to b.y + b.h, b.x + b.w to b.y + b.h)

    @Test fun `모든 자세의 아이콘과 핸들은 제 띠 · 옆 컷아웃 · 둥근 화면 안에 있고 상태 줄과 아래 변 컷아웃 옆 핸들은 카메라를 비킨다 — 돌려서 아래로 온 위 카메라는 핸들 위에 그린다`() {
        all.forEach { d ->
            val chrome = DeviceChrome.of(d)
            val v = prevue.application.domain.model.DeviceInsetInputs.of(d).values
            val boxes = chrome.marks.mapNotNull { m ->
                when (m) {
                    is ChromeMark.Icons -> iconBox(m).also { b ->
                        assertTrue(b.y >= -slop && b.y + b.h <= v.statusBars.top + slop, "${d.key} 아이콘이 위 띠 안: $b")
                        assertTrue(b.x >= v.displayCutout.left - slop && b.x + b.w <= d.widthDp - v.displayCutout.right + slop, "${d.key} 아이콘이 옆 컷아웃 안: $b")
                    }
                    is ChromeMark.Handle -> m.box.also { b ->
                        assertTrue(b.y >= d.heightDp - v.navigationBars.bottom - slop && b.y + b.h <= d.heightDp + slop, "${d.key} 핸들이 아래 띠 안: $b")
                        assertTrue(b.x >= 0 && b.x + b.w <= d.widthDp, "${d.key} 핸들이 화면 안: $b")
                    }
                    else -> null
                }
            }
            val lowEdge = d.panel.face.cutouts.any { it.box.edge == prevue.application.domain.model.CameraEdge.BOTTOM }
            boxes.forEach { b ->
                val avoids = b.y < d.heightDp / 2 || lowEdge
                chrome.cutouts.filter { avoids }.forEach { assertTrue(apart(b, it.box), "${d.key} $b 가 카메라 ${it.box} 와 겹치지 않는다") }
                corners(b).forEach { (x, y) -> assertTrue(inRound(chrome, x, y), "${d.key} $b 의 꼭짓점이 둥근 화면 모서리 안") }
            }
        }
    }

    // Duo 시스템 자리 [x, y, 폭, 높이](pt = dp) — safearea.info/iphone-duo.md(스펙의 sourceSha256)의 Reserved Regions 중 카메라가 아닌 occlusion 이다(Xcode 27.1 · Split View · Inner Camera · Horizontal Toolbar 끔).
    // 사이트는 Apple 방향 이름이라 커버 가로의 좌우를 맞바꿔 옮겼다(D-179). 커버 가로는 그 자리가 카메라 모서리뿐이라 상태 표시가 없다.
    private val duoReserved = mapOf(
        "duo-folded" to DpBox(382.0, 0.0, 84.0, 174.0),
        "duo-folded-land" to DpBox(0.0, 0.0, 84.0, 82.0),
        "duo-folded-land-right" to DpBox(594.0, 384.0, 84.0, 82.0),
        "duo-land" to DpBox(525.0, 0.0, 144.0, 82.0),
        "duo" to DpBox(867.0, 0.0, 84.0, 124.0),
        "duo-right" to DpBox(867.0, 0.0, 84.0, 124.0),
    )

    private fun inside(b: DpBox, region: DpBox) =
        b.x >= region.x - slop && b.y >= region.y - slop && b.x + b.w <= region.x + region.w + slop && b.y + b.h <= region.y + region.h + slop

    @Test fun `Duo 상태 표시는 사이트의 시스템 자리 안이고 커버 가로에는 없이 카메라만 그 카메라 모서리 자리 안이다`() {
        val duo = all.filter { it.model == DeviceModel.IPHONE_DUO }
        assertEquals(duoReserved.keys, duo.map { it.key }.toSet())
        duo.forEach { d ->
            val chrome = DeviceChrome.of(d)
            val region = duoReserved.getValue(d.key)
            val status = duoStatusBox(chrome)
            if (d.folded && d.widthDp > d.heightDp) {
                assertNull(status, "${d.key} 커버 가로에는 상태 표시가 없다")
                assertTrue(inside(chrome.cameras.single().box, region), "${d.key} 카메라 ${chrome.cameras.single().box} 가 $region 안")
            } else assertTrue(status != null && inside(status, region), "${d.key} 상태 표시 $status 가 $region 안")
        }
    }

    private fun duoStatusBox(chrome: ChromeLayout): DpBox? {
        val time = chrome.marks.filterIsInstance<ChromeMark.Time>().singleOrNull() ?: return null
        val dot = chrome.marks.filterIsInstance<ChromeMark.DuoIndicator>().single()
        val half = time.size * 1.2
        val x0 = minOf(time.x - half, dot.x - 18.0)
        val x1 = maxOf(time.x + half, dot.x + 18.0)
        val y0 = minOf(time.y - time.size * .65, dot.y - 18.5)
        val y1 = maxOf(time.y + time.size * .65, dot.y + 21.6)
        return DpBox(x0, y0, x1 - x0, y1 - y0)
    }
}

