package prevue.infrastructure.render

import java.lang.reflect.Field
import kotlin.math.roundToInt

internal object ModifierChain {
    fun of(layout: Any?): List<Map<String, Any?>> {
        if (layout == null) return emptyList()
        val infos = runCatching { layout.javaClass.getMethod("getModifierInfo").invoke(layout) as? List<*> }.getOrNull().orEmpty()
        return infos.mapNotNull { info ->
            val modifier = info?.let { i -> runCatching { i.javaClass.getMethod("getModifier").invoke(i) }.getOrNull() }
            modifier?.let { runCatching { describe(it) }.getOrElse { _ -> fallback(modifier) } }
        }
    }

    fun describe(modifier: Any): Map<String, Any?>? {
        val f = Fields(modifier)
        return when (modifier.javaClass.simpleName) {
            "FillElement" -> axis(f.string("inspectorName") ?: "fill", f.enum("direction"), f.float("fraction")?.takeIf { it != 1f }?.let(::number))
            "WrapContentElement" -> axis(f.string("inspectorName") ?: "wrapContent", f.enum("direction"), null)
            "SizeElement" -> size(f)
            "PaddingElement" -> padding(f)
            "PaddingValuesElement" -> entry("padding")
            "AspectRatioElement" -> aspect(f)
            "OffsetElement" -> entry("offset", listOfNotNull(f.float("x"), f.float("y")).joinToString(", ") { dp(it) })
            "LayoutWeightElement" -> entry("weight", f.float("weight")?.let(::number))
            "BackgroundElement" -> background(f)
            "BorderModifierNodeElement" -> entry("border", f.float("width")?.let(::dp))
            "ClickableElement", "CombinedClickableElement" -> entry("clickable", f.string("onClickLabel")?.let(::quoted))
            "TextStringSimpleElement", "TextAnnotatedStringElement" -> entry("text", f.raw("text")?.toString()?.let(::quoted))
            "GraphicsLayerElement" -> entry(if (f.boolean("clip") == true) "clip" else "graphicsLayer")
            else -> RENAMED[modifier.javaClass.simpleName]?.let { entry(it) } ?: fallback(modifier)
        }
    }

    private val RENAMED = mapOf(
        "BlockGraphicsLayerElement" to "graphicsLayer",
        "BoxChildDataElement" to "align",
        "HorizontalAlignElement" to "align",
        "VerticalAlignElement" to "align",
        "PainterElement" to "paint",
        "AppendedSemanticsElement" to "semantics",
        "ShadowGraphicsLayerElement" to "shadow",
        "SimpleDropShadowElement" to "dropShadow",
    )

    private fun fallback(modifier: Any): Map<String, Any?>? = generic(modifier.javaClass.simpleName)?.let { entry(it) }

    fun generic(simpleName: String): String? {
        val stem = SUFFIXES.fold(simpleName) { s, suffix -> s.removeSuffix(suffix) }
        if (stem.isEmpty() || !stem.first().isLetter()) return null
        return stem.replaceFirstChar { it.lowercase() }
    }

    private val SUFFIXES = listOf("Element", "ModifierNode", "Modifier", "Node")

    private fun entry(name: String, value: String? = null, color: String? = null, sizes: List<String>? = null): Map<String, Any?> =
        buildMap {
            put("name", name)
            value?.takeIf { it.isNotEmpty() }?.let { put("value", it) }
            color?.let { put("color", it) }
            sizes?.takeIf { it.isNotEmpty() }?.let { put("sizes", it) }
        }

    private fun axis(name: String, direction: String?, value: String?): Map<String, Any?> = entry(name, value, sizes = when (direction) {
        "Horizontal" -> listOf("width")
        "Vertical" -> listOf("height")
        "Both" -> listOf("width", "height")
        else -> null
    })

