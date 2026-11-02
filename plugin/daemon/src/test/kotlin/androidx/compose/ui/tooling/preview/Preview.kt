package androidx.compose.ui.tooling.preview

/**
 * 테스트용 androidx `@Preview` — 시그니처와 유지 정책(BINARY · Repeatable)이 같아 클래스 파일 모양이 같다.
 * 렌더러 jar에는 이 클래스가 없어 테스트가 직접 컴파일한다.
 */
@MustBeDocumented
@Retention(AnnotationRetention.BINARY)
@Target(AnnotationTarget.ANNOTATION_CLASS, AnnotationTarget.FUNCTION)
@Repeatable
annotation class Preview(
    val name: String = "",
    val group: String = "",
    val apiLevel: Int = -1,
    val widthDp: Int = -1,
    val heightDp: Int = -1,
    val locale: String = "",
    val fontScale: Float = 1f,
    val showSystemUi: Boolean = false,
    val showBackground: Boolean = false,
    val backgroundColor: Long = 0,
    val uiMode: Int = 0,
    val device: String = "",
    val wallpaper: Int = -1,
)

object Devices {
    const val PIXEL_C = "id:pixel_c"
}
