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
import prevue.application.port.PreviewRepository
import prevue.application.port.SourceFileRepository
import prevue.application.domain.model.WorkspaceEvent

/**
 * D-56. 이 데몬이 열 수 있는 프리뷰 파일들 — 빠른 열기가 찾는다. 띄울 때 소스 루트를 한 번 훑고([build]), 그 뒤로는 감시가 알린 파일만
 * 다시 본다([update]). 목록(파일 · 함수)이 실제로 바뀔 때만 알린다 — 저장마다 바뀌는 mtime은 조용히 고친다.
 * 작업 공간의 줄을 서지 않는다. 화면이 아니라 색인이고, 줄을 서면 저장 → 화면 뒤로 밀린다.
 */
@SingleIn(AppScope::class)
@Inject
internal class PreviewCatalog(
    private val ws: Workspace,
    private val previews: PreviewRepository,
    private val sources: SourceFileRepository,
) {
    private data class Entry(val module: String, val mtimeMs: Long, val functions: List<String>, val calls: Map<String, List<String>>, val composables: List<String>) {
        fun sameListing(other: Entry?) = other != null && copy(mtimeMs = 0) == other.copy(mtimeMs = 0)
    }

    private class Catalog(val byFile: Map<File, Entry> = emptyMap(), val ready: Boolean = false)

    private val catalog = MutableStateFlow(Catalog())

    /** 다 훑기 전에는 null — "프리뷰 파일이 없다"와 "아직 모른다"를 가른다. */
    fun list(): List<PreviewFile>? {
        val c = catalog.value.takeIf { it.ready } ?: return null
        val defined = definitions(c).keys
        return c.byFile.filterValues { it.functions.isNotEmpty() }
            .map { (f, e) -> PreviewFile(f, e.module, e.mtimeMs, e.functions, e.calls.mapValues { (_, names) -> names.filter(defined::contains) }) }
            .sortedByDescending { it.mtimeMs }
    }

    fun definitions(): Map<String, List<ComposableDefinition>>? = catalog.value.takeIf { it.ready }?.let(::definitions)

    private fun definitions(c: Catalog): Map<String, List<ComposableDefinition>> =
        c.byFile.entries.sortedBy { it.key.path }
            .flatMap { (f, e) -> e.composables.map { it to ComposableDefinition(f, e.module) } }
            .groupBy({ it.first }, { it.second })

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
        val fns = if (text.contains("Preview")) runCatching { previews.inFile(f) }.getOrNull().orEmpty().map { it.functionName }.distinct() else emptyList()
        val outline = previews.outline(text, fns)
        if (fns.isEmpty() && outline.composables.isEmpty()) return null
        return Entry(ws.graph.ownerOf(f), sources.modifiedAt(f) ?: 0L, fns, outline.calls, outline.composables)
    }
}