    private fun size(f: Fields): Map<String, Any?> {
        val w = bound(f.float("minWidth"), f.float("maxWidth"))
        val h = bound(f.float("minHeight"), f.float("maxHeight"))
        val ranged = (w != null && w.first != w.second) || (h != null && h.first != h.second)
        val stem = when {
            w != null && h != null -> "size"
            w != null -> "width"
            else -> "height"
        }
        val required = if (f.boolean("enforceIncoming") == false) "required" + stem.replaceFirstChar { it.uppercase() } else stem
        val name = required + if (ranged) "In" else ""
        val value = when {
            w != null && h != null && w == h && w.first == w.second -> span(w)
            w != null && h != null -> "${span(w)} × ${span(h)}"
            else -> (w ?: h)?.let(::span)
        }
        return entry(name, value, sizes = listOfNotNull("width".takeIf { w != null }, "height".takeIf { h != null }))
    }

    private fun bound(min: Float?, max: Float?): Pair<Float?, Float?>? {
        val lo = min?.takeUnless { it.isNaN() }
        val hi = max?.takeUnless { it.isNaN() || it.isInfinite() }
        return if (lo == null && hi == null) null else lo to hi
    }

    private fun span(b: Pair<Float?, Float?>): String = when {
        b.first == b.second -> dp(b.first!!)
        else -> "${b.first?.let(::dp) ?: ""}..${b.second?.let(::dp) ?: ""}"
    }

    private fun padding(f: Fields): Map<String, Any?> {
        val sides = listOf("start", "top", "end", "bottom").map { f.float(it) ?: 0f }
        val value = if (sides.distinct().size == 1) dp(sides[0]) else sides.joinToString(", ") { number(it) }
        return entry("padding", value)
    }

    private fun aspect(f: Fields): Map<String, Any?> =
        entry("aspectRatio", f.float("aspectRatio")?.let(::number), sizes = listOf(if (f.boolean("matchHeightConstraintsFirst") == true) "width" else "height"))

    private fun background(f: Fields): Map<String, Any?> {
        val argb = if (f.raw("brush") == null) f.long("color")?.let(::srgb) else null
        return entry("background", argb?.let(::androidHex) ?: "brush".takeIf { f.raw("brush") != null }, color = argb?.let(::cssHex))
    }

    fun srgb(packed: Long): Int? = if (packed and COLOR_SPACE_MASK == 0L) (packed ushr ARGB_SHIFT).toInt() else null

    private const val COLOR_SPACE_MASK = 0x3fL
    private const val ARGB_SHIFT = 32
    private const val ALPHA_SHIFT = 24
    private const val RGB_MASK = 0xffffff
    private const val BYTE = 0xff

    private fun androidHex(argb: Int): String {
        val alpha = argb ushr ALPHA_SHIFT and BYTE
        return if (alpha == BYTE) "#%06X".format(argb and RGB_MASK) else "#%08X".format(argb)
    }

    private fun cssHex(argb: Int): String = "#%06X%02X".format(argb and RGB_MASK, argb ushr ALPHA_SHIFT and BYTE)

    fun number(v: Float): String = if (v == v.roundToInt().toFloat()) v.roundToInt().toString() else "%.2f".format(v).trimEnd('0').trimEnd('.')

    fun dp(v: Float): String = number(v) + ".dp"

    private fun quoted(s: String): String = "\"" + s.replace("\n", " ").take(QUOTE_MAX) + "\""

    private const val QUOTE_MAX = 80

    private class Fields(private val target: Any) {
        private fun field(name: String): Field? {
            var c: Class<*>? = target.javaClass
            while (c != null) {
                c.declaredFields.firstOrNull { it.name == name }?.let { return it.apply { isAccessible = true } }
                c = c.superclass
            }
            return null
        }

        fun raw(name: String): Any? = runCatching { field(name)?.get(target) }.getOrNull()
        fun float(name: String): Float? = raw(name) as? Float
        fun long(name: String): Long? = raw(name) as? Long
        fun boolean(name: String): Boolean? = raw(name) as? Boolean
        fun string(name: String): String? = raw(name) as? String
        fun enum(name: String): String? = (raw(name) as? Enum<*>)?.name
    }
}
