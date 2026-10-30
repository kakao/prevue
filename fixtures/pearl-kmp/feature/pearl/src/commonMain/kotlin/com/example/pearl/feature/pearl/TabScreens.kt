package com.example.pearl.feature.pearl

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.pearl.core.designsystem.PearlButton
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.PearlIconButton
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.designsystem.PearlType
import com.example.pearl.core.designsystem.colors
import com.example.pearl.core.designsystem.pressable
import com.example.pearl.core.designsystem.price
import com.example.pearl.core.designsystem.res.*
import com.example.pearl.core.designsystem.res.Res as DS
import com.example.pearl.core.model.Drink
import com.example.pearl.core.model.menu
import com.example.pearl.core.ui.Blob
import com.example.pearl.core.ui.Cup
import com.example.pearl.core.ui.LocalCardBounds
import com.example.pearl.feature.pearl.res.*
import com.example.pearl.feature.pearl.res.Res
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

// 바텀 네비의 다른 탭 셋 — 가방 · 찜 · 내 정보. 가볍지만 진짜 화면이라 탭을 바꾸면 내용도 바뀐다

@Composable
private fun TabPage(title: String, sub: String?, bottomInset: Dp, content: @Composable () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(PearlColors.canvas)
            .verticalScroll(rememberScrollState())
            .statusBarsPadding()
            .padding(start = 24.dp, end = 24.dp, top = 40.dp, bottom = 24.dp + bottomInset),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = PearlType.title.copy(fontSize = 28.sp, lineHeight = 36.sp), color = PearlColors.ink)
            if (sub != null) Text(sub, style = PearlType.body, color = PearlColors.subtle)
        }
        content()
    }
}

@Composable
private fun Thumb(drink: Drink, size: Dp = 64.dp) {
    val c = drink.colors
    Box(Modifier.size(size, size * 1.12f).clip(RoundedCornerShape(14.dp)).background(c.card), contentAlignment = Alignment.Center) {
        Cup(c, Modifier.size(size * 0.62f, size * 0.87f))
    }
}

