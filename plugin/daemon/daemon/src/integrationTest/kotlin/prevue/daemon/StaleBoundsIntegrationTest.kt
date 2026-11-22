package prevue.daemon

import java.io.File
import java.nio.file.Files
import javax.imageio.ImageIO
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import prevue.application.domain.model.CardOverride
import prevue.application.domain.model.EdgeToEdge
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.ScreenSize
import prevue.daemon.fake.realDispatchers
import prevue.infrastructure.dump.ClasspathSpec
import prevue.infrastructure.json.Json
import prevue.infrastructure.render.ApkManifest
import prevue.infrastructure.render.RenderEngine
import prevue.infrastructure.render.ViewInfoJson

@EnabledIf("prevue.daemon.InsetsIntegrationTest#available")
internal class StaleBoundsIntegrationTest {
    @Test fun `첫 배치 뒤 onGloballyPositioned로 높이를 바꾸는 화면도 첫 PNG와 트리 좌표가 맞는다`() = runBlocking {
        val source = File(PearlFixture.dir, "app/src/main/kotlin/com/example/pearl/StaleBounds.kt")
        val json = PearlFixture.warmupJson(source, "--variant", "debug")
        val home = ClasspathSpec.load(File(Regex("\"classpath\": \"([^\"]+)\"").find(json)!!.groupValues[1]))
        assertTrue(
            ApkManifest.targetSdk(File(home.resourceApkPath)) >= 35,
            "fixture app must be edge-to-edge (targetSdk 35+) — below 35 fitsContent rebuilds the first tree and the new-adapter refresh goes unchecked",
        )
        val out = Files.createTempDirectory("prevue-stale-bounds").toFile()
        try {
            RenderEngine(home, PearlFixture.layoutlib()!!, out, realDispatchers).use { engine ->
                val base = PreviewSpec(
                    "com.example.pearl.StaleBoundsKt.StaleBoundsTopBar",
                    "stale-bounds-top-bar",
                    mapOf("apiLevel" to "37", "showSystemUi" to "true"),
                    source,
                    0,
                )
                val preview = CardOverride(base.previewId, ScreenSize.Original, edgeToEdge = EdgeToEdge.AUTO).applyTo(base)
                val handle = engine.open(preview, interactive = true, ownLoader = false)
                try {
                    assertTrue(handle.opened.ok, handle.opened.message?.text)
                    val written = engine.written(handle.opened)
                    val image = ImageIO.read(written.image!!)
                    @Suppress("UNCHECKED_CAST")
                    val tree = Json.parse(written.tree!!.readText()) as Map<String, Any?>
                    @Suppress("UNCHECKED_CAST")
                    val compose = tree.getValue("composeViewInfo") as List<Map<String, Any?>>
                    val line = PearlFixture.lineOf(source, "Box(Modifier.fillMaxWidth().height(2.dp).background(Color.Red))")
                    val nodes = ViewInfoJson.nodes(compose)
                    val marker = nodes.firstOrNull { it.file == source.name && it.line == line }
                        ?: error("no red marker at ${source.name}:$line; nodes=${nodes.map { "${it.name}:${it.file}:${it.line}:${it.top}" }}")
                    val pngTop = (0 until image.height).first { y -> image.getRGB(image.width / 2, y) and 0xFFFFFF == 0xFF0000 }
                    assertEquals(pngTop, marker.top, "first PNG and tree must agree")
                } finally {
                    handle.close()
                }
            }
        } finally {
            out.deleteRecursively()
        }
    }
}
