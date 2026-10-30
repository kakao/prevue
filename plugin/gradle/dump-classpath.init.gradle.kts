import java.util.zip.ZipFile

// 대상 저장소에 파일을 추가하지 않고 모듈 클래스패스를 얻기 위해 --init-script로 외부 주입한다(NFR-2).
// 산출물: prevue.dumps의 대상마다 그 출력 JSON. 렌더러의 RenderEnvironmentBootstrapper 인자와 1:1로 대응한다.

fun esc(s: String) = s.replace("\\", "\\\\").replace("\"", "\\\"")
fun arr(v: Collection<String>) = v.joinToString(",\n    ", "[\n    ", "\n  ]") { "\"${esc(it)}\"" }
fun obj(m: Map<String, Collection<String>>) = m.entries.joinToString(",\n    ", "{\n    ", "\n  }") { (k, v) -> "\"${esc(k)}\": ${arr(v)}" }
    .takeIf { m.isNotEmpty() } ?: "{}"
fun dict(m: Map<String, String>) = m.entries.joinToString(",\n    ", "{\n    ", "\n  }") { (k, v) -> "\"${esc(k)}\": \"${esc(v)}\"" }
    .takeIf { m.isNotEmpty() } ?: "{}"

// KMP 모듈은 commonMain 과 중간 소스 세트를 Android 컴파일에 함께 넣는다 — 그 목록은 AGP 가 아니라 KMP 플러그인만 안다(옛 조합은
// AGP 소스에 commonMain 이 없다). 타입에 기대지 않으려고 리플렉션으로 읽고, KMP 가 아니거나 Android 타깃이 없으면 null.
// 컴파일은 새 플러그인이면 main, 옛 조합이면 변형 이름(없으면 debug 계열 첫째)이다.
// 확장은 프로젝트가 평가될 때 모아 두고 목록은 실행 때 읽는다 — configure-on-demand 저장소에서는 덤프 태스크가 설정될 때
// 의존 모듈이 아직 평가 전이라 확장이 없고(DroidKaigi 2025 실측: 0개), 실행 때 Project 를 만지는 것은 Gradle 9 가 막는다.
class KotlinModule(val ext: Any, val buildDir: DirectoryProperty)
val kotlinModules = java.util.concurrent.ConcurrentHashMap<String, KotlinModule>()

fun kmpAndroidRoots(m: KotlinModule?, variant: String): List<String>? = runCatching {
    fun call(o: Any, n: String): Any? = o.javaClass.methods.first { it.name == n && it.parameterCount == 0 }.invoke(o)
    val ext = m?.ext ?: return@runCatching null
    val targets = (call(ext, "getTargets") as? Iterable<*>)?.filterNotNull() ?: return@runCatching null
    val android = targets.firstOrNull { call(it, "getPlatformType").toString() == "androidJvm" } ?: return@runCatching null
    val comps = (call(android, "getCompilations") as Iterable<*>).filterNotNull()
    fun named(n: String) = comps.firstOrNull { call(it, "getName") == n }
    val comp = named(variant) ?: named("main") ?: comps.firstOrNull { (call(it, "getName") as String).endsWith("ebug") }
        ?: return@runCatching null
    (call(comp, "getAllKotlinSourceSets") as Iterable<*>).filterNotNull()
        .flatMap { ss -> (call(call(ss, "getKotlin")!!, "getSrcDirs") as Iterable<*>).map { (it as File).absolutePath } }
        .filterNot { File(it).toPath().startsWith(m.buildDir.get().asFile.toPath()) }   // 생성 코드(Res 접근자)는 Gradle 몫이다
        .distinct()
}.getOrNull()

