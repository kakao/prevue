package prevue.daemon.domain

import java.io.File
import prevue.daemon.domain.model.Vacancy
import prevue.daemon.domain.model.VacantTab
import prevue.daemon.domain.runtime.Tabs
import prevue.daemon.domain.runtime.Workspace

/**
 * 지금 탭의 파일이 지워지거나 다시 생겼다. 생성 · 삭제는 저장이 아니라(D-56) 저장 → 화면을 타지 않으므로 여기서 탭만 맞춘다 —
 * 지워졌으면 옛 카드를 두지 않고 빈 화면으로, 다시 생겼으면 그 탭을 다시 연다. 숨은 탭은 옮길 때 [Tabs.activate]가 본다.
 */
class TrackTabFilesUseCase internal constructor(private val ws: Workspace, private val tabs: Tabs) {
    suspend operator fun invoke(created: List<File>, deleted: List<File>, by: String = "watch"): Unit = ws.exclusive { ed ->
        val tab = ws.now.activeTabOrNull() ?: return@exclusive
        val f = tab.file?.canonicalPath ?: return@exclusive
        fun has(files: List<File>) = files.any { it.canonicalPath == f }
        when {
            has(deleted) && tab.vacant != Vacancy.DELETED && !File(f).isFile -> tabs.markVacant(ed, tab, Vacancy.DELETED)
            has(created) && tab.vacant == Vacancy.DELETED ->
                runCatching { tabs.activate(ed, tab.key, null, emptyMap(), by) }.onFailure { if (it !is VacantTab) throw it }
        }
    }
}
