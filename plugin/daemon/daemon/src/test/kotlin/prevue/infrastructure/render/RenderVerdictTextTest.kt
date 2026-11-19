package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.port.FailureKind

class RenderVerdictTextTest {
    // DroidKaigi 2025 TimetableTopAppBar 프리뷰의 렌더 로거 텍스트 — 던진 곳(androidx.xr)은 brief 가 걸러 앱 프레임만 남는다
    private val xrActivity = """
        View layout failed (Details)
        java.lang.IllegalStateException: Unexpected Context type when trying to resolve the context's Activity.
            at io.github.droidkaigi.confsched.common.compose.SpacialEnvironment_androidKt.rememberXrEnvironment(SpacialEnvironment.android.kt:33)
    """.trimIndent()

    // help/failures.txt 가 이 머리로 시작한다고 약속한다
    @Test fun `컨텍스트에서 Activity를 찾다 던지면 Activity가 필요하다는 안내로 시작한다`() {
        val (kind, message) = RenderVerdict.byText(xrActivity)!!
        assertEquals(FailureKind.EXCEPTION, kind)
        assertTrue(message.text.startsWith("This Preview needs an Activity"))
        assertTrue(message.text.endsWith(xrActivity))
    }
}
