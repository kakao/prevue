package prevue.daemon.domain.policy

import prevue.daemon.domain.port.LiteralSite

private typealias Change = Pair<KotlinLiterals.Token, KotlinLiterals.Token>

object LiteralPolicy {
    sealed interface Plan {
        data object Same : Plan
        data class Patch(val values: Map<String, Any>, val sites: List<LiteralSite>) : Plan
        data class Compile(val why: String, val routine: Boolean = true) : Plan
    }

    fun plan(old: String, new: String, sites: List<LiteralSite>, taken: Set<String>): Plan {
        if (old == new) return Plan.Same
        if (sites.isEmpty()) return Plan.Compile("리터럴 자리가 없다")
        val a = KotlinLiterals.scan(old) ?: return Plan.Compile("옛 내용을 읽지 못했다")
        val b = KotlinLiterals.scan(new) ?: return Plan.Compile("새 내용을 읽지 못했다")
        if (a.size != b.size) return Plan.Compile("리터럴 수가 다르다")
        val changed = changedTokens(old, new, a, b) ?: return Plan.Compile("코드가 바뀌었다")
        if (sites.any { it.key in taken }) return Plan.Compile("값을 넣어 둔 다른 파일과 키가 겹친다", routine = false)
        val at = sites.associateBy { it.offset }
        val values = LinkedHashMap<String, Any>()
        for ((x, y) in changed) {
            when (val r = read(old, new, x, y, at)) {
                is Reading.Refused -> return r.compile
                is Reading.Value -> values[r.key] = r.value
            }
        }
        return Plan.Patch(values, moved(sites, changed, values))
    }

    private fun changedTokens(old: String, new: String, a: List<KotlinLiterals.Token>, b: List<KotlinLiterals.Token>): List<Change>? {
        val changed = ArrayList<Change>()
        var endA = 0; var endB = 0
        for (k in a.indices) {
            val x = a[k]; val y = b[k]
            if (!same(old, endA, x.start, new, endB, y.start)) return null
            if (old.substring(x.start, x.end) != new.substring(y.start, y.end)) changed += x to y
            endA = x.end; endB = y.end
        }
        return changed.takeIf { same(old, endA, old.length, new, endB, new.length) }
    }

    private sealed interface Reading {
        class Value(val key: String, val value: Any) : Reading
        class Refused(val compile: Plan.Compile) : Reading
    }

    private fun refuse(why: String, routine: Boolean = true) = Reading.Refused(Plan.Compile(why, routine))

    private fun read(old: String, new: String, x: KotlinLiterals.Token, y: KotlinLiterals.Token, at: Map<Int, LiteralSite>): Reading {
        val direct = at[x.start]
        val folded = if (direct == null && x.start > 0 && old[x.start - 1] == '-') at[x.start - 1] else null
        val site = direct ?: folded ?: return refuse("컴파일러가 자리를 달지 않은 리터럴이다")
        if (!site.composable) return refuse("컴포저블 밖의 리터럴이다")
        val was = KotlinLiterals.value(site.type, old.substring(x.start, x.end), negate = folded != null)
        if (site.value == null || was != site.value) return refuse("컴파일된 값과 토큰이 맞지 않는다", routine = false)
        val now = KotlinLiterals.value(site.type, new.substring(y.start, y.end), negate = folded != null)
            ?: return refuse("${site.type} 리터럴로 읽히지 않는다 — 타입이 바뀐다")
        return Reading.Value(site.key, now)
    }

    private fun moved(sites: List<LiteralSite>, changed: List<Change>, values: Map<String, Any>): List<LiteralSite> {
        val shifts = changed.map { (x, y) -> x.end to (y.end - y.start) - (x.end - x.start) }
        return sites.map { s ->
            s.copy(offset = s.offset + shifts.sumOf { (end, d) -> if (end <= s.offset) d else 0 }, value = values[s.key] ?: s.value)
        }
    }

    private fun same(a: String, fromA: Int, toA: Int, b: String, fromB: Int, toB: Int): Boolean =
        toA - fromA == toB - fromB && a.regionMatches(fromA, b, fromB, toA - fromA)
}
