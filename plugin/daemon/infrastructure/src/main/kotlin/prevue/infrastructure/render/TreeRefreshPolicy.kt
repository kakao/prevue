package prevue.infrastructure.render

internal object TreeRefreshPolicy {
    fun shouldRefresh(relayout: Boolean, fitsContent: Boolean, hasCurrentAdapter: Boolean): Boolean =
        relayout || fitsContent || !hasCurrentAdapter
}
