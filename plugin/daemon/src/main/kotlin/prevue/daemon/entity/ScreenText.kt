package prevue.daemon.entity

private val PLACEHOLDER = Regex("""\{(\w+)}""")

sealed interface Phrase {
    val text: String
}

data class Keyed(val key: String, val args: Map<String, Any?> = emptyMap()) : Phrase {
    override val text: String get() = fill(SCREEN_TEXT["$key.one"]?.takeIf { (args["n"] as? Number)?.toLong() == 1L } ?: SCREEN_TEXT.getValue(key), args)
    override fun toString() = text
}

data class Verbatim(override val text: String) : Phrase {
    override fun toString() = text
}

class PhraseException(val phrase: Phrase) : IllegalArgumentException(phrase.text)

fun phraseOrNull(key: String, vararg args: Pair<String, Any?>): Phrase? =
    if (key in SCREEN_TEXT) Keyed(key, args.toMap()) else null

fun phrase(key: String, vararg args: Pair<String, Any?>): Phrase =
    phraseOrNull(key, *args) ?: error("화면 사전에 없는 키: $key")

private fun fill(template: String, values: Map<String, Any?>): String = PLACEHOLDER.replace(template) { m ->
    val name = m.groupValues[1]
    if (name in values) values[name].let { if (it is Phrase) it.text else it.toString() } else m.value
}

const val LINES = "text.lines"

fun lines(head: Phrase, rest: Phrase?): Phrase =
    if (rest == null || rest is Verbatim && rest.text.isEmpty()) head else Keyed(LINES, mapOf("head" to head, "rest" to rest))

fun lines(head: Phrase, rest: String?): Phrase = lines(head, rest?.let(::Verbatim))

inline fun ensure(value: Boolean, why: () -> Phrase) {
    if (!value) throw PhraseException(why())
}
