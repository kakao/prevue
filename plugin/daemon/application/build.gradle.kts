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

// 기기 스펙(plugin/devices/*.json, D-183)을 DeviceModel enum 과 인셋 표로 옮긴다 — 기기 지식은 스펙 한 곳에 두고 데몬과 뷰어가 각자 빌드에서 만든다.
// enum 의 동작(panel · postures)은 ScreenSize.kt 가 갖고 여기서는 값만 쓴다. 자세 이름은 손에 든 방향이고, iOS 의 Apple 방향 이름은 conditions 에 그대로 둔다.
val deviceTable = tasks.register("deviceTable") {
    val specs = layout.projectDirectory.dir("../../devices")
    val out = layout.buildDirectory.dir("generated/deviceTable")
    inputs.files(fileTree(specs) { include("*.json") })
    outputs.dir(out)
    doLast {
        @Suppress("UNCHECKED_CAST")
        val devices = specs.asFile.listFiles { f -> f.name.endsWith(".json") }!!
            .map { groovy.json.JsonSlurper().parse(it, "UTF-8") as Map<String, Any?> }
            .sortedBy { (it["order"] as Number).toInt() }
        fun str(s: Any?) = "\"" + s.toString().replace("\\", "\\\\").replace("\"", "\\\"").replace("$", "\\$") + "\""
        // 생성물도 린트(줄 160 · 함수 60줄)를 지난다 — 긴 문자열은 조각을 잇고, 자세 하나가 함수 하나다.
        fun lit(s: Any?) = s.toString().chunked(100).joinToString("\" +\n                \"", "\"", "\"") {
            it.replace("\\", "\\\\").replace("\"", "\\\"").replace("$", "\\$")
        }
        fun num(v: Any?) = (v as Number).toDouble().toString()
        fun constant(d: Map<String, Any?>) = (d["label"] as String).uppercase().replace(Regex("[^A-Z0-9]+"), "_").trim('_')
        @Suppress("UNCHECKED_CAST")
        fun obj(v: Any?) = v as Map<String, Any?>
        fun edges(e: Any?) = obj(e).entries.joinToString(", ", "InsetEdges(", ")") { (k, v) -> "$k = ${num(v)}" }
        fun panel(s: Any?) = obj(s).let { p -> "Panel(${p["widthPx"]}, ${p["heightPx"]}" + (p["hingePx"]?.let { ", ${num(it)}" } ?: "") + ")" }

        out.get().asFile.deleteRecursively()
        val dir = out.get().dir("prevue/application/domain/model").asFile.apply { mkdirs() }
        dir.resolve("DeviceModel.kt").writeText(buildString {
            append("package prevue.application.domain.model\n\n")
            append("enum class DeviceModel(val id: String, val label: String, val dpi: Int, val open: Panel, val cover: Panel?, val look: BarLook) {\n")
            devices.forEach { d ->
                val m = obj(d["measured"]); val screens = obj(m["screens"])
                append("    ${constant(d)}(\n        ${str(d["id"])},\n        ${str(d["label"])},\n        ${m["dpi"]},\n")
                append("        ${panel(screens["open"])},\n        ${screens["cover"]?.let { panel(it) } ?: "null"},\n")
                append("        BarLook.entries.single { it.key == ${str(obj(d["look"])["bar"])} },\n    ),\n")
            }
            append("    ;\n\n    fun panel(folded: Boolean): Panel = panelOf(folded)\n\n")
            append("    val postures: List<ScreenSize.Device> get() = posturesOf()\n}\n")
        })
        dir.resolve("DeviceInsetTable.kt").writeText(buildString {
            append("package prevue.application.domain.model\n\n")
            append("private fun source(kind: String) = InsetSource.entries.single { it.kind == kind }\n\n")
            val postures = devices.flatMap { d ->
                obj(obj(d["measured"])["screens"]).flatMap { (screen, s) ->
                    obj(obj(s)["postures"]).map { (orientation, posture) ->
                        Triple(d, screen, orientation) to obj(posture)
                    }
                }
            }
            fun name(d: Map<String, Any?>, screen: String, orientation: String) = "${constant(d)}_${screen}_$orientation".lowercase().replace('-', '_')
            append("internal val DEVICE_INSETS: Map<ScreenSize.Device, DeviceInsetProfile> = mapOf(\n")
            postures.forEach { (at, _) -> append("    ${name(at.first, at.second, at.third)}(),\n") }
            append(")\n")
            postures.forEach { (at, p) ->
                val (d, screen, orientation) = at
                append("\nprivate fun ${name(d, screen, orientation)}() =\n")
                append("    ScreenSize.Device(DeviceModel.${constant(d)}, ${screen == "cover"}, DeviceOrientation.parse(${str(orientation)})) to DeviceInsetProfile(\n")
                append("        safeArea = ${edges(p["safeArea"])},\n")
                p["insets"]?.let { obj(it) }?.let { i ->
                    append("        measured = MeasuredInsets(\n")
                    listOf("statusBars", "navigationBars", "captionBar", "displayCutout").forEach { kind ->
                        append("            $kind = ${edges(obj(i[kind])["dp"])},\n")
                    }
                    append("        ),\n")
                }
                append("        evidence = InsetEvidence(\n")
                append("            source(${str(p["source"])}),\n            ${lit(p["url"])},\n            ${p["capturedAt"]?.let { str(it) } ?: "null"},\n")
                append("            mapOf(\n")
                obj(p["conditions"]).forEach { (k, v) -> append("                ${str(k)} to ${lit(v)},\n") }
                append("            ),\n        ),\n    )\n")
            }
        })
    }
}
sourceSets.main { kotlin.srcDir(deviceTable) }
