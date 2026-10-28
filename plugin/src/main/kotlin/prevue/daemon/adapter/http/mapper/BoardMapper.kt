// 보드와 카드 → JSON. `/board` · `prevue wait` · status 가 같은 모양을 싣는다.
package prevue.daemon.adapter.http.mapper
import prevue.daemon.adapter.http.artifactUrl

import prevue.daemon.domain.model.BoardView
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.CardView
import prevue.daemon.domain.port.FailureKind

fun BoardView.toJson(): Map<String, Any?> = mapOf(
    "file" to file.absolutePath, "focus" to focus, "gen" to gen, "cards" to cards.map { it.toJson() },
)

fun CardView.toJson(): Map<String, Any?> = mapOf(
    "index" to index, "previewId" to previewId, "fqn" to fqn, "name" to name,
    "params" to params, "gen" to gen, "stale" to stale, "rendered" to rendered,
    "paramIndex" to paramIndex, "paramCount" to paramCount,
    "ok" to ok, "failure" to failure?.name, "message" to message?.text,
    "width" to width, "height" to height, "imageUrl" to artifactUrl(image, artifactRevision), "treeUrl" to artifactUrl(tree, artifactRevision),
    "image" to image?.absolutePath, "tree" to tree?.absolutePath,
    "taskMs" to taskMs, "renderMs" to renderMs, "phases" to phases?.toSortedMap(),
)

fun CardResult.toJson(): Map<String, Any?> = when (this) {
    is CardResult.Drawn -> shot.toJson() + mapOf("index" to index) + (if (cached) mapOf("cached" to true) else emptyMap())
    is CardResult.WriteFailed -> mapOf("ok" to false, "index" to index, "failure" to FailureKind.EXCEPTION.name, "message" to message.text) +
        (if (cached) mapOf("cached" to true) else emptyMap())
    is CardResult.Skipped -> mapOf("ok" to false, "index" to index, "skipped" to reason.name.lowercase())
    is CardResult.Pending -> mapOf("ok" to true, "index" to index, "pending" to true)
}
