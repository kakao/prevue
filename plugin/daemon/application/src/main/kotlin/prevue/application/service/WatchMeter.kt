package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import prevue.application.domain.model.WatchStats
import prevue.application.port.BuildWatcher
import prevue.application.port.SourceWatcher
import prevue.application.port.ValueFiles

@SingleIn(AppScope::class)
@Inject
internal class WatchMeter(
    private val sources: SourceWatcher?,
    private val builds: BuildWatcher?,
    @ValueFiles private val values: SourceWatcher?,
) {
    fun stats(): WatchStats? = sources?.let { w -> WatchStats(w.stats, builds?.stats.orEmpty(), values?.stats.orEmpty()) }
}
