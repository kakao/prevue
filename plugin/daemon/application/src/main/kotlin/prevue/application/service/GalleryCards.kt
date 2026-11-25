package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.File
import kotlinx.coroutines.CancellationException
import prevue.application.domain.model.Phrase
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.phrase
import prevue.application.domain.rule.PreviewExpansion
import prevue.application.port.GalleryShots
import prevue.application.port.PreviewRepository
import prevue.application.port.SourceFileRepository

@SingleIn(AppScope::class)
@Inject
class GalleryCards(
    private val engine: Engine,
    private val previews: PreviewRepository,
    private val sources: SourceFileRepository,
    private val live: LiveShot,
    private val gallery: GalleryShots,
) {
    class Card(val sheets: Int, val sheet: Sheet)
    class Sheet(val name: String, val variant: String?, val kept: GalleryShots.Shot?, val failure: Phrase?)

    suspend fun draw(file: File): Card? {
        val specs = specsOf(file) ?: return null
        return Card(specs.size, shoot(file, specs, 0))
    }

    suspend fun sheets(file: File): List<Sheet>? {
        val specs = specsOf(file) ?: return null
        return specs.indices.take(GalleryShots.FRONT).map { shoot(file, specs, it) }
    }

    private suspend fun specsOf(file: File): List<PreviewSpec>? {
        if (!sources.has(file)) return null
        val found = previews.inFile(file)
        return PreviewExpansion.expand(found, engine.instances(found)::getValue).ifEmpty { null }
    }

    private suspend fun shoot(file: File, specs: List<PreviewSpec>, index: Int): Sheet {
        val spec = specs[index]
        val t = System.nanoTime()
        val out = engine.showAside(spec.copy(previewId = spec.previewId + SUFFIX))
        fun failed(why: Phrase?) = Sheet(spec.functionName, spec.paramLabel, null, why)
        return try {
            val shot = live.shot(out, null, t, BY)
            if (!shot.out.ok || shot.out.image == null) failed(shot.out.message)
            else Sheet(spec.functionName, spec.paramLabel, gallery.keep(file, specs.size, index, shot.out), null)
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            failed(phrase("render.writeFailed", "why" to e))
        }
    }

    companion object {
        const val SUFFIX = "@gallery"
        const val BY = "gallery"
    }
}
