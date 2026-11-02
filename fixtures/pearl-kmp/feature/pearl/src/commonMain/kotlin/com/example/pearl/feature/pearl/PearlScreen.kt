package com.example.pearl.feature.pearl

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutLinearInEasing
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyGridState
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.pearl.core.designsystem.PearlButton
import com.example.pearl.core.designsystem.PearlChip
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.PearlIconButton
import com.example.pearl.core.designsystem.PearlType
import com.example.pearl.core.designsystem.colors
import com.example.pearl.core.designsystem.label
import com.example.pearl.core.designsystem.res.*
import com.example.pearl.core.designsystem.res.Res as DS
import com.example.pearl.core.model.Drink
import com.example.pearl.core.model.Flavor
import com.example.pearl.core.model.Kind
import com.example.pearl.core.ui.BagButton
import com.example.pearl.core.ui.Blob
import com.example.pearl.core.ui.Cup
import com.example.pearl.core.ui.DrinkCard
import com.example.pearl.feature.pearl.res.*
import com.example.pearl.feature.pearl.res.Res
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

sealed interface PearlUiState {
    data object Loading : PearlUiState
    data object Error : PearlUiState
    data class Content(val drinks: List<Drink>) : PearlUiState
}

/** 칩 순서 — 전체 다음이 과일티다(뷰어 테스트가 두 번째 칩을 누른다). */
val MenuFilters = listOf(null, Kind.FRUIT_TEA, Kind.MILK_TEA, Kind.MATCHA, Kind.COFFEE, Kind.SMOOTHIE, Kind.YOGURT)

