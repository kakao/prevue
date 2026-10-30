package prevue.daemon.adapter.browser

import app.cash.turbine.test
import prevue.daemon.domain.model.Pointed
import java.net.ServerSocket
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.fake.Fixture
import prevue.daemon.domain.model.DeviceModel
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.fake.awaitState
import prevue.daemon.fake.awaitUntil
import prevue.daemon.fake.awaitValue
import prevue.daemon.fake.eventually
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace

/** 화면 조작의 비즈니스(D-41). 브라우저에 있을 때는 테스트 밖이었던 것들이다. */
class BrowserPresenterTest {
    private val fx = Fixture()
    private val uc = fx.useCases()
    private val presenter = fx.entryPoints(uc, ServerSocket(0).use { it.localPort }).browser

    @AfterEach fun tearDown() = fx.close()

    private fun opened(): BrowserState {
        runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }; uc.workspace.awaitBoardFilled()
        return now()
    }

    @Test fun `보드를 열면 보드 화면이고 카드 이름표와 크기가 정해진다`() {
        val s = opened()
        assertEquals(BrowserState.Screen.BOARD, s.screen)
        val cards = s.board!!.groups.flatMap { it.cards }
        assertEquals(3, cards.size)
        // 함수마다 한 장이어도 묶음이다(D-62) — 함수 이름은 머리가 갖고, name= 이 없는 장의 이름표는 비어 있다.
        assertEquals(listOf("Card0", "Card1", "Card2"), s.board!!.groups.map { it.name })
        assertEquals(listOf("", "", ""), cards.map { it.label })
        assertEquals("100×100 · 2ms", cards[0].meta?.text)
        assertEquals("3 previews · Cards.kt", s.boardNote?.text)
    }

    // 먼저 열면 구독 순간의 마지막 프레임이 직전 프리뷰의 것이고, 그것을 바로잡을 첫 틱이 이미 지나가 남의 그림에 눌러앉는다(실측).
    @Test fun `스트림 주소는 태스크가 걸린 뒤에만 낸다`() {
        opened()
        val gate = CountDownLatch(1)
        fx.renderer.showGate = gate
        fx.renderer.showEntered.drainPermits()                                   // 보드를 여는 동안 쌓인 것 — 이번 태스크의 신호만 기다린다
        presenter.enterFocus(1)
        assertTrue(fx.renderer.showEntered.tryAcquire(5, TimeUnit.SECONDS))   // 포커스 카드의 태스크를 거는 중
        assertNull(now().focus?.streamUrl, "태스크가 걸리기 전에 스트림 주소가 나왔다")

        gate.countDown(); fx.renderer.showGate = null
        runBlocking { presenter.drain() }
        val s = now()
        assertEquals(BrowserState.Screen.FOCUS, s.screen)
        assertEquals("Card1", s.focus!!.previewId)
        assertNotNull(s.focus!!.streamUrl)

        presenter.exitFocus(); runBlocking { presenter.drain() }
        assertEquals(BrowserState.Screen.BOARD, now().screen)
    }

    @Test fun `크기 연타는 그리는 동안 들어온 마지막 크기 하나만 그린다`() {
        opened()
        presenter.enterFocus(0); runBlocking { presenter.drain() }
        val before = fx.renderer.opened.size
        val gate = CountDownLatch(1)
        fx.renderer.showGate = gate
        fx.renderer.showEntered.drainPermits()
        presenter.resize(ScreenSize.Dp(320, 640))
        assertTrue(fx.renderer.showEntered.tryAcquire(5, TimeUnit.SECONDS))
        presenter.resize(ScreenSize.Dp(400, 700))
        presenter.resize(ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8))
        gate.countDown(); fx.renderer.showGate = null
        awaitUntil("마지막 크기로 다시 연다") { fx.renderer.opened.size == before + 2 && now().focus?.streamUrl != null }
        assertEquals(ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8), now().focus?.size)
        assertEquals(listOf(null, "spec:width=2448px,height=1848px,dpi=420,orientation=landscape"), fx.renderer.opened.drop(before).map { it.params["device"] })
        assertTrue(now().focus!!.interactive)
        assertEquals(420.0 / 160, now().focus!!.pxPerDp)
    }

    // 뷰어가 이 사이에 한 장 화면으로 날아 들어간다. 도착 그림이 첫 프레임 없는 MJPEG면 WebKit 은 작은 빈 사각형으로 날렸다(take7).
    @Test fun `에이전트가 켜도 태스크가 걸리기 전에는 스트림 주소를 내지 않는다`() {
        opened()
        val gate = CountDownLatch(1)
        fx.renderer.showGate = gate
        fx.renderer.showEntered.drainPermits()
        val on = CoroutineScope(Dispatchers.Default).launch { uc.focusCard(1, on = true, by = "cli") }
        assertTrue(fx.renderer.showEntered.tryAcquire(5, TimeUnit.SECONDS))
        val entering = awaitState { it.screen == BrowserState.Screen.FOCUS }
        assertNull(entering.focus!!.streamUrl, "태스크가 걸리기 전에 스트림 주소가 나왔다")

        gate.countDown(); fx.renderer.showGate = null
        runBlocking { on.join() }
        awaitState { it.focus?.streamUrl != null }
    }

    // 진입 렌더가 결과 없이 죽어도 한 장 화면에 갇히지 않는다 — 스트림은 열리고 다음 틱이 화면을 맞춘다.
    @Test fun `진입 렌더가 예외로 끝나도 스트림 주소는 나온다`() {
        opened()
        fx.renderer.showThrows = IllegalStateException("렌더러가 죽었다")
        runBlocking { runCatching { uc.focusCard(1, on = true, by = "cli") } }
        awaitState { it.screen == BrowserState.Screen.FOCUS && it.focus?.streamUrl != null }
    }

    // 다른 장으로 옮겨 켜면 새 태스크다 — 같은 주소면 뷰어가 MJPEG 를 다시 열지 않고 앞 장의 마지막 프레임에 머문다.
    @Test fun `켠 채 다른 장으로 옮기면 스트림 주소가 바뀐다`() {
        opened()
        runBlocking { uc.focusCard(0, on = true, by = "cli") }
        val first = awaitState { it.focus?.streamUrl != null }.focus!!.streamUrl
        runBlocking { uc.focusCard(2, on = true, by = "cli") }
        awaitState { it.focus?.previewId == "Card2" && it.focus?.streamUrl != null && it.focus?.streamUrl != first }
    }

    // 정착할 때마다 렌더 도장이 바뀐다. 스트림 주소까지 따라 바뀌면 그때마다 MJPEG를 다시 연다.
    @Test fun `인터랙티브 중 다시 그려도 스트림 주소는 그대로다`() {
        opened()
        presenter.enterFocus(0); runBlocking { presenter.drain() }
        val url = now().focus!!.streamUrl
        runBlocking { uc.rerender("test") }
        assertEquals(url, now().focus!!.streamUrl)
    }


    @Test fun `이름이 하나뿐인 파일은 바로 풀패스로 남는다`() {
        opened(); awaitIndex()
        val r = runBlocking { presenter.point("Cards.kt", 3, Pointed("Text", listOf("Text"), null, "Card0")) }
        assertTrue(r is BrowserPresenter.PointResult.Selected)
        assertEquals("@${fx.file.path}#L3", (r as BrowserPresenter.PointResult.Selected).selection.ref)
    }

    // 조용히 하나 찍지 않는다. 사람이 한 번 고르면 같은 데몬에서는 다시 묻지 않는다.
    @Test fun `이름이 갈리면 고르게 하고 고른 것은 기억한다`() {
        opened(); awaitIndex()
        assertEquals(BrowserPresenter.PointResult.NeedChoice, runBlocking { presenter.point("Dup.kt", 1, Pointed(null, emptyList(), null, "Card0")) })
        val choice = now().choice!!
        assertEquals(2, choice.candidates.size)

        val picked = choice.candidates.last()
        val r = runBlocking { presenter.choose(picked) } as BrowserPresenter.PointResult.Selected
        assertEquals("@$picked#L1", r.selection.ref)
        assertNull(now().choice)

        val again = runBlocking { presenter.point("Dup.kt", 7, Pointed(null, emptyList(), null, "Card0")) } as BrowserPresenter.PointResult.Selected
        assertEquals("@$picked#L7", again.selection.ref)
    }

    @Test fun `컴파일이 실패하면 낡음 줄과 보드 한 줄이 그것을 말한다`() {
        opened()
        fx.compiler.ok = false
        runBlocking { uc.applySave(listOf(fx.file), "watch") }
        val s = now()
        assertEquals(listOf("⚠ The compile failed, so the image you see is from before this save"), s.stale.map { it.head.text })
        assertTrue(s.boardNote!!.text.startsWith("Compile failed"), s.boardNote?.text)
        assertEquals(listOf("Compile", "Total"), s.timing.map { it.label.text })
    }

    // 스트림은 주소를 낸 동안만 돈다 — 나오면 꺼서 보이지 않는 무한 애니메이션이 있어도 루프가 멈춘다.
    @Test fun `인터랙티브에 들어가면 스트림을 켜고 나오면 끈다`() {
        opened()
        runBlocking {
            uc.watching.test {
                assertEquals(false, awaitItem())
                presenter.enterFocus(0); presenter.drain()
                assertEquals(true, awaitItem())
                presenter.exitFocus(); presenter.drain()
                assertEquals(false, awaitItem())
            }
        }
    }

    // 답이 없는 의도는 던지고 잊는다. 응답이 바로 가니 순서는 던지는 순간 선 코어의 줄이 지키고, 하나가 실패해도 뒤의 것은 받아야 한다.
    @Test fun `던진 의도는 순서대로 처리하고 실패는 알림으로 남긴다`() {
        opened()
        runBlocking {
            presenter.events.filterIsInstance<UiEvent.Flash>().test {
                presenter.enterFocus(99)                                                   // 없는 카드
                presenter.enterFocus(1)
                presenter.drain()
                assertEquals("Card1", presenter.current().focus!!.previewId)
                val flash = awaitItem()
                assertTrue(flash.text.text.startsWith("Request failed"), flash.text.text)
            }
        }
    }

    // 에이전트가 줄을 쥔 동안 사람이 카드를 누르고 곧바로 나가도, 나가기는 들어가기 뒤에 선다 — 나간 사람이 포커스에 갇히지 않는다.
    @Test fun `줄이 막힌 동안 던진 의도는 던진 순서대로 에이전트 뒤에 선다`() {
        opened()
        val gate = CountDownLatch(1)
        fx.renderer.showGate = gate
        fx.renderer.showEntered.drainPermits()
        val agent = CoroutineScope(Dispatchers.Default).launch { uc.rerender("cli") }
        try {
            assertTrue(fx.renderer.showEntered.tryAcquire(5, TimeUnit.SECONDS))   // 에이전트가 줄을 쥐고 그리는 중
            presenter.enterFocus(1)
            presenter.exitFocus()
            presenter.enterFocus(2)
            presenter.exitFocus()
        } finally { gate.countDown(); fx.renderer.showGate = null }
        runBlocking { agent.join(); presenter.drain() }
        val s = now()
        assertEquals(BrowserState.Screen.BOARD, s.screen)
        assertEquals(2, runBlocking { uc.readStatus() }.board!!.focus)
    }

    @Test fun `줄이 막힌 동안 던진 터치는 던진 순서대로 닿는다`() {
        opened()
        presenter.enterFocus(0); runBlocking { presenter.drain() }
        fx.renderer.touches.clear()
        val gate = CountDownLatch(1)
        fx.renderer.showGate = gate
        fx.renderer.showEntered.drainPermits()
        val agent = CoroutineScope(Dispatchers.Default).launch { uc.focusCard(1, on = true, by = "cli") }
        try {
            assertTrue(fx.renderer.showEntered.tryAcquire(5, TimeUnit.SECONDS))
            for (i in 0 until 20) presenter.touch(if (i % 2 == 0) "press" else "release", i, i)
            assertTrue(fx.renderer.touches.isEmpty(), "줄을 쥔 에이전트보다 먼저 닿았다")
        } finally { gate.countDown(); fx.renderer.showGate = null }
        runBlocking { agent.join(); presenter.drain() }
        assertEquals((0 until 20).toList(), fx.renderer.touches.map { it.second })
    }

    // 줄이 비어 있으면 던진 쪽 스레드에서 줄을 잡는다 — 일까지 거기서 돌면 탭 전환의 컴파일만큼 뷰어의 HTTP 응답이 늦는다.
    @Test fun `줄을 잡은 뒤의 일은 줄을 선 스레드에서 돌지 않는다`() {
        val caller = Thread.currentThread()
        var ran: Thread? = null
        val job = CoroutineScope(Dispatchers.Default).launch(start = CoroutineStart.UNDISPATCHED) { uc.workspace.exclusive { ran = Thread.currentThread() } }
        runBlocking { job.join() }
        assertTrue(ran != null && ran !== caller, "줄을 선 스레드에서 일을 했다")
    }

    // D-63. 진행은 상태(알약 · 진행 빛)만 말한다 — 캡슐에도 띄우면 일이 끝난 뒤 2.5초 남았다. 정착 계측도 캡슐이 아니라 팝오버 한 줄이다.
    @Test fun `진행과 정착은 알림을 내지 않고 정착 뒤에도 알약 시간이 남는다`() {
        opened()
        runBlocking {
            presenter.events.test {
                uc.applySave(listOf(fx.file), "watch"); uc.workspace.awaitBoardFilled()
                presenter.enterFocus(0); presenter.drain()
                presenter.touch("tap", 1, 1); presenter.drain()
                eventually(2_000) { now().settle != null }
                expectNoEvents()
            }
        }
        val s = now()
        assertTrue(Regex("Settled · frames \\d+ · tick \\d+ms").matches(s.settle?.text.orEmpty()), s.settle?.text)
        assertNotNull(s.timing.singleOrNull { it.head }, s.timing.toString())
    }

    // D-63. ✓ 는 보드가 다 찬 뒤다 — 첫 장에서 끄면 나머지가 흐린 채 바뀌는 동안 다 됐다고 읽혔다. 보드 시간은 채우기가 알린다.
    @Test fun `보드가 다 찰 때까지 바쁘고 다 차면 보드 시간이 선다`() {
        opened()
        fx.renderer.hold = CountDownLatch(1)
        fx.renderer.holdAfter = fx.renderer.shown.size + 1                     // 저장의 첫 장만 그리고 채우기를 세운다
        try {
            runBlocking { uc.applySave(listOf(fx.file), "watch") }
            val mid = awaitState { it.boardNote?.text == "1/3" }
            assertTrue(mid.busy)
        } finally { fx.renderer.holdAfter = Int.MAX_VALUE; fx.renderer.hold.countDown() }
        val done = awaitState { !it.busy && it.timing.any { p -> p.label.text == "Board of 3" } }
        assertEquals("First", done.timing.single { it.head }.label.text)
        assertEquals("3 previews · Cards.kt", done.boardNote?.text)
    }

    // 다음 일이 첫 장을 내기 전에 남은 시간 줄은 지난 일의 것이다 — 진행 문장 옆에 지난 보드의 `보드 3장 · 콜드`가 섰다.
    @Test fun `다음 일이 첫 장을 그리는 동안에는 지난 일의 시간 줄을 싣지 않는다`() {
        opened()
        awaitState { it.timing.any { p -> p.label.text == "Board of 3" } }
        val gate = CountDownLatch(1)
        fx.renderer.showGate = gate
        fx.renderer.showEntered.drainPermits()
        val save = CoroutineScope(Dispatchers.Default).launch { uc.applySave(listOf(fx.file), "watch") }
        try {
            assertTrue(fx.renderer.showEntered.tryAcquire(5, TimeUnit.SECONDS))   // 저장의 첫 장을 그리는 중
            awaitState { it.busy && it.timing.isEmpty() }
        } finally { gate.countDown(); fx.renderer.showGate = null }
        runBlocking { save.join() }
        val done = awaitState { !it.busy && it.timing.any { p -> p.label.text == "Board of 3" } }
        assertEquals("First", done.timing.single { it.head }.label.text)
    }

    // NFR-11. 데몬이 뜬 뒤 첫 렌더는 콜드(5초)다 — 기준 하나(1초)로 두면 콜드 첫 열기가 늘 주황이었다. 그 뒤의 열기는 첫 장이다.
    @Test fun `첫 렌더는 콜드이고 다음 렌더부터 첫 장이다`() {
        assertEquals("Cold", opened().timing.single { it.head }.label.text)
        runBlocking { uc.rerender("test") }
        assertEquals("First", now().timing.single { it.head }.label.text)
    }

    // D-63. 탭 0개는 오류가 아니라 시작 화면이다 — 데몬을 파일 없이 띄웠을 때와 같다.
    @Test fun `마지막 탭을 닫으면 빈 화면이고 오류도 알약 재료도 없다`() {
        opened()
        runBlocking { uc.closeTab(fx.file.path, "test") }
        val s = now()
        assertEquals(BrowserState.Screen.EMPTY, s.screen)
        assertNull(s.error)
        assertTrue(s.timing.isEmpty())
        assertNull(s.who)
        assertFalse(s.busy)
    }

    // 보드 카드의 옛 호출자 고치기는 컴파일을 알리지만 `Rendered`를 내지 않는다 — 카드가 그려지면 걷어야 알약이 영영 돌지 않는다.
    @Test fun `카드의 옛 호출자 고치기가 끝나면 진행을 걷는다`() {
        opened()
        fx.compiler.overlay = setOf("lib.ThemeKt")
        fx.compiler.callers = listOf(fx.file)
        fx.renderer.exceptions += "View layout failed\njava.lang.NoSuchMethodError: 'void lib.ThemeKt.Wheel(java.lang.String, androidx.compose.runtime.Composer, int)'"
        runBlocking { uc.drawCard(1, force = true, by = "test") }
        val s = awaitState { !it.busy }
        assertEquals("3 previews · Cards.kt", s.boardNote?.text)
    }

    @Test fun `렌더가 실패하면 보드 한 줄이 그 실패를 말하고 다음 성공이 걷는다`() {
        opened()
        fx.renderer.exceptions += "View layout failed\njava.lang.IllegalStateException: boom"
        runBlocking { uc.applySave(listOf(fx.file), "watch") }; uc.workspace.awaitBoardFilled()
        val failed = now()
        assertTrue(failed.boardNote!!.text.endsWith("View layout failed"), failed.boardNote?.text)
        runBlocking { uc.applySave(listOf(fx.file), "watch") }; uc.workspace.awaitBoardFilled()
        assertEquals("3 previews · Cards.kt", awaitState { !it.busy }.boardNote?.text)
    }

    @Test fun `프리뷰 파일 목록이 바뀐 알림은 상태를 다시 짓지 않는다`() {
        opened()
        uc.workspace.state.awaitState("보드 시간") { it.boardFill != null }   // 채우기의 마지막 바뀜 — 그 뒤로는 상태가 조용하다
        presenter.state.awaitState("뷰어 상태가 보드 시간까지") { it.timing == now().timing }
        val before = presenter.state.value.version
        runBlocking {
            presenter.events.test {
                uc.indexPreviewFiles()
                assertEquals(UiEvent.PreviewFiles, awaitItem())
                assertEquals(before, presenter.state.value.version)
            }
        }
    }

    @Test fun `탭이 넘쳐 오래 안 본 탭을 닫으면 그 파일 이름으로 알린다`() {
        opened()
        runBlocking {
            presenter.events.filterIsInstance<UiEvent.Flash>().test {
                for (i in 1..10) uc.openPreview(fx.previewFile("Extra$i", 1).path, null, emptyMap(), "test")
                assertEquals("Closed the Cards.kt tab you hadn't looked at in a while", awaitItem().text.text)
            }
        }
    }

    /** 줄에 앞서 들어온 `WorkspaceEvent`를 다 반영한 상태. */
    private fun now() = runBlocking { presenter.current() }

    /** 채우기 · 쓰기 완료는 따로 돈다 — 상태가 그 모양이 될 때까지 기다린다. */
    private fun awaitState(timeoutMs: Long = 5_000, ok: (BrowserState) -> Boolean): BrowserState =
        awaitValue({ now().let { s -> "상태: busy=${s.busy} note=${s.boardNote} timing=${s.timing}" } }, timeoutMs) { now().takeIf(ok) }

    private fun awaitIndex() = awaitUntil("색인이 서기") { uc.readSourceIndex() != null }   // 색인은 따로 스레드에서 짓는다
}
