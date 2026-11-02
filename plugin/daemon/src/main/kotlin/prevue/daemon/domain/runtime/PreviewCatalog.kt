package prevue.daemon.domain.runtime

import java.io.File
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.getAndUpdate
import kotlinx.coroutines.flow.update
import prevue.daemon.domain.model.PreviewFile
import prevue.daemon.domain.port.PreviewRepository
import prevue.daemon.domain.port.SourceFileRepository
import prevue.daemon.domain.model.WorkspaceEvent

/**
 * D-56. 이 데몬이 열 수 있는 프리뷰 파일들 — 빠른 열기가 찾는다. 띄울 때 소스 루트를 한 번 훑고([build]), 그 뒤로는 감시가 알린 파일만
 * 다시 본다([update]). 목록(파일 · 함수)이 실제로 바뀔 때만 알린다 — 저장마다 바뀌는 mtime은 조용히 고친다.
 * 작업 공간의 줄을 서지 않는다. 화면이 아니라 색인이고, 줄을 서면 저장 → 화면 뒤로 밀린다.
 */
internal class PreviewCatalog(
    private val ws: Workspace,
    private val previews: PreviewRepository,
    private val sources: SourceFileRepository,
    private val hosts: (File) -> Boolean,
) {
    private class Catalog(val byFile: Map<File, PreviewFile> = emptyMap(), val ready: Boolean = false)

    private val catalog = MutableStateFlow(Catalog())

    /** 다 훑기 전에는 null — "프리뷰 파일이 없다"와 "아직 모른다"를 가른다. */
    fun list(): List<PreviewFile>? = catalog.value.takeIf { it.ready }?.byFile?.values?.sortedByDescending { it.mtimeMs }

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

    /** 목록이 바뀌었으면 참. */
    private fun scan(f: File): Boolean {
        val c = f.canonicalFile
        return put(c, if (c.extension == "kt" && c.isFile && hosts(c)) read(c) else null)
    }

    private fun put(c: File, entry: PreviewFile?): Boolean {
        val old = catalog.getAndUpdate {
            when {
                it.byFile[c] == entry -> it
                entry == null -> Catalog(it.byFile - c, it.ready)
                else -> Catalog(it.byFile + (c to entry), it.ready)
            }
        }.byFile[c]
        return old?.functions != entry?.functions
    }

    private fun read(f: File): PreviewFile? {
        val text = runCatching { f.readText() }.getOrNull() ?: return null
        // 멀티프리뷰를 풀려면 처음 보는 애노테이션마다 클래스패스를 뒤진다. 수천 파일에 그 값을 치르지 않게 "Preview"가 없는 파일은 건너뛴다 —
        // 이름에 Preview가 없는 멀티프리뷰 애노테이션만 쓰는 파일은 놓친다(androidx 것과 AS 관례는 모두 이름에 있다).
        if (!text.contains("Preview")) return null
        val fns = runCatching { previews.inFile(f) }.getOrNull().orEmpty().map { it.functionName }.distinct()
        return if (fns.isEmpty()) null else PreviewFile(f, ws.graph.ownerOf(f), f.lastModified(), fns)
    }
}
