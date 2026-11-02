package prevue.daemon.adapter.dump

import java.io.File
import java.nio.file.Files
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** 앱 런타임에만 있는 라이브러리를 Gradle 캐시의 원본으로 메운다. 경로 모양은 nowinandroid 앱 덤프 · ~/.gradle 캐시를 줄인 것이다. */
class GradleOriginalsTest {
    private val root = Files.createTempDirectory("prevue-orig").toFile().canonicalFile
    @AfterEach fun tearDown() { root.deleteRecursively() }

    private val files2 = File(root, "modules-2/files-2.1")
    private val outDir = File(root, "originals")
    private val repo = File(root, "repo")
    private val transforms = "/g/caches/9.7.1/transforms"

    /** 원본 AAR — 안의 classes.jar에 `.kotlin_module`이 있다(런타임 변환본에는 없다). */
    private fun aar(group: String, artifact: String, version: String) {
        val f = File(files2, "$group/$artifact/$version/0a1b/$artifact-$version.aar").apply { parentFile.mkdirs() }
        val classes = java.io.ByteArrayOutputStream().also { b ->
            ZipOutputStream(b).use { z -> z.putNextEntry(ZipEntry("META-INF/${artifact}_release.kotlin_module")); z.closeEntry() }
        }.toByteArray()
        ZipOutputStream(f.outputStream()).use { z -> z.putNextEntry(ZipEntry("classes.jar")); z.write(classes); z.closeEntry() }
    }

    private fun jar(group: String, artifact: String, version: String) =
        File(files2, "$group/$artifact/$version/9f8e/$artifact-$version.jar").apply { parentFile.mkdirs(); writeText("") }

    @Test fun `변환본 이름에서 아티팩트와 버전을 읽는다`() {
        assertEquals("coil-compose-base" to "2.7.0", GradleOriginals.coordinate("$transforms/aa/transformed/coil-compose-base-2.7.0-runtime.jar"))
        assertEquals("coil-base" to "2.7.0", GradleOriginals.coordinate("$transforms/bb/transformed/coil-base-2.7.0-api.jar"))
        assertEquals("ui-graphics-android" to "1.10.0-beta02", GradleOriginals.coordinate("$transforms/cc/transformed/ui-graphics-android-1.10.0-beta02/jars/classes.jar"))
        assertEquals("kotlinx-coroutines-core-jvm" to "1.10.2", GradleOriginals.coordinate("/m2/kotlinx-coroutines-core-jvm-1.10.2.jar"))
        assertEquals(null, GradleOriginals.coordinate("/repo/app/build/R.jar"))
    }

    // H. core:ui 가 implementation 으로 쓰는 coil-compose-base 는 앱 compileClassPath 에 없다 — 원본 AAR의 classes.jar로 메운다.
    @Test fun `앱 런타임에만 있는 라이브러리는 원본 클래스 jar로 메운다`() {
        aar("io.coil-kt", "coil-compose-base", "2.7.0")
        aar("io.coil-kt", "coil-base", "2.7.0")
        val g = GradleOriginals(files2, outDir)
        val cp = listOf("$transforms/aa/transformed/coil-compose-base-2.7.0-runtime.jar", "$transforms/bb/transformed/coil-base-2.7.0-runtime.jar",
            "${repo.path}/core/ui/build/classes.jar")
        val compile = listOf("$transforms/dd/transformed/coil-base-2.7.0-api.jar")
        val fill = g.forRuntimeOnly(cp, compile, repo)
        assertEquals(listOf(File(outDir, "io.coil-kt-coil-compose-base-2.7.0.jar").path), fill)
        ZipFile(fill.single()).use { z -> assertTrue(z.entries().asSequence().any { it.name.endsWith(".kotlin_module") }) }
    }

    @Test fun `원본이 jar면 그대로 쓴다`() {
        val j = jar("org.jetbrains.kotlinx", "kotlinx-datetime-jvm", "0.6.1")
        assertEquals(listOf(j.path), GradleOriginals(files2, outDir).forRuntimeOnly(listOf("/m2/kotlinx-datetime-jvm-0.6.1.jar"), emptyList(), repo))
    }

    // 고르지 않는다 — 그룹이 겹치면 어느 원본이 맞는지 이름으로는 모른다. 없으면 메우지 않고 실패가 그 모듈의 덤프를 권한다.
    @Test fun `그룹이 겹치거나 원본이 없으면 메우지 않는다`() {
        aar("a.one", "shared", "1.0.0")
        aar("b.two", "shared", "1.0.0")
        val g = GradleOriginals(files2, outDir)
        assertEquals(emptyList<String>(), g.forRuntimeOnly(listOf("$transforms/ee/transformed/shared-1.0.0-runtime.jar"), emptyList(), repo))
        assertEquals(emptyList<String>(), g.forRuntimeOnly(listOf("$transforms/ff/transformed/missing-2.0.0-runtime.jar"), emptyList(), repo))
    }

    // 끌어낸 인자만 메운다. 자기 덤프는 그 모듈의 compileClassPath 가 이미 정확하다.
    @Test fun `끌어낸 인자는 출처 덤프의 원본을 메운다`() {
        aar("io.coil-kt", "coil-compose-base", "2.7.0")
        val ui = File(repo, "core/ui/build/classes").apply { File(this, "META-INF").mkdirs(); File(this, "META-INF/ui.kotlin_module").writeText("") }.path
        val appClasses = File(repo, "app/build/classes").apply { File(this, "META-INF").mkdirs(); File(this, "META-INF/app.kotlin_module").writeText("") }.path
        val app = ClasspathSpec(File(root, "app.json"), ":app", "debug", "", "app.ap_",
            DumpPaths(
                classPath = listOf(appClasses, ui, "$transforms/aa/transformed/coil-compose-base-2.7.0-runtime.jar"), projectClassPath = listOf(appClasses, ui),
                compileClassPath = listOf(ui), rClassJars = emptyList(), resourceDirs = emptyList(),
            ), originals = GradleOriginals(files2, outDir))
        assertEquals(emptyList<String>(), app.compileFill)
        assertEquals(listOf(File(outDir, "io.coil-kt-coil-compose-base-2.7.0.jar").path), app.dependency(":core:ui").compileFill)
    }
}
