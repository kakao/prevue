package prevue.daemon.domain.model

import prevue.daemon.entity.Phrase
import prevue.daemon.entity.Semantics
import prevue.daemon.entity.ViewNode
import java.io.File
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.RenderOutput

/**
 * 렌더 한 장(FR-11). 카드와 응답이 같은 모양을 쓴다 — 뷰어가 보는 것과 CLI가 받는 것이 같아야 한다.
 * 만들어졌으면 PNG·트리는 이미 디스크에 있다 — 이 주소를 받은 쪽이 바로 읽는다.
 */
data class Shot(
    val out: RenderOutput,
    /** 이 그림 직전에 돈 컴파일. 저장이 부른 렌더에만 있다. */
    val compile: CompileResult?,
    val totalMs: Long,
    val by: String,
    /** 같은 파일의 내용이 바뀐 시점. 표시·전송 방식은 사용하는 쪽에서 정한다. */
    val artifactRevision: Long,
) {
    val ok: Boolean get() = out.ok
}

/** 감시가 부른 저장의 앞 두 구간 — 감지(mtime → 알림)와 대기(알림 → 락). 데몬 몫만 재면 이 둘이 안 보인다(NFR-1). */
data class SaveTiming(val detectMs: Long, val waitMs: Long)

/** `status.last`에 남는 마지막 한 장의 결과. */
sealed interface LastResult {
    val ok: Boolean
    /** 에이전트가 읽을 PNG·트리. 컴파일이 실패했으면 이번 결과의 그림은 없다. */
    val image: File?
    val tree: File?
}

/**
 * 한 장을 그린 응답 — show · rerender · renderAt · touch · focus(on) · 저장 성공.
 * 낡음을 싣는다 — 이 PNG를 읽는 것이 에이전트다. 카드(`Shot`)에는 싣지 않는다: 카드의 낡음은 세대이고 뜻이 다르다.
 */
data class ShowResult(
    val shot: Shot,
    val stale: Map<String, StaleReason>,
    /** FR-5. 시계를 민 ms. */
    val atMs: Long? = null,
    /** 터치 뒤 정착까지 돈 프레임 수. */
    val frames: Int? = null,
    val settled: Boolean? = null,
    val timing: SaveTiming? = null,
    /** 저장 → 화면. PNG가 디스크에 닿은 순간까지이고 브라우저가 그리는 몫은 없다. 감시가 부른 저장만. */
    val saveToScreenMs: Long? = null,
    /** `show`만 — 탭을 새로 열었나 옮겼나(D-54). */
    val tab: TabMove? = null,
    /** `show`가 상한을 넘겨 닫은 탭. */
    val closedTab: String? = null,
    /**
     * 이 그림을 부른 일이 시작된 시각(epoch ms) — 감시 저장이면 파일 mtime, 열기면 그리기 시작, 데몬을 띄우며 열었으면 JVM 시작.
     * 뷰어 알약의 보드 시간 · 콜드 시간이 여기서 잰다(D-63). 응답에는 싣지 않는다 — 에이전트에게는 `saveToScreenMs`가 있다.
     */
    val startedAtMs: Long? = null,
    val coldMs: Long? = null,
    val lines: Int? = null,
) : LastResult {
    override val ok get() = shot.ok
    override val image get() = shot.out.image
    override val tree get() = shot.out.tree
}

/** 인터랙티브 프레임 루프가 정착해 PNG·트리를 지금 상태로 다시 쓴 것. */
data class Settled(val shot: Shot, val stale: Map<String, StaleReason>, val frameStats: Map<String, Any?>) : LastResult {
    override val ok get() = shot.ok
    override val image get() = shot.out.image
    override val tree get() = shot.out.tree
}

/** 저장 한 번의 결과(FR-8). */
sealed interface ReloadResult {
    val ok: Boolean

    data class Rendered(val result: ShowResult) : ReloadResult {
        override val ok get() = result.ok
    }

