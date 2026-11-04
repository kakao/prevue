package prevue.adapter.infra

import dev.zacsweers.metro.Qualifier

public fun interface InfraLog {
    public operator fun invoke(line: String)
}

@Qualifier
public annotation class WatchRoots
