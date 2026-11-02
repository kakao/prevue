package prevue.daemon.domain.model

import prevue.daemon.entity.Phrase
import java.io.File
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.FailureKind

/** 보드(FR-17)를 밖에서 본 모습 — 파일 하나의 프리뷰 전부와 지금 세대. 뷰어와 CLI가 같은 것을 본다. */
data class BoardView(val file: File, val focus: Int, val gen: Int, val cards: List<CardView>, val previews: List<PreviewSpec>)

/**
 * 카드 한 장의 모습. [gen]이 보드의 세대보다 낮으면 [stale] — 옛 코드로 그린 그림이다.
 * 아직 안 그렸으면 그림 필드가 전부 비고, 쓰기에 실패했으면 실패만 있다.
 */
data class CardView(
    val index: Int,
    val previewId: String,
    val fqn: String,
    val name: String,
    val params: Map<String, String>,
    val gen: Int,
    val stale: Boolean,
    val rendered: Boolean,
    val paramIndex: Int,
    val paramCount: Int,
    val ok: Boolean?,
    val failure: FailureKind?,
    val message: Phrase?,
    val width: Int?,
    val height: Int?,
    val artifactRevision: Long?,
    /** 에이전트는 URL이 아니라 파일을 읽는다(FR-11). */
    val image: File?,
    val tree: File?,
    val taskMs: Long?,
    val renderMs: Long?,
    val phases: Map<String, Long>?,
)
