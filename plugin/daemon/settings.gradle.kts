// 모듈 공통 설정(바이트코드 17 · 코루틴 판)은 build-logic 의 convention plugin 이 갖는다(D-140)
pluginManagement {
    includeBuild("build-logic")
}

rootProject.name = "prevue"

dependencyResolutionManagement {
    repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS
    repositories {
        // 렌더러·layoutlib은 Google Maven, 컴파일러는 Central. 사내 저장소는 쓰지 않는다.
        google()
        mavenCentral()
    }
}

// 헥사고날 두 원(D-148) — 의존 방향(:infrastructure → :application)을 컴파일러가 막는다. 배포는 :daemon 의 prevue.jar 하나에 함께 담는다.
include(":application", ":infrastructure")
// 조립 · 테스트 · 설치 산출물. 루트는 빌드 파일만 갖는다(D-140) — installPrevue · test 는 태스크 이름으로 여기서 그대로 돈다.
include(":daemon")
