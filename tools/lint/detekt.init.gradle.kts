// tools/lint.sh 만 --init-script 로 건다. 제품 빌드(build.gradle.kts)에 두면 사용자의 `prevue setup --offline`이
// 이 플러그인을 캐시에서 못 찾아 깨진다 — 린트 도구가 부트스트랩을 막으면 안 된다.
// 플러그인은 프로젝트의 buildscript 클래스패스에 싣는다. init script 자기 클래스패스에 실으면 Kotlin 플러그인의 클래스를 못 본다.
// 판정은 스크립트가 하고 detekt 는 보고서만 쓴다(ignoreFailures).

rootProject {
    // detekt 플러그인을 buildscript 에 실으면 compileKotlin 의 구현 클래스패스가 바뀌어, 평소 빌드와 번갈아 돌 때마다
    // 서로 전체를 다시 컴파일하며 build/classes 를 덮어썼다 — 도중의 통합 테스트 JVM 이 클래스를 잃었다. 산출물을 따로 둔다.
    // 자리는 lint.py 가 -Pprevue.lintBuildDir 로 넘긴다 — 보고서 · 실행 기록 경로와 한 곳에서 맞춘다
    layout.buildDirectory.set(layout.projectDirectory.dir(providers.gradleProperty("prevue.lintBuildDir").get()))
    buildscript {
        repositories {
            gradlePluginPortal()
            mavenCentral()
        }
        dependencies {
            classpath("dev.detekt:detekt-gradle-plugin:2.0.0-alpha.6")
        }
    }
    afterEvaluate {
        apply(plugin = "dev.detekt")
        // init script 는 플러그인 클래스 없이 컴파일된다 — 확장은 이름으로 만진다.
        extensions.getByName("detekt").withGroovyBuilder {
            @Suppress("UNCHECKED_CAST")
            (getProperty("buildUponDefaultConfig") as Property<Boolean>).set(false)
            @Suppress("UNCHECKED_CAST")
            (getProperty("ignoreFailures") as Property<Boolean>).set(true)
            (getProperty("config") as ConfigurableFileCollection).setFrom(rootDir.resolve("../tools/lint/detekt.yml"))
        }
    }
}
