package prevue.daemon.adapter.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.entity.ViewNode

/** 목록 상태의 아이템 칸(뷰포트 기준)을 트리의 화면 좌표에 놓는다 — 목록 노드의 크기 · 패딩에 기대지 않고 아이템 노드로 맞춘다. */
class LazyListPlacementTest {
    private fun node(l: Int, t: Int, r: Int, b: Int, name: String = "Item") = ViewNode(name, "A.kt", 1, l, t, r, b)

    @Test fun `contentPadding 은 주축 시작으로 빼고 교차축은 아이템 노드에서 맞춘다`() {
        val raw = LazyListReflection.Raw(true, 25, 1080, 2220, -42, crossFills = false,
            cells = listOf(LazyListReflection.Cell(0, 0, 0, 0, 482, 326), LazyListReflection.Cell(1, 0, 514, 0, 482, 326)))
        val nodes = listOf(node(0, 180, 1080, 2400, "LazyVerticalGrid"), node(42, 222, 524, 548), node(556, 222, 1038, 548))
        val list = LazyListPlacement.placeAll(listOf(raw), nodes).first.single()
        assertEquals(listOf(0, 180, 1080, 2400), listOf(list.left, list.top, list.right, list.bottom))
        assertEquals(listOf(42, 222, 524, 548), list.items[0].let { listOf(it.left, it.top, it.right, it.bottom) })
    }

    @Test fun `Modifier padding 으로 목록 노드가 뷰포트보다 커도 놓는다`() {
        val raw = LazyListReflection.Raw(true, 10, 968, 1968, 0, crossFills = true,
            cells = (0 until 3).map { LazyListReflection.Cell(it, it, 0, it * 300, 968, 300) })
        val nodes = listOf(node(0, 100, 1000, 2100, "LazyColumn")) + (0 until 3).map { node(16, 116 + it * 300, 984, 416 + it * 300) }
        val list = LazyListPlacement.placeAll(listOf(raw), nodes).first.single()
        assertEquals(116, list.top)
        assertEquals(listOf(116, 416, 716), list.items.map { it.top })
    }

    @Test fun `크기가 같은 두 가로 목록은 제 아이템 노드를 따로 갖는다`() {
        fun row() = LazyListReflection.Raw(false, 10, 1000, 300, 0, crossFills = true, cells = (0 until 3).map { LazyListReflection.Cell(it, it, it * 300, 0, 300, 300) })
        val nodes = listOf(node(0, 0, 1000, 300, "LazyRow"), node(0, 400, 1000, 700, "LazyRow")) +
            (0 until 3).map { node(it * 300, 0, it * 300 + 300, 300) } + (0 until 3).map { node(it * 300, 400, it * 300 + 300, 700) }
        val lists = LazyListPlacement.placeAll(listOf(row(), row()), nodes).first
        assertEquals(2, lists.size)
        assertEquals(setOf(0, 400), lists.map { it.top }.toSet())
        assertTrue(lists.all { l -> l.items.all { it.top == l.top } })
    }

    // 데모 take8: 패딩 수정자가 있는 전폭 머리글은 트리 노드가 패딩을 뺀 크기라 칸과 같은 노드가 없다 — 첫 칸만 대 보면 맨 위에서 목록을 못 놓았다.
    @Test fun `첫 칸에 맞는 노드가 없어도 다른 칸으로 놓는다`() {
        val header = LazyListReflection.Cell(0, 0, 0, 0, 861, 138)
        val cards = (1..4).map { LazyListReflection.Cell(it, 1 + (it - 1) / 2, if (it % 2 == 1) 0 else 447, 170 + ((it - 1) / 2) * 410, 415, 378) }
        val raw = LazyListReflection.Raw(true, 26, 945, 1995, -42, crossFills = false, cells = listOf(header) + cards)
        val nodes = listOf(node(0, 0, 945, 1995, "LazyVerticalGrid"), node(42, 63, 903, 169, "Text")) +
            cards.map { node(42 + it.x, 42 + it.y, 42 + it.x + 415, 42 + it.y + 378, "DrinkCard") }
        val list = LazyListPlacement.placeAll(listOf(raw), nodes).first.single()
        assertEquals(26, list.total)
        assertEquals(listOf(42, 42, 903, 180), list.items[0].let { listOf(it.left, it.top, it.right, it.bottom) })
        assertEquals(listOf(489, 212, 904, 590), list.items[2].let { listOf(it.left, it.top, it.right, it.bottom) })
    }

    @Test fun `첫 칸과 크기만 같은 엉뚱한 노드보다 아이템 노드가 많이 맞는 이동량을 고른다`() {
        val cells = listOf(LazyListReflection.Cell(0, 0, 0, 0, 1000, 138)) + (1..3).map { LazyListReflection.Cell(it, it, 0, 170 + (it - 1) * 310, 1000, 300) }
        val raw = LazyListReflection.Raw(true, 20, 1000, 1200, 0, crossFills = true, cells = cells)
        val nodes = listOf(node(0, 0, 1000, 138, "TopBar"), node(0, 200, 1000, 1400, "LazyColumn"), node(0, 221, 1000, 327, "Text")) +
            (1..3).map { node(0, 370 + (it - 1) * 310, 1000, 670 + (it - 1) * 310) }
        val list = LazyListPlacement.placeAll(listOf(raw), nodes).first.single()
        assertEquals(listOf(200, 370, 680, 990), list.items.map { it.top })
    }

    @Test fun `맞는 아이템 노드가 없으면 놓지 않는다`() {
        val raw = LazyListReflection.Raw(true, 10, 500, 500, 0, crossFills = false, cells = listOf(LazyListReflection.Cell(0, 0, 0, 0, 123, 45)))
        assertTrue(LazyListPlacement.placeAll(listOf(raw), listOf(node(0, 0, 500, 500))).first.isEmpty())
    }
}
