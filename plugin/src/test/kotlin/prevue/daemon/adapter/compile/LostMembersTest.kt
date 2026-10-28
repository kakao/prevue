package prevue.daemon.adapter.compile

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.objectweb.asm.ClassWriter
import org.objectweb.asm.Opcodes

class LostMembersTest {
    private fun facade(vararg methods: String, fields: List<String> = emptyList(), access: Int = Opcodes.ACC_PUBLIC): ByteArray {
        val w = ClassWriter(0)
        w.visit(Opcodes.V17, Opcodes.ACC_PUBLIC or Opcodes.ACC_FINAL, "a/HomeScreenKt", null, "java/lang/Object", null)
        for (m in methods) w.visitMethod(access or Opcodes.ACC_STATIC, m.substringBefore('('), "(" + m.substringAfter('('), null, null).visitEnd()
        for (f in fields) w.visitField(access or Opcodes.ACC_STATIC, f.substringBefore(':'), f.substringAfter(':'), null, null).visitEnd()
        w.visitEnd()
        return w.toByteArray()
    }

    // take 7 — 빌드의 스텁 `HomeScreen()`에 기본값 인자가 붙었다. 첫 컴파일이 옛 `HomeScreen(Composer,int)`로 호출을 풀었다
    @Test fun `빌드의 클래스에만 있는 메서드가 있으면 잃었다`() {
        val built = facade("HomeScreen(Landroidx/compose/runtime/Composer;I)V")
        val compiled = facade("HomeScreen(Landroidx/compose/ui/Modifier;Landroidx/compose/runtime/Composer;II)V", "HomeScreenPreview(Landroidx/compose/runtime/Composer;I)V")
        assertEquals(setOf("HomeScreen(Landroidx/compose/runtime/Composer;I)V"), LostMembers.of(built, compiled))
    }

    // 사람이 고치는 대부분 — 본문만 바뀌거나 함수가 늘었다. 옛 것으로 풀린 호출도 새 클래스에 그대로 있어 다시 컴파일할 까닭이 없다
    @Test fun `빌드의 멤버가 새 클래스에 다 있으면 잃지 않았다`() {
        val built = facade("HomeScreen(Landroidx/compose/runtime/Composer;I)V")
        val compiled = facade("HomeScreen(Landroidx/compose/runtime/Composer;I)V", "HomeScreenPreview(Landroidx/compose/runtime/Composer;I)V")
        assertTrue(LostMembers.of(built, compiled).isEmpty())
    }

    // 람다 · 기본값 접근자는 private · synthetic이고 번호가 컴파일마다 달라진다 — 다른 파일이 부를 수 없어 옛 것으로 풀릴 일이 없다
    @Test fun `private · synthetic 멤버는 달라도 잃지 않았다`() {
        assertTrue(LostMembers.of(facade("Preview\$lambda\$4(ILandroidx/compose/runtime/Composer;I)Lkotlin/Unit;", access = Opcodes.ACC_PRIVATE), facade()).isEmpty())
        assertTrue(LostMembers.of(facade("access\$x()V", access = Opcodes.ACC_SYNTHETIC), facade()).isEmpty())
    }

    @Test fun `빌드의 클래스에만 있는 필드도 잃은 것이다`() {
        assertEquals(setOf("cache:I"), LostMembers.of(facade(fields = listOf("cache:I")), facade()))
    }
}
