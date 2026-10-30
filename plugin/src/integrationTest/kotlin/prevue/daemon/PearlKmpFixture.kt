package prevue.daemon

import java.io.File

/**
 * 통합 테스트의 KMP 대상 `fixtures/pearl-kmp` — pearl을 KMP · CMP로 옮긴 복제본이다. 덤프는 [PearlFixture.warmupJson]으로 뜬다.
 * KMP 모듈은 자기 덤프 없이 그 모듈을 담은 앱의 덤프로 그린다(D-38) — 그래서 warmup은 앱 파일로 한다.
 */
object PearlKmpFixture {
    val dir: File? = PearlFixture.dir?.let { File(it.parentFile, "pearl-kmp") }

    private fun common(module: String, name: String) = File(dir, "$module/src/commonMain/kotlin/com/example/pearl/$module/$name")
    val app: File get() = File(dir, "app/src/main/kotlin/com/example/pearl/MainActivity.kt")
    /** pearl과 같은 보드 — 프리뷰 30장. */
    val board: File get() = common("feature/pearl", "PearlPreviews.kt")
    /** 옛 JetBrains `@Preview` — 직접 하나 + 멀티 프리뷰 둘. */
    val legacy: File get() = common("feature/pearl", "LegacyPreviews.kt")
    /** Res 문자열을 읽는 프리뷰 파일 — 저장 회귀의 대상. */
    val filter: File get() = common("feature/pearl", "FilterScreen.kt")
    val expectActual: File get() = common("feature/pearl", "BackHandler.kt")
    /** 창 폭(`LocalWindowInfo.containerSize`)으로 열 수가 갈리는 프리뷰 — 기본 하나 + 1280dp 하나. */
    val adaptive: File get() = common("feature/pearl", "AdaptivePreviews.kt")
    /** Android 타깃이 없는 모듈의 프리뷰 파일. */
    val noAndroid: File get() = File(dir, "feature/desktop/src/commonMain/kotlin/com/example/pearl/feature/desktop/MenuBoard.kt")
    const val LEGACY_CARDS = 3
    /** included build `components`의 KMP 모듈 — CLI · 데몬은 settings 밖 모듈을 저장소 상대 디렉터리로 부른다. */
    const val INCLUDED = ":components:ui:swatch"
    val includedCommon: File get() = File(dir, "components/ui/swatch/src/commonMain/kotlin")

    fun available(): Boolean = PearlFixture.available() && board.isFile

    /** `:feature:pearl`의 commonMain 파일을 [to] 아래 패키지 경로 그대로 복사한다 — 저장은 복사본에 한다. */
    fun copy(file: File, to: File): File =
        file.copyTo(File(to, "com/example/pearl/feature/pearl/${file.name}").apply { parentFile.mkdirs() }, overwrite = true).canonicalFile
}
