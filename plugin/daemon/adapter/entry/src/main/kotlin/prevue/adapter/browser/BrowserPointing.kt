package prevue.adapter.browser

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.flow.update
import prevue.entity.phrase
import prevue.domain.CatchUpUseCase
import prevue.domain.ReadStatusUseCase
import prevue.domain.ResolveFileUseCase
import prevue.domain.SelectUseCase
import prevue.domain.model.FileMatch
import prevue.domain.model.Pointed
import prevue.domain.model.Selection
import prevue.adapter.browser.BrowserPresenter.PointResult

@SingleIn(AppScope::class)
@Inject
internal class BrowserPointing(
    private val core: BrowserPresenter,
    private val resolveFile: ResolveFileUseCase,
    private val select: SelectUseCase,
    private val catchUpLive: CatchUpUseCase,
    private val readStatus: ReadStatusUseCase,
) {
    private var pending: Pointed? = null
    private val chosen = HashMap<String, String>()

    suspend fun point(fileName: String, line: Int, at: Pointed): PointResult {
        val path = core.onLine { chosen[fileName] } ?: when (val r = resolveFile(fileName)) {
            is FileMatch.Path -> r.path
            is FileMatch.Ambiguous -> return core.onLine {
                pending = at
                core.side.update { it.copy(choice = PathChoice(fileName, line, r.candidates, readStatus().module.repo)) }
                PointResult.NeedChoice
            }
            FileMatch.Unknown -> return PointResult.Unknown(phrase("point.unindexed", "file" to fileName, "line" to line))
        }
        return PointResult.Selected(selected(path, line, at))
    }

    suspend fun choose(path: String): PointResult {
        val (c, p) = core.onLine {
            val c = core.side.value.choice ?: return@onLine null
            require(path in c.candidates) { "후보가 아니다: $path" }
            chosen[c.fileName] = path
            (c to pending).also { pending = null; core.side.update { it.copy(choice = null) } }
        } ?: return PointResult.Unknown(phrase("choose.nothing"))
        return PointResult.Selected(selected(path, c.line, p ?: Pointed.NOTHING))
    }

    fun cancelChoice() = core.post { core.onLine { pending = null; core.side.update { it.copy(choice = null) } } }

    suspend fun catchUp(): String? {
        catchUpLive("viewer")
        return core.onLine { core.peek(readStatus()).focus?.treeUrl }
    }

    private suspend fun selected(path: String, line: Int, at: Pointed): Selection = select(path, line, at, "viewer")
}
