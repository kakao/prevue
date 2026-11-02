package prevue.daemon.adapter.dump

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** 덤프 둘(모듈 · 앱)에서 렌더·컴파일·감시의 인자를 끌어내는 규칙. 경로 모양은 nowinandroid 덤프를 줄인 것이다. */
class ClasspathSpecTest {
    private val root = Files.createTempDirectory("prevue-spec").toFile().canonicalFile
    @AfterEach fun tearDown() { root.deleteRecursively() }

    /** 모듈 덤프는 자기 산출물을 컴파일 디렉터리로, 앱 덤프는 묶은 jar로 싣는다. */
    private fun out(module: String, kind: String, name: String = module.substringAfterLast('/')): String =
        File(root, "$module/build/$kind").apply {
            if (kind.endsWith(".jar")) { parentFile.mkdirs(); writeText("") }
            else { File(this, "META-INF").mkdirs(); File(this, "META-INF/$name.kotlin_module").writeText("") }
        }.path
    private val libClasses = out("feature/foryou", "classes", "impl")
    private val libR = out("feature/foryou", "R.jar")
    private val dsClasses = out("core/designsystem", "classes")
    private val dsJar = out("core/designsystem", "classes.jar")
    private val uiClasses = out("core/ui", "classes")
    private val appClasses = out("app", "classes")
    private val appR = out("app", "R.jar")
    private val libJar = out("feature/foryou", "classes.jar")
    init { listOf("feature/foryou", "core/designsystem", "core/ui").forEach { File(root, "$it/src/main/kotlin").mkdirs() } }

    private fun spec(project: String, cp: List<String>, pcp: List<String>, compile: List<String>, r: List<String>, apk: String = "") =
        ClasspathSpec(File(root, "$project.json"), project, "debug", "", apk, DumpPaths(classPath = cp, projectClassPath = pcp, compileClassPath = compile, rClassJars = r, resourceDirs = emptyList()))

    private val home = spec(":feature:foryou", listOf(libR, libClasses, uiClasses, dsClasses, "/m2/compose-alpha.jar"),
        listOf(libR, libClasses, uiClasses, dsClasses), listOf("/m2/compose-alpha.jar"), listOf(libR))
    private val app = spec(":app", listOf(appR, appClasses, libJar, dsJar, "/m2/compose-beta.jar"),
        listOf(appR, appClasses, libJar, dsJar), listOf(dsJar, "/m2/compose-beta.jar"), listOf(appR), apk = "app.ap_")
    private val overlay = File(root, "overlay")

    // D-38 · 기준 6. 라이브러리도 앱의 판으로 그린다. 자기 컴파일 디렉터리는 앱의 jar보다 앞이다 — 그 모듈만 컴파일하면 jar는 낡는다.
    @Test fun `Kotlin 컴파일의 표지는 kotlin_module과 jar이고 자기 R jar와 표지 없는 디렉터리는 보지 않는다`() {
        val javac = File(root, "feature/foryou/build/javac").apply { mkdirs() }.path   // Kotlin을 다시 컴파일하지 않고도 다시 쓰인다
        val s = spec(":feature:foryou", listOf(libR, libClasses, javac), listOf(libR, libClasses, javac), emptyList(), listOf(libR))
        assertEquals(listOf(File(libClasses, "META-INF/impl.kotlin_module")), s.kotlinBuildMarkers())
        // 리소스를 빌린 덤프는 자기 R.jar가 rClassJars에 없다 — 이름으로도 뺀다
        assertEquals(listOf(File(libClasses, "META-INF/impl.kotlin_module")), s.withResourcesFrom(app).kotlinBuildMarkers())
        // 앱 덤프는 의존 모듈을 묶은 jar로 싣는다 — 묶기는 컴파일 뒤다
        assertEquals(listOf(File(libJar)), spec(":feature:foryou", listOf(libJar), listOf(libJar), emptyList(), emptyList()).kotlinBuildMarkers())
    }

