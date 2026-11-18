package prevue.application.domain.model

enum class EdgeToEdge(val key: String) {
    AUTO("auto"), ON("on");

    fun applyTo(p: PreviewSpec): PreviewSpec = p.copy(params = when (this) {
        AUTO -> p.params - PARAM
        ON -> p.params + (PARAM to "true")
    })

    companion object {
        const val PARAM: String = "prevueEdgeToEdge"

        fun parse(value: String?): EdgeToEdge? = value?.let { v ->
            entries.firstOrNull { it.key == v } ?: throw IllegalArgumentException("edge-to-edge는 auto · on 중 하나 — $v")
        }
    }
}
