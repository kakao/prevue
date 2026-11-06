package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.application.domain.model.PreviewSpec

/**
 * 제공자 값 개수 · 레이아웃 XML 캐시. 컴파일마다 개수만 다시 센다(제공자당 한 번) — 값이 다른 파일에서 와도 따라간다.
 * 레이아웃은 카드당 60ms라 개수가 바뀐 제공자의 것만 버린다.
 */
class PreviewShapesTest {
    private fun spec(provider: String, fn: String = "Card") =
        PreviewSpec("demo.CardsKt.$fn", fn, emptyMap(), null, 0, listOf(mapOf("provider" to provider)))

    @Test fun `다시 세어 개수가 바뀐 제공자의 레이아웃만 버린다`() {
        val shapes = PreviewShapes()
        val names = spec("demo.Names"); val colors = spec("demo.Colors")
        var layoutsResolved = 0
        listOf(names, colors).forEach { p -> shapes.instances(p) { List(2) { null } }; shapes.layouts(p) { layoutsResolved++; listOf("a", "b") } }

        shapes.recount()
        assertEquals(3, shapes.instances(names) { List(3) { null } }.size)
        assertEquals(2, shapes.instances(colors) { List(2) { null } }.size)
        listOf(names, colors).forEach { p -> shapes.layouts(p) { layoutsResolved++; listOf("a", "b", "c") } }
        assertEquals(3, layoutsResolved)                                        // names만 다시 풀었다
        assertEquals(3, shapes.instances(names) { error("다음 컴파일 전에는 다시 세지 않는다") }.size)
    }

    @Test fun `세지 않고 지나간 컴파일 뒤에도 마지막으로 센 개수와 견준다`() {
        val shapes = PreviewShapes()
        val names = spec("demo.Names")
        shapes.instances(names) { List(2) { null } }; shapes.layouts(names) { listOf("a", "b") }
        shapes.recount(); shapes.recount()
        assertEquals(3, shapes.instances(names) { List(3) { null } }.size)
        assertEquals(listOf("x"), shapes.layouts(names) { listOf("x") })
    }

    @Test fun `개수가 같고 값 이름만 바뀌면 이름은 새로, 레이아웃은 그대로`() {
        val shapes = PreviewShapes()
        val names = spec("demo.Names")
        shapes.instances(names) { listOf("a", "b") }; shapes.layouts(names) { listOf("x", "y") }
        shapes.recount()
        assertEquals(listOf("a", "c"), shapes.instances(names) { listOf("a", "c") })
        assertEquals(listOf("x", "y"), shapes.layouts(names) { error("개수가 그대로면 레이아웃을 다시 풀지 않는다") })
    }
}
