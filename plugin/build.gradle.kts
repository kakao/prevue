import java.security.MessageDigest
import java.time.Duration

plugins {
    alias(libs.plugins.kotlin.jvm)
}

// 컴파일은 17로 된다. 런타임만 21+가 필요하다 — layoutlib 17.0.x가 Java 21 바이트코드다.
kotlin {
    jvmToolchain(17)
}

/**
 * 상주 컴파일러 브리지. kotlin-compiler-embeddable에만 컴파일되고 데몬 본체의 클래스패스에는
 * 들어가지 않는다 — 컴파일러의 클래스가 렌더러 쪽으로 새지 않게 격리 로더에 따로 올린다.
 */
val bridge: SourceSet = sourceSets.create("bridge")

/** 격리 로더에 올릴 컴파일러 jar들. 데몬의 클래스패스가 아니라 디렉터리로 조립해 넘긴다. */
val compilerToolchain: Configuration = configurations.create("compilerToolchain") {
    isCanBeConsumed = false
    isCanBeResolved = true
}

/** layoutlib 설치 디렉터리의 루트. build.prop과 data 디렉터리를 담고 있다. */
val layoutlibDist: Configuration = configurations.create("layoutlibDist") {
    isCanBeConsumed = false
    isCanBeResolved = true
    isTransitive = false
}

/** 그 자체가 framework_res.jar이다. */
val layoutlibResources: Configuration = configurations.create("layoutlibResources") {
    isCanBeConsumed = false
    isCanBeResolved = true
    isTransitive = false
}

// 화면 문장 영어 사전(viewer/strings/en.json)을 데몬이 읽는 Kotlin 표로 옮긴다 — 데몬이 CLI 로 내는 문장은 영어 한 벌이다(D-106 · D-109).
// 브라우저에는 키만 보내고 뷰어가 고른 언어로 채우므로 다른 언어의 사전은 데몬에 들어가지 않는다.
val screenText = tasks.register("screenText") {
    val dict = layout.projectDirectory.file("viewer/strings/en.json")
    val out = layout.buildDirectory.dir("generated/screenText")
    inputs.file(dict)
    outputs.dir(out)
    doLast {
        @Suppress("UNCHECKED_CAST")
        val entries = groovy.json.JsonSlurper().parse(dict.asFile, "UTF-8") as Map<String, String>
        fun esc(s: String) = s.replace("\\", "\\\\").replace("\"", "\\\"").replace("$", "\\$").replace("\n", "\\n")
        // 긴 문장은 조각을 이어 붙인다 — 생성물도 린트의 줄 길이(160)를 지난다.
        fun lit(s: String) = s.chunked(100).joinToString("\" +\n        \"", "\"", "\"") { esc(it) }
        val file = out.get().file("prevue/daemon/entity/ScreenTextTable.kt").asFile
        file.parentFile.mkdirs()
        file.writeText(buildString {
            append("package prevue.daemon.entity\n\ninternal val SCREEN_TEXT: Map<String, String> = mapOf(\n")
            entries.toSortedMap().forEach { (k, v) -> append("    ").append(lit(k)).append(" to ").append(lit(v)).append(",\n") }
            append(")\n")
        })
    }
}
sourceSets.main { kotlin.srcDir(screenText) }

dependencies {
    // 렌더러 jar는 옛 kotlin-reflect를 섀도잉 없이 품고 있다(`kotlin.reflect.jvm.internal.*` 2,163개).
    // 그 옛것은 stdlib 2.4의 @Metadata를 못 읽어 `@PreviewParameter` 경로에서 죽는다 —
    // RenderSandboxTransformTrampoline의 static 초기화가 reflect로 FilesKt.readText를 찾는다.
    // 같은 버전 reflect를 **앞에** 둬서 이기게 한다. 순서가 곧 해결책이라 이 줄은 renderer 위에 있어야 한다.
    implementation(libs.kotlin.reflect)
    implementation(libs.renderer)
    implementation(libs.layoutlib)
    // StateFlow·SharedFlow(D-42). 실행 때는 렌더러 jar 가 품은 kotlinx.coroutines 를 쓴다 — 따로 실으면 두 벌이 되어
    // 클래스패스 순서가 렌더러 안의 코루틴을 바꿔 끼운다. 컴파일만 같은 계열의 판에 댄다.
    compileOnly(libs.kotlinx.coroutines.renderer)
    testCompileOnly(libs.kotlinx.coroutines.renderer)
    // 가상 시계(runTest)만 싣는다 — 코어는 위와 같은 이유로 렌더러 jar 의 것을 쓴다.
    testImplementation(libs.kotlinx.coroutines.test) { isTransitive = false }
    // Flow 방출 단언. 코루틴 core 1.9.0 을 끌고 오면 렌더러 jar 의 것과 두 벌이 되고 오프라인 캐시에 루트 모듈도 없다 — 끊는다.
    testImplementation(libs.turbine) { isTransitive = false }

    "bridgeCompileOnly"(libs.kotlin.compiler.embeddable)

    compilerToolchain(libs.kotlin.compiler.embeddable)
    compilerToolchain(libs.kotlin.compose.plugin.embeddable)
    compilerToolchain(libs.kotlin.stdlib)
    compilerToolchain(libs.kotlin.script.runtime)
    compilerToolchain(libs.kotlin.reflect)
    compilerToolchain(libs.kotlin.daemon.embeddable)
    compilerToolchain(libs.kotlinx.coroutines.core.jvm)
    compilerToolchain(libs.jetbrains.annotations)

    layoutlibDist(libs.layoutlib.runtime)
    layoutlibResources(libs.layoutlib.resources)

    testImplementation(libs.junit.jupiter.api)
    testRuntimeOnly(libs.junit.jupiter.engine)
    testRuntimeOnly(libs.junit.platform.launcher)
}

