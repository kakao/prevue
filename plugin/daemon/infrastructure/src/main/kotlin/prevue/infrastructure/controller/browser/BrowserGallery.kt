package prevue.infrastructure.controller.browser

import dev.zacsweers.metro.Inject
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption.ATOMIC_MOVE
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import javax.imageio.ImageIO
import kotlinx.coroutines.withContext
import prevue.application.domain.model.phrase
import prevue.application.port.PrevueDispatchers
import prevue.application.service.GalleryCards
import prevue.infrastructure.controller.http.artifactUrl

@Inject
internal class BrowserGallery(
    private val cards: GalleryCards,
    private val dispatchers: PrevueDispatchers,
) {
    suspend fun card(path: String): Map<String, Any?>? {
        val card = cards.draw(File(path)) ?: return null
        val out = card.shot.out
        val image = out.image
        if (!out.ok || image == null) return failed(card.sheets, out.message?.toJson())
        val thumb = try { withContext(dispatchers.io) { CardThumbnail.of(image, out.width, out.height) } } catch (e: java.io.IOException) {
            return failed(card.sheets, phrase("render.writeFailed", "why" to e).toJson())
        }
        return mapOf(
            "ok" to true, "sheets" to card.sheets,
            "image" to mapOf("url" to artifactUrl(thumb.file, card.shot.artifactRevision), "w" to thumb.width, "h" to thumb.height),
            "failure" to null,
        )
    }

    private fun failed(sheets: Int, failure: Any?) = mapOf("ok" to false, "sheets" to sheets, "image" to null, "failure" to failure)
}

internal object CardThumbnail {
    const val MAX_WIDTH = 600

    class Thumb(val file: File, val width: Int, val height: Int)

    fun of(image: File, width: Int, height: Int): Thumb {
        if (width <= MAX_WIDTH) return Thumb(image, width, height)
        val src = ImageIO.read(image) ?: throw java.io.IOException("${image.name}을 읽지 못했다")
        val h = maxOf(1, Math.round(src.height.toDouble() * MAX_WIDTH / src.width).toInt())
        val dst = BufferedImage(MAX_WIDTH, h, BufferedImage.TYPE_INT_ARGB)
        dst.createGraphics().apply {
            setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
            setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            drawImage(src.getScaledInstance(MAX_WIDTH, h, java.awt.Image.SCALE_AREA_AVERAGING), 0, 0, null)
            dispose()
        }
        val file = File(image.parentFile, image.name.removeSuffix(".png") + ".card.png")
        val tmp = File(file.parentFile, ".${file.name}.tmp")
        ImageIO.write(dst, "PNG", tmp)
        Files.move(tmp.toPath(), file.toPath(), ATOMIC_MOVE, REPLACE_EXISTING)
        return Thumb(file, MAX_WIDTH, h)
    }
}
