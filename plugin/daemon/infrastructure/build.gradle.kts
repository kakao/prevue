// infrastructure — 바깥(D-148). 부르는 쪽 controller/{http,cli,browser,hotswap}와 포트를 구현하는 기술(render · compile · watch · source · dump · process),
// 둘이 함께 쓰는 코덱 json, 작업 공간 저장 store, 그래프에 내놓는 바인딩 bindings. 렌더러 · layoutlib 은 여기만 안다. controller 가 기술 폴더를 모르는 것은 LayerRuleTest 가 막는다.
plugins {
    id("prevue.metro")
}

dependencies {
    api(project(":application"))
    // 렌더러 jar 안의 옛 kotlin-reflect 보다 앞에 둔다 — :daemon 의 같은 줄과 같은 이유다.
    implementation(libs.kotlin.reflect)
    implementation(libs.renderer)
    implementation(libs.layoutlib)
}
