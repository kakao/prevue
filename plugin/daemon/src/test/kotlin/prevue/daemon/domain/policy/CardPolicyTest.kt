package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.daemon.domain.model.SkipReason
import prevue.daemon.domain.policy.CardPolicy.Decision

/** 카드를 지금 그려도 되나. 스레드도 렌더러도 없이 판정 하나씩. */
class CardPolicyTest {
    @Test fun `force는 신선도만 무시하고 인터랙티브와 저장 우선은 무시하지 않는다`() {
        assertEquals(Decision.Fresh, CardPolicy.decide(fresh = true, writing = false, isFocus = false, force = false, interactive = true, savePending = true))
        assertEquals(Decision.Writing, CardPolicy.decide(fresh = false, writing = true, isFocus = false, force = false, interactive = false, savePending = false))
        assertEquals(Decision.Skip(SkipReason.INTERACTIVE), CardPolicy.decide(fresh = true, writing = false, isFocus = false, force = true, interactive = true, savePending = false))
        assertEquals(Decision.Skip(SkipReason.RELOAD), CardPolicy.decide(fresh = false, writing = false, isFocus = true, force = true, interactive = true, savePending = true))
        assertEquals(Decision.Draw, CardPolicy.decide(fresh = false, writing = false, isFocus = true, force = false, interactive = true, savePending = false))
    }
}
