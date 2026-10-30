package com.example.pearl.feature.pearl

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearOutSlowInEasing
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.boundsInRoot
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.PearlButton
import com.example.pearl.core.designsystem.PearlChip
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.PearlIconButton
import com.example.pearl.core.designsystem.PearlToggle
import com.example.pearl.core.designsystem.PearlType
import com.example.pearl.core.designsystem.colors
import com.example.pearl.core.designsystem.price
import com.example.pearl.core.designsystem.res.*
import com.example.pearl.core.designsystem.res.Res as DS
import com.example.pearl.core.model.Drink
import com.example.pearl.core.model.Kind
import com.example.pearl.core.ui.BagButton
import com.example.pearl.core.ui.Blob
import com.example.pearl.core.ui.BodyKind
import com.example.pearl.core.ui.CupWorld
import com.example.pearl.core.ui.Slosh
import com.example.pearl.core.ui.drawCup
import com.example.pearl.core.ui.drawCupScene
import com.example.pearl.feature.pearl.res.*
import com.example.pearl.feature.pearl.res.Res
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

private val Kind.description: StringResource
    get() = when (this) {
        Kind.FRUIT_TEA -> Res.string.pearl_desc_fruit_tea
        Kind.MILK_TEA -> Res.string.pearl_desc_milk_tea
        Kind.MATCHA -> Res.string.pearl_desc_matcha
        Kind.COFFEE -> Res.string.pearl_desc_coffee
        Kind.SMOOTHIE -> Res.string.pearl_desc_smoothie
        Kind.YOGURT -> Res.string.pearl_desc_yogurt
    }

private val sizes = listOf("S" to 0.86f, "M" to 1f, "L" to 1.12f)
private val sweetness = listOf("0%", "30%", "50%", "70%", "100%")
internal val iceLevels = listOf(Res.string.pearl_ice_none to 0, Res.string.pearl_ice_less to 3, Res.string.pearl_ice_extra to 6)
internal val pearlLevels = listOf(Res.string.pearl_amount_none to 0, Res.string.pearl_amount_less to 5, Res.string.pearl_amount_regular to 10, Res.string.pearl_amount_extra to 16)

/**
 * 음료 하나 — 큰 컵을 좌우로 끌면 음료가 출렁이고, 놓으면 흔들리다 잦아든다. 토핑 · 얼음은 컵 안의 물리([CupWorld])가 굴린다 —
 * 뚜껑이 열리고 떨어져 철벅 잠기고, 펄은 가라앉고 얼음은 떠오른다. 빼면 펄은 빨대로 빨려 올라가고 얼음 · 젤리는 들려 나간다.
 * 담으면 작은 컵이 가방으로 날아가 배지가 튄다. 물리는 프레임 시계(withFrameNanos)로 돌다 다 멎으면 루프를 끝낸다.
 * 처음 모습은 미리 굴려 멎은 컵이라 정지 화면에서도 같다.
 */
