package com.example.pearl.core.designsystem

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.res.*
import com.example.pearl.core.designsystem.res.Res
import org.jetbrains.compose.resources.DrawableResource
import org.jetbrains.compose.resources.painterResource

/** 누르면 살짝 줄었다 튕겨 돌아온다 — 누를 수 있는 것은 모두 같은 손맛이다. */
@Composable
fun Modifier.pressable(onClick: () -> Unit, shape: RoundedCornerShape, label: String? = null): Modifier {
    val source = remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(if (pressed) 0.94f else 1f, spring(dampingRatio = 0.45f, stiffness = 700f), label = "press")
    return this
        .graphicsLayer { scaleX = scale; scaleY = scale }
        .clip(shape)
        .clickable(interactionSource = source, indication = LocalIndication.current, onClickLabel = label, onClick = onClick)
}

private val Big = RoundedCornerShape(16.dp)
private val Small = RoundedCornerShape(10.dp)
private val Square = RoundedCornerShape(12.dp)

/** 화면에 하나뿐인 행동 — 주황 바탕, 흰 글자. */
@Composable
fun PearlButton(text: String, modifier: Modifier = Modifier, icon: DrawableResource? = null, onClick: () -> Unit = {}) {
    Row(
        modifier
            .height(56.dp)
            .pressable(onClick, Big)
            .background(PearlColors.orange)
            .padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) Icon(painterResource(icon), null, tint = Color.White, modifier = Modifier.size(20.dp))
        Text(text, style = PearlType.card, color = Color.White, maxLines = 1)
    }
}

/** 아이콘 하나짜리 네모 버튼 — 색면 위에서는 흰 10~20%, 흰 바탕 위에서는 옅은 회색. */
@Composable
fun PearlIconButton(
    icon: DrawableResource,
    contentDescription: String,
    modifier: Modifier = Modifier,
    tint: Color = PearlColors.ink,
    background: Color = PearlColors.muted,
    size: Dp = 48.dp,
    onClick: () -> Unit = {},
) {
    Box(
        modifier.size(size).pressable(onClick, Square, contentDescription).background(background),
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(icon), contentDescription, tint = tint, modifier = Modifier.size(24.dp))
    }
}

/** 고르는 칩 — 고른 것만 [accent] 바탕에 흰 글자, 나머지는 옅은 회색. */
@Composable
fun PearlChip(
    text: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    accent: Color = PearlColors.orange,
    height: Dp = 36.dp,
    padding: Dp = 14.dp,
    onClick: () -> Unit = {},
) {
    val bg by animateColorAsState(if (selected) accent else PearlColors.muted, tween(220), label = "chip")
    val fg by animateColorAsState(if (selected) Color.White else PearlColors.ink, tween(220), label = "chipText")
    Box(
        modifier.height(height).pressable(onClick, Small).background(bg).padding(horizontal = padding),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, style = if (selected) PearlType.label else PearlType.body, color = fg, maxLines = 1)
    }
}

/** 토핑처럼 켜고 끄는 큰 칸 — 켜면 음료 색 테와 옅은 바탕. */
@Composable
fun PearlToggle(
    text: String,
    on: Boolean,
    accent: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {},
    content: @Composable () -> Unit = {},
) {
    val bg by animateColorAsState(if (on) accent.copy(alpha = 0.14f) else PearlColors.muted, tween(220), label = "toggle")
    val edge by animateColorAsState(if (on) accent else Color.Transparent, tween(220), label = "toggleEdge")
    Column(
        modifier
            .height(56.dp)
            .pressable(onClick, Big)
            .background(bg)
            .border(2.dp, edge, Big),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
    ) {
        content()
        Text(text, style = if (on) PearlType.meta.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold) else PearlType.meta, color = PearlColors.ink, maxLines = 1)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFFAF9F9, widthDp = 320)
@Composable
fun PearlButtonPreview() {
    PearlTheme {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            PearlButton("Add to bag · $5.50", Modifier.fillMaxWidth(), icon = Res.drawable.ic_bag)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PearlChip("All", selected = true)
                PearlChip("Fruit tea", selected = false)
                PearlIconButton(Res.drawable.ic_search, "Search")
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PearlToggle("Pearls", on = true, accent = Color(0xFF8F98FF), modifier = Modifier.weight(1f))
                PearlToggle("Jelly", on = false, accent = Color(0xFF8F98FF), modifier = Modifier.weight(1f))
            }
        }
    }
}
