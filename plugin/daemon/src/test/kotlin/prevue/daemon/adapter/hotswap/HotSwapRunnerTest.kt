package prevue.daemon.adapter.hotswap

import app.cash.turbine.test
import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.domain.port.BuildChange
import prevue.daemon.fake.FakeBuildWatcher
import prevue.daemon.fake.FakeSourceWatcher
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitUntil
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace

/** 감시가 부른 렌더는 응답 대신 로그 한 줄이다. 그 줄을 실측 스크립트가 정규식으로 읽는다 — 모양이 조용히 바뀌면 실측이 빈다. */
class HotSwapRunnerTest {
    private val fx = Fixture()
    private val sources = FakeSourceWatcher()
    private val builds = FakeBuildWatcher()
    private val uc = fx.useCases(sources = sources, builds = builds)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val vm = HotSwapRunner(uc, scope)

    init {
        vm.start()
        runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }
        uc.workspace.awaitBoardFilled()
        // 감시가 붙는 것(start)은 모으기가 시작될 때다 — 핫셋 함수가 꽂힐 때까지 기다린다.
        awaitUntil("감시가 붙기") { sources.hot().isNotEmpty() }
    }

    @AfterEach fun tearDown() = fx.close()

    @Test fun `저장 로그 줄은 실측이 읽는 모양이고 핫셋은 보여 주는 파일이다`() {
        assertEquals(listOf(fx.file.canonicalFile), sources.hot().map(File::getCanonicalFile))
        val line = firstLog { sources.fire(fx.file) }
        assertTrue(Regex("""^reload \[${fx.file.name}]: ok=true detect=-?\d+ms wait=\d+ms compile=(\d+)ms task=\d+ms render=(\d+)ms total=\d+ms saveToScreen=(\d+)ms""").containsMatchIn(line), line)
    }

    @Test fun `밖의 빌드는 다 쓰인 뒤에만 남기고 status에 감시 비용이 실린다`() {
        val built = BuildChange(own = listOf(File(fx.root, "app/build/classes")))
        val line = firstLog {
            builds.fire(built, done = false)
            builds.fire(built, done = true)
        }
        assertTrue(line.startsWith("밖의 변화 own 1 · deps 0 · res 0 · build 0: ok=true"), line)
        val w = uc.readStatus().watch!!
        assertEquals(mapOf("files" to 1), w.source)
        assertEquals(mapOf("watched" to 1), w.build)
    }

    @Test fun `생성만 있는 묶음은 저장 → 화면을 돌리지 않고 빠른 열기의 목록만 고친다`() {
        runBlocking { uc.indexPreviewFiles() }
        val fresh = fx.previewFile("Fresh")
        val line = firstLog {
            sources.fireStructure(created = listOf(fresh))
            awaitUntil("목록에 오기") { uc.readPreviewFiles()!!.any { it.file == fresh.canonicalFile } }
            sources.fire(fx.file)                            // 감시는 한 줄로 받는다 — 이 저장의 로그가 첫 줄이면 앞 묶음은 로그를 내지 않았다
        }
        assertTrue(line.startsWith("reload [${fx.file.name}]"), line)
    }

    /** [act] 뒤의 로그가 한 줄뿐이고 그 줄을 돌려준다. */
    private fun firstLog(act: () -> Unit): String {
        lateinit var line: String
        runBlocking {
            vm.logs.test {
                act()
                line = awaitItem()
                expectNoEvents()
            }
        }
        return line
    }
}
