package prevue.daemon.domain.runtime

import prevue.daemon.entity.Phrase
import prevue.daemon.entity.phrase
import java.io.File
import java.io.IOException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.ResourceKey
import prevue.daemon.domain.port.ResourceValues
import prevue.daemon.domain.policy.ResourcePolicy

class ResourcePatches(private val values: ResourceValues?, private val reappearMs: Long = 500) {
    private val known = MutableStateFlow(emptyMap<String, String>())

    data class Outcome(val patched: Int, val stale: Phrase?, val compile: CompileResult?) {
        val same: Boolean get() = patched == 0 && stale == null
    }

    fun remember(files: List<File>) {
        val read = files.mapNotNull { f -> runCatching { f.readText() }.getOrElse { if (it is IOException) null else throw it }?.let { f.canonicalPath to it } }
        known.update { it + read }
    }

    suspend fun apply(files: List<File>): Outcome {
        val t = System.nanoTime()
        val batch = Batch(values?.takeIf { it.ready() })
        for (f in files) {
            val old = known.value[f.canonicalPath]
            val text = read(f)
            if (text != old) batch.judge(f, old, text)
        }
        val n = batch.put()
        batch.commit()
        val compile = if (n == 0) null else CompileResult(true, CompileResult.RESOURCES, "리소스 값 ${n}개를 Gradle 없이 바꿨다",
            (System.nanoTime() - t) / 1_000_000, batch.patchedPaths())
        return Outcome(n, batch.stale, compile)
    }

    private inner class Batch(private val values: ResourceValues?) {
        private val puts = ArrayList<Put>()
        private val settled = HashMap<String, String?>()
        var stale: Phrase? = null
            private set

        fun judge(f: File, old: String?, text: String?) {
            val v = values
            when {
                v == null -> settle(f, text, phrase("resource.noLayer"))
                text == null -> settle(f, null, phrase("resource.fileGone"))
                old == null -> settle(f, text, phrase("resource.newFile"))
                else -> plan(v, f, old, text)
            }
        }

        private fun plan(v: ResourceValues, f: File, old: String, text: String) {
            val after = v.parse(f, text) ?: return markStale(f, phrase("resource.unreadable"))
            val before = v.parse(f, old) ?: return settle(f, text, phrase("resource.unreadableBefore"))
            val p = ResourcePolicy.plan(before, after, v::lookup)
            p.stale?.let { markStale(f, it) }
            if (p.patch.isEmpty()) settled[f.canonicalPath] = text else puts += Put(f, text, p.patch)
        }

        fun put(): Int {
            val v = values ?: return 0
            var n = 0
            for (p in puts) {
                if (v.put(p.file, p.text, p.keys)) { n += p.keys.size; settled[p.file.canonicalPath] = p.text }
                else markStale(p.file, phrase("resource.putFailed"))
            }
            return n
        }

        fun commit() = known.update { now ->
            now - settled.filterValues { it == null }.keys + settled.mapNotNull { (k, v) -> v?.let { k to it } }
        }

        fun patchedPaths(): List<String> = puts.map { it.file.absolutePath }

        private fun settle(f: File, text: String?, why: Phrase) {
            markStale(f, why)
            settled[f.canonicalPath] = text
        }

        private fun markStale(f: File, why: Phrase) { if (stale == null) stale = phrase("resource.inFile", "file" to f.name, "why" to why) }
    }

    private suspend fun read(f: File): String? {
        val until = System.nanoTime() + reappearMs * 1_000_000
        while (true) {
            runCatching { f.readText() }.getOrElse { if (it is IOException) null else throw it }?.let { return it }
            if (System.nanoTime() >= until) return null
            delay(50)
        }
    }

    private class Put(val file: File, val text: String, val keys: List<ResourceKey>)

    companion object {
        fun isValues(f: File): Boolean = f.extension == "xml" && f.parentFile?.name?.startsWith("values") == true && f.parentFile?.parentFile?.name == "res"
    }
}
