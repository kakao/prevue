package prevue.daemon.adapter.browser

import prevue.daemon.entity.Phrase
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.Selection

/**
 * 뷰어가 그릴 것 전부(D-41·D-42). 브라우저는 이것을 받아 그리기만 한다 — 문장 · 이름표 · 모드는 여기서 정해진다.
 * 탭이 여럿이어도 같은 상태를 본다. 구독하면 곧바로 지금 값을 받으므로 새 탭·재연결이 따로 맞출 것이 없다.
 */
data class BrowserState(
    /** 바뀔 때마다 오른다. 뷰어가 옛 상태를 새 상태로 덮지 않게. */
    val version: Long,
    val header: Header,
    val screen: Screen,
    val board: BoardScreen?,
    val focus: FocusScreen?,
    val stale: List<StaleRow>,
    /**
     * 컴파일·렌더가 돌거나 보드가 아직 다 차지 않았다(D-63) — 알약이 돌고 툴바 아래 진행 빛이 켜진다.
     * 첫 장에서 끄지 않는다: 나머지 카드가 흐린 채 바뀌는 동안 ✓ 이면 사람은 다 됐다고 읽는다. CLI `wait`도 보드가 다 찬 뒤 답한다(D-34).
     */
    val busy: Boolean,
    /** 알약 글자이자 상태 팝오버 첫 줄 — 일하는 중이면 그 단계(`컴파일 중… X.kt` · `12/25`), 마지막이 실패면 그것, 아니면 장 수. */
    val boardNote: Phrase?,
    /** 마지막으로 누가 언제 무엇을 그렸나. */
    val who: Phrase?,
    val timing: List<TimingPart>,
    /** 한 장 화면에 남겨야 할 렌더 실패 — 실패는 화면에 오류로 남긴다(FR-9). 열린 탭이 없는 것은 실패가 아니라 시작 화면이다(D-63). */
    val error: Phrase?,
    val selection: Selection?,
    /** 가리킨 파일의 이름이 저장소에 여럿이다 — 사람이 골라야 풀패스가 붙는다. */
    val choice: PathChoice?,
    /** 뷰어 탭(D-54) — 열린 순서. 둘 이상일 때만 탭 줄이 보인다. */
    val tabs: List<TabChip> = emptyList(),
    /** 인터랙티브가 정착한 계측 한 줄(프레임 · 틱 · 인코딩) — 상태 팝오버에 둔다. 조작 중에만 있다(D-63, 알림 캡슐에 띄우던 것). */
    val settle: Phrase? = null,
    /** 지금 탭의 파일이 그릴 것을 잃었다 — 빈 화면에 띄우는 한 줄([Screen.VACANT]). */
    val vacant: Phrase? = null,
    val buildPending: Boolean = false,
) {
    /** VACANT — 탭은 있는데 그 파일이 지워졌거나 `@Preview`를 잃었다. 탭이 0개인 시작 화면(EMPTY)과 가른다. */
    enum class Screen { EMPTY, BOARD, FOCUS, VACANT }

    companion object {
        val EMPTY = BrowserState(0, Header("Prevue", "Prevue", "", "", "", ""), Screen.EMPTY, null, null, emptyList(),
            false, null, null, emptyList(), null, null, null)
    }
}

/** 머리말. 워크트리를 나란히 열면 파일명이 같아 탭만으로는 못 고른다 — 탭 제목에 저장소를 앞세운다. */
data class Header(val title: String, val tabTitle: String, val repoPrefix: String, val repoLeaf: String, val detail: String, val repo: String,
                  /** 대상 저장소의 지금 브랜치(detached면 짧은 해시). 저장소가 아니면 null. 폴더 이름과 따로 논다 — 워크트리에서 브랜치를 바꿀 수 있다. */
                  val branch: String? = null)

data class BoardScreen(val file: String, val gen: Int, val focus: Int, val groups: List<CardGroup>)

/**
 * 같은 함수가 낸 카드 묶음 — 보드의 단위(D-62). 한 장뿐인 함수도 묶음이다: 배율 · 접기 · 장 수 · 실패 수가 늘 머리의 같은 자리에 오고,
 * 나란히 놓인 묶음끼리 머리 줄과 카드 윗선이 맞는다. 머리 없이 두면 옆 묶음보다 카드가 머리 높이만큼 올라앉았다(리뷰 7).
 */
data class CardGroup(val name: String, val cards: List<CardState>, val failed: Int)

