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
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.MethodOrderer
import org.junit.jupiter.api.Order
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.TestMethodOrder
import org.junit.jupiter.api.condition.EnabledIf
import prevue.daemon.adapter.compile.HotCompiler
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.daemon.adapter.render.ApkWithAssets
import prevue.daemon.adapter.render.RenderEngine
import prevue.daemon.adapter.source.ProjectFiles
import prevue.daemon.adapter.source.SourcePreviewRepository
import prevue.daemon.domain.Ports
import prevue.daemon.domain.UseCases
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.ModuleInfo
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.policy.StaleReasons
import prevue.daemon.domain.port.Clock
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.entity.ModuleGraph
import prevue.daemon.fake.awaitBoardFilled

/**
 * 진짜 layoutlib으로 `fixtures/pearl-kmp`의 commonMain 프리뷰를 그린다(`./gradlew integrationTest`, 로컬만).
 * 데몬과 같은 조립이다 — KMP 모듈은 앱 덤프로 그리고(D-38), 리소스 APK에 CMP 리소스를 합친 사본을 렌더러에 준다.
 * 덤프 Gradle이 iOS 타깃 때문에 Kotlin/Native를 받지 않는지도 본다. 픽스처는 읽기만 한다 — 저장은 복사본에 한다.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation::class)
@EnabledIf("prevue.daemon.KmpRenderIntegrationTest#available")
class KmpRenderIntegrationTest {
    private val out = Files.createTempDirectory("prevue-kmp").toFile()
    private val copies = File(out, "src").canonicalFile
    private lateinit var engine: RenderEngine
    private lateinit var uc: UseCases
    private lateinit var ws: Workspace
    private lateinit var compiler: HotCompiler
    private lateinit var resourceApk: Pair<File, File>
    private lateinit var konanBefore: Set<String>
    private lateinit var konanAfter: Set<String>
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @BeforeAll fun up() {
        konanBefore = konan()
        val json = PearlFixture.warmupJson(PearlKmpFixture.app, "--variant", "debug")
        konanAfter = konan()
        val app = ClasspathSpec.load(File(Regex("\"classpath\": \"([^\"]+)\"").find(json)?.groupValues?.get(1) ?: error("앱 덤프를 뜨지 못했다: $json")))
        val home = app.dependency(":feature:pearl")
        val (spec, onApp) = ClasspathSpec.forRender(home, app, File(out, "overlay"))
        assertTrue(onApp, "앱 덤프가 :feature:pearl를 담지 않는다")
        val original = File(spec.resourceApkPath)
        resourceApk = original to ApkWithAssets.of(original, spec.assetsDirs.map(::File), File(out, "apk"))
        engine = RenderEngine(spec, PearlFixture.layoutlib()!!, out, resourceApk.second)
        compiler = PearlFixture.hotCompiler(home, File(out, "overlay"))
        val module = ModuleInfo(home.repoRoot.absolutePath, home.project, home.variant, home.kotlinModuleName, spec.borrowedFrom, null)
        ws = Workspace(module, Clock(System::currentTimeMillis), ModuleGraph.single(home.project, home.sourceRoots, emptyList()), listOf(copies))
        uc = UseCases(ws, Ports(engine, engine, compiler, SourcePreviewRepository(spec.classPath), ProjectFiles(home.repoRoot, home.sourceRoots).apply { buildInBackground(scope) }),
            scope)
    }

    @AfterAll fun down() {
        scope.cancel()
        runCatching { engine.close() }; runCatching { compiler.close() }
        out.deleteRecursively(); PearlFixture.stopGradle(PearlKmpFixture.dir)
    }

    // 옛 KGP(2.2.0, DroidKaigi 2025)는 설정 단계에서 K/N을 받았다 — 새 KGP는 iOS 타깃이 있어도 덤프가 받지 않는다.
    @Test @Order(1) fun `iOS 타깃이 있어도 덤프가 Kotlin Native를 받지 않는다`() {
        assertEquals(emptySet<String>(), konanAfter - konanBefore, "덤프가 ${PearlKmpFixture.konan}에 받았다")
    }

    @Test @Order(2) fun `commonMain 보드가 멀티 프리뷰 · PreviewParameter까지 펼쳐 다 그려진다`() {
        assertBoard(PearlKmpFixture.board, PearlFixture.BOARD_CARDS)
    }

    // CMP 리소스가 사본에 없으면 Res 문자열 · 그림을 읽다 렌더가 실패한다 — 보드의 성공이 곧 Res의 성공이다.
    @Test @Order(3) fun `Res 문자열 · 벡터는 리소스 APK 사본으로 읽고 그 노드가 commonMain 파일을 가리킨다`() {
        assertNotEquals(resourceApk.first, resourceApk.second, "앱 덤프에 composeResources 에셋이 없어 사본을 만들지 않았다")
        val list = ws.now.board!!.cards.first { it.spec.fqn.endsWith("PearlListPreview") }
        val tree = PearlFixture.tree((list.result as CardResult.Drawn).shot.out.tree!!)
        val files = tree.nodes.map { it.file }.toSet()
        assertTrue(files.containsAll(listOf("PearlScreen.kt", "DrinkCard.kt", "PearlButton.kt")), "트리의 파일 — $files")
    }

    @Test @Order(4) fun `옛 JetBrains @Preview도 직접 단 것과 멀티 프리뷰를 그린다`() {
        assertBoard(PearlKmpFixture.legacy, PearlKmpFixture.LEGACY_CARDS)
    }

    @Test @Order(5) fun `common 파일을 저장하면 Gradle 없이 컴파일해 다시 그린다`() {
        val file = PearlKmpFixture.copy(PearlKmpFixture.filter, copies)
        open(file)
        file.writeText(file.readText().replaceFirst("horizontalArrangement = Arrangement.spacedBy(8.dp)", "horizontalArrangement = Arrangement.spacedBy(10.dp)")
            .also { assertNotEquals(file.readText(), it, "${file.name}에 바꿀 자리가 없다") })
        val r = runBlocking { uc.applySave(listOf(file), "test") }
        assertTrue(r is ReloadResult.Rendered && r.result.ok && r.result.shot.compile != null, "컴파일해 그리지 않았다 — $r")
    }

    @Test @Order(6) fun `expect actual 파일을 저장하면 컴파일하지 않고 Gradle 빌드 필요로 멈춘다`() {
        val file = PearlKmpFixture.copy(PearlKmpFixture.expectActual, copies)
        val r = runBlocking { uc.applySave(listOf(file), "test") }
        assertTrue(r is ReloadResult.NeedsGradleBuild, "멈추지 않았다 — $r")
        assertEquals(listOf(file.absolutePath), ws.now.stale[StaleReasons.EXPECT_ACTUAL]?.files)
    }

    @Test @Order(7) fun `Android 타깃이 없는 모듈은 warmup이 이유를 말하고 멈춘다`() {
        val json = PearlFixture.warmupJson(PearlKmpFixture.noAndroid)
        assertTrue("\"ok\": false" in json && "no Android target" in json, json)
        assertFalse(konan().any { it !in konanBefore }, "Android 타깃 없는 모듈 덤프가 K/N을 받았다")
    }

    private fun open(file: File) {
        val r = runBlocking { uc.openPreview(file.path, null, emptyMap(), "test") }
        assertTrue(r.ok, r.shot.out.message?.text)
        ws.awaitBoardFilled(timeoutMs = 120_000)
    }

    private fun assertBoard(file: File, cards: Int) {
        open(file)
        val board = ws.now.board!!.cards
        assertEquals(cards, board.size, "${file.name}의 카드 수")
        val failed = board.filterNot { (it.result as? CardResult.Drawn)?.shot?.ok == true }
        assertTrue(failed.isEmpty(), "${file.name}에서 못 그린 카드 — ${failed.map { "${it.spec.fqn}: ${(it.result as? CardResult.Drawn)?.shot?.out?.message?.text ?: it.result}" }}")
    }

    private fun konan(): Set<String> = PearlKmpFixture.konan.list().orEmpty().filter { it.startsWith("kotlin-native") }.toSet()

    companion object {
        @JvmStatic fun available() = PearlKmpFixture.available()
    }
}
