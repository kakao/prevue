package com.example.pearl.feature.pearl

import androidx.compose.runtime.Composable

// 뒤로 가기는 플랫폼마다 다르다 — Prevue는 이 파일을 저장하면 컴파일하지 않고 Gradle 빌드가 필요하다고 멈춘다.
@Composable
expect fun PearlBackHandler(enabled: Boolean, onBack: () -> Unit)
