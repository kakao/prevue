// 유스케이스 결과 → 응답 JSON. 덧붙임 키는 그 자리에서만 싣는다 — contract/ 가 지킨다.
package prevue.daemon.adapter.http.mapper

import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.model.CloseResult
import prevue.daemon.domain.model.FocusResult
import prevue.daemon.domain.model.TabView
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.SaveTiming
import prevue.daemon.domain.model.Settled
import prevue.daemon.domain.model.Shot
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.entity.ViewNode
import prevue.daemon.domain.model.Aim
import prevue.daemon.domain.model.Miss
import prevue.daemon.domain.model.Numbered
import prevue.daemon.domain.model.Container
import prevue.daemon.domain.model.ScrollResult
import prevue.daemon.domain.model.SeenItem
import prevue.daemon.domain.model.GoneItem
import prevue.daemon.entity.Progress
import prevue.daemon.entity.Semantics
import prevue.daemon.domain.model.TouchResult
import prevue.daemon.domain.model.TypeResult
import prevue.daemon.domain.model.WaitResult
import prevue.daemon.adapter.http.artifactUrl

fun Shot.toJson(): Map<String, Any?> = out.toJson() + mapOf(
    "compile" to compile?.toJson(), "totalMs" to totalMs, "by" to by,
    "imageUrl" to artifactUrl(out.image, artifactRevision), "treeUrl" to artifactUrl(out.tree, artifactRevision),
)

fun SaveTiming.toJson(): Map<String, Any?> = mapOf("detectMs" to detectMs, "waitMs" to waitMs)

/** 덧붙임은 그 자리에서만 싣는다 — FR-5 렌더에만 `atMs`, 터치에만 `frames`, 감시가 부른 저장에만 감지·대기. */
fun ShowResult.toJson(): Map<String, Any?> = shot.toJson() +
    present("atMs" to atMs, "frames" to frames, "settled" to settled) +
    (timing?.toJson() ?: emptyMap()) +
    present(
        "saveToScreenMs" to saveToScreenMs, "tab" to tab?.name?.lowercase(), "closedTab" to closedTab,
        "coldMs" to coldMs, "lines" to lines,
    ) +
    mapOf("stale" to stale.staleJson())

private fun present(vararg pairs: Pair<String, Any?>): Map<String, Any?> = pairs.filter { it.second != null }.toMap()

// 정착은 컴파일과 무관해 `compile` 키가 없다.
fun Settled.toJson(): Map<String, Any?> = shot.out.toJson() + mapOf(
    "totalMs" to shot.totalMs, "by" to shot.by, "stale" to stale.staleJson(),
    "imageUrl" to artifactUrl(shot.out.image, shot.artifactRevision), "treeUrl" to artifactUrl(shot.out.tree, shot.artifactRevision), "frames" to frameStats,
)

fun ReloadResult.CompileFailed.toJson(): Map<String, Any?> = mapOf(
    "ok" to false, "failure" to FailureKind.COMPILE.name, "message" to (compile.hint?.let { "${it.text}\n" } ?: "") + compile.messages,
    "stale" to stale.staleJson(),
    "compile" to compile.toJson(), "totalMs" to totalMs, "by" to by, "preview" to preview.toJson(),
) + (timing?.toJson() ?: emptyMap()) +
    (lines?.let { mapOf("lines" to it) } ?: emptyMap())

fun ReloadResult.toJson(): Map<String, Any?> = when (this) {
    is ReloadResult.Rendered -> result.toJson()
    is ReloadResult.CompileFailed -> toJson()
    ReloadResult.NothingShown -> mapOf("ok" to false, "error" to "보여 주는 프리뷰가 없다 — 먼저 show")
    // 감시가 부른 저장만 받는다 — `reload`는 늘 컴파일해 여기 오지 않는다.
    is ReloadResult.Unchanged -> mapOf("ok" to true, "unchanged" to true, "files" to files.map { it.absolutePath })
    // D-68. 그리지 않았다 — 그림은 저장 전 것이고 이유는 stale.resources.message에 있다.
    is ReloadResult.ResourcesStale -> mapOf("ok" to false, "files" to files.map { it.absolutePath }, "message" to why.text, "stale" to stale.staleJson())
    is ReloadResult.NeedsGradleBuild -> mapOf("ok" to false, "files" to files.map { it.absolutePath }, "message" to why.text, "stale" to stale.staleJson())
}

