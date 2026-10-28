package prevue.daemon.adapter.render

// 외부: layoutlib 17 세션 시계는 직전 setNanosTime 과의 델타를 누적한다 — 같은 값을 두 번 넘기면 시계가 멈춘다
class SessionClock {
    private var lastReal = System.nanoTime()
    private var last = START
    private var stepped = false

    fun next(): Long {
        val now = System.nanoTime()
        val dt = if (stepped) MIN_STEP else (now - lastReal).coerceIn(MIN_STEP, MAX_SLEEP_JUMP)
        lastReal = now
        last += dt
        return last
    }

    fun step(nanos: Long): Long {
        stepped = true
        lastReal = System.nanoTime()
        last += maxOf(nanos, MIN_STEP)
        return last
    }

    private companion object {
        const val START = 1_000_000_000L
        const val MIN_STEP = 1_000L
        const val MAX_SLEEP_JUMP = 100_000_000L
    }
}
