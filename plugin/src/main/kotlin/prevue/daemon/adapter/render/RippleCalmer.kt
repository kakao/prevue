package prevue.daemon.adapter.render

import android.graphics.drawable.RippleDrawable
import android.view.View
import android.view.ViewGroup
import com.android.tools.rendering.RenderTask
import java.util.concurrent.TimeUnit

internal class RippleCalmer(private val log: (String) -> Unit) {
    var calmed = 0
        private set
    private var broken = false

    private val state by lazy { RippleDrawable::class.java.getDeclaredField("mState").apply { isAccessible = true } }
    private val style by lazy {
        Class.forName("android.graphics.drawable.RippleDrawable\$RippleState").getDeclaredField("mRippleStyle").apply { isAccessible = true }
    }
    private val active by lazy { RippleDrawable::class.java.getDeclaredField("mRippleActive").apply { isAccessible = true } }
    private val setActive by lazy {
        RippleDrawable::class.java.getDeclaredMethod("setRippleActive", java.lang.Boolean.TYPE).apply { isAccessible = true }
    }
    private val endPatterned by lazy { RippleDrawable::class.java.getDeclaredMethod("endPatternedAnimations").apply { isAccessible = true } }

    fun calm(task: RenderTask, root: () -> View?) {
        if (broken) return
        try {
            val r = root() ?: return
            task.runAsyncRenderActionWithSession({ walk(r) }, 2, TimeUnit.SECONDS).get(2, TimeUnit.SECONDS)
        } catch (e: Exception) {
            broken = true
            log("리플을 단색으로 바꾸지 못했다 — 원래 리플로 그린다(느릴 수 있다): $e")
        }
    }

    private fun walk(v: View) {
        (v.background as? RippleDrawable)?.let(::solid)
        if (v is ViewGroup) for (i in 0 until v.childCount) walk(v.getChildAt(i))
    }

    private fun solid(d: RippleDrawable) {
        val st = state.get(d)
        if (style.getInt(st) == RippleDrawable.STYLE_SOLID) return
        style.setInt(st, RippleDrawable.STYLE_SOLID)
        endPatterned.invoke(d)
        if (active.getBoolean(d)) reactivate(d)
        calmed++
    }

    private fun reactivate(d: RippleDrawable) {
        active.setBoolean(d, false)
        setActive.invoke(d, true)
    }
}
