package prevue.daemon.domain.policy

import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.port.RenderOutput

/**
 * 바뀐 파일만 컴파일하므로 **시그니처가 바뀌면 같은 모듈의 호출자가 Gradle이 만든 옛 클래스로 남는다.** 그 호출자를 그리면
 * layoutlib이 "없는 메서드"를 말한다. 없는 멤버의 클래스가 우리가 오버레이에 넣은 것이면 원인이 확실하다 — 호출자를 함께 컴파일한다.
 */
object LinkagePolicy {
    /**
     * 렌더 실패에서 없는 멤버를 읽는다 — (클래스, 멤버). 두 모양으로 온다. 렌더 중이면 예외 타입 없이 서술자만,
     * 레이아웃 중이면 타입과 함께(2026-10-03 nowinandroid — 보드 카드에서 처음 봤다):
     * `Exception raised during rendering: 'void com.foo.BarKt.Baz(long, ..., Composer, int, int)'`
     * `java.lang.NoSuchMethodError: 'void com.foo.BarKt.Baz(java.lang.String, ...)'`
     */
    fun missingMember(out: RenderOutput): Pair<String, String>? {
        if (out.failure != FailureKind.EXCEPTION) return null
        val (owner, member) = MISSING_MEMBER.find(out.message?.text.orEmpty())?.destructured ?: return null
        return owner to member
    }

    private val MISSING_MEMBER = Regex("""(?:Exception raised during rendering|NoSuchMethodError): '\S+ ([\w.$]+)\.([\w$]+)\(""")
}