data class CardState(
    val index: Int,
    val previewId: String,
    /** `name=`만 — 함수 이름은 묶음 머리가 갖는다. 없으면 빈 문자열이다. 제공자 값이 여럿이면 몇 번째인지를 붙인다. */
    val label: String,
    val title: String,
    /** `name` 밖의 `@Preview` 인자 — 소스 표기 그대로라 툴팁에만 쓴다. */
    val args: String,
    /** 인자를 사람이 읽을 칸으로 옮긴 것(크기 dp · 다크 · 글자 배율 …). */
    val specs: List<CardSpec>,
    val ok: Boolean?,
    val rendered: Boolean,
    /** 옛 코드로 그린 그림이다(세대가 낮다). */
    val stale: Boolean,
    val isFocus: Boolean,
    val imageUrl: String?,
    val treeUrl: String?,
    /** 그렸으면 크기·시간, 아니면 null. */
    val meta: Phrase?,
    /** 실패했으면 종류와 메시지. 조용한 빈 카드를 만들지 않는다(FR-9). */
    val failure: Phrase?,
    /**
     * 그림의 dp 크기 — 뷰어가 묶음 배율을 재는 입력이다(D-62). 배율은 창 폭에 달려 뷰어가 정하고 여기에는 싣지 않는다(D-22).
     * 그리기 전의 내용 크기 프리뷰는 모른다(null).
     */
    val widthDp: Double?,
    val heightDp: Double?,
    /** 밀도를 모르는 기기(`id:`)라 크기를 짐작했다. */
    val dpGuess: Boolean,
)

/**
 * 한 장 화면. 보드의 카드 하나에 태스크를 건 인터랙티브이거나, FQN으로 연 단건이다.
 * [streamUrl]은 태스크가 걸린 **뒤에만** 찬다 — 먼저 열면 구독 순간의 마지막 프레임이 직전 프리뷰의 것이다(실측).
 */
data class FocusScreen(
    val previewId: String,
    val interactive: Boolean,
    /** 보드로 돌아갈 데가 있다. FQN 단건이면 없다. */
    val fromBoard: Boolean,
    val imageUrl: String,
    val treeUrl: String,
    val streamUrl: String?,
    /** 그림 1dp 가 PNG 몇 px 인가. 뷰어의 `100%`(실제 크기)가 이것이다. 이름 붙은 기기는 밀도를 몰라 null. */
    val pxPerDp: Double? = null,
    /**
     * 제목 위 줄 — 프리뷰 이름(`name=`). 없으면 null이고 제목은 [fn] 한 줄이다(D-63).
     * 카드 이름표(`label`)에서 잘라 쓰지 않는다 — 이름표는 보드의 규칙을 따라 바뀐다.
     * FQN 단건은 `@Preview` 인자 없이 그려 `--param name=`을 줬을 때만 있다.
     */
    val name: String? = null,
    /** 제목 아래 줄 — 함수 이름. 제공자 값이 여럿이면 몇 번째인지(` · 2`)를 붙인다. 묶음의 다섯 장이 모두 `foldable`이어도 어느 함수인지 남는다. */
    val fn: String = "",
    val size: ScreenSize? = null,
    val postures: List<PostureImage> = emptyList(),
)

data class PostureImage(val size: ScreenSize, val imageUrl: String, val dp: DpSize)

/**
 * 탭 한 칸. 이름을 먼저 읽게 [dim](`.kt` · FQN 탭의 ` · 파일`)은 흐리게 그린다. [module]은 같은 이름의 탭이 둘 이상일 때만 찬다 —
 * 늘 붙이면 탭 10개에서 이름이 잘린다.
 */
data class TabChip(val key: String, val name: String, val dim: String, val module: String?, val title: String, val active: Boolean, val stale: Boolean)

data class StaleRow(val head: Phrase, val why: List<Phrase>)

/**
 * 상태 팝오버의 시간 한 줄. [over]는 그 일의 기준(NFR)을 넘었다 — 하나라도 넘으면 알약이 주황이다(D-63).
 * [head]인 줄의 [text]가 ✓ 옆 숫자다 — 첫 장(저장 → 화면), 데몬이 막 떴으면 콜드, 컴파일이 실패했으면 합계.
 * 새 일이 첫 장을 내기 전에는 줄이 없다 — 남은 줄은 지난 일의 것이다.
 */
data class TimingPart(val label: Phrase, val ms: Long, val over: Boolean, val text: String = "${ms}ms", val head: Boolean = false)

data class PathChoice(val fileName: String, val line: Int, val candidates: List<String>, val repoRoot: String)

/** 일회성 알림(D-42). 지나간 것을 새 탭에 다시 보일 이유가 없어 상태에 넣지 않는다. */
sealed interface UiEvent {
    data class Flash(val text: Phrase) : UiEvent
    /** D-56. 빠른 열기의 목록이 바뀌었다 — 목록은 싣지 않는다. 뷰어가 `/preview-files.json`을 다시 받는다. */
    data object PreviewFiles : UiEvent
    /** 소스 파일 색인이 바뀌었다 — 뷰어가 `/project-files.json`을 다시 받는다. */
    data object ProjectFiles : UiEvent
}
