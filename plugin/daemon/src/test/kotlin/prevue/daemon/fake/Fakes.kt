package prevue.daemon.fake

import prevue.daemon.entity.Verbatim
import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import prevue.daemon.domain.model.WorkspaceEvent
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.daemon.adapter.dump.DumpPaths
import prevue.daemon.adapter.source.ProjectFiles
import prevue.daemon.adapter.source.SourcePreviewRepository
import prevue.daemon.domain.port.BuildChange
import prevue.daemon.domain.port.BuildNotice
import prevue.daemon.domain.model.Card
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.port.Frame
import prevue.daemon.domain.port.LiteralTable
import prevue.daemon.domain.port.LiveSession
import prevue.daemon.domain.port.LiveSessionFactory
import prevue.daemon.entity.ModuleGraph
import prevue.daemon.domain.model.ModuleInfo
import prevue.daemon.entity.ModuleNode
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.RenderOutput
import prevue.daemon.domain.port.SourceChange
import prevue.daemon.domain.port.BuildWatcher
import prevue.daemon.domain.port.Compiler
import prevue.daemon.domain.port.PreviewRenderer
import prevue.daemon.domain.port.SourceWatcher
import prevue.daemon.domain.port.ResourceEntry
import prevue.daemon.domain.port.ResourceKey
import prevue.daemon.domain.port.ResourceLookup
import prevue.daemon.domain.port.ResourceValues
import prevue.daemon.domain.port.Clock
import prevue.daemon.domain.Ports
import prevue.daemon.domain.UseCases
import prevue.daemon.domain.Watchers
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.EntryPoints
import prevue.daemon.PrevueCheckout
import prevue.daemon.TargetRepo

/** 그림 없이 순서만 기록하는 렌더러. 막고 풀기(latch)로 락 안의 한 순간에 다른 스레드를 끼워 넣는다. */
class FakePreviewRenderer(override val outDir: File) : PreviewRenderer, LiveSessionFactory {
    val shown = CopyOnWriteArrayList<PreviewSpec>()
    val ownLoaderShown = CopyOnWriteArrayList<PreviewSpec>()
    /** 걸어 두면 [show]가 그 자리에서 멈춘다. */
    @Volatile var showGate: CountDownLatch? = null
    val showEntered = Semaphore(0)
    /** 걸어 두면 다음 [show] 한 번이 그것을 던진다 — 렌더러가 결과 없이 죽는 자리다. */
    @Volatile var showThrows: Throwable? = null
    /** 걸어 두면 [codeChanged]가 멈춘다 — 컴파일 성공과 세대 올리기 사이의 자리다. */
    @Volatile var codeGate: CountDownLatch? = null
    val codeEntered = Semaphore(0)
    @Volatile var codeChanges = 0
    /** [show]가 이 횟수를 넘기면 [hold]가 풀릴 때까지 멈춘다 — 보드 채우기를 첫 장 뒤에 세워 응답의 모양을 고정한다. */
    @Volatile var holdAfter = Int.MAX_VALUE
    @Volatile var hold = CountDownLatch(0)
    override suspend fun show(p: PreviewSpec, ownLoader: Boolean): RenderOutput = render(p, ownLoader)

    /** 옆 태스크로 그린 것들 — 라이브 세션은 그대로다. [asideGate]를 걸면 그 자리에서 멈춘다. */
    val asides = CopyOnWriteArrayList<PreviewSpec>()
    @Volatile var asideGate: CountDownLatch? = null
    val asideEntered = Semaphore(0)
    override suspend fun showAside(p: PreviewSpec): RenderOutput {
        asides += p
        asideEntered.release()
        asideGate?.let { check(it.await(5, TimeUnit.SECONDS)) { "asideGate가 안 풀렸다" } }
        return asideFails?.let { output(p).copy(ok = false, failure = FailureKind.EXCEPTION, message = Verbatim(it)) } ?: output(p)
    }
    /** 걸어 두면 옆 태스크가 그 문구의 렌더 예외로 실패한다. */
    @Volatile var asideFails: String? = null

