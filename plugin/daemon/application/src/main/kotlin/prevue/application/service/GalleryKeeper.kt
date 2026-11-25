package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import prevue.application.domain.model.Board
import prevue.application.domain.model.CardResult
import prevue.application.port.GalleryShots

@SingleIn(AppScope::class)
@Inject
class GalleryKeeper(
    private val ws: Workspace,
    private val gallery: GalleryShots,
    private val scope: CoroutineScope,
) {
    private val kept = HashMap<String, Long>()

    fun start() {
        scope.launch { ws.state.collect { s -> s.board?.let { keepFront(it) } } }
    }

    private suspend fun keepFront(b: Board) {
        b.cards.take(GalleryShots.FRONT).forEachIndexed { i, c ->
            val shot = (c.result as? CardResult.Drawn)?.shot?.takeIf { it.out.ok && it.out.image != null } ?: return@forEachIndexed
            val key = "${b.file.path}#$i"
            if (kept[key] == shot.artifactRevision) return@forEachIndexed
            kept[key] = shot.artifactRevision
            try { gallery.keep(b.file, b.cards.size, i, shot.out) } catch (e: Exception) {
                if (e is CancellationException) throw e
                System.err.println("[prevue] 갤러리 그림을 남기지 못했다: $e")
            }
        }
    }
}
