package com.example.pearl.core.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.FlavorColors
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.colors
import com.example.pearl.core.model.Flavor
import kotlin.math.sin

/**
 * 출렁임 — [tilt] 수면 기울기, [wave] 물결 높이, [phase] 물결 위상. 컵을 끌 때 화면이 Animatable로 들고 있다가 물리에 넘긴다.
 */
@Immutable
data class Slosh(val tilt: Float = 0f, val wave: Float = 0f, val phase: Float = 0f) {
    fun offset(x: Float): Float = tilt * (x - 50f) + wave * sin(x * 0.11f + phase)
}

/** 카드 · 머리 그림의 컵 — 펄 열 알 · 얼음 셋을 미리 굴려 멎은 모습이다. */
val RestingCup: CupWorld by lazy { CupWorld().settled(pearls = 10, ice = 3) }

private val jellyTones = listOf(Color(0xFF4DC591), Color(0xFFFFC278), Color(0xFFFF8FA3))

// 컵 몸통 — 위가 넓고 아래가 둥글게 좁아진다
private fun body(): Path = Path().apply {
    moveTo(16f, 42f); lineTo(84f, 42f); lineTo(75f, 130f)
    quadraticTo(74f, 138f, 66f, 138f); lineTo(34f, 138f)
    quadraticTo(26f, 138f, 25f, 130f); close()
}

private fun liquid(surface: (Float) -> Float): Path = Path().apply {
    moveTo(10f, surface(10f))
    var x = 10f
    while (x <= 90f) { lineTo(x, surface(x)); x += 3f }
    lineTo(90f, 140f); lineTo(10f, 140f); close()
}

private fun DrawScope.drawBody(b: Body) {
    val a = b.alpha.coerceIn(0f, 1f)
    when (b.kind) {
        BodyKind.PEARL -> {
            drawCircle(PearlColors.pearl.copy(alpha = a), b.r, Offset(b.x, b.y))
            drawCircle(Color.White.copy(alpha = 0.45f * a), b.r * 0.28f, Offset(b.x - b.r * 0.35f, b.y - b.r * 0.35f))
        }
        BodyKind.ICE -> rotate(Math.toDegrees(b.angle.toDouble()).toFloat(), Offset(b.x, b.y)) {
            val s = b.r * 1.8f
            drawRoundRect(Color.White.copy(alpha = 0.62f * a), Offset(b.x - s / 2f, b.y - s / 2f), Size(s, s), CornerRadius(3.5f))
            drawLine(Color.White.copy(alpha = 0.9f * a), Offset(b.x - s * 0.3f, b.y - s * 0.3f), Offset(b.x + s * 0.12f, b.y - s * 0.3f), 1.6f, StrokeCap.Round)
        }
        BodyKind.JELLY -> {
            val s = b.r * 1.9f
            val sx = s * (1f + b.squash * 0.004f)
            val sy = s * (1f - b.squash * 0.004f)
            drawRoundRect(jellyTones[b.tone].copy(alpha = 0.92f * a), Offset(b.x - sx / 2f, b.y + s / 2f - sy), Size(sx, sy), CornerRadius(2.5f))
        }
    }
}

// 빨대 — 바닥까지 꽂힌 투명한 관
private fun strawPath(): Path {
    val (bx, by) = CupWorld.strawAt(0f)
    val (tx, ty) = CupWorld.strawAt(1.05f)
    return Path().apply { moveTo(bx - 4.5f, by); lineTo(tx - 4.5f, ty); lineTo(tx + 4.5f, ty); lineTo(bx + 4.5f, by); close() }
}

/**
 * 컵 하나 — 100×140 칸을 [area](기본은 캔버스 전체)에 맞춰 늘린다. 순서가 곧 깊이다:
 * 빈 컵 → 음료 → 빨대 · 물체 → 그 위에 음료 빛을 반투명으로 덮어 수면 아래 것은 음료 속에 잠겨 보인다 → 수면 위로 나온 것 · 물방울 → 유리 · 뚜껑.
 */
fun DrawScope.drawCupScene(
    c: FlavorColors,
    world: CupWorld,
    surface: (Float) -> Float = world::surface,
    straw: Color = PearlColors.ink,
    area: Size = size,
    lid: Float = world.lid,
) {
    val k = minOf(area.width / 100f, area.height / 140f)
    withTransform({
        translate((area.width - 100f * k) / 2f, (area.height - 140f * k) / 2f)
        scale(k, k, Offset.Zero)
    }) {
        val glass = body()
        val drink = liquid(surface)
        drawPath(glass, Color.White.copy(alpha = 0.22f))
        clipPath(glass) {
            drawPath(drink, c.liquid)
            val milk = Path().apply {
                moveTo(10f, surface(10f))
                var x = 10f
                while (x <= 90f) { lineTo(x, surface(x)); x += 3f }
                x = 90f
                while (x >= 10f) { lineTo(x, surface(x) + 10f); x -= 3f }
                close()
            }
            drawPath(milk, c.top)
        }
        val tube = strawPath()
        drawPath(tube, straw.copy(alpha = 0.32f))
        drawPath(tube, straw.copy(alpha = 0.75f), style = Stroke(1.4f))
        // 얼음은 펄 · 젤리 앞에 반투명으로 — 그 뒤로 지나가는 것이 비쳐 보인다
        for (b in world.bodies) if (b.active && b.kind != BodyKind.ICE) drawBody(b)
        for (b in world.bodies) if (b.active && b.kind == BodyKind.ICE) drawBody(b)
        // 음료 속 — 잠긴 것 위로 음료 빛이 덮인다
        clipPath(glass) { clipPath(drink) { drawRect(c.liquid.copy(alpha = 0.35f), Offset(0f, 0f), Size(100f, 140f)) } }
        for (d in world.droplets) drawCircle(c.liquid, d.r, Offset(d.x, d.y))
        val edge = Stroke(2.5f, cap = StrokeCap.Round, join = StrokeJoin.Round)
        drawPath(glass, Color.White.copy(alpha = 0.85f), style = edge)
        drawLine(Color.White.copy(alpha = 0.6f), Offset(25f, 52f), Offset(31f, 118f), 4f, StrokeCap.Round)
        // 뚜껑 — 빨대를 따라 들렸다가 기울며 내려앉는다
        translate(0f, -30f * lid) {
            rotate(-9f * lid, Offset(50f, 42f)) {
                val cap = Path().apply { moveTo(12f, 42f); quadraticTo(50f, 10f, 88f, 42f); close() }
                drawPath(cap, Color.White.copy(alpha = 0.4f))
                drawPath(cap, Color.White.copy(alpha = 0.85f), style = edge)
            }
        }
    }
}

/** 멎은 컵 — [slosh]만큼 수면을 일렁인다(카드의 ambient). */
fun DrawScope.drawCup(c: FlavorColors, slosh: Slosh = Slosh(), straw: Color = PearlColors.ink, area: Size = size) {
    val w = RestingCup
    drawCupScene(c, w, { x -> w.surface(x) + slosh.offset(x) }, straw, area, lid = 0f)
}

@Composable
fun Cup(colors: FlavorColors, modifier: Modifier = Modifier, slosh: Slosh = Slosh(), straw: Color = PearlColors.ink) {
    Canvas(modifier) { drawCup(colors, slosh, straw) }
}

@Preview(showBackground = true, backgroundColor = 0xFF8F98FF)
@Composable
fun CupPreview() {
    Box(Modifier.padding(16.dp)) { Cup(Flavor.TARO.colors, Modifier.size(120.dp, 168.dp), Slosh(tilt = 0.12f, wave = 3f)) }
}
