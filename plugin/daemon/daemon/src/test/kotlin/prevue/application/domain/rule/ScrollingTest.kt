package prevue.application.domain.rule

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import prevue.application.domain.model.ListItem
import prevue.application.domain.model.ListState
import prevue.application.domain.model.LiveTree
import prevue.application.domain.model.SemanticNode
import prevue.application.domain.model.Semantics
import prevue.application.domain.model.ViewNode
import org.junit.jupiter.api.Test

class ScrollingTest {
    private val pane = listOf(100, 200, 900, 1200)

    @Test
    fun `한 화면은 판 높이의 PAGE 만큼 판 가운데서 WHEEL 조각으로 굴린다`() {
        assertEquals(Scrolling.Roll(500, 700, 0f, 800f, 4), Scrolling.roll(pane, 1.0, horizontal = false))
        assertEquals(Scrolling.Roll(500, 700, -320f, 0f, 2), Scrolling.roll(pane, -0.5, horizontal = true))
    }

    private fun card(top: Int) = ViewNode("Card", "A.kt", 3, 100, top, 900, top + 100)
    private fun label(top: Int, n: Int) = SemanticNode(100, top, 900, top + 100, Semantics(text = "${n}번"))
    private fun list(first: Int) = ListState(1, true, 100, 800, 1000, 0, true, true, (0 until 10).map { ListItem(first + it, null, 0, it * 100, 800, 100) })

    @Test
    fun `칸 높이가 같아 칸 단위로 멈춰 상자가 굴리기 전과 같아도 다른 칸이 보이면 굴렀다`() {
        val boxes = (0 until 10).map { card(200 + it * 100) }
        val before = LiveTree(1000, 1400, boxes, states = listOf(list(0)), semantics = (0 until 10).map { label(200 + it * 100, it + 1) })
        val after = LiveTree(1000, 1400, boxes, states = listOf(list(50)), semantics = (0 until 10).map { label(200 + it * 100, it + 51) })
        assertTrue(Scrolling.moved(before, after, pane))
        assertTrue(Scrolling.moved(before.copy(states = emptyList()), after.copy(states = emptyList()), pane), "목록 상태가 없는 Column 도 내용으로 가린다")
        assertFalse(Scrolling.moved(before, before, pane))
    }
}
