package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import prevue.daemon.entity.ListItem
import prevue.daemon.entity.ListState
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.SemanticNode
import prevue.daemon.entity.Semantics
import prevue.daemon.entity.ViewNode
import prevue.daemon.domain.model.ListSummary

class ScrollReportTest {
    private val screen = listOf(0, 0, 1000, 1000)

    private fun rows(from: Int, to: Int, shift: Int, keyed: Boolean = true) =
        (from..to).map { ListItem(it, if (keyed) "k$it" else null, 0, it * 200 - shift, 1000, 200) }

    private fun list(items: List<ListItem>, id: Int = 1, origin: Pair<Int, Int>? = 0 to 0, w: Int = 1000, h: Int = 1000, forward: Boolean = true) =
        ListState(id, true, 50, w, h, 0, forward, true, items, origin)

    private fun tree(vararg states: ListState, semantics: List<SemanticNode> = emptyList(), nodes: List<ViewNode> = emptyList()) =
        LiveTree(1000, 1000, nodes, states = states.toList(), semantics = semantics)

    @Test fun `key 로 나타남과 사라짐을 맞추고 목록 요약을 싣는다`() {
        val before = tree(list(rows(0, 4, 0)))
        val after = tree(list(rows(3, 8, 700)))
        val r = ScrollReport.of(before, after, ScrollReport.Pane(screen, vertical = true, forward = true))
        assertEquals(ListSummary(50, 3, 8, true, true), r.list)
        assertEquals(listOf("k5", "k6", "k7", "k8"), r.appeared.map { it.key })
        assertEquals(listOf("k0", "k1", "k2"), r.disappeared.map { it.key })
        assertEquals(listOf(0, 300, 1000, 500), r.appeared.first().box)
    }

    @Test fun `key 가 없으면 index 로 맞추고 순환 목록의 가상 index 를 그대로 둔다`() {
        val before = tree(list(rows(6000, 6004, 6000 * 200, keyed = false)))
        val after = tree(list(rows(6002, 6006, 6002 * 200, keyed = false)))
        val r = ScrollReport.of(before, after, ScrollReport.Pane(screen, vertical = true, forward = true))
        assertEquals(listOf(6005, 6006), r.appeared.map { it.index })
        assertEquals(listOf(6000, 6001), r.disappeared.map { it.index })
        assertNull(r.appeared.first().key)
    }

    @Test fun `visible 은 목록 뷰포트와 컨테이너의 보이는 몫 중 작은 쪽이다`() {
        val after = tree(list(rows(0, 5, 100)))
        val r = ScrollReport.of(tree(list(emptyList())), after, ScrollReport.Pane(listOf(0, 0, 1000, 800), vertical = true, forward = true, frame = screen))
        assertEquals(listOf(0.5, 1.0, 1.0, 1.0, 0.5), r.appeared.map { it.visible })
    }

    @Test fun `박스 원점은 크기가 같은 컨테이너, 아니면 노드 맞춤, 둘 다 없으면 박스를 뺀다`() {
        val items = rows(0, 1, 0)
        val pane = listOf(500, 0, 1500, 1000)
        val wrongFit = ScrollReport.of(tree(list(emptyList())), tree(list(items, origin = 30 to 400)), ScrollReport.Pane(pane, true, true))
        assertEquals(listOf(500, 0, 1500, 200), wrongFit.appeared.first().box)
        val fitOnly = ScrollReport.of(tree(list(emptyList())), tree(list(items, origin = 0 to 0, w = 900)), ScrollReport.Pane(screen, true, true))
        assertEquals(listOf(0, 0, 1000, 200), fitOnly.appeared.first().box)
        val none = ScrollReport.of(tree(list(emptyList())), tree(list(items, origin = null, w = 900)), ScrollReport.Pane(screen, true, true))
        assertNull(none.appeared.first().box)
        assertNull(none.appeared.first().at)
        assertNull(none.appeared.first().semantics)
    }

    @Test fun `굴린 목록은 자리가 바뀐 목록이다`() {
        val still = list(rows(0, 2, 0), id = 7)
        val before = tree(still, list(rows(0, 4, 0), id = 9))
        val after = tree(still, list(rows(3, 8, 700), id = 9))
        assertEquals(9, ScrollReport.pickList(before, after, ScrollReport.Pane(screen, true, true))!!.id)
    }

    @Test fun `굴린 목록이 없으면 끝에 닿은 같은 축 목록, 움직였으면 목록이 아니다`() {
        val column = list(rows(0, 4, 0), id = 3)
        val row = ListState(4, false, 10, 400, 200, 0, true, false, emptyList(), 300 to 400)
        val t = tree(column, row)
        assertEquals(3, ScrollReport.pickList(t, t, ScrollReport.Pane(screen, true, true, moved = false))!!.id)
        assertNull(ScrollReport.pickList(t, t, ScrollReport.Pane(screen, true, true, moved = true)))
    }

    @Test fun `key 와 index 는 다른 이름표다`() {
        val before = tree(list(listOf(ListItem(3, null, 0, 0, 1000, 200))))
        val after = tree(list(listOf(ListItem(9, 3, 0, 0, 1000, 200))))
        val r = ScrollReport.of(before, after, ScrollReport.Pane(screen, true, true))
        assertEquals(listOf(3), r.appeared.map { it.key })
        assertEquals(listOf(3), r.disappeared.map { it.index })
    }

