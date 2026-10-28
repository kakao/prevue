package prevue.daemon.domain

import java.io.File
import prevue.daemon.domain.model.Card
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.Selection
import prevue.daemon.domain.model.Pointed
import java.time.Instant
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

class SelectUseCase(private val ws: Workspace, private val live: LiveShot) {
    suspend operator fun invoke(file: String, line: Int, at: Pointed, by: String): Selection = ws.exclusive { ed ->
        val onLive = (ws.now.interactive || ws.now.board == null) && (at.previewId == null || at.previewId == ws.now.current?.previewId)
        if (onLive) live.catchUp(ed, by)
        val card = if (onLive) null else ws.now.board?.cards?.firstOrNull { it.spec.previewId == at.previewId }
        val (image, tree) = pictureOf(card)
        val sel = Selection(
            ref = "@$file#L$line", file = file, line = line, node = at.node, chain = at.chain, userChain = at.userChain ?: at.chain,
            bounds = at.bounds, preview = card?.spec ?: ws.now.current, image = image?.absolutePath, tree = tree?.absolutePath,
            interactive = ws.now.interactive, by = by, at = Instant.now().toString(),
        )
        ed.update { it.copy(selection = sel, selectionTab = it.activeTab) }
        sel
    }

    private fun pictureOf(card: Card?): Pair<File?, File?> {
        val result = card?.result ?: return ws.now.lastResult?.image to ws.now.lastResult?.tree
        val out = (result as? CardResult.Drawn)?.shot?.out
        return out?.image to out?.tree
    }
}
