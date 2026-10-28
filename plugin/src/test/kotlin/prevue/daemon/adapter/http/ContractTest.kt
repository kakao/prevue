package prevue.daemon.adapter.http

import java.io.File
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.URI
import java.nio.charset.StandardCharsets.UTF_8
import java.util.concurrent.CopyOnWriteArrayList
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.fail
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import prevue.json.Json
import prevue.daemon.domain.port.Clock
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitState
import prevue.daemon.fake.awaitUntil
import prevue.daemon.fake.eventually
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace

/**
 * HTTP 계약. `Main`과 같은 입구 조립(`EntryPoints`) + 진짜 유스케이스에 가짜 포트를 끼워 띄우고, 응답의 **키와 타입**을 `contract/<이름>.json`과 대조한다.
 * CLI·스킬·뷰어가 읽는 것은 이 JSON이다 — 안쪽을 옮기는 동안 여기가 초록이면 바깥이 본 표면은 그대로다.
 * 값은 대조하지 않는다(경로·시각·ms가 매번 다르다). 예시는 문서용으로 함께 적는다.
 *
 * 계약을 바꾸는 것은 의도한 변화일 때만이다: `./gradlew test -PcontractUpdate=true` 로 다시 쓰고 diff를 커밋에 싣는다.
 * `status`의 감시 비용(`watch`·`staleWatch`)은 감시 포트가 있을 때만 실린다 — 계약 테스트는 주지 않는다(`HotSwapRunnerTest`가 본다).
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class ContractTest {
    private val fx = Fixture(previews = 2)
    private val port = ServerSocket(0).use { it.localPort }
    private val uc = fx.useCases(Clock(System::currentTimeMillis))
    private val ws = uc.workspace
    private val server = fx.entryPoints(uc, port)
    private val viewer = server.browser
    private val events = CopyOnWriteArrayList<Map<String, Any?>>()
    private val update = System.getProperty("prevue.contract.update") == "true"
    private val dir = File("contract")

    @BeforeAll fun up() {
        server.start()
        Thread({
            val c = URI("http://127.0.0.1:$port/events").toURL().openConnection() as HttpURLConnection
            c.inputStream.bufferedReader(UTF_8).forEachLine { l ->
                @Suppress("UNCHECKED_CAST")
                if (l.startsWith("data: ")) events += Json.parse(l.removePrefix("data: ")) as Map<String, Any?>
            }
        }, "contract-sse").apply { isDaemon = true }.start()
        awaitUntil("SSE 의 state") { events.any { it["type"] == "state" } }
    }

    @AfterAll fun down() { runBlocking { server.stop() }; fx.close() }

    /** 한 메서드로 순서대로 친다 — 보드·선택·인터랙티브가 앞 요청의 상태 위에 선다. 실패를 모아 한 번에 보인다. */
    @Test fun `HTTP 계약`() {
        val f = fx.file.path
        val misses = ArrayList<String>()
        fun check(name: String, r: Pair<Int, Any?>) { misses += compare(name, r.first, r.second) }

        // 채우기는 따로 도는 스레드라 응답 순간에 몇 장이 그려졌는지가 경합이다. 첫 장 뒤에 세워 "포커스만 그려진 보드"로 고정한다.
        fx.renderer.hold = java.util.concurrent.CountDownLatch(1)
        fx.renderer.holdAfter = fx.renderer.shown.size + 1
        check("show.file", post("/show", mapOf("target" to f, "by" to "cli")))
        check("identity", get("/identity"))
        fx.renderer.holdAfter = Int.MAX_VALUE; fx.renderer.hold.countDown()
        ws.awaitBoardFilled()
        check("status", get("/status"))
        check("board", get("/board"))
        check("previews", post("/previews", mapOf("file" to f)))
        check("project-files", awaitIndex())
        // D-56. 빠른 열기 — 띄울 때 한 번 훑는다(Main).
        check("preview-files.pending", get("/preview-files.json"))
        runBlocking { uc.indexPreviewFiles() }
        check("preview-files", get("/preview-files.json"))
        check("card.cached", post("/card", mapOf("index" to 1)))
        check("card.force", post("/card", mapOf("index" to 1, "force" to true)))
        check("render", post("/render", emptyMap()))
        check("render.fresh", post("/render", mapOf("fresh" to true)))
        check("render.at", post("/render", mapOf("at" to 100)))
        check("touch", post("/touch", mapOf("x" to 10, "y" to 10)))
        check("touch.no-settle", post("/touch", mapOf("x" to 10, "y" to 10, "settle" to false)))
        // D-69. 노드로 겨냥 — 가짜 렌더러의 지금 화면에 같은 줄 둘(목록 아이템) · 하나 · 화면 밖 하나
        fun n(line: Int, top: Int) = prevue.daemon.entity.ViewNode("Row", "Cards.kt", line, 0, top, 100, top + 50)
        fx.renderer.liveTree = prevue.daemon.entity.LiveTree(1080, 1920, listOf(n(3, 100), n(3, 300), n(4, 500), n(5, 3000)))
        check("touch.at", post("/touch", mapOf("at" to "Cards.kt:4")))
        check("touch.at.choose", post("/touch", mapOf("at" to "Cards.kt:3")))
        check("touch.at.offscreen", post("/touch", mapOf("at" to "Cards.kt:5")))
        check("scroll", post("/scroll", mapOf("at" to "Cards.kt:4")))
        check("scroll.until", post("/scroll", mapOf("until" to "Cards.kt:4")))
        check("scroll.until.none", post("/scroll", mapOf("until" to "없는 칸", "screens" to 1)))
        check("type", post("/type", mapOf("text" to "안녕")))
        fx.renderer.typeError = "포커스된 텍스트 필드가 없다"
        check("type.no-field", post("/type", mapOf("text" to "x")))
        fx.renderer.typeError = null
        // 정착은 라이브 세션 루프가 기록한다 — 기다리지 않는 터치 하나를 넣고 루프가 정착시키기를 기다린다.
        runBlocking { uc.touch("tap", 1, 1, "viewer", settle = false) }
        ws.state.awaitState("정착의 기록", 2_000) { it.lastResult is prevue.daemon.domain.model.Settled }
        check("status.settled", get("/status"))
        check("board.settled", get("/board"))
        check("selection.none", get("/selection"))
        check("selection.post", post("/selection", mapOf("file" to f, "line" to 3, "previewId" to "Card0", "node" to "Text", "chain" to listOf("Box", "Text"), "bounds" to mapOf("x" to 0, "y" to 0, "w" to 10, "h" to 10))))
        check("selection", get("/selection"))

        // 뷰어의 의도(D-41). 화면은 state가 그리고 응답은 결과만 짧게 돌려준다.
        check("viewer.state.board", get("/viewer/state"))
        check("viewer.point", post("/viewer/point", mapOf("fileName" to "Cards.kt", "line" to 3, "node" to "Text", "chain" to listOf("Box", "Layout", "Text"), "userChain" to listOf("Box", "Text"), "previewId" to "Card1")))
        check("viewer.point.ambiguous", post("/viewer/point", mapOf("fileName" to "Dup.kt", "line" to 1, "previewId" to "Card0")))
        check("viewer.state.choice", get("/viewer/state"))
        val pick = ((runBlocking { viewer.current() }.choice ?: error("후보 고르기가 안 섰다")).candidates.first())
        check("viewer.choose", post("/viewer/choose", mapOf("path" to pick)))
        check("viewer.point.unknown", post("/viewer/point", mapOf("fileName" to "Nope.kt", "line" to 1)))
        // 답이 없는 의도는 받았다고만 답한다 — 상태를 읽기 전에 Presenter가 다 처리하길 기다린다.
        check("viewer.focus", post("/viewer/focus", mapOf("index" to 0)))
        runBlocking { viewer.drain() }
        check("viewer.state.focus", get("/viewer/state"))
        check("viewer.touch", post("/viewer/touch", mapOf("type" to "tap", "x" to 5, "y" to 5)))
        check("viewer.exit", post("/viewer/exit", emptyMap()))
        runBlocking { viewer.drain() }

        check("focus.on", post("/focus", mapOf("index" to 0, "interactive" to true)))
        // 정착 줄(객체 settle)은 인터랙티브가 켜진 사이의 state 에만 실린다. state 는 최신 값만 내보내 바로 끄면 덮일 수 있다 — 도착을 보고 끈다
        awaitUntil("SSE 의 정착 줄") { events.any { e -> e["type"] == "state" && (e["state"] as? Map<*, *>)?.get("settle") is Map<*, *> } }
        check("card.skipped", post("/card", mapOf("index" to 1, "force" to true)))
        check("focus.off", post("/focus", mapOf("index" to 0, "interactive" to false)))

        check("reload", post("/reload", mapOf("files" to listOf(f))))
        ws.awaitBoardFilled()
        check("wait", post("/wait", mapOf("files" to listOf(f), "timeoutMs" to 5_000)))

        // 인터랙티브 중의 저장은 포커스 카드만 그린다 — wait 는 어느 카드인지와 함께 complete:false 로 답한다(나머지는 저장 전 그림).
        // 나올 때 나머지를 이어 그린다 — 여태 안 그려 다음 저장까지 wait 가 TIMEOUT 이었다.
        post("/focus", mapOf("index" to 0, "interactive" to true))
        post("/reload", mapOf("files" to listOf(f)))
        check("wait.interactive", post("/wait", mapOf("files" to listOf(f), "timeoutMs" to 5_000)))
        post("/focus", mapOf("index" to 0, "interactive" to false))
        ws.awaitBoardFilled()

        fx.compiler.ok = false
        check("reload.compile-failure", post("/reload", mapOf("files" to listOf(f))))
        check("wait.compile-failure", post("/wait", mapOf("files" to listOf(f), "timeoutMs" to 5_000)))
        fx.compiler.ok = true
        post("/reload", mapOf("files" to listOf(f))); ws.awaitBoardFilled()

        val built = prevue.daemon.domain.port.BuildChange(own = listOf(File(fx.root, "app/build/classes")))
        runBlocking { uc.externalBuild(built, done = false) }
        check("wait.build-pending", post("/wait", mapOf("files" to listOf(f), "timeoutMs" to 50)))
        runBlocking { uc.externalBuild(built, done = true) }
        ws.awaitBoardFilled()

        fx.file.setLastModified(System.currentTimeMillis() + 3_600_000)   // 감시에 안 잡힌 저장 — 컴파일이 이 내용을 읽은 적이 없다
        check("wait.timeout", post("/wait", mapOf("files" to listOf(f), "timeoutMs" to 50)))

        // D-54. 다른 파일을 show 하면 새 탭이 열리고 앞 탭은 남는다. 닫으면 직전에 보던 탭으로 돌아간다.
        val other = fx.previewFile("Other")
        check("show.tab", post("/show", mapOf("target" to other.path, "by" to "cli")))
        ws.awaitBoardFilled()
        check("status.tabs", get("/status"))
        check("viewer.tab", post("/viewer/tab", mapOf("key" to fx.file.canonicalPath)))   // 뷰어의 탭 줄 — 답은 받았다는 것뿐이다
        runBlocking { viewer.drain() }
        check("viewer.state.tabs", get("/viewer/state"))
        check("close", post("/close", mapOf("target" to other.path)))
        ws.awaitBoardFilled()
        check("close.unknown", post("/close", mapOf("target" to other.path)))
        check("viewer.close", post("/viewer/close", mapOf("key" to other.canonicalPath)))
        runBlocking { viewer.drain() }
        // U7. 가리킨 파일을 탭으로 — 열 수 없으면 까닭(프리뷰 없음 · 다른 앱의 파일과 그 앱을 띄울 명령)만 답한다.
        check("viewer.open", post("/viewer/open", mapOf("file" to other.path)))
        runBlocking { viewer.drain() }
        ws.awaitBoardFilled()
        check("viewer.open.none", post("/viewer/open", mapOf("file" to java.io.File(fx.srcRoot, "a/Dup.kt").path)))
        val elsewhere = java.io.File(fx.root, "other-app/src/X.kt").apply { parentFile.mkdirs(); writeText("package x\n") }
        check("viewer.open.other", post("/viewer/open", mapOf("file" to elsewhere.path)))

        check("show.fqn", post("/show", mapOf("target" to "demo.CardsKt.Card0")))
        check("board.none", get("/board"))
        check("viewer.state.single", get("/viewer/state"))
        check("viewer.interactive", post("/viewer/interactive", mapOf("on" to true)))
        check("show.error", post("/show", mapOf("target" to "/없는/파일")))
        check("unknown", post("/nope", emptyMap()))

        val daemon = request("GET", "/daemon", null)
        if (daemon.first != 200) misses += "daemon: $daemon"
        val stream = URI("http://127.0.0.1:$port/stream").toURL().openConnection() as HttpURLConnection
        if (stream.contentType?.startsWith("multipart/x-mixed-replace") != true) misses += "stream: ${stream.contentType}"
        stream.disconnect()

        Thread.sleep(100)                                    // 실제 시간 — SSE 는 끝을 알리지 않는다. 마지막 이벤트가 닿을 틈
        misses += compareEvents()

        if (misses.isNotEmpty()) fail<Unit>("계약이 어긋났다 — 의도한 변화면 -PcontractUpdate=true:\n" + misses.joinToString("\n"))
    }

    private fun awaitIndex(): Pair<Int, Any?> {
        eventually { (get("/project-files.json").second as Map<*, *>).isNotEmpty() }
        return get("/project-files.json")
    }

    // --- 대조 ---

    private fun compare(name: String, code: Int, body: Any?): List<String> {
        val actual = mapOf("status" to code, "schema" to schema(body))
        val file = File(dir, "$name.json")
        if (update) { write(file, actual + mapOf("example" to normalize(body))); return emptyList() }
        if (!file.isFile) return listOf("$name: contract/$name.json 이 없다")
        @Suppress("UNCHECKED_CAST")
        val want = Json.parse(file.readText()) as Map<String, Any?>
        val diffs = ArrayList<String>()
        if ((want["status"] as Number).toInt() != code) diffs += "$name: 상태 ${want["status"]} → $code"
        diff("$name:", want["schema"], actual["schema"], diffs)
        return diffs
    }

    /**
     * 이벤트는 같은 종류라도 부른 자리마다 키가 다르다(감시가 부른 컴파일엔 감지·대기 ms). 종류별로 합쳐 본다.
     * state 는 뷰어마다 최신 값만 보낸다(CONFLATED) — 한 단계에만 잠깐 서는 모양(choice · selection · boardNote …)은 다음 단계가 덮으면 오지 않는다.
     * 그래서 state 는 "온 것이 모두 계약 안에 있다"만 본다. 그 모양들은 GET /viewer/state 계약이 정확히 고정하고, SSE 로만 보이는 것(settle)은 도착을 기다린다.
     * ui 는 버리지 않는 채널이라 그대로 정확히 견준다.
     */
    private fun compareEvents(): List<String> {
        val byType = events.groupBy { it["type"].toString() }.toSortedMap()
            .mapValues { (_, evs) -> evs.map { schema(it) }.reduce(::union) }
        val file = File(dir, "events.json")
        @Suppress("UNCHECKED_CAST")
        val want = if (file.isFile) Json.parse(file.readText()) as Map<String, Map<String, Any?>> else null
        // 이 파일의 schema 는 종류별 스키마를 한 번 더 스키마로 만든 것이고, 종류별 스키마 자체는 example 에 있다
        val known = want?.get("example")
        if (update) {
            val state = listOfNotNull(known?.get("state"), byType["state"]).reduce(::union)
            return compare("events", 200, byType + ("state" to state))
        }
        if (want == null || known == null) return listOf("events: contract/events.json 이 없다")
        val diffs = ArrayList<String>()
        diff("events:", want["schema"]!! - "state", schema(byType - "state"), diffs)
        if (byType["state"] == null) diffs += "events:state 빠짐"
        else fits("events:state.", known["state"], byType["state"], diffs)
        return diffs
    }

    /** [got]이 [want] 안에 드는가 — 키 · 타입이 빠지거나 좁은 것은 괜찮고, 없던 키 · 타입만 어긋남이다. */
    private fun fits(at: String, want: Any?, got: Any?, out: MutableList<String>) {
        fun types(v: Any?) = when (v) {
            is String -> v.split('|').toSet()
            is Map<*, *> -> (v["|"] as? String)?.split('|')?.toSet().orEmpty() + "object"
            is List<*> -> setOf("array")
            else -> setOf(v.toString())
        }
        when {
            want is Map<*, *> && got is Map<*, *> -> got.keys.map { it.toString() }.sorted().forEach { k ->
                when {
                    k == "|" -> fits(at + "|", want["|"] ?: "", got["|"], out)
                    k !in want -> out += "$at$k 새로 생김 (${got[k]})"
                    else -> fits("$at$k.", want[k], got[k], out)
                }
            }
            want is List<*> && got is List<*> -> if (got.single() != "empty") {
                if (want.single() == "empty") out += "${at}[] 새로 생김 (${got.single()})" else fits("$at[].", want.single(), got.single(), out)
            }
            else -> (types(got) - types(want) - "empty").takeIf { it.isNotEmpty() }?.let { out += "${at.removeSuffix(".")} 새 타입 $it" }
        }
    }

    private fun diff(at: String, want: Any?, got: Any?, out: MutableList<String>) {
        if (want is Map<*, *> && got is Map<*, *>) {
            (want.keys + got.keys).map { it.toString() }.sorted().distinct().forEach { k ->
                when {
                    k !in got -> out += "$at$k 빠짐"
                    k !in want -> out += "$at$k 새로 생김 (${got[k]})"
                    else -> diff("$at$k.", want[k], got[k], out)
                }
            }
        } else if (want is List<*> && got is List<*> && want.size == 1 && got.size == 1) diff("$at[].", want[0], got[0], out)
        else if (want != got) out += "${at.removeSuffix(".")} ${Json.str(want)} → ${Json.str(got)}"
    }

    /**
     * 값 → 타입. 객체는 키별로, 배열은 원소의 합집합 하나로. 타입이 갈리면 `null|string`처럼 이름순으로 잇는다.
     * 객체가 어떤 자리에서는 스칼라(대개 null)면 그 스칼라 타입을 객체의 `|` 키에 둔다.
     */
    private fun schema(v: Any?): Any = when (v) {
        null -> "null"
        is String -> "string"
        is Boolean -> "boolean"
        is Number -> "number"
        is Map<*, *> -> v.entries.associate { it.key.toString() to schema(it.value) }.toSortedMap()
        is List<*> -> listOf(v.map { schema(it) }.reduceOrNull(::union) ?: "empty")
        else -> v.javaClass.simpleName
    }

    private fun union(a: Any, b: Any): Any = when {
        a == b -> a
        a is Map<*, *> && b is Map<*, *> -> (a.keys + b.keys).associate { k ->
            k.toString() to (if (k in a && k in b) union(a[k]!!, b[k]!!) else (a[k] ?: b[k])!!)
        }.toSortedMap()
        a is List<*> && b is List<*> -> listOf(union(a.single()!!, b.single()!!))
        a is String && b is String -> (a.split('|') + b.split('|')).distinct().sorted().joinToString("|")
        a is Map<*, *> && b is String -> union(a, mapOf("|" to b))
        a is String && b is Map<*, *> -> union(mapOf("|" to a), b)
        else -> error("합칠 수 없는 스키마: $a / $b")
    }

    /** 예시에서 매번 바뀌는 것을 걷는다 — 문서로 읽힐 것이라 diff가 시끄러우면 안 된다. */
    private fun normalize(v: Any?): Any? = when (v) {
        is String -> v.replace(fx.root.path, "<repo>").replace(fx.root.parent, "<tmp>").replace(fx.root.name, "<repo-name>").replace(Regex("""\?t=\d+"""), "?t=<t>")
            .replace(Regex("""\d{4}-\d\d-\d\dT[\d:.]+Z"""), "<at>").replace("127.0.0.1:$port", "127.0.0.1:<port>")
            .replace(Regex("""\b\d\d:\d\d:\d\d\b"""), "<hh:mm:ss>").replace(Regex("""\b\d+(ms|(\.\d+)?s)\b"""), "<took>")
        is Map<*, *> -> v.entries.associate { (k, x) ->
            normalize(k).toString() to if (x is Number && x.toLong() >= 0 && k in VOLATILE) 0 else normalize(x)
        }
        is List<*> -> v.take(3).map { normalize(it) }
        is Number -> if (v == port.toLong()) "<port>" else v
        else -> v
    }

    private fun write(f: File, v: Any?) { f.parentFile.mkdirs(); f.writeText(pretty(v, "") + "\n") }

    private fun pretty(v: Any?, ind: String): String = when (v) {
        is Map<*, *> -> if (v.isEmpty()) "{}" else v.entries.joinToString(",\n", "{\n", "\n$ind}") { (k, x) -> "$ind  ${Json.str(k.toString())}: ${pretty(x, "$ind  ")}" }
        is List<*> -> if (v.isEmpty()) "[]" else v.joinToString(",\n", "[\n", "\n$ind]") { "$ind  ${pretty(it, "$ind  ")}" }
        else -> Json.str(v)
    }

    // --- HTTP ---

    private fun get(path: String) = request("GET", path, null)
    private fun post(path: String, body: Map<String, Any?>) = request("POST", path, Json.str(body))

    private fun request(method: String, path: String, body: String?): Pair<Int, Any?> {
        val c = URI("http://127.0.0.1:$port$path").toURL().openConnection() as HttpURLConnection
        c.requestMethod = method
        if (body != null) { c.doOutput = true; c.outputStream.use { it.write(body.toByteArray(UTF_8)) } }
        val code = c.responseCode
        val text = (if (code < 400) c.inputStream else c.errorStream)?.use { it.readBytes().toString(UTF_8) }.orEmpty()
        c.disconnect()
        return code to (if (text.isBlank()) null else Json.parse(text))
    }
}

/** 실행마다 달라지는 측정값. 고정값(`atMs` · `gapMs` · `heapMaxMb`)과 음수 표지(`firstChangeMs: -1`)는 그대로 둔다. */
private val VOLATILE = setOf(
    "bootstrapMs", "burstMs", "coldMs", "encodeMs", "renderMs", "taskMs", "tickMs", "totalMs", "waitedMs", "ms",
    "heapUsedMb", "version", "mtime",
)
