package prevue.daemon

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * 공유 상태는 액터나 `StateFlow` 스냅숏으로 두고, 스레드 장치는 JVM · 라이브러리 경계에만 둔다(D-89).
 * `src/main` 전체를 세므로 새 파일 · 새 패키지도 따로 적지 않아도 검사에 든다. 남기는 것은 허용 목록이 파일 · 장치 · 개수 · 이유로 갖고,
 * 개수가 늘거나 줄어도 깨진다 — 장치를 걷었으면 목록에서도 지운다. 이 검사는 철자를 센다(주석과 별칭 없는 import 줄은 뺀다).
 */
class ThreadDeviceRuleTest {
    private class Allowed(val path: String, val device: String, val count: Int, val reason: String)

    private companion object {
        val roots = listOf(File("src/main/kotlin"), File("src/main/java"))
        const val RENDER = "prevue/daemon/adapter/render"
        const val CLASS_LIFETIME = "JVM 클래스 수명 — 캐시를 클래스에 매단다. 클래스를 키로 쥐는 맵은 버린 로더를 붙잡는다"
        const val RENDERER_API = "렌더러 API — layoutlib 이 렌더 스레드의 ThreadLocal 과 Future 로 세션을 정리한다"
        val allowed = listOf(
            Allowed("prevue/daemon/PrevueDaemon.kt", "Thread", 2, "종료 훅과 감시견 — JVM 은 종료 훅에 Thread 만 받고, 감시견은 코루틴이 멈춰도 돌아야 한다"),
            Allowed("prevue/daemon/PrevueDaemon.kt", "runBlocking", 4, "블로킹 입구 — run · close 둘 · 감시견"),
            Allowed("$RENDER/RenderArtifactStore.kt", "runBlocking", 1, "close 입구 — 데몬 정리가 레인에 남은 쓰기를 기다린다"),
            Allowed("$RENDER/LazyListReflection.kt", "ClassValue", 1, CLASS_LIFETIME),
            Allowed("$RENDER/SemanticsTree.kt", "ClassValue", 3, CLASS_LIFETIME),
            Allowed("$RENDER/SessionDisposal.kt", "CompletableFuture", 1, RENDERER_API),
            Allowed("$RENDER/SessionDisposal.kt", "Thread", 2, RENDERER_API),
            Allowed("$RENDER/SessionDisposal.kt", "ThreadLocal", 2, RENDERER_API),
            Allowed("$RENDER/SharedLoaders.kt", "Executor", 2, "렌더러 API — 렌더러가 띄운 프리로더 Executor 를 넘겨받는다"),
        )
        val testRoots = listOf(File("src/test/kotlin"), File("src/integrationTest/kotlin"))
        const val SLEEP = "Thread.sleep"
        const val WALL_CLOCK = "실제 시간"
        val sleepAllowed = listOf(
            Allowed("prevue/daemon/ThreadDeviceRuleTest.kt", SLEEP, 3, "이 검사 — 심은 위반과 세는 철자"),
            Allowed("prevue/daemon/PrevueDaemonTest.kt", SLEEP, 2, "$WALL_CLOCK — 유휴 상한이 벽시계다(CLI 폴링 간격 · 상한을 넘기는 렌더)"),
            Allowed("prevue/daemon/adapter/http/ContractTest.kt", SLEEP, 1, "$WALL_CLOCK — SSE 는 끝을 알리지 않는다"),
            Allowed("prevue/daemon/adapter/http/ServerTest.kt", SLEEP, 2, "$WALL_CLOCK — Server 가 활동을 벽시계 ms 로 적는다"),
            Allowed("prevue/daemon/adapter/browser/FrameStreamerTest.kt", SLEEP, 2, "$WALL_CLOCK — 애니메이션의 프레임 간격 · 느린 연결"),
            Allowed("prevue/daemon/domain/runtime/ResourcePatchesTest.kt", SLEEP, 1, "$WALL_CLOCK — 다시 나타남 유예가 벽시계다"),
            Allowed("prevue/daemon/domain/UseCaseTest.kt", SLEEP, 3, "부정 확인 — 보드 채우기는 끝을 알리지 않아 일어나지 않음을 볼 신호가 없다"),
            Allowed("prevue/daemon/RenderIntegrationTest.kt", SLEEP, 5, "$WALL_CLOCK — 정착 간격 · 휠 칸 간격 · 전환 도중의 탭 · GC · 정착 기록의 수집"),
        )
        const val COLLECT = ".collect"
        const val VIRTUAL_CLOCK = "가상 시계 — runTest 안의 awaitItem 은 다음 방출까지 시계를 밀어 늦음을 가린다. advanceTimeBy 뒤 리스트로 본다"
        val collectAllowed = listOf(
            Allowed("prevue/daemon/ThreadDeviceRuleTest.kt", COLLECT, 3, "이 검사 — 심은 위반"),
            Allowed("prevue/daemon/ThreadDeviceRuleTest.kt", ".collectLatest", 1, "이 검사 — 심은 위반"),
            Allowed("prevue/daemon/ThreadDeviceRuleTest.kt", ".launchIn", 1, "이 검사 — 심은 위반"),
            Allowed("prevue/daemon/fake/Fakes.kt", COLLECT, 1, "onEvent — 알림을 낸 스레드에서 그 순간의 상태를 읽는 콜백"),
            Allowed("prevue/daemon/adapter/watch/PollingBuildWatcherTest.kt", COLLECT, 2, VIRTUAL_CLOCK),
            Allowed("prevue/daemon/domain/runtime/LiveLoopTest.kt", COLLECT, 1, VIRTUAL_CLOCK),
        )
        fun testFiles(): Map<String, String> = testRoots.flatMap { root ->
            root.walk().filter { it.extension == "kt" }.map { it.relativeTo(root).invariantSeparatorsPath to it.readText() }.toList()
        }.toMap().also {
            assertTrue("prevue/daemon/fake/Fakes.kt" in it && "prevue/daemon/RenderIntegrationTest.kt" in it, "테스트를 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        }
        fun counted(list: List<Allowed>): Map<String, Int> = list.groupBy { "${it.path} → ${it.device}" }.mapValues { (key, entries) ->
            require(entries.size == 1) { "허용 목록에 $key 가 두 번 있다 — 개수를 한 줄에 합친다" }
            entries.single().count
        }
        val allowedCounts = counted(allowed)
    }

    @Test fun `src main 의 스레드 장치는 허용 목록뿐이다`() {
        val files = roots.flatMap { root ->
            root.walk().filter { it.extension == "kt" || it.extension == "java" }.map { it.relativeTo(root).invariantSeparatorsPath to it.readText() }.toList()
        }.toMap()
        assertTrue("prevue/daemon/Main.kt" in files && "prevue/render/Shim.java" in files, "본체를 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(emptyList<String>(), ThreadDeviceRule.violations(files, allowedCounts)) {
            "허용 목록(D-89 경계)과 다르다. 지금 허용한 것:\n" + allowed.joinToString("\n") { "  ${it.path} → ${it.device} ×${it.count} — ${it.reason}" }
        }
    }

    // 테스트는 틈을 sleep 으로 두지 않고 fake/Await.kt 로 기다린다. 남은 것은 실제 시간이 필요한 곳뿐이다.
    @Test fun `테스트의 Thread sleep 은 허용 목록뿐이다`() {
        val found = ThreadDeviceRule.counts(testFiles()).filterKeys { it.endsWith(" → $SLEEP") }
        val want = counted(sleepAllowed)
        assertEquals(want, found) {
            "테스트의 sleep 이 허용 목록과 다르다 — 기다림은 fake/Await.kt 로 한다. 지금 허용한 것:\n" +
                sleepAllowed.joinToString("\n") { "  ${it.path} ×${it.count} — ${it.reason}" }
        }
    }

    // 실제 스레드의 Flow 방출은 Turbine 으로 기다린다 — 리스트에 모으고 폴링하면 순서 · 남은 방출을 단언하지 못한다.
    @Test fun `테스트의 Flow 수집은 허용 목록뿐이다`() {
        assertEquals(counted(collectAllowed), ThreadDeviceRule.counts(testFiles(), ThreadDeviceRule.collect)) {
            "테스트의 Flow 수집이 허용 목록과 다르다 — 실제 스레드의 방출은 Turbine(test {})으로 기다린다. 지금 허용한 것:\n" +
                collectAllowed.joinToString("\n") { "  ${it.path} ×${it.count} — ${it.reason}" }
        }
        assertEquals(
            mapOf("G.kt → .collect" to 2, "G.kt → .collectLatest" to 1, "G.kt → .launchIn" to 1),
            ThreadDeviceRule.counts(mapOf("G.kt" to "f.collect { }\n  // f.collect { }\ng.collect(c)\nh.collectLatest { }\nf.onEach { }.launchIn(s)\nval collected = 1\n"), ThreadDeviceRule.collect),
        )
    }

    @Test fun `일부러 넣은 위반을 잡는다`() {
        val planted = mapOf(
            "A.kt" to "@Volatile var a = 0\n@Synchronized fun b() {}\nfun c() = synchronized(this) { }\n",
            "B.kt" to "val m = ConcurrentHashMap<String, Int>()\nval n = AtomicInteger()\nval e = Executors.newSingleThreadExecutor()\n",
            "C.kt" to "val l = CountDownLatch(1)\nval s = CopyOnWriteArrayList<Int>()\nfun f() = runBlocking { }\nfun g() = Thread.sleep(10)\n",
            "D.kt" to "import java.util.concurrent.ConcurrentHashMap\n// @Volatile 은 쓰지 않는다\n * runBlocking 은 입구에만\nval ok = HashMap<String, Int>()\n",
            "E.kt" to "import java.util.concurrent.atomic.AtomicInteger as Counter\nval t = thread(isDaemon = true) { }\nval c = newSingleThreadContext(\"x\")\n" +
                "private val pool: ScheduledExecutorService = p\nval q = LinkedBlockingQueue<Int>()\n@get:Synchronized val x = 0\n@kotlin.jvm.Volatile var y = 0\nf(\n    *args, Thread { })\n",
            "F.java" to "class F {\n    private static volatile boolean x;\n    synchronized void f() { synchronized (this) { } }\n}\n",
            "Keep.kt" to "fun close() = runBlocking { }\nfun run() = runBlocking { }\n",
        )
        assertEquals(
            listOf(
                "A.kt → @Synchronized ×1", "A.kt → @Volatile ×1", "A.kt → synchronized ×1",
                "B.kt → AtomicInteger ×1", "B.kt → ConcurrentHashMap ×1", "B.kt → Executors ×1",
                "C.kt → CopyOnWriteArrayList ×1", "C.kt → CountDownLatch ×1", "C.kt → Thread.sleep ×1", "C.kt → runBlocking ×1",
                "E.kt → @get:Synchronized ×1", "E.kt → @kotlin.jvm.Volatile ×1", "E.kt → AtomicInteger ×1", "E.kt → LinkedBlockingQueue ×1",
                "E.kt → ScheduledExecutorService ×1", "E.kt → Thread ×1", "E.kt → newSingleThreadContext ×1", "E.kt → thread( ×1",
                "F.java → synchronized ×2", "F.java → volatile ×1",
                "Gone.kt → Thread ×0", "Keep.kt → runBlocking ×2",
            ),
            ThreadDeviceRule.violations(planted, mapOf("Keep.kt → runBlocking" to 1, "Gone.kt → Thread" to 1)),
        )
    }
}

object ThreadDeviceRule {
    private val device = Regex(
        listOf(
            """@(?:\w+:)?(?:kotlin\.jvm\.)?(?:Volatile|Synchronized)\b""", """\bvolatile\b""", """\bsynchronized\w*\b""",
            """\bConcurrent\w+""", """\bAtomic\w+""", """\bReentrant\w+""", """\b(?:ReadWrite|Stamped)Lock\b""", """\bSemaphore\b""", """\b\w*BlockingQueue\b""",
            """\bThread\.sleep\b""", """\bThread\b""", """\bThreadLocal\b""", """\b(?:thread|timer|fixedRateTimer)\s*[({]""", """\bTimer\b""",
            """\b(?:Scheduled)?Executor(?:s|Service)?\b""", """\bForkJoinPool\b""", """\bnew(?:SingleThread|FixedThreadPool)Context\b""",
            """\brunBlocking\b""", """\bClassValue\b""", """\bCompletableFuture\b""", """\bCountDownLatch\b""", """\bCopyOnWrite\w+""",
        ).joinToString("|"),
    )
    private val comment = Regex("""^\s*(?://|/\*|\*(?:\s|/|$))""")
    private val plainImport = Regex("""^\s*import\s+[\w.*]+\s*;?\s*$""")

    val collect = Regex("""\.(?:collect\w*|launchIn)(?=\s*[({])""")

    fun counts(files: Map<String, String>, pattern: Regex = device): Map<String, Int> = files.flatMap { (path, text) ->
        text.lineSequence().filterNot { comment.containsMatchIn(it) || plainImport.matches(it) }
            .flatMap { line -> pattern.findAll(line).map { "$path → ${it.value}" } }.toList()
    }.groupingBy { it }.eachCount()

    fun violations(files: Map<String, String>, allowed: Map<String, Int>): List<String> {
        val found = counts(files)
        return (found.keys + allowed.keys).sorted().filter { found[it] != allowed[it] }.map { "$it ×${found[it] ?: 0}" }
    }
}
