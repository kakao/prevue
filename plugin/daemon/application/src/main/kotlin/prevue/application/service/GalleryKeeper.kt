package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import prevue.application.domain.model.Board
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.Shot
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
        scope.launch {
            ws.state.map { it.board?.let(::front) }.distinctUntilChanged().collect { drawn -> drawn?.forEach { keep(it) } }
        }
    }

    private class Front(val board: Board, val index: Int, val shot: Shot) {
        val key get() = "${board.file.path}#$index"
        override fun equals(other: Any?) = other is Front && other.key == key && other.shot.artifactRevision == shot.artifactRevision
        override fun hashCode() = key.hashCode()
    }

    private fun front(b: Board): List<Front> = b.cards.take(GalleryShots.FRONT).mapIndexedNotNull { i, c ->
        (c.result as? CardResult.Drawn)?.shot?.takeIf { it.out.ok && it.out.image != null }?.let { Front(b, i, it) }
    }

    private suspend fun keep(f: Front) {
        if (kept[f.key] == f.shot.artifactRevision) return
        kept[f.key] = f.shot.artifactRevision
        try { gallery.keep(f.board.file, f.board.cards.size, f.index, f.shot.out) } catch (e: Exception) {
            if (e is CancellationException) throw e
            System.err.println("[prevue] 갤러리 그림을 남기지 못했다: $e")
        }
    }
}
