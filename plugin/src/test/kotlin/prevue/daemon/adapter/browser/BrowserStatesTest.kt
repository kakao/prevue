package prevue.daemon.adapter.browser

import prevue.daemon.entity.phrase
import prevue.daemon.entity.lines
import java.io.File
import java.time.ZoneOffset
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.model.StaleReason
import prevue.daemon.entity.Verbatim
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.port.RenderOutput
import prevue.daemon.domain.model.BoardFill
import prevue.daemon.domain.model.BoardView
import prevue.daemon.domain.model.CardView
import prevue.daemon.domain.model.EngineStats
import prevue.daemon.domain.model.LastResult
import prevue.daemon.domain.model.ModuleInfo
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.SaveTiming
import prevue.daemon.domain.model.Settled
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.Shot
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.model.Status
import prevue.daemon.domain.model.Vacancy
import prevue.daemon.domain.model.TabView
import prevue.daemon.domain.model.Work

/** `Status` → 화면 상태. 스레드도 가짜 포트도 없이 값 하나로 판정한다. */
class BrowserStatesTest {
    private val side = ViewerSide(streamStamp = 22, stillStamp = 11)

    private fun build(s: Status, v: ViewerSide = side, zone: java.time.ZoneId = java.time.ZoneId.systemDefault()): BrowserState = BrowserStates.build(s, v, 7, zone)

    // U8 · H7 — 확장자는 싣지 않고, 모듈은 이름이 겹칠 때만, FQN 탭은 함수 · 파일. 툴팁은 저장소 기준 경로.
    @Test fun `탭 이름 — 겹칠 때만 모듈을 붙인다`() {
        val r = "/r/wt-a"
        val tabs = listOf(
            TabView("$r/feature/a/Screen.kt", File("$r/feature/a/Screen.kt"), null, ":feature:a", active = true, stale = false),
            TabView("$r/core/ui/Screen.kt", File("$r/core/ui/Screen.kt"), null, ":core:ui", active = false, stale = true),
            TabView("$r/core/ui/Card.kt", File("$r/core/ui/Card.kt"), null, ":core:ui", active = false, stale = false),
            TabView("demo.CardKt.CardPreview", File("$r/core/ui/Card.kt"), "demo.CardKt.CardPreview", ":core:ui", active = false, stale = false),
            // `prevue show <FQN>`의 탭 — 파일이 없고 열쇠가 곧 FQN이다.
            TabView("demo.CardKt.Other", null, "demo.CardKt.Other", "", active = false, stale = false),
        )
        val chips = build(status().copy(tabs = tabs)).tabs
        assertEquals(listOf("Screen", "Screen", "Card", "CardPreview", "Other"), chips.map { it.name })
        assertEquals(listOf("", "", "", " · Card", ""), chips.map { it.dim })
        assertEquals(listOf("feature:a", "core:ui", null, null, null), chips.map { it.module })
        assertEquals("core/ui/Card.kt\ndemo.CardKt.CardPreview", chips[3].title)
        assertEquals("demo.CardKt.Other", chips[4].title)
        assertEquals(listOf(true, false, false, false, false), chips.map { it.active })
        assertTrue(chips[1].stale)
    }

    // D-62 — 한 장뿐인 함수도 묶음이고, 함수 이름은 머리가 한 번만 갖는다. 이름표는 name= 뿐이다.
    @Test fun `보드 화면 — 함수마다 묶음 하나, 이름표는 name= 만`() {
        val s = build(status(board = board(
            card(0, "A", params = mapOf("name" to "Light")), card(1, "A", params = mapOf("name" to "Dark", "fontScale" to "1.5")),
            card(2, "B"), card(3, "C", paramIndex = 1, paramCount = 3), card(4, "C", params = mapOf("name" to "x"), paramIndex = 2, paramCount = 3),
        )))
        assertEquals(BrowserState.Screen.BOARD, s.screen)
        assertEquals(7, s.version)
        val groups = s.board!!.groups
        assertEquals(listOf("A", "B", "C"), groups.map { it.name })
        assertEquals(listOf(listOf("Light", "Dark"), listOf(""), listOf("#1", "x · 2")), groups.map { g -> g.cards.map { it.label } })
        assertEquals("fontScale=1.5", groups[0].cards[1].args)
        assertEquals("5 previews · Screen.kt", s.boardNote?.text)
        assertNull(s.focus)
        assertNull(s.error?.text)
    }

