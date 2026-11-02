package prevue.daemon.domain.policy

import prevue.daemon.domain.port.BuildChange

/**
 * 소스 밖의 변화를 **우리가 닫을 수 있는 것과 없는 것**으로 가른다 — AS의 "Out of date" 배지는 둘을 한 덩어리로 묶고 버튼이 Gradle을 부르지만,
 * 우리는 Gradle을 안 부르는 것이 정체성이다. 못 닫는 것(리소스 · 빌드 파일)의 낡음은 이 판정과 따로 늘 세운다([StaleReasons]).
 */
object ExternalPolicy {
    sealed interface Plan {
        /** 산출물은 그대로다 — 세운 낡음만 남긴다. */
        data object Noted : Plan
        data object NoPreview : Plan
        data object OutputsGone : Plan
        /** 빌드가 아직 쓰는 중이다. 반쯤 쓰인 산출물로 그리지 않는다. */
        data object BuildPending : Plan
        /** 다 썼다 — 스스로 닫는다. 다시 빌드된 모듈([clear])의 오버레이는 Gradle 산출물보다 옛것이다. 나머지 모듈의 편집은 남긴다(Q6). */
        data class Redraw(val clear: List<String>) : Plan
    }

    /** [rebuilt]는 산출물이 다시 빌드된 감시 모듈들이다(`ModuleGraph.builtBy`). */
    fun plan(change: BuildChange, done: Boolean, hasPreview: Boolean, outputsExist: Boolean, rebuilt: List<String> = emptyList()): Plan = when {
        change.built.isEmpty() -> Plan.Noted
        !hasPreview -> Plan.NoPreview
        !done -> Plan.BuildPending
        !outputsExist -> Plan.OutputsGone
        else -> Plan.Redraw(clear = rebuilt)
    }
}
