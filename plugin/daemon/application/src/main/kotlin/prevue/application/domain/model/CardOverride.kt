package prevue.application.domain.model

enum class SystemUi(val key: String) {
    ANNOTATED("annotated") {
        override fun applyTo(p: PreviewSpec): PreviewSpec = p
        override fun shown(annotated: Boolean): Boolean = annotated
    },
    ON("on") {
        override fun applyTo(p: PreviewSpec): PreviewSpec =
            if (p.systemBars is SystemBars.Shown) p
            else ScreenSize.annotatedDpAsDevice(p.copy(params = p.params + (SystemBars.SHOW_SYSTEM_UI to "true")))
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

data class SystemUiState(
    val choice: SystemUi, val annotated: Boolean, val bars: SystemBars.Shown? = null,
    val shown: Boolean = choice.shown(annotated), val edgeToEdge: EdgeToEdge = EdgeToEdge.AUTO,
)

data class CardOverride(
    val previewId: String, val size: ScreenSize = ScreenSize.Original, val systemUi: SystemUi = SystemUi.ANNOTATED,
    val edgeToEdge: EdgeToEdge = EdgeToEdge.AUTO,
) {
    fun base(p: PreviewSpec): PreviewSpec = edgeToEdge.applyTo(systemUi.applyTo(p))

    fun applyTo(p: PreviewSpec): PreviewSpec = if (size is ScreenSize.Device) {
        size.applyTo(edgeToEdge.applyTo(SystemUi.ON.applyTo(p))).copy(appInsets = DeviceInsetInputs.of(size).values)
    } else size.applyTo(base(p))

    fun with(size: ScreenSize? = null, systemUi: SystemUi? = null, edgeToEdge: EdgeToEdge? = null): CardOverride? {
        val target = size ?: this.size
        require(systemUi == null || target !is ScreenSize.Device) { "기기는 시스템 UI를 항상 표시하고 기기 인셋을 늘 전달한다 — --system-ui는 기기가 아닌 크기에만 쓴다" }
        return of(previewId, target, systemUi ?: this.systemUi, edgeToEdge ?: this.edgeToEdge)
    }

    companion object {
        fun of(previewId: String, size: ScreenSize, systemUi: SystemUi, edgeToEdge: EdgeToEdge = EdgeToEdge.AUTO): CardOverride? =
            CardOverride(previewId, size, systemUi, edgeToEdge).takeUnless { isDefault(size, systemUi, edgeToEdge) }

        fun isDefault(size: ScreenSize?, systemUi: SystemUi?, edgeToEdge: EdgeToEdge?): Boolean =
            (size ?: ScreenSize.Original) == ScreenSize.Original && (systemUi ?: SystemUi.ANNOTATED) == SystemUi.ANNOTATED &&
                (edgeToEdge ?: EdgeToEdge.AUTO) == EdgeToEdge.AUTO
    }
}
