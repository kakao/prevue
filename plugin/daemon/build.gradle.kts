// 루트에는 빌드 파일만 둔다 — 조립 · 테스트 · 설치 산출물은 :daemon, 안쪽은 :application, 바깥은 :infrastructure(D-140 · D-148).
// Kotlin 플러그인은 build-logic 이 컴파일 때 본 판과 같은 것을, Metro 플러그인(build-logic 은 id 로만 적용한다 · Gradle 이 JDK 21+ 여야 풀린다)은 그 판을 여기서 모든 모듈의 클래스패스에 올린다.
plugins {
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.metro) apply false
}
