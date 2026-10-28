package prevue.daemon.adapter.source

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/** HEAD 한 줄 → 브랜치. 저장소 · 워크트리 · detached · 저장소 아님을 디스크 위 가짜 `.git`으로 판정한다. */
class GitHeadTest {
    private fun tmp(): File = Files.createTempDirectory("githead").toFile().apply { deleteOnExit() }

    @Test fun `브랜치 이름에서 refs-heads 를 뗀다`() {
        val repo = tmp()
        File(repo, ".git").mkdirs()
        File(repo, ".git/HEAD").writeText("ref: refs/heads/feature/detail\n")
        assertEquals("feature/detail", GitHead.read(repo))
    }

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

    @Test fun `detached 면 짧은 해시`() {
        val repo = tmp()
        File(repo, ".git").mkdirs()
        File(repo, ".git/HEAD").writeText("06235b7c0ffee1234567890abcdef0123456789\n")
        assertEquals("06235b7", GitHead.read(repo))
    }

    @Test fun `저장소가 아니면 null`() {
        // 임시 폴더의 조상에 저장소가 있을 수 있어 HEAD 없는 .git 디렉터리로 끊는다.
        val dir = tmp()
        File(dir, ".git").mkdirs()
        assertNull(GitHead.read(dir))
    }
}
