package prevue.infrastructure.controller.cli

import dev.zacsweers.metro.Inject
import prevue.application.service.Live
import prevue.application.service.Status
import prevue.application.domain.model.Pointed
import prevue.application.domain.model.ScrollResult
import prevue.application.domain.model.Selection
import prevue.application.domain.model.TouchResult
import prevue.application.domain.model.TypeResult

@Inject
internal class CliInput(
    private val live: Live,
    private val status: Status,
) {
    suspend fun select(file: String, line: Int, at: Pointed, by: String): Selection = live.select(file, line, at, by)
    fun selection(): Selection? = status.selection()

    suspend fun touch(type: String, x: Int, y: Int, by: String, settle: Boolean): TouchResult = live.touch(type, x, y, by, settle)
    suspend fun touchAt(at: String, type: String, by: String, settle: Boolean): TouchResult = live.touchAt(at, type, by, settle)
    suspend fun scroll(screens: Double, horizontal: Boolean, at: String?, by: String, until: String? = null): ScrollResult =
        live.scroll(screens, horizontal, at, by, until)
    suspend fun type(text: String, by: String): TypeResult = live.type(text, by)
}
