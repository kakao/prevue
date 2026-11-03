import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// kotlin-dsl 을 쓰지 않는다(D-140) — Gradle 내장 Kotlin 으로 컴파일하게 되어 kotlin-dsl 플러그인과 그 판의 컴파일러를
// 새로 받아야 하고, 래퍼를 올릴 때마다 되풀이된다. 데몬과 같은 Kotlin 으로 Plugin<Project> 클래스를 굽는다.
plugins {
    alias(libs.plugins.kotlin.jvm)
    `java-gradle-plugin`
}

// Gradle 을 돌리는 JDK 와 무관하게 굽는다 — 이 jar 는 Gradle 의 JVM 에 올라간다
tasks.withType<JavaCompile>().configureEach {
    options.release = 17
}
kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
        freeCompilerArgs.add("-Xjdk-release=17")
    }
}

dependencies {
    compileOnly(libs.kotlin.gradlePlugin)
}

// prevue.jvm — 바이트코드는 17로 고정하고 컴파일은 Gradle을 돌리는 JDK(21+)로 한다. 툴체인을 걸면 JDK 17이 따로 깔려 있어야 해서
// Android Studio의 JBR만 있는 맥에서 setup이 멈춘다(#22). 런타임만 21+가 필요하다 — layoutlib 17.0.x가 Java 21 바이트코드다.
// release · jdk-release는 API도 17로 묶는다 — Gradle을 돌린 JDK가 데몬의 JDK보다 새로워도 데몬에 없는 API를 부르지 않는다.
// prevue.coroutines — StateFlow·SharedFlow(D-42). 실행 때는 렌더러 jar 가 품은 kotlinx.coroutines 를 쓴다 — 따로 실으면 두 벌이 되어
// 클래스패스 순서가 렌더러 안의 코루틴을 바꿔 끼운다. 컴파일(본체 · 테스트)만 같은 계열의 판에 댄다. entity 는 코루틴도 모른다.
gradlePlugin {
    plugins {
        register("prevueJvm") {
            id = "prevue.jvm"
            implementationClass = "prevue.convention.PrevueJvmPlugin"
        }
        register("prevueCoroutines") {
            id = "prevue.coroutines"
            implementationClass = "prevue.convention.PrevueCoroutinesPlugin"
        }
    }
}
