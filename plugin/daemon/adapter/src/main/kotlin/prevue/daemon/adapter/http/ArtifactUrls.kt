package prevue.daemon.adapter.http

import java.io.File

/** 같은 주소의 이미지·트리가 갱신되면 브라우저 캐시도 새 버전을 읽게 한다. 리비전이 없으면 주소도 없다 — 응답을 500으로 깨지 않는다. */
internal fun artifactUrl(file: File?, revision: Long?): String? =
    if (file == null || revision == null) null else "/${file.name}?t=$revision"