    /** 라이브 첫 장을 다른 이름으로 남긴 것들 — (원래 previewId, 새 previewId). */
    val copies = CopyOnWriteArrayList<Pair<String, String>>()
    override fun copyImage(out: RenderOutput, previewId: String): RenderOutput {
        copies += out.preview.previewId to previewId
        return output(out.preview.copy(previewId = previewId))
    }

    /** 열린 세션들. 닫히면 [closes]가 오른다. */
    val opened = CopyOnWriteArrayList<PreviewSpec>()
    val closes = java.util.concurrent.atomic.AtomicInteger()
    override suspend fun open(p: PreviewSpec, interactive: Boolean, ownLoader: Boolean): LiveSession {
        opened += p
        return Session(p, render(p, ownLoader))
    }

    private fun render(p: PreviewSpec, ownLoader: Boolean): RenderOutput {
        shown += p
        if (ownLoader) ownLoaderShown += p
        showEntered.release()
        showGate?.let { check(it.await(5, TimeUnit.SECONDS)) { "showGate가 안 풀렸다" } }
        showThrows?.let { showThrows = null; throw it }
        if (shown.size > holdAfter) check(hold.await(5, TimeUnit.SECONDS)) { "hold가 안 풀렸다" }
        exceptions.poll()?.let { return output(p).copy(ok = false, failure = FailureKind.EXCEPTION, message = Verbatim(it)) }
        failures.poll()?.let { return output(p).copy(ok = false, failure = it, message = Verbatim("가짜 $it")) }
        return output(p)
    }

    /** 넣어 두면 다음 [show]가 그 문구의 렌더 예외로 실패한다 — 옛 호출자의 링크 에러 자리다. */
    val exceptions = java.util.concurrent.ConcurrentLinkedQueue<String>()
    val failures = java.util.concurrent.ConcurrentLinkedQueue<FailureKind>()

    val rerenders = java.util.concurrent.atomic.AtomicInteger()
    /** 틱이 낼 프레임들 — 하나씩 꺼낸다. 비면 [moving]이 아닌 한 잠잠한 프레임이다. */
    val frames = java.util.concurrent.ConcurrentLinkedQueue<Frame>()
    /** 켜면 틱마다 그림이 바뀐다 — 끝나지 않는 애니메이션이라 정착하지 않는다. */
    @Volatile var moving = false
    /** 걸어 두면 다음 틱 한 번이 그것을 던진다 — 렌더러가 Error로 죽는 자리다. */
    @Volatile var tickThrows: Throwable? = null
    val ticks = java.util.concurrent.atomic.AtomicInteger()

