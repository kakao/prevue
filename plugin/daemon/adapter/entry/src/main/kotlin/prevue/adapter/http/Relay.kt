package prevue.adapter.http

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob

@SingleIn(AppScope::class)
public class Relay @Inject internal constructor(parent: CoroutineScope) {
    internal val job: Job = SupervisorJob(parent.coroutineContext[Job])
    internal val scope: CoroutineScope = CoroutineScope(parent.coroutineContext + job + Dispatchers.Default)
}
