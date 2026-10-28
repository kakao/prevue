package prevue.daemon.domain.model

import kotlin.math.roundToInt
import prevue.daemon.entity.PreviewSpec

private val DP_RANGE = 240..1600

sealed interface ScreenSize {
    val key: String

    fun applyTo(p: PreviewSpec): PreviewSpec

    data object Original : ScreenSize {
        override val key: String get() = "original"

        override fun applyTo(p: PreviewSpec): PreviewSpec = p
    }

    data class Dp(val widthDp: Int, val heightDp: Int, val preset: String? = null) : ScreenSize {
        init {
            require(widthDp in DP_RANGE && heightDp in DP_RANGE) { "크기는 ${DP_RANGE.first}~${DP_RANGE.last}dp — ${widthDp}x$heightDp" }
        }

        override val key: String get() = preset ?: "${widthDp}x$heightDp"

        override fun applyTo(p: PreviewSpec): PreviewSpec {
            val rest = p.params - "widthDp" - "heightDp"
            if (p.params["showSystemUi"] != "true") return p.copy(params = rest + ("widthDp" to "$widthDp") + ("heightDp" to "$heightDp"))
            val keys = specKeys(p.params["device"])
            val dpi = keys["dpi"]?.toIntOrNull() ?: DEFAULT_DPI
            val k = dpi / 160.0
            return p.copy(params = rest + ("device" to deviceSpec((widthDp * k).roundToInt(), (heightDp * k).roundToInt(), dpi, keys)))
        }
    }

    data class Device(val model: DeviceModel, val folded: Boolean = false, val landscape: Boolean = false) : ScreenSize {
        init {
            require(!folded || model.cover != null) { "${model.label}은 접히지 않는다" }
        }

        val panel: Panel get() = if (folded) model.cover!! else model.open
        val widthPx: Int get() = if (landscape) panel.heightPx else panel.widthPx
        val heightPx: Int get() = if (landscape) panel.widthPx else panel.heightPx
        val widthDp: Double get() = dp(widthPx)
        val heightDp: Double get() = dp(heightPx)
        val hingeDp: Double? get() = panel.hingePx?.let(::dp)
        override val key: String get() = listOfNotNull(model.id, "folded".takeIf { folded }, "land".takeIf { landscape }).joinToString("-")

        override fun applyTo(p: PreviewSpec): PreviewSpec =
            p.copy(params = p.params - "widthDp" - "heightDp" + ("device" to deviceSpec(widthPx, heightPx, model.dpi)))

        private fun dp(px: Int): Double = Math.round(px * 160.0 / model.dpi * 100) / 100.0
    }

    companion object {
        val PRESETS = listOf(Dp(320, 640, "narrow"), Dp(673, 841, "foldable"))
        val BAR: List<ScreenSize> = listOf(Original) + PRESETS + DeviceModel.entries.map { Device(it) }
        private const val DEFAULT_DPI = 420

        fun parse(size: String?, device: String?, folded: Boolean, landscape: Boolean): ScreenSize? {
            if (device != null) {
                require(size == null) { "size와 device는 하나만 준다" }
                val m = DeviceModel.entries.firstOrNull { it.id == device }
                    ?: throw IllegalArgumentException("기기는 ${DeviceModel.entries.joinToString(" · ") { it.id }} 중 하나 — $device")
                return Device(m, folded, landscape)
            }
            require(!folded && !landscape) { "접기 · 가로는 기기(device)에만 있다" }
            if (size == null) return null
            if (size == "original") return Original
            PRESETS.firstOrNull { it.preset == size }?.let { return it }
            val m = Regex("""(\d+)\s*[x×]\s*(\d+)""").matchEntire(size)
                ?: throw IllegalArgumentException("크기는 original · ${PRESETS.joinToString(" · ") { it.preset!! }} · <W>x<H> 중 하나 — $size")
            return Dp(m.groupValues[1].toInt(), m.groupValues[2].toInt())
        }

        private val SIZED_KEYS = setOf("width", "height", "dpi", "orientation")

        private fun deviceSpec(widthPx: Int, heightPx: Int, dpi: Int, kept: Map<String, String> = emptyMap()): String {
            val turn = if (widthPx > heightPx) listOf("orientation=landscape") else emptyList()
            val rest = kept.filterKeys { it !in SIZED_KEYS }.map { (k, v) -> "$k=$v" }
            return (listOf("width=${widthPx}px", "height=${heightPx}px", "dpi=$dpi") + turn + rest).joinToString(",", prefix = "spec:")
        }

        private fun specKeys(device: String?): Map<String, String> = device?.takeIf { it.startsWith("spec:") }?.removePrefix("spec:")?.split(',')
            ?.map { it.split('=', limit = 2) }?.filter { it.size == 2 }?.associate { it[0].trim() to it[1].trim() }.orEmpty()
    }
}

data class Panel(val widthPx: Int, val heightPx: Int, val hingePx: Int? = null)

enum class DeviceModel(val id: String, val label: String, val dpi: Int, val open: Panel, val cover: Panel?) {
    GALAXY_S26("s26", "Galaxy S26", 480, Panel(1080, 2340), null),
    PIXEL_9("pixel9", "Pixel 9", 420, Panel(1080, 2424), null),
    IPHONE_17("ip17", "iPhone 17", 480, Panel(1206, 2622), null),
    IPHONE_AIR("ipair", "iPhone Air", 480, Panel(1260, 2736), null),
    IPHONE_17_PRO_MAX("ip17pm", "iPhone 17 Pro Max", 480, Panel(1320, 2868), null),
    IPHONE_DUO("duo", "iPhone Duo", 480, Panel(2670, 1878, 1335), Panel(1398, 2034)),
    GALAXY_Z_FOLD8("fold8", "Galaxy Z Fold8", 420, Panel(2448, 1848, 1224), Panel(1248, 1972)),
    GALAXY_Z_FOLD8_ULTRA("ultra", "Galaxy Z Fold8 Ultra", 480, Panel(2256, 2504, 1128), Panel(1080, 2520)),
    PIXEL_9_PRO_FOLD("pixelfold", "Pixel 9 Pro Fold", 390, Panel(2076, 2152, 1038), Panel(1080, 2424)),
    PIXEL_TABLET("tablet", "Pixel Tablet", 320, Panel(2560, 1600), null),
    ;

    val postures: List<ScreenSize.Device>
        get() = listOf(false, true).flatMap { landscape ->
            listOfNotNull(ScreenSize.Device(this, false, landscape), if (cover != null) ScreenSize.Device(this, true, landscape) else null)
        }
}

data class Resize(val previewId: String, val size: ScreenSize)
