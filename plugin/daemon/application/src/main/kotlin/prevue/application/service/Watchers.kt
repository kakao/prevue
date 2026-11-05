package prevue.application.service

import dev.zacsweers.metro.Inject
import prevue.application.domain.model.WatchStats
import prevue.application.port.BuildWatcher
import prevue.application.port.SourceWatcher
import prevue.application.port.ValueFiles

@Inject
internal class Watchers(
    private val sources: SourceWatcher?,
    private val builds: BuildWatcher?,
    @ValueFiles private val values: SourceWatcher?,
) {
    fun stats(): WatchStats? = sources?.let { w -> WatchStats(w.stats, builds?.stats.orEmpty(), values?.stats.orEmpty()) }
}
