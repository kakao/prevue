package prevue.daemon.domain.runtime

import java.io.File
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.flow.updateAndGet
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.yield
import prevue.daemon.domain.model.Board
import prevue.daemon.domain.model.BoardEpoch
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.LastResult
import prevue.daemon.entity.ModuleGraph
import prevue.daemon.domain.model.ModuleInfo
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.Tab
import prevue.daemon.domain.model.TabView
import prevue.daemon.domain.model.Selection
import prevue.daemon.domain.model.StaleReason
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.model.Work
import prevue.daemon.domain.model.Resize
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.BoardFill
import prevue.daemon.domain.model.Postures
import prevue.daemon.domain.model.Shot
import prevue.daemon.domain.port.Clock
import prevue.daemon.domain.policy.StaleReasons

data class WorkspaceState(
    val current: PreviewSpec? = null,
    val shownBy: String = "",
    val shownAt: String = "",
    val lastResult: LastResult? = null,
    val board: Board? = null,
    /**
     * 뷰어가 인터랙티브에 들어가 있는가. 켜져 있는 동안 다른 카드를 그리지 않는다(3단계 규칙 2).
     * MJPEG 구독 여부로 추론하지 않는다: 구독자 제거는 다음 프레임을 밀어 보고서야 일어나 한참 늦는다.
     */
    val interactive: Boolean = false,
    val focusAttachedAt: Long? = null,
    /** D-37. 보드로 연 적 있는 모듈들 — 들어오면 나가지 않는다. 렌더 모듈이 쌓이는 만큼 RSS를 함께 본다. */
    val renderModules: Set<String> = emptySet(),
    /** FR-21. 사람이 화면에서 가리킨 마지막 한 곳. 탭을 옮겨도 남고 [selectionTab]을 닫을 때만 지운다 — `파일:라인`은 탭이 바뀌어도 맞다. */
    val selection: Selection? = null,
    /** [selection]을 가리킨 탭. */
    val selectionTab: String? = null,
    /**
     * 뷰어 탭(D-54) — 열린 순서. 지금 보는 탭의 보드는 [board]가 쥐고, 여기 있는 `board`는 숨은 탭의 것만 뜻이 있다.
     * 바꾸는 것은 줄 안의 유스케이스뿐이다.
     */
    val tabs: List<Tab> = emptyList(),
    /** 지금 보는 탭의 [Tab.key]. 아무것도 안 열었으면 null. */
    val activeTab: String? = null,
    /**
     * 화면의 그림이 소스보다 옛것이 된 이유들. 비어 있으면 그림과 소스가 맞는다 — AS의 "Out of date"에 해당한다.
     * 에러 문구로 대신할 수 없다. 컴파일이 실패해도 오버레이에는 **직전에 성공한** 클래스가 남고 그림은 계속 그것으로 그려지는데,
     * 사람은 문구가 아니라 그림을 보고 **에이전트는 PNG를 읽는다** — 낡은 그림을 보고 "고쳐졌다"고 결론 내리는 쪽이 에이전트다.
     */
    val stale: Map<String, StaleReason> = emptyMap(),
    /** NFR-6. 감시가 부른 리로드도 활동이다 — HTTP만 보면 에디터로만 일하는 사람의 데몬이 유휴로 죽는다. */
    val lastRenderMs: Long = 0L,
    /**
     * 파일마다 컴파일이 마지막으로 읽은 내용의 (mtime, 컴파일 시각). `AwaitRenderUseCase`의 기준이다.
     * 세대를 올린 **뒤에** 적는다. 먼저 적으면 기다림이 옛 세대의 카드를 보고 "다 그렸다"고 답한다.
     */
    val compiledMtime: Map<String, Pair<Long, Long>> = emptyMap(),
    /**
     * 감시가 생성으로 알렸고 아직 컴파일이 성공한 적 없는 새 파일(정규 경로). 생성은 저장이 아니라(D-56) 그대로는 아무도 컴파일하지 않는다 —
     * 다음 컴파일(저장 · 열기)이 함께 싣는다. 감시 스레드가 더하고 줄 안의 컴파일이 빼서 CAS다.
     */
    val newFiles: Set<String> = emptySet(),
    /** 보드를 연 시각. 그 뒤로 한 번도 저장되지 않은 파일은 연 순간의 그림이 곧 그 파일의 그림이다. */
    val openedAtMs: Long = 0L,
    /** 마지막 컴파일이 실패했으면 그 결과. 성공한 컴파일이 지운다. */
    val lastCompileFailure: ReloadResult.CompileFailed? = null,
    /** [lastCompileFailure]가 난 시각. 그 뒤에 연 보드는 그 실패를 제 결과로 받지 않는다(`AwaitPolicy.failureApplies`). */
    val lastCompileFailureAtMs: Long = 0L,
    val work: Work? = null,
    val lastShown: LastResult? = null,
    val boardFill: BoardFill? = null,
    val warm: Boolean = false,
    val resize: Resize? = null,
    val postures: Postures? = null,
    val postureRound: Long = 0,
) {
    val buildPending: Boolean get() = stale[StaleReasons.BUILD]?.pending == true

    fun sized(p: PreviewSpec): PreviewSpec = resize?.takeIf { it.previewId == p.previewId }?.size?.applyTo(p) ?: p

    fun shownSize(): ScreenSize? = resize?.takeIf { it.previewId == (board?.focusCard?.spec ?: current)?.previewId }?.size

    fun shownTarget(): Pair<PreviewSpec, ScreenSize>? {
        val b = board
        if (b != null) return if (interactive) b.focusCard.spec to (shownSize() ?: ScreenSize.Original) else null
        val r = resize ?: return null
        val base = activeTabOrNull()?.spec?.takeIf { it.previewId == r.previewId } ?: return null
        return base to r.size
    }

    fun livePostures(): Postures? {
        val (base, size) = shownTarget() ?: return null
        return postures?.takeIf { it.covers(size) && it.spec.previewId == base.previewId }
    }

    /** 지금 보는 탭. */
    fun activeTabOrNull(): Tab? = activeTab?.let { k -> tabs.firstOrNull { it.key == k } }

    fun tabViews(graph: ModuleGraph): List<TabView> = tabs.map {
        TabView(it.key, it.file, it.fqn, it.file?.let(graph::ownerOf).orEmpty(), it.key == activeTab, it.stale, it.vacant)
    }

    /** NFR-10. 뷰어가 지금 주소를 들고 있는 것들. 엔진의 상한이 이것만은 지우지 않는다. 숨은 탭은 넣지 않는다 — 지워졌으면 옮길 때 다시 그린다. */
    fun keepIds(): Set<String> =
        (board?.cards?.map { it.spec.previewId }.orEmpty() + listOfNotNull(current?.previewId) + livePostures()?.ids().orEmpty()).toSet()

    fun withTab(t: Tab): WorkspaceState =
        copy(tabs = if (tabs.any { it.key == t.key }) tabs.map { if (it.key == t.key) t else it } else tabs + t, activeTab = t.key)
}

