package prevue.daemon.fake

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class LaneSpyTest {
    // 실제 시간으로 가면 advanceTimeBy 가 깨우지 못해 끝나 있지 않다 — 기다리지 않고 바로 실패한다.
    @Test fun `가상 시계를 감싼 스파이와 그 뷰 아래 delay 는 가상 시간으로 간다`() = runTest {
        val spy = LaneSpy(StandardTestDispatcher(testScheduler))
        val lanes = listOf(spy, spy.limitedParallelism(1, "lane"))
        val jobs = lanes.map { launch(it) { delay(1_000) } }
        runCurrent()
        assertTrue(jobs.none { it.isCompleted }, "시간을 밀기 전에 끝났다")
        advanceTimeBy(1_001)
        assertTrue(jobs.all { it.isCompleted }, "가상 시간을 밀어도 끝나지 않았다 — 스파이가 Delay 를 넘기지 않는다")
        assertTrue(spy.view("lane").dispatched > 0, "뷰에서 돌지 않았다")
    }

    @Test fun `뷰에서 청한 뷰도 뿌리의 lanes 에 잡힌다`() {
        val root = LaneSpy(Dispatchers.Default)
        val nested = root.limitedParallelism(2, "a").limitedParallelism(1, "b")
        root.limitedParallelism(3, "c")
        assertEquals(listOf(2 to "a", 1 to "b", 3 to "c"), root.lanes())
        assertSame(nested, root.view("b"))
        assertEquals(listOf(1 to "b"), root.view("a").lanes())
    }
}