    /** 오버레이는 직전 성공본 그대로다 — 화면에 남은 그림은 이 저장 **이전**의 코드다. */
    data class CompileFailed(
        val preview: PreviewSpec,
        val compile: CompileResult,
        val stale: Map<String, StaleReason>,
        val totalMs: Long,
        val by: String,
        val timing: SaveTiming?,
        val lines: Int? = null,
    ) : ReloadResult, LastResult {
        override val ok = false
        override val image: File? = null
        override val tree: File? = null
    }

    /** 보여 주는 프리뷰가 없어 그릴 것이 없다. 감시가 부른 저장은 이것을 조용히 거른다. */
    data object NothingShown : ReloadResult {
        override val ok = false
    }

    /** D-67. 감시가 부른 저장의 내용이 지금 그림이 반영한 내용과 바이트까지 같다 — 컴파일도 렌더도 하지 않았다. */
    data class Unchanged(val files: List<File>) : ReloadResult {
        override val ok = true
    }

    /** D-68. values 저장을 값만 넣어 닫지 못했다(새 항목 · 다른 정의가 이김) — 그리지 않았고, 그림은 저장 전 것이다. [why]가 이 저장의 이유다. */
    data class ResourcesStale(val files: List<File>, val why: Phrase, val stale: Map<String, StaleReason>) : ReloadResult {
        override val ok = false
    }

    data class NeedsGradleBuild(val files: List<File>, val why: Phrase, val stale: Map<String, StaleReason>) : ReloadResult {
        override val ok = false
    }
}

/** 카드 한 장(FR-17). 그린 것과 쓰기 실패는 카드에 남고, 나머지는 응답일 뿐이다. */
sealed interface CardResult {
    val index: Int

    /** [cached]면 이번에 그리지 않고 같은 세대의 그림을 돌려준 것이다. */
    data class Drawn(override val index: Int, val shot: Shot, val cached: Boolean = false) : CardResult

    /** 렌더는 됐는데 PNG·트리를 디스크에 못 썼다 — 주소만 멀쩡한 응답이 최악이라 실패로 남긴다. */
    data class WriteFailed(override val index: Int, val message: Phrase, val cached: Boolean = false) : CardResult

    /** 그리지 않고 물러났다. 사람이 다른 카드를 만지는 중이거나(INTERACTIVE) 저장이 기다린다(RELOAD). */
    data class Skipped(override val index: Int, val reason: SkipReason) : CardResult

    /** 채우기만 받는다 — 쓰기를 기다리지 않고 다음 카드로 간다. */
    data class Pending(override val index: Int) : CardResult
}

enum class SkipReason { INTERACTIVE, RELOAD }

/** FR-18. 카드 하나에 태스크를 걸어 들어가거나(On) 보드로 나온다(Off). */
sealed interface FocusResult {
    val index: Int
    data class On(override val index: Int, val result: ShowResult) : FocusResult
    data class Off(override val index: Int) : FocusResult
}

/** FR-14. 정착까지 기다렸으면 그 한 장, 아니면(뷰어) 넣기만 했다 — 그림은 MJPEG로 간다. `--at`이면 겨냥한 노드([aim])를 싣는다. */
sealed interface TouchResult {
    data class Settled(val result: ShowResult, val aim: Aim? = null) : TouchResult
    data class Sent(val type: String, val x: Int, val y: Int, val by: String) : TouchResult
    /** D-69. 겨냥이 갈려 누르지 않았다. */
    data class Missed(val miss: Miss) : TouchResult
}

/** D-69. 겨냥한 노드 — `at`(`파일:라인[#N]`), 후보 중 번호 · 수, 누른(굴린 뒤의) 자리. */
data class Aim(val at: String, val index: Int, val of: Int, val node: ViewNode, val x: Int, val y: Int)

