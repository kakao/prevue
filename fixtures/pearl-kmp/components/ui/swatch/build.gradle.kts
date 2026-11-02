// included build의 KMP 모듈 — 앱은 좌표로 받고 루트 settings의 dependencySubstitution이 이 프로젝트로 바꾼다.
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.kmp.library)
}

kotlin {
    android {
        namespace = "com.example.pearl.components.swatch"
        compileSdk = 37
        minSdk = 24
        compilerOptions.jvmTarget = JvmTarget.JVM_11
    }
}
