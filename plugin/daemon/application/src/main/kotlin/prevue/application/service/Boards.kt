package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.Named
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.yield
import prevue.application.domain.model.Board
import prevue.application.domain.model.BoardFill
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.FocusResult
import prevue.application.domain.model.Postures
import prevue.application.domain.model.Resize
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.Shot
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.SkipReason
import prevue.application.domain.model.phrase
import prevue.application.domain.rule.CardPolicy
import prevue.application.domain.rule.CardPolicy.Decision
import prevue.application.port.RenderOutput
import prevue.application.port.Workspace
import prevue.application.port.WorkspaceEditor

@SingleIn(AppScope::class)
@Inject
class Boards(
    private val ws: Workspace,
    private val engine: Engine,
    private val live: LiveShot,
    private val callers: StaleCallers,
    private val liveService: Live,
    private val scope: CoroutineScope,
    @Named(QUIET) private val quietMs: Long = QUIET_MS,
) {
    private class Filled(val drawn: Int, val renderNs: Long)

    fun fill(by: String, since: Long? = null) {
        val b = ws.now.board ?: return
        val t0 = System.nanoTime()
        scope.launch {
            val filled = drawStale(b, by) ?: return@launch
            engine.awaitWrites()
            val ms = (System.nanoTime() - t0) / 1_000_000
            println("[prevue] 보드 ${b.cards.size}장 채움(새로 ${filled.drawn}장) ${ms}ms(렌더 ${filled.renderNs / 1_000_000}ms) gen=${b.gen}")
            if (since != null && sameRound(b) != null)
                ws.recordFill(BoardFill(since, System.currentTimeMillis() - since, b.cards.size))
        }
    }

    private suspend fun drawStale(b: Board, by: String): Filled? {
        var drawn = 0
        var renderNs = 0L
        var i = 0
        while (i < b.cards.size) {
            val now = sameRound(b)?.takeUnless { ws.now.interactive } ?: return null
            val idx = i++
            if (now.cards[idx].fresh(b.gen)) continue
            val tc = System.nanoTime()
            val r = runCatching { drawCard(idx, false, by, await = false) }.getOrNull()
            renderNs += System.nanoTime() - tc
            if (r is CardResult.Skipped && r.reason == SkipReason.RELOAD) { i = idx; yield(); continue }
            if (r !is CardResult.Skipped) drawn++
        }
        return Filled(drawn, renderNs)
    }

    private fun sameRound(b: Board): Board? = ws.now.board?.takeIf { it.epoch == b.epoch && it.gen == b.gen }

    suspend fun drawCard(index: Int, force: Boolean, by: String, await: Boolean = true): CardResult {
        val pending: Deferred<CardResult> = ws.exclusive { ed ->
            val b = ws.now.board ?: error("보드가 없다 — 파일 경로로 show 한다")
            require(index in b.cards.indices) { "카드 $index 없음 — ${b.cards.size}장" }
            val c = b.cards[index]
            val gen = b.gen
            when (val d = CardPolicy.decide(c.fresh(gen), c.writing(gen) != null, index == b.focus, force, ws.now.interactive, ws.reloadPending)) {
                Decision.Fresh -> CompletableDeferred(when (val r = c.result!!) {
                    is CardResult.Drawn -> r.copy(index = index, cached = true)
                    is CardResult.WriteFailed -> r.copy(index = index, cached = true)
                    else -> r
                })
                Decision.Writing -> c.writing(gen)!!
                is Decision.Skip -> CompletableDeferred(CardResult.Skipped(index, d.reason))
                Decision.Draw -> {
                    val t = System.nanoTime()
                    val out = callers.repair(ed, engine.show(c.spec, ws.now.interactive), c.spec, emptyList())
                    live.dumpOutdated(ed, out)
                    val done = CompletableDeferred<CardResult>()
                    ed.update { s -> s.copy(current = c.spec, board = s.board?.takeIf { it.epoch == b.epoch }?.begin(index, gen, done) ?: s.board) }
                    scope.launch {
                        val r = try { CardResult.Drawn(index, live.shot(out, null, t, by)) }
                                catch (e: Exception) { CardResult.WriteFailed(index, phrase("render.writeFailed", "why" to e)) }
                        ws.recordCard(b.epoch, index, gen, r)
                        done.complete(r)
                    }
                    done
                }
            }
        }
        if (await || pending.isCompleted) return pending.await()
        return CardResult.Pending(index)
    }

    fun startPostures() {
        scope.launch {
            ws.state.map { it.livePostures()?.round }.distinctUntilChanged().collectLatest { round ->
                if (round == null) return@collectLatest
                try { fillPostures(round) } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    System.err.println("[prevue] 자세별 그림을 그리지 못했다: $e")
                }
            }
        }
    }

    private sealed interface PostureStep {
        data object Done : PostureStep
        data object Later : PostureStep
        class Drawn(val d: ScreenSize, val out: RenderOutput, val t: Long) : PostureStep
    }

    private suspend fun fillPostures(round: Long) {
        while (true) {
            val ps = ws.now.livePostures()?.takeIf { it.round == round } ?: return
            val wait = quietMs - quietFor(ps)
            if (wait > 0) { delay(wait); continue }
            when (val s = postureStep(round)) {
                PostureStep.Done -> return
                PostureStep.Later -> delay(quietMs)
                is PostureStep.Drawn -> ws.recordPosture(round, s.d, postureShot(s))
            }
        }
    }

    private suspend fun postureStep(round: Long): PostureStep = ws.exclusive {
        val ps = ws.now.livePostures()?.takeIf { it.round == round } ?: return@exclusive PostureStep.Done
        val (_, shown) = ws.now.shownTarget() ?: return@exclusive PostureStep.Done
        if (ws.reloadPending || quietFor(ps) < quietMs) return@exclusive PostureStep.Later
        val d = ps.next(shown) ?: return@exclusive PostureStep.Done
        val t = System.nanoTime()
        val out = engine.showAside(ps.specOf(d))
        val failed = if (out.ok) "" else " 실패: ${out.message?.text}"
        println("[prevue] 자세 ${d.key} 미리 그림 ${(System.nanoTime() - t) / 1_000_000}ms ${out.width}x${out.height}$failed")
        PostureStep.Drawn(d, out, t)
    }

    private suspend fun postureShot(s: PostureStep.Drawn): Shot = try {
        live.shot(s.out, null, s.t, LiveShot.POSTURE)
    } catch (e: Exception) {
        if (e is CancellationException) throw e
        Shot(s.out.copy(ok = false, message = phrase("render.writeFailed", "why" to e)), null, 0, LiveShot.POSTURE, 0)
    }

    private fun quietFor(ps: Postures): Long = minOf(engine.msSinceInput(), ws.nowMs() - ps.seededAtMs)

    suspend fun focus(index: Int, on: Boolean, by: String, size: ScreenSize? = null): FocusResult = ws.exclusive { ed ->
        val b = ws.now.board
        if (on && size != null && b != null && ws.now.interactive && b.focus == index) FocusResult.On(index, resized(ed, size, by))
        else switchFocus(ed, index, on, by, size)
    }

    private suspend fun resized(ed: WorkspaceEditor, size: ScreenSize, by: String): ShowResult =
        liveService.resizeWithin(ed, size, by) ?: ws.now.lastShown as? ShowResult ?: live.show(ed, ws.now.board!!.focusCard.spec, by)

    suspend fun unfocus(by: String): Unit = ws.exclusive { ed ->
        val b = ws.now.board ?: return@exclusive
        switchFocus(ed, b.focus, on = false, by)
    }

    private suspend fun switchFocus(ed: WorkspaceEditor, index: Int, on: Boolean, by: String, size: ScreenSize? = null): FocusResult {
        val b = ws.now.board ?: error("보드가 없다 — 파일 경로로 show 한다")
        require(index in b.cards.indices) { "카드 $index 없음 — ${b.cards.size}장" }
        require(on || size == null) { "크기는 인터랙티브 카드에만 준다 — --on과 함께" }
        val id = b.cards[index].spec.previewId
        val kept = ws.now.resize?.takeIf { on && size == null && ws.now.interactive && it.previewId == id }
        val sized = size?.takeIf { on && it != ScreenSize.Original }?.let { Resize(id, it) } ?: kept
        ed.update { s -> s.copy(board = s.board?.focusOn(index), focusAttachedAt = null, interactive = on, resize = sized) }
        if (!on) {
            live.fresh(ed, b.cards[index].spec, by)?.let { live.recordFocus(ed, it) }
            fill(by)
            return FocusResult.Off(index)
        }
        val r = try {
            live.show(ed, b.cards[index].spec, by)
        } finally {
            val at = ws.nowMs()
            ed.update { it.copy(focusAttachedAt = at) }
        }
        live.recordFocus(ed, r.shot)
        return FocusResult.On(index, r)
    }

    companion object {
        const val QUIET_MS = 1_000L
        const val QUIET = "postureQuietMs"
    }
}