tasks.test {
    useJUnitPlatform()
    // 계약(contract/*.json)을 다시 쓴다. 의도한 변화일 때만 — diff 가 커밋에 실린다.
    systemProperty("prevue.contract.update", providers.gradleProperty("contractUpdate").getOrElse("false"))
}

/**
 * 통합 테스트 — 진짜 layoutlib 으로 저장소 안 픽스처(`fixtures/pearl`)를 그린다(`src/integrationTest`). 덤프는 테스트가 `bin/prevue warmup` 으로 뜬다.
 * 로컬에서만 돈다: 툴체인 · Android SDK 가 있어야 하고, 없으면 건너뛴다. CI 는 단위 테스트(`test`)만 돈다. 가짜 포트(`fake/`)는 단위 쪽 것을 같이 쓴다.
 */
val integrationTest: SourceSet by sourceSets.creating {
    compileClasspath += sourceSets.test.get().output
    runtimeClasspath += sourceSets.test.get().output
}
configurations[integrationTest.implementationConfigurationName].extendsFrom(configurations.testImplementation.get())
configurations[integrationTest.compileOnlyConfigurationName].extendsFrom(configurations.testCompileOnly.get())
configurations[integrationTest.runtimeOnlyConfigurationName].extendsFrom(configurations.testRuntimeOnly.get())
// main 의 internal 을 단위 테스트처럼 본다.
kotlin.target.compilations.getByName("integrationTest").associateWith(kotlin.target.compilations.getByName("main"))

// 픽스처는 플러그인 밖(저장소 루트)에 있다 — 설치본에 실리지 않는다(D-123)
val pearlFixture: File = rootDir.resolve("../fixtures/pearl").canonicalFile

tasks.register<Test>("integrationTest") {
    description = "진짜 렌더러로 로더 공유 · 인터랙티브 회귀를 본다(로컬)"
    group = "verification"
    testClassesDirs = integrationTest.output.classesDirs
    classpath = integrationTest.runtimeClasspath
    useJUnitPlatform()
    dependsOn("installPrevue")
    // layoutlib 은 JDK 21+ 로 컴파일됐다 — 데몬과 같은 JDK · JVM 옵션으로 돈다(bin/prevue 의 RUN).
    val jdk = providers.environmentVariable("PREVUE_JDK").getOrElse("/Applications/Android Studio.app/Contents/jbr/Contents/Home")
    executable = "$jdk/bin/java"
    maxHeapSize = "3g"
    jvmArgs(
        "-XX:+UseG1GC", "-Djava.awt.headless=true",
        "--add-opens=java.base/java.lang=ALL-UNNAMED", "--add-opens=java.base/java.util=ALL-UNNAMED",
        "--add-opens=java.desktop/sun.awt.image=ALL-UNNAMED", "--add-opens=java.base/java.nio=ALL-UNNAMED",
    )
    systemProperty("prevue.root", rootDir.absolutePath)
    // 멈춘 렌더 · 정착 대기가 테스트를 끝없이 붙잡았다 — 상한을 넘으면 그 자리의 스택과 함께 실패한다.
    // 별도 스레드여야 인터럽트를 안 받는 대기에서도 제때 실패한다. 준비(@BeforeAll)는 warmup 10분 + 보드 채우기를 품는다.
    systemProperty("junit.jupiter.execution.timeout.thread.mode.default", "SEPARATE_THREAD")
    systemProperty("junit.jupiter.execution.timeout.testable.method.default", "3 m")
    systemProperty("junit.jupiter.execution.timeout.beforeall.method.default", "15 m")
    systemProperty("junit.jupiter.execution.timeout.afterall.method.default", "3 m")
    // 스레드가 끝내 안 풀려 JVM 이 남아도 태스크는 끝난다. 상한을 넘긴 스레드는 멈추지 않아 뒤 테스트가 줄줄이 3분씩 걸릴 수 있어
    // 준비 15분 + 테스트 수 × 3분보다 넉넉히 둔다 — 첫 실패의 스택은 그래도 보고서에 남는다
    timeout.set(Duration.ofMinutes(90))
    // 픽스처만 바꾼 PR(버전 올리기 포함)도 다시 돌아야 한다 — 그 PR이 곧 호환성 확인이다
    inputs.files(fileTree(pearlFixture) { exclude("**/build/**", "**/.gradle/**", "**/.kotlin/**", "local.properties") })
        .withPathSensitivity(PathSensitivity.RELATIVE).withPropertyName("pearlFixture")
}

