package com.example.pearl.feature.pearl

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalWindowInfo

// pearl은 LocalConfiguration.screenWidthDp를 읽는다 — commonMain에는 없어 창 크기에서 잰다.
@Composable
internal fun screenWidthDp(): Int = with(LocalDensity.current) { LocalWindowInfo.current.containerSize.width.toDp().value.toInt() }
