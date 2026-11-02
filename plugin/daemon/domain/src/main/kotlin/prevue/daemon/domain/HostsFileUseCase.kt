package prevue.daemon.domain

import java.io.File
import prevue.daemon.domain.runtime.Workspace

/**
 * 이 데몬이 그 파일을 그릴 수 있는가 — 앱이 담은 모듈(D-38)이거나 `--watch`로 더한 자리. 아니면 다른 앱의 파일이라
 * 이 데몬이 띄울 수 없다(D-50) — 뷰어는 `prevue show` 명령을 건넨다.
 */
class HostsFileUseCase(private val ws: Workspace) {
    operator fun invoke(f: File): Boolean {
        val c = f.canonicalFile
        return ws.graph.contains(c) || ws.watchRoots.any { c.path.startsWith(it.path + File.separator) }
    }
}
