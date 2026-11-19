package prevue.infrastructure.source

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** HEAD 한 줄 → 브랜치. 저장소 · 워크트리 · detached · 저장소 아님을 디스크 위 가짜 `.git`으로 판정한다. */
class GitHeadTest {
    private fun tmp(): File = Files.createTempDirectory("githead").toFile().apply { deleteOnExit() }

    @Test fun `하위 폴더에서도 위로 올라가 찾는다`() {
        val repo = tmp()
        File(repo, ".git").mkdirs()
        File(repo, ".git/HEAD").writeText("ref: refs/heads/develop\n")
        assertEquals("develop", GitHead.read(File(repo, "app/src").apply { mkdirs() }))
    }

    @Test fun `워크트리는 gitdir 파일을 따라간다`() {
        val main = tmp()
        val wtGit = File(main, ".git/worktrees/wt-a").apply { mkdirs() }
        File(wtGit, "HEAD").writeText("ref: refs/heads/worktree-a\n")
        val wt = tmp()
        File(wt, ".git").writeText("gitdir: ${wtGit.absolutePath}\n")
        assertEquals("worktree-a", GitHead.read(wt))
    }
}