/**
 * 데몬이 지금 보여 주는 것과 그 위의 기록 — 한 장(current) · 보드 · 인터랙티브 · 선택 · 낡음 · 컴파일이 읽은 mtime.
 *
 * **렌더 태스크가 하나뿐이라 상태를 바꾸는 유스케이스는 [exclusive]로 줄을 선다.** 그 안에서 다른 유스케이스를 부르지 않는다 —
 * 줄은 재진입이 안 된다. 락 순서는 Workspace → RenderEngine 한 방향이고, 프레임과 쓰기 완료는 이 줄을 서지 않는다.
 */
class Workspace(
    val module: ModuleInfo,
    private val clock: Clock,
    /** 이 데몬이 컴파일하는 모듈들. 저장한 파일이 어느 모듈의 인자로 컴파일되는지, 밖의 빌드가 어느 오버레이를 낡게 했는지가 여기서 갈린다. */
    val graph: ModuleGraph,
    /** 파일 감시가 보는 루트. 비어 있으면 감시가 꺼져 있고 기다릴 것이 오지 않는다. */
    val watchRoots: List<File> = emptyList(),
) {
    private val _state = MutableStateFlow(WorkspaceState(lastRenderMs = clock.nowMs()))
    val state: StateFlow<WorkspaceState> = _state
    val now: WorkspaceState get() = _state.value

    fun nowMs(): Long = clock.nowMs()

    fun recordCard(epoch: BoardEpoch, index: Int, gen: Int, r: CardResult) {
        _state.update { s -> s.board?.takeIf { it.epoch == epoch }?.let { s.copy(board = it.record(index, gen, r)) } ?: s }
    }

    fun recordFill(fill: BoardFill) {
        _state.update { it.copy(boardFill = fill) }
    }

    fun recordPosture(round: Long, d: ScreenSize, shot: Shot) {
        _state.update { s -> s.postures?.takeIf { it.round == round }?.let { s.copy(postures = it.copy(shots = it.shots + (d to shot))) } ?: s }
    }

    fun noteCreated(created: List<File>, deleted: List<File>) {
        if (created.isEmpty() && deleted.isEmpty()) return
        val add = created.map { it.canonicalPath }; val gone = deleted.map { it.canonicalPath }.toSet()
        _state.update { it.copy(newFiles = (it.newFiles + add) - gone) }
    }

    // ---------- 줄 ----------

    // 먼저 온 순서로 들어간다. 모니터와 달리 공정해서 연달아 그리는 카드가 기다리는 저장을 앞지르지 못한다.
    private val turn = Mutex()
    private val savesWaiting = MutableStateFlow(0)

    /** 줄을 서서 [block]을 한다. 그 안에서 다른 유스케이스를 부르지 않는다. */
    suspend fun <T> exclusive(block: suspend (WorkspaceEditor) -> T): T = turn.withLock {
        yield()
        val ed = WorkspaceEditor(clock) { f -> _state.updateAndGet(f) }
        try { block(ed) } finally {
            ed.close()
            if (_state.value.work != null) _state.update { it.copy(work = null) }
        }
    }

    /** 저장의 줄. 서기 **전에** 기다림을 알린다 — 그 전에 줄 선 카드가 들어가 이것을 보고 물러난다(`CardPolicy`). */
    suspend fun <T> saving(block: suspend (WorkspaceEditor) -> T): T {
        savesWaiting.update { it + 1 }
        try { return exclusive(block) } finally { savesWaiting.update { it - 1 } }
    }

    val reloadPending: Boolean get() = savesWaiting.value > 0

    // ---------- 바뀜 ----------

    private val _events = MutableSharedFlow<WorkspaceEvent>(extraBufferCapacity = Channel.UNLIMITED)
    val events: SharedFlow<WorkspaceEvent> = _events

    fun emit(ev: WorkspaceEvent) { _events.tryEmit(ev) }
}

