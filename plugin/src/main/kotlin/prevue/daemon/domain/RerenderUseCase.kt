package prevue.daemon.domain

import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

/** 코드가 바뀌지 않았을 때 — 보여 주는 한 장을 같은 태스크로 다시 그린다. */
class RerenderUseCase(private val ws: Workspace, private val engine: EngineActor, private val live: LiveShot) {
    suspend operator fun invoke(by: String): ShowResult = ws.exclusive { ed ->
        val p = ws.now.current ?: error("보여 주는 프리뷰가 없다 — 먼저 show")
        val t = System.nanoTime()
        live.finish(ed, engine.rerender(p), null, t, by).also { ed.update { it.copy(current = p) } }
    }
}
