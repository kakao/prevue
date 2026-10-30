package com.example.pearl.feature.pearl

import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.PreviewParameter
import androidx.compose.ui.tooling.preview.PreviewParameterProvider
import androidx.compose.ui.unit.dp
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.model.Kind
import com.example.pearl.core.model.menu
import com.example.pearl.core.ui.DrinkCard

// android.content.res.Configuration은 commonMain에 없다
private const val UI_MODE_NIGHT_YES = 0x20

// 한 파일에 프리뷰 서른 장 — Prevue 통합 테스트의 보드다. Prevue가 펼치는 갈래(상태 · @PreviewParameter · 멀티 프리뷰 ·
// 겹친 멀티 프리뷰 · 기기)를 한 번씩 섞는다. 카드 수는 통합 테스트가 기대하는 값이라 바꾸면 테스트도 본다.
// 보드는 정착을 기다리므로 일렁임은 모두 멈춘 채다 — 움직이는 장면은 showcase/ 의 README 장면이 쓴다.

@Preview(name = "라이트", showBackground = true, widthDp = 360, heightDp = 780)
@Preview(name = "다크", showBackground = true, widthDp = 360, heightDp = 780, uiMode = UI_MODE_NIGHT_YES)
@Preview(name = "큰 글자", showBackground = true, widthDp = 360, heightDp = 780, fontScale = 1.5f)
@Preview(name = "한국어", showBackground = true, widthDp = 360, heightDp = 780, locale = "ko")
annotation class PearlPreviews

@Preview(name = "작은 글자", showBackground = true, widthDp = 360, heightDp = 780, fontScale = 0.85f)
@Preview(name = "아주 큰 글자", showBackground = true, widthDp = 360, heightDp = 780, fontScale = 2f)
annotation class FontScalePreviews

// 어노테이션을 단 어노테이션 — 겹친 멀티 프리뷰
@FontScalePreviews
@Preview(name = "다크 · 한국어", showBackground = true, widthDp = 360, heightDp = 780, uiMode = UI_MODE_NIGHT_YES, locale = "ko")
annotation class AccessibilityPreviews

class KindProvider : PreviewParameterProvider<Kind> {
    override val values = Kind.entries.asSequence()
}

@Composable
private fun Themed(content: @Composable () -> Unit) = PearlTheme(content = content)

// ── 상태 ──

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun PearlListPreview() = Themed { PearlScreen(PearlUiState.Content(menu)) }

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun PearlEmptyPreview() = Themed { PearlScreen(PearlUiState.Content(emptyList())) }

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun PearlLoadingPreview() = Themed { PearlScreen(PearlUiState.Loading) }

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun PearlErrorPreview() = Themed { PearlScreen(PearlUiState.Error) }

@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun DrinkDetailPreview() = Themed { DrinkDetailScreen(menu.first { it.id == 1 }) }

// ── @PreviewParameter — 메뉴 갈래마다 한 장 ──

@Preview(showBackground = true, widthDp = 200)
@Composable
fun DrinkByKindPreview(@PreviewParameter(KindProvider::class) kind: Kind) = Themed {
    DrinkCard(menu.first { it.kind == kind }, Modifier.padding(8.dp))
}

// ── 멀티 프리뷰 — 화면 셋 × 넷 ──

@PearlPreviews
@Composable
fun PearlListThemesPreview() = Themed { PearlScreen(PearlUiState.Content(menu)) }

@PearlPreviews
@Composable
fun PearlErrorThemesPreview() = Themed { PearlScreen(PearlUiState.Error) }

@PearlPreviews
@Composable
fun DrinkDetailThemesPreview() = Themed { DrinkDetailScreen(menu.first { it.id == 4 }) }

// ── 겹친 멀티 프리뷰 — 셋 ──

@AccessibilityPreviews
@Composable
fun PearlAccessibilityPreview() = Themed { PearlScreen(PearlUiState.Content(menu.take(12))) }

// ── 기기 ──

@Preview(name = "폰", device = "id:pixel_7", showSystemUi = true)
@Composable
fun PearlPhonePreview() = Themed { PearlScreen(PearlUiState.Content(menu)) }

@Preview(name = "태블릿", device = "spec:width=1280dp,height=800dp,dpi=240", showBackground = true)
@Composable
fun PearlTabletPreview() = Themed { PearlScreen(PearlUiState.Content(menu), columns = 5) }

@Preview(name = "폴더블", device = "spec:width=673dp,height=841dp,dpi=420", showBackground = true)
@Composable
fun PearlFoldablePreview() = Themed { PearlScreen(PearlUiState.Content(menu), columns = 3) }

@Preview(name = "가로", device = "spec:width=891dp,height=411dp,dpi=420,orientation=landscape", showBackground = true)
@Composable
fun PearlLandscapePreview() = Themed { PearlScreen(PearlUiState.Content(menu), columns = 4) }
