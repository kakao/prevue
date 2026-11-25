package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.Shot
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.model.WorkspaceState
import prevue.application.domain.rule.buildPending
import prevue.application.port.GalleryShots

@SingleIn(AppScope::class)
@Inject
class GalleryKeeper(
    private val ws: Workspace,
    private val gallery: GalleryShots,
    private val scope: CoroutineScope,
) {
    class Pick(val file: File, val sheets: Int, val index: Int, val shot: Shot) {
        val drawn: Boolean get() = shot.out.ok && shot.out.image != null
    }

    private val seen = HashMap<String, Long>()

    fun start() {
        scope.launch {
            ws.state.collect { s -> if (keep(picks(s))) ws.emit(WorkspaceEvent.GalleryShotsChanged) }
        }
    }

    private suspend fun keep(picks: List<Pick>): Boolean {
        var changed = false
        for (p in picks) {
            val key = "${p.file.path}#${p.index}"
            if (seen[key] == p.shot.artifactRevision || !record(p)) continue
            seen[key] = p.shot.artifactRevision
            changed = true
        }
        return changed
    }

    private suspend fun record(p: Pick): Boolean = try {
        if (p.drawn) gallery.keep(p.file, p.sheets, p.index, p.shot.out) else gallery.fail(p.file, p.sheets, p.index)
        true
    } catch (e: Exception) {
        if (e is CancellationException) throw e
        System.err.println("[prevue] 갤러리 그림을 남기지 못했다: $e")
        false
    }

    companion object {
        fun picks(s: WorkspaceState): List<Pick> {
            val b = s.board?.takeIf { s.stale.isEmpty() && !s.buildPending && s.activeTabOrNull()?.params.isNullOrEmpty() } ?: return emptyList()
            val out = ArrayList<Pick>()
            for ((i, c) in b.cards.take(GalleryShots.TRY).withIndex()) {
                if (out.count { it.drawn } == GalleryShots.FRONT) break
                if (s.sized(c.spec) != c.spec || (s.interactive && i == b.focus)) break
                val shot = (c.result as? CardResult.Drawn)?.shot ?: break
                out += Pick(b.file, b.cards.size, i, shot)
            }
            return out
        }
    }
}
