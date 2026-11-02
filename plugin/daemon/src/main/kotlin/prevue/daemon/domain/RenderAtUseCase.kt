package prevue.daemon.domain

import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

/** FR-5. 새 태스크에서 시계를 ms만큼 결정적으로 진행시킨 한 장. 시작점이 같아야 재현되므로 매번 새 태스크부터 한다. */
class RenderAtUseCase(private val ws: Workspace, private val engine: EngineActor, private val live: LiveShot) {
    suspend operator fun invoke(ms: Long, by: String): ShowResult = ws.exclusive { ed ->
        val p = ws.now.current ?: error("보여 주는 프리뷰가 없다 — 먼저 show")
        val t = System.nanoTime()
        live.rendering(ed, p, by)
        val out = engine.renderAt(p, ms)
        live.finish(ed, out, null, t, by) { if (out.ok) it.copy(atMs = ms) else it }
    }
}
