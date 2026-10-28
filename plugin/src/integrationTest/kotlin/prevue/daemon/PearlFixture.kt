package prevue.daemon

import java.io.File
import java.util.concurrent.TimeUnit
import prevue.daemon.adapter.compile.HotCompiler
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.daemon.adapter.render.ViewInfoJson
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.ViewNode
import prevue.daemon.domain.policy.NodeTarget
import prevue.json.Json

/**
 * 통합 테스트의 대상 `fixtures/pearl`. 덤프는 이 체크아웃의 `bin/prevue warmup`이 뜬다 — 덤프 자리가 체크아웃 경로로 정해져 워크트리마다
 * 제 것이 있어야 하고, 픽스처를 고치면 다시 떠야 한다. 늘 부른다: Gradle이 증분이라 이미 떴으면 몇 초다.
 * 픽스처는 공개 Maven만 쓰는 저장소의 일부라 대상 저장소의 Gradle 승인 규칙 밖이다(AGENTS.md) — 그 전제가 깨지는 머신이면 뜨지 않는다.
 */
object PearlFixture {
    private val HOME = System.getProperty("user.home")
    private val ROOT: File? = System.getProperty("prevue.root")?.let(::File)
    val dir: File? = ROOT?.let { File(it.parentFile, "fixtures/pearl") }
    val viewer: File? = ROOT?.let { File(it, "viewer") }

    private fun main(module: String) = File(dir, "$module/src/main")
    // 모듈 경로가 곧 패키지 꼬리다(core/ui → com.example.pearl.core.ui)
    private fun kotlin(module: String, name: String) = File(main(module), "kotlin/com/example/pearl/$module/$name")
    /** 보드 — 프리뷰 30장. */
    val board: File? get() = dir?.let { kotlin("feature/pearl", "PearlPreviews.kt") }
    val card: File get() = kotlin("core/ui", "DrinkCard.kt")
    val sharedTransition: File get() = kotlin("feature/pearl", "SharedTransitionPreviews.kt")
    val scroll: File get() = kotlin("feature/pearl", "ScrollPreviews.kt")
    /** `scroll --until`의 네 모양 — 카드 순서대로 LazyColumn(100칸) · LazyRow · Column · Row. */
    val until: File get() = kotlin("feature/pearl", "ScrollUntilPreviews.kt")
    val strings: File get() = File(main("feature/pearl"), "res/values/strings.xml")
    /** [board]의 카드 수. 멀티 프리뷰 · `@PreviewParameter` 펼치기가 줄면 여기서 잡힌다. */
    const val BOARD_CARDS = 30
    /** 앱 메뉴의 음료 수 — 게으른 그리드의 전체 칸 수다. */
    const val DRINKS = 100

    private val sdk: File? get() =
        listOfNotNull(System.getenv("ANDROID_HOME"), System.getenv("ANDROID_SDK_ROOT"), "$HOME/Library/Android/sdk")
            .map(::File).firstOrNull { File(it, "platforms").isDirectory }

    private val gradleHome: File get() = File(System.getenv("GRADLE_USER_HOME") ?: "$HOME/.gradle")

    /** installPrevue가 적은 툴체인 자리 하나. 값은 `$ROOT` · `$HOME` 기준이다. */
    private fun env(key: String): File? {
        val root = ROOT ?: return null
        val line = File(root, "build/prevue-env").takeIf { it.isFile }?.readLines()?.firstOrNull { it.startsWith("$key=") } ?: return null
        return File(line.substringAfter('=').trim('"').replace("\$ROOT", root.path).replace("\$HOME", HOME))
    }

    fun layoutlib(): File? = env("PREVUE_LAYOUTLIB")?.takeIf { File(it, "data").isDirectory }

    /** 데몬과 같은 상주 컴파일러 — 저장을 진짜로 컴파일한다. [overlay]는 렌더 클래스패스 앞에 둔 그 자리다. */
    fun hotCompiler(home: ClasspathSpec, overlay: File): HotCompiler {
        val jars = CompilerJars.find(env("PREVUE_COMPILER")!!)
        return HotCompiler({ home }, jars.jars, env("PREVUE_BRIDGE")!!, jars.composePlugin,
            AndroidPlatforms.findJar(mapOf("ANDROID_HOME" to sdk!!.path)), overlay, File("$overlay.modules"))
    }

    /** 목록 ↔ 상세 앱의 소스 둘을 [dir] 아래 패키지 경로 그대로 복사한다 — 저장은 복사본에 하고 커밋된 픽스처는 건드리지 않는다. 복사본의 `PearlApp.kt`. */
    fun appCopy(dir: File): File {
        val pkg = "com/example/pearl/feature/pearl"
        val to = File(dir, pkg).apply { mkdirs() }
        for (name in listOf("PearlApp.kt", "PearlScreen.kt")) kotlin("feature/pearl", name).copyTo(File(to, name))
        return File(to, "PearlApp.kt").canonicalFile
    }

