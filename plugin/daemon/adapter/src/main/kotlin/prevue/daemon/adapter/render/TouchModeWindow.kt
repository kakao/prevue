package prevue.daemon.adapter.render

import android.view.IWindowSession
import android.view.WindowManagerGlobal
import java.lang.reflect.InvocationTargetException
import java.lang.reflect.Proxy

/**
 * 인터랙티브 창을 처음부터 터치 모드로 붙인다.
 *
 * `ViewRootImpl.setView`는 창 세션 `addToDisplay*`가 돌려준 플래그의 `ADD_FLAG_IN_TOUCH_MODE`(1)로 터치 모드를 정하는데,
 * layoutlib의 `BridgeWindowSession`은 늘 2(앱 보임)만 돌려준다. 터치 모드가 아니면 첫 트래버설이 첫 포커서블에 포커스를 주고
 * (`restoreDefaultFocus` · `focusableViewAvailable`) 스크롤 컨테이너가 그것까지 굴러 — 켜자마자 TextField가 포커스를 쥐고 아래 Button까지
 * 굴러 있었다(기기에는 없다). 첫 터치 때 터치 모드를 켜는 것으로는 늦다.
 *
 * 전역 세션 `WindowManagerGlobal.sWindowSession`을 [block](inflate) 동안만 그 비트를 더하는 프록시로 바꿔 둔다 — 정적 렌더는 그대로다.
 * 렌더러 private 표면이라 판올림으로 깨지면 [block]만 돌리고 이유를 돌려준다 — 첫 포커스가 남을 뿐 그림은 그린다.
 */
internal object TouchModeWindow {
    private const val ADD_FLAG_IN_TOUCH_MODE = 1
    private val session by lazy { WindowManagerGlobal::class.java.getDeclaredField("sWindowSession").apply { isAccessible = true } }

    /** [block]의 결과와, 터치 모드로 붙이지 못했으면 그 이유. */
    suspend fun <T> attach(block: suspend () -> T): Pair<T, String?> {
        val original = try {
            WindowManagerGlobal.getWindowSession()
        } catch (e: Throwable) {
            return block() to "창 세션을 얻지 못했다: $e"
        }
        val proxy = Proxy.newProxyInstance(IWindowSession::class.java.classLoader, arrayOf(IWindowSession::class.java)) { _, m, args ->
            val r = try { m.invoke(original, *(args ?: emptyArray())) } catch (e: InvocationTargetException) { throw e.targetException }
            if (m.name.startsWith("addToDisplay") && r is Int) r or ADD_FLAG_IN_TOUCH_MODE else r
        }
        try {
            session.set(null, proxy)
        } catch (e: Throwable) {
            return block() to "창 세션을 바꿔 끼우지 못했다: $e"
        }
        return try {
            block() to null
        } finally {
            // 못 되돌리면 뒤의 정적 렌더까지 터치 모드로 붙는다 — 렌더 결과를 가리지 않게 삼키되 남긴다
            runCatching { session.set(null, original) }.onFailure { System.err.println("[prevue] 창 세션을 되돌리지 못했다 — 정적 렌더도 터치 모드로 붙는다: $it") }
        }
    }
}
