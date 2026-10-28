package prevue.daemon.domain

import app.cash.turbine.test
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.future.future
import prevue.daemon.domain.model.BoardFill
import prevue.daemon.domain.model.Pointed
import java.io.File
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.domain.port.BuildChange
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.DeviceModel
import prevue.daemon.domain.model.ScreenSize
import org.junit.jupiter.api.assertThrows
import prevue.daemon.domain.model.ExternalResult
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.SkipReason
import prevue.daemon.domain.model.Vacancy
import prevue.daemon.domain.model.WaitResult
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.fake.FakeClock
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace

/** 개발 문서 "되돌리지 말 것" 중 논리인 것들. 조용히 되돌아가도 화면은 대개 멀쩡해 눈으로는 못 잡는다. */
class UseCaseTest {
    private val fx = Fixture()

    @AfterEach fun tearDown() = fx.close()

    private fun opened(clock: FakeClock = FakeClock()): UseCases =
        fx.useCases(clock).also { runBlocking { it.openPreview(fx.file.path, null, emptyMap(), "test") }; it.workspace.awaitBoardFilled() }

    private fun UseCases.save(by: String = "test"): ReloadResult = runBlocking { applySave(listOf(fx.file), by) }

    // 뷰어와 에이전트가 같은 사실을 본다 — 진행(`work`)과 마지막으로 그린 쪽(`shownBy`)은 status 하나에서 나온다.
    @Test fun `저장하는 동안 status는 컴파일 중이고 끝나면 저장한 쪽이 마지막으로 그린 쪽이다`() {
        val uc = opened()
        assertEquals("test", uc.readStatus().shownBy)
        val during = CopyOnWriteArrayList<Any?>()
        fx.compiler.fails = { _, _ -> during += uc.readStatus().work; false }
        uc.save(by = "watch")
        assertEquals(listOf(prevue.daemon.domain.model.Work.Compiling(listOf(fx.file), "watch")), during.distinct())
        val after = uc.readStatus()
        assertEquals("watch", after.shownBy)
        assertEquals(null, after.work)
        assertTrue(after.lastShown is prevue.daemon.domain.model.ShowResult)
    }

    @Test fun `컴파일이 실패해도 진행을 걷고 실패가 마지막으로 보여 준 것이다`() {
        val uc = opened()
        fx.compiler.ok = false
        uc.save(by = "watch")
        val s = uc.readStatus()
        assertEquals(null, s.work)
        assertTrue(s.lastShown is ReloadResult.CompileFailed)
        assertEquals("watch", s.shownBy)
    }
    private fun UseCases.boardFills(): Flow<BoardFill> = workspace.state.map { it.boardFill }.distinctUntilChanged().filterNotNull()
    private fun <T> async(block: suspend () -> T): CompletableFuture<T> = CompletableFuture.supplyAsync { runBlocking { block() } }
    /** 첫 멈춤(줄 · 기다림)까지 이 스레드에서 가고 돌아온다 — 돌아오면 줄에 섰거나 첫 판단을 마쳤다. */
    private fun <T> queued(block: suspend () -> T): CompletableFuture<T> = fx.scope.future(start = CoroutineStart.UNDISPATCHED) { block() }

    // 생성은 저장이 아니라(D-56) 새 파일은 누가 컴파일하기 전까지 오버레이에 없다. 저장한 파일이 그것을 부르면 `unresolved reference`였다.
    @Test fun `저장은 아직 컴파일 안 된 새 파일을 함께 싣고 실패하면 다음에 다시 싣는다`() {
        val uc = opened()
        val ws = uc.workspace
        val fresh = java.io.File(fx.srcRoot, "demo/Fresh.kt").apply { writeText("package demo\nfun fresh() = 1\n") }
        ws.noteCreated(listOf(fresh), emptyList())

        fx.compiler.ok = false
        fx.compiler.compiled.clear()
        uc.save()
        assertEquals(setOf(fx.file, fresh.canonicalFile), fx.compiler.compiled.flatten().toSet())
        assertEquals(setOf(fresh.canonicalPath), ws.now.newFiles)

        fx.compiler.ok = true
        uc.save()
        assertTrue(ws.now.newFiles.isEmpty())
        fx.compiler.compiled.clear()
        uc.save()
        assertEquals(listOf(fx.file), fx.compiler.compiled.flatten(), "한 번 실은 새 파일은 다시 싣지 않는다 — 그 뒤의 수정은 저장으로 온다")

        ws.noteCreated(listOf(fresh), emptyList()); ws.noteCreated(emptyList(), listOf(fresh))
        assertTrue(ws.now.newFiles.isEmpty(), "지운 새 파일은 싣지 않는다")
    }

    private fun watched(): UseCases = opened().also { runBlocking { it.observeSourceChanges.noteBehindBuild() } }

    @Test fun `감시가 시작될 때 빌드 뒤로 바뀐 소스는 새 파일처럼 다음 컴파일에 함께 실린다`() {
        val before = java.io.File(fx.srcRoot, "demo/Shape.kt").apply { writeText("package demo\nval blob = 1\n") }
        fx.compiler.built = mapOf(":app" to before.lastModified() - 60_000)
        val uc = watched()
        assertTrue(before.canonicalPath in uc.workspace.now.newFiles)
        fx.compiler.needs = setOf(before.canonicalFile)
        fx.compiler.compiled.clear()

        val r = uc.save()

        assertTrue(r is ReloadResult.Rendered, "$r")
        assertEquals(1, fx.compiler.compiled.size, "한 번에 함께 싣는다 — 실패하고 다시 하지 않는다")
        assertTrue(before.canonicalFile in fx.compiler.compiled.single())
        assertTrue(before.canonicalPath !in uc.workspace.now.newFiles)
    }

