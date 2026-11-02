// 프리뷰 · 렌더 산출물 · 컴파일 · 소스 색인 · 선택 → JSON. domain은 키를 모른다.
package prevue.daemon.adapter.http.mapper

import prevue.daemon.domain.port.CompileResult
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.RenderOutput
import prevue.daemon.domain.model.Selection
import prevue.daemon.entity.SourceIndex
import prevue.json.string
import prevue.json.strings
import prevue.daemon.domain.model.Pointed

fun PreviewSpec.toJson(): Map<String, Any?> = mapOf(
    "fqn" to fqn, "previewId" to previewId, "params" to params, "file" to file?.absolutePath, "index" to index,
    "methodParams" to methodParams,
)

fun RenderOutput.toJson(): Map<String, Any?> = mapOf(
    "ok" to ok, "warnings" to warnings, "preview" to preview.toJson(), "image" to image?.absolutePath, "tree" to tree?.absolutePath,
    "width" to width, "height" to height, "taskMs" to taskMs, "renderMs" to renderMs, "status" to status,
    "failure" to failure?.name, "message" to message?.text, "freshLoader" to freshLoader, "phases" to phases.toSortedMap(),
)

fun CompileResult.toJson(): Map<String, Any?> = mapOf("ok" to ok, "exitCode" to exitCode, "messages" to messages, "ms" to ms, "files" to files)

fun SourceIndex.toJson(): Map<String, Any?> = mapOf("root" to root, "roots" to roots, "files" to files)

fun Selection.toJson(): Map<String, Any?> = mapOf(
    "ok" to true, "ref" to ref, "file" to file, "line" to line,
    "node" to node, "chain" to chain, "userChain" to userChain, "bounds" to bounds,
    "preview" to preview?.toJson(), "image" to image, "tree" to tree,
    "interactive" to interactive, "by" to by, "at" to at,
)

fun Map<String, Any?>.toPointed(): Pointed =
    Pointed(string("node"), strings("chain"), this["bounds"], string("previewId"), this["userChain"]?.let { strings("userChain") })
