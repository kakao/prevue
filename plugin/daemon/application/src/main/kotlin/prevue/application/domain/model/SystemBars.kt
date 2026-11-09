package prevue.application.domain.model

enum class BarLook(val key: String) { AOSP("aosp"), ONE_UI("oneui"), PIXEL("pixel"), IOS("ios") }

enum class InsetSource(val key: String, val url: String) {
    WINDOW_INSETS("windowinsets.info", "https://windowinsets.info"),
    WINDOW_INSETS_EMULATOR("windowinsets.info · emulator", "https://windowinsets.info"),
    SAFE_AREA("safearea.info", "https://safearea.info"),
}

data class BarInsets(val statusDp: Double, val navDp: Double, val source: InsetSource)

sealed interface SystemBars {
    data object Hidden : SystemBars

    data class Shown(val look: BarLook, val insets: BarInsets? = null) : SystemBars

    companion object {
        const val SHOW_SYSTEM_UI = "showSystemUi"
        const val DEVICE_POSTURE = "prevueDevice"

        val COMMON = Shown(BarLook.AOSP)

        fun of(params: Map<String, String>): SystemBars {
            if (params[SHOW_SYSTEM_UI] != "true") return Hidden
            val posture = params[DEVICE_POSTURE]?.let(ScreenSize::postureOf) ?: return COMMON
            val insets = DeviceBars.of(posture) ?: return COMMON
            return Shown(posture.model.look, insets)
        }
    }
}

val PreviewSpec.systemBars: SystemBars get() = SystemBars.of(params)
