package prevue.daemon.adapter.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.daemon.entity.PreviewSpec

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
        listOf(names, colors).forEach { p -> shapes.count(p) { 2 }; shapes.layouts(p) { layoutsResolved++; listOf("a", "b") } }

        shapes.recount()
        assertEquals(3, shapes.count(names) { 3 })
        assertEquals(2, shapes.count(colors) { 2 })
        listOf(names, colors).forEach { p -> shapes.layouts(p) { layoutsResolved++; listOf("a", "b", "c") } }
        assertEquals(3, layoutsResolved)                                        // names만 다시 풀었다
        assertEquals(3, shapes.count(names) { error("다음 컴파일 전에는 다시 세지 않는다") })
    }

    @Test fun `세지 않고 지나간 컴파일 뒤에도 마지막으로 센 개수와 견준다`() {
        val shapes = PreviewShapes()
        val names = spec("demo.Names")
        shapes.count(names) { 2 }; shapes.layouts(names) { listOf("a", "b") }
        shapes.recount(); shapes.recount()
        assertEquals(3, shapes.count(names) { 3 })
        assertEquals(listOf("x"), shapes.layouts(names) { listOf("x") })
    }
}
