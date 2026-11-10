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

data class SystemUiState(val choice: SystemUi, val annotated: Boolean, val bars: SystemBars.Shown? = null, val shown: Boolean = choice.shown(annotated))

data class CardOverride(val previewId: String, val size: ScreenSize = ScreenSize.Original, val systemUi: SystemUi = SystemUi.ANNOTATED) {
    fun base(p: PreviewSpec): PreviewSpec = systemUi.applyTo(p)

    fun applyTo(p: PreviewSpec): PreviewSpec = if (size is ScreenSize.Device) {
        size.applyTo(SystemUi.ON.applyTo(p)).copy(appInsets = DeviceInsetInputs.of(size).values)
    } else size.applyTo(base(p))

    fun with(size: ScreenSize?, systemUi: SystemUi?): CardOverride? {
        val target = size ?: this.size
        require(systemUi == null || target !is ScreenSize.Device) { "기기는 시스템 UI를 항상 표시하고 기기 인셋을 늘 전달한다 — --system-ui는 기기가 아닌 크기에만 쓴다" }
        return of(previewId, target, systemUi ?: this.systemUi)
    }

    companion object {
        fun of(previewId: String, size: ScreenSize, systemUi: SystemUi): CardOverride? =
            CardOverride(previewId, size, systemUi).takeUnless { size == ScreenSize.Original && systemUi == SystemUi.ANNOTATED }
    }
}

data class CardAdjustment(val size: ScreenSize? = null, val systemUi: SystemUi? = null)
