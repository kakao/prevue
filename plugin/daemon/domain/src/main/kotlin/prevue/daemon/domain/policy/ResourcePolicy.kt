package prevue.daemon.domain.policy

import prevue.daemon.entity.Phrase
import prevue.daemon.entity.phrase
import prevue.daemon.domain.port.ResourceEntry
import prevue.daemon.domain.port.ResourceKey
import prevue.daemon.domain.port.ResourceLookup

/**
 * D-68. values XML의 저장을 Gradle 없이 값만 넣어 닫을 수 있는가 — 항목마다 가른다. 못 넣는 항목이 하나라도 있으면 낡음(`resources`)이다 —
 * 렌더러의 리소스 APK를 다시 만드는 것은 Gradle뿐이고, 그 낡음은 지금처럼 사람이 닫는다. 넣을 수 있는 항목은 그래도 넣는다.
 *
 * 넣는 것은 **바뀐 항목의 저장 전 값 == 지금 그리는 값**일 때뿐이다. 다른 소스 세트(`debug` · flavor)나 앱 모듈이 같은 항목을 덮은 정의를
 * 고친 것이면 실제 앱의 그림은 안 바뀐다 — 그 정의는 저장 전에도 지금 값과 달랐다. 리소스 APK가 이 파일보다 옛것일 때도 같은 선에서 걸린다.
 */
object ResourcePolicy {
    /** 값만 바꿔 넣는 타입. 렌더러가 리졸버로만 읽는다. style · attr · id · styleable은 구조라(상속 · 형식 · id) 뺀다. */
    val VALUE_TYPES = setOf("string", "color", "dimen", "plurals", "array", "integer", "bool", "fraction")

    /** [patch]는 넣을 항목, [stale]은 못 넣는 항목의 첫 이유. 둘 다 없으면 그림에 닿는 값이 하나도 안 바뀌었다(주석 · 공백 · 줄 순서). */
    data class Plan(val patch: List<ResourceKey> = emptyList(), val stale: Phrase? = null) {
        val same: Boolean get() = patch.isEmpty() && stale == null
    }

    fun plan(old: List<ResourceEntry>, new: List<ResourceEntry>, lookup: (ResourceKey) -> ResourceLookup): Plan {
        // 같은 항목이 둘이면 어느 값이 이길지 aapt2에 맡겨야 한다 — 파일째 낡음이다.
        new.groupBy { it.key }.entries.firstOrNull { it.value.size > 1 }?.let { return Plan(stale = phrase("resource.twice", "at" to label(it.key))) }
        val before = old.associate { it.key to it.value }
        val after = new.associate { it.key to it.value }
        val patch = ArrayList<ResourceKey>()
        var stale: Phrase? = null
        for (key in before.keys + after.keys) {
            val o = before[key]
            val n = after[key]
            if (o == n) continue
            when (val v = judge(key, o, n, lookup)) {
                Verdict.Skip -> {}
                Verdict.Patch -> patch += key
                is Verdict.Stale -> if (stale == null) stale = v.why
            }
        }
        return Plan(patch, stale)
    }

    private sealed interface Verdict {
        data object Patch : Verdict
        /** 새 값이 이미 지금 그리는 값이다. */
        data object Skip : Verdict
        data class Stale(val why: Phrase) : Verdict
    }

    /** 바뀐 항목 하나. */
    private fun judge(key: ResourceKey, o: String?, n: String?, lookup: (ResourceKey) -> ResourceLookup): Verdict {
        val at = label(key)
        if (key.type !in VALUE_TYPES) return Verdict.Stale(phrase("resource.notValue", "at" to at, "type" to key.type))
        if (n == null) return Verdict.Stale(phrase("resource.removed", "at" to at))
        if ((oddSpaces(n) - oddSpaces(o.orEmpty())).isNotEmpty()) return Verdict.Stale(phrase("resource.spaces", "at" to at))
        return when (val now = lookup(key)) {
            ResourceLookup.NoName -> Verdict.Stale(phrase("resource.new", "at" to at))
            // 그 한정자의 값을 아무도 정의하지 않았으면 이 파일이 처음이다.
            ResourceLookup.NoConfig -> if (o == null) Verdict.Patch else Verdict.Stale(phrase("resource.noConfig", "at" to at))
            is ResourceLookup.Value -> when (now.value) {
                n -> Verdict.Skip
                o -> Verdict.Patch
                else -> Verdict.Stale(phrase("resource.shadowed", "at" to at))
            }
        }
    }

    private fun label(k: ResourceKey) = "@${k.type}/${k.name}" + if (k.qualifiers.isEmpty()) "" else " (${k.qualifiers})"

    /** 스페이스 · 줄바꿈 · 탭 말고 공백으로 읽힐 수 있는 글자들. */
    private fun oddSpaces(s: String): Set<Char> = s.filter { (it.isWhitespace() || Character.isSpaceChar(it)) && it != ' ' && it != '\n' && it != '\t' }.toSet()
}