    @Test fun `같은 이름도 떨어져 오면 다른 묶음이다 — 경계는 이름이 바뀌는 자리`() {
        val groups = build(status(board = board(card(0, "A"), card(1, "B"), card(2, "A")))).board!!.groups
        assertEquals(listOf("A", "B", "A"), groups.map { it.name })
    }

    // 묶음 배율(D-62)의 입력. 배율은 창 폭에 달려 뷰어가 정하고, 데몬은 그림의 dp 크기만 싣는다.
    @Test fun `카드의 dp 크기 — 그렸으면 PNG ÷ 밀도, 그리기 전이면 인자, 내용 크기는 모른다`() {
        val (drawn, declared, spec, unknown, named) = build(status(board = board(
            card(0, "A", width = 1079, height = 2339),
            card(1, "B", rendered = false, params = mapOf("widthDp" to "360", "heightDp" to "900")),
            card(2, "C", rendered = false, params = mapOf("device" to "spec:width=1280dp,height=800dp,dpi=240")),
            card(3, "D", rendered = false),
            card(4, "E", width = 1080, height = 2340, params = mapOf("device" to "id:pixel_5")),
        ))).board!!.groups.flatMap { it.cards }
        assertEquals(411.05 to 891.05, drawn.widthDp to drawn.heightDp)
        assertFalse(drawn.dpGuess)
        assertEquals(360.0 to 900.0, declared.widthDp to declared.heightDp)
        assertEquals(1280.0 to 800.0, spec.widthDp to spec.heightDp)
        assertEquals(null to null, unknown.widthDp to unknown.heightDp)
        // 이름 붙은 기기는 밀도를 몰라 기본 420 으로 짐작한다 — 그렇다고 표시한다.
        assertEquals(411.43 to 891.43, named.widthDp to named.heightDp)
        assertTrue(named.dpGuess)
    }

    @Test fun `실패한 렌더의 0 크기는 모르는 크기다 — 0×0dp 칸을 만들지 않는다`() {
        val failed = build(status(board = board(
            card(0, "A", ok = false, drawn = false, failure = FailureKind.EXCEPTION, width = 0, height = 0),
        ))).board!!.groups.single().cards.single()
        assertEquals(emptyList<CardSpec>(), failed.specs)
        assertNull(failed.widthDp)
    }

    @Test fun `카드 — 그렸으면 크기와 시간, 옛 세대면 옛 그림, 실패면 종류와 메시지`() {
        val s = build(status(board = board(
            card(0, "A", drawn = true, stale = true),
            card(1, "B", ok = false, failure = FailureKind.DI, message = "Hilt 필요\n둘째 줄"),
            card(2, "C", rendered = false),
        )))
        val (a, b, c) = s.board!!.groups.flatMap { it.cards }
        assertEquals("100×200 · 30ms · old image", a.meta?.text)
        assertEquals("/A.png?t=5", a.imageUrl)
        assertTrue(a.stale)
        assertEquals("Needs dependency injection\nHilt 필요\n둘째 줄", b.failure?.text)
        assertEquals(1, s.board!!.groups[1].failed)
        assertNull(c.failure?.text); assertNull(c.meta?.text); assertFalse(c.stale)
    }

    @Test fun `인터랙티브 — 보드의 포커스 장이 한 장 화면이 되고, 들어가는 중에는 스트림 주소를 내지 않는다`() {
        val st = status(board = board(card(0, "A"), card(1, "B"), focus = 1), interactive = true, focusAttachedAt = 22)
        val s = build(st, side.copy(streamStamp = 99))
        assertEquals(BrowserState.Screen.FOCUS, s.screen)
        assertEquals(FocusScreen("B", interactive = true, fromBoard = true, imageUrl = "/B-0.png?t=11", treeUrl = "/B-0.viewinfo.json?t=11", streamUrl = "/stream?t=22",
            pxPerDp = 420.0 / 160, name = null, fn = "B"), s.focus)
        assertNull(build(st.copy(focusAttachedAt = null)).focus!!.streamUrl)
    }

