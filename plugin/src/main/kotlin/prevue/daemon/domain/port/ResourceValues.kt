package prevue.daemon.domain.port

import java.io.File

/**
 * D-68. values 항목 하나의 자리. 리소스 id는 (타입, 이름)에 매여 있어 이 셋이 같은 항목은 값만 바꿔 넣어도 id가 그대로다.
 * [type]은 R 클래스 이름(`string` · `color` · `dimen` · `plurals` · `array` …), [qualifiers]는 `values-` 뒤의 한정자(기본은 빈 문자열)다.
 */
data class ResourceKey(val type: String, val name: String, val qualifiers: String)

/** values XML 한 항목. [value]는 렌더러의 값과 견줄 수 있게 고른 모양이다 — 색은 `#aarrggbb`, 치수는 소수 둘째 자리, 복수형 · 배열은 이어 붙인 것. */
data class ResourceEntry(val key: ResourceKey, val value: String)

/** 렌더러가 지금 그 자리를 무엇으로 그리나. */
sealed interface ResourceLookup {
    /** 그 이름의 리소스가 없다 — 새 항목이라 R id가 새로 생긴다. */
    data object NoName : ResourceLookup
    /** 이름은 있지만 그 한정자의 값이 없다. */
    data object NoConfig : ResourceLookup
    data class Value(val value: String) : ResourceLookup
}

/**
 * D-68. 렌더러가 쥔 앱 리소스(부트스트랩 때의 리소스 APK) 위에 values XML의 값을 얹는다 — 구현은 렌더러의 리소스 저장소를 감싼 층이다.
 * 얹은 값은 다음 태스크부터 보이고, 로더 · R 클래스는 그대로다.
 */
interface ResourceValues {
    /** [file](`res/values…/파일.xml`)의 내용이 [text]일 때의 항목들. XML이 깨졌으면 null. */
    fun parse(file: File, text: String): List<ResourceEntry>?
    /** 지금 그리는 값 — 얹은 값이 있으면 그것. */
    fun lookup(key: ResourceKey): ResourceLookup
    /** [file]의 내용이 [text]일 때의 [keys] 값을 얹는다. 못 얹으면 false — 아무것도 바뀌지 않았다. */
    fun put(file: File, text: String, keys: Collection<ResourceKey>): Boolean
}
