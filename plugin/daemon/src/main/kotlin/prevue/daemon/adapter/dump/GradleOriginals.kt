package prevue.daemon.adapter.dump

import java.io.File
import java.util.zip.ZipFile

/**
 * 앱 런타임에만 있는 외부 라이브러리의 컴파일용 원본. 덤프 없는 의존 모듈을 앱 덤프의 `compileClassPath`로 컴파일하면
 * 그 모듈의 `implementation`(nowinandroid core:ui의 coil-compose)이 없다. 앱 `classPath`의 런타임 jar(AGP 변환본)로는
 * 못 메운다 — `.kotlin_module`이 빠져 최상위 함수(`rememberAsyncImagePainter`)를 못 찾는다. Gradle이 내려받아 둔 **원본**
 * (`modules-2/files-2.1/<그룹>/<아티팩트>/<버전>/<해시>/`)의 클래스 jar에는 그것이 있어 그걸로 메운다. Gradle은 부르지 않는다.
 *
 * 버전 핀: Gradle 캐시 레이아웃(`modules-2/files-2.1`). 원본이 없거나 그룹이 겹쳐 하나로 못 정하면 그 jar는 메우지 않는다 —
 * 컴파일이 실패하면 그 모듈의 덤프가 답이다(`CompileOrder.hint`).
 */
class GradleOriginals(private val files2: File, private val outDir: File) {

    /** 아티팩트 이름 → 그 이름을 가진 그룹들. 캐시 전부를 한 번만 훑는다. */
    private val groupsOf: Map<String, List<File>> by lazy {
        files2.listFiles().orEmpty().filter { it.isDirectory }
            .flatMap { g -> g.listFiles().orEmpty().filter { it.isDirectory }.map { it.name to g } }
            .groupBy({ it.first }, { it.second })
    }

    /** [classPath]에만 있고 [compileClassPath]에는 없는 외부 라이브러리의 원본 클래스 jar. 저장소 안의 산출물은 보지 않는다. */
    fun forRuntimeOnly(classPath: List<String>, compileClassPath: List<String>, repoRoot: File): List<String> {
        val compiled = compileClassPath.mapNotNull(::coordinate).toSet()
        return classPath.asSequence()
            .filterNot { it.startsWith(repoRoot.path + "/") }
            .mapNotNull(::coordinate).distinct()
            .filter { it !in compiled }
            .mapNotNull { (artifact, version) -> original(artifact, version) }
            .map { it.path }.toList()
    }

    private fun original(artifact: String, version: String): File? {
        val hits = groupsOf[artifact].orEmpty().mapNotNull { g ->
            File(g, "$artifact/$version").listFiles().orEmpty().flatMap { h -> h.listFiles().orEmpty().toList() }
                .firstOrNull { it.name == "$artifact-$version.aar" || it.name == "$artifact-$version.jar" }
                ?.let { g.name to it }
        }
        val (group, file) = hits.singleOrNull() ?: return null
        if (file.name.endsWith(".jar")) return file
        val out = File(outDir, "$group-$artifact-$version.jar")
        if (!out.isFile) runCatching {
            ZipFile(file).use { z ->
                val e = z.getEntry("classes.jar") ?: return null
                out.parentFile.mkdirs()
                val tmp = File(outDir, ".${out.name}.tmp")
                z.getInputStream(e).use { i -> tmp.outputStream().use { i.copyTo(it) } }
                if (!tmp.renameTo(out)) tmp.delete()
            }
        }.onFailure { System.err.println("[prevue] $group:$artifact:$version 의 classes.jar를 꺼내지 못했다 — 이 라이브러리는 메우지 않는다: $it") }
        return out.takeIf { it.isFile }
    }

    companion object {
        /**
         * 클래스패스 항목 → (아티팩트, 버전). 변환본은 `transformed/coil-compose-base-2.7.0-runtime.jar` ·
         * `transformed/coil-base-2.7.0/jars/classes.jar` 모양이고, 버전은 이름에서 숫자로 시작하는 첫 조각부터다.
         */
        fun coordinate(path: String): Pair<String, String>? {
            val name = if (path.endsWith("/jars/classes.jar")) path.substringBefore("/jars/classes.jar").substringAfterLast('/')
            else path.substringAfterLast('/').removeSuffix(".jar").removeSuffix("-runtime").removeSuffix("-api")
            val m = Regex("^(.+?)-(\\d[^/]*)$").find(name) ?: return null
            return m.groupValues[1] to m.groupValues[2]
        }

        val default: GradleOriginals by lazy {
            val gradleHome = System.getenv("GRADLE_USER_HOME")?.let(::File) ?: File(System.getProperty("user.home"), ".gradle")
            GradleOriginals(File(gradleHome, "caches/modules-2/files-2.1"), File(System.getProperty("user.home"), ".prevue/originals"))
        }
    }
}
