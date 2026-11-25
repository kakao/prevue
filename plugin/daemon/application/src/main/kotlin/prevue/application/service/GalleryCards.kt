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
    class Card(val sheets: Int, val front: List<Sheet.Drawn>, val failure: Phrase?)

    sealed interface Sheet {
        class Drawn(val shot: GalleryShots.Shot) : Sheet
        class Failed(val why: Phrase?) : Sheet
    }

    suspend fun draw(file: File): Card? {
        if (!sources.has(file)) return null
        val found = previews.inFile(file)
        val specs = PreviewExpansion.expand(found, engine.instances(found)::getValue).ifEmpty { return null }
        val known = known(file)?.takeIf { it.sheets == specs.size }
        return walk(specs.size) { i -> known?.at(i) ?: shoot(file, specs, i) }
    }

    fun cached(file: File): Card? {
        val known = known(file) ?: return null
        return walk(known.sheets) { known.at(it) }
    }

    private class Known(val sheets: Int, val drawn: Map<Int, GalleryShots.Shot>, val failed: Set<Int>) {
        fun at(i: Int): Sheet? = drawn[i]?.let(Sheet::Drawn) ?: Sheet.Failed(null).takeIf { i in failed }
    }

    private fun known(file: File): Known? {
        val kept = gallery.kept(file) ?: return null
        val changed = sources.modifiedAt(file) ?: return null
        return Known(kept.sheets, kept.shots.associateBy { it.index }, kept.failedAt.filterValues { it >= changed }.keys)
    }

    private inline fun walk(sheets: Int, at: (Int) -> Sheet?): Card? {
        val front = ArrayList<Sheet.Drawn>()
        var failure: Phrase? = null
        for (i in 0 until minOf(sheets, GalleryShots.TRY)) {
            if (front.size == GalleryShots.FRONT) break
            when (val s = at(i) ?: return null) {
                is Sheet.Drawn -> front += s
                is Sheet.Failed -> failure = failure ?: s.why
            }
        }
        return Card(sheets, front, failure)
    }

    private suspend fun shoot(file: File, specs: List<PreviewSpec>, index: Int): Sheet {
        val spec = specs[index]
        val t = System.nanoTime()
        val out = engine.showAside(spec.copy(previewId = spec.previewId + SUFFIX))
        val why = try {
            val shot = live.shot(out, null, t, BY)
            if (shot.out.ok && shot.out.image != null) return Sheet.Drawn(gallery.keep(file, specs.size, index, shot.out))
            shot.out.message
        } catch (e: Exception) {
            if (e is CancellationException) throw e
            phrase("render.writeFailed", "why" to e)
        }
        gallery.fail(file, specs.size, index)
        return Sheet.Failed(why)
    }

    companion object {
        const val SUFFIX = "@gallery"
        const val BY = "gallery"
    }
}
