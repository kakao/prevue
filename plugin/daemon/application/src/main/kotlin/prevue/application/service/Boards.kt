package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import prevue.application.domain.model.CardAdjustment
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.EdgeToEdge
import prevue.application.domain.model.FocusResult
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.SystemUi

@SingleIn(AppScope::class)
class Boards @Inject internal constructor(
    private val ws: Workspace,
    private val cards: BoardCards,
    private val boardFocus: BoardFocus,
    private val filler: BoardFiller,
) {
    fun fill(by: String, since: Long? = null) = filler.start(by, since)

    suspend fun drawCard(index: Int, force: Boolean, by: String, await: Boolean = true): CardResult {
        val pending = ws.exclusive { ed -> cards.startCard(ed, index, force, by) }
        if (await || pending.isCompleted) return pending.await()
        return CardResult.Pending(index)
    }

    suspend fun focus(
        index: Int, on: Boolean, by: String, size: ScreenSize? = null, systemUi: SystemUi? = null, edgeToEdge: EdgeToEdge? = null,
    ): FocusResult = ws.exclusive { ed -> boardFocus.focus(ed, index, on, by, CardAdjustment(size, systemUi, edgeToEdge)) }

    suspend fun unfocus(by: String): Unit = ws.exclusive { ed -> boardFocus.leave(ed, by) }
}
