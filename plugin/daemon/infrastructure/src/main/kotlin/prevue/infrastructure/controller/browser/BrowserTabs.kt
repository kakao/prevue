package prevue.infrastructure.controller.browser

import dev.zacsweers.metro.Inject
import java.io.File
import prevue.application.domain.model.SourceIndex
import prevue.application.domain.model.phrase
import prevue.application.service.Status
import prevue.application.service.Tabs
import prevue.infrastructure.controller.browser.BrowserPresenter.OpenResult

@Inject
internal class BrowserTabs(
    private val core: BrowserPresenter,
    private val tabs: Tabs,
    private val status: Status,
) {
    fun switchTab(key: String) = core.post { tabs.openPreview(key, null, emptyMap(), by = "viewer") }

    fun closeTab(key: String) = core.post { tabs.closeTab(key, by = "viewer") }

    fun open(path: String, function: String?): OpenResult {
        val f = File(path)
        if (!f.isFile) return OpenResult.NoPreview(phrase("open.missing", "file" to f.name))
        if (!status.hosts(f)) return OpenResult.OtherApp("prevue show ${shellQuote(f.absolutePath)}")
        val specs = status.listPreviews(f)
        if (specs.isEmpty()) return OpenResult.NoPreview(phrase("open.noPreview", "file" to f.name))
        if (function != null && specs.none { it.functionName == function }) {
            return OpenResult.NoPreview(phrase("open.noFunction", "file" to f.name, "fn" to function))
        }
        core.post { tabs.openFile(f.path, function, by = "viewer") }
        return OpenResult.Opened
    }

    private fun shellQuote(s: String) = if (s.all { it.isLetterOrDigit() || it in "/._-+:@" }) s else "'" + s.replace("'", "'\\''") + "'"

    fun sourceIndex(): SourceIndex? = status.readSourceIndex()

    fun previewFiles(): Map<String, Any?> =
        previewFilesJson(status.readPreviewFiles(), status.readComposables(), File(status.module().repo).canonicalPath)
}
