// 테마 · 버튼 · 아이콘 — 아이콘과 갈래 이름은 CMP 리소스(composeResources)다.
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.kmp.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.compose.multiplatform)
}

kotlin {
    android {
        namespace = "com.example.pearl.core.designsystem"
        compileSdk = 37
        minSdk = 24
        compilerOptions.jvmTarget = JvmTarget.JVM_11
        androidResources.enable = true
    }
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        commonMain.dependencies {
            api(project(":core:model"))
            api(libs.compose.runtime)
            api(libs.compose.foundation)
            api(libs.compose.ui)
            api(libs.compose.material3)
            api(libs.compose.components.resources)
            api(libs.compose.ui.tooling.preview)
        }
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.example.pearl.core.designsystem.res"
}
