package prevue.infrastructure.render

import java.lang.reflect.Field
import java.lang.reflect.Method
import java.util.Optional
import java.util.concurrent.ConcurrentHashMap
import java.util.Locale
import kotlin.math.roundToInt

internal object ModifierChain {
    fun of(layout: Any?): List<Map<String, Any?>> {
        if (layout == null) return emptyList()
        val infos = call(layout, "getModifierInfo") as? List<*> ?: return emptyList()
        return infos.mapNotNull { info ->
            val modifier = info?.let { call(it, "getModifier") }
            modifier?.let { runCatching { describe(it) }.getOrElse { _ -> fallback(modifier) } }
        }
    }

    private val methods = object : ClassValue<ConcurrentHashMap<String, Optional<Method>>>() {
        override fun computeValue(type: Class<*>) = ConcurrentHashMap<String, Optional<Method>>()
    }

    private fun call(target: Any, name: String): Any? {
        val type = target.javaClass
        val method = methods.get(type).getOrPut(name) { Optional.ofNullable(runCatching { type.getMethod(name) }.getOrNull()) }
        return method.map { runCatching { it.invoke(target) }.getOrNull() }.orElse(null)
    }

    fun describe(modifier: Any): Map<String, Any?>? {
        val name = modifier.javaClass.simpleName
        READERS[name]?.let { return it(Fields(modifier)) }
        return RENAMED[name]?.let { entry(it) } ?: fallback(modifier)
    }

    private val READERS: Map<String, (Fields) -> Map<String, Any?>> = mapOf(
        "FillElement" to { f -> axis(f.string("inspectorName") ?: "fill", f.enum("direction"), f.float("fraction")?.takeIf { it != 1f }?.let(::number)) },
        "WrapContentElement" to { f -> axis(f.string("inspectorName") ?: "wrapContent", f.enum("direction"), null) },
        "SizeElement" to ::size,
        "PaddingElement" to ::padding,
        "PaddingValuesElement" to { _ -> entry("padding") },
        "AspectRatioElement" to ::aspect,
        "OffsetElement" to { f -> entry("offset", listOfNotNull(f.float("x"), f.float("y")).joinToString(", ") { dp(it) }) },
        "LayoutWeightElement" to { f -> entry("weight", f.float("weight")?.let(::number)) },
        "BackgroundElement" to ::background,
        "BorderModifierNodeElement" to { f -> entry("border", f.float("width")?.let(::dp)) },
        "ClickableElement" to ::clickable,
        "CombinedClickableElement" to ::clickable,
        "TextStringSimpleElement" to ::text,
        "TextAnnotatedStringElement" to ::text,
        "GraphicsLayerElement" to { f -> entry(if (f.boolean("clip") == true) "clip" else "graphicsLayer") },
    )

    private fun clickable(f: Fields) = entry("clickable", f.string("onClickLabel")?.let(::quoted))

    private fun text(f: Fields) = entry("text", f.raw("text")?.toString()?.let(::quoted))

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
        if (w == null && h == null) return entry("sizeIn")
        val stem = if (w != null && h != null) "size" else if (w != null) "width" else "height"
        val required = if (f.boolean("enforceIncoming") == false) "required" + stem.replaceFirstChar { it.uppercase() } else stem
        val ranged = listOfNotNull(w, h).any { it.first != it.second }
        return entry(required + if (ranged) "In" else "", sizeValue(w, h), sizes = listOfNotNull("width".takeIf { w != null }, "height".takeIf { h != null }))
    }

    private fun sizeValue(w: Pair<Float?, Float?>?, h: Pair<Float?, Float?>?): String? = when {
        w != null && h != null && w == h && w.first == w.second -> span(w)
        w != null && h != null -> "${span(w)} × ${span(h)}"
        else -> (w ?: h)?.let(::span)
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
        return if (alpha == BYTE) "#%06X".format(Locale.ROOT, argb and RGB_MASK) else "#%08X".format(Locale.ROOT, argb)
    }

    private fun cssHex(argb: Int): String = "#%06X%02X".format(Locale.ROOT, argb and RGB_MASK, argb ushr ALPHA_SHIFT and BYTE)

    fun number(v: Float): String = if (v == v.roundToInt().toFloat()) v.roundToInt().toString() else "%.2f".format(Locale.ROOT, v).trimEnd('0').trimEnd('.')

    fun dp(v: Float): String = number(v) + ".dp"

    private fun quoted(s: String): String = "\"" + s.replace("\n", " ").take(QUOTE_MAX) + "\""

    private const val QUOTE_MAX = 80

    private val fieldsOf = object : ClassValue<Map<String, Field>>() {
        override fun computeValue(type: Class<*>): Map<String, Field> =
            generateSequence(type) { it.superclass }.flatMap { it.declaredFields.asSequence() }
                .distinctBy { it.name }
                .filter { runCatching { it.isAccessible = true }.isSuccess }
                .associateBy { it.name }
    }

    private class Fields(private val target: Any) {
        private val fields = fieldsOf.get(target.javaClass)

        fun raw(name: String): Any? = runCatching { fields[name]?.get(target) }.getOrNull()
        fun float(name: String): Float? = raw(name) as? Float
        fun long(name: String): Long? = raw(name) as? Long
        fun boolean(name: String): Boolean? = raw(name) as? Boolean
        fun string(name: String): String? = raw(name) as? String
        fun enum(name: String): String? = (raw(name) as? Enum<*>)?.name
    }
}
