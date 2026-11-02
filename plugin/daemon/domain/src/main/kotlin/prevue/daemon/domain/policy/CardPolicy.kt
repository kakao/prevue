package prevue.daemon.domain.policy

import prevue.daemon.domain.model.SkipReason

/** 보드의 카드 한 장을 지금 그려도 되는가. 렌더 태스크가 하나뿐이고 저장이 카드보다 먼저라는 두 사실에서 나온다. */
object CardPolicy {
    sealed interface Decision {
        /** 같은 세대의 그림이 있다 — 다시 그리지 않는다. */
        data object Fresh : Decision
        /** 같은 세대의 그림이 디스크로 가는 중이다 — 그것을 기다린다. */
        data object Writing : Decision
        data class Skip(val reason: SkipReason) : Decision
        data object Draw : Decision
    }

    /**
     * [force]는 신선도만 무시하고 아래 두 규칙은 무시하지 않는다.
     * - 인터랙티브 중에는 focus 밖의 카드를 그리지 않는다 — 카드 하나를 그리면 사람이 만지던 인터랙션 상태가 통째로 사라진다.
     * - 저장이 기다리면 카드가 물러난다 — 락은 먼저 온 순서지만 그 전에 줄 선 카드가 저장 → 화면에 붙으면 안 된다(2026-09-23 실측 대기 250~440ms).
     */
    fun decide(fresh: Boolean, writing: Boolean, isFocus: Boolean, force: Boolean, interactive: Boolean, savePending: Boolean): Decision = when {
        !force && fresh -> Decision.Fresh
        !force && writing -> Decision.Writing
        interactive && !isFocus -> Decision.Skip(SkipReason.INTERACTIVE)
        savePending -> Decision.Skip(SkipReason.RELOAD)
        else -> Decision.Draw
    }
}
