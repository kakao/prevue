package prevue.daemon.adapter.source

import java.io.File
import java.util.zip.ZipFile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.update
import prevue.json.map

/**
 * 컴파일된 클래스 파일에서 `@Preview` 인자를 읽는다. 두 가지다.
 *
 * - [expand] — 멀티프리뷰를 푼다. `@DevicePreviews`처럼 **자기 선언에 `@Preview`를 단** 애노테이션은
 *   그것을 붙인 함수에 프리뷰를 여러 장 만든다 — Android Studio와 같은 규칙이다.
 *   애노테이션 이름을 알고 있지 않다. "그 선언에 `@Preview`가 달렸는가"만 본다.
 *   그래서 저장소가 직접 만든 것이든 androidx가 준 `@PreviewScreenSizes`든 같은 경로로 풀린다 —
 *   특정 프로젝트의 관례를 코드에 심지 않는다.
 * - [direct] — 함수에 직접 단 `@Preview`. 소스로는 `Devices.PIXEL_C` · `UI_MODE_NIGHT_YES or …` 같은
 *   상수 참조를 못 풀지만, 클래스 파일에는 컴파일러가 접어 둔 값이 있다.
 *
 * `@Preview`의 유지 정책이 BINARY라 리플렉션으로는 보이지 않는다(`javap`로 확인했다).
 * 그래서 클래스 파일의 `RuntimeInvisibleAnnotations`를 직접 읽는다. ASM을 쓰지 않는 이유는
 * 지금 손에 닿는 ASM이 렌더러 jar 안에 섀도잉된 것뿐이고, 렌더러 내부에 의존 표면을 하나 더
 * 만드는 것이 이 도구의 알려진 위험이기 때문이다.
 *
 * 클래스 파일은 핫 컴파일로 바뀐다(오버레이가 클래스패스 맨 앞이다). 그래서 읽은 것은 **찾은 자리와 mtime**을
 * 함께 기억하고, 디렉터리 항목은 부를 때마다 다시 찾아 본다 — 멀티프리뷰 선언을 고치고 저장하면 다음 열기에 바로 맞는다.
 * jar는 데몬이 사는 동안 거의 안 바뀌고 열기가 비싸서, 찾은 jar의 mtime만 다시 본다.
 */
class MultiPreview(classPath: List<String>) {
    private val dirs = classPath.map(::File).filter { it.isDirectory }
    private val jars = classPath.map(::File).filter { it.isFile && (it.name.endsWith(".jar") || it.name.endsWith(".zip")) }

    /** 읽은 클래스 하나. [stamp]가 같으면 다시 읽지 않는다. 없는 클래스도 기억한다(`absent`) — `@Composable`·`@Suppress`마다 jar를 다 열지 않게. */
    private class Parsed(val stamp: String, val file: File?, val classAnns: List<ClassAnnotation>, val methodAnns: Map<String, List<ClassAnnotation>>)

    private val cache = MutableStateFlow<Map<String, Parsed>>(emptyMap())

    /** FQN이 멀티프리뷰면 그것이 펼쳐지는 `@Preview` 인자들, 아니면 빈 리스트. */
    fun expand(fqn: String, depth: Int = 0): List<Map<String, String>> {
        if (depth > 3) return emptyList()
        val out = ArrayList<Map<String, String>>()
        for (a in parsed(fqn).classAnns) {
            val own = previews(a)
            // 멀티프리뷰가 다시 멀티프리뷰를 달 수 있다. 같은 규칙으로 한 겹 더 푼다.
            out += own ?: expand(a.type.trim('L', ';').replace('/', '.'), depth + 1)
        }
        return out
    }

    /**
     * [classFqn]의 [method]에 직접 단 `@Preview`들의 인자, 소스 순서대로. 클래스 파일이 없거나
     * [notOlderThan](소스 mtime)보다 오래됐으면 null — 저장 뒤 컴파일 전의 클래스는 소스와 다를 수 있다.
     */
    fun direct(classFqn: String, method: String, notOlderThan: Long): List<Map<String, String>>? {
        val c = parsed(classFqn)
        val f = c.file ?: return null
        if (f.lastModified() < notOlderThan) return null
        return c.methodAnns[method].orEmpty().flatMap { previews(it).orEmpty() }
    }

