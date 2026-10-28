package prevue.daemon

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.getAndUpdate
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull

/** 데몬 하나의 작업·입구·자원을 소유하고 모든 종료 요청을 한 정리 경로로 모은다. */
class PrevueDaemon(
    private val idleTimeoutMs: Long = 0,
    private val idleCheckMs: Long = 60_000,
    private val shutdownTimeoutMs: Long = 30_000,
    private val log: (String) -> Unit = {},
    private val forceExit: (Int) -> Unit = { Runtime.getRuntime().halt(it) },
) : AutoCloseable {
    private enum class Phase { READY, RUNNING, CLOSING }
    private data class Life(val phase: Phase = Phase.READY, val inputs: EntryPoints? = null, val resources: List<AutoCloseable> = emptyList())
    private class StopRequest(val reason: String, val respawn: List<String>? = null, val failure: Throwable? = null)

    private val job = SupervisorJob()
    val scope = CoroutineScope(job + Dispatchers.Default + CoroutineExceptionHandler { _, e -> log("데몬 작업 실패: $e") })
    private val requested = CompletableDeferred<StopRequest>()
    private val life = MutableStateFlow(Life())
    private val closed = CompletableDeferred<Unit>()

    init { require(shutdownTimeoutMs > 0 && idleCheckMs > 0) }

    companion object {
        /** NFR-6. 다시 띄우는 값(첫 그림까지 4초대)이 RSS를 잡아 두는 값보다 싸다. `PREVUE_IDLE_MIN`으로 바꾸고 `0`이면 끈다. */
        const val DEFAULT_IDLE_MIN = 10L
        fun idleMinutes(env: String?): Long = env?.toLongOrNull() ?: DEFAULT_IDLE_MIN
    }

    fun <T : AutoCloseable> own(resource: T): T {
        val before = life.getAndUpdate { if (it.phase == Phase.CLOSING) it else it.copy(resources = it.resources + resource) }
        if (before.phase == Phase.CLOSING) {
            resource.close()
            error("종료 중인 데몬에는 자원을 추가할 수 없다")
        }
        return resource
    }

    fun requestStop(reason: String) { requested.complete(StopRequest(reason)) }

    fun requestFailure(reason: String, failure: Throwable) { requested.complete(StopRequest(reason, failure = failure)) }

    fun requestRestart(reason: String, respawn: List<String>) { requested.complete(StopRequest("다시 띄운다 — $reason", respawn)) }

    fun serve(ui: EntryPoints, lastRenderMs: () -> Long) {
        val before = life.getAndUpdate { if (it.phase == Phase.CLOSING || it.inputs != null) it else it.copy(inputs = ui) }
        check(before.phase != Phase.CLOSING && before.inputs == null) { "데몬 입구는 한 번만 시작한다" }
        try { ui.start() } catch (e: IllegalStateException) {
            if (life.value.phase == Phase.CLOSING) return
            throw e
        }
        if (idleTimeoutMs > 0) scope.launch(CoroutineName("prevue-idle")) { stopWhenIdle(ui, lastRenderMs) }
    }

    private suspend fun stopWhenIdle(ui: EntryPoints, lastRenderMs: () -> Long) {
        while (true) {
            delay(idleCheckMs)
            val idle = System.currentTimeMillis() - maxOf(ui.server.lastActivityMs, lastRenderMs())
            if (idle >= idleTimeoutMs) return requestStop("${idle / 60_000}분 유휴 — 다시 쓰려면 prevue start")
        }
    }

    fun run(assemble: PrevueDaemon.() -> Unit): List<String>? {
        val before = life.getAndUpdate { if (it.phase == Phase.READY) it.copy(phase = Phase.RUNNING) else it }
        check(before.phase == Phase.READY) { "데몬은 한 번만 실행한다" }
        val hook = Thread({ requestStop("JVM 종료"); close() }, "prevue-shutdown")
        Runtime.getRuntime().addShutdownHook(hook)
        try {
            assemble()
            val stop = runBlocking { requested.await() }
            log("데몬 종료 요청: ${stop.reason}")
            stop.failure?.let { throw it }
            return stop.respawn
        } finally {
            try { close() } finally {
                // 외부: JVM 종료가 시작된 뒤의 removeShutdownHook 은 IllegalStateException 을 던진다
                runCatching { Runtime.getRuntime().removeShutdownHook(hook) }
                    .onFailure { if (it !is IllegalStateException) System.err.println("[prevue] 종료 hook 을 못 지웠다: $it") }
            }
        }
    }

    override fun close() {
        requestStop("close")
        val before = life.getAndUpdate { it.copy(phase = Phase.CLOSING) }
        if (before.phase == Phase.CLOSING) {
            runBlocking { closed.await() }
            return
        }
        startWatchdog()
        try {
            val ui = before.inputs
            clean("입구") { ui?.stopInputs() }
            scope.cancel()
            clean("데몬 작업·프레임·HTTP") { runBlocking { job.join(); ui?.awaitStopped() } }
            for (resource in before.resources.asReversed()) clean(resource.javaClass.simpleName, resource::close)
        } finally {
            closed.complete(Unit)
        }
    }

    private fun startWatchdog() {
        Thread({
            val done = runBlocking { withTimeoutOrNull(shutdownTimeoutMs) { closed.await() } }
            if (done == null) {
                log("${shutdownTimeoutMs}ms 안에 정리되지 않았다 — 강제 종료")
                forceExit(1)
            }
        }, "prevue-shutdown-watchdog").apply { isDaemon = true; start() }
    }

    private fun clean(name: String, action: () -> Unit) {
        try { action() } catch (e: Exception) { log("$name 정리 실패: $e") }
    }
}
