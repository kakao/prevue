package prevue.application.service

import dev.zacsweers.metro.Inject
import prevue.application.port.Workspace
/**
 * D-68. 데몬이 뜰 때 감시하는 모듈들의 values XML 내용을 쥔다 — 첫 저장의 "저장 전"이다. 감시를 안 해도(`--no-watch`) 쥔다 — `reload`가 쓴다.
 */
@Inject
class RememberValuesUseCase(private val ws: Workspace, private val resources: ResourcePatches) {
    operator fun invoke(): Int {
        val files = resources.valueFiles(ws.graph.resRoots)
        resources.remember(files)
        return files.size
    }
}
