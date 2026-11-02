package prevue.daemon.domain.model

import prevue.daemon.entity.PreviewSpec

data class Postures(
    val spec: PreviewSpec,
    val from: ScreenSize,
    val round: Long,
    val seededAtMs: Long,
    val shots: Map<ScreenSize, Shot> = emptyMap(),
) {
    fun idOf(s: ScreenSize): String = idOf(spec, s)

    fun specOf(s: ScreenSize): PreviewSpec = s.applyTo(spec).copy(previewId = idOf(s))

    fun covers(shown: ScreenSize): Boolean = sameFamily(from, shown)

    fun next(shown: ScreenSize): ScreenSize? = plan(shown).firstOrNull { it !in shots }

    fun drawn(shown: ScreenSize?): Map<ScreenSize, Shot> = shots.filter { (s, shot) -> s != shown && shot.ok }

    fun ids(): Set<String> = shots.keys.mapTo(HashSet(), ::idOf)

    companion object {
        private const val FOLD = 1
        private const val TURN = 2

        fun idOf(spec: PreviewSpec, s: ScreenSize): String = "${spec.previewId}@${s.key}"

        fun plan(shown: ScreenSize): List<ScreenSize> {
            val own = (shown as? ScreenSize.Device)?.let { d -> d.model.postures.sortedBy { steps(d, it) } }.orEmpty()
            return (own + ScreenSize.BAR).distinct().filter { it != shown }
        }

        fun sameFamily(a: ScreenSize, b: ScreenSize): Boolean =
            if (a is ScreenSize.Device && b is ScreenSize.Device) a.model == b.model else a == b

        private fun steps(from: ScreenSize.Device, to: ScreenSize.Device): Int =
            (if (from.folded != to.folded) FOLD else 0) + (if (from.landscape != to.landscape) TURN else 0)
    }
}
