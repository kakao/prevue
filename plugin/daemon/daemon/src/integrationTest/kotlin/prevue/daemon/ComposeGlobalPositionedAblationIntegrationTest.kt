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
import prevue.infrastructure.render.RenderEngine
import prevue.infrastructure.render.ViewInfoJson

@EnabledIf("prevue.daemon.InsetsIntegrationTest#available")
internal class ComposeGlobalPositionedAblationIntegrationTest {
    @Test fun `new Compose adapters keep first PNG and tree bounds aligned across ablation variants`() = runBlocking {
        val source = File(PearlFixture.dir, "compose-ablation/src/main/kotlin/com/example/pearl/compose/ablation/ComposeGlobalPositionedAblation.kt")
        val json = PearlFixture.warmupJson(source, "--variant", "debug")
        val home = ClasspathSpec.load(File(Regex("\"classpath\": \"([^\"]+)\"").find(json)!!.groupValues[1]))
        val out = Files.createTempDirectory("prevue-compose-global-positioned").toFile()
        val variants = listOf(
            "ComposeGlobalPositionedAblation" to "ComposeGlobalPositionedAblation",
            "ComposeGlobalPositionedWithoutStateUpdate" to "ComposeGlobalPositionedWithoutStateUpdate",
            "ComposeGlobalPositionedWithoutTopInset" to "ComposeGlobalPositionedWithoutTopInset",
        )
        val mismatches = mutableListOf<String>()
        try {
            RenderEngine(home, PearlFixture.layoutlib()!!, out, realDispatchers).use { engine ->
                val line = PearlFixture.lineOf(source, "Box(Modifier.fillMaxWidth().height(2.dp).background(Color.Red))")
                for ((function, label) in variants) {
                    val base = PreviewSpec(
                        "com.example.pearl.compose.ablation.ComposeGlobalPositionedAblationKt.$function",
                        "compose-global-positioned-$label",
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
                        val nodes = ViewInfoJson.nodes(compose)
                        val target = nodes.firstOrNull { it.file == source.name && it.line == line }
                            ?: error("no red marker at ${source.name}:$line; nodes=${nodes.map { "${it.name}:${it.file}:${it.line}:${it.top}" }}")
                        val pngTop = (0 until image.height).first { y ->
                            image.getRGB(image.width / 2, y) and 0xFFFFFF == 0xFF0000
                        }
                        if (pngTop != target.top) mismatches += "$label: PNG=$pngTop, tree=${target.top}"
                    } finally {
                        handle.close()
                    }
                }
            }
            assertEquals(emptyList<String>(), mismatches, "first PNG and Compose tree must agree for every ablation variant")
        } finally {
            out.deleteRecursively()
        }
    }
}
