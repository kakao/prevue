package prevue.application.domain.model

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class WorkspaceStateTest {
    private val specs = (0 until 2).map { PreviewSpec("com.x.P$it", "P$it", emptyMap(), null, it) }
    private val board = Board.open(File("A.kt"), specs, 1)
    private val small = ScreenSize.Dp(320, 640)
    private val live = WorkspaceState(current = specs[1], board = board).withInteractive(CardOverride("P1", small))

    @Test fun `인터랙티브를 끄면 같은 보드에 남아도 그 카드에 준 크기가 남아 보이지 않는다`() {
        assertEquals(small, live.shownTarget()?.second)
        val off = live.withoutInteractive()
        assertNull(off.shownTarget())
        assertNull(off.shownSize())
        assertEquals(live.keepIds(), off.keepIds())
    }

    @Test fun `보이는 것이 없어지면 지켜야 할 그림도 남지 않는다 — 닫거나 비운 탭의 카드를 붙잡지 않는다`() {
        val gone = live.withNothingShown()
        assertEquals(emptySet<String>(), gone.keepIds())
        assertNull(gone.shownTarget())
        assertNull(gone.board)
    }

    @Test fun `다시 켜면 앞서 붙은 시각이 남지 않는다 — 스트림 주소는 새로 건 뒤에야 난다`() {
        val stale = live.withoutInteractive().copy(focusAttachedAt = 9)
        val on = stale.withInteractive(CardOverride("P1", small))
        assertNull(on.focusAttachedAt)
        assertEquals(specs[1].previewId to small, on.shownTarget()?.let { it.first.previewId to it.second })
    }

    @Test fun `같은 카드를 다시 선택하면 조정값을 유지하고 다른 카드를 선택하면 초기화한다`() {
        val adjustment = CardAdjustment(small, SystemUi.OFF, EdgeToEdge.ON)
        val adjusted = live.focusInteractive(1, adjustment).copy(focusAttachedAt = 9)

        val same = adjusted.focusInteractive(1)
        assertEquals(CardOverride(specs[1].previewId, small, SystemUi.OFF, EdgeToEdge.ON), same.cardOverride)
        assertNull(same.focusAttachedAt)

        val other = same.focusInteractive(0)
        assertEquals(0, other.board?.focus)
        assertEquals(specs[0].previewId to ScreenSize.Original, other.shownTarget())
        assertNull(other.cardOverride)
    }
}
