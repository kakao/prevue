package prevue.infrastructure.controller.browser

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import prevue.application.domain.model.phrase
import prevue.application.service.Live
import prevue.application.service.Status
import prevue.application.service.Tabs
import prevue.application.domain.model.FileMatch
import prevue.application.domain.model.Pointed
import prevue.application.domain.model.Selection
import prevue.infrastructure.controller.browser.BrowserPresenter.PointResult

@SingleIn(AppScope::class)
@Inject
internal class BrowserPointing(
    private val core: BrowserPresenter,
    private val status: Status,
    private val live: Live,
    private val tabs: Tabs,
) {
    private var pending: Pointed? = null
    private val chosen = HashMap<String, String>()

    suspend fun point(fileName: String, line: Int, at: Pointed): PointResult {
        val path = core.onLine { chosen[fileName] } ?: when (val r = status.resolveFile(fileName)) {
            is FileMatch.Path -> r.path
            is FileMatch.Ambiguous -> return core.onLine {
                pending = at
                core.showChoice(PathChoice(fileName, line, r.candidates, status.module().repo))
                PointResult.NeedChoice
            }
            FileMatch.Unknown -> return PointResult.Unknown(phrase("point.unindexed", "file" to fileName, "line" to line))
        }
        return PointResult.Selected(selected(path, line, at))
    }

    suspend fun choose(path: String): PointResult {
        val (c, p) = core.onLine {
            val c = core.choice() ?: return@onLine null
            require(path in c.candidates) { "후보가 아니다: $path" }
            chosen[c.fileName] = path
            (c to pending).also { pending = null; core.showChoice(null) }
        } ?: return PointResult.Unknown(phrase("choose.nothing"))
        return PointResult.Selected(selected(path, c.line, p ?: Pointed.NOTHING))
    }

    fun cancelChoice() = core.post { core.onLine { pending = null; core.showChoice(null) } }

    suspend fun catchUp(): String? {
        tabs.catchUp("viewer")
        return core.treeUrl()
    }

    private suspend fun selected(path: String, line: Int, at: Pointed): Selection = live.select(path, line, at, "viewer")
}
