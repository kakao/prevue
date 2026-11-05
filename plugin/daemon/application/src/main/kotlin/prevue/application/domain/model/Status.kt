package prevue.application.domain.model

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
