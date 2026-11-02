// domain — 유스케이스 · 공유 상태 · 정책 · 모델 · 포트. entity와 코루틴만 안다 — adapter · 렌더러 · 컴파일러를 import하면 컴파일이 안 된다(D-139).
// JDK(AWT · 파일 시스템 호출)는 모듈로 못 막는다 — LayerRuleTest 가 막는다.
plugins {
    id("org.jetbrains.kotlin.jvm")
}

dependencies {
    api(project(":entity"))
    // 실행 때는 렌더러 jar 가 품은 kotlinx.coroutines 를 쓴다 — 컴파일만 같은 계열의 판에 댄다(루트와 같은 이유).
    compileOnly(libs.kotlinx.coroutines.renderer)
}
