package prevue.daemon.domain

import prevue.daemon.entity.phrase
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import prevue.daemon.domain.model.Postures
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.Shot
import prevue.daemon.domain.port.RenderOutput
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

class DrawPosturesUseCase(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val live: LiveShot,
    scope: CoroutineScope,
    private val quietMs: Long = QUIET_MS,
) {
    init {
        scope.launch {
            ws.state.map { it.livePostures()?.round }.distinctUntilChanged().collectLatest { round ->
                if (round == null) return@collectLatest
                try { fill(round) } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    System.err.println("[prevue] 자세별 그림을 그리지 못했다: $e")
                }
            }
        }
    }

    private sealed interface Step {
        data object Done : Step
        data object Later : Step
        class Drawn(val d: ScreenSize, val out: RenderOutput, val t: Long) : Step
    }

    private suspend fun fill(round: Long) {
        while (true) {
            val ps = ws.now.livePostures()?.takeIf { it.round == round } ?: return
            val wait = quietMs - quietFor(ps)
            if (wait > 0) { delay(wait); continue }
            when (val s = step(round)) {
                Step.Done -> return
                Step.Later -> delay(quietMs)
                is Step.Drawn -> ws.recordPosture(round, s.d, shot(s))
            }
        }
    }

    private suspend fun step(round: Long): Step = ws.exclusive {
        val ps = ws.now.livePostures()?.takeIf { it.round == round } ?: return@exclusive Step.Done
        val (_, shown) = ws.now.shownTarget() ?: return@exclusive Step.Done
        if (ws.reloadPending || quietFor(ps) < quietMs) return@exclusive Step.Later
        val d = ps.next(shown) ?: return@exclusive Step.Done
        val t = System.nanoTime()
        val out = engine.showAside(ps.specOf(d))
        val failed = if (out.ok) "" else " 실패: ${out.message?.text}"
        println("[prevue] 자세 ${d.key} 미리 그림 ${(System.nanoTime() - t) / 1_000_000}ms ${out.width}x${out.height}$failed")
        Step.Drawn(d, out, t)
    }

    private suspend fun shot(s: Step.Drawn): Shot = try {
        live.shot(s.out, null, s.t, LiveShot.POSTURE)
    } catch (e: Exception) {
        if (e is CancellationException) throw e
        Shot(s.out.copy(ok = false, message = phrase("render.writeFailed", "why" to e)), null, 0, LiveShot.POSTURE, 0)
    }

    private fun quietFor(ps: Postures): Long = minOf(engine.msSinceInput(), ws.nowMs() - ps.seededAtMs)

    companion object {
        const val QUIET_MS = 1_000L
    }
}
