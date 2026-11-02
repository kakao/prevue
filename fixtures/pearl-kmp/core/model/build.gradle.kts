// 순수 Kotlin 모듈 — 프리뷰가 없는 모듈이 그래프에 섞인다.
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.kmp.library)
}

kotlin {
    android {
        namespace = "com.example.pearl.core.model"
        compileSdk = 37
        minSdk = 24
        compilerOptions.jvmTarget = JvmTarget.JVM_11
    }
    iosArm64()
    iosSimulatorArm64()
}
