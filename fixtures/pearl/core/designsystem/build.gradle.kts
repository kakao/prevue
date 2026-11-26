plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.pearl.core.designsystem"
    compileSdk {
        version = release(37) { minorApiLevel = providers.gradleProperty("pearlCompileSdkMinor").orNull?.toInt() ?: 0 }
    }
    defaultConfig {
        minSdk = 24
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    api(project(":core:model"))
    val bom = providers.gradleProperty("pearlComposeBom").orNull
    if (bom == null) api(platform(libs.androidx.compose.bom)) else api(platform("androidx.compose:compose-bom:$bom"))
    api(libs.androidx.compose.material3)
    api(libs.androidx.compose.ui)
    api(libs.androidx.compose.ui.graphics)
    api(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
