package prevue.daemon

import java.io.File
import java.lang.management.ManagementFactory

object Respawn {
    private const val ENV_AT = "PREVUE_RESPAWNED_AT"
    private const val WINDOW_MS = 60_000L

    fun allowed(env: Map<String, String> = System.getenv(), now: Long = System.currentTimeMillis()): Boolean =
        env[ENV_AT]?.toLongOrNull()?.let { now - it >= WINDOW_MS } ?: true

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

    fun start(mainClass: String, args: List<String>) {
        val java = File(System.getProperty("java.home"), "bin/java").path
        val cmd = listOf(java) + jvmArgs(ManagementFactory.getRuntimeMXBean().inputArguments) +
            listOf("-cp", System.getProperty("java.class.path"), mainClass) + args
        ProcessBuilder(cmd).inheritIO().apply { environment()[ENV_AT] = System.currentTimeMillis().toString() }.start()
    }

    fun jvmArgs(input: List<String>): List<String> = input.filterNot { it.startsWith("-XX:AOTCacheOutput=") }

    fun writePid(env: Map<String, String> = System.getenv()) {
        val f = env["PREVUE_PID_FILE"]?.let(::File) ?: return
        runCatching { f.writeText(ProcessHandle.current().pid().toString() + "\n") }
            .onFailure { System.err.println("[prevue] pid 파일을 못 고쳤다($f): $it") }
    }
}
