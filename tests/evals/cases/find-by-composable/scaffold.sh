#!/bin/bash
# 대상 저장소 흉내 — Badge 는 정의 파일에 Preview 가 없고, 다른 파일의 Preview 가 부른다. 이름과 파일이 달라 파일 이름으로는 바로 안 잡힌다.
set -e
mkdir -p app/src/main/kotlin/ui app/src/main/kotlin/home
touch gradlew settings.gradle.kts app/build.gradle.kts
cat > app/src/main/kotlin/ui/Badge.kt <<'KT'
package demo.ui

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

@Composable
fun Badge(count: Int) {
    Text(text = if (count > 99) "99+" else count.toString())
}
KT
cat > app/src/main/kotlin/home/HomePreviews.kt <<'KT'
package demo.home

import androidx.compose.foundation.layout.Row
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import demo.ui.Badge

@Preview
@Composable
fun BadgeRowPreview() {
    Row {
        Badge(count = 3)
        Badge(count = 120)
    }
}
KT
