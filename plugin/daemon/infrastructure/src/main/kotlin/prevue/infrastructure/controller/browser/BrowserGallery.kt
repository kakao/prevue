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
        val kept = card.sheet.kept
        return mapOf("ok" to (kept != null), "sheets" to card.sheets, "image" to kept?.toImage(), "failure" to card.sheet.failure?.toJson())
    }

    suspend fun sheet(path: String): Map<String, Any?>? {
        val sheets = cards.sheets(File(path)) ?: return null
        return mapOf("sheets" to sheets.map { s ->
            mapOf("name" to s.name, "variant" to s.variant, "image" to s.kept?.toImage(), "failure" to s.failure?.toJson())
        })
    }

    fun image(id: String): File? = shots.image(id)

    fun keptOf(file: File): Map<String, Any?>? = shots.kept(file)?.let { k ->
        mapOf("sheets" to k.sheets, "items" to k.shots.map { s ->
            mapOf("i" to s.index, "id" to s.id, "name" to s.name, "variant" to s.variant) + s.toImage()
        })
    }
}

internal fun GalleryShots.Shot.toImage(): Map<String, Any?> =
    mapOf("url" to "/gallery/shot/$id.png?t=$drawnAt", "w" to width, "h" to height, "at" to drawnAt)
