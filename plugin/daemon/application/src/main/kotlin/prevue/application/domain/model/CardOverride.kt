package prevue.application.domain.model

enum class SystemUi(val key: String) {
    ANNOTATED("annotated") {
        override fun applyTo(p: PreviewSpec): PreviewSpec = p
        override fun shown(annotated: Boolean): Boolean = annotated
    },
    ON("on") {
        override fun applyTo(p: PreviewSpec): PreviewSpec = p.copy(params = p.params + (SystemBars.SHOW_SYSTEM_UI to "true"))
        override fun shown(annotated: Boolean): Boolean = true
    },
    OFF("off") {
        override fun applyTo(p: PreviewSpec): PreviewSpec = p.copy(params = p.params - SystemBars.SHOW_SYSTEM_UI)
        override fun shown(annotated: Boolean): Boolean = false
    },
    ;

    abstract fun applyTo(p: PreviewSpec): PreviewSpec

    abstract fun shown(annotated: Boolean): Boolean

    companion object {
        fun parse(value: String?): SystemUi? = value?.let { v ->
            entries.firstOrNull { it.key == v } ?: throw IllegalArgumentException("시스템 UI는 ${entries.joinToString(" · ") { it.key }} 중 하나 — $v")
        }
    }
}

data class SystemUiState(val choice: SystemUi, val annotated: Boolean) {
    val shown: Boolean get() = choice.shown(annotated)
}

data class CardOverride(val previewId: String, val size: ScreenSize = ScreenSize.Original, val systemUi: SystemUi = SystemUi.ANNOTATED) {
    fun base(p: PreviewSpec): PreviewSpec = systemUi.applyTo(p)

    fun applyTo(p: PreviewSpec): PreviewSpec = size.applyTo(base(p))

    fun with(size: ScreenSize?, systemUi: SystemUi?): CardOverride? =
        of(previewId, size ?: this.size, systemUi ?: this.systemUi)

    companion object {
        fun of(previewId: String, size: ScreenSize, systemUi: SystemUi): CardOverride? =
            CardOverride(previewId, size, systemUi).takeUnless { size == ScreenSize.Original && systemUi == SystemUi.ANNOTATED }
    }
}
