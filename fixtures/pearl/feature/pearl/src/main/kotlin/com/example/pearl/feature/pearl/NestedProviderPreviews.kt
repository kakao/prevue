package com.example.pearl.feature.pearl

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider

// 중첩 클래스 제공자(Outer.Inner → Outer$Inner) — Prevue 통합 테스트가 값 개수(셋)만큼 카드가 서는지 본다. 보드와 따로 둬 카드 수를 건드리지 않는다.

class Providers {
    class Fruits : PreviewParameterProvider<String> {
        override val values = sequenceOf("사과", "배", "귤")
    }
}

@Preview(showBackground = true, widthDp = 200)
@Composable
fun NestedProviderPreview(@PreviewParameter(Providers.Fruits::class) fruit: String) = Text(fruit)
