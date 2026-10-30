package com.example.pearl.feature.pearl

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.geometry.lerp
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.designsystem.colors
import com.example.pearl.core.model.Drink
import com.example.pearl.core.model.Kind
import com.example.pearl.core.model.menu
import com.example.pearl.core.ui.CupWorld
import com.example.pearl.core.ui.LocalCardBounds
import com.example.pearl.core.ui.LocalCupBounds
import com.example.pearl.core.ui.NavItem
import com.example.pearl.core.ui.PearlNav
import com.example.pearl.core.ui.PillNavBar
import com.example.pearl.core.ui.drawCupScene
import com.example.pearl.feature.pearl.res.*
import com.example.pearl.feature.pearl.res.Res
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.stringResource

// 전환이 그 순간 화면에서 드러나는 영역 — 카드 자리에서 화면 전체로 커진다
private class Reveal(val rect: Rect, val corner: Float) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline =
        Outline.Rounded(RoundRect(rect, CornerRadius(corner)))
}

private val tabNames = listOf(Res.string.pearl_nav_home, Res.string.pearl_nav_orders, Res.string.pearl_nav_saved, Res.string.pearl_nav_profile)

/**
 * navigation 없이 상태로 오간다 — 바텀 네비의 탭 넷, 그리고 카드를 누르면 카드가 상세 화면으로 커진다.
 * 표준 전환(AnimatedContent · 공유 요소)은 layoutlib 인터랙티브에서 첫 프레임에 끝나, 전환을 Animatable 하나로 직접 그린다.
 * 다 커지면 목록을 컴포지션에서 내린다 — 그리드 자리는 위로 끌어올린 상태가 기억한다.
 */
@Composable
fun PearlApp(modifier: Modifier = Modifier, drinks: List<Drink> = menu, ambient: Boolean = true, start: Drink? = null) {
    var tab by remember { mutableIntStateOf(0) }
    var kind by remember { mutableStateOf<Kind?>(null) }
    var selected by remember { mutableStateOf(start) }
    val bag = remember { mutableStateListOf(menu[0], menu[2]) }
    val grid = rememberLazyGridState()
    val cards = remember { mutableStateMapOf<Int, Rect>() }
    val cups = remember { mutableStateMapOf<Int, Rect>() }
    var detailCup by remember { mutableStateOf(Rect.Zero) }
    var origin by remember { mutableStateOf(Rect.Zero) }
    val open = remember { Animatable(if (start != null) 1f else 0f) }
    val tabIn = remember { Animatable(1f) }
    val scope = rememberCoroutineScope()

    fun show(d: Drink) {
        selected = d
        scope.launch { open.snapTo(0f); open.animateTo(1f, spring(dampingRatio = 0.86f, stiffness = 300f)) }
    }
    fun close() {
        scope.launch { open.animateTo(0f, spring(dampingRatio = 1f, stiffness = 420f)); selected = null }
    }
    PearlBackHandler(enabled = selected != null) { close() }
    // 거른 목록이 그려진 뒤에 맨 위로 — 바꾸는 순간 올리면 그리드가 앞 목록의 첫 카드 자리를 붙들어 한 줄 내려간다
    LaunchedEffect(kind) { grid.scrollToItem(0) }

    BoxWithConstraints(modifier.fillMaxSize().background(PearlColors.canvas).onGloballyPositioned { origin = it.boundsInRoot() }) {
        val inset = 96.dp
        if (selected == null || open.value < 0.999f) {
            CompositionLocalProvider(LocalCardBounds provides { id, r -> cards[id] = r }, LocalCupBounds provides { id, r -> cups[id] = r }) {
                Box(Modifier.fillMaxSize().graphicsLayer { alpha = tabIn.value; translationY = (1f - tabIn.value) * 18.dp.toPx() }) {
                    when (tab) {
                        0 -> PearlScreen(
                            state = PearlUiState.Content(if (kind == null) drinks else drinks.filter { it.kind == kind }),
                            gridState = grid,
                            ambient = ambient,
                            kind = kind,
                            bag = bag.size,
                            bottomInset = inset,
                            onKind = { kind = it },
                            onDrinkClick = { show(it) },
                        )
                        1 -> OrdersScreen(bag, bottomInset = inset)
                        2 -> SavedScreen(drinks.filter { it.saved }, bottomInset = inset, onDrinkClick = { show(it) })
                        else -> ProfileScreen(bottomInset = inset)
                    }
                }
            }
            PillNavBar(
                tabNames.mapIndexed { i, n -> NavItem(PearlNav[i], stringResource(n)) },
                selected = tab,
                modifier = Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 20.dp),
            ) {
                if (it != tab) { tab = it; scope.launch { tabIn.snapTo(0f); tabIn.animateTo(1f, tween(320)) } }
            }
        }
        selected?.let { d ->
            // 스프링이 1을 살짝 넘어도 판이 화면 밖으로 늘거나 모서리가 음수가 되지 않는다
            val p = open.value.coerceIn(0f, 1f)
            val full = Rect(0f, 0f, constraints.maxWidth.toFloat(), constraints.maxHeight.toFloat())
            val from = cards[d.id]?.translate(-origin.topLeft) ?: full
            val corner = with(LocalDensity.current) { 16.dp.toPx() } * (1f - p)
            val world = remember(d.id) { CupWorld().settled(pearls = pearlLevels[2].second, ice = iceLevels[1].second) }
            val cupFrom = cups[d.id]
            // 커지는 동안 카드 색 판이 먼저 옅게 덮어 카드 글자가 스며 사라진다 — 컵은 덮이지 않고 따로 날아가고, 상세 글자는 판이 거의 다 커진 뒤에 떠오른다
            Box(Modifier.fillMaxSize().clip(Reveal(lerp(from, full, p), corner)).background(d.colors.card.copy(alpha = (p * 3f).coerceIn(0f, 1f)))) {
                DrinkDetailScreen(
                    d,
                    Modifier.graphicsLayer { alpha = ((p - 0.6f) / 0.35f).coerceIn(0f, 1f); translationY = (1f - p) * 48.dp.toPx() },
                    ambient = ambient,
                    bag = bag.size,
                    world = world,
                    cupVisible = cupFrom == null || p >= 0.999f,
                    onCupBounds = { detailCup = it },
                    onAdd = { bag += it },
                    onBack = { close() },
                )
            }
            // 컵 하나가 카드 자리에서 상세의 큰 컵 자리로 — 같은 물리 세계를 그려 도착하면 그대로 이어진다
            if (cupFrom != null && p < 0.999f && detailCup != Rect.Zero) {
                Canvas(Modifier.fillMaxSize()) {
                    val r = lerp(cupFrom.translate(-origin.topLeft), detailCup.translate(-origin.topLeft), p.coerceIn(0f, 1f))
                    translate(r.left, r.top) { drawCupScene(d.colors, world, area = Size(r.width, r.height), lid = 0f) }
                }
            }
        }
    }
}

// 정착을 기다리는 통합 테스트가 켜는 프리뷰라 일렁임을 멈춘다
@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun PearlAppPreview() {
    PearlTheme {
        PearlApp(ambient = false)
    }
}
