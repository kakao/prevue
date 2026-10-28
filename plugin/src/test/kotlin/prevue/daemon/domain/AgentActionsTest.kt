package prevue.daemon.domain

import app.cash.turbine.test
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.SemanticNode
import prevue.daemon.entity.Semantics
import prevue.daemon.entity.ViewNode
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace
import prevue.daemon.domain.model.Container
import prevue.daemon.domain.model.Miss
import prevue.daemon.domain.model.ScrollResult
import prevue.daemon.domain.model.TouchResult
import prevue.daemon.domain.model.TypeResult
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.port.Frame
import java.awt.image.BufferedImage

/** D-69 · D-76. 에이전트 조작 — touch --at · type 은 겨냥한 대로 넣고 갈리면 넣지 않는다. scroll 은 겨냥 없이 화면 수만큼 굴린다. */
class AgentActionsTest {
    private val fx = Fixture()

    @AfterEach fun tearDown() = fx.close()

    private fun opened(): UseCases = fx.useCases().also {
        runBlocking { it.openPreview(fx.file.path, null, emptyMap(), "test") }
        it.workspace.awaitBoardFilled()
        runBlocking { it.focusCard(0, on = true, by = "test") }
    }

    private fun node(name: String, line: Int, top: Int, h: Int = 100) = ViewNode(name, "Card.kt", line, 0, top, 200, top + h)

    /** 굴리면 내용이 위로 간다(dy > 0). [late]는 [at] px 넘게 굴린 뒤에야 트리에 생긴다 — 아직 안 만든 Lazy 아이템. */
    private fun scrollable(nodes: List<ViewNode>, late: ViewNode? = null, at: Int = Int.MAX_VALUE, end: Int = Int.MAX_VALUE) {
        var offset = 0
        fun redraw() {
            val shown = nodes + listOfNotNull(late?.takeIf { offset >= at })
            fx.renderer.liveTree = LiveTree(1000, 2000, shown.map { it.copy(top = it.top - offset, bottom = it.bottom - offset) })
        }
        fx.renderer.onScroll = { _, dy -> offset = (offset + dy.toInt()).coerceIn(0, end); redraw() }
        redraw()
    }

    @Test fun `touch --at 은 그 노드의 가운데를 누른다`() {
        val uc = opened()
        scrollable(listOf(node("Button", 10, 300)))
        val r = runBlocking { uc.touch.at("src/Card.kt:10", "tap", "test", settle = true) }
        assertTrue(r is TouchResult.Settled, "$r")
        assertEquals(listOf(Triple("tap", 100, 350)), fx.renderer.touches)
        assertEquals("Card.kt:10", (r as TouchResult.Settled).aim!!.at)
    }

    @Test fun `여럿이면 누르지 않고 고르게 하고 번호로 누른다`() {
        val uc = opened()
        scrollable(listOf(node("Row", 10, 900), node("Row", 10, 100)))
        val r = runBlocking { uc.touch.at("Card.kt:10", "tap", "test", settle = true) }
        assertEquals(listOf(100, 900), ((r as TouchResult.Missed).miss as Miss.Choose).candidates.map { it.node.top })
        assertTrue(fx.renderer.touches.isEmpty())
        runBlocking { uc.touch.at("Card.kt:10#2", "long", "test", settle = true) }
        assertEquals(listOf(Triple("long", 100, 950)), fx.renderer.touches)
    }

    @Test fun `화면 밖이면 누르지 않는다`() {
        val uc = opened()
        scrollable(listOf(node("Button", 10, 2500)))
        val r = runBlocking { uc.touch.at("Card.kt:10", "tap", "test", settle = true) }
        assertTrue((r as TouchResult.Missed).miss is Miss.OffScreen)
        assertTrue(fx.renderer.touches.isEmpty())
        assertTrue((runBlocking { uc.touch.at("Card.kt:99", "tap", "test", settle = true) } as TouchResult.Missed).miss is Miss.Missing)
    }

    // FR-14. 뷰어는 그림을 프레임 스트림으로 받는다 — 정착을 기다리면 손이 굳고, Touched 가 Presenter 를 깨운다.
    @Test fun `정착 없는 touch 는 정착하지 않고 Touched 만 알린다`() {
        val uc = opened()
        scrollable(listOf(node("Button", 10, 300)))
        runBlocking {
            uc.workspace.events.filterIsInstance<WorkspaceEvent.Touched>().test {
                assertEquals(TouchResult.Sent("tap", 5, 6, "viewer"), uc.touch("tap", 5, 6, "viewer", settle = false))
                assertEquals(TouchResult.Sent("tap", 100, 350, "viewer"), uc.touch.at("Card.kt:10", "tap", "viewer", settle = false))
                assertEquals(WorkspaceEvent.Touched("tap", "viewer"), awaitItem())
                assertEquals(WorkspaceEvent.Touched("tap", "viewer"), awaitItem())
            }
        }
    }

