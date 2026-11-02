package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** D-67. 리터럴 토큰의 자리 · 값. 잘못 읽으면 빠른 경로가 엉뚱한 자리를 고치려 들어 — 정책이 막지만 — 컴파일로 새는 저장이 는다. */
class KotlinLiteralsTest {
    private fun texts(src: String) = KotlinLiterals.scan(src)!!.map { src.substring(it.start, it.end) }

    @Test fun `숫자 · 문자 · 단순 문자열 · 불리언만 토큰이다`() {
        val src = """
            fun Card(enabled: Boolean = true) {
                // 주석 속 16.dp 와 "문자열"
                /* 겹친 /* 주석 */ 24 */
                Inner(0xFF6C5CE7, 1_000L, 0.5f, 1e3, 'x', "길찾기 \"화면\"", false)
                val r = 1..10
                Box(Modifier.padding(16.dp).size(h1))
            }
        """.trimIndent()
        assertEquals(listOf("true", "0xFF6C5CE7", "1_000L", "0.5f", "1e3", "'x'", "\"길찾기 \\\"화면\\\"\"", "false", "1", "10", "16"), texts(src))
    }

    @Test fun `템플릿 · 원시 문자열은 코드로 남고 그 속 식의 리터럴은 토큰이다`() {
        val src = "val a = \"Hello \$name\"\nval b = \"n=\${count + 1}\"\nval c = \"\"\"raw 7 \${2}\"\"\""
        assertEquals(listOf("1", "2"), texts(src))
    }

    @Test fun `끝나지 않은 문자열 · 주석은 읽지 못한다`() {
        assertNull(KotlinLiterals.scan("val s = \"abc\nval t = 1"))
        assertNull(KotlinLiterals.scan("/* 열린 주석"))
    }

    @Test fun `값은 키의 타입으로 읽고 타입이 바뀌면 null`() {
        assertEquals(24, KotlinLiterals.value("Int", "24"))
        assertEquals(-3, KotlinLiterals.value("Int", "3", negate = true))
        assertEquals(Int.MIN_VALUE, KotlinLiterals.value("Int", "2147483648", negate = true))
        assertNull(KotlinLiterals.value("Int", "2147483648"))                // Int를 넘는다
        assertNull(KotlinLiterals.value("Int", "16.5"))                      // Double이 된다
        assertNull(KotlinLiterals.value("Int", "16L"))
        assertEquals(0xFF6C5CE7L, KotlinLiterals.value("Long", "0xFF6C5CE7"))
        assertEquals(1000L, KotlinLiterals.value("Long", "1_000L"))
        assertEquals(0.8f, KotlinLiterals.value("Float", "0.8f"))
        assertEquals(2f, KotlinLiterals.value("Float", "2f"))
        assertNull(KotlinLiterals.value("Float", "0.8"))
        assertEquals(1.5, KotlinLiterals.value("Double", "1.5"))
        assertNull(KotlinLiterals.value("Double", "2"))                      // 정수 리터럴은 Double 자리에 못 온다
        assertEquals(true, KotlinLiterals.value("Boolean", "true"))
        assertEquals('\n', KotlinLiterals.value("Char", "'\\n'"))
        assertEquals('A', KotlinLiterals.value("Char", "'\\u0041'"))
        assertEquals("길 \"찾기\"\t\$", KotlinLiterals.value("String", "\"길 \\\"찾기\\\"\\t\\\$\""))
        assertNull(KotlinLiterals.value("String", "\"Hi \$name\""))          // 템플릿
        assertNull(KotlinLiterals.value("String", "\"bad \\q\""))            // 모르는 이스케이프
        assertNull(KotlinLiterals.value("UInt", "1u"))
    }

    @Test fun `블록 주석은 겹치고 백틱 이름 속 글자는 토큰이 아니다`() {
        assertEquals(listOf("3"), texts("/* a /* b */ 1 */ val `x 2 true` = 3"))
        assertNull(KotlinLiterals.scan("/* a /* b */ 1"))
        assertNull(KotlinLiterals.scan("val `x = 1"))
    }

    @Test fun `정수 뒤의 점은 점 뒤가 숫자일 때만 소수다`() {
        assertEquals(listOf("1", "10", "16", "3", "1.5", "1"), texts("1..10; 16.dp; 3.toFloat(); 1.5; 1.e3"))
    }

