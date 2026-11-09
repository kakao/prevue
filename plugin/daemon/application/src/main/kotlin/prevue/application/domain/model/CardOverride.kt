package prevue.application.domain.model

enum class SystemUi(val key: String) {
    ANNOTATED("annotated"),
    ON("on"),
    OFF("off"),
    ;

    fun applyTo(p: PreviewSpec): PreviewSpec = when (this) {
        ANNOTATED -> p
        ON -> p.copy(params = p.params + (SHOW_SYSTEM_UI to "true"))
        OFF -> p.copy(params = p.params - SHOW_SYSTEM_UI)
    }

    companion object {
        const val SHOW_SYSTEM_UI = "showSystemUi"

        fun annotatedOn(p: PreviewSpec): Boolean = p.params[SHOW_SYSTEM_UI] == "true"

        fun parse(value: String?): SystemUi? = value?.let { v ->
            entries.firstOrNull { it.key == v } ?: throw IllegalArgumentException("시스템 UI는 ${entries.joinToString(" · ") { it.key }} 중 하나 — $v")
        }
    }
}

data class SystemUiState(val choice: SystemUi, val annotated: Boolean) {
    val shown: Boolean
        get() = when (choice) {
            SystemUi.ANNOTATED -> annotated
            SystemUi.ON -> true
            SystemUi.OFF -> false
        }
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
