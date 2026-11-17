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
import prevue.application.service.Workspace
import prevue.infrastructure.bindings.EntryPoints
import prevue.infrastructure.bindings.PrevueCheckout
import prevue.infrastructure.compile.HotCompiler
import prevue.infrastructure.dump.ClasspathSpec
import prevue.infrastructure.render.RenderEngine
import prevue.infrastructure.source.SourcePreviewRepository
import prevue.infrastructure.store.InMemoryWorkspaceStore
import prevue.infrastructure.watch.PollingSourceWatcher
import prevue.application.domain.model.ModuleInfo
import prevue.application.port.Clock
import prevue.application.port.FailureKind
import prevue.application.domain.model.ModuleGraph
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.eventually
import prevue.infrastructure.json.Json
import javax.imageio.ImageIO
import prevue.daemon.fake.TestGraph
import prevue.infrastructure.bindings.TargetRepo
import prevue.daemon.fake.TestPorts
import prevue.daemon.fake.testGraph
import prevue.daemon.fake.realDispatchers

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
    private lateinit var uc: TestGraph
    private lateinit var ws: Workspace
    private lateinit var compiler: HotCompiler
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val appRoot = File(out, "app").canonicalFile
    private lateinit var stub: File
    private var ui: EntryPoints? = null

    @BeforeAll fun up() {
        val (home, app) = PearlFixture.warmup()
        val (spec, _) = ClasspathSpec.forRender(home, app, File(out, "overlay"))
        engine = RenderEngine(spec, PearlFixture.layoutlib()!!, out, realDispatchers)
        compiler = PearlFixture.hotCompiler(home, File(out, "overlay"))
        val module = ModuleInfo(home.repoRoot.absolutePath, home.project, home.variant, home.kotlinModuleName, spec.borrowedFrom, null)
        stub = PearlFixture.stubCopy(appRoot)
        val watched = listOf(appRoot)
        ws = Workspace(module, Clock(System::currentTimeMillis), ModuleGraph.single(home.project, home.sourceRoots, emptyList()), watched, InMemoryWorkspaceStore())
        uc = testGraph(TestPorts(engine, engine, compiler, SourcePreviewRepository(spec.classPath), home.repoRoot,
            realDispatchers, sources = PollingSourceWatcher(watched, realDispatchers)), ws, scope, PrevueCheckout(PearlFixture.viewer!!), TargetRepo(out))
        ui = uc.entryPoints.also { it.startWatching() }
        val r = runBlocking { uc.tabs.openPreview(PearlFixture.board!!.path, null, emptyMap(), "test") }
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
        val r = runBlocking { uc.tabs.openPreview(stub.path, null, emptyMap(), "test") }
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
        val w = runBlocking { uc.status.awaitRender(listOf(stub), 60_000) }
        assertTrue(w !is prevue.application.domain.model.WaitResult.TimedOut && w !is prevue.application.domain.model.WaitResult.CompileFailed, "$w")
        assertEquals(before, compiler.recompiled)
    }

    // 한 번 핫 컴파일한 뒤에는 스테이징의 직전 클래스가 빌드의 옛 클래스 자리에 선다 — 시그니처를 또 바꾸면 그것과 견준다
    @Test @Order(4) fun `핫 컴파일한 함수의 시그니처를 또 바꿔도 제 그림이다`() {
        val before = compiler.recompiled
        stub.writeText(FILLED.replace("fun BlankStub(modifier: Modifier = Modifier)", "fun BlankStub(modifier: Modifier = Modifier, tall: Boolean = true)"))
        val w = runBlocking { uc.status.awaitRender(listOf(stub), 60_000) }
        assertTrue(w !is prevue.application.domain.model.WaitResult.TimedOut && w !is prevue.application.domain.model.WaitResult.CompileFailed, "$w")
        runBlocking { engine.awaitWrites() }
        val last = ws.now.lastResult!!
        val tree = Json.parse(last.tree!!.readText()) as Map<*, *>
        val seen = "ok=${last.ok} failure=${tree["failure"]} warnings=${tree["warnings"]} message=${tree["message"]}"
        assertTrue(last.ok && (tree["warnings"] as List<*>).isEmpty() && (tree["composeViewInfo"] as List<*>).isNotEmpty(), seen)
        assertEquals(before + 1, compiler.recompiled)
    }

    // 렌더 중 던진 NoSuchMethodError는 공유 로더로도 새 로더로도 EXCEPTION이다 — 옛 오버로드로 풀린 호출은 [ShadowedOverloadRenderIntegrationTest]가 본다
    @Test @Order(5) fun `렌더 중 NoSuchMethodError는 공유 로더에서도 새 로더에서도 EXCEPTION이다`() {
        stub.writeText(THROWING)
        val w = runBlocking { uc.status.awaitRender(listOf(stub), 60_000) }
        runBlocking { engine.awaitWrites() }
        val spec = ws.now.board!!.focusCard.spec.copy(fqn = "com.example.pearl.feature.pearl.BlankStubKt.BlankStubPreview", previewId = "BlankStubPreview", file = stub)
        val shared = runBlocking { engine.written(engine.show(spec, ownLoader = false)) }
        val own = runBlocking { engine.written(engine.show(spec, ownLoader = true)) }
        val seen = { o: prevue.application.port.RenderOutput -> "ok=${o.ok} failure=${o.failure} warnings=${o.warnings} message=${o.message?.text}" }
        assertTrue(!shared.freshLoader, "공유 로더가 이미 쓰인 것이어야 한다 · ${seen(shared)}")
        assertEquals(FailureKind.EXCEPTION, own.failure, "새 로더 · ${seen(own)} · wait=$w")
        assertEquals(FailureKind.EXCEPTION, shared.failure, "공유 로더 · ${seen(shared)} · wait=$w")
        assertTrue("NoSuchMethodError" in shared.message!!.text, seen(shared))
    }

    companion object {
        @JvmStatic fun available() = PearlFixture.available()

        internal val FILLED = """
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

        private val THROWING = FILLED.replace("    Column(modifier) {", "    throw NoSuchMethodError(\"'void com.example.pearl.feature.pearl.Gone.call()'\")\n    Column(modifier) {")
    }
}

/**
 * 재컴파일 보정을 끈 첫 핫 컴파일 — 프리뷰가 빌드의 옛 오버로드 `BlankStub()`로 풀려 렌더 중 NoSuchMethodError가 난다. 공유 로더도 그것을 성공으로 내지 않는다.
 * 화면 흐름(저장 · 열기)으로 그리면 옛 호출자 복구가 같은 파일을 다시 컴파일해 고치므로 컴파일러와 엔진을 직접 부른다. 감시도 붙이지 않는다.
 * [BlankRenderIntegrationTest]와 엔진 · 오버레이를 나누지 않는다 — 그쪽은 이미 보정된 첫 컴파일을 썼다.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIf("prevue.daemon.BlankRenderIntegrationTest#available")
class ShadowedOverloadRenderIntegrationTest {
    private val out = Files.createTempDirectory("prevue-shadowed").toFile()
    private lateinit var engine: RenderEngine
    private lateinit var ws: Workspace
    private lateinit var compiler: HotCompiler
    private lateinit var project: String
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val appRoot = File(out, "app").canonicalFile
    private lateinit var stub: File

    @BeforeAll fun up() {
        val (home, app) = PearlFixture.warmup()
        val (spec, _) = ClasspathSpec.forRender(home, app, File(out, "overlay"))
        engine = RenderEngine(spec, PearlFixture.layoutlib()!!, out, realDispatchers)
        compiler = PearlFixture.hotCompiler(home, File(out, "overlay")).also { it.recompileShadowed = false }
        project = home.project
        val module = ModuleInfo(home.repoRoot.absolutePath, home.project, home.variant, home.kotlinModuleName, spec.borrowedFrom, null)
        stub = PearlFixture.stubCopy(appRoot)
        val watched = listOf(appRoot)
        ws = Workspace(module, Clock(System::currentTimeMillis), ModuleGraph.single(home.project, home.sourceRoots, emptyList()), watched, InMemoryWorkspaceStore())
        val uc = testGraph(TestPorts(engine, engine, compiler, SourcePreviewRepository(spec.classPath), home.repoRoot,
            realDispatchers, sources = PollingSourceWatcher(watched, realDispatchers)), ws, scope, PrevueCheckout(PearlFixture.viewer!!), TargetRepo(out))
        val r = runBlocking { uc.tabs.openPreview(PearlFixture.board!!.path, null, emptyMap(), "test") }
        assertTrue(r.ok, r.shot.out.message?.text)
        ws.awaitBoardFilled(timeoutMs = 120_000)
    }

    @AfterAll fun down() {
        scope.cancel()
        runCatching { engine.close() }; runCatching { compiler.close() }
        out.deleteRecursively(); PearlFixture.stopGradle()
    }

    @Test fun `재컴파일 보정을 끈 첫 핫 컴파일 뒤 옛 오버로드로 풀린 호출은 공유 로더에서도 EXCEPTION이다`() {
        eventually(20_000, pollMs = 200) { engine.preloaded().held > 0 }
        stub.writeText(BlankRenderIntegrationTest.FILLED)
        val c = runBlocking { compiler.compile(project, listOf(stub)) }
        assertTrue(c.ok, c.messages)
        assertEquals(0, compiler.recompiled, "보정을 껐으면 다시 컴파일하지 않는다")
        engine.codeChanged()
        val spec = ws.now.board!!.focusCard.spec.copy(fqn = "com.example.pearl.feature.pearl.BlankStubKt.BlankStubPreview", previewId = "BlankStubPreview", file = stub)
        val seen = { o: prevue.application.port.RenderOutput -> "ok=${o.ok} failure=${o.failure} freshLoader=${o.freshLoader} warnings=${o.warnings} message=${o.message?.text}" }
        // 다시 컴파일한 뒤 첫 렌더는 새 로더다 — 공유 로더가 이미 쓰인 채로 다시 그린 두 번째가 판정 대상이다
        val first = runBlocking { engine.written(engine.show(spec, ownLoader = false)) }
        val again = runBlocking { engine.written(engine.show(spec, ownLoader = false)) }
        assertTrue(!again.freshLoader, "공유 로더가 이미 쓰인 것이어야 한다 · ${seen(again)}")
        assertEquals(FailureKind.EXCEPTION, first.failure, "첫 렌더 · ${seen(first)}")
        assertEquals(FailureKind.EXCEPTION, again.failure, "다시 그린 렌더 · ${seen(again)}")
        assertTrue("NoSuchMethodError" in again.message!!.text, seen(again))
    }
}

/**
 * `--no-preload` 엔진(`preloadNext = false`)이 미리 구운 공유 로더와 같은 스텁에서 같은 렌더 보고를 내는지 견준다.
 * 테스트의 `ownLoader = true`는 미리 굽기 엔진 안에서 한 번만 전용 로더를 쓰는 것이라 엔진 단위의 `--no-preload`와 같은 경로가 아니다.
 * 엔진을 동시에 둘 띄우지 않는다 — 미리 굽기 엔진으로 그리며 오버레이를 떠 두고, 닫은 뒤 no-preload 엔진에 같은 클래스 바이트를 되돌려 그린다.
 * 옛 오버로드 상황은 첫 핫 컴파일에서만 생겨 다시 컴파일로는 재현되지 않기 때문이다.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIf("prevue.daemon.BlankRenderIntegrationTest#available")
class NoPreloadRenderIntegrationTest {
    private val out = Files.createTempDirectory("prevue-no-preload").toFile()
    private val overlay = File(out, "overlay")
    private lateinit var spec: ClasspathSpec
    private lateinit var compiler: HotCompiler
    private var engine: RenderEngine? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val appRoot = File(out, "app").canonicalFile
    private lateinit var stub: File
    private lateinit var base: prevue.application.domain.model.PreviewSpec
    private val preloaded = mutableMapOf<String, Report>()
    private var ownShadowed: Report? = null

    // 첫 줄 아래는 layoutlib 문구라 로더 상태마다 다르다(이미 쓰인 로더로 다시 그리면 `View layout failed`) — 견주는 것은 판정과 첫 줄이다
    data class Report(val ok: Boolean, val failure: FailureKind?, val warnings: List<String>, val headline: String?)

    @BeforeAll fun up() {
        val (home, app) = PearlFixture.warmup()
        spec = ClasspathSpec.forRender(home, app, overlay).first
        val shared = RenderEngine(spec, PearlFixture.layoutlib()!!, File(out, "preload"), realDispatchers).also { engine = it }
        compiler = PearlFixture.hotCompiler(home, overlay).also { it.recompileShadowed = false }
        val module = ModuleInfo(home.repoRoot.absolutePath, home.project, home.variant, home.kotlinModuleName, spec.borrowedFrom, null)
        stub = PearlFixture.stubCopy(appRoot)
        val watched = listOf(appRoot)
        val ws = Workspace(module, Clock(System::currentTimeMillis), ModuleGraph.single(home.project, home.sourceRoots, emptyList()), watched, InMemoryWorkspaceStore())
        val uc = testGraph(TestPorts(shared, shared, compiler, SourcePreviewRepository(spec.classPath), home.repoRoot,
            realDispatchers, sources = PollingSourceWatcher(watched, realDispatchers)), ws, scope, PrevueCheckout(PearlFixture.viewer!!), TargetRepo(out))
        val r = runBlocking { uc.tabs.openPreview(PearlFixture.board!!.path, null, emptyMap(), "test") }
        assertTrue(r.ok, r.shot.out.message?.text)
        ws.awaitBoardFilled(timeoutMs = 120_000)
        base = ws.now.board!!.focusCard.spec.copy(fqn = "com.example.pearl.feature.pearl.BlankStubKt.BlankStubPreview", previewId = "BlankStubPreview", file = stub)
        eventually(20_000, pollMs = 200) { shared.preloaded().held > 0 }
        scope.cancel()

        compileAndKeep(home.project, BlankRenderIntegrationTest.FILLED, SHADOWED)
        shared.codeChanged()
        preloaded[SHADOWED] = sharedAgain(shared)
        ownShadowed = report(runBlocking { shared.written(shared.show(base, ownLoader = true)) })

        compileAndKeep(home.project, THROWING, THROWN)
        shared.codeChanged()
        preloaded[THROWN] = sharedAgain(shared)

        shared.close()
        engine = RenderEngine(spec, PearlFixture.layoutlib()!!, File(out, "no-preload"), realDispatchers).apply { preloadNext = false }
    }

    @AfterAll fun down() {
        scope.cancel()
        runCatching { engine?.close() }; runCatching { compiler.close() }
        out.deleteRecursively(); PearlFixture.stopGradle()
    }

    private fun compileAndKeep(project: String, source: String, name: String) {
        stub.writeText(source)
        val c = runBlocking { compiler.compile(project, listOf(stub)) }
        assertTrue(c.ok, c.messages)
        overlay.copyRecursively(File(out, "kept-$name"), overwrite = true)
    }

    private fun restore(name: String) {
        overlay.deleteRecursively()
        File(out, "kept-$name").copyRecursively(overlay)
    }

    // 코드가 바뀐 뒤 첫 렌더는 새 로더다 — 공유 로더가 이미 쓰인 채로 다시 그린 두 번째를 공유 로더의 보고로 쓴다
    private fun sharedAgain(shared: RenderEngine): Report {
        runBlocking { shared.written(shared.show(base, ownLoader = false)) }
        val again = runBlocking { shared.written(shared.show(base, ownLoader = false)) }
        assertTrue(!again.freshLoader, "공유 로더가 이미 쓰인 것이어야 한다 · ${report(again)}")
        return report(again)
    }

    private fun noPreload(name: String): Report {
        restore(name)
        val e = engine!!
        e.codeChanged()
        return report(runBlocking { e.written(e.show(base)) })
    }

    @Test fun `옛 오버로드로 풀린 호출은 no-preload 엔진도 공유 로더와 같은 보고를 낸다`() {
        val shared = preloaded.getValue(SHADOWED)
        assertEquals(FailureKind.EXCEPTION, shared.failure, "$shared")
        assertEquals("java.lang.NoSuchMethodError: 'void com.example.pearl.feature.pearl.BlankStubKt.BlankStub(androidx.compose.runtime.Composer, int)'", shared.headline)
        assertEquals(shared, noPreload(SHADOWED))
        assertEquals(shared, ownShadowed)
    }

    @Test fun `렌더 중 NoSuchMethodError는 no-preload 엔진도 공유 로더와 같은 보고를 낸다`() {
        val shared = preloaded.getValue(THROWN)
        assertEquals(FailureKind.EXCEPTION, shared.failure, "$shared")
        assertEquals("java.lang.NoSuchMethodError: 'void com.example.pearl.feature.pearl.Gone.call()'", shared.headline)
        assertEquals(shared, noPreload(THROWN))
    }

    private companion object {
        const val SHADOWED = "shadowed"
        const val THROWN = "thrown"
        val THROWING = BlankRenderIntegrationTest.FILLED.replace("    Column(modifier) {", "    throw NoSuchMethodError(\"'void com.example.pearl.feature.pearl.Gone.call()'\")\n    Column(modifier) {")

        fun report(o: prevue.application.port.RenderOutput) = Report(o.ok, o.failure, o.warnings, o.message?.text?.lineSequence()?.first())
    }
}