// 새 모양 KMP 모듈은 android 확장이 없어 자기 덤프가 없다 — 그 모듈을 담은 앱의 덤프로 그린다(D-38). 실패 문구에 그 앱들과
// debug 계열 변형을 실어 CLI 가 Gradle 을 한 번 더 불러 앱을 뜨게 한다. 앱을 다른 곳에서 알 길이 없는 새 클론의 첫 warmup 이 이 길이다.
// 프로젝트 의존을 따라가므로 평가된 프로젝트만 본다 — configure-on-demand 저장소에서는 앱이 평가 전이라 비어 있을 수 있다.
fun kmpHosts(p: Project, targetPath: String): Map<String, List<String>> = runCatching {
    // 테스트 구성(testImplementation · androidTestImplementation · commonTestImplementation …)만 뺀다 — 플레이버 이름에 든 test(latest)는 남긴다
    val declares = Regex("(?i).*(implementation|api|runtimeOnly)$")
    fun isTest(name: String) = name.startsWith("test") || name.contains("Test")
    fun deps(q: Project): List<String> = q.configurations
        .filter { declares.matches(it.name) && !isTest(it.name) }
        .flatMap { it.dependencies.withType(ProjectDependency::class.java) }
        .mapNotNull { d ->
            // 외부: Gradle 9 는 ProjectDependency.getDependencyProject 를 없앴고 getPath 는 8.11 부터 있다
            runCatching { d.javaClass.getMethod("getPath").invoke(d) as String }
                .getOrElse { runCatching { (d.javaClass.getMethod("getDependencyProject").invoke(d) as Project).path }.getOrNull() }
        }
    // 거꾸로 따라간다 — 프로젝트마다 구성을 한 번만 훑고, 이 모듈을 쓰는 쪽으로 올라가며 앱을 모은다
    val users = mutableMapOf<String, MutableSet<String>>()
    for (q in p.rootProject.allprojects) for (d in deps(q)) users.getOrPut(d) { mutableSetOf() }.add(q.path)
    val seen = mutableSetOf(targetPath)
    val todo = ArrayDeque(listOf(targetPath))
    while (todo.isNotEmpty()) for (u in users[todo.removeFirst()].orEmpty()) if (seen.add(u)) todo.add(u)
    seen.mapNotNull { p.rootProject.findProject(it) }
        .filter { it.path != targetPath && it.plugins.hasPlugin("com.android.application") }
        .sortedBy { it.path }
        .associate { app ->
            app.path to app.configurations.names.filter { it.endsWith("RuntimeClasspath") }
                .map { it.removeSuffix("RuntimeClasspath") }.filter { it.contains("ebug") }.sorted()
        }
}.getOrDefault(emptyMap())

// 대상은 0부터 번호 붙은 prevue.project.N · prevue.variant.N · prevue.out.N. 라이브러리 모듈과 리소스를 빌릴 앱을 Gradle 한 번에 뜬다 —
// 모듈 덤프의 태스크는 앱 덤프의 부분집합이라 고정비(기동 · 설정)만 한 번 빠진다. 값을 한 속성에 이어 붙이지 않는다 — 출력 경로에는 어떤 글자든 온다.
class Target(val path: String, val variant: String, val out: String)
val targets: List<Target> = generateSequence(0) { it + 1 }
    .map { i -> System.getProperty("prevue.project.$i")?.let { Target(it, System.getProperty("prevue.variant.$i") ?: "debug",
        System.getProperty("prevue.out.$i") ?: error("the prevue.out.$i system property is required")) } }
    .takeWhile { it != null }.filterNotNull().toList()
    .also { if (it.isEmpty()) error("the prevue.project.0 system property is required") }

