package prevue.daemon.entity

import java.io.File

/** 렌더 한 장을 특정한다(FR-1·2·3). 정규형은 FQN이고 파일에서 찾은 경우 file이 붙는다. */
data class PreviewSpec(
    val fqn: String,
    val previewId: String,
    val params: Map<String, String>,
    val file: File?,
    val index: Int,
    /** `@PreviewParameter`가 달린 인자들. 렌더러가 이걸로 제공자를 돌려 인스턴스를 만든다. */
    val methodParams: List<Map<String, String>> = emptyList(),
    /** 제공자가 값을 여럿 내면 그중 몇 번째를 그릴지. 값이 없으면 무시된다. */
    val paramIndex: Int = 0,
    /** 제공자가 낸 값의 개수. 1이면 나눌 것이 없다. 렌더러에 물어봐야 알 수 있어 세션이 채운다. */
    val paramCount: Int = 1,
) {
    val functionName: String get() = fqn.substringAfterLast('.')
}