    @Test fun `숫자는 진법 · 밑줄 · 지수 · 접미사까지 한 토큰이다`() {
        assertEquals(
            listOf("0b1010", "0XfF", "1_000", "1u", "2UL", "3U", "1.5e-3", "1e+2", "2E5", "7F", "8L"),
            texts("0b1010 0XfF 1_000 1u 2UL 3U 1.5e-3 1e+2 2E5 7F 8L"),
        )
        assertEquals(listOf("1", "2"), texts("1e x 2e+ y"))
    }

    @Test fun `식별자 속 숫자와 true로 시작하는 이름은 토큰이 아니다`() {
        assertEquals(listOf("true"), texts("h1 _2 true1 x_true true"))
    }

    @Test fun `문자 리터럴은 이스케이프된 따옴표를 넘고 줄이 바뀌면 읽지 못한다`() {
        assertEquals(listOf("'\\''", "'a'"), texts("'\\'' 'a'"))
        assertNull(KotlinLiterals.scan("'a\n'"))
        assertNull(KotlinLiterals.scan("'a"))
    }

    @Test fun `템플릿 식 속 중괄호는 짝을 세고 닫히지 않으면 읽지 못한다`() {
        assertEquals(listOf("1", "2", "3"), texts("val s = \"a\${ f(1) { 2 } }b\"; 3"))
        assertEquals(emptyList<String>(), texts("val s = \"a\$`x`\""))
        assertNull(KotlinLiterals.scan("val s = \"a\${ 1 "))
        assertNull(KotlinLiterals.scan("val s = \"\"\"a\${ 1 "))
        assertNull(KotlinLiterals.scan("val s = \"\"\"a"))
        assertEquals(listOf("4"), texts("\"\"\"\"x\"\"\"\" 4"))
        assertEquals(listOf("5"), texts("} 5"))
    }

    @Test fun `좁은 정수 타입은 범위와 접은 음수를 본다`() {
        assertNull(KotlinLiterals.value("Byte", "128"))
        assertEquals((-128).toByte(), KotlinLiterals.value("Byte", "128", negate = true))
        assertEquals(32767.toShort(), KotlinLiterals.value("Short", "0x7FFF"))
        assertNull(KotlinLiterals.value("Short", "32768"))
        assertEquals(5, KotlinLiterals.value("Int", "0b101"))
        assertNull(KotlinLiterals.value("Int", "07"))
        assertEquals(Long.MIN_VALUE, KotlinLiterals.value("Long", "9223372036854775808", negate = true))
        assertNull(KotlinLiterals.value("Long", "9223372036854775808"))
    }

    @Test fun `실수는 접미사와 소수점 · 지수로 Float과 Double을 가른다`() {
        assertEquals(1000f, KotlinLiterals.value("Float", "1e3f"))
        assertEquals(-0.5f, KotlinLiterals.value("Float", "0.5F", negate = true))
        assertEquals(1000.0, KotlinLiterals.value("Double", "1e3"))
        assertEquals(150.0, KotlinLiterals.value("Double", "1.5e2"))
        assertEquals(-2.5, KotlinLiterals.value("Double", "2.5", negate = true))
        assertNull(KotlinLiterals.value("Double", "1.5f"))
    }

    @Test fun `불리언 · 문자 · 문자열은 접은 음수가 없다`() {
        assertNull(KotlinLiterals.value("Boolean", "true", negate = true))
        assertNull(KotlinLiterals.value("Boolean", "1"))
        assertNull(KotlinLiterals.value("Char", "'a'", negate = true))
        assertNull(KotlinLiterals.value("Char", "'ab'"))
        assertNull(KotlinLiterals.value("Char", "''"))
        assertNull(KotlinLiterals.value("Char", "'\\u004'"))
        assertNull(KotlinLiterals.value("Char", "'\\u004g'"))
        assertNull(KotlinLiterals.value("String", "\"a\"", negate = true))
        assertNull(KotlinLiterals.value("String", "\"\"\"a\"\"\""))
        assertNull(KotlinLiterals.value("String", "\"a"))
    }

    @Test fun `문자열의 달러는 이름 · 중괄호 · 백틱 앞일 때만 템플릿이다`() {
        assertEquals("\$", KotlinLiterals.value("String", "\"\$\""))
        assertEquals("a\$1 \$-", KotlinLiterals.value("String", "\"a\$1 \$-\""))
        assertNull(KotlinLiterals.value("String", "\"\${x}\""))
        assertNull(KotlinLiterals.value("String", "\"\$_x\""))
        assertNull(KotlinLiterals.value("String", "\"\$`x`\""))
        assertEquals("A\b\r\n'\\", KotlinLiterals.value("String", "\"\\u0041\\b\\r\\n\\'\\\\\""))
        assertNull(KotlinLiterals.value("String", "\"a\\\""))
    }
}
