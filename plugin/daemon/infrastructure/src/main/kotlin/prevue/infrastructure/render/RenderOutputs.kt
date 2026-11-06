package prevue.infrastructure.render

import com.android.tools.rendering.RenderLogger
import com.android.tools.rendering.RenderResult
import kotlinx.coroutines.CompletableDeferred
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.Phrase
import prevue.application.domain.model.Verbatim
import prevue.application.domain.model.phrase
import prevue.application.port.FailureKind
import prevue.application.port.RenderOutput

internal data class RenderTiming(
    val taskMs: Long,
    val renderMs: Long,
    val freshLoader: Boolean,
    val phases: MutableMap<String, Long> = mutableMapOf(),
) {
    companion object {
        fun failedBeforeRender(freshLoader: Boolean) = RenderTiming(0, 0, freshLoader)
    }
}

internal enum class TreeOut {
    KEPT, WRITTEN, NONE;

    val written: Boolean get() = this != NONE
}

internal class RenderOutputs(
    private val artifacts: RenderArtifactStore,
    private val onBlank: (PreviewSpec, RenderVerdict.Blank, ClassLoader?) -> Unit = { _, _, _ -> },
) {
    var afterBuild = false
    var lastCompose: List<Map<String, Any?>> = emptyList()
    var lastAdapter: Any? = null

    fun forgetTree() {
        lastCompose = emptyList()
        lastAdapter = null
    }

    fun written(
        p: PreviewSpec, result: RenderResult, logger: RenderLogger, timing: RenderTiming, loader: ClassLoader?, tree: TreeOut = TreeOut.KEPT,
    ): RenderOutput {
        val ph = timing.phases
        var t = System.nanoTime()
        val compose = if (tree.written) ViewInfoJson.compose(result.rootViews) else emptyList()
        val verdict = RenderVerdict.of(p, result, logger, PreviewProbe(loader), tree.written && compose.isEmpty())
        ph["classifyMs"] = msSince(t)
        verdict.blank?.let { onBlank(p, it, loader) }
        if (verdict.failure == null) ViewInfoJson.toolingMismatch(result.rootViews)?.let {
            forgetTree(tree)
            return failed(p, FailureKind.EXCEPTION, phrase("render.toolingMismatch", "surface" to it), timing)
        }
        if (afterBuild && verdict.failure == FailureKind.NOT_FOUND)
            return failed(p, FailureKind.NOT_FOUND, verdict.message ?: Verbatim(""), timing)
        afterBuild = false
        val img = result.renderedImage
        val png = artifacts.imageFile(p.previewId)
        t = System.nanoTime()
        val copy = img.copy
        ph["copyMs"] = msSince(t)
        val status = result.renderResult?.status?.toString() ?: "null"
        t = System.nanoTime()
        val treeJson = mapOf(
            "fqn" to p.fqn, "previewId" to p.previewId, "params" to p.params, "file" to p.file?.absolutePath,
            "image" to png.absolutePath, "imageSize" to listOf(img.width, img.height),
            "renderResult" to status, "failure" to verdict.failure?.name, "message" to verdict.message?.text, "warnings" to verdict.warnings,
            "timings" to mapOf("taskMs" to timing.taskMs, "renderMs" to timing.renderMs, "freshLoader" to timing.freshLoader),
            "layoutlibViewInfo" to if (tree.written) result.rootViews.map { ViewInfoJson.layoutlib(it) } else emptyList(),
            "composeViewInfo" to if (tree.written) kept(tree, compose, result) else emptyList(),
        )
        ph["treeMs"] = msSince(t)
        val ok = verdict.failure == null
        val written = artifacts.write(p.previewId, copy, treeJson, !ok)
        return RenderOutput(
            ok, p, png.takeIf { ok }, artifacts.treeFile(p.previewId), img.width, img.height, timing.taskMs, timing.renderMs,
            status, verdict.failure, verdict.message, timing.freshLoader, verdict.warnings, written, ph.toMap(),
        )
    }

    private fun forgetTree(tree: TreeOut) {
        if (tree == TreeOut.KEPT) forgetTree()
    }

    private fun kept(tree: TreeOut, compose: List<Map<String, Any?>>, result: RenderResult): List<Map<String, Any?>> {
        if (tree == TreeOut.KEPT) keepTree(compose, result)
        return compose
    }

    private fun keepTree(compose: List<Map<String, Any?>>, result: RenderResult) {
        lastCompose = compose
        lastAdapter = ViewInfoJson.adapter(result.rootViews)
    }

    fun failed(p: PreviewSpec, kind: FailureKind, message: Phrase, timing: RenderTiming): RenderOutput {
        afterBuild = afterBuild && kind == FailureKind.NOT_FOUND
        val treeJson = mapOf(
            "fqn" to p.fqn, "previewId" to p.previewId, "failure" to kind.name, "message" to message.text,
            "composeViewInfo" to emptyList<Any>(), "layoutlibViewInfo" to emptyList<Any>(),
        )
        val written = if (afterBuild) CompletableDeferred(emptyMap()) else artifacts.write(p.previewId, null, treeJson, failed = true)
        return RenderOutput(
            false, p, null, artifacts.treeFile(p.previewId).takeUnless { afterBuild }, 0, 0, timing.taskMs, timing.renderMs,
            "FAILED", kind, message, timing.freshLoader, written = written,
        )
    }

    companion object {
        fun msSince(nanos: Long) = (System.nanoTime() - nanos) / 1_000_000

        fun discard(out: RenderOutput) = listOfNotNull(out.image, out.tree).forEach { it.delete() }

        fun lost(out: RenderOutput): Boolean = out.image?.isFile == false

        fun pixelHash(pixels: IntArray): Long {
            var h = FNV_OFFSET
            for (v in pixels) h = (h xor v.toLong()) * FNV_PRIME
            return h
        }

        private const val FNV_OFFSET = 1469598103934665603L
        private const val FNV_PRIME = 1099511628211L
    }
}
