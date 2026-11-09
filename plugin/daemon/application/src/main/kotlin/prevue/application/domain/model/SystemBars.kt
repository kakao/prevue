package prevue.application.domain.model

enum class BarLook { AOSP }

sealed interface SystemBars {
    data object Hidden : SystemBars

    data class Shown(val look: BarLook) : SystemBars

    companion object {
        const val SHOW_SYSTEM_UI = "showSystemUi"

        fun of(params: Map<String, String>): SystemBars = if (params[SHOW_SYSTEM_UI] == "true") Shown(BarLook.AOSP) else Hidden
    }
}

val PreviewSpec.systemBars: SystemBars get() = SystemBars.of(params)
