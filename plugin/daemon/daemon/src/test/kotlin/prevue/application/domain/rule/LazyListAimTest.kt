package prevue.application.domain.rule

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.LazyItem
import prevue.application.domain.model.LazyList
import prevue.application.domain.model.LiveTree
import prevue.application.domain.model.ViewNode
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.application.domain.model.Miss
import prevue.application.domain.model.ScrollResult
import prevue.application.domain.model.TouchResult
import prevue.daemon.fake.TestGraph

/** 게으른 목록 안의 `#N` 은 목록 전체에서 N번째다 — 같은 줄이 아이템마다 있어도 화면 밖까지 이름이 된다. */
class LazyListAimTest {
    private val fx = Fixture()

    @AfterEach fun tearDown() = fx.close()

    private fun opened(): TestGraph = fx.graph().also {
        runBlocking { it.tabs.openPreview(fx.file.path, null, emptyMap(), "test") }
        it.workspace.awaitBoardFilled()
        runBlocking { it.boards.focus(0, on = true, by = "test") }
    }

    private val width = 1000
    private val height = 2000
    private val row = 300
    private var offset = 0

    private fun grid(total: Int = 50, cols: Int = 2, top: Int = 0) {
        val maxOffset = ((total + cols - 1) / cols) * row - (height - top)
        fun redraw() {
            val items = (0 until total).mapNotNull { i ->
                val r = i / cols
                val t = top + r * row - offset
                if (t + row <= top || t >= height) return@mapNotNull null
                val l = (i % cols) * (width / cols)
                LazyItem(i, r, l, t, l + width / cols, t + row)
            }
            val nodes = listOf(ViewNode("LazyVerticalGrid", "Screen.kt", 5, 0, top, width, height)) +
                items.map { ViewNode("Card", "Card.kt", 10, it.left + 10, it.top + 10, it.right - 10, it.bottom - 10) }
            fx.renderer.liveTree = LiveTree(width, height, nodes, listOf(LazyList(0, top, width, height, true, total, items)))
        }
        fx.renderer.onScroll = { _, dy -> offset = (offset + dy.toInt()).coerceIn(0, maxOffset); redraw() }
        redraw()
    }

    @Test fun `번호는 굴리기 전후로 같은 아이템을 가리킨다`() {
        val uc = opened()
        grid()
        val before = (runBlocking { uc.live.touchAt("Card.kt:10", "tap", "test", settle = true) } as TouchResult.Missed).miss as Miss.Choose
        assertEquals(1, before.candidates.first().n)
        runBlocking { uc.live.scroll(1.0, horizontal = false, at = null, by = "test") }
        val after = (runBlocking { uc.live.touchAt("Card.kt:10", "tap", "test", settle = true) } as TouchResult.Missed).miss as Miss.Choose
        assertTrue(after.candidates.first().n > 1, "${after.candidates.map { it.n }}")
        assertTrue(after.candidates.all { (it.n % 2 == 1) == (it.node.left == 10) }, "홀수 번호는 왼쪽 열이다")
    }

    @Test fun `2열 그리드의 짝수 번호는 오른쪽 열이다`() {
        val uc = opened()
        grid()
        val r = runBlocking { uc.live.touchAt("Card.kt:10#2", "tap", "test", settle = true) } as TouchResult.Settled
        assertEquals(2, r.aim!!.index)
        assertTrue(r.aim!!.x > width / 2)
    }

    @Test fun `화면 밖 번호는 누르지 않는다`() {
        val uc = opened()
        grid()
        assertTrue((runBlocking { uc.live.touchAt("Card.kt:10#40", "tap", "test", settle = true) } as TouchResult.Missed).miss is Miss.OffScreen)
        assertTrue(fx.renderer.touches.isEmpty())
    }

    @Test fun `고르라는 응답은 목록 전체 개수를 싣고 화면 밖 응답은 보이는 후보를 싣는다`() {
        val uc = opened()
        grid()
        val choose = (runBlocking { uc.live.touchAt("Card.kt:10", "tap", "test", settle = true) } as TouchResult.Missed).miss as Miss.Choose
        assertEquals(50, choose.total)
        val off = (runBlocking { uc.live.touchAt("Card.kt:10#40", "tap", "test", settle = true) } as TouchResult.Missed).miss as Miss.OffScreen
        assertTrue(off.candidates.isNotEmpty() && off.candidates.all { it.n <= 14 }, "${off.candidates.map { it.n }}")
    }

    @Test fun `목록 안의 목록에서 같은 줄이 여러 목록에 있으면 고르게 한다`() {
        val uc = opened()
        val rows = (0 until 2).map { r ->
            val t = r * 400
            LazyList(0, t, width, t + 300, false, 10, (0 until 3).map { i -> LazyItem(i, i, i * 300, t, i * 300 + 300, t + 300) })
        }
        val outer = LazyList(0, 0, width, height, true, 5, (0 until 2).map { r -> LazyItem(r, r, 0, r * 400, width, r * 400 + 300) })
        val nodes = rows.flatMap { l -> l.items.map { ViewNode("Poster", "Card.kt", 10, it.left + 10, it.top + 10, it.right - 10, it.bottom - 10) } }
        fx.renderer.liveTree = LiveTree(width, height, nodes, rows + outer)
        val miss = (runBlocking { uc.live.touchAt("Card.kt:10#2", "tap", "test", settle = true) } as TouchResult.Missed).miss as Miss.Choose
        assertTrue(miss.mixedLists)
        assertTrue(fx.renderer.touches.isEmpty())
    }
}
