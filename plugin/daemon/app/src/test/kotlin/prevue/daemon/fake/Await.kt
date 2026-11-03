package prevue.daemon.fake

import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeoutOrNull

/**
 * 테스트의 기다리기는 여기서 한다 — `Thread.sleep`으로 틈을 두지 않는다(`ThreadDeviceRuleTest`의 테스트 sleep 허용 목록).
 * 실제 스레드에서 Flow의 방출을 기다릴 때만 Turbine(`test {}`)을 쓴다. 가상 시계 테스트는 `advanceTimeBy` 뒤 모은 리스트로 본다 —
 * `runTest` 안의 `awaitItem()`은 다음 방출까지 시계를 밀어 늦게 온 것도 통과시킨다(`ThreadDeviceRuleTest`의 수집 허용 목록).
 * 상태가 `StateFlow`면 [awaitState]로 바뀜을 기다리고, 아니면 [awaitValue] · [awaitUntil]이 [pollMs]마다 다시 본다.
 * 시한이 지나면 [what]으로 실패한다. 실패 대신 그때까지의 마지막 값으로 단언하려면 [eventually]를 쓴다.
 * 시한은 다시 보는 사이에만 걸린다 — 읽기 자체가 막히면 끊지 못한다.
 */
fun <T : Any> awaitValue(what: () -> String, timeoutMs: Long = 5_000, pollMs: Long = 5, read: () -> T?): T = runBlocking {
    withTimeoutOrNull(timeoutMs) {
        var v = read()
        while (v == null) { delay(pollMs); v = read() }
        v
    } ?: error("${what()} — ${timeoutMs}ms 안에 오지 않았다")
}

fun <T : Any> awaitValue(what: String, timeoutMs: Long = 5_000, pollMs: Long = 5, read: () -> T?): T =
    awaitValue({ what }, timeoutMs, pollMs, read)

fun awaitUntil(what: String, timeoutMs: Long = 5_000, pollMs: Long = 5, ok: () -> Boolean) {
    awaitValue(what, timeoutMs, pollMs) { if (ok()) Unit else null }
}

/** [ok]가 될 때까지 기다려 true, 시한이 지나면 false. */
fun eventually(timeoutMs: Long = 5_000, pollMs: Long = 5, ok: () -> Boolean): Boolean = runBlocking {
    withTimeoutOrNull(timeoutMs) {
        while (!ok()) delay(pollMs)
        true
    } ?: false
}

fun <T> StateFlow<T>.awaitState(what: String, timeoutMs: Long = 5_000, ok: (T) -> Boolean): T = runBlocking {
    withTimeoutOrNull(timeoutMs) { first(ok) } ?: error("$what — ${timeoutMs}ms 안에 오지 않았다: $value")
}
