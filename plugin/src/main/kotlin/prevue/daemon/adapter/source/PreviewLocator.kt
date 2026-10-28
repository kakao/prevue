package prevue.daemon.adapter.source

import java.io.File
import prevue.daemon.entity.PreviewSpec

object PreviewLocator {
    private val pkgRe = Regex("""^\s*package\s+([\w.]+)""", RegexOption.MULTILINE)
    private val jvmNameRe = Regex("""@file:JvmName\("([^"]+)"\)""")
    private val importRe = Regex("""^\s*import\s+([\w.]+)(?:\s+as\s+(\w+))?""", RegexOption.MULTILINE)
    private val annoRe = Regex("""@(?:file:)?([\w.]+)""")
    private val funRe = Regex("""\bfun\s+(?:<[^>]*>\s*)?(\w+)\s*\(""")
    private val declBetweenRe = Regex("""\b(class|object|interface|val|var)\b""")

    private val uiModeConsts = mapOf(
        "Configuration.UI_MODE_NIGHT_YES" to 32, "UI_MODE_NIGHT_YES" to 32,
        "Configuration.UI_MODE_NIGHT_NO" to 16, "UI_MODE_NIGHT_NO" to 16,
        "Configuration.UI_MODE_TYPE_NORMAL" to 1, "UI_MODE_TYPE_NORMAL" to 1,
    )

    private class Head(val pkg: String, val classFqn: String, val imports: Map<String, String>) {
        fun resolve(name: String) = if (name.contains('.')) name else imports[name] ?: "$pkg.$name"
    }

    private class Found(val name: String, val direct: Boolean, val sets: List<Map<String, String>>, val methodParams: List<Map<String, String>>)

    private class DirectArgs(found: List<Found>, private val classFqn: String, private val file: File, private val multi: MultiPreview?) {
        private val compiled = HashMap<String, List<Map<String, String>>?>()
        private val count = found.filter { it.direct }.groupingBy { it.name }.eachCount()
        private val seen = HashMap<String, Int>()

        fun sets(fd: Found): List<Map<String, String>> {
            if (!fd.direct || multi == null) return fd.sets
            val c = compiled.getOrPut(fd.name) { multi.direct(classFqn, fd.name, file.lastModified()) }
            val i = seen.next(fd.name)
            return if (c != null && c.size == count[fd.name]) listOf(c[i]) else fd.sets
        }
    }

    fun fromFile(file: File, multi: MultiPreview? = null): List<PreviewSpec> {
        val text = file.readText()
        val head = head(text, file)
        val found = annoRe.findAll(text).mapNotNull { found(text, it, head, multi) }.toList()
        return specs(found, head, file, multi)
    }

    private fun head(text: String, file: File): Head {
        val pkg = pkgRe.find(text)?.groupValues?.get(1) ?: ""
        val facade = jvmNameRe.find(text)?.groupValues?.get(1)
            ?: (file.nameWithoutExtension.replaceFirstChar(Char::uppercase) + "Kt")
        val imports = HashMap<String, String>()
        for (m in importRe.findAll(text)) {
            val fqn = m.groupValues[1]
            imports[m.groupValues[2].ifEmpty { fqn.substringAfterLast('.') }] = fqn
        }
        return Head(pkg, "${if (pkg.isEmpty()) "" else "$pkg."}$facade", imports)
    }

    private fun found(text: String, m: MatchResult, head: Head, multi: MultiPreview?): Found? {
        val raw = m.groupValues[1]
        val (args, after) = argsAfter(text, m.range.last + 1)
        val fqn = head.resolve(raw)
        val direct = raw.substringAfterLast('.') == "Preview" || fqn == PREVIEW_FQN
        val sets = if (direct) listOf(args) else multi?.expand(fqn).orEmpty()
        if (sets.isEmpty()) return null
        val f = funRe.find(text, after) ?: return null
        if (declBetweenRe.containsMatchIn(text.substring(after, f.range.first))) return null
        val params = runCatching {
            methodParams(text.substring(f.range.last + 1, matchParen(text, f.range.last)), head.imports, head.pkg)
        }.getOrDefault(emptyList())
        return Found(f.groupValues[1], direct, sets, params)
    }

    private fun argsAfter(text: String, from: Int): Pair<Map<String, String>, Int> {
        var i = from
        while (i < text.length && text[i].isWhitespace()) i++
        if (i >= text.length || text[i] != '(') return emptyMap<String, String>() to i
        val close = matchParen(text, i)
        return parseArgs(text.substring(i + 1, close)) to close + 1
    }

    private fun specs(found: List<Found>, head: Head, file: File, multi: MultiPreview?): List<PreviewSpec> {
        val direct = DirectArgs(found, head.classFqn, file, multi)
        val out = ArrayList<PreviewSpec>()
        val perFunction = HashMap<String, Int>()
        for (fd in found) for (s in direct.sets(fd)) {
            val k = perFunction.next(fd.name)
            val id = if (k == 0) fd.name else "${fd.name}_$k"
            out += PreviewSpec("${head.classFqn}.${fd.name}", id, s, file, out.size, fd.methodParams)
        }
        return out
    }

