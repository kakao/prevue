package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** 열기 전에 컴파일할까. 판정 하나씩. */
class FreshnessPolicyTest {
    @Test fun `Gradle 산출물보다 새롭고 이 데몬이 그 내용을 안 읽었을 때만 컴파일한다`() {
        assertTrue(FreshnessPolicy.compileOnOpen(mtime = 300, compiled = null, builtAt = 200))            // 새 파일 · 시작 전에 고친 파일
        assertFalse(FreshnessPolicy.compileOnOpen(mtime = 100, compiled = null, builtAt = 200))           // Gradle이 이 내용을 구웠다
        assertFalse(FreshnessPolicy.compileOnOpen(mtime = 300, compiled = 300L to 310L, builtAt = 200))   // 이미 읽었다
        assertTrue(FreshnessPolicy.compileOnOpen(mtime = 400, compiled = 300L to 310L, builtAt = 200))    // 읽은 뒤 또 바뀌었다
    }

    @Test fun `산출물이 더 새로워도 그 파일의 클래스가 거기 없으면 컴파일한다`() {
        assertTrue(FreshnessPolicy.compileOnOpen(mtime = 100, compiled = null, builtAt = 200) { false })
        assertFalse(FreshnessPolicy.compileOnOpen(mtime = 100, compiled = null, builtAt = 200) { true })
        assertFalse(FreshnessPolicy.compileOnOpen(mtime = 100, compiled = 100L to 310L, builtAt = 200) { false })   // 이미 읽었다 — 실패면 stale이 말한다
    }

    @Test fun `산출물 시각을 모르면 예전처럼 산출물을 믿는다`() {
        assertFalse(FreshnessPolicy.compileOnOpen(mtime = 300, compiled = null, builtAt = null))
        assertTrue(FreshnessPolicy.compileOnOpen(mtime = 300, compiled = null, builtAt = null) { false }, "그래도 클래스가 없으면 컴파일한다")
    }

    @Test fun `오류가 난 파일은 kotlinc가 적은 상대 경로로도 찾는다`() {
        val msg = "app/src/main/kotlin/demo/Half.kt:3:9: error: unresolved reference 'x'.\n        x()\n        ^\nwarning: 무시"
        assertEquals(setOf("/r/app/src/main/kotlin/demo/Half.kt"),
            FreshnessPolicy.blamed(listOf("/r/app/src/main/kotlin/demo/Half.kt", "/r/app/src/main/kotlin/demo/Screen.kt"), msg))
        assertTrue(FreshnessPolicy.blamed(listOf("/r/a/Half.kt"), "e: 가짜 실패").isEmpty())
    }

    @Test fun `새 파일은 Gradle 산출물보다 새로울 때만 싣는다 — 모르면 싣는다`() {
        assertTrue(FreshnessPolicy.newerThanBuild(mtime = 300, builtAt = 200))
        assertFalse(FreshnessPolicy.newerThanBuild(mtime = 100, builtAt = 200))
        assertTrue(FreshnessPolicy.newerThanBuild(mtime = 100, builtAt = null))
    }

    @Test fun `컴파일러가 선언이 겹친다고 한 파일만 겹친 것으로 본다`() {
        val msg = "/r/copy/Screen.kt:109:1: error: conflicting overloads:\nfun Screen(): Unit\n/r/app/Screen.kt:119:5: error: overload resolution ambiguity between candidates:\n"
        assertTrue(FreshnessPolicy.duplicateIn(setOf("/r/copy/Screen.kt"), msg))
        assertTrue(FreshnessPolicy.duplicateIn(setOf("/r/app/Screen.kt"), msg))
        assertFalse(FreshnessPolicy.duplicateIn(setOf("/r/other/Card.kt"), msg))
    }

    @Test fun `이름이 같아도 컴파일러가 겹친다고 하지 않으면 겹친 것이 아니다`() {
        assertFalse(FreshnessPolicy.duplicateIn(setOf("/r/common/Platform.kt"), "/r/common/Platform.kt:3:9: error: unresolved reference 'x'.\n"))
        assertFalse(FreshnessPolicy.duplicateIn(setOf("/r/common/Platform.kt"), ""))
    }
}
