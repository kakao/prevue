plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.pearl.compose.ablation"
    compileSdk {
        version = release(37)
    }
    defaultConfig {
        applicationId = "com.example.pearl.compose.ablation"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
    }
    buildFeatures.compose = true
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.ui:ui")
    debugImplementation(libs.androidx.compose.ui.tooling)
}
