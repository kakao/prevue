package prevue.infrastructure.store

import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.application.domain.model.Board
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.Verbatim

/** 저장소는 갈아 끼우기(CAS)만 한다 — 여러 스레드가 한꺼번에 고쳐도 고침 하나 잃지 않는다. 줄(누가 언제 쓰나)은 서비스 `Workspace`가 갖는다. */
class InMemoryWorkspaceStoreTest {
    @Test fun `동시에 온 고침을 하나도 잃지 않는다`() {
        val store = InMemoryWorkspaceStore()
        val many = (0 until 64).map { PreviewSpec("com.x.P$it", "P$it", emptyMap(), null, it) }
        val b = Board.open(File("A.kt"), many, 0)
        store.edit { it.copy(board = b) }
        val pool = Executors.newFixedThreadPool(8)
        val go = CountDownLatch(1)
        try {
            val jobs = many.indices.map { i ->
                pool.submit { go.await(); store.edit { it.withCard(b.epoch, i, b.gen, CardResult.WriteFailed(i, Verbatim("x$i"))) } }
            }
            go.countDown()
            jobs.forEach { it.get(5, TimeUnit.SECONDS) }
        } finally { pool.shutdown() }
        assertEquals(many.indices.toList(), store.state.value.board!!.cards.mapNotNull { (it.result as? CardResult.WriteFailed)?.index })
    }
}
