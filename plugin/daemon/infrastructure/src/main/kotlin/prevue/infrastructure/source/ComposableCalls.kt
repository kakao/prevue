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
    private val funRe = Regex("""\bfun\s+(?:<[^>]*>\s*)?(\w+)\s*\(""")
    private val declaredRe = Regex("""\bfun\s+(?:<[^>]*>\s*)?$""")
    private val bodyStart: Pattern = Pattern.compile("""\s*(?::\s*[\w.<>?, ]+?\s*)?([{=])""")

    fun outline(text: String, functions: Collection<String>): SourceOutline {
        val code = blank(text)
        val depth = braceDepths(code)
        val defined = definitionRe.findAll(code).filter { depth[it.range.first] == 0 }.map { it.groupValues[1] }.distinct().toList()
        val wanted = functions.toSet()
        val bodies = funRe.findAll(code).filter { depth[it.range.first] == 0 && it.groupValues[1] in wanted }
            .mapNotNull { m -> body(code, m)?.let { m.groupValues[1] to it } }
            .groupBy({ it.first }, { it.second })
        val calls = functions.associateWith { fn -> bodies[fn].orEmpty().flatMap(::callsIn).distinct() }
        return SourceOutline(defined, calls)
    }

    private fun callsIn(body: String): List<String> =
        callRe.findAll(body).filterNot { declaredRe.containsMatchIn(body.substring(maxOf(0, it.range.first - 64), it.range.first)) }
            .map { it.groupValues[1] }.toList()

    private fun braceDepths(code: String): IntArray {
        val out = IntArray(code.length + 1)
        var d = 0
        for (i in code.indices) {
            out[i] = d
            if (code[i] == '{') d++ else if (code[i] == '}') d = maxOf(0, d - 1)
        }
        out[code.length] = d
        return out
    }

    private fun body(code: String, m: MatchResult): String? {
        val close = closing(code, m.range.last, '(', ')') ?: return null
        val start = bodyStart.matcher(code).region(close + 1, code.length)
        if (!start.lookingAt()) return null
        val at = start.start(1)
        return if (code[at] == '{') closing(code, at, '{', '}')?.let { code.substring(at + 1, it) } else expression(code, at + 1)
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
            when {
                s[i] == '\\' -> i += 2
                s[i] == q -> return i + 1
                s[i] == '\n' -> return i
                q == '"' && s.startsWith("\${", i) -> i = templateEnd(s, i + 2)
                else -> i++
            }
        }
        return s.length
    }

    private fun templateEnd(s: String, from: Int): Int {
        var depth = 0
        var i = from
        while (i < s.length) {
            when (s[i]) {
                '"', '\'' -> { i = quotedEnd(s, i); continue }
                '{' -> depth++
                '}' -> if (depth-- == 0) return i + 1
            }
            i++
        }
        return s.length
    }
}
