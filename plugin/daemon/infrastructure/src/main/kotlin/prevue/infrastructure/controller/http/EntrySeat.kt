package prevue.infrastructure.controller.http

import java.io.File

public class HttpSeat internal constructor(
    internal val port: Int,
    internal val root: String?,
    internal val viewerDir: File,
    internal val outDir: File,
)

public fun interface EntryLog {
    public operator fun invoke(line: String)
}

public fun interface LiveStats {
    public fun observed(): Map<String, Any?>
}
