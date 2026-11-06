package prevue.application.domain.rule

object ParamLabels {
    const val MAX_LENGTH = 24

    fun of(values: List<Any?>, count: Int): List<String?> {
        val labels = List(count) { k -> values.getOrNull(k)?.let(::label) }
        val repeated = labels.filterNotNull().groupingBy { it }.eachCount().filterValues { it > 1 }.keys
        return labels.map { it?.takeUnless(repeated::contains) }
    }

    private val INDEX = Regex("#\\d+")

    private fun unprintable(c: Char): Boolean = c.isISOControl() || c == '\u2028' || c == '\u2029'

    private fun label(value: Any): String? {
        if (value !is Enum<*> && value !is Number && value !is Boolean && value !is Char && value !is CharSequence) return null
        val text = runCatching { value.toString() }.getOrNull() ?: return null
        return text.takeIf { it.isNotBlank() && it.length <= MAX_LENGTH && it == it.trim() && it.none(::unprintable) && !INDEX.matches(it) }
    }
}
