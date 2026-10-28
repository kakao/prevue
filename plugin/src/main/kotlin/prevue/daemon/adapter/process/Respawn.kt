package prevue.daemon.adapter.process

import java.io.File
import java.lang.management.ManagementFactory

object Respawn {
    /** 앞서 다시 띄운 시각. 이 안에 또 잃으면 다시 띄우지 않는다 — 여는 순간 잃는 프리뷰로 무한히 도는 것을 막는다. */
    private const val ENV_AT = "PREVUE_RESPAWNED_AT"
    private const val WINDOW_MS = 60_000L

    fun allowed(env: Map<String, String> = System.getenv(), now: Long = System.currentTimeMillis()): Boolean =
        env[ENV_AT]?.toLongOrNull()?.let { now - it >= WINDOW_MS } ?: true

    /**
     * 다시 띄울 인자. `--show`는 지금 보드의 파일로 바꾼다 — 사람이 보던 화면으로 돌아온다.
     * 그 파일이 스레드를 잃게 한 파일이면 열지 않는다(또 잃는다). 그때는 처음 받은 `--show`가 그 파일이 아닐 때만 남긴다.
     */
    fun args(argv: List<String>, board: File?, hung: File?): List<String> {
        val out = ArrayList<String>()
        var original: String? = null
        var i = 0
        while (i < argv.size) {
            if (argv[i] == "--show" && i + 1 < argv.size) { original = argv[i + 1]; i += 2; continue }
            out += argv[i]; i++
        }
        fun same(target: String?, f: File?) = target != null && f != null && File(target.substringBefore('#')).canonicalFile == f.canonicalFile
        val show = board?.path?.takeUnless { same(it, hung) } ?: original?.takeUnless { same(it, hung) }
        return if (show != null) out + listOf("--show", show) else out
    }

    /** 이 JVM과 같은 실행 파일 · JVM 옵션 · 클래스패스로 띄운다. 표준 출력 · 오류는 같은 로그로 간다(bin/prevue가 연 파일을 물려받는다). */
    fun start(mainClass: String, args: List<String>) {
        val java = File(System.getProperty("java.home"), "bin/java").path
        val cmd = listOf(java) + ManagementFactory.getRuntimeMXBean().inputArguments +
            listOf("-cp", System.getProperty("java.class.path"), mainClass) + args
        ProcessBuilder(cmd).inheritIO().apply { environment()[ENV_AT] = System.currentTimeMillis().toString() }.start()
    }

    /** bin/prevue가 띄울 때 적은 pid는 첫 JVM의 것이다. 다시 뜬 JVM이 자기 pid로 고쳐 쓴다 — `stop` · 생존 판정이 그 파일을 본다. */
    fun writePid(env: Map<String, String> = System.getenv()) {
        val f = env["PREVUE_PID_FILE"]?.let(::File) ?: return
        runCatching { f.writeText(ProcessHandle.current().pid().toString() + "\n") }
            .onFailure { System.err.println("[prevue] pid 파일을 못 고쳤다($f): $it") }
    }
}