@Composable
fun DrinkDetailScreen(
    drink: Drink,
    modifier: Modifier = Modifier,
    ambient: Boolean = false,
    bag: Int = 2,
    showBack: Boolean = true,
    world: CupWorld = remember(drink.id) { CupWorld().settled(pearls = pearlLevels[2].second, ice = iceLevels[1].second) },
    cupVisible: Boolean = true,
    onCupBounds: (Rect) -> Unit = {},
    onAdd: (Drink) -> Unit = {},
    onBack: () -> Unit = {},
) {
    val c = drink.colors
    val scope = rememberCoroutineScope()
    var cupSize by remember(drink.id) { mutableIntStateOf(1) }
    var sweet by remember(drink.id) { mutableIntStateOf(2) }
    var ice by remember(drink.id) { mutableIntStateOf(1) }
    var pearls by remember(drink.id) { mutableIntStateOf(2) }
    var jelly by remember(drink.id) { mutableStateOf(false) }
    var count by remember(drink.id) { mutableIntStateOf(bag) }

    val tilt = remember(drink.id) { Animatable(0f) }
    val wave = remember(drink.id) { Animatable(0f) }
    val phase = remember(drink.id) { Animatable(0f) }
    val scale = remember(drink.id) { Animatable(1f) }
    var wake by remember(drink.id) { mutableIntStateOf(0) }
    var tick by remember(drink.id) { mutableIntStateOf(0) }
    LaunchedEffect(world, wake) {
        var last = -1L
        while (!world.asleep) {
            withFrameNanos { now ->
                world.advance(if (last < 0) 1f / 60f else (now - last) / 1e9f)
                last = now
                tick++
            }
        }
        tick++
    }
    fun nudge() { wake++ }
    val fly = remember(drink.id) { Animatable(0f) }
    val bounce = remember(drink.id) { Animatable(1f) }
    var cupBox by remember { mutableStateOf(Rect.Zero) }
    var bagBox by remember { mutableStateOf(Rect.Zero) }
    var rootBox by remember { mutableStateOf(Rect.Zero) }

    // 컵이 흔들린 것처럼 — 수면을 한쪽으로 기울였다 놓아 출렁이다 잦아들게 한다
    fun kick(strength: Float) {
        world.stir(); nudge()
        scope.launch { tilt.snapTo(strength * 0.2f); tilt.animateTo(0f, spring(dampingRatio = 0.22f, stiffness = 70f)) }
        scope.launch { wave.snapTo(strength * 6f); wave.animateTo(0f, spring(dampingRatio = 0.7f, stiffness = 30f)) }
        scope.launch { phase.animateTo(phase.value + 12f, tween(2000, easing = LinearOutSlowInEasing)) }
    }

    // 달수록 음료가 진해진다 — 0%는 우유 쪽으로 옅고, 100%는 카드 색 쪽으로 짙다
    val sweetTone = if (sweet <= 1) lerp(c.liquid, c.top, 0.55f - 0.3f * sweet) else lerp(c.liquid, c.card, 0.22f * (sweet - 2))
    val liquid by animateColorAsState(sweetTone, tween(450), label = "sweet")
    val drinkColors = c.copy(liquid = liquid)
    val total = drink.cents + (if (cupSize == 2) 70 else 0) + (if (jelly) 50 else 0)

    // 담기는 늘 손 닿는 자리 — 아래에 붙어 있고, 내용은 그 뒤로 지나간다
    @Composable
    fun AddBar(m: Modifier) {
        Box(m.fillMaxWidth().background(PearlColors.sheet).padding(horizontal = 24.dp, vertical = 16.dp)) {
            PearlButton(stringResource(Res.string.pearl_add, price(total)), Modifier.fillMaxWidth(), icon = DS.drawable.ic_bag) {
                scope.launch {
                    // 빠르게 다시 누르면 새 비행이 앞 비행을 끊는다 — 끊겨도 담기는 센다
                    try {
                        fly.snapTo(0f)
                        fly.animateTo(1f, tween(620, easing = FastOutSlowInEasing))
                    } finally {
                        count += 1
                        onAdd(drink)
                    }
                    fly.snapTo(0f)
                    bounce.snapTo(1.45f)
                    bounce.animateTo(1f, spring(dampingRatio = 0.3f, stiffness = 420f))
                }
            }
        }
    }

    val cupGesture = Modifier
        .graphicsLayer { scaleX = scale.value; scaleY = scale.value; transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0.5f, 1f) }
        .onGloballyPositioned { cupBox = it.boundsInRoot(); onCupBounds(cupBox) }
        .pointerInput(drink.id) {
            detectHorizontalDragGestures(
                onDragEnd = {
                    scope.launch { tilt.animateTo(0f, spring(dampingRatio = 0.22f, stiffness = 70f)) }
                    scope.launch { wave.animateTo(0f, spring(dampingRatio = 0.7f, stiffness = 30f)) }
                    scope.launch { phase.animateTo(phase.value + 14f, tween(2200, easing = LinearOutSlowInEasing)) }
                },
            ) { change, dx ->
                change.consume()
                if (world.asleep) { world.stir(); nudge() }
                scope.launch {
                    tilt.snapTo((tilt.value - dx * 0.0022f).coerceIn(-0.28f, 0.28f))
                    wave.snapTo((wave.value + kotlin.math.abs(dx) * 0.06f).coerceAtMost(7f))
                    phase.snapTo(phase.value + dx * 0.04f)
                }
            }
        }
    // 음료 색 무대 — 블롭 · 펄 장식 · 큰 컵. 좁으면 위에, 넓으면 왼쪽에 선다
    val stage: @Composable (Modifier, Float) -> Unit = { m, cupHeight ->
        Box(m.clipToBounds().background(c.card)) {
            Blob(c.blob.copy(alpha = 0.55f), Modifier.size(280.dp).align(Alignment.TopEnd).offset(x = 90.dp, y = (-60).dp))
            Blob(c.blob.copy(alpha = 0.35f), Modifier.size(200.dp).align(Alignment.BottomStart).offset(x = (-60).dp, y = 30.dp))
            Box(Modifier.size(12.dp).align(Alignment.CenterStart).offset(x = 66.dp, y = (-20).dp).clip(CircleShape).background(PearlColors.pearl))
            Box(Modifier.size(16.dp).align(Alignment.CenterEnd).offset(x = (-58).dp, y = 40.dp).clip(CircleShape).background(PearlColors.pearl))
            Canvas(Modifier.fillMaxHeight(cupHeight).aspectRatio(100f / 140f).align(Alignment.Center).offset(y = 18.dp).then(cupGesture)) {
                if (tick < 0 || !cupVisible) return@Canvas   // 물리 한 프레임마다 다시 그린다 — 그리기 단계만 읽는다
                world.tilt = tilt.value; world.wave = wave.value; world.phase = phase.value
                drawCupScene(drinkColors, world)
            }
        }
    }
    val bagButton: @Composable (Boolean) -> Unit = { onDark ->
        BagButton(count, stringResource(Res.string.pearl_bag, count), Modifier.onGloballyPositioned { bagBox = it.boundsInRoot() }, onDark = onDark, ring = if (onDark) c.card else PearlColors.sheet, bounce = bounce.value)
    }
    val options: @Composable () -> Unit = {
        Row(verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(drink.name, style = PearlType.title, color = PearlColors.ink, maxLines = 1)
                Text(stringResource(drink.kind.description), style = PearlType.body, color = PearlColors.subtle, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(price(total), style = PearlType.price, color = PearlColors.ink, modifier = Modifier.padding(start = 12.dp, top = 4.dp))
        }
        Option(stringResource(Res.string.pearl_size)) {
            sizes.forEachIndexed { i, (label, s) ->
                PearlChip(if (i == 2) "$label +$0.70" else label, selected = cupSize == i, modifier = Modifier.weight(1f), height = 44.dp) {
                    if (cupSize != i) kick(if (i > cupSize) 1f else -0.8f)
                    cupSize = i
                    scope.launch { scale.animateTo(s, spring(dampingRatio = 0.32f, stiffness = 260f)) }
                }
            }
        }
        Option(stringResource(Res.string.pearl_ice)) {
            iceLevels.forEachIndexed { i, (label, n) ->
                PearlChip(stringResource(label), selected = ice == i, modifier = Modifier.weight(1f), accent = PearlColors.ink) {
                    ice = i
                    val now = world.count(BodyKind.ICE)
                    if (n > now) world.add(BodyKind.ICE, n - now) else world.remove(BodyKind.ICE, now - n)
                    nudge()
                }
            }
        }
        Option(stringResource(Res.string.pearl_pearls)) {
            pearlLevels.forEachIndexed { i, (label, n) ->
                PearlChip(stringResource(label), selected = pearls == i, modifier = Modifier.weight(1f), accent = PearlColors.ink, padding = 2.dp) {
                    pearls = i
                    val now = world.count(BodyKind.PEARL)
                    if (n > now) world.add(BodyKind.PEARL, n - now) else world.remove(BodyKind.PEARL, now - n)
                    nudge()
                }
            }
        }
        Option(stringResource(Res.string.pearl_toppings)) {
            PearlToggle(stringResource(Res.string.pearl_jelly), jelly, c.card, Modifier.weight(1f), onClick = { jelly = !jelly; if (jelly) world.add(BodyKind.JELLY, 4) else world.remove(BodyKind.JELLY, 99); nudge() }) {
                Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) { listOf(Color(0xFF4DC591), Color(0xFFFFC278)).forEach { Box(Modifier.size(10.dp).clip(RoundedCornerShape(3.dp)).background(it)) } }
            }
        }
        Option(stringResource(Res.string.pearl_sweetness)) {
            sweetness.forEachIndexed { i, s -> PearlChip(s, selected = sweet == i, modifier = Modifier.weight(1f), accent = PearlColors.ink, padding = 2.dp) { sweet = i } }
        }
    }

    BoxWithConstraints(modifier.fillMaxSize().background(PearlColors.sheet).onGloballyPositioned { rootBox = it.boundsInRoot() }) {
        val wide = maxWidth >= 600.dp
        val scroll = rememberScrollState()
        if (wide) {
            // 펼친 폴더블 · 태블릿 — 왼쪽 무대에 컵, 오른쪽 패널에 고르기. 폴더블은 힌지가 가운데라 무대를 딱 반으로 두고, 패널 글자는 힌지에서 24dp 떨어진다
            val stageW = if (maxWidth < 1000.dp) maxWidth / 2 else maxWidth * 0.56f
            Row(Modifier.fillMaxSize()) {
                Box(Modifier.width(stageW).fillMaxHeight()) {
                    stage(Modifier.fillMaxSize(), 0.5f)
                    if (showBack) Box(Modifier.statusBarsPadding().padding(24.dp)) { BackButton(onBack) }
                }
                Box(Modifier.weight(1f).fillMaxHeight()) {
                    Column(
                        Modifier.fillMaxSize().verticalScroll(scroll).statusBarsPadding().padding(start = 24.dp, end = 24.dp, top = 20.dp, bottom = 104.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                    ) {
                        Row { Spacer(Modifier.weight(1f)); bagButton(false) }
                        options()
                    }
                    AddBar(Modifier.align(Alignment.BottomCenter))
                }
            }
        } else {
            val headerH = minOf(300.dp, maxHeight * 0.38f)
            Column(Modifier.fillMaxSize().verticalScroll(scroll)) {
                stage(Modifier.fillMaxWidth().height(headerH), 0.64f)
                Column(
                    Modifier
                        .offset(y = (-32).dp)
                        .clip(RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp))
                        .background(PearlColors.sheet)
                        .padding(start = 24.dp, end = 24.dp, top = 24.dp, bottom = 96.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) { options() }
            }
            // ← · 가방은 위에 붙어 있다 — 무대가 위로 지나가면 흰 바탕 위라 어두운 단추로 바뀐다
            val onDark = with(LocalDensity.current) { scroll.value < (headerH - 72.dp).toPx() }
            Row(Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 24.dp, vertical = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                if (showBack) BackButton(onBack, onDark)
                Spacer(Modifier.weight(1f))
                bagButton(onDark)
            }
            AddBar(Modifier.align(Alignment.BottomCenter))
        }
        // 담은 컵이 가방으로 — 컵 자리에서 출발해 포물선을 그리며 작아진다
        if (fly.value > 0f && cupBox != Rect.Zero && bagBox != Rect.Zero) {
            Canvas(Modifier.fillMaxSize()) {
                val t = fly.value
                val from = cupBox.center - rootBox.topLeft
                val to = bagBox.center - rootBox.topLeft
                val ctrl = Offset((from.x + to.x) / 2f, minOf(from.y, to.y) - 120.dp.toPx())
                val p = from * ((1 - t) * (1 - t)) + ctrl * (2 * t * (1 - t)) + to * (t * t)
                val s = 1f - 0.78f * t
                val w = cupBox.width * 0.5f * s
                val h = w * 1.4f
                translate(p.x - w / 2f, p.y - h / 2f) {
                    rotate(-24f * t, Offset(w / 2f, h / 2f)) { drawCup(drinkColors, Slosh(), area = androidx.compose.ui.geometry.Size(w, h)) }
                }
            }
        }
    }
}

// 화면에 하나 — 이 줄 하나로 ←를 가리킬 수 있다(touch --at)
@Composable
private fun BackButton(onBack: () -> Unit, onDark: Boolean = true) {
    PearlIconButton(DS.drawable.ic_back, stringResource(Res.string.pearl_back), tint = if (onDark) Color.White else PearlColors.ink, background = if (onDark) Color.White.copy(alpha = 0.22f) else PearlColors.muted, onClick = onBack)
}

@Composable
private fun Option(title: String, content: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = PearlType.label, color = PearlColors.ink)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}