    @Test fun `빌드 시각을 모르면 소스를 새 파일로 올리지 않는다`() {
        val before = java.io.File(fx.srcRoot, "demo/Shape.kt").apply { writeText("package demo\nval blob = 1\n") }
        val uc = watched()
        fx.compiler.compiled.clear()
        uc.save()
        assertEquals(listOf(listOf(fx.file)), fx.compiler.compiled.toList())
        assertTrue(before.canonicalPath !in uc.workspace.now.newFiles)
    }

    @Test fun `오류가 함께 실은 새 파일 안에만 났으면 그것을 빼고 다시 해 저장은 그려진다`() {
        val uc = opened()
        val ws = uc.workspace
        val half = java.io.File(fx.srcRoot, "demo/Half.kt").apply { writeText("package demo\n") }.canonicalFile
        ws.noteCreated(listOf(half), emptyList())
        fx.compiler.broken = setOf(half)
        fx.compiler.compiled.clear()

        val r = uc.save()
        assertTrue(r is ReloadResult.Rendered, "$r")
        assertEquals(listOf(listOf(fx.file, half), listOf(fx.file)), fx.compiler.compiled.toList())
        assertTrue(ws.now.newFiles.isEmpty(), "자기 오류로 실패한 새 파일은 더 싣지 않는다 — 고치면 저장으로 온다")
    }

    @Test fun `Gradle이 이미 구운 새 파일은 싣지 않는다`() {
        val uc = opened()
        val ws = uc.workspace
        val built = java.io.File(fx.srcRoot, "demo/Built.kt").apply { writeText("package demo\n"); setLastModified(1_000_000) }
        ws.noteCreated(listOf(built), emptyList())
        fx.compiler.built = mapOf(":app" to 2_000_000L)
        fx.compiler.compiled.clear()
        uc.save()
        assertEquals(listOf(fx.file), fx.compiler.compiled.flatten())
        assertTrue(ws.now.newFiles.isEmpty())
    }

    // ① 태스크가 하나뿐이라 다른 카드를 그리면 사람이 만지던 인터랙션 상태가 통째로 사라진다.
    @Test fun `인터랙티브 중에는 다른 카드를 그리지 않는다`() {
        val uc = opened()
        val ws = uc.workspace
        runBlocking { uc.focusCard(0, on = true, by = "test") }

        val r = runBlocking { uc.drawCard(1, force = true, by = "test") }
        assertEquals(CardResult.Skipped(1, SkipReason.INTERACTIVE), r)

        fx.renderer.shown.clear()
        uc.save()
        Thread.sleep(200)                                    // 부정 확인 — 채우기는 끝을 알리지 않는다. 돌았다면 이 사이에 카드 1·2를 그린다
        assertEquals(listOf(ws.now.board!!.cards[0].spec), fx.renderer.shown.toList())
        assertFalse(ws.now.board!!.cards[1].fresh(ws.now.board!!.gen))
    }

    // ② 채우기가 current를 마지막 카드로 옮겨 놓는다. 저장은 그것이 아니라 사람이 보던 자리(focus)부터 그린다.
    @Test fun `current는 live 태스크이고 reload는 board focus부터 그린다`() {
        val uc = opened()
        val b = uc.workspace.now.board!!
        assertEquals(b.cards.last().spec, uc.workspace.now.current)

        fx.renderer.shown.clear()
        uc.save()
        assertEquals(b.cards[b.focus].spec, fx.renderer.shown.first())
    }

    // 공유 로더의 Compose 디스패처는 앞 태스크가 버린 세션에 걸려 멈춰 있다 — 그 위에서 시계를 밀면 막대가 0 그대로였다(데모 take8).
    @Test fun `render --at 은 자기 로더의 새 태스크에서 시계를 민다`() {
        val uc = opened()
        val p = uc.workspace.now.current!!
        val r = runBlocking { uc.renderAt(1600, "test") }
        assertTrue(r.ok, r.shot.out.message?.text)
        assertEquals(listOf(p), fx.renderer.ownLoaderShown.toList())
    }

    // 보드는 열 때 읽은 인자를 쥐고 있어, 저장으로 바꾼 `widthDp`가 다시 show 하기 전까지 안 들어갔다(2026-10-08 도감 픽스처).
    @Test fun `저장은 프리뷰 인자를 다시 읽어 그 인자로 그린다`() {
        val uc = opened()
        fx.file.writeText(fx.file.readText().replaceFirst("@Preview\nfun Card1", "@Preview(widthDp = 480)\nfun Card1"))
        runBlocking { uc.focusCard(1, on = false, by = "test") }
        fx.renderer.shown.clear()
        uc.save()
        val b = uc.workspace.now.board!!
        assertEquals("480", b.focusCard.spec.params["widthDp"])
        assertEquals("480", fx.renderer.shown.first().params["widthDp"])
    }

    @Test fun `저장으로 프리뷰가 늘거나 줄면 카드 수가 따라가고 포커스는 같은 프리뷰에 남는다`() {
        val uc = opened()
        runBlocking { uc.focusCard(2, on = false, by = "test") }
        val focused = uc.workspace.now.board!!.focusCard.spec.previewId
        fx.file.writeText(fx.file.readText().replaceFirst("@Preview\nfun Card0() {}\n", "") + "@Preview\nfun Card3() {}\n@Preview\nfun Card4() {}\n")
        uc.save()
        val b = uc.workspace.now.board!!
        assertEquals(listOf("Card1", "Card2", "Card3", "Card4"), b.cards.map { it.spec.functionName })
        assertEquals(focused, b.focusCard.spec.previewId)
        assertTrue(b.cards.take(2).all { it.result != null })    // 순번이 밀려도 남은 카드는 그림을 지키고 낡음으로만 보인다
        uc.workspace.awaitBoardFilled()
    }

