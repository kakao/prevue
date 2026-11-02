package prevue.daemon.domain.port

/** NFR-6. 프로세스가 OS에서 쥔 메모리. 힙만 보면 layoutlib의 네이티브가 안 보인다 — 렌더 모듈이 늘 때 상한의 근거다(D-37). */
fun interface MemoryMeter {
    /** 못 읽으면 null. */
    fun rssMb(): Long?
}
