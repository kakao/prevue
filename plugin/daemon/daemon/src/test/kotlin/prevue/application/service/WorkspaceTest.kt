package prevue.application.service

import java.io.File
import java.nio.file.Files
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import prevue.application.domain.model.Board
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.ModuleGraph
import prevue.application.domain.model.ModuleInfo
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.Verbatim
import prevue.daemon.fake.FakeClock
import prevue.infrastructure.store.InMemoryWorkspaceStore

/** 줄의 규칙은 저장소가 아니라 `Workspace`가 갖는다 — 줄 밖의 이름 붙은 쓰기는 잃지 않고, 줄이 끝난 편집기는 쓰지 못한다. */
class WorkspaceTest {
    private fun workspace(roots: List<File> = emptyList()) = Workspace(ModuleInfo("/r", ":a", "debug", "a", null, null), FakeClock(),
        ModuleGraph.single(":a", emptyList(), emptyList()), roots, InMemoryWorkspaceStore())

    @Test fun `링크를 거친 날 경로로 감시 루트를 넘겨도 그 안의 파일을 품는다`() {
        val tmp = Files.createTempDirectory("prevue-hosts").toFile()
        try {
            val real = File(tmp, "real/src").apply { mkdirs() }
            val link = Files.createSymbolicLink(File(tmp, "link").toPath(), real.parentFile.toPath()).toFile()
            val ws = workspace(listOf(File(link, "src")))
            assertTrue(ws.hosts(File(link, "src/A.kt")))
            assertTrue(ws.hosts(File(real, "A.kt")))
            assertFalse(ws.hosts(File(tmp, "other/A.kt")))
            assertEquals(listOf(real.canonicalFile), ws.watchRoots)
        } finally { tmp.deleteRecursively() }
    }

    @Test fun `줄 밖의 카드 기록이 동시에 와도 하나도 잃지 않는다`() {
        val ws = workspace()
        val many = (0 until 64).map { PreviewSpec("com.x.P$it", "P$it", emptyMap(), null, it) }
        val b = Board.open(File("A.kt"), many, 0)
        runBlocking { ws.exclusive { it.openBoard(b) } }
        val pool = Executors.newFixedThreadPool(8)
        val go = CountDownLatch(1)
        try {
            val jobs = many.indices.map { i -> pool.submit { go.await(); ws.recordCard(b.epoch, i, b.gen, CardResult.WriteFailed(i, Verbatim("x$i"))) } }
            go.countDown()
            jobs.forEach { it.get(5, TimeUnit.SECONDS) }
        } finally { pool.shutdown() }
        assertEquals(many.indices.toList(), ws.now.board!!.cards.mapNotNull { (it.result as? CardResult.WriteFailed)?.index })
    }

    @Test fun `줄이 끝난 편집기로는 쓰지 못한다`() {
        val ws = workspace()
        val leaked = runBlocking { ws.exclusive { it } }
        assertThrows<IllegalStateException> { leaked.openBoard(null) }
    }
}