    @Test fun `아이템 안의 병합 시맨틱과 at 을 싣는다`() {
        val card = Semantics(text = "구구", actions = setOf("click"))
        val nodes = listOf(ViewNode("DrinkCard", "Screen.kt", 83, 0, 1000, 1000, 1200))
        val tall = listOf(0, 0, 1000, 2000)
        val after = tree(list(rows(4, 5, 0), h = 2000), semantics = listOf(SemanticNode(10, 1010, 990, 1190, card)), nodes = nodes).copy(height = 2000)
        val r = ScrollReport.of(tree(list(rows(0, 3, 0), h = 2000)), after, ScrollReport.Pane(tall, true, true))
        val item = r.appeared.single { it.index == 5 }
        assertEquals(card, item.semantics)
        assertEquals("Screen.kt:83", item.at)
    }

    @Test fun `목록 밖 줄의 at 번호는 touch 처럼 화면 안 후보의 읽는 순서다`() {
        val rows = (0 until 6).map { ViewNode("Text", "Col.kt", 5, 0, it * 300 - 600, 1000, it * 300 - 300) }
        assertEquals("Col.kt:5#1", ScrollReport.at(tree(nodes = rows), listOf(0, 0, 1000, 300)))
        assertEquals("Col.kt:5#2", ScrollReport.at(tree(nodes = rows), listOf(0, 300, 1000, 600)))
        assertNull(ScrollReport.at(tree(nodes = rows), listOf(0, -600, 1000, -300)))
    }

    @Test fun `목록 상태가 없으면 시맨틱 내용으로 맞춘다 — 같은 내용은 개수로`() {
        fun row(text: String, top: Int) = SemanticNode(0, top, 1000, top + 200, Semantics(text = text))
        val before = tree(semantics = listOf(row("a", 0), row("b", 200), row("x", 400), row("x", 600)))
        val after = tree(semantics = listOf(row("x", 0), row("x", 200), row("x", 400), row("c", 900)))
        val r = ScrollReport.of(before, after, ScrollReport.Pane(screen, vertical = true, forward = true))
        assertNull(r.list)
        assertEquals(listOf("x", "c"), r.appeared.map { it.semantics!!.text })
        assertEquals(listOf(listOf(0, 400, 1000, 600), listOf(0, 900, 1000, 1100)), r.appeared.map { it.box })
        assertEquals(0.5, r.appeared.last().visible)
        assertEquals(listOf("a", "b"), r.disappeared.map { it.semantics!!.text })
    }

    @Test fun `병합 — 글자는 읽는 순서로 잇고 동작은 합집합, 상태는 첫 값`() {
        val merged = ScrollReport.merge(listOf(
            Semantics(text = "#016", role = "Button", actions = setOf("click")),
            Semantics(text = "구구", heading = true, toggleableState = "On", actions = setOf("longClick")),
            Semantics(toggleableState = "Off"),
        ))
        assertEquals(Semantics(text = "#016\n구구", heading = true, role = "Button", toggleableState = "On", actions = setOf("click", "longClick")), merged)
        assertNull(ScrollReport.merge(emptyList()))
    }
    @Test fun `passed 는 표본에만 보인 아이템을 지나간 순서로 — 직전 · 지금 화면과 겹치지 않는다`() {
        fun labelled(items: List<ListItem>) = items.map { SemanticNode(0, it.y, 1000, it.y + 200, Semantics(text = "${it.index}")) }
        fun at(shift: Int) = rows(shift / 200, shift / 200 + 4, shift).let { tree(list(it), semantics = labelled(it)) }
        val pane = ScrollReport.Pane(screen, vertical = true, forward = true)
        val passage = ScrollPassed(at(0), pane)
        listOf(800, 1600).forEach { passage.sample(ScrollUntil.Still(at(it))) }
        val r = ScrollReport.of(at(0), at(2400), pane, passage = passage)
        assertEquals((5..11).map { "k$it" }, r.passed.map { it.key })
        assertEquals("5", r.passed.first().semantics?.text)
        val all = (0..4) + r.passed.map { it.index!! } + (12..16)
        assertEquals((0..16).toList(), all)
    }

    @Test fun `passed 는 목록 상태가 없으면 시맨틱 노드 id 로 맞춘다 — 내용이 같아도 따로 센다`() {
        fun row(id: Int, top: Int) = SemanticNode(0, top, 1000, top + 200, Semantics(text = "x"), id = id)
        fun at(shift: Int) = tree(semantics = (0 until 20).map { row(it, it * 200 - shift) })
        val pane = ScrollReport.Pane(screen, vertical = true, forward = true)
        val passage = ScrollPassed(at(0), pane)
        listOf(800, 1600).forEach { passage.sample(ScrollUntil.Still(at(it))) }
        val r = ScrollReport.of(at(0), at(2400), pane, passage = passage)
        assertEquals(7, r.passed.size)
        assertEquals(listOf("x"), r.passed.map { it.semantics!!.text }.distinct())
        assertEquals(5, r.disappeared.size)
        assertEquals(5, r.appeared.size)
    }

    @Test fun `passed 의 시맨틱은 더 많이 보인 프레임의 것으로 바뀐다 — 처음 걸친 띠의 것에 머물지 않는다`() {
        val pane = ScrollReport.Pane(screen, vertical = true, forward = true)
        val passage = ScrollPassed(tree(list(rows(0, 4, 0))), pane)
        val edge = rows(5, 5, 50).map { it.copy(y = 950) }
        passage.sample(ScrollUntil.Still(tree(list(edge), semantics = listOf(SemanticNode(0, 950, 1000, 1000, Semantics(text = "제목"))))))
        val whole = rows(5, 5, 0).map { it.copy(y = 400) }
        val both = listOf(SemanticNode(0, 400, 1000, 500, Semantics(text = "제목")), SemanticNode(0, 500, 1000, 600, Semantics(text = "부제")))
        passage.sample(ScrollUntil.Still(tree(list(whole), semantics = both)))
        assertEquals("제목\n부제", passage.items(1).values.single().semantics?.text)
    }
}
