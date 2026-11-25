package prevue.infrastructure.store

import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.nio.file.StandardCopyOption.ATOMIC_MOVE
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import java.security.MessageDigest
import java.util.concurrent.ConcurrentHashMap
import javax.imageio.ImageIO
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
    public var maxBytes: Long = galleryMaxMb(System.getenv("PREVUE_GALLERY_MAX_MB")) * 1024 * 1024,
    private val now: () -> Long = System::currentTimeMillis,
) : GalleryShots {
    private class Entry(val path: String, val sheets: Int, val shots: Map<Int, Shot>)

    private val lock = Mutex()
    private val entries: MutableMap<String, Entry> by lazy { load() }

    override suspend fun keep(file: File, sheets: Int, index: Int, out: RenderOutput): Shot = withContext(dispatchers.io) {
        val image = out.image?.takeIf { out.ok } ?: throw IOException("${out.preview.previewId} 그림이 없다")
        val key = keyOf(file)
        val dir = File(root, key).apply { mkdirs() }
        val tmp = File(dir, ".$index.png.tmp")
        val (w, h) = shrink(image, out.width, out.height, tmp)
        lock.withLock {
            Files.move(tmp.toPath(), File(dir, "$index.png").toPath(), ATOMIC_MOVE, REPLACE_EXISTING)
            val shot = Shot("$key-$index", index, out.preview.functionName, out.preview.paramLabel, w, h, now())
            val old = entries[key]?.shots.orEmpty()
            val entry = Entry(file.path, sheets, (old + (index to shot)).filterKeys { it < minOf(sheets, GalleryShots.FRONT) })
            (old.keys - entry.shots.keys).forEach { File(dir, "$it.png").delete() }
            entries[key] = entry
            writeMeta(dir, entry)
            prune(key)
            shot
        }
    }

    override fun kept(file: File): Kept? =
        entries[keyOf(file)]?.takeIf { it.shots.isNotEmpty() }?.let { e -> Kept(e.sheets, e.shots.values.sortedBy { it.index }) }

    override fun image(id: String): File? {
        val key = id.substringBeforeLast('-')
        val index = id.substringAfterLast('-').toIntOrNull() ?: return null
        if (entries[key]?.shots?.containsKey(index) != true) return null
        val dir = File(root, key)
        File(dir, META).setLastModified(now())
        return File(dir, "$index.png").takeIf { it.isFile }
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
        )
        val tmp = File(dir, ".$META.tmp")
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
            entries.remove(d.name)
        }
    }

    private fun load(): MutableMap<String, Entry> {
        val out = ConcurrentHashMap<String, Entry>()
        for (dir in root.listFiles().orEmpty().filter { it.isDirectory }) {
            runCatching { readMeta(dir) }.getOrNull()?.let { out[dir.name] = it }
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
        return Entry(m["path"] as String, (m["sheets"] as Number).toInt(), shots.associateBy { it.index })
    }

    private fun keyOf(file: File): String =
        MessageDigest.getInstance("SHA-1").digest(file.path.toByteArray()).take(KEY_BYTES).joinToString("") { "%02x".format(it) }

    public companion object {
        public const val MAX_WIDTH: Int = 600
        private const val META = "shots.json"
        private const val KEY_BYTES = 8
        private const val DEFAULT_MAX_MB = 128L
        internal fun galleryMaxMb(env: String?): Long = env?.toLongOrNull() ?: DEFAULT_MAX_MB
    }
}
