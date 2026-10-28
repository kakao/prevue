package prevue.daemon.domain

import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.Settled
import prevue.daemon.domain.model.SettledShot
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

class SettleUseCase(private val ws: Workspace, private val engine: EngineActor, private val live: LiveShot) {
    suspend operator fun invoke(settled: SettledShot): Unit = ws.exclusive { ed ->
        val current = ws.now.current ?: return@exclusive
        val out = settled.out
        if (out.preview.previewId != current.previewId || !engine.isLatest(settled)) return@exclusive
        val body = Settled(live.shot(out, null, System.nanoTime() - out.renderMs * 1_000_000, "interactive"), ws.now.stale, settled.stats)
        ed.update { it.copy(lastResult = body) }
        // 정착한 그림이 보드의 카드 것이면 카드도 그 상태를 가리킨다 — 에이전트가 읽는 PNG와 사람이 보는 카드가 갈리지 않게.
        // 인터랙티브 중에는 하지 않는다: 보이는 것은 MJPEG이고, 제스처마다 보드를 갱신하면 안 쓰는 PNG를 매번 받아 간다.
        // 나갈 때는 조작한 상태를 카드에 남기지 않고 처음 화면으로 다시 그린다(D-11, [FocusCardUseCase]의 off).
        if (!ws.now.interactive && out.ok) {
            ed.updateBoard { b ->
                val i = b.cards.indexOfFirst { it.spec.previewId == current.previewId }
                if (i < 0) b else {
                    // 카드에 그림이 있으면 그 기록에 주소만 새로 주고, 없으면(쓰기 실패 포함) 정착한 그림이 그 카드의 그림이다.
                    val shot = (b.cards[i].result as? CardResult.Drawn)?.shot ?: body.shot
                    b.record(i, b.gen, CardResult.Drawn(i, live.restamped(shot)))
                }
            }
        }
    }
}
