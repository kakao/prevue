package prevue.daemon.adapter.browser

import prevue.daemon.entity.Phrase
import prevue.daemon.entity.Verbatim
import prevue.daemon.entity.phrase
import kotlin.math.roundToInt

/** 카드 이름표의 한 칸(이름 아래, 이름이 없으면 그 자리) — 뷰어는 [kind]를 아이콘으로 바꾸고 [text]를 옆에 둔다. */
data class CardSpec(val kind: String, val text: Phrase) {
    constructor(kind: String, text: String) : this(kind, Verbatim(text))
}

/** 그림의 dp 크기 — 보드의 묶음 배율(D-62)을 재는 입력. [guess]면 밀도를 몰라 렌더러 기본 420 으로 짐작한 크기다. */
data class DpSize(val width: Double?, val height: Double?, val guess: Boolean)

/**
 * `@Preview` 인자를 사람이 읽을 칸으로 옮긴다. `device=spec:width=1280dp,…` 같은 소스 표기는 그대로 두면 읽히지 않는다.
 * 뜻이 있는 것만 칸이 되고(크기 · 다크 · 글자 배율 · 로케일 · API · 시스템 UI), 나머지(`showBackground` 같은)는 인자 툴팁에만 남는다.
 * 순서는 고정이다 — 카드마다 칸 순서가 바뀌면 줄을 맞춰 읽을 수 없다.
 */
object CardSpecs {
    /** 렌더러가 dpi 를 받지 않았을 때 쓰는 밀도. 411×891dp 가 1079×2339px 로 나온다(×2.625). */
    private const val DEFAULT_DPI = 420.0
    private const val UI_MODE_NIGHT_MASK = 0x30
    private const val UI_MODE_NIGHT_YES = 0x20

    fun of(params: Map<String, String>, widthPx: Int?, heightPx: Int?): List<CardSpec> {
        val out = ArrayList<CardSpec>()
        val device = params["device"].orEmpty()
        size(params, device, widthPx, heightPx)?.let { out += CardSpec("size", it) }
        // 이름 붙은 기기(id:pixel_5)는 밀도를 몰라 px 에서 dp 를 못 낸다. 크기 대신 기기 이름을 보인다.
        if (device.startsWith("id:")) out += CardSpec("device", device.removePrefix("id:"))
        params["uiMode"]?.toIntOrNull()?.let { if (it and UI_MODE_NIGHT_MASK == UI_MODE_NIGHT_YES) out += CardSpec("dark", phrase("spec.dark")) }
        params["fontScale"]?.toDoubleOrNull()?.takeIf { it != 1.0 }?.let { out += CardSpec("font", "${trim(it)}×") }
        params["locale"]?.takeIf { it.isNotBlank() }?.let { out += CardSpec("locale", it) }
        params["apiLevel"]?.toIntOrNull()?.let { out += CardSpec("api", "API $it") }
        if (params["showSystemUi"] == "true") out += CardSpec("systemUi", phrase("spec.systemUi"))
        return out
    }

    /**
     * 크기는 dp 로 보인다 — 개발자가 생각하는 단위이고, px 는 밀도마다 달라진다(px 는 시간과 함께 호버에 있다).
     * 인자가 크기를 말하면 그것을, 아니면 그린 PNG 를 밀도로 나눈다. 이름 붙은 기기는 밀도를 몰라 내지 않는다.
     */
    private fun size(params: Map<String, String>, device: String, widthPx: Int?, heightPx: Int?): String? {
        val w = params["widthDp"]?.toIntOrNull()
        val h = params["heightDp"]?.toIntOrNull()
        if (w != null && h != null) return "$w×$h"
        if (device.startsWith("id:")) return null
        val spec = specOf(device)
        val dpi = spec["dpi"]?.toDoubleOrNull() ?: DEFAULT_DPI
        val sw = dp(spec["width"], dpi)
        val sh = dp(spec["height"], dpi)
        if (sw != null && sh != null) return if (spec["orientation"] == "landscape" && sw < sh) "$sh×$sw" else "$sw×$sh"
        if (widthPx == null || heightPx == null) return null
        val k = dpi / 160.0
        return "${(widthPx / k).roundToInt()}×${(heightPx / k).roundToInt()}"
    }

    /**
     * 그림 1dp 가 PNG 몇 px 인가 — 한 장의 `100%`(1dp = 1 CSS px)가 이것으로 정해진다.
     * 이름 붙은 기기는 밀도를 몰라 null 이다 — 기본 420 으로 짐작하면 실제 크기가 조용히 틀린다.
     */
    fun pxPerDp(params: Map<String, String>): Double? {
        val device = params["device"].orEmpty()
        if (device.startsWith("id:")) return null
        return (specOf(device)["dpi"]?.toDoubleOrNull() ?: DEFAULT_DPI) / 160.0
    }

    /**
     * 그림의 dp 크기. 그렸으면 PNG ÷ 밀도 — 화면에 놓이는 것은 PNG 이고 인자는 그리기 전의 예상이라, 둘이 어긋나면 PNG 가 맞다.
     * 그리기 전이면 인자가 말하는 크기(widthDp · heightDp, 없으면 device spec)이고, 말하지 않는 내용 크기 프리뷰는 모른다(null).
     * 이름 붙은 기기는 PNG 를 기본 420 으로 나눠 짐작한다 — 배치에만 쓰고 한 장의 [pxPerDp]는 여전히 모른다.
     */
    fun dpSize(params: Map<String, String>, widthPx: Int?, heightPx: Int?): DpSize {
        val device = params["device"].orEmpty()
        val named = device.startsWith("id:")
        val spec = specOf(device)
        val dpi = spec["dpi"]?.toDoubleOrNull() ?: DEFAULT_DPI
        if (widthPx != null && heightPx != null && widthPx > 0 && heightPx > 0) {
            val k = dpi / 160.0
            return DpSize(round2(widthPx / k), round2(heightPx / k), named)
        }
        val sw = dpOf(spec["width"], dpi)
        val sh = dpOf(spec["height"], dpi)
        val turn = spec["orientation"] == "landscape" && sw != null && sh != null && sw < sh
        return DpSize(
            params["widthDp"]?.toDoubleOrNull() ?: if (turn) sh else sw,
            params["heightDp"]?.toDoubleOrNull() ?: if (turn) sw else sh,
            named,
        )
    }

    private fun specOf(device: String): Map<String, String> = if (device.startsWith("spec:")) device.removePrefix("spec:").split(',')
        .mapNotNull { kv -> kv.split('=', limit = 2).takeIf { it.size == 2 }?.let { it[0].trim() to it[1].trim() } }.toMap() else emptyMap()

    private fun dp(v: String?, dpi: Double): Int? = dpOf(v, dpi)?.roundToInt()

    private fun dpOf(v: String?, dpi: Double): Double? = when {
        v == null -> null
        v.endsWith("dp") -> v.removeSuffix("dp").toDoubleOrNull()
        v.endsWith("px") -> v.removeSuffix("px").toDoubleOrNull()?.let { it / (dpi / 160.0) }
        else -> v.toDoubleOrNull()
    }

    private fun round2(d: Double) = Math.round(d * 100) / 100.0

    private fun trim(d: Double) = if (d == d.toLong().toDouble()) d.toLong().toString() else d.toString()
}
