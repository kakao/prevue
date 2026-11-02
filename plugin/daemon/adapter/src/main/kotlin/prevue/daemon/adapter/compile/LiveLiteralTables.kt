package prevue.daemon.adapter.compile

import java.io.File
import org.objectweb.asm.AnnotationVisitor
import org.objectweb.asm.ClassReader
import org.objectweb.asm.ClassVisitor
import org.objectweb.asm.MethodVisitor
import org.objectweb.asm.Opcodes
import prevue.daemon.domain.port.LiteralSite
import prevue.daemon.domain.port.LiteralTable

/**
 * D-67. 컴파일 산출물에서 파일마다의 live literal 표를 읽는다. Compose 컴파일러(`liveLiteralsEnabled`)가 파일마다 `LiveLiterals$<파사드>`를 내고,
 * 리터럴마다 getter에 `@LiveLiteralInfo(key, offset)`, 기본값은 `<clinit>`의 상수로 둔다.
 * 키의 가장 바깥 함수가 컴포저블인지는 그 파일의 클래스에서 같은 이름의 메서드가 전부 `Composer`를 받는지로 본다.
 */
internal object LiveLiteralTables {
    /** [dir] 아래에서 [since](epoch ms) 뒤에 쓰인 클래스만 본다 — 이번 컴파일이 낸 것이다. [sources]의 절대경로와 맞는 표만 낸다. */
    fun read(dir: File, sources: List<File>, since: Long): List<LiteralTable> {
        val wanted = sources.map { it.absolutePath }.toSet()
        val classes = dir.walkTopDown().filter { it.isFile && it.name.endsWith(".class") && it.lastModified() >= since }
            // SKIP_DEBUG는 쓰지 않는다 — 소스 파일 이름(SourceFile)이 디버그 속성이다.
            .mapNotNull { f -> runCatching { Scan().also { ClassReader(f.readBytes()).accept(it, ClassReader.SKIP_FRAMES) } }.getOrNull() }
            .toList()
        return classes.filter { it.literalFile in wanted }.map { ll ->
            val pkg = ll.name.substringBeforeLast('/', "")
            val fileName = File(ll.literalFile!!).name
            // 같은 파일에서 나온 클래스들의 메서드 — 이름마다 Composer를 받는가. 하나라도 안 받으면 컴포저블로 보지 않는다.
            val methods = classes.filter { it.name.substringBeforeLast('/', "") == pkg && it.source == fileName }.flatMap { it.methods }
            val composable = methods.groupBy({ it.first }, { it.second }).mapValues { (_, ds) -> ds.all { COMPOSER in it } }
            LiteralTable(ll.literalFile!!, ll.name.replace('/', '.'), ll.infos.map { (key, offset) ->
                val type = key.substringBefore('$')
                LiteralSite(key, offset, type, outermost(key)?.let { composable[it] } == true, convert(type, ll.defaults[key]))
            })
        }
    }

    /**
     * 키의 가장 바깥 이름 있는 함수. 키는 안쪽 → 바깥 순서다(`Int$arg-0$call-Inner$fun-Card` · `…$fun-Member$class-Obj`).
     * 함수 바깥에 `$class-…` 말고 다른 것(`$val-…` · `$init`)이 있으면 프로퍼티 초기화 · init 블록 속이라 null.
     */
    fun outermost(key: String): String? {
        val m = FUN.findAll(key).lastOrNull() ?: return null
        // 같은 이름의 두 번째 함수부터는 `-1` · `-2`가 붙는다(오버로드, nowinandroid `ForYouScreen-1`). 메서드 이름에는 없다.
        return m.groupValues[1].replace(OVERLOAD, "").takeIf { CLASSES.matches(key.substring(m.range.last + 1)) }
    }

    /** `<clinit>`이 넣은 상수(Integer · Long · Float · Double · String)를 키의 타입으로. */
    private fun convert(type: String, v: Any?): Any? = when (type) {
        "Int" -> v as? Int
        "Long" -> v as? Long
        "Float" -> v as? Float
        "Double" -> v as? Double
        "String" -> v as? String
        "Boolean" -> (v as? Int)?.let { it != 0 }
        "Char" -> (v as? Int)?.toChar()
        "Short" -> (v as? Int)?.toShort()
        "Byte" -> (v as? Int)?.toByte()
        else -> null
    }

