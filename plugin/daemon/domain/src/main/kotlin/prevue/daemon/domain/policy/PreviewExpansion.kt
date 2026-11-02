package prevue.daemon.domain.policy

import prevue.daemon.entity.PreviewSpec

/**
 * `@PreviewParameter` 제공자가 값을 여럿 내면 값마다 한 장으로 나눈다 — AS가 `userNewsResources 0`처럼 가르는 자리다.
 * 값의 개수는 렌더러만 알아서 [countOf]로 받는다.
 */
object PreviewExpansion {
    fun expand(found: List<PreviewSpec>, countOf: (PreviewSpec) -> Int): List<PreviewSpec> {
        if (found.none { it.methodParams.isNotEmpty() }) return found
        val out = ArrayList<PreviewSpec>()
        for (p in found) {
            val n = countOf(p)
            if (n <= 1) { out += p.copy(index = out.size); continue }
            for (k in 0 until n) out += p.copy(previewId = "${p.previewId}_p$k", paramIndex = k, paramCount = n, index = out.size)
        }
        return out
    }
}
