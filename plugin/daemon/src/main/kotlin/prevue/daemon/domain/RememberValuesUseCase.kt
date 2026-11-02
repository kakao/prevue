package prevue.daemon.domain

import prevue.daemon.domain.runtime.ResourcePatches
import prevue.daemon.domain.runtime.Workspace

/**
 * D-68. 데몬이 뜰 때 감시하는 모듈들의 values XML 내용을 쥔다 — 첫 저장의 "저장 전"이다. 감시를 안 해도(`--no-watch`) 쥔다 — `reload`가 쓴다.
 */
class RememberValuesUseCase(private val ws: Workspace, private val resources: ResourcePatches) {
    operator fun invoke(): Int {
        val files = ws.graph.valueDirs.flatMap { d -> d.listFiles { f -> ResourcePatches.isValues(f) }.orEmpty().toList() }
        resources.remember(files)
        return files.size
    }
}
