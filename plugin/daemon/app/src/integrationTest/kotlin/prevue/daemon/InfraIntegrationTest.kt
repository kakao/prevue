package prevue.daemon

import java.io.File
import java.nio.file.Files
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.condition.EnabledIf
import dev.zacsweers.metro.createGraphFactory
import prevue.adapter.entry.PrevueCheckout
import prevue.adapter.infra.Closer
import prevue.adapter.infra.InfraConfig
import prevue.daemon.fake.awaitBoardFilled
import prevue.domain.model.ReloadResult
import prevue.json.Json

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIf("prevue.daemon.InfraIntegrationTest#available")
class InfraIntegrationTest {
    private val dir = Files.createTempDirectory("prevue-infra").toFile()
    private lateinit var config: InfraConfig

    @BeforeAll fun up() {
        val (home, app) = PearlFixture.warmup()
        config = PearlFixture.infraConfig(home, app, dir)
    }

    @AfterAll fun down() { PearlFixture.stopGradle(); dir.deleteRecursively() }

    @Test fun `앱 그래프가 감시 루트와 포트를 엮어 복사본을 그리고 다시 컴파일한다`() = runBlocking {
        val copy = PearlFixture.appCopy(File(dir, "src"))
        val logs = withGraph(config.copy(extraWatch = listOf(copy.parentFile, copy.parentFile))) { graph ->
            val ws = graph.workspace
            assertEquals(":feature:pearl", ws.module.module)
            assertTrue(ws.module.modules.containsAll(listOf(":feature:pearl", ":app")))
            assertEquals(1, ws.watchRoots.count { it == copy.parentFile.canonicalFile })
            graph.startDaemon()
            val uc = graph
            assertNotNull(uc.readStatus().watch)
            assertNotNull(graph.builds)
            assertNotNull(graph.values)
            assertEquals(graph.target.outDir.absolutePath, uc.readStatus().engine.out)
            uc.rememberValues()
            val first = uc.openPreview(copy.path, null, emptyMap(), "test").shot.out
            assertTrue(first.ok, first.message.toString())
            ws.awaitBoardFilled(timeoutMs = 60_000)
            copy.appendText("\n")
            val saved = uc.applySave(listOf(copy), "test")
            assertTrue(saved is ReloadResult.Rendered, saved.toString())
            assertTrue((saved as ReloadResult.Rendered).result.ok)
            ws.awaitBoardFilled(timeoutMs = 60_000)
        }
        assertEquals("닫음: BootingEngine → HotCompiler", logs.last())
    }

    @Test fun `감시를 끄면 추가 루트를 주어도 감시 포트와 루트가 없다`() = runBlocking {
        val copy = PearlFixture.appCopy(File(dir, "no-watch"))
        withGraph(config.copy(watching = false, extraWatch = listOf(dir))) { graph ->
            assertTrue(graph.workspace.watchRoots.isEmpty())
            graph.startDaemon()
            val uc = graph
            assertNull(uc.readStatus().watch)
            assertNull(graph.builds)
            assertNull(graph.values)
            val shown = uc.openPreview(copy.path, null, emptyMap(), "test").shot.out
            assertTrue(shown.ok, shown.message.toString())
        }
        Unit
    }

    @Test fun `렌더러 부트의 IO 실패를 수명 주인이 받아 종료 코드 3으로 정리한다`() {
        val apk = File(dir, "broken.ap_").apply { writeText("not an APK") }
        val original = Json.parse(config.resourcesFrom!!.readText()) as Map<*, *>
        val dump = File(dir, "broken-app.json").apply { writeText(Json.str(original + ("resourceApkPath" to apk.path))) }
        val output = runMain(3, "--resources-from", dump.path)
        assertTrue(output.contains("데몬 종료 요청: 렌더러를 띄우지 못했다"), output)
        assertTrue(output.contains("닫음: BootingEngine → HotCompiler"), output)
    }

    @Test fun `초기 덤프 읽기 실패는 기존과 같은 종료 코드 1이다`() {
        val output = runMain(1, "--classpath", File(dir, "missing.json").path)
        assertTrue(output.contains("missing.json"), output)
        assertFalse(output.contains("닫음:"), output)
    }

    private fun runMain(exitCode: Int, vararg extra: String): String {
        val output = File(dir, "failed-daemon.log")
        val args = listOf(
            File(System.getProperty("java.home"), "bin/java").path, "-Djava.awt.headless=true",
            "-cp", System.getProperty("java.class.path"), "prevue.daemon.MainKt",
            "--classpath", config.classpath.path, "--resources-from", config.resourcesFrom!!.path,
            "--layoutlib", config.layoutlib.path, "--compiler", config.compiler.path, "--bridge", config.bridge.path,
            "--viewer", PearlFixture.viewer!!.path, "--android-jar", config.androidJar!!.path,
            "--out", File(dir, "failed-out").path, "--overlay", File(dir, "failed-overlay").path,
            "--port", "0", "--no-watch",
        ) + extra
        val process = ProcessBuilder(args).redirectErrorStream(true).redirectOutput(output).start()
        try {
            assertTrue(process.waitFor(60, TimeUnit.SECONDS), "실패한 데몬이 끝나지 않았다: ${output.readText()}")
            assertEquals(exitCode, process.exitValue(), output.readText())
            return output.readText()
        } finally {
            if (process.isAlive) { process.destroyForcibly(); process.waitFor() }
        }
    }

    private suspend fun withGraph(config: InfraConfig, block: suspend CoroutineScope.(InfraGraph) -> Unit): List<String> {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        val logs = CopyOnWriteArrayList<String>()
        val closer = Closer { logs += it }
        try {
            val graph = createGraphFactory<InfraGraph.Factory>().create(config, scope, PrevueCheckout(File(dir, "viewer")), DaemonHooks({}) {}, closer)
            scope.block(graph)
        } finally {
            scope.cancel()
            scope.coroutineContext[Job]!!.join()
            closer.close()
            closer.close()
        }
        return logs
    }

    companion object {
        @JvmStatic fun available() = PearlFixture.available()
    }
}
