package com.example.pearl.feature.pearl

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider

// companion object 제공자와 기본값만 있는 생성자 인자 제공자 — Prevue 통합 테스트가 값 개수(셋 · 둘)만큼 카드가 서고 각자 그려지는지 본다. 보드와 따로 둬 카드 수를 건드리지 않는다.

class Tides {
    internal companion object : PreviewParameterProvider<String> {
        override val values = sequenceOf("밀물", "썰물이 지나면", "조금 그리고 사리")
    }
}

class Winds(private val size: Int = 2) : PreviewParameterProvider<String> {
    override val values = sequenceOf("하늬바람", "높새바람이 분다", "된바람").take(size)
}

@Preview(showBackground = true, widthDp = 200)
@Composable
fun CompanionProviderPreview(@PreviewParameter(Tides.Companion::class) tide: String) = Text(tide)

@Preview(showBackground = true, widthDp = 200)
@Composable
fun DefaultArgProviderPreview(@PreviewParameter(Winds::class) wind: String) = Text(wind)
