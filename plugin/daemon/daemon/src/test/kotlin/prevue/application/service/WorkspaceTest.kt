package prevue.application.service

import java.io.File
import java.nio.file.Files
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeout
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertInstanceOf
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
            val ws = workspace(listOf(File(link, "src"), real))
            assertTrue(ws.hosts(File(link, "src/A.kt")))
            assertTrue(ws.hosts(File(real, "A.kt")))
            assertFalse(ws.hosts(File(tmp, "other/A.kt")))
            assertEquals(listOf(real.canonicalFile), ws.watchRoots)
        } finally { File(tmp, "link").delete(); tmp.deleteRecursively() }
    }

    @Test fun `감시 루트가 없어도 링크 경로 소스 루트로 만든 그래프의 파일을 품는다`() {
        val tmp = Files.createTempDirectory("prevue-hosts").toFile()
        try {
            val real = File(tmp, "real/src").apply { mkdirs() }
            val link = Files.createSymbolicLink(File(tmp, "link").toPath(), real.parentFile.toPath()).toFile()
            val ws = Workspace(ModuleInfo("/r", ":a", "debug", "a", null, null), FakeClock(),
                ModuleGraph.single(":a", listOf(File(link, "src")), emptyList()), emptyList(), InMemoryWorkspaceStore())
            assertTrue(ws.hosts(File(real, "A.kt")))
            assertTrue(ws.hosts(File(link, "src/A.kt")))
            assertFalse(ws.hosts(File(tmp, "other/A.kt")))
        } finally { File(tmp, "link").delete(); tmp.deleteRecursively() }
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

    @Test fun `같은 작업이 다시 줄을 서면 즉시 실패하고 다음 작업은 줄을 쓸 수 있다`() = runBlocking {
        val ws = workspace()
        withTimeout(5_000) {
            val failure = runCatching {
                ws.exclusive { ws.exclusive { error("중첩 호출이 실행됐다") } }
            }.exceptionOrNull()
            val error = assertInstanceOf(IllegalStateException::class.java, failure)
            assertEquals("같은 작업 공간의 줄에 다시 설 수 없다", error.message)
            assertEquals("다음 작업", ws.exclusive { "다음 작업" })
        }
    }

    @Test fun `줄 안의 자식 작업도 같은 줄에서 저장을 시작할 수 없다`() = runBlocking {
        val ws = workspace()
        withTimeout(5_000) {
            ws.exclusive {
                val failure = runCatching {
                    coroutineScope { ws.saving { error("중첩 저장이 실행됐다") } }
                }.exceptionOrNull()
                val error = assertInstanceOf(IllegalStateException::class.java, failure)
                assertEquals("같은 작업 공간의 줄에 다시 설 수 없다", error.message)
                assertFalse(ws.reloadPending)
            }
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test fun `독립 작업은 앞 작업이 끝난 뒤 줄에 들어간다`() = runTest {
        val ws = workspace()
        val entered = CompletableDeferred<Unit>()
        val leave = CompletableDeferred<Unit>()
        val first = async {
            ws.exclusive {
                entered.complete(Unit)
                leave.await()
            }
        }
        entered.await()
        val nextEntered = CompletableDeferred<Unit>()
        val next = async { ws.exclusive { nextEntered.complete(Unit) } }
        runCurrent()
        assertFalse(nextEntered.isCompleted)
        leave.complete(Unit)
        first.await()
        assertTrue(next.await())
    }
}
