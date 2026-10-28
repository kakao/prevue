package prevue.daemon.domain.runtime

import java.io.File
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace
import prevue.daemon.domain.port.BuildChange
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.LiteralSite
import prevue.daemon.domain.port.LiteralTable
import prevue.daemon.domain.port.SourceChange
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.WaitResult
import prevue.daemon.domain.UseCases

/**
 * D-67. 감시가 부른 저장이 내용이 같으면 아무것도 안 하고, 리터럴만 바꿨으면 컴파일 없이 값을 넣는다.
 * 어긋나면 옛 그림이 새 그림인 척한다 — 그래서 의심스러운 자리(reload · 인터랙티브 · 넣기 실패 · 컴파일 실패)는 늘 컴파일로 간다.
 */
class LiteralPatchesTest {
    private val fx = Fixture()
    private val owner = "demo.LiveLiterals\$CardsKt"
    private val key = "Int\$arg-0\$call-pad\$fun-Card0"

    @AfterEach fun tearDown() = fx.close()

    private fun source(pad: Int, tail: String = "") =
        "package demo\nimport androidx.compose.ui.tooling.preview.Preview\n@Preview\nfun Card0() { pad($pad) }\n@Preview\nfun Card1() {}\n$tail"

    /** 컴파일러가 냈을 표 — 컴파일하는 순간의 내용에서 `pad(n)`의 자리 · 값. 키는 파일을 안 담아 같은 함수 이름이면 겹친다. */
    private fun table(f: File, text: String = f.readText()): LiteralTable? {
        val m = Regex("pad\\((\\d+)\\)").find(text) ?: return null
        return LiteralTable(f.absolutePath, "demo.LiveLiterals\$${f.nameWithoutExtension}Kt",
            listOf(LiteralSite(key, m.groups[1]!!.range.first, "Int", true, m.groupValues[1].toInt())))
    }

    private fun opened(): UseCases {
        fx.file.writeText(source(16))
        fx.compiler.literals = ::table
        return fx.useCases().also { runBlocking { it.openPreview(fx.file.path, null, emptyMap(), "test") }; it.workspace.awaitBoardFilled() }
    }

    private fun UseCases.write(text: String, f: File = fx.file) { f.writeText(text); f.setLastModified(f.lastModified() + 1_000) }
    private fun UseCases.watch(vararg files: File = arrayOf(fx.file)): ReloadResult = runBlocking {
        applySave(files.toList(), "watch", SourceChange(files.toList(), files.maxOf { it.lastModified() }, System.currentTimeMillis(), System.nanoTime()))
    }
    private fun UseCases.waited(): WaitResult = runBlocking { awaitRender(listOf(fx.file), timeoutMs = 5_000) }

    @Test fun `같은 내용의 감시 저장은 컴파일도 렌더도 하지 않는다`() {
        val uc = opened()
        uc.write(source(16)); assertTrue(uc.watch().ok)                  // 이 내용으로 처음 컴파일한다
        assertEquals(1, fx.compiler.compiled.size)
        uc.workspace.awaitBoardFilled()
        val gen = uc.workspace.now.board!!.gen
        fx.renderer.shown.clear()

        uc.write(source(16))
        assertEquals(ReloadResult.Unchanged(listOf(fx.file)), uc.watch())
        assertEquals(1, fx.compiler.compiled.size)
        assertEquals(emptyList<Any>(), fx.renderer.shown.toList())
        assertEquals(gen, uc.workspace.now.board!!.gen)
        assertTrue(uc.waited().ok)                                          // 기다림은 이 저장이 들어간 것으로 본다
    }

