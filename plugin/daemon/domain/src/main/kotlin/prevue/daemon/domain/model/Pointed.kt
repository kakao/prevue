package prevue.daemon.domain.model

data class Pointed(val node: String?, val chain: List<String>, val bounds: Any?, val previewId: String?, val userChain: List<String>? = null) {
    companion object { val NOTHING = Pointed(null, emptyList(), null, null) }
}
