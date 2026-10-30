package prevue.daemon

import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.MethodOrderer
import org.junit.jupiter.api.Order
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.TestMethodOrder
import org.junit.jupiter.api.condition.EnabledIf
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.daemon.adapter.render.RenderEngine
import prevue.daemon.adapter.render.ResourceOverlay
import prevue.daemon.domain.port.ResourceKey
import prevue.daemon.domain.port.ResourceLookup
import prevue.daemon.adapter.source.ProjectFiles
import prevue.daemon.adapter.source.SourcePreviewRepository
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.DeviceModel
import prevue.daemon.domain.model.FocusResult
import prevue.daemon.entity.ModuleGraph
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.entity.Semantics
import prevue.daemon.domain.model.ModuleInfo
import prevue.daemon.domain.port.Clock
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.Ports
import prevue.daemon.domain.UseCases
import prevue.daemon.domain.Watchers
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.adapter.compile.HotCompiler
import prevue.daemon.adapter.render.ViewInfoJson
import prevue.daemon.adapter.watch.PollingSourceWatcher
import prevue.daemon.entity.ViewNode
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.ScrollResult
import prevue.daemon.domain.model.TouchResult
import prevue.daemon.domain.policy.NodeTarget
import prevue.daemon.domain.policy.ScrollReport
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.awaitState
import prevue.daemon.fake.awaitUntil
import prevue.daemon.fake.awaitValue
import prevue.daemon.fake.eventually