    inner class Session(override val preview: PreviewSpec, override val opened: RenderOutput) : LiveSession {
        override suspend fun touch(type: String, x: Int, y: Int) { touches += Triple(type, x, y); onTouch(type, x, y) }
        override fun type(text: String): String? = typeError ?: run { typed += text; null }
        override fun scroll(x: Int, y: Int, dx: Float, dy: Float): Boolean { scrolls += listOf(x.toFloat(), y.toFloat(), dx, dy); onScroll(dx, dy); return true }
        override fun tick(forceImage: Boolean): Frame {
            ticks.incrementAndGet()
            tickThrows?.let { tickThrows = null; throw it }
            return frames.poll() ?: if (moving) Frame(true, false, BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB), 0, 0, 0) else Frame(false, true, null, 0, 0, 0)
        }
        override suspend fun look(semantics: Boolean): LiveSession.Look {
            looks.incrementAndGet()
            onLook()
            val out = rerender(preview).let { o -> lookFails?.let { o.copy(ok = false, failure = FailureKind.EXCEPTION, message = Verbatim(it)) } ?: o }
            return LiveSession.Look(out, liveTree)
        }
        override fun lists(): List<prevue.daemon.entity.ListState> { probes.incrementAndGet(); return liveTree.states }
        override fun semantics(): List<prevue.daemon.entity.SemanticNode> { probes.incrementAndGet(); return liveTree.semantics }
        override suspend fun renderAt(ms: Long, frameMs: Long): RenderOutput = rerender(preview)
        override fun close() { closes.incrementAndGet() }
    }

    private fun rerender(p: PreviewSpec): RenderOutput { rerenders.incrementAndGet(); return output(p) }
    /** 터치마다 부른다 — 굴림 · 누름이 화면을 바꾸는 자리를 테스트가 흉내 낸다. */
    @Volatile var onTouch: suspend (String, Int, Int) -> Unit = { _, _, _ -> }
    /** 세션의 [LiveSession.look]이 그리기 전에 부른다 — 렌더 스레드 상실 감시처럼 그리는 중의 대기 자리다. */
    @Volatile var onLook: suspend () -> Unit = {}
    /** [look]이 낼 지금 화면. 굴림([scroll])마다 [onScroll]이 바꾼다. */
    @Volatile var liveTree = prevue.daemon.entity.LiveTree(1080, 1920, emptyList())
    val looks = java.util.concurrent.atomic.AtomicInteger()
    val probes = java.util.concurrent.atomic.AtomicInteger()
    /** 걸어 두면 [look]이 그 문구의 렌더 예외로 실패한다 — 지금 화면을 못 그린 자리다. */
    @Volatile var lookFails: String? = null
    val scrolls = CopyOnWriteArrayList<List<Float>>()
    @Volatile var onScroll: (Float, Float) -> Unit = { _, _ -> }
    val touches = CopyOnWriteArrayList<Triple<String, Int, Int>>()
    /** 넣은 글자. [typeError]를 걸면 넣지 못한 이유로 돌려준다 — 포커스된 필드가 없는 자리다. */
    val typed = CopyOnWriteArrayList<String>()
    @Volatile var typeError: String? = null

    override fun codeChanged() {
        codeChanges++
        counted.clear()
        codeEntered.release()
        codeGate?.let { check(it.await(5, TimeUnit.SECONDS)) { "codeGate가 안 풀렸다" } }
    }
    /** D-67. 넣은 리터럴 값(클래스, 값들)과 뺀 클래스들. [patchOk]를 끄면 넣기가 실패한다 — 공유 로더가 없는 자리다. */
    val patched = CopyOnWriteArrayList<Pair<String, Map<String, Any>>>()
    val dropped = CopyOnWriteArrayList<String>()
    @Volatile var patchOk = true
    @Volatile var refuses: Set<String> = emptySet()
    override fun patchLiterals(owner: String, values: Map<String, Any>): Boolean {
        val ok = patchOk && owner !in refuses
        if (ok) patched += owner to values
        return ok
    }
    override fun dropLiterals(owners: Collection<String>) { dropped += owners }
    @Volatile var buildChanges = 0
    override fun buildChanged() { buildChanges++ }
    override fun forgetShapes() {}
    /** 제공자마다 내는 값의 개수. 엔진처럼 다음 [codeChanged]까지 처음 센 값을 쥔다. */
    val providerValues = java.util.concurrent.ConcurrentHashMap<String, Int>()
    private val counted = java.util.concurrent.ConcurrentHashMap<String, Int>()
    override fun instanceCount(p: PreviewSpec): Int {
        val provider = p.methodParams.firstOrNull()?.get("provider") ?: return 1
        return counted.getOrPut(provider) { providerValues[provider] ?: 1 }
    }
    /** 걸어 두면 [previewId]의 다음 쓰기 한 번이 그 자리에서 멈춘다 — 렌더는 끝났고 PNG가 디스크로 가는 중인 순간이다. */
    @Volatile var writeHold: Pair<String, CountDownLatch>? = null
    val writeEntered = Semaphore(0)
    override suspend fun written(out: RenderOutput): RenderOutput {
        val (id, gate) = writeHold?.takeIf { it.first == out.preview.previewId } ?: return out
        writeHold = null
        writeEntered.release()
        check(gate.await(5, TimeUnit.SECONDS)) { "writeHold가 안 풀렸다" }
        return out
    }
    @Volatile var protected: () -> Set<String> = { emptySet() }
    override fun protect(keep: () -> Set<String>) { protected = keep }
    /** 걸어 두면 다음 [awaitWrites] 한 번이 그 자리에서 멈춘다 — 채우기가 마지막 카드의 쓰기를 기다리는 순간이다. */
    @Volatile var awaitWritesHold: CountDownLatch? = null
    val awaitWritesEntered = Semaphore(0)
    override suspend fun awaitWrites() {
        val gate = awaitWritesHold ?: return
        awaitWritesHold = null
        awaitWritesEntered.release()
        check(gate.await(5, TimeUnit.SECONDS)) { "awaitWritesHold가 안 풀렸다" }
    }

    override val bootstrapMs = 0L
    override val loaderGen = 0
    override val tasksOnLoader = 0
    override val outBytes = 0L
    override val outMaxBytes = 0L
    override val touchModeError: String? = null

    // 빈 파일이라도 둔다 — 숨은 탭을 되살릴 때 산출물 상한이 지운 그림인지를 파일로 본다.
    private fun output(p: PreviewSpec) = RenderOutput(
        ok = true, preview = p, image = File(outDir, "${p.previewId}-0.png").apply { createNewFile() }, tree = File(outDir, "${p.previewId}-0.viewinfo.json"),
        width = 100, height = 100, taskMs = 1, renderMs = 1, status = "SUCCESS", failure = null, message = null, freshLoader = false,
    )
}

