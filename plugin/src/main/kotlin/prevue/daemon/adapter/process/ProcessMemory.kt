package prevue.daemon.adapter.process

import java.util.concurrent.TimeUnit
import kotlinx.coroutines.flow.MutableStateFlow
import prevue.daemon.domain.port.MemoryMeter

/**
 * `ps`로 이 프로세스의 RSS를 읽는다. JVM은 네이티브를 포함한 RSS를 내주지 않는다(NMT는 layoutlib의 할당을 못 본다).
 * `status`는 뷰어·CLI가 자주 부르므로 1초 동안 같은 값을 돌려준다 — `ps` 한 번이 수 ms다.
 */
object ProcessMemory : MemoryMeter {
    private val cached = MutableStateFlow<Pair<Long, Long?>?>(null)

    override fun rssMb(): Long? {
        val now = System.nanoTime()
        cached.value?.let { (at, v) -> if (now - at < 1_000_000_000L) return v }
        val v = runCatching {
            val p = ProcessBuilder("ps", "-o", "rss=", "-p", ProcessHandle.current().pid().toString()).redirectErrorStream(true).start()
            val out = p.inputStream.bufferedReader().readText().trim()
            if (!p.waitFor(2, TimeUnit.SECONDS)) { p.destroyForcibly(); null } else out.toLongOrNull()?.div(1024)
        }.getOrNull()
        cached.value = now to v
        return v
    }
}
