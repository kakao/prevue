package prevue.daemon.domain.policy

import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.entity.LazyItem
import prevue.daemon.entity.LazyList
import prevue.daemon.entity.ListItem
import prevue.daemon.entity.ListState
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.SemanticNode
import prevue.daemon.entity.Semantics
import prevue.daemon.entity.ViewNode
import prevue.daemon.domain.policy.ScrollUntil.Sight

class ScrollUntilTest {
    private val screen = listOf(0, 0, 1000, 1000)
    private val down = ScrollReport.Pane(screen, vertical = true, forward = true)

    private fun rows(from: Int, to: Int, shift: Int) = (from..to).map { ListItem(it, null, 0, it * 200 - shift, 1000, 200) }

    private fun state(items: List<ListItem>) = ListState(7, true, 100, 1000, 1000, 0, true, false, items, 0 to 0)

    private fun labels(items: List<ListItem>) = items.map { SemanticNode(0, maxOf(it.y, 0), 1000, minOf(it.y + it.h, 1000), Semantics(text = "${it.index + 1}번")) }

    private fun tree(items: List<ListItem>, nodes: List<ViewNode> = emptyList(), lists: List<LazyList> = emptyList()) =
        LiveTree(1000, 1000, nodes, lists, listOf(state(items)), labels(items))

    private class Counting(private val tree: LiveTree) : ScrollUntil.Probe {
        var semantics = 0
        var looks = 0
        override fun lists() = tree.states
        override fun semantics() = tree.semantics.also { semantics++ }
        override suspend fun look() = tree.also { looks++ }
    }

    @Test fun `파일 라인 모양이면 소스 줄, 아니면 글자다`() {
        assertEquals(ScrollUntil.Target.Line(NodeTarget.Spec("Card.kt", 12, 87)), ScrollUntil.parse("ui/Card.kt:12#87"))
        assertEquals(ScrollUntil.Target.Text("87번"), ScrollUntil.parse("87번"))
        assertEquals(ScrollUntil.Target.Text("시간: 12"), ScrollUntil.parse("시간: 12"))
        assertNull(ScrollUntil.parse(" "))
    }

    @Test fun `글자는 시맨틱 text 나 contentDescription 에 들어 있으면 맞다`() {
        assertTrue(ScrollUntil.says(Semantics(text = "87번 피카츄"), "87번"))
        assertTrue(ScrollUntil.says(Semantics(contentDescription = "87번"), "87번"))
        assertFalse(ScrollUntil.says(Semantics(text = "86번"), "87번"))
        assertFalse(ScrollUntil.says(null, "87번"))
    }

    @Test fun `다 보임은 1, 뷰포트보다 큰 대상은 보일 수 있는 만큼이다`() {
        assertTrue(ScrollUntil.whole(1.0, 200, 1000))
        assertFalse(ScrollUntil.whole(0.9, 200, 1000))
        assertTrue(ScrollUntil.whole(0.5, 2000, 1000))
        assertFalse(ScrollUntil.whole(0.4, 2000, 1000))
    }

    @Test fun `게으른 목록의 글자 대상은 들어오면 가깝고 다 보이면 멈춘다`() = runTest {
        val watch = ScrollUntil.watch(ScrollUntil.Target.Text("6번"), tree(rows(0, 4, 0)), down)
        assertEquals(Sight.NONE, watch.sight(ScrollUntil.Still(tree(rows(0, 4, 0)))))
        assertEquals(Sight.NEAR, watch.sight(ScrollUntil.Still(tree(rows(0, 5, 100)))))
        assertEquals(Sight.WHOLE, watch.sight(ScrollUntil.Still(tree(rows(1, 5, 200)))))
    }

    @Test fun `다 보고 아니라고 판정한 아이템은 시맨틱을 다시 읽지 않는다`() = runTest {
        val watch = ScrollUntil.watch(ScrollUntil.Target.Text("없는 칸"), tree(rows(0, 4, 0)), down)
        val first = Counting(tree(rows(0, 4, 0)))
        watch.sight(first)
        val again = Counting(tree(rows(0, 4, 0)))
        assertEquals(Sight.NONE, watch.sight(again))
        assertEquals(1, first.semantics)
        assertEquals(0, again.semantics)
    }

