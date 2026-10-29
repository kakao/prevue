package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class ExpectActualTest {
    @Test fun `expect · actual 선언을 찾는다 — 앞 수식어 · 애노테이션과 함께`() {
        listOf(
            "expect object LocalAppTheme {",
            "internal expect fun createTestAppGraph(): TestAppGraph",
            "@Composable\nexpect fun changoFontFamily(): FontFamily",
            "@Composable expect fun robotoRegularFontFamily(): FontFamily",
            "actual fun platform() = \"Android\"",
            "public actual typealias Uuid = java.util.UUID",
            "actual inline fun <T> measure(block: () -> T): T = block()",
            "expect abstract class Base",
            "    actual val name: String = \"x\"",
            "@Suppress(\"X\") internal actual object Clock",
        ).forEach { assertTrue(ExpectActual.declares(it), it) }
    }

    @Test fun `이름 · 문자열 · 주석 속의 expect · actual 은 선언이 아니다`() {
        listOf(
            "val expected = 1",
            "fun expect(value: Int) = value",
            "val actual = compute()",
            "assertEquals(expected, actual)",
            "Text(\"the actual value\")",
            "// expect fun later()",
            "@Preview\n@Composable\nfun Screen() = Unit",
        ).forEach { assertFalse(ExpectActual.declares(it), it) }
    }
}