class FakeCompiler(override val overlayDir: File) : Compiler {
    @Volatile var ok = true
    /** 모듈별로 실패시킨다 — 의존 순서가 틀렸을 때의 자리. 앞서 성공한 모듈들을 받는다. */
    @Volatile var fails: (module: String, before: List<String>) -> Boolean = { _, _ -> false }
    val compiled = CopyOnWriteArrayList<List<File>>()
    /** (모듈, 파일들) — 어느 모듈의 인자로 컴파일했는가. */
    val compiledBy = CopyOnWriteArrayList<Pair<String, List<File>>>()
    val cleared = CopyOnWriteArrayList<String>()
    @Volatile var overlay: Set<String> = emptySet()
    @Volatile var callers: List<File> = emptyList()
    @Volatile var callerRoots: List<File> = emptyList()
    /** 자기 덤프가 없어 앱 덤프에서 인자를 끌어낸 모듈들. */
    @Volatile var derived: Set<String> = emptySet()
    /** D-67. 성공한 컴파일이 파일마다 낼 live literal 표. 기본은 없다(옵션을 못 켠 모듈). */
    @Volatile var literals: (File) -> LiteralTable? = { null }

    /** 이 파일들이 실리면 실패하고 오류를 그 파일에 적는다 — kotlinc처럼 `경로:줄:칸: error:`. */
    @Volatile var broken: Set<File> = emptySet()
    /** 이 파일들이 한 번에 함께 실리지 않으면 실패한다 — 다른 파일이 부르는 심볼이 오버레이에도 Gradle 산출물에도 없을 때. */
    @Volatile var needs: Set<File> = emptySet()

