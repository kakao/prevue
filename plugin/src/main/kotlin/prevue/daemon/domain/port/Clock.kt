package prevue.daemon.domain.port

/** 판정에 쓰는 지금 시각을 내준다. 기다림의 요청 시각 · 컴파일 시각 · 유휴 판정이 이것을 읽어 테스트가 시간을 밀 수 있다. 구간 측정(nanoTime)은 여기로 오지 않는다. */
fun interface Clock {
    fun nowMs(): Long
}
