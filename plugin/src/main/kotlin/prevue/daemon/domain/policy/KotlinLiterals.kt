package prevue.daemon.domain.policy

import java.math.BigInteger

object KotlinLiterals {
    enum class Kind { NUMBER, CHAR, STRING, BOOLEAN }

    data class Token(val start: Int, val end: Int, val kind: Kind)

    fun scan(src: String): List<Token>? = Scanner(src).run()

    fun value(type: String, text: String, negate: Boolean = false): Any? = when (type) {
        in INTEGER_TYPES -> integer(text, negate, INTEGER_TYPES.getValue(type))
        "Float" -> float(text, negate)
        "Double" -> double(text, negate)
        else -> if (negate) null else nonNumeric(type, text)
    }

    private class IntegerType(min: Long, max: Long, val suffix: Boolean, val narrow: (Long) -> Any) {
        val range = BigInteger.valueOf(min)..BigInteger.valueOf(max)
    }

    private val INTEGER_TYPES = mapOf(
        "Int" to IntegerType(Int.MIN_VALUE.toLong(), Int.MAX_VALUE.toLong(), suffix = false) { it.toInt() },
        "Long" to IntegerType(Long.MIN_VALUE, Long.MAX_VALUE, suffix = true) { it },
        "Short" to IntegerType(Short.MIN_VALUE.toLong(), Short.MAX_VALUE.toLong(), suffix = false) { it.toShort() },
        "Byte" to IntegerType(Byte.MIN_VALUE.toLong(), Byte.MAX_VALUE.toLong(), suffix = false) { it.toByte() },
    )

    private val FLOAT = Regex("""((?:[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?))[fF]""")
    private val DOUBLE_NEEDS_POINT_OR_EXPONENT = Regex("""[0-9]+(?:\.[0-9]+(?:[eE][+-]?[0-9]+)?|[eE][+-]?[0-9]+)""")
    private val INTEGER = Regex("""(0[xX][0-9a-fA-F]+|0[bB][01]+|0|[1-9][0-9]*)(L?)""")

    private val ESCAPES = mapOf(
        't' to '\t', 'b' to '\b', 'n' to '\n', 'r' to '\r',
        '\'' to '\'', '"' to '"', '\\' to '\\', '$' to '$',
    )

    private fun withoutUnderscores(text: String) = text.replace("_", "")

    private fun integer(text: String, negate: Boolean, type: IntegerType): Any? {
        val m = INTEGER.matchEntire(withoutUnderscores(text)) ?: return null
        val (digits, l) = m.destructured
        if (l.isNotEmpty() && !type.suffix) return null
        val v = magnitude(digits).let { if (negate) it.negate() else it }
        return if (v in type.range) type.narrow(v.toLong()) else null
    }

    private fun magnitude(digits: String): BigInteger = when {
        digits.startsWith("0x", true) -> BigInteger(digits.substring(2), 16)
        digits.startsWith("0b", true) -> BigInteger(digits.substring(2), 2)
        else -> BigInteger(digits)
    }

    private fun float(text: String, negate: Boolean): Float? =
        FLOAT.matchEntire(withoutUnderscores(text))?.groupValues?.get(1)?.toFloatOrNull()?.let { if (negate) -it else it }

    private fun double(text: String, negate: Boolean): Double? =
        DOUBLE_NEEDS_POINT_OR_EXPONENT.matchEntire(withoutUnderscores(text))?.value?.toDoubleOrNull()?.let { if (negate) -it else it }

    private fun nonNumeric(type: String, text: String): Any? = when (type) {
        "Boolean" -> when (text) { "true" -> true; "false" -> false; else -> null }
        "Char" -> quotedBody(text, '\'')?.let(::unescape)?.singleOrNull()
        "String" -> if (text.startsWith("\"\"\"")) null else quotedBody(text, '"')?.let(::unescape)
        else -> null
    }

    private fun quotedBody(text: String, quote: Char): String? =
        if (text.length >= 2 && text.first() == quote && text.last() == quote) text.substring(1, text.length - 1) else null

    private fun unescape(body: String): String? {
        val b = StringBuilder(body.length)
        var i = 0
        while (i < body.length) {
            if (startsTemplate(body, i)) return null
            if (body[i] != '\\') {
                b.append(body[i])
                i++
                continue
            }
            val (c, length) = escape(body, i) ?: return null
            b.append(c)
            i += length
        }
        return b.toString()
    }

    private fun startsTemplate(body: String, i: Int): Boolean =
        body[i] == '$' && body.getOrNull(i + 1)?.let { it == '{' || startsTemplateName(it) } == true

    private fun startsTemplateName(c: Char) = c.isLetter() || c == '_' || c == '`'

    private fun escape(body: String, i: Int): Pair<Char, Int>? {
        val e = body.getOrNull(i + 1) ?: return null
        if (e != 'u') return ESCAPES[e]?.let { it to 2 }
        return unicode(body.substring(i + 2, minOf(i + 6, body.length)))?.let { it to 6 }
    }