    private fun HashMap<String, Int>.next(key: String): Int = (this[key] ?: 0).also { this[key] = it + 1 }

    private const val PREVIEW_FQN = "androidx.compose.ui.tooling.preview.Preview"

    private val previewParamRe = Regex("""@(?:[\w.]+\.)?PreviewParameter\s*\(""")

    internal fun methodParams(paramList: String, imports: Map<String, String>, pkg: String): List<Map<String, String>> {
        val out = ArrayList<Map<String, String>>()
        for (one in splitTopLevel(paramList)) {
            val m = previewParamRe.find(one) ?: continue
            val open = m.range.last
            val args = parseArgsRaw(one.substring(open + 1, matchParen(one, open)))
            val provider = (args["provider"] ?: args["name"])?.removeSuffix("::class")?.trim() ?: continue
            val fqn = if (provider.contains('.')) provider else imports[provider] ?: "$pkg.$provider"
            val e = linkedMapOf("provider" to fqn)
            args["limit"]?.let { e["limit"] = it }
            out += e
        }
        return out
    }

    fun fromFqn(fqn: String, params: Map<String, String>, file: File? = null): PreviewSpec =
        PreviewSpec(fqn, fqn.substringAfterLast('.'), params, file, 0)

    private fun matchParen(s: String, open: Int): Int {
        var depth = 0; var i = open; var inStr = false
        while (i < s.length) {
            val c = s[i]
            if (inStr) { if (c == '\\') i++ else if (c == '"') inStr = false }
            else when (c) { '"' -> inStr = true; '(' -> depth++; ')' -> { depth--; if (depth == 0) return i } }
            i++
        }
        error("괄호가 닫히지 않았다 @$open")
    }

    private class Depth {
        private var nest = 0
        private var angle = 0
        private var inStr = false
        private var prev = '\u0000'

        fun atComma(c: Char): Boolean = step(c).also { prev = c }

        private fun step(c: Char): Boolean {
            if (inStr) {
                if (c == '"' && prev != '\\') inStr = false
                return false
            }
            when (c) {
                '"' -> inStr = true
                '(', '[' -> nest++
                ')', ']' -> nest--
                '<' -> angle++
                '>' -> if (prev != '-') angle = maxOf(0, angle - 1)
                ',' -> return nest == 0 && angle == 0
            }
            return false
        }
    }

    internal fun splitTopLevel(raw: String): List<String> {
        val depth = Depth()
        var start = 0
        val parts = ArrayList<String>()
        for ((i, c) in raw.withIndex()) {
            if (depth.atComma(c)) { parts += raw.substring(start, i); start = i + 1 }
        }
        parts += raw.substring(start)
        return parts.map { it.trim() }.filter { it.isNotEmpty() }
    }

    internal fun parseArgsRaw(raw: String): Map<String, String> {
        val out = LinkedHashMap<String, String>()
        for (p in splitTopLevel(raw)) {
            val eq = p.indexOf('=')
            val named = eq > 0 && p[eq - 1] != '!' && p.getOrNull(eq + 1) != '='
            out[if (named) p.substring(0, eq).trim() else "name"] = (if (named) p.substring(eq + 1) else p).trim()
        }
        return out
    }

    internal fun parseArgs(raw: String): Map<String, String> {
        val out = LinkedHashMap<String, String>()
        for (p in splitTopLevel(raw)) {
            val eq = p.indexOf('=')
            val key = if (eq > 0) p.substring(0, eq).trim() else "name"
            val value = (if (eq > 0) p.substring(eq + 1) else p).trim()
            out[key] = literal(value) ?: continue
        }
        return out
    }

    private fun literal(v: String): String? = when {
        v.startsWith("\"") && v.endsWith("\"") -> v.substring(1, v.length - 1)
        v == "true" || v == "false" -> v
        v.startsWith("0x") || v.startsWith("0X") -> v.substring(2).replace("_", "").toLong(16).toString()
        v.endsWith("f") && v.dropLast(1).toDoubleOrNull() != null -> v.dropLast(1)
        v.replace("_", "").toLongOrNull() != null -> v.replace("_", "")
        v.toDoubleOrNull() != null -> v
        else -> uiMode(v)?.toString()
    }

    private fun uiMode(v: String): Int? {
        val parts = v.split(orRe).map { it.trim().removePrefix("android.content.res.") }
        return if (parts.all { it in uiModeConsts }) parts.fold(0) { acc, it -> acc or uiModeConsts.getValue(it) } else null
    }

    private val orRe = Regex("""\s+or\s+|\|""")
}