    // FR-5. render --at 은 따로 연 세션에 그리고 닫는다 — 사람 조작은 새 세션에서 시작한다.
    @Test fun `render --at 뒤의 touch 는 새 세션을 열고 누른다`() {
        val uc = opened()
        scrollable(listOf(node("Button", 10, 300)))
        runBlocking { uc.renderAt(300, "test") }
        val opened = fx.renderer.opened.size
        runBlocking { uc.touch("tap", 5, 6, "test", settle = true) }
        assertEquals(opened + 1, fx.renderer.opened.size)
        runBlocking { uc.touch.at("Card.kt:10", "tap", "test", settle = true) }
        assertEquals(opened + 1, fx.renderer.opened.size, "열린 세션에서는 새로 열지 않는다")
    }

    @Test fun `지금 화면을 못 그렸으면 누르지 않고 그 실패를 돌려준다`() {
        val uc = opened()
        scrollable(listOf(node("Button", 10, 300)))
        fx.renderer.lookFails = "흔들리는 렌더"
        val r = runBlocking { uc.touch.at("Card.kt:10", "tap", "test", settle = true) }
        assertEquals("흔들리는 렌더", ((r as TouchResult.Settled).result.shot.out.message?.text))
        assertEquals(null, r.aim)
        assertTrue(fx.renderer.touches.isEmpty())
    }

    private fun wheeled(): Pair<Float, Float> = fx.renderer.scrolls.fold(0f to 0f) { (x, y), (_, _, dx, dy) -> (x + dx) to (y + dy) }

    @Test fun `scroll 은 그림 가운데에 한 화면의 0_8 을 조각으로 넣고 끝에 0 을 넣는다`() {
        val uc = opened()
        scrollable(listOf(node("Text", 5, 0), node("Button", 10, 2500)))
        val r = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test") } as ScrollResult.Settled
        assertTrue(r.moved, "$r")
        assertEquals(0f to 1600f, wheeled())
        assertTrue(fx.renderer.scrolls.dropLast(1).all { it[3] <= ScrollUseCase.WHEEL && it[0] == 500f && it[1] == 1000f })
        assertEquals(listOf(500f, 1000f, 0f, 0f), fx.renderer.scrolls.last())
        assertEquals(Container(null, listOf(0, 0, 1000, 2000), "vertical"), r.container)
    }

    @Test fun `--until 은 한 화면마다 보고, 들어오면 조각마다 보다가 다 보이면 멈춘다`() {
        val uc = opened()
        scrollable(listOf(node("Text", 5, 0), node("Button", 10, 3550)))
        val r = runBlocking { uc.scroll.screens(10.0, horizontal = false, at = null, by = "test", until = "Card.kt:10") } as ScrollResult.Settled
        assertEquals(0f to 1800f, wheeled())
        assertEquals(listOf(0, 1750, 200, 1850), r.found?.box)
        assertEquals("Card.kt:10", r.found?.at)
    }

    @Test fun `--until 대상이 이미 다 보이면 굴리지 않고, 못 찾으면 상한까지 굴려 found 가 빈다`() {
        val uc = opened()
        scrollable(listOf(node("Text", 5, 0), node("Button", 10, 2500)))
        val here = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test", until = "Card.kt:5") } as ScrollResult.Settled
        assertTrue(fx.renderer.scrolls.isEmpty() && !here.moved, "$here")
        assertEquals("Card.kt:5", here.found?.at)
        val none = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test", until = "Card.kt:99") } as ScrollResult.Settled
        assertEquals(0f to 1600f, wheeled())
        assertTrue(none.sought && none.found == null, "$none")
    }

    @Test fun `음수는 위로, 가로는 가로로, 끝이면 moved 가 거짓이다`() {
        val uc = opened()
        scrollable(listOf(node("Button", 10, 300)), end = 0)
        val up = runBlocking { uc.scroll.screens(-0.5, horizontal = true, at = null, by = "test") } as ScrollResult.Settled
        assertEquals(-400f to 0f, wheeled())
        assertEquals("horizontal", up.container!!.axis)
        assertTrue(!up.moved, "$up")
    }

