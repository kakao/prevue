package prevue.infrastructure.render

import com.android.tools.rendering.RenderResult

internal object TreeRefreshPolicy {
    fun shouldRefreshTree(l: LayoutlibSession, result: RenderResult, relayout: Boolean, lastAdapter: Any?): Boolean {
        val adapter = ViewInfoJson.adapter(result.rootViews)
        return shouldRefresh(
            relayout = relayout,
            fitsContent = LayoutlibBars.fitsContent(l.task, l.preview),
            hasCurrentAdapter = adapter != null && adapter === lastAdapter,
        )
    }

    fun shouldRefresh(relayout: Boolean, fitsContent: Boolean, hasCurrentAdapter: Boolean): Boolean =
        relayout || fitsContent || !hasCurrentAdapter
}
