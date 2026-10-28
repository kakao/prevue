package prevue.daemon.domain

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.yield
import prevue.daemon.domain.model.Board
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.SkipReason
import prevue.daemon.domain.model.BoardFill
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.Workspace

class FillBoardUseCase(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val drawCard: DrawCardUseCase,
    private val scope: CoroutineScope,
) {
    private class Filled(val drawn: Int, val renderNs: Long)

    operator fun invoke(by: String, since: Long? = null) {
        val b = ws.now.board ?: return
        val t0 = System.nanoTime()
        scope.launch {
            val filled = fill(b, by) ?: return@launch
            engine.awaitWrites()
            val ms = (System.nanoTime() - t0) / 1_000_000
            println("[prevue] 보드 ${b.cards.size}장 채움(새로 ${filled.drawn}장) ${ms}ms(렌더 ${filled.renderNs / 1_000_000}ms) gen=${b.gen}")
            if (since != null && sameRound(b) != null)
                ws.recordFill(BoardFill(since, System.currentTimeMillis() - since, b.cards.size))
        }
    }

    private suspend fun fill(b: Board, by: String): Filled? {
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
}
