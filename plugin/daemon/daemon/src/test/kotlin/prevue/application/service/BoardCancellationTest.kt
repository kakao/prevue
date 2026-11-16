package prevue.application.service

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.CardResult
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.TestGraph
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.awaitUntil

/** 보드 카드를 그리다 생긴 취소는 다시 던지고, 다른 오류는 남긴다 — 취소를 실패나 "다 채웠다"로 바꾸지 않는다. */
class BoardCancellationTest {
    private val fx = Fixture(previews = 4)
    private val job = SupervisorJob()
    private val daemon = CoroutineScope(job + Dispatchers.Default)

    @AfterEach fun tearDown() {
        fx.renderer.hold.countDown()
        runBlocking { job.cancelAndJoin() }
        fx.close()
    }

    private fun opened(): TestGraph = fx.graph(scope = daemon).also {
        runBlocking { it.tabs.openPreview(fx.file.path, null, emptyMap(), "test") }
    }

    @Test fun `카드를 그리는 중에 채우기가 취소되면 다 채웠다고 적지 않는다`() {
        fx.renderer.holdAfter = 1
        fx.renderer.hold = CountDownLatch(1)
        val uc = opened()
        assertTrue(fx.renderer.showEntered.tryAcquire(2, 5, TimeUnit.SECONDS), "채우기가 카드 1을 그리지 않았다")

        job.cancel()
        fx.renderer.hold.countDown()
        runBlocking { job.join() }

        assertEquals(null, uc.workspace.now.boardFill, "취소된 채우기가 끝까지 돌아 채움을 적었다")
        assertEquals(2, fx.renderer.shown.size, "취소 뒤에도 다음 카드를 그렸다 — ${fx.renderer.shown.map { it.previewId }}")
    }

    @Test fun `쓰는 중에 취소되면 기다리던 쪽은 취소를 받고 카드에 쓰기 실패가 남지 않는다`() {
        val uc = opened()
        uc.workspace.awaitBoardFilled()
        fx.renderer.writeParks = uc.workspace.now.board!!.cards[2].spec.previewId
        val waiting = fx.scope.async { runCatching { uc.boards.drawCard(2, force = true, by = "test") } }
        assertTrue(fx.renderer.writeEntered.tryAcquire(5, TimeUnit.SECONDS), "카드 2의 쓰기가 시작하지 않았다")

        runBlocking { job.cancelAndJoin() }

        val r = runBlocking { waiting.await() }
        assertTrue(r.exceptionOrNull() is CancellationException, "기다리던 쪽이 취소 대신 $r 를 받았다")
        assertFalse(uc.workspace.now.board!!.cards[2].result is CardResult.WriteFailed, "취소를 쓰기 실패로 적었다")
    }

    @Test fun `한 카드에서 예외나 Error가 나도 채우기는 남은 카드를 그리고 끝까지 간다`() {
        fx.renderer.showThrowsIf = { p ->
            when (p.functionName) {
                "Card1" -> IllegalStateException("렌더러가 죽었다")
                "Card2" -> NoClassDefFoundError("demo/Gone")
                else -> null
            }
        }
        val uc = opened()

        awaitUntil("채움 기록") { uc.workspace.now.boardFill != null }
        awaitUntil("예외 뒤 남은 카드") { uc.workspace.now.board!!.let { it.cards[3].fresh(it.gen) } }
        val b = uc.workspace.now.board!!
        assertFalse(b.cards[1].fresh(b.gen), "예외 난 카드가 그린 것으로 적혔다")
        assertFalse(b.cards[2].fresh(b.gen), "Error 난 카드가 그린 것으로 적혔다")
    }
}