    @Test fun `미리 그린 칸 — 원래 크기도 뷰어 열쇠와 dp를 싣는다`() {
        fun posture(id: String, params: Map<String, String>, w: Int, h: Int) =
            Shot(RenderOutput(true, PreviewSpec("com.x.B", "B@$id", params, null, 0), File("/o/B@$id-0.png"), null, w, h, 10, 20, "", null, null, freshLoader = false), null, 0, "posture", 7)
        val st = status(board = board(card(0, "A"), card(1, "B"), focus = 1), interactive = true, focusAttachedAt = 22).copy(
            postures = mapOf(
                ScreenSize.Original to posture("original", emptyMap(), 1050, 2100),
                ScreenSize.PRESETS[0] to posture("narrow", mapOf("widthDp" to "320", "heightDp" to "640"), 840, 1680),
            ),
        )
        val json = build(st).toJson()["focus"] as Map<*, *>
        val sizes = (json["postures"] as List<*>).map { (it as Map<*, *>)["size"] }
        assertEquals(mapOf("kind" to "original", "preset" to "original", "widthDp" to 400.0, "heightDp" to 800.0), sizes[0])
        assertEquals(mapOf("kind" to "preset", "preset" to "narrow", "widthDp" to 320, "heightDp" to 640), sizes[1])
    }

    @Test fun `한 장의 밀도는 포커스 카드의 기기에서 — 이름 붙은 기기는 모른다`() {
        val dpi = status(board = board(card(0, "A"), card(1, "B", params = mapOf("device" to "spec:width=1280dp,height=800dp,dpi=240")), focus = 1), interactive = true)
        assertEquals(1.5, build(dpi).focus!!.pxPerDp)
        val named = status(board = board(card(0, "A", params = mapOf("device" to "id:pixel_5"))), interactive = true)
        assertNull(build(named).focus!!.pxPerDp)
    }

    @Test fun `FQN 단건 — 한 장 화면이고 인터랙티브는 화면 사정이 정한다`() {
        val st = status(preview = spec("A"))
        val off = build(st)
        assertEquals(BrowserState.Screen.FOCUS, off.screen)
        assertEquals("A-0", off.header.title)
        assertFalse(off.focus!!.fromBoard)
        assertNull(off.focus!!.streamUrl)
        assertEquals("/stream?t=22", build(st, side.copy(singleInteractive = "A")).focus!!.streamUrl)
        assertNull(build(st, side.copy(singleInteractive = "B")).focus!!.streamUrl)
    }

    // D-63. 탭 0개는 오류가 아니라 시작 화면이다 — 마지막 탭을 닫아도 데몬의 기록(status.last · 낡음)은 남지만 화면에는 싣지 않는다.
    @Test fun `빈 화면 — 오류가 아니고 지난 렌더의 알약 재료를 싣지 않는다`() {
        val last = ShowResult(Shot(out(spec("A"), ok = false, failure = FailureKind.TIMEOUT), compile(80), 1200, "agent", 1), emptyMap())
        val stale = mapOf("compile" to StaleReason(emptyList(), "컴파일이 실패했다", "고친다", "t"))
        val s = build(status(last = last, stale = stale, by = "agent", at = "2026-10-04T01:02:03Z"))
        assertEquals(BrowserState.Screen.EMPTY, s.screen)
        assertNull(s.error?.text)
        assertNull(BrowserState.EMPTY.error?.text)
        assertNull(s.boardNote?.text)
        assertEquals(emptyList<TimingPart>(), s.timing.plain())
        assertEquals(emptyList<StaleRow>(), s.stale)
        assertNull(s.who?.text)
        assertFalse(s.busy)
    }

    // 탭은 있는데 그 파일이 지워졌거나 프리뷰를 잃었다 — 시작 화면(탭 0개)과 가르고, 지난 렌더의 알약 재료는 싣지 않는다.
    @Test fun `빈 탭 — 그 파일의 까닭을 한 줄로 싣는다`() {
        val f = java.io.File("/r/wt-a/app/src/main/kotlin/MainActivity.kt")
        fun tab(why: Vacancy) = TabView(f.path, f, null, ":app", active = true, stale = false, vacant = why)
        val s = build(status(tabs = listOf(tab(Vacancy.NO_PREVIEWS)), by = "agent", at = "2026-10-04T01:02:03Z"))
        assertEquals(BrowserState.Screen.VACANT, s.screen)
        assertEquals("MainActivity.kt has no @Preview", s.vacant?.text)
        assertEquals("MainActivity.kt", s.header.title)
        assertNull(s.who?.text)
        assertEquals("MainActivity.kt was deleted", build(status(tabs = listOf(tab(Vacancy.DELETED)))).vacant?.text)
        assertNull(build(status()).vacant?.text)
    }

