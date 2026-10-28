package prevue.daemon

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SkillBudgetTest {
    @Test fun `스킬은 입구 하나이고 에이전트마다 20KB 이하다`() {
        val over = listOf("skills", "codex/skills").flatMap { root ->
            val sizes = File(root).listFiles { f -> f.isDirectory }.orEmpty()
                .associate { it.name to File(it, "SKILL.md").length() }
            assertEquals(setOf("prevue"), sizes.keys, "$root 에 입구 말고 다른 스킬이 있다(D-86)")
            listOfNotNull("$root/prevue ${sizes.getValue("prevue")}B > $ENTRY_MAX".takeIf { sizes.getValue("prevue") > ENTRY_MAX })
        }
        assertTrue(over.isEmpty(), "스킬이 컨텍스트 예산을 넘었다 — 줄이거나 기획 NFR-16부터 고친다:\n" + over.joinToString("\n"))
    }

    private companion object {
        const val ENTRY_MAX = 20_000L
    }
}
