@file:OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)

package com.example.pearl.compose.ablation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.Layout
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import kotlin.math.roundToInt

@Preview(name = "인셋과 높이 상태 갱신")
@Composable
fun ComposeGlobalPositionedAblation() = AblationScreen(useTopInset = true, updateHeightFromTitle = true)

@Preview(name = "높이 상태 갱신 없음")
@Composable
fun ComposeGlobalPositionedWithoutStateUpdate() = AblationScreen(useTopInset = true, updateHeightFromTitle = false)

@Preview(name = "상단 인셋 없음")
@Composable
fun ComposeGlobalPositionedWithoutTopInset() = AblationScreen(useTopInset = false, updateHeightFromTitle = true)

@Composable
private fun AblationScreen(useTopInset: Boolean, updateHeightFromTitle: Boolean) {
    val height = remember { mutableFloatStateOf(56f) }
    val density = LocalDensity.current
    val insetModifier = if (useTopInset) {
        Modifier.windowInsetsPadding(WindowInsets.systemBars.only(WindowInsetsSides.Top))
    } else {
        Modifier
    }
    val titleModifier = if (updateHeightFromTitle) {
        Modifier.onGloballyPositioned { coordinates ->
            height.floatValue = with(density) {
                coordinates.size.height.toFloat() + 28.dp.toPx()
            }
        }
    } else {
        Modifier
    }

    Column(Modifier.fillMaxSize().background(Color.White)) {
        Layout(
            modifier = Modifier.fillMaxWidth().then(insetModifier),
            content = { BasicText("연결 초대", titleModifier) },
        ) { measurables, constraints ->
            val title = measurables.single().measure(constraints.copy(minWidth = 0))
            val layoutHeight = height.floatValue.roundToInt()

            layout(constraints.maxWidth, layoutHeight) {
                title.placeRelative(
                    x = (constraints.maxWidth - title.width) / 2,
                    y = (layoutHeight - title.height) / 2,
                )
            }
        }
        Box(Modifier.fillMaxWidth().height(2.dp).background(Color.Red))
    }
}