    /** `@Preview` · `@Preview.Container`면 그 인자들, 다른 애노테이션이면 null. */
    private fun previews(a: ClassAnnotation): List<Map<String, String>>? = when (a.type) {
        PREVIEW -> listOf(a.values)
        PREVIEW_CONTAINER -> a.nestedArray("value").map { it.values }
        else -> null
    }

    private fun parsed(fqn: String): Parsed {
        val path = fqn.replace('.', '/') + ".class"
        val old = cache.value[fqn]
        // 디렉터리는 stat만으로 본다 — 오버레이에 새로 생긴 클래스가 옛 jar · 빌드 산출물을 가린다.
        val inDir = dirs.firstNotNullOfOrNull { d -> File(d, path).takeIf { it.isFile } }
        if (inDir != null) {
            val stamp = "dir:${inDir.path}:${inDir.lastModified()}"
            if (old?.stamp == stamp) return old
            return read(fqn, stamp, inDir) { inDir.readBytes() }
        }
        if (old != null && !old.stamp.startsWith("dir:")) {
            val jar = old.file ?: return old                                    // absent
            if (old.stamp == "jar:${jar.path}:${jar.lastModified()}") return old
        }
        for (jar in jars) {
            val bytes = runCatching { ZipFile(jar).use { z -> z.getEntry(path)?.let { z.getInputStream(it).readBytes() } } }.getOrNull()
            if (bytes != null) return read(fqn, "jar:${jar.path}:${jar.lastModified()}", jar) { bytes }
        }
        return remember(fqn, Parsed("absent", null, emptyList(), emptyMap()))
    }

    private fun read(fqn: String, stamp: String, file: File, bytes: () -> ByteArray): Parsed {
        val r = ClassAnnotations.readAll(bytes())
        return remember(fqn, Parsed(stamp, file, r.first, r.second))
    }

    private fun remember(fqn: String, p: Parsed): Parsed = p.also { cache.update { m -> m + (fqn to p) } }

    private companion object {
        const val PREVIEW = "Landroidx/compose/ui/tooling/preview/Preview;"
        const val PREVIEW_CONTAINER = "Landroidx/compose/ui/tooling/preview/Preview\$Container;"
    }
}

/** 클래스 파일에 붙은 애노테이션 하나. 값은 PreviewLocator가 소스에서 뽑는 것과 같은 문자열 꼴이다. */
class ClassAnnotation(val type: String, val values: Map<String, String>, private val nested: Map<String, List<ClassAnnotation>>) {
    fun nestedArray(key: String): List<ClassAnnotation> = nested[key].orEmpty()
}

/**
 * 클래스 파일에서 클래스와 메서드에 달린 애노테이션을 읽는다. 필드는 읽지 않는다 —
 * 멀티프리뷰는 애노테이션 선언에, 직접 단 `@Preview`는 함수(파사드 클래스의 정적 메서드)에 달린다. JVMS 4장 그대로다.
 */
object ClassAnnotations {
    // 조용히 빈 리스트를 내면 "멀티프리뷰가 아니다"와 "못 읽었다"가 구별되지 않는다 — 실패는 로그로 남긴다.
    /** 클래스의 애노테이션과, 메서드 이름 → 그 메서드의 애노테이션. 이름이 겹치면(오버로드) 앞의 것이다. */
    fun readAll(b: ByteArray): Pair<List<ClassAnnotation>, Map<String, List<ClassAnnotation>>> =
        runCatching { Reader(b).all() }
            .onFailure { System.err.println("prevue: 클래스 애노테이션을 읽지 못했다 — $it") }
            .getOrDefault(emptyList<ClassAnnotation>() to emptyMap())

    private class Reader(val b: ByteArray) {
        var p = 0
        lateinit var pool: Array<Any?>

        fun u1() = b[p++].toInt() and 0xff
        fun u2() = (u1() shl 8) or u1()
        fun u4() = (u2().toLong() shl 16) or u2().toLong()

