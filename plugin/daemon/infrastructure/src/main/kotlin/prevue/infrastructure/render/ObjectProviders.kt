package prevue.infrastructure.render

import java.io.File
import org.objectweb.asm.ClassReader
import org.objectweb.asm.ClassVisitor
import org.objectweb.asm.ClassWriter
import org.objectweb.asm.FieldVisitor
import org.objectweb.asm.MethodVisitor
import org.objectweb.asm.Opcodes

internal class ObjectProviders(private val overlay: File) {
    private val known = HashMap<String, String?>()

    fun forget() = known.clear()

    fun swapped(methodParams: List<Map<String, String>>, bytesOf: (String) -> ByteArray?): List<Map<String, String>> =
        methodParams.map { param ->
            val provider = param["provider"] ?: return@map param
            val standIn = known.getOrPut(provider) { standIn(provider, bytesOf) } ?: return@map param
            param + ("provider" to standIn)
        }

    private fun standIn(provider: String, bytesOf: (String) -> ByteArray?): String? {
        val shape = bytesOf(provider)?.let(::shapeOf)?.takeIf { it.isObject } ?: return null
        val name = standInName(provider)
        val file = File(overlay, name.replace('.', '/') + ".class")
        val bytes = standInBytes(internal(name), internal(provider), shape.contract)
        if (!file.isFile || !file.readBytes().contentEquals(bytes)) {
            file.parentFile.mkdirs()
            file.writeBytes(bytes)
        }
        return name
    }

    class Shape(val isObject: Boolean, val contract: String)

    companion object {
        const val SUFFIX = "\$PrevueParams"
        private const val CONTRACT = "androidx/compose/ui/tooling/preview/PreviewParameterProvider"

        fun standInName(provider: String) = provider + SUFFIX

        private fun internal(binaryName: String) = binaryName.replace('.', '/')

        fun shapeOf(bytes: ByteArray): Shape {
            var self = ""
            var contract = CONTRACT
            var instance = false
            var openConstructor = false
            ClassReader(bytes).accept(object : ClassVisitor(Opcodes.ASM9) {
                override fun visit(version: Int, access: Int, name: String, signature: String?, superName: String?, interfaces: Array<out String>?) {
                    self = name
                    interfaces?.firstOrNull { it.substringAfterLast('/') == "PreviewParameterProvider" }?.let { contract = it }
                }

                override fun visitField(access: Int, name: String, descriptor: String, signature: String?, value: Any?): FieldVisitor? {
                    if (name == "INSTANCE" && descriptor == "L$self;" && access and Opcodes.ACC_STATIC != 0) instance = true
                    return null
                }

                override fun visitMethod(access: Int, name: String, descriptor: String, signature: String?, exceptions: Array<out String>?): MethodVisitor? {
                    if (name == "<init>" && descriptor == "()V" && access and Opcodes.ACC_PUBLIC != 0) openConstructor = true
                    return null
                }
            }, ClassReader.SKIP_CODE or ClassReader.SKIP_DEBUG or ClassReader.SKIP_FRAMES)
            return Shape(instance && !openConstructor, contract)
        }

        fun standInBytes(name: String, target: String, contract: String): ByteArray {
            val w = ClassWriter(ClassWriter.COMPUTE_MAXS)
            w.visit(Opcodes.V1_8, Opcodes.ACC_PUBLIC or Opcodes.ACC_FINAL or Opcodes.ACC_SUPER, name, null, "java/lang/Object", arrayOf(contract))
            w.visitMethod(Opcodes.ACC_PUBLIC, "<init>", "()V", null, null).apply {
                visitCode()
                visitVarInsn(Opcodes.ALOAD, 0)
                visitMethodInsn(Opcodes.INVOKESPECIAL, "java/lang/Object", "<init>", "()V", false)
                visitInsn(Opcodes.RETURN)
                visitMaxs(0, 0)
                visitEnd()
            }
            delegate(w, target, contract, "getValues", "()Lkotlin/sequences/Sequence;", Opcodes.ARETURN)
            delegate(w, target, contract, "getCount", "()I", Opcodes.IRETURN)
            w.visitEnd()
            return w.toByteArray()
        }

        private fun delegate(w: ClassWriter, target: String, contract: String, method: String, descriptor: String, ret: Int) {
            w.visitMethod(Opcodes.ACC_PUBLIC, method, descriptor, null, null).apply {
                visitCode()
                visitFieldInsn(Opcodes.GETSTATIC, target, "INSTANCE", "L$target;")
                visitMethodInsn(Opcodes.INVOKEINTERFACE, contract, method, descriptor, true)
                visitInsn(ret)
                visitMaxs(0, 0)
                visitEnd()
            }
        }
    }
}
