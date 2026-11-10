package prevue.daemon

import android.graphics.Insets
import android.graphics.Rect
import android.view.DisplayCutout
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import java.io.File
import java.nio.file.Files
import kotlin.math.roundToInt
import javax.imageio.ImageIO
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.condition.EnabledIf
import prevue.application.domain.model.AppInsets
import prevue.application.domain.model.CardOverride
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.DeviceInsetChoice
import prevue.application.domain.model.BarLook
import prevue.application.domain.model.InsetEdges
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.SystemUi
import prevue.application.domain.model.ViewNode
import prevue.application.port.LiveSession
import prevue.daemon.fake.realDispatchers
import prevue.infrastructure.compile.HotCompiler
import prevue.infrastructure.dump.ClasspathSpec
import prevue.infrastructure.render.ApkWithAssets
import prevue.infrastructure.render.LayoutlibSession
import prevue.infrastructure.render.LayoutlibInsets
import prevue.infrastructure.render.RenderEngine

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
internal abstract class InsetsRenderChecks {
    private val out = Files.createTempDirectory("prevue-insets").toFile()
    private lateinit var engine: RenderEngine
    private lateinit var compiler: HotCompiler
    private lateinit var preview: PreviewSpec
    private val appInsets = AppInsets(
        statusBars = InsetEdges(top = 37.0), navigationBars = InsetEdges(bottom = 15.0), captionBar = InsetEdges(top = 3.0),
        displayCutout = InsetEdges(left = 7.0), systemOverlays = InsetEdges(right = 9.0),
    )

    protected abstract fun warmup(): Pair<ClasspathSpec, ClasspathSpec>
    protected abstract val fixtureDir: File?

    @BeforeAll fun up() = runBlocking {
        val (home, app) = warmup()
        val overlay = File(out, "overlay")
        val (spec, _) = ClasspathSpec.forRender(home, app, overlay)
        val source = File(out, "InsetProbe.kt").apply { writeText(InsetsIntegrationTest::class.java.getResource("/InsetProbe.kt.txt")!!.readText()) }
        compiler = PearlFixture.hotCompiler(home, overlay)
        val compiled = compiler.compile(home.project, listOf(source))
        assertTrue(compiled.ok, compiled.messages)
        val resourceApk = ApkWithAssets.of(File(spec.resourceApkPath), spec.assetsDirs.map(::File), File(out, "apk"))
        engine = RenderEngine(spec, PearlFixture.layoutlib()!!, out, realDispatchers, resourceApk)
        val base = PreviewSpec("com.example.pearl.feature.pearl.InsetProbeKt.InsetProbe", "InsetProbe", mapOf("showSystemUi" to "true"), source, 0)
        preview = ScreenSize.Device(DeviceModel.GALAXY_S26).applyTo(base)
    }

    @AfterAll fun down() {
        runCatching { engine.close() }
        runCatching { compiler.close() }
        out.deleteRecursively()
        PearlFixture.stopGradle(fixtureDir)
    }

    @Test fun `첫 정지 그림과 첫 라이브 그림에서 컴포지션 읽기와 중첩 패딩이 전달값을 사용한다`() = runBlocking {
        for (interactive in listOf(false, true)) {
            val sized = CardOverride(preview.previewId, ScreenSize.Device(DeviceModel.GALAXY_S26), SystemUi.ON)
            val on = engine.open(sized.applyTo(preview).copy(appInsets = appInsets), interactive, ownLoader = false)
            assertTrue(on.opened.ok, on.opened.message?.text)
            val raw = reads(on)
            assertEquals("0,111,0,0", raw.getValue("status"))
            assertEquals("0,0,0,45", raw.getValue("nav"))
            assertEquals("0,9,0,0", raw.getValue("caption"))
            assertEquals("0,111,0,45", raw.getValue("system"))
            assertEquals("21,0,0,0", raw.getValue("cutout"))
            assertEquals("21,111,0,45", raw.getValue("drawing"))
            assertIgnoringVisibility(raw)
            bounds(on, 111, 45)
            val bare = box(on, "bare")
            val bars = decorations(session())
            val onImage = ImageIO.read(engine.written(on.opened).image!!)
            val paddedTop = box(on, "padded")[1]
            on.close()

            val off = engine.open(sized.applyTo(preview).copy(appInsets = AppInsets.NONE), interactive, ownLoader = false)
            assertTrue(off.opened.ok, off.opened.message?.text)
            for (key in listOf("status", "nav", "caption", "system", "cutout", "drawing")) assertEquals("0,0,0,0", reads(off).getValue(key), key)
            assertIgnoringVisibility(reads(off))
            bounds(off, 0, 0)
            assertEquals(bare, box(off, "bare"))
            assertEquals(bars, decorations(session()))
            assertEquals(0, off.semantics().first { it.semantics.contentDescription?.startsWith("status=") == true }.top)
            val offImage = ImageIO.read(engine.written(off.opened).image!!)
            assertEquals(0xffffff, onImage.getRGB(1000, 1) and 0xffffff)
            assertEquals(onImage.getRGB(1000, 1), offImage.getRGB(1000, 1))
            assertNotEquals(onImage.getRGB(500, paddedTop + 1), offImage.getRGB(500, paddedTop + 1))
            for (y in bare[1] until bare[3]) for (x in bare[0] until bare[2]) assertEquals(onImage.getRGB(x, y), offImage.getRGB(x, y))
            off.close()
        }
    }

