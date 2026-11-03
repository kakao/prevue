package prevue.daemon

import java.io.File
import java.net.HttpURLConnection
import java.net.InetAddress
import java.net.ServerSocket
import java.net.URI
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Timeout
import prevue.daemon.fake.Fixture
import prevue.json.Json

@Timeout(10)
class PrevueDaemonTest {
    @Test fun `작업이 끝난 뒤 자원을 역순으로 한 번만 닫는다`() {
        val events = CopyOnWriteArrayList<String>()
        val daemon = PrevueDaemon(forceExit = { fail("강제 종료 없이 정리해야 한다") })
        daemon.run {
            own(AutoCloseable { events += "compiler" })
            own(AutoCloseable { events += "renderer" })
            scope.launch(start = CoroutineStart.UNDISPATCHED) {
                try { awaitCancellation() } finally { events += "work" }
            }
            requestStop("first")
            requestStop("second")
        }
        daemon.close()
        assertEquals(listOf("work", "renderer", "compiler"), events)
        assertFalse(daemon.scope.isActive)
    }

    @Test fun `다시 띄울 인자는 run 이 돌려주고 그냥 멈추면 null 이다`() {
        val restart = PrevueDaemon(forceExit = { fail("다시 띄우기 정리가 멈췄다") })
        assertEquals(listOf("--show", "A.kt"), restart.run { requestRestart("렌더 스레드를 잃었다", listOf("--show", "A.kt")) })
        assertFalse(restart.scope.isActive)
        assertNull(PrevueDaemon().run { requestStop("stop") })
    }

    @Test fun `먼저 온 종료 요청이 이겨 내려가는 데몬은 다시 띄우지 않는다`() {
        val daemon = PrevueDaemon(forceExit = { fail("정리가 멈췄다") })
        assertNull(daemon.run { requestStop("HTTP /shutdown"); requestRestart("늦게 잃었다", listOf("--show", "A.kt")) })
    }

    @Test fun `닫는 중인 데몬은 새 자원을 받지 않고 바로 닫는다`() {
        val daemon = PrevueDaemon(forceExit = { fail("정리가 멈췄다") })
        daemon.close()
        val closed = AtomicInteger()
        assertThrows(IllegalStateException::class.java) { daemon.own(AutoCloseable { closed.incrementAndGet() }) }
        assertEquals(1, closed.get())
        assertThrows(IllegalStateException::class.java) { daemon.run {} }
    }

    @Test fun `포트 충돌도 작업과 이미 만든 자원을 정리한다`() {
        Fixture().use { fx ->
            ServerSocket(0, 16, InetAddress.getByName("127.0.0.1")).use { occupied ->
                val closed = AtomicInteger()
                val daemon = PrevueDaemon(forceExit = { fail("시작 실패 정리가 멈췄다") })
                assertThrows(java.net.BindException::class.java) {
                    daemon.run {
                        own(AutoCloseable { closed.incrementAndGet() })
                        val uc = fx.useCases(scope = scope)
                        serve(EntryPoints(uc, occupied.localPort, PrevueCheckout(File(fx.root, "viewer")), fx.renderer.outDir, scope, {})) { 0 }
                    }
                }
                assertFalse(daemon.scope.isActive)
                assertEquals(1, closed.get())
            }
        }
    }

    @Test fun `HTTP 종료는 응답을 보낸 뒤 소유자에게 요청한다`() {
        Fixture().use { fx ->
            val daemon = PrevueDaemon(forceExit = { fail("HTTP 종료가 멈췄다") })
            val port = CompletableFuture<Int>()
            val done = CompletableFuture<Unit>()
            val closed = AtomicInteger()
            val thread = Thread {
                try {
                    daemon.run {
                        own(AutoCloseable { closed.incrementAndGet() })
                        val uc = fx.useCases(scope = scope)
                        val ui = EntryPoints(uc, 0, PrevueCheckout(File(fx.root, "viewer")), fx.renderer.outDir, scope, { requestStop("HTTP") })
                        serve(ui) { 0 }
                        port.complete(ui.server.boundPort)
                    }
                    done.complete(Unit)
                } catch (e: Throwable) { port.completeExceptionally(e); done.completeExceptionally(e) }
            }.apply { start() }
            try {
                val c = URI("http://127.0.0.1:${port.get(5, TimeUnit.SECONDS)}/shutdown").toURL().openConnection() as HttpURLConnection
                try {
                    c.requestMethod = "POST"
                    c.connectTimeout = 2_000; c.readTimeout = 2_000
                    assertEquals(200, c.responseCode)
                    assertEquals(mapOf("ok" to true), Json.parse(c.inputStream.bufferedReader().use { it.readText() }))
                } finally { c.disconnect() }
                done.get(5, TimeUnit.SECONDS)
                assertEquals(1, closed.get())
                assertFalse(daemon.scope.isActive)
            } finally {
                daemon.requestStop("test cleanup")
                thread.join(5_000)
            }
        }
    }

