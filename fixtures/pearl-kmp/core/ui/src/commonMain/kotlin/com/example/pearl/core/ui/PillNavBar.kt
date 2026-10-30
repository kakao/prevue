package com.example.pearl.core.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.designsystem.PearlType
import com.example.pearl.core.designsystem.pressable
import com.example.pearl.core.designsystem.res.*
import com.example.pearl.core.designsystem.res.Res as DS
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.DrawableResource
import org.jetbrains.compose.resources.painterResource

data class NavItem(val icon: DrawableResource, val label: String)

private val Pill = RoundedCornerShape(50)

/**
 * 떠 있는 알약 네비 — 고른 칸만 글자가 스프링으로 펼쳐지고, 연한 주황 알약이 그 칸으로 미끄러진다.
 * 알약은 칸들 뒤에 하나만 그린다: 칸 자리를 재 두고 x · 폭을 스프링으로 따라간다.
 */
@Composable
fun PillNavBar(items: List<NavItem>, selected: Int, modifier: Modifier = Modifier, onSelect: (Int) -> Unit = {}) {
    val spots = remember { mutableStateMapOf<Int, Pair<Float, IntSize>>() }
    val x = remember { Animatable(0f) }
    val w = remember { Animatable(0f) }
    val target = spots[selected]
    LaunchedEffect(target) {
        val t = target ?: return@LaunchedEffect
        if (w.value == 0f) { x.snapTo(t.first); w.snapTo(t.second.width.toFloat()); return@LaunchedEffect }
        coroutineScope {
            launch { x.animateTo(t.first, spring(dampingRatio = 0.72f, stiffness = 380f)) }
            launch { w.animateTo(t.second.width.toFloat(), spring(dampingRatio = 0.72f, stiffness = 380f)) }
        }
    }
    Row(
        modifier
            .height(56.dp)
            .shadow(18.dp, Pill, ambientColor = PearlColors.shadow.copy(alpha = 0.10f), spotColor = PearlColors.shadow.copy(alpha = 0.14f))
            .background(PearlColors.sheet, Pill)
            .border(1.dp, PearlColors.line, Pill)
            .padding(7.dp)
            .drawBehind {
                val h = size.height
                if (w.value > 0f) drawRoundRect(PearlColors.orangeSoft, Offset(x.value, 0f), Size(w.value, h), CornerRadius(h / 2f))
            },
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        items.forEachIndexed { i, item ->
            NavSlot(item, i == selected, Modifier.onGloballyPositioned { spots[i] = it.positionInParent().x to it.size }) { onSelect(i) }
        }
    }
}

@Composable
private fun NavSlot(item: NavItem, on: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val label by animateDpAsState(if (on) 64.dp else 0.dp, spring(dampingRatio = 0.8f, stiffness = 420f), label = "label")
    val tint by animateColorAsState(if (on) PearlColors.orange else PearlColors.subtle, tween(200), label = "tint")
    Row(
        modifier.height(42.dp).pressable(onClick, Pill, item.label).padding(start = 13.dp, end = if (on) 16.dp else 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(item.icon), item.label, tint = tint, modifier = Modifier.size(22.dp))
        Box(Modifier.width(label).clipToBounds().padding(start = 8.dp)) {
            Text(item.label, style = PearlType.nav, color = PearlColors.orangeInk, maxLines = 1, softWrap = false, overflow = TextOverflow.Clip)
        }
    }
}

val PearlNav = listOf(DS.drawable.ic_home, DS.drawable.ic_orders, DS.drawable.ic_heart, DS.drawable.ic_user)

@Preview(showBackground = true, backgroundColor = 0xFFFAF9F9, widthDp = 360, heightDp = 120)
@Composable
fun PillNavBarPreview() {
    PearlTheme {
        Box(Modifier.padding(24.dp).offset(y = 8.dp)) {
            PillNavBar(listOf("Home", "Orders", "Saved", "Profile").mapIndexed { i, s -> NavItem(PearlNav[i], s) }, selected = 0)
        }
    }
}