/**
 * 받아서 풀기만 하는 것들은 **플러그인 디렉터리 밖**에 둔다.
 *
 * 플러그인은 `~/.claude/plugins/cache/<플러그인>/<버전>/` 에 깔리고 경로에 버전이 박힌다.
 * 툴체인을 그 안에 두면 버전을 올릴 때마다 317MB(layoutlib 251 + 컴파일러 66)를 다시 받고,
 * 옛 버전 디렉터리에도 같은 것이 그대로 남는다. 툴체인은 플러그인 버전과 무관하므로 홈에 둔다(NFR-10).
 *
 * 키를 둘로 가른 것은 한쪽만 올렸을 때 다른 쪽을 다시 받지 않게 하기 위해서다.
 */
// 자바의 user.home 과 셸의 $HOME 이 언제나 같지는 않다 — 컨테이너에서 실제로 갈렸다.
// prevue-env 를 읽는 쪽은 셸이므로 셸 기준에 맞춘다. 둘이 어긋나면 툴체인을 못 찾는다.
val home = File(System.getenv("HOME") ?: System.getProperty("user.home"))

// 홈 기준 상대 경로로 들고 있는다. prevue-env 에는 이 상대 경로를 HOME 변수와 함께 적어야
// 빌드한 머신과 실행하는 머신이 달라도 맞는다 — 미리 빌드한 것을 받아 쓰려면 필요하다.
val compilerRel = ".prevue/toolchain/compiler-${libs.versions.kotlin.get()}"
val layoutlibRel = ".prevue/toolchain/layoutlib-${libs.versions.layoutlib.data.get()}"

val compilerDir: Provider<Directory> = layout.dir(provider { File(home, compilerRel) })
val layoutlibDir: Provider<Directory> = layout.dir(provider { File(home, layoutlibRel) })

val syncCompilerJars = tasks.register<Sync>("syncCompilerJars") {
    description = "격리 로더가 읽을 컴파일러 jar들을 한 디렉터리에 모은다"
    from(compilerToolchain)
    into(compilerDir)
}

val assembleLayoutlibData = tasks.register<Sync>("assembleLayoutlibData") {
    description = "layoutlib 설치 디렉터리를 조립한다 — runtime jar가 루트고 resources jar가 framework_res.jar다"
    from({ zipTree(layoutlibDist.singleFile) })
    from(layoutlibResources) {
        into("data")
        rename { "framework_res.jar" }
    }
    into(layoutlibDir)
}

// 브리지는 우리 소스다. 공유 툴체인에 두면 플러그인 버전이 다른 둘이 서로를 덮어쓴다.
val bridgeJar = tasks.register<Jar>("bridgeJar") {
    description = "브리지를 jar 하나로 굽는다 — 데몬이 격리 로더에 통째로 올린다. 경로가 하나여야 한다"
    archiveFileName.set("prevue-bridge.jar")
    destinationDirectory.set(layout.buildDirectory)
    from(bridge.output)
}

// 데몬 본체. 우리 소스라 플러그인 안에 남는다 — 172KB 다.
tasks.jar {
    archiveFileName.set("prevue.jar")
}

/**
 * 서드파티 jar 는 **공유 툴체인**에 둔다. layoutlib·컴파일러와 같은 이유다(NFR-10) —
 * 플러그인은 버전마다 새 디렉터리에 깔리므로, 안에 두면 버전을 올릴 때마다 118MB 가 복제된다.
 *
 * 여태 클래스패스는 **빌드한 머신의 Gradle 캐시**를 절대 경로로 가리켰다.
 * 그래서 빌드 결과를 다른 머신에 줄 수 없었다 — 그것을 끊되, 플러그인을 불리지는 않는다.
 *
 * 디렉터리 이름은 jar 이름들의 해시다. 버전 하나를 골라 이름에 박으면 나머지가 바뀌어도
 * 자리가 그대로라 조용히 섞인다. 실제로 갈리는 것은 "어떤 jar 들의 모음인가"이므로 그것을 키로 쓴다.
 */
