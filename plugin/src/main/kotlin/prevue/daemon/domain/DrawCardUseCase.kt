package prevue.daemon.domain

import prevue.daemon.entity.phrase
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.launch
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.policy.CardPolicy
import prevue.daemon.domain.policy.CardPolicy.Decision
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.StaleCallers
import prevue.daemon.domain.runtime.Workspace

/**
 * FR-17. 보드의 카드 한 장을 그린다. 데몬의 채우기([FillBoardUseCase])와 뷰어의 요청이 둘 다 여기로 온다 —
 * 같은 세대의 그림이 이미 있거나 쓰이는 중이면 다시 그리지 않으므로 누가 몇 번 청해도 렌더는 세대마다 한 번이다.
 *
 * 줄은 렌더까지만 선다. PNG·트리 쓰기(~60ms)는 엔진이 이어 하고, 카드의 기록과 알림은 그것이 끝난 뒤 [scope]에서 한다 —
 * 주소를 알리기 전에 파일이 있어야 한다. 그 기록은 **줄을 서지 않는다** — 채우기가 다음 카드를 그리며 줄을 쥐고 있어,
 * 기다리면 쓰기가 밀린다(실측 1.4초).
 */
class DrawCardUseCase(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val live: LiveShot,
    private val callers: StaleCallers,
    private val scope: CoroutineScope,
) {
    /** [await]가 false면(채우기) 쓰기를 기다리지 않고 돌아와 다음 카드의 렌더가 앞 카드의 쓰기와 겹친다. HTTP는 기다린다 — 응답의 주소가 곧 파일이어야 한다. */
    suspend operator fun invoke(index: Int, force: Boolean, by: String, await: Boolean = true): CardResult {
        val pending: Deferred<CardResult> = ws.exclusive { ed ->
            val b = ws.now.board ?: error("보드가 없다 — 파일 경로로 show 한다")
            require(index in b.cards.indices) { "카드 $index 없음 — ${b.cards.size}장" }
            val c = b.cards[index]
            val gen = b.gen                                // 쓰기가 끝날 때 세대가 올라 있을 수 있다 — 그린 세대로 기록해야 옛 그림이 새 그림인 척하지 않는다
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
}
