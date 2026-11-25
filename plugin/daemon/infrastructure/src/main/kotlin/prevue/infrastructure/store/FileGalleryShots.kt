package prevue.infrastructure.store

import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.nio.file.StandardCopyOption.ATOMIC_MOVE
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.security.MessageDigest
import javax.imageio.ImageIO
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import prevue.application.port.GalleryShots
import prevue.application.port.GalleryShots.Kept
import prevue.application.port.GalleryShots.Shot
import prevue.application.port.PrevueDispatchers
import prevue.application.port.RenderOutput
import prevue.infrastructure.json.Json

public class FileGalleryShots(
    private val root: File,
    private val dispatchers: PrevueDispatchers,
    private val maxBytes: Long = galleryMaxMb(System.getenv("PREVUE_GALLERY_MAX_MB")) * 1024 * 1024,
    private val now: () -> Long = System::currentTimeMillis,
) : GalleryShots {
    private class Entry(val path: String, val sheets: Int, val shots: Map<Int, Shot>, val failedAt: Map<Int, Long>)

    private val lock = Mutex()
    private val loaded = lazy { MutableStateFlow(load()) }
    private val entries: Map<String, Entry> get() = loaded.value.value

    override suspend fun keep(file: File, sheets: Int, index: Int, out: RenderOutput): Shot = withContext(dispatchers.io) {
        val image = out.image?.takeIf { out.ok } ?: throw IOException("${out.preview.previewId} 그림이 없다")
        val key = keyOf(file)
        lock.withLock {
            val dir = File(root, key).apply { mkdirs() }
            val tmp = Files.createTempFile(dir.toPath(), ".$index-", ".png.tmp").toFile()
            val (w, h) = try { shrink(image, out.width, out.height, tmp) } catch (e: IOException) { tmp.delete(); throw e }
            Files.move(tmp.toPath(), File(dir, "$index.png").toPath(), ATOMIC_MOVE, REPLACE_EXISTING)
            val shot = Shot("$key-$index", index, out.preview.functionName, out.preview.paramLabel, w, h, now())
            val prev = sameShape(key, sheets)
            record(key, dir, Entry(file.path, sheets, prev?.shots.orEmpty() + (index to shot), prev?.failedAt.orEmpty() - index))
            prune(key)
            shot
        }
    }

    override suspend fun fail(file: File, sheets: Int, index: Int): Unit = withContext(dispatchers.io) {
        val key = keyOf(file)
        lock.withLock {
            val dir = File(root, key).apply { mkdirs() }
            val prev = sameShape(key, sheets)
            record(key, dir, Entry(file.path, sheets, prev?.shots.orEmpty() - index, prev?.failedAt.orEmpty() + (index to now())))
        }
    }

    override fun kept(file: File): Kept? {
        val key = keyOf(file)
        val e = entries[key] ?: return null
        val shots = e.shots.values.filter { File(File(root, key), "${it.index}.png").isFile }.sortedBy { it.index }
        return Kept(e.sheets, shots, e.failedAt)
    }

    override fun image(id: String): File? {
        val key = id.substringBeforeLast('-')
        val index = id.substringAfterLast('-').toIntOrNull() ?: return null
        if (entries[key]?.shots?.containsKey(index) != true) return null
        val dir = File(root, key)
        File(dir, META).setLastModified(now())
        return File(dir, "$index.png").takeIf { it.isFile }
    }

    private fun sameShape(key: String, sheets: Int): Entry? = entries[key]?.takeIf { it.sheets == sheets }

    private fun record(key: String, dir: File, next: Entry) {
        val limit = minOf(next.sheets, GalleryShots.TRY)
        val entry = Entry(next.path, next.sheets, next.shots.filterKeys { it < limit }, next.failedAt.filterKeys { it < limit })
        (entries[key]?.shots.orEmpty().keys - entry.shots.keys).forEach { File(dir, "$it.png").delete() }
        loaded.value.update { it + (key to entry) }
        writeMeta(dir, entry)
    }

    private fun shrink(image: File, width: Int, height: Int, to: File): Pair<Int, Int> {
        if (width <= MAX_WIDTH) {
            Files.copy(image.toPath(), to.toPath(), REPLACE_EXISTING)
            return width to height
        }
        val src = ImageIO.read(image) ?: throw IOException("${image.name}을 읽지 못했다")
        val h = maxOf(1, Math.round(src.height.toDouble() * MAX_WIDTH / src.width).toInt())
        val dst = BufferedImage(MAX_WIDTH, h, BufferedImage.TYPE_INT_ARGB)
        dst.createGraphics().apply {
            setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC)
            setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            drawImage(src.getScaledInstance(MAX_WIDTH, h, java.awt.Image.SCALE_AREA_AVERAGING), 0, 0, null)
            dispose()
        }
        ImageIO.write(dst, "PNG", to)
        return MAX_WIDTH to h
    }

    private fun writeMeta(dir: File, e: Entry) {
        val json = mapOf(
            "path" to e.path, "sheets" to e.sheets,
            "shots" to e.shots.values.sortedBy { it.index }.map {
                mapOf("i" to it.index, "name" to it.name, "variant" to it.variant, "w" to it.width, "h" to it.height, "at" to it.drawnAt)
            },
            "failed" to e.failedAt.entries.sortedBy { it.key }.map { mapOf("i" to it.key, "at" to it.value) },
        )
        val tmp = Files.createTempFile(dir.toPath(), ".$META-", ".tmp").toFile()
        tmp.writeText(Json.str(json))
        Files.move(tmp.toPath(), File(dir, META).toPath(), ATOMIC_MOVE, REPLACE_EXISTING)
    }

    private fun prune(keep: String) {
        val dirs = root.listFiles().orEmpty().filter { it.isDirectory }
        var total = dirs.sumOf { d -> d.listFiles().orEmpty().sumOf { it.length() } }
        if (total <= maxBytes) return
        for (d in dirs.filter { it.name != keep }.sortedBy { File(it, META).lastModified() }) {
            if (total <= maxBytes) return
            total -= d.listFiles().orEmpty().sumOf { it.length() }
            d.deleteRecursively()
            loaded.value.update { it - d.name }
        }
    }

    private fun load(): Map<String, Entry> {
        val out = HashMap<String, Entry>()
        for (dir in root.listFiles().orEmpty().filter { it.isDirectory }) {
            try { out[dir.name] = readMeta(dir) } catch (e: Exception) {
                System.err.println("[prevue] 갤러리 그림 ${dir.name}을 읽지 못해 건너뛴다: $e")
            }
        }
        return out
    }

    private fun readMeta(dir: File): Entry {
        val m = Json.parse(File(dir, META).readText()) as Map<*, *>
        val shots = (m["shots"] as List<*>).map { it as Map<*, *> }.map {
            val i = (it["i"] as Number).toInt()
            Shot("${dir.name}-$i", i, it["name"] as String, it["variant"] as String?, (it["w"] as Number).toInt(), (it["h"] as Number).toInt(),
                (it["at"] as Number).toLong())
        }.filter { File(dir, "${it.index}.png").isFile }
        val failed = (m["failed"] as List<*>?).orEmpty().map { it as Map<*, *> }
            .associate { (it["i"] as Number).toInt() to (it["at"] as Number).toLong() }
        return Entry(m["path"] as String, (m["sheets"] as Number).toInt(), shots.associateBy { it.index }, failed)
    }

    private fun keyOf(file: File): String =
        MessageDigest.getInstance("SHA-1").digest(file.path.toByteArray()).take(KEY_BYTES).joinToString("") { "%02x".format(it) }

    private companion object {
        private const val MAX_WIDTH: Int = 600
        private const val META = "shots.json"
        private const val KEY_BYTES = 8
        private const val DEFAULT_MAX_MB = 128L
        private fun galleryMaxMb(env: String?): Long = env?.toLongOrNull() ?: DEFAULT_MAX_MB
    }
}
