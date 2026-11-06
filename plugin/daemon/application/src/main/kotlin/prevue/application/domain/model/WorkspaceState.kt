package prevue.application.domain.model

data class WorkspaceState(
    val current: PreviewSpec? = null,
    val shownBy: String = "",
    val shownAt: String = "",
    val lastResult: LastResult? = null,
    val board: Board? = null,
    val interactive: Boolean = false,
    val focusAttachedAt: Long? = null,
    val renderModules: Set<String> = emptySet(),
    val selection: Selection? = null,
    val selectionTab: String? = null,
    val tabs: List<Tab> = emptyList(),
    val activeTab: String? = null,
    val stale: Map<String, StaleReason> = emptyMap(),
    val lastRenderMs: Long = 0L,
    val compiledMtime: Map<String, Pair<Long, Long>> = emptyMap(),
    val newFiles: Set<String> = emptySet(),
    val openedAtMs: Long = 0L,
    val lastCompileFailure: ReloadResult.CompileFailed? = null,
    val lastCompileFailureAtMs: Long = 0L,
    val work: Work? = null,
    val lastShown: LastResult? = null,
    val boardFill: BoardFill? = null,
    val warm: Boolean = false,
    val resize: Resize? = null,
    val postures: Postures? = null,
    val postureRound: Long = 0,
) {
    fun sized(p: PreviewSpec): PreviewSpec = resize?.takeIf { it.previewId == p.previewId }?.size?.applyTo(p) ?: p

    fun shownSize(): ScreenSize? = resize?.takeIf { it.previewId == (board?.focusCard?.spec ?: current)?.previewId }?.size

    fun shownTarget(): Pair<PreviewSpec, ScreenSize>? {
        val b = board?.takeIf { interactive } ?: return null
        return b.focusCard.spec to (shownSize() ?: ScreenSize.Original)
    }

    fun livePostures(): Postures? {
        val (base, size) = shownTarget() ?: return null
        return postures?.takeIf { it.covers(size) && it.spec.previewId == base.previewId }
    }

    fun activeTabOrNull(): Tab? = activeTab?.let { k -> tabs.firstOrNull { it.key == k } }

    fun tabViews(graph: ModuleGraph): List<TabView> = tabs.map {
        TabView(it.key, it.file, it.file?.let(graph::ownerOf).orEmpty(), it.key == activeTab, it.stale, it.vacant,
            it.file?.let(graph::sourceSetOf))
    }

    fun keepIds(): Set<String> =
        (board?.cards?.map { it.spec.previewId }.orEmpty() + listOfNotNull(current?.previewId) + livePostures()?.ids().orEmpty()).toSet()

    fun withTab(t: Tab): WorkspaceState =
        copy(tabs = if (tabs.any { it.key == t.key }) tabs.map { if (it.key == t.key) t else it } else tabs + t, activeTab = t.key)

    fun withCard(epoch: BoardEpoch, index: Int, gen: Int, r: CardResult): WorkspaceState =
        board?.takeIf { it.epoch == epoch }?.let { copy(board = it.record(index, gen, r)) } ?: this

    fun withFill(fill: BoardFill): WorkspaceState = copy(boardFill = fill)

    fun withPosture(round: Long, d: ScreenSize, shot: Shot): WorkspaceState =
        postures?.takeIf { it.round == round }?.let { copy(postures = it.copy(shots = it.shots + (d to shot))) } ?: this

    fun withCreated(added: List<String>, gone: Set<String>): WorkspaceState = copy(newFiles = (newFiles + added) - gone)
}
