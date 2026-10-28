package prevue.daemon.adapter.watch

import java.io.File
import java.nio.file.Files
import java.util.Locale
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.FlowCollector
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.buffer
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import prevue.daemon.domain.port.SourceChange
import prevue.daemon.domain.port.SourceWatcher

// 외부: macOS 의 WatchService 는 폴링 구현이고 감도가 초 단위다
class PollingSourceWatcher(
    private val roots: List<File>,
    private val extension: String = "kt",
    private val context: CoroutineContext = Dispatchers.IO,
) : SourceWatcher {
    var hotPeriodMs = 100L
    var periodMs = 300L
    var debounceMs = 150L
    var debounceStepMs = 40L
    var statSliceTicks = 8
    var dirEveryTicks = 2
    var rewalkMs = 30_000L
    var hotMax = 32

    private val _stats = MutableStateFlow<Map<String, Any?>>(emptyMap())
    override val stats: Map<String, Any?> get() = _stats.value

    override fun changes(hot: () -> List<File>): Flow<SourceChange> =
        flow { Scan(hot).run(this) }.buffer(Channel.RENDEZVOUS).flowOn(context)

    private class Batch {
        val changed = LinkedHashSet<File>()
        val created = LinkedHashSet<File>()
        val deleted = LinkedHashSet<File>()
        fun isEmpty() = changed.isEmpty() && created.isEmpty() && deleted.isEmpty()
    }

    private inner class Scan(private val hotFiles: () -> List<File>) {
        private val files = HashMap<File, Long>()
        private val dirs = HashMap<File, Long>()
        private val hot = LinkedHashSet<File>()
        private val inodes = HashMap<File, Any>()

        private var order: Array<File> = emptyArray()
        private var cursor = 0
        private var stale = true
        private var lastWalk = 0L

        private var ticks = 0L; private var slowTicks = 0L
        private var hotNs = 0L; private var dirNs = 0L; private var sliceNs = 0L; private var walkNs = 0L

        suspend fun run(out: FlowCollector<SourceChange>) {
            roots.forEach { register(it) }
            val started = System.nanoTime()
            lastWalk = System.currentTimeMillis()
            val slowEvery = maxOf(1L, periodMs / hotPeriodMs)
            while (true) {
                delay(hotPeriodMs)
                val b = Batch()
                timed({ hotNs += it }) { hotPass(b.changed) }
                if (ticks % slowEvery == 0L) slowPass(b)
                ticks++
                updateStats(started)
                if (!b.isEmpty()) settled(b)?.let { out.emit(it) }
            }
        }

        private inline fun timed(add: (Long) -> Unit, block: () -> Unit) {
            val t = System.nanoTime()
            block()
            add(System.nanoTime() - t)
        }

        private fun slowPass(b: Batch) {
            timed({ dirNs += it }) { if (slowTicks % dirEveryTicks == 0L) dirPass(b) }
            timed({ sliceNs += it }) { slicePass(b.changed) }
            if (System.currentTimeMillis() - lastWalk >= rewalkMs) {
                lastWalk = System.currentTimeMillis()
                timed({ walkNs += it }) { rewalk(b) }
            }
            slowTicks++
        }

        private fun rewalk(b: Batch) {
            val gone = files.keys.filter { !it.isFile }
            gone.forEach { files.remove(it) }; b.deleted += gone
            if (gone.isNotEmpty() or dirs.keys.removeIf { !it.isDirectory }) stale = true
            roots.forEach { register(it, b.created) }
        }

        private fun updateStats(started: Long) {
            val busy = hotNs + dirNs + sliceNs + walkNs
            val slow = maxOf(1, slowTicks)
            _stats.value = mapOf("files" to files.size, "dirs" to dirs.size, "hotSet" to hot.size, "ticks" to ticks,
                "hotPeriodMs" to hotPeriodMs, "periodMs" to periodMs,
                "cpuPct" to String.format(Locale.ROOT, "%.2f", busy * 100.0 / (System.nanoTime() - started)),
                "usPerTick" to mapOf("hot" to hotNs / ticks / 1000, "dir" to dirNs / slow / 1000,
                    "slice" to sliceNs / slow / 1000, "walk" to walkNs / slow / 1000))
        }

        private suspend fun settled(b: Batch): SourceChange? {
            val changed = b.changed
            if (changed.isNotEmpty()) settle(changed)
            hotPass(changed)
            val batch = changed.toList()
            remember(batch)
            val existing = batch.filter { it.isFile }
            if (existing.isEmpty() && b.created.isEmpty() && b.deleted.isEmpty()) return null
            val mtime = (existing + b.created.filter { it.isFile }).maxOfOrNull { it.lastModified() } ?: System.currentTimeMillis()
            return SourceChange(existing, mtime, System.currentTimeMillis(), System.nanoTime(),
                b.created.filter { it.isFile }, b.deleted.filter { !it.isFile })
        }

        private fun remember(batch: List<File>) {
            batch.forEach { files[it] = it.lastModified(); inode(it)?.let { i -> inodes[it] = i } }
            hot += batch
            while (hot.size > hotMax) hot.remove(hot.first())
        }

        private suspend fun settle(changed: Set<File>) {
            if (changed.all { f -> val old = inodes[f]; old != null && inode(f) != old }) return
            val start = System.nanoTime()
            var last = changed.associateWith { it.lastModified() to it.length() }
            while ((System.nanoTime() - start) / 1_000_000 < debounceMs) {
                delay(debounceStepMs)
                val now = changed.associateWith { it.lastModified() to it.length() }
                if (now == last) return
                last = now
            }
        }

        private fun inode(f: File): Any? = runCatching { Files.getAttribute(f.toPath(), "unix:ino") }.getOrNull()

        private fun hotPass(changed: MutableSet<File>) {
            for (f in hot) if (files[f] != f.lastModified()) changed += f
            for (f in hotFiles()) if (f.isFile && files[f] != f.lastModified()) changed += f
            for (f in hot) if (f !in changed && f !in inodes) inode(f)?.let { inodes[f] = it }
            for (f in hotFiles()) if (f !in changed && f !in inodes) inode(f)?.let { inodes[f] = it }
        }

        private fun dirPass(b: Batch) {
            val fresh = ArrayList<File>()
            val touched = ArrayList<File>()
            for (e in dirs.entries) {
                val cur = e.key.lastModified()
                if (cur == e.value) continue
                e.setValue(cur)
                touched += e.key
                rescan(e.key, b, fresh)
            }
            if (touched.isNotEmpty()) sweep(touched.toSet(), b.deleted)
            fresh.forEach { register(it, b.created) }
        }

        private fun rescan(dir: File, b: Batch, fresh: MutableList<File>) {
            for (k in dir.listFiles().orEmpty()) {
                if (k.isDirectory) { if (k !in dirs) fresh += k; continue }
                if (k.extension != extension) continue
                val m = k.lastModified()
                val known = files[k]
                if (known == null) { files[k] = m; stale = true; b.created += k } else if (known != m) b.changed += k
            }
        }

        private fun sweep(at: Set<File>, deleted: MutableSet<File>) {
            val gone = files.keys.filter { it.parentFile in at && !it.isFile }
            if (gone.isEmpty()) return
            gone.forEach { files.remove(it); hot.remove(it); inodes.remove(it) }
            deleted += gone
            stale = true
        }

        private fun slicePass(changed: MutableSet<File>) {
            if (stale) { order = files.keys.toTypedArray(); cursor = 0; stale = false }
            if (order.isEmpty()) return
            val n = (order.size + statSliceTicks - 1) / statSliceTicks
            repeat(n) {
                val f = order[cursor]
                cursor = (cursor + 1) % order.size
                val known = files[f]
                if (known != null && known != f.lastModified()) changed += f
            }
        }

        private fun register(dir: File, created: MutableSet<File>? = null) {
            for (f in dir.walkTopDown()) {
                if (f.isDirectory) { if (dirs.putIfAbsent(f, f.lastModified()) == null) stale = true }
                else if (f.extension == extension) { if (files.putIfAbsent(f, f.lastModified()) == null) { stale = true; created?.add(f) } }
            }
        }
    }
}
