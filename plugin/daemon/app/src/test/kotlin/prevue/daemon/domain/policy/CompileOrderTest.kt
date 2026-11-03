package prevue.daemon.domain.policy

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.daemon.entity.ModuleGraph
import prevue.daemon.entity.ModuleNode

/** Q7. 의존 순서는 근사다 — 틀려도 다시 해 보면 풀리고, 순서 탓이 아닌 실패에서는 멈춘다. */
class CompileOrderTest {
    private val a = ModuleNode(":a", listOf(File("/r/a/src")), emptyList())
    private val b = ModuleNode(":b", listOf(File("/r/b/src")), emptyList())
    private val fa = File("/r/a/src/A.kt")
    private val fb = File("/r/b/src/B.kt")

    @Test fun `모듈별로 묶어 그래프 순서로 낸다 — 소스 루트 밖은 렌더 모듈 것이다`() {
        val g = ModuleGraph(":a", listOf(b, a))
        val copy = File("/elsewhere/A.kt")
        assertEquals(listOf(":b" to listOf(fb), ":a" to listOf(fa, copy)), CompileOrder.groups(g, listOf(fa, fb, copy, fa)))
    }

    @Test fun `순서가 틀려 실패한 묶음은 다른 묶음이 성공한 뒤 다시 한다`() {
        val g = ModuleGraph(":a", listOf(a, b))                      // a가 b를 쓰는데 a가 먼저다
        val done = ArrayList<String>()
        val (passed, failed) = CompileOrder.run(CompileOrder.groups(g, listOf(fa, fb)), { it: Boolean -> it }) { m, _ ->
            val ok = m != ":a" || ":b" in done
            done += if (ok) m else "$m!"
            ok
        }
        assertEquals(listOf(":a!", ":b", ":a"), done)
        assertEquals(2, passed.size)
        assertEquals(0, failed.size)
    }

    @Test fun `더 나아지지 않으면 멈추고 실패를 돌려준다`() {
        val g = ModuleGraph(":a", listOf(a, b))
        var calls = 0
        val (passed, failed) = CompileOrder.run(CompileOrder.groups(g, listOf(fa, fb)), { it: Boolean -> it }) { m, _ -> calls++; m == ":b" }
        assertEquals(3, calls)                                         // a 실패 · b 성공 · a 다시 실패 — 거기서 멈춘다
        assertEquals(1, passed.size)
        assertEquals(1, failed.size)
    }
}
