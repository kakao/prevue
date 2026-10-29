package prevue.daemon.adapter.compile

import java.io.File
import java.net.URLClassLoader
import java.util.zip.ZipFile
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.withContext
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.Compiler
import prevue.json.map

/**
 * 상주 Kotlin 컴파일러. 바뀐 파일만 Gradle과 같은 인자로 컴파일한다 — 모듈마다 그 모듈의 인자(모듈명 · friend · 클래스패스)로.
 * 컴파일러는 격리된 클래스로더에 살고 브리지의 정적 메서드 하나로만 만난다 — 렌더러와 클래스가 섞이지 않게.
 * 로더는 모듈이 몇이든 하나다 — 모듈마다 두면 JIT가 모듈마다 다시 식는다.
 *
 * 오버레이는 두 겹이다. 모듈마다 자기 디렉터리([stagingDir]`/<모듈>`)에 컴파일하고, 렌더러가 보는 [overlayDir] 하나로 클래스를 모은다.
 * 렌더 클래스패스는 부트스트랩 때 정해져 모듈 디렉터리를 나중에 더할 수 없고, 모듈 수만큼 디렉터리를 앞에 두면 클래스마다 그만큼 헛짚는다.
 * 모듈 디렉터리를 따로 두는 이유는 둘이다 — 한 모듈만 버릴 수 있어야 하고(Q6), 최상위 선언 색인(`META-INF/<모듈명>-N.kotlin_module`, 컴파일 회차마다
 * 하나 — [keepModuleIndex])은 모듈 사이에 이름이 겹친다(nowinandroid의 `feature:foryou:impl`·`feature:bookmarks:impl`은 둘 다 `impl`).
 */
