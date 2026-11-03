package prevue.daemon

import java.io.File

class UsageException : RuntimeException("usage")

class DaemonArgs private constructor(private val a: Map<String, String>) {
    val classpath = required("--classpath")
    val layoutlib = required("--layoutlib")
    val compiler = required("--compiler")
    val bridge = required("--bridge")
    val viewer = required("--viewer")
    val port: Int = a["--port"]?.toInt() ?: DEFAULT_PORT
    val out: File? = a["--out"]?.let(::File)
    val overlay: File? = a["--overlay"]?.let(::File)
    val androidJar: File? = a["--android-jar"]?.let(::File)
    val show: String? = a["--show"]
    val watching: Boolean = a["--no-watch"] != "true"
    val preload: Boolean = a["--no-preload"] != "true"
    val extraWatch: List<File> = a[REPEATABLE]?.split(File.pathSeparator)?.map(::File).orEmpty()
    val resourcesFrom: File? = a["--resources-from"]?.let(::File)
    val root: String? = a["--root"]

    private fun required(key: String) = File(a[key] ?: throw UsageException())

    companion object {
        const val DEFAULT_PORT = 8791
        private val FLAGS = setOf("--no-watch", "--no-preload")
        private const val REPEATABLE = "--watch"

        fun parse(argv: Array<String>): DaemonArgs = DaemonArgs(options(argv))

        private fun options(argv: Array<String>): Map<String, String> {
            val a = HashMap<String, String>()
            var i = 0
            while (i < argv.size) {
                val k = argv[i]
                if (!k.startsWith("--")) throw UsageException()
                if (k in FLAGS) {
                    a[k] = "true"
                    i++
                    continue
                }
                val v = argv.getOrNull(i + 1) ?: throw UsageException()
                a[k] = if (k == REPEATABLE && a[k] != null) a[k] + File.pathSeparator + v else v
                i += 2
            }
            return a
        }
    }
}
