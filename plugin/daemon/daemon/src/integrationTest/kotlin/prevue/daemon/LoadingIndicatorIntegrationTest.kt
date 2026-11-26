package prevue.daemon

import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import prevue.application.domain.model.PreviewSpec
import prevue.daemon.fake.realDispatchers
import prevue.infrastructure.dump.ClasspathSpec
import prevue.infrastructure.render.RenderEngine

@EnabledIf("prevue.daemon.InsetsIntegrationTest#available")
internal class LoadingIndicatorIntegrationTest {
    @Test fun `View 무한 로딩 원은 갤러리로 그려도 보드로 열어 틱을 돌려도 프로세스가 살아 있다`() = runBlocking {
        val source = File(PearlFixture.dir, "app/src/main/kotlin/com/example/pearl/LoadingIndicator.kt")
        val json = PearlFixture.warmupJson(source, "--variant", "debug")
        val home = ClasspathSpec.load(File(Regex("\"classpath\": \"([^\"]+)\"").find(json)!!.groupValues[1]))
        val out = Files.createTempDirectory("prevue-loading").toFile()
        try {
            RenderEngine(home, PearlFixture.layoutlib()!!, out, realDispatchers).use { engine ->
                val preview = PreviewSpec(
                    "com.example.pearl.LoadingIndicatorKt.LoadingIndicatorPreview",
                    "loading-indicator",
                    mapOf("showBackground" to "true", "widthDp" to "360", "heightDp" to "200"),
                    source,
                    0,
                )
                val aside = engine.showAside(preview, tree = false)
                assertTrue(aside.ok, aside.message?.text)
                val handle = engine.open(preview, interactive = true, ownLoader = false)
                try {
                    assertTrue(handle.opened.ok, handle.opened.message?.text)
                    repeat(3) { handle.tick(forceImage = true, stepMs = 16) }
                } finally {
                    handle.close()
                }
            }
        } finally {
            out.deleteRecursively()
        }
    }
}