    override suspend fun compile(module: String, files: List<File>): CompileResult {
        val bad = files.filter { it in broken }
        val ok = ok && bad.isEmpty() && files.map { it.canonicalFile }.containsAll(needs) && !fails(module, passed.toList())
        compiled += files
        compiledBy += module to files
        if (ok) passed += module
        val messages = if (bad.isNotEmpty()) bad.joinToString("\n") { "${it.path}:1:1: error: 가짜 오류" } else if (ok) "" else "e: 가짜 실패"
        return CompileResult(ok, if (ok) "OK" else "COMPILATION_ERROR", messages, 1, files.map { it.absolutePath },
            module, ":app".takeIf { module in derived }, literals = if (ok) files.mapNotNull(literals) else emptyList())
    }
    private val passed = CopyOnWriteArrayList<String>()
    override fun inOverlay(fqcn: String) = fqcn in overlay
    override fun callersOf(member: String, exclude: List<File>, roots: List<File>): List<File> { callerRoots = roots; return callers }
    override suspend fun clearOverlay(module: String) { cleared += module }
    /** 모듈마다 Gradle이 Kotlin을 마지막으로 컴파일한 시각. 없으면 모른다. */
    @Volatile var built: Map<String, Long> = emptyMap()
    override suspend fun builtAt(module: String) = built[module]
    /** Gradle 산출물에 없는 클래스. 오버레이에 놓이면 있는 것으로 본다. */
    @Volatile var unbuilt: Set<String> = emptySet()
    override suspend fun hasClass(module: String, fqcn: String) = fqcn !in unbuilt || fqcn in overlay
    override val warm = true
}

/**
 * 부를 때마다 [step]씩 오르는 시계. 기다림의 마감(`waited() > timeoutMs`)이 실제 시간을 안 쓰고 오고,
 * 판정이 보는 순서(연 시각 < 컴파일 시각 < 요청 시각)는 부른 순서 그대로 선다.
 */
class FakeSourceWatcher : SourceWatcher {
    private val changes = MutableSharedFlow<SourceChange>()
    private val hotFiles = MutableStateFlow<() -> List<File>> { emptyList() }
    val hot: () -> List<File> get() = hotFiles.value
    override fun changes(hot: () -> List<File>): Flow<SourceChange> { hotFiles.value = hot; return changes }
    override val stats: Map<String, Any?> = mapOf("files" to 1)
    fun fire(vararg files: File) = send(SourceChange(files.toList(), files.maxOf { it.lastModified() }, System.currentTimeMillis(), System.nanoTime()))
    /** 생성 · 삭제만 있는 묶음 — 저장 → 화면은 돌지 않는다. */
    fun fireStructure(created: List<File> = emptyList(), deleted: List<File> = emptyList()) =
        send(SourceChange(emptyList(), System.currentTimeMillis(), System.currentTimeMillis(), System.nanoTime(), created, deleted))
    private fun send(change: SourceChange) = runBlocking {
        changes.subscriptionCount.first { it > 0 }
        changes.emit(change)
    }
}

/**
 * D-68. 렌더러의 리소스 — [apk]는 부트스트랩 때 쥔 값(키 → 값), 얹은 값은 [put]이 [over]에 둔다.
 * values XML은 `<타입 name="이름">값</타입>` 한 줄씩만 읽는다. 한정자는 디렉터리 이름(`values-night` → `night`)이다.
 */
class FakeResourceValues(val apk: MutableMap<ResourceKey, String> = HashMap()) : ResourceValues {
    val over = HashMap<ResourceKey, String>()
    var putOk = true
    val puts = CopyOnWriteArrayList<Collection<ResourceKey>>()
    override fun parse(file: File, text: String): List<ResourceEntry>? {
        if ("<resources" !in text || "</resources>" !in text) return null
        val q = file.parentFile.name.removePrefix("values").removePrefix("-")
        return Regex("""<(\w+) name="([^"]+)">([^<]*)</\1>""").findAll(text).map { ResourceEntry(ResourceKey(it.groupValues[1], it.groupValues[2], q), it.groupValues[3]) }.toList()
    }
    override fun lookup(key: ResourceKey): ResourceLookup {
        (over[key] ?: apk[key])?.let { return ResourceLookup.Value(it) }
        return if ((over.keys + apk.keys).any { it.type == key.type && it.name == key.name }) ResourceLookup.NoConfig else ResourceLookup.NoName
    }
    override fun put(file: File, text: String, keys: Collection<ResourceKey>): Boolean {
        if (!putOk) return false
        val e = parse(file, text)!!.associate { it.key to it.value }
        keys.forEach { over[it] = e.getValue(it) }
        puts += keys
        return true
    }
}

