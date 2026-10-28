package prevue.daemon.domain.model

import prevue.daemon.entity.PreviewSpec

/**
 * FR-21. 사람이 화면에서 가리킨 마지막 한 곳. **큐가 아니라 최신 하나다** — 도구가 코멘트 큐를 소유하지 않는다는 결정을 지키는 선이다.
 * 베이스네임 → 풀패스는 뷰어가 이미 풀었고, 데몬은 그 한 줄에 자기가 아는 것(어느 프리뷰 · 그 PNG·트리)을 붙인다.
 */
data class Selection(
    /** 에이전트에 그대로 붙이는 멘션. `@<경로>#L<라인>` — `@<경로>:<라인>`은 Claude Code가 멘션으로 인식하지 못했다(실측). */
    val ref: String,
    val file: String,
    val line: Int,
    val node: String?,
    val chain: List<String>,
    /**
     * [chain] 중 부른 자리가 프로젝트 소스인 노드만 — `CompositionLocalProvider` · `ReusableComposeNode` 같은 테마 · Compose 내부를 걷은 것.
     * 노드의 파일을 아는 쪽은 뷰어라 뷰어가 걸러 보낸다. 보내지 않은 쪽(CLI의 `POST /selection`)이면 [chain] 그대로다.
     */
    val userChain: List<String>,
    /** 뷰어가 준 그대로 되돌려 준다. 데몬은 모양을 해석하지 않는다. */
    val bounds: Any?,
    val preview: PreviewSpec?,
    val image: String?,
    val tree: String?,
    val interactive: Boolean,
    val by: String,
    val at: String,
)
