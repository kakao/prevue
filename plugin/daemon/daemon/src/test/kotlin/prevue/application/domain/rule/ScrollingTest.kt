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
        assertTrue(Scrolling.moved(before.copy(semantics = emptyList()), after.copy(semantics = emptyList()), pane), "시맨틱 없는 칸도 목록 칸 번호로 가린다")
        assertTrue(Scrolling.moved(before.copy(states = emptyList()), after.copy(states = emptyList()), pane), "목록 상태가 없는 Column 도 내용으로 가린다")
        assertFalse(Scrolling.moved(before, before, pane))
    }

    @Test
    fun `굴린 상자 밖에서 넘어가는 목록과 상자 안의 진행 표시는 굴렀다로 치지 않는다`() {
        val boxes = (0 until 10).map { card(200 + it * 100) }
        val away = { first: Int -> list(first).copy(id = 2, width = 500, origin = 2000 to 0) }
        val busy = { p: String -> SemanticNode(100, 200, 900, 300, Semantics(text = "1번", stateDescription = p)) }
        val before = LiveTree(1000, 1400, boxes, states = listOf(list(0), away(0)), semantics = listOf(busy("10%")))
        val after = LiveTree(1000, 1400, boxes, states = listOf(list(0), away(5)), semantics = listOf(busy("40%")))
        assertFalse(Scrolling.moved(before, after, pane), "끝에 닿은 목록을 굴렀다고 답하면 에이전트가 끝에서 scroll 을 되풀이한다")
    }
}
