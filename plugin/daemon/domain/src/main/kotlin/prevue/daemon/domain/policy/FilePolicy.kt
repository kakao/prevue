package prevue.daemon.domain.policy

import prevue.daemon.domain.model.FileMatch

/** 가리킨 베이스네임을 풀패스로 — 하나면 그것, 여럿이면 데몬이 보는 모듈의 소스 루트 안쪽을 먼저 본다. */
object FilePolicy {
    // 거기서도 갈리면 후보를 그대로 돌려준다 — 같은 이름이 여러 곳에 있는 비율은 실측 1%라 사람에게 묻는 값이 있다.
    fun match(candidates: List<String>, sourceRoots: List<String>): FileMatch {
        if (candidates.isEmpty()) return FileMatch.Unknown
        if (candidates.size == 1) return FileMatch.Path(candidates[0])
        val near = candidates.filter { c -> sourceRoots.any { c.startsWith("$it/") } }
        val pool = near.ifEmpty { candidates }
        return if (pool.size == 1) FileMatch.Path(pool[0]) else FileMatch.Ambiguous(pool)
    }
}