    @Test fun `시스템 바와 컷아웃만 전환하면 비영 IME 제스처와 탭 영역은 남고 파생값이 맞는다`() = runBlocking {
        for (interactive in listOf(false, true)) {
            for (override in listOf(appInsets, AppInsets.NONE)) {
                val adjusted = engine.open(preview.copy(appInsets = override), interactive, ownLoader = false)
                assertTrue(adjusted.opened.ok, adjusted.opened.message?.text)
                val session = session()
                var native: Insets? = null
                session.onSession {
                    val root = session.viewRoot()!!
                    val layout = layout(root)!!
                    val probe = View(layout.context).apply {
                        setOnApplyWindowInsetsListener { _, delivered ->
                            native = delivered.getInsets(WindowInsets.Type.systemBars())
                            delivered
                        }
                    }
                    layout.addView(probe, 0, ViewGroup.LayoutParams(0, 0))
                    layout.dispatchApplyWindowInsets(sentinels())
                    layout.requestLayout()
                }
                repeat(3) { adjusted.tick(forceImage = true) }
                val values = reads(adjusted)
                assertEquals("0,0,0,240", values.getValue("ime"))
                assertEquals("12,0,15,60", values.getValue("gestures"))
                assertEquals("0,0,0,30", values.getValue("mandatory"))
                assertEquals("0,0,0,18", values.getValue("tappable"))
                val on = override != AppInsets.NONE
                assertEquals(if (on) Insets.of(0, 111, 27, 45) else Insets.NONE, native)
                assertEquals(if (on) "0,111,0,45" else "0,0,0,0", values.getValue("system"))
                assertEquals(if (on) "21,0,0,0" else "0,0,0,0", values.getValue("cutout"))
                assertEquals(if (on) "21,111,0,240" else "0,0,0,240", values.getValue("drawing"))
                assertEquals(if (on) "21,111,15,240" else "12,0,15,240", values.getValue("content"))
                assertIgnoringVisibility(values)
                adjusted.close()
            }
        }
    }

    @Test fun `iOS safe area 근삿값과 영 전달을 같은 바 표시로 비교한다`() = runBlocking {
        val size = ScreenSize.Device(DeviceModel.IPHONE_17)
        val card = CardOverride(preview.previewId, size)
        val on = engine.open(card.applyTo(preview), interactive = true, ownLoader = false)
        assertTrue(on.opened.ok, on.opened.message?.text)
        assertEquals("0,186,0,0", reads(on).getValue("status"))
        assertEquals("0,0,0,102", reads(on).getValue("nav"))
        val bars = decorations(session())
        on.close()
        val off = engine.open(card.copy(deviceInsets = prevue.application.domain.model.DeviceInsetChoice.OFF).applyTo(preview), interactive = true, ownLoader = false)
        assertTrue(off.opened.ok, off.opened.message?.text)
        assertEquals("0,0,0,0", reads(off).getValue("system"))
        assertEquals("0,0,0,0", reads(off).getValue("cutout"))
        assertEquals(bars, decorations(session()))
        off.close()
    }

