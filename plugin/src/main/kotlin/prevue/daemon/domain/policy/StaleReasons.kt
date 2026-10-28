package prevue.daemon.domain.policy

import prevue.daemon.domain.model.StaleReason
import prevue.daemon.entity.Phrase
import prevue.daemon.entity.Verbatim
import prevue.daemon.entity.phrase
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.port.RenderOutput
import java.io.File
import java.time.Instant

/**
 * 그림이 소스보다 옛것이 된 이유와 그때 사람이 할 일. 이유마다 손쓸 방법(`remedy`)이 달라 합치지 않는다.
 * 키(`compile` · `build` · `resources` · `build-files`)는 `status.stale`의 키라 계약이다.
 */
object StaleReasons {
    const val COMPILE = "compile"
    const val BUILD = "build"
    const val RESOURCES = "resources"
    const val BUILD_FILES = "build-files"

    /** 오버레이는 직전 성공본 그대로다 — 화면에 남아 있는 그림은 이 저장 **이전**의 코드다. */
    fun compileFailed(files: List<File>, messages: String, hint: Phrase? = null) = reason(files,
        phrase("stale.compile"), hint ?: phrase("stale.compile.remedy"),
        messages.lineSequence().firstOrNull { it.isNotBlank() }?.let(::Verbatim))

    /** [why]는 values 저장을 값만 넣어 닫지 못한 이유다(D-68) — 새 항목 · 다른 정의가 이기는 항목 따위. */
    fun resources(files: List<File>, shown: File?, why: Phrase? = null) = reason(files,
        phrase("stale.resources"), phrase("stale.resources.remedy", "file" to placeholder(shown)), why)

    fun buildFiles(files: List<File>) = reason(files,
        phrase("stale.buildFiles"), phrase("stale.buildFiles.remedy"))

    fun missingRClass(out: RenderOutput): StaleReason? {
        if (out.failure != FailureKind.EXCEPTION) return null
        val name = MISSING_CLASS.findAll(out.message?.text.orEmpty()).map { it.groupValues[1].replace('/', '.') }
            .firstOrNull { R_CLASS.containsMatchIn(it) } ?: return null
        val file = out.preview.file
        return reason(listOfNotNull(file), phrase("stale.rClass", "name" to name),
            phrase("stale.rClass.remedy", "file" to placeholder(file)))
    }

    private val MISSING_CLASS = Regex("""(?:ClassNotFoundException|NoClassDefFoundError):? ([\w.$/]+)""")
    private val R_CLASS = Regex("""(^|[./])R(\$\w+)?$""")

    fun outputsGone(files: List<File>) = reason(files,
        phrase("stale.outputsGone"), phrase("stale.outputsGone.remedy"), pending = true)

    /** 빌드가 끝나기를 기다리는 동안에도 화면의 그림은 이미 옛것이다. 조용히 있지 않는다. */
    fun buildPending(change: List<File>, own: Boolean) = reason(change,
        phrase("stale.buildPending", "who" to who(own)),
        phrase("stale.buildPending.remedy"), pending = true)

    fun classPending(change: List<File>, file: File?, message: Phrase?) = reason(change,
        phrase("stale.classPending"),
        phrase("stale.classPending.remedy", "file" to placeholder(file)), message, pending = true)

    fun redrawFailed(change: List<File>, own: Boolean) = reason(change,
        phrase("stale.redrawFailed", "who" to who(own)), phrase("stale.redrawFailed.remedy"))

    private fun placeholder(file: File?): Any = file?.path ?: phrase("stale.filePlaceholder")

    private fun who(own: Boolean) = if (own) phrase("stale.who.own") else phrase("stale.who.deps")

    private fun reason(files: List<File>, what: Phrase, remedy: Phrase, message: Phrase? = null, pending: Boolean = false) =
        StaleReason(files.map { it.absolutePath }, what, remedy, Instant.now().toString(), message, pending)
}
