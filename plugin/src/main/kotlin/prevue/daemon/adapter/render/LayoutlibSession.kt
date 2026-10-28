package prevue.daemon.adapter.render

import android.os.SystemClock
import android.view.InputDevice
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.ViewRootImpl
import com.android.ide.common.rendering.api.RenderSession
import com.android.internal.lang.System_Delegate
import com.android.layoutlib.bridge.impl.RenderAction
import com.android.tools.rendering.RenderLogger
import com.android.tools.rendering.RenderResult
import com.android.tools.rendering.RenderTask
import com.intellij.openapi.util.CheckedDisposable
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.delay
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.Frame

internal class LayoutlibSession(
    val preview: PreviewSpec,
    val task: RenderTask,
    val disposable: CheckedDisposable,
    val logger: RenderLogger,
    private val timeoutSec: () -> Long,
) {
    val clock = SessionClock()
    private var lastHash = 0L
    private var anchored = false
    private var pressUnseen = false
    private var lastWheelMs = Long.MIN_VALUE

    fun anchor() {
        if (anchored) return
        val start = clock.next()
        // 외부: layoutlib 17 세션 시각은 (이번 setNanosTime 값 − 직전 값) + 코레오그래퍼 시각이고, 렌더러는 세션을 시각 0 으로 만든다
        onSession { repeat(2) { System_Delegate.setNanosTime(start) } }
        advanceCallbacks(start)
        anchored = true
    }

    fun advanceCallbacks(at: Long = clock.next()) {
        task.executeCallbacks(at).get(timeoutSec(), TimeUnit.SECONDS)
    }

    fun step(ms: Long, frameMs: Long) {
        anchor()
        var elapsed = 0L
        while (elapsed < ms) {
            val dt = minOf(frameMs, ms - elapsed)
            advanceCallbacks(clock.step(dt * 1_000_000))
            elapsed += dt
        }
    }

    fun frame(forceImage: Boolean, ripples: RippleCalmer): Frame {
        anchor()
        val t0 = System.nanoTime()
        advanceCallbacks()
        pressUnseen = false
        ripples.calm(task) { viewRoot() }
        val img = task.render().get(timeoutSec(), TimeUnit.SECONDS).renderedImage.copy
        val h = if (img != null) RenderOutputs.pixelHash(img) else 0L
        val changed = h != lastHash
        lastHash = h
        val (hq, cq) = queueSizes()
        return Frame(changed, !changed && hq == 0 && cq == 0, img.takeIf { changed || forceImage }, hq, cq, RenderOutputs.msSince(t0))
    }

    // 외부: LaunchedEffect 의 delay 는 AndroidUiDispatcher 가 Delay 가 아니라 kotlinx DefaultExecutor 의 실제 시계로 잰다
    fun realClockWarning(): String? = runCatching {
        val executor = task.classLoader!!.loadClass("kotlinx.coroutines.DefaultExecutor")
        val nextTime = executor.superclass.getDeclaredMethod("getNextTime").apply { isAccessible = true }
        REAL_CLOCK_DELAY.takeIf { nextTime.invoke(executor.getField("INSTANCE").get(null)) as Long != Long.MAX_VALUE }
    }.onFailure { System.err.println("[prevue] 실제 시계 대기를 읽지 못했다 — render --at 이 delay 를 알리지 못한다: $it") }.getOrNull()

    fun onSession(seconds: Long = SESSION_ACTION_SEC, block: () -> Unit) {
        task.runAsyncRenderActionWithSession(block, seconds, TimeUnit.SECONDS).get(seconds, TimeUnit.SECONDS)
    }

    fun viewRoot(): ViewGroup? {
        val session = RenderTask::class.java.getDeclaredField("myRenderSession").apply { isAccessible = true }.get(task) ?: return null
        val impl = session.javaClass.getDeclaredField("mSession").apply { isAccessible = true }.get(session) ?: return null
        return impl.javaClass.getDeclaredField("mViewRoot").apply { isAccessible = true }.get(impl) as? ViewGroup
    }

    fun rebuildTree(result: RenderResult): String? {
        val t = System.nanoTime()
        var why: String? = null
        runCatching { onSession(TREE_REFRESH_SEC) { why = ViewInfoJson.refresh(result.rootViews) } }.onFailure { why = it.toString() }
        val ms = (System.nanoTime() - t) / 1_000_000
        if (ms > SLOW_TREE_MS) println("[prevue] 트리 다시 짓기 ${ms}ms")
        return why
    }

    fun queueSizes(): Pair<Int, Int> {
        var out = 0 to 0
        onSession {
            val data = RenderAction.getCurrentContext()?.sessionInteractiveData ?: return@onSession
            out = data.handlerMessageQueue.size() to (choreographerCallbacks.get(data.choreographerCallbacks) as List<*>).size
        }
        return out
    }

    suspend fun touch(type: String, x: Int, y: Int) {
        anchor()
        when (type.lowercase()) {
            "press" -> { fire(RenderSession.TouchEventType.PRESS, x, y); pressUnseen = true }
            "drag" -> { deliverPendingPress(); fire(RenderSession.TouchEventType.DRAG, x, y) }
            "release" -> { deliverPendingPress(); fire(RenderSession.TouchEventType.RELEASE, x, y) }
            "tap" -> tap(x, y)
            "long" -> longPress(x, y)
            else -> error("터치 종류는 tap · press · drag · release · long 이다: $type")
        }
    }

    private fun fire(type: RenderSession.TouchEventType, x: Int, y: Int) {
        task.triggerTouchEvent(type, x, y, clock.next()).get(timeoutSec(), TimeUnit.SECONDS)
    }

    private suspend fun deliverPendingPress() {
        if (!pressUnseen) return
        pumpCallbacks()
        pressUnseen = false
    }

    private suspend fun tap(x: Int, y: Int) {
        fire(RenderSession.TouchEventType.PRESS, x, y)
        pumpCallbacks()
        fire(RenderSession.TouchEventType.RELEASE, x, y)
        pressUnseen = false
    }

    private suspend fun longPress(x: Int, y: Int) {
        fire(RenderSession.TouchEventType.PRESS, x, y)
        val until = System.nanoTime() + (ViewConfiguration.getLongPressTimeout() + LONG_PRESS_MARGIN_MS) * 1_000_000L
        while (System.nanoTime() < until) {
            advanceCallbacks()
            delay(FRAME_MS)
        }
        fire(RenderSession.TouchEventType.RELEASE, x, y)
        pressUnseen = false
    }

    private suspend fun pumpCallbacks() {
        for (i in 0 until MAX_PRESS_PUMPS) {
            delay(PRESS_PUMP_GAP_MS)
            advanceCallbacks()
            if (i >= 1 && queueSizes() == (0 to 0)) break
        }
    }

    fun wheel(root: ViewGroup, x: Int, y: Int, dx: Float, dy: Float) {
        onSession {
            val ms = maxOf(SystemClock.uptimeMillis(), lastWheelMs + 1).also { lastWheelMs = it }
            val cfg = ViewConfiguration.get(root.context)
            val wheel = mouseEvent(ms, MotionEvent.ACTION_SCROLL, x, y) {
                setAxisValue(MotionEvent.AXIS_VSCROLL, -dy / cfg.scaledVerticalScrollFactor)
                setAxisValue(MotionEvent.AXIS_HSCROLL, dx / cfg.scaledHorizontalScrollFactor)
            }
            dispatch(root, wheel)
            for (action in intArrayOf(MotionEvent.ACTION_HOVER_MOVE, MotionEvent.ACTION_HOVER_EXIT)) {
                dispatch(root, mouseEvent(ms, action, x, y))
            }
        }
    }

    private fun mouseEvent(ms: Long, action: Int, x: Int, y: Int, axes: MotionEvent.PointerCoords.() -> Unit = {}): MotionEvent {
        val props = arrayOf(MotionEvent.PointerProperties().apply { id = 0; toolType = MotionEvent.TOOL_TYPE_MOUSE })
        val coords = arrayOf(MotionEvent.PointerCoords().apply { this.x = x.toFloat(); this.y = y.toFloat(); axes() })
        return MotionEvent.obtain(ms, ms, action, 1, props, coords, 0, 0, 1f, 1f, 0, 0, InputDevice.SOURCE_MOUSE, 0)
    }

    private fun dispatch(root: ViewGroup, ev: MotionEvent) {
        try { root.dispatchGenericMotionEvent(ev) } finally { ev.recycle() }
    }

    fun type(root: ViewGroup, text: String): String? {
        var why: String? = null
        onSession {
            val focused = root.findFocus()
            why = if (focused == null) "포커스된 텍스트 필드가 없다"
                else try { TextInput.insert(focused, text) } catch (e: Exception) { "글자를 넣지 못했다: $e" }
        }
        return why
    }

    fun focusedViewName(): String? {
        val root = viewRoot() ?: error("세션의 루트 뷰를 찾지 못했다")
        var name: String? = null
        onSession { name = root.findFocus()?.javaClass?.simpleName }
        return name
    }

    fun ensureTouchMode(attachError: String?): String? = try {
        val root = viewRoot()
        val wasTouchMode = root != null && switchToTouchMode(root)
        attachError ?: when {
            root == null -> "세션의 루트 뷰를 찾지 못했다"
            wasTouchMode -> null
            else -> "창이 터치 모드로 붙지 않았다 — 렌더러가 창 세션의 addToDisplay를 거치지 않는다"
        }
    } catch (e: Exception) {
        attachError ?: "터치 모드를 확인하지 못했다: $e"
    }

    private fun switchToTouchMode(root: ViewGroup): Boolean {
        var was = false
        onSession {
            was = root.isInTouchMode
            val impl = root.viewRootImpl
            if (!was && impl != null) {
                ViewRootImpl::class.java.getDeclaredMethod("ensureTouchModeLocally", java.lang.Boolean.TYPE)
                    .apply { isAccessible = true }.invoke(impl, true)
            }
        }
        return was
    }

    private companion object {
        const val REAL_CLOCK_DELAY = "delay() · withTimeout처럼 실제 시계로 기다리는 코루틴이 있다 — kotlinx delay는 --at이 밀지 못해 그 뒤의 변화는 이 그림에 없거나 실행마다 다를 수 있다. " +
            "보려면 delay 대신 tween의 delayMillis 같은 애니메이션 API로 기다리거나, 프리뷰에서 그 상태를 바로 주어라"
        const val SESSION_ACTION_SEC = 2L
        const val TREE_REFRESH_SEC = 5L
        const val SLOW_TREE_MS = 50
        const val LONG_PRESS_MARGIN_MS = 150
        const val FRAME_MS = 16L
        const val PRESS_PUMP_GAP_MS = 8L
        const val MAX_PRESS_PUMPS = 4

        val choreographerCallbacks by lazy {
            Class.forName("com.android.layoutlib.bridge.util.ChoreographerCallbacks").getDeclaredField("mCallbacks").apply { isAccessible = true }
        }
    }
}
