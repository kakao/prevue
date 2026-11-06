package prevue.application.port

interface ScrollRider {
    fun frame(s: LiveSession)
    suspend fun stop(s: LiveSession, catchUp: suspend () -> Unit): Boolean
}
