package prevue.daemon

import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.MethodOrderer
import org.junit.jupiter.api.Order
import org.junit.jupiter.api.TestMethodOrder
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.condition.EnabledIf
import prevue.daemon.adapter.compile.HotCompiler
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.daemon.adapter.render.RenderEngine
import prevue.daemon.adapter.source.ProjectFiles
import prevue.daemon.adapter.source.SourcePreviewRepository
import prevue.daemon.adapter.watch.PollingSourceWatcher
import prevue.daemon.domain.Ports
import prevue.daemon.domain.UseCases
import prevue.daemon.domain.Watchers
import prevue.daemon.domain.model.ModuleInfo
import prevue.daemon.domain.port.Clock
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.entity.ModuleGraph
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.eventually
import prevue.json.Json
import javax.imageio.ImageIO

/**
 * 빌드에 이미 있는 프리뷰 없는 스텁 파일에 본문과 `@Preview`를 더해 저장하자마자 연다(README 영상 take 7의 `HomeScreen.kt`).
 * 옛 클래스(프리뷰 메서드 없음)로 그리면 렌더러가 실패를 삼켜 빈 트리 · 단색 그림이 성공으로 나갔다.
 * [RenderIntegrationTest]와 엔진을 나누지 않는다 — 그쪽은 순서대로 쌓인 상태 위에서 돌아 이 재현의 로더 세대를 흐린다.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation::class)
@EnabledIf("prevue.daemon.BlankRenderIntegrationTest#available")
class BlankRenderIntegrationTest {
    private val out = Files.createTempDirectory("prevue-blank").toFile()
    private lateinit var engine: RenderEngine
    private lateinit var uc: UseCases
    private lateinit var ws: Workspace
    private lateinit var compiler: HotCompiler
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val appRoot = File(out, "app").canonicalFile
    private lateinit var stub: File
    private var ui: EntryPoints? = null

    @BeforeAll fun up() {
        val (home, app) = PearlFixture.warmup()
        val (spec, _) = ClasspathSpec.forRender(home, app, File(out, "overlay"))
        engine = RenderEngine(spec, PearlFixture.layoutlib()!!, out)
        compiler = PearlFixture.hotCompiler(home, File(out, "overlay"))
        val module = ModuleInfo(home.repoRoot.absolutePath, home.project, home.variant, home.kotlinModuleName, spec.borrowedFrom, null)
        stub = PearlFixture.stubCopy(appRoot)
        val watched = listOf(appRoot)
        ws = Workspace(module, Clock(System::currentTimeMillis), ModuleGraph.single(home.project, home.sourceRoots, emptyList()), watched)
        uc = UseCases(ws, Ports(engine, engine, compiler, SourcePreviewRepository(spec.classPath), ProjectFiles(home.repoRoot, home.sourceRoots).apply { buildInBackground(scope) }),
            scope, Watchers(sources = PollingSourceWatcher(watched)))
        ui = EntryPoints(uc, 0, PrevueCheckout(PearlFixture.viewer!!), out, scope, {}, log = {}).also { it.hotSwap.start() }
        val r = runBlocking { uc.openPreview(PearlFixture.board!!.path, null, emptyMap(), "test") }
        assertTrue(r.ok, r.shot.out.message?.text)
        ws.awaitBoardFilled(timeoutMs = 120_000)
    }

    @AfterAll fun down() {
        runCatching { runBlocking { ui?.stop() } }
        scope.cancel()
        runCatching { engine.close() }; runCatching { compiler.close() }
        out.deleteRecursively(); PearlFixture.stopGradle()
    }

    // 렌더러는 프리뷰 메서드를 못 찾는 실패를 삼켜 빈 그림을 SUCCESS로 낸다 — 컴파일하지 않은 스텁(빌드의 옛 클래스)을 그 메서드 이름으로 그린다
    @Test @Order(1) fun `옛 클래스에 프리뷰 메서드가 없으면 성공이 아니라 클래스 없음이다`() {
        val base = ws.now.board!!.focusCard.spec
        val fqn = "com.example.pearl.feature.pearl.BlankStubKt.BlankStubPreview"
        val o = runBlocking { engine.written(engine.show(base.copy(fqn = fqn, previewId = "BlankStubPreview", file = stub))) }
        assertEquals(FailureKind.NOT_FOUND, o.failure, "ok=${o.ok} message=${o.message?.text}")
        assertTrue("BlankStubPreview" in o.message!!.text && "prevue reload" in o.message!!.text, o.message!!.text)
    }

    // 스텁 `BlankStub()`에 기본값 인자를 더했다 — 첫 핫 컴파일이 빌드의 옛 오버로드로 호출을 풀면 런타임 NoSuchMethodError, 렌더러가 삼켜 빈 그림이었다
    @Test @Order(2) fun `빌드에 있던 스텁의 시그니처를 바꾸고 프리뷰를 더해 저장하자마자 열면 제 그림이다`() {
        eventually(20_000, pollMs = 200) { engine.preloaded().held > 0 }
        stub.writeText(FILLED)
        val r = runBlocking { uc.openPreview(stub.path, null, emptyMap(), "test") }
        val o = r.shot.out
        runBlocking { engine.awaitWrites() }
        val tree = Json.parse(o.tree!!.readText()) as Map<*, *>
        val nodes = tree["composeViewInfo"] as List<*>
        val image = o.image?.let(ImageIO::read)
        val colors = image?.let { img -> (0 until img.height step 16).flatMap { y -> (0 until img.width step 16).map { x -> img.getRGB(x, y) } }.toSet().size } ?: 0
        val seen = "ok=${o.ok} failure=${o.failure} freshLoader=${o.freshLoader} nodes=${nodes.size} colors=$colors message=${o.message?.text}"
        assertTrue(o.ok, seen)
        assertTrue(o.warnings.isEmpty(), "${o.warnings} · $seen")
        assertTrue(nodes.isNotEmpty(), seen)
        assertTrue(colors > 1, seen)
        assertTrue(o.freshLoader, seen)
        assertEquals(1, compiler.recompiled, "빌드의 옛 클래스가 가려진 첫 컴파일은 한 번 더 컴파일한다")
    }

    // 다시 컴파일은 빌드의 옛 클래스가 처음 가려질 때 한 번뿐이다 — 저장마다 두 번이면 핫스왑 1초(NFR)를 컴파일 한 번만큼 잃는다
    @Test @Order(3) fun `같은 파일의 다음 저장은 한 번만 컴파일한다`() {
        val before = compiler.recompiled
        stub.writeText(FILLED.replace("Color.Blue", "Color.Green"))
        val w = runBlocking { uc.awaitRender(listOf(stub), 60_000) }
        assertTrue(w !is prevue.daemon.domain.model.WaitResult.TimedOut && w !is prevue.daemon.domain.model.WaitResult.CompileFailed, "$w")
        assertEquals(before, compiler.recompiled)
    }

    // 한 번 핫 컴파일한 뒤에는 스테이징의 직전 클래스가 빌드의 옛 클래스 자리에 선다 — 시그니처를 또 바꾸면 그것과 견준다
    @Test @Order(4) fun `핫 컴파일한 함수의 시그니처를 또 바꿔도 제 그림이다`() {
        val before = compiler.recompiled
        stub.writeText(FILLED.replace("fun BlankStub(modifier: Modifier = Modifier)", "fun BlankStub(modifier: Modifier = Modifier, tall: Boolean = true)"))
        val w = runBlocking { uc.awaitRender(listOf(stub), 60_000) }
        assertTrue(w !is prevue.daemon.domain.model.WaitResult.TimedOut && w !is prevue.daemon.domain.model.WaitResult.CompileFailed, "$w")
        runBlocking { engine.awaitWrites() }
        val last = ws.now.lastResult!!
        val tree = Json.parse(last.tree!!.readText()) as Map<*, *>
        val seen = "ok=${last.ok} failure=${tree["failure"]} warnings=${tree["warnings"]} message=${tree["message"]}"
        assertTrue(last.ok && (tree["warnings"] as List<*>).isEmpty() && (tree["composeViewInfo"] as List<*>).isNotEmpty(), seen)
        assertEquals(before + 1, compiler.recompiled)
    }

    companion object {
        @JvmStatic fun available() = PearlFixture.available()

        private val FILLED = """
            package com.example.pearl.feature.pearl

            import androidx.compose.foundation.background
            import androidx.compose.foundation.layout.Box
            import androidx.compose.foundation.layout.Column
            import androidx.compose.foundation.layout.size
            import androidx.compose.runtime.Composable
            import androidx.compose.ui.Modifier
            import androidx.compose.ui.graphics.Color
            import androidx.compose.ui.tooling.preview.Preview
            import androidx.compose.ui.unit.dp

            @Composable
            fun BlankStub(modifier: Modifier = Modifier) {
                Column(modifier) {
                    Box(Modifier.size(120.dp).background(Color.Red))
                    Box(Modifier.size(120.dp).background(Color.Blue))
                }
            }

            @Preview
            @Composable
            fun BlankStubPreview() {
                BlankStub()
            }
        """.trimIndent()
    }
}
