package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class RendererLeaseTest {
    @Test fun `놓으면 건 해제를 한 번 돌리고 다시 놓아도 돌리지 않는다`() {
        val lease = RendererLease()
        var released = 0
        lease.onRelease { released++ }
        lease.release()
        lease.release()
        lease.releaseQuietly()
        assertEquals(1, released)
        assertTrue(lease.released)
    }

    @Test fun `해제가 던져도 조용히 놓기는 임대를 놓은 채 끝나고 나머지 해제도 돈다`() {
        val lease = RendererLease()
        var other = 0
        lease.onRelease { other++ }
        lease.onRelease { error("해제 실패") }
        lease.releaseQuietly()
        assertTrue(lease.released)
        assertEquals(1, other)
    }
}
