package prevue.daemon.domain.port

import java.io.File
import prevue.daemon.entity.Phrase

/**
 * 모듈마다 바뀐 파일을 그 모듈의 인자로 컴파일해 오버레이로 내준다 — 구현은 kotlinc(`HotCompiler`). 오버레이는 렌더 클래스패스 맨 앞이라 Gradle 산출물을 덮는다.
 * 실패해도 오버레이에는 직전 성공본이 남는다 — 화면의 그림이 저장 전 코드인 이유다.
 */
interface Compiler {
    /** [files]는 모두 [module]의 것이다. */
    suspend fun compile(module: String, files: List<File>): CompileResult
    /** `com.foo.BarKt`가 우리가 오버레이에 넣은 클래스인가 — 링크 에러가 우리 탓인지 가르는 선. */
    fun inOverlay(fqcn: String): Boolean
    /** [roots] 안에서 [member]를 이름으로 언급하는 파일들. 시그니처가 바뀌면 함께 컴파일해야 옛 호출자가 안 남는다. */
    fun callersOf(member: String, exclude: List<File>, roots: List<File>): List<File>
    /** 밖의 Gradle이 [module]을 다시 빌드했다 — 그 모듈의 오버레이만 낡았다(Q6). */
    suspend fun clearOverlay(module: String)
    /** Gradle이 [module]의 Kotlin을 마지막으로 컴파일한 시각. 모르면 null — 이보다 새로운 소스는 오버레이에 없으면 옛 클래스로 그려진다. */
    suspend fun builtAt(module: String): Long?
    suspend fun hasClass(module: String, fqcn: String): Boolean

    val warm: Boolean
    val overlayDir: File
}

data class CompileResult(
    val ok: Boolean, val exitCode: String, val messages: String, val ms: Long, val files: List<String>,
    val module: String = "", val argsFrom: String? = null,
    val hint: Phrase? = null,
    val literals: List<LiteralTable> = emptyList(),
) {
    companion object {
        const val LITERALS = "LITERALS"
        const val RESOURCES = "RESOURCES"
    }
}

data class LiteralTable(
    val file: String,
    val owner: String,
    val sites: List<LiteralSite>,
)

data class LiteralSite(
    val key: String,
    val offset: Int,
    val type: String,
    val composable: Boolean,
    val value: Any?,
)