// 단계 시각 — `prevue.timing` 파일에 단계마다 덮어써 실패한 빌드도 어디까지 갔는지 남긴다. CLI가 벽시계와 합쳐 회차 기록을 쓴다.
// `--profile`은 대상 저장소(build/reports)에 써서 못 쓴다. 기록이 실패해도 덤프는 막지 않는다.
// 포함 빌드(build-logic · buildSrc)에도 이 스크립트가 돌아 제 시각으로 같은 파일을 덮는다 — 루트 빌드만 적는다.
val timingPath: String? = System.getProperty("prevue.timing")?.takeIf { gradle.parent == null }
val stamps = LinkedHashMap<String, Long>()
fun stamp(key: String, value: Long = System.currentTimeMillis()) {
    val path = timingPath ?: return
    runCatching {
        synchronized(stamps) {
            stamps[key] = value
            File(path).writeText(stamps.entries.joinToString(",", "{", "}") { (k, v) -> "\"$k\":$v" })
        }
    }
}
stamp("initAt")
// 모듈 경로와 디렉터리는 settings 가 정한다 — projectDir 을 옮긴 저장소(`:widgets` → core/design/widgets)에서는
// 경로를 디렉터리로 바꿔 짐작할 수 없다. 설정 전의 settings 에서 읽어 Project 를 만지지 않는다.
val moduleDirs = LinkedHashMap<String, String>()
gradle.settingsEvaluated {
    fun walk(d: ProjectDescriptor) {
        moduleDirs[d.path] = d.projectDir.absolutePath
        d.children.forEach(::walk)
    }
    walk(settings.rootProject)
    stamp("settingsAt")
}
gradle.projectsEvaluated { stamp("configuredAt") }
var graph: List<Task> = emptyList()
gradle.taskGraph.whenReady { graph = allTasks; stamp("graphTasks", allTasks.size.toLong()); stamp("graphAt") }

/**
 * 그래프의 태스크를 결과로 센다 — **마지막 덤프 태스크가 끝날 때 한 번.** 덤프 태스크가 나머지 전부에 걸려 있어 그때는 다 끝나 있다.
 * 덤프 태스크 자신은 세지 않는다(아직 도는 중이다). 병렬 빌드에서 덤프 둘이 함께 돌아도 먼저 끝난 쪽은 세지 않는다.
 */
var dumpsDone = 0
fun dumpDone() = synchronized(stamps) {
    if (++dumpsDone < targets.size) return@synchronized
    countOutcomes()
    stamp("dumpedAt")
}
fun countOutcomes() = runCatching {
    var ran = 0L; var upToDate = 0L; var fromCache = 0L; var noSource = 0L; var skipped = 0L
    for (t in graph.filter { it.name != "prevueDumpClasspath" }) {
        val s = t.state
        when {
            s.noSource -> noSource++
            s.skipMessage == "FROM-CACHE" -> fromCache++
            s.upToDate -> upToDate++
            s.skipped -> skipped++
            s.executed -> ran++
        }
    }
    stamp("ran", ran); stamp("upToDate", upToDate); stamp("fromCache", fromCache); stamp("noSource", noSource); stamp("skipped", skipped)
}

// 태스크는 **그 프로젝트가 평가된 직후** 등록한다. projectsEvaluated 는 모든 프로젝트가 끝난 뒤라
// configure-on-demand 가 켜진 저장소에서는 이미 늦다 — Gradle 이 요청받은 태스크를 찾는 시점이
// 그보다 앞이라 "task not found" 로 죽는다(org.gradle.configureondemand=true 인 공개 데모 저장소에서 실측).
// 그리고 COD 를 끄게 만들 수는 없다. 대상 저장소의 빌드 설정을 우리가 바꾸지 않는 것이 이 도구의 전제다.
gradle.afterProject {
    // init script는 build-logic 같은 included build에도 적용되므로, 대상이 아니면 조용히 건너뛴다.
    val p = this
    p.extensions.findByName("kotlin")?.let { kotlinModules[p.path] = KotlinModule(it, p.layout.buildDirectory) }
    val t = targets.firstOrNull { it.path == p.path } ?: return@afterProject
    registerDump(p, t.path, t.variant, t.out)
}

