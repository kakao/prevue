package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.File
import kotlinx.coroutines.CancellationException
import prevue.application.domain.model.Shot
import prevue.application.domain.model.phrase
import prevue.application.domain.rule.PreviewExpansion
import prevue.application.port.PreviewRepository
import prevue.application.port.SourceFileRepository

@SingleIn(AppScope::class)
@Inject
class GalleryCards(
    private val engine: Engine,
    private val previews: PreviewRepository,
    private val sources: SourceFileRepository,
    private val live: LiveShot,
) {
    class Card(val sheets: Int, val shot: Shot)

    suspend fun draw(file: File): Card? {
        if (!sources.has(file)) return null
        val found = previews.inFile(file)
        val specs = PreviewExpansion.expand(found, engine.instances(found)::getValue)
        val first = specs.firstOrNull() ?: return null
        val t = System.nanoTime()
        val out = engine.showAside(first.copy(previewId = first.previewId + SUFFIX))
        val shot = try { live.shot(out, null, t, BY) } catch (e: Exception) {
            if (e is CancellationException) throw e
            Shot(out.copy(ok = false, message = phrase("render.writeFailed", "why" to e)), null, 0, BY, 0)
        }
        return Card(specs.size, shot)
    }

    companion object {
        const val SUFFIX = "@gallery"
        const val BY = "gallery"
    }
}