    // #21. JVM 21 모듈의 inline 함수는 17 타깃 코드에 인라인되지 않는다 — Gradle이 구운 클래스의 버전을 따른다.
    @Test fun `핫 컴파일의 jvm-target 은 Gradle 이 구운 Kotlin 클래스의 버전을 따르고 클래스가 없으면 17이다`() {
        fun header(major: Int, kotlin: Boolean = true) =
            byteArrayOf(0xCA.toByte(), 0xFE.toByte(), 0xBA.toByte(), 0xBE.toByte(), 0, 0, (major shr 8).toByte(), major.toByte()) +
                (if (kotlin) "Lkotlin/Metadata;" else "Ljava/lang/Object;").toByteArray()
        File(libClasses, "com/example/Retry.class").apply { parentFile.mkdirs(); writeBytes(header(65)) }
        // javac 산출물(BuildConfig 등)은 compileOptions의 타깃이라 Kotlin 타깃과 다를 수 있다 — 앞에 와도 보지 않는다
        val javac = File(root, "feature/foryou/build/javac").apply { mkdirs(); File(this, "BuildConfig.class").writeBytes(header(61, kotlin = false)) }.path
        assertEquals("21", spec(":feature:foryou", listOf(libR, javac, libClasses), listOf(libR, javac, libClasses), emptyList(), listOf(libR)).jvmTarget)
        assertEquals("17", spec(":core:ui", listOf(uiClasses), listOf(uiClasses), emptyList(), emptyList()).jvmTarget)
        File(uiClasses, "com/example/Old.class").apply { parentFile.mkdirs(); writeBytes(header(52)) }
        assertEquals("17", spec(":core:ui", listOf(uiClasses), listOf(uiClasses), emptyList(), emptyList()).jvmTarget)

        val jar = File(root, "core/designsystem/build/full.jar")
        java.util.zip.ZipOutputStream(jar.outputStream()).use { z ->
            z.putNextEntry(java.util.zip.ZipEntry("META-INF/designsystem.kotlin_module")); z.closeEntry()
            z.putNextEntry(java.util.zip.ZipEntry("com/example/J.class")); z.write(header(61, kotlin = false)); z.closeEntry()
            z.putNextEntry(java.util.zip.ZipEntry("com/example/Ds.class")); z.write(header(65)); z.closeEntry()
        }
        assertEquals("21", spec(":core:designsystem", listOf(jar.path), listOf(jar.path), emptyList(), emptyList()).jvmTarget)
        // 데몬이 돌리는 JVM보다 높게 굽지 않는다 — 그런 클래스는 어차피 올릴 수 없다
        File(root, "core/designsystem/build/far.jar").also { far ->
            java.util.zip.ZipOutputStream(far.outputStream()).use { z -> z.putNextEntry(java.util.zip.ZipEntry("F.class")); z.write(header(44 + 99)); z.closeEntry() }
            assertEquals(Runtime.version().feature().toString(), spec(":core:designsystem", listOf(far.path), listOf(far.path), emptyList(), emptyList()).jvmTarget)
        }
        assertEquals(null, classMajor(byteArrayOf(0, 0, 0, 0, 0, 0, 0, 65)))
    }

    @Test fun `앱이 담은 모듈은 앱 클래스패스로 그리고 자기 산출물을 앞에 둔다`() {
        val (r, onApp) = ClasspathSpec.forRender(home, app, overlay)
        assertTrue(onApp)
        assertEquals(listOf(overlay.path, libClasses) + app.classPath, r.classPath)
        assertEquals("app.ap_", r.resourceApkPath)
        assertFalse("/m2/compose-alpha.jar" in r.classPath)
        assertEquals(":app", r.borrowedFrom)
    }

    @Test fun `앱이 안 담은 모듈은 모듈 클래스패스에 리소스만 빌린다`() {
        val other = spec(":app", listOf(appR, appClasses, "/m2/compose-beta.jar"), listOf(appR, appClasses), emptyList(), listOf(appR), apk = "app.ap_")
        val (r, onApp) = ClasspathSpec.forRender(home, other, overlay)
        assertFalse(onApp)
        assertEquals(overlay.path, r.classPath.first())
        assertTrue(libClasses in r.classPath && "/m2/compose-alpha.jar" in r.classPath)
        assertFalse(libR in r.classPath)                          // 같은 R이 두 벌이면 InnerClasses 충돌로 죽는다
    }

