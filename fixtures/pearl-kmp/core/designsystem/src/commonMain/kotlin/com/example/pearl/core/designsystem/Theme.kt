package com.example.pearl.core.designsystem

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * 밝은 판 하나 — 바탕 위에 흰 시트가 겹치고, 음료마다 사탕색 카드가 놓인다. 주황은 '고름 · 지금 · 행동'에만 쓴다.
 * 보조 글은 흰 바탕에서 읽히도록 레퍼런스의 회색보다 진하다.
 */
object PearlColors {
    val canvas = Color(0xFFFAF9F9)
    val sheet = Color(0xFFFFFFFF)
    val muted = Color(0xFFF6F6F5)
    val line = Color(0xFFEFEEEC)
    val forest = Color(0xFF00664F)
    val forestLight = Color(0xFF0B7A5F)
    val green = Color(0xFF4DC591)
    val orange = Color(0xFFFF7648)
    val orangeSoft = Color(0xFFFFEDE6)
    val orangeInk = Color(0xFFB83C14)
    val ink = Color(0xFF212525)
    val subtle = Color(0xFF6F7583)
    val pearl = Color(0xFF3B2622)
    val shadow = Color(0xFF050621)
}

/** 레퍼런스의 글자 단계 — 큰 숫자 44 · 제목 24 · 카드 16 · 소제목 14 · 메타 12. */
object PearlType {
    val display = TextStyle(fontSize = 44.sp, fontWeight = FontWeight.Medium)
    val title = TextStyle(fontSize = 24.sp, lineHeight = 32.sp, fontWeight = FontWeight.Bold)
    val price = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
    val card = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
    val label = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    val body = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium)
    val meta = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium)
    val nav = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
}

// 다크 판은 두지 않는다 — 보드의 다크 프리뷰도 같은 밝은 판으로 그린다
@Composable
fun PearlTheme(@Suppress("UNUSED_PARAMETER") darkTheme: Boolean = false, content: @Composable () -> Unit) {
    val scheme = lightColorScheme(
        primary = PearlColors.orange,
        background = PearlColors.canvas,
        onBackground = PearlColors.ink,
        surface = PearlColors.sheet,
        onSurface = PearlColors.ink,
    )
    MaterialTheme(colorScheme = scheme, content = content)
}