        fun all(): Pair<List<ClassAnnotation>, Map<String, List<ClassAnnotation>>> {
            p = 8                                  // magic(4) + minor(2) + major(2)
            readPool()
            p += 6                                 // access_flags, this_class, super_class
            skip(u2() * 2)                         // interfaces
            skipMembers()                          // fields
            val methods = LinkedHashMap<String, List<ClassAnnotation>>()
            repeat(u2()) {
                p += 2                                                   // access
                val name = utf8(u2()); p += 2                            // name, descriptor
                val anns = attributes()
                if (anns.isNotEmpty()) methods.putIfAbsent(name, anns)
            }
            return attributes() to methods
        }

        /** 속성 표 하나를 읽고, 그 안의 애노테이션만 돌려준다. */
        fun attributes(): List<ClassAnnotation> {
            val out = ArrayList<ClassAnnotation>()
            repeat(u2()) {
                val name = utf8(u2()); val len = u4().toInt(); val end = p + len
                if (name == "RuntimeInvisibleAnnotations" || name == "RuntimeVisibleAnnotations") {
                    repeat(u2()) { out += annotation() }
                }
                p = end
            }
            return out
        }

        fun readPool() {
            val n = u2()
            pool = arrayOfNulls(n)
            var i = 1
            while (i < n) {
                when (val tag = u1()) {
                    1 -> { val len = u2(); pool[i] = String(b, p, len, Charsets.UTF_8); p += len }
                    3 -> { pool[i] = ((u2() shl 16) or u2()) }                       // Integer
                    4 -> { pool[i] = Float.fromBits((u2() shl 16) or u2()) }         // Float
                    5 -> { pool[i] = (u4() shl 32) or u4(); i++ }                    // Long — 두 칸
                    6 -> { pool[i] = Double.fromBits((u4() shl 32) or u4()); i++ }   // Double — 두 칸
                    7, 8, 16, 19, 20 -> p += 2
                    15 -> p += 3
                    9, 10, 11, 12, 17, 18 -> p += 4
                    else -> error("모르는 상수 풀 태그 $tag")
                }
                i++
            }
        }

        fun utf8(i: Int) = pool[i] as? String ?: ""

        /**
         * `p += u2()`로 쓰면 안 된다. 코틀린은 복합 대입의 **왼쪽을 먼저 읽어서** 오른쪽이 올린 `p`를
         * 옛 값으로 덮어쓴다 — 읽기와 이동이 한 함수에 있는 파서에서는 조용히 어긋난다(실제로 겪었다).
         */
        fun skip(n: Int) { p += n }

        fun skipMembers() = repeat(u2()) {
            p += 6                                                   // access, name, descriptor
            repeat(u2()) { p += 2; skip(u4().toInt()) }              // attributes
        }

        fun annotation(): ClassAnnotation {
            val type = utf8(u2())
            val values = LinkedHashMap<String, String>()
            val nested = LinkedHashMap<String, List<ClassAnnotation>>()
            repeat(u2()) {
                val key = utf8(u2())
                when (val v = value()) {
                    is String -> values[key] = v
                    is List<*> -> {
                        @Suppress("UNCHECKED_CAST")
                        val anns = v.filterIsInstance<ClassAnnotation>()
                        if (anns.isNotEmpty()) nested[key] = anns
                    }
                }
            }
            return ClassAnnotation(type, values, nested)
        }

        /** 문자열 하나, 중첩 애노테이션, 또는 그 배열. 렌더러에 넘기는 인자는 전부 문자열이라 여기서 맞춘다. */
        fun value(): Any? = when (val tag = u1().toChar()) {
            'B', 'C', 'I', 'S' -> (pool[u2()] as? Int)?.toString()
            'J' -> (pool[u2()] as? Long)?.toString()
            'F' -> (pool[u2()] as? Float)?.toString()
            'D' -> (pool[u2()] as? Double)?.toString()
            'Z' -> ((pool[u2()] as? Int) != 0).toString()
            's' -> utf8(u2())
            'e' -> { p += 4; null }                 // enum 상수 — 렌더러 인자에 쓰이지 않는다
            'c' -> { p += 2; null }
            '@' -> annotation()
            '[' -> (0 until u2()).map { value() }
            else -> error("모르는 element_value 태그 $tag")
        }
    }
}