    @Test fun `머리말 — 워크트리를 가르게 탭 제목에 저장소 끝을 앞세운다`() {
        val h = build(status(board = board(card(0, "A")))).header
        assertEquals(Header("Screen.kt", "wt-a · Screen.kt", "/r/", "wt-a", "app", "debug", "/r/wt-a"), h)
    }

    @Test fun `머리말과 탭은 KMP 여부와 소스 세트를 데몬이 정한 대로 싣는다`() {
        val f = File("/r/wt-a/feature/a/src/commonMain/kotlin/Screen.kt")
        val tab = TabView(f.path, f, null, ":feature:a", active = true, stale = false, sourceSet = "commonMain")
        val s = build(status(board = board(card(0, "A")), tabs = listOf(tab)).let {
            it.copy(kmp = true, module = it.module.copy(sourceSet = "commonMain"))
        })
        assertEquals("commonMain", s.header.sourceSet)
        assertTrue(s.header.kmp)
        assertEquals("commonMain", s.tabs.single().sourceSet)
        val android = build(status(board = board(card(0, "A")))).header
        assertNull(android.sourceSet)
        assertFalse(android.kmp)
    }

    @Test fun `머리말의 브랜치는 Presenter가 읽은 것을 그대로 싣는다`() {
        assertEquals("feature/x", build(status(), side.copy(branch = "feature/x")).header.branch)
        assertNull(build(status()).header.branch)
    }

    @Test fun `진행 문장이 실패 한 줄보다, 실패 한 줄이 장 수보다 앞선다`() {
        val st = status(board = board(card(0, "A")))
        val failed = ShowResult(Shot(out(spec("A"), ok = false, failure = FailureKind.TIMEOUT, message = "느리다\n둘째"), null, 100, "agent", 1), emptyMap())
        assertEquals("Rendering…", build(st.copy(work = rendering(), lastShown = failed)).boardNote?.text)
        assertTrue(build(st.copy(work = rendering())).busy)
        assertEquals("Render timed out — 느리다", build(st.copy(lastShown = failed)).boardNote?.text)
        assertEquals("Compile failed — 첫 줄", BrowserStates.failNote("COMPILE", Verbatim("첫 줄\n둘째")).text)
        assertEquals("NEW — ", BrowserStates.failNote("NEW", null).text)
    }

    @Test fun `누가 언제 — 시각은 주어진 시간대로 읽는다`() {
        val st = status(board = board(card(0, "A"), card(1, "B")))
        val s = build(st.copy(shownBy = "agent", shownAt = "2026-10-04T01:02:03Z"), zone = ZoneOffset.UTC)
        assertEquals("agent · 01:02:03 · 2 previews", s.who?.text)
        assertNull(build(st).who?.text)
    }

    @Test fun `낡음 — 파일 이름만 모으고 비어 있는 문장은 뺀다`() {
        val s = build(status(board = board(card(0, "A")), stale = mapOf(
            "build" to StaleReason(listOf("/r/a/X.kt", "/r/b/X.kt", "/r/Y.kt"), "밖에서 빌드됐다", "", "t"),
            "compile" to StaleReason(emptyList(), "컴파일 실패", "고친다", "t", message = "e: 오류"),
        )))
        assertEquals(listOf("⚠ 밖에서 빌드됐다" to "X.kt, Y.kt", "⚠ 컴파일 실패" to "e: 오류 · 고친다"),
            s.stale.map { r -> r.head.text to r.why.joinToString(" · ") { it.text } })
    }