    @Test fun `리터럴만 바꾼 감시 저장은 컴파일 없이 값을 넣고 세대를 올린다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        uc.workspace.awaitBoardFilled()
        val gen = uc.workspace.now.board!!.gen

        uc.write(source(24))
        val r = uc.watch() as ReloadResult.Rendered
        assertEquals(CompileResult.LITERALS, r.result.shot.compile?.exitCode)
        assertEquals(1, fx.compiler.compiled.size)
        assertEquals(listOf(owner to mapOf<String, Any>(key to 24)), fx.renderer.patched.toList())
        val w = uc.waited() as WaitResult.BoardDone
        assertTrue(w.ok)
        assertEquals(gen + 1, w.gen)

        uc.write(source(16))                                                // 되돌리는 것도 리터럴 저장이다
        uc.watch()
        assertEquals(mapOf<String, Any>(key to 16), fx.renderer.patched.last().second)
        assertEquals(1, fx.compiler.compiled.size)
    }

    @Test fun `인터랙티브 중 같은 내용의 저장은 상태를 지우지 않는다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        runBlocking { uc.focusCard(0, on = true, by = "test") }
        fx.renderer.shown.clear()
        uc.write(source(16))
        assertEquals(ReloadResult.Unchanged(listOf(fx.file)), uc.watch())
        assertEquals(emptyList<Any>(), fx.renderer.shown.toList())        // 새 태스크를 안 띄웠다 — 사람이 만든 상태가 남는다
    }

    // 다른 파일의 const · 인라인 함수는 그 파일을 다시 컴파일해야 들어온다 — 건너뛰면 옛 값이 남는다(리뷰 지적).
    @Test fun `그 뒤 다른 파일을 컴파일했으면 같은 내용도 리터럴도 컴파일한다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        uc.write("package lib\nconst val accent = 2\n", fx.libFile); uc.watch(fx.libFile)
        val before = fx.compiler.compiled.size
        uc.write(source(16))
        assertEquals("OK", (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
        uc.write(source(24))                                                // 이제 이 내용이 지금 회차다 — 다시 빠른 경로
        assertEquals(CompileResult.LITERALS, (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
        assertEquals(before + 1, fx.compiler.compiled.size)
    }

    @Test fun `지금 그림에 실패가 있으면 같은 내용의 저장은 다시 시도다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        uc.workspace.awaitBoardFilled()
        fx.renderer.exceptions.add("흔들리는 렌더")
        uc.write(source(16, "// 코드가 바뀌었다\n")); assertTrue(!uc.watch().ok)
        uc.write(source(16, "// 코드가 바뀌었다\n"))
        assertTrue(uc.watch() is ReloadResult.Rendered)                     // 건너뛰지 않고 다시 컴파일해 그렸다
        assertEquals(3, fx.compiler.compiled.size)
    }

    // 실패한 컴파일 뒤 그 파일의 장부는 남는다(오버레이 그대로) — 그 키도 다른 파일의 빠른 경로와 겹치는지 본다(리뷰 지적).
    @Test fun `실패한 컴파일 뒤 남은 장부의 키와 겹치면 컴파일한다`() {
        val uc = opened()
        val other = fx.previewFile("Other", 1).apply { writeText(source(16).replace("Card1", "Other1")) }
        uc.write(source(16)); uc.write(other.readText(), other); uc.watch(fx.file, other)
        uc.write(source(24)); assertEquals(CompileResult.LITERALS, (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
        fx.compiler.ok = false
        uc.write(source(24, "fun broken( {\n")); assertTrue(uc.watch() is ReloadResult.CompileFailed)
        fx.compiler.ok = true
        uc.write(other.readText() + "// 코드가 바뀌었다\n", other); uc.watch(other)
        uc.write(other.readText().replace("pad(16)", "pad(40)"), other)
        assertEquals("OK", (uc.watch(other) as ReloadResult.Rendered).result.shot.compile?.exitCode)
    }

    @Test fun `reload와 인터랙티브는 리터럴만 바꿔도 컴파일한다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        uc.write(source(24))
        runBlocking { uc.applySave(listOf(fx.file), "cli") }               // reload — 사람이 다시 하라고 했다
        assertEquals(2, fx.compiler.compiled.size)

        runBlocking { uc.focusCard(0, on = true, by = "test") }
        uc.write(source(32)); uc.watch()                                    // D-11 — 인터랙티브의 저장은 처음부터
        assertEquals(3, fx.compiler.compiled.size)
        assertEquals(emptyList<Any>(), fx.renderer.patched.toList())
    }

    @Test fun `렌더러가 값을 못 넣으면 컴파일로 간다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        fx.renderer.patchOk = false
        uc.write(source(24))
        val r = uc.watch() as ReloadResult.Rendered
        assertEquals("OK", r.result.shot.compile?.exitCode)
        assertEquals(2, fx.compiler.compiled.size)
    }

    @Test fun `컴파일이 실패하면 다음 리터럴 저장도 컴파일한다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        fx.compiler.ok = false
        uc.write(source(16, "fun broken( {\n")); assertTrue(uc.watch() is ReloadResult.CompileFailed)
        fx.compiler.ok = true
        uc.write(source(24))                                                // 마지막으로 그린 내용과는 리터럴만 다르다 — 그래도 그림은 저장 전 것일 수 있다
        assertEquals("OK", (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
        assertEquals(3, fx.compiler.compiled.size)
    }

    @Test fun `다시 컴파일한 파일과 밖의 빌드가 지운 모듈은 넣어 둔 값을 뺀다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        uc.write(source(24)); uc.watch()
        fx.renderer.dropped.clear()
        uc.write(source(24, "// 코드가 바뀌었다\n")); uc.watch()           // 새 클래스의 기본값이 지금 내용이다
        assertEquals(listOf(owner), fx.renderer.dropped.distinct())

        uc.write(source(40, "// 코드가 바뀌었다\n")); uc.watch()
        fx.renderer.dropped.clear()
        runBlocking { uc.externalBuild(BuildChange(own = listOf(File(fx.root, "app/build/classes"))), done = true) }
        assertEquals(listOf(owner), fx.renderer.dropped.distinct())
        uc.write(source(48, "// 코드가 바뀌었다\n"))                       // 지운 뒤로는 견줄 내용이 없다 — 컴파일
        assertEquals("OK", (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
    }

    // 컴파일러가 단 오프셋은 정규화한 글자 기준일 수 있다 — CR · BOM 이 든 내용은 맞춰 보지 않는다.
    @Test fun `CR 이나 BOM 이 든 파일은 리터럴만 바꿔도 컴파일한다`() {
        val uc = opened()
        uc.write(source(16).replace("\n", "\r\n")); uc.watch()
        uc.write(source(24).replace("\n", "\r\n"))
        assertEquals("OK", (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
        uc.write("\uFEFF" + source(16)); uc.watch()
        uc.write("\uFEFF" + source(24))
        assertEquals("OK", (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
        assertEquals(emptyList<Any>(), fx.renderer.patched.toList())
    }

    // 런타임 캐시가 키 하나로만 찾는다 — 같은 묶음의 두 파일이 함께 켜지면 서로의 값을 읽는다.
    @Test fun `한 묶음의 두 파일이 키가 겹치면 리터럴만 바꿔도 컴파일한다`() {
        val uc = opened()
        val other = fx.previewFile("Other", 1).apply { writeText(source(16).replace("Card1", "Other1")) }
        uc.write(source(16)); uc.write(other.readText(), other); uc.watch(fx.file, other)
        uc.write(source(24)); uc.write(other.readText().replace("pad(16)", "pad(40)"), other)
        assertEquals("OK", (uc.watch(fx.file, other) as ReloadResult.Rendered).result.shot.compile?.exitCode)
        assertEquals(emptyList<Any>(), fx.renderer.patched.toList())
    }

    // 컴파일하는 사이 또 저장됐으면 무엇을 컴파일했는지 모른다 — 그 내용을 견줄 기준으로 쥐지 않는다.
    @Test fun `컴파일하는 사이 또 저장된 파일은 다음 리터럴 저장도 컴파일한다`() {
        val uc = opened()
        uc.write(source(16))
        fx.compiler.literals = { f -> table(f, source(16)) }
        fx.compiler.fails = { _, _ -> uc.write(source(20)); false }
        uc.watch()
        fx.compiler.fails = { _, _ -> false }
        fx.compiler.literals = ::table
        uc.write(source(24))
        assertEquals("OK", (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
    }

    // 장부를 빼면 오버레이에 남은 옛 기본값이 다음 로더에서 돌아온다 — 그 파일의 클래스가 바뀌었을 때만 뺀다.
    @Test fun `넣어 둔 값은 리터럴 저장과 실패한 컴파일로는 빼지 않는다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        uc.write(source(24)); uc.watch()
        fx.renderer.dropped.clear()
        uc.write(source(32)); assertEquals(CompileResult.LITERALS, (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
        fx.compiler.ok = false
        uc.write(source(32, "fun broken( {\n")); assertTrue(uc.watch() is ReloadResult.CompileFailed)
        assertEquals(emptyList<String>(), fx.renderer.dropped.toList())
    }

    // 실패한 컴파일도 모듈마다 오버레이를 바꿀 수 있다 — 그 뒤 다른 파일이 쥔 내용으로 건너뛰지 않는다.
    @Test fun `다른 파일의 컴파일이 실패한 뒤에는 리터럴만 바꿔도 컴파일한다`() {
        val uc = opened()
        uc.write(source(16)); uc.watch()
        fx.compiler.ok = false
        uc.write("package lib\nfun broken( {\n", fx.libFile); assertTrue(uc.watch(fx.libFile) is ReloadResult.CompileFailed)
        fx.compiler.ok = true
        uc.write(source(24))
        assertEquals("OK", (uc.watch() as ReloadResult.Rendered).result.shot.compile?.exitCode)
    }

    // 실패한 묶음이라도 성공한 모듈의 클래스는 오버레이에서 새로 됐다 — 그 장부의 값은 이제 옛 클래스의 것이다.
    @Test fun `실패한 묶음에서 성공한 모듈의 값만 뺀다`() {
        val uc = opened()
        val lib = "package lib\nfun libCard() { pad(16) }\n"
        fx.compiler.literals = { f -> table(f)?.let { t -> if (f == fx.libFile) t.copy(sites = t.sites.map { it.copy(key = "lib") }) else t } }
        uc.write(source(16)); uc.write(lib, fx.libFile); uc.watch(fx.file, fx.libFile)
        uc.write(source(24)); uc.write(lib.replace("16", "24"), fx.libFile)
        assertEquals(CompileResult.LITERALS, (uc.watch(fx.file, fx.libFile) as ReloadResult.Rendered).result.shot.compile?.exitCode)
        fx.renderer.dropped.clear()
        fx.compiler.fails = { module, _ -> module == ":app" }
        uc.write(source(24, "// 코드가 바뀌었다\n")); uc.write(lib + "// 코드가 바뀌었다\n", fx.libFile)
        assertTrue(uc.watch(fx.file, fx.libFile) is ReloadResult.CompileFailed)
        assertEquals(listOf("demo.LiveLiterals\$ThemeKt"), fx.renderer.dropped.distinct())
    }

    // 하나라도 못 넣으면 컴파일로 간다 — 앞서 넣은 다른 파일의 값은 그 컴파일이 장부에서 뺀다.
    @Test fun `한 묶음에서 하나라도 못 넣으면 컴파일하고 앞서 넣은 값을 뺀다`() {
        val uc = opened()
        val lib = "package lib\nfun libCard() { pad(16) }\n"
        fx.compiler.literals = { f -> table(f)?.let { t -> if (f == fx.libFile) t.copy(sites = t.sites.map { it.copy(key = "lib") }) else t } }
        uc.write(source(16)); uc.write(lib, fx.libFile); uc.watch(fx.file, fx.libFile)
        fx.renderer.refuses = setOf("demo.LiveLiterals\$ThemeKt")
        fx.renderer.dropped.clear()
        uc.write(source(24)); uc.write(lib.replace("16", "24"), fx.libFile)
        assertEquals("OK", (uc.watch(fx.file, fx.libFile) as ReloadResult.Rendered).result.shot.compile?.exitCode)
        assertEquals(listOf(owner to mapOf<String, Any>(key to 24)), fx.renderer.patched.toList())
        assertTrue(owner in fx.renderer.dropped)
    }
}