    @Test fun `마흔두 자세는 입력만 전환하고 Android 기본 바와 iOS 바 숨김을 유지한다`() = runBlocking {
        for (device in DeviceModel.entries.flatMap { it.postures }) {
            var shownBars: List<String>? = null
            for (choice in DeviceInsetChoice.entries) {
                val card = CardOverride(preview.previewId, device, deviceInsets = choice)
                val spec = card.applyTo(preview)
                val handle = engine.open(spec, interactive = true, ownLoader = false)
                assertTrue(handle.opened.ok, "${device.key} $choice: ${handle.opened.message}")
                val values = reads(handle)
                val density = session().viewRoot()!!.context.resources.displayMetrics.density
                fun pixels(edges: InsetEdges) = listOf(edges.left, edges.top, edges.right, edges.bottom)
                    .joinToString(",") { (it * density).roundToInt().toString() }
                val expected = spec.appInsets!!
                assertEquals(pixels(expected.statusBars), values.getValue("status"), device.key)
                assertEquals(pixels(expected.navigationBars), values.getValue("nav"), device.key)
                assertEquals(pixels(expected.displayCutout), values.getValue("cutout"), device.key)
                assertEquals(0, handle.semantics().first { it.semantics.contentDescription?.startsWith("status=") == true }.top, device.key)
                val safe = values.getValue("drawing").split(',').map(String::toInt)
                val outer = box(handle, "safeOuter")
                val inner = box(handle, "safeInner")
                assertEquals(listOf(outer[0] + safe[0], outer[1] + safe[1], outer[2] - safe[2], outer[3] - safe[3]), inner, device.key)
                assertEquals(inner, box(handle, "safeNested"), device.key)
                val bars = decorations(session())
                if (device.model.look == BarLook.IOS) assertTrue(bars.all { it.endsWith(",${View.INVISIBLE}") }, device.key)
                else assertTrue(bars.any { it.endsWith(",${View.VISIBLE}") }, device.key)
                if (shownBars == null) shownBars = bars else assertEquals(shownBars, bars, device.key)
                assertIgnoringVisibility(values)
                handle.close()
            }
        }
    }

    @Test fun `인셋을 적용할 레이아웃이 없으면 실패하고 앱 렌더 실패는 성공 그림을 내지 않는다`() = runBlocking {
        val card = CardOverride(preview.previewId, ScreenSize.Device(DeviceModel.IPHONE_DUO, folded = true))
        val handle = engine.open(card.applyTo(preview), interactive = true, ownLoader = false)
        assertTrue(handle.opened.ok)
        val session = session()
        session.onSession {
            val empty = android.widget.FrameLayout(session.viewRoot()!!.context)
            assertThrows<IllegalStateException> { LayoutlibInsets.apply(empty, AppInsets.NONE) }
        }
        handle.close()
        for (choice in DeviceInsetChoice.entries) {
            val failure = preview.copy(fqn = "com.example.pearl.feature.pearl.InsetProbeKt.InsetFailure", previewId = "InsetFailure")
            val result = engine.open(card.copy(deviceInsets = choice).applyTo(failure), interactive = true, ownLoader = false)
            assertFalse(result.opened.ok)
            assertNull(result.opened.image)
            assertTrue(result.opened.message!!.text.contains("system UI render failure probe"), result.opened.message!!.text)
            result.close()
        }
    }

    @Test fun `Pearl 메뉴는 안전 영역 안에 놓이고 배경은 화면 끝까지 유지한다`() = runBlocking {
        val menu = preview.copy(fqn = "com.example.pearl.feature.pearl.AdaptivePreviewsKt.AdaptivePearlPreview", previewId = "PearlInsets")
        val devices = listOf(ScreenSize.Device(DeviceModel.GALAXY_S26), ScreenSize.Device(DeviceModel.IPHONE_17)) + DeviceModel.IPHONE_DUO.postures
        for (device in devices) {
            val grids = mutableListOf<ViewNode>()
            val backgrounds = mutableListOf<Int>()
            for (choice in DeviceInsetChoice.entries) {
                val handle = engine.open(CardOverride(menu.previewId, device, deviceInsets = choice).applyTo(menu), interactive = true, ownLoader = false)
                assertTrue(handle.opened.ok, handle.opened.message?.text)
                grids += handle.look().tree.nodes.first { it.name == "LazyVerticalGrid" && it.file == "FilterScreen.kt" }
                backgrounds += ImageIO.read(engine.written(handle.opened).image!!).getRGB(0, 0)
                handle.close()
            }
            val (on, off) = grids
            val area = device.insetProfile.safeArea!!
            if (area.top > 0) assertTrue(on.top > off.top, device.key) else assertEquals(on.top, off.top, device.key)
            if (area.left > 0) assertTrue(on.left > off.left, device.key) else assertEquals(on.left, off.left, device.key)
            if (area.right > 0) assertTrue(on.right < off.right, device.key) else assertEquals(on.right, off.right, device.key)
            assertTrue(on.bottom < off.bottom, device.key)
            assertEquals(backgrounds[0], backgrounds[1], device.key)
        }
    }

