package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import prevue.application.domain.model.Board
import prevue.application.domain.model.CardAdjustment
import prevue.application.domain.model.CardOverride
import prevue.application.domain.model.EdgeToEdge
import prevue.application.domain.model.FocusResult
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.SystemUi

@SingleIn(AppScope::class)
@Inject
internal class BoardFocus(
    private val ws: Workspace,
    private val live: LiveShot,
    private val filler: BoardFiller,
) {
    suspend fun show(ed: WorkspaceEditor, b: Board, interactive: Boolean, by: String, since: Long?): ShowResult {
        if (interactive) return enter(ed, b.focus, by, since = since)
        val r = live.show(ed, b.focusCard.spec, by, LiveShot.Draw(since = since))
        filler.start(by, r.startedAtMs)
        return r
    }

    suspend fun focus(
        ed: WorkspaceEditor, index: Int, on: Boolean, by: String, adjustment: CardAdjustment,
    ): FocusResult {
        val b = ws.now.board
        return if (on && adjustment != CardAdjustment() && b != null && ws.now.interactive && b.focus == index) {
            FocusResult.On(index, overridden(ed, adjustment, by))
        } else switchFocus(ed, index, on, by, adjustment)
    }

    private suspend fun overridden(ed: WorkspaceEditor, adjustment: CardAdjustment, by: String): ShowResult =
        adjust(ed, adjustment, by) ?: ws.now.lastShown as? ShowResult
            ?: live.show(ed, ws.now.board!!.focusCard.spec, by)

    suspend fun leave(ed: WorkspaceEditor, by: String) {
        val b = ws.now.board ?: return
        switchFocus(ed, b.focus, on = false, by)
    }

    private suspend fun switchFocus(
        ed: WorkspaceEditor, index: Int, on: Boolean, by: String, adjustment: CardAdjustment = CardAdjustment(),
    ): FocusResult {
        require(on || adjustment == CardAdjustment()) { "크기 · 시스템 UI는 인터랙티브 카드에만 준다 — --on과 함께" }
        if (on) return FocusResult.On(index, enter(ed, index, by, adjustment = adjustment))
        val b = boardWith(index)
        ed.update { s -> s.copy(board = s.board?.focusOn(index)).withoutInteractive() }
        live.fresh(ed, b.cards[index].spec, by)?.let { live.recordFocus(ed, it) }
        filler.start(by)
        return FocusResult.Off(index)
    }

    suspend fun enter(
        ed: WorkspaceEditor, index: Int, by: String, since: Long? = null, adjustment: CardAdjustment = CardAdjustment(),
    ): ShowResult {
        val b = boardWith(index)
        val id = b.cards[index].spec.previewId
        val kept = ws.now.cardOverride?.takeIf { ws.now.interactive && it.previewId == id }
        val next = (kept ?: CardOverride(id)).with(adjustment.size, adjustment.systemUi, adjustment.edgeToEdge)
        ed.update { s -> s.copy(board = s.board?.focusOn(index)).withInteractive(next) }
        return live.show(ed, b.cards[index].spec, by, LiveShot.Draw(since = since, attach = true))
    }

    private fun boardWith(index: Int): Board {
        val b = ws.now.board ?: error("보드가 없다 — 파일 경로로 show 한다")
        require(index in b.cards.indices) { "카드 $index 없음 — ${b.cards.size}장" }
        return b
    }

    suspend fun adjust(ed: WorkspaceEditor, adjustment: CardAdjustment, by: String): ShowResult? {
        val (size, systemUi, edgeToEdge) = adjustment
        val now = ws.now.cardOverride
        val defaults = size in setOf(null, ScreenSize.Original) && systemUi in setOf(null, SystemUi.ANNOTATED) && edgeToEdge in setOf(null, EdgeToEdge.AUTO)
        if (now == null && defaults) return null
        val target = overrideTarget()
        val next = (now?.takeIf { it.previewId == target.previewId } ?: CardOverride(target.previewId)).with(size, systemUi, edgeToEdge)
        if (next == now) return null
        ed.update { it.copy(cardOverride = next) }
        val sameBars = (next?.edgeToEdge ?: EdgeToEdge.AUTO) == (now?.edgeToEdge ?: EdgeToEdge.AUTO) &&
            (next?.systemUi ?: SystemUi.ANNOTATED) == (now?.systemUi ?: SystemUi.ANNOTATED)
        return live.show(ed, target, by, LiveShot.Draw(keepPostures = sameBars, attach = true))
    }

    private fun overrideTarget(): PreviewSpec {
        val s = ws.now
        val b = s.board ?: error("보여 주는 프리뷰가 없다 — 먼저 show")
        require(s.interactive) { "인터랙티브 카드에서만 크기 · 시스템 UI를 바꾼다 — prevue focus <index> --on" }
        return b.focusCard.spec
    }
}
