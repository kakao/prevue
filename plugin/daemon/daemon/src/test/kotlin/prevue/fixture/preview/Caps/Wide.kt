@file:Suppress("PackageName", "PackageDirectoryMismatch")

package prevue.fixture.preview.Caps

import androidx.compose.ui.tooling.preview.Preview

/** 대문자 세그먼트가 있는 패키지의 최상위 멀티프리뷰 — 중첩(`Caps$Wide`)으로 읽으면 안 된다. */
@Preview(name = "wide", widthDp = 840)
annotation class Wide
