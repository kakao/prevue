package prevue.daemon.domain.runtime

import java.io.File
import java.time.Instant
import kotlinx.coroutines.CancellationException
import prevue.daemon.domain.model.Postures
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.Work
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.RenderOutput
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.model.SettledShot
import prevue.daemon.domain.model.Shot
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.policy.StaleReasons

/**
 * live 태스크에 한 장을 그리고 그 결과를 [Workspace]에 적는 단계들. 유스케이스가 아니다 — 여러 유스케이스가 **줄 안에서** 함께 쓰고,
 * 스스로 줄을 서지 않는다(줄은 재진입이 안 된다).
 */
class LiveShot(private val ws: Workspace, private val engine: EngineActor) {
    /** 새 태스크로 그려 live로 삼는다. [since]는 이 렌더를 부른 일의 시작(epoch ms)이고, 없으면 그리기 시작이다(D-63). */
    suspend fun show(
        ed: WorkspaceEditor, spec: PreviewSpec, by: String, since: Long? = null, keepPostures: Boolean = false, deferMissing: Boolean = false,
    ): ShowResult {
        val t = System.nanoTime()
        val at = since ?: System.currentTimeMillis()
        val p = ws.now.sized(spec)
        rendering(ed, p, by)
        if (!keepPostures) dropPostures(ed)
        val out = engine.show(p, ws.now.interactive)
        if (deferMissing && out.failure == FailureKind.NOT_FOUND) {
            ed.update { it.copy(work = null) }
            return ShowResult(shot(out, null, t, by), ws.now.stale)
        }
        val kept = keepPosture(out)
        ed.update { it.copy(current = p) }
        val r = finish(ed, out, null, t, by) { it.copy(startedAtMs = at) }
        seedPostures(ed, kept, keepPostures)
        return r
    }

    fun keepPosture(out: RenderOutput): RenderOutput? {
        if (!out.ok) return null
        val (base, d) = ws.now.shownTarget() ?: return null
        return engine.keepImage(out, Postures.idOf(base, d))
    }

    fun dropPostures(ed: WorkspaceEditor) {
        if (ws.now.postures != null) ed.update { it.copy(postures = null) }
    }

    suspend fun seedPostures(ed: WorkspaceEditor, kept: RenderOutput?, keep: Boolean) {
        val (base, d) = ws.now.shownTarget() ?: return dropPostures(ed)
        if (kept == null && !keep) return dropPostures(ed)
        val shot = kept?.let { k ->
            try { shot(k, null, System.nanoTime(), POSTURE) } catch (e: Exception) { if (e is CancellationException) throw e; null }
        }
        val at = ws.nowMs()
        ed.update { s ->
            val prev = s.postures?.takeIf { keep && it.covers(d) && it.spec.previewId == base.previewId }
            val round = prev?.round ?: (s.postureRound + 1)
            val shots = prev?.shots.orEmpty() + listOfNotNull(shot?.let { d to it })
            s.copy(postures = Postures(base, d, round, at, shots), postureRound = maxOf(s.postureRound, round))
        }
    }

    /**
     * D-11. 새 태스크로 처음 화면을 다시 그린다 — 인터랙티브에서 나갈 때. 보여 준 것이 아니라 되돌린 것이라 렌더 알림 · 마지막 결과를 건드리지 않는다.
     * 못 그렸으면 null — 부른 쪽은 카드를 그대로 둔다(나가기만 했는데 카드가 실패로 바뀌면 안 된다).
     */
    suspend fun fresh(ed: WorkspaceEditor, p: PreviewSpec, by: String): Shot? = runCatching {
        val t = System.nanoTime()
        val out = engine.show(p, ws.now.interactive)
        ed.update { it.copy(current = p) }
        shot(out, null, t, by).takeIf { out.ok }
    }.getOrNull()

    /**
     * 렌더 결과 한 장(FR-11). 카드도 같은 모양을 쓴다 — 뷰어가 보는 것과 CLI가 받는 것이 같아야 한다.
     * 산출물이 디스크에 닿은 뒤에 만든다 — 이 주소를 받은 쪽이 바로 읽는다. 저장 → 화면의 끝(PNG 기록)도 이 순간이다.
     */
    suspend fun shot(out: RenderOutput, compile: CompileResult?, t0: Long, by: String): Shot {
        val written = engine.written(out)
        val t = System.currentTimeMillis()
        return Shot(written, compile, (System.nanoTime() - t0) / 1_000_000, by, artifactRevision = t)
    }

