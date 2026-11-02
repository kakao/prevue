package prevue.daemon.adapter.source

import java.io.File
import java.nio.file.Files
import kotlin.concurrent.thread
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** 띄울 때 한 번 걷고, 그 뒤의 생성 · 삭제는 감시가 알린 대로 얹는다 — 서버가 뜬 뒤 만든 파일도 가리키기가 푼다. */
class ProjectFilesTest {
    private fun repo(): Pair<File, File> {
        val root = Files.createTempDirectory("projfiles").toFile().apply { deleteOnExit() }
        val src = File(root, "app/src/main/java").apply { mkdirs() }
        File(src, "Main.kt").writeText("")
        return root to src
    }

    private fun built(root: File, src: File) = ProjectFiles(root, listOf(src)).also { f ->
        runBlocking { f.buildInBackground(this).join() }
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

    @Test fun `짓는 중에 다른 스레드가 알려도 지은 뒤에 얹는다`() {
        val (root, src) = repo()
        repeat(2000) { File(src, "d${it % 50}/F$it.kt").apply { parentFile.mkdirs(); writeText("") } }
        val late = File(src, "Late.kt").apply { writeText("") }
        val files = ProjectFiles(root, listOf(src))
        val t = thread { repeat(500) { files.update(listOf(late), emptyList()) } }
        runBlocking { files.buildInBackground(this).join() }
        t.join()
        assertEquals(listOf(late.absolutePath), files.candidates("Late.kt"))
        assertEquals(2002, files.index()!!.files.size)
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
        val files = ProjectFiles(root, listOf(src))
        files.buildInBackground(CoroutineScope(Job()).apply { cancel() })
        assertThrows(IllegalStateException::class.java) { runBlocking { withTimeout(5_000) { files.sourceFiles() } } }
        assertNull(files.index())
        assertFalse(files.update(listOf(File(src, "Main.kt")), emptyList()))
    }
}
