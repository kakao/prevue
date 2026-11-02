package com.example.pearl.feature.pearl

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.designsystem.PearlType
import com.example.pearl.core.designsystem.colors
import com.example.pearl.core.designsystem.label
import com.example.pearl.core.designsystem.pressable
import com.example.pearl.core.model.Drink
import com.example.pearl.core.model.Kind
import com.example.pearl.core.model.menu
import com.example.pearl.core.ui.DrinkCard
import com.example.pearl.feature.pearl.res.*
import com.example.pearl.feature.pearl.res.Res
import org.jetbrains.compose.resources.stringResource

// 넓은 화면의 메뉴 쪽. 뷰어 테스트가 칩 글자 줄(아래 FilterChip의 Text)을 51번 줄로 찾아 누른다 — 줄을 옮기면 tests/viewer 도 고친다.
@Composable
private fun FilterChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val bg by animateColorAsState(if (selected) PearlColors.orange else PearlColors.muted, tween(220), label = "chip")
    val fg by animateColorAsState(if (selected) Color.White else PearlColors.ink, tween(220), label = "chipText")
    Box(Modifier.height(36.dp).pressable(onClick, RoundedCornerShape(10.dp)).background(bg).padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
        Text(
            text = label,
            color = fg,
            style = if (selected) PearlType.label else PearlType.body,
            maxLines = 1,
        )
    }
}

@Composable
fun DrinkFilterScreen(
    drinks: List<Drink> = menu.take(20),
    selected: Drink? = null,
    columns: Int = 2,
    ambient: Boolean = false,
    onSelect: (Drink) -> Unit = {},
) {
    var kind by remember { mutableStateOf<Kind?>(null) }
    val shown = if (kind == null) drinks else drinks.filter { it.kind == kind }
    Column(Modifier.fillMaxSize().background(PearlColors.canvas)) {
        Text(stringResource(Res.string.pearl_title), style = PearlType.title, color = PearlColors.ink, modifier = Modifier.padding(start = 24.dp, top = 24.dp))
        Text(stringResource(Res.string.pearl_count, shown.size), style = PearlType.body, color = PearlColors.subtle, modifier = Modifier.padding(start = 24.dp, top = 2.dp))
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 24.dp, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MenuFilters.take(5).forEach { k ->
                FilterChip(if (k == null) stringResource(Res.string.pearl_all) else stringResource(k.label), selected = kind == k) { kind = k }
            }
        }
        LazyVerticalGrid(
            columns = GridCells.Fixed(columns),
            contentPadding = PaddingValues(start = 24.dp, end = 24.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            items(shown, key = { it.id }) { drink ->
                // 고른 카드는 바깥 테로 강조한다. 테 자리는 늘 비워 둬 고를 때 카드가 밀리지 않는다
                val ring by animateColorAsState(if (drink.id == selected?.id) drink.colors.card else Color.Transparent, tween(200), label = "ring")
                Box(
                    Modifier
                        .animateItem(fadeInSpec = tween(350), placementSpec = tween(450, easing = FastOutSlowInEasing), fadeOutSpec = tween(250))
                        .clip(RoundedCornerShape(19.dp))
                        .background(ring)
                        .padding(3.dp),
                ) {
                    DrinkCard(drink, ambient = ambient, onClick = { onSelect(drink) })
                }
            }
        }
    }
}

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun DrinkFilterPreview() = PearlTheme { DrinkFilterScreen() }