    // Q4. 덤프 없는 의존 모듈은 앱 덤프에서 — 런타임 jar로는 최상위 함수를 못 찾아 compileClassPath이고, 자기 R은 앱 R.jar에 있다.
    @Test fun `의존 모듈의 컴파일 인자는 앱 덤프에서 끌어낸다`() {
        val ds = app.dependency(":core:designsystem")
        assertEquals(listOf(dsJar), ds.ownClassPath)
        assertEquals(listOf(dsJar, "/m2/compose-beta.jar", appR), ds.compileClassPath)
        assertEquals(File(root, "core/designsystem"), ds.moduleDir)
        assertEquals(":app", ds.derivedFrom)                        // 실패하면 그 모듈의 덤프를 권하는 근거다
        assertEquals(null, app.derivedFrom)
    }

    @Test fun `덤프 JSON 의 필드를 그대로 싣고 compileClassPath 가 없으면 거절한다`() {
        val json = File(root, "foryou.json").apply {
            writeText(
                """{"project":":feature:foryou","variant":"demoDebug","namespace":"ns","resourceApkPath":"x.ap_",
                "classPath":["$libClasses","/m2/a.jar"],"projectClassPath":["$libClasses"],"compileClassPath":["/m2/a.jar"],
                "rClassJars":["$libR"],"resourceDirs":["/res"]}""",
            )
        }
        val s = ClasspathSpec.load(json)
        assertEquals(json, s.file)
        assertEquals(listOf(":feature:foryou", "demoDebug", "ns", "x.ap_"), listOf(s.project, s.variant, s.namespace, s.resourceApkPath))
        assertEquals(listOf(libClasses, "/m2/a.jar"), s.classPath)
        assertEquals(listOf(libClasses), s.projectClassPath)
        assertEquals(listOf("/m2/a.jar"), s.compileClassPath)
        assertEquals(listOf(libR), s.rClassJars)
        assertEquals(listOf("/res"), s.resourceDirs)
        assertEquals(listOf(libClasses), s.ownClassPath)
        assertEquals(listOf(null, 0, null), listOf(s.borrowedFrom, s.borrowedCount, s.derivedFrom))
        assertEquals(emptyList<String>(), s.compileFill)

        val minimal = File(root, "min.json").apply { writeText("""{"project":":x","projectClassPath":["$root/x/build/classes"],"compileClassPath":["/m2/a.jar"]}""") }
        val m = ClasspathSpec.load(minimal)
        assertEquals(listOf("debug", "", ""), listOf(m.variant, m.namespace, m.resourceApkPath))

        val old = File(root, "old.json").apply { writeText("""{"project":":x","projectClassPath":["$root/x/build/classes"],"classPath":["/m2/a.jar"]}""") }
        assertTrue(runCatching { ClasspathSpec.load(old) }.exceptionOrNull()?.message.orEmpty().contains("compileClassPath가 없다"))
    }

    @Test fun `리소스를 빌린 덤프는 무엇을 얼마나 빌렸는지 싣고 컴파일은 자기 산출물로 한다`() {
        val other = spec(":app", listOf(appR, appClasses, "/m2/compose-beta.jar"), listOf(appR, appClasses), emptyList(), listOf(appR), apk = "app.ap_")
        val r = home.withResourcesFrom(other)
        assertEquals(":app", r.borrowedFrom)
        assertEquals(2, r.borrowedCount)
        assertEquals(listOf(libClasses, uiClasses, dsClasses, "/m2/compose-alpha.jar", appR, appClasses, "/m2/compose-beta.jar"), r.classPath)
        assertEquals(listOf(libClasses, uiClasses, dsClasses, appR, appClasses), r.projectClassPath)
        assertEquals(home.compileClassPath, r.compileClassPath)
        assertEquals(listOf(appR), r.rClassJars)
        assertEquals(home.ownClassPath, r.ownClassPath)
        assertEquals(null, r.derivedFrom)

        val nothing = spec(":app", listOf(appR), listOf(appR), emptyList(), listOf(appR), apk = "app.ap_")
        val n = home.withResourcesFrom(nothing)
        assertEquals(null, n.borrowedFrom)
        assertEquals(0, n.borrowedCount)
    }