    private fun unicode(hex: String): Char? = if (hex.length == 4 && hex.all(::isHexDigit)) hex.toInt(16).toChar() else null

    private fun isHexDigit(c: Char) = c in '0'..'9' || c.lowercaseChar() in 'a'..'f'

    private fun isDecimal(c: Char) = c in '0'..'9'

    private class Scanner(val s: String) {
        private var i = 0
        private val out = ArrayList<Token>()

        fun run(): List<Token>? = if (code(nested = false)) out else null

        private fun at(k: Int): Char? = s.getOrNull(i + k)

        private fun atOneOf(k: Int, chars: String): Boolean = at(k)?.let { it in chars } == true

        private fun code(nested: Boolean): Boolean {
            var depth = 0
            while (i < s.length) {
                when (s[i]) {
                    '{' -> { depth++; i++ }
                    '}' -> { i++; if (nested && depth == 0) return true; depth-- }
                    else -> if (!token()) return false
                }
            }
            return !nested
        }

        private fun token(): Boolean {
            val c = s[i]
            when {
                c == '/' && at(1) == '/' -> lineComment()
                c == '/' && at(1) == '*' -> return blockComment()
                c == '"' -> return string()
                c == '\'' -> return char()
                c == '`' -> return backtickName()
                isDecimal(c) -> number()
                c.isLetter() || c == '_' -> word()
                else -> i++
            }
            return true
        }

        private fun lineComment() {
            while (i < s.length && s[i] != '\n') i++
        }

        private fun blockComment(): Boolean {
            var nestedDepth = 0
            while (i < s.length) {
                when {
                    s.startsWith("/*", i) -> { nestedDepth++; i += 2 }
                    s.startsWith("*/", i) -> { nestedDepth--; i += 2; if (nestedDepth == 0) return true }
                    else -> i++
                }
            }
            return false
        }

        private fun backtickName(): Boolean {
            val j = s.indexOf('`', i + 1)
            if (j < 0) return false
            i = j + 1
            return true
        }

        private fun string(): Boolean {
            if (s.startsWith("\"\"\"", i)) return rawString()
            val start = i
            var template = false
            i++
            while (i < s.length) {
                val c = s[i]
                when {
                    c == '\\' -> i += 2
                    c == '"' -> { i++; if (!template) out += Token(start, i, Kind.STRING); return true }
                    c == '\n' -> return false
                    c == '$' && at(1) == '{' -> { template = true; i += 2; if (!code(nested = true)) return false }
                    c == '$' && at(1)?.let(::startsTemplateName) == true -> { template = true; i++ }
                    else -> i++
                }
            }
            return false
        }

        private fun rawString(): Boolean {
            i += 3
            while (i < s.length) {
                when {
                    s.startsWith("\"\"\"", i) -> { i += 3; while (i < s.length && s[i] == '"') i++; return true }
                    s[i] == '$' && at(1) == '{' -> { i += 2; if (!code(nested = true)) return false }
                    else -> i++
                }
            }
            return false
        }

        private fun char(): Boolean {
            val start = i
            i++
            while (i < s.length && s[i] != '\'') {
                if (s[i] == '\n') return false
                if (s[i] == '\\') i++
                i++
            }
            if (i >= s.length) return false
            i++
            out += Token(start, i, Kind.CHAR)
            return true
        }

        private fun number() {
            val start = i
            when {
                s[i] == '0' && atOneOf(1, "xX") -> { i += 2; digits(::isHexDigit) }
                s[i] == '0' && atOneOf(1, "bB") -> { i += 2; digits { it == '0' || it == '1' } }
                else -> decimal()
            }
            suffix()
            out += Token(start, i, Kind.NUMBER)
        }

        private fun digits(ok: (Char) -> Boolean) {
            while (i < s.length && (ok(s[i]) || s[i] == '_')) i++
        }

        private fun decimal() {
            digits(::isDecimal)
            if (at(0) == '.' && at(1)?.let(::isDecimal) == true) {
                i++
                digits(::isDecimal)
            }
            if (exponentAhead()) {
                i += 2
                digits(::isDecimal)
            }
        }

        private fun exponentAhead(): Boolean {
            if (!atOneOf(0, "eE")) return false
            val digitAt = if (atOneOf(1, "+-")) 2 else 1
            return at(digitAt)?.let(::isDecimal) == true
        }

        private fun suffix() {
            when (at(0)) {
                'f', 'F', 'L' -> i++
                'u', 'U' -> { i++; if (at(0) == 'L') i++ }
            }
        }

        private fun word() {
            val start = i
            while (i < s.length && (s[i].isLetterOrDigit() || s[i] == '_')) i++
            val w = s.substring(start, i)
            if (w == "true" || w == "false") out += Token(start, i, Kind.BOOLEAN)
        }
    }
}