@Composable
fun OrdersScreen(bag: List<Drink>, modifier: Modifier = Modifier, bottomInset: Dp = 0.dp) {
    val subtotal = bag.sumOf { it.cents }
    Box(modifier) {
        TabPage(stringResource(Res.string.pearl_bag_title), if (bag.isEmpty()) stringResource(Res.string.pearl_bag_empty) else stringResource(Res.string.pearl_bag_sub, bag.size), bottomInset) {
            bag.forEach { d ->
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(PearlColors.sheet).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Thumb(d)
                    Column(Modifier.weight(1f).padding(horizontal = 12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(d.name, style = PearlType.label, color = PearlColors.ink, maxLines = 1)
                        Text("M · 50% · Pearls", style = PearlType.meta, color = PearlColors.subtle)
                        Text(price(d.cents), style = PearlType.label, color = PearlColors.ink, modifier = Modifier.padding(top = 4.dp))
                    }
                    Row(Modifier.clip(RoundedCornerShape(12.dp)).background(PearlColors.muted), verticalAlignment = Alignment.CenterVertically) {
                        PearlIconButton(DS.drawable.ic_minus, stringResource(Res.string.pearl_one_less), background = Color.Transparent, size = 36.dp)
                        Text("1", style = PearlType.label, color = PearlColors.ink)
                        PearlIconButton(DS.drawable.ic_plus, stringResource(Res.string.pearl_one_more), background = Color.Transparent, size = 36.dp)
                    }
                }
            }
            if (bag.isNotEmpty()) {
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(PearlColors.sheet).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Line(stringResource(Res.string.pearl_subtotal), price(subtotal))
                    Line(stringResource(Res.string.pearl_pickup), stringResource(Res.string.pearl_free))
                    Box(Modifier.fillMaxWidth().height(1.dp).background(PearlColors.line))
                    Line(stringResource(Res.string.pearl_total), price(subtotal), strong = true)
                }
                PearlButton(stringResource(Res.string.pearl_place_order, price(subtotal)), Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun Line(label: String, value: String, strong: Boolean = false) {
    Row(Modifier.fillMaxWidth()) {
        Text(label, style = if (strong) PearlType.card else PearlType.body, color = if (strong) PearlColors.ink else PearlColors.subtle, modifier = Modifier.weight(1f))
        Text(value, style = if (strong) PearlType.card else PearlType.body, color = PearlColors.ink)
    }
}

@Composable
fun SavedScreen(drinks: List<Drink>, modifier: Modifier = Modifier, bottomInset: Dp = 0.dp, onDrinkClick: (Drink) -> Unit = {}) {
    val report = LocalCardBounds.current
    Box(modifier) {
        TabPage(stringResource(Res.string.pearl_saved_title), stringResource(Res.string.pearl_saved_sub, drinks.size), bottomInset) {
            drinks.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    row.forEach { d ->
                        val c = d.colors
                        Box(
                            Modifier
                                .weight(1f)
                                .aspectRatio(0.76f)
                                .then(if (report != null) Modifier.onGloballyPositioned { report(d.id, it.boundsInRoot()) } else Modifier)
                                .pressable({ onDrinkClick(d) }, RoundedCornerShape(16.dp), d.name)
                                .background(c.card),
                        ) {
                            Blob(c.blob, Modifier.size(90.dp).align(Alignment.TopEnd).offset(x = 30.dp, y = (-28).dp))
                            Cup(c, Modifier.size(64.dp, 90.dp).align(Alignment.TopCenter).offset(y = 22.dp))
                            Box(Modifier.align(Alignment.TopEnd).padding(8.dp).size(36.dp).clip(RoundedCornerShape(12.dp)).background(Color.White.copy(alpha = 0.9f)), contentAlignment = Alignment.Center) {
                                Icon(painterResource(DS.drawable.ic_heart_filled), null, tint = PearlColors.orange, modifier = Modifier.size(18.dp))
                            }
                            Column(Modifier.align(Alignment.BottomStart).padding(14.dp)) {
                                Text(d.name, style = PearlType.label, color = c.onCard, maxLines = 1)
                                Text(price(d.cents), style = PearlType.meta, color = c.onCard.copy(alpha = 0.85f))
                            }
                        }
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
fun ProfileScreen(modifier: Modifier = Modifier, stamps: Int = 8, bottomInset: Dp = 0.dp) {
    Box(modifier) {
        TabPage("Jamie", stringResource(Res.string.pearl_member), bottomInset) {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(PearlColors.forest).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Column {
                    Text(stringResource(Res.string.pearl_stamps), style = PearlType.body, color = Color.White.copy(alpha = 0.8f))
                    Text(stringResource(Res.string.pearl_stamps_count, stamps), style = PearlType.title, color = Color.White)
                }
                (0 until 10).chunked(5).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { i ->
                            val got = i < stamps
                            Box(
                                Modifier
                                    .weight(1f)
                                    .height(44.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(if (got) PearlColors.orange else Color.Transparent)
                                    .border(2.dp, if (got) Color.Transparent else Color.White.copy(alpha = 0.45f), RoundedCornerShape(14.dp)),
                                contentAlignment = Alignment.Center,
                            ) { if (got) Box(Modifier.size(12.dp).clip(CircleShape).background(PearlColors.pearl)) }
                        }
                    }
                }
                Text(stringResource(Res.string.pearl_stamps_hint, 10 - stamps), style = PearlType.meta, color = Color.White.copy(alpha = 0.85f))
            }
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(PearlColors.sheet)) {
                listOf(DS.drawable.ic_orders to Res.string.pearl_history, DS.drawable.ic_card to Res.string.pearl_payment, DS.drawable.ic_settings to Res.string.pearl_settings)
                    .forEachIndexed { i, (icon, label) ->
                        if (i > 0) Box(Modifier.padding(horizontal = 16.dp).fillMaxWidth().height(1.dp).background(PearlColors.line))
                        Row(Modifier.fillMaxWidth().height(56.dp).padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(painterResource(icon), null, tint = PearlColors.ink, modifier = Modifier.size(20.dp))
                            Text(stringResource(label), style = PearlType.body.copy(fontWeight = FontWeight.Medium), color = PearlColors.ink, modifier = Modifier.weight(1f).padding(start = 12.dp))
                            Icon(painterResource(DS.drawable.ic_chevron), null, tint = PearlColors.subtle, modifier = Modifier.size(18.dp))
                        }
                    }
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun OrdersScreenPreview() = PearlTheme { OrdersScreen(listOf(menu[0], menu[2])) }

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun SavedScreenPreview() = PearlTheme { SavedScreen(menu.filter { it.saved }) }

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun ProfileScreenPreview() = PearlTheme { ProfileScreen() }
