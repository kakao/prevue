package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import prevue.application.domain.model.Keyed
import prevue.application.port.FailureKind

class RenderVerdictTextTest {
    // DroidKaigi 2025 TimetableTopAppBar 프리뷰가 실제로 낸 렌더 보고 — 던진 곳(androidx.xr)은 brief 가 걸러 앱 프레임만 남는다
    private val xrActivity = """
        The image is empty
        View layout failed (Details)
        java.lang.IllegalStateException: Unexpected Context type when trying to resolve the context's Activity.
            at io.github.droidkaigi.confsched.common.compose.SpacialEnvironment_androidKt.rememberXrEnvironment(SpacialEnvironment.android.kt:33)
    """.trimIndent()

    @Test fun `컨텍스트에서 Activity를 찾다 던지면 Activity가 필요하다는 안내를 앞에 붙인다`() {
        val (kind, message) = RenderVerdict.byText(xrActivity)!!
        assertEquals(FailureKind.EXCEPTION, kind)
        assertEquals("render.needsActivity", ((message as Keyed).args["head"] as Keyed).key)
        assertEquals(true, message.text.endsWith(xrActivity))
    }

    @Test fun `Activity 문구가 없는 예외는 문구로 가르지 않는다`() {
        assertNull(RenderVerdict.byText("java.lang.IllegalStateException: Unexpected Context type"))
    }
}
