package prevue.daemon.domain.runtime

import java.awt.image.BufferedImage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.Frame
import prevue.daemon.domain.port.LiveSession
import prevue.daemon.domain.port.LiveSessionFactory
import prevue.daemon.domain.port.RenderOutput
import prevue.daemon.domain.model.LiveFrame
import prevue.daemon.domain.model.SettledShot
import prevue.daemon.domain.policy.Pacing

class LiveLoop(private val sessions: LiveSessionFactory, private val now: () -> Long, private val log: (String) -> Unit) {
    private var session: LiveSession? = null
    private var pacing: Pacing? = null
    private var nextAt: Long? = null
    private var inputSeq = 0L
    private var frameSeq = 0L
    private var screenSeq = 0L
    private var lastImage: BufferedImage? = null
    private var lastShot: SettledShot? = null
    private var lastShotSemantics = false
    private var dirty = false
    private val waiters = ArrayList<Waiter>()

    private class Waiter(val seq: Long, val semantics: Boolean, val deadline: Long, val reply: CompletableDeferred<SettledShot>)

    private val _screen = MutableStateFlow<LiveFrame?>(null)
    val screen: StateFlow<LiveFrame?> = _screen
    private val _shots = MutableSharedFlow<SettledShot>(extraBufferCapacity = 16, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    val shots: SharedFlow<SettledShot> = _shots
    private val _watching = MutableStateFlow(false)
    val watching: StateFlow<Boolean> = _watching

    data class Report(val stats: Map<String, Any?>, val trace: List<Map<String, Any?>>)

    private val _report = MutableStateFlow(Report(emptyMap(), emptyList()))
    val report: StateFlow<Report> = _report
    private val _latest = MutableStateFlow<SettledShot?>(null)
    fun isLatest(shot: SettledShot): Boolean = _latest.value === shot
    private val _lastInputAt = MutableStateFlow<Long?>(null)
    val lastInputAt: StateFlow<Long?> = _lastInputAt

    val preview: PreviewSpec? get() = session?.preview
    val changed: Boolean get() = session != null && dirty
    val lastInput: Long get() = inputSeq

    suspend fun open(p: PreviewSpec, interactive: Boolean, ownLoader: Boolean = false): RenderOutput {
        close()
        val s = sessions.open(p, interactive, ownLoader)
        if (!s.opened.ok) { s.close(); return s.opened }
        session = s
        dirty = false
        lastShot = null
        wake("open")
        return s.opened
    }

    suspend fun ensure(p: PreviewSpec, interactive: Boolean): RenderOutput? = if (session?.preview == p) null else open(p, interactive)

    fun close() {
        val s = session ?: return
        session = null
        _latest.value = null
        _screen.value = null
        rest()
        fail(IllegalStateException(CLOSED))
        runCatching { s.close() }.onFailure { log("세션을 닫지 못했다: $it") }
    }

    suspend fun renderAt(p: PreviewSpec, ms: Long): RenderOutput {
        close()
        val s = sessions.open(p, interactive = false, ownLoader = true)
        try {
            return if (s.opened.ok) s.renderAt(ms) else s.opened
        } finally {
            s.close()
        }
    }

    suspend fun look(semantics: Boolean): LiveSession.Look {
        _latest.value = null
        return render(semantics)
    }

    private suspend fun render(semantics: Boolean): LiveSession.Look = current().look(semantics).also { dirty = false }

    suspend fun touch(type: String, x: Int, y: Int): Long {
        current().touch(type, x, y)
        return input("touch:$type", when (type.lowercase()) { "press" -> true; "drag" -> null; else -> false })
    }

    fun type(text: String): Pair<Long, String?> {
        val why = current().type(text)
        return input("type") to why
    }

    interface Rider {
        fun frame(s: LiveSession)
        suspend fun stop(s: LiveSession, catchUp: suspend () -> Unit): Boolean
    }

    fun wheel(x: Int, y: Int, dx: Float, dy: Float): Pair<Long, Boolean> {
        val s = current()
        val seq = input("wheel")
        return seq to s.scroll(x, y, dx, dy)
    }

    suspend fun seek(x: Int, y: Int, dx: Float, dy: Float, pieces: Int, rider: Rider): Pair<Long, Boolean> {
        val s = current()
        val seq = input("wheel")
        val sample = { rider.frame(s) }
        for (i in 0 until pieces) {
            if (!s.scroll(x, y, dx / pieces, dy / pieces)) return seq to false
            // 외부: Compose의 휠 스크롤은 프레임 시계로 이어 가는 애니메이션이라 조각 사이에 프레임이 돌아야 움직인다
            frame(now()) ?: return seq to false
            sample()
            if (rider.stop(s) { catchUp(sample) }) break
        }
        val ended = s.scroll(x, y, 0f, 0f)
        catchUp(sample)
        return seq to ended
    }

    private suspend fun catchUp(each: () -> Unit = {}) {
        val until = now() + CATCH_UP_MS
        var still = 0
        while (still < 2 && now() < until) {
            val f = frame(now()) ?: return
            each()
            still = if (f.changed) 0 else still + 1
        }
    }

    fun watch(on: Boolean) {
        _watching.value = on
        if (on && session != null) wake("watch")
    }

    suspend fun await(seq: Long, semantics: Boolean): CompletableDeferred<SettledShot> {
        val reply = CompletableDeferred<SettledShot>()
        val last = lastShot
        when {
            session == null -> reply.completeExceptionally(IllegalStateException(CLOSED))
            last != null && last.inputSeq >= seq && (lastShotSemantics || !semantics) -> reply.complete(last)
            pacing == null -> try {
                reply.complete(shot(semantics, settled = true, claimed = true))
            } catch (e: Throwable) {
                if (e is CancellationException) throw e
                reply.completeExceptionally(e)
            }
            else -> waiters += Waiter(seq, semantics, now() + AGENT_WAIT_MS, reply)
        }
        return reply
    }

    fun dueInMs(): Long? {
        val at = nextAt ?: return null
        val due = waiters.minOfOrNull { it.deadline }?.let { minOf(it, at) } ?: at
        return (due - now()).coerceAtLeast(0)
    }

    suspend fun step() {
        val t = now()
        val at = nextAt ?: return
        if (at > t) return expire(t)
        val f = frame(t) ?: return
        next(f.pacing, f.step, t)
    }

    private fun current(): LiveSession = session ?: error(CLOSED)

    private fun input(reason: String, pointer: Boolean? = null): Long {
        inputSeq++
        dirty = true
        val t = now()
        _lastInputAt.value = t
        wake(reason, t)
        pacing!!.input(t, reason, pointer)
        return inputSeq
    }

    private fun wake(reason: String, t: Long = now()) {
        val p = pacing
        if (p != null) { p.mark(t, reason); return }
        pacing = Pacing(t).also { it.mark(t, reason) }
        nextAt = t
    }

    private class Ticked(val pacing: Pacing, val step: Pacing.Step, val changed: Boolean)

    private fun frame(t: Long): Ticked? {
        val s = session ?: return null.also { rest() }
        val p = pacing ?: Pacing(t).also { pacing = it }
        val f = tick(s) ?: return null
        frameSeq++
        if (f.changed) dirty = true
        f.image?.let { lastImage = it; publish(it, rest = false) }
        val step = p.record(f, t)
        if (step.rest) lastImage?.let { publish(it, rest = true) }
        return Ticked(p, step, f.changed)
    }

    private fun tick(s: LiveSession): Frame? = try {
        s.tick()
    } catch (e: Throwable) {
        if (e is CancellationException) throw e
        log("프레임 루프 틱 실패: $e")
        close()
        null
    }

    private suspend fun next(p: Pacing, step: Pacing.Step, t: Long) {
        when {
            step.settled -> settle(p, settled = true)
            !_watching.value && p.sinceInput(t) >= Pacing.UNWATCHED_MS -> settle(p, settled = false)
            else -> {
                nextAt = t + step.intervalMs
                if (step.calm && waiters.isNotEmpty()) answer(waiters.toList(), settled = true)
                expire(now())
            }
        }
    }

    private fun publish(img: BufferedImage, rest: Boolean) {
        _screen.value = LiveFrame(++screenSeq, img, rest)
    }

    private suspend fun settle(p: Pacing, settled: Boolean) {
        val claim = waiters.toList()
        waiters.clear()
        if (p.changedAny || claim.isNotEmpty() || inputSeq > (lastShot?.inputSeq ?: 0)) {
            val shot = try {
                shot(claim.any { it.semantics }, settled, claimed = claim.isNotEmpty())
            } catch (e: Exception) {
                claim.forEach { it.reply.completeExceptionally(e) }
                if (e is CancellationException) throw e
                log("정착 그림 실패: $e")
                rest()
                return
            }
            claim.forEach { it.reply.complete(shot) }
            _shots.tryEmit(shot)
        } else report(p, now())
        rest()
    }

    private suspend fun shot(semantics: Boolean, settled: Boolean, claimed: Boolean): SettledShot {
        val t = now()
        pacing?.let { report(it, t) }
        val shot = SettledShot(inputSeq, frameSeq, render(semantics), _report.value.stats, settled, claimed)
        lastShot = shot
        lastShotSemantics = semantics
        _latest.value = shot
        return shot
    }

    private suspend fun expire(t: Long) {
        val late = waiters.filter { it.deadline <= t }
        if (late.isNotEmpty()) answer(late, settled = false)
    }

    private suspend fun answer(those: List<Waiter>, settled: Boolean) {
        waiters -= those.toSet()
        val s = try {
            shot(those.any { it.semantics }, settled, claimed = true)
        } catch (e: Throwable) {
            those.forEach { it.reply.completeExceptionally(e) }
            if (e is CancellationException) throw e
            return
        }
        those.forEach { it.reply.complete(s) }
    }

    private fun report(p: Pacing, t: Long) {
        _report.value = Report(p.stats(t), p.trace.toList())
    }

    private fun rest() {
        pacing = null
        nextAt = null
    }

    private fun fail(e: Exception) {
        waiters.forEach { it.reply.completeExceptionally(e) }
        waiters.clear()
    }

    companion object {
        const val AGENT_WAIT_MS = 3_000L
        const val CATCH_UP_MS = 150L
        private const val CLOSED = "열린 라이브 세션이 없다"
    }
}
