package prevue.daemon.domain.model

import prevue.daemon.entity.Phrase

/**
 * 화면의 그림이 소스보다 옛것이 된 이유 하나. 이유를 불리언 하나로 합치지 않는 것은 종류마다 손쓸 방법([remedy])이 다르고
 * 둘이 겹칠 수 있기 때문이다. 키는 종류다 — `compile`(우리가 닫는다) · `build`(밖의 Gradle) · `resources`·`build-files`(재시작해야 닫힌다).
 */
data class StaleReason(
    val files: List<String>,
    val what: Phrase,
    val remedy: Phrase,
    val since: String,
    /** 컴파일 실패의 첫 줄, 또는 values 저장을 값만 넣어 닫지 못한 이유(D-68). 그 밖의 이유에는 없다. */
    val message: Phrase? = null,
    val pending: Boolean = false,
)
