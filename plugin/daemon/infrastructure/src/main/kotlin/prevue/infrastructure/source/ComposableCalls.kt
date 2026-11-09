package prevue.infrastructure.source

import java.util.regex.Pattern
import prevue.application.domain.model.SourceOutline

internal object ComposableCalls {
    private val definitionRe = Regex(
        """@(?:androidx\.compose\.runtime\.)?Composable\b""" +
            """(?:\s+|@[\w.]+(?:\([^()]*\))?|\b(?:private|internal|public|protected|inline|override|actual|expect|open)\b)*""" +
            """\bfun\s+(?:<[^>]*>\s*)?(?:[\w.]+\.)?([A-Z]\w*)\s*\(""",
    )
    private val callRe = Regex("""(?<![\w.@:])([A-Z]\w*)\s*(?:<[^<>]*>\s*)?[({]""")
    private val bodyStart: Pattern = Pattern.compile("""\s*(?::\s*[\w.<>?, ]+?\s*)?([{=])""")

    fun outline(text: String, functions: Collection<String>): SourceOutline {
        val code = blank(text)
        val defined = definitionRe.findAll(code).map { it.groupValues[1] }.distinct().toList()
        val calls = functions.associateWith { fn ->
            bodies(code, fn).flatMap { b -> callRe.findAll(b).map { it.groupValues[1] } }.distinct().toList()
        }
        return SourceOutline(defined, calls)
    }

    private fun bodies(code: String, fn: String): Sequence<String> =
        Regex("""\bfun\s+(?:<[^>]*>\s*)?${Regex.escape(fn)}\s*\(""").findAll(code).mapNotNull { m ->
            val close = closing(code, m.range.last, '(', ')') ?: return@mapNotNull null
            val start = bodyStart.matcher(code).region(close + 1, code.length)
            if (!start.lookingAt()) return@mapNotNull null
            val at = start.start(1)
            if (code[at] == '{') closing(code, at, '{', '}')?.let { code.substring(at + 1, it) } else expression(code, at + 1)
        }

    private fun closing(s: String, open: Int, o: Char, c: Char): Int? {
        var depth = 0
        for (i in open until s.length) {
            if (s[i] == o) depth++
            else if (s[i] == c && --depth == 0) return i
        }
        return null
    }

    private fun expression(s: String, from: Int): String {
        var depth = 0
        var seen = false
        for (i in from until s.length) {
            when (s[i]) {
                '(', '{', '[' -> depth++
                ')', '}', ']' -> if (depth == 0) return s.substring(from, i) else depth--
                '\n' -> if (depth == 0 && seen && !continues(s, i)) return s.substring(from, i)
            }
            if (!s[i].isWhitespace()) seen = true
        }
        return s.substring(from)
    }

    private fun continues(s: String, newline: Int): Boolean {
        var j = newline
        while (j < s.length && s[j].isWhitespace()) j++
        return j < s.length && (s[j] == '.' || s[j] == '?')
    }

    internal fun blank(src: String): String {
        val out = StringBuilder(src)
        var i = 0
        while (i < src.length) {
            val end = skippedEnd(src, i)
            if (end == null) { i++; continue }
            for (k in i until end) if (out[k] != '\n') out.setCharAt(k, ' ')
            i = end
        }
        return out.toString()
    }

    private fun skippedEnd(src: String, i: Int): Int? = when {
        src.startsWith("//", i) -> src.indexOf('\n', i).let { if (it < 0) src.length else it }
        src.startsWith("/*", i) -> blockCommentEnd(src, i)
        src.startsWith("\"\"\"", i) -> src.indexOf("\"\"\"", i + 3).let { if (it < 0) src.length else it + 3 }
        src[i] == '"' || src[i] == '\'' -> quotedEnd(src, i)
        else -> null
    }

    private fun blockCommentEnd(s: String, from: Int): Int {
        var depth = 0
        var i = from
        while (i < s.length) {
            when {
                s.startsWith("/*", i) -> { depth++; i += 2 }
                s.startsWith("*/", i) -> { depth--; i += 2; if (depth == 0) return i }
                else -> i++
            }
        }
        return s.length
    }

    private fun quotedEnd(s: String, from: Int): Int {
        val q = s[from]
        var i = from + 1
        while (i < s.length) {
            when (s[i]) {
                '\\' -> i += 2
                q -> return i + 1
                '\n' -> return i
                else -> i++
            }
        }
        return s.length
    }
}
