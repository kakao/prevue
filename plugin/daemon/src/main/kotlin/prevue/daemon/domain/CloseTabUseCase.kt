package prevue.daemon.domain

import prevue.daemon.domain.model.CloseResult
import prevue.daemon.domain.model.VacantTab
import prevue.daemon.domain.policy.TabPolicy
import prevue.daemon.domain.runtime.Tabs
import prevue.daemon.domain.runtime.Workspace

/** D-54. 탭을 닫는다(`prevue close` · 뷰어 ×). 지금 보던 탭이면 직전에 보던 탭으로 옮기고, 남은 탭이 없으면 빈 화면이다. */
class CloseTabUseCase(private val ws: Workspace, private val tabs: Tabs) {
    suspend operator fun invoke(target: String, by: String): CloseResult = ws.exclusive { ed ->
        val key = tabs.keyOf(target)
        val tab = tabs.find(key) ?: error("열린 탭이 아니다: $target")
        val wasActive = key == ws.now.activeTab
        tabs.drop(ed, tab)
        if (wasActive) TabPolicy.next(ws.now.tabs, key)?.let {
            try { tabs.activate(ed, it.key, null, emptyMap(), by) } catch (_: VacantTab) {}   // 옮겨 간 탭이 비었다 — 빈 화면이 답이다
        }
        CloseResult(key, ws.now.activeTab, ws.now.tabViews(ws.graph))
    }
}
