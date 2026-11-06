package prevue.application.port

fun interface EngineLog {
    operator fun invoke(line: String)
}
