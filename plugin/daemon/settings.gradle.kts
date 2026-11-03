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

// 층마다 모듈 하나 — import 방향(adapter → domain → entity)을 컴파일러가 막는다(D-139). 배포는 :app 의 prevue.jar 하나에 함께 담는다.
// adapter 는 역할대로 둘(입구 entry · 기술 infra)이고 둘이 함께 쓰는 코덱이 :json 이다 — 입구가 기술을 import 하면 컴파일이 안 된다(D-141).
include(":entity", ":domain", ":json", ":adapter:infra", ":adapter:entry")
// 조립 · 테스트 · 설치 산출물. 루트는 빌드 파일만 갖는다(D-140) — installPrevue · test 는 태스크 이름으로 여기서 그대로 돈다.
include(":app")
