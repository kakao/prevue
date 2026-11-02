package com.example.pearl.feature.pearl

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable

@Composable
actual fun PearlBackHandler(enabled: Boolean, onBack: () -> Unit) = BackHandler(enabled, onBack)
