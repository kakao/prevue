package prevue.infrastructure.controller.browser

public class ViewerTarget internal constructor(
    internal val app: () -> Pair<String?, ByteArray?>,
    internal val version: String?,
    internal val branch: (() -> String?)?,
    internal val reveal: (() -> Unit)?,
)