    private val FUN = Regex("\\\$fun-([^\$]+)")
    private val CLASSES = Regex("(\\\$class-[^\$]+)*")
    private val OVERLOAD = Regex("-[0-9]+$")
    private const val COMPOSER = "Landroidx/compose/runtime/Composer;"
    private const val INFO = "Landroidx/compose/runtime/internal/LiveLiteralInfo;"
    private const val FILE_INFO = "Landroidx/compose/runtime/internal/LiveLiteralFileInfo;"

    /** 클래스 하나에서 필요한 것만 — 이름 · 소스 파일 · 메서드(이름, 서술자), LiveLiterals면 파일 · 키 · 기본값. */
    private class Scan : ClassVisitor(Opcodes.ASM9) {
        lateinit var name: String
        var source: String? = null
        val methods = ArrayList<Pair<String, String>>()
        var literalFile: String? = null
        val infos = ArrayList<Pair<String, Int>>()
        val defaults = HashMap<String, Any?>()

        override fun visit(version: Int, access: Int, name: String, signature: String?, superName: String?, interfaces: Array<out String>?) { this.name = name }
        override fun visitSource(source: String?, debug: String?) { this.source = source }

        override fun visitAnnotation(descriptor: String, visible: Boolean): AnnotationVisitor? =
            if (descriptor != FILE_INFO) null else object : AnnotationVisitor(Opcodes.ASM9) {
                override fun visit(n: String?, value: Any?) { if (n == "file") literalFile = value as? String }
            }

        override fun visitMethod(access: Int, name: String, descriptor: String, signature: String?, exceptions: Array<out String>?): MethodVisitor {
            methods += name to descriptor
            val self = this.name
            return object : MethodVisitor(Opcodes.ASM9) {
                // `<clinit>`은 상수를 밀고 바로 putstatic 한다 — 그 앞의 상수가 그 필드(= 키)의 기본값이다.
                var last: Any? = null
                override fun visitAnnotation(d: String, visible: Boolean): AnnotationVisitor? =
                    if (d != INFO) null else object : AnnotationVisitor(Opcodes.ASM9) {
                        var key: String? = null; var offset: Int? = null
                        override fun visit(n: String?, value: Any?) { if (n == "key") key = value as? String; if (n == "offset") offset = value as? Int }
                        override fun visitEnd() { val k = key; val o = offset; if (k != null && o != null) infos += k to o }
                    }
                override fun visitInsn(op: Int) {
                    last = when (op) {
                        in Opcodes.ICONST_M1..Opcodes.ICONST_5 -> op - Opcodes.ICONST_0
                        Opcodes.LCONST_0, Opcodes.LCONST_1 -> (op - Opcodes.LCONST_0).toLong()
                        in Opcodes.FCONST_0..Opcodes.FCONST_2 -> (op - Opcodes.FCONST_0).toFloat()
                        Opcodes.DCONST_0, Opcodes.DCONST_1 -> (op - Opcodes.DCONST_0).toDouble()
                        else -> null
                    }
                }
                override fun visitIntInsn(op: Int, operand: Int) { last = if (op == Opcodes.BIPUSH || op == Opcodes.SIPUSH) operand else null }
                override fun visitLdcInsn(value: Any?) { last = value }
                override fun visitFieldInsn(op: Int, owner: String, n: String, d: String) {
                    if (name == "<clinit>" && op == Opcodes.PUTSTATIC && owner == self && last != null) defaults[n] = last
                    last = null
                }
                override fun visitVarInsn(op: Int, v: Int) { last = null }
                override fun visitTypeInsn(op: Int, t: String) { last = null }
                override fun visitMethodInsn(op: Int, o: String, n: String, d: String, i: Boolean) { last = null }
            }
        }
    }
}
