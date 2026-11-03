package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.daemon.domain.model.FileMatch

/** 가리킨 베이스네임의 풀패스. 스레드도 렌더러도 없이 판정 하나씩. */
class FilePolicyTest {
    @Test fun `모듈 소스 루트 안쪽을 먼저 보고 거기서도 갈리면 묻는다`() {
        val roots = listOf("/r/app/src")
        assertEquals(FileMatch.Unknown, FilePolicy.match(emptyList(), roots))
        assertEquals(FileMatch.Path("/r/lib/A.kt"), FilePolicy.match(listOf("/r/lib/A.kt"), roots))
        assertEquals(FileMatch.Path("/r/app/src/A.kt"), FilePolicy.match(listOf("/r/lib/A.kt", "/r/app/src/A.kt"), roots))
        assertEquals(FileMatch.Ambiguous(listOf("/r/a/A.kt", "/r/b/A.kt")), FilePolicy.match(listOf("/r/a/A.kt", "/r/b/A.kt"), roots))
        assertEquals(FileMatch.Path("/r/app/src/A.kt"), FilePolicy.match(listOf("/r/app/srcx/A.kt", "/r/app/src/A.kt"), roots))   // 접두만 같은 형제 루트는 안쪽이 아니다
    }
}
