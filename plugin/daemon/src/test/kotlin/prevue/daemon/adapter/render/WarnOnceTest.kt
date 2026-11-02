package prevue.daemon.adapter.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class WarnOnceTest {
    @Test fun `여러 번 실패해도 첫 실패 한 줄만 남긴다`() {
        val logs = mutableListOf<String>()
        val warn = WarnOnce("목록을 읽지 못했다") { logs += it }
        warn(IllegalStateException("첫째"))
        warn(IllegalStateException("둘째"))
        assertEquals(listOf("목록을 읽지 못했다: java.lang.IllegalStateException: 첫째"), logs)
    }
}
