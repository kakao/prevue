package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

// 진짜 Compose 요소와 같은 이름 · 같은 필드의 가짜 — 판정은 클래스 이름과 필드 이름만 본다
enum class Direction { Vertical, Horizontal, Both }
class FillElement(private val direction: Direction, private val fraction: Float, private val inspectorName: String)
class SizeElement(
    private val minWidth: Float, private val minHeight: Float, private val maxWidth: Float, private val maxHeight: Float,
    private val enforceIncoming: Boolean,
)
class PaddingElement(private val start: Float, private val top: Float, private val end: Float, private val bottom: Float)
class AspectRatioElement(private val aspectRatio: Float, private val matchHeightConstraintsFirst: Boolean)
class BackgroundElement(private val color: Long, private val brush: Any?)
class ClickableElement(private val onClickLabel: String?)
class TextStringSimpleElement(private val text: String)
class DrawBehindElement
class GraphicsLayerElement(private val clip: Boolean)
class BoxChildDataElement
class ModifierInfo(val modifier: Any)
class Layout(val modifierInfo: List<ModifierInfo>)

class ModifierChainTest {
    private fun of(vararg modifiers: Any) = ModifierChain.of(Layout(modifiers.map { ModifierInfo(it) }))

    @Test fun `체인을 적용 순서대로 이름 · 값 · 정한 축으로 낸다`() {
        val chain = of(
            FillElement(Direction.Horizontal, 1f, "fillMaxWidth"),
            AspectRatioElement(0.86f, false),
            PaddingElement(12f, 10f, 12f, 12f),
            ClickableElement("Taro"),
            TextStringSimpleElement("Hi,\nJamie"),
            DrawBehindElement(),
        )
        assertEquals(listOf(
            mapOf("name" to "fillMaxWidth", "sizes" to listOf("width")),
            mapOf("name" to "aspectRatio", "value" to "0.86", "sizes" to listOf("height")),
            mapOf("name" to "padding", "value" to "12, 10, 12, 12"),
            mapOf("name" to "clickable", "value" to "\"Taro\""),
            mapOf("name" to "text", "value" to "\"Hi, Jamie\""),
            mapOf("name" to "drawBehind"),
        ), chain)
    }

    @Test fun `크기는 정한 축과 범위를 이름에 싣는다`() {
        val nan = Float.NaN
        assertEquals(mapOf("name" to "size", "value" to "48.dp", "sizes" to listOf("width", "height")), of(SizeElement(48f, 48f, 48f, 48f, true)).single())
        assertEquals(mapOf("name" to "height", "value" to "120.dp", "sizes" to listOf("height")), of(SizeElement(nan, 120f, nan, 120f, true)).single())
        assertEquals(mapOf("name" to "requiredWidth", "value" to "36.5.dp", "sizes" to listOf("width")), of(SizeElement(36.5f, nan, 36.5f, nan, false)).single())
        assertEquals(mapOf("name" to "widthIn", "value" to "100.dp..", "sizes" to listOf("width")), of(SizeElement(100f, nan, Float.POSITIVE_INFINITY, nan, true)).single())
    }

    @Test fun `sRGB 배경은 견본 색을 싣고 다른 색 공간 · 브러시는 이름만`() {
        val srgb = 0xFF0E6B4FL shl 32
        assertEquals(mapOf("name" to "background", "value" to "#0E6B4F", "color" to "#0E6B4FFF"), of(BackgroundElement(srgb, null)).single())
        assertEquals(mapOf("name" to "background", "value" to "#800E6B4F", "color" to "#0E6B4F80"), of(BackgroundElement(0x800E6B4FL shl 32, null)).single())
        assertEquals(mapOf("name" to "background"), of(BackgroundElement(srgb or 1, null)).single())
        assertEquals(mapOf("name" to "background", "value" to "brush"), of(BackgroundElement(srgb, Any())).single())
    }

    @Test fun `여백이 넷 다 같으면 한 값이다`() {
        assertEquals(mapOf("name" to "padding", "value" to "16.dp"), of(PaddingElement(16f, 16f, 16f, 16f)).single())
    }

    @Test fun `모르는 요소는 클래스 이름에서 이름만 짓고 이름이 없으면 뺀다`() {
        assertEquals("graphicsLayer", ModifierChain.generic("GraphicsLayerElement"))
        assertEquals("border", ModifierChain.generic("BorderModifierNodeElement"))
        assertEquals(null, ModifierChain.generic(""))
        assertEquals(emptyList<Any>(), of(object {}))
    }

    @Test fun `내부 이름이 다른 요소는 소스에 쓰는 이름으로 낸다`() {
        assertEquals(listOf("clip", "graphicsLayer", "align"), of(GraphicsLayerElement(true), GraphicsLayerElement(false), BoxChildDataElement()).map { it["name"] })
    }

    @Test fun `레이아웃이 없거나 체인을 못 읽으면 비운다`() {
        assertEquals(emptyList<Any>(), ModifierChain.of(null))
        assertEquals(emptyList<Any>(), ModifierChain.of(Any()))
    }
}
