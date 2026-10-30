package com.example.pearl.feature.pearl.showcase

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.PearlButton
import com.example.pearl.core.designsystem.PearlChip
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.designsystem.PearlToggle
import com.example.pearl.core.designsystem.colors
import com.example.pearl.core.model.Flavor
import com.example.pearl.core.model.menu
import com.example.pearl.core.ui.BagButton
import com.example.pearl.core.ui.DrinkCard
import com.example.pearl.core.ui.FlavorPanel
import com.example.pearl.core.ui.NavItem
import com.example.pearl.core.ui.PearlNav
import com.example.pearl.core.ui.PillNavBar
import com.example.pearl.feature.pearl.DrinkDetailScreen

// README 보드 장면 — 한 파일에 화면 · 카드 · 버튼 · 내비 · 맛 패널을 모아 보드가 여러 컴포넌트로 깔리는 모습을 보인다.
// 컨트롤 묶음이 맨 앞이다 — README 의 좁은 보드 그림에 첫 묶음만 들어가도 컴포넌트가 가장 많이 보이게.
// 보드(PearlPreviews.kt)와 따로 둬 통합 테스트가 보는 카드 수를 건드리지 않는다.

@Preview(showBackground = true, backgroundColor = 0xFFFAF9F9, widthDp = 360)
@Composable
fun ControlsPreview() = PearlTheme {
    val accent = Flavor.TARO.colors.card
    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        PearlButton("Add to bag · $5.50", Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PearlChip("All", selected = true)
            PearlChip("Milk tea", selected = false)
            PearlChip("Matcha", selected = false)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("0%", "30%", "50%", "70%").forEachIndexed { i, s -> PearlChip(s, selected = i == 2, modifier = Modifier.weight(1f), accent = PearlColors.ink, padding = 2.dp) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PearlToggle("Coconut jelly", on = true, accent = accent, modifier = Modifier.weight(1f))
            PearlToggle("Pudding", on = false, accent = accent, modifier = Modifier.weight(1f))
        }
        PillNavBar(listOf("Home", "Orders", "Saved", "Profile").mapIndexed { i, s -> NavItem(PearlNav[i], s) }, selected = 2)
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(PearlColors.forest).padding(16.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            BagButton(2, "Bag, 2 drinks")
            BagButton(12, "Bag, 12 drinks")
        }
    }
}

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun DetailScreenPreview() = PearlTheme { DrinkDetailScreen(menu.first { it.id == 4 }) }

@Preview(showBackground = true, backgroundColor = 0xFFFAF9F9, widthDp = 360)
@Composable
fun MenuCardsPreview() = PearlTheme {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        menu.take(4).chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { row.forEach { DrinkCard(it, Modifier.weight(1f)) } }
        }
        DrinkCard(menu[5], aspect = 2.6f)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFFFAF9F9, widthDp = 360)
@Composable
fun FlavorPanelsPreview() = PearlTheme {
    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        listOf(Flavor.MATCHA, Flavor.MANGO, Flavor.PEACH, Flavor.LYCHEE, Flavor.PASSION, Flavor.COCONUT).chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { FlavorPanel(it.colors, Modifier.weight(1f).size(96.dp).clip(RoundedCornerShape(20.dp))) }
            }
        }
    }
}
