package prevue.daemon.domain.policy

object ExpectActual {
    private val declaration = Regex(
        """(?m)^[ \t]*(?:@[\w.]+(?:\([^)\n]*\))?[ \t]+)*(?:[a-z]+[ \t]+)*?(?:expect|actual)[ \t]+(?:[a-z]+[ \t]+)*?(?:fun|class|object|interface|val|var|typealias|constructor)\b""",
    )

    fun declares(text: String): Boolean = declaration.containsMatchIn(text)
}