    /** [extra]는 그 자리에서만 실리는 덧붙임(atMs · frames · 저장 구간)이다. 알리기 전에 붙여야 이벤트와 응답이 같다. */
    suspend fun finish(
        ed: WorkspaceEditor, out: RenderOutput, compile: CompileResult?, t0: Long, by: String, extra: (ShowResult) -> ShowResult = { it },
    ): ShowResult {
        val at = ws.nowMs()
        if (compile?.ok == true && ws.now.buildPending) ed.markStale(StaleReasons.BUILD, null)
        dumpOutdated(ed, out)
        val drawn = extra(ShowResult(shot(out, compile, t0, by), ws.now.stale))
        val r = if (ws.now.warm) drawn else drawn.copy(coldMs = drawn.startedAtMs?.let { drawn.shot.artifactRevision - it } ?: drawn.shot.totalMs)
        val stamp = Instant.now().toString()
        ed.update { it.copy(lastRenderMs = at, lastResult = r, lastShown = r, boardFill = null, work = null, shownBy = by, shownAt = stamp, warm = true) }
        return r
    }

    fun dumpOutdated(ed: WorkspaceEditor, out: RenderOutput) {
        StaleReasons.missingRClass(out)?.let { ed.markStaleOnce(StaleReasons.BUILD_FILES, it) }
    }

    fun rendering(ed: WorkspaceEditor, p: PreviewSpec, by: String) {
        ed.update { it.copy(work = Work.Rendering(p, by)) }
        ws.emit(WorkspaceEvent.NewTask)
    }

    fun compiling(ed: WorkspaceEditor, files: List<File>, by: String) {
        ed.update { it.copy(work = Work.Compiling(files, by)) }
    }

    fun failed(ed: WorkspaceEditor, failed: ReloadResult.CompileFailed, recordLast: Boolean) {
        val stamp = Instant.now().toString()
        val at = ws.nowMs()
        ed.update { s ->
            s.copy(
                lastResult = if (recordLast) failed else s.lastResult, lastShown = failed, boardFill = null, shownBy = failed.by, shownAt = stamp,
                lastCompileFailure = failed, lastCompileFailureAtMs = at, work = null,
            )
        }
    }

    /**
     * 산출물을 지금 화면으로 맞춘다. live가 마지막으로 쓴 뒤로 바뀌었을 때만 한 장 다시 그린다 — 안 바뀌었으면 아무것도 안 한다.
     * 정착(애니메이션이 멎었다)에 기대지 않는다: 읽는 쪽이 읽는 순간에 맞춘다.
     */
    suspend fun catchUp(ed: WorkspaceEditor, by: String): ShowResult? {
        val p = ws.now.current ?: return null
        if (!engine.changed()) return null
        val t = System.nanoTime()
        return finish(ed, engine.rerender(p), null, t, by)
    }

    suspend fun session(ed: WorkspaceEditor, t: Long, by: String): ShowResult? {
        val p = ws.now.current ?: error("보여 주는 프리뷰가 없다")
        val out = engine.ensure(p, ws.now.interactive) ?: return null
        return if (out.ok) null else finish(ed, out, null, t, by)
    }

    suspend fun settled(ed: WorkspaceEditor, shot: SettledShot, t: Long, by: String): ShowResult =
        finish(ed, shot.out, null, t, by) { it.copy(frames = shot.frames, settled = shot.settled) }

    /** 보드의 focus 카드에 방금 그린 한 장을 적는다. 보드가 없으면(FQN 단건) 아무것도 안 한다. */
    fun recordFocus(ed: WorkspaceEditor, shot: Shot) {
        ed.updateBoard { it.record(it.focus, it.gen, CardResult.Drawn(it.focus, shot)) }
    }

    /** 같은 경로의 산출물이 갱신됐음을 소비자에게 알린다. */
    fun restamped(shot: Shot): Shot = shot.copy(artifactRevision = System.currentTimeMillis())

    companion object {
        const val POSTURE = "posture"
    }
}