    @Test fun `그릴 덤프의 빌린 수는 앱 클래스패스면 모듈에 없는 앱 항목 전부다`() {
        val (onApp, _) = ClasspathSpec.forRender(home, app, overlay)
        assertEquals((app.classPath.toSet() - home.classPath.toSet()).size, onApp.borrowedCount)
        assertEquals(app.compileClassPath, onApp.compileClassPath)
        assertEquals(null, onApp.derivedFrom)
        val other = spec(":app", listOf(appR, appClasses, "/m2/compose-beta.jar"), listOf(appR, appClasses), emptyList(), listOf(appR), apk = "app.ap_")
        val (borrowing, _) = ClasspathSpec.forRender(home, other, overlay)
        assertEquals(home.withResourcesFrom(other).borrowedCount, borrowing.borrowedCount)
        val (alone, onAlone) = ClasspathSpec.forRender(home, null, overlay)
        assertFalse(onAlone)
        assertEquals(listOf(null, 0), listOf(alone.borrowedFrom, alone.borrowedCount))
        assertEquals(listOf(overlay.path) + home.classPath, alone.classPath)
    }

    @Test fun `끌어낸 의존 모듈은 출처 덤프의 경로와 리소스를 쓰고 namespace 는 비운다`() {
        val ds = app.dependency(":core:designsystem")
        assertEquals(listOf(":core:designsystem", "debug", "", "app.ap_"), listOf(ds.project, ds.variant, ds.namespace, ds.resourceApkPath))
        assertEquals(app.classPath, ds.classPath)
        assertEquals(app.projectClassPath, ds.projectClassPath)
        assertEquals(app.rClassJars, ds.rClassJars)
        assertEquals(app.file, ds.file)
        assertEquals(listOf(null, 0), listOf(ds.borrowedFrom, ds.borrowedCount))

        val withNs = File(root, "app-ns.json").apply {
            writeText(
                """{"project":":app","namespace":"demo.app","resourceApkPath":"app.ap_","classPath":["$appClasses","$dsJar"],
                "projectClassPath":["$appClasses","$dsJar"],"compileClassPath":["$dsJar"],"rClassJars":[]}""",
            )
        }
        assertEquals("", ClasspathSpec.load(withNs).dependency(":core:designsystem").namespace)
    }

    // Q5. 감시는 보여 주는 모듈과 그 프로젝트 의존. 의존 먼저 — 클래스패스 순서(소비자 먼저)를 뒤집는다. 소스 루트 없는 모듈은 감시할 것이 없다.
    @Test fun `감시 그래프는 의존 먼저이고 렌더 모듈이 마지막이다`() {
        val g = WatchGraph.of(home, app)
        assertEquals(listOf(":core:designsystem", ":core:ui", ":feature:foryou"), g.nodes.map { it.path })
        assertEquals(listOf(File(libClasses)), g.nodes.last().outputs)   // 자기 R.jar는 산출물이 아니라 리소스다
        assertEquals(listOf(":core:designsystem"), g.builtBy(listOf(File(dsJar))))
    }

    // 기준 3. 앱 렌더러는 앱이 담은 모듈 전부를 감시·컴파일한다 — 덤프에 모듈 사이 의존이 없어 고를 수 없다. 앱은 모두의 소비자라 맨 뒤다.
    @Test fun `앱 렌더러의 감시 그래프는 앱이 담은 모듈 전부와 앱이다`() {
        File(root, "app/src/main/kotlin").mkdirs()
        val g = WatchGraph.ofApp(home, app)
        assertEquals(listOf(":core:designsystem", ":feature:foryou", ":app"), g.nodes.map { it.path })   // core:ui는 앱에 없다
        assertEquals(":feature:foryou", g.home)
        assertEquals(listOf(File(appClasses)), g.node(":app")!!.outputs)            // 앱 R.jar는 리소스다
    }

