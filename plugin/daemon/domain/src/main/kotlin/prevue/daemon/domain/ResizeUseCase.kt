package prevue.daemon.domain

import prevue.daemon.domain.model.Resize
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.domain.runtime.WorkspaceEditor

class ResizeUseCase(private val ws: Workspace, private val live: LiveShot) {
    suspend operator fun invoke(size: ScreenSize, by: String): ShowResult? = ws.exclusive { ed -> within(ed, size, by) }

    suspend fun within(ed: WorkspaceEditor, size: ScreenSize, by: String): ShowResult? {
        if (size == ScreenSize.Original && ws.now.resize == null) return null
        val target = target()
        val next = size.takeUnless { it == ScreenSize.Original }?.let { Resize(target.previewId, it) }
        if (next == ws.now.resize) return null
        ed.update { it.copy(resize = next) }
        val onBoard = ws.now.board != null
        val r = try {
            live.show(ed, target, by, keepPostures = true)
        } finally {
            if (onBoard) {
                val at = ws.nowMs()
                ed.update { it.copy(focusAttachedAt = at) }
            }
        }
        live.recordFocus(ed, r.shot)
        return r
    }

    private fun target(): PreviewSpec {
        val s = ws.now
        val b = s.board
        if (b != null) {
            require(s.interactive) { "인터랙티브 카드에서만 크기를 바꾼다 — prevue focus <index> --on" }
            return b.focusCard.spec
        }
        return s.activeTabOrNull()?.spec ?: error("보여 주는 프리뷰가 없다 — 먼저 show")
    }
}
