rootProject.name = "prevue"

dependencyResolutionManagement {
    repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS
    repositories {
        // 렌더러·layoutlib은 Google Maven, 컴파일러는 Central. 사내 저장소는 쓰지 않는다.
        google()
        mavenCentral()
    }
}
