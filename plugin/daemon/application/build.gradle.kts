// application — 안쪽(D-148). domain/model(값) · domain/rule(규칙) · port(나가는 인터페이스와 그 위의 값) · service(하는 일).
// 코루틴과 Metro 만 안다 — 렌더러 · 컴파일러 · JSON 을 import 하면 컴파일이 안 된다. JDK(AWT · 파일 시스템 호출)와 안쪽 순서는 모듈로 못 막는다 — tools/lint/detekt.yml 의 층 규칙이 막는다(D-150).
plugins {
    id("prevue.metro")
}

// 화면 문장 영어 사전(viewer/strings/en.json)을 데몬이 읽는 Kotlin 표로 옮긴다 — 데몬이 CLI 로 내는 문장은 영어 한 벌이다(D-106 · D-109).
// 브라우저에는 키만 보내고 뷰어가 고른 언어로 채우므로 다른 언어의 사전은 데몬에 들어가지 않는다.
val screenText = tasks.register("screenText") {
    val dict = layout.projectDirectory.file("../../viewer/strings/en.json")
    val out = layout.buildDirectory.dir("generated/screenText")
    inputs.file(dict)
    outputs.dir(out)
    doLast {
        @Suppress("UNCHECKED_CAST")
        val entries = groovy.json.JsonSlurper().parse(dict.asFile, "UTF-8") as Map<String, String>
        fun esc(s: String) = s.replace("\\", "\\\\").replace("\"", "\\\"").replace("$", "\\$").replace("\n", "\\n")
        // 긴 문장은 조각을 이어 붙인다 — 생성물도 린트의 줄 길이(160)를 지난다.
        fun lit(s: String) = s.chunked(100).joinToString("\" +\n        \"", "\"", "\"") { esc(it) }
        // 출력 자리를 비우고 쓴다 — 패키지를 옮기자 옛 자리의 표가 남아 함께 컴파일됐다(실측).
        out.get().asFile.deleteRecursively()
        val file = out.get().file("prevue/application/domain/model/ScreenTextTable.kt").asFile
        file.parentFile.mkdirs()
        file.writeText(buildString {
            append("package prevue.application.domain.model\n\ninternal val SCREEN_TEXT: Map<String, String> = mapOf(\n")
            entries.toSortedMap().forEach { (k, v) -> append("    ").append(lit(k)).append(" to ").append(lit(v)).append(",\n") }
            append(")\n")
        })
    }
}
sourceSets.main { kotlin.srcDir(screenText) }
