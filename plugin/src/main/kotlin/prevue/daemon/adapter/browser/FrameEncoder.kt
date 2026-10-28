package prevue.daemon.adapter.browser

import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import javax.imageio.IIOImage
import javax.imageio.ImageIO
import javax.imageio.ImageWriteParam
import javax.imageio.ImageWriter
import javax.imageio.stream.MemoryCacheImageOutputStream
import kotlin.coroutines.CoroutineContext
import kotlin.math.roundToInt
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch

internal class FrameEncoder(
    scope: CoroutineScope,
    context: CoroutineContext,
    private val log: (String) -> Unit,
    private val workers: Int = 2,
    private val done: (Encoded) -> Unit,
) {
    class Part(val bytes: ByteArray, val type: String)
    class Job(val seq: Long, val epoch: Long, val img: BufferedImage, val png: Boolean, val width: Int?)
    class Encoded(val job: Job, val part: Part?, val ms: Long)

    private val work = Channel<Job>(Channel.UNLIMITED)
    private var pending: Job? = null
    private var inflight = 0
    private var nextSeq = 0L
    private var lastSent = -1L
    private var epoch = 0L

    var encoded = 0L
        private set
    var encodeMs = 0L
        private set
    var dropped = 0L
        private set
    val idle: Boolean get() = inflight == 0 && pending == null

    init {
        repeat(workers) { i ->
            scope.launch(context + CoroutineName("prevue-encode-$i")) {
                Writers().use { w ->
                    w.warmUp()
                    for (job in work) done(w.encode(job))
                }
            }
        }
    }

    fun submit(img: BufferedImage, png: Boolean, width: Int?) {
        val job = Job(nextSeq++, epoch, img, png, width)
        if (inflight < workers) { inflight++; work.trySend(job); return }
        if (pending != null) dropped++
        pending = job
    }

    fun finished(e: Encoded): Part? {
        inflight--
        pending?.let { pending = null; inflight++; work.trySend(it) }
        val part = e.part ?: return null
        encoded++
        encodeMs += e.ms
        val fresh = e.job.epoch == epoch && e.job.seq > lastSent
        if (fresh) lastSent = e.job.seq else dropped++
        return part.takeIf { fresh }
    }

    fun reset() { pending = null; epoch++ }

    fun close() { work.close() }

    private inner class Writers : AutoCloseable {
        // 외부: ImageWriter 는 스레드 안전하지 않다
        private val jpegWriter = ImageIO.getImageWritersByFormatName("jpeg").next()
        private val pngWriter = ImageIO.getImageWritersByFormatName("png").next()
        private var scaled: BufferedImage? = null

        fun warmUp() {
            runCatching { write(jpegWriter, BufferedImage(64, 64, BufferedImage.TYPE_3BYTE_BGR), QUALITY) }
                .onFailure { log("인코더 예열 실패: $it") }
        }

        fun encode(job: Job): Encoded {
            val t = System.nanoTime()
            val part = try {
                if (job.png) Part(write(pngWriter, job.img, null), "image/png")
                else Part(write(jpegWriter, scale(job.img, job.width), QUALITY), "image/jpeg")
            } catch (e: Throwable) {
                if (e is CancellationException) throw e
                log("프레임 인코딩 실패: $e")
                null
            }
            return Encoded(job, part, (System.nanoTime() - t) / 1_000_000)
        }

        private fun scale(img: BufferedImage, width: Int?): BufferedImage {
            val (w, h) = size(img, width)
            val b = scaled?.takeIf { it.width == w && it.height == h } ?: BufferedImage(w, h, BufferedImage.TYPE_3BYTE_BGR).also { scaled = it }
            b.createGraphics().apply {
                if (w != img.width) setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
                drawImage(img, 0, 0, w, h, null)
                dispose()
            }
            return b
        }

        override fun close() { jpegWriter.dispose(); pngWriter.dispose() }
    }

    private fun size(img: BufferedImage, width: Int?): Pair<Int, Int> {
        val tw = width ?: return img.width to img.height
        if (tw >= img.width * 0.95) return img.width to img.height
        val w = tw.coerceAtLeast(64)
        return w to (img.height * w.toDouble() / img.width).roundToInt().coerceAtLeast(1)
    }

    private fun write(writer: ImageWriter, img: BufferedImage, q: Float?): ByteArray {
        val bo = ByteArrayOutputStream(128 * 1024)
        val p = writer.defaultWriteParam.apply { if (q != null) { compressionMode = ImageWriteParam.MODE_EXPLICIT; compressionQuality = q } }
        MemoryCacheImageOutputStream(bo).use { writer.output = it; writer.write(null, IIOImage(img, null, null), p) }
        return bo.toByteArray()
    }

    private companion object {
        const val QUALITY = 0.85f
    }
}
