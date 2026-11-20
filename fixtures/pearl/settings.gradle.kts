// Prevue 통합 테스트의 대상 — 도구 빌드와 떨어진 독립 프로젝트다(README.md).
pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\.android.*")
                includeGroupByRegex("com\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "Pearl"
include(":app")
include(":legacy")
include(":compose-ablation")
include(":core:model")
include(":core:designsystem")
include(":core:ui")
include(":feature:pearl")
include(":feature:search")