    @Test fun `굴린 뒤 화면을 못 그렸으면 나타남 · 사라짐을 싣지 않는다`() {
        val uc = opened()
        fx.renderer.liveTree = LiveTree(1000, 2000, emptyList(), semantics = listOf(SemanticNode(0, 100, 200, 200, Semantics(text = "행"))))
        fx.renderer.onScroll = { _, _ -> fx.renderer.lookFails = "흔들리는 렌더"; fx.renderer.liveTree = LiveTree(1000, 2000, emptyList()) }
        val r = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test") } as ScrollResult.Settled
        assertEquals("흔들리는 렌더", r.result.shot.out.message?.text)
        assertTrue(r.appeared.isEmpty() && r.disappeared.isEmpty(), "$r")
    }

    @Test fun `한 번에 10화면까지만 굴린다`() {
        val uc = opened()
        scrollable(listOf(node("Text", 5, 0)))
        runBlocking { uc.scroll.screens(100.0, horizontal = false, at = null, by = "test") }
        assertEquals(0f to 16000f, wheeled())
    }

    @Test fun `--at 은 그 노드의 박스 가운데에 넣고 한 화면도 그 박스 기준이다`() {
        val uc = opened()
        scrollable(listOf(ViewNode("LazyColumn", "Card.kt", 30, 600, 200, 800, 700)))
        val r = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = "Card.kt:30", by = "test") } as ScrollResult.Settled
        assertEquals(0f to 400f, wheeled())
        assertTrue(fx.renderer.scrolls.all { it[0] == 700f && it[1] == 450f }, "${fx.renderer.scrolls}")
        assertEquals(Container("Card.kt:30", listOf(600, 200, 800, 700), "vertical"), r.container)
    }

    @Test fun `--at 이 여럿이면 굴리지 않고 고르게 한다`() {
        val uc = opened()
        scrollable(listOf(node("Row", 10, 100), node("Row", 10, 500)))
        val r = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = "Card.kt:10", by = "test") }
        assertTrue((r as ScrollResult.Missed).miss is Miss.Choose)
        assertTrue(fx.renderer.scrolls.isEmpty())
    }

    @Test fun `type 은 포커스된 필드가 없으면 넣지 않고 이유를 낸다`() {
        val uc = opened()
        assertTrue(runBlocking { uc.type("hi", "test") } is TypeResult.Settled)
        assertEquals(listOf("hi"), fx.renderer.typed)
        fx.renderer.typeError = "포커스된 텍스트 필드가 없다"
        assertEquals(TypeResult.NoField("포커스된 텍스트 필드가 없다"), runBlocking { uc.type("x", "test") })
    }

    @Test fun `겨냥이 잘못 쓰였으면 아무것도 하지 않는다`() {
        val uc = opened()
        assertTrue((runBlocking { uc.touch.at("Card.kt", "tap", "test", settle = true) } as TouchResult.Missed).miss is Miss.BadAt)
        assertTrue((runBlocking { uc.scroll.screens(1.0, false, "Card.kt:x", "test") } as ScrollResult.Missed).miss is Miss.BadAt)
        assertEquals(0, fx.renderer.looks.get())
    }

    private fun moving(n: Int) = List(n) { Frame(true, false, BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), 0, 0, 1) }

    // D-78. 에이전트도 뷰어와 같은 루프가 정착시킨 그림을 받는다 — 루프가 돈 프레임 수를 싣는다.
    @Test fun `정착한 응답은 루프가 돈 프레임 수와 정착 여부를 싣는다`() {
        val uc = opened()
        scrollable(listOf(node("Button", 10, 300)))
        fx.renderer.frames += moving(3)
        val r = runBlocking { uc.touch(type = "tap", x = 10, y = 10, by = "test", settle = true) } as TouchResult.Settled
        assertEquals(true, r.result.settled)
        assertTrue(r.result.frames!! >= 3, "${r.result.frames}")
        val t = runBlocking { uc.type("가", "test") } as TypeResult.Settled
        assertEquals(true, t.result.settled)
    }

    @Test fun `끝나지 않는 애니메이션이면 3초에 정착하지 않은 그림으로 답한다`() {
        val uc = opened()
        fx.renderer.moving = true
        val t = System.nanoTime()
        val r = runBlocking { uc.touch(type = "tap", x = 10, y = 10, by = "test", settle = true) } as TouchResult.Settled
        assertEquals(false, r.result.settled)
        assertTrue((System.nanoTime() - t) / 1_000_000 in 2_900..6_000)
    }
}
