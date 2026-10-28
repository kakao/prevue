package prevue.daemon.adapter.render

import com.android.tools.rendering.RenderLogger
import com.android.tools.rendering.RenderResult
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.entity.Phrase
import prevue.daemon.entity.Verbatim
import prevue.daemon.entity.lines
import prevue.daemon.entity.phrase

internal data class RenderVerdict(val failure: FailureKind?, val message: Phrase?, val warnings: List<String>, val blank: Blank? = null) {
    enum class Blank { NO_METHOD, EMPTY_TREE }

    companion object {
        fun of(p: PreviewSpec, result: RenderResult, logger: RenderLogger, probe: PreviewProbe, treeEmpty: Boolean): RenderVerdict {
            val (rBroken, realBroken) = logger.brokenClasses.entries.partition { isRClass(it.key) }
            val warnings = rBroken.map { "R 클래스 없음: ${it.key}" } + logger.missingClasses.filter(::isRClass).map { "R 클래스 없음: $it" }
            val evidence = Evidence(p, result, logger, realBroken.associate { it.key to it.value }, probe, treeEmpty)
            val failure = evidence.failure()
            val quiet = evidence.blank.takeIf { failure == null && it == Blank.EMPTY_TREE }
            return RenderVerdict(failure?.kind, failure?.message, warnings + listOfNotNull(quiet?.let { EMPTY_TREE_WARNING }), failure?.blank ?: quiet)
        }

        const val EMPTY_TREE_WARNING = "Compose 노드 없음 — 렌더는 성공했지만 Preview가 그린 노드가 없다"

        fun blank(presence: PreviewProbe.Presence, succeeded: Boolean, treeEmpty: Boolean): Blank? = when {
            presence == PreviewProbe.Presence.NO_METHOD -> Blank.NO_METHOD
            succeeded && treeEmpty -> Blank.EMPTY_TREE
            else -> null
        }

        fun brief(t: Throwable): String {
            val root = generateSequence(t) { it.cause }.last()
            val where = root.stackTrace.firstOrNull { f -> PLATFORM_PACKAGES.none { f.className.startsWith(it) } }
            return "${root.javaClass.name}: ${root.message}" + (where?.let { "\n    at $it" } ?: "")
        }

        private fun plain(html: String): String =
            html.replace(Regex("<[^>]*>"), "").replace("&nbsp;", " ").replace(Regex("[ \\t]+"), " ").trim()

        private fun isRClass(name: String) = R_CLASS.containsMatchIn(name)

        private val R_CLASS = Regex("""(^|\.)R(\$\w+)?$""")
        private val DI = Regex("Hilt|EntryPoint|dagger|@Inject|hiltViewModel")
        private val ANDROID_VIEW = Regex("AndroidView|GLSurfaceView|SurfaceView|MapView|UnsatisfiedLinkError")
        private val PLATFORM_PACKAGES = listOf("android.", "androidx.", "java.", "javax.", "jdk.", "sun.", "kotlin.", "com.android.")
    }

    private class Failure(val kind: FailureKind, val message: Phrase, val blank: Blank? = null)

    private class Evidence(
        private val p: PreviewSpec, private val result: RenderResult, logger: RenderLogger,
        private val broken: Map<String, Throwable>, probe: PreviewProbe, treeEmpty: Boolean,
    ) {
        private val status = result.renderResult
        private val previewClass = p.fqn.substringBeforeLast('.')
        private val previewMethod = p.fqn.substringAfterLast('.')
        private val succeeded = status?.isSuccess == true
        private val presence = probe.presence(p.fqn, checkMethod = succeeded && treeEmpty)
        val blank = blank(presence, succeeded, treeEmpty)
        private val missing = logger.missingClasses
        private val all = texts(logger).joinToString("\n")

        private fun texts(logger: RenderLogger): List<String> = buildList {
            status?.errorMessage?.let { add(plain(it)) }
            status?.exception?.let { add(brief(it)) }
            broken.forEach { (k, v) -> add("$k: ${brief(v)}") }
            logger.messages.forEach { m ->
                add(plain(m.html))
                m.throwable?.let { add(brief(it)) }
            }
        }.filter { it.isNotBlank() }.distinct()

        fun failure(): Failure? = when {
            previewClassMissing() -> Failure(FailureKind.NOT_FOUND, lines(classMissing(), all))
            else -> loud()?.let { Failure(it.first, it.second) }
                ?: Failure(FailureKind.NOT_FOUND, lines(methodMissing(), all), blank).takeIf { blank == Blank.NO_METHOD }
        }

        private fun loud(): Pair<FailureKind, Phrase>? = when {
            all.contains(DI) -> FailureKind.DI to lines(phrase("render.di"), all)
            all.contains(ANDROID_VIEW) -> FailureKind.ANDROID_VIEW to lines(phrase("render.androidView"), all)
            status != null && !status.isSuccess -> FailureKind.EXCEPTION to Verbatim(all.ifBlank { "status=${status.status}" })
            broken.isNotEmpty() -> FailureKind.EXCEPTION to Verbatim(all)
            imageEmpty() -> FailureKind.EXCEPTION to lines(phrase("render.emptyImage"), all)
            else -> null
        }

        private fun previewClassMissing() =
            missing.contains(previewClass) || (broken.containsKey(previewClass) && all.contains("NoSuchMethod")) || presence == PreviewProbe.Presence.NO_CLASS

        private fun classMissing(): Phrase = p.file?.takeIf { presence == PreviewProbe.Presence.NO_CLASS }
            ?.let { phrase("render.classMissing.reload", "class" to previewClass, "file" to it.path) }
            ?: phrase("render.classMissing", "class" to previewClass)

        private fun methodMissing(): Phrase = p.file
            ?.let { phrase("render.methodMissing.reload", "class" to previewClass, "method" to previewMethod, "file" to it.path) }
            ?: phrase("render.methodMissing", "class" to previewClass, "method" to previewMethod)

        private fun imageEmpty() = result.renderedImage.width <= 1 || result.renderedImage.height <= 1
    }
}
