package prevue.infrastructure.controller.browser

import prevue.application.domain.model.Phrase
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.DeviceInsetState
import prevue.application.domain.model.SystemUiState
import prevue.application.domain.model.Selection

internal data class BrowserState(
    val version: Long,
    val header: Header,
    val screen: Screen,
    val board: BoardScreen?,
    val focus: FocusScreen?,
    val stale: List<StaleRow>,
    val busy: Boolean,
    val boardNote: Phrase?,
    val who: Phrase?,
    val timing: List<TimingPart>,
    val error: Phrase?,
    val selection: Selection?,
    val choice: PathChoice?,
    val tabs: List<TabChip> = emptyList(),
    val settle: Phrase? = null,
    val vacant: Phrase? = null,
    val buildPending: Boolean = false,
) {
    enum class Screen { EMPTY, BOARD, FOCUS, VACANT }

    companion object {
        val EMPTY = BrowserState(0, Header("Prevue", "Prevue", "", "", "", "", ""), Screen.EMPTY, null, null, emptyList(),
            false, null, null, emptyList(), null, null, null)
    }
}

internal data class Header(val title: String, val tabTitle: String, val repoPrefix: String, val repoLeaf: String, val module: String, val variant: String,
                  val repo: String,
                  val branch: String? = null,
                  val sourceSet: String? = null)

internal data class BoardScreen(val file: String, val gen: Int, val focus: Int, val groups: List<CardGroup>)

internal data class CardGroup(val name: String, val cards: List<CardState>, val failed: Int)

internal data class CardState(
    val index: Int,
    val previewId: String,
    val label: String,
    val title: String,
    val args: String,
    val specs: List<CardSpec>,
    val ok: Boolean?,
    val rendered: Boolean,
    val stale: Boolean,
    val isFocus: Boolean,
    val imageUrl: String?,
    val treeUrl: String?,
    val failure: Phrase?,
    val widthDp: Double?,
    val heightDp: Double?,
    val dpGuess: Boolean,
)

internal data class FocusScreen(
    val previewId: String,
    val interactive: Boolean,
    val imageUrl: String,
    val treeUrl: String,
    val streamUrl: String?,
    val pxPerDp: Double? = null,
    val name: String? = null,
    val fn: String = "",
    val size: ScreenSize? = null,
    val systemUi: SystemUiState? = null,
    val deviceInsets: DeviceInsetState? = null,
    val postures: List<PostureImage> = emptyList(),
)

internal data class PostureImage(val size: ScreenSize, val imageUrl: String, val dp: DpSize)

internal data class TabChip(val key: String, val name: String, val dim: String, val module: String?, val title: String, val active: Boolean, val stale: Boolean,
                   val sourceSet: String? = null)

internal data class StaleRow(val head: Phrase, val why: List<Phrase>)

internal data class TimingPart(val label: Phrase, val ms: Long, val over: Boolean, val text: String = "${ms}ms", val head: Boolean = false)

internal data class PathChoice(val fileName: String, val line: Int, val candidates: List<String>, val repoRoot: String)

internal sealed interface UiEvent {
    data class Flash(val text: Phrase) : UiEvent
    data object PreviewFiles : UiEvent
    data object GalleryShots : UiEvent
    data object ProjectFiles : UiEvent
}
