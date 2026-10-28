package prevue.daemon.adapter.compile

import org.objectweb.asm.ClassReader
import org.objectweb.asm.ClassVisitor
import org.objectweb.asm.FieldVisitor
import org.objectweb.asm.MethodVisitor
import org.objectweb.asm.Opcodes

internal object LostMembers {
    fun of(built: ByteArray, compiled: ByteArray): Set<String> = members(built) - members(compiled)

    fun members(bytes: ByteArray): Set<String> {
        val seen = HashSet<String>()
        ClassReader(bytes).accept(object : ClassVisitor(Opcodes.ASM9) {
            override fun visitMethod(access: Int, name: String, descriptor: String, signature: String?, exceptions: Array<out String>?): MethodVisitor? {
                if (callable(access) && name != "<clinit>") seen += name + descriptor
                return null
            }

            override fun visitField(access: Int, name: String, descriptor: String, signature: String?, value: Any?): FieldVisitor? {
                if (callable(access)) seen += "$name:$descriptor"
                return null
            }
        }, ClassReader.SKIP_CODE or ClassReader.SKIP_DEBUG or ClassReader.SKIP_FRAMES)
        return seen
    }

    private fun callable(access: Int) = access and (Opcodes.ACC_PRIVATE or Opcodes.ACC_SYNTHETIC) == 0
}
