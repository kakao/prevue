package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.File
import kotlinx.coroutines.CancellationException
import prevue.application.domain.model.PreviewSpec
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
    class Sheet(val name: String, val variant: String?, val shot: Shot)

    suspend fun draw(file: File): Card? {
        val specs = specsOf(file) ?: return null
        return Card(specs.size, shoot(specs.first()))
    }

    suspend fun sheets(file: File): List<Sheet>? =
        specsOf(file)?.take(SHEET_MAX)?.map { Sheet(it.functionName, it.paramLabel, shoot(it)) }

    private suspend fun specsOf(file: File): List<PreviewSpec>? {
        if (!sources.has(file)) return null
        val found = previews.inFile(file)
        return PreviewExpansion.expand(found, engine.instances(found)::getValue).ifEmpty { null }
    }

    private suspend fun shoot(spec: PreviewSpec): Shot {
        val t = System.nanoTime()
        val out = engine.showAside(spec.copy(previewId = spec.previewId + SUFFIX))
        return try { live.shot(out, null, t, BY) } catch (e: Exception) {
            if (e is CancellationException) throw e
            Shot(out.copy(ok = false, message = phrase("render.writeFailed", "why" to e)), null, 0, BY, 0)
        }
    }

    companion object {
        const val SUFFIX = "@gallery"
        const val BY = "gallery"
        const val SHEET_MAX = 3
    }
}
