package prevue.daemon.domain.runtime

import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.fake.Fixture
import prevue.daemon.domain.model.Status

class WorkspaceSnapshotTest {
    private val fx = Fixture()
    private val uc = fx.useCases()

    @AfterEach fun tearDown() = fx.close()

    @Test fun `저장과 탭 전환이 겹치는 동안 status는 한 시점의 것이다`() {
        val screen = fx.file
        val card = fx.previewFile("NewsCard")
        runBlocking { uc.openPreview(screen.path, null, emptyMap(), "test"); uc.openPreview(card.path, null, emptyMap(), "test") }

        val done = AtomicBoolean(false)
        val reads = AtomicInteger()
        val torn = java.util.concurrent.CopyOnWriteArrayList<String>()
        val reader = thread {
            while (!done.get()) {
                torn(uc.readStatus())?.let { torn += it }
                reads.incrementAndGet()
            }
        }
        val saver = thread {
            runBlocking { repeat(ROUNDS) { uc.applySave(listOf(if (it % 2 == 0) screen else card), "test") } }
        }
        runBlocking {
            repeat(ROUNDS) { uc.openPreview((if (it % 2 == 0) screen else card).path, null, emptyMap(), "test") }
        }
        saver.join()
        done.set(true)
        reader.join()

        assertTrue(reads.get() > ROUNDS, "읽기가 겹치지 않았다 — ${reads.get()}번")
        assertEquals(emptyList<String>(), torn.take(5), "섞인 읽기 ${torn.size}번 / ${reads.get()}번")
    }

    @Test fun `지금 탭을 닫고 옮기는 동안 status는 닫은 탭의 보드를 보이지 않는다`() {
        val screen = fx.file
        val card = fx.previewFile("NewsCard")
        runBlocking { uc.openPreview(screen.path, null, emptyMap(), "test") }

        val done = AtomicBoolean(false)
        val torn = java.util.concurrent.CopyOnWriteArrayList<String>()
        val reader = thread { while (!done.get()) torn(uc.readStatus())?.let { torn += it } }
        runBlocking {
            repeat(ROUNDS) {
                uc.openPreview(card.path, null, emptyMap(), "test")
                uc.closeTab(card.path, "test")
            }
        }
        done.set(true)
        reader.join()

        assertEquals(emptyList<String>(), torn.take(5), "섞인 읽기 ${torn.size}번")
    }

    private fun torn(s: Status): String? {
        val tab = s.tabs.firstOrNull { it.active }
        if (tab == null) return s.board?.let { "board=${it.file.name} active=없음" }
        val active = tab.file?.canonicalFile ?: return null
        s.board?.file?.canonicalFile?.takeIf { it != active }?.let { return "board=${it.name} active=${active.name}" }
        s.preview?.file?.canonicalFile?.takeIf { it != active }?.let { return "preview=${it.name} active=${active.name}" }
        return null
    }

    private companion object { const val ROUNDS = 300 }
}
