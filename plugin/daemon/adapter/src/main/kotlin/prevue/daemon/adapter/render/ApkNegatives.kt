package prevue.daemon.adapter.render

import com.android.ide.common.rendering.api.ResourceNamespace
import com.android.ide.common.rendering.api.ResourceValueImpl
import com.android.ide.common.resources.ResourceItem
import com.android.ide.common.resources.configuration.FolderConfiguration
import com.android.resources.ResourceType
import com.android.tools.apk.analyzer.BinaryXmlParser
import com.android.tools.render.Renderer
import com.google.common.collect.ListMultimap
import com.google.devrel.gmscore.tools.apk.arsc.PackageChunk
import com.google.devrel.gmscore.tools.apk.arsc.ResourceFile
import com.google.devrel.gmscore.tools.apk.arsc.ResourceTableChunk
import com.google.devrel.gmscore.tools.apk.arsc.TypeChunk
import com.google.devrel.gmscore.tools.apk.arsc.TypeSpecChunk
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale
import java.util.zip.ZipFile
import com.google.devrel.gmscore.tools.apk.arsc.ResourceValue as BinaryValue

// 외부: 렌더러(alpha16)의 BinaryXmlParser.complexToString 은 복소수 값의 24비트 가수를 부호 없이 꺼낸다(-24dp → 16777192dp)
object ApkNegatives {
    class Fixed(val count: Int, val ms: Long)

    class Negative(
        val type: ResourceType,
        val namespace: ResourceNamespace,
        val name: String,
        val config: FolderConfiguration,
        val wrong: String,
        val right: String,
    )

    fun fix(renderer: Renderer, apkPath: String): Fixed? = runCatching {
        val t = System.nanoTime()
        val negatives = read(apkPath)
        val repo = renderer.module.resourceRepositoryManager.appResources
        val count = negatives.groupBy { it.namespace to it.type }.entries.sumOf { (k, list) ->
            val items = repo.getResources(k.first, k.second)
            list.count { apply(items, it) }
        }
        Fixed(count, (System.nanoTime() - t) / 1_000_000)
    }.onFailure { System.err.println("[prevue] APK의 음수 치수를 바로잡지 못했다 — 렌더러가 읽은 그대로 그린다: $it") }.getOrNull()

    private fun read(apkPath: String): List<Negative> {
        val table = table(apkPath) ?: return emptyList()
        return table.packages.flatMap { pkg -> pkg.typeSpecChunks.flatMap { spec -> negatives(pkg, spec) } }
    }

    private fun table(apkPath: String): ResourceTableChunk? {
        if (apkPath.isBlank()) return null
        return ZipFile(apkPath).use { z ->
            val arsc = z.getEntry("resources.arsc") ?: return null
            ResourceFile.fromInputStream(z.getInputStream(arsc)).chunks.firstOrNull() as? ResourceTableChunk
        }
    }

    private fun negatives(pkg: PackageChunk, spec: TypeSpecChunk): List<Negative> {
        val type = ResourceType.fromXmlTagName(spec.typeName)
        if (type != ResourceType.DIMEN && type != ResourceType.FRACTION) return emptyList()
        return pkg.getTypeChunks(spec.id).flatMap { chunk ->
            val config = configOf(chunk) ?: return@flatMap emptyList()
            chunk.entries.values.mapNotNull { negative(type, config, it) }
        }
    }

    private fun configOf(chunk: TypeChunk): FolderConfiguration? {
        val qualifiers = chunk.configuration.toString().let { if (it == "default") "" else it }
        return FolderConfiguration.getConfigForQualifierString(qualifiers)
    }

    private fun negative(type: ResourceType, config: FolderConfiguration, entry: TypeChunk.Entry): Negative? {
        val v = entry.value() ?: return null
        val fraction = when (v.type()) {
            BinaryValue.Type.DIMENSION -> false
            BinaryValue.Type.FRACTION -> true
            else -> return null
        }
        if (v.data() >= 0) return null
        val wrong = BinaryXmlParser.formatValue(v, null)
        val right = signed(v.data(), fraction)
        if (wrong == right) return null
        val (ns, name) = namespaced(entry.key())
        return Negative(type, ns, name, config, wrong, right)
    }

    private fun namespaced(key: String): Pair<ResourceNamespace, String> {
        val i = key.indexOf('$')
        if (i <= 0) return ResourceNamespace.RES_AUTO to key
        return ResourceNamespace.fromPackageName(key.substring(0, i)) to key.substring(i + 1)
    }

    internal fun apply(items: ListMultimap<String, ResourceItem>, n: Negative): Boolean {
        val item = items.get(n.name).firstOrNull { it.configuration == n.config && it.resourceValue?.value == n.wrong } ?: return false
        val v = item.resourceValue as? ResourceValueImpl ?: return false
        v.value = n.right
        return item.resourceValue?.value == n.right
    }

    internal fun signed(data: Int, fraction: Boolean): String {
        val mantissa = (data shr 8).toLong() shl RADIX_SHIFTS[(data shr 4) and 3]
        var value = mantissa.toFloat() * 1.1920929E-7f
        if (fraction) value *= 100f
        val units = if (fraction) FRACTION_UNITS else DIMENSION_UNITS
        val number = DecimalFormat("0.######", DecimalFormatSymbols(Locale.ROOT)).format(value.toDouble())
        return number + (units.getOrNull(data and 15) ?: "???")
    }

    private val RADIX_SHIFTS = intArrayOf(23, 16, 8, 0)
    private val DIMENSION_UNITS = listOf("px", "dp", "sp", "pt", "in", "mm")
    private val FRACTION_UNITS = listOf("%", "%p")
}
