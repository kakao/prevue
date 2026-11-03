package prevue.json

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class JsonTest {
    @Test fun `정수인 실수는 소수점 없이 쓰고 소수는 그대로 쓴다`() {
        assertEquals("[3,2.5,1,-0.25]", Json.str(listOf(3.0, 2.5, 1.0f, -0.25f)))
    }

    @Test fun `맵 · 목록 · 배열은 순서대로 쓰고 키는 문자열로 쓴다`() {
        val m = linkedMapOf<Any?, Any?>(1 to listOf("a", null), "b" to arrayOf<Any>(true, 7L), "c" to emptyMap<String, Any>(), "d" to emptyList<Any>())
        assertEquals("""{"1":["a",null],"b":[true,7],"c":{},"d":[]}""", Json.str(m))
    }

    @Test fun `모르는 값은 문자열로 쓰고 제어 문자는 이스케이프한다`() {
        assertEquals(""""x/y"""", Json.str(object { override fun toString() = "x/y" }))
        assertEquals(""""q\"b\\n\nr\rt\t\u0001"""", Json.str("q\"b\\n\nr\rt\t\u0001"))
    }

    @Test fun `쓴 것을 다시 읽으면 같은 값이다`() {
        val m = mapOf("s" to "가\"\n", "n" to 12L, "d" to 1.5, "l" to listOf(true, false, null), "o" to mapOf("k" to "v"))
        assertEquals(m, Json.parse(Json.str(m)))
    }

    @Test fun `맵 값은 문자열 맵으로 읽고 없으면 비었다`() {
        val m = mapOf<String, Any?>("p" to mapOf("a" to 1L, "b" to "x"), "q" to "아님")
        assertEquals(mapOf("a" to "1", "b" to "x"), m.map("p"))
        assertEquals(emptyMap<String, String>(), m.map("q"))
        assertEquals(emptyMap<String, String>(), m.map("없음"))
    }
}
