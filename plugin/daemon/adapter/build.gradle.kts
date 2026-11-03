// adapter — 입구(http · cli · browser · hotswap)와 포트를 구현하는 기술(render · compile · watch · source · dump · process). 렌더러 · layoutlib은 여기만 안다.
plugins {
    id("prevue.coroutines")
}

dependencies {
    api(project(":domain"))
    // 렌더러 jar 안의 옛 kotlin-reflect 보다 앞에 둔다 — :app 의 같은 줄과 같은 이유다.
    implementation(libs.kotlin.reflect)
    implementation(libs.renderer)
    implementation(libs.layoutlib)
}
