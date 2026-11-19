package prevue.infrastructure.controller.browser

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled

/**
 * 끌기 입력의 줄. 그리기가 느린 구간(실측: 목록 끝의 오버스크롤에서 틱이 ~90ms)에 끌기가 줄에 쌓이면
 * 1.5초짜리 손동작을 6초에 걸쳐 따라갔다 — 기다리는 끌기는 마지막 좌표 하나로 합친다. 누름 · 뗌은 합치지 않는다.
 */
class BrowserInputTest {
    private val fx = Fixture()
    private val uc = fx.graph()
    private val presenter = fx.entryPoints(uc).let { uc.presenter }
    private val input = uc.browserInput

    @AfterEach fun tearDown() = fx.close()

    private fun interactive() {
        runBlocking { uc.tabs.openPreview(fx.file.path, null, emptyMap(), "test") }; uc.workspace.awaitBoardFilled()
        input.enterFocus(0); runBlocking { presenter.drain() }
        fx.renderer.touches.clear()
    }

    /** 첫 끌기 안에서 세션을 붙잡아 그 뒤의 입력이 줄에 쌓이게 한다. */
    private fun holdFirstDrag(): Pair<CountDownLatch, CompletableDeferred<Unit>> {
        val entered = CountDownLatch(1)
        val gate = CompletableDeferred<Unit>()
        var held = false
        fx.renderer.onTouch = { type, _, _ ->
            if (type == "drag" && !held) { held = true; entered.countDown(); gate.await() }
        }
        return entered to gate
    }

    @Test fun `줄에 쌓인 끌기는 마지막 좌표 하나만 세션에 닿는다`() {
        interactive()
        val (entered, gate) = holdFirstDrag()
        input.touch("press", 5, 0)
        input.touch("drag", 5, 1)
        assertTrue(entered.await(5, TimeUnit.SECONDS), "첫 끌기가 세션에 닿지 않았다")
        input.touch("drag", 5, 2)
        input.touch("drag", 5, 3)
        input.touch("drag", 5, 4)
        input.touch("release", 5, 4)
        gate.complete(Unit)
        runBlocking { presenter.drain() }
        assertEquals(
            listOf(Triple("press", 5, 0), Triple("drag", 5, 1), Triple("drag", 5, 4), Triple("release", 5, 4)),
            fx.renderer.touches.toList(),
        )
    }

    @Test fun `뗌과 누름을 사이에 둔 끌기는 합치지 않는다`() {
        interactive()
        val (entered, gate) = holdFirstDrag()
        input.touch("press", 5, 0)
        input.touch("drag", 5, 1)
        assertTrue(entered.await(5, TimeUnit.SECONDS), "첫 끌기가 세션에 닿지 않았다")
        input.touch("drag", 5, 2)
        input.touch("release", 5, 2)
        input.touch("press", 9, 0)
        input.touch("drag", 9, 1)
        input.touch("drag", 9, 2)
        input.touch("release", 9, 2)
        gate.complete(Unit)
        runBlocking { presenter.drain() }
        assertEquals(
            listOf(
                Triple("press", 5, 0), Triple("drag", 5, 1), Triple("drag", 5, 2), Triple("release", 5, 2),
                Triple("press", 9, 0), Triple("drag", 9, 2), Triple("release", 9, 2),
            ),
            fx.renderer.touches.toList(),
        )
    }

    @Test fun `끌기가 실패해도 뒤의 뗌은 세션에 닿는다`() {
        interactive()
        fx.renderer.onTouch = { type, _, _ -> if (type == "drag") error("끌기 실패") }
        input.touch("press", 5, 0)
        input.touch("drag", 5, 1)
        input.touch("release", 5, 1)
        runBlocking { presenter.drain() }
        assertEquals(listOf("press", "drag", "release"), fx.renderer.touches.map { it.first })
    }

    @Test fun `휠은 먼저 온 터치를 앞지르지 않는다`() {
        interactive()
        val (entered, gate) = holdFirstDrag()
        val order = java.util.concurrent.CopyOnWriteArrayList<String>()
        val hold = fx.renderer.onTouch
        fx.renderer.onTouch = { type, x, y -> hold(type, x, y); order += type }
        fx.renderer.onScroll = { _, _ -> order += "wheel" }
        input.touch("press", 5, 0)
        input.touch("drag", 5, 1)
        assertTrue(entered.await(5, TimeUnit.SECONDS), "첫 끌기가 세션에 닿지 않았다")
        input.touch("release", 5, 1)
        input.wheel(5, 1, 0f, 10f)
        gate.complete(Unit)
        runBlocking { presenter.drain() }
        assertEquals(listOf("press", "drag", "release", "wheel"), order.toList())
    }

    @Test fun `나가기는 먼저 온 뗌을 앞지르지 않는다`() {
        interactive()
        val (entered, gate) = holdFirstDrag()
        val hold = fx.renderer.onTouch
        val open = fx.renderer.closes.get()
        var closedBeforeRelease = -1
        fx.renderer.onTouch = { type, x, y ->
            hold(type, x, y)
            if (type == "release") closedBeforeRelease = fx.renderer.closes.get() - open
        }
        input.touch("press", 5, 0)
        input.touch("drag", 5, 1)
        assertTrue(entered.await(5, TimeUnit.SECONDS), "첫 끌기가 세션에 닿지 않았다")
        input.touch("release", 5, 1)
        input.exitFocus()
        gate.complete(Unit)
        runBlocking { presenter.drain() }
        assertEquals(0, closedBeforeRelease, "뗌이 닿기 전에 세션이 닫혔다 — 나가기가 뗌을 앞질렀다")
    }
}
