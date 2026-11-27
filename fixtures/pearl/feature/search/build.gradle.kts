plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.example.pearl.feature.search"
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
    implementation(project(":core:ui"))
    debugImplementation(libs.androidx.compose.ui.tooling)
}