    @Test fun `동시에 닫아도 정리는 한 번이고 두 호출 모두 완료를 기다린다`() {
        val entered = CountDownLatch(1)
        val release = CountDownLatch(1)
        val calls = AtomicInteger()
        val daemon = PrevueDaemon(forceExit = { fail("중복 종료가 멈췄다") })
        daemon.own(AutoCloseable { calls.incrementAndGet(); entered.countDown(); release.await() })
        val first = CompletableFuture.runAsync { daemon.close() }
        assertTrue(entered.await(2, TimeUnit.SECONDS))
        val second = CompletableFuture.runAsync { daemon.close() }
        try {
            assertFalse(first.isDone)
            assertFalse(second.isDone)
        } finally { release.countDown() }
        first.get(2, TimeUnit.SECONDS); second.get(2, TimeUnit.SECONDS)
        assertEquals(1, calls.get())
    }

    @Test fun `정리가 멈추면 전체 제한 시간에 강제 종료를 요청한다`() {
        val release = CountDownLatch(1)
        val forced = CompletableFuture<Int>()
        val daemon = PrevueDaemon(shutdownTimeoutMs = 100, forceExit = { forced.complete(it) })
        daemon.own(AutoCloseable { release.await() })
        val closing = CompletableFuture.runAsync { daemon.close() }
        try { assertEquals(1, forced.get(2, TimeUnit.SECONDS)) }
        finally { release.countDown() }
        closing.get(2, TimeUnit.SECONDS)
    }

    // NFR-6. 기본값을 바꾸면 기획의 숫자부터 고친다.
    @Test fun `유휴 종료 기본은 10분이고 0이면 끈다`() {
        assertEquals(10, PrevueDaemon.idleMinutes(null))
        assertEquals(10, PrevueDaemon.idleMinutes("열"))
        assertEquals(0, PrevueDaemon.idleMinutes("0"))
    }

    /** 유휴 상한 [idleMs]로 띄우고, [during]이 도는 동안 데몬이 스스로 내려왔는지와 그 사유를 돌려준다. */
    private fun idleRun(idleMs: Long, lastRender: () -> Long, during: (port: Int) -> Unit): String? = Fixture().use { fx ->
        val logs = CopyOnWriteArrayList<String>()
        val daemon = PrevueDaemon(idleTimeoutMs = idleMs, idleCheckMs = 20, log = { logs += it }, forceExit = { fail("유휴 종료가 멈췄다") })
        val port = CompletableFuture<Int>()
        val done = CompletableFuture<Unit>()
        val thread = Thread {
            try {
                daemon.run {
                    val ui = EntryPoints(fx.useCases(scope = scope), 0, PrevueCheckout(File(fx.root, "viewer")), fx.renderer.outDir, scope, {})
                    serve(ui, lastRender)
                    port.complete(ui.server.boundPort)
                }
                done.complete(Unit)
            } catch (e: Throwable) { port.completeExceptionally(e); done.completeExceptionally(e) }
        }.apply { start() }
        try {
            during(port.get(5, TimeUnit.SECONDS))
            runCatching { done.get(500, TimeUnit.MILLISECONDS) }               // 입구가 닫힌 뒤 정리가 끝날 틈
            if (done.isDone && !done.isCompletedExceptionally) logs.first { it.startsWith("데몬 종료 요청") } else null
        } finally {
            daemon.requestStop("test cleanup")
            thread.join(5_000)
        }
    }

    // CLI가 /daemon을 폴링하므로 그것까지 활동으로 세면 유휴가 영영 안 온다.
    @Test fun `일이 없으면 상한 뒤 스스로 내리고 daemon 폴링은 활동이 아니다`() {
        val reason = idleRun(300, { 0 }) { port ->
            val until = System.currentTimeMillis() + 3_000
            while (System.currentTimeMillis() < until) {
                runCatching { URI("http://127.0.0.1:$port/daemon").toURL().readText() }.getOrNull() ?: break
                Thread.sleep(20)                                 // 실제 시간 — CLI 의 폴링 간격을 흉내 낸다. 유휴 상한이 벽시계다
            }
        }
        assertTrue(reason?.contains("유휴") == true, "유휴로 내려오지 않았다: $reason")
    }

    // 감시가 부른 리로드는 활동이다 — 사람이 저장만 하고 화면을 안 건드려도 데몬은 산다.
    @Test fun `렌더가 이어지는 동안은 내리지 않는다`() {
        val reason = idleRun(300, { System.currentTimeMillis() }) { Thread.sleep(900) }   // 실제 시간 — 유휴 상한(300ms)을 넘겨 살아 있어야 한다
        assertNull(reason, "렌더가 이어지는데 내려왔다")
    }
}
