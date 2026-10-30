package com.example.pearl.feature.pearl

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

// 목록 → 상세를 공유 요소 전환으로 오간다 — Prevue 통합 테스트가 이 프리뷰의 트리와 `touch --at`을 본다.
// SharedTransitionLayout 안의 LookaheadScope 가 늘 '배치 안 됨'으로 답하는 가상 노드를 만들어, 그 아래 화면이 트리에서 잘렸다.
@OptIn(ExperimentalSharedTransitionApi::class)
@Preview(widthDp = 200, heightDp = 300)
@Composable
fun SharedTransitionPreview() {
    var open by remember { mutableStateOf(false) }
    SharedTransitionLayout {
        AnimatedContent(open, label = "shared") { detail ->
            if (!detail) {
                Column(Modifier.fillMaxSize()) {
                    Text("list", Modifier.padding(8.dp))
                    Box(
                        Modifier
                            .sharedElement(rememberSharedContentState("ball"), this@AnimatedContent)
                            .size(40.dp)
                            .background(Color.Red)
                            .clickable { open = true },
                    )
                }
            } else {
                Column(Modifier.fillMaxSize()) {
                    Box(Modifier.sharedElement(rememberSharedContentState("ball"), this@AnimatedContent).size(120.dp).background(Color.Red))
                    Text("detail", Modifier.padding(8.dp))
                }
            }
        }
    }
}
