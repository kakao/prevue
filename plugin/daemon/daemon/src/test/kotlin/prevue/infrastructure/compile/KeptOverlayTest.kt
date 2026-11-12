package prevue.infrastructure.compile

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** 앞 데몬의 오버레이를 이어 쓰는 판정 — 이어 쓴 클래스는 렌더 클래스패스 맨 앞이라, 틀리면 옛 코드를 조용히 그린다. */
class KeptOverlayTest {
    private val dir = Files.createTempDirectory("kept").toFile()
    private val ui = File(dir, "core/ui/src/main/kotlin")
    private val feature = File(dir, "feature/src/main/kotlin")
    private val card = File(ui, "Card.kt").path
    private val screen = File(feature, "Screen.kt").path

    @AfterEach fun tearDown() { dir.deleteRecursively() }

    private fun kept(at: Long = 500, vararg sources: Pair<String, Long>) = KeptModule(sources.toMap(), at, 3, mapOf("ui-1.kotlin_module" to listOf(card)), "args")

    private val overlay = KeptOverlay("tc", mapOf(":core:ui" to kept(500, card to 100L), ":feature" to kept(500, screen to 200L)))

    private val mtimes = mutableMapOf(card to 100L, screen to 200L)
    private val now = mutableMapOf(
        ":core:ui" to KeptOverlay.Now(400, "args", listOf(ui)),
        ":feature" to KeptOverlay.Now(400, "args", listOf(feature)),
    )

    private fun judge(toolchain: String = "tc") = overlay.judge(toolchain, now::get, mtimes::get)

    @Test fun `컴파일한 그대로면 모두 이어 쓴다`() {
        val v = judge() as KeptOverlay.Verdict.Keep
        assertEquals(setOf(":core:ui", ":feature"), v.modules.keys)
        assertTrue(v.rebuilt.isEmpty())
    }

    @Test fun `컴파일한 뒤 소스가 바뀌었으면 모듈 하나만이 아니라 전부 버린다 — 다른 모듈이 그 클래스로 컴파일됐다`() {
        mtimes[screen] = 250
        assertTrue(judge() is KeptOverlay.Verdict.Wipe)
    }

    // 리터럴만 바꾼 저장(D-67)은 컴파일하지 않아 오버레이 클래스가 옛 값이다 — 기록은 컴파일할 때만 남아 mtime이 어긋난다
    @Test fun `컴파일 없이 바뀐 소스 · 지운 소스 · 소스 루트 밖의 복사본은 전부 버린다`() {
        mtimes.remove(card)
        assertTrue(judge() is KeptOverlay.Verdict.Wipe)
        mtimes[card] = 100
        now[":core:ui"] = KeptOverlay.Now(400, "args", listOf(feature))
        assertTrue(judge() is KeptOverlay.Verdict.Wipe)
    }

    @Test fun `컴파일러 · 인자 · 산출물 시각을 모르면 전부 버린다`() {
        assertTrue(judge("other") is KeptOverlay.Verdict.Wipe)
        now[":feature"] = KeptOverlay.Now(400, "changed", listOf(feature))
        assertTrue(judge() is KeptOverlay.Verdict.Wipe)
        now[":feature"] = KeptOverlay.Now(null, "args", listOf(feature))
        assertTrue(judge() is KeptOverlay.Verdict.Wipe)
        now.remove(":feature")
        assertTrue(judge() is KeptOverlay.Verdict.Wipe)
    }

    @Test fun `Gradle이 그 뒤에 다시 빌드한 모듈만 버린다`() {
        now[":feature"] = KeptOverlay.Now(600, "args", listOf(feature))
        val v = judge() as KeptOverlay.Verdict.Keep
        assertEquals(setOf(":core:ui"), v.modules.keys)
        assertEquals(listOf(":feature"), v.rebuilt)
    }

    @Test fun `남긴 기록을 그대로 읽고 다른 형식이나 깨진 기록은 없는 것으로 본다`() {
        val f = File(dir, "o.modules/kept.json")
        overlay.save(f)
        val back = KeptOverlay.read(f)!!
        assertEquals("tc", back.toolchain)
        assertEquals(mapOf(card to 100L), back.modules.getValue(":core:ui").sources)
        assertEquals(listOf(card), back.modules.getValue(":core:ui").indexes["ui-1.kotlin_module"])
        assertEquals(3, back.modules.getValue(":core:ui").next)
        f.writeText(f.readText().replace("\"format\":1", "\"format\":2"))
        assertNull(KeptOverlay.read(f))
        f.writeText("{")
        assertNull(KeptOverlay.read(f))
    }
}