class HotCompiler(
    /** 모듈 경로 → 그 모듈의 컴파일 인자. 처음 컴파일할 때 한 번 부른다. */
    private val specOf: (String) -> ClasspathSpec,
    compilerJars: List<File>,
    bridgeClasses: File,
    private val composePlugin: File,
    private val androidJar: File,
    override val overlayDir: File,
    private val stagingDir: File,
) : Compiler, AutoCloseable {
    private val loader = URLClassLoader(
        (compilerJars + bridgeClasses).map { it.toURI().toURL() }.toTypedArray(),
        ClassLoader.getPlatformClassLoader(),
    )
    private val compileMethod = Class.forName("prevue.compiler.CompilerBridge", true, loader)
        .getMethod("compile", Array<String>::class.java)

    override fun close() { loader.close() }

    private val confined = Dispatchers.IO.limitedParallelism(1, "prevue-compiler")

    private val warmed = MutableStateFlow(false)
    override val warm: Boolean get() = warmed.value

    private var asked = 0
    internal var recompiled = 0
        private set

    private class Module(val project: String, var spec: ClasspathSpec, val dir: File) {
        val members = HashMap<String, Set<String>>()
        /** 자기 덤프가 아니라 다른 덤프에서 끌어낸 인자다. `project`로는 못 가른다 — 끌어낸 인자도 그 모듈의 이름을 단다. */
        val derived get() = spec.derivedFrom != null
        /** D-67. 이 모듈의 인자에 live literal 런타임이 있는가. 처음 컴파일할 때 한 번 본다. */
        var liveLiterals: Boolean? = null
        /** 이 디렉터리에 남긴 최상위 선언 색인 → 그 회차에 컴파일한 소스(정규 경로). [keepModuleIndex]가 낡은 것을 걷는다. */
        val indexes = LinkedHashMap<File, Set<String>>()
        var nextIndex = 1
    }
    private val units = LinkedHashMap<String, Module>()

    private fun unit(module: String): Module = units.getOrPut(module) {
        Module(module, specOf(module), File(stagingDir, module.trim(':').replace(':', '_').ifEmpty { "root" }).apply { mkdirs() })
    }

    // 자기 모듈 디렉터리가 맨 앞이고 다른 모듈의 것이 뒤따른다 — 앞서 오버레이에 놓인 클래스(자기 것이든 의존 모듈의 새 시그니처든)를 이 파일이 봐야 한다.
    private fun classpath(u: Module): String =
        (listOf(u.dir) + units.values.filter { it !== u }.map { it.dir }.filter { it.isDirectory }).map { it.absolutePath }
            .plus(androidJar.absolutePath).plus(u.spec.ownClassPath).plus(u.spec.compileClassPath).plus(u.spec.compileFill)
            .joinToString(File.pathSeparator)

    private fun args(u: Module, files: List<File>, dest: File): Array<String> = buildList {
        add("-no-jdk"); add("-no-stdlib"); add("-no-reflect")
        add("-jvm-target"); add(u.spec.jvmTarget)
        add("-module-name"); add(u.spec.kotlinModuleName)
        // 모듈 디렉터리도 friend다 — 앞서 핫 컴파일한 파일의 `internal` 선언을 이 파일이 쓴다
        add("-Xfriend-paths=" + (listOf(u.dir.absolutePath) + u.spec.ownClassPath).joinToString(","))
        add("-Xplugin=" + composePlugin.absolutePath)
        // AGP debug 빌드와 같게 켠다 — 없으면 오버레이 클래스에 소스 위치가 안 실려 가리키기가 그 파일을 못 짚고 Gradle이 구운 조상으로 잡힌다.
        add("-P"); add("plugin:androidx.compose.compiler.plugins.kotlin:sourceInformation=true")
        u.spec.composeStabilityConfig?.let {
            add("-P"); add("plugin:androidx.compose.compiler.plugins.kotlin:stabilityConfigurationPath=${it.absolutePath}")
        }
        // D-67. 파일마다 켜는 판(v2)이다 — 켜지 않은 파일의 getter는 상수를 돌려줘 지금 코드와 같이 돈다. 값을 넣는 것은 렌더러다.
        if (liveLiterals(u)) { add("-P"); add("plugin:androidx.compose.compiler.plugins.kotlin:liveLiteralsEnabled=true") }
        add("-nowarn")
        add("-cp"); add(classpath(u))
        add("-d"); add(dest.absolutePath)
        files.forEach { add(it.absolutePath) }
    }.toTypedArray()

    override suspend fun compile(module: String, files: List<File>): CompileResult = withContext(confined) {
        asked++
        val u = unit(module)
        // 끌어낸 인자로 실패한 뒤 그 모듈의 덤프를 떴으면 다음 저장부터 그것을 쓴다 — 데몬을 다시 띄우지 않고
        if (u.derived) u.spec = specOf(module).also { if (it.derivedFrom != u.spec.derivedFrom) u.liveLiterals = null }
        // 파일 mtime은 파일 시스템에 따라 초 단위로 잘린다 — 넉넉히 앞에서 끊고, 맞는 표는 소스 경로로 고른다.
        val since = System.currentTimeMillis() - 2_000
        val first = compile(u, files, u.dir)
        if (!first.ok) return@withContext first
        val r = recompileIfShadowed(u, files, since, first)
        if (!r.ok) return@withContext r
        val literals = if (liveLiterals(u)) runCatching { LiveLiteralTables.read(u.dir, files, since) }
            .onFailure { System.err.println("[prevue] live literal 표를 읽지 못했다 — 이 저장들은 컴파일로 간다: $it") }.getOrDefault(emptyList()) else emptyList()
        publish(u)
        r.copy(literals = literals)
    }

    /**
     * kotlinc는 `META-INF/<모듈명>.kotlin_module`(최상위 선언이 어느 파사드에 있나)을 그 회차의 파일만 담아 덮어쓴다 — 그대로 두면 앞서 핫 컴파일한
     * 파일의 최상위 함수 · 값을 다음 컴파일이 못 찾았다(`unresolved reference`, 클래스는 괜찮다). 회차마다 다른 이름으로 남긴다 — kotlinc는 클래스패스
     * 루트의 `META-INF/` 아래 `.kotlin_module`을 전부 읽는다. 이번 회차가 다 덮는 옛 색인과 소스가 다 사라진 색인은 걷는다 — 쌓이면 컴파일마다 다 읽고,
     * 옮기거나 지운 선언이 남아 보여 모호한 호출이 된다.
     */
    private fun keepModuleIndex(u: Module, files: List<File>) {
        val dir = File(u.dir, "META-INF")
        val f = File(dir, "${u.spec.kotlinModuleName}.kotlin_module").takeIf { it.isFile } ?: return
        val now = files.map { it.canonicalPath }.toSet()
        u.indexes.entries.removeIf { (idx, src) -> (now.containsAll(src) || src.none { File(it).isFile }).also { if (it) idx.delete() } }
        val kept = File(dir, "${u.spec.kotlinModuleName}-${u.nextIndex++}.kotlin_module")
        if (f.renameTo(kept)) u.indexes[kept] = now
        else System.err.println("[prevue] 최상위 선언 색인을 남기지 못했다(${f.name} → ${kept.name}) — 앞서 저장한 파일의 최상위 선언을 다음 컴파일이 못 찾을 수 있다")
    }

    private fun liveLiterals(u: Module): Boolean = u.liveLiterals ?: (System.getenv("PREVUE_LIVE_LITERALS") != "0" &&
        (u.spec.compileClassPath + u.spec.compileFill + u.spec.ownClassPath).map(::File)
            .sortedByDescending { "runtime" in it.name }
            .any(::hasLiveLiteralRuntime)).also { u.liveLiterals = it }

    private fun hasLiveLiteralRuntime(f: File): Boolean = when {
        f.isDirectory -> File(f, LIVE_LITERAL_RUNTIME).isFile
        f.isFile && f.name.endsWith(".jar") -> runCatching { ZipFile(f).use { it.getEntry(LIVE_LITERAL_RUNTIME) != null } }.getOrDefault(false)
        else -> false
    }

    /** 모듈 디렉터리의 클래스를 렌더 오버레이로 옮겨 놓는다. `META-INF`는 안 옮긴다 — 렌더러는 안 읽고, 모듈 사이에 이름이 겹친다. */
    private fun publish(u: Module) {
        u.dir.walkTopDown().filter { it.isFile && !it.relativeTo(u.dir).path.startsWith("META-INF") }.forEach { f ->
            f.copyTo(File(overlayDir, f.relativeTo(u.dir).path), overwrite = true)
        }
    }

    private fun compile(u: Module, files: List<File>, dest: File): CompileResult {
        require(files.isNotEmpty()) { "컴파일할 파일이 없다" }
        dest.mkdirs()
        val t = System.nanoTime()
        val out = compileMethod.invoke(null, args(u, files, dest)) as String
        val ms = (System.nanoTime() - t) / 1_000_000
        val exit = out.substringBefore('\n')
        val messages = out.substringAfter('\n', "").lines()
            .filterNot { it.isBlank() || it.startsWith("warning:") || it.contains("jansi") || it.contains("native-access") }
            .joinToString("\n")
        warmed.value = true
        if (exit == "OK" && dest == u.dir) keepModuleIndex(u, files)
        return CompileResult(exit == "OK", exit, messages, ms, files.map { it.absolutePath }, u.project, u.spec.derivedFrom)
    }

    suspend fun warmUp(module: String, file: File, scratch: File, passes: Int = WARMUP_PASSES, shouldContinue: () -> Boolean = { true }): List<CompileResult> {
        val deadline = System.nanoTime() + WARMUP_BUDGET_MS * 1_000_000
        val done = ArrayList<CompileResult>(passes)
        val since = withContext(confined) { asked }
        scratch.deleteRecursively()
        try {
            repeat(passes) {
                if (!shouldContinue()) return done
                val r = withContext(confined) { if (asked != since) null else compile(unit(module), listOf(file), scratch) } ?: return done
                done += r
                if (!r.ok || System.nanoTime() > deadline) return done
            }
        } finally { scratch.deleteRecursively() }
        return done
    }

    private val markers = HashMap<String, List<File>>()

    override suspend fun builtAt(module: String): Long? = withContext(confined) {
        asked++
        markers.getOrPut(module) { runCatching { specOf(module).kotlinBuildMarkers() }.getOrDefault(emptyList()) }
            .filter { it.exists() }.maxOfOrNull { it.lastModified() }
    }

    private val ownOutputs = HashMap<String, List<File>>()

    override suspend fun hasClass(module: String, fqcn: String): Boolean = withContext(confined) {
        asked++
        val entry = fqcn.replace('.', '/') + ".class"
        if (File(overlayDir, entry).isFile) return@withContext true
        ownOutputs(module).none { it.exists() } || inOwnOutputs(module, entry)
    }

    private fun recompileIfShadowed(u: Module, files: List<File>, since: Long, first: CompileResult): CompileResult {
        val written = writtenSince(u.dir, since)
        val now = written.associateWith { membersOf(File(u.dir, it)) }
        val shadowed = now.mapValues { (entry, members) -> (before(u, entry) ?: emptySet()) - (members ?: return@mapValues emptySet()) }
            .filterValues { it.isNotEmpty() }
        val r = if (shadowed.isEmpty()) first else {
            recompiled++
            val seen = shadowed.entries.take(3).map { (k, v) -> "$k ${v.take(3)}" }
            System.err.println("[prevue] 이 컴파일 전에 보이던 옛 클래스 ${shadowed.size}개에만 있는 멤버가 있었다 — 새 클래스로 가려 한 번 더 컴파일한다: $seen")
            compile(u, files, u.dir).let { it.copy(ms = first.ms + it.ms) }
        }
        if (r.ok) written.forEach { e -> membersOf(File(u.dir, e))?.let { u.members[e] = it } }
        return r
    }

    private fun before(u: Module, entry: String): Set<String>? =
        u.members[entry] ?: ownBytes(u.project, entry)?.let { bytes -> readMembers(entry) { bytes } }

    private fun membersOf(f: File): Set<String>? = readMembers(f.path) { f.readBytes() }

    private fun readMembers(what: String, bytes: () -> ByteArray): Set<String>? = runCatching { LostMembers.members(bytes()) }
        .onFailure { System.err.println("[prevue] 클래스 멤버를 읽지 못했다($what) — 옛 클래스 가림을 이 클래스는 보지 않는다: $it") }.getOrNull()

    private fun writtenSince(dir: File, since: Long): List<String> =
        dir.walkTopDown().filter { it.isFile && it.name.endsWith(".class") && it.lastModified() >= since }
            .map { it.relativeTo(dir).invariantSeparatorsPath }.toList()

    private fun ownOutputs(module: String): List<File> =
        ownOutputs.getOrPut(module) { runCatching { specOf(module).kotlinOutputs() }.getOrDefault(emptyList()) }

    private fun inOwnOutputs(module: String, entry: String): Boolean =
        ownOutputs(module).any { f -> if (f.isDirectory) File(f, entry).isFile else jarHas(f, entry) }

    private fun ownBytes(module: String, entry: String): ByteArray? = ownOutputs(module).firstNotNullOfOrNull { f ->
        when {
            f.isDirectory -> File(f, entry).takeIf { it.isFile }?.readBytes()
            f.isFile -> runCatching { ZipFile(f).use { z -> z.getEntry(entry)?.let { z.getInputStream(it).readBytes() } } }.getOrNull()
            else -> null
        }
    }


    private fun jarHas(jar: File, entry: String): Boolean =
        jar.isFile && runCatching { ZipFile(jar).use { it.getEntry(entry) != null } }.getOrDefault(false)

    /** `com.foo.BarKt`가 우리가 오버레이에 넣은 클래스인가. 앱 자신의 `NoSuchMethodError`와 가르는 선이다. */
    override fun inOverlay(fqcn: String): Boolean =
        File(overlayDir, fqcn.replace('.', '/') + ".class").isFile

    /**
     * [roots] 안에서 `member`를 이름으로 언급하는 파일들. 시그니처가 바뀐 파일과 **함께** 컴파일해야 옛 호출자가 안 남는다.
     *
     * 정확한 참조 해석은 컴파일러만 할 수 있으므로 이름으로 넓게 잡는다 — 과하게 잡으면 컴파일이 조금 길어질 뿐이고,
     * 놓치면 사람이 '렌더 예외'만 보게 된다. 이 경로는 링크 에러가 실제로 났을 때만 도므로 전수 읽기를 감수한다.
     */
    override fun callersOf(member: String, exclude: List<File>, roots: List<File>): List<File> {
        val skip = exclude.map { it.canonicalPath }.toSet()
        // 같은 이름의 파일은 거른다. `.cache/spike/src/`의 실험용 복사본은 원본과 FQN이 같아서
        // 둘을 함께 kotlinc에 넘기면 "conflicting declarations"로 죽는다 — 이 저장소가 공식으로 쓰는 실험 방식이다.
        val sameName = exclude.map { it.name }.toSet()
        val needle = member.toByteArray()
        return roots.asSequence()
            .flatMap { it.walkTopDown() }
            .filter { it.isFile && it.extension == "kt" && it.canonicalPath !in skip && it.name !in sameName }
            .filter { f -> runCatching { f.readBytes().contains(needle) }.getOrDefault(false) }
            .take(MAX_CALLERS)
            .toList()
    }

    /** 단어 경계까지 본다 — `Foo`를 찾을 때 `FooBar`가 걸리면 쓸데없는 파일을 컴파일한다. */
    private fun ByteArray.contains(needle: ByteArray): Boolean {
        outer@ for (i in 0..size - needle.size) {
            for (j in needle.indices) if (this[i + j] != needle[j]) continue@outer
            if (i > 0 && isWordByte(this[i - 1])) continue
            if (i + needle.size < size && isWordByte(this[i + needle.size])) continue
            return true
        }
        return false
    }

    private fun isWordByte(b: Byte): Boolean =
        b in 'a'.code.toByte()..'z'.code.toByte() || b in 'A'.code.toByte()..'Z'.code.toByte() ||
            b in '0'.code.toByte()..'9'.code.toByte() || b == '_'.code.toByte()

    /** Gradle이 다시 돌아 그 모듈의 산출물이 새로워졌으면 그 모듈의 오버레이는 낡은 것이다. 다른 모듈의 편집은 그대로 둔다(Q6). */
    override suspend fun clearOverlay(module: String): Unit = withContext(confined) {
        asked++
        val u = units[module] ?: return@withContext
        u.dir.walkTopDown().filter { it.isFile }.forEach { File(overlayDir, it.relativeTo(u.dir).path).delete() }
        u.dir.deleteRecursively()
        u.indexes.clear()
        u.members.clear()
    }
}

//이름으로 넓게 잡으므로 상한이 없으면 흔한 이름 하나가 모듈 전체를 컴파일하게 만든다. 넘치면 사람에게 Gradle을 권한다.
private const val MAX_CALLERS = 24
private const val LIVE_LITERAL_RUNTIME = "androidx/compose/runtime/internal/LiveLiteralKt.class"
//수렴 지점보다 한 회차 넉넉하게 잡는다. 남는 회차는 예산·저장 감지로 어차피 버려진다.
private const val WARMUP_PASSES = 10
//사람이 첫 저장을 하기 전에 끝나야 의미가 있다. 넘으면 남은 회차를 버린다.
private const val WARMUP_BUDGET_MS = 20_000L
