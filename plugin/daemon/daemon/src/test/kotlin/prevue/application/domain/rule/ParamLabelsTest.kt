package prevue.application.domain.rule

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** `@PreviewParameter` 카드의 이름(D-151 ④). 값이 enum · 숫자 · 짧은 문자열이면 그 toString, 아니면 null 이라 `#n` 으로 남는다. */
class ParamLabelsTest {
    private enum class Kind { FRUIT_TEA, MILK_TEA, YOGURT }
    private data class Drink(val id: Int, val name: String)
    private class Plain

    @Test fun `enum 숫자 불리언 글자 짧은 문자열은 toString 으로 부른다`() {
        assertEquals(listOf("FRUIT_TEA", "MILK_TEA", "YOGURT"), ParamLabels.of(Kind.entries, 3))
        assertEquals(listOf("1", "2.5", "true", "x", "Alice"), ParamLabels.of(listOf(1, 2.5, true, 'x', "Alice"), 5))
    }

    @Test fun `데이터 클래스 기본 toString 긴 문자열 여러 줄 빈 문자열은 이름이 없다`() {
        val long = "a".repeat(ParamLabels.MAX_LENGTH + 1)
        assertEquals(listOf(null, null, null, null, null, "b".repeat(ParamLabels.MAX_LENGTH)),
            ParamLabels.of(listOf(Drink(1, "a"), Plain(), long, "두\n줄", " ", "b".repeat(ParamLabels.MAX_LENGTH)), 6))
    }

    @Test fun `번호와 헷갈리거나 한 줄로 안 보이는 글자는 이름이 없다`() {
        assertEquals(listOf(null, null, null, null, null, "#a"), ParamLabels.of(listOf("#1", "a\tb", "x\u2028y", " pad", "pad ", "#a"), 6))
    }

    @Test fun `같은 이름이 둘 이상이면 그 값들은 이름이 없다`() {
        assertEquals(listOf(null, "b", null), ParamLabels.of(listOf("a", "b", "a"), 3))
    }

    @Test fun `값을 못 읽었거나 toString 이 던지면 그 자리만 이름이 없다`() {
        val throwing = object : CharSequence by "x" { override fun toString(): String = error("사용자 코드") }
        assertEquals(listOf("a", null, null), ParamLabels.of(listOf("a", throwing), 3))
        assertEquals(listOf(null, null), ParamLabels.of(emptyList(), 2))
    }
}
