package prevue.infrastructure.render

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

interface PreviewParameterProvider<T> {
    val values: Sequence<T>
    val count: Int get() = values.count()
}

object SeasonsObject : PreviewParameterProvider<String> {
    override val values = sequenceOf("봄", "여름", "가을")
}

class SeasonsClass : PreviewParameterProvider<String> {
    override val values = sequenceOf("봄")
}

class SeasonsHolder {
    private companion object : PreviewParameterProvider<String> {
        override val values = sequenceOf("겨울", "봄")
    }
}

/** object 제공자는 생성자가 private 이라 렌더러 · ui-tooling 이 public 생성자로 못 만든다 — 오버레이에 위임하는 대리 클래스를 두고 이름만 바꿔 넘긴다. */
class ObjectProvidersTest {
    private val overlay: File = Files.createTempDirectory("overlay").toFile()
    private val providers = ObjectProviders(overlay)

    private fun bytesOf(name: String): ByteArray? =
        javaClass.classLoader.getResourceAsStream(name.replace('.', '/') + ".class")?.use { it.readBytes() }

    private fun param(provider: Class<*>) = listOf(mapOf("name" to "season", "provider" to provider.name))

    @Test fun `object 제공자는 대리 클래스 이름으로 바뀌고 그 클래스가 오버레이에 놓인다`() {
        val swapped = providers.swapped(param(SeasonsObject::class.java), ::bytesOf)
        val standIn = SeasonsObject::class.java.name + ObjectProviders.SUFFIX
        assertEquals(listOf(mapOf("name" to "season", "provider" to standIn)), swapped)
        assertTrue(File(overlay, standIn.replace('.', '/') + ".class").isFile)
    }

    private fun standInOf(provider: Class<*>): PreviewParameterProvider<*> {
        val standIn = providers.swapped(param(provider), ::bytesOf).single().getValue("provider")
        val loader = object : ClassLoader(javaClass.classLoader) {
            override fun loadClass(name: String, resolve: Boolean): Class<*> {
                if (!name.startsWith(provider.name)) return super.loadClass(name, resolve)
                findLoadedClass(name)?.let { return it }
                val overlaid = File(overlay, name.replace('.', '/') + ".class")
                val bytes = if (overlaid.isFile) overlaid.readBytes() else bytesOf(name)!!
                return defineClass(name, bytes, 0, bytes.size)
            }
        }
        val type = loader.loadClass(standIn)
        return type.constructors.single { it.parameterCount == 0 }.newInstance() as PreviewParameterProvider<*>
    }

    @Test fun `대리 클래스는 public 무인자 생성자로 만들어 object 의 값과 개수를 낸다`() {
        val instance = standInOf(SeasonsObject::class.java)
        assertEquals(listOf("봄", "여름", "가을"), instance.values.toList())
        assertEquals(3, instance.count)
    }

    @Test fun `private companion object 제공자도 대리 클래스가 값과 개수를 낸다`() {
        val companion = Class.forName(SeasonsHolder::class.java.name + "\$Companion")
        val instance = standInOf(companion)
        assertEquals(listOf("겨울", "봄"), instance.values.toList())
        assertEquals(2, instance.count)
    }

    @Test fun `public 생성자가 있는 class 제공자와 읽지 못한 제공자는 그대로 둔다`() {
        assertEquals(param(SeasonsClass::class.java), providers.swapped(param(SeasonsClass::class.java), ::bytesOf))
        assertEquals(param(SeasonsObject::class.java), providers.swapped(param(SeasonsObject::class.java)) { null })
        assertEquals(0, overlay.walkTopDown().count { it.isFile })
    }

    @Test fun `판정은 class 제공자도 한 번만 읽고 forget 뒤에 다시 읽는다`() {
        var reads = 0
        val counting = { name: String -> reads++; bytesOf(name) }
        repeat(2) { providers.swapped(param(SeasonsClass::class.java), counting) }
        assertEquals(1, reads)
        providers.forget()
        providers.swapped(param(SeasonsClass::class.java), counting)
        assertEquals(2, reads)
    }
}
