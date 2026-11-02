package prevue.daemon.domain.policy

import prevue.daemon.domain.port.Frame

class Pacing(private val startMs: Long) {
    private var frames = 0
    private var tickMs = 0L
    private var stillMs = 0L
    private var idleMs = 0L
    private var lastInputMs = startMs
    private var firstChangeMs = -1L
    private var firstChangeTick = -1
    private var restDue = false
    var pointerDown = false
        private set
    var changedAny = false
        private set
    private val traceLog = ArrayList<Map<String, Any?>>()
    val trace: List<Map<String, Any?>> get() = traceLog

    class Step(val intervalMs: Long, val rest: Boolean, val settled: Boolean, val calm: Boolean)

    fun input(at: Long, reason: String, pointer: Boolean? = null) {
        lastInputMs = at
        idleMs = 0
        pointer?.let { pointerDown = it }
        mark(at, reason)
    }

    fun mark(at: Long, reason: String) {
        if (traceLog.size < TRACE_MAX) traceLog += mapOf("ms" to at - startMs, "wake" to reason)
    }

    fun record(f: Frame, at: Long): Step {
        frames++
        tickMs += f.ms
        val interval = intervalMs(handsOn = pointerDown || at - lastInputMs < HOT_MS)
        var rest = if (f.changed) changed(at) else still(f, interval)
        if (traceLog.size < TRACE_MAX) {
            traceLog += mapOf("ms" to at - startMs, "n" to frames, "changed" to f.changed,
                "hq" to f.handlerQueue, "cq" to f.choreographerQueue, "tickMs" to f.ms, "gapMs" to interval)
        }
        val calm = idleMs >= SETTLE_MS
        val settled = calm && idleMs >= if (pointerDown) POINTER_IDLE_MS else SETTLE_MS
        if (settled && restDue) { rest = true; restDue = false }
        return Step(interval, rest, settled, calm)
    }

    private fun changed(at: Long): Boolean {
        if (firstChangeMs < 0) { firstChangeMs = at - startMs; firstChangeTick = frames }
        changedAny = true
        idleMs = 0
        stillMs = 0
        restDue = true
        return false
    }

    private fun still(f: Frame, interval: Long): Boolean {
        stillMs += interval
        if (f.idle) idleMs += interval
        if (!restDue || stillMs < REST_MS) return false
        restDue = false
        return true
    }

    fun sinceInput(at: Long) = at - lastInputMs

    fun stats(at: Long): Map<String, Any?> = mapOf(
        "frames" to frames, "tickMs" to tickMs, "burstMs" to at - startMs,
        "firstChangeMs" to firstChangeMs, "firstChangeTick" to firstChangeTick,
    )

    private fun intervalMs(handsOn: Boolean) = when {
        stillMs < HOT_MS || handsOn -> FAST_MS
        stillMs < WARM_MS -> MEDIUM_MS
        else -> SLOW_MS
    }

    companion object {
        const val HOT_MS = 500L
        const val SETTLE_MS = 100L
        const val POINTER_IDLE_MS = 3_000L
        const val WARM_MS = 2_000L
        const val REST_MS = 100L
        const val FAST_MS = 1000L / 60
        const val MEDIUM_MS = 1000L / 30
        const val SLOW_MS = 100L
        const val UNWATCHED_MS = 3_000L
        private const val TRACE_MAX = 300
    }
}
