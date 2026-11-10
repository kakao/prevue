package prevue.application.domain.model

enum class BarLook(val key: String) { AOSP("aosp"), ONE_UI("oneui"), PIXEL("pixel"), IOS("ios") }

enum class InsetSource(val site: String, val kind: String) {
    SAMSUNG_RTL("windowinsets.info", "samsung-rtl"),
    FIREBASE_TEST_LAB("windowinsets.info", "firebase-test-lab"),
    ANDROID_EMULATOR("windowinsets.info", "emulator"),
    SAFE_AREA("safearea.info", "site"),
}

data class BarInsets(val statusDp: Double, val navDp: Double, val source: InsetSource, val url: String)

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
            if (posture.model.look != BarLook.IOS) return COMMON
            return Shown(BarLook.IOS, DeviceBars.of(posture))
        }
    }
}

val PreviewSpec.systemBars: SystemBars get() = SystemBars.of(params)
