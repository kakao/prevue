package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SessionClockTest {
    @Test
    fun `advance 로 민 뒤에도 다음 틱은 실제 경과 시간을 따른다 — scroll 한 번이 세션 애니메이션을 멈추지 않는다`() {
        val clock = SessionClock()
        clock.next()
        val stepped = clock.advance(16_000_000)
        Thread.sleep(20)
        assertTrue(clock.next() - stepped >= 15_000_000, "advance 뒤 next 가 걸음 시계(1µs)에 묶였다")
    }

    @Test
    fun `step 은 걸음 모드라 다음 틱이 1µs 만 민다`() {
        val clock = SessionClock()
        val stepped = clock.step(16_000_000)
        Thread.sleep(20)
        assertEquals(1_000L, clock.next() - stepped)
    }
}
