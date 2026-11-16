package prevue.application.domain.rule

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ScrollingTest {
    private val pane = listOf(100, 200, 900, 1200)

    @Test
    fun `한 화면은 판 높이의 PAGE 만큼 판 가운데서 WHEEL 조각으로 굴린다`() {
        assertEquals(Scrolling.Roll(500, 700, 0f, 800f, 4), Scrolling.roll(pane, 1.0, horizontal = false))
        assertEquals(Scrolling.Roll(500, 700, -320f, 0f, 2), Scrolling.roll(pane, -0.5, horizontal = true))
    }
}
