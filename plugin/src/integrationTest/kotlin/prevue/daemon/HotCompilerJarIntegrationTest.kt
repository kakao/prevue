package prevue.daemon

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.jar.JarEntry
import java.util.jar.JarOutputStream
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.condition.EnabledIf
import prevue.daemon.adapter.compile.HotCompiler
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.json.Json

/**
 * D-135. 상주 컴파일러는 저장 사이에 Kotlin 애플리케이션 환경을 버리지 않는다(`kotlin.environment.keepalive`).
 * 밖의 Gradle이 같은 경로의 jar를 다시 써도 다음 컴파일은 새 내용을 봐야 한다 — 환경이 jar를 쥐어 옛 시그니처로 컴파일하면 여기서 깨진다.
 * 가장 나쁜 경우로 본다: Kotlin 클래스가 든 jar를 mtime까지 같게 덮는다.
 * 의존 jar는 따로 띄운 컴파일러로 만든다 — 같은 컴파일러로 만들면 그 출력 디렉터리가 클래스패스에 끼어 jar를 가린다.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIf("prevue.daemon.HotCompilerJarIntegrationTest#available")
class HotCompilerJarIntegrationTest {
    private val out = Files.createTempDirectory("prevue-jar").toFile()
    private val lib = File(out, "lib.jar")
    private val libOverlay = File(out, "liboverlay")
    private val use = File(out, "src/com/example/pearl/keepalive/Use.kt")
    private lateinit var home: ClasspathSpec
    private lateinit var compiler: HotCompiler
    private lateinit var libCompiler: HotCompiler

    @BeforeAll fun up() {
        val pearl = PearlFixture.warmup().first
        @Suppress("UNCHECKED_CAST")
        val m = Json.parse(pearl.file.readText()) as Map<String, Any?>
        val compile = (m["compileClassPath"] as List<*>).map { it.toString() } + lib.path
        home = ClasspathSpec.load(File(out, "spec.json").apply { writeText(Json.str(m + ("compileClassPath" to compile))) })
        compiler = PearlFixture.hotCompiler(home, File(out, "overlay"))
        libCompiler = PearlFixture.hotCompiler(home, libOverlay)
    }

    @Test fun `밖의 빌드가 같은 경로의 jar를 mtime까지 같게 다시 써도 새 시그니처로 컴파일한다`() = runBlocking {
        assertEquals("true", System.getProperty("kotlin.environment.keepalive"), "브리지가 환경 유지를 켜지 않았다")
        writeLib("fun greet(n: Int): Int = n")
        val stamp = lib.lastModified()
        val first = compileUse("fun useApi(): Int = lib.Api.greet(1)")
        assertTrue(first.ok, first.messages)

        writeLib("fun greet(s: String): String = s")
        lib.setLastModified(stamp)
        val second = compileUse("fun useApi(): String = lib.Api.greet(\"x\")")
        assertTrue(second.ok, second.messages)
    }

    private suspend fun compileUse(body: String) = compiler.compile(home.project,
        listOf(use.apply { parentFile.mkdirs(); writeText("package com.example.pearl.keepalive\n\n$body\n") }))

    // 최상위 함수는 모듈 색인(META-INF)이 pearl 것과 이름이 겹쳐 object로 둔다
    private suspend fun writeLib(member: String) {
        File("$libOverlay.modules").deleteRecursively()
        val src = File(out, "libsrc/lib/Api.kt").apply { parentFile.mkdirs(); writeText("package lib\n\nobject Api {\n    $member\n}\n") }
        val r = libCompiler.compile(home.project, listOf(src))
        check(r.ok) { r.messages }
        val classes = File("$libOverlay.modules").listFiles()!!.single { it.isDirectory }
        val tmp = File(out, "lib.jar.tmp")
        JarOutputStream(tmp.outputStream()).use { jar ->
            File(classes, "lib").walkTopDown().filter { it.isFile }.forEach { f ->
                jar.putNextEntry(JarEntry(f.relativeTo(classes).invariantSeparatorsPath))
                jar.write(f.readBytes())
                jar.closeEntry()
            }
        }
        Files.move(tmp.toPath(), lib.toPath(), StandardCopyOption.REPLACE_EXISTING)
    }

    @AfterAll fun down() {
        runCatching { compiler.close() }; runCatching { libCompiler.close() }
        out.deleteRecursively(); PearlFixture.stopGradle()
    }

    companion object {
        @JvmStatic fun available(): Boolean = PearlFixture.available()
    }
}
