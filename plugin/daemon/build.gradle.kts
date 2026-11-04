// 루트에는 빌드 파일만 둔다 — 조립 · 테스트 · 설치 산출물은 :app, 층은 :entity · :domain · :adapter:infra · :adapter:entry, 공용 코덱은 :json(D-139 · D-140 · D-141).
// Kotlin · Metro 플러그인은 build-logic 이 컴파일 때 본 판과 같은 것을 여기서 모든 모듈의 클래스패스에 올린다.
plugins {
    alias(libs.plugins.kotlin.jvm) apply false
    alias(libs.plugins.metro) apply false
}
