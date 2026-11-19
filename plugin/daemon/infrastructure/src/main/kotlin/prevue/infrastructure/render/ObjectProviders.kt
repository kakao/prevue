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
            if (provider !in known) known[provider] = standIn(provider, bytesOf)
            val standIn = known[provider] ?: return@map param
            param + ("provider" to standIn)
        }

    private fun standIn(provider: String, bytesOf: (String) -> ByteArray?): String? {
        val shape = bytesOf(provider)?.let(::singletonShape) ?: return null
        val name = provider + SUFFIX
        val file = File(overlay, name.replace('.', '/') + ".class")
        val bytes = standInBytes(internal(name), internal(provider), shape)
        if (!file.isFile || !file.readBytes().contentEquals(bytes)) {
            file.parentFile.mkdirs()
            file.writeBytes(bytes)
        }
        return name
    }

    companion object {
        const val SUFFIX = "\$PrevueParams"
        private const val CONTRACT = "androidx/compose/ui/tooling/preview/PreviewParameterProvider"
        private const val MARKER_CONSTRUCTOR = "(Lkotlin/jvm/internal/DefaultConstructorMarker;)V"

        private enum class Reach { INSTANCE_FIELD, MARKER_CONSTRUCTOR }

        private class Shape(val contract: String, val reach: Reach)

        private fun internal(binaryName: String) = binaryName.replace('.', '/')

        private fun singletonShape(bytes: ByteArray): Shape? {
            var self = ""
            var contract = CONTRACT
            var instance = false
            var openConstructor = false
            var markerConstructor = false
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
                    if (name == "<init>" && access and Opcodes.ACC_PUBLIC != 0) {
                        if (descriptor == "()V") openConstructor = true
                        if (descriptor == MARKER_CONSTRUCTOR) markerConstructor = true
                    }
                    return null
                }
            }, ClassReader.SKIP_CODE or ClassReader.SKIP_DEBUG or ClassReader.SKIP_FRAMES)
            return when {
                openConstructor -> null
                instance -> Shape(contract, Reach.INSTANCE_FIELD)
                markerConstructor -> Shape(contract, Reach.MARKER_CONSTRUCTOR)
                else -> null
            }
        }

        private fun standInBytes(name: String, target: String, shape: Shape): ByteArray {
            val w = ClassWriter(ClassWriter.COMPUTE_MAXS)
            w.visit(Opcodes.V1_8, Opcodes.ACC_PUBLIC or Opcodes.ACC_FINAL or Opcodes.ACC_SUPER, name, null, "java/lang/Object", arrayOf(shape.contract))
            w.visitMethod(Opcodes.ACC_PUBLIC, "<init>", "()V", null, null).apply {
                visitCode()
                visitVarInsn(Opcodes.ALOAD, 0)
                visitMethodInsn(Opcodes.INVOKESPECIAL, "java/lang/Object", "<init>", "()V", false)
                visitInsn(Opcodes.RETURN)
                visitMaxs(0, 0)
                visitEnd()
            }
            delegate(w, target, shape, "getValues", "()Lkotlin/sequences/Sequence;", Opcodes.ARETURN)
            delegate(w, target, shape, "getCount", "()I", Opcodes.IRETURN)
            w.visitEnd()
            return w.toByteArray()
        }

        private fun delegate(w: ClassWriter, target: String, shape: Shape, method: String, descriptor: String, ret: Int) {
            w.visitMethod(Opcodes.ACC_PUBLIC, method, descriptor, null, null).apply {
                visitCode()
                when (shape.reach) {
                    Reach.INSTANCE_FIELD -> visitFieldInsn(Opcodes.GETSTATIC, target, "INSTANCE", "L$target;")
                    Reach.MARKER_CONSTRUCTOR -> {
                        visitTypeInsn(Opcodes.NEW, target)
                        visitInsn(Opcodes.DUP)
                        visitInsn(Opcodes.ACONST_NULL)
                        visitMethodInsn(Opcodes.INVOKESPECIAL, target, "<init>", MARKER_CONSTRUCTOR, false)
                    }
                }
                visitMethodInsn(Opcodes.INVOKEINTERFACE, shape.contract, method, descriptor, true)
                visitInsn(ret)
                visitMaxs(0, 0)
                visitEnd()
            }
        }
    }
}
