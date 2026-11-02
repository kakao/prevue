package prevue.daemon.domain

import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

/** 보여 주는 한 장을 새 태스크로 다시 그린다 — 앞의 터치·시계 진행을 버리고 처음 상태로. */
class ShowPreviewUseCase(private val ws: Workspace, private val live: LiveShot) {
    suspend operator fun invoke(by: String): ShowResult = ws.exclusive { ed ->
        live.show(ed, ws.now.current ?: error("보여 주는 프리뷰가 없다 — 먼저 show"), by)
    }
}
