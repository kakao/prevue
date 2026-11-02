package prevue.daemon.adapter.watch

import app.cash.turbine.test
import java.io.File
import java.nio.file.Path
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.runCurrent
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import prevue.daemon.domain.port.BuildNotice

@OptIn(ExperimentalCoroutinesApi::class)
class PollingBuildWatcherTest {
    @TempDir lateinit var directory: Path

    private fun file(name: String) = File(directory.toFile(), name).apply { writeText(name); setLastModified(1_000_000) }

    private fun TestScope.watcher(own: File, res: File) =
        PollingBuildWatcher(listOf("own" to listOf(own), "resources" to listOf(res)), StandardTestDispatcher(testScheduler))

    @Test fun `처음 본 순간과 조용해진 뒤를 나눠 알리고 그 사이의 변경은 한 번에 묶는다`() = runTest {
        val own = file("own.jar")
        val res = file("values.xml")
        val w = watcher(own, res)
        val got = ArrayList<BuildNotice>()
        val job = launch { w.changes().collect { got += it } }
        advanceTimeBy(100)
        own.setLastModified(2_000_000)
        advanceTimeBy(2_000)
        assertEquals(listOf(false), got.map { it.done })
        assertEquals(listOf(own), got[0].change.own)

        res.setLastModified(2_000_000)
        advanceTimeBy(1_000)
        assertFalse(got.any { it.done }, "조용해지기 전에는 닫지 않는다")
        advanceTimeBy(2_000)
        assertEquals(listOf(false, false, true), got.map { it.done })
        assertEquals(listOf(own), got.last().change.own)
        assertEquals(listOf(res), got.last().change.resources)
        assertEquals(listOf("own", "resources"), w.stats["last"])
        assertNotNull(w.stats["lastAt"])

        job.cancel()
        advanceUntilIdle()
        assertTrue(job.isCompleted)
    }

    @Test fun `감시 대상 수는 모으기 전에도 status에 실린다`() = runTest {
        val w = watcher(file("own.jar"), file("values.xml"))
        assertEquals(mapOf("watched" to 2, "own" to 1, "resources" to 1), w.stats)
    }

    @Test fun `같은 산출물을 계속 쓰면 마지막 변경 뒤부터 조용한 시간을 센다`() = runTest {
        val own = file("own.jar")
        val w = watcher(own, file("values.xml"))
        w.changes().test {
            runCurrent()
            own.setLastModified(2_000_000)
            advanceTimeBy(2_100)
            runCurrent()
            assertFalse(awaitItem().done)
            repeat(5) { index ->
                own.setLastModified(3_000_000L + index)
                advanceTimeBy(300)
                runCurrent()
                expectNoEvents()
            }
            advanceTimeBy(1_500)
            runCurrent()
            assertTrue(awaitItem().done)
        }
    }

    @Test fun `Kotlin 모듈 표지가 사라지면 디렉터리가 남아 있어도 재생성을 기다린다`() = runTest {
        val output = File(directory.toFile(), "classes").apply { mkdirs() }
        val marker = File(output, "META-INF/app.kotlin_module").apply { parentFile.mkdirs(); writeText("old") }
        val w = watcher(output, file("values.xml"))
        w.changes().test {
            runCurrent()
            marker.delete()
            advanceTimeBy(60_000)
            runCurrent()
            assertFalse(awaitItem().done)
            expectNoEvents()
            assertTrue(output.isDirectory)
            marker.writeText("new")
            advanceTimeBy(2_000)
            runCurrent()
            val done = awaitItem()
            assertTrue(done.done)
            assertEquals(listOf(output), done.change.own)
        }
    }

    @Test fun `산출물 자체가 삭제되면 새 파일이 생길 때까지 완료를 알리지 않는다`() = runTest {
        val own = file("own.jar")
        val w = watcher(own, file("values.xml"))
        w.changes().test {
            runCurrent()
            own.delete()
            advanceTimeBy(10_000)
            runCurrent()
            assertFalse(awaitItem().done)
            expectNoEvents()
            own.writeText("new output")
            advanceTimeBy(2_000)
            runCurrent()
            assertTrue(awaitItem().done)
        }
    }

    @Test fun `같은 시각에 덮어쓴 산출물도 크기가 바뀌면 감지한다`() = runTest {
        val own = file("own.jar")
        val w = watcher(own, file("values.xml"))
        w.changes().test {
            runCurrent()
            own.writeText("different size")
            own.setLastModified(1_000_000)
            advanceTimeBy(4_000)
            runCurrent()
            assertFalse(awaitItem().done)
            assertTrue(awaitItem().done)
        }
    }

    @Test fun `아무것도 안 바뀌면 알리지 않는다`() = runTest {
        val w = watcher(file("own.jar"), file("values.xml"))
        val got = ArrayList<BuildNotice>()
        val job = launch { w.changes().collect { got += it } }
        advanceTimeBy(10_000)
        assertEquals(emptyList<BuildNotice>(), got)
        job.cancel()
    }
}
