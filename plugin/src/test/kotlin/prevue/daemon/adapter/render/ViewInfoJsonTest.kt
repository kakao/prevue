package prevue.daemon.adapter.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class ViewInfoJsonTest {
    private fun node(name: String, b: List<Int>, vararg children: Map<String, Any?>) =
        mapOf("name" to name, "fileName" to "A.kt", "lineNumber" to 1, "bounds" to b, "children" to children.toList())

    // 아이템을 감싼 같은 박스의 그룹은 클립이 아니다 — 넣으면 잘린 카드의 보이는 자리가 카드 자신으로 좁아져 "다 보인다"가 된다
    @Test fun `노드마다 자기를 넘는 넓이 있는 조상 박스의 교집합을 싣는다`() {
        val tree = listOf(
            node("Root", listOf(0, 0, 1000, 2000),
                node("Grid", listOf(0, 213, 1000, 2000),
                    node("Group", listOf(0, 0, 0, 0),
                        node("Item", listOf(489, -93, 903, 225),
                            node("Card", listOf(489, -93, 903, 225), node("Name", listOf(500, -50, 800, 0))))))),
        )
        val boxes = ViewInfoJson.nodes(tree).associate { it.name to it.ancestorsBox }
        assertEquals(null, boxes["Root"])
        assertEquals(listOf(0, 0, 1000, 2000), boxes["Grid"])
        assertEquals(listOf(0, 213, 1000, 2000), boxes["Card"])
        assertEquals(listOf(489, 213, 903, 225), boxes["Name"])
    }
}