fun FocusResult.toJson(): Map<String, Any?> = when (this) {
    is FocusResult.On -> result.toJson() + mapOf("focus" to index, "interactive" to true)
    is FocusResult.Off -> mapOf("ok" to true, "focus" to index, "interactive" to false)
}

fun ScrollResult.toJson(): Map<String, Any?> = when (this) {
    is ScrollResult.Settled -> result.toJson() + mapOf(
        "moved" to moved, "container" to container?.toJson(),
        "appeared" to appeared.map { it.toJson() }, "disappeared" to disappeared.map { it.toJson() },
        "passed" to passed.map { it.toJson() },
    ) + (if (sought) mapOf("found" to found?.toJson()) else emptyMap())
    is ScrollResult.Missed -> miss.toJson()
}

fun Container.toJson(): Map<String, Any?> = mapOf("at" to at, "box" to box, "axis" to axis) + (list?.let {
    mapOf(
        "total" to it.total, "first" to it.first, "last" to it.last,
        "canScrollForward" to it.canScrollForward, "canScrollBackward" to it.canScrollBackward,
    ).filterValues { v -> v != null }
} ?: emptyMap())

fun SeenItem.toJson(): Map<String, Any?> = mapOf(
    "index" to index, "key" to key, "box" to box, "visible" to visible, "at" to at, "semantics" to semantics?.toJson(),
).filterValues { it != null }

fun GoneItem.toJson(): Map<String, Any?> = mapOf("index" to index, "key" to key, "semantics" to semantics?.toJson()).filterValues { it != null }

fun Semantics.toJson(): Map<String, Any?> = mapOf(
    "text" to text, "contentDescription" to contentDescription, "stateDescription" to stateDescription, "editableText" to editableText,
    "heading" to heading.takeIf { it }, "role" to role, "testTag" to testTag,
    "selected" to selected, "toggleableState" to toggleableState, "disabled" to disabled.takeIf { it }, "focused" to focused.takeIf { it },
    "progress" to progress?.toJson(),
    "actions" to actions.takeIf { it.isNotEmpty() }?.let { a -> ACTIONS.filter { it in a } },
).filterValues { it != null }

private val ACTIONS = listOf("click", "longClick", "scrollBy", "setText")

private fun Progress.toJson(): Map<String, Any> =
    mapOf("current" to current, "min" to min, "max" to max) + (if (steps > 0) mapOf("steps" to steps) else emptyMap())

fun Aim.toJson(): Map<String, Any?> = mapOf("at" to at, "index" to index, "of" to of, "name" to node.name, "bounds" to node.sameBox, "point" to listOf(x, y))

fun Miss.toJson(): Map<String, Any?> {
    val bare = at.substringBefore('#')
    fun list(ns: List<Numbered>, numbered: Boolean = true) = ns.map { (n, k) ->
        val name = bare + if (numbered) "#$k" else ""
        mapOf("at" to name, "item" to k.takeUnless { numbered }, "name" to n.name, "bounds" to n.sameBox).filterValues { it != null }
    }
    fun fail(error: String, vararg more: Pair<String, Any?>) = mapOf("ok" to false, "error" to error) + more
    return when (this) {
        is Miss.BadAt -> fail("겨냥은 <파일>:<라인>[#N] 이다 — '$at'")
        is Miss.Choose -> if (mixedLists) fail(MIXED_LISTS.format(at), "need" to "choose", "matches" to list(candidates, numbered = false))
            else fail("$at 에 노드가 ${candidates.size}개다 — $NTH", "need" to "choose", "matches" to list(candidates), *total(total))
        is Miss.NoSuch -> fail(noSuch(), "matches" to list(candidates), *total(total))
        is Miss.OffScreen -> fail("$at 은 지금 화면에 없다", "matches" to list(candidates))
        is Miss.Missing -> fail("$at $NOT_IN_TREE")
        is Miss.Broken -> fail("휠을 넣지 못했다 — 렌더러의 모양이 다르다(데몬 로그)")
    }
}

