package prevue.daemon.domain

import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.model.TabMove
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.policy.TabPolicy
import prevue.daemon.domain.runtime.Tabs
import prevue.daemon.domain.runtime.Workspace

/**
 * FR-1·17 · D-54. 파일이나 FQN을 탭으로 연다 — 없으면 새 탭, 있으면 그 탭으로 옮긴다. 지금 탭을 바꿔 끼우지 않는다:
 * 화면 파일과 하위 컴포넌트 파일을 함께 고칠 때 상위 화면이 사라지지 않게. 파일이면 그 파일의 프리뷰 전부로 보드를 만들고
 * focus 한 장을 그린 뒤 나머지를 채운다. FQN이면 보드 없이 한 장이다. `--param`은 그 탭 전체에 건다 — 사람이 파일을 다크로 보겠다고 하면 카드 전부가 그 뜻이다.
 * 선택은 지우지 않는다 — `파일:라인`은 탭이 바뀌어도 맞는 정보다.
 * [since]는 이 열기가 시작된 시각(epoch ms) — 데몬을 띄우며 연 것이면 조립이 JVM 시작을 준다(뷰어의 콜드 시간, D-63).
 */
class OpenPreviewUseCase(private val ws: Workspace, private val tabs: Tabs) {
    suspend operator fun invoke(target: String, index: Int?, params: Map<String, String>, by: String, since: Long? = null): ShowResult = ws.exclusive { ed ->
        val key = tabs.keyOf(target)
        val move = if (tabs.find(key) == null) TabMove.OPENED else TabMove.SWITCHED
        val r = tabs.activate(ed, key, index, params, by, since)
        val evicted = TabPolicy.evict(ws.now.tabs, ws.now.activeTab)?.also { tabs.drop(ed, it) }
        evicted?.let { ws.emit(WorkspaceEvent.TabEvicted(it)) }
        r.copy(tab = move, closedTab = evicted?.key)
    }
}