/**
 * 진짜 layoutlib으로 저장소 안 픽스처 `fixtures/pearl`를 그린다(`./gradlew integrationTest`, 로컬만).
 * 가짜 렌더러로는 못 잡는 것을 본다 — 조용히 되돌아가도 기능은 멀쩡해 눈으로는 못 잡는 종류다.
 * 1~10은 `PearlPreviews.kt`(30장)로 렌더러의 성질 하나씩을, 11~는 목록 ↔ 상세 앱으로 조작을 잇댄 결과(엣지)를 본다 — 데몬과 같은 결선
 * (진짜 컴파일러 · 감시 · 프레임 루프)에서 기대 화면과 생존만 판정하고, 앞의 성질은 다시 단언하지 않는다.
 * 덤프는 [PearlFixture.warmup]이 뜬다. 툴체인 · Android SDK가 없으면 건너뛴다. 픽스처는 읽기만 한다 — 저장은 앱 소스의 복사본에 한다.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation::class)
@EnabledIf("prevue.daemon.RenderIntegrationTest#available")
class RenderIntegrationTest {
    private val out = Files.createTempDirectory("prevue-slow").toFile()
    private lateinit var engine: RenderEngine
    private lateinit var uc: UseCases
    private lateinit var ws: Workspace
    private lateinit var repo: File
    private lateinit var compiler: HotCompiler
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val appRoot = File(out, "app").canonicalFile
    private lateinit var appFile: File
    private lateinit var screenFile: File
    private lateinit var watcher: PollingSourceWatcher
    private val logs = java.util.concurrent.CopyOnWriteArrayList<String>()
    private val overlay by lazy { ResourceOverlay.install(engine.renderer) ?: error("렌더러의 리소스 저장소를 감싸지 못했다") }

    @BeforeAll fun up() {
        // 데몬과 같은 조립이다 — 라이브러리 모듈도 앱 클래스패스로 그린다(D-38).
        val (home, app) = PearlFixture.warmup()
        repo = home.repoRoot
        val (spec, onApp) = ClasspathSpec.forRender(home, app, File(out, "overlay"))
        assertTrue(onApp, "앱 덤프가 :feature:pearl를 담지 않는다")
        engine = RenderEngine(spec, PearlFixture.layoutlib()!!, out)
        compiler = PearlFixture.hotCompiler(home, File(out, "overlay"))
        val module = ModuleInfo(home.repoRoot.absolutePath, home.project, home.variant, home.kotlinModuleName, spec.borrowedFrom, null)
        appFile = PearlFixture.appCopy(appRoot)
        screenFile = File(appFile.parentFile, "PearlScreen.kt")
        val watched = listOf(appRoot)
        watcher = PollingSourceWatcher(watched)
        ws = Workspace(module, Clock(System::currentTimeMillis), ModuleGraph.single(home.project, home.sourceRoots, emptyList()), watched)
        uc = UseCases(ws, Ports(engine, engine, compiler, SourcePreviewRepository(spec.classPath), ProjectFiles(home.repoRoot, home.sourceRoots).apply { buildInBackground(scope) }),
            scope, Watchers(sources = watcher))
        val r = runBlocking { uc.openPreview(PearlFixture.board!!.path, null, emptyMap(), "test") }
        assertTrue(r.ok, r.shot.out.message?.text)
        ws.awaitBoardFilled(timeoutMs = 120_000)
    }

    @Test @Order(31) fun `외부 빌드의 클래스 누락은 정상 산출물을 보존하고 새 렌더로 복구된다`() = runBlocking {
        val preview = ws.now.board?.focusCard?.spec ?: ws.now.current!!
        val initial = engine.written(engine.show(preview))
        assertTrue(initial.ok, initial.message?.text)
        val image = initial.image!!
        val tree = initial.tree!!
        val beforeImage = image.readBytes()
        val beforeTree = tree.readBytes()
        engine.buildChanged()
        val missing = engine.show(preview.copy(fqn = "missing.DuringBuildKt.Preview"))
        engine.written(missing)
        assertEquals(FailureKind.NOT_FOUND, missing.failure)
        assertTrue(beforeImage.contentEquals(image.readBytes()))
        assertTrue(beforeTree.contentEquals(tree.readBytes()))
        engine.buildChanged()
        val recovered = engine.written(engine.show(preview))
        assertTrue(recovered.ok, recovered.message?.text)
        assertTrue(beforeImage.contentEquals(recovered.image!!.readBytes()))
        engine.codeChanged()
        val realFailure = engine.written(engine.show(preview.copy(fqn = "missing.PermanentKt.Preview")))
        assertEquals(FailureKind.NOT_FOUND, realFailure.failure)
        assertFalse(image.exists())
        assertTrue(engine.written(engine.show(preview)).ok)
    }

    @AfterAll fun down() {
        runCatching { runBlocking { app?.stop() } }
        scope.cancel()
        runCatching { engine.close() }; runCatching { compiler.close() }
        out.deleteRecursively(); PearlFixture.stopGradle()
    }

    /** 켜진 카드의 화면 안 목록 카드 하나의 가운데 — 그림 좌표를 박지 않는다. */
    private fun cardCenter(on: FocusResult.On): Pair<Int, Int> {
        val o = on.result.shot.out
        val c = PearlFixture.visibleCards(o.tree!!).maxBy { it.bottom }
        return (c.left + c.right) / 2 to (c.top + c.bottom) / 2
    }

    // 로더를 세대마다 한 번만 받는다. 깨지면 카드마다 로더를 새로 받아 보드가 몇 배 느려진다.
    // `tasksOnLoader`는 장부라 로더를 새로 받아도 오른다 — 카드마다의 새 로더 표시와 태스크 짓는 시간을 본다.
    @Test @Order(1) fun `한 세대의 카드는 로더 하나를 같이 쓴다`() {
        assertEquals(PearlFixture.BOARD_CARDS, ws.now.board!!.cards.size, "보드 카드 수 — 멀티 프리뷰 · @PreviewParameter 펼치기가 바뀌었다")
        val outs = ws.now.board!!.cards.mapNotNull { (it.result as? CardResult.Drawn)?.shot?.out }
        assertEquals(PearlFixture.BOARD_CARDS, outs.size, "그린 카드가 ${outs.size}장")
        val fresh = outs.count { it.freshLoader }
        assertTrue(fresh <= 1, "로더를 새로 받은 카드가 $fresh/${outs.size}장")
        // 표시만 믿지 않는다 — 클래스는 첫 렌더에 올라오므로 로더를 같이 쓰면 둘째 장부터 짓기+그리기가 수십 ms다
        // (실측 첫 장 ~1.9초, 나머지 중앙값 ~100ms. 장마다 새 로더면 ~700ms). 여유를 크게 둔다.
        val ms = outs.map { it.taskMs + it.renderMs }
        val median = ms.sorted()[ms.size / 2]
        assertTrue(median * 5 < ms.max(), "짓기+그리기 중앙값 ${median}ms · 가장 긴 것 ${ms.max()}ms")
        // NFR-9. 카드의 단계에는 렌더 단계와 쓰기 레인의 단계가 함께 있다 — 쓰기 단계는 쓰기가 끝난 뒤 합친다.
        val stages = listOf("buildMs", "treeMs", "writeQueueMs", "pngMs", "jsonMs", "pruneMs")
        val partial = outs.filterNot { it.phases.keys.containsAll(stages) }
        assertTrue(partial.isEmpty(), "단계가 빠진 카드 ${partial.size}장 — ${partial.firstOrNull()?.phases}")
    }

    // 다음 세대 로더가 이 세대가 쓴 라이브러리 클래스를 미리 쥐되 프로젝트 클래스는 쥐지 않는다.
    // 비면 저장 직후 첫 카드가 클래스 2천여 개를 그 자리에서 정의하고, 프로젝트 클래스를 쥐면 그림이 저장 한 번씩 늦는다(옛 오버레이).
    // 렌더러 판올림으로 `nonProjectLoadedClasses`의 뜻이나 프리로더가 바뀌면 여기서 잡힌다.
    @Test @Order(2) fun `다음 로더가 이 세대의 라이브러리 클래스를 미리 쥔다`() {
        var c = engine.preloaded()
        eventually(20_000, pollMs = 200) { c = engine.preloaded(); c.held * 10 >= c.used * 9 }
        assertTrue(c.used > 1000, "이 세대가 쓴 라이브러리 클래스가 ${c.used}개")
        assertTrue(c.held * 10 >= c.used * 9, "다음 로더가 ${c.held}/${c.used}개만 쥐었다")
        assertTrue(c.projectHeld.isEmpty(), "다음 로더가 프로젝트 클래스 ${c.projectHeld.size}개를 쥐었다 — ${c.projectHeld.take(3)}")
    }

    // 0.7.3 회귀. 인터랙티브로 들어가 조작하면 그림이 바뀌어야 한다 — 가짜 렌더러는 그림이 없어 못 잡는다.
    @Test @Order(3) fun `인터랙티브에서 끌면 그림이 바뀐다`() {
        val on = runBlocking { uc.focusCard(0, on = true, by = "test") } as FocusResult.On
        assertTrue(on.result.ok, on.result.shot.out.message?.text)
        runBlocking { engine.awaitWrites() }
        val png = on.result.shot.out.image!!
        val before = png.readBytes()
        val (x, y) = cardCenter(on)

        // 터치 사이에 라이브 세션 루프가 틱을 돌린다 — 그 틱이 입력을 소비해 스크롤이 일어난다.
        val now = runBlocking {
            uc.touch("press", x, y, "test", settle = false); delay(50)
            for (i in 1..8) { uc.touch("drag", x, y - i * 150, "test", settle = false); delay(50) }
            uc.touch("release", x, y - 8 * 150, "test", settle = false)
            uc.awaitSettled()
        }
        assertTrue(now.out.ok, "정착한 그림이 없다")
        runBlocking { engine.awaitWrites() }
        assertFalse(before.contentEquals(now.out.image!!.readBytes()), "끈 뒤에도 그림이 같다")
        runBlocking { uc.focusCard(0, on = false, by = "test") }
    }

    // D-59. 카드를 누르면 리플이 단색으로 바뀌어 틱이 가볍다. 반짝이 리플이면 한 틱 ~250ms(CPU가 셰이더를 해석한다).
    // 렌더러 판올림으로 리플 내부가 바뀌면 바꿔 끼운 수가 0이 되어 여기서 잡힌다.
    @Test @Order(4) fun `인터랙티브에서 누른 리플은 단색이라 틱이 가볍다`() {
        val on = runBlocking { uc.focusCard(0, on = true, by = "test") } as FocusResult.On
        assertTrue(on.result.ok, on.result.shot.out.message?.text)
        val before = engine.calmedRipples
        val (x, y) = cardCenter(on)
        val ms = runBlocking {
            uc.touch("press", x, y, "test", settle = false)
            delay(250)
            uc.touch("release", x, y, "test", settle = false)
            uc.awaitSettled()
            uc.frames.value.trace.mapNotNull { it["tickMs"] as Long? }
        }
        assertTrue(ms.size >= 12, "틱이 ${ms.size}번")
        assertTrue(engine.calmedRipples > before, "바꿔 끼운 리플이 없다 — 카드를 못 눌렀거나 리플 내부가 바뀌었다")
        assertTrue(ms.max() < 150, "누른 뒤 가장 긴 틱 ${ms.max()}ms — ${ms}")
        runBlocking { uc.focusCard(0, on = false, by = "test") }
    }

    // D-58. 휠은 마우스 ACTION_SCROLL로 들어가 스크롤만 한다 — 누름이 아니라 리플이 켜지지 않는다.
    // 렌더러 판올림으로 루트 · 이벤트 경로가 바뀌면 scroll()이 false이거나 그림이 그대로라 여기서 잡힌다.
    @Test @Order(5) fun `인터랙티브에서 휠을 넣으면 스크롤되고 누름은 없다`() {
        val on = runBlocking { uc.focusCard(0, on = true, by = "test") } as FocusResult.On
        assertTrue(on.result.ok, on.result.shot.out.message?.text)
        runBlocking { engine.awaitWrites() }
        val before = on.result.shot.out.image!!.readBytes()
        val ripples = engine.calmedRipples
        val ok = runBlocking { repeat(6) { uc.scroll(540, 1200, 0f, 100f, "test"); delay(16) }; uc.scroll(540, 1200, 0f, 0f, "test") }
        assertTrue(ok, "휠을 넣지 못했다")
        val now = runBlocking { uc.awaitSettled() }
        runBlocking { engine.awaitWrites() }
        assertFalse(before.contentEquals(now.out.image!!.readBytes()), "휠 뒤에도 그림이 같다")
        assertEquals(ripples, engine.calmedRipples, "휠이 누름을 만들었다")
        runBlocking { uc.focusCard(0, on = false, by = "test") }
    }

    // D-68. values 값을 렌더러 리소스에 얹으면 같은 로더로 그 값을 그리고, 되돌리면 원래 그림과 바이트까지 같다.
    // 판정의 전제(저장 전 XML 값 == 렌더러가 그리는 값)도 본다 — 렌더러 판올림으로 리소스 APK 값의 모양이나 저장소 관리자가 바뀌면 여기서 잡힌다.
    @Test @Order(6) fun `values 값을 얹으면 같은 로더로 그 값을 그린다`() {
        val xml = PearlFixture.strings
        val old = xml.readText()                       // 읽기만 한다 — 고친 내용은 파서에 문자열로 준다
        val entries = overlay.parse(xml, old)!!
        assertTrue(entries.size >= 5, "$entries")
        entries.forEach { assertEquals(ResourceLookup.Value(it.value), overlay.lookup(it.key), "${it.key}") }
        val card = ws.now.board!!.cards.first { it.spec.functionName == "PearlListPreview" }.spec
        fun draw(): ByteArray {
            val o = runBlocking { engine.show(card).also { engine.awaitWrites() } }
            assertTrue(o.ok, o.message?.text)
            return o.image!!.readBytes()
        }
        val before = draw()
        val gen = engine.loaderGen
        val key = entries.first { it.key.name == "pearl_title" }.key
        assertTrue(overlay.put(xml, old.replace(">Pearl</string>", ">Pick a drink</string>"), listOf(key)))
        assertEquals(ResourceLookup.Value("Pick a drink"), overlay.lookup(key))
        assertFalse(before.contentEquals(draw()), "얹은 값으로 그리지 않았다")
        assertEquals(gen, engine.loaderGen, "로더를 새로 받았다 — 값만 바뀌면 같은 로더다")
        assertTrue(overlay.put(xml, old, listOf(key)))
        assertTrue(before.contentEquals(draw()), "되돌린 값의 그림이 원래 그림과 다르다")
    }

    // 렌더러는 리소스 APK의 음수 치수를 부호 없이 읽는다(`-3dp` → `16777213dp`). 데몬이 부트스트랩 뒤에 바로잡아 판정(저장 전 XML 값 == 렌더러 값)이 선다.
    // 렌더러 판올림으로 그 모양이 바뀌면 `negatives`가 null이고, 렌더러가 고쳐졌으면 고친 수가 0이다 — 둘 다 여기서 잡힌다.
    @Test @Order(7) fun `리소스 APK의 음수 치수를 기기처럼 읽는다`() {
        val fixed = engine.negatives ?: error("음수 치수를 바로잡지 못했다 — APK를 못 읽었거나 렌더러의 모양이 바뀌었다(테스트 로그의 [prevue] 줄)")
        assertTrue(fixed.count >= 1, "고친 것이 없다 — 렌더러가 고쳐졌으면 ApkNegatives를 걷어낸다")
        val key = ResourceKey("dimen", "pearl_badge_overlap", "")
        assertEquals(ResourceLookup.Value("-3dp"), overlay.lookup(key))
        val text = """<resources><dimen name="pearl_badge_overlap">-3dp</dimen></resources>"""
        val xml = File(out, "res/values/neg.xml").apply { parentFile.mkdirs(); writeText(text) }
        val entry = overlay.parse(xml, text)!!.single()
        assertEquals(overlay.lookup(key), ResourceLookup.Value(entry.value), "저장 전 XML 값과 렌더러 값이 갈린다 — 47 판정이 낡음으로 간다")
    }

    // D-69. 겨냥은 지금 화면의 트리를 본다 — ComposeViewAdapter는 제 onLayout에서만 트리를 지어, 다시 짓게 하지 않으면 굴린 뒤에도 처음 트리다
    // (그림은 움직였는데 박스는 그대로였다). 렌더러 판올림으로 그 private 경로가 바뀌면 여기서 잡힌다.
    @Test @Order(8) fun `굴린 뒤의 트리로 겨냥한다`() {
        runBlocking { uc.focusCard(0, on = true, by = "test") } as FocusResult.On
        val line = "DrinkCard.kt:" + PearlFixture.lineOf(PearlFixture.card, "DrinkName(drink)")
        val top = runBlocking { uc.scroll.screens(-1.0, horizontal = false, at = null, by = "test") } as ScrollResult.Settled
        assertTrue(!top.moved, "맨 위에서 위로 굴렸는데 움직였다")
        val before = visible(line)
        val r = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test") } as ScrollResult.Settled
        assertTrue(r.moved, "한 화면 굴렸는데 노드 자리가 그대로다")
        val after = visible(line)
        assertTrue(after.map { it.node.sameBox } != before.map { it.node.sameBox }, "굴린 뒤에도 처음 트리다 — ${after.map { it.node.top }}")
        val pick = after.last()
        val t = runBlocking { uc.touch.at("$line#${pick.n}", "tap", "test", settle = true) }
        assertEquals(pick.node, (t as TouchResult.Settled).aim!!.node, "굴린 뒤의 트리로 겨냥하지 않는다")
        runBlocking { uc.focusCard(0, on = false, by = "test") }
    }

    private fun visible(at: String): List<prevue.daemon.domain.model.Numbered> =
        when (val t = runBlocking { uc.touch.at(at, "tap", "test", settle = true) }) {
            is TouchResult.Missed -> (t.miss as prevue.daemon.domain.model.Miss.Choose).candidates
            else -> error("한 화면에 카드가 하나뿐이다 — $t")
        }

    private fun scrollUntil(at: String, n: Int): Int {
        repeat(20) { i ->
            if (visible(at).any { it.n == n }) return i
            val r = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test") } as ScrollResult.Settled
            assertTrue(r.moved, "#$n 에 닿기 전에 끝났다")
        }
        error("20화면 안에 #$n 이 안 보인다")
    }

    // layoutlib의 창 세션은 터치 모드를 주지 않아, 켜자마자 첫 포커서블(여기선 버튼)이 포커스를 쥐고 스크롤 컨테이너는 그리로 굴렀다.
    // 창을 터치 모드로 붙이면 기기처럼 아무것도 포커스가 없다 — 깨지면 누르지 않은 TextField에 `type`이 들어간다.
    // 목록 카드들은 켜자마자 포커스를 받지 않아(게으른 그리드) 디자인 시스템의 버튼 프리뷰로 본다.
    @Test @Order(9) fun `인터랙티브를 켜자마자 포커스가 없다`() {
        val button = PreviewSpec("com.example.pearl.core.designsystem.PearlButtonKt.PearlButtonPreview", "PearlButtonPreview", emptyMap(), null, 0)
        val session = runBlocking { engine.open(button, interactive = true, ownLoader = false) }
        try {
            assertTrue(session.opened.ok)
            repeat(20) { session.tick() }
            assertEquals(null, engine.touchModeError)
            assertEquals(null, engine.focusedView())
        } finally { session.close() }
    }

    // 굴리면 게으른 그리드가 화면 밖 아이템을 미리 짓는다(prefetch) — 배치되지 않은 그 노드가 원점 bounds로 트리에 실리면
    // touch --at 후보가 화면에 없는 카드를 내놓아 엉뚱한 곳을 누른다. 휠이 아니라 끌기로 굴린다(휠은 이 조립에서 목록을 못 굴린다).
    @Test @Order(10) fun `굴린 뒤의 트리에 배치되지 않은 목록 아이템이 없다`() {
        val on = runBlocking { uc.focusCard(0, on = true, by = "test") } as FocusResult.On
        assertTrue(on.result.ok, on.result.shot.out.message?.text)
        try {
            val (x, y) = cardCenter(on)
            val now = runBlocking {
                uc.touch("press", x, y, "test", settle = false); delay(50)
                for (i in 1..6) { uc.touch("drag", x, y - i * 120, "test", settle = false); delay(50) }
                uc.touch("release", x, y - 6 * 120, "test", settle = false)
                uc.awaitSettled()
            }
            assertTrue(now.out.ok, "정착한 그림이 없다")
            runBlocking { engine.awaitWrites() }
            val cards = PearlFixture.cards(now.out.tree!!)
            assertTrue(cards.size >= 4, "트리의 목록 카드가 ${cards.size}개")
            assertTrue(cards.none { it.left == 0 }, "왼쪽이 0인 카드 — ${cards.filter { it.left == 0 }.map { it.sameBox }}")
            val overlaps = cards.flatMapIndexed { i, a -> cards.drop(i + 1).filter { b -> a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom }.map { a.sameBox to it.sameBox } }
            assertTrue(overlaps.isEmpty(), "겹친 카드 — $overlaps")
        } finally {
            runBlocking { uc.focusCard(0, on = false, by = "test") }
        }
    }

    // ── 엣지 — 목록 ↔ 상세 앱(`PearlApp`)을 데몬과 같은 결선으로 조작한다 ──
    // 판정 · 조준은 정착한 트리로만 한다(두 번 잇달아 같을 때). 전환 도중의 트리로 좌표를 고르면 기기에서도 빗나가는 탭을 버그로 잡는다.

    private data class Screen(val name: String, val cards: List<ViewNode>, val shown: List<ViewNode>, val back: ViewNode?, val grid: ViewNode?) {
        val key get() = Triple(name, cards.map { it.sameBox }, back?.sameBox)
        fun back(why: String) = back ?: error("$why — 상세에 ← 노드가 없다")
        fun card(i: Int, why: String) = shown.getOrNull(i) ?: error("$why — 다 보이는 카드가 ${shown.size}개라 ${i + 1}번째가 없다")
    }

    private var app: EntryPoints? = null
    private lateinit var first: Screen
    private var logMark = 0

    /** 뷰어가 앱 카드를 켜고 스트림을 보는 상태 — 프레임 루프가 실제로 돌고, 감시가 복사본의 저장을 받는다. 엣지마다 부르고, 그 엣지의 로그는 여기서부터 본다. */
    private fun openApp() {
        if (app == null) {
            val ui = EntryPoints(uc, 0, PrevueCheckout(PearlFixture.viewer!!), out, scope, {}, log = { logs += it })
            app = ui
            ui.hotSwap.start()
            val r = runBlocking { uc.openPreview(appFile.path, null, emptyMap(), "test") }
            assertTrue(r.ok, r.shot.out.message?.text)
            ws.awaitBoardFilled(timeoutMs = 60_000)
            focus(true)
            first = settled("list", "처음")
            assertTrue(first.shown.size >= 4, "처음 목록에 다 보이는 카드가 ${first.shown.size}개")
        }
        if (!ws.now.interactive) focus(true)
        logMark = logs.size
    }

    /** 스트림을 끄면 구독이 끊긴다 — 켤 때마다 다시 구독한다. */
    private fun focus(on: Boolean) {
        val r = runBlocking { uc.focusCard(0, on = on, by = "test") }
        if (on) {
            assertTrue((r as FocusResult.On).result.ok, r.result.shot.out.message?.text)
            app!!.frames.subscribe(java.io.OutputStream.nullOutputStream())
        }
    }

    private fun screen(): Screen {
        runBlocking { uc.catchUp("test"); engine.awaitWrites() }
        val tree = PearlFixture.tree(ws.now.lastResult!!.tree!!)
        val nodes = tree.nodes
        fun on(name: String) = nodes.any { it.name == name && it.file == "PearlApp.kt" && it.right > it.left && it.bottom > it.top }
        val list = on("PearlScreen")
        val detail = on("DrinkDetailScreen")
        val name = when { list && !detail -> "list"; detail && !list -> "detail"; list -> "both"; else -> "none" }
        val cards = tree.cards.filter { it.file == "PearlScreen.kt" }
        val grid = nodes.firstOrNull { it.name == "LazyVerticalGrid" && it.file == "PearlScreen.kt" }
        val back = nodes.firstOrNull { it.name == "BackButton" && it.right > it.left }
        return Screen(name, cards, cards.filter { NodeTarget.shown(it, tree.live) }, back, grid)
    }

    /**
     * 트리가 두 번 잇달아 같을 때의 화면. 정착했어도 [want]가 아니면 입력이 아직 안 먹었을 수 있어 기한까지 더 본다 — null 이면 목록 · 상세 어느 쪽이든.
     */
    private fun settled(want: String?, why: String): Screen {
        val until = System.currentTimeMillis() + 15_000
        var last: Screen? = null
        var calm: Screen? = null
        while (System.currentTimeMillis() < until) {
            Thread.sleep(300)                                // 실제 시간 — 300ms 사이로 두 번 같으면 정착으로 본다
            val s = runCatching { screen() }.getOrNull() ?: continue
            if (s.key == last?.key) {
                calm = s
                if (if (want == null) s.name == "list" || s.name == "detail" else s.name == want) return s
            }
            last = s
        }
        error("$why — 15초 안에 ${want ?: "목록 · 상세"}로 정착하지 않았다. 마지막 정착 ${calm?.name} · 마지막 ${last?.name}")
    }

    private fun center(n: ViewNode) = (n.left + n.right) / 2 to (n.top + n.bottom) / 2

    /** 뷰어의 클릭 — 정착을 기다리지 않고, 그림은 프레임 루프가 민다. */
    private fun click(n: ViewNode) { val (x, y) = center(n); runBlocking { uc.touch("tap", x, y, "viewer", settle = false) } }

    /** 뷰어의 휠 — 그리드 가운데에 네 칸으로 나눠 넣는다. */
    private fun wheel(s: Screen, dy: Float) {
        val (x, y) = center(s.grid ?: error("목록에 그리드 노드가 없다"))
        runBlocking { repeat(4) { assertTrue(uc.scroll(x, y, 0f, dy / 4, "viewer"), "휠을 넣지 못했다"); Thread.sleep(30) } }   // 실제 시간 — 사람 휠의 칸 간격
    }

    private fun backToList(s: Screen, why: String): Screen = if (s.name == "list") s else { click(s.back(why)); settled("list", "$why ←") }

    private fun assertAlive() {
        assertEquals(null, engine.lost.value?.reason, "렌더 스레드를 잃었다")
        val bad = logs.drop(logMark).filter { "실패" in it || "Exception" in it || "ok=false" in it }
        assertTrue(bad.isEmpty(), "감시 · 프레임 루프 로그 — $bad")
    }

    /** 처음 화면 — 저장한 글자 크기 · 굵기만큼 카드가 몇 px 움직일 수 있어 카드 한 줄 높이의 1/4 안이면 맨 위다. */
    private fun assertAtTop(s: Screen) {
        val (want, got) = first.shown.first() to (s.shown.firstOrNull() ?: error("처음 화면이 아니다 — 다 보이는 카드가 없다"))
        assertTrue(kotlin.math.abs(got.top - want.top) < (want.bottom - want.top) / 4, "처음 화면이 아니다 — 맨 위 카드 ${got.sameBox} / 처음 ${want.sameBox}")
    }

    /** [file]의 [from]을 [to]로 저장하고 감시가 그린 결과를 기다린다. 그 저장의 감시 로그 줄. */
    private fun save(file: File, from: String, to: String): String {
        val before = logs.size
        val text = file.readText()
        assertTrue(from in text, "${file.name}에 '$from'이 없다")
        file.writeText(text.replaceFirst(from, to))
        val w = runBlocking { uc.awaitRender(listOf(file), 60_000) }
        assertTrue(w !is prevue.daemon.domain.model.WaitResult.TimedOut && w !is prevue.daemon.domain.model.WaitResult.CompileFailed, "$w")
        return awaitValue({ "저장의 감시 로그 — ${logs.drop(before)}" }, 10_000, pollMs = 100) { logs.drop(before).firstOrNull { it.startsWith("reload [${file.name}]") } }
    }

    @Test @Order(11) fun `굴린 뒤 상세에 들어갔다 나오면 그 자리로 돌아온다`() {
        openApp()
        wheel(settled("list", "시작"), 900f)
        val scrolled = settled("list", "굴림")
        assertFalse(scrolled.shown == first.shown, "휠로 굴렀는데 목록이 그대로다")
        click(scrolled.card(scrolled.shown.size / 2, "카드 클릭"))
        val back = backToList(settled("detail", "카드 클릭"), "상세")
        assertEquals(scrolled.shown.map { it.sameBox }, back.shown.map { it.sameBox }, "돌아온 목록의 자리가 들어가기 전과 다르다")
        assertAlive()
    }

    // 굴린 직후의 트리로 겨냥한다 — 화면 밖 카드가 원점 박스로 섞이거나(유령 카드) 그리드에 잘린 카드의 머리글 자리를 누르면 `#N`이 빗나간다.
    @Test @Order(12) fun `굴린 직후 touch --at 의 번호마다 그 카드를 눌러 상세로 간다`() {
        openApp()
        val at = "PearlScreen.kt:" + PearlFixture.lineOf(screenFile, "DrinkCard(drink, ambient = ambient, onClick = { onDrinkClick(drink) })")
        for (n in 1..6) {
            wheel(settled("list", "#$n 앞"), if (n % 2 == 1) 300f else -150f)
            val list = settled("list", "#$n 앞 굴림")
            val seen = (runBlocking { uc.touch.at(at, "tap", "test", settle = true) } as? TouchResult.Missed)?.miss as? prevue.daemon.domain.model.Miss.Choose
                ?: error("굴린 뒤 카드 줄이 하나뿐이다")
            val k = seen.candidates.getOrNull(n - 1)?.n ?: error("화면 안 카드가 ${seen.candidates.size}개라 ${n}번째가 없다")
            val t = runBlocking { uc.touch.at("$at#$k", "tap", "test", settle = true) }
            val aim = (t as? TouchResult.Settled)?.aim ?: error("#$n 을 누르지 못했다 — $t")
            val d = settled(null, "#$n")
            assertEquals("detail", d.name, "#$n(${aim.node.sameBox} · ${aim.x},${aim.y})을 눌렀는데 상세가 아니다")
            val back = runBlocking { uc.touch.at("DrinkDetailScreen.kt:${d.back("#$n").line}", "tap", "test", settle = true) }
            assertTrue(back is TouchResult.Settled, "← 를 누르지 못했다 — $back")
            assertEquals(list.shown.map { it.sameBox }, settled("list", "#$n 뒤 ←").shown.map { it.sameBox }, "#$n 에서 돌아온 목록의 자리가 다르다")
        }
        assertAlive()
    }

    @Test @Order(13) fun `카드를 길게 눌러도 상세로 간다`() {
        openApp()
        val (x, y) = center(settled("list", "시작").card(0, "롱프레스"))
        val t = runBlocking { uc.touch("long", x, y, "test", settle = true) }
        assertTrue(t is TouchResult.Settled && t.result.ok, "롱프레스를 넣지 못했다 — $t")
        backToList(settled("detail", "롱프레스"), "롱프레스")
        assertAlive()
    }

    // D-11. 저장하면 상태를 버리고 처음 화면에서 다시 시작한다.
    @Test @Order(14) fun `상세에서 컴파일이 필요한 저장을 해도 처음 화면이다`() {
        openApp()
        wheel(settled("list", "시작"), 600f)
        click(settled("list", "굴림").card(0, "카드 클릭"))
        settled("detail", "카드 클릭")
        val line = save(screenFile, "fontWeight = FontWeight.Bold", "fontWeight = FontWeight.ExtraBold")
        assertTrue(line.contains("ok=true") && !line.endsWith(" literals"), "컴파일 저장 길이 아니다 — $line")
        assertAtTop(settled("list", "컴파일 저장"))
        assertAlive()
    }

    // D-67 · D-11. 인터랙티브 밖에서는 리터럴만 바꾼 저장이 값만 갈아 끼우는 길로 간다(그 내용으로 한 번 그린 뒤부터). 인터랙티브 중에는 그 길을 막는다 —
    // 값만 넣으면 상세에 머문 채 남아 "저장하면 처음부터"가 깨진다. 길이 열려 있음을 먼저 보여야 막힌 것이 의미가 있다.
    @Test @Order(15) fun `상세에서 리터럴만 바꿔 저장해도 값만 갈아 끼우지 않고 처음 화면이다`() {
        openApp()
        focus(false)
        save(screenFile, "fontSize = 28.sp", "fontSize = 29.sp")
        val open = save(screenFile, "fontSize = 29.sp", "fontSize = 30.sp")
        assertTrue(open.contains("ok=true") && open.endsWith(" literals"), "인터랙티브 밖에서 리터럴 길이 열리지 않았다 — $open")
        focus(true)
        click(settled("list", "다시 켬").card(0, "카드 클릭"))
        settled("detail", "카드 클릭")
        val line = save(screenFile, "fontSize = 30.sp", "fontSize = 31.sp")
        assertTrue(line.contains("ok=true") && !line.endsWith(" literals"), "인터랙티브 중에 리터럴 값만 갈아 끼웠다 — $line")
        assertAtTop(settled("list", "리터럴 저장"))
        assertAlive()
    }

    // 나가는 상세가 아직 덮고 있는 동안의 탭은 기기에서도 어디 맞을지 모른다 — 어느 화면이든 정착하고 살아 있기만 하면 된다.
    @Test @Order(16) fun `전환 도중의 탭도 정착하고 렌더 스레드를 잃지 않는다`() {
        openApp()
        val card = settled("list", "시작").card(0, "카드")
        repeat(3) { i ->
            click(card)
            click(settled("detail", "${i + 1}회 카드 클릭").back("${i + 1}회"))
            Thread.sleep(100)                                // 실제 시간 — 나가는 상세가 아직 덮고 있는 동안에 누른다
            click(card)
            backToList(settled(null, "${i + 1}회 ← 직후 탭"), "${i + 1}회")
        }
        assertAlive()
    }

    // 인터랙티브 세션은 저장 · 다시 켬마다 사설 로더(클래스 ~3천 개)를 새로 받는다. 앞 세션을 놓은 뒤 무엇이든 그 로더의 클래스를
    // 쥐면 저장할 때마다 Metaspace가 쌓인다(스트레스 300번에 184 → 573MB). 저장 · 다시 켬을 번갈아 여섯 번 한 뒤 GC로 돌아오는 클래스 수로 본다.
    @Test @Order(17) fun `인터랙티브를 다시 켜도 앞 세션의 로더가 남지 않는다`() {
        openApp()
        var weight = if ("FontWeight.ExtraBold" in screenFile.readText()) "ExtraBold" else "Bold"
        fun session(i: Int) {
            if (i % 2 == 0) { focus(false); focus(true) } else {
                val next = if (weight == "Bold") "ExtraBold" else "Bold"
                save(screenFile, "fontWeight = FontWeight.$weight", "fontWeight = FontWeight.$next")
                weight = next
            }
            click(settled("list", "다시 시작 $i").card(0, "카드 클릭"))
            backToList(settled("detail", "카드 클릭 $i"), "카드 클릭 $i")
        }
        fun loadedAfterGc(): Int {
            repeat(3) { System.gc(); Thread.sleep(200) }   // 실제 시간 — GC 는 끝을 알리지 않는다
            return java.lang.management.ManagementFactory.getClassLoadingMXBean().loadedClassCount
        }
        session(0)
        val before = loadedAfterGc()
        repeat(6) { session(it + 1) }
        val grown = loadedAfterGc() - before
        assertTrue(grown < 2_000, "세션 여섯 번(저장 셋 · 다시 켬 셋) 뒤 GC에도 클래스가 ${grown}개 늘었다 — 앞 세션의 로더가 남는다")
        assertAlive()
    }

    // 카드는 모두 같은 줄이라 줄만으로는 화면 밖 카드에 이름이 없었다(데모 take7). D-76 — 에이전트가 화면 단위로 굴리고 보고 누른다.
    @Test @Order(18) fun `게으른 목록의 #N 은 목록 전체에서 N번째라 화면 단위로 굴려 그 카드를 누른다`() {
        openApp()
        val at = "PearlScreen.kt:" + PearlFixture.lineOf(screenFile, "DrinkCard(drink, ambient = ambient, onClick = { onDrinkClick(drink) })")
        val screens = scrollUntil(at, 50)
        assertTrue(screens >= 1, "#50 이 처음부터 보였다 — 굴림을 재지 못한다")
        val t = runBlocking { uc.touch.at("$at#50", "tap", "test", settle = true) }
        assertTrue(t is TouchResult.Settled && t.aim!!.index == 50, "$t")
        backToList(settled("detail", "#50 누름"), "#50")
        assertAlive()
    }

    @Test @Order(19) fun `scroll 은 나타난 · 사라진 카드를 key 로 알리고 나타난 카드의 at 으로 그 카드를 누른다`() {
        openApp()
        runBlocking { uc.scroll.screens(-10.0, horizontal = false, at = null, by = "test") }
        fun seen(): Set<Any?> {
            val grid = runBlocking { uc.awaitSettled() }.look.tree.states.single { it.total == PearlFixture.DRINKS }
            return grid.items.filter { ScrollReport.visible(grid, it) > 0 }.map { it.key }.toSet()
        }
        val before = seen()
        val r = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test") } as ScrollResult.Settled
        val after = seen()
        val list = r.container!!.list ?: error("게으른 그리드를 굴렸는데 container 에 목록 요약이 없다 — $r")
        assertEquals(PearlFixture.DRINKS, list.total)
        assertEquals(true, list.canScrollForward)
        assertEquals(true, list.canScrollBackward)
        assertEquals(after - before, r.appeared.map { it.key }.toSet(), "나타난 카드가 굴리기 전후 key 의 차집합이 아니다")
        assertEquals(before - after, r.disappeared.map { it.key }.toSet(), "사라진 카드가 굴리기 전후 key 의 차집합이 아니다")
        assertTrue(r.appeared.isNotEmpty() && r.disappeared.isNotEmpty(), "$r")
        for (item in r.appeared) {
            assertTrue(item.key != null && item.box != null && item.at?.startsWith("PearlScreen.kt:") == true, "$item")
            assertTrue(item.semantics?.text?.isNotEmpty() == true && "click" in item.semantics!!.actions, "카드의 시맨틱이 없다 — $item")
        }
        assertTrue(r.disappeared.all { it.semantics?.text != null }, "사라진 카드의 시맨틱이 없다 — ${r.disappeared}")
        val pick = r.appeared.first { it.visible == 1.0 }
        val t = runBlocking { uc.touch.at(pick.at!!, "tap", "test", settle = true) }
        assertEquals(pick.box, (t as TouchResult.Settled).aim!!.node.sameBox, "나타난 카드의 at 이 그 카드가 아니다")
        backToList(settled("detail", "${pick.at} 누름"), pick.at!!)
        assertAlive()
    }

    // 데모 take8: 목록 맨 위의 전폭 머리글은 패딩 수정자 때문에 트리 노드가 칸보다 작다. 첫 칸만 대 보던 배치가 맨 위에서 목록을 못 놓아
    // #N 이 화면의 읽는 순서로 떨어졌다("후보는 10개다") — 한 번 굴려 머리글이 빠진 뒤에야 통했다.
    @Test @Order(20) fun `맨 위에 패딩 있는 전폭 머리글이 있어도 #N 은 목록 순번이다`() {
        openApp()
        val items = "items(state.drinks, key = { it.id }) { drink ->"
        val header = "item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(maxLineSpan) }) {\n" +
            "                        Text(\"Pearl\", fontSize = 28.sp, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))\n" +
            "                    }\n                    "
        save(screenFile, items, header + items)
        try {
            settled("list", "머리글 저장")
            val at = "PearlScreen.kt:" + PearlFixture.lineOf(screenFile, "DrinkCard(drink, ambient = ambient, onClick = { onDrinkClick(drink) })")
            scrollUntil(at, 30)
            val t = runBlocking { uc.touch.at("$at#30", "tap", "test", settle = true) }
            assertTrue(t is TouchResult.Settled && t.aim!!.index == 30, "머리글 아래에서 #30 이 목록 순번이 아니다 — $t")
            backToList(settled("detail", "#30 누름"), "#30")
        } finally {
            save(screenFile, header + items, items)
        }
    }

    // FR-5. 공유 로더에서는 Compose 디스패처가 앞 태스크가 버린 세션에 걸려 시계를 밀어도 막대가 0 그대로였다(데모 take8, API 셋 모두).
    // delay는 실제 시계라 밀지 못한다 — 그림 대신 경고로 알린다.
    @Test @Order(21) fun `render --at 은 애니메이션 API마다 그 시점의 프레임을 그리고 delay 는 경고한다`() {
        fun fill(fn: String, ms: Long): Pair<Double, List<String>> {
            val fqn = "com.example.pearl.feature.pearl.AnimationPreviewsKt.$fn"
            assertTrue(runBlocking { uc.openPreview(fqn, null, emptyMap(), "test") }.ok, fqn)
            val r = runBlocking { uc.renderAt(ms, "test") }
            runBlocking { engine.awaitWrites() }
            assertTrue(r.ok, r.shot.out.message?.text)
            val img = javax.imageio.ImageIO.read(r.shot.out.image!!)
            val y = img.height / 2
            val red = (0 until img.width).count { x -> img.getRGB(x, y).let { (it shr 16 and 0xff) > 200 && (it shr 8 and 0xff) < 80 } }
            return red.toDouble() / img.width to r.shot.out.warnings
        }
        for (fn in listOf("AnimatableBarPreview", "TransitionBarPreview", "AnimateAsStateBarPreview")) {
            assertEquals(0.0, fill(fn, 0).first, 0.02, "$fn --at 0")
            assertEquals(0.3, fill(fn, 300).first, 0.05, "$fn --at 300")
            val (end, warnings) = fill(fn, 1600)
            assertEquals(1.0, end, 0.02, "$fn --at 1600")
            assertTrue(warnings.isEmpty(), "$fn $warnings")
        }
        val (_, warnings) = fill("DelayedBarPreview", 1600)
        assertTrue(warnings.any { "delay" in it }, "delay 를 알리지 않았다 — $warnings")
        assertAlive()
    }

    // SharedTransitionLayout 안의 LookaheadScope 가상 노드는 늘 배치 안 됨이라, 그 아래 화면이 트리에서 통째로 빠졌다(데모 리허설 2026-10-08).
    @Test @Order(22) fun `공유 요소 전환으로 감싼 프리뷰도 트리에 화면이 실리고 touch --at 으로 누른다`() {
        val file = PearlFixture.sharedTransition
        assertTrue(runBlocking { uc.openPreview(file.path, null, emptyMap(), "test") }.ok)
        ws.awaitBoardFilled(timeoutMs = 60_000)
        val on = runBlocking { uc.focusCard(0, on = true, by = "test") } as FocusResult.On
        assertTrue(on.result.ok, on.result.shot.out.message?.text)
        try {
            fun lines(): Set<Int> {
                runBlocking { engine.awaitWrites() }
                return PearlFixture.tree(ws.now.lastResult!!.tree!!).nodes.filter { it.file == file.name && it.right > it.left }.map { it.line }.toSet()
            }
            val ball = PearlFixture.lineOf(file, "Box(")
            val detail = PearlFixture.lineOf(file, "Text(\"detail\", Modifier.padding(8.dp))")
            assertTrue(ball in lines(), "목록의 공(${file.name}:$ball)이 트리에 없다 — ${lines()}")
            val t = runBlocking { uc.touch.at("${file.name}:$ball", "tap", "test", settle = true) }
            assertTrue(t is TouchResult.Settled, "$t")
            assertTrue(detail in lines(), "눌렀는데 상세(${file.name}:$detail)가 트리에 없다 — ${lines()}")
        } finally {
            runBlocking { uc.focusCard(0, on = false, by = "test") }
        }
    }

    @Test @Order(23) fun `목록 상태가 없는 스크롤은 시맨틱 내용으로 나타남 · 사라짐을 맞춘다`() {
        val file = PearlFixture.scroll
        assertTrue(runBlocking { uc.openPreview(file.path, null, emptyMap(), "test") }.ok)
        ws.awaitBoardFilled(timeoutMs = 60_000)
        val on = runBlocking { uc.focusCard(0, on = true, by = "test") } as FocusResult.On
        assertTrue(on.result.ok, on.result.shot.out.message?.text)
        try {
            val r = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test") } as ScrollResult.Settled
            assertTrue(r.moved, "$r")
            assertEquals(null, r.container!!.list)
            fun row(text: String?) = text!!.removePrefix("행 ").toInt()
            val came = r.appeared.map { row(it.semantics?.text) }
            val went = r.disappeared.map { row(it.semantics?.text) }
            assertTrue(came.isNotEmpty() && went.isNotEmpty(), "$r")
            assertTrue(came.min() > went.max(), "아래로 굴렸는데 나타난 행($came)이 사라진 행($went) 아래가 아니다")
            val line = PearlFixture.lineOf(file, "Text(")
            for (item in r.appeared) {
                val s = item.semantics!!
                assertEquals("Checkbox", s.role)
                assertEquals(if (row(s.text) % 2 == 0) "On" else "Off", s.toggleableState)
                assertEquals(setOf("click"), s.actions)
                assertTrue(item.at?.startsWith("${file.name}:$line") == true, "$item")
            }
        } finally {
            runBlocking { uc.focusCard(0, on = false, by = "test") }
        }
    }

    // 성공 기준 2(D-75). 사람과 에이전트가 같은 루프가 정착시킨 같은 화면을 본다 — 뷰어 경로와 CLI 경로의 정착 그림 · 트리가 같다.
    @Test @Order(24) fun `뷰어로 누른 정착과 CLI 로 누른 정착이 같은 그림 · 트리다`() {
        val file = PearlFixture.sharedTransition
        assertTrue(runBlocking { uc.openPreview(file.path, null, emptyMap(), "test") }.ok)
        ws.awaitBoardFilled(timeoutMs = 60_000)
        val ball = PearlFixture.lineOf(file, "Box(")
        fun tap(viewer: Boolean): Pair<ByteArray, List<ViewNode>> {
            val on = runBlocking { uc.focusCard(0, on = true, by = "test") } as FocusResult.On
            assertTrue(on.result.ok, on.result.shot.out.message?.text)
            try {
                runBlocking { engine.awaitWrites() }
                val n = PearlFixture.tree(on.result.shot.out.tree!!).nodes.first { it.file == file.name && it.line == ball && it.right > it.left }
                val (x, y) = center(n)
                runBlocking { uc.awaitSettled() }
                Thread.sleep(300)                            // 실제 시간 — 정착의 기록은 따로 도는 수집이 적는다. 그 기록이 prior 로 잡혀야 다음 정착과 갈린다
                val prior = ws.now.lastResult
                val out = if (viewer) {
                    runBlocking { uc.touch("tap", x, y, "viewer", settle = false) }
                    val settled = ws.state.awaitState("뷰어 경로의 정착", 10_000) { it.lastResult.let { r -> r !== prior && r is prevue.daemon.domain.model.Settled } }
                    (settled.lastResult as prevue.daemon.domain.model.Settled).shot.out
                } else {
                    val t = runBlocking { uc.touch("tap", x, y, "test", settle = true) } as TouchResult.Settled
                    assertEquals(true, t.result.settled, "CLI 경로가 정착하지 않았다")
                    t.result.shot.out
                }
                runBlocking { engine.awaitWrites() }
                assertTrue(out.ok, out.message?.text)
                return out.image!!.readBytes() to PearlFixture.tree(out.tree!!).nodes
            } finally {
                runBlocking { uc.focusCard(0, on = false, by = "test") }
            }
        }
        val (viewerPng, viewerTree) = tap(viewer = true)
        val (cliPng, cliTree) = tap(viewer = false)
        assertTrue(viewerTree.any { it.file == file.name && it.line == PearlFixture.lineOf(file, "Text(\"detail\", Modifier.padding(8.dp))") }, "눌렀는데 상세가 아니다")
        assertEquals(viewerTree, cliTree, "정착 트리가 경로마다 다르다")
        assertTrue(viewerPng.contentEquals(cliPng), "정착 그림이 경로마다 다르다")
        assertAlive()
    }

    // 「Prevue 스크롤로 찾기」 성공 기준 3. 네 모양 × 텍스트 · 소스 줄 대상 — 멈춘 화면에서 대상이 다 보이고, found.at 으로 누른 칸이 그 칸이다.
    @Test @Order(25) fun `scroll --until 은 네 모양에서 대상이 다 보일 때 멈추고 found 의 at 으로 그 칸을 누른다`() {
        val file = PearlFixture.until
        assertTrue(runBlocking { uc.openPreview(file.path, null, emptyMap(), "test") }.ok)
        ws.awaitBoardFilled(timeoutMs = 60_000)
        val line = PearlFixture.lineOf(file, "Text(")
        fun until(target: String, horizontal: Boolean, amount: Double = 10.0) =
            runBlocking { uc.scroll.screens(amount, horizontal, at = null, by = "test", until = target) } as ScrollResult.Settled
        for ((card, horizontal, n) in listOf(Triple(0, false, 87), Triple(1, true, 23), Triple(2, false, 27), Triple(3, true, 31))) {
            for (target in listOf("${n}번", "${file.name}:$line#$n")) {
                val on = runBlocking { uc.focusCard(card, on = true, by = "test") } as FocusResult.On
                assertTrue(on.result.ok, on.result.shot.out.message?.text)
                try {
                    var r = until(target, horizontal)
                    var calls = 1
                    while (r.found == null && r.moved && calls < 3) { r = until(target, horizontal); calls++ }
                    val found = r.found ?: error("카드 $card · $target 를 $calls 번에 못 찾았다: $r")
                    assertEquals("${n}번", found.semantics?.text, "카드 $card · $target: $found")
                    assertTrue(found.visible >= 0.99, "카드 $card · $target 가 다 보이지 않은 채 멈췄다: $found")
                    val t = runBlocking { uc.touch.at(found.at!!, "tap", "test", settle = true) }
                    assertTrue(t is TouchResult.Settled, "카드 $card · ${found.at}: $t")
                    val picked = until("선택됨", horizontal, amount = 0.0)
                    assertFalse(picked.moved, "$picked")
                    assertEquals("${n}번 선택됨", picked.found?.semantics?.text, "카드 $card · ${found.at} 로 다른 칸을 눌렀다: $picked")
                } finally {
                    runBlocking { uc.focusCard(card, on = false, by = "test") }
                }
            }
        }
    }

    // 성공 기준 1 · 2의 바닥. 못 찾으면 상한까지 굴린 채 found 가 비고, 응답에 found 키가 남는다.
    @Test @Order(26) fun `scroll --until 이 못 찾으면 상한만큼 굴리고 found 가 비며 더 굴릴 수 있는지 싣는다`() {
        val file = PearlFixture.until
        assertTrue(runBlocking { uc.openPreview(file.path, null, emptyMap(), "test") }.ok)
        ws.awaitBoardFilled(timeoutMs = 60_000)
        val on = runBlocking { uc.focusCard(0, on = true, by = "test") } as FocusResult.On
        assertTrue(on.result.ok, on.result.shot.out.message?.text)
        try {
            val r = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test", until = "없는 칸") } as ScrollResult.Settled
            assertTrue(r.sought && r.moved, "$r")
            assertEquals(null, r.found)
            assertEquals(true, r.container?.list?.canScrollForward, "$r")
            val plain = runBlocking { uc.scroll.screens(1.0, horizontal = false, at = null, by = "test") } as ScrollResult.Settled
            val sought = r.container!!.list!!.first!!
            val rolled = plain.container!!.list!!.first!! - sought
            assertTrue(sought > 0 && kotlin.math.abs(sought - rolled) <= 1, "못 찾은 --until 이 그냥 scroll 과 다른 거리를 굴렸다: $sought / $rolled")
        } finally {
            runBlocking { uc.focusCard(0, on = false, by = "test") }
        }
    }

    // 「Prevue 스크롤로 찾기」 성공 기준 6. 맨 앞에서 5화면 굴리면 직전 화면(= disappeared) · passed · 지금 화면(= appeared)이 겹치지 않고 1번부터 빈틈없이 잇는다.
    @Test @Order(27) fun `scroll 의 passed 는 네 모양에서 굴린 범위의 빈틈을 겹치지 않게 메운다`() {
        val file = PearlFixture.until
        assertTrue(runBlocking { uc.openPreview(file.path, null, emptyMap(), "test") }.ok)
        ws.awaitBoardFilled(timeoutMs = 60_000)
        fun numbers(items: List<Semantics?>) = items.map { it?.text?.removeSuffix("번")?.toInt() ?: error("글자 없는 칸: $items") }
        for ((card, horizontal) in listOf(0 to false, 1 to true, 2 to false, 3 to true)) {
            val on = runBlocking { uc.focusCard(card, on = true, by = "test") } as FocusResult.On
            assertTrue(on.result.ok, on.result.shot.out.message?.text)
            try {
                val r = runBlocking { uc.scroll.screens(5.0, horizontal, at = null, by = "test") } as ScrollResult.Settled
                val was = numbers(r.disappeared.map { it.semantics })
                val passed = numbers(r.passed.map { it.semantics })
                val now = numbers(r.appeared.map { it.semantics })
                assertTrue(passed.isNotEmpty(), "카드 $card: passed 가 비었다 — $r")
                assertEquals((1..now.max()).toList(), was + passed + now, "카드 $card: 직전 $was · 지나감 $passed · 지금 $now")
            } finally {
                runBlocking { uc.focusCard(card, on = false, by = "test") }
            }
        }
    }

    /** 한 장만 연 상태의 spec — 엔진을 직접 부르기 전에 액터의 루프와 보드 채우기를 비운다. */
    private fun single(fqn: String): prevue.daemon.entity.PreviewSpec {
        assertTrue(runBlocking { uc.openPreview(fqn, null, emptyMap(), "test") }.ok, fqn)
        runBlocking { engine.awaitWrites() }
        return ws.now.current!!
    }

    private fun redShare(img: java.awt.image.BufferedImage): Double {
        val y = img.height / 2
        return (0 until img.width).count { x -> img.getRGB(x, y).let { (it shr 16 and 0xff) > 200 && (it shr 8 and 0xff) < 80 } }.toDouble() / img.width
    }

    private fun aside(p: prevue.daemon.entity.PreviewSpec): prevue.daemon.domain.port.RenderOutput {
        val out = runBlocking { engine.showAside(p.copy(previewId = p.previewId + "@aside")) }
        assertTrue(out.ok, out.message?.text)
        return out
    }

    // 자세별 그림은 라이브 옆의 태스크로 그린다. layoutlib 시계(System_Delegate)는 전역이라, 옆 그림이 시계를 옮기면 라이브의 애니메이션이 건너뛴다.
    @Test @Order(28) fun `옆 태스크로 한 장 그려도 라이브의 애니메이션 시각이 건너뛰지 않는다`() {
        val bar = single("com.example.pearl.feature.pearl.AnimationPreviewsKt.AnimatableBarPreview")
        val other = single("com.example.pearl.feature.pearl.AnimationPreviewsKt.TransitionBarPreview")
        val s = runBlocking { engine.open(bar, interactive = true, ownLoader = false) }
        try {
            assertTrue(s.opened.ok, s.opened.message?.text)
            val before = redShare(s.tick(forceImage = true).image!!)
            aside(other)
            val after = redShare(s.tick(forceImage = true).image!!)
            println("[spike] 옆 그림 전 $before · 뒤 $after")
            assertTrue(before < 0.4, "첫 틱에 막대가 ${before}만큼 찼다 — 건너뜀을 잴 수 없다")
            assertTrue(after - before < 0.4, "옆 그림 한 장 뒤 한 틱에 막대가 $before → $after — 라이브 시계가 건너뛰었다")
        } finally {
            s.close()
        }
        assertAlive()
    }

    // 옆 태스크는 공유 로더로 그리고 바로 놓는다. 놓을 때 지우는 렌더 스레드의 ThreadLocal · Compose 뷰 목록은 로더별이라 라이브(사설 로더)는 그대로여야 한다.
    @Test @Order(29) fun `옆 태스크로 그리고 놓아도 라이브 세션은 끌면 그림이 바뀐다`() {
        val list = single("com.example.pearl.feature.pearl.PearlPreviewsKt.PearlListPreview")
        val other = single("com.example.pearl.feature.pearl.PearlPreviewsKt.PearlEmptyPreview")
        val s = runBlocking { engine.open(list, interactive = true, ownLoader = false) }
        try {
            assertTrue(s.opened.ok, s.opened.message?.text)
            runBlocking { engine.awaitWrites() }
            val c = PearlFixture.visibleCards(s.opened.tree!!).maxBy { it.bottom }
            val (x, y) = (c.left + c.right) / 2 to (c.top + c.bottom) / 2
            val first = s.tick(forceImage = true).image!!
            repeat(3) { aside(other) }
            // 끌기는 손을 뗀 뒤 관성으로만 그림을 바꾼다. 실제 시계면 부하에 따라 마지막 끌기와 떼기 사이가 40ms를 넘어
            // Compose 속도 추적이 멈춤으로 보고 관성이 없어진다 — 터치 사이를 걸음 시계 16ms로 밀어 부하와 떼어 놓는다.
            runBlocking {
                suspend fun step(ms: Long) = s.renderAt(ms, 16).also { assertTrue(it.ok, it.message?.text) }
                step(16)
                s.touch("press", x, y)
                for (i in 1..8) { step(16); s.touch("drag", x, y - i * 150) }
                step(16)
                s.touch("release", x, y - 8 * 150)
                step(1000)
            }
            val now = s.tick(forceImage = true).image!!
            assertFalse(samePixels(first, now), "옆 그림 세 장 뒤 끌어도 그림이 같다 — 라이브 세션이 옆 태스크를 놓을 때 깨졌다")
        } finally {
            s.close()
        }
        assertAlive()
    }

    // 자세별 그림 미리 그리기 — 기기를 고르면 잠잠해진 뒤 다른 자세 셋을 그 자세의 픽셀 크기로 그리고, 그 뒤에도 라이브는 끌면 바뀐다.
    @Test @Order(30) fun `기기를 고르면 다른 자세를 그 크기로 미리 그리고 라이브는 그대로 조작된다`() {
        assertTrue(runBlocking { uc.openPreview(PearlFixture.board!!.path, null, emptyMap(), "test") }.ok)
        ws.awaitBoardFilled(timeoutMs = 120_000)
        val fold8 = ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8)
        val on = runBlocking { uc.focusCard(0, on = true, by = "test", size = fold8) } as FocusResult.On
        try {
            assertTrue(on.result.ok, on.result.shot.out.message?.text)
            awaitUntil("자세별 그림 세 장 — ${uc.readStatus().postures.keys}", 30_000, pollMs = 50) { uc.readStatus().postures.keys.count { it is ScreenSize.Device } == 3 }
            runBlocking { engine.awaitWrites() }
            // 기기 자세 셋 뒤에 원래 크기(@Preview)도 미리 그린다 — 그 장은 기기 크기가 아니라 비교에서 뺀다.
            // 렌더러는 정수 dp 만 받아 패널 px 가 dp 로 나눠떨어지지 않는 기기(Fold8 420dpi)는 반올림한 dp 의 px 로 1px 어긋난다
            val sizes = uc.readStatus().postures.filterKeys { it is ScreenSize.Device }.map { (d, shot) -> d to javax.imageio.ImageIO.read(shot.out.image!!).let { it.width to it.height } }.toMap()
            assertEquals(
                mapOf(fold8.copy(folded = true) to (1247 to 1971), fold8.copy(landscape = true) to (1848 to 2449), fold8.copy(folded = true, landscape = true) to (1971 to 1247)),
                sizes,
            )
            val png = on.result.shot.out.image!!
            val before = javax.imageio.ImageIO.read(png)
            val (x, y) = cardCenter(on)
            val now = runBlocking {
                uc.touch("press", x, y, "test", settle = false); delay(50)
                for (i in 1..8) { uc.touch("drag", x, y - i * 150, "test", settle = false); delay(50) }
                uc.touch("release", x, y - 8 * 150, "test", settle = false)
                uc.awaitSettled()
            }
            runBlocking { engine.awaitWrites() }
            assertFalse(samePixels(before, javax.imageio.ImageIO.read(now.out.image!!)), "자세별 그림을 그린 뒤 끌어도 그림이 같다")
        } finally {
            runBlocking { uc.focusCard(0, on = false, by = "test") }
        }
        assertAlive()
    }

    // 내용 크기로 감싸는 컴포넌트도 기기를 고르면 그 기기 화면 크기로 그린다 — 작게 그리면 뷰어가 틀에 맞춰 늘려 글자가 찌그러졌다.
    @Test @Order(31) fun `내용 크기 컴포넌트도 기기를 고르면 기기 화면 크기로 그린다`() {
        assertTrue(runBlocking { uc.openPreview(PearlFixture.board!!.path, null, emptyMap(), "test") }.ok)
        ws.awaitBoardFilled(timeoutMs = 120_000)
        val index = ws.now.board!!.cards.indexOfFirst { it.spec.fqn.endsWith("DrinkByKindPreview") }
        assertTrue(index >= 0, "보드에 DrinkByKindPreview 카드가 없다")
        val s26 = ScreenSize.Device(DeviceModel.GALAXY_S26)
        val on = runBlocking { uc.focusCard(index, on = true, by = "test", size = s26) } as FocusResult.On
        try {
            assertTrue(on.result.ok, on.result.shot.out.message?.text)
            val png = javax.imageio.ImageIO.read(on.result.shot.out.image!!)
            assertEquals(1080 to 2340, png.width to png.height)
        } finally {
            runBlocking { uc.focusCard(index, on = false, by = "test") }
        }
        assertAlive()
    }

    private fun samePixels(a: java.awt.image.BufferedImage, b: java.awt.image.BufferedImage): Boolean =
        a.width == b.width && a.height == b.height && (0 until a.height step 4).all { y -> (0 until a.width step 4).all { x -> a.getRGB(x, y) == b.getRGB(x, y) } }

    companion object {
        @JvmStatic fun available(): Boolean = PearlFixture.available()
    }
}
