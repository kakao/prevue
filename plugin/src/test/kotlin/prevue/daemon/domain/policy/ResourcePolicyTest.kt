package prevue.daemon.domain.policy

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.domain.port.ResourceEntry
import prevue.daemon.domain.port.ResourceKey
import prevue.daemon.domain.port.ResourceLookup
import prevue.daemon.domain.policy.ResourcePolicy.Plan

/**
 * D-68. values 저장을 값만 넣어 닫는 선. 넘으면 지금 앱과 다른 그림이 나온다 — 다른 정의가 이기는 항목을 고쳐도 그림이 바뀐다든가.
 * 그래서 의심스러운 것은 전부 낡음이다(사람이 Gradle로 닫는다).
 */
class ResourcePolicyTest {
    private fun k(name: String, type: String = "string", q: String = "") = ResourceKey(type, name, q)
    private fun e(name: String, value: String, type: String = "string", q: String = "") = ResourceEntry(k(name, type, q), value)
    /** 렌더러가 지금 그리는 값 — 리소스 APK. */
    private fun apk(vararg pairs: Pair<ResourceKey, String>): (ResourceKey) -> ResourceLookup {
        val m = pairs.toMap()
        return { key -> m[key]?.let { ResourceLookup.Value(it) } ?: if (m.keys.any { it.type == key.type && it.name == key.name }) ResourceLookup.NoConfig else ResourceLookup.NoName }
    }
    private fun stale(p: Plan, contains: String) = assertTrue(contains in p.stale?.text.orEmpty(), "$p 에 '$contains'가 없다")

    @Test fun `저장 전 값이 지금 값이면 바뀐 값만 넣는다`() {
        val p = ResourcePolicy.plan(listOf(e("title", "A"), e("done", "Done")), listOf(e("title", "B"), e("done", "Done")), apk(k("title") to "A", k("done") to "Done"))
        assertEquals(Plan(listOf(k("title"))), p)
    }

    @Test fun `값이 그대로면 Same이다 — 주석 · 공백 · 순서`() {
        assertEquals(Plan(), ResourcePolicy.plan(listOf(e("a", "1"), e("b", "2")), listOf(e("b", "2"), e("a", "1")), apk(k("a") to "1", k("b") to "2")))
    }

    // nowinandroid `main/res/values/colors.xml`의 ic_launcher_foreground_tint는 `debug`가 덮는다 — main을 고쳐도 demoDebug 그림은 그대로여야 한다.
    @Test fun `다른 정의가 이기는 항목을 고치면 낡음이다`() {
        val p = ResourcePolicy.plan(listOf(e("tint", "#fffcfcfc", "color")), listOf(e("tint", "#ff000000", "color")), apk(k("tint", "color") to "#ffa23f16"))
        stale(p, "another definition")
    }

    // 리뷰 지적 — 낡음 항목이 섞여도 넣을 수 있는 값은 넣는다. 안 넣으면 그 값이 다음 저장의 기준이 돼 렌더러에 없는 값과 견준다.
    @Test fun `새 항목이 섞여도 바뀐 기존 값은 넣는다`() {
        val p = ResourcePolicy.plan(listOf(e("a", "1")), listOf(e("a", "2"), e("b", "new")), apk(k("a") to "1"))
        assertEquals(listOf(k("a")), p.patch)
        stale(p, "new entry")
    }

    @Test fun `새 항목은 R id가 생겨 낡음이다`() {
        stale(ResourcePolicy.plan(listOf(e("a", "1")), listOf(e("a", "1"), e("b", "2")), apk(k("a") to "1")), "new entry")
    }

    @Test fun `항목이 빠지면 낡음이다`() {
        stale(ResourcePolicy.plan(listOf(e("a", "1"), e("b", "2")), listOf(e("a", "1")), apk(k("a") to "1", k("b") to "2")), "was removed")
    }

    @Test fun `아무도 정의하지 않은 한정자를 더하는 것은 넣는다`() {
        val p = ResourcePolicy.plan(emptyList(), listOf(e("title", "제목", q = "ko")), apk(k("title") to "Title"))
        assertEquals(Plan(listOf(k("title", q = "ko"))), p)
    }

    @Test fun `다른 곳이 정의한 한정자를 더하는 것은 낡음이다`() {
        stale(ResourcePolicy.plan(emptyList(), listOf(e("title", "제목", q = "ko")), apk(k("title") to "Title", k("title", q = "ko") to "타이틀")), "another definition")
    }

    @Test fun `리소스 APK에 그 한정자가 없는 항목을 고치면 낡음이다`() {
        stale(ResourcePolicy.plan(listOf(e("pad", "8dp", "dimen", "land")), listOf(e("pad", "12dp", "dimen", "land")), apk(k("pad", "dimen") to "8dp")), "qualifier")
    }

    @Test fun `값 타입이 아닌 것이 바뀌면 낡음이다`() {
        stale(ResourcePolicy.plan(listOf(e("Theme", "p{}", "style")), listOf(e("Theme", "p{a=1}", "style")), apk(k("Theme", "style") to "p{}")), "style")
    }

    @Test fun `같은 항목이 두 번이면 낡음이다`() {
        stale(ResourcePolicy.plan(listOf(e("a", "1")), listOf(e("a", "1"), e("a", "2")), apk(k("a") to "1")), "defined twice")
    }

    @Test fun `aapt2가 다르게 읽는 공백이 새로 들어오면 낡음이다`() {
        stale(ResourcePolicy.plan(listOf(e("a", "x y")), listOf(e("a", "x y")), apk(k("a") to "x y")), "whitespace")
        assertEquals(Plan(listOf(k("a"))), ResourcePolicy.plan(listOf(e("a", "x y")), listOf(e("a", "x z")), apk(k("a") to "x y")))
    }

    @Test fun `얹은 값이 지금 값이다 — 되돌리기도 넣는다`() {
        // 한 번 A → B로 넣은 뒤 B → A. 지금 값은 얹은 B다.
        assertEquals(Plan(listOf(k("a"))), ResourcePolicy.plan(listOf(e("a", "B")), listOf(e("a", "A")), apk(k("a") to "B")))
    }

    @Test fun `새 값이 이미 지금 값이면 넣을 것이 없다`() {
        assertEquals(Plan(), ResourcePolicy.plan(listOf(e("a", "1")), listOf(e("a", "2")), apk(k("a") to "2")))
    }
}
