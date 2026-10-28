package prevue.daemon.adapter.cli

import prevue.daemon.domain.model.Pointed
import java.io.File
import prevue.daemon.domain.model.BoardView
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.CloseResult
import prevue.daemon.domain.model.FocusResult
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.Selection
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.Status
import prevue.daemon.domain.model.TouchResult
import prevue.daemon.domain.model.TypeResult
import prevue.daemon.domain.model.ScrollResult
import prevue.daemon.domain.model.WaitResult
import prevue.daemon.domain.UseCases

/**
 * CLI·에이전트의 명령을 실행하고 요청마다 결과를 돌려준다.
 * 유스케이스 둘을 엮는 판단(맞춘 뒤 읽기 · 연 뒤 보드)은 여기서 하고, 입구는 HTTP와 JSON만 한다.
 */
class CliHandler(private val uc: UseCases) {
    /** 에이전트가 읽는 그림이 사람이 조작한 화면과 같게 — live가 바뀌었으면 읽기 전에 한 장 맞춘다. */
    suspend fun status(): Status { uc.catchUp("status"); return uc.readStatus() }

    suspend fun show(target: String, index: Int?, params: Map<String, String>, by: String): Pair<ShowResult, BoardView?> =
        uc.openPreview(target, index, params, by) to uc.readStatus().board

    suspend fun close(target: String, by: String): CloseResult = uc.closeTab(target, by)

    /** 지금 보는 탭 — `wait`가 어느 탭을 기다렸는지 싣는다(D-54). */
    fun activeTab(): String? = uc.readStatus().tabs.firstOrNull { it.active }?.let { it.file?.absolutePath ?: it.fqn }

    suspend fun card(index: Int, force: Boolean, by: String): CardResult = uc.drawCard(index, force, by)
    suspend fun focus(index: Int, on: Boolean, by: String, size: ScreenSize? = null): FocusResult = uc.focusCard(index, on, by, size)
    fun board(): BoardView? = uc.readStatus().board

    suspend fun select(file: String, line: Int, at: Pointed, by: String): Selection = uc.select(file, line, at, by)
    fun selection(): Selection? = uc.readStatus().selection

    fun previews(file: File): List<PreviewSpec> = uc.listPreviews(file)

    suspend fun render(at: Long?, fresh: Boolean, by: String): ShowResult = when {
        at != null -> uc.renderAt(at, by)                                                      // FR-5
        fresh -> uc.showPreview(by)
        else -> uc.rerender(by)
    }

    suspend fun reload(files: List<File>, by: String): ReloadResult = uc.applySave(files, by)
    suspend fun await(files: List<File>, timeoutMs: Long): WaitResult = uc.awaitRender(files, timeoutMs)

    /** 정착을 기다리지 않는 터치(settle=false)는 스트림이 그린다 — 깨움은 `WorkspaceEvent.Touched`가 BrowserPresenter를 거쳐 간다. */
    suspend fun touch(type: String, x: Int, y: Int, by: String, settle: Boolean): TouchResult = uc.touch(type, x, y, by, settle)
    suspend fun touchAt(at: String, type: String, by: String, settle: Boolean): TouchResult = uc.touch.at(at, type, by, settle)
    suspend fun scroll(screens: Double, horizontal: Boolean, at: String?, by: String, until: String? = null): ScrollResult =
        uc.scroll.screens(screens, horizontal, at, by, until)
    suspend fun type(text: String, by: String): TypeResult = uc.type(text, by)
}
