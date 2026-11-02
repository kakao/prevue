package com.example.pearl.feature.pearl.showcase

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.example.pearl.core.designsystem.PearlTheme
import com.example.pearl.core.model.menu
import com.example.pearl.feature.pearl.AdaptivePearl
import com.example.pearl.feature.pearl.PearlApp

// README 장면 — 컵의 수면이 천천히 일렁인다. 보드(PearlPreviews.kt)와 따로 둬 통합 테스트가 보는 카드 수 · 정착을 건드리지 않는다.

// 바텀 네비의 탭을 차례로 누르면 알약이 미끄러지고 글자가 펼쳐지며 화면이 바뀐다
@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun NavTourPreview() = PearlTheme { PearlApp(ambient = true) }

// 칩으로 거르고, 카드를 누르면 카드가 상세 화면으로 커진다. 담으면 컵이 가방으로 날아간다
@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun HomeTourPreview() = PearlTheme { PearlApp(ambient = true) }

// 상세에서 시작하는 앱 — ← 로 메뉴에 돌아간다. 컵을 끌면 음료가 출렁이고, 펄은 가라앉아 튀고, 얼음은 떠서 물결을 탄다
@Preview(showBackground = true, widthDp = 360, heightDp = 780)
@Composable
fun SipPreview() = PearlTheme { PearlApp(ambient = true, start = menu.first { it.id == 1 }) }

// 상세에서 시작한다 — 600dp부터 왼쪽 컵 · 오른쪽 패널로 갈리고, 펼친 폴더블은 힌지 자리에서 반반으로 나뉜다.
// 실기기는 접고 펴도 고른 것이 이어지지만(AdaptivePearl), Prevue 뷰어는 기기를 바꾸면 Preview를 처음부터 다시 그려 상태가 풀린다 — 그래서 처음부터 상세를 연다
@Preview(showBackground = true)
@Composable
fun DevicesPreview() = PearlTheme { AdaptivePearl(ambient = true, open = true) }
