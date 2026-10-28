package prevue.daemon.domain.runtime

import java.io.File
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.fake.FakeResourceValues
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.ResourceKey
import prevue.daemon.domain.port.SourceChange
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.WaitResult
import prevue.daemon.domain.policy.StaleReasons
import prevue.daemon.domain.UseCases

/**
 * D-68. values XML을 저장하면 컴파일하지 않고 값만 렌더러에 얹어 다시 그린다 — Gradle도 재시작도 없다.
 * 못 얹는 것(새 항목 · 다른 정의가 이김 · 저장 전을 모름)은 지금처럼 낡음(`resources`)과 할 일이다.
 */
class ResourcePatchesTest {
    private val fx = Fixture()
    private val title = ResourceKey("string", "title", "")
    private val values = FakeResourceValues(hashMapOf(title to "A", ResourceKey("string", "done", "") to "Done"))

    @AfterEach fun tearDown() = fx.close()

    private fun xml(vararg items: Pair<String, String>) = "<resources>\n" + items.joinToString("") { (n, v) -> "    <string name=\"$n\">$v</string>\n" } + "</resources>\n"

    private fun opened(file: File = fx.valuesFile(xml("title" to "A", "done" to "Done"))): Pair<UseCases, File> {
        val uc = fx.useCases(resources = values)
        uc.rememberValues()
        runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }
        uc.workspace.awaitBoardFilled()
        return uc to file
    }

    private fun write(f: File, text: String) { f.writeText(text); f.setLastModified(f.lastModified() + 1_000) }
    private fun UseCases.watch(vararg files: File): ReloadResult = runBlocking {
        applySave(files.toList(), "watch", SourceChange(files.toList(), files.maxOf { it.lastModified() }, System.currentTimeMillis(), System.nanoTime()))
    }

    @Test fun `한 묶음의 판정은 넣기 전의 값과 견준다 — 앞 파일에 넣은 값이 뒤 파일의 지금 값이 되지 않는다`() {
        val a = fx.valuesFile(xml("title" to "A"))
        val b = File(fx.root, "app/src/debug/res/values/strings.xml").apply { parentFile.mkdirs(); writeText(xml("title" to "A")) }
        val patches = ResourcePatches(values)
        patches.remember(listOf(a, b))
        a.writeText(xml("title" to "B"))
        b.writeText(xml("title" to "C"))
        val out = runBlocking { patches.apply(listOf(a, b)) }
        assertNull(out.stale, "뒤 파일이 앞 파일에 넣은 값과 견줘 낡음이 됐다")
        assertEquals(2, values.puts.size)
    }

    @Test fun `값으로 얹는 것은 res 아래 values 디렉터리의 XML뿐이다`() {
        val res = File(fx.root, "app/src/main/res")
        assertTrue(ResourcePatches.isValues(File(res, "values/strings.xml")))
        assertTrue(ResourcePatches.isValues(File(res, "values-ko/strings.xml")))
        assertFalse(ResourcePatches.isValues(File(res, "drawable/icon.xml")))
        assertFalse(ResourcePatches.isValues(File(res, "layout/main.xml")))
        assertFalse(ResourcePatches.isValues(File(fx.root, "values/strings.xml")))
        assertFalse(ResourcePatches.isValues(File(res, "values/notes.txt")))
    }

    @Test fun `기존 값을 고쳐 저장하면 컴파일 없이 그 값으로 보드를 다시 그린다`() {
        val (uc, f) = opened()
        val gen = uc.workspace.now.board!!.gen
        val codeChanges = fx.renderer.codeChanges
        fx.renderer.shown.clear()
        write(f, xml("title" to "B", "done" to "Done"))
        val r = uc.watch(f) as ReloadResult.Rendered
        assertEquals(CompileResult.RESOURCES, r.result.shot.compile?.exitCode)
        assertEquals(listOf(listOf(title)), values.puts.toList())
        assertEquals("B", values.over[title])
        assertTrue(fx.compiler.compiled.isEmpty(), "컴파일했다")
        assertEquals(codeChanges, fx.renderer.codeChanges, "로더를 버렸다 — 값만 바뀌면 같은 로더로 그린다")
        assertTrue(uc.workspace.now.stale.isEmpty(), "낡음이 섰다: ${uc.workspace.now.stale}")
        uc.workspace.awaitBoardFilled()
        assertTrue(uc.workspace.now.board!!.gen > gen, "보드 세대가 그대로다")
        assertEquals(3, fx.renderer.shown.size, "보드를 다 다시 그리지 않았다")
    }

    // 기준 5. 에이전트는 저장한 values 파일로 기다린다 — 감시 루트 밖이라고 거절하거나 컴파일을 기다리다 시간을 넘기면 안 된다.
    @Test fun `wait가 values 저장을 기다려 새 그림으로 답한다`() {
        val (uc, f) = opened()
        write(f, xml("title" to "B", "done" to "Done"))
        uc.watch(f)
        val w = runBlocking { uc.awaitRender(listOf(f), timeoutMs = 5_000) }
        assertTrue(w is WaitResult.BoardDone && w.complete, "$w")
    }

    @Test fun `새 항목은 그리지 않고 낡음과 할 일을 세운다`() {
        val (uc, f) = opened()
        fx.renderer.shown.clear()
        write(f, xml("title" to "A", "done" to "Done", "fresh" to "New"))
        val r = uc.watch(f)
        assertTrue(r is ReloadResult.ResourcesStale, "$r")
        val s = uc.workspace.now.stale[StaleReasons.RESOURCES]!!
        assertTrue("prevue warmup ${uc.workspace.now.current!!.file!!.path}" in s.remedy.text, s.remedy.text)
        assertTrue("new entry" in s.message?.text.orEmpty(), s.message?.text)
        assertTrue(fx.renderer.shown.isEmpty(), "다시 그렸다")
        // 그래도 기다림은 바로 답한다 — 저장을 읽었고 그림은 낡음을 달고 있다.
        val w = runBlocking { uc.awaitRender(listOf(f), timeoutMs = 2_000) }
        assertTrue(w is WaitResult.BoardDone && w.stale.containsKey(StaleReasons.RESOURCES), "$w")
    }

    @Test fun `낡음이 선 뒤에도 값만 바뀐 저장은 계속 넣는다`() {
        val (uc, f) = opened()
        write(f, xml("title" to "A", "done" to "Done", "fresh" to "New"))
        uc.watch(f)
        write(f, xml("title" to "C", "done" to "Done", "fresh" to "New"))
        assertTrue(uc.watch(f) is ReloadResult.Rendered)
        assertEquals("C", values.over[title])
        assertTrue(uc.workspace.now.stale.containsKey(StaleReasons.RESOURCES), "낡음은 사람이 Gradle로 닫는다 — 남아야 한다")
    }

    @Test fun `값이 그대로인 저장은 그리지 않는다`() {
        val (uc, f) = opened()
        fx.renderer.shown.clear()
        write(f, "<!-- 주석 -->\n" + xml("title" to "A", "done" to "Done"))
        assertEquals(ReloadResult.Unchanged(listOf(f)), uc.watch(f))
        assertTrue(fx.renderer.shown.isEmpty())
        assertTrue(uc.workspace.now.stale.isEmpty())
    }

    @Test fun `데몬이 뜬 뒤 생긴 values 파일은 저장 전을 몰라 낡음이다`() {
        val (uc, _) = opened()
        val late = fx.valuesFile(xml("title" to "제목"), dir = "values-ko")
        assertTrue(uc.watch(late) is ReloadResult.ResourcesStale)
        assertTrue("before the save" in uc.workspace.now.stale[StaleReasons.RESOURCES]!!.message?.text.orEmpty())
    }

    @Test fun `렌더러에 넣지 못하면 낡음이다`() {
        val (uc, f) = opened()
        values.putOk = false
        write(f, xml("title" to "B", "done" to "Done"))
        assertTrue(uc.watch(f) is ReloadResult.ResourcesStale)
        assertTrue("Couldn't put" in uc.workspace.now.stale[StaleReasons.RESOURCES]!!.message?.text.orEmpty())
    }

    @Test fun `렌더러가 값을 얹을 수 없으면 지금처럼 낡음이다`() {
        val f = fx.valuesFile(xml("title" to "A"))
        val uc = fx.useCases(resources = null).also { it.rememberValues() }
        runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }
        write(f, xml("title" to "B"))
        assertTrue(uc.watch(f) is ReloadResult.ResourcesStale)
    }

    // 보여 주는 것이 없어도 얹는다 — 그다음 여는 그림이 저장한 값이어야 한다.
    @Test fun `보여 주는 것이 없어도 값은 얹는다`() {
        val f = fx.valuesFile(xml("title" to "A", "done" to "Done"))
        val uc = fx.useCases(resources = values).also { it.rememberValues() }
        write(f, xml("title" to "B", "done" to "Done"))
        assertEquals(ReloadResult.NothingShown, uc.watch(f))
        assertEquals("B", values.over[title])
    }

    // 리뷰 지적 — 깨진 저장이 기준이 되면, 고친 뒤의 저장이 깨진 내용과 견줘져 그 파일의 핫리로드가 재시작까지 꺼진다.
    @Test fun `깨진 XML을 저장했다 고치면 다시 값만 넣는다`() {
        val (uc, f) = opened()
        write(f, "<resources>\n    <string name=\"title\">B</string>\n")       // 닫는 태그가 없다
        assertTrue(uc.watch(f) is ReloadResult.ResourcesStale)
        write(f, xml("title" to "B", "done" to "Done"))
        assertTrue(uc.watch(f) is ReloadResult.Rendered)
        assertEquals("B", values.over[title])
    }

    @Test fun `넣지 못한 값은 다음 저장의 기준이 되지 않는다`() {
        val (uc, f) = opened()
        values.putOk = false
        write(f, xml("title" to "B", "done" to "Done"))
        uc.watch(f)
        values.putOk = true
        write(f, xml("title" to "C", "done" to "Done"))
        assertTrue(uc.watch(f) is ReloadResult.Rendered, "넣지 못한 B를 저장 전 값으로 삼았다")
        assertEquals("C", values.over[title])
    }

    // 리뷰 지적 — 낡음의 이유가 첫 저장의 것에 묶이면 에이전트가 엉뚱한 항목을 고친다.
    @Test fun `낡음의 이유는 이번 저장의 것이다`() {
        val (uc, f) = opened()
        write(f, xml("title" to "A", "done" to "Done", "fresh" to "New"))
        uc.watch(f)
        write(f, xml("title" to "A", "fresh" to "New"))
        val r = uc.watch(f) as ReloadResult.ResourcesStale
        assertTrue("was removed" in r.why.text, r.why.text)
        assertTrue("was removed" in uc.workspace.now.stale[StaleReasons.RESOURCES]!!.message?.text.orEmpty())
    }

    // 리뷰 지적 — 지웠다 다시 쓰는 에디터의 저장은 잠깐 파일이 없다. 없어진 것으로 알리면 재시작까지 낡음이다.
    @Test fun `지웠다 곧 다시 만든 values 파일은 저장으로 본다`() {
        val (uc, f) = opened()
        f.delete()
        val back = Thread { Thread.sleep(150); write(f, xml("title" to "B", "done" to "Done")) }.apply { start() }   // 실제 시간 — 본체의 다시 나타남 유예가 벽시계다
        val r = uc.watch(f)
        back.join()
        assertTrue(r is ReloadResult.Rendered, "$r")
        assertTrue(uc.workspace.now.stale.isEmpty(), "${uc.workspace.now.stale}")
    }

    @Test fun `values reload가 낡음이면 다시 그리지 않고 낡음으로 답한다`() {
        val (uc, f) = opened()
        write(f, xml("title" to "A", "done" to "Done", "fresh" to "New"))
        val r = runBlocking { uc.applySave(listOf(f), "cli") }
        assertTrue(r is ReloadResult.ResourcesStale, "$r")
    }

    @Test fun `지금 그림에 실패가 있으면 값이 그대로인 values 저장도 다시 그린다`() {
        val (uc, f) = opened()
        fx.renderer.exceptions.add("흔들린 렌더")
        runBlocking { uc.applySave(listOf(fx.file), "cli") }                   // 포커스 카드가 실패로 남는다
        fx.renderer.shown.clear()
        write(f, "<!-- 다시 -->\n" + xml("title" to "A", "done" to "Done"))
        assertTrue(uc.watch(f) is ReloadResult.Rendered)
        assertFalse(fx.renderer.shown.isEmpty())
    }

    @Test fun `reload는 바뀐 값이 없어도 다시 그린다`() {
        val (uc, f) = opened()
        fx.renderer.shown.clear()
        val r = runBlocking { uc.applySave(listOf(f), "cli") }
        assertTrue(r is ReloadResult.Rendered, "$r")
        assertFalse(fx.renderer.shown.isEmpty())
        assertNull(uc.workspace.now.stale[StaleReasons.RESOURCES])
    }
}
