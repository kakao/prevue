package prevue.daemon.domain.runtime

import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.fake.FakePreviewRenderer
import prevue.daemon.domain.port.LiveSession
import prevue.daemon.domain.port.Frame
import prevue.daemon.domain.model.SettledShot

/** D-75 · D-78. 시계는 루프 하나가 돌린다 — 가상 시계로 입력에 대한 틱 · 정착의 순서와 시각을 단언한다. */
@OptIn(ExperimentalCoroutinesApi::class)
class LiveLoopTest {
    private val fake = FakePreviewRenderer(Files.createTempDirectory("prevue-loop").toFile())
    private val card = PreviewSpec("demo.CardKt.Card0", "Card0", emptyMap(), null, 0)

    @AfterEach fun down() { fake.outDir.deleteRecursively() }

    private fun TestScope.actor(): EngineActor =
        EngineActor(fake, fake, backgroundScope, StandardTestDispatcher(testScheduler), now = { testScheduler.currentTime }, log = {})

    private fun changed(n: Int) = repeat(n) { fake.frames += Frame(true, false, BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), 0, 0, 0) }

    @Test fun `입력에 깨어 16ms마다 틱하고 잠잠 100ms면 정착해 한 장을 낸다`() = runTest {
        val a = actor()
        changed(3)
        a.ensure(card, interactive = false)
        val seq = a.touch("tap", 1, 2)
        val shot = a.settled(seq)
        assertTrue(shot.settled)
        assertEquals(10, shot.frames, "바뀐 3장 + 잠잠한 7장(7 × 16ms ≥ 100ms)")
        assertEquals(144L, testScheduler.currentTime)
        assertEquals(10, fake.ticks.get())
        assertEquals(listOf(16L), a.frames.value.trace.mapNotNull { it["gapMs"] as Long? }.distinct())
        val ticks = fake.ticks.get()
        advanceTimeBy(1_000)
        assertEquals(ticks, fake.ticks.get(), "정착하면 쉰다")
    }

    @Test fun `정착한 뒤의 입력은 다음 정착을 기다린다`() = runTest {
        val a = actor()
        a.ensure(card, interactive = false)
        val first = a.settled(a.touch("tap", 1, 2))
        changed(2)
        val second = a.settled(a.touch("tap", 3, 4))
        assertTrue(second.inputSeq > first.inputSeq)
        assertEquals(listOf(Triple("tap", 1, 2), Triple("tap", 3, 4)), fake.touches.toList())
    }

    @Test fun `누르고 있는 동안은 잠잠해도 정착하지 않고 떼면 정착한다`() = runTest {
        val a = actor()
        a.ensure(card, interactive = false)
        val shots = ArrayList<SettledShot>()
        backgroundScope.launch(StandardTestDispatcher(testScheduler)) { a.shots.collect { shots += it } }
        a.touch("press", 1, 2)
        advanceTimeBy(2_500)
        runCurrent()
        assertTrue(shots.isEmpty(), "누른 채 정착했다 — ${shots.size}")
        val t = testScheduler.currentTime
        val shot = a.settled(a.touch("release", 1, 2))
        assertTrue(shot.settled)
        assertTrue(testScheduler.currentTime - t <= 120, "뗀 뒤 ${testScheduler.currentTime - t}ms")
    }

    @Test fun `누른 채 기다리는 에이전트는 잠잠 100ms에 답을 받고 루프는 손을 뗄 때까지 돈다`() = runTest {
        val a = actor()
        a.ensure(card, interactive = false)
        val shot = a.settled(a.touch("press", 1, 2))
        assertTrue(shot.settled)
        assertTrue(testScheduler.currentTime <= 150, "${testScheduler.currentTime}")
        val ticks = fake.ticks.get()
        advanceTimeBy(500)
        assertTrue(fake.ticks.get() > ticks, "누른 채인데 쉬었다")
    }

    @Test fun `열린 세션이 닫히면 뷰어 화면을 비운다`() = runTest {
        val a = actor()
        fake.frames += Frame(true, false, BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), 0, 0, 0)
        a.ensure(card, interactive = true)
        a.settled(a.touch("tap", 1, 2))
        assertTrue(a.screen.value != null)
        a.show(card)
        assertEquals(null, a.screen.value)
    }

    @Test fun `틱이 Error 를 던져도 액터는 살아 다음 명령을 받는다`() = runTest {
        val a = actor()
        fake.tickThrows = StackOverflowError("렌더러")
        a.ensure(card, interactive = false)
        advanceTimeBy(100)
        assertTrue(a.show(card).ok)
        assertTrue(a.ensure(card, interactive = false)!!.ok, "세션을 닫았으니 다시 연다")
    }

    @Test fun `정착 뒤 다른 그림을 그리면 그 샷은 마지막이 아니다`() = runTest {
        val a = actor()
        a.ensure(card, interactive = false)
        val shot = a.settled(a.touch("tap", 1, 2))
        assertTrue(a.isLatest(shot))
        a.look()
        assertFalse(a.isLatest(shot))
    }

    @Test fun `보는 이가 없으면 끝나지 않는 애니메이션도 입력 3초 뒤 쉬고 에이전트는 settled false 를 받는다`() = runTest {
        val a = actor()
        fake.moving = true
        a.ensure(card, interactive = false)
        val shot = a.settled(a.touch("tap", 1, 2))
        assertFalse(shot.settled)
        assertTrue(testScheduler.currentTime in 3_000L..3_020L, "${testScheduler.currentTime}")
        advanceTimeBy(100)
        val ticks = fake.ticks.get()
        advanceTimeBy(1_000)
        assertEquals(ticks, fake.ticks.get(), "아무도 안 보는데 돈다")
    }

    @Test fun `보는 이가 있으면 끝나지 않는 애니메이션을 계속 그린다`() = runTest {
        val a = actor()
        fake.moving = true
        a.watch(true)
        a.ensure(card, interactive = true)
        val shot = a.settled(a.touch("tap", 1, 2))
        assertFalse(shot.settled)
        val ticks = fake.ticks.get()
        advanceTimeBy(1_000)
        assertTrue(fake.ticks.get() - ticks >= 50, "보는 동안 멈췄다 — ${fake.ticks.get() - ticks}")
    }

    @Test fun `휠 조각마다 틱이 돌고 끝에 0 을 넣는다`() = runTest {
        val a = actor()
        a.ensure(card, interactive = false)
        val at = ArrayList<Int>()
        fake.onScroll = { _, _ -> at += fake.ticks.get() }
        val before = fake.ticks.get()
        val (seq, ok) = a.seek(5, 6, 0f, 800f, pieces = 4, object : LiveLoop.Rider {
            override fun frame(s: LiveSession) = Unit
            override suspend fun stop(s: LiveSession, catchUp: suspend () -> Unit) = false
        })
        assertTrue(ok)
        assertEquals(listOf(0, 1, 2, 3, 4).map { before + it }, at)
        assertEquals(listOf(200f, 200f, 200f, 200f, 0f), fake.scrolls.map { it[3] })
        assertTrue(a.settled(seq).settled)
    }

    @Test fun `멈춤 훅이 참이면 남은 조각을 버리고 끝에 0 을 넣으며, 따라잡기는 그림이 두 번 그대로일 때까지 돈다`() = runTest {
        val a = actor()
        a.ensure(card, interactive = false)
        changed(3)
        val seen = ArrayList<Int>()
        var frames = 0
        val (seq, ok) = a.seek(5, 6, 0f, 800f, pieces = 4, object : LiveLoop.Rider {
            override fun frame(s: LiveSession) { frames++ }
            override suspend fun stop(s: LiveSession, catchUp: suspend () -> Unit): Boolean {
                val t = fake.ticks.get()
                catchUp()
                seen += fake.ticks.get() - t
                return seen.size == 2
            }
        })
        assertTrue(ok)
        assertEquals(listOf(200f, 200f, 0f), fake.scrolls.map { it[3] })
        assertEquals(listOf(4, 2), seen)
        assertEquals(2 + (4 + 2) + 2, frames, "조각 · 중간 따라잡기 · 끝 따라잡기의 프레임마다 한 번")
        assertTrue(a.settled(seq).settled)
    }

    @Test fun `뷰어 화면은 바뀐 그림을 내고 잠잠해지면 같은 그림을 쉰 그림으로 낸다`() = runTest {
        val a = actor()
        val img = BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB)
        fake.frames += Frame(true, false, img, 0, 0, 0)
        a.ensure(card, interactive = true)
        a.settled(a.touch("tap", 1, 2))
        val last = a.screen.value!!
        assertTrue(last.rest)
        assertTrue(last.image === img)
        assertEquals(2L, last.seq)
    }

    @Test fun `render --at 은 따로 연 세션에 그리고 닫는다 — 열린 세션이 남지 않는다`() = runTest {
        val a = actor()
        a.ensure(card, interactive = false)
        a.renderAt(card, 300)
        assertEquals(2, fake.closes.get(), "앞 세션과 --at 세션")
        assertFalse(a.changed())
        assertTrue(a.ensure(card, interactive = false)!!.ok, "다음 조작은 새 세션을 연다")
        assertEquals(3, fake.opened.size)
    }

    @Test fun `세션이 닫히면 기다리던 에이전트는 실패를 받는다`() = runTest {
        val a = actor()
        fake.moving = true
        a.watch(true)
        a.ensure(card, interactive = true)
        val seq = a.touch("tap", 1, 2)
        val waiting = async(StandardTestDispatcher(testScheduler)) { runCatching { a.settled(seq) } }
        advanceTimeBy(100)
        a.show(card)
        assertTrue(waiting.await().isFailure)
    }

    // 성공 기준 1. 세션 포트의 tick 을 부르는 곳은 라이브 세션 루프 하나다.
    @Test fun `본체에서 tick 을 부르는 자리는 LiveLoop 하나다`() {
        val root = File("src/main/kotlin/prevue/daemon")
        val calls = root.walkTopDown().filter { it.extension == "kt" }
            .flatMap { f -> Regex("""\.tick\(""").findAll(f.readText()).map { f.relativeTo(root).invariantSeparatorsPath } }.toList()
        assertEquals(listOf("domain/runtime/LiveLoop.kt"), calls)
    }
}
