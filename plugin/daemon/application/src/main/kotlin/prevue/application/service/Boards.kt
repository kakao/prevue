package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.yield
import prevue.application.domain.model.Board
import prevue.application.domain.model.BoardFill
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.FocusResult
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.Resize
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.SkipReason
import prevue.application.domain.model.phrase
import prevue.application.domain.rule.CardPolicy
import prevue.application.domain.rule.CardPolicy.Decision

@SingleIn(AppScope::class)
@Inject
class Boards(
    private val ws: Workspace,
    private val engine: Engine,
    private val live: LiveShot,
    private val callers: StaleCallers,
    private val liveService: Live,
    private val scope: CoroutineScope,
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
            startCard(ed, b, index, force, by)
        }
        if (await || pending.isCompleted) return pending.await()
        return CardResult.Pending(index)
    }

    internal suspend fun startNextAside(ed: WorkspaceEditor, from: Int, by: String): Int? {
        val b = ws.now.board ?: return null
        val idx = (from until b.cards.size).firstOrNull { it != b.focus && !b.cards[it].fresh(b.gen) && b.cards[it].writing(b.gen) == null }
            ?: return null
        val t = System.nanoTime()
        startCard(ed, b, idx, force = false, by)
        println("[prevue] 조작 중 카드 $idx 옆 그림 ${(System.nanoTime() - t) / 1_000_000}ms gen=${b.gen}")
        return idx
    }

    private suspend fun startCard(ed: WorkspaceEditor, b: Board, index: Int, force: Boolean, by: String): Deferred<CardResult> {
        val c = b.cards[index]
        val gen = b.gen
        return when (val d = CardPolicy.decide(c.fresh(gen), c.writing(gen) != null, index == b.focus, force, ws.now.interactive, ws.reloadPending)) {
            Decision.Fresh -> CompletableDeferred(when (val r = c.result!!) {
                is CardResult.Drawn -> r.copy(index = index, cached = true)
                is CardResult.WriteFailed -> r.copy(index = index, cached = true)
                else -> r
            })
            Decision.Writing -> c.writing(gen)!!
            is Decision.Skip -> CompletableDeferred(CardResult.Skipped(index, d.reason))
            Decision.Draw -> draw(ed, b, index, aside = false, by)
            Decision.Aside -> draw(ed, b, index, aside = true, by)
        }
    }

    private suspend fun draw(ed: WorkspaceEditor, b: Board, index: Int, aside: Boolean, by: String): Deferred<CardResult> {
        val c = b.cards[index]
        val gen = b.gen
        val t = System.nanoTime()
        val out = if (aside) engine.showAside(c.spec, tree = true)
                  else callers.repair(ed, engine.show(c.spec, ws.now.interactive), c.spec, emptyList())
        if (aside && callers.ours(out)) {
            ed.updateBoard(b.epoch) { it.forget(listOf(index)) }
            return CompletableDeferred(CardResult.Skipped(index, SkipReason.INTERACTIVE))
        }
        live.dumpOutdated(ed, out)
        val done = CompletableDeferred<CardResult>()
        ed.update { s ->
            s.copy(current = if (aside) s.current else c.spec, board = s.board?.takeIf { it.epoch == b.epoch }?.begin(index, gen, done) ?: s.board)
        }
        scope.launch {
            val r = try { CardResult.Drawn(index, live.shot(out, null, t, by)) }
                    catch (e: Exception) { CardResult.WriteFailed(index, phrase("render.writeFailed", "why" to e)) }
            ws.recordCard(b.epoch, index, gen, r)
            done.complete(r)
        }
        return done
    }

    suspend fun focus(index: Int, on: Boolean, by: String, size: ScreenSize? = null): FocusResult = ws.exclusive { ed ->
        val b = ws.now.board
        if (on && size != null && b != null && ws.now.interactive && b.focus == index) FocusResult.On(index, resized(ed, size, by))
        else switchFocus(ed, index, on, by, size)
    }

    private suspend fun resized(ed: WorkspaceEditor, size: ScreenSize, by: String): ShowResult =
        liveService.resizeWithin(ed, size, by) ?: ws.now.lastShown as? ShowResult ?: live.show(ed, ws.now.board!!.focusCard.spec, by)

    suspend fun unfocus(by: String): Unit = ws.exclusive { ed -> leave(ed, by) }

    internal suspend fun leave(ed: WorkspaceEditor, by: String) {
        val b = ws.now.board ?: return
        switchFocus(ed, b.focus, on = false, by)
    }

    private suspend fun switchFocus(ed: WorkspaceEditor, index: Int, on: Boolean, by: String, size: ScreenSize? = null): FocusResult {
        require(on || size == null) { "크기는 인터랙티브 카드에만 준다 — --on과 함께" }
        if (on) return FocusResult.On(index, enter(ed, index, by, size))
        val b = boardWith(index)
        ed.update { s -> s.copy(board = s.board?.focusOn(index), focusAttachedAt = null, interactive = false, resize = null) }
        live.fresh(ed, b.cards[index].spec, by)?.let { live.recordFocus(ed, it) }
        fill(by)
        return FocusResult.Off(index)
    }

    internal suspend fun enter(ed: WorkspaceEditor, index: Int, by: String, size: ScreenSize? = null, since: Long? = null): ShowResult {
        val b = boardWith(index)
        val id = b.cards[index].spec.previewId
        val kept = ws.now.resize?.takeIf { size == null && ws.now.interactive && it.previewId == id }
        val sized = size?.takeIf { it != ScreenSize.Original }?.let { Resize(id, it) } ?: kept
        ed.update { s -> s.copy(board = s.board?.focusOn(index), focusAttachedAt = null, interactive = true, resize = sized) }
        return attach(ed, b.cards[index].spec, by, since)
    }

    private fun boardWith(index: Int): Board {
        val b = ws.now.board ?: error("보드가 없다 — 파일 경로로 show 한다")
        require(index in b.cards.indices) { "카드 $index 없음 — ${b.cards.size}장" }
        return b
    }

    private suspend fun attach(ed: WorkspaceEditor, p: PreviewSpec, by: String, since: Long?): ShowResult {
        val r = try {
            live.show(ed, p, by, since)
        } finally {
            val at = ws.nowMs()
            ed.update { it.copy(focusAttachedAt = at) }
        }
        live.recordFocus(ed, r.shot)
        return r
    }
}