    // FQN 경로는 애노테이션을 읽지 않아 `widthDp` · `device`를 몰랐다. 소스 파일을 찾아 파일 탭과 같은 spec을 쓴다.
    @Test fun `FQN으로 연 한 장도 애노테이션 인자로 그리고 저장하면 다시 읽는다`() {
        fx.file.writeText(fx.file.readText().replaceFirst("@Preview\nfun Card1", "@Preview(widthDp = 480)\nfun Card1"))
        val uc = fx.useCases()
        runBlocking { uc.openPreview("demo.CardsKt.Card1", null, emptyMap(), "test") }
        assertEquals("480", uc.workspace.now.current!!.params["widthDp"])

        fx.file.writeText(fx.file.readText().replace("widthDp = 480", "widthDp = 600"))
        fx.renderer.shown.clear()
        uc.save()
        assertEquals("600", fx.renderer.shown.first().params["widthDp"])
        assertEquals(null, uc.workspace.now.activeTabOrNull()!!.file)
    }

    // 제공자의 값은 다른 파일(샘플 데이터)에서 오기 쉽다 — 제공자 파일이 아니라 어느 파일의 저장이든 개수를 다시 센다.
    @Test fun `제공자 값 개수가 바뀐 저장은 값이 다른 파일에 있어도 카드 수가 따라간다`() {
        File(fx.srcRoot, "demo/Names.kt").writeText("package demo\nclass Names : PreviewParameterProvider<String> { override val values = sampleNames.asSequence() }\n")
        val samples = File(fx.srcRoot, "demo/Samples.kt").apply { writeText("package demo\nval sampleNames = listOf(\"a\", \"b\")\n") }
        fx.file.writeText("package demo\nimport androidx.compose.ui.tooling.preview.Preview\n@Preview\nfun Card0(@PreviewParameter(Names::class) n: String) {}\n")
        fx.renderer.providerValues["demo.Names"] = 2
        val uc = opened()
        assertEquals(2, uc.workspace.now.board!!.cards.size)

        fx.renderer.providerValues["demo.Names"] = 3
        runBlocking { uc.applySave(listOf(samples), "test") }
        assertEquals(3, uc.workspace.now.board!!.cards.size)
        uc.workspace.awaitBoardFilled()
    }

    @Test fun `FQN의 index가 그 함수의 프리뷰 수를 넘으면 첫 장으로 바꾸지 않고 거절한다`() {
        val uc = fx.useCases()
        val e = runCatching { runBlocking { uc.openPreview("demo.CardsKt.Card1", 5, emptyMap(), "test") } }.exceptionOrNull()
        assertTrue(e is IllegalArgumentException, "$e")
    }

    // 소스에 "@Preview" 글자만 남고 프리뷰 함수가 없으면 지운 함수를 그리러 가지 않고 탭을 비운다.
    @Test fun `저장으로 프리뷰 함수가 다 사라지면 글자가 주석에 남아도 탭을 비운다`() {
        val uc = opened()
        fx.file.writeText("package demo\n// @Preview 는 다른 파일로 옮겼다\nval moved = true\nfun Card0() {}\n")
        assertEquals(ReloadResult.NothingShown, uc.save())
        assertEquals(Vacancy.NO_PREVIEWS, uc.workspace.now.activeTabOrNull()!!.vacant)
    }

    // ③ 저장보다 먼저 줄 선 카드가 저장 → 화면에 붙으면 안 된다. 그 카드는 들어가서 저장이 기다리는 것을 보고 물러난다.
    @Test fun `카드 렌더는 기다리는 저장에 양보한다`() {
        val uc = opened()
        val gate = CountDownLatch(1)
        fx.renderer.showGate = gate                          // 카드 0이 줄 안에서 렌더하는 중인 순간을 만든다
        fx.renderer.showEntered.drainPermits()
        val holder = async { uc.drawCard(0, force = true, by = "test") }
        assertTrue(fx.renderer.showEntered.tryAcquire(5, TimeUnit.SECONDS))

        val card = queued { uc.drawCard(1, force = true, by = "test") }   // 카드 1이 저장보다 먼저 줄에 선다
        val reload = queued { uc.applySave(listOf(fx.file), "test") }
        assertTrue(uc.workspace.reloadPending)

        fx.renderer.showGate = null; gate.countDown()
        holder.get(5, TimeUnit.SECONDS)
        assertEquals(CardResult.Skipped(1, SkipReason.RELOAD), card.get(5, TimeUnit.SECONDS))
        assertTrue(reload.get(5, TimeUnit.SECONDS).ok)
    }

    // ④ mtime은 뒤로 갈 수 있다(`cp -p`·체크아웃). mtime만 보면 옛 내용의 컴파일을 이 저장의 것으로 믿는다.
    @Test fun `await는 mtime과 컴파일 시각을 함께 본다`() {
        val uc = opened()
        fx.file.setLastModified(50_000_000)
        uc.save()

        fx.file.setLastModified(40_000_000)                  // 옛 내용이 옛 mtime 그대로 돌아왔다
        val stale = runBlocking { uc.awaitRender(listOf(fx.file), timeoutMs = 20) }
        assertTrue(stale is WaitResult.TimedOut)

        uc.save()
        assertTrue(runBlocking { uc.awaitRender(listOf(fx.file), timeoutMs = 5_000) }.ok)

        // 요청 뒤의 컴파일이 더 새 저장을 읽었으면 이 저장도 들어간 것이다.
        val waiting = queued { uc.awaitRender(listOf(fx.file), timeoutMs = 5_000) }   // 요청 시각(t0)이 먼저 서야 한다
        fx.file.setLastModified(60_000_000)
        uc.save()
        assertTrue(waiting.get(5, TimeUnit.SECONDS).ok)
    }