private const val NTH = "#N 으로 고른다(목록 아이템은 목록 전체에서 N번째, 아니면 읽는 순서)"
private const val MIXED_LISTS = "%s 이 목록 여러 개에 있다 — 어느 목록의 #N 인지 가릴 수 없다. matches 의 bounds 로 touch <x> <y>"

private fun Miss.NoSuch.noSuch() = if (total != null) "$at — 목록은 ${total}개다" else {
    val last = at.substringBefore('#') + "#${candidates.size}"
    "$at — 그 줄의 후보는 ${candidates.size}개다(읽는 순서, 마지막 $last). 게으른 목록의 아이템이면 목록 순번을 못 읽은 것이다 — matches 에서 다시 고른다"
}

private fun total(n: Int?): Array<Pair<String, Any?>> = if (n != null) arrayOf("total" to n) else emptyArray()
private const val NOT_IN_TREE = "의 노드가 지금 화면의 트리에 없다"

/** HTTP 상태 — 고를 것은 409(CLI 종료 2), 나머지 실패는 422(종료 1). */
fun Miss.status() = if (this is Miss.Choose) 409 else 422

fun TypeResult.toJson(): Map<String, Any?> = when (this) {
    is TypeResult.Settled -> result.toJson()
    is TypeResult.NoField -> mapOf(
        "ok" to false, "error" to "포커스된 텍스트 필드가 없다 — 먼저 prevue touch --at <파일>:<라인> 으로 필드를 누른다", "why" to why,
    )
}

fun TouchResult.toJson(): Map<String, Any?> = when (this) {
    is TouchResult.Settled -> result.toJson() + (aim?.let { mapOf("at" to it.toJson()) } ?: emptyMap())
    is TouchResult.Missed -> miss.toJson()
    is TouchResult.Sent -> mapOf("ok" to true, "type" to type, "x" to x, "y" to y, "by" to by, "settled" to false)
}

fun WaitResult.toJson(): Map<String, Any?> = when (this) {
    is WaitResult.BoardDone -> mapOf(
        "ok" to ok, "file" to file.absolutePath, "gen" to gen, "complete" to complete,
        "waitedMs" to waitedMs, "stale" to stale.staleJson(), "cards" to cards.map { it.toJson() },
    ) + (interactiveCard?.takeIf { !complete }?.let { i ->
        mapOf(
            "interactive" to i,
            "message" to "카드 $i 가 인터랙티브(사람이 뷰어에서 조작 중일 수 있다)라 다른 카드는 다시 그리지 않았다 — " +
                "카드 $i 말고는 저장 전 그림이다. 조작이 끝나면(prevue focus $i --off) 나머지를 그린다",
        )
    } ?: emptyMap())
    is WaitResult.Single -> (last?.toJson() ?: emptyMap()) + mapOf("waitedMs" to waitedMs)
    is WaitResult.CompileFailed -> failure.toJson() + mapOf("waitedMs" to waitedMs, "stale" to stale.staleJson())
    is WaitResult.TimedOut -> mapOf(
        "ok" to false, "failure" to FailureKind.TIMEOUT.name, "message" to message, "waitedMs" to waitedMs, "stale" to stale.staleJson(),
    ) + (board?.let { mapOf("board" to it.toJson()) } ?: emptyMap())
}

/** 탭 하나(D-54). FQN 탭이면 [TabView.fqn]이 있고 `file`은 그 함수의 파일이다. */
fun TabView.toJson(): Map<String, Any?> = mapOf("file" to file?.absolutePath, "fqn" to fqn, "module" to module, "active" to active, "stale" to stale,
    "vacant" to vacant?.name?.lowercase()) + (sourceSet?.let { mapOf("sourceSet" to it) } ?: emptyMap())

fun CloseResult.toJson(): Map<String, Any?> = mapOf("ok" to true, "closed" to closed, "active" to active, "tabs" to tabs.map { it.toJson() })