    @Test fun `목록 안 소스 줄 #N 은 목록 순번으로 목록 상태만 보고 찾는다`() = runTest {
        val before = rows(0, 4, 0)
        val nodes = before.map { ViewNode("Text", "Rows.kt", 9, 0, it.y, 1000, it.y + 200) }
        val lists = listOf(LazyList(0, 0, 1000, 1000, true, 100, before.map { LazyItem(it.index, it.index, 0, it.y, 1000, it.y + 200) }))
        val watch = ScrollUntil.watch(ScrollUntil.Target.Line(NodeTarget.Spec("Rows.kt", 9, 8)), tree(before, nodes, lists), down)
        val probe = Counting(tree(rows(4, 8, 900)))
        assertEquals(Sight.WHOLE, watch.sight(probe))
        assertEquals(0, probe.looks + probe.semantics)
        val found = watch.found(tree(rows(4, 8, 900)))!!
        assertEquals(7, found.index)
        assertEquals("Rows.kt:9#8", found.at)
        assertEquals("8번", found.semantics?.text)
    }

    @Test fun `줄의 목록이 굴리는 목록이 아니면 #N 을 굴리는 목록의 순번으로 읽지 않는다`() = runTest {
        val before = rows(0, 4, 0)
        val inner = LazyList(0, 200, 1000, 400, false, 30, (0 until 4).map { LazyItem(it, it, it * 250, 200, it * 250 + 250, 400) })
        val nodes = (0 until 4).map { ViewNode("Chip", "Rows.kt", 20, it * 250, 200, it * 250 + 250, 400) }
        val watch = ScrollUntil.watch(ScrollUntil.Target.Line(NodeTarget.Spec("Rows.kt", 20, 3)), tree(before, nodes, listOf(inner)), down)
        val probe = Counting(tree(before, nodes, listOf(inner)))
        watch.sight(probe)
        assertEquals(1, probe.looks)
    }

    @Test fun `목록 밖 글자(머리글)는 전체 트리로 본다`() = runTest {
        val header = SemanticNode(0, 0, 1000, 100, Semantics(text = "합계"))
        val t = tree(rows(0, 3, -200)).let { it.copy(semantics = it.semantics + header) }
        assertEquals(Sight.NONE, ScrollUntil.watch(ScrollUntil.Target.Text("합계"), t, down).sight(ScrollUntil.Still(t)))
        val whole = ScrollUntil.whole(ScrollUntil.Target.Text("합계"), down)
        assertEquals(Sight.WHOLE, whole.sight(ScrollUntil.Still(t)))
        assertEquals("합계", whole.found(t)?.semantics?.text)
    }

    @Test fun `여럿 맞으면 굴리는 방향에서 먼저 들어온 것이다`() {
        val items = rows(10, 14, 2000)
        val semantics = items.map { SemanticNode(0, it.y, 1000, it.y + 200, Semantics(text = "칸 ${it.index}")) }
        val t = LiveTree(1000, 1000, emptyList(), states = listOf(state(items)), semantics = semantics)
        val forward = ScrollUntil.watch(ScrollUntil.Target.Text("칸 1"), t, down).found(t)!!
        assertEquals(10, forward.index)
        val backward = ScrollUntil.watch(ScrollUntil.Target.Text("칸 1"), t, down.copy(forward = false)).found(t)!!
        assertEquals(14, backward.index)
    }

    @Test fun `목록 상태가 없으면 시맨틱 노드의 잘리지 않은 크기로 다 보임을 잰다`() = runTest {
        val cut = SemanticNode(0, 900, 1000, 1000, Semantics(text = "27번"), fullWidth = 1000, fullHeight = 200)
        val t = LiveTree(1000, 1000, emptyList(), semantics = listOf(cut))
        val watch = ScrollUntil.watch(ScrollUntil.Target.Text("27번"), t, down)
        assertEquals(Sight.NEAR, watch.sight(ScrollUntil.Still(t)))
        val whole = LiveTree(1000, 1000, emptyList(), semantics = listOf(SemanticNode(0, 700, 1000, 900, Semantics(text = "27번"))))
        assertEquals(Sight.WHOLE, watch.sight(ScrollUntil.Still(whole)))
    }

    @Test fun `목록 밖 소스 줄은 화면 밖까지 센 읽는 순서이고, found 의 at 은 touch 의 화면 안 순서다`() = runTest {
        val col = (0 until 10).map { ViewNode("Text", "Col.kt", 5, 0, it * 200 - 600, 1000, it * 200 - 400, screen) }
        val t = LiveTree(1000, 1000, col)
        val watch = ScrollUntil.watch(ScrollUntil.Target.Line(NodeTarget.Spec("Col.kt", 5, 5)), t, down)
        assertEquals(Sight.WHOLE, watch.sight(ScrollUntil.Still(t)))
        val found = watch.found(t)!!
        assertEquals(listOf(0, 200, 1000, 400), found.box)
        assertEquals("Col.kt:5#2", found.at)
    }
}
