package prevue.infrastructure.controller.cli

import dev.zacsweers.metro.Inject
import prevue.application.service.ScrollUseCase
import prevue.application.service.SelectUseCase
import prevue.application.service.Status
import prevue.application.service.TouchUseCase
import prevue.application.service.TypeUseCase
import prevue.application.domain.model.Pointed
import prevue.application.domain.model.ScrollResult
import prevue.application.domain.model.Selection
import prevue.application.domain.model.TouchResult
import prevue.application.domain.model.TypeResult

@Inject
internal class CliInput(
    private val touch: TouchUseCase,
    private val scroll: ScrollUseCase,
    private val type: TypeUseCase,
    private val select: SelectUseCase,
    private val status: Status,
) {
    suspend fun select(file: String, line: Int, at: Pointed, by: String): Selection = select.invoke(file, line, at, by)
    fun selection(): Selection? = status.read().selection

    suspend fun touch(type: String, x: Int, y: Int, by: String, settle: Boolean): TouchResult = touch.invoke(type, x, y, by, settle)
    suspend fun touchAt(at: String, type: String, by: String, settle: Boolean): TouchResult = touch.at(at, type, by, settle)
    suspend fun scroll(screens: Double, horizontal: Boolean, at: String?, by: String, until: String? = null): ScrollResult =
        scroll.screens(screens, horizontal, at, by, until)
    suspend fun type(text: String, by: String): TypeResult = type.invoke(text, by)
}
