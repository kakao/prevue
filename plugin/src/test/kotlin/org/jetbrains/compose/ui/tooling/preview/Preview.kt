package org.jetbrains.compose.ui.tooling.preview

// 레거시 JetBrains @Preview 의 대역 — FQN · 유지 정책 · 반복 가능이 Android 쪽 jar 와 같다(DroidKaigi 2025 덤프에서 javap 로 확인).
@Retention(AnnotationRetention.BINARY)
@Target(AnnotationTarget.ANNOTATION_CLASS, AnnotationTarget.FUNCTION)
@Repeatable
annotation class Preview(
    val name: String = "",
    val group: String = "",
    val widthDp: Int = -1,
    val heightDp: Int = -1,
    val locale: String = "",
    val showBackground: Boolean = false,
    val backgroundColor: Long = 0,
)