fun registerDump(p: Project, targetPath: String, variant: String, outPath: String) {
    // 여기서는 **등록만** 한다. 이 콜백은 AGP 의 afterEvaluate 보다 먼저 돌아서 변형 구성이 아직 없다
    // (실측: "'debug' 변형이 없다 — 후보: " 가 빈 목록으로 나왔다). 아래 설정 블록은 태스크가
    // 실현될 때, 즉 모든 평가가 끝난 뒤에 돌므로 그때는 다 보인다.
    p.tasks.register("prevueDumpClasspath") {
        val androidExt = p.extensions.findByName("android") ?: error(
            when {
                kmpAndroidRoots(kotlinModules[p.path], variant) != null ->
                    "$targetPath is a KMP module — it is drawn from the dump of the Android app module that includes it. Warm up with a file of the app module and this module's previews come up from that dump" +
                        kmpHosts(p, targetPath).takeIf { it.isNotEmpty() }?.let { hs ->
                            " — apps that include it: " + hs.entries.joinToString("; ") { (h, vs) -> "$h [${vs.joinToString(", ")}]" }
                        }.orEmpty()
                p.extensions.findByName("kotlin")?.javaClass?.name.orEmpty().contains("Multiplatform") ->
                    "$targetPath is a KMP module with no Android target — previews are drawn from the Android compilation (as in Android Studio). Add an Android library target to draw them"
                else -> "$targetPath has no android extension"
            }
        )

        // AGP 버전 간 시그니처 드리프트를 피하려고 리플렉션으로 읽는다.
        val namespace = androidExt.javaClass.getMethod("getNamespace").invoke(androidExt) as? String ?: ""

        // 플레이버가 있는 저장소에서 `debug`는 없는 변형이다. 빈 덤프로 조용히 끝내지 않고 후보를 알려 준다.
        if (p.configurations.findByName("${variant}RuntimeClasspath") == null) {
            val cands = p.configurations.names
                .filter { it.endsWith("RuntimeClasspath") }
                .map { it.removeSuffix("RuntimeClasspath") }
                .filter { it.contains("ebug") }
                .sorted()
            error("$targetPath has no variant '$variant' — debug variant candidates: ${cands.joinToString(", ")}")
        }

        val artifactType = Attribute.of("artifactType", String::class.java)
        fun view(cfgName: String, type: String): FileCollection? =
            p.configurations.findByName(cfgName)?.incoming?.artifactView {
                attributes.attribute(artifactType, type)
                lenient(true)
            }?.files

        val runtimeCfg = "${variant}RuntimeClasspath"
        val depJars = view(runtimeCfg, "android-classes-jar")
        val depRes = view(runtimeCfg, "android-res")
        // 런타임 클래스패스의 jar는 AGP가 변환한 것이라 META-INF/*.kotlin_module이 없다.
        // Kotlin 컴파일러는 그 메타데이터로 최상위 함수를 찾으므로, 컴파일에는 compile 구성의 jar가 따로 필요하다.
        val compileJars = view("${variant}CompileClasspath", "android-classes-jar")

        val buildDir = p.layout.buildDirectory.get().asFile

        // 이 모듈에 실재하는 변형 이름 전부와, 빌드 파일이 isDefault 로 표시한 빌드 타입·플레이버.
        // clean 한 저장소에서는 intermediates 가 없어 CLI 가 변형을 관찰할 수 없다 — 한 번 뜬 덤프가
        // 그 이름들을 적어 두면 다음 모듈부터는 Gradle 없이 Android Studio 와 같은 규칙으로 찍을 수 있다.
        // isDefault 는 AGP DSL 의 속성이고 AGP 판마다 Boolean 이거나 Property 라 리플렉션으로 느슨하게 읽는다.
        val variantsKnown = p.configurations.names
            .filter { it.endsWith("RuntimeClasspath") }
            .map { it.removeSuffix("RuntimeClasspath") }
            .filterNot { it.contains("UnitTest") || it.contains("AndroidTest") }
            .sorted()
        fun isDefaultOf(o: Any): Boolean = runCatching {
            val m = o.javaClass.methods.firstOrNull { (it.name == "getIsDefault" || it.name == "isDefault") && it.parameterCount == 0 }
                ?: return@runCatching false
            when (val v = m.invoke(o)) {
                is Boolean -> v
                is org.gradle.api.provider.Provider<*> -> (v.orNull as? Boolean) ?: false
                else -> false
            }
        }.getOrDefault(false)
        fun defaultNames(getter: String): List<String> = runCatching {
            val c = androidExt.javaClass.getMethod(getter).invoke(androidExt) as? Iterable<*> ?: return@runCatching emptyList()
            c.filterNotNull().filter { isDefaultOf(it) }.map { it.javaClass.getMethod("getName").invoke(it) as String }
        }.getOrDefault(emptyList())
        val defaultBuildType = defaultNames("getBuildTypes").firstOrNull().orEmpty()
        val defaultFlavors = defaultNames("getProductFlavors")

        // 덤프는 intermediates 디렉터리를 "읽기만" 한다. 그것을 만드는 태스크에 걸어 두지 않으면
        // 한 번도 빌드하지 않은 모듈에서 빈 클래스패스와 빈 resourceApkPath가 나오고,
        // 첫 렌더가 NOT_FOUND나 리소스 없음으로 죽는다 — 부트스트랩 1회가 자기 몫을 하게 한다.
        val v = variant.replaceFirstChar { it.uppercase() }
        fun taskOf(n: String): Task? = p.tasks.findByName(n)

        val kotlinTask = taskOf("compile${v}Kotlin")
        val javacTask = taskOf("compile${v}JavaWithJavac")
        // 앱 모듈은 process*Resources 가 **런타임** R.jar 를 낸다. 라이브러리에는 그 태스크가 없고
        // generate*RFile 만 있는데, 그것이 내는 R 은 값이 스텁인 **컴파일용**이다(실측 4156B vs 4261B).
        // 앱에서 그걸 집으면 리소스 ID 가 조용히 틀린다 — 그래서 앱에 둘 다 있어도 앞의 것만 본다.
        val resTask = taskOf("process${v}Resources")
        val rTask = resTask ?: taskOf("generate${v}RFile")
        // CMP 리소스(글꼴 · 문자열 .cvr)는 res 가 아니라 에셋으로 앱에 실린다. 렌더러는 리소스 APK 안의 assets/ 를 읽는데
        // .ap_ 에는 그것이 없어 데몬이 합친 사본을 만든다. 앱만 — 라이브러리는 앱의 리소스로 그린다.
        val assetsTask = resTask?.let { taskOf("merge${v}Assets") }
        (listOfNotNull(kotlinTask, javacTask, resTask, rTask, assetsTask)).distinct().forEach { dependsOn(it) }

        // 의존 모듈의 산출물도 우리가 만들게 한다. 여태는 런타임 클래스패스를 **해석만** 해서
        // runtime_library_classes_jar/.../classes.jar 경로를 적어 놓고, 그것을 만드는
        // bundleLibRuntimeToJar* 는 아무도 안 돌렸다 — 앱 모듈을 실제로 빌드해 둔 워크트리에서만
        // 우연히 존재했고, 아닌 곳에서는 클래스패스가 없는 파일을 가리켰다(실측: worktree-a 9/381,
        // nowinandroid 8/229, 공개 데모 저장소 3/179). 그 모듈의 클래스를 쓰는 프리뷰가 ClassNotFoundException 으로
        // 죽는데, setup 은 ok 를 냈다. FileCollection 은 자기를 만드는 태스크를 달고 다니므로 이 한 줄이면 된다.
        listOfNotNull(depJars, depRes, compileJars).forEach { dependsOn(it) }

        // 설정 시점에 확정한 값만 붙잡는다 — Gradle 9는 실행 시점 Project 접근을 막는다.
        //
        // **산출물의 자리는 태스크에게 묻는다.** 여태는 intermediates 아래를 경로로 훑었는데,
        // 그 목록은 AGP 가 배치를 바꾸는 순간 조용히 틀린다 — 코틀린 출력이 built_in_kotlinc 로
        // 옮겨간 것을 몰라 앱 모듈 프리뷰가 전부 죽었고(0.2.1), ASM 이 통과시킨 R 사본이 진짜 R.jar 를
        // 이겨 첫 렌더가 죽었다(0.4.1). 돌려 놓고 안 물어본 것이 원인이었다.
        // destinationDirectory 는 Gradle 의 AbstractCompile 이 가진 것이라 AGP 타입 없이 읽을 수 있다.
        fun destDir(t: Task?): File? = t?.let { task ->
            runCatching {
                val m = task.javaClass.methods.first { it.name == "getDestinationDirectory" && it.parameterCount == 0 }
                (m.invoke(task) as DirectoryProperty).get().asFile
            }.getOrNull()
        }
        val kotlinOut = destDir(kotlinTask)
        val javacOut = destDir(javacTask)
        val kotlinAsked = kotlinTask == null || kotlinOut != null
        val resOutputs: FileCollection? = resTask?.outputs?.files
        val rOutputs: FileCollection? = rTask?.outputs?.files
        val assetsOutputs: FileCollection? = assetsTask?.outputs?.files
        val depJarsSnapshot = depJars
        val depResSnapshot = depRes
        val compileJarsSnapshot = compileJars
        val repoRoot = p.rootProject.projectDir.absolutePath
        doLast {
            val kmpSourceRoots = kotlinModules.mapNotNull { (path, m) -> kmpAndroidRoots(m, variant)?.let { path to it } }.toMap()
            // 리소스 디렉터리만 아직 경로로 훑는다. 클래스와 R 은 위에서 태스크에게 물었다.
            fun intermediate(name: String): List<File> =
                File(buildDir, "intermediates/$name/$variant")
                    .listFiles().orEmpty().toList()

            // 태스크 출력에는 디렉터리가 섞여 온다. 한 겹 펼쳐 실제 파일까지 본다.
            fun expand(fc: FileCollection): List<File> =
                fc.files.flatMap { if (it.isDirectory) it.listFiles().orEmpty().toList() else listOf(it) }

            // 자기 산출물은 이 둘뿐이다. 폴백(ASM 변환·라이브러리 번들·tmp/kotlin-classes)은 걷어냈다 —
            // 우리가 돌리지 않는 태스크의 출력이라 언제 만들어졌는지 알 수 없고, 앞의 것에 없는 클래스만
            // 공급한다는 성질 때문에 **지운 클래스가 되살아나고** 낡은 R 사본이 끼어들었다. 두 번 물렸다.
            val ownClasses = listOfNotNull(kotlinOut, javacOut).filter { it.isDirectory }.map { it.absolutePath }

            if (!kotlinAsked) error(
                "couldn't ask compile${v}Kotlin for its output location — no destinationDirectory.\n" +
                    "  AGP · KGP may have changed the task's shape. Stopping here instead of guessing the path."
            )
            if (ownClasses.isEmpty()) error(
                "$targetPath has no compile outputs — every preview would fail.\n" +
                    "  compile${v}Kotlin: ${kotlinOut?.absolutePath ?: "(no task)"}\n" +
                    "  compile${v}JavaWithJavac: ${javacOut?.absolutePath ?: "(no task)"}"
            )

            // 렌더러는 resourceApkPath를 필수로 요구한다. 앱 모듈은 AGP가 이미 만들어 두지만
            // 라이브러리 모듈에는 없어, 그 경우 빈 문자열이 나가고 호출 측이 직접 만들어야 한다.
            val resourceApk = resOutputs?.let { expand(it) }.orEmpty()
                .firstOrNull { it.name.endsWith(".ap_") || it.name.endsWith(".apk") }
                ?.absolutePath.orEmpty()

            // 같은 패키지의 R을 두 벌 올리면 InnerClasses 충돌로 렌더가 죽는다. 그런데 **한 태스크가**
            // R.jar 를 여러 아티팩트로 낸다(실측: compile_and_runtime_r_class_jar 와
            // compile_and_runtime_not_namespaced_r_class_jar 에 같은 것이 하나씩). 어느 것이 런타임 R 인지는
            // 아티팩트 이름만이 말해 주므로, 태스크 출력 **안에서** 이름으로 하나를 고른다.
            // 자리를 짐작하는 것과 다르다 — 고르는 대상이 이미 그 태스크가 방금 낸 것들이다.
            val rJars = rOutputs?.let { expand(it) }.orEmpty().filter { it.name == "R.jar" }
            val rClassJars = listOf(
                "compile_and_runtime_r_class_jar",
                "compile_and_runtime_not_namespaced_r_class_jar",
                "runtime_r_class_jar",
                "compile_r_class_jar",
            ).firstNotNullOfOrNull { name ->
                rJars.filter { it.absolutePath.contains("/intermediates/$name/") }
                    .map { it.absolutePath }.takeIf { it.isNotEmpty() }
            } ?: rJars.firstOrNull()?.absolutePath?.let { listOf(it) }.orEmpty()

            val assetsDirs = assetsOutputs?.files.orEmpty()
                .filter { d -> d.isDirectory && d.walkTopDown().any { it.isFile } }.map { it.absolutePath }

            val ownRes = (intermediate("merged_res") + intermediate("packaged_res"))
                .filter { it.isDirectory }.map { it.absolutePath }

            val deps = depJarsSnapshot?.files.orEmpty().map { it.absolutePath }
            val resDirs = ownRes + depResSnapshot?.files.orEmpty().filter { it.isDirectory }.map { it.absolutePath }

            // R.jar 가 맨 앞이다. process*Resources 는 **덤프 태스크가 직접 돌리는** 태스크라
            // 그 산출물은 언제나 방금 것이고, 같은 규칙으로 우리 컴파일 출력보다도 앞에 선다.
            // 여기서 뒤에 두었더니 폴백에 섞인 낡은 R 사본이 늘 이겼다.
            val classPath = (rClassJars + ownClasses + deps).distinct()

            // 자기 산출물 안에서 같은 R 이 두 곳에서 나오면 렌더가 InnerClasses 충돌로 죽는다.
            // 의존성 jar 끼리는 각자 제 네임스페이스의 R 을 갖는 것이 정상이라 우리 것만 본다.
            val rSeen = LinkedHashMap<String, String>()
            for (path in rClassJars + ownClasses) {
                val f = File(path)
                if (!f.isFile || !path.endsWith(".jar")) continue
                runCatching {
                    ZipFile(f).use { z ->
                        for (e in z.entries()) {
                            val n = e.name
                            if (!n.endsWith(".class")) continue
                            val leaf = n.substringAfterLast('/')
                            if (leaf != "R.class" && !leaf.startsWith("R$")) continue
                            val fqn = n.removeSuffix(".class").replace('/', '.')
                            val prev = rSeen.putIfAbsent(fqn, path)
                            if (prev != null && prev != path) error(
                                "the same R is in two places: $fqn\n  $prev\n  $path\n" +
                                    "  loading both makes InnerClasses disagree and the first render dies."
                            )
                        }
                    }
                }.getOrThrow()
            }
            val projectClassPath = classPath.filter { it.startsWith(repoRoot) }
            val compileClassPath = compileJarsSnapshot?.files.orEmpty().map { it.absolutePath }

            // 클래스패스가 없는 것을 가리키면 그 모듈을 쓰는 프리뷰가 전부 ClassNotFoundException 으로 죽는다.
            // 덤프가 ok 를 내고 렌더에서야 드러나는 일을 여기서 끊는다.
            classPath.filterNot { File(it).exists() }.takeIf { it.isNotEmpty() }?.let { missing ->
                error(
                    "the classpath points to missing files (${missing.size}/${classPath.size}) — previews would die.\n" +
                        missing.take(10).joinToString("\n") { "  $it" }
                )
            }

            File(outPath).apply { parentFile?.mkdirs() }.writeText(
                """
                {
                  "schema": 3,
                  "project": "${esc(targetPath)}",
                  "repoRoot": "${esc(repoRoot)}",
                  "moduleDirs": ${dict(moduleDirs)},
                  "variant": "${esc(variant)}",
                  "namespace": "${esc(namespace)}",
                  "resourceApkPath": "${esc(resourceApk)}",
                  "classPath": ${arr(classPath)},
                  "projectClassPath": ${arr(projectClassPath)},
                  "compileClassPath": ${arr(compileClassPath)},
                  "rClassJars": ${arr(rClassJars)},
                  "resourceDirs": ${arr(resDirs)},
                  "assetsDirs": ${arr(assetsDirs)},
                  "variantsKnown": ${arr(variantsKnown)},
                  "kmpSourceRoots": ${obj(kmpSourceRoots)},
                  "defaultHint": { "buildType": "${esc(defaultBuildType)}", "flavors": ${arr(defaultFlavors)} }
                }
                """.trimIndent()
            )
            logger.lifecycle("prevue: $outPath (classPath ${classPath.size}, resourceDirs ${resDirs.size})")
            dumpDone()
        }
    }
}
