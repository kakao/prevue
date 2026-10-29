package prevue.daemon.adapter.dump

import java.io.File
import java.util.zip.ZipFile
import prevue.json.Json
import prevue.json.map
import prevue.json.string
import prevue.json.strings

class DumpPaths(
    val classPath: List<String>,
    val projectClassPath: List<String>,
    val compileClassPath: List<String>,
    val rClassJars: List<String>,
    val resourceDirs: List<String>,
    val kmpSourceRoots: Map<String, List<String>> = emptyMap(),
    val assetsDirs: List<String> = emptyList(),
)

class Derivation private constructor(
    internal val compileOwnClassPath: List<String>?,
    val borrowedFrom: String?,
    val borrowedCount: Int,
    val derivedFrom: String?,
    internal val fillFrom: ClasspathSpec?,
) {
    companion object {
        val NONE = Derivation(null, null, 0, null, null)
        fun borrowed(ownClassPath: List<String>, from: String?, count: Int) = Derivation(ownClassPath, from, count, null, null)
        fun derived(ownClassPath: List<String>, from: ClasspathSpec) = Derivation(ownClassPath, null, 0, from.project, from)
        fun rendered(from: String?, count: Int) = Derivation(null, from, count, null, null)
    }
}

class ClasspathSpec(
    val file: File,
    val project: String,
    val variant: String,
    val namespace: String,
    val resourceApkPath: String,
    paths: DumpPaths,
    derivation: Derivation = Derivation.NONE,
    private val originals: GradleOriginals = GradleOriginals.default,
) {
    val classPath: List<String> = paths.classPath
    val projectClassPath: List<String> = paths.projectClassPath
    val compileClassPath: List<String> = paths.compileClassPath
    val rClassJars: List<String> = paths.rClassJars
    val resourceDirs: List<String> = paths.resourceDirs
    val kmpSourceRoots: Map<String, List<String>> = paths.kmpSourceRoots
    val assetsDirs: List<String> = paths.assetsDirs
    val borrowedFrom: String? = derivation.borrowedFrom
    val borrowedCount: Int = derivation.borrowedCount
    val derivedFrom: String? = derivation.derivedFrom
    private val fillFrom: ClasspathSpec? = derivation.fillFrom

    /** 이 덤프의 런타임에만 있는 외부 라이브러리의 원본. 첫 끌어낸 컴파일에서 한 번 — 데몬 시작마다 캐시를 훑지 않는다. */
    private val runtimeOnlyOriginals: List<String> by lazy { originals.forRuntimeOnly(classPath, compileClassPath, repoRoot) }

    /** [compileClassPath] 뒤에 붙일 것. 자기 덤프면 비어 있다 — 그 모듈의 `compileClassPath`가 이미 정확하다. */
    val compileFill: List<String> get() = fillFrom?.runtimeOnlyOriginals.orEmpty()

    /** `:core:ui` → `core/ui`. 저장소 루트 아래의 모듈 디렉터리 상대 경로. */
    val modulePath: String = project.trim(':').replace(':', '/')

    /** 모듈 자기 산출물 디렉터리·jar — 컴파일의 friend path이고 `internal` 접근의 근거다. 자기 R.jar를 포함한다. */
    val ownClassPath: List<String> = derivation.compileOwnClassPath ?: projectClassPath.filter { it.contains("/$modulePath/build/") }

    /**
     * Gradle이 이 모듈의 Kotlin을 마지막으로 컴파일했는지 볼 표지들 — 디렉터리는 Kotlin이 컴파일마다 다시 쓰는 `META-INF/<모듈명>.kotlin_module`,
     * jar(앱 덤프가 싣는 의존 모듈)는 자기 자신이다. 표지가 없는 디렉터리(javac · 자바 리소스)와 자기 R.jar는 뺀다 — Kotlin을 다시 컴파일하지 않고도
     * 다시 쓰여, 섞으면 그보다 먼저 고친 소스를 Gradle이 구웠다고 잘못 본다.
     */
    fun kotlinOutputs(): List<File> = ownClassPath.map(::File).filter { it.name != "R.jar" && it.path !in rClassJars }

    fun kotlinBuildMarkers(): List<File> = kotlinOutputs().mapNotNull { f ->
        if (f.isDirectory) File(f, "META-INF").listFiles { x -> x.name.endsWith(".kotlin_module") }?.firstOrNull()
        else f.takeIf { it.name.endsWith(".jar") }
    }

    val moduleDir: File = ownClassPath.firstOrNull()?.let { File(it.substringBefore("/build/")) }
        ?: error("$project 의 자기 산출물이 클래스패스에 없다 — 모듈이 컴파일된 적이 없거나 덤프가 낡았다")

    val repoRoot: File = File(moduleDir.absolutePath.removeSuffix("/$modulePath"))

    /**
     * Kotlin 모듈명. `internal` 멤버의 JVM 이름이 `name$moduleName`으로 맹글링되므로 Gradle과 글자까지 같아야 한다.
     * 추측하지 않고 Gradle 산출물의 `META-INF/<이름>.kotlin_module`에서 읽는다.
     */
    val kotlinModuleName: String by lazy {
        ownClassPath.firstNotNullOfOrNull { findKotlinModuleName(File(it)) }
            ?: error("$project 산출물에서 .kotlin_module을 찾지 못했다 — 모듈명을 정할 수 없다")
    }

    val jvmTarget: String by lazy {
        val major = runCatching { kotlinOutputs().firstNotNullOfOrNull(::firstKotlinClass)?.let(::classMajor) }.getOrNull()
        major?.takeIf { it > JAVA_8_MAJOR }
            ?.let { minOf(it - CLASS_MAJOR_OFFSET, Runtime.version().feature()).toString() } ?: DEFAULT_JVM_TARGET
    }

    private fun firstKotlinClass(root: File): ByteArray? = when {
        root.isDirectory -> root.walkTopDown().filter { it.isFile && it.name.endsWith(".class") }
            .map { it.readBytes() }.firstOrNull(::isKotlinClass)
        root.isFile && root.name.endsWith(".jar") -> ZipFile(root).use { z ->
            z.entries().asSequence().filter { it.name.endsWith(".class") && !it.name.startsWith("META-INF/") }
                .map { e -> z.getInputStream(e).use { it.readBytes() } }.firstOrNull(::isKotlinClass)
        }
        else -> null
    }

    private fun findKotlinModuleName(root: File): String? {
        if (root.isDirectory) {
            return File(root, "META-INF").listFiles().orEmpty()
                .firstOrNull { it.name.endsWith(".kotlin_module") }?.name?.removeSuffix(".kotlin_module")
        }
        if (root.isFile && root.name.endsWith(".jar")) {
            ZipFile(root).use { z ->
                return z.entries().asSequence()
                    .firstOrNull { it.name.startsWith("META-INF/") && it.name.endsWith(".kotlin_module") }
                    ?.name?.removePrefix("META-INF/")?.removeSuffix(".kotlin_module")
            }
        }
        return null
    }

    /** 소스 루트 후보. 존재하는 것만 돌려준다. flavor 소스셋은 variant 이름의 접두 조합으로 넓게 잡는다. */
    val sourceRoots: List<File>
        get() {
            kmpSourceRoots[project]?.let { roots -> return roots.map(::File).filter { it.isDirectory } }
            val src = File(moduleDir, "src")
            val names = linkedSetOf("main", variant) + variantParts(variant)
            return names.flatMap { n -> listOf(File(src, "$n/java"), File(src, "$n/kotlin")) }.filter { it.isDirectory }
        }

    /**
     * 이 모듈이 **직접 가진** `res` 루트들 — 이 변형이 싣는 소스 세트(main · flavor · buildType · 변형)의 것. 다른 flavor의 `res`는 이 그림과 무관하다.
     * 덤프의 `resourceDirs` 140개는 대부분 병합 산출물과 Gradle 캐시라 낡음 · values 감시에 쓸 것이 못 된다 — 사람이 고치는 것은 여기뿐이다.
     */
    val resourceRoots: List<File>
        get() {
            val src = File(moduleDir, "src")
            val names = linkedSetOf("main", variant) + variantParts(variant) + kmpAndroidSourceSets
            return names.map { File(src, "$it/res") }.filter { it.isDirectory }
        }

    /** 이 모듈의 매니페스트들 — 앞의 것이 이긴다(variant · flavor → main). */
    val manifests: List<File>
        get() = (linkedSetOf(variant) + variantParts(variant) + "main" + kmpAndroidSourceSets)
            .map { File(moduleDir, "src/$it/AndroidManifest.xml") }.filter { it.isFile }

    /** 바뀌면 클래스패스 덤프가 낡는 파일들. 덤프 자신도 포함한다 — 다시 덤프했으면 데몬이 든 것이 옛것이다. */
    val buildFiles: List<File>
        get() = listOf(
            File(moduleDir, "build.gradle.kts"), File(moduleDir, "build.gradle"),
            File(repoRoot, "build.gradle.kts"), File(repoRoot, "build.gradle"),
            File(repoRoot, "settings.gradle.kts"), File(repoRoot, "settings.gradle"),
            File(repoRoot, "gradle.properties"), File(repoRoot, "gradle/libs.versions.toml"),
            file,
        ).filter { it.isFile }

    private val kmpAndroidSourceSets: List<String>
        get() = if (project !in kmpSourceRoots) emptyList() else listOf("android" + variant.replaceFirstChar(Char::uppercase), "androidMain")

    // devDebug → [dev, debug]. 정확한 flavor 분해는 Gradle만 알지만, 소스 루트를 찾는 데는 이 근사가 충분하다.
    private fun variantParts(v: String): List<String> =
        v.split(Regex("(?=[A-Z])")).filter { it.isNotEmpty() }.map { it.replaceFirstChar(Char::lowercase) }

    val composeStabilityConfig: File? = File(moduleDir, "compose_compiler_config.conf").takeIf { it.isFile }

    fun withResourcesFrom(app: ClasspathSpec): ClasspathSpec {
        require(app.resourceApkPath.isNotBlank()) { "${app.project} 에 리소스 APK가 없다 — 앱 모듈이 아니거나 빌드되지 않았다" }
        val own = rClassJars.toSet()
        val mine = classPath.filter { it !in own }
        val seen = (mine + app.rClassJars).toSet()
        val borrowed = app.classPath.filter { it !in seen && it !in own }
        val inRepo = borrowed.filter { it.startsWith(repoRoot.path + "/") }
        val paths = DumpPaths(
            classPath = mine + app.rClassJars + borrowed,
            projectClassPath = projectClassPath.filter { it !in own } + app.rClassJars + inRepo,
            compileClassPath = compileClassPath, rClassJars = app.rClassJars, resourceDirs = resourceDirs,
            kmpSourceRoots = app.kmpSourceRoots + kmpSourceRoots, assetsDirs = app.assetsDirs,
        )
        val derivation = Derivation.borrowed(ownClassPath, app.project.takeIf { borrowed.isNotEmpty() }, borrowed.size)
        return ClasspathSpec(file, project, variant, namespace, app.resourceApkPath, paths, derivation)
    }

    fun dependency(project: String): ClasspathSpec {
        val dir = "/" + project.trim(':').replace(':', '/') + "/build/"
        val own = projectClassPath.filter { it.startsWith(repoRoot.path + dir) && it !in rClassJars }
        require(own.isNotEmpty()) { "$project 의 산출물이 ${this.project} 덤프에 없다" }
        val paths = DumpPaths(
            classPath = classPath, projectClassPath = projectClassPath,
            compileClassPath = compileClassPath + rClassJars.filter { it !in compileClassPath }, rClassJars = rClassJars, resourceDirs = resourceDirs,
            kmpSourceRoots = kmpSourceRoots, assetsDirs = assetsDirs,
        )
        val derivation = Derivation.derived(own, from = this)
        return ClasspathSpec(file, project, variant, "", resourceApkPath, paths, derivation)
    }

    /** 이 덤프의 프로젝트 의존 모듈들 — 같은 저장소 안에 산출물이 있는 것. 클래스패스 순서(소비자 먼저)대로다. */
    val projectModules: List<String>
        get() = projectClassPath.asSequence()
            .filter { it.startsWith(repoRoot.path + "/") && "/build/" in it }
            .map { ":" + it.removePrefix(repoRoot.path + "/").substringBefore("/build/").replace('/', ':') }
            .filter { it != ":" && it != project }
            .distinct().toList()

    companion object {
        fun forRender(home: ClasspathSpec, app: ClasspathSpec?, overlay: File): Pair<ClasspathSpec, Boolean> {
            val onApp = app != null && app.classPath.any { it.startsWith(home.moduleDir.path + "/build/") }
            val r = if (onApp) app!! else app?.let { home.withResourcesFrom(it) } ?: home
            val ownFirst = if (onApp) home.ownClassPath.filter { it !in home.rClassJars } else emptyList()
            val front = listOf(overlay.absolutePath) + ownFirst
            val paths = DumpPaths(
                classPath = front + r.classPath, projectClassPath = front + r.projectClassPath,
                compileClassPath = r.compileClassPath, rClassJars = r.rClassJars, resourceDirs = r.resourceDirs,
                kmpSourceRoots = r.kmpSourceRoots + home.kmpSourceRoots, assetsDirs = r.assetsDirs,
            )
            val borrowedCount = if (onApp) (app!!.classPath.toSet() - home.classPath.toSet()).size else r.borrowedCount
            val derivation = Derivation.rendered(app?.project, borrowedCount)
            return ClasspathSpec(r.file, r.project, r.variant, r.namespace, r.resourceApkPath, paths, derivation) to onApp
        }

        fun load(file: File): ClasspathSpec {
            @Suppress("UNCHECKED_CAST")
            val m = Json.parse(file.readText()) as Map<String, Any?>
            val paths = DumpPaths(
                classPath = m.strings("classPath"), projectClassPath = m.strings("projectClassPath"),
                compileClassPath = m.strings("compileClassPath"), rClassJars = m.strings("rClassJars"), resourceDirs = m.strings("resourceDirs"),
                kmpSourceRoots = (m["kmpSourceRoots"] as? Map<*, *>).orEmpty()
                    .map { (k, v) -> k.toString() to (v as? List<*>).orEmpty().map { it.toString() } }.toMap(),
                assetsDirs = m.strings("assetsDirs"),
            )
            val spec = ClasspathSpec(
                file, m.string("project") ?: error("project 없음"), m.string("variant") ?: "debug", m.string("namespace") ?: "",
                m.string("resourceApkPath") ?: "", paths,
            )
            require(spec.compileClassPath.isNotEmpty()) {
                "${file.name}에 compileClassPath가 없다 — 최신 dump-classpath.init.gradle.kts로 다시 덤프해라(런타임 jar로는 컴파일이 안 된다)"
            }
            return spec
        }
    }
}

private const val CLASS_HEADER_BYTES = 8
private const val CLASS_MAJOR_OFFSET = 44
private const val JAVA_8_MAJOR = 52
private const val DEFAULT_JVM_TARGET = "17"
private val CLASS_MAGIC = byteArrayOf(0xCA.toByte(), 0xFE.toByte(), 0xBA.toByte(), 0xBE.toByte())

private val KOTLIN_METADATA = "Lkotlin/Metadata;".toByteArray()

private fun isKotlinClass(bytes: ByteArray): Boolean =
    (0..bytes.size - KOTLIN_METADATA.size).any { i -> KOTLIN_METADATA.indices.all { bytes[i + it] == KOTLIN_METADATA[it] } }

internal fun classMajor(header: ByteArray): Int? =
    header.takeIf { it.size >= CLASS_HEADER_BYTES && it.copyOfRange(0, 4).contentEquals(CLASS_MAGIC) }
        ?.let { ((it[6].toInt() and 0xFF) shl 8) or (it[7].toInt() and 0xFF) }
