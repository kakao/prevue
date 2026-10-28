package prevue.daemon.adapter.compile

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.objectweb.asm.ClassWriter
import org.objectweb.asm.Opcodes
import prevue.daemon.domain.port.LiteralSite

/**
 * D-67. 컴파일 산출물에서 표를 읽는다 — 키 · 오프셋 · 기본값 · 컴포저블. 클래스는 Compose 컴파일러(2.4.10, `liveLiteralsEnabled`)가 내는 모양을
 * ASM으로 흉내 낸다(스파이크에서 `javap`로 본 모양).
 */
class LiveLiteralTablesTest {
    private val dir: File = Files.createTempDirectory("prevue-ll").toFile()
    private val source = File(dir, "src/demo/Cards.kt").apply { parentFile.mkdirs(); writeText("") }

    @AfterEach fun tearDown() { dir.deleteRecursively() }

    @Test fun `가장 바깥 함수 — 오버로드 순번은 떼고 프로퍼티 · init 속이면 없다`() {
        assertEquals("Card", LiveLiteralTables.outermost("Int\$arg-0\$call-Inner\$fun-Card"))
        assertEquals("Card", LiveLiteralTables.outermost("Boolean\$arg-0\$call-mutableStateOf\$fun-\$anonymous\$\$arg-0\$call-remember\$val-s\$fun-Card"))
        assertEquals("ForYouScreen", LiveLiteralTables.outermost("Int\$\$\$this\$call-\$get-dp\$\$arg-0\$call-PaddingValues\$val-tmp1_contentPadding\$fun-\$anonymous\$\$arg-3\$call-Box\$fun-ForYouScreen-1"))
        assertEquals("Member", LiveLiteralTables.outermost("Int\$arg-0\$call-Inner\$fun-Member\$class-Obj"))
        assertNull(LiveLiteralTables.outermost("Int\$arg-0\$call-println\$init\$class-Obj"))
        assertNull(LiveLiteralTables.outermost("Int\$fun-\$get-getterTop\$\$get\$val-getterTop"))
    }

    @Test fun `키 · 오프셋 · 기본값 · 컴포저블을 읽는다`() {
        val out = File(dir, "out")
        write(out, "demo/CardsKt") { cw ->
            cw.visitMethod(Opcodes.ACC_PUBLIC or Opcodes.ACC_STATIC, "Card", "(Landroidx/compose/runtime/Composer;I)V", null, null).visitEnd()
            cw.visitMethod(Opcodes.ACC_PUBLIC or Opcodes.ACC_STATIC, "helper", "()I", null, null).visitEnd()
        }
        write(out, "demo/LiveLiterals\$CardsKt") { cw ->
            cw.visitAnnotation("Landroidx/compose/runtime/internal/LiveLiteralFileInfo;", false).apply { visit("file", source.absolutePath); visitEnd() }
            val keys = listOf("Int\$arg-0\$call-padding\$fun-Card" to 40, "String\$arg-0\$call-Text\$fun-Card" to 60, "Int\$fun-helper" to 90)
            for ((k, offset) in keys) {
                cw.visitMethod(Opcodes.ACC_PUBLIC, k, "()V", null, null).apply {
                    visitAnnotation("Landroidx/compose/runtime/internal/LiveLiteralInfo;", false).apply { visit("key", k); visit("offset", offset); visitEnd() }
                    visitEnd()
                }
            }
            cw.visitMethod(Opcodes.ACC_STATIC, "<clinit>", "()V", null, null).apply {
                visitCode()
                visitIntInsn(Opcodes.BIPUSH, 16); visitFieldInsn(Opcodes.PUTSTATIC, "demo/LiveLiterals\$CardsKt", keys[0].first, "I")
                visitLdcInsn("길찾기"); visitFieldInsn(Opcodes.PUTSTATIC, "demo/LiveLiterals\$CardsKt", keys[1].first, "Ljava/lang/String;")
                visitIntInsn(Opcodes.BIPUSH, 77); visitFieldInsn(Opcodes.PUTSTATIC, "demo/LiveLiterals\$CardsKt", keys[2].first, "I")
                visitInsn(Opcodes.RETURN); visitMaxs(0, 0); visitEnd()
            }
        }
        val t = LiveLiteralTables.read(out, listOf(source), since = 0).single()
        assertEquals(source.absolutePath, t.file)
        assertEquals("demo.LiveLiterals\$CardsKt", t.owner)
        assertEquals(listOf(
            LiteralSite("Int\$arg-0\$call-padding\$fun-Card", 40, "Int", true, 16),
            LiteralSite("String\$arg-0\$call-Text\$fun-Card", 60, "String", true, "길찾기"),
            LiteralSite("Int\$fun-helper", 90, "Int", false, 77),                     // 일반 함수 — 프로퍼티 초기화에서 한 번만 불렸을 수 있다
        ), t.sites)
        assertEquals(emptyList<Any>(), LiveLiteralTables.read(out, listOf(File(dir, "Other.kt")), since = 0))
    }

    private fun write(out: File, name: String, body: (ClassWriter) -> Unit) {
        val cw = ClassWriter(ClassWriter.COMPUTE_MAXS)
        cw.visit(Opcodes.V17, Opcodes.ACC_PUBLIC, name, null, "java/lang/Object", null)
        cw.visitSource("Cards.kt", null)
        body(cw)
        cw.visitEnd()
        File(out, "$name.class").apply { parentFile.mkdirs(); writeBytes(cw.toByteArray()) }
    }
}
