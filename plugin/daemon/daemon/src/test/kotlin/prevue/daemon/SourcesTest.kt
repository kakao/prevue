package prevue.daemon

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.io.TempDir

class SourcesTest {
    @TempDir lateinit var tmp: File

    @Test fun `층 패키지는 각 층 모듈의 소스에서 끌어낸다`() {
        assertEquals(listOf("application", "infrastructure"), Sources.PACKAGES)
    }

    @Test fun `폴더와 패키지 이름이 갈려도 패키지를 따른다`() {
        val root = module("adapter/infra", "prevue/infrastructure/render")
        assertEquals("infrastructure", Sources.packageOf(root))
    }

    @Test fun `패키지가 둘이거나 없는 층 모듈은 멈춘다`() {
        assertThrows<IllegalStateException> { Sources.packageOf(module("two", "prevue/a", "prevue/b")) }
        assertThrows<IllegalStateException> { Sources.packageOf(module("none")) }
    }

    private fun module(folder: String, vararg dirs: String): File {
        val root = File(tmp, "$folder/src/main/kotlin")
        root.mkdirs()
        dirs.forEach { File(root, it).mkdirs() }
        return root
    }
}
