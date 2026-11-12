package prevue.application.domain.rule

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ScrollingTest {
    private val pane = listOf(100, 200, 900, 1200)

    @Test
    fun `screens 를 안 주면 until 이 있을 때만 끝까지 찾는다`() {
        assertEquals(1.0, Scrolling.screens(null, seeking = false))
        assertEquals(Scrolling.MAX_SCREENS, Scrolling.screens(null, seeking = true))
        assertEquals(2.5, Scrolling.screens(2.5, seeking = true))
    }

    @Test
    fun `한 화면은 판 높이의 PAGE 만큼 판 가운데서 WHEEL 조각으로 굴린다`() {
        assertEquals(Scrolling.Roll(500, 700, 0f, 800f, 4), Scrolling.roll(pane, 1.0, horizontal = false))
        assertEquals(Scrolling.Roll(500, 700, -320f, 0f, 2), Scrolling.roll(pane, -0.5, horizontal = true))
    }

    @Test
    fun `MAX_SCREENS 를 넘는 양은 잘린다`() {
        assertEquals(Scrolling.roll(pane, Scrolling.MAX_SCREENS, horizontal = false), Scrolling.roll(pane, 100.0, horizontal = false))
        assertEquals(Scrolling.roll(pane, -Scrolling.MAX_SCREENS, horizontal = false), Scrolling.roll(pane, -100.0, horizontal = false))
    }

    @Test
    fun `조각은 적어도 하나다`() {
        assertEquals(1, Scrolling.piecesOf(0.0))
        assertEquals(1, Scrolling.piecesOf(Scrolling.WHEEL.toDouble()))
        assertEquals(2, Scrolling.piecesOf(Scrolling.WHEEL + 1.0))
    }
}
