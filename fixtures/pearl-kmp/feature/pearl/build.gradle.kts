// 앱 화면 — 뒤로 가기만 플랫폼마다 다르다(expect/actual, BackHandler.kt).
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.kmp.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.compose.multiplatform)
}

kotlin {
    android {
        namespace = "com.example.pearl.feature.pearl"
        compileSdk = 37
        minSdk = 24
        compilerOptions.jvmTarget = JvmTarget.JVM_11
        androidResources.enable = true
    }
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        commonMain.dependencies {
            implementation(project(":core:ui"))
            implementation(libs.compose.components.ui.tooling.preview)
        }
        androidMain.dependencies {
            implementation(libs.androidx.activity.compose)
        }
    }
}

compose.resources {
    generateResClass = always
    packageOfResClass = "com.example.pearl.feature.pearl.res"
}
