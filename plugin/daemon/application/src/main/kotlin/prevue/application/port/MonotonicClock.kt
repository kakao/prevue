package prevue.application.port

fun interface MonotonicClock {
    fun nowMs(): Long

    companion object {
        val SYSTEM = MonotonicClock { System.nanoTime() / 1_000_000 }
    }
}
