package prevue.daemon.domain

import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

/**
 * 읽기 전에 PNG·트리를 지금 화면으로 맞춘다 — 에이전트의 status와 뷰어의 가리키기가 부른다.
 * live가 쓴 뒤로 바뀌지 않았으면 그리지 않는다(null). 인터랙티브 밖에서는 렌더할 때마다 쓰므로 대개 null이다.
 */
class CatchUpUseCase(private val ws: Workspace, private val live: LiveShot) {
    suspend operator fun invoke(by: String): ShowResult? = ws.exclusive { ed ->
        if (ws.now.current == null) null else live.catchUp(ed, by)
    }
}
