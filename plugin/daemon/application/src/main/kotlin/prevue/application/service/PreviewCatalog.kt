package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.File
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.getAndUpdate
import kotlinx.coroutines.flow.update
import prevue.application.domain.model.ComposableDefinition
import prevue.application.domain.model.PreviewFile
import prevue.application.domain.model.PreviewIndex
import prevue.application.port.PreviewRepository
import prevue.application.port.SourceFileRepository
import prevue.application.domain.model.WorkspaceEvent

@SingleIn(AppScope::class)
@Inject
internal class PreviewCatalog(
    private val ws: Workspace,
    private val previews: PreviewRepository,
    private val sources: SourceFileRepository,
) {
    private data class Entry(
        val module: String, val mtimeMs: Long, val functions: List<String>, val calls: Map<String, List<String>>, val composables: List<String>,
    ) {
        fun sameListing(other: Entry?) = other != null && copy(mtimeMs = 0) == other.copy(mtimeMs = 0)
    }

    private class Catalog(val byFile: Map<File, Entry> = emptyMap(), val ready: Boolean = false) {
        val index: PreviewIndex by lazy {
            val composables = byFile.entries.sortedBy { it.key.path }
                .flatMap { (f, e) -> e.composables.map { it to ComposableDefinition(f, e.module) } }
                .groupBy({ it.first }, { it.second })
            val files = byFile.filterValues { it.functions.isNotEmpty() }
                .map { (f, e) -> PreviewFile(f, e.module, e.mtimeMs, e.functions, e.calls.mapValues { (_, names) -> names.filter(composables::containsKey) }) }
                .sortedByDescending { it.mtimeMs }
            PreviewIndex(files, composables)
        }
    }

    private val catalog = MutableStateFlow(Catalog())

    /** 다 훑기 전에는 null — "프리뷰 파일이 없다"와 "아직 모른다"를 가른다. */
    fun list(): List<PreviewFile>? = index()?.files

    fun index(): PreviewIndex? = catalog.value.takeIf { it.ready }?.index

    suspend fun build() {
        for (f in sources.sourceFiles()) { currentCoroutineContext().ensureActive(); scan(f) }
        catalog.update { Catalog(it.byFile, ready = true) }
        ws.emit(WorkspaceEvent.PreviewFilesChanged)
    }

    fun update(changed: List<File>, deleted: List<File>) {
        var hit = false
        for (f in deleted) hit = put(f.canonicalFile, null) or hit
        for (f in changed) hit = scan(f) or hit
        if (hit && catalog.value.ready) ws.emit(WorkspaceEvent.PreviewFilesChanged)
    }

    private fun scan(f: File): Boolean {
        val c = f.canonicalFile
        return put(c, if (c.extension == "kt" && sources.has(c) && ws.hosts(c)) read(c) else null)
    }

    private fun put(c: File, entry: Entry?): Boolean {
        val old = catalog.getAndUpdate {
            when {
                it.byFile[c] == entry -> it
                entry == null -> Catalog(it.byFile - c, it.ready)
                else -> Catalog(it.byFile + (c to entry), it.ready)
            }
        }.byFile[c]
        return if (old == null) entry != null else !old.sameListing(entry)
    }

    private fun read(f: File): Entry? {
        val text = sources.read(f) ?: return null
        val fns = if (text.contains("Preview")) previewFunctions(f) else emptyList()
        if (fns.isEmpty() && !text.contains("Composable")) return null
        val outline = previews.outline(text, fns)
        if (fns.isEmpty() && outline.composables.isEmpty()) return null
        return Entry(ws.graph.ownerOf(f), sources.modifiedAt(f) ?: 0L, fns, outline.calls, outline.composables)
    }

    private fun previewFunctions(f: File): List<String> = runCatching { previews.inFile(f) }
        .getOrElse { e -> System.err.println("[prevue] ${f.name}의 프리뷰를 읽지 못해 빠른 열기에서 뺀다: $e"); emptyList() }
        .map { it.functionName }.distinct()
}
