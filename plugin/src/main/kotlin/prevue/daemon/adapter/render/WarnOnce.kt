package prevue.daemon.adapter.render

internal class WarnOnce(private val message: String, private val log: (String) -> Unit = { System.err.println("[prevue] $it") }) {
    private var warned = false

    operator fun invoke(e: Throwable) {
        if (warned) return
        warned = true
        log("$message: $e")
    }
}