    // FR-22. 오지 않을 저장을 시간이 다 갈 때까지 기다리지 않는다 — 기다릴 수 없는 것은 바로 거절한다.
    @Test fun `기다릴 수 없는 파일은 기다리지 않고 거절한다`() {
        val idle = fx.useCases()
        val none = runCatching { runBlocking { idle.awaitRender(emptyList(), timeoutMs = 5_000) } }.exceptionOrNull()
        assertTrue(none is IllegalArgumentException && "기다릴 파일이 없다" in none.message!!, "$none")

        val uc = opened()
        val gone = runCatching { runBlocking { uc.awaitRender(listOf(java.io.File(fx.srcRoot, "demo/Gone.kt")), timeoutMs = 5_000) } }.exceptionOrNull()
        assertTrue(gone is IllegalStateException && "파일이 없다" in gone.message!!, "$gone")
        val outside = java.io.File(fx.root, "elsewhere/Out.kt").apply { parentFile.mkdirs(); writeText("package x\n") }
        val out = runCatching { runBlocking { uc.awaitRender(listOf(outside), timeoutMs = 5_000) } }.exceptionOrNull()
        assertTrue(out is IllegalArgumentException && "감시하지 않는 파일" in out.message!! && "Out.kt" in out.message!!, "$out")

        val unwatched = fx.useCases(watchRoots = false)
        val off = runCatching { runBlocking { unwatched.awaitRender(listOf(fx.file), timeoutMs = 5_000) } }.exceptionOrNull()
        assertTrue(off is IllegalArgumentException && "감시가 꺼져 있다" in off.message!!, "$off")
    }

    // NFR-10. 산출물 상한이 화면이 주소를 든 그림을 지우면 카드 자리에 깨진 그림이 남는다.
    @Test fun `조립이 화면이 든 그림을 산출물 상한에서 지킨다`() {
        val uc = opened()
        assertEquals(uc.workspace.now.keepIds(), fx.renderer.protected())
        assertTrue(fx.renderer.protected().isNotEmpty())
    }

    @Test fun `파일 없이 기다리면 보고 있는 보드의 파일을 기다린다`() {
        val uc = opened()
        uc.save()
        val w = runBlocking { uc.awaitRender(emptyList(), timeoutMs = 5_000) }
        assertEquals(fx.file.canonicalFile, (w as WaitResult.BoardDone).file.canonicalFile)
    }

    @Test fun `FQN 단건의 기다림은 그 한 장으로 답한다`() {
        val uc = fx.useCases()
        runBlocking { uc.openPreview("demo.CardsKt.Card0", null, emptyMap(), "test") }
        uc.save()
        val w = runBlocking { uc.awaitRender(listOf(fx.file), timeoutMs = 5_000) }
        assertTrue(w is WaitResult.Single, "$w")
        assertEquals(uc.workspace.now.lastResult, (w as WaitResult.Single).last)
    }

    // ⑤ 컴파일 시각을 먼저 적으면 await가 옛 세대의 카드를 보고 "다 그렸다"고 답한다.
    @Test fun `컴파일 시각은 세대를 올린 뒤에 적는다`() {
        val uc = opened()
        val gate = CountDownLatch(1)
        fx.renderer.codeGate = gate                          // 컴파일은 끝났고 세대는 아직 안 오른 자리
        val reload = async { uc.applySave(listOf(fx.file), "test") }
        assertTrue(fx.renderer.codeEntered.tryAcquire(5, TimeUnit.SECONDS))

        val waiting = queued { uc.awaitRender(listOf(fx.file), timeoutMs = 5_000) }   // 첫 판단까지 하고 돌아온다
        assertFalse(waiting.isDone, "세대가 오르기 전에 await가 답했다")

        gate.countDown()
        val r = waiting.get(5, TimeUnit.SECONDS) as WaitResult.BoardDone
        reload.get(5, TimeUnit.SECONDS)
        assertTrue(r.ok)
        assertEquals(1, r.gen)
    }

    // 밖의 Gradle이 이 모듈을 다시 빌드했다 — 우리가 스스로 닫는다. 닫은 렌더의 응답이 "낡았다"고 말하면 그것을 읽는 에이전트가 속는다.
    @Test fun `밖의 빌드는 끝나면 스스로 닫고 닫은 뒤의 낡음을 싣는다`() {
        val uc = opened()
        val built = BuildChange(own = listOf(java.io.File(fx.root, "app/build/classes")))
        assertEquals(ExternalResult.BuildPending, runBlocking { uc.externalBuild(built, done = false) })
        assertTrue("build" in uc.workspace.now.stale)

        val r = runBlocking { uc.externalBuild(built, done = true) }
        assertTrue(r is ExternalResult.Redrawn && r.result.ok)
        assertFalse("build" in uc.workspace.now.stale)
        assertTrue((r as ExternalResult.Redrawn).result.stale.isEmpty())
        assertEquals(listOf(":app"), fx.compiler.cleared.toList())
    }

