package com.example.pearl.core.ui

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.FlavorColors
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.designsystem.PearlType
import com.example.pearl.core.designsystem.colors
import com.example.pearl.core.designsystem.pressable
import com.example.pearl.core.designsystem.price
import com.example.pearl.core.model.Drink
import com.example.pearl.core.model.menu

/** 앱이 카드 자리를 모은다 — 카드가 상세로 커지는 전환이 거기서 출발한다. 따로 그린 프리뷰에서는 없다. */
val LocalCardBounds = staticCompositionLocalOf<((Int, Rect) -> Unit)?> { null }

/** 카드 안 컵 자리 — 전환 동안 컵 하나가 여기서 상세의 큰 컵 자리로 날아간다. */
val LocalCupBounds = staticCompositionLocalOf<((Int, Rect) -> Unit)?> { null }

private val CardShape = RoundedCornerShape(16.dp)

/** 카드 모서리에 걸친 유기적인 블롭 — 같은 계열 톤으로, 카드 밖은 잘린다. */
@Composable
fun Blob(color: androidx.compose.ui.graphics.Color, modifier: Modifier = Modifier) {
    Box(modifier.clip(RoundedCornerShape(topStartPercent = 55, topEndPercent = 45, bottomEndPercent = 60, bottomStartPercent = 40)).background(color))
}

/** 음료 색 판에 블롭과 컵 — 카드 위쪽과 상세 머리가 같이 쓴다. ambient면 수면이 천천히 일렁인다. */
@Composable
fun FlavorPanel(c: FlavorColors, modifier: Modifier = Modifier, ambient: Boolean = false, cupScale: Float = 0.78f, cupModifier: Modifier = Modifier) {
    val phase = if (ambient) {
        rememberInfiniteTransition(label = "panel").animateFloat(0f, 6.2832f, infiniteRepeatable(tween(2600, easing = LinearEasing), RepeatMode.Restart), label = "phase").value
    } else 0f
    BoxWithConstraints(modifier.background(c.card)) {
        val w = maxWidth
        Blob(c.blob, Modifier.size(w * 0.56f).align(Alignment.TopEnd).offset(x = w * 0.18f, y = -w * 0.16f))
        Cup(c, Modifier.fillMaxHeight(cupScale).aspectRatio(100f / 140f).align(Alignment.Center).then(cupModifier), Slosh(wave = if (ambient) 1.6f else 0f, phase = phase))
    }
}

@Composable
fun DrinkCard(
    drink: Drink,
    modifier: Modifier = Modifier,
    ambient: Boolean = false,
    aspect: Float = 0.86f,
    onClick: () -> Unit = {},
) {
    val c = drink.colors
    val report = LocalCardBounds.current
    val reportCup = LocalCupBounds.current
    val cupSpot = if (reportCup != null) Modifier.onGloballyPositioned { reportCup(drink.id, it.boundsInRoot()) } else Modifier
    val wide = aspect > 1.5f
    // 이름 줄은 한 곳 — 통합 테스트가 이 줄로 카드를 가리킨다
    val Caption: @Composable (Modifier) -> Unit = { m ->
        Column(m, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            DrinkName(drink)
            Text(price(drink.cents), style = PearlType.meta, color = PearlColors.subtle)
        }
    }
    Box(
        modifier
            .fillMaxWidth()
            .aspectRatio(aspect)
            .then(if (report != null) Modifier.onGloballyPositioned { report(drink.id, it.boundsInRoot()) } else Modifier)
            .pressable(onClick, CardShape, drink.name)
            .background(PearlColors.muted),
    ) {
        if (wide) {
            Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
                FlavorPanel(c, Modifier.fillMaxHeight().aspectRatio(1f).clip(CardShape), ambient, cupModifier = cupSpot)
                Caption(Modifier.padding(horizontal = 16.dp))
            }
        } else {
            Column(Modifier.fillMaxSize()) {
                FlavorPanel(c, Modifier.fillMaxWidth().weight(1f).clip(CardShape), ambient, cupModifier = cupSpot)
                Caption(Modifier.padding(start = 12.dp, end = 12.dp, top = 10.dp, bottom = 12.dp))
            }
        }
    }
}

@Composable
private fun DrinkName(drink: Drink) {
    Text(text = drink.name, style = PearlType.label, color = PearlColors.ink, maxLines = 1, overflow = TextOverflow.Ellipsis)
}

@Preview(showBackground = true, backgroundColor = 0xFFFFFFFF, widthDp = 360)
@Composable
fun DrinkCardPreview() {
    PearlTheme {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            menu.take(4).chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    row.forEach { DrinkCard(it, Modifier.weight(1f)) }
                }
            }
            DrinkCard(menu[5], aspect = 2.6f)
        }
    }
}
