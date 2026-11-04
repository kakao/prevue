package prevue.adapter.cli

import dev.zacsweers.metro.Inject
import prevue.domain.ReadStatusUseCase
import prevue.domain.ScrollUseCase
import prevue.domain.SelectUseCase
import prevue.domain.TouchUseCase
import prevue.domain.TypeUseCase
import prevue.domain.model.Pointed
import prevue.domain.model.ScrollResult
import prevue.domain.model.Selection
import prevue.domain.model.TouchResult
import prevue.domain.model.TypeResult

@Inject
internal class CliInput(
    private val touch: TouchUseCase,
    private val scroll: ScrollUseCase,
    private val type: TypeUseCase,
    private val select: SelectUseCase,
    private val readStatus: ReadStatusUseCase,
) {
    suspend fun select(file: String, line: Int, at: Pointed, by: String): Selection = select.invoke(file, line, at, by)
    fun selection(): Selection? = readStatus().selection

    suspend fun touch(type: String, x: Int, y: Int, by: String, settle: Boolean): TouchResult = touch.invoke(type, x, y, by, settle)
    suspend fun touchAt(at: String, type: String, by: String, settle: Boolean): TouchResult = touch.at(at, type, by, settle)
    suspend fun scroll(screens: Double, horizontal: Boolean, at: String?, by: String, until: String? = null): ScrollResult =
        scroll.screens(screens, horizontal, at, by, until)
    suspend fun type(text: String, by: String): TypeResult = type.invoke(text, by)
}
