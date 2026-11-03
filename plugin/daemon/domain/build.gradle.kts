// domain — 유스케이스 · 공유 상태 · 정책 · 모델 · 포트. entity와 코루틴만 안다 — adapter · 렌더러 · 컴파일러를 import하면 컴파일이 안 된다(D-139).
// JDK(AWT · 파일 시스템 호출)는 모듈로 못 막는다 — LayerRuleTest 가 막는다.
plugins {
    id("prevue.coroutines")
}

dependencies {
    api(project(":entity"))
}
