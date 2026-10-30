package com.example.pearl.feature.pearl

import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.model.menu
import com.example.pearl.core.ui.DrinkCard
import org.jetbrains.compose.ui.tooling.preview.Preview

// 옛 CMP 프로젝트가 쓰는 JetBrains @Preview — 직접 단 것 하나와 그것으로 만든 멀티 프리뷰(두 장), 모두 세 장이다.
private const val CARD_WIDTH = 200

@Preview(widthDp = CARD_WIDTH)
@Preview(widthDp = CARD_WIDTH, heightDp = 260)
annotation class LegacyCardPreviews

@Preview(widthDp = CARD_WIDTH)
@Composable
fun LegacyDrinkCardPreview() = PearlTheme { DrinkCard(menu[0], Modifier.padding(8.dp)) }

@LegacyCardPreviews
@Composable
fun LegacyDrinkCardsPreview() = PearlTheme { DrinkCard(menu[1], Modifier.padding(8.dp)) }
