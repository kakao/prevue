package prevue.daemon.domain.model

import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CompletableDeferred
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.entity.ModuleGraph
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.fake.FakeClock
import prevue.daemon.domain.runtime.Workspace

/** 보드와 카드는 불변 값이다(D-51). 바꾸면 새 값이 나오고, `Workspace`가 CAS로 갈아 끼운다. */
class BoardTest {
    private val specs = (0 until 4).map { PreviewSpec("com.x.P$it", "P$it", emptyMap(), null, it) }
    private fun drawn(i: Int) = CardResult.WriteFailed(i, prevue.daemon.entity.Verbatim("x$i"))

    @Test fun `바꾸면 새 값이고 옛 값은 그대로다`() {
        val b = Board.open(File("A.kt"), specs, 9)
        assertEquals(3, b.focus)                                         // 넘치는 자리는 끝으로
        val next = b.record(1, 0, drawn(1)).advance().focusOn(2)
        assertNull(b.cards[1].result); assertEquals(0, b.gen); assertEquals(3, b.focus)
        assertTrue(next.cards[1].fresh(0)); assertFalse(next.cards[1].fresh(next.gen))
        assertEquals(1, next.gen); assertEquals(2, next.focus)
        assertEquals(b.epoch, next.epoch)                                // 같은 보드의 다음 모습이다
        assertNotEquals(b.epoch, Board.open(File("A.kt"), specs, 0).epoch)   // 다시 열면 다른 회차다
    }

    @Test fun `쓰는 중 표시는 같은 세대의 기록만 지운다`() {
        val f = CompletableDeferred<CardResult>()
        val c = Card(specs[0]).begin(1, f)
        assertSame(f, c.writing(1)); assertNull(c.writing(2))
        assertSame(f, c.record(0, drawn(0)).pending)                     // 옛 세대의 기록 — 새 세대의 쓰기는 아직이다
        val done = c.record(1, drawn(0))
        assertNull(done.pending); assertTrue(done.fresh(1))
    }

    @Test fun `줄 밖의 기록이 동시에 와도 하나도 잃지 않는다`() {
        val ws = Workspace(ModuleInfo("/r", ":a", "debug", "a", null, null), FakeClock(), ModuleGraph.single(":a", emptyList(), emptyList()))
        val many = (0 until 64).map { PreviewSpec("com.x.P$it", "P$it", emptyMap(), null, it) }
        val b = Board.open(File("A.kt"), many, 0)
        kotlinx.coroutines.runBlocking { ws.exclusive { it.openBoard(b) } }
        val pool = Executors.newFixedThreadPool(8)
        val go = CountDownLatch(1)
        try {
            val jobs = many.indices.map { i -> pool.submit { go.await(); ws.recordCard(b.epoch, i, b.gen, drawn(i)) } }
            go.countDown()
            jobs.forEach { it.get(5, TimeUnit.SECONDS) }
        } finally { pool.shutdown() }
        assertEquals(many.indices.toList(), ws.now.board!!.cards.mapNotNull { (it.result as? CardResult.WriteFailed)?.index })
    }
}
