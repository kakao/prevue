package prevue.daemon.domain

import java.io.File
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.future.future
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import prevue.daemon.domain.model.ExternalResult
import prevue.daemon.domain.model.WaitResult
import prevue.daemon.domain.port.BuildChange
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.fake.FakeClock
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace

class ExternalBuildRecoveryTest {
    private val fx = Fixture()
    private val built get() = BuildChange(own = listOf(File(fx.root, "app/build/classes")))

    @AfterEach fun tearDown() = fx.close()

    private fun opened() = fx.useCases(FakeClock()).also {
        fx.file.setLastModified(1)
        runBlocking { it.openPreview(fx.file.path, null, emptyMap(), "test") }
        it.workspace.awaitBoardFilled()
    }

    @Test fun `완료된 옛 보드가 있어도 빌드 대기 중 wait는 복구를 기다린다`() = runBlocking {
        val uc = opened()
        uc.externalBuild(built, done = false)
        val waiting = fx.scope.future(start = CoroutineStart.UNDISPATCHED) { uc.awaitRender(listOf(fx.file), 5_000) }
        assertFalse(waiting.isDone)
        assertTrue(uc.workspace.now.buildPending)
        uc.externalBuild(built, done = true)
        assertTrue(waiting.get(5, TimeUnit.SECONDS).ok)
        assertFalse(uc.workspace.now.buildPending)
    }

    @Test fun `갱신이 끝나지 않으면 실패한 프리뷰 대신 빌드 대기 시간 초과를 답한다`() = runBlocking {
        val uc = opened()
        uc.externalBuild(built, done = false)
        val result = uc.awaitRender(listOf(fx.file), 20) as WaitResult.TimedOut
        assertTrue(result.message.contains("빌드 산출물 갱신"))
        assertTrue(result.stale.getValue("build").pending)
        assertFalse(result.stale.getValue("build").remedy.text.contains("재시작"))
    }

    @Test fun `새 산출물에 프리뷰 클래스가 없으면 옛 성공을 보존하고 다음 변경에서 복구한다`() = runBlocking {
        val uc = opened()
        val before = uc.workspace.now.lastResult
        val shown = fx.renderer.shown.size
        val name = uc.workspace.now.current!!.fqn.substringBeforeLast('.')
        fx.compiler.unbuilt = setOf(name)
        assertEquals(ExternalResult.BuildPending, uc.externalBuild(built, done = true))
        assertSame(before, uc.workspace.now.lastResult)
        assertEquals(shown, fx.renderer.shown.size)
        assertTrue(uc.workspace.now.stale.getValue("build").message!!.text.contains(name))
        assertTrue(uc.awaitRender(listOf(fx.file), 20) is WaitResult.TimedOut)
        fx.compiler.unbuilt = emptySet()
        assertTrue((uc.externalBuild(built, done = true) as ExternalResult.Redrawn).result.ok)
        assertTrue(uc.awaitRender(listOf(fx.file), 5_000).ok)
    }

    @Test fun `외부 빌드 직후 렌더에서 클래스를 못 찾아도 성공한 보드를 실패로 바꾸지 않는다`() = runBlocking {
        val uc = opened()
        val before = uc.workspace.now.lastResult
        val generation = uc.workspace.now.board!!.gen
        fx.renderer.failures += FailureKind.NOT_FOUND
        assertEquals(ExternalResult.BuildPending, uc.externalBuild(built, done = true))
        assertSame(before, uc.workspace.now.lastResult)
        assertEquals(generation, uc.workspace.now.board!!.gen)
        assertTrue(uc.workspace.now.stale.getValue("build").pending)
        assertTrue((uc.externalBuild(built, done = true) as ExternalResult.Redrawn).result.ok)
    }

    @Test fun `빌드 대기 중 새 소스 컴파일 오류는 기다리는 wait에 바로 전달한다`() = runBlocking {
        val uc = opened()
        uc.externalBuild(built, done = false)
        val waiting = fx.scope.future(start = CoroutineStart.UNDISPATCHED) { uc.awaitRender(listOf(fx.file), 5_000) }
        assertFalse(waiting.isDone)
        fx.compiler.ok = false
        uc.applySave(listOf(fx.file), "test")
        assertTrue(waiting.get(1, TimeUnit.SECONDS) is WaitResult.CompileFailed)
    }

    @Test fun `빌드 뒤 실제 렌더 오류는 갱신 대기로 숨기지 않는다`() = runBlocking {
        val uc = opened()
        uc.externalBuild(built, done = false)
        fx.renderer.exceptions += "java.lang.IllegalStateException: actual failure"
        val result = uc.externalBuild(built, done = true) as ExternalResult.Redrawn
        assertFalse(result.result.ok)
        assertFalse(uc.workspace.now.buildPending)
        val waiting = uc.awaitRender(listOf(fx.file), 5_000)
        assertFalse(waiting.ok)
        assertTrue(waiting is WaitResult.BoardDone)
        assertFalse(uc.workspace.now.stale.getValue("build").remedy.text.contains("재시작"))
    }

    @Test fun `직접 reload로 새 소스를 컴파일하면 클래스 갱신 대기를 닫는다`() = runBlocking {
        val uc = opened()
        fx.renderer.failures += FailureKind.NOT_FOUND
        uc.externalBuild(built, done = true)
        assertTrue(uc.workspace.now.buildPending)
        assertTrue(uc.applySave(listOf(fx.file), "reload").ok)
        assertFalse(uc.workspace.now.buildPending)
        assertTrue(uc.awaitRender(listOf(fx.file), 5_000).ok)
    }

    @Test fun `외부 빌드와 관계없는 클래스 누락은 즉시 실패한다`() = runBlocking {
        val uc = fx.useCases(FakeClock())
        fx.renderer.failures += FailureKind.NOT_FOUND
        val result = uc.openPreview(fx.file.path, null, emptyMap(), "test")
        assertFalse(result.ok)
        assertFalse(uc.workspace.now.buildPending)
    }
}
