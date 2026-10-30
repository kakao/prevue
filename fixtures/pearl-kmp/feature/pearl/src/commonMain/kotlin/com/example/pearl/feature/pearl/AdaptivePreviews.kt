package com.example.pearl.feature.pearl

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.tooling.preview.Preview
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.model.menu

// 창 폭(screenWidthDp)으로 갈리는 화면 — 크기 덮어쓰기(focus --size · --device)가 레이아웃을 바꾸는지 보는 자리.
//   메뉴는 폭 220dp마다 한 열 — 폰 · 접은 커버 · 펼친 폴더블은 2~3열, 태블릿은 5열
//   상세는 600dp부터 왼쪽 무대에 컵, 오른쪽 패널에 고르기(DrinkDetailScreen) — 펼친 폴더블은 힌지가 가운데라 무대가 딱 반이다
// 앱은 접힘 정보(FoldingFeature)를 받지 않는다 — 폭만 본다. 고른 것은 번호로 들고 있어 접고 펴도 이어진다.
// 뷰어 테스트가 크기를 바꾸며 프레임을 재므로 기본은 일렁임을 멈춘다.
@Composable
fun AdaptivePearl(ambient: Boolean = false, open: Boolean = false) {
    var selected by rememberSaveable { mutableIntStateOf(menu[0].id) }
    var opened by rememberSaveable { mutableStateOf(open) }
    val drink = menu.first { it.id == selected }
    val width = screenWidthDp()
    if (opened) DrinkDetailScreen(drink, ambient = ambient, onBack = { opened = false })
    else DrinkFilterScreen(selected = drink, columns = maxOf(2, (width - 48) / 220), ambient = ambient, onSelect = { selected = it.id; opened = true })
}

@Preview(showBackground = true)
@Composable
fun AdaptivePearlPreview() = PearlTheme { AdaptivePearl() }

// 정적 렌더 한 장에서 containerSize를 처음 읽을 때부터 실제 폭인지 보는 자리 — 0으로 읽히면 2열로 그려진다.
@Preview(showBackground = true, widthDp = 1280, heightDp = 800)
@Composable
fun AdaptivePearlWidePreview() = PearlTheme { AdaptivePearl() }
