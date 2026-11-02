package com.example.pearl.core.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.pearl.core.designsystem.PearlColors
import com.example.pearl.core.designsystem.PearlIconButton
import com.example.pearl.core.designsystem.PearlType
import com.example.pearl.core.designsystem.res.*
import com.example.pearl.core.designsystem.res.Res as DS

/**
 * 가방 버튼과 잔 수 배지 — 배지는 버튼 모서리 밖으로 살짝 나온다(음수 치수). [bounce]는 컵이 날아와 닿을 때 배지를 튀기는 배율이다.
 * [ring]은 배지 테 색 — 버튼이 놓인 바탕과 같게 한다.
 */
@Composable
fun BagButton(count: Int, contentDescription: String, modifier: Modifier = Modifier, onDark: Boolean = true, ring: Color = PearlColors.forest, bounce: Float = 1f, onClick: () -> Unit = {}) {
    val overlap = (-3).dp
    Box(modifier) {
        PearlIconButton(
            DS.drawable.ic_bag,
            contentDescription,
            tint = if (onDark) Color.White else PearlColors.ink,
            background = if (onDark) Color.White.copy(alpha = 0.16f) else PearlColors.muted,
            onClick = onClick,
        )
        if (count > 0) {
            Box(
                Modifier
                    .align(Alignment.TopEnd)
                    .offset(x = -overlap, y = overlap)
                    .graphicsLayer { scaleX = bounce; scaleY = bounce }
                    .defaultMinSize(minWidth = 20.dp, minHeight = 20.dp)
                    .border(2.dp, ring, RoundedCornerShape(10.dp))
                    .background(PearlColors.orange, RoundedCornerShape(10.dp))
                    .padding(horizontal = 5.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text("$count", style = PearlType.meta.copy(fontSize = 11.sp, lineHeight = 14.sp), color = Color.White)
            }
        }
    }
}
