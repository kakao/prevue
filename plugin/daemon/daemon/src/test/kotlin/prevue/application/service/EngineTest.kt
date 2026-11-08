package prevue.application.service

import java.nio.file.Files
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.Runnable
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import prevue.application.domain.model.PreviewSpec
import prevue.daemon.fake.FakePreviewRenderer
import prevue.daemon.fake.realDispatchers
import prevue.daemon.fake.dispatchersOn
import prevue.application.port.EngineLog
import prevue.application.port.MonotonicClock

@OptIn(ExperimentalCoroutinesApi::class)
class EngineTest {
    private val fake = FakePreviewRenderer(Files.createTempDirectory("prevue-actor").toFile())
    private val scope = CoroutineScope(Job() + Dispatchers.Default)
    private val actor = Engine(fake, fake, scope, realDispatchers, MonotonicClock.SYSTEM, EngineLog {})
    private val card = PreviewSpec("demo.CardKt.Card0", "Card0", emptyMap(), null, 0)

    @AfterEach fun down() { scope.cancel(); fake.outDir.deleteRecursively() }

    @Test fun `앞 명령이 끝나기 전에는 다음 명령이 엔진에 닿지 않는다`() = runBlocking {
        val gate = CountDownLatch(1).also { fake.showGate = it }
        val shown = async(Dispatchers.Default) { actor.show(card) }
        assertTrue(fake.showEntered.tryAcquire(5, TimeUnit.SECONDS))
        val changed = async(Dispatchers.Default, CoroutineStart.UNDISPATCHED) { actor.codeChanged() }   // 돌아오면 줄에 섰다
        assertEquals(0, fake.codeChanges)
        gate.countDown()
        shown.await(); changed.await()
        assertEquals(1, fake.codeChanges)
    }

    @Test fun `보낸 순서대로 처리한다`() = runBlocking {
        actor.ensure(card, interactive = false)
        val sent = (0 until 50).map { i -> launch(Dispatchers.Default, start = CoroutineStart.UNDISPATCHED) { actor.touch("tap", i, i) } }
        sent.forEach { it.join() }
        assertEquals((0 until 50).toList(), fake.touches.map { it.second })
    }

    @Test fun `엔진이 던진 예외는 부른 쪽으로 간다`() = runBlocking {
        val boom = IllegalStateException("렌더러가 죽었다")
        fake.showThrows = boom
        assertEquals(boom.message, assertThrows<IllegalStateException> { runBlocking { actor.show(card) } }.message)
        assertTrue(actor.show(card).ok)
    }

    @Test fun `액터가 멈추면 줄 선 명령은 엔진에 닿지 않고 취소된다`() = runBlocking {
        val gate = CountDownLatch(1).also { fake.showGate = it }
        val shown = async(Dispatchers.Default) { actor.show(card) }
        assertTrue(fake.showEntered.tryAcquire(5, TimeUnit.SECONDS))
        val pending = async(Dispatchers.Default, CoroutineStart.UNDISPATCHED) { actor.codeChanged() }
        scope.cancel()
        gate.countDown()
        assertTrue(shown.await().ok)
        val failed = runCatching { withTimeout(5_000) { pending.await() } }.exceptionOrNull()
        assertTrue(failed is CancellationException && failed !is TimeoutCancellationException) { "줄 선 명령이 풀리지 않았다: $failed" }
        assertEquals(0, fake.codeChanges)
    }

    @Test fun `기다리다 취소된 명령은 엔진에 닿지 않는다`() = runBlocking {
        val gate = CountDownLatch(1).also { fake.showGate = it }
        val shown = async(Dispatchers.Default) { actor.show(card) }
        assertTrue(fake.showEntered.tryAcquire(5, TimeUnit.SECONDS))
        val dropped = launch(Dispatchers.Default, CoroutineStart.UNDISPATCHED) { actor.patchLiterals("Dropped", emptyMap()) }
        dropped.cancel()
        dropped.join()
        val kept = async(Dispatchers.Default) { actor.patchLiterals("Kept", emptyMap()) }
        gate.countDown()
        shown.await(); kept.await()
        assertEquals(listOf("Kept"), fake.patched.map { it.first })
    }

    @Test fun `터치가 대기하는 동안 다음 명령과 프레임은 실행되지 않는다`() = runTest {
        val a = Engine(fake, fake, backgroundScope, dispatchersOn(StandardTestDispatcher(testScheduler)), MonotonicClock.SYSTEM, EngineLog {})
        a.ensure(card, interactive = true)
        fake.onTouch = { _, _, _ -> delay(100) }
        val touched = async { a.touch("long", 1, 2) }
        runCurrent()
        val ticks = fake.ticks.get()
        val changed = async { a.codeChanged() }
        runCurrent()
        advanceTimeBy(99)
        runCurrent()
        assertEquals(0, fake.codeChanges)
        assertEquals(ticks, fake.ticks.get())
        assertTrue(!touched.isCompleted && !changed.isCompleted)
        advanceTimeBy(1)
        touched.await(); changed.await()
        assertEquals(1, fake.codeChanges)
    }

