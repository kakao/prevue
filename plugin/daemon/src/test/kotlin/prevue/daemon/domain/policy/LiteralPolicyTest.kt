package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.domain.port.LiteralSite
import prevue.daemon.domain.policy.LiteralPolicy.Plan

/** D-67. 리터럴만 바뀐 저장만 컴파일 없이 간다. 의심스러우면 컴파일 — 컴파일은 늘 맞는 그림을 낸다. */
class LiteralPolicyTest {
    private val old = "@Composable\nfun Card() {\n    Box(Modifier.padding(16.dp).size(24.dp))\n    Text(\"길찾기\")\n}\n"

    /** [old]의 리터럴 자리 — 컴파일러가 달았을 키 · 오프셋 · 기본값. */
    private fun sites(src: String = old, composable: Boolean = true) = listOf(
        LiteralSite("Int\$arg-0\$call-padding\$fun-Card", src.indexOf("16"), "Int", composable, 16),
        LiteralSite("Int\$arg-0\$call-size\$fun-Card", src.indexOf("24"), "Int", composable, 24),
        LiteralSite("String\$arg-0\$call-Text\$fun-Card", src.indexOf("\"길찾기\""), "String", composable, "길찾기"),
    )

    private fun plan(new: String, sites: List<LiteralSite> = sites(), taken: Set<String> = emptySet()) = LiteralPolicy.plan(old, new, sites, taken)

    @Test fun `바이트까지 같으면 Same`() = assertEquals(Plan.Same, plan(old))

    @Test fun `리터럴만 바뀌면 값과 옮긴 자리를 낸다`() {
        val new = old.replace("16.dp", "120.dp").replace("\"길찾기\"", "\"길 찾기 화면\"")
        val p = plan(new) as Plan.Patch
        assertEquals(mapOf("Int\$arg-0\$call-padding\$fun-Card" to 120, "String\$arg-0\$call-Text\$fun-Card" to "길 찾기 화면"), p.values)
        // 옮긴 표는 새 내용의 자리 · 값이다 — 다음 저장은 이것과 견준다.
        assertEquals(listOf(new.indexOf("120"), new.indexOf("24.dp"), new.indexOf("\"길 찾기 화면\"")), p.sites.map { it.offset })
        assertEquals(listOf<Any?>(120, 24, "길 찾기 화면"), p.sites.map { it.value })
        assertEquals(Plan.Same, LiteralPolicy.plan(new, new, p.sites, emptySet()))
        assertTrue(LiteralPolicy.plan(new, old, p.sites, emptySet()) is Plan.Patch)          // 되돌리는 것도 빠른 경로
    }

    @Test fun `코드 · 공백 · 주석이 바뀌면 컴파일`() {
        assertTrue(plan(old.replace("Box(", "Row(")) is Plan.Compile)
        assertTrue(plan(old.replace("16.dp", "16.dp ")) is Plan.Compile)
        assertTrue(plan(old + "// 메모\n") is Plan.Compile)
        assertTrue(plan(old.replace("16.dp", "-16.dp")) is Plan.Compile)                      // 단항 `-`가 생겼다
    }

    @Test fun `컴파일러가 단 자리 · 컴포저블 · 값 · 타입이 맞아야 넣는다`() {
        assertTrue(plan(old.replace("16.dp", "20.dp"), sites().drop(1)) is Plan.Compile)       // 자리가 없다
        assertTrue(plan(old.replace("16.dp", "20.dp"), sites(composable = false)) is Plan.Compile)
        // 컴파일된 값이 토큰과 다르다 — 컴파일러가 식을 접은 자리(`"x" + "y"`)다.
        assertTrue(plan(old.replace("16.dp", "20.dp"), sites().map { if (it.value == 16) it.copy(value = 99) else it }) is Plan.Compile)
        assertTrue(plan(old.replace("16.dp", "16.5.dp")) is Plan.Compile)                     // Int → Double
    }

    @Test fun `값을 넣어 둔 다른 파일과 키가 겹치면 바뀌지 않은 리터럴이라도 컴파일 — 런타임 캐시가 키 하나로만 찾는다`() =
        assertTrue(plan(old.replace("16.dp", "20.dp"), taken = setOf("Int\$arg-0\$call-size\$fun-Card")) is Plan.Compile)

    @Test fun `빠른 경로가 기대와 다르게 도는 거절만 routine 이 아니다`() {
        assertEquals(true, (plan(old.replace("Box(", "Row(")) as Plan.Compile).routine)
        assertEquals(true, (plan(old.replace("16.dp", "20.dp"), sites(composable = false)) as Plan.Compile).routine)
        assertEquals(false, (plan(old.replace("16.dp", "20.dp"), taken = setOf("Int\$arg-0\$call-size\$fun-Card")) as Plan.Compile).routine)
        assertEquals(false, (plan(old.replace("16.dp", "20.dp"), sites().map { if (it.value == 16) it.copy(value = 99) else it }) as Plan.Compile).routine)
    }

    @Test fun `이항 뺄셈의 리터럴은 숫자에 단 자리로 넣는다`() {
        val src = "@Composable\nfun Card() { Offset(gap-3) }\n"
        val s = listOf(LiteralSite("Int\$arg-0\$call-minus\$fun-Card", src.indexOf("3)"), "Int", true, 3))
        val p = LiteralPolicy.plan(src, src.replace("-3", "-12"), s, emptySet()) as Plan.Patch
        assertEquals(mapOf("Int\$arg-0\$call-minus\$fun-Card" to 12), p.values)
    }

    @Test fun `접힌 단항 음수는 -에 단 자리로 넣는다`() {
        val src = "@Composable\nfun Card() { Offset(-3) }\n"
        val s = listOf(LiteralSite("Int\$arg-0\$call-Offset\$fun-Card", src.indexOf("-3"), "Int", true, -3))
        val p = LiteralPolicy.plan(src, src.replace("-3", "-12"), s, emptySet()) as Plan.Patch
        assertEquals(mapOf("Int\$arg-0\$call-Offset\$fun-Card" to -12), p.values)
        assertEquals(src.indexOf("-3"), p.sites.single().offset)
    }
}
