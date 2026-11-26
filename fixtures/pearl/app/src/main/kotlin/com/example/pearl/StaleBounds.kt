package com.example.pearl

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
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

// 첫 배치 뒤 onGloballyPositioned 가 바 높이를 바꾼다 — 첫 렌더의 트리가 그 전 좌표로 남으면 빨간 선의 PNG 위치와 어긋난다
@Preview(name = "첫 배치 뒤 높이를 바꾸는 상단 바")
@Composable
fun StaleBoundsTopBar() {
    val height = remember { mutableFloatStateOf(56f) }
    val density = LocalDensity.current
    Column(Modifier.fillMaxSize().background(Color.White)) {
        Layout(
            modifier = Modifier.fillMaxWidth(),
            content = {
                BasicText(
                    "연결 초대",
                    Modifier.onGloballyPositioned { coordinates ->
                        height.floatValue = with(density) { coordinates.size.height.toFloat() + 28.dp.toPx() }
                    },
                )
            },
        ) { measurables, constraints ->
            val title = measurables.single().measure(constraints.copy(minWidth = 0))
            val layoutHeight = height.floatValue.roundToInt()
            layout(constraints.maxWidth, layoutHeight) {
                title.placeRelative(x = (constraints.maxWidth - title.width) / 2, y = (layoutHeight - title.height) / 2)
            }
        }
        Box(Modifier.fillMaxWidth().height(2.dp).background(Color.Red))
    }
}
