package prevue.daemon.domain

import prevue.daemon.domain.model.FocusResult
import prevue.daemon.domain.model.Resize
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.domain.runtime.WorkspaceEditor

/**
 * FR-18. 카드 하나에 태스크를 걸어 인터랙티브로 들어가고, 끄면 보드로 돌아간다. 켜져 있는 동안 다른 카드는 그리지 않는다.
 * **들고 날 때 모두 새 태스크로 그린다** — on/off에 상태가 초기화되는 것이 명세다(D-11). 들어갈 때 살려 두려다 보드 채우기가
 * 가져간 태스크를 잘못 물려받는 쪽이 더 나쁘고, 나올 때 조작한 화면(상세로 넘어간 목록)이 카드에 남으면 보드가 그 파일의 첫 화면이 아니다.
 */
class FocusCardUseCase(
    private val ws: Workspace, private val live: LiveShot, private val fillBoard: FillBoardUseCase, private val resize: ResizeUseCase,
) {
    suspend operator fun invoke(index: Int, on: Boolean, by: String, size: ScreenSize? = null): FocusResult = ws.exclusive { ed ->
        val b = ws.now.board
        if (on && size != null && b != null && ws.now.interactive && b.focus == index) FocusResult.On(index, resized(ed, size, by))
        else focus(ed, index, on, by, size)
    }

    private suspend fun resized(ed: WorkspaceEditor, size: ScreenSize, by: String): ShowResult =
        resize.within(ed, size, by) ?: ws.now.lastShown as? ShowResult ?: live.show(ed, ws.now.board!!.focusCard.spec, by)

    suspend fun offCurrent(by: String): Unit = ws.exclusive { ed ->
        val b = ws.now.board ?: return@exclusive
        focus(ed, b.focus, on = false, by)
    }

    private suspend fun focus(ed: WorkspaceEditor, index: Int, on: Boolean, by: String, size: ScreenSize? = null): FocusResult {
        val b = ws.now.board ?: error("보드가 없다 — 파일 경로로 show 한다")
        require(index in b.cards.indices) { "카드 $index 없음 — ${b.cards.size}장" }
        require(on || size == null) { "크기는 인터랙티브 카드에만 준다 — --on과 함께" }
        val id = b.cards[index].spec.previewId
        val kept = ws.now.resize?.takeIf { on && size == null && ws.now.interactive && it.previewId == id }
        val sized = size?.takeIf { on && it != ScreenSize.Original }?.let { Resize(id, it) } ?: kept
        ed.update { s -> s.copy(board = s.board?.focusOn(index), focusAttachedAt = null, interactive = on, resize = sized) }
        if (!on) {
            // 새 태스크로 처음 화면을 다시 그려 카드에 적는다 — 에이전트가 읽는 PNG·트리도 같이 처음 화면이 된다.
            live.fresh(ed, b.cards[index].spec, by)?.let { live.recordFocus(ed, it) }
            // 켜져 있는 동안의 저장은 포커스 카드만 그리고 채우기를 멈췄다 — 나올 때 이어 그리지 않으면 나머지가 옛 그림으로 남고
            // 다음 저장까지 `wait`가 영영 답하지 못한다(2026-10-04 재현: 카드 24장 낡음, wait 30초 TIMEOUT).
            fillBoard(by)
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
}
