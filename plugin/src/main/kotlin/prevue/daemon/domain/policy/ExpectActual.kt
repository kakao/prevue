package prevue.daemon.domain.policy

import java.io.File

object ExpectActual {
    private const val ARGS = """\((?:[^()\n]|\([^()\n]*\))*\)"""
    private const val ANNOTATIONS = """(?:@[\w.:]+(?:$ARGS)?[ \t]+)*"""
    private const val MODIFIERS = """(?:[a-z]+[ \t]+)*?"""
    private const val DECLARATION = """(?:fun|class|object|interface|val|var|typealias|constructor)\b"""

    private val declaration = Regex("""(?m)^[ \t]*$ANNOTATIONS$MODIFIERS(?:expect|actual)[ \t]+$MODIFIERS$DECLARATION""")
    private val notCode = Regex("\"\"\"[\\s\\S]*?\"\"\"|/\\*[\\s\\S]*?\\*/")

    fun declares(text: String): Boolean = declaration.containsMatchIn(notCode.replace(text, ""))

    fun declares(file: File, read: String?): Boolean =
        (read ?: runCatching { file.readText() }.getOrNull())?.let(::declares) == true
}