class FakeBuildWatcher : BuildWatcher {
    private val notices = MutableSharedFlow<BuildNotice>()
    override fun changes(): Flow<BuildNotice> = notices
    override val stats: Map<String, Any?> = mapOf("watched" to 1)
    fun fire(change: BuildChange, done: Boolean) = runBlocking {
        notices.subscriptionCount.first { it > 0 }
        notices.emit(BuildNotice(change, done))
    }
}

class FakeClock(start: Long = 10_000_000L, private val step: Long = 1) : Clock {
    private val now = AtomicLong(start)
    override fun nowMs(): Long = now.addAndGet(step)
}

/**
 * 가짜 저장소 하나 — `:app` 모듈과 프리뷰 [previews]장짜리 소스 파일. [ClasspathSpec]이 모듈 디렉터리·모듈명을
 * 산출물 경로와 `.kotlin_module`에서 읽으므로 그 둘만 실제로 둔다.
 */
class Fixture(previews: Int = 3) : AutoCloseable {
    private val job = SupervisorJob()
    val scope = CoroutineScope(job + Dispatchers.Default)
    private val openedEntryPoints = CopyOnWriteArrayList<EntryPoints>()
    val root: File = Files.createTempDirectory("prevue-test").toFile().canonicalFile
    private val classes = File(root, "app/build/classes").apply { File(this, "META-INF").mkdirs(); File(this, "META-INF/app.kotlin_module").writeText("") }
    val srcRoot: File = File(root, "app/src/main/kotlin").apply { mkdirs() }
    val file: File = File(srcRoot, "demo/Cards.kt").apply {
        parentFile.mkdirs()
        writeText(buildString {
            appendLine("package demo")
            appendLine("import androidx.compose.ui.tooling.preview.Preview")
            repeat(previews) { appendLine("@Preview\nfun Card$it() {}") }
        })
    }
    /** 앱이 의존하는 모듈 하나 — 모듈을 넘는 저장·빌드의 자리. */
    val libRoot: File = File(root, "lib/src/main/kotlin").apply { mkdirs() }
    val libOut: File = File(root, "lib/build/classes").apply { mkdirs() }
    /** 프리뷰 [n]장짜리 파일을 하나 더 둔다 — 탭을 여럿 여는 테스트만. 계약의 파일 색인에 안 실리게 쓰는 쪽이 만든다. */
    fun previewFile(name: String, n: Int = 2): File = File(srcRoot, "demo/$name.kt").apply {
        parentFile.mkdirs()
        writeText("package demo\nimport androidx.compose.ui.tooling.preview.Preview\n" + (0 until n).joinToString("") { "@Preview\nfun $name$it() {}\n" })
    }
    /** 쓰는 테스트만 만든다 — 계약의 파일 색인에 안 실리게. */
    val libFile: File by lazy { File(libRoot, "lib/Theme.kt").apply { parentFile.mkdirs(); writeText("package lib\nfun accent() = 1\n") } }
    /** `:app`의 `res` 루트. values 파일은 쓰는 테스트만 만든다(D-68). */
    val resRoot: File = File(root, "app/src/main/res")
    /** values XML 하나를 둔다 — [dir]는 `values` · `values-night` 따위. */
    fun valuesFile(text: String, dir: String = "values", name: String = "strings.xml"): File =
        File(resRoot, "$dir/$name").apply { parentFile.mkdirs(); writeText(text) }
    val graph = ModuleGraph(":app", listOf(ModuleNode(":lib", listOf(libRoot), listOf(libOut)), ModuleNode(":app", listOf(srcRoot), listOf(classes), resRoots = listOf(resRoot))))

