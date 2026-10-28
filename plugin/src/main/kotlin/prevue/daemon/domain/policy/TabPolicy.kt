package prevue.daemon.domain.policy

import prevue.daemon.domain.model.Tab

/** 뷰어 탭의 상한과 옮겨 갈 자리(D-54). */
object TabPolicy {
    /** 메모리가 아니라 탭 줄이 읽히는 한계다 — 숨은 탭은 보드 값만 쥔다. */
    const val LIMIT = 10

    /** 새 탭을 연 뒤 상한을 넘었는가 — 넘으면 지금 보는 탭 말고 가장 오래 안 본 탭을 닫는다. 열기가 실패하면 아무것도 닫지 않게 연 뒤에 본다. */
    fun evict(tabs: List<Tab>, active: String?): Tab? =
        if (tabs.size <= LIMIT) null else tabs.filter { it.key != active }.minByOrNull { it.seenAtMs }

    /** 지금 보던 탭을 닫으면 직전에 보던 탭으로 간다. */
    fun next(tabs: List<Tab>, closing: String): Tab? = tabs.filter { it.key != closing }.maxByOrNull { it.seenAtMs }
}
