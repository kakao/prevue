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

class DaemonPaths(val cache: File, val mine: File, val out: File, val overlay: File) {
    val overlayModules: File get() = File("$overlay.modules")
    val warmup: File get() = File(mine, "warmup")
    val thumbs: File get() = File(cache, "daemon/thumbs")

    fun dumpOf(module: String, variant: String) = File(cache, "${dirName(module)}-$variant.json")

    fun reset() {
        overlay.deleteRecursively()
        overlay.mkdirs()
        overlayModules.deleteRecursively()
        out.deleteRecursively()
        out.mkdirs()
    }

    companion object {
        fun of(args: DaemonArgs, project: String): DaemonPaths {
            val cache = args.classpath.absoluteFile.parentFile
            val mine = File(cache, "daemon/${args.port}")
            val out = args.out ?: File("$mine/out/${dirName(project)}")
            val overlay = args.overlay ?: File("$mine/overlay/${dirName(project)}")
            return DaemonPaths(cache, mine, out, overlay)
        }

        private fun dirName(module: String) = module.trim(':').replace(':', '_')
    }
}

class CompilerJars(val jars: List<File>, val composePlugin: File) {
    companion object {
        private const val COMPOSE_PLUGIN = "kotlin-compose-compiler-plugin"

        fun find(dir: File): CompilerJars {
            val jars = dir.listFiles { f -> f.extension == "jar" && !f.name.startsWith(COMPOSE_PLUGIN) }.orEmpty().toList()
            val plugin = dir.listFiles { f -> f.name.startsWith(COMPOSE_PLUGIN) }?.firstOrNull()
                ?: error("$dir 에 Compose 컴파일러 플러그인이 없다 — setup.sh를 다시 돌려라")
            return CompilerJars(jars, plugin)
        }
    }
}

object AndroidPlatforms {
    fun newest(platformDirs: List<File>): File? =
        platformDirs.maxByOrNull { it.name.removePrefix("android-").toDoubleOrNull() ?: 0.0 }

    fun findJar(env: Map<String, String> = System.getenv()): File {
        val sdk = env["ANDROID_HOME"] ?: env["ANDROID_SDK_ROOT"] ?: "${System.getProperty("user.home")}/Library/Android/sdk"
        val platforms = File(sdk, "platforms").listFiles { f -> File(f, "android.jar").isFile }.orEmpty().toList()
        return newest(platforms)?.let { File(it, "android.jar") }
            ?: error("android.jar를 찾지 못했다 — ANDROID_HOME 또는 --android-jar")
    }
}