    // Q6. 밖의 Gradle이 의존 모듈만 빌드했으면 그 모듈의 오버레이만 버린다 — 앱 쪽 편집은 남는다(성공 기준 5). 그 모듈을 가진 엔진은 하나다(D-38).
    @Test fun `의존 모듈의 빌드는 그 모듈의 오버레이만 버리고 엔진을 새로 받게 한다`() {
        val uc = opened()
        val r = runBlocking { uc.externalBuild(BuildChange(own = listOf(fx.libOut)), done = true) }
        assertTrue(r is ExternalResult.Redrawn)
        assertEquals(listOf(":lib"), fx.compiler.cleared.toList())
        assertEquals(1, fx.renderer.buildChanges)
    }

    // Q7. 파일마다 그 모듈의 인자(모듈명 · friend)로 컴파일한다. 다른 모듈의 인자로 컴파일하면 internal 이름이 어긋난다.
    @Test fun `모듈을 넘는 저장은 모듈마다 의존 먼저 컴파일한다`() {
        val uc = opened()
        assertTrue(runBlocking { uc.applySave(listOf(fx.file, fx.libFile), "test") }.ok)
        assertEquals(listOf(":lib" to listOf(fx.libFile), ":app" to listOf(fx.file)), fx.compiler.compiledBy.toList())
    }

    // 바뀐 함수를 포커스가 안 부르고 다른 카드만 부르면 옛 호출자는 그 카드에서 처음 드러난다. 레이아웃 중의 링크 에러는 타입과 함께 온다.
    @Test fun `보드 카드의 링크 에러도 옛 호출자를 함께 컴파일해 고친다`() {
        val uc = opened()
        fx.compiler.overlay = setOf("lib.ThemeKt")
        fx.compiler.callers = listOf(fx.file)
        fx.renderer.exceptions += "View layout failed\njava.lang.NoSuchMethodError: 'void lib.ThemeKt.Wheel(java.lang.String, androidx.compose.runtime.Composer, int)'"
        val r = runBlocking { uc.drawCard(1, force = true, by = "test") }
        assertTrue(r is CardResult.Drawn && r.shot.out.ok, r.toString())
        assertEquals(listOf(":app" to listOf(fx.file)), fx.compiler.compiledBy.toList())
    }

