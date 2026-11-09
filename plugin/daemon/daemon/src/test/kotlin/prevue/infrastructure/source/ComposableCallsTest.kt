package prevue.infrastructure.source

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** 가리키기 카드의 Preview 점프 — `@Preview` 함수 본문이 직접 부른 이름과, 파일이 정의한 `@Composable` 이름. */
class ComposableCallsTest {
    private fun calls(src: String, vararg fns: String) = ComposableCalls.outline(src, fns.toList()).calls
    private fun defined(src: String) = ComposableCalls.outline(src, emptyList()).composables

    @Test fun `본문이 직접 부른 이름 — 괄호 호출과 후행 람다 둘 다, 한정 호출 · 소문자 · 애노테이션은 빼고`() {
        val src = """
            @Preview
            @Composable
            fun CardPreview() {
                AppTheme {
                    Surface(modifier = Modifier.padding(8.dp)) {
                        NewsCard(title = "t", onClick = {})
                        material3.Text("x")
                        remember { 1 }
                        LazyRow<Int> { }
                    }
                }
            }
        """.trimIndent()
        assertEquals(mapOf("CardPreview" to listOf("AppTheme", "Surface", "NewsCard", "LazyRow")), calls(src, "CardPreview"))
    }

    @Test fun `간접 호출은 싣지 않는다 — 래퍼가 부르는 이름은 래퍼의 것이다`() {
        val src = """
            @Composable fun Wrapper() { Card() }
            @Preview @Composable fun P() { Wrapper() }
        """.trimIndent()
        assertEquals(listOf("Wrapper"), calls(src, "P")["P"])
    }

    @Test fun `주석과 문자열 안의 이름은 호출이 아니다`() {
        val src = """
            @Preview @Composable fun P() {
                // Ghost()
                /* Phantom() /* Nested() */ Still() */
                Label(text = "Fake() and ${'$'}{Quoted()}", raw = ${"\"\"\""}Raw() { }${"\"\"\""}, c = '(')
                Real()
            }
        """.trimIndent()
        assertEquals(listOf("Label", "Real"), calls(src, "P")["P"])
    }

    @Test fun `식 본문 — 이어지는 줄은 따라가고 다음 선언에서 멈춘다`() {
        val src = """
            @Preview @Composable fun P() = AppTheme {
                Card()
            }
            @Preview @Composable fun Q(): Unit =
                Other()
            @Composable fun Next() { Never() }
        """.trimIndent()
        assertEquals(mapOf("P" to listOf("AppTheme", "Card"), "Q" to listOf("Other")), calls(src, "P", "Q"))
    }

    @Test fun `정의 — 수정자 · 애노테이션 · 리시버를 넘고, 매개변수 타입의 @Composable은 정의가 아니다`() {
        val src = """
            @Composable
            internal fun NewsCard(content: @Composable () -> Unit) {}
            @Preview(name = "x") @Composable private fun CardPreview() {}
            @Composable fun RowScope.Chip() {}
            @androidx.compose.runtime.Composable fun Qualified() {}
            @Composable fun rememberThing() = 1
            fun Plain() {}
            // @Composable fun Commented() {}
        """.trimIndent()
        assertEquals(listOf("NewsCard", "CardPreview", "Chip", "Qualified"), defined(src))
    }
}
