package com.example.pearl.feature.pearl

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.rememberTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

// 켜지면 1초 동안 0 → 1로 차는 막대 — Prevue 통합 테스트가 `render --at`으로 API마다 그 시점의 프레임을 본다.
// 보드(PearlPreviews.kt)와 따로 둬 보드 카드 수를 건드리지 않는다.

@Composable
private fun FillBar(progress: Float) = Box(Modifier.width(200.dp).height(20.dp).background(Color.LightGray)) {
    Box(Modifier.fillMaxHeight().fillMaxWidth(progress).background(Color.Red))
}

@Preview(widthDp = 200, heightDp = 20)
@Composable
fun AnimatableBarPreview() {
    val progress = remember { Animatable(0f) }
    LaunchedEffect(Unit) { progress.animateTo(1f, tween(1000, easing = LinearEasing)) }
    FillBar(progress.value)
}

@Preview(widthDp = 200, heightDp = 20)
@Composable
fun TransitionBarPreview() {
    val state = remember { MutableTransitionState(false).apply { targetState = true } }
    val progress by rememberTransition(state).animateFloat({ tween(1000, easing = LinearEasing) }) { if (it) 1f else 0f }
    FillBar(progress)
}

@Preview(widthDp = 200, heightDp = 20)
@Composable
fun AnimateAsStateBarPreview() {
    var full by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { full = true }
    val progress by animateFloatAsState(if (full) 1f else 0f, tween(1000, easing = LinearEasing))
    FillBar(progress)
}

// delay는 실제 시계로 흘러 `render --at`이 밀지 못한다 — 그 사실을 응답이 알리는지 본다
@Preview(widthDp = 200, heightDp = 20)
@Composable
fun DelayedBarPreview() {
    var full by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { delay(500); full = true }
    FillBar(if (full) 1f else 0f)
}
