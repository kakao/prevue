package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_LEFT
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_RIGHT
import prevue.application.domain.model.DeviceOrientation.PORTRAIT

class PosturesTest {
    private val heldTurn = mapOf(
        (true to PORTRAIT) to LANDSCAPE_LEFT, (true to LANDSCAPE_RIGHT) to PORTRAIT, (true to LANDSCAPE_LEFT) to PORTRAIT,
        (false to LANDSCAPE_LEFT) to PORTRAIT, (false to PORTRAIT) to LANDSCAPE_RIGHT, (false to LANDSCAPE_RIGHT) to PORTRAIT,
    )

    private fun foldButton(d: ScreenSize.Device): DeviceOrientation =
        if (d.model == DeviceModel.IPHONE_DUO || d.model == DeviceModel.GALAXY_Z_FOLD8) heldTurn.getValue(d.folded to d.orientation) else d.orientation

    private val foldables = DeviceModel.entries.filter { it.cover != null }

    @Test fun `접기 목표는 뷰어 접기 버튼이 요청하는 자세와 같다 — tests viewer fold mjs의 HAND 표`() {
        val all = foldables.flatMap { it.postures }
        assertEquals(24, all.size)
        all.forEach { d -> assertEquals(ScreenSize.Device(d.model, !d.folded, foldButton(d)), d.folding, d.key) }
    }

    @Test fun `폴더블은 접기 목표를 먼저 그리고 같은 화면 돌리기 다음 나머지 다른 화면을 그린다`() {
        foldables.flatMap { it.postures }.forEach { d ->
            val own = Postures.plan(d).filterIsInstance<ScreenSize.Device>().filter { it.model == d.model }
            assertEquals(d.folding, own.first(), d.key)
            assertEquals(List(2) { false }, own.drop(1).take(2).map { it.folded != d.folded }, d.key)
            assertEquals(List(2) { true }, own.drop(3).map { it.folded != d.folded }, d.key)
        }
    }

    @Test fun `접히지 않는 기기는 접기 목표가 없고 돌린 두 자세만 그린다`() {
        DeviceModel.entries.filter { it.cover == null }.flatMap { it.postures }.forEach { d ->
            assertNull(d.folding, d.key)
            assertEquals(d.model.postures - d, Postures.plan(d).filterIsInstance<ScreenSize.Device>().filter { it.model == d.model })
        }
    }
}
