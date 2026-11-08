package prevue.infrastructure.source

import java.io.File
import java.nio.file.Files
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import kotlin.concurrent.thread
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import prevue.application.port.PrevueDispatchers
import prevue.daemon.fake.realDispatchers

/** 띄울 때 한 번 걷고, 그 뒤의 생성 · 삭제는 감시가 알린 대로 얹는다 — 서버가 뜬 뒤 만든 파일도 가리키기가 푼다. */
class ProjectFilesTest {
    private fun repo(): Pair<File, File> {
        val root = Files.createTempDirectory("projfiles").toFile().apply { deleteOnExit() }
        val src = File(root, "app/src/main/java").apply { mkdirs() }
        File(src, "Main.kt").writeText("")
        return root to src
    }

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @AfterEach fun tearDown() = runBlocking { scope.coroutineContext.job.cancelAndJoin() }

    private fun files(root: File, src: File) = ProjectFiles(root, listOf(src), realDispatchers, scope)

    private fun built(root: File, src: File) = files(root, src).also { f -> runBlocking { withTimeout(5_000) { f.sourceFiles() } } }

    @Test fun `경로로 쓸 수 없는 이름은 없는 파일이다 — 사용자가 넘긴 대상이 서버 오류가 되지 않는다`() {
        val (root, src) = repo()
        val files = files(root, src)
        val bad = File(src, "a\u0000b.kt")
        assertNull(files.modifiedAt(bad))
        assertFalse(files.has(bad))
        assertNull(files.read(bad))
    }

    @Test fun `띄운 뒤 만든 파일을 푼다`() {
        val (root, src) = repo()
        val files = built(root, src)
        val card = File(src, "ui/Card.kt").apply { parentFile.mkdirs(); writeText("") }
        assertEquals(emptyList<String>(), files.candidates("Card.kt"))
        assertTrue(files.update(listOf(card), emptyList()))
        assertEquals(listOf(card.absolutePath), files.candidates("Card.kt"))
        assertEquals(setOf("Main.kt", "Card.kt"), files.index()!!.files.keys)
        assertEquals(setOf("Main.kt", "Card.kt"), runBlocking { files.sourceFiles() }.map { it.name }.toSet())
    }

    @Test fun `지운 파일은 빠지고 같은 알림은 바뀜이 아니다`() {
        val (root, src) = repo()
        val files = built(root, src)
        val main = File(src, "Main.kt")
        assertFalse(files.update(listOf(main), emptyList()))
        main.delete()
        assertTrue(files.update(emptyList(), listOf(main)))
        assertEquals(emptyList<String>(), files.candidates("Main.kt"))
        assertFalse(files.update(listOf(File(root, "notes.md"), File("/elsewhere/X.kt")), emptyList()))
    }

    @Test fun `짓는 중의 알림은 걷기가 끝난 뒤에 얹는다 — 걷기가 못 본 바뀜도 남는다`() {
        val (root, src) = repo()
        val gate = CountDownLatch(1)
        val io = Executors.newSingleThreadExecutor()
        try {
            io.execute { gate.await() }
            val files = ProjectFiles(root, listOf(src), PrevueDispatchers(io.asCoroutineDispatcher(), Dispatchers.Default), scope)
            val late = File(src, "Late.kt").apply { writeText("") }
            val main = File(src, "Main.kt")
            val t = thread { repeat(500) { files.update(listOf(late), emptyList()) } }
            t.join()
            late.delete()
            main.delete()
            assertFalse(files.update(emptyList(), listOf(main)))
            File(src, "Main.kt").writeText("")
            assertNull(files.index())
            gate.countDown()
            runBlocking { withTimeout(5_000) { files.sourceFiles() } }
            assertEquals(listOf(late.absolutePath), files.candidates("Late.kt"))
            assertEquals(emptyList<String>(), files.candidates("Main.kt"))
        } finally {
            io.shutdownNow()
        }
    }

    @Test fun `심링크를 거친 루트에도 감시의 정규 경로를 맞춘다`() {
        val real = Files.createTempDirectory("projreal").toFile().apply { deleteOnExit() }
        val root = File(real.parentFile, "projlink-${System.nanoTime()}").apply { deleteOnExit() }
        Files.createSymbolicLink(root.toPath(), real.toPath())
        val src = File(root, "app/src/main/java").apply { mkdirs() }
        val files = built(root, src)
        val card = File(src, "Card.kt").apply { writeText("") }
        assertTrue(files.update(listOf(card.canonicalFile), emptyList()))
        assertEquals(listOf(card.absolutePath), files.candidates("Card.kt"))
    }

    @Test fun `걷기가 안 보는 디렉터리의 파일은 싣지 않는다`() {
        val (root, src) = repo()
        val files = built(root, src)
        val gen = File(root, "app/build/generated/Gen.kt").apply { parentFile.mkdirs(); writeText("") }
        assertFalse(files.update(listOf(gen), emptyList()))
        assertEquals(emptyList<String>(), files.candidates("Gen.kt"))
    }

    @Test fun `짓기가 취소되면 기다리던 쪽이 멈추지 않고 실패를 받는다`() {
        val (root, src) = repo()
        val files = ProjectFiles(root, listOf(src), realDispatchers, CoroutineScope(Job()).apply { cancel() })
        assertThrows(IllegalStateException::class.java) { runBlocking { withTimeout(5_000) { files.sourceFiles() } } }
        assertNull(files.index())
        assertFalse(files.update(listOf(File(src, "Main.kt")), emptyList()))
    }
}
