package prevue.application.domain.model

import kotlin.math.roundToInt
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
            if (p.systemBars is SystemBars.Shown) return deviceOfDp(p, widthDp, heightDp)
            return p.copy(params = p.params - SystemBars.DEVICE_POSTURE + ("widthDp" to "$widthDp") + ("heightDp" to "$heightDp"))
        }
    }

    data class Device(
        val model: DeviceModel,
        val folded: Boolean = false,
        val orientation: DeviceOrientation = model.panel(folded).orientation,
    ) : ScreenSize {
        constructor(model: DeviceModel, folded: Boolean = false, landscape: Boolean) :
            this(model, folded, model.panel(folded).orientation(landscape))

        init {
            require(!folded || model.cover != null) { "${model.label}은 접히지 않는다" }
        }

        val panel: Panel get() = model.panel(folded)
        val landscape: Boolean get() = (orientation != DeviceOrientation.PORTRAIT) != (panel.widthPx > panel.heightPx)
        val widthPx: Int get() = if (orientation == DeviceOrientation.PORTRAIT) minOf(panel.widthPx, panel.heightPx) else maxOf(panel.widthPx, panel.heightPx)
        val heightPx: Int get() = if (orientation == DeviceOrientation.PORTRAIT) maxOf(panel.widthPx, panel.heightPx) else minOf(panel.widthPx, panel.heightPx)
        val widthDp: Double get() = dp(widthPx)
        val heightDp: Double get() = dp(heightPx)
        val hingeDp: Double? get() = panel.hingePx?.let { dp(it) }
        val heldDegrees: Int get() = orientation.degrees - panel.orientation.degrees
        val folding: Device?
            get() = model.cover?.let {
                DeviceOrientation.entries.map { Device(model, !folded, it) }.firstOrNull { it.heldDegrees == heldDegrees }
                    ?: Device(model, !folded, DeviceOrientation.PORTRAIT)
            }
        val insetProfile: DeviceInsetProfile get() = DeviceInsets.of(this)
        override val key: String get() = listOfNotNull(
            model.id, "folded".takeIf { folded }, "land".takeIf { landscape }, "right".takeIf { orientation == DeviceOrientation.LANDSCAPE_RIGHT },
        ).joinToString("-")

        override fun applyTo(p: PreviewSpec): PreviewSpec {
            val rest = p.params - "widthDp" - "heightDp" + ("device" to deviceSpec(widthPx, heightPx, model.dpi)) + (SystemBars.DEVICE_POSTURE to key)
            if (p.systemBars is SystemBars.Shown) return p.copy(params = rest)
            return p.copy(params = rest + ("widthDp" to "${widthDp.roundToInt()}") + ("heightDp" to "${heightDp.roundToInt()}"))
        }

        private fun dp(px: Number): Double = Math.round(px.toDouble() * 160.0 / model.dpi * 100) / 100.0
    }

    companion object {
        val PRESETS = listOf(Dp(320, 640, "narrow"), Dp(673, 841, "foldable"))
        val BAR: List<ScreenSize> = listOf(Original) + PRESETS + DeviceModel.entries.map { Device(it) }
        private const val DEFAULT_DPI = 420

        fun postureOf(key: String): Device? = DeviceModel.entries.asSequence().flatMap { it.postures }.firstOrNull { it.key == key }

        fun parse(size: String?, device: String?, folded: Boolean, landscape: Boolean, orientation: String? = null): ScreenSize? {
            if (device != null) {
                require(size == null) { "size와 device는 하나만 준다" }
                val m = DeviceModel.entries.firstOrNull { it.id == device }
                    ?: throw IllegalArgumentException("기기는 ${DeviceModel.entries.joinToString(" · ") { it.id }} 중 하나 — $device")
                require(orientation == null || !landscape) { "orientation과 landscape는 하나만 준다" }
                return if (orientation == null) Device(m, folded, landscape) else Device(m, folded, DeviceOrientation.parse(orientation))
            }
            require(!folded && !landscape && orientation == null) { "접기 · 가로는 기기(device)에만 있다" }
            if (size == null) return null
            if (size == "original") return Original
            PRESETS.firstOrNull { it.preset == size }?.let { return it }
            val m = Regex("""(\d+)\s*[x×]\s*(\d+)""").matchEntire(size)
                ?: throw IllegalArgumentException("크기는 original · ${PRESETS.joinToString(" · ") { it.preset!! }} · <W>x<H> 중 하나 — $size")
            return Dp(m.groupValues[1].toInt(), m.groupValues[2].toInt())
        }

        fun annotatedDpAsDevice(p: PreviewSpec): PreviewSpec {
            val w = p.params["widthDp"]?.toIntOrNull() ?: return p
            val h = p.params["heightDp"]?.toIntOrNull() ?: return p
            if (p.params["device"]?.startsWith("spec:") == false) return p
            return deviceOfDp(p, w, h)
        }

        private fun deviceOfDp(p: PreviewSpec, widthDp: Int, heightDp: Int): PreviewSpec {
            val keys = specKeys(p.params["device"])
            val dpi = keys["dpi"]?.toIntOrNull() ?: DEFAULT_DPI
            val k = dpi / 160.0
            val device = deviceSpec((widthDp * k).roundToInt(), (heightDp * k).roundToInt(), dpi, keys)
            return p.copy(params = p.params - "widthDp" - "heightDp" - SystemBars.DEVICE_POSTURE + ("device" to device))
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

enum class DeviceOrientation(val key: String, val degrees: Int) {
    PORTRAIT("portrait", 0), LANDSCAPE_LEFT("landscape-left", -90), LANDSCAPE_RIGHT("landscape-right", 90);

    companion object {
        fun parse(key: String): DeviceOrientation = entries.firstOrNull { it.key == key }
            ?: throw IllegalArgumentException("방향은 ${entries.joinToString(" · ") { it.key }} 중 하나 — $key")
    }
}

data class Panel(val widthPx: Int, val heightPx: Int, val hingePx: Double? = null) {
    val orientation: DeviceOrientation
        get() = if (widthPx > heightPx) DeviceOrientation.LANDSCAPE_LEFT else DeviceOrientation.PORTRAIT

    fun orientation(rotated: Boolean): DeviceOrientation = when {
        !rotated -> orientation
        orientation == DeviceOrientation.PORTRAIT -> DeviceOrientation.LANDSCAPE_LEFT
        else -> DeviceOrientation.PORTRAIT
    }
}

enum class DeviceModel(val id: String, val label: String, val dpi: Int, val open: Panel, val cover: Panel?, val look: BarLook) {
    GALAXY_S26("s26", "Galaxy S26", 480, Panel(1080, 2340), null, BarLook.ONE_UI),
    PIXEL_9("pixel9", "Pixel 9", 420, Panel(1080, 2424), null, BarLook.PIXEL),
    IPHONE_17("ip17", "iPhone 17", 480, Panel(1206, 2622), null, BarLook.IOS),
    IPHONE_AIR("ipair", "iPhone Air", 480, Panel(1260, 2736), null, BarLook.IOS),
    IPHONE_17_PRO_MAX("ip17pm", "iPhone 17 Pro Max", 480, Panel(1320, 2868), null, BarLook.IOS),
    IPHONE_DUO("duo", "iPhone Duo", 480, Panel(2853, 2007, 1426.5), Panel(1398, 2034), BarLook.IOS),
    GALAXY_Z_FOLD8("fold8", "Galaxy Z Fold8", 420, Panel(2448, 1848, 1224.0), Panel(1248, 1972), BarLook.ONE_UI),
    GALAXY_Z_FOLD8_ULTRA("ultra", "Galaxy Z Fold8 Ultra", 480, Panel(2256, 2504, 1128.0), Panel(1080, 2520), BarLook.ONE_UI),
    PIXEL_9_PRO_FOLD("pixelfold", "Pixel 9 Pro Fold", 390, Panel(2076, 2152, 1038.0), Panel(1080, 2424), BarLook.PIXEL),
    PIXEL_TABLET("tablet", "Pixel Tablet", 320, Panel(2560, 1600), null, BarLook.PIXEL),
    ;

    fun panel(folded: Boolean): Panel = if (folded) requireNotNull(cover) { "${label}은 접히지 않는다" } else open

    val postures: List<ScreenSize.Device>
        get() = DeviceOrientation.entries.flatMap { orientation ->
            listOfNotNull(ScreenSize.Device(this, false, orientation), if (cover != null) ScreenSize.Device(this, true, orientation) else null)
        }
}
