package prevue.adapter.browser

import dev.zacsweers.metro.Inject
import java.io.File
import prevue.entity.SourceIndex
import prevue.entity.phrase
import prevue.domain.CloseTabUseCase
import prevue.domain.HostsFileUseCase
import prevue.domain.ListPreviewsUseCase
import prevue.domain.OpenPreviewUseCase
import prevue.domain.ReadPreviewFilesUseCase
import prevue.domain.ReadSourceIndexUseCase
import prevue.domain.ReadStatusUseCase
import prevue.adapter.browser.BrowserPresenter.OpenResult

@Inject
internal class BrowserTabs(
    private val core: BrowserPresenter,
    private val openPreview: OpenPreviewUseCase,
    private val close: CloseTabUseCase,
    private val hostsFile: HostsFileUseCase,
    private val listPreviews: ListPreviewsUseCase,
    private val readSourceIndex: ReadSourceIndexUseCase,
    private val readPreviewFiles: ReadPreviewFilesUseCase,
    private val readStatus: ReadStatusUseCase,
) {
    fun switchTab(key: String) = core.post { openPreview(key, null, emptyMap(), by = "viewer") }

    fun closeTab(key: String) = core.post { close(key, by = "viewer") }

    fun open(path: String): OpenResult {
        val f = File(path)
        if (!f.isFile) return OpenResult.NoPreview(phrase("open.missing", "file" to f.name))
        if (!hostsFile(f)) return OpenResult.OtherApp("prevue show ${shellQuote(f.absolutePath)}")
        if (listPreviews(f).isEmpty()) return OpenResult.NoPreview(phrase("open.noPreview", "file" to f.name))
        core.post { openPreview(f.path, null, emptyMap(), by = "viewer") }
        return OpenResult.Opened
    }

    private fun shellQuote(s: String) = if (s.all { it.isLetterOrDigit() || it in "/._-+:@" }) s else "'" + s.replace("'", "'\\''") + "'"

    fun sourceIndex(): SourceIndex? = readSourceIndex()

    fun previewFiles(): Map<String, Any?> = previewFilesJson(readPreviewFiles(), File(readStatus().module.repo).canonicalPath)
}
