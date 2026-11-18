package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_LEFT
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_RIGHT
import prevue.application.domain.model.DeviceOrientation.PORTRAIT

class PosturesTest {
    @Test fun `명시적 edge-to-edge는 미리 그리는 모든 기기와 크기의 spec에도 남는다`() {
        val original = PreviewSpec("demo.PreviewKt.Card", "card", emptyMap(), null, 0)
        val chosen = CardOverride(original.previewId, edgeToEdge = EdgeToEdge.ON).base(original)
        val postures = Postures(chosen, 1)
        val s26 = ScreenSize.Device(DeviceModel.GALAXY_S26)
        for (size in Postures.plan(s26)) {
            assertEquals("true", postures.specOf(size).params[EdgeToEdge.PARAM], size.key)
        }
        val reset = CardOverride(original.previewId, edgeToEdge = EdgeToEdge.ON).with(null, null, EdgeToEdge.AUTO)
        assertNull(reset)
        assertNull(Postures(original, 2).specOf(s26).params[EdgeToEdge.PARAM])
    }

    private val heldTurn = mapOf(
        (true to PORTRAIT) to LANDSCAPE_LEFT, (true to LANDSCAPE_RIGHT) to PORTRAIT, (true to LANDSCAPE_LEFT) to PORTRAIT,
        (false to LANDSCAPE_LEFT) to PORTRAIT, (false to PORTRAIT) to LANDSCAPE_RIGHT, (false to LANDSCAPE_RIGHT) to PORTRAIT,
    )

    private fun foldButton(d: ScreenSize.Device): DeviceOrientation = when {
        d.model == DeviceModel.IPHONE_DUO || d.model == DeviceModel.GALAXY_Z_FOLD8 -> heldTurn.getValue(d.folded to d.orientation)
        d.model.panel(!d.folded).fixed -> d.model.panel(!d.folded).orientation
        else -> d.orientation
    }

    private val foldables = DeviceModel.entries.filter { it.cover != null }

    @Test fun `접기 목표는 뷰어 접기 버튼이 요청하는 자세와 같다 — tests viewer fold mjs의 HAND 표`() {
        val all = foldables.flatMap { it.postures }
        assertEquals(28, all.size)
        all.forEach { d -> assertEquals(ScreenSize.Device(d.model, !d.folded, foldButton(d)), d.folding, d.key) }
    }

    @Test fun `폴더블은 접기 목표를 먼저 그리고 같은 화면 돌리기 다음 나머지 다른 화면을 그린다`() {
        foldables.flatMap { it.postures }.forEach { d ->
            val own = Postures.plan(d).filterIsInstance<ScreenSize.Device>().filter { it.model == d.model }
            assertEquals(d.folding, own.first(), d.key)
            val turns = d.model.postures.count { it.folded == d.folded } - 1
            assertEquals(List(turns) { false }, own.drop(1).take(turns).map { it.folded != d.folded }, d.key)
            assertTrue(own.drop(1 + turns).all { it.folded != d.folded }, d.key)
        }
    }

    @Test fun `접히지 않는 기기는 접기 목표가 없고 돌린 두 자세만 그린다`() {
        DeviceModel.entries.filter { it.cover == null }.flatMap { it.postures }.forEach { d ->
            assertNull(d.folding, d.key)
            assertEquals(d.model.postures - d, Postures.plan(d).filterIsInstance<ScreenSize.Device>().filter { it.model == d.model })
        }
    }

    @Test fun `측정한 자세가 하나뿐인 화면은 돌리지 않는다 — Flip8 커버는 세로만 있고 돌린 요청은 거절한다`() {
        val flip = DeviceModel.GALAXY_Z_FLIP8
        assertEquals(listOf(PORTRAIT), flip.postures.filter { it.folded }.map { it.orientation })
        assertEquals(3, flip.postures.count { !it.folded })
        assertThrows(IllegalArgumentException::class.java) { ScreenSize.parse(null, "flip8", folded = true, landscape = true) }
        assertEquals(ScreenSize.Device(flip, true, PORTRAIT), ScreenSize.Device(flip, false, LANDSCAPE_LEFT).folding)
    }

    private val fold8 = ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8)
    private val blank = Postures(PreviewSpec("demo.Card", "demo.Card", emptyMap(), null, 0), round = 1)

    @Test fun `한 번 실패한 칸은 안 그린 칸을 다 고른 뒤에 다시 고르고 두 번 실패하면 고르지 않는다`() {
        val plan = Postures.plan(fold8)
        var ps = blank.missed(fold8, plan[0])
        assertEquals(plan[1], ps.next(fold8))
        ps = plan.drop(1).fold(ps) { acc, d -> acc.missed(fold8, d) }
        assertEquals(plan[0], ps.next(fold8))
        ps = plan.fold(ps) { acc, d -> acc.missed(fold8, d) }
        assertNull(ps.next(fold8))
    }

    @Test fun `실패 수는 크기를 바꿔도 닿는 칸만 이어 간다`() {
        val folded = fold8.copy(folded = true)
        val s26 = ScreenSize.Device(DeviceModel.GALAXY_S26)
        val ps = blank.missed(fold8, folded).missed(fold8, ScreenSize.Original).carriedTo(s26)
        assertEquals(mapOf<ScreenSize, Int>(ScreenSize.Original to 1), ps.misses)
        assertEquals(ps.misses, ps.missed(s26, folded).misses, "닿지 않는 칸의 실패는 세지 않는다")
    }
}
