package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.launch
import prevue.application.domain.model.Board
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.SkipReason
import prevue.application.domain.model.phrase
import prevue.application.domain.rule.CardPolicy
import prevue.application.domain.rule.CardPolicy.Decision

@SingleIn(AppScope::class)
@Inject
internal class BoardCards(
    private val ws: Workspace,
    private val engine: Engine,
    private val live: LiveShot,
    private val callers: StaleCallers,
    private val scope: CoroutineScope,
) {
    suspend fun startCard(ed: WorkspaceEditor, index: Int, force: Boolean, by: String): Deferred<CardResult> {
        val b = ws.now.board ?: error("보드가 없다 — 파일 경로로 show 한다")
        require(index in b.cards.indices) { "카드 $index 없음 — ${b.cards.size}장" }
        return startCard(ed, b, index, force, by)
    }

    suspend fun startNextAside(ed: WorkspaceEditor, from: Int, by: String): Int? {
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
                    catch (e: CancellationException) { done.cancel(e); throw e }
                    catch (e: Exception) { CardResult.WriteFailed(index, phrase("render.writeFailed", "why" to e)) }
            ws.recordCard(b.epoch, index, gen, r)
            done.complete(r)
        }
        return done
    }
}