class WorkspaceEditor internal constructor(private val clock: Clock, private val write: ((WorkspaceState) -> WorkspaceState) -> WorkspaceState) {
    private var open = true

    internal fun close() { open = false }

    fun update(f: (WorkspaceState) -> WorkspaceState): WorkspaceState {
        check(open) { "줄 밖에서 쓴다" }
        return write(f)
    }

    fun openBoard(b: Board?) { update { it.copy(board = b) } }

    /**
     * 지금 보드를 [f]로 바꾼다. 경합하면 [f]를 다시 부르므로 [f]는 부수 효과가 없어야 한다. 보드가 없으면 아무것도 안 한다.
     */
    fun updateBoard(epoch: BoardEpoch? = null, f: (Board) -> Board): Board? =
        update { s -> s.board?.takeIf { epoch == null || it.epoch == epoch }?.let { s.copy(board = f(it)) } ?: s }.board

    fun markCompiled(seen: Map<String, Long>) {
        val now = clock.nowMs()
        update { it.copy(compiledMtime = it.compiledMtime + seen.mapValues { (_, m) -> m to now }) }   // 저장은 줄을 서므로 마지막에 적은 것이 최신이다
    }

    /** [files]는 더 싣지 않는다 — 오버레이나 Gradle 산출물에 있거나, 자기 오류로 실패했다. 그 뒤의 수정은 저장으로 온다. */
    fun forgetNew(files: List<File>) {
        if (files.isEmpty()) return
        val done = files.map { it.canonicalPath }.toSet()
        update { it.copy(newFiles = it.newFiles - done) }
    }

    fun markStale(reason: String, detail: StaleReason?) {
        update { it.copy(stale = if (detail == null) it.stale - reason else it.stale + (reason to detail)) }
    }

    /**
     * 우리가 못 닫는 이유를 세운다. 한 번 세우면 갱신하지 않는다 —
     * 파일이 더 바뀌어도 사람이 할 일(Gradle·재시작)은 그대로이고, 매번 다시 알리면 띠만 깜빡인다.
     */
    fun markStaleOnce(reason: String, detail: StaleReason) {
        update { if (reason in it.stale) it else it.copy(stale = it.stale + (reason to detail)) }
    }

    /** 성공한 컴파일이 오버레이를 바꿨다 — 숨은 탭의 그림은 전부 옛 코드다(D-54). 지금 보는 탭은 저장이 바로 다시 그린다. */
    fun markHiddenTabsStale() {
        update { s -> s.copy(tabs = s.tabs.map { if (it.key != s.activeTab && !it.stale) it.copy(stale = true) else it }) }
    }
}
