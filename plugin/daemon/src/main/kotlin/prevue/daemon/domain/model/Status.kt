package prevue.daemon.domain.model

import prevue.daemon.entity.PreviewSpec

/** 데몬이 지금 무엇을 보여 주고 어떤 상태인가. 에이전트의 `prevue status`와 뷰어의 첫 `hello`가 같은 것을 읽는다. */
data class Status(
    val module: ModuleInfo,
    val preview: PreviewSpec?,
    val shownBy: String,
    val shownAt: String,
    val board: BoardView?,
    val interactive: Boolean,
    val reloadPending: Boolean,
    val selection: Selection?,
    /** 뷰어 탭(D-54). [board]는 지금 보는 탭의 것이다. */
    val tabs: List<TabView>,
    /** D-37. `show`로 들어온 모듈들 — 들어오면 나가지 않는다. */
    val renderModules: List<String>,
    val stale: Map<String, StaleReason>,
    val last: LastResult?,
    val engine: EngineStats,
    /** 감시를 안 하면 없다. */
    val watch: WatchStats?,
    /** NFR-6. 마지막으로 그린 시각. 감시가 부른 리로드도 활동이다 — 유휴 종료가 읽는다. */
    val lastRenderMs: Long,
    val focusAttachedAt: Long? = null,
    val work: Work? = null,
    val lastShown: LastResult? = null,
    val boardFill: BoardFill? = null,
    val size: ScreenSize? = null,
    val postures: Map<ScreenSize, Shot> = emptyMap(),
    val kmp: Boolean = false,
)

/**
 * 어느 저장소의 어느 모듈인가. `status`에서는 [module]이 **지금 보드의 모듈**이다 — 앱 렌더러는 모듈을 오가며 그린다. 워크트리를 여럿 띄워 놓고 일하면 모듈·변형이 같아 화면만으로는 구분이 안 된다 — [repo]로 갈린다.
 * 리소스를 빌려 왔으면 숨기지 않는다 — 화면은 떠도 그 모듈이 혼자서는 못 돈다는 뜻이다.
 */
data class ModuleInfo(
    val repo: String,
    val module: String,
    val variant: String,
    val kotlinModule: String,
    val borrowedFrom: String?,
    val borrowedCount: Int?,
    /** 이 데몬이 다시 띄우지 않고 그릴 수 있는 모듈들. 렌더러가 앱 클래스패스면 앱이 담은 모듈 전부, 아니면 [module] 하나다(D-38). */
    val modules: List<String> = listOf(module),
    val sourceSet: String? = null,
)

/** NFR-6. 감시가 실제로 얼마를 쓰는지 — 소스 감시와 소스 밖 감시, values XML 감시(D-68). 안 보이면 다시 6%로 돌아간다. */
data class WatchStats(val source: Map<String, Any?>, val build: Map<String, Any?>, val values: Map<String, Any?> = emptyMap())

/** 렌더러·컴파일러의 관측값(NFR-6·9·10). 안 보이면 다시 상한 없는 상태로 돌아간다. */
data class EngineStats(
    val compilerWarm: Boolean,
    val bootstrapMs: Long,
    /** 로더 공유가 실제로 되는지. 카드를 여러 장 그린 뒤 [tasksOnLoader]가 1이면 세대마다 로더를 새로 받고 있는 것이다. */
    val loaderGen: Int,
    val tasksOnLoader: Int,
    val overlay: String,
    val out: String,
    val outBytes: Long,
    val outMaxBytes: Long,
    val touchModeError: String?,
    val heapUsedMb: Long,
    val heapMaxMb: Long,
    /** 힙 밖(layoutlib 네이티브)까지. 못 읽으면 null. */
    val rssMb: Long? = null,
)
