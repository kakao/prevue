package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.ViewNode
import prevue.daemon.domain.policy.NodeTarget.Pick

/** D-69. `파일:라인[#N]` 겨냥 — 같은 줄의 반복 · 겹침 · 이름 없는 그룹 · 화면 밖. */
class NodeTargetTest {
    private fun n(name: String, line: Int, l: Int, t: Int, r: Int, b: Int, file: String = "Card.kt") = ViewNode(name, file, line, l, t, r, b)
    private val screen = LiveTree(1000, 2000, emptyList())

    @Test fun `파일은 베이스네임으로 맞추고 번호는 1부터`() {
        assertEquals(NodeTarget.Spec("Card.kt", 12, null), NodeTarget.parse("/a/b/Card.kt:12"))
        assertEquals(NodeTarget.Spec("Card.kt", 12, 3), NodeTarget.parse("Card.kt:12#3"))
        assertNull(NodeTarget.parse("Card.kt"))
        assertNull(NodeTarget.parse("Card.kt:12#0"))
        assertNull(NodeTarget.parse("Card.kt:x"))
        assertNull(NodeTarget.parse("Card.kt:99999999999"))
        assertNull(NodeTarget.parse("Card.kt:3#99999999999"))
    }

    @Test fun `겹친 노드는 바깥 하나 · 반복은 읽는 순서 · 빈 박스는 뺀다`() {
        val nodes = listOf(
            n("Button", 30, 0, 900, 200, 1000), n("Text", 30, 20, 920, 180, 980),   // 한 줄에 겹쳤다 — 아래 아이템
            n("Button", 30, 0, 100, 200, 200), n("Text", 30, 20, 120, 180, 180),     // 위 아이템
            n("remember", 30, 0, 0, 0, 0), n("Button", 31, 0, 0, 10, 10),
        )
        val c = NodeTarget.candidates(nodes, NodeTarget.Spec("Card.kt", 30, null))
        assertEquals(listOf(100, 900), c.map { it.top })
        assertTrue(c.all { it.name == "Button" })
    }

    @Test fun `이름 있는 노드가 있으면 이름 없는 그룹은 뺀다`() {
        // 람다 그룹이 엉뚱한 줄로 잡혀 이웃 줄의 노드들을 감싼다 — 그대로 두면 그것이 바깥이 되어 진짜 대상을 가린다
        val nodes = listOf(n("", 77, 40, 40, 120, 4300), n("Button", 77, 0, 4400, 300, 4500))
        assertEquals(listOf("Button"), NodeTarget.candidates(nodes, NodeTarget.Spec("Card.kt", 77, null)).map { it.name })
        assertEquals(listOf(""), NodeTarget.candidates(listOf(n("", 5, 0, 0, 10, 10)), NodeTarget.Spec("Card.kt", 5, null)).map { it.name })
    }

    @Test fun `하나면 그것 · 여럿이면 고르게 · 번호가 넘치면 없다`() {
        val a = n("A", 1, 0, 0, 10, 10); val b = n("B", 1, 0, 50, 10, 60)
        assertEquals(Pick.Hit(a, 1, 1), NodeTarget.pick(listOf(a), null))
        assertEquals(Pick.Choose(listOf(a, b)), NodeTarget.pick(listOf(a, b), null))
        assertEquals(Pick.Hit(b, 2, 2), NodeTarget.pick(listOf(a, b), 2))
        assertEquals(Pick.NoSuch(3, listOf(a, b)), NodeTarget.pick(listOf(a, b), 3))
        assertEquals(Pick.Missing, NodeTarget.pick(emptyList(), null))
    }

    @Test fun `화면 안 · 다 보임 · 누를 자리`() {
        val below = n("B", 1, 0, 2100, 100, 2200)
        val cut = n("C", 1, 0, 1950, 100, 2050)
        assertFalse(NodeTarget.visible(below, screen))
        assertTrue(NodeTarget.visible(cut, screen))
        assertFalse(NodeTarget.shown(cut, screen))
        assertEquals(50 to 1975, NodeTarget.point(cut, screen))        // 그림 안에 든 부분의 가운데
        assertTrue(NodeTarget.shown(n("Big", 1, 0, -10, 1000, 2500), screen))   // 그림보다 크면 채우면 다 보인 것
    }

    // 스크롤 컨테이너에 위쪽이 잘린 카드 — 그림 안이라도 그리드 밖(머리글)은 보이는 자리가 아니다
    @Test fun `조상 박스 밖은 보이는 자리가 아니다`() {
        val grid = listOf(0, 213, 1000, 2000)
        val cut = ViewNode("Card", "Grid.kt", 1, 489, -93, 903, 225, grid)
        assertTrue(NodeTarget.visible(cut, screen))
        assertEquals(696 to 219, NodeTarget.point(cut, screen))
        assertFalse(NodeTarget.shown(cut, screen))
        assertFalse(NodeTarget.visible(ViewNode("Under", "Grid.kt", 1, 0, -300, 400, 0, grid), screen))
        assertTrue(NodeTarget.shown(ViewNode("In", "Grid.kt", 1, 0, 300, 400, 600, grid), screen))
    }

    @Test fun `보이는 박스는 노드 ∩ 조상 박스 ∩ 그림이다`() {
        val grid = listOf(0, 213, 1000, 2000)
        assertEquals(listOf(489, 213, 903, 225), NodeTarget.visibleBox(ViewNode("Cut", "Grid.kt", 1, 489, -93, 903, 225, grid), screen))
        assertEquals(listOf(0, 1950, 100, 2000), NodeTarget.visibleBox(n("C", 1, 0, 1950, 100, 2050), screen))
    }
}
