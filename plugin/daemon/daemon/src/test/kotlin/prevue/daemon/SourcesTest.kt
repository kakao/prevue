package prevue.daemon

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir

class SourcesTest {
    @TempDir lateinit var tmp: File

    @Test fun `층 모듈마다 패키지 하나를 그 모듈의 소스에서 끌어낸다`() {
        assertEquals(Sources.LAYERS.size, Sources.PACKAGES.size)
        Sources.LAYERS.zip(Sources.PACKAGES).forEach { (layer, pkg) ->
            assertTrue(File("../$layer/src/main/kotlin/prevue/$pkg").isDirectory, "$layer → $pkg")
        }
    }

    @Test fun `폴더와 패키지 이름이 갈려도 패키지를 따른다`() {
        val root = module("adapter/infra", "prevue/infrastructure/render/A.kt", "prevue/old/.DS_Store")
        assertEquals("infrastructure", Sources.packageOf(root))
    }

    @Test fun `패키지가 둘이거나 없거나 prevue 에 바로 둔 층 모듈은 멈춘다`() {
        assertThrows<IllegalStateException> { Sources.packageOf(module("two", "prevue/a/A.kt", "prevue/b/B.kt")) }
        assertThrows<IllegalStateException> { Sources.packageOf(module("none", "prevue/a/.DS_Store")) }
        assertThrows<IllegalStateException> { Sources.packageOf(module("bare", "prevue/a/A.kt", "prevue/Foo.kt")) }
    }

    @Test fun `층은 패키지부터 조립은 그 아래 이름으로 단다`() {
        val files = mapOf(
            "prevue/daemon/Main.kt" to "m", "prevue/daemon/render/R.kt" to "r",
            "prevue/infrastructure/X.kt" to "x", "prevue/application/service/S.kt" to "s", "prevue/other/O.kt" to "o",
        )
        assertEquals(
            mapOf("Main.kt" to "m", "render/R.kt" to "r", "infrastructure/X.kt" to "x", "application/service/S.kt" to "s"),
            Sources.keyed(files, packages),
        )
    }

    @Test fun `층 패키지와 같은 이름의 조립 하위 패키지는 멈춘다`() {
        assertThrows<IllegalStateException> { Sources.keyed(mapOf("prevue/daemon/infrastructure/X.kt" to ""), packages) }
        assertThrows<IllegalStateException> { Sources.keyed(mapOf("prevue/daemon/infrastructure/X.kt" to "a", "prevue/infrastructure/X.kt" to "b"), packages) }
        assertThrows<IllegalStateException> { Sources.keyed(mapOf("prevue/daemon/Main.kt" to ""), listOf("daemon")) }
    }

    private val packages = listOf("application", "infrastructure")

    private fun module(folder: String, vararg files: String): File {
        val root = File(tmp, "$folder/src/main/kotlin")
        files.forEach { File(root, it).apply { parentFile.mkdirs() }.writeText("") }
        return root
    }
}
