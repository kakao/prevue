package prevue.daemon.adapter.source

import java.io.File

/**
 * 대상 저장소의 지금 브랜치. git 프로세스를 띄우지 않고 `HEAD` 파일 한 줄만 읽는다 — 헤더가 몇 초마다 묻는다.
 * 워크트리는 `.git`이 디렉터리가 아니라 `gitdir: …` 한 줄짜리 파일이라 그것을 따라간다.
 */
object GitHead {
    /** 브랜치 이름, detached면 짧은 해시. git 저장소가 아니면 null. */
    fun read(repo: File): String? {
        val head = headFile(repo) ?: return null
        val line = runCatching { head.readText().trim() }.getOrNull() ?: return null
        return when {
            line.startsWith("ref: ") -> line.removePrefix("ref: ").removePrefix("refs/heads/")
            line.length >= 7 -> line.take(7)
            else -> null
        }
    }

    private fun headFile(repo: File): File? {
        // 대상이 저장소의 하위 폴더일 수도 있어 위로 올라가며 찾는다.
        var dir: File? = repo.absoluteFile
        while (dir != null) {
            val git = File(dir, ".git")
            if (git.isDirectory) return File(git, "HEAD").takeIf { it.isFile }
            if (git.isFile) {
                val target = runCatching { git.readText().trim() }.getOrNull()?.removePrefix("gitdir: ") ?: return null
                return File(File(target).let { if (it.isAbsolute) it else File(dir, target) }, "HEAD").takeIf { it.isFile }
            }
            dir = dir.parentFile
        }
        return null
    }
}
