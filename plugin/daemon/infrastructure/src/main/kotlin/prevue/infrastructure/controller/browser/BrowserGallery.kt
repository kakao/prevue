package prevue.infrastructure.controller.browser

import dev.zacsweers.metro.Inject
import java.io.File
import prevue.application.port.GalleryShots
import prevue.application.service.GalleryCards

@Inject
internal class BrowserGallery(
    private val cards: GalleryCards,
    private val shots: GalleryShots,
) {
    suspend fun card(path: String): Map<String, Any?>? {
        val card = cards.draw(File(path)) ?: return null
        return mapOf("sheets" to card.sheets, "front" to card.front.map { s ->
            mapOf("i" to s.index, "name" to s.name, "variant" to s.variant) + when (s) {
                is GalleryCards.Sheet.Kept -> mapOf("image" to s.shot.toImage(), "failure" to null)
                is GalleryCards.Sheet.Failed -> mapOf("image" to null, "failure" to s.why?.toJson())
            }
        })
    }

    fun image(id: String): File? = shots.image(id)

    fun keptOf(file: File): Map<String, Any?>? = shots.kept(file)?.let { k ->
        mapOf("sheets" to k.sheets, "front" to k.shots.map { s ->
            mapOf("i" to s.index, "name" to s.name, "variant" to s.variant, "image" to s.toImage(), "failure" to null)
        })
    }
}

internal fun GalleryShots.Shot.toImage(): Map<String, Any?> =
    mapOf("url" to "/gallery/shot/$id.png?t=$drawnAt", "w" to width, "h" to height, "at" to drawnAt)
