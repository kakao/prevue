package prevue.daemon

import java.io.File
import java.nio.file.Files
import javax.imageio.ImageIO
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.RepeatedTest
import org.junit.jupiter.api.condition.EnabledIf
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import prevue.application.domain.model.CardOverride
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.EdgeToEdge
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.ScreenSize
import prevue.application.port.LiveSession
import prevue.daemon.fake.awaitValue
import prevue.daemon.fake.realDispatchers
import prevue.infrastructure.dump.ClasspathSpec
import prevue.infrastructure.json.Json
import prevue.infrastructure.render.ApkManifest
import prevue.infrastructure.render.RenderEngine
import prevue.infrastructure.render.ViewInfoJson

@EnabledIf("prevue.daemon.InsetsIntegrationTest#available")
internal class LegacyWindowIntegrationTest {
    @RepeatedTest(12) fun `구형 targetSdk의 앱 창과 첫 트리와 터치가 플랫폼 API 및 기기 인셋과 무관하게 일치한다`() = runBlocking {
        checkLegacyWindows()
    }
}

private suspend fun checkLegacyWindows() {
    val source = File(PearlFixture.dir, "legacy/src/main/kotlin/com/example/pearl/legacy/LegacyWindow.kt")
    val json = PearlFixture.warmupJson(source, "--variant", "debug")
    val home = ClasspathSpec.load(File(Regex("\"classpath\": \"([^\"]+)\"").find(json)!!.groupValues[1]))
    assertEquals(34, ApkManifest.targetSdk(File(home.resourceApkPath)))
    val out = Files.createTempDirectory("prevue-legacy-window").toFile()
    try {
        RenderEngine(home, PearlFixture.layoutlib()!!, out, realDispatchers).use { engine ->
            for (api in listOf(34, 37)) for (device in listOf(false, true)) for (edge in EdgeToEdge.entries) {
                val base = PreviewSpec("com.example.pearl.legacy.LegacyWindowKt.LegacyWindow", "legacy-$api-$device-${edge.key}", mapOf(
                    "apiLevel" to api.toString(), "showSystemUi" to "true", "device" to "spec:width=1080px,height=2340px,dpi=480",
                ), source, 0)
                val p = CardOverride(base.previewId, if (device) ScreenSize.Device(DeviceModel.GALAXY_S26) else ScreenSize.Original, edgeToEdge = edge).applyTo(base)
                val handle = engine.open(p, interactive = true, ownLoader = false)
                try {
                    assertTrue(handle.opened.ok, handle.opened.message?.text)
                    val written = engine.written(handle.opened)
                    val png = ImageIO.read(written.image!!)
                    val nodes = handle.semantics()
                    val app = nodes.first { it.semantics.contentDescription == "app" }
                    val target = nodes.first { it.semantics.contentDescription == "target" }
                    if (edge == EdgeToEdge.AUTO) {
                        assertTrue(app.top > 0, "$api device=$device: app starts below the status bar")
                        assertEquals(app.top, target.top, "inset must be consumed exactly once")
                        assertTrue(nodes.any { it.semantics.text?.contains("inset: 0") == true })
                        assertEquals(0xFF0000, png.getRGB(png.width / 2, target.top + 1) and 0xFFFFFF)
                    } else {
                        assertEquals(0, app.top)
                        assertTrue(target.top > 0, "systemBarsPadding receives the status inset for explicit edge-to-edge")
                    }
                    @Suppress("UNCHECKED_CAST")
                    val tree = Json.parse(written.tree!!.readText()) as Map<String, Any?>
                    @Suppress("UNCHECKED_CAST")
                    val compose = tree.getValue("composeViewInfo") as List<Map<String, Any?>>
                    val line = source.readLines().indexOfFirst { ".clickable { taps++ }" in it } + 1
                    val box = ViewInfoJson.nodes(compose).first { it.name == "Box" && it.file == source.name && it.line == line }
                    assertEquals(listOf(target.left, target.top, target.right, target.bottom), listOf(box.left, box.top, box.right, box.bottom), "first PNG and tree must agree")
                    handle.touch("tap", (box.left + box.right) / 2, (box.top + box.bottom) / 2)
                    awaitTaps(handle, "api=$api device=$device edge=${edge.key}: tree-centered touch hits the short top button")
                } finally {
                    handle.close()
                }
            }
        }
    } finally {
        out.deleteRecursively()
    }
}

// 외부: layoutlib 17 세션 시각은 직전 두 setNanosTime 의 차 + 마지막 doFrame 시각이라, 뗌이 건 콜백이 바로 다음 틱엔 아직 때가 아닐 수 있다 — 제품 루프처럼 틱을 이어 돌리며 기다린다
private fun awaitTaps(handle: LiveSession, what: String) {
    var last: String? = null
    awaitValue({ "$what — last \"$last\"" }, timeoutMs = TAP_SETTLE_MS, pollMs = TAP_FRAME_MS) {
        handle.tick(forceImage = true)
        last = handle.semantics().firstNotNullOfOrNull { n -> n.semantics.text?.takeIf { it.startsWith("Taps: ") } }
        last?.takeIf { it.startsWith("Taps: 1") }
    }
}

private const val TAP_SETTLE_MS = 2_000L
private const val TAP_FRAME_MS = 16L