    // 이슈 #152 — 모듈을 개명한 뒤의 낡은 덤프는 옛 R 을 찾다 터진다. 그냥 EXCEPTION 이면 에이전트가 덤프를 다시 뜰 줄 모른다.
    @Test fun `R 클래스를 못 찾은 렌더는 덤프가 낡았다고 세우고 warmup 을 말한다`() {
        val uc = fx.useCases(FakeClock())
        fx.renderer.exceptions += "java.lang.ClassNotFoundException: com.example.share.common.R\$color\n    at com.example.domain.line.LineResUtils.getLineBgColorId(LineResUtils.kt:62)"
        val r = runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }
        assertEquals(FailureKind.EXCEPTION, r.shot.out.failure)
        val why = r.stale["build-files"]
        assertTrue(why != null && "prevue warmup ${fx.file.path}" in why.remedy.text, r.stale.toString())
    }

    @Test fun `보드 카드가 R 클래스를 못 찾아도 덤프가 낡았다고 세운다`() {
        val uc = opened()
        fx.renderer.exceptions += "java.lang.NoClassDefFoundError: com/foo/LineResUtils\nCaused by: java.lang.ClassNotFoundException: com.foo.R\$string"
        runBlocking { uc.drawCard(1, force = true, by = "test") }
        assertTrue("build-files" in uc.workspace.now.stale)
    }

    @Test fun `R 이 아닌 클래스를 못 찾은 렌더는 낡음이 아니다`() {
        val uc = fx.useCases(FakeClock())
        fx.renderer.exceptions += "java.lang.ClassNotFoundException: com.foo.Rx\$color"
        val r = runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }
        assertTrue(r.stale.isEmpty(), r.stale.toString())
    }

    // 열린 프리뷰가 없을 때 바뀐 리소스 APK를 버리면 다음 show 가 옛 APK로 그리면서 낡음을 말하지 않는다.
    @Test fun `프리뷰가 없을 때의 리소스 · 빌드 파일 변화도 다음 show 가 싣는다`() {
        val uc = fx.useCases(FakeClock())
        val change = BuildChange(resources = listOf(java.io.File(fx.root, "app/x.ap_")), buildFiles = listOf(java.io.File(fx.root, "settings.gradle.kts")))
        assertEquals(ExternalResult.NoPreview, runBlocking { uc.externalBuild(change, done = true) })
        val r = runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }
        assertEquals(setOf("resources", "build-files"), r.stale.keys)
    }

    // Q4. 끌어낸 인자로도(원본으로 메워도) 실패하면 그 모듈의 덤프를 권한다. warmup 에는 파일을 준다 — --module 만이면 cwd 의 저장소를 잡는다.
    @Test fun `끌어낸 인자로 실패하면 그 모듈의 덤프를 권한다`() {
        val uc = opened()
        fx.compiler.derived = setOf(":lib")
        fx.compiler.fails = { m, _ -> m == ":lib" }
        val r = runBlocking { uc.applySave(listOf(fx.libFile), "test") } as ReloadResult.CompileFailed
        assertTrue("prevue warmup ${fx.libFile.path} " in r.compile.hint?.text.orEmpty(), r.compile.hint?.text)
        assertEquals(r.compile.hint, uc.workspace.now.stale.getValue("compile").remedy)
    }

    // Q7. B의 시그니처가 바뀌면 A의 호출자가 옛 클래스로 남는다. 감시하는 모듈 전부에서 찾아 각자 자기 인자로, B 먼저 함께 컴파일한다(성공 기준 2).
    @Test fun `의존 모듈의 시그니처 변경은 다른 모듈의 호출자까지 함께 컴파일한다`() {
        val uc = opened()
        fx.compiler.overlay = setOf("lib.ThemeKt")
        fx.compiler.callers = listOf(fx.file)
        fx.renderer.exceptions += "Exception raised during rendering: 'long lib.ThemeKt.accent(int, androidx.compose.runtime.Composer, int)'"
        val r = runBlocking { uc.applySave(listOf(fx.libFile), "test") }
        assertTrue(r.ok, (r as? ReloadResult.Rendered)?.result?.shot?.out?.message?.text)
        assertEquals(uc.workspace.graph.roots, fx.compiler.callerRoots)
        assertEquals(listOf(":lib" to listOf(fx.libFile), ":lib" to listOf(fx.libFile), ":app" to listOf(fx.file)), fx.compiler.compiledBy.toList())
    }

    // 감시는 데몬과 함께 뜬다 — 첫 show 전의 저장·빌드가 그리거나 낡음을 세우면 안 된다. 거르기는 감시 입구가 아니라 여기다.
    // 리소스 · 빌드 파일은 예외다 — 렌더러가 감시보다 먼저 부트스트랩해 쥐었으므로 그 뒤의 변화는 첫 show 의 그림도 낡게 한다(이슈 #152).
    @Test fun `보여 주는 것이 없으면 저장도 밖의 변화도 거른다`() {
        val uc = fx.useCases()
        assertEquals(ReloadResult.NothingShown, uc.save("watch"))
        val built = BuildChange(own = listOf(java.io.File(fx.root, "app/build/classes")))
        assertEquals(ExternalResult.NoPreview, runBlocking { uc.externalBuild(built, done = true) })
        assertTrue(uc.workspace.now.stale.isEmpty())
    }

    // ⑥ 의 절반. 에디터로만 일하는 사람은 HTTP를 안 친다 — 감시가 부른 리로드가 활동이 아니면 데몬이 유휴로 죽는다.
    @Test fun `감시가 부른 리로드는 활동이다`() {
        val uc = opened()
        val before = uc.workspace.now.lastRenderMs
        uc.save("watch")
        assertTrue(uc.workspace.now.lastRenderMs > before)
    }

    // ⑦ 의 절반. 화면이 주소를 들고 있는 것은 산출물 상한을 넘겨도 지우지 않는다.
    @Test fun `keepIds는 보드의 카드 전부와 current다`() {
        val uc = opened()
        val ws = uc.workspace
        assertEquals(ws.now.board!!.cards.map { it.spec.previewId }.toSet(), ws.now.keepIds())

        // FQN으로 연 단건은 보드가 없다 — 화면이 든 주소는 current 하나뿐이다.
        runBlocking { uc.openPreview("demo.CardsKt.Card0", null, emptyMap(), "test") }
        assertEquals(null, ws.now.board)
        assertEquals(setOf(ws.now.current!!.previewId), ws.now.keepIds())
    }

    // ⑧ 산출물은 live의 캐시다. 끝나지 않는 애니메이션이면 정착이 영영 안 와, 정착에 기대면 읽는 쪽이 터치 전 그림을 받는다(2026-10-02).
    @Test fun `live가 바뀌었을 때만 읽기 전에 한 장 맞춘다`() {
        val uc = opened()
        val n = fx.renderer.rerenders.get()
        assertEquals(null, runBlocking { uc.catchUp("status") })
        assertEquals(n, fx.renderer.rerenders.get())

        fx.renderer.moving = true
        runBlocking { uc.touch("tap", 1, 1, "viewer", settle = false) }
        val r = runBlocking { uc.catchUp("status") }
        assertEquals("status", r?.shot?.by)
        fx.renderer.moving = false
        runBlocking { uc.awaitSettled() }
        assertEquals(null, runBlocking { uc.catchUp("status") })
    }

    // 인터랙티브 중 카드의 기록은 들어가기 전 그림이다. 사람이 가리킨 것은 조작한 화면이다.
    @Test fun `인터랙티브 중 가리키기는 조작한 화면을 싣는다`() {
        val uc = opened()
        val ws = uc.workspace
        runBlocking { uc.focusCard(0, on = true, by = "test") }
        fx.renderer.moving = true
        runBlocking { uc.touch("tap", 1, 1, "viewer", settle = false) }
        val n = fx.renderer.rerenders.get()
        val id = ws.now.board!!.focusCard.spec.previewId
        val sel = runBlocking { uc.select(fx.file.path, 3, Pointed("Text", listOf("Text"), null, id), "viewer") }
        assertEquals(n + 1, fx.renderer.rerenders.get())
        assertEquals("viewer", (ws.now.lastResult as prevue.daemon.domain.model.ShowResult).shot.by)
        assertEquals(ws.now.lastResult!!.image!!.absolutePath, sel.image)
    }

    @Test fun `크기를 주고 켜면 그 크기로 열고 끄면 소스 그대로 다시 그린다`() {
        val uc = opened()
        val ws = uc.workspace
        runBlocking { uc.focusCard(0, on = true, by = "test", size = ScreenSize.Dp(320, 640)) }
        assertEquals("320", fx.renderer.opened.last().params["widthDp"])
        assertEquals(ScreenSize.Dp(320, 640), uc.readStatus().size)
        assertEquals(null, ws.now.board!!.focusCard.spec.params["widthDp"])
        runBlocking { uc.focusCard(0, on = false, by = "test") }
        assertEquals(ws.now.board!!.focusCard.spec, fx.renderer.shown.first { it.previewId == ws.now.board!!.focusCard.spec.previewId && it.params.isEmpty() })
        assertEquals(null, uc.readStatus().size)
    }

    @Test fun `켜진 카드의 크기를 바꿔도 인터랙티브는 켜져 있고 저장해도 크기가 남는다`() {
        val uc = opened()
        val ws = uc.workspace
        runBlocking { uc.focusCard(0, on = true, by = "test") }
        val opens = fx.renderer.opened.size
        runBlocking { uc.focusCard(0, on = true, by = "test", size = ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8)) }
        assertTrue(ws.now.interactive)
        assertEquals(opens + 1, fx.renderer.opened.size)
        assertEquals("spec:width=2448px,height=1848px,dpi=420,orientation=landscape", ws.now.current!!.params["device"])
        uc.save()
        assertEquals("spec:width=2448px,height=1848px,dpi=420,orientation=landscape", fx.renderer.opened.last().params["device"])
        assertEquals(ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8), uc.readStatus().size)
        runBlocking { uc.focusCard(0, on = true, by = "test", size = ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8)) }
        assertEquals(opens + 2, fx.renderer.opened.size)
        runBlocking { uc.focusCard(0, on = true, by = "test") }
        assertEquals(ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8), uc.readStatus().size)
        runBlocking { uc.resize(ScreenSize.Original, "viewer") }
        assertEquals(null, ws.now.current!!.params["device"])
        assertTrue(ws.now.interactive)
    }

    @Test fun `보드에서 인터랙티브가 아니면 크기를 바꾸지 않는다`() {
        val uc = opened()
        assertThrows<IllegalArgumentException> { runBlocking { uc.resize(ScreenSize.Dp(320, 640), "viewer") } }
        assertThrows<IllegalArgumentException> { runBlocking { uc.focusCard(0, on = false, by = "test", size = ScreenSize.Dp(320, 640)) } }
        assertEquals(null, uc.workspace.now.resize)
    }

    @Test fun `다른 탭으로 옮기면 크기 덮어쓰기를 푼다`() {
        val uc = opened()
        runBlocking { uc.focusCard(0, on = true, by = "test", size = ScreenSize.Dp(320, 640)) }
        val other = fx.previewFile("Other")
        runBlocking { uc.openPreview(other.path, null, emptyMap(), "test") }
        assertEquals(null, uc.workspace.now.resize)
        assertEquals(null, uc.readStatus().size)
    }

    // D-11. 나올 때 새 태스크로 처음 화면을 다시 그린다 — 조작한 화면(상세로 넘어간 목록)이 카드에 남지 않는다.
    @Test fun `인터랙티브에서 나오면 카드를 처음 화면으로 다시 그린다`() {
        val uc = opened()
        val ws = uc.workspace
        runBlocking { uc.focusCard(0, on = true, by = "test") }
        val entered = fx.renderer.shown.size
        runBlocking { uc.touch("tap", 1, 1, "viewer", settle = false) }
        runBlocking { uc.focusCard(0, on = false, by = "viewer") }
        assertEquals(ws.now.board!!.focusCard.spec, fx.renderer.shown[entered])        // 나가며 새 태스크로 그렸다(채우기는 그 뒤에 붙는다)
        val after = (ws.now.board!!.focusCard.result as prevue.daemon.domain.model.CardResult.Drawn).shot
        assertEquals("viewer", after.by)
        assertEquals(fx.renderer.opened.size, fx.renderer.closes.get())
    }

    // 나가며 그리기가 실패해도 카드는 들어가기 전 그림 그대로다 — 나가기만 했는데 카드가 실패로 바뀌지 않는다. 마지막 결과(status)도 그대로다.
    @Test fun `나가며 다시 그리기가 실패하면 카드와 마지막 결과를 그대로 둔다`() {
        val uc = opened()
        val ws = uc.workspace
        runBlocking { uc.focusCard(0, on = true, by = "test") }
        val card = ws.now.board!!.focusCard.result
        val last = ws.now.lastResult
        fx.renderer.exceptions += "렌더 시간 초과"
        runBlocking { uc.focusCard(0, on = false, by = "viewer") }
        assertEquals(card, ws.now.board!!.focusCard.result)
        assertTrue(last === ws.now.lastResult)
        assertFalse(ws.now.interactive)
    }

    @Test fun `쓰기에 실패한 카드를 가리키면 그림이 없고 마지막 한 장으로 대신하지 않는다`() {
        val uc = opened()
        val ws = uc.workspace
        val i = ws.now.board!!.cards.lastIndex
        ws.now.board!!.let { b -> ws.recordCard(b.epoch, i, b.gen, prevue.daemon.domain.model.CardResult.WriteFailed(i, prevue.daemon.entity.Verbatim("디스크 가득"))) }
        assertTrue(ws.now.lastResult?.image != null)
        val sel = runBlocking { uc.select(fx.file.path, 3, Pointed("Text", listOf("Text"), null, ws.now.board!!.cards[i].spec.previewId), "viewer") }
        assertEquals(ws.now.board!!.cards[i].spec, sel.preview)
        assertEquals(null to null, sel.image to sel.tree)
    }

    // 뷰어가 걸러 보낸 userChain 은 그대로, 보내지 않은 쪽(CLI)이면 chain 을 그대로 쓴다 — 에이전트는 늘 userChain 을 읽을 수 있다.
    @Test fun `userChain 은 뷰어가 준 것, 없으면 chain`() {
        val uc = opened()
        val full = listOf("CompositionLocalProvider", "Box", "Layout", "Text")
        val given = runBlocking { uc.select(fx.file.path, 3, Pointed("Text", full, null, null, listOf("Box", "Text")), "viewer") }
        assertEquals(listOf("Box", "Text") to full, given.userChain to given.chain)
        val absent = runBlocking { uc.select(fx.file.path, 3, Pointed("Text", full, null, null), "cli") }
        assertEquals(full, absent.userChain)
    }

    // 기준 3 · D-37. 같은 앱의 다른 모듈은 보드만 바꾼다 — status의 module이 그 모듈이 되고, 들어온 모듈은 나가지 않는다.
    @Test fun `다른 모듈의 파일을 열면 그 모듈이 보이고 렌더 모듈에 남는다`() {
        val uc = opened()
        assertEquals(":app" to listOf(":app"), uc.readStatus().let { it.module.module to it.renderModules })
        val lib = java.io.File(fx.libRoot, "lib/LibCards.kt").apply {
            parentFile.mkdirs(); writeText("package lib\nimport androidx.compose.ui.tooling.preview.Preview\n@Preview\nfun LibCard() {}\n")
        }
        runBlocking { uc.openPreview(lib.path, null, emptyMap(), "test") }
        assertEquals(":lib" to listOf(":app", ":lib"), uc.readStatus().let { it.module.module to it.renderModules })
        runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }
        assertEquals(":app" to listOf(":app", ":lib"), uc.readStatus().let { it.module.module to it.renderModules })
    }

    // 다른 모듈에서 남긴 실패가 새로 연 보드의 show·wait를 실패로 만들면 안 된다. 연 뒤의 실패와 기다리는 파일의 실패는 그대로 받는다.
    @Test fun `연 전의 다른 파일의 컴파일 실패는 새 보드의 기다림을 막지 않는다`() {
        val uc = opened()
        fx.compiler.ok = false
        runBlocking { uc.applySave(listOf(fx.libFile), "test") }
        fx.compiler.ok = true
        assertTrue(runBlocking { uc.awaitRender(listOf(fx.libFile), timeoutMs = 2_000) } is WaitResult.CompileFailed)

        fx.file.setLastModified(1_000)                       // 연 뒤로 안 바뀐 파일이다 — 가짜 시계는 1970년이다
        runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }
        val r = runBlocking { uc.awaitRender(listOf(fx.file), timeoutMs = 2_000) }
        assertTrue(r is WaitResult.BoardDone, "$r")
        assertTrue("compile" in (r as WaitResult.BoardDone).stale)                // 실패는 낡음으로 남는다

        fx.compiler.ok = false
        runBlocking { uc.applySave(listOf(fx.libFile), "test") }                     // 연 뒤의 실패 — 파일 없이 기다려도 받는다
        assertTrue(runBlocking { uc.awaitRender(emptyList(), timeoutMs = 2_000) } is WaitResult.CompileFailed)
    }

    @Test fun `채우기는 다 쓴 뒤 연 시각 기점으로 보드 시간을 한 번 알린다`() {
        val uc = fx.useCases(FakeClock())
        runBlocking {
            uc.boardFills().test {
                val shown = uc.openPreview(fx.file.path, null, emptyMap(), "test")
                uc.workspace.awaitBoardFilled()
                val fill = awaitItem()
                Thread.sleep(100)                            // 부정 확인 — 두 번째 알림이 오지 않는다. 채우기는 끝을 알리지 않는다
                expectNoEvents()
                assertEquals(shown.startedAtMs to uc.workspace.now.board!!.cards.size, fill.since to fill.cards)
            }
        }
    }

    @Test fun `쓰기를 기다리는 사이 다시 열린 보드에는 옛 채우기의 보드 시간을 알리지 않는다`() {
        val uc = fx.useCases(FakeClock())
        val ws = uc.workspace
        val gate = CountDownLatch(1)
        fx.renderer.awaitWritesHold = gate
        runBlocking {
            uc.boardFills().test {
                val first = uc.openPreview(fx.file.path, null, emptyMap(), "test", since = 1_000)
                assertTrue(fx.renderer.awaitWritesEntered.tryAcquire(5, TimeUnit.SECONDS))

                val again = uc.openPreview(fx.file.path, null, emptyMap(), "test", since = 2_000)
                ws.awaitBoardFilled()
                gate.countDown()
                assertTrue(first.startedAtMs != again.startedAtMs)
                assertEquals(again.startedAtMs, awaitItem().since, "옛 채우기가 새 보드에 보드 시간을 알렸다")
                Thread.sleep(100)                            // 부정 확인 — 옛 채우기가 관문을 지나 알리지 않는다. 채우기는 끝을 알리지 않는다
                expectNoEvents()
            }
        }
    }

    // ⑨ 보드는 값이고 쓰기 완료는 줄 밖에서 CAS로 적는다(D-51). 그새 같은 파일을 다시 열었으면 새 보드의 같은 자리에 옛 쓰기를 적으면 안 된다 —
    // 자리(index)와 세대(0)가 같아 회차(epoch)로만 갈린다.
    @Test fun `다시 연 보드에는 옛 보드의 쓰기 완료를 적지 않는다`() {
        val uc = opened()
        val ws = uc.workspace
        val gate = CountDownLatch(1)
        fx.renderer.writeHold = ws.now.board!!.cards[1].spec.previewId to gate
        val old = async { uc.drawCard(1, force = true, by = "old") }
        assertTrue(fx.renderer.writeEntered.tryAcquire(5, TimeUnit.SECONDS))

        val before = ws.now.board!!.epoch
        runBlocking { uc.openPreview(fx.file.path, null, emptyMap(), "test") }; ws.awaitBoardFilled()
        assertTrue(ws.now.board!!.epoch != before)
        val fresh = ws.now.board!!.cards[1].result

        gate.countDown()
        assertEquals("old", ((old.get(5, TimeUnit.SECONDS) as CardResult.Drawn).shot.by))
        assertTrue(ws.now.board!!.cards[1].result === fresh, "옛 보드의 쓰기가 새 보드의 카드를 덮었다")
    }

}
