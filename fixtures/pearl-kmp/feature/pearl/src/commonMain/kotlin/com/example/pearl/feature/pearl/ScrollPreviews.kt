package com.example.pearl.feature.pearl

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

// 목록 상태가 없는 스크롤(verticalScroll) — Prevue 통합 테스트가 `scroll` 응답의 나타남 · 사라짐을 시맨틱 내용으로 맞추는지 본다.
// 행마다 체크박스 역할 · 켜짐/꺼짐이 있어 시맨틱 읽기(role · toggleableState · click)도 함께 본다. 보드와 따로 둬 카드 수를 건드리지 않는다.

@Preview(widthDp = 300, heightDp = 400)
@Composable
fun ScrollColumnPreview() {
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
        repeat(30) { i ->
            Text(
                "행 $i",
                Modifier.fillMaxWidth().height(80.dp).toggleable(value = i % 2 == 0, role = Role.Checkbox, onValueChange = {}),
            )
        }
    }
}