    @Test fun `한 장 화면의 실패와 걸린 시간 — 저장의 첫 장이 1초를 넘으면 표시한다`() {
        val failed = ShowResult(Shot(out(spec("A"), ok = false, failure = FailureKind.TIMEOUT, message = "느리다"), compile(80), 1200, "agent", 1), emptyMap())
        val s = build(status(preview = spec("A"), last = failed))
        assertEquals("Render timed out\n느리다", s.error?.text)
        assertEquals(listOf(TimingPart("Compile", 80, false), TimingPart("Task", 10, false), TimingPart("Render", 20, false),
            TimingPart("First", 1200, true, "1.2s", head = true)), s.timing.plain())
        // 다른 프리뷰의 실패는 이 화면의 것이 아니다.
        assertNull(build(status(preview = spec("B"), last = failed)).error?.text)

        val cf = ReloadResult.CompileFailed(spec("A"), compile(90, ok = false, messages = "e: x"), emptyMap(), totalMs = 300, by = "watch", timing = null)
        val c = build(status(preview = spec("A"), last = cf))
        assertEquals("Compile failed\ne: x", c.error?.text)
        assertEquals(listOf(TimingPart("Compile", 90, false), TimingPart("Total", 300, false, head = true)), c.timing.plain())
        // 컴파일 실패의 합계도 저장 기준이다 — 640줄을 넘는 파일이면 2초.
        assertTrue(build(status(preview = spec("A"), last = cf.copy(totalMs = 1500))).timing.plain().last().over)
        assertFalse(build(status(preview = spec("A"), last = cf.copy(totalMs = 1500, lines = 700))).timing.plain().last().over)
        // 감시 저장이면 합계는 성공의 첫 장과 같은 저장 → 화면이다 — 줄에 든 뒤의 시간만이면 위의 감지 · 대기 줄보다 작았다.
        val watched = build(status(preview = spec("A"), last = cf.copy(totalMs = 369, timing = SaveTiming(95, 5)))).timing.plain()
        assertEquals(listOf("Detect", "Wait", "Compile", "Total"), watched.map { it.label.text })
        assertEquals(TimingPart("Total", 469, false, head = true), watched.last())
        assertTrue(build(status(preview = spec("A"), last = cf.copy(totalMs = 950, timing = SaveTiming(95, 0)))).timing.plain().last().over)
    }

    // ---------- D-63 알약 — 보드가 다 찰 때까지 n/N, ✓ 는 첫 장, 주황은 이벤트별 ----------

    @Test fun `보드가 다 찰 때까지 바쁘고 알약은 채운 장 수를 말한다`() {
        val filling = status(board = board(card(0, "A"), card(1, "B", stale = true), card(2, "C", rendered = false)))
        val s = build(filling)
        assertTrue(s.busy)
        assertEquals("1/3", s.boardNote?.text)
        // 실패한 장도 이번 세대의 결과다 — 센다.
        val done = build(status(board = board(card(0, "A"), card(1, "B", ok = false, failure = FailureKind.DI))))
        assertFalse(done.busy)
        assertEquals("2 previews · Screen.kt", done.boardNote?.text)
        // 그리는 중이면 첫 장부터 장 수가 말하고, 컴파일은 무엇을 하는지가 앞선다.
        assertEquals("1/3", build(filling.copy(work = rendering())).boardNote?.text)
        assertEquals("Compiling… X.kt", build(filling.copy(work = Work.Compiling(listOf(File("X.kt")), "agent"))).boardNote?.text)
    }

    // 인터랙티브면 채우기가 멈춘다(사람이 만지는 동안 다른 카드를 그리지 않는다) — 그때 돌면 스피너가 영영 남는다.
    @Test fun `인터랙티브 중에는 덜 찬 보드로 바쁘지 않다`() {
        val st = status(board = board(card(0, "A"), card(1, "B", stale = true)), interactive = true)
        assertFalse(build(st).busy)
    }

    @Test fun `저장의 첫 장은 저장 → 화면이고 보드 시간은 3초를 넘으면 표시한다`() {
        val save = ShowResult(Shot(out(spec("A"), ok = true), compile(480), 600, "watch", 1), emptyMap(), timing = SaveTiming(113, 0), saveToScreenMs = 713, startedAtMs = SINCE)
        val st = status(board = board(card(0, "A")), last = save)
        val s = build(st.copy(boardFill = fill(25, 3060)))
        assertEquals(listOf("Detect", "Compile", "Task", "Render", "First", "Board of 25"), s.timing.plain().map { it.label.text })
        val head = s.timing.plain().single { it.head }
        assertEquals("713ms", head.text)
        assertFalse(head.over)
        assertEquals(TimingPart("Board of 25", 3060, true, "3.06s"), s.timing.plain().last())
        assertFalse(build(st.copy(boardFill = fill(25, 2900))).timing.plain().any { it.over })
        // 대기가 있었으면 그것도 한 줄이다.
        assertEquals("Wait", build(shownAs(st, save.copy(timing = SaveTiming(100, 40)))).timing.plain()[1].label.text)
        // 보드 시간은 그 렌더를 부른 일의 것만이다 — 기점이 다르면 지난 일의 채우기다.
        assertTrue(build(st.copy(boardFill = BoardFill(SINCE + 1, 2900, 25))).timing.plain().none { it.label.text == "Board of 25" })
    }

