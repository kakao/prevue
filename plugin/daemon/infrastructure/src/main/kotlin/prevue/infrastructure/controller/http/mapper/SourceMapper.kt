// 프리뷰 · 렌더 산출물 · 컴파일 · 소스 색인 · 선택 → JSON. domain은 키를 모른다.
package prevue.infrastructure.controller.http.mapper

import prevue.application.port.CompileResult
import java.io.File
import prevue.application.domain.model.ComposableDefinition
import prevue.application.domain.model.ComposablePreviews
import prevue.application.domain.model.PreviewSpec
import prevue.application.port.RenderOutput
import prevue.application.domain.model.Selection
import prevue.application.domain.model.SourceIndex
import prevue.infrastructure.json.string
import prevue.infrastructure.json.strings
import prevue.application.domain.model.Pointed

internal fun PreviewSpec.toJson(): Map<String, Any?> = mapOf(
    "fqn" to fqn, "previewId" to previewId, "params" to params, "file" to file?.absolutePath, "index" to index,
    "methodParams" to methodParams,
)

internal fun File.relTo(repoRoot: String): String = path.removePrefix("$repoRoot/")

internal fun ComposableDefinition.toJson(repoRoot: String): Map<String, Any?> =
    mapOf("path" to file.path, "rel" to file.relTo(repoRoot), "module" to module)

internal fun composablePreviewsJson(of: String, found: ComposablePreviews?, repoRoot: String): Map<String, Any?> = mapOf(
    "ready" to (found != null),
    "of" to (found?.name ?: of),
    "definitions" to found?.definitions.orEmpty().map { it.toJson(repoRoot) },
    "previews" to found?.previews.orEmpty().map {
        mapOf("fqn" to it.fqn, "fn" to it.function, "file" to it.file.path, "rel" to it.file.relTo(repoRoot), "module" to it.module)
    },
)

internal fun RenderOutput.toJson(): Map<String, Any?> = mapOf(
    "ok" to ok, "warnings" to warnings, "preview" to preview.toJson(), "image" to image?.absolutePath, "tree" to tree?.absolutePath,
    "width" to width, "height" to height, "taskMs" to taskMs, "renderMs" to renderMs, "status" to status,
    "failure" to failure?.name, "message" to message?.text, "freshLoader" to freshLoader, "phases" to phases.toSortedMap(),
)

internal fun CompileResult.toJson(): Map<String, Any?> = mapOf("ok" to ok, "exitCode" to exitCode, "messages" to messages, "ms" to ms, "files" to files)

internal fun SourceIndex.toJson(): Map<String, Any?> = mapOf("root" to root, "roots" to roots, "files" to files)

internal fun Selection.toJson(): Map<String, Any?> = mapOf(
    "ok" to true, "ref" to ref, "file" to file, "line" to line,
    "node" to node, "chain" to chain, "userChain" to userChain, "bounds" to bounds,
    "preview" to preview?.toJson(), "image" to image, "tree" to tree,
    "interactive" to interactive, "by" to by, "at" to at,
)

internal fun Map<String, Any?>.toPointed(): Pointed =
    Pointed(string("node"), strings("chain"), this["bounds"], string("previewId"), this["userChain"]?.let { strings("userChain") })
