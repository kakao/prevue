package prevue.daemon.domain.model

import java.io.File
import prevue.daemon.entity.PreviewSpec

/**
 * 뷰어 탭 하나 — 파일 하나의 보드, 또는 FQN으로 연 한 장(D-54). 지금 보는 탭의 보드는 `Workspace.board`가 쥐고,
 * [board]는 숨어 있는 동안만 뜻이 있다. 숨은 탭은 보드 값만 쥐고 렌더 상태 · 비트맵을 쥐지 않는다(NFR-20).
 */
data class Tab(
    /** 파일이면 정규 경로, FQN이면 그 이름. `show`가 같은 탭을 찾는 열쇠다. */
    val key: String,
    val file: File?,
    /** FQN 탭의 한 장. 파일 탭이면 null. */
    val spec: PreviewSpec?,
    /** `--param`은 탭의 설정이다 — 다시 `show`할 때 안 주면 그대로 간다. */
    val params: Map<String, String>,
    val board: Board?,
    /** 숨은 동안 성공한 컴파일이 있었다 — 그림이 옛 코드다. 옮길 때 다시 그린다. */
    val stale: Boolean = false,
    /** 마지막으로 본 시각. 상한을 넘으면 가장 오래 안 본 탭을 닫는다. */
    val seenAtMs: Long,
    /** 파일이 그릴 것을 잃었다 — 탭은 남기고 빈 화면이다. 다시 프리뷰가 생기면 저장 · 옮기기가 되살린다. */
    val vacant: Vacancy? = null,
) {
    val fqn: String? get() = spec?.fqn
}

/** 탭의 파일이 지워졌거나 `@Preview`가 하나도 없다. */
enum class Vacancy { NO_PREVIEWS, DELETED }

/**
 * 연 탭의 파일이 그릴 것을 잃었다. 탭은 이미 빈 화면으로 옮겼다 — CLI는 이 문장을 오류로 받고, 뷰어는 [WorkspaceEvent.TabVacated]가 알렸다.
 */
class VacantTab(val tab: Tab) : IllegalArgumentException(
    "${tab.file?.name} — " + if (tab.vacant == Vacancy.DELETED) "파일이 지워졌다" else "@Preview 함수가 없다(최상위 함수만 찾는다)",
)

/** `show`가 탭을 새로 열었는가, 열린 탭으로 옮겼는가. */
enum class TabMove { OPENED, SWITCHED }

/** 탭 목록을 밖에서 본 모습(`status.tabs`). */
data class TabView(val key: String, val file: File?, val fqn: String?, val module: String, val active: Boolean, val stale: Boolean, val vacant: Vacancy? = null,
                   val sourceSet: String? = null)

/** `prevue close`의 결과. 지금 보던 탭을 닫았으면 [active]가 옮겨 간 탭이다. */
data class CloseResult(val closed: String, val active: String?, val tabs: List<TabView>)