    private fun sentinels(): WindowInsets = WindowInsets.Builder()
        .setDisplayCutout(DisplayCutout(Insets.of(21, 0, 0, 0), Rect(0, 0, 21, 30), null, null, null, Insets.of(3, 0, 0, 0)))
        .setInsets(WindowInsets.Type.ime(), Insets.of(0, 0, 0, 240))
        .setInsets(WindowInsets.Type.systemGestures(), Insets.of(12, 0, 15, 60))
        .setInsets(WindowInsets.Type.mandatorySystemGestures(), Insets.of(0, 0, 0, 30))
        .setInsets(WindowInsets.Type.tappableElement(), Insets.of(0, 0, 0, 18))
        .setInsets(WindowInsets.Type.systemOverlays(), Insets.of(0, 0, 33, 0))
        .setVisible(WindowInsets.Type.all(), true)
        .build()

    private fun assertIgnoringVisibility(values: Map<String, String>) {
        for (key in listOf("status", "nav", "system")) assertEquals(values.getValue(key), values.getValue("${key}Ignoring"))
    }

    private fun session(): LayoutlibSession =
        RenderEngine::class.java.getDeclaredField("live").apply { isAccessible = true }.get(engine) as LayoutlibSession


    private fun layout(v: View): com.android.layoutlib.bridge.impl.Layout? {
        if (v is com.android.layoutlib.bridge.impl.Layout) return v
        if (v is ViewGroup) for (i in 0 until v.childCount) layout(v.getChildAt(i))?.let { return it }
        return null
    }

    private fun reads(handle: LiveSession): Map<String, String> = handle.semantics().mapNotNull {
        it.semantics.contentDescription?.takeIf { "=" in it }?.let { it.substringBefore('=') to it.substringAfter('=') }
    }.toMap()

    private fun box(handle: LiveSession, name: String): List<Int> = handle.semantics().first { it.semantics.contentDescription == name }
        .let { listOf(it.left, it.top, it.right, it.bottom) }

    private fun bounds(handle: LiveSession, status: Int, nav: Int) {
        val outer = box(handle, "padded")
        val inner = box(handle, "nested")
        assertEquals(listOf(0, outer[1] + status, 1080, outer[3] - nav), inner)
        assertEquals(0, outer[0])
        assertEquals(1080, outer[2])
    }

    private fun decorations(session: LayoutlibSession): List<String> {
        val result = mutableListOf<String>()
        fun visit(v: View) {
            if (v.javaClass.name.startsWith("com.android.layoutlib.bridge.bars.")) {
                result += "${v.javaClass.name}:${v.left},${v.top},${v.right},${v.bottom},${v.visibility}"
            }
            else if (v is ViewGroup) for (i in 0 until v.childCount) visit(v.getChildAt(i))
        }
        session.onSession { visit(session.viewRoot()!!) }
        assertTrue(result.isNotEmpty())
        return result
    }

}

@EnabledIf("prevue.daemon.InsetsIntegrationTest#available")
internal class InsetsIntegrationTest : InsetsRenderChecks() {
    override fun warmup(): Pair<ClasspathSpec, ClasspathSpec> = PearlFixture.warmup()
    override val fixtureDir: File? get() = PearlFixture.dir

    companion object {
        @JvmStatic fun available() = PearlFixture.available()
    }
}

@EnabledIf("prevue.daemon.KmpRenderIntegrationTest#available")
internal class KmpInsetsIntegrationTest : InsetsRenderChecks() {
    override fun warmup(): Pair<ClasspathSpec, ClasspathSpec> {
        val json = PearlFixture.warmupJson(PearlKmpFixture.app, "--variant", "debug")
        val app = ClasspathSpec.load(File(Regex("\"classpath\": \"([^\"]+)\"").find(json)!!.groupValues[1]))
        return app.dependency(":feature:pearl") to app
    }
    override val fixtureDir: File? get() = PearlKmpFixture.dir
}