    @Test fun `저장의 첫 장 기준은 640줄에서 갈린다`() {
        val save = ShowResult(Shot(out(spec("A"), ok = true), compile(900), 1400, "watch", 1), emptyMap(), saveToScreenMs = 1500)
        val st = status(board = board(card(0, "A")), last = save)
        assertTrue(build(shownAs(st, save.copy(lines = 640))).timing.plain().single { it.head }.over)
        assertFalse(build(shownAs(st, save.copy(lines = 641))).timing.plain().single { it.head }.over)
        assertTrue(build(shownAs(st, save.copy(saveToScreenMs = 2100, lines = 1801))).timing.plain().single { it.head }.over)
    }

    @Test fun `열기 · 탭 옮기기의 첫 장은 1초, 보드는 3초`() {
        val open = ShowResult(Shot(out(spec("A"), ok = true), null, 1100, "viewer", 1), emptyMap(), startedAtMs = SINCE)
        val s = build(status(board = board(card(0, "A")), last = open, fill = fill(3, 2900)))
        assertEquals(TimingPart("First", 1100, true, "1.1s", head = true), s.timing.plain().single { it.head })
        assertFalse(s.timing.plain().last().over)
    }

    // NFR-11 — 데몬이 뜬 뒤 첫 렌더는 5초가 기준이다. 1초 하나로 두면 콜드 첫 열기가 늘 주황이었다.
    @Test fun `콜드는 5초가 기준이고 그 보드에는 기준이 없다`() {
        val open = ShowResult(Shot(out(spec("A"), ok = true), null, 2266, "cli", 1), emptyMap(), startedAtMs = SINCE)
        val st = status(board = board(card(0, "A")), last = open)
        val s = build(shownAs(st, open.copy(coldMs = 3400)).copy(boardFill = fill(25, 4100)))
        assertEquals(TimingPart("Cold", 3400, false, "3.4s", head = true), s.timing.plain().single { it.head })
        assertTrue(s.timing.plain().none { it.label.text == "First" })
        assertFalse(s.timing.plain().any { it.over })
        assertTrue(build(shownAs(st, open.copy(coldMs = 5200))).timing.plain().single { it.head }.over)
    }

    @Test fun `시간 글자 — 1초 아래는 ms, 위는 초`() {
        fun text(ms: Long) = build(status(preview = spec("A"), last = ShowResult(Shot(out(spec("A"), ok = true), null, ms, "cli", 1), emptyMap())))
            .timing.plain().single { it.head }.text
        assertEquals(listOf("999ms", "1s", "1.05s", "3.06s", "12.5s"), listOf(999L, 1000L, 1050L, 3060L, 12500L).map(::text))
        // 초는 10ms 단위로 올린다 — 기준을 조금 넘은 값이 기준 숫자로 찍혀 주황인데 `1s`로 읽히지 않게.
        assertEquals(listOf("1.01s", "1.01s", "1.02s", "2.01s", "3.01s"), listOf(1001L, 1004L, 1011L, 2001L, 3005L).map(::text))
    }

    // 새 일이 첫 장을 내기 전에 남은 시간 줄은 지난 일의 것이다 — 새 보드의 `0/14` 옆에 지난 보드의 `보드 15장`이 섰다.
    @Test fun `새 일이 첫 장을 내기 전에는 시간 줄을 싣지 않는다`() {
        val open = ShowResult(Shot(out(spec("A"), ok = true), null, 300, "viewer", 1), emptyMap(), startedAtMs = SINCE, coldMs = 2160)
        val done = status(board = board(card(0, "A"), card(1, "B")), last = open, fill = fill(15, 2700))
        assertEquals(listOf("Task", "Render", "Cold", "Board of 15"), build(done).timing.plain().map { it.label.text })
        // 컴파일 · 렌더 중 — 알약은 진행 문장이다.
        val compiling = build(done.copy(work = Work.Compiling(listOf(File("A.kt")), "agent")))
        assertTrue(compiling.busy)
        assertEquals(emptyList<TimingPart>(), compiling.timing.plain())
        // 다른 파일을 막 열었다 — 이번 세대의 장이 아직 없다.
        val opened = build(status(board = board(card(0, "X", rendered = false), card(1, "Y", rendered = false)), last = open, fill = fill(15, 2700)))
        assertEquals("0/2", opened.boardNote?.text)
        assertEquals(emptyList<TimingPart>(), opened.timing.plain())
        // 첫 장이 오면 채우는 동안에도 이번 일의 시간이다.
        val first = build(status(board = board(card(0, "X"), card(1, "Y", rendered = false)), last = open))
        assertEquals("1/2", first.boardNote?.text)
        assertEquals(listOf("Task", "Render", "Cold"), first.timing.plain().map { it.label.text })
    }

