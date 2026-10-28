package prevue.daemon.domain.policy

import java.io.File

/** FR-22. 저장한 파일의 결과가 나왔는가 — 에이전트가 옛 그림을 새 그림으로 믿지 않게 하는 판정. */
object AwaitPolicy {
    /**
     * 컴파일이 이 저장을 읽었는가. 기준은 요청 순간의 mtime([mtime])이다.
     * mtime만 보지 않고 컴파일 시각까지 보는 것은 mtime이 뒤로 갈 수 있어서다(`cp -p`·체크아웃) — 옛 내용의 컴파일을 이 저장의 것으로 믿는다(실측).
     * 이 내용을 읽었거나, 요청 뒤의 컴파일이 더 새 저장을 읽었으면 들어갔다. 연 뒤로 안 바뀐 파일은 연 그림이 곧 그 파일이다.
     *
     * @param compiled 그 파일을 마지막으로 읽은 컴파일의 (mtime, 시각). 없으면 연 뒤로 컴파일된 적이 없다.
     */
    fun compiled(mtime: Long, compiled: Pair<Long, Long>?, openedAtMs: Long, requestedAtMs: Long): Boolean {
        val (seen, at) = compiled ?: return mtime <= openedAtMs
        return seen == mtime || (seen > mtime && at >= requestedAtMs)
    }

    /**
     * 남아 있는 컴파일 실패가 이 기다림의 결과인가. 기다리는 파일을 담았거나 지금 보드를 연 **뒤에** 났으면 그렇다 —
     * 공용 컴포넌트를 저장하고 파일 없이 `wait`해도(보드의 파일을 기다린다) 실패를 받는다.
     * 연 **전의** 다른 파일의 실패는 아니다 — 앱 렌더러는 모듈을 오가며 보드를 여는데, 다른 모듈에서 남긴 실패가
     * 새 보드의 `show`·`wait`를 전부 실패로 만들었다(실측 bookmarks → designsystem). 그 실패는 `stale.compile`에 남아 있다.
     */
    fun failureApplies(failedFiles: List<String>, want: List<File>, failedAtMs: Long, openedAtMs: Long): Boolean =
        failedAtMs > openedAtMs || want.any { w -> failedFiles.any { File(it).canonicalPath == w.path } }

    /** 보드를 다 그렸다고 답해도 되는가. 인터랙티브 중에는 다른 카드를 그리지 않으니 기다려도 오지 않는다 — 있는 그대로 답한다. */
    fun boardAnswered(allFresh: Boolean, interactive: Boolean): Boolean = allFresh || interactive

    /** 이 데몬이 감시하지 않는 파일들 — 이 데몬이 그리는 모듈 밖이다(Q5). */
    fun outside(files: List<File>, roots: List<File>): List<File> =
        files.filter { f -> roots.none { f.path.startsWith(it.path + File.separator) } }
}