// 짙은 초록 머리에 큰 컵 그림, 그 위로 흰 시트가 겹친다. 시트에 칩과 메뉴 그리드
@Composable
fun PearlScreen(
    state: PearlUiState,
    modifier: Modifier = Modifier,
    gridState: LazyGridState = rememberLazyGridState(),
    columns: Int = 2,
    ambient: Boolean = false,
    kind: Kind? = null,
    bag: Int = 2,
    bagBounce: Float = 1f,
    bottomInset: Dp = 0.dp,
    onKind: (Kind?) -> Unit = {},
    onRetry: () -> Unit = {},
    onDrinkClick: (Drink) -> Unit = {},
) {
    val hasMenu = state is PearlUiState.Content && state.drinks.isNotEmpty()
    Box(modifier.fillMaxSize().background(PearlColors.canvas)) {
        Hero(hasMenu, bag, bagBounce, kind)
        Column(
            Modifier
                .fillMaxSize()
                .padding(top = 214.dp)
                .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                .background(PearlColors.sheet),
        ) {
            if (hasMenu) {
                Row(
                    Modifier.horizontalScroll(rememberScrollState()).padding(start = 24.dp, end = 24.dp, top = 22.dp, bottom = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    MenuFilters.forEach { k ->
                        PearlChip(if (k == null) stringResource(Res.string.pearl_all) else stringResource(k.label), selected = kind == k) { onKind(k) }
                    }
                }
            }
            when (state) {
                PearlUiState.Loading -> Message(stringResource(Res.string.pearl_loading))
                PearlUiState.Error -> Message(stringResource(Res.string.pearl_error)) {
                    PearlButton(stringResource(Res.string.pearl_retry), Modifier.padding(top = 16.dp), onClick = onRetry)
                }
                is PearlUiState.Content -> if (state.drinks.isEmpty()) Message(stringResource(Res.string.pearl_empty)) else {
                    // 넓은 화면은 카드가 너무 커지지 않게 열을 늘린다. 그리드는 떠 있는 바텀 네비 위에서 끝난다
                    val fit = (screenWidthDp() - 48) / 210
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(maxOf(columns, fit)),
                        state = gridState,
                        modifier = Modifier.padding(bottom = bottomInset),
                        contentPadding = PaddingValues(start = 24.dp, end = 24.dp, top = 2.dp, bottom = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(state.drinks, key = { it.id }) { drink ->
                            DrinkCard(drink, ambient = ambient, onClick = { onDrinkClick(drink) })
                        }
                    }
                }
            }
        }
    }
}

// 칩마다 머리가 바뀐다 — 바탕 · 블롭 색이 그 갈래 색으로 번지고, 컵은 아래로 빠졌다가 새 컵이 위에서 튕겨 들어오고, 제목이 바뀐다
private class HeroLook(val bg: Color, val blob: Color, val flavor: Flavor, val straw: Color, val headline: StringResource)

private fun heroLook(kind: Kind?): HeroLook = when (kind) {
    null -> HeroLook(PearlColors.forest, PearlColors.forestLight, Flavor.MATCHA, PearlColors.orange, Res.string.pearl_headline)
    Kind.FRUIT_TEA -> HeroLook(Color(0xFFD9435A), Color(0xFFEC6377), Flavor.STRAWBERRY, PearlColors.ink, Res.string.pearl_headline_fruit_tea)
    Kind.MILK_TEA -> HeroLook(Color(0xFF5458C4), Color(0xFF6F74DD), Flavor.TARO, PearlColors.ink, Res.string.pearl_headline_milk_tea)
    Kind.MATCHA -> HeroLook(Color(0xFF2C7A4B), Color(0xFF3D9660), Flavor.MATCHA, PearlColors.orange, Res.string.pearl_headline_matcha)
    Kind.COFFEE -> HeroLook(Color(0xFF6A4128), Color(0xFF86583B), Flavor.BROWN_SUGAR, PearlColors.ink, Res.string.pearl_headline_coffee)
    Kind.SMOOTHIE -> HeroLook(Color(0xFFD9661C), Color(0xFFEE843A), Flavor.MANGO, PearlColors.ink, Res.string.pearl_headline_smoothie)
    Kind.YOGURT -> HeroLook(Color(0xFF3F7FA8), Color(0xFF5698C2), Flavor.COCONUT, PearlColors.ink, Res.string.pearl_headline_yogurt)
}

@Composable
private fun Hero(hasMenu: Boolean, bag: Int, bagBounce: Float, kind: Kind?) {
    val target = heroLook(kind)
    val bg by animateColorAsState(target.bg, tween(520), label = "heroBg")
    val blob by animateColorAsState(target.blob, tween(620), label = "heroBlob")
    // 보이는 컵 · 제목은 한 박자 늦게 바뀐다 — 빠지는 동안은 예전 것, 들어올 때 새것
    var shown by remember { mutableStateOf(target) }
    val swap = remember { Animatable(0f) }
    // 빠지는 도중에 원래 칩으로 돌아와도 컵 · 제목이 제자리로 튕겨 돌아온다
    LaunchedEffect(kind) {
        if (shown.headline != target.headline) {
            swap.animateTo(1f, tween(200, easing = FastOutLinearInEasing))
            shown = target
            swap.snapTo(-1f)
        }
        swap.animateTo(0f, spring(dampingRatio = 0.5f, stiffness = 320f))
    }
    val s = swap.value
    BoxWithConstraints(Modifier.fillMaxWidth().height(250.dp).background(bg)) {
        val w = maxWidth
        Blob(blob, Modifier.size(260.dp).align(Alignment.TopEnd).offset(x = 70.dp, y = 30.dp).graphicsLayer { rotationZ = s * 8f })
        Blob(blob.copy(alpha = 0.7f), Modifier.size(110.dp).align(Alignment.TopEnd).offset(x = (-40).dp, y = 12.dp).graphicsLayer { translationX = s * 14.dp.toPx() })
        Cup(
            shown.flavor.colors,
            Modifier.size(112.dp, 157.dp).align(Alignment.TopEnd).offset(x = (-24).dp, y = 72.dp).graphicsLayer {
                translationY = s * (if (s > 0f) 190.dp.toPx() else 120.dp.toPx())
                rotationZ = s * (if (s > 0f) 14f else -10f)
                alpha = 1f - kotlin.math.abs(s).coerceIn(0f, 1f) * 0.4f
            },
            straw = shown.straw,
        )
        Box(Modifier.size(13.dp).align(Alignment.TopEnd).offset(x = (-150).dp, y = 176.dp).graphicsLayer { translationY = -s * 18.dp.toPx() }.clip(CircleShape).background(PearlColors.pearl))
        Box(Modifier.size(9.dp).align(Alignment.TopEnd).offset(x = (-170).dp, y = 156.dp).graphicsLayer { translationY = -s * 26.dp.toPx() }.clip(CircleShape).background(PearlColors.pearl))
        Box(Modifier.size(10.dp).align(Alignment.TopEnd).offset(x = (-8).dp, y = 96.dp).clip(CircleShape).background(Color(0xFFFFC278)))
        Column(Modifier.statusBarsPadding().padding(horizontal = 24.dp, vertical = 20.dp)) {
            Row(Modifier.width(w - 48.dp).height(48.dp), verticalAlignment = Alignment.CenterVertically) {
                if (hasMenu) PearlIconButton(DS.drawable.ic_search, stringResource(Res.string.pearl_search), tint = Color.White, background = Color.White.copy(alpha = 0.12f))
                Spacer(Modifier.weight(1f))
                Text(stringResource(Res.string.pearl_title), style = PearlType.card, color = Color.White)
                Spacer(Modifier.weight(1f))
                if (hasMenu) BagButton(bag, stringResource(Res.string.pearl_bag, bag), ring = bg, bounce = bagBounce)
            }
            Text(stringResource(Res.string.pearl_greeting), style = PearlType.body, color = Color.White.copy(alpha = 0.78f), modifier = Modifier.padding(top = 20.dp))
            Text(
                text = stringResource(shown.headline),
                color = Color.White,
                fontSize = 28.sp,
                lineHeight = 36.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(196.dp).padding(top = 2.dp).graphicsLayer {
                    alpha = 1f - kotlin.math.abs(s).coerceIn(0f, 1f)
                    translationY = s * 10.dp.toPx()
                },
            )
        }
    }
}

@Composable
private fun Message(text: String, action: @Composable () -> Unit = {}) {
    Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Box(Modifier.size(132.dp).clip(CircleShape).background(Flavor.COCONUT.colors.card), contentAlignment = Alignment.Center) {
            Cup(Flavor.COCONUT.colors, Modifier.width(70.dp).aspectRatio(100f / 140f))
        }
        Text(text, style = PearlType.body, color = PearlColors.subtle, modifier = Modifier.padding(top = 16.dp))
        action()
    }
}
