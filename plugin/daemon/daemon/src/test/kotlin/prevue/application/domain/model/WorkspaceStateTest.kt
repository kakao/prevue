package prevue.application.domain.model

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class WorkspaceStateTest {
    private val specs = (0 until 2).map { PreviewSpec("com.x.P$it", "P$it", emptyMap(), null, it) }
    private val board = Board.open(File("A.kt"), specs, 1)
    private val override = CardOverride("com.x.P1", ScreenSize.Dp(320, 640))
    private val live = WorkspaceState(
        current = specs[1], board = board, interactive = true, focusAttachedAt = 22, cardOverride = override,
        activeTab = "A.kt", selectionTab = "A.kt", newFiles = setOf("B.kt"), lastRenderMs = 7,
    )

    @Test fun `인터랙티브를 끄면 붙은 시각과 덮어쓰기가 함께 지워지고 보드와 나머지는 그대로다`() {
        assertEquals(live.copy(interactive = false, focusAttachedAt = null, cardOverride = null), live.withoutInteractive())
    }

    @Test fun `아무것도 보이지 않게 하면 인터랙티브를 끄고 보드와 지금 장까지 비운다`() {
        assertEquals(
            live.copy(board = null, current = null, interactive = false, focusAttachedAt = null, cardOverride = null),
            live.withNothingShown(),
        )
    }

    @Test fun `인터랙티브를 켜면 옛 붙은 시각을 비우고 덮어쓰기를 새로 단다`() {
        val next = CardOverride("com.x.P0")
        val off = live.withoutInteractive().copy(focusAttachedAt = 9)
        assertEquals(off.copy(interactive = true, focusAttachedAt = null, cardOverride = next), off.withInteractive(next))
    }
}