/** D-69. 겨냥이 누르기 · 굴리기까지 못 간 이유. [Choose]는 부른 쪽이 `#N`으로 고를 일이다. */
sealed interface Miss {
    val at: String
    data class BadAt(override val at: String) : Miss
    data class Choose(override val at: String, val candidates: List<Numbered>, val mixedLists: Boolean = false, val total: Int? = null) : Miss
    data class NoSuch(override val at: String, val nth: Int, val candidates: List<Numbered>, val total: Int? = null) : Miss
    /** 노드는 있는데 화면 밖이다 — touch 는 굴리지 않는다. */
    data class OffScreen(override val at: String, val candidates: List<Numbered>) : Miss
    data class Missing(override val at: String) : Miss
    data class Broken(override val at: String) : Miss
}

sealed interface ScrollResult {
    data class Settled(
        val result: ShowResult, val container: Container?, val moved: Boolean,
        val appeared: List<SeenItem> = emptyList(), val disappeared: List<GoneItem> = emptyList(),
        val sought: Boolean = false, val found: SeenItem? = null, val passed: List<GoneItem> = emptyList(),
    ) : ScrollResult
    data class Missed(val miss: Miss) : ScrollResult
}

data class Container(val at: String?, val box: List<Int>, val axis: String, val list: ListSummary? = null)

data class ListSummary(val total: Int, val first: Int?, val last: Int?, val canScrollForward: Boolean?, val canScrollBackward: Boolean?)

data class SeenItem(val index: Int?, val key: Any?, val box: List<Int>?, val visible: Double, val at: String?, val semantics: Semantics?)

data class GoneItem(val index: Int?, val key: Any?, val semantics: Semantics?)

/** D-69. 포커스된 텍스트 필드에 넣고 정착한 한 장, 아니면 넣지 못한 이유(포커스된 필드가 없다). */
sealed interface TypeResult {
    data class Settled(val result: ShowResult) : TypeResult
    data class NoField(val why: String) : TypeResult
}

/** 소스 밖의 변화(밖의 Gradle · 리소스 · 빌드 파일)를 받은 결과. 감시가 부르고 로그만 읽는다. */
sealed interface ExternalResult {
    /** 못 닫는 이유만 세웠다(리소스 · 빌드 파일). */
    data class Noted(val stale: Map<String, StaleReason>) : ExternalResult
    data object NoPreview : ExternalResult
    /** clean 했다 — 사람이 Gradle을 돌려야 한다. */
    data object OutputsGone : ExternalResult
    /** 빌드가 아직 끝나지 않았다. 낡음은 이미 세웠다. */
    data object BuildPending : ExternalResult
    data class Redrawn(val result: ShowResult) : ExternalResult
}

/** FR-22. 저장한 파일이 컴파일되고 보드의 카드 전부가 그 세대로 그려질 때까지 기다린 결과. */
sealed interface WaitResult {
    val ok: Boolean
    val waitedMs: Long

    /**
     * [complete]가 거짓이면 인터랙티브 중이라 다른 카드를 그리지 않아 있는 그대로 돌려준 것이다 — [interactiveCard] 말고는 저장 전 그림이다.
     * 뷰어에서 사람이 카드를 만지는 중일 수 있어(기준선 세트 3 · 1) 에이전트가 옛 그림을 새 그림으로 믿지 않게 어느 카드인지 싣는다.
     */
    data class BoardDone(
        val file: File, val gen: Int, val complete: Boolean, override val waitedMs: Long,
        val stale: Map<String, StaleReason>, val cards: List<CardView>, val interactiveCard: Int? = null,
    ) : WaitResult {
        override val ok get() = cards.all { it.ok == true }
    }

    /** FQN 단건 — 저장이 곧 그 한 장이다. */
    data class Single(val last: LastResult?, override val waitedMs: Long) : WaitResult {
        override val ok get() = last?.ok == true
    }

    /** 실패한 컴파일 뒤의 그림은 저장 전의 것이다 — 채우기를 기다릴 이유가 없다. */
    data class CompileFailed(val failure: ReloadResult.CompileFailed, override val waitedMs: Long, val stale: Map<String, StaleReason>) : WaitResult {
        override val ok = false
    }

    data class TimedOut(val message: String, override val waitedMs: Long, val stale: Map<String, StaleReason>, val board: BoardView?) : WaitResult {
        override val ok = false
    }
}
