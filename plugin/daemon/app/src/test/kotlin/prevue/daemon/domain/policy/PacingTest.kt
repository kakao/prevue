package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.domain.port.Frame

/** D-78. 틱 간격과 정착 판정 — 시각을 넣어 주면 같은 답을 낸다. */
class PacingTest {
    private val still = Frame(false, false, null, 1, 0, 0)
    private val idle = Frame(false, true, null, 0, 0, 0)
    private val moving = Frame(true, false, null, 0, 0, 0)

    private fun run(p: Pacing, f: Frame, from: Long, until: Long): List<Pacing.Step> {
        val out = ArrayList<Pacing.Step>()
        var t = from
        while (t < until) { val s = p.record(f, t); out += s; t += s.intervalMs }
        return out
    }

    @Test fun `그림이 멎은 지 오래될수록 틱을 늦춘다`() {
        val p = Pacing(0)
        val steps = run(p, still, 0, 4_000)
        assertEquals(listOf(Pacing.FAST_MS, Pacing.MEDIUM_MS, Pacing.SLOW_MS), steps.map { it.intervalMs }.distinct())
        assertTrue(steps.none { it.settled }, "큐가 안 비면 정착하지 않는다")
    }

    @Test fun `손을 대면 다시 빠르게 돈다`() {
        val p = Pacing(0)
        run(p, still, 0, 3_000)
        p.input(3_000, "touch:drag")
        assertEquals(Pacing.FAST_MS, p.record(still, 3_000).intervalMs)
    }

    @Test fun `잠잠 100ms면 정착하고 누르고 있으면 3초를 기다린다`() {
        val p = Pacing(0)
        assertFalse(p.record(moving, 0).settled)
        val calm = run(p, idle, 16, 400)
        assertEquals(7, calm.indexOfFirst { it.settled } + 1)

        val held = Pacing(0).apply { input(0, "touch:press", pointer = true) }
        assertTrue(held.pointerDown)
        val steps = run(held, idle, 0, 3_200)
        val at = steps.indexOfFirst { it.settled }
        assertTrue(at > 0 && at * Pacing.FAST_MS >= Pacing.POINTER_IDLE_MS - Pacing.FAST_MS, "$at")
    }

    @Test fun `바뀐 뒤 멎으면 쉰 그림을 한 번만 낸다`() {
        val p = Pacing(0)
        p.record(moving, 0)
        val steps = run(p, still, 16, 1_000)
        assertEquals(1, steps.count { it.rest })
    }

    @Test fun `입력은 잠잠한 시간을 처음부터 다시 센다`() {
        val p = Pacing(0)
        run(p, idle, 0, 80)
        p.input(80, "touch:tap")
        val after = run(p, idle, 80, 300)
        assertEquals(7, after.indexOfFirst { it.settled } + 1)
        assertTrue(p.trace.any { it["wake"] == "touch:tap" })
    }
}
