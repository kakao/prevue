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

// 기기 스펙(plugin/devices/*.json, D-183)을 DeviceModel enum 과 인셋 표로 옮긴다 — 기기 지식은 스펙 한 곳에 두고 데몬은 빌드에서 표를 만든다.
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
        // 화면 모서리는 자세의 측정값(iOS pt · Android dp)이 먼저고 없으면 look.radius 다 — 뷰어 생성기(generate-devices.mjs)와 같은 판단이다.
        fun corners(v: Any?) = (v as? List<*> ?: List(4) { v }).joinToString(", ", "listOf(", ")") { num(it) }
        fun radius(screen: Map<String, Any?>, look: Map<String, Any?>) =
            obj(screen["postures"]).values.map { obj(it)["cornerRadius"] }.firstOrNull { it != null }
                ?.let { c -> obj(c).let { it["pt"] ?: it["dp"] } } ?: look["radius"]
        fun camera(c: Map<String, Any?>) = "CameraSpec(${num(c["w"])}, ${num(c["h"])}, ${num(c["y"])}, ${num(c["x"] ?: 0.5)}, " +
            "${c["notch"]?.let { num(it) } ?: "null"}, CameraEdge.${(c["edge"] ?: "top").toString().uppercase()})"
        // 컷아웃 하나 = 배제 상자(box) + 그 안에 그릴 구멍(holes, 화면 왼쪽 위 기준 dp) — 구멍이 없으면 상자를 그린다.
        fun hole(h: Map<String, Any?>) = "CameraHole(${num(h["cx"])}, ${num(h["cy"])}, ${num(h["d"])}, ${h["lens"] == true})"
        fun cutouts(list: Any?) = (list as List<*>).joinToString(",\n                ", "listOf(", ")") { c ->
            obj(c).let { e -> "CutoutSpec(${camera(obj(e["box"]))}, " +
                (e["holes"] as List<*>?).orEmpty().joinToString(",\n                    ", "listOf(\n                    ", "))") { hole(obj(it)) } }
        }
        // 화면마다 밀도가 다를 수 있고(없으면 기기 dpi), 측정한 자세가 하나뿐인 화면은 돌리지 않는다(fixed).
        fun panel(s: Any?, dpi: Any?, look: Any?) = obj(s).let { p ->
            "Panel(${p["widthPx"]}, ${p["heightPx"]}, ${p["dpi"] ?: dpi}" + (p["hingePx"]?.let { ", hingePx = ${num(it)}" } ?: "") +
                (if (obj(p["postures"]).size == 1) ", fixed = true" else "") +
                ",\n            face = PanelFace(${corners(radius(p, obj(look)))}, ${cutouts(obj(look)["cutouts"])}))"
        }
        fun status(v: Any?) = v?.let { obj(it) }?.let { s ->
            val t = obj(s["time"])
            "IosStatusLayout(${num(s["top"])}, ${num(s["right"])}, ${s["left"]?.let { num(it) } ?: "null"}, ${num(s["scale"])}, " +
                "${num(t["cx"])}, ${num(t["base"])}, ${num(t["size"])})"
        } ?: "null"

        out.get().asFile.deleteRecursively()
        val dir = out.get().dir("prevue/application/domain/model").asFile.apply { mkdirs() }
        dir.resolve("DeviceModel.kt").writeText(buildString {
            append("package prevue.application.domain.model\n\n")
            append("enum class DeviceModel(\n    val id: String,\n    val label: String,\n    val open: Panel,\n    val cover: Panel?,\n")
            append("    val look: BarLook,\n    val status: IosStatusLayout?,\n) {\n")
            devices.forEach { d ->
                val m = obj(d["measured"]); val screens = obj(m["screens"]); val look = obj(d["look"])
                append("    ${constant(d)}(\n        ${str(d["id"])},\n        ${str(d["label"])},\n")
                append("        ${panel(screens["open"], m["dpi"], look["open"])},\n")
                append("        ${screens["cover"]?.let { panel(it, m["dpi"], look["cover"]) } ?: "null"},\n")
                append("        BarLook.entries.single { it.key == ${str(look["bar"])} },\n        ${status(look["status"])},\n    ),\n")
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
