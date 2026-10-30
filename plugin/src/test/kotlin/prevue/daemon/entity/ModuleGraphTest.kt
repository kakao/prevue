package prevue.daemon.entity

import java.io.File
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
}
