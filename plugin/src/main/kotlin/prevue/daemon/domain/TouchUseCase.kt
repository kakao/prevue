package prevue.daemon.domain

import prevue.daemon.domain.model.Aim
import prevue.daemon.domain.model.Miss
import prevue.daemon.domain.model.TouchResult
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.policy.NodeTarget
import prevue.daemon.domain.policy.Aiming
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.domain.runtime.WorkspaceEditor

class TouchUseCase(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val live: LiveShot,
) {
    suspend operator fun invoke(type: String, x: Int, y: Int, by: String, settle: Boolean): TouchResult = ws.exclusive { ed ->
        val t = System.nanoTime()
        live.session(ed, t, by)?.let { return@exclusive TouchResult.Settled(it) }
        press(ed, Press(type, x, y, by, settle, t), aim = null)
    }

    suspend fun at(at: String, type: String, by: String, settle: Boolean): TouchResult = ws.exclusive { ed ->
        val spec = NodeTarget.parse(at) ?: return@exclusive TouchResult.Missed(Miss.BadAt(at))
        val t = System.nanoTime()
        live.session(ed, t, by)?.let { return@exclusive TouchResult.Settled(it) }
        val look = engine.look()
        if (!look.out.ok) return@exclusive TouchResult.Settled(live.finish(ed, look.out, null, t, by))
        when (val target = Aiming.aim(at, spec, look.tree)) {
            is Aiming.Target.Missed -> TouchResult.Missed(target.miss)
            is Aiming.Target.Hit -> press(ed, Press(type, target.aim.x, target.aim.y, by, settle, t), target.aim)
        }
    }

    private class Press(val type: String, val x: Int, val y: Int, val by: String, val settle: Boolean, val t: Long)

    private suspend fun press(ed: WorkspaceEditor, p: Press, aim: Aim?): TouchResult {
        val seq = engine.touch(p.type, p.x, p.y)
        if (!p.settle) return TouchResult.Sent(p.type, p.x, p.y, p.by).also { ws.emit(WorkspaceEvent.Touched(p.type, p.by)) }
        return TouchResult.Settled(live.settled(ed, engine.settled(seq), p.t, p.by), aim)
    }
}