    /** 빌드에 있는 프리뷰 없는 스텁(`BlankStub.kt`)을 [dir] 아래 패키지 경로 그대로 복사한다. 복사본의 그 파일. */
    fun stubCopy(dir: File): File {
        val to = File(dir, "com/example/pearl/feature/pearl").apply { mkdirs() }
        return kotlin("feature/pearl", "BlankStub.kt").copyTo(File(to, "BlankStub.kt")).canonicalFile
    }

    /** 툴체인(렌더러 · 컴파일러)과 Android SDK가 있어야 돈다. 없으면 통합 테스트를 건너뛴다. */
    fun available(): Boolean = board?.isFile == true && layoutlib() != null && sdk != null && env("PREVUE_COMPILER")?.isDirectory == true

    /** `:feature:pearl` 덤프와 리소스를 빌릴 `:app` 덤프 — Gradle 한 번. */
    fun warmup(): Pair<ClasspathSpec, ClasspathSpec> {
        // 사용자 Gradle의 init 스크립트는 저장소를 사내 Maven으로 돌릴 수 있다 — 그러면 승인 없이 돌릴 근거가 없다
        val inits = File(gradleHome, "init.d").listFiles().orEmpty().filter { it.isFile }
        check(inits.isEmpty()) { "${gradleHome}/init.d 에 init 스크립트가 있다(${inits.map { it.name }}) — 픽스처 Gradle이 사내 Maven으로 갈 수 있어 뜨지 않는다" }
        val log = File.createTempFile("prevue-warmup", ".json")
        try {
            val p = ProcessBuilder(File(ROOT, "bin/prevue").path, "warmup", board!!.path, "--variant", "debug", "--resources-from", ":app")
                .redirectError(ProcessBuilder.Redirect.INHERIT)
                .redirectOutput(log)
                .apply { environment()["ANDROID_HOME"] = sdk!!.path }
                .start()
            if (!p.waitFor(10, TimeUnit.MINUTES)) { p.destroyForcibly(); error("warmup 이 10분 안에 끝나지 않았다") }
            val out = log.readText()
            val json = out.lineSequence().lastOrNull { it.startsWith("{") } ?: error("warmup 응답이 없다(종료 ${p.exitValue()}): $out")
            fun field(name: String) = Regex("\"$name\": \"([^\"]+)\"").find(json)?.groupValues?.get(1)
                ?: error("warmup 이 덤프를 뜨지 못했다(종료 ${p.exitValue()}): $json")
            return ClasspathSpec.load(File(field("classpath"))) to ClasspathSpec.load(File(field("resourcesClasspath")))
        } finally {
            log.delete()
        }
    }

    /** 테스트가 띄운 픽스처의 Gradle 데몬을 내린다 — 남기면 워크트리마다 2GB 데몬이 몇 시간 쉰다. */
    fun stopGradle() {
        val d = dir ?: return
        runCatching {
            ProcessBuilder(File(d, "gradlew").path, "--stop", "-q").directory(d).redirectErrorStream(true)
                .redirectOutput(ProcessBuilder.Redirect.DISCARD).start().waitFor(1, TimeUnit.MINUTES)
        }
    }

    /** [file]에서 [marker]가 있는 줄(1부터). 겨냥할 줄을 번호로 박지 않는다 — 픽스처를 고쳐도 따라온다. */
    fun lineOf(file: File, marker: String): Int =
        file.readLines().indexOfFirst { it.trim() == marker }.also { check(it >= 0) { "${file.name}에 '$marker' 줄이 없다" } } + 1

    class Tree(val width: Int, val height: Int, val nodes: List<ViewNode>) {
        val live get() = LiveTree(width, height, nodes)

        /** 목록 카드 전부(같은 박스는 하나로, 읽는 순서). */
        val cards: List<ViewNode> get() = nodes.filter { it.name == "DrinkCard" && it.right > it.left && it.bottom > it.top }
            .distinctBy { it.sameBox }.sortedWith(compareBy({ it.top }, { it.left }))
    }

    @Suppress("UNCHECKED_CAST")
    fun tree(file: File): Tree {
        val json = Json.parse(file.readText()) as Map<String, Any?>
        val size = (json["imageSize"] as List<Number>).map { it.toInt() }
        return Tree(size[0], size[1], ViewInfoJson.nodes(json["composeViewInfo"] as List<Map<String, Any?>>))
    }

    fun cards(tree: File): List<ViewNode> = tree(tree).cards

    /** 트리의 목록 카드 중 다 보이는 것(목록에 잘리지 않은 것) — 누를 자리를 그림 좌표로 박지 않는다. */
    fun visibleCards(tree: File): List<ViewNode> = tree(tree).let { t -> t.cards.filter { NodeTarget.shown(it, t.live) } }
}
