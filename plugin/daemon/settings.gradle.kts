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

// 층마다 모듈 하나 — import 방향(adapter → domain → entity)을 컴파일러가 막는다(D-139). 배포는 루트의 prevue.jar 하나에 함께 담는다.
include(":entity", ":domain", ":adapter")