val depsRel: Provider<String> = provider {
    val names = configurations.getByName("runtimeClasspath").files.map { it.name }.sorted()
    val key = MessageDigest.getInstance("SHA-256")
        .digest(names.joinToString("\n").toByteArray())
        .take(4).joinToString("") { "%02x".format(it) }
    ".prevue/toolchain/lib-$key"
}
val depsDir: Provider<Directory> = layout.dir(depsRel.map { File(home, it) })

val syncRuntimeLibs = tasks.register<Sync>("syncRuntimeLibs") {
    description = "데몬이 읽을 서드파티 jar 를 공유 툴체인에 모은다"
    from(configurations.named("runtimeClasspath"))
    into(depsDir)
}

val prevueEnv = tasks.register("prevueEnv") {
    description = "bin/prevue가 읽을 경로들을 써 둔다"
    val envFile = layout.buildDirectory.file("prevue-env")
    // 순서를 여기서 읽는다. 이 컬렉션의 차례가 곧 클래스패스의 차례다.
    val runtimeClasspath = sourceSets.main.get().runtimeClasspath
    val ownJarName = tasks.jar.flatMap { it.archiveFileName }
    val bridgeArchive = bridgeJar.flatMap { it.archiveFile }

    // tasks.jar 를 빼먹으면 안 된다. 서드파티 jar 를 공유 툴체인으로 옮기면서 syncRuntimeLibs 에서
    // from(tasks.jar) 를 걷어냈는데, 그것이 jar 태스크를 끌어오던 유일한 고리였다 —
    // prevue-env 는 prevue.jar 를 가리키는데 아무도 굽지 않는 상태가 됐다(CI 가 잡았다).
    dependsOn(tasks.jar, bridgeJar, syncRuntimeLibs, syncCompilerJars, assembleLayoutlibData)
    inputs.files(runtimeClasspath, bridgeArchive)
    outputs.file(envFile)

    doLast {
        // 한 디렉터리에 모으므로 이름이 겹치면 하나가 조용히 사라진다. 그러느니 여기서 멈춘다.
        val deps = runtimeClasspath.filter { it.isFile && it.name.endsWith(".jar") }.map { it.name }
        deps.groupBy { it }.filterValues { it.size > 1 }.keys.let { dup ->
            require(dup.isEmpty()) { "공유 lib 에서 이름이 겹친다: $dup" }
        }

        // 셸이 풀 변수다. 코틀린 쪽에서 풀리면 안 된다.
        val d = "${'$'}"
        // 우리 jar 가 맨 앞, 나머지는 해석 순서 그대로 — reflect 가 renderer 보다 앞이어야 한다.
        val cp = listOf("${d}ROOT/build/libs/${ownJarName.get()}") +
            deps.map { "${d}HOME/${depsRel.get()}/$it" }

        envFile.get().asFile.writeText(
            buildString {
                appendLine("# ./gradlew installPrevue 가 만든다. 직접 고치지 않는다.")
                appendLine("# 값은 ${d}ROOT(플러그인 디렉터리)와 ${d}HOME 기준이다 — bin/prevue 가 읽을 때 풀린다.")
                appendLine("# 절대 경로를 적으면 빌드한 머신에서만 맞는다.")
                appendLine("# 우리 것만 ${d}ROOT 다. 나머지는 플러그인 버전과 무관해 공유 툴체인에 있다.")
                appendLine("PREVUE_CP=\"${cp.joinToString(":")}\"")
                appendLine("PREVUE_BRIDGE=\"${d}ROOT/build/${bridgeArchive.get().asFile.name}\"")
                appendLine("PREVUE_LAYOUTLIB=\"${d}HOME/$layoutlibRel\"")
                appendLine("PREVUE_COMPILER=\"${d}HOME/$compilerRel\"")
                appendLine("PREVUE_LIB=\"${d}HOME/${depsRel.get()}\"")
                appendLine("PREVUE_VIEWER=\"${d}ROOT/viewer\"")
            }
        )
    }
}

tasks.register("installPrevue") {
    group = "build"
    description = "데몬과 툴체인을 빌드해 bin/prevue가 쓸 수 있는 상태로 만든다"
    dependsOn(prevueEnv)
}
