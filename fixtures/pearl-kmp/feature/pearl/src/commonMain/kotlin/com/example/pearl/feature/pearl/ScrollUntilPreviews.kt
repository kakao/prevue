package com.example.pearl.feature.pearl

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

// `scroll --until` 의 네 모양(LazyColumn · LazyRow · verticalScroll Column · horizontalScroll Row) — Prevue 통합 테스트가 텍스트 · 소스 줄
// 대상에서 멈추고 found.at 으로 누른 칸이 맞는지 본다. 칸 글자는 "<n>번"(1부터)이라 소스 줄 #N 과 같은 수다. 누르면 " 선택됨"이 붙는다.
// 보드와 따로 둬 카드 수를 건드리지 않는다.

@Composable
private fun Cell(n: Int, picked: Int, onPick: (Int) -> Unit, modifier: Modifier) {
    Text(
        if (picked == n) "${n}번 선택됨" else "${n}번",
        modifier.selectable(selected = picked == n, onClick = { onPick(n) }),
    )
}

@Preview(widthDp = 300, heightDp = 400)
@Composable
fun UntilLazyColumnPreview() {
    var picked by remember { mutableIntStateOf(0) }
    LazyColumn(Modifier.fillMaxWidth()) {
        items(100) { i ->
            Cell(i + 1, picked, { picked = it }, Modifier.fillMaxWidth().height(64.dp))
        }
    }
}

@Preview(widthDp = 300, heightDp = 200)
@Composable
fun UntilLazyRowPreview() {
    var picked by remember { mutableIntStateOf(0) }
    LazyRow(Modifier.fillMaxWidth()) {
        items(40) { i ->
            Cell(i + 1, picked, { picked = it }, Modifier.width(96.dp).fillMaxHeight())
        }
    }
}

@Preview(widthDp = 300, heightDp = 400)
@Composable
fun UntilColumnPreview() {
    var picked by remember { mutableIntStateOf(0) }
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
        repeat(40) { i ->
            Cell(i + 1, picked, { picked = it }, Modifier.fillMaxWidth().height(64.dp))
        }
    }
}

@Preview(widthDp = 300, heightDp = 200)
@Composable
fun UntilRowPreview() {
    var picked by remember { mutableIntStateOf(0) }
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState())) {
        repeat(40) { i ->
            Cell(i + 1, picked, { picked = it }, Modifier.width(96.dp).fillMaxHeight())
        }
    }
}
