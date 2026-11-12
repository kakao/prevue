package prevue.application.domain.rule

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.application.domain.model.SkipReason
import prevue.application.domain.rule.CardPolicy.Decision

/** 카드를 지금 그려도 되나. 스레드도 렌더러도 없이 판정 하나씩. */
class CardPolicyTest {
    @Test fun `force는 신선도만 무시하고 저장 우선은 무시하지 않는다 — 조작 중 다른 카드는 옆 태스크로 그린다`() {
        assertEquals(Decision.Fresh, CardPolicy.decide(fresh = true, writing = false, isFocus = false, force = false, interactive = true, savePending = true))
        assertEquals(Decision.Writing, CardPolicy.decide(fresh = false, writing = true, isFocus = false, force = false, interactive = false, savePending = false))
        assertEquals(Decision.Aside, CardPolicy.decide(fresh = true, writing = false, isFocus = false, force = true, interactive = true, savePending = false))
        assertEquals(Decision.Skip(SkipReason.RELOAD), CardPolicy.decide(fresh = false, writing = false, isFocus = false, force = false, interactive = true, savePending = true))
        assertEquals(Decision.Skip(SkipReason.RELOAD), CardPolicy.decide(fresh = false, writing = false, isFocus = true, force = true, interactive = true, savePending = true))
        assertEquals(Decision.Draw, CardPolicy.decide(fresh = false, writing = false, isFocus = true, force = false, interactive = true, savePending = false))
    }
}
