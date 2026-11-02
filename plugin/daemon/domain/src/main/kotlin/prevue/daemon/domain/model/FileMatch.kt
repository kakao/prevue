package prevue.daemon.domain.model

sealed interface FileMatch {
    data class Path(val path: String) : FileMatch
    data class Ambiguous(val candidates: List<String>) : FileMatch
    data object Unknown : FileMatch
}
