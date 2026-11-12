// 데몬 빌드(plugin/daemon)의 convention plugin 을 굽는 included build(D-140).
// 저장소 · 판은 데몬 빌드와 같은 것을 쓴다 — 업데이트 뒤 첫 warmup 이 받아 둔 것만으로(--offline) 굽는다.
pluginManagement {
    repositories {
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode = RepositoriesMode.FAIL_ON_PROJECT_REPOS
    repositories {
        // 컴파일러는 데몬 빌드가 Central 에서 받은 것을, Kotlin Gradle 플러그인은 플러그인 포털에서 받은 것을 그대로 쓴다.
        // 오프라인 캐시는 저장소마다 따로라 받은 곳과 같은 저장소로 찾아야 한다.
        mavenCentral()
        gradlePluginPortal()
    }
    versionCatalogs {
        create("libs") {
            from(files("../gradle/libs.versions.toml"))
        }
    }
}

rootProject.name = "build-logic"
