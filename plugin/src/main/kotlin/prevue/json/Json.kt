package prevue.json

object Json {
    fun parse(text: String): Any? = Parser(text).run { val v = value(); skipWs(); require(i == s.length) { "JSON 끝에 잔여 문자" }; v }

    fun str(v: Any?): String = StringBuilder().also { write(v, it) }.toString()

    private fun write(v: Any?, sb: StringBuilder) {
        when (v) {
            null -> sb.append("null")
            is String -> quote(v, sb)
            is Boolean, is Int, is Long -> sb.append(v)
            is Double -> number(v, sb)
            is Float -> number(v.toDouble(), sb)
            is Map<*, *> -> obj(v, sb)
            is Iterable<*> -> arr(v, sb)
            is Array<*> -> arr(v.asList(), sb)
            else -> quote(v.toString(), sb)
        }
    }

    private fun number(v: Double, sb: StringBuilder) {
        sb.append(if (v == Math.floor(v) && !v.isInfinite()) v.toLong().toString() else v.toString())
    }

    private fun obj(v: Map<*, *>, sb: StringBuilder) {
        sb.append('{')
        v.entries.forEachIndexed { n, (k, x) ->
            if (n > 0) sb.append(',')
            quote(k.toString(), sb); sb.append(':'); write(x, sb)
        }
        sb.append('}')
    }

    private fun arr(v: Iterable<*>, sb: StringBuilder) {
        sb.append('[')
        v.forEachIndexed { n, x ->
            if (n > 0) sb.append(',')
            write(x, sb)
        }
        sb.append(']')
    }

    private fun quote(s: String, sb: StringBuilder) {
        sb.append('"')
        for (c in s) when (c) {
            '"' -> sb.append("\\\"")
            '\\' -> sb.append("\\\\")
            '\n' -> sb.append("\\n")
            '\r' -> sb.append("\\r")
            '\t' -> sb.append("\\t")
            else -> if (c < ' ') sb.append("\\u%04x".format(c.code)) else sb.append(c)
        }
        sb.append('"')
    }

    private class Parser(val s: String) {
        var i = 0
        fun skipWs() { while (i < s.length && s[i].isWhitespace()) i++ }
        fun value(): Any? {
            skipWs()
            require(i < s.length) { "JSON이 비었다" }
            return when (val c = s[i]) {
                '{' -> obj()
                '[' -> arr()
                '"' -> string()
                't' -> lit("true", true)
                'f' -> lit("false", false)
                'n' -> lit("null", null)
                else -> if (c == '-' || c.isDigit()) number() else error("예상 못한 문자 '$c' @$i")
            }
        }
        fun obj(): Map<String, Any?> {
            val m = LinkedHashMap<String, Any?>(); i++
            skipWs(); if (s[i] == '}') { i++; return m }
            while (true) {
                skipWs(); val k = string(); skipWs(); require(s[i] == ':') { "':' 기대 @$i" }; i++
                m[k] = value(); skipWs()
                when (s[i]) { ',' -> i++; '}' -> { i++; return m }; else -> error("',' 또는 '}' 기대 @$i") }
            }
        }
        fun arr(): List<Any?> {
            val l = ArrayList<Any?>(); i++
            skipWs(); if (s[i] == ']') { i++; return l }
            while (true) {
                l += value(); skipWs()
                when (s[i]) { ',' -> i++; ']' -> { i++; return l }; else -> error("',' 또는 ']' 기대 @$i") }
            }
        }
        fun string(): String {
            require(s[i] == '"') { "문자열 기대 @$i" }; i++
            val sb = StringBuilder()
            while (true) {
                val c = s[i++]
                when (c) {
                    '"' -> return sb.toString()
                    '\\' -> when (val e = s[i++]) {
                        'n' -> sb.append('\n')
                        't' -> sb.append('\t')
                        'r' -> sb.append('\r')
                        'u' -> { sb.append(s.substring(i, i + 4).toInt(16).toChar()); i += 4 }
                        else -> sb.append(e)
                    }
                    else -> sb.append(c)
                }
            }
        }
        fun number(): Any {
            val start = i
            while (i < s.length && (s[i].isDigit() || s[i] in "+-.eE")) i++
            val t = s.substring(start, i)
            return t.toLongOrNull() ?: t.toDouble()
        }
        fun lit(word: String, v: Any?): Any? { require(s.startsWith(word, i)) { "리터럴 기대 @$i" }; i += word.length; return v }
    }
}

fun Map<String, Any?>.string(k: String): String? = this[k]?.toString()
fun Map<String, Any?>.strings(k: String): List<String> = (this[k] as? List<*>)?.map { it.toString() } ?: emptyList()
fun Map<String, Any?>.map(k: String): Map<String, String> =
    (this[k] as? Map<*, *>)?.entries?.associate { it.key.toString() to it.value.toString() } ?: emptyMap()
