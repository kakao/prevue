package prevue.daemon.adapter.watch

import app.cash.turbine.ReceiveTurbine
import app.cash.turbine.test
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import kotlinx.coroutines.flow.filter
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import prevue.daemon.domain.port.SourceChange
import prevue.daemon.fake.awaitUntil

/** D-56. 생성 · 삭제는 저장(files)이 아니라 따로 알린다 — 저장 → 화면은 그대로 수정된 파일만 받는다. */
class PollingSourceWatcherTest {
    @TempDir lateinit var directory: Path

    /** 등록을 마치고 첫 틱이 돌았다 — 그 뒤의 바뀜만 알린다. */
    private fun PollingSourceWatcher.awaitFirstTick() = awaitUntil("감시의 첫 틱") { stats.isNotEmpty() }

    /** 첫 틱이 돈 뒤에 [validate]를 부른다. 관심 있는 알림만 거른다 — 폴링은 같은 바뀜을 어느 틱에 묶을지 정해 두지 않는다. */
    private fun PollingSourceWatcher.watch(hot: () -> List<File> = { emptyList() }, only: (SourceChange) -> Boolean, validate: suspend ReceiveTurbine<SourceChange>.() -> Unit) =
        runBlocking {
            changes(hot).filter(only).test(timeout = 5.seconds) {                    // 벽시계 폴링 · 파일 시스템이라 Await.kt 와 같은 5초
                awaitFirstTick()
                validate()
                cancelAndIgnoreRemainingEvents()
            }
        }

    @Test fun `새 파일과 지운 파일을 저장과 갈라 알린다`() {
        val root = directory.toFile().canonicalFile
        val old = File(root, "a/Old.kt").apply { parentFile.mkdirs(); writeText("package a\n") }
        PollingSourceWatcher(listOf(root)).watch(only = { it.created.isNotEmpty() || it.deleted.isNotEmpty() }) {
            val fresh = File(root, "a/New.kt").apply { writeText("package a\n") }   // 첫 틱 뒤다 — 처음 등록은 생성이 아니다
            val c1 = awaitItem()
            assertEquals(listOf(fresh), c1.created)
            assertEquals(emptyList<File>(), c1.files)

            val nested = File(root, "b/c/Deep.kt").apply { parentFile.mkdirs(); writeText("package c\n") }
            assertEquals(listOf(nested), awaitItem().created)

            old.delete()
            val c3 = awaitItem()
            assertEquals(listOf(old), c3.deleted)
            assertEquals(emptyList<File>(), c3.files)
        }
    }

    @Test fun `보여 주는 파일의 제자리 덮어쓰기를 저장으로 알린다`() {
        val root = directory.toFile().canonicalFile
        val shown = File(root, "a/Shown.kt").apply { parentFile.mkdirs(); writeText("package a\n") }
        PollingSourceWatcher(listOf(root)).apply { periodMs = 60_000 }.watch({ listOf(shown) }, only = { it.files.isNotEmpty() }) {
            overwrite(shown)
            val c = awaitItem()
            assertEquals(listOf(shown), c.files)
            assertEquals(emptyList<File>(), c.created)
        }
    }

    @Test fun `안 보여 주는 파일의 제자리 덮어쓰기는 전체 stat 조각이 잡는다`() {
        val root = directory.toFile().canonicalFile
        val quiet = File(root, "a/Quiet.kt").apply { parentFile.mkdirs(); writeText("package a\n") }
        val dirMtime = quiet.parentFile.lastModified()
        PollingSourceWatcher(listOf(root)).apply { statSliceTicks = 1 }.watch(only = { it.files.isNotEmpty() }) {
            overwrite(quiet)
            quiet.parentFile.setLastModified(dirMtime)
            assertEquals(listOf(quiet), awaitItem().files)
        }
    }

    @Test fun `임시 파일을 옮겨 쓴 저장은 디렉터리 mtime 으로 잡는다`() {
        val root = directory.toFile().canonicalFile
        val target = File(root, "a/Saved.kt").apply { parentFile.mkdirs(); writeText("package a\n") }
        PollingSourceWatcher(listOf(root)).apply { statSliceTicks = 1_000 }.watch(only = { it.files.isNotEmpty() }) {
            val tmp = File(root, "a/Saved.kt.tmp").apply { writeText("package a\n// saved\n"); setLastModified(target.lastModified() + 2_000) }
            Files.move(tmp.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
            val c = awaitItem()
            assertEquals(listOf(target), c.files)
            assertEquals(emptyList<File>(), c.created)
        }
    }

    @Test fun `디렉터리째 지운 파일을 지운 것으로 알린다`() {
        val root = directory.toFile().canonicalFile
        val deep = File(root, "b/c/Deep.kt").apply { parentFile.mkdirs(); writeText("package c\n") }
        PollingSourceWatcher(listOf(root)).watch(only = { it.deleted.isNotEmpty() }) {
            File(root, "b").deleteRecursively()
            assertEquals(listOf(deep), awaitItem().deleted)
        }
    }

    @Test fun `디렉터리 mtime 이 그대로여도 전체 walk 가 생성 · 삭제를 줍는다`() {
        val root = directory.toFile().canonicalFile
        val dir = File(root, "a").apply { mkdirs() }
        val gone = File(dir, "Gone.kt").apply { writeText("package a\n") }
        PollingSourceWatcher(listOf(root)).apply { rewalkMs = 400; statSliceTicks = 1_000 }.watch(only = { true }) {
            val dirMtime = dir.lastModified()
            gone.delete()
            val born = File(dir, "Born.kt").apply { writeText("package a\n") }
            dir.setLastModified(dirMtime)
            val seen = ArrayList<SourceChange>()
            while (seen.none { gone in it.deleted } || seen.none { born in it.created }) {      // 한 틱에 올지 둘에 나뉠지 정해 두지 않는다
                seen += runCatching { awaitItem() }.getOrElse { throw AssertionError("지운 파일 · 새 파일을 다 줍지 못했다: $seen", it) }
            }
            assertTrue(seen.all { it.files.isEmpty() }, "$seen")
        }
    }

    @Test fun `status 가 읽는 감시 비용을 낸다`() {
        val root = directory.toFile().canonicalFile
        File(root, "a/One.kt").apply { parentFile.mkdirs(); writeText("package a\n") }
        val w = PollingSourceWatcher(listOf(root))
        w.watch(only = { false }) {
            val s = w.stats
            assertEquals(setOf("files", "dirs", "hotSet", "ticks", "hotPeriodMs", "periodMs", "cpuPct", "usPerTick"), s.keys)
            assertEquals(1, s["files"])
            assertEquals(2, s["dirs"])
            assertEquals(setOf("hot", "dir", "slice", "walk"), (s["usPerTick"] as Map<*, *>).keys)
            assertTrue((s["cpuPct"] as String).matches(Regex("""\d+\.\d\d""")))
        }
    }

    private fun overwrite(f: File) {
        val before = f.lastModified()
        f.writeText(f.readText() + "// edit\n")
        f.setLastModified(before + 2_000)
    }
}
