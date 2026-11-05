package prevue.infrastructure.bindings

import java.io.File

internal class DaemonPaths(val cache: File, val mine: File, val out: File, val overlay: File) {
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
        fun of(config: InfraConfig, project: String): DaemonPaths {
            val cache = config.cache
            val mine = File(cache, "daemon/${config.port}")
            val out = config.out ?: File("$mine/out/${dirName(project)}")
            val overlay = config.overlay ?: File("$mine/overlay/${dirName(project)}")
            return DaemonPaths(cache, mine, out, overlay)
        }

        private fun dirName(module: String) = module.trim(':').replace(':', '_')
    }
}

internal class CompilerJars(val jars: List<File>, val composePlugin: File) {
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

internal object AndroidPlatforms {
    fun newest(platformDirs: List<File>): File? =
        platformDirs.maxByOrNull { it.name.removePrefix("android-").toDoubleOrNull() ?: 0.0 }

    fun findJar(env: Map<String, String> = System.getenv()): File {
        val sdk = env["ANDROID_HOME"]?.ifEmpty { null } ?: env["ANDROID_SDK_ROOT"]?.ifEmpty { null }
            ?: "${System.getProperty("user.home")}/Library/Android/sdk"
        val platforms = File(sdk, "platforms").listFiles { f -> File(f, "android.jar").isFile }.orEmpty().toList()
        return newest(platforms)?.let { File(it, "android.jar") }
            ?: error("android.jar를 찾지 못했다 — ANDROID_HOME 또는 --android-jar")
    }
}