    init {
        // 같은 베이스네임이 두 곳에 있다 — 가리키기가 사람에게 고르게 하는 경로를 계약이 본다.
        for (d in listOf("a", "b")) File(srcRoot, "$d/Dup.kt").apply { parentFile.mkdirs(); writeText("package $d\n") }
    }
    val spec = ClasspathSpec(
        File(root, "dump.json"), ":app", "debug", "demo", "",
        DumpPaths(classPath = listOf(classes.path), projectClassPath = listOf(classes.path), compileClassPath = emptyList(), rClassJars = emptyList(), resourceDirs = emptyList()),
    )
    val renderer = FakePreviewRenderer(File(root, "out").apply { mkdirs() })
    val compiler = FakeCompiler(File(root, "overlay").apply { mkdirs() })

    private val module = ModuleInfo(root.absolutePath, spec.project, spec.variant, spec.kotlinModuleName, null, null)

    /** `Main`과 같은 조립. 채우기·쓰기 기록은 진짜 디스패처에서 돈다 — 줄 서기의 경합이 실제와 같아야 한다. */
    fun useCases(
        clock: Clock = FakeClock(), sources: SourceWatcher? = null, builds: BuildWatcher? = null, scope: CoroutineScope = this.scope,
        resources: ResourceValues? = null, watchRoots: Boolean = true, postureQuietMs: Long = prevue.daemon.domain.DrawPosturesUseCase.QUIET_MS,
    ) =
        Workspace(module, clock, graph, if (watchRoots) graph.roots + graph.valueDirs else emptyList()).let { ws ->
            UseCases(ws, Ports(renderer, renderer, compiler, SourcePreviewRepository(spec.classPath), ProjectFiles(root, graph.roots).apply { buildInBackground(scope) },
                resources = resources), scope, Watchers(sources, builds), postureQuietMs)
                .also { workspaces[it] = ws }
        }

    /** `Main`과 같은 입구 한 벌. 감시 포트는 주지 않는다 — 저장은 테스트가 유스케이스를 직접 부른다. */
    fun entryPoints(uc: UseCases, port: Int, target: TargetRepo = TargetRepo()) =
        EntryPoints(uc, port, PrevueCheckout(File(root, "viewer").apply { mkdirs() }), renderer.outDir, scope, {}, target = target).also { openedEntryPoints += it }

    override fun close() {
        runBlocking {
            openedEntryPoints.forEach { it.stop() }
            scope.cancel()
            job.join()
        }
        root.deleteRecursively()
    }
}

/** 보드 채우기는 따로 돈다. 카드 전부가 지금 세대로 그려질 때까지 기다린다. */
fun Workspace.awaitBoardFilled(timeoutMs: Long = 5_000) {
    state.awaitState("보드가 다 차기", timeoutMs) { s -> (s.board ?: error("보드 없음")).let { b -> b.cards.all { it.fresh(b.gen) } } }
}

/**
 * 알림을 낸 스레드에서 이어 받는다(Unconfined) — 유스케이스가 줄 안에서 내는 알림이면 받는 순간의 [Workspace.now]가 낸 순간의 상태다.
 * [l] 안에서 다시 알림을 내면 그 알림은 줄을 서서 나중에 온다. 돌려준 것을 부르면 그만 듣는다.
 */
fun Workspace.onEvent(l: (WorkspaceEvent) -> Unit): () -> Unit {
    val job = CoroutineScope(Dispatchers.Unconfined).launch(start = CoroutineStart.UNDISPATCHED) { events.collect { l(it) } }
    return { job.cancel() }
}

/** 테스트만 상태를 들여다본다 — 입구(EntryPoints)에는 [Workspace]가 건네지지 않는다. [Fixture.useCases]가 만든 것만 있다. */
private val workspaces = java.util.Collections.synchronizedMap(java.util.WeakHashMap<UseCases, Workspace>())
val UseCases.workspace: Workspace get() = workspaces[this] ?: error("Fixture.useCases로 만든 UseCases가 아니다")
