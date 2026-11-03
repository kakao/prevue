package prevue.daemon

import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.condition.EnabledIf
import prevue.adapter.infra.Infra
import prevue.adapter.infra.InfraConfig
import prevue.daemon.fake.awaitBoardFilled
import prevue.domain.UseCases
import prevue.domain.model.ReloadResult
import prevue.domain.port.Clock
import prevue.domain.runtime.Workspace

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
        withInfra(config.copy(extraWatch = listOf(copy.parentFile, copy.parentFile))) { infra ->
            assertEquals(":feature:pearl", infra.module.module)
            assertTrue(infra.module.modules.containsAll(listOf(":feature:pearl", ":app")))
            assertEquals(1, infra.watchRoots.count { it == copy.parentFile.canonicalFile })
            assertNotNull(infra.watchers.sources)
            assertNotNull(infra.watchers.builds)
            assertNotNull(infra.watchers.values)
            assertEquals(infra.outDir, infra.ports.engine.outDir)
            val ws = Workspace(infra.module, Clock(System::currentTimeMillis), infra.graph, infra.watchRoots)
            val uc = UseCases(ws, infra.ports, this, infra.watchers)
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
    }

    @Test fun `감시를 끄면 추가 루트를 주어도 감시 포트와 루트가 없다`() = runBlocking {
        withInfra(config.copy(watching = false, extraWatch = listOf(dir))) { infra ->
            assertTrue(infra.watchRoots.isEmpty())
            assertNull(infra.watchers.sources)
            assertNull(infra.watchers.builds)
            assertNull(infra.watchers.values)
            infra.ports.engine.ready()
        }
    }

    @Test fun `렌더러 부트 실패가 lost 대기까지 전파되어 수명 주인이 정리할 수 있다`() = runBlocking {
        withInfra(config.copy(layoutlib = File(dir, "missing-layoutlib"), watching = false)) { infra ->
            val failed = runCatching { infra.lost() }
            assertTrue(failed.isFailure)
            assertTrue(runCatching { infra.ports.engine.ready() }.isFailure)
        }
    }

    private suspend fun withInfra(config: InfraConfig, block: suspend CoroutineScope.(Infra) -> Unit) {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        var infra: Infra? = null
        try {
            infra = Infra(config, scope) {}
            scope.block(infra)
        } finally {
            scope.cancel()
            scope.coroutineContext[Job]!!.join()
            infra?.close()
            infra?.close()
        }
    }

    companion object {
        @JvmStatic fun available() = PearlFixture.available()
    }
}
