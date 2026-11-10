package prevue.daemon

import android.graphics.Insets
import android.graphics.Rect
import android.view.DisplayCutout
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import java.io.File
import java.nio.file.Files
import javax.imageio.ImageIO
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.condition.EnabledIf
import prevue.application.domain.model.AppInsets
import prevue.application.domain.model.CardOverride
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.InsetEdges
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.SystemUi
import prevue.application.port.LiveSession
import prevue.daemon.fake.realDispatchers
import prevue.infrastructure.compile.HotCompiler
import prevue.infrastructure.dump.ClasspathSpec
import prevue.infrastructure.render.LayoutlibInsets
import prevue.infrastructure.render.LayoutlibSession
import prevue.infrastructure.render.RenderEngine

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIf("prevue.daemon.InsetsIntegrationTest#available")
class InsetsIntegrationTest {
    private val out = Files.createTempDirectory("prevue-insets").toFile()
    private lateinit var engine: RenderEngine
    private lateinit var compiler: HotCompiler
    private lateinit var preview: PreviewSpec
    private val appInsets = AppInsets(InsetEdges(top = 37.0), InsetEdges(bottom = 15.0), InsetEdges(top = 3.0), InsetEdges(left = 7.0))

    @BeforeAll fun up() = runBlocking {
        val (home, app) = PearlFixture.warmup()
        val overlay = File(out, "overlay")
        val (spec, _) = ClasspathSpec.forRender(home, app, overlay)
        val source = File(out, "InsetProbe.kt").apply { writeText(InsetsIntegrationTest::class.java.getResource("/InsetProbe.kt.txt")!!.readText()) }
        compiler = PearlFixture.hotCompiler(home, overlay)
        val compiled = compiler.compile(home.project, listOf(source))
        assertTrue(compiled.ok, compiled.messages)
        engine = RenderEngine(spec, PearlFixture.layoutlib()!!, out, realDispatchers)
        val base = PreviewSpec("com.example.pearl.feature.pearl.InsetProbeKt.InsetProbe", "InsetProbe", mapOf("showSystemUi" to "true"), source, 0)
        preview = ScreenSize.Device(DeviceModel.GALAXY_S26).applyTo(base)
    }

    @AfterAll fun down() {
        runCatching { engine.close() }
        runCatching { compiler.close() }
        out.deleteRecursively()
        PearlFixture.stopGradle()
    }

    @Test fun `첫 정지 그림과 첫 라이브 그림에서 컴포지션 읽기와 중첩 패딩이 전달값을 사용한다`() = runBlocking {
        for (interactive in listOf(false, true)) {
            val sized = CardOverride(preview.previewId, ScreenSize.Device(DeviceModel.GALAXY_S26), SystemUi.ON)
            val on = engine.open(sized.applyTo(preview.copy(appInsets = appInsets)), interactive, ownLoader = true)
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

            val off = engine.open(sized.applyTo(preview.copy(appInsets = AppInsets.NONE)), interactive, ownLoader = true)
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
            val handle = engine.open(preview.copy(appInsets = appInsets), interactive, ownLoader = true)
            assertTrue(handle.opened.ok, handle.opened.message?.text)
            val session = session()
            for (override in listOf(appInsets, AppInsets.NONE)) {
                session.onSession {
                    val root = session.viewRoot()!!
                    val layout = layout(root)!!
                    val source = sentinels()
                    val target = LayoutlibInsets.overridden(source, override, 3f)
                    assertEquals(if (override == AppInsets.NONE) null else Insets.of(3, 0, 0, 0), target.displayCutout?.waterfallInsets)
                    layout.dispatchApplyWindowInsets(target)
                    layout.requestLayout()
                }
                repeat(3) { handle.tick(forceImage = true) }
                val values = reads(handle)
                assertEquals("0,0,0,240", values.getValue("ime"))
                assertEquals("12,0,15,60", values.getValue("gestures"))
                assertEquals("0,0,0,30", values.getValue("mandatory"))
                assertEquals("0,0,0,18", values.getValue("tappable"))
                val on = override != AppInsets.NONE
                assertEquals(if (on) "0,111,0,45" else "0,0,0,0", values.getValue("system"))
                assertEquals(if (on) "21,0,0,0" else "0,0,0,0", values.getValue("cutout"))
                assertEquals(if (on) "21,111,0,240" else "0,0,0,240", values.getValue("drawing"))
                assertEquals(if (on) "21,111,15,240" else "12,0,15,240", values.getValue("content"))
                assertIgnoringVisibility(values)
            }
            handle.close()
        }
    }

    private fun sentinels(): WindowInsets = WindowInsets.Builder()
        .setDisplayCutout(DisplayCutout(Insets.of(21, 0, 0, 0), Rect(0, 0, 21, 30), null, null, null, Insets.of(3, 0, 0, 0)))
        .setInsets(WindowInsets.Type.ime(), Insets.of(0, 0, 0, 240))
        .setInsets(WindowInsets.Type.systemGestures(), Insets.of(12, 0, 15, 60))
        .setInsets(WindowInsets.Type.mandatorySystemGestures(), Insets.of(0, 0, 0, 30))
        .setInsets(WindowInsets.Type.tappableElement(), Insets.of(0, 0, 0, 18))
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
            if (v is ViewGroup) for (i in 0 until v.childCount) visit(v.getChildAt(i))
        }
        session.onSession { visit(session.viewRoot()!!) }
        assertTrue(result.isNotEmpty())
        return result
    }

    companion object {
        @JvmStatic fun available() = PearlFixture.available()
    }
}
