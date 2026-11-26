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
    suspend fun card(path: String): Map<String, Any?>? = cards.draw(File(path))?.toJson()

    fun image(id: String): File? = shots.image(id)

    fun keptOf(file: File): Map<String, Any?>? = cards.cached(file)?.toJson()

    private fun GalleryCards.Card.toJson(): Map<String, Any?> = mapOf(
        "sheets" to sheets,
        "front" to front.map { d -> d.shot.let { mapOf("i" to it.index, "name" to it.name, "variant" to it.variant, "image" to it.toImage()) } },
        "failure" to failure?.toJson(),
    )
}

private fun GalleryShots.Shot.toImage(): Map<String, Any?> =
    mapOf("url" to "/gallery/shot/$id.png?t=$drawnAt", "w" to width, "h" to height, "at" to drawnAt)
