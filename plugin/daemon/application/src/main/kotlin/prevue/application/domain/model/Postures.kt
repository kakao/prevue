package prevue.application.domain.model

data class Postures(
    val spec: PreviewSpec,
    val round: Long,
    val shots: Map<ScreenSize, Shot> = emptyMap(),
    val misses: Map<ScreenSize, Int> = emptyMap(),
) {
    fun idOf(s: ScreenSize): String = idOf(spec, s)

    fun specOf(s: ScreenSize): PreviewSpec = CardOverride(spec.previewId, s).applyTo(spec).copy(previewId = idOf(s))

    fun carriedTo(shown: ScreenSize): Postures =
        copy(shots = shots.filterKeys { reaches(shown, it) }, misses = misses.filterKeys { reaches(shown, it) })

    fun with(shown: ScreenSize, d: ScreenSize, shot: Shot): Postures = when {
        !reaches(shown, d) -> this
        shot.ok -> copy(shots = shots + (d to shot))
        else -> missed(shown, d)
    }

    fun missed(shown: ScreenSize, d: ScreenSize): Postures =
        if (reaches(shown, d)) copy(misses = misses + (d to (misses[d] ?: 0) + 1)) else this

    fun next(shown: ScreenSize): ScreenSize? {
        val left = plan(shown).filter { it !in shots }
        return left.firstOrNull { it !in misses } ?: left.firstOrNull { misses.getValue(it) < TRIES }
    }

    fun drawn(shown: ScreenSize?): Map<ScreenSize, Shot> = shots.filter { (s, shot) -> s != shown && shot.ok }

    fun ids(): Set<String> = shots.keys.mapTo(HashSet(), ::idOf)

    companion object {
        private const val FOLD = 1
        private const val TURN = 2
        private const val TRIES = 2

        private fun reaches(shown: ScreenSize, s: ScreenSize): Boolean = s == shown || s in plan(shown)

        fun idOf(spec: PreviewSpec, s: ScreenSize): String = "${spec.previewId}@${s.key}"

        fun plan(shown: ScreenSize): List<ScreenSize> {
            val own = (shown as? ScreenSize.Device)?.let { d -> d.model.postures.sortedBy { steps(d, it) } }.orEmpty()
            return (own + ScreenSize.BAR).distinct().filter { it != shown }
        }

        fun planned(s: ScreenSize): Boolean = s is ScreenSize.Device || s in ScreenSize.BAR

        private fun steps(from: ScreenSize.Device, to: ScreenSize.Device): Int = when {
            to == from.folding -> FOLD
            from.folded != to.folded -> FOLD + TURN
            from.orientation != to.orientation -> TURN
            else -> 0
        }
    }
}
