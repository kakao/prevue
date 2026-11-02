// Android 타깃이 없는 모듈 — 프리뷰는 Android 컴파일로 그리므로 Prevue는 이유를 말하고 멈춘다(앱이 담지 않는다).
plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.compose.multiplatform)
}

kotlin {
    jvm()
    iosArm64()
    iosSimulatorArm64()

    sourceSets {
        commonMain.dependencies {
            implementation(libs.compose.runtime)
            implementation(libs.compose.foundation)
            implementation(libs.compose.ui.tooling.preview)
        }
    }
}
