package prevue.application.domain.rule

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.application.port.BuildChange
import prevue.application.domain.rule.ExternalPolicy.Plan

/** 밖의 변화를 누가 닫나. 스레드도 렌더러도 없이 판정 하나씩. */
class ExternalPolicyTest {
    @Test fun `갱신 중에는 산출물 재생성을 기다리고 조용해졌을 때만 다시 그린다`() {
        val own = BuildChange(own = listOf(File("o")), outputsExist = true)
        val gone = own.copy(outputsExist = false)
        assertEquals(Plan.Noted, ExternalPolicy.plan(BuildChange(resources = listOf(File("r")), outputsExist = true), done = true, hasPreview = true))
        assertEquals(Plan.NoPreview, ExternalPolicy.plan(own, done = true, hasPreview = false))
        assertEquals(Plan.BuildPending, ExternalPolicy.plan(gone, done = false, hasPreview = true))
        assertEquals(Plan.OutputsGone, ExternalPolicy.plan(gone, done = true, hasPreview = true))
        assertEquals(Plan.BuildPending, ExternalPolicy.plan(own, done = false, hasPreview = true))
        assertEquals(Plan.Redraw(clear = listOf(":lib")), ExternalPolicy.plan(own, done = true, hasPreview = true, rebuilt = listOf(":lib")))
        assertEquals(Plan.Redraw(clear = emptyList()), ExternalPolicy.plan(BuildChange(deps = listOf(File("d")), outputsExist = true), done = true, hasPreview = true))
    }
}
