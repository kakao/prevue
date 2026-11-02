package prevue.daemon.domain.port

import java.io.File
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Deferred
import prevue.daemon.entity.Phrase
import prevue.daemon.entity.PreviewSpec

interface PreviewRenderer {
    suspend fun ready() {}
    suspend fun show(p: PreviewSpec, ownLoader: Boolean = false): RenderOutput
    suspend fun showAside(p: PreviewSpec): RenderOutput
    fun copyImage(out: RenderOutput, previewId: String): RenderOutput

    /** 오버레이가 바뀌었다(컴파일 성공). 지금 세대의 공유 로더를 버린다. */
    fun codeChanged()
    /**
     * D-67. 리터럴만 바뀐 저장 — [owner](`LiveLiterals$…`)의 키마다 값을 지금 공유 로더에 넣고, 장부에 남겨 뒤의 새 로더에도 첫 렌더 전에 넣는다.
     * 넣을 공유 로더가 없거나 넣지 못하면 false이고 장부는 그대로다 — 부르는 쪽이 컴파일로 간다.
     */
    fun patchLiterals(owner: String, values: Map<String, Any>): Boolean
    /** D-67. 그 파일들의 클래스가 오버레이에서 새로 컴파일됐거나 사라졌다 — 장부에서 뺀다. 이미 넣은 로더는 다음 세대에 버려진다. */
    fun dropLiterals(owners: Collection<String>)
    /** 밖에서 Gradle이 돌았다. 미리 구운 로더까지 버린다 — 옛 jar를 열어 두고 있다. */
    fun buildChanged()
    /** 프리뷰의 모양(제공자 값 개수·레이아웃 XML)을 잊는다. 파일을 다시 열 때. */
    fun forgetShapes()
    /** `@PreviewParameter` 제공자가 내는 값의 개수. 렌더러만 안다. */
    fun instanceCount(p: PreviewSpec): Int
    /** NFR-10. 산출물 상한을 넘겨도 지우지 않을 프리뷰들. 화면이 주소를 들고 있는 것이다 — 조립할 때 한 번 건다. */
    fun protect(keep: () -> Set<String>)
    /** [out]의 PNG·트리가 디스크에 닿기를 기다린다. 쓰기가 실패했으면 그 예외를 낸다 — 주소만 멀쩡한 응답이 최악이다. */
    suspend fun written(out: RenderOutput): RenderOutput
    /** 지금까지 넘긴 PNG·트리 쓰기가 전부 디스크에 닿기를 기다린다. */
    suspend fun awaitWrites()

    // status가 싣는 관측값. 로더 공유가 실제로 되는지(tasksOnLoader)와 산출물 상한(NFR-10)이 여기서 보인다.
    val bootstrapMs: Long
    val loaderGen: Int
    val tasksOnLoader: Int
    val outDir: File
    val outBytes: Long
    val outMaxBytes: Long
    val touchModeError: String?
}

enum class FailureKind {
    COMPILE, NOT_FOUND, DI, ANDROID_VIEW, TIMEOUT, EXCEPTION,
    LINKAGE,
}

data class RenderOutput(
    val ok: Boolean,
    val preview: PreviewSpec,
    val image: File?,
    val tree: File?,
    val width: Int,
    val height: Int,
    val taskMs: Long,
    val renderMs: Long,
    val status: String,
    val failure: FailureKind?,
    val message: Phrase?,
    val freshLoader: Boolean,
    val warnings: List<String> = emptyList(),
    val written: Deferred<Map<String, Long>> = CompletableDeferred(emptyMap()),
    val phases: Map<String, Long> = emptyMap(),
)