    // 정착은 알약 시간을 덮지 않는다 — 덮으면 알약이 숨어 팝오버에 닿을 길이 없었다. 계측은 조작 중에만 팝오버 한 줄이다.
    @Test fun `정착 뒤에도 직전 시간이 남고 계측은 조작 중에만 싣는다`() {
        val shown = ShowResult(Shot(out(spec("B"), ok = true), null, 400, "viewer", 1), emptyMap())
        val stats = mapOf<String, Any?>("frames" to 42, "tickMs" to 310)
        val settled = Settled(Shot(out(spec("B"), ok = true), null, 90, "interactive", 2), emptyMap(), stats)
        val focus = status(board = board(card(0, "A"), card(1, "B"), focus = 1), interactive = true, last = settled, shown = shown)
        val s = build(focus)
        assertEquals("400ms", s.timing.plain().single { it.head }.text)
        assertEquals("Settled · frames 42 · tick 310ms", s.settle?.text)
        assertNull(build(focus.copy(interactive = false)).settle?.text)
        // 데몬의 마지막이 정착이고 그 앞에 보여 준 것이 없으면 비운다.
        assertEquals(emptyList<TimingPart>(), build(focus.copy(lastShown = null)).timing.plain())
    }

    // D-63. 제목은 구조 칸이다 — 이름표에서 잘라 쓰면 제공자 묶음에서 번호 `0`만 남았다.
    @Test fun `작업 공간 제목 — 위 name=, 아래 함수 이름과 제공자 번호`() {
        val st = status(board = board(card(0, "A"), card(1, "ForYouScreen", params = mapOf("name" to "foldable"), paramIndex = 2, paramCount = 3), focus = 1), interactive = true)
        val f = build(st).focus!!
        assertEquals("foldable", f.name)
        assertEquals("ForYouScreen · 2", f.fn)
        val plain = build(status(board = board(card(0, "A")), interactive = true)).focus!!
        assertNull(plain.name)
        assertEquals("A", plain.fn)
        // FQN 단건은 `@Preview` 인자 없이 그린다(PreviewLocator.fromFqn) — 이름은 `--param name=`을 줬을 때만 있다.
        val fqn = build(status(preview = spec("A"))).focus!!
        assertNull(fqn.name)
        assertEquals("A", fqn.fn)
        val param = build(status(preview = spec("A").copy(params = mapOf("name" to "Dark")))).focus!!
        assertEquals("Dark", param.name)
        assertEquals("A", param.fn)
    }

    @Test fun `빌드 산출물 갱신 중에는 마지막 성공 보드와 대기 표시를 함께 보인다`() {
        val pending = StaleReason(emptyList(), "갱신 중", "기다린다", "now", pending = true)
        val s = build(status(board = board(card(0, "A")), stale = mapOf("build" to pending)))
        assertTrue(s.busy)
        assertEquals("Updating build outputs…", s.boardNote?.text)
        assertTrue(s.buildPending)
        assertEquals(true, s.toJson()["buildPending"])
        assertTrue(s.stale.isEmpty())
        assertNull(s.board!!.groups.single().cards.single().failure?.text)
        val recovered = build(status(board = board(card(0, "A"))))
        assertFalse(recovered.buildPending)
        assertEquals(s.board, recovered.board)
    }

    @Test fun `빌드 대기 표시가 실제 소스 컴파일 실패를 덮지 않는다`() {
        val pending = StaleReason(emptyList(), "갱신 중", "기다린다", "now", pending = true)
        val failed = ReloadResult.CompileFailed(spec("A"), compile(10, ok = false, messages = "syntax error"), emptyMap(), 10, "test", null)
        val s = build(status(board = board(card(0, "A")), stale = mapOf("build" to pending), last = failed))
        assertTrue(s.boardNote!!.text.contains("Compil"))
    }

