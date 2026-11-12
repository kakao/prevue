package prevue.application.domain.model

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ModuleGraphTest {
    private val r = "/r/pearl-kmp"
    private val app = ModuleNode(":app", listOf(File("$r/app/src/main/kotlin")), emptyList())
    private val pearl = ModuleNode(
        ":feature:pearl",
        listOf("commonMain", "androidMain", "jvmAndroidMain").map { File("$r/feature/pearl/src/$it/kotlin") },
        emptyList(), kmp = true,
    )

    @Test fun `KMP 모듈의 파일은 src 다음 칸이 소스 세트다`() {
        val g = ModuleGraph(":app", listOf(pearl, app))
        assertEquals("commonMain", g.sourceSetOf(File("$r/feature/pearl/src/commonMain/kotlin/a/Screen.kt")))
        assertEquals("androidMain", g.sourceSetOf(File("$r/feature/pearl/src/androidMain/kotlin/a/Screen.kt")))
        assertEquals("jvmAndroidMain", g.sourceSetOf(File("$r/feature/pearl/src/jvmAndroidMain/kotlin/a/Screen.kt")))
    }

    @Test fun `Android 전용 모듈과 소스 루트 밖의 파일은 소스 세트가 없다`() {
        val g = ModuleGraph(":app", listOf(pearl, app))
        assertNull(g.sourceSetOf(File("$r/app/src/main/kotlin/MainActivity.kt")))
        assertNull(g.sourceSetOf(File("/elsewhere/Screen.kt")))
    }

    @Test fun `표준 배치가 아닌 루트는 위쪽 경로의 src 를 소스 세트로 읽지 않는다`() {
        val custom = ModuleNode(":feature:x", listOf(File("/Users/me/src/app/feature/x/shared/kotlin")), emptyList(), kmp = true)
        val g = ModuleGraph(":feature:x", listOf(custom))
        assertNull(g.sourceSetOf(File("/Users/me/src/app/feature/x/shared/kotlin/a/Screen.kt")))
        assertEquals(":feature:x", g.ownerOf(File("/Users/me/src/app/feature/x/shared/kotlin/a/Screen.kt")))
    }

    @Test fun `KMP 모듈이 하나라도 있으면 KMP 프로젝트다`() {
        assertTrue(ModuleGraph(":app", listOf(pearl, app)).kmp)
        assertFalse(ModuleGraph(":app", listOf(app)).kmp)
    }

    @Test fun `링크 경로 루트로 만든 그래프도 실제 경로의 파일을 품고 모듈을 가린다`() {
        val tmp = Files.createTempDirectory("prevue-graph").toFile()
        try {
            val real = File(tmp, "real/lib/src/main/kotlin").apply { mkdirs() }
            val res = File(tmp, "real/lib/src/main/res").apply { mkdirs() }
            val link = Files.createSymbolicLink(File(tmp, "link").toPath(), File(tmp, "real").toPath()).toFile()
            val g = ModuleGraph(":app", listOf(
                ModuleNode(":lib", listOf(File(link, "lib/src/main/kotlin")), emptyList(), resRoots = listOf(File(link, "lib/src/main/res"))),
                ModuleNode(":app", emptyList(), emptyList()),
            ))
            val f = File(real, "a/Screen.kt").canonicalFile
            assertTrue(g.contains(f))
            assertEquals(":lib", g.ownerOf(f))
            assertEquals(listOf(real.canonicalFile), g.roots)
            assertEquals(listOf(res.canonicalFile), g.resRoots)
            assertFalse(g.contains(File(tmp, "other/Screen.kt").canonicalFile))
        } finally { File(tmp, "link").delete(); tmp.deleteRecursively() }
    }

    @Test fun `루트와 이름만 앞이 같은 형제 폴더는 품지 않는다`() {
        val g = ModuleGraph(":app", listOf(app))
        assertFalse(g.contains(File("$r/app/src/main/kotlinx/A.kt")))
        assertTrue(g.contains(File("$r/app/src/main/kotlin/A.kt")))
    }
}
