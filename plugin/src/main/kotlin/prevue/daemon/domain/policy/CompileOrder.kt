package prevue.daemon.domain.policy

import java.io.File
import prevue.daemon.entity.Phrase
import prevue.daemon.entity.phrase
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.entity.ModuleGraph

/**
 * 저장 묶음을 모듈마다 그 모듈의 컴파일러로, **의존 먼저** 컴파일한다(Q7). A가 B의 새 시그니처를 쓰면 B가 먼저 오버레이에 있어야 A가 풀린다.
 * 순서는 근사라([ModuleGraph]) 실패한 묶음은 다른 묶음이 성공한 뒤 다시 해 본다 — 더 나아지지 않을 때 멈춘다.
 */
object CompileOrder {
    fun groups(graph: ModuleGraph, files: List<File>): List<Pair<String, List<File>>> =
        files.distinct().groupBy { graph.ownerOf(it) }.entries
            .sortedBy { graph.order(it.key) }
            .map { it.key to it.value }

    /**
     * 끌어낸 인자로 실패했다 — 앱 런타임에만 있는 라이브러리(그 모듈의 `implementation`)를 Gradle 캐시의 원본으로도 못 메웠다.
     * 그 모듈의 덤프를 뜨면 다음 저장부터 그 모듈 자신의 클래스패스를 쓴다. `warmup`에는 파일을 준다 —
     * `--module`만 주면 저장소를 cwd에서 찾아, 대상 밖에서 치면 엉뚱한 저장소에 Gradle을 부른다.
     */
    fun hint(failed: CompileResult): Phrase? = failed.argsFrom?.let { from ->
        val target = failed.files.firstOrNull() ?: "--module ${failed.module}"
        phrase("compile.borrowedArgs", "module" to failed.module, "from" to from, "target" to target)
    }

    /** [compile]이 성공하면 true. 끝까지 실패한 묶음과 그 마지막 결과를 돌려준다. */
    inline fun <R> run(groups: List<Pair<String, List<File>>>, ok: (R) -> Boolean, compile: (String, List<File>) -> R): Pair<List<R>, List<R>> {
        val passed = ArrayList<R>()
        var pending = groups
        var failed = emptyList<R>()
        while (pending.isNotEmpty()) {
            val next = ArrayList<Pair<String, List<File>>>()
            val fails = ArrayList<R>()
            for (g in pending) {
                val r = compile(g.first, g.second)
                if (ok(r)) passed += r else { next += g; fails += r }
            }
            failed = fails
            // 이번 바퀴에 하나도 안 풀렸으면 순서 탓이 아니다
            if (next.size == pending.size) break
            pending = next
        }
        return passed to failed
    }
}
