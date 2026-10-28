package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** 이 저장이 들어갔나. 스레드도 렌더러도 없이 판정 하나씩. */
class AwaitPolicyTest {
    @Test fun `연 뒤로 안 바뀐 파일은 연 그림이고 뒤로 간 mtime은 요청 뒤의 컴파일만 믿는다`() {
        assertTrue(AwaitPolicy.compiled(mtime = 100, compiled = null, openedAtMs = 200, requestedAtMs = 300))
        assertFalse(AwaitPolicy.compiled(mtime = 300, compiled = null, openedAtMs = 200, requestedAtMs = 300))
        assertTrue(AwaitPolicy.compiled(mtime = 40, compiled = 40L to 10L, openedAtMs = 0, requestedAtMs = 500))
        assertFalse(AwaitPolicy.compiled(mtime = 40, compiled = 50L to 10L, openedAtMs = 0, requestedAtMs = 500))   // 옛 컴파일이 더 새 mtime을 읽었다
        assertTrue(AwaitPolicy.compiled(mtime = 40, compiled = 60L to 600L, openedAtMs = 0, requestedAtMs = 500))
    }
}
