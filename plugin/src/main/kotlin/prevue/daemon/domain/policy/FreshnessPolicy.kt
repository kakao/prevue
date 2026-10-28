package prevue.daemon.domain.policy

/** 그릴 클래스가 소스를 따라잡았나 — 오버레이에도 Gradle 산출물에도 지금 내용이 없으면 옛 클래스로(새 파일이면 빈 그림으로) 그려진다. */
object FreshnessPolicy {
    /**
     * 열 파일을 그리기 전에 컴파일해야 하는가. 감시는 생성을 저장으로 보지 않고(D-56) 데몬이 뜨기 전의 변경은 보지 못한다 —
     * 새 파일과 시작 전에 고친 파일은 아무도 컴파일하지 않은 채 열린다.
     * @param compiled 이 데몬의 컴파일이 그 파일을 마지막으로 읽은 (mtime, 시각). 없으면 이 데몬은 그 파일을 컴파일한 적이 없다.
     * @param builtAt 그 모듈의 Gradle Kotlin 산출물이 마지막으로 쓰인 시각. 모르면 null.
     */
    inline fun compileOnOpen(mtime: Long, compiled: Pair<Long, Long>?, builtAt: Long?, classesBuilt: () -> Boolean = { true }): Boolean {
        if (compiled?.first == mtime) return false
        return (builtAt != null && mtime > builtAt) || !classesBuilt()
    }

    /** 새 파일이 아직 Gradle 산출물에 없을 수 있나. 산출물 시각을 모르면 그렇다고 본다 — 감시가 생성을 봤다. */
    fun newerThanBuild(mtime: Long, builtAt: Long?): Boolean = builtAt == null || mtime > builtAt

    // 외부: kotlinc가 선언이 겹친 컴파일을 이 문구들로 보고한다
    private val duplicateErrors = listOf("conflicting overloads", "overload resolution ambiguity", "redeclaration", "conflicting declarations")

    fun duplicateIn(paths: Collection<String>, messages: String): Boolean =
        messages.lineSequence().filter { ": error:" in it }.any { line ->
            val file = line.substringBefore(':')
            val text = line.substringAfter(": error:").trim().lowercase()
            paths.any { it == file || it.endsWith("/$file") } && duplicateErrors.any(text::startsWith)
        }

    /** 실패한 컴파일의 오류가 자기 안에 난 파일들([paths] 중). kotlinc는 `경로:줄:칸: error:`로 적고 경로가 상대일 수 있어 뒤에서 맞춘다. */
    fun blamed(paths: Collection<String>, messages: String): Set<String> {
        val at = messages.lineSequence().filter { ": error:" in it }.map { it.substringBefore(':') }.filter { it.isNotBlank() }.toSet()
        return paths.filter { p -> at.any { p == it || p.endsWith("/$it") } }.toSet()
    }
}