    @Test fun `실패 글은 인자를 모두 합쳐 한도에서 자르고 숫자 인자는 숫자로 둔다`() {
        val long = lines(phrase("linkage.persisted", "member" to "m".repeat(1000), "names" to "n".repeat(1000)), "x".repeat(3000))
        val failed = ShowResult(Shot(RenderOutput(false, spec("A"), null, null, 0, 0, 10, 20, "", FailureKind.LINKAGE, long, freshLoader = false),
            null, 100, "agent", 1), emptyMap())
        val error = build(status(preview = spec("A"), last = failed)).error!!
        assertTrue(error.text.length < 1600 + 200, "${error.text.length}")
        val timedOut = ShowResult(Shot(RenderOutput(false, spec("A"), null, null, 0, 0, 10, 20, "", FailureKind.TIMEOUT,
            phrase("render.timedOut", "sec" to 30), freshLoader = false), null, 100, "agent", 1), emptyMap())
        val json = build(status(preview = spec("A"), last = timedOut)).error!!.toJson() as Map<*, *>
        val message = (json["a"] as Map<*, *>)["message"] as Map<*, *>
        assertEquals(30, (message["a"] as Map<*, *>)["sec"])
    }

    // ---------- 값 짓기 ----------

    private fun spec(id: String) = PreviewSpec("com.x.$id", id, emptyMap(), null, 0)

    private fun card(
        index: Int, name: String, params: Map<String, String> = emptyMap(), paramIndex: Int = 0, paramCount: Int = 1,
        rendered: Boolean = true, drawn: Boolean = rendered, ok: Boolean? = if (rendered) drawn else null, stale: Boolean = false,
        failure: FailureKind? = null, message: String? = null, width: Int = 100, height: Int = 200,
    ) = CardView(
        index, previewId = name, fqn = "com.x.$name", name = name, params = params, gen = 0, stale = stale, rendered = rendered,
        paramIndex = paramIndex, paramCount = paramCount, ok = ok, failure = failure, message = message?.let(::Verbatim),
        width = width.takeIf { rendered }, height = height.takeIf { rendered }, artifactRevision = 5,
        image = if (drawn) File("/o/$name.png") else null, tree = null, taskMs = 10, renderMs = 20, phases = null,
    )

    private fun board(vararg cards: CardView, focus: Int = 0) = BoardView(File("/r/wt-a/Screen.kt"), focus, 0, cards.toList(), emptyList())

    private fun out(p: PreviewSpec, ok: Boolean, failure: FailureKind? = null, message: String? = null) =
        RenderOutput(ok, p, null, null, 0, 0, 10, 20, "", failure, message?.let(::Verbatim), freshLoader = false)

    private fun compile(ms: Long, ok: Boolean = true, messages: String = "") = CompileResult(ok, "", messages, ms, emptyList())

    private fun status(
        board: BoardView? = null, preview: PreviewSpec? = null, interactive: Boolean = false,
        stale: Map<String, StaleReason> = emptyMap(), last: LastResult? = null, tabs: List<TabView> = emptyList(),
        focusAttachedAt: Long? = null, shown: LastResult? = last.takeUnless { it is Settled }, fill: BoardFill? = null,
        by: String = "", at: String = "",
    ) = Status(
        module = ModuleInfo("/r/wt-a", ":app", "debug", "app", null, null),
        preview = preview, shownBy = by, shownAt = at, board = board, interactive = interactive, reloadPending = false,
        selection = null, tabs = tabs, renderModules = emptyList(), stale = stale, last = last,
        engine = EngineStats(false, 0, 0, 0, "", "", 0, 0, null, 0, 0), watch = null, lastRenderMs = 0, focusAttachedAt = focusAttachedAt,
        lastShown = shown, boardFill = fill,
    )

    private fun shownAs(s: Status, r: LastResult) = s.copy(last = r, lastShown = r)

    private fun rendering() = Work.Rendering(spec("A"), "agent")

    private fun fill(cards: Int, ms: Long) = BoardFill(SINCE, ms, cards)

    private companion object { const val SINCE = 100L }

    private fun List<TimingPart>.plain() = map { it.copy(label = Verbatim(it.label.text)) }

    @Suppress("FunctionName")
    private fun TimingPart(label: String, ms: Long, over: Boolean, text: String = "${ms}ms", head: Boolean = false) =
        TimingPart(Verbatim(label), ms, over, text, head)

    @Suppress("FunctionName")
    private fun StaleReason(files: List<String>, what: String, remedy: String, since: String, message: String? = null, pending: Boolean = false) =
        StaleReason(files, Verbatim(what), Verbatim(remedy), since, message?.let(::Verbatim), pending)
}
