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

data class CardOverride(
    val previewId: String, val size: ScreenSize = ScreenSize.Original, val systemUi: SystemUi = SystemUi.ANNOTATED,
    val deviceInsets: DeviceInsetChoice = DeviceInsetChoice.ON,
) {
    fun base(p: PreviewSpec): PreviewSpec = systemUi.applyTo(p)

    fun applyTo(p: PreviewSpec): PreviewSpec = if (size is ScreenSize.Device) {
        size.applyTo(SystemUi.ON.applyTo(p)).copy(appInsets = DeviceInsetState(deviceInsets, size).values)
    } else size.applyTo(base(p))

    fun with(size: ScreenSize?, systemUi: SystemUi?, deviceInsets: DeviceInsetChoice? = null): CardOverride? {
        val target = size ?: this.size
        require(systemUi == null || target !is ScreenSize.Device) { "기기는 시스템 UI를 항상 표시한다 — --system-ui 대신 --device-insets on|off를 사용한다" }
        require(deviceInsets == null || target is ScreenSize.Device) { "기기 인셋은 기기(device)에만 있다 — 먼저 --device로 기기를 고른다" }
        return of(previewId, target, systemUi ?: this.systemUi, deviceInsets ?: this.deviceInsets)
    }

    companion object {
        fun of(previewId: String, size: ScreenSize, systemUi: SystemUi, deviceInsets: DeviceInsetChoice = DeviceInsetChoice.ON): CardOverride? =
            CardOverride(previewId, size, systemUi, deviceInsets).takeUnless {
                size == ScreenSize.Original && systemUi == SystemUi.ANNOTATED && deviceInsets == DeviceInsetChoice.ON
            }
    }
}

data class CardAdjustment(val size: ScreenSize? = null, val systemUi: SystemUi? = null, val deviceInsets: DeviceInsetChoice? = null)
