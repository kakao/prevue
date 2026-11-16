package com.example.pearl.feature.pearl

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider

// object 제공자 — 생성자가 private 이라 렌더러 · ui-tooling 이 바로 만들지 못한다. Prevue 통합 테스트가 값 개수(셋)만큼 카드가 서고 각자 그려지는지 본다. 보드와 따로 둬 카드 수를 건드리지 않는다.

private object Seasons : PreviewParameterProvider<String> {
    override val values = sequenceOf("봄", "여름이 오면", "가을 그리고 겨울")
}

@Preview(showBackground = true, widthDp = 200)
@Composable
fun ObjectProviderPreview(@PreviewParameter(Seasons::class) season: String) = Text(season)
