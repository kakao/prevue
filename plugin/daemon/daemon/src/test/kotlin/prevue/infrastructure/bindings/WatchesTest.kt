package prevue.infrastructure.bindings

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.ModuleGraph
import prevue.application.domain.model.ModuleNode
import prevue.infrastructure.dump.ClasspathSpec
import prevue.infrastructure.dump.DumpPaths

class WatchesTest {
    private val tmp = Files.createTempDirectory("prevue-watches").toFile().canonicalFile
    @AfterEach fun tearDown() { tmp.deleteRecursively() }

    private val classes = File(tmp, "app/build/classes").path
    private val spec = ClasspathSpec(File(tmp, "app.json"), ":app", "debug", "", "",
        DumpPaths(classPath = listOf(classes), projectClassPath = listOf(classes), compileClassPath = emptyList(), rClassJars = emptyList(), resourceDirs = emptyList()))
    private val config = InfraConfig(File(tmp, "app.json"), File("/l"), File("/c"), File("/b"), 8791)

    @Test fun `링크 경로로 적힌 res 루트와 링크된 values 디렉터리도 실제 경로로 감시하고 리소스 감시와 겹치지 않는다`() {
        val res = File(tmp, "real/app/src/main/res")
        val values = File(res, "values").apply { mkdirs() }
        val drawable = File(res, "drawable").apply { mkdirs() }
        val night = File(tmp, "shared/values-night").apply { mkdirs() }
        Files.createSymbolicLink(File(res, "values-night").toPath(), night.toPath())
        val link = Files.createSymbolicLink(File(tmp, "link").toPath(), File(tmp, "real").toPath()).toFile()
        val graph = ModuleGraph(":app", listOf(ModuleNode(":app", emptyList(), emptyList(), resRoots = listOf(File(link, "app/src/main/res")))))

        val w = Watches.of(config, graph, spec)

        assertEquals(listOf(values, night), w.valueDirs)
        assertTrue(drawable in w.resources)
        assertTrue(res in w.resources)
        assertFalse(w.resources.any { it.canonicalFile in w.valueDirs })
    }
}
