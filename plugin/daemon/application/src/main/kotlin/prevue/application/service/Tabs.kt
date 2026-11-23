package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.File
import prevue.application.domain.model.CloseResult
import prevue.application.domain.model.ShowResult

@SingleIn(AppScope::class)
class Tabs @Inject internal constructor(
    private val ws: Workspace,
    private val steps: TabSteps,
    private val live: LiveShot,
) {
    suspend fun openPreview(target: String, index: Int?, params: Map<String, String>, by: String, since: Long? = null): ShowResult =
        ws.exclusive { ed -> steps.openPreview(ed, target, index, params, by, since) }

    suspend fun openFile(path: String, function: String?, by: String): ShowResult? =
        ws.exclusive { ed -> steps.openFile(ed, path, function, by) }

    suspend fun closeTab(target: String, by: String): CloseResult = ws.exclusive { ed -> steps.closeTab(ed, target, by) }

    suspend fun showPreview(by: String): ShowResult = ws.exclusive { ed ->
        live.show(ed, ws.now.current ?: error("보여 주는 프리뷰가 없다 — 먼저 show"), by)
    }

    suspend fun trackFiles(created: List<File>, deleted: List<File>, by: String = "watch"): Unit =
        ws.exclusive { ed -> steps.trackFiles(ed, created, deleted, by) }

    suspend fun catchUp(by: String): ShowResult? = ws.exclusive { ed ->
        if (ws.now.current == null) null else live.catchUp(ed, by)
    }
}