    @Test fun `KMP 모듈은 덤프가 적은 Android 컴파일의 소스 세트를 감시한다`() {
        val shared = out("shared", "classes.jar")
        val common = File(root, "shared/src/commonMain/kotlin").apply { mkdirs() }
        val android = File(root, "shared/src/androidMain/kotlin").apply { mkdirs() }
        File(root, "shared/src/iosMain/kotlin").mkdirs()
        val json = File(root, "app-kmp.json").apply {
            writeText("""{"project":":app","variant":"debug","resourceApkPath":"app.ap_",
                "classPath":["$appR","$appClasses","$shared"],"projectClassPath":["$appR","$appClasses","$shared"],
                "compileClassPath":["/m2/c.jar"],"rClassJars":["$appR"],"resourceDirs":[],
                "kmpSourceRoots":{":shared":["$android","$common","${File(root, "shared/src/gone/kotlin")}"]}}""")
        }
        val kmpApp = ClasspathSpec.load(json)
        val g = WatchGraph.ofApp(kmpApp, kmpApp)
        assertEquals(listOf(android, common), g.node(":shared")!!.sourceRoots)   // 없는 디렉터리 · iosMain은 보지 않는다
        val (r, _) = ClasspathSpec.forRender(kmpApp.dependency(":shared"), kmpApp, overlay)
        assertEquals(kmpApp.kmpSourceRoots, r.kmpSourceRoots)
    }

    @Test fun `KMP 모듈의 res 와 매니페스트는 androidMain 에서도 찾고 앱의 에셋 디렉터리는 그릴 덤프까지 간다`() {
        val shared = out("shared", "classes.jar")
        val res = File(root, "shared/src/androidMain/res").apply { mkdirs() }
        val manifest = File(root, "shared/src/androidMain/AndroidManifest.xml").apply { writeText("<manifest/>") }
        val json = File(root, "app-assets.json").apply {
            writeText("""{"project":":app","variant":"debug","resourceApkPath":"app.ap_",
                "classPath":["$appR","$appClasses","$shared"],"projectClassPath":["$appR","$appClasses","$shared"],
                "compileClassPath":["/m2/c.jar"],"rClassJars":["$appR"],"resourceDirs":[],"assetsDirs":["/app/assets"],
                "kmpSourceRoots":{":shared":["${File(root, "shared/src/commonMain/kotlin")}"]}}""")
        }
        val kmpApp = ClasspathSpec.load(json)
        val dep = kmpApp.dependency(":shared")
        assertEquals(listOf(res), dep.resourceRoots)
        assertEquals(listOf(manifest), dep.manifests)
        assertEquals(listOf("/app/assets"), ClasspathSpec.forRender(dep, kmpApp, overlay).first.assetsDirs)
        assertEquals(listOf("/app/assets"), home.withResourcesFrom(kmpApp).assetsDirs)
        assertEquals(emptyList<File>(), home.resourceRoots)                       // 안드로이드 모듈은 androidMain 을 보지 않는다
    }
    @Test fun `projectDir 을 옮긴 저장소는 덤프의 moduleDirs 로 모듈과 저장소 루트를 찾는다`() {
        val layout = mapOf(":" to root.path, ":app" to File(root, "src/app").path, ":widgets" to File(root, "src/core/design/widgets").path)
        val widgetsClasses = out("src/core/design/widgets", "classes", "widgets")
        val widgetsJar = out("src/core/design/widgets", "classes.jar")
        val remappedAppClasses = out("src/app", "classes", "app")
        File(root, "src/core/design/widgets/src/main/kotlin").mkdirs()
        File(root, "src/app/src/main/kotlin").mkdirs()
        fun remapped(project: String, cp: List<String>, compile: List<String>, apk: String = "") =
            ClasspathSpec(File(root, "$project.json"), project, "debug", "", apk,
                DumpPaths(classPath = cp, projectClassPath = cp, compileClassPath = compile, rClassJars = emptyList(), resourceDirs = emptyList(),
                    layout = RepoLayout(root.path, layout)))
        val widgets = remapped(":widgets", listOf(widgetsClasses), listOf("/m2/compose-ui.jar"))
        val remappedApp = remapped(":app", listOf(remappedAppClasses, widgetsJar), listOf(widgetsJar), apk = "app.ap_")

        assertEquals(root, widgets.repoRoot)
        assertEquals(File(root, "src/core/design/widgets"), widgets.moduleDir)
        assertEquals(listOf(":widgets"), remappedApp.projectModules)
        assertEquals(listOf(widgetsJar), remappedApp.dependency(":widgets").ownClassPath)

        val g = WatchGraph.ofApp(widgets, remappedApp)
        assertEquals(listOf(":widgets", ":app"), g.nodes.map { it.path })
        assertEquals(":widgets", g.ownerOf(File(root, "src/core/design/widgets/src/main/kotlin/Card.kt")))
    }
}
