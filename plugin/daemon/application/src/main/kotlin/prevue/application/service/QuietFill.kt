package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.Named
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import prevue.application.domain.model.BoardEpoch
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.Shot
import prevue.application.domain.model.WorkspaceState
import prevue.application.domain.model.phrase
import prevue.application.port.RenderOutput

@SingleIn(AppScope::class)
@Inject
class QuietFill(
    private val ws: Workspace,
    private val engine: Engine,
    private val live: LiveShot,
    private val boards: Boards,
    private val scope: CoroutineScope,
    @Named(QUIET) private val quietMs: Long = QUIET_MS,
) {
    fun start() {
        scope.launch {
            ws.state.map(::roundOf).distinctUntilChanged().collectLatest { round ->
                if (round == null) return@collectLatest
                try { fill(round) } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    System.err.println("[prevue] 조작 중 옆 그림을 그리지 못했다: $e")
                }
            }
        }
    }

    private data class Round(val epoch: BoardEpoch, val gen: Int, val focus: Int, val postures: Long?, val shown: ScreenSize?)

    private fun roundOf(s: WorkspaceState): Round? =
        s.board?.takeIf { s.interactive }?.let { Round(it.epoch, it.gen, it.focus, s.livePostures()?.round, s.shownTarget()?.second) }

    private sealed interface Step {
        data object Done : Step
        data object Later : Step
        class Posture(val round: Long, val d: ScreenSize, val out: RenderOutput, val t: Long) : Step
        class Missed(val round: Long, val d: ScreenSize, val why: String?) : Step
        class Card(val next: Int) : Step
    }

    private suspend fun fill(round: Round) {
        var from = 0
        while (true) {
            val wait = quietMs - quietFor()
            if (wait > 0) { delay(wait); continue }
            when (val s = step(round, from)) {
                Step.Done -> return
                Step.Later -> delay(quietMs)
                is Step.Posture -> ws.recordPosture(s.round, s.d, postureShot(s))
                is Step.Missed -> {
                    System.err.println("[prevue] 자세 ${s.d.key} 그림을 그리지 못했다: ${s.why}")
                    ws.recordMiss(s.round, s.d)
                }
                is Step.Card -> from = s.next
            }
        }
    }

    private suspend fun step(round: Round, from: Int): Step = ws.exclusive { ed ->
        if (roundOf(ws.now) != round) return@exclusive Step.Done
        if (ws.reloadPending || quietFor() < quietMs) return@exclusive Step.Later
        postureStep()?.let { return@exclusive it }
        boards.startNextAside(ed, from, QUIET_BY)?.let { Step.Card(it + 1) } ?: Step.Done
    }

    private suspend fun postureStep(): Step? {
        val ps = ws.now.livePostures() ?: return null
        val (_, shown) = ws.now.shownTarget() ?: return null
        val d = ps.next(shown) ?: return null
        val t = System.nanoTime()
        val out = try { engine.showAside(ps.specOf(d)) } catch (e: Exception) {
            if (e is CancellationException) throw e
            return Step.Missed(ps.round, d, e.toString())
        }
        if (!out.ok) return Step.Missed(ps.round, d, out.message?.text)
        println("[prevue] 자세 ${d.key} 미리 그림 ${(System.nanoTime() - t) / 1_000_000}ms ${out.width}x${out.height}")
        return Step.Posture(ps.round, d, out, t)
    }

    private suspend fun postureShot(s: Step.Posture): Shot = try {
        live.shot(s.out, null, s.t, LiveShot.POSTURE)
    } catch (e: Exception) {
        if (e is CancellationException) throw e
        Shot(s.out.copy(ok = false, message = phrase("render.writeFailed", "why" to e)), null, 0, LiveShot.POSTURE, 0)
    }

    private fun quietFor(): Long = minOf(engine.msSinceInput(), ws.nowMs() - ws.now.lastRenderMs)

    companion object {
        const val QUIET_MS = 1_000L
        const val QUIET = "quietMs"
        const val QUIET_BY = "aside"
    }
}
