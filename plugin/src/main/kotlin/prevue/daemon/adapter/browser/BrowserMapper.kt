// 뷰어 상태 → SSE·HTTP JSON(D-41·D-42). 브라우저가 읽는 키는 여기서만 정한다.
package prevue.daemon.adapter.browser

import prevue.daemon.entity.Keyed
import prevue.daemon.entity.Phrase
import prevue.daemon.entity.Verbatim
import prevue.daemon.entity.phrase
import prevue.daemon.adapter.http.mapper.toJson
import prevue.daemon.domain.model.PreviewFile

fun BrowserState.toJson(): Map<String, Any?> = mapOf(
    "version" to version,
    "header" to mapOf("title" to header.title, "tabTitle" to header.tabTitle, "repoPrefix" to header.repoPrefix,
        "repoLeaf" to header.repoLeaf, "module" to header.module, "variant" to header.variant, "repo" to header.repo,
        "branch" to header.branch, "sourceSet" to header.sourceSet, "kmp" to header.kmp),
    "screen" to screen.name.lowercase(),
    "board" to board?.let { b ->
        mapOf("file" to b.file, "gen" to b.gen, "focus" to b.focus, "groups" to b.groups.map { g ->
            mapOf("name" to g.name, "failed" to g.failed, "cards" to g.cards.map { it.toJson() })
        })
    },
    "focus" to focus?.let { f ->
        mapOf("previewId" to f.previewId, "interactive" to f.interactive, "fromBoard" to f.fromBoard,
            "imageUrl" to f.imageUrl, "treeUrl" to f.treeUrl, "streamUrl" to f.streamUrl, "pxPerDp" to f.pxPerDp,
            "name" to f.name, "fn" to f.fn, "size" to f.size?.toJson(),
            "postures" to f.postures.map { mapOf("size" to it.sizeJson(), "imageUrl" to it.imageUrl) })
    },
    "stale" to stale.map { mapOf("head" to it.head.toJson(), "why" to it.why.map { w -> w.toJson() }) },
    "busy" to busy,
    "buildPending" to buildPending,
    "boardNote" to boardNote?.toJson(),
    "who" to who?.toJson(),
    "timing" to timing.map { mapOf("label" to it.label.toJson(), "ms" to it.ms, "over" to it.over, "text" to it.text, "head" to it.head) },
    "error" to error?.toJson(),
    "selection" to selection?.toJson(),
    "choice" to choice?.let { mapOf("fileName" to it.fileName, "line" to it.line, "candidates" to it.candidates, "repoRoot" to it.repoRoot) },
    "tabs" to tabs.map {
        mapOf("key" to it.key, "name" to it.name, "dim" to it.dim, "module" to it.module, "title" to it.title, "active" to it.active, "stale" to it.stale,
            "sourceSet" to it.sourceSet)
    },
    "settle" to settle?.toJson(),
    "vacant" to vacant?.toJson(),
)

private fun PostureImage.sizeJson(): Map<String, Any?> =
    size.toJson() ?: mapOf("kind" to "original", "preset" to size.key, "widthDp" to dp.width, "heightDp" to dp.height)

fun CardState.toJson(): Map<String, Any?> = mapOf(
    "index" to index, "previewId" to previewId, "label" to label, "title" to title, "args" to args,
    "specs" to specs.map { mapOf("kind" to it.kind, "text" to it.text.toJson()) },
    "ok" to ok, "rendered" to rendered, "stale" to stale, "isFocus" to isFocus,
    "imageUrl" to imageUrl, "treeUrl" to treeUrl, "meta" to meta?.toJson(), "failure" to failure?.toJson(),
    "widthDp" to widthDp, "heightDp" to heightDp, "dpGuess" to dpGuess,
)

fun UiEvent.toJson(): Map<String, Any?> = when (this) {
    is UiEvent.Flash -> mapOf("kind" to "flash", "text" to text.toJson())
    UiEvent.PreviewFiles -> mapOf("kind" to "previewFiles")
    UiEvent.ProjectFiles -> mapOf("kind" to "projectFiles")
}

/**
 * D-56. 빠른 열기의 목록. 다 훑기 전이면 `ready: false`에 빈 목록이다. `path`는 `/viewer/open`에 그대로 넘기는 풀패스,
 * `rel`은 저장소 기준 — 줄에 보이고 매칭하는 것은 이쪽이다.
 */
fun previewFilesJson(files: List<PreviewFile>?, repoRoot: String): Map<String, Any?> = mapOf(
    "ready" to (files != null),
    "files" to files.orEmpty().map { f ->
        mapOf("path" to f.file.path, "rel" to f.file.path.removePrefix("$repoRoot/"), "module" to f.module,
            "mtime" to f.mtimeMs, "functions" to f.functions)
    },
)

fun BrowserPresenter.OpenResult.toJson(): Map<String, Any?> = when (this) {
    BrowserPresenter.OpenResult.Opened -> mapOf("ok" to true)
    is BrowserPresenter.OpenResult.NoPreview -> mapOf("ok" to false, "kind" to "none", "message" to message.toJson())
    is BrowserPresenter.OpenResult.OtherApp -> mapOf("ok" to false, "kind" to "other", "command" to command,
        "message" to phrase("open.otherApp").toJson())
}

fun BrowserPresenter.PointResult.toJson(): Map<String, Any?> = when (this) {
    is BrowserPresenter.PointResult.Selected -> selection.toJson()
    BrowserPresenter.PointResult.NeedChoice -> mapOf("ok" to false, "needChoice" to true)
    is BrowserPresenter.PointResult.Unknown -> mapOf("ok" to false, "message" to message.toJson())
}

fun Phrase.toJson(): Any = when (this) {
    is Verbatim -> text
    is Keyed -> if (args.isEmpty()) mapOf("t" to key) else mapOf("t" to key, "a" to args.mapValues { (_, v) -> argJson(v) })
}

private fun argJson(v: Any?): Any? = when (v) {
    null, is Number, is Boolean -> v
    is Phrase -> v.toJson()
    else -> v.toString()
}
