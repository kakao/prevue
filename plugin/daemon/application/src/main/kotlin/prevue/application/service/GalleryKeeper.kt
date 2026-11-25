package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import prevue.application.domain.model.Board
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.model.WorkspaceState
import prevue.application.domain.rule.buildPending
import prevue.application.port.GalleryShots
import prevue.application.port.RenderOutput

@SingleIn(AppScope::class)
@Inject
class GalleryKeeper(
    private val ws: Workspace,
    private val gallery: GalleryShots,
    private val scope: CoroutineScope,
) {
    private val seen = HashMap<String, Long>()

    fun start() {
        scope.launch {
            ws.state.collect { s ->
                val b = s.board?.takeIf { s.stale.isEmpty() && !s.buildPending } ?: return@collect
                if (keepFront(s, b)) ws.emit(WorkspaceEvent.GalleryShotsChanged)
            }
        }
    }

    private suspend fun keepFront(s: WorkspaceState, b: Board): Boolean {
        var drawn = 0
        var changed = false
        for ((i, c) in b.cards.take(GalleryShots.TRY).withIndex()) {
            if (drawn == GalleryShots.FRONT) break
            if (s.sized(c.spec) != c.spec || (s.interactive && i == b.focus)) break
            val shot = (c.result as? CardResult.Drawn)?.shot ?: break
            val ok = shot.out.ok && shot.out.image != null
            if (ok) drawn++
            val key = "${b.file.path}#$i"
            if (seen[key] == shot.artifactRevision) continue
            seen[key] = shot.artifactRevision
            changed = record(b, i, ok, shot.out) || changed
        }
        return changed
    }

    private suspend fun record(b: Board, i: Int, ok: Boolean, out: RenderOutput): Boolean = try {
        if (ok) gallery.keep(b.file, b.cards.size, i, out) else gallery.fail(b.file, b.cards.size, i)
        true
    } catch (e: Exception) {
        if (e is CancellationException) throw e
        System.err.println("[prevue] 갤러리 그림을 남기지 못했다: $e")
        false
    }
}