    @Test fun `대기 중 액터를 취소하면 진행 중과 줄 선 명령을 취소하고 세션을 닫는다`() = runTest {
        val job = Job(backgroundScope.coroutineContext[Job])
        val a = Engine(fake, fake, CoroutineScope(job), dispatchersOn(StandardTestDispatcher(testScheduler)), MonotonicClock.SYSTEM, EngineLog {})
        a.ensure(card, interactive = false)
        fake.onTouch = { _, _, _ -> awaitCancellation() }
        val touched = async { a.touch("long", 1, 2) }
        runCurrent()
        val pending = async { a.codeChanged() }
        runCurrent()
        job.cancelAndJoin()
        assertThrows<CancellationException> { runBlocking { touched.await() } }
        assertThrows<CancellationException> { runBlocking { pending.await() } }
        assertEquals(0, fake.codeChanges)
        assertEquals(1, fake.closes.get())
    }

    @Test fun `정착 그림이 대기하는 동안 다음 명령은 실행되지 않는다`() = runTest {
        val a = Engine(fake, fake, backgroundScope, dispatchersOn(StandardTestDispatcher(testScheduler)), MonotonicClock.SYSTEM, EngineLog {})
        a.ensure(card, interactive = false)
        val entered = CompletableDeferred<Unit>()
        fake.onLook = { entered.complete(Unit); delay(100) }
        a.touch("tap", 1, 2)
        entered.await()
        val changed = async { a.codeChanged() }
        runCurrent()
        advanceTimeBy(99)
        runCurrent()
        assertEquals(0, fake.codeChanges)
        assertTrue(!changed.isCompleted)
        changed.await()
        assertEquals(1, fake.codeChanges)
    }

    @Test fun `정착 그림 대기 중 액터를 취소하면 실패로 삼키지 않고 기다리던 쪽을 풀고 세션을 닫는다`() = runTest {
        val job = Job(backgroundScope.coroutineContext[Job])
        val logs = mutableListOf<String>()
        val a = Engine(fake, fake, CoroutineScope(job), dispatchersOn(StandardTestDispatcher(testScheduler)), MonotonicClock.SYSTEM, EngineLog { logs += it })
        a.ensure(card, interactive = false)
        val entered = CompletableDeferred<Unit>()
        fake.onLook = { entered.complete(Unit); awaitCancellation() }
        val seq = a.touch("tap", 1, 2)
        val waiting = async { runCatching { a.settled(seq) } }
        runCurrent()
        entered.await()
        job.cancelAndJoin()
        runCurrent()
        assertTrue(waiting.isCompleted, "정착을 기다리던 쪽이 풀리지 않았다")
        assertTrue(waiting.await().exceptionOrNull() is CancellationException)
        assertEquals(emptyList<String>(), logs)
        assertEquals(1, fake.closes.get())
    }

    // IO 와 Default 는 워커 이름이 같아 스레드로 가리지 못한다 — 엔진이 어느 디스패처에 어떤 뷰를 청하고 그 뷰에서 도는지로 본다(D-89).
    @Test fun `엔진은 io 의 한 줄 뷰에서만 돌고 default 는 쓰지 않는다`() = runTest {
        val io = LaneSpy(StandardTestDispatcher(testScheduler))
        val default = LaneSpy(StandardTestDispatcher(testScheduler))
        val a = Engine(fake, fake, backgroundScope, dispatchersOn(default, io = io), MonotonicClock.SYSTEM, EngineLog {})
        a.ensure(card, interactive = true)
        a.touch("tap", 1, 2)
        advanceTimeBy(500)
        runCurrent()
        a.codeChanged()
        assertTrue(fake.ticks.get() > 0, "라이브 루프가 틱을 돌지 않았다")
        assertEquals(1, fake.codeChanges)
        assertEquals(listOf(1 to "prevue-engine"), io.views.map { it.parallelism to it.name })
        assertTrue(io.views.single().spy.dispatched > 0, "청한 뷰에서 돌지 않았다")
        assertEquals(emptyList<LaneSpy.View>(), default.views)
        assertEquals(0 to 0, io.dispatched to default.dispatched, "뷰를 거치지 않고 디스패처에 바로 올렸다")
    }

    private class LaneSpy(private val inner: CoroutineDispatcher) : CoroutineDispatcher() {
        class View(val parallelism: Int, val name: String?, val spy: LaneSpy)
        val views = mutableListOf<View>()
        var dispatched = 0
        override fun dispatch(context: CoroutineContext, block: Runnable) { dispatched++; inner.dispatch(context, block) }
        override fun limitedParallelism(parallelism: Int, name: String?): CoroutineDispatcher =
            LaneSpy(inner.limitedParallelism(parallelism, name)).also { views += View(parallelism, name, it) }
    }
}
