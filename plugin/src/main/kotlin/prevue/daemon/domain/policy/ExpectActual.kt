package prevue.daemon.domain.policy

object ExpectActual {
    private const val ANNOTATIONS = """(?:@[\w.]+(?:\([^)\n]*\))?[ \t]+)*"""
    private const val MODIFIERS = """(?:[a-z]+[ \t]+)*?"""
    private const val DECLARATION = """(?:fun|class|object|interface|val|var|typealias|constructor)\b"""

    private val declaration = Regex("""(?m)^[ \t]*$ANNOTATIONS$MODIFIERS(?:expect|actual)[ \t]+$MODIFIERS$DECLARATION""")

    fun declares(text: String): Boolean = declaration.containsMatchIn(text)
}
