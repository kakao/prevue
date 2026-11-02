package prevue.daemon.adapter.render

import com.android.ide.common.rendering.api.ArrayResourceValue
import com.android.ide.common.rendering.api.AttrResourceValue
import com.android.ide.common.rendering.api.PluralsResourceValue
import com.android.ide.common.rendering.api.ResourceNamespace
import com.android.ide.common.rendering.api.StyleResourceValue
import com.android.ide.common.rendering.api.StyleableResourceValue
import com.android.ide.common.resources.AbstractResourceRepository
import com.android.ide.common.resources.ResourceItem
import com.android.ide.common.resources.ResourceVisitor
import com.android.ide.common.resources.SingleNamespaceResourceRepository
import com.android.ide.common.resources.configuration.FolderConfiguration
import com.android.ide.common.util.PathString
import com.android.resources.ResourceType
import com.android.resources.base.BasicResourceItem
import com.android.resources.base.LoadableResourceRepository
import com.android.resources.base.RepositoryLoader
import com.android.tools.render.Renderer
import com.android.tools.res.CacheableResourceRepository
import com.android.tools.res.LocalResourceRepository
import com.android.tools.res.SingleRepoResourceRepositoryManager
import com.google.common.collect.ArrayListMultimap
import com.google.common.collect.ImmutableListMultimap
import com.google.common.collect.ListMultimap
import java.io.ByteArrayInputStream
import java.io.File
import java.io.InputStream
import java.nio.file.Path
import java.util.EnumMap
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow
import prevue.daemon.domain.port.ResourceEntry
import prevue.daemon.domain.port.ResourceKey
import prevue.daemon.domain.port.ResourceLookup
import prevue.daemon.domain.port.ResourceValues

/**
 * D-68. 렌더러의 앱 리소스 위에 values XML의 값을 얹는다. 렌더러는 부트스트랩 때의 리소스 APK(+ 덤프의 `res` 폴더들)를 저장소 하나로 쥐고,
 * 리졸버 캐시(`ResourceResolverCache`)는 그 저장소의 `modificationCount`가 바뀔 때만 비운다 — 저장소를 [Layered]로 바꿔 끼우고
 * 값을 얹을 때마다 수를 올리면 다음 태스크가 새 값으로 그린다. 리소스 id는 (타입, 이름)에 매여 그대로라 로더도 R 클래스도 그대로다.
 *
 * values XML은 렌더러가 쓰는 sdk-common 파서(`RepositoryLoader`, AS 프리뷰가 res 폴더를 읽는 그것)로 읽는다. 렌더러 판올림으로 저장소 관리자의
 * 모양이 바뀌면 [install]이 null이고, 저장은 지금처럼 낡음으로 간다 — 조용히 옛 값을 그리지 않는다.
 */
class ResourceOverlay private constructor(private val base: CacheableResourceRepository, private val layered: Layered) : ResourceValues {
    /** 얹은 값. 다음에 같은 자리를 얹으면 덮는다. 빼는 일은 없다 — 데몬이 뜬 동안 리소스 APK는 그대로다. */
    private val items = MutableStateFlow<Map<ResourceKey, ResourceItem>>(emptyMap())
    /** 판정과 넣기가 같은 내용을 두 번 읽지 않게 마지막 것을 쥔다. */
    private var last: Triple<String, String, List<Parsed>>? = null

    private class Parsed(val entry: ResourceEntry, val item: ResourceItem)

    override fun parse(file: File, text: String): List<ResourceEntry>? = read(file, text)?.map { it.entry }

    override fun lookup(key: ResourceKey): ResourceLookup {
        items.value[key]?.let { return ResourceLookup.Value(canonical(it)) }
        val type = ResourceType.fromClassName(key.type) ?: return ResourceLookup.NoName
        val all = base.getResources(ResourceNamespace.RES_AUTO, type, key.name)
        if (all.isEmpty()) return ResourceLookup.NoName
        val config = FolderConfiguration.getConfigForQualifierString(key.qualifiers) ?: return ResourceLookup.NoConfig
        val i = slotOf(all, config)
        return if (i < 0) ResourceLookup.NoConfig else ResourceLookup.Value(canonical(all[i]))
    }

    override fun put(file: File, text: String, keys: Collection<ResourceKey>): Boolean {
        val parsed = read(file, text)?.associateBy { it.entry.key } ?: return false
        val add = keys.map { k -> k to (parsed[k]?.item ?: return false) }
        items.value = items.value + add
        layered.publish(items.value.values)
        return true
    }

    private fun read(file: File, text: String): List<Parsed>? {
        last?.let { (p, t, r) -> if (p == file.path && t == text) return r }
        val f = ValuesFile(file, text)
        if (f.failed) return null
        val r = f.items.map { Parsed(ResourceEntry(ResourceKey(it.type.getName(), it.name, it.configuration.qualifierString), canonical(it)), it) }
        last = Triple(file.path, text, r)
        return r
    }

    private fun canonical(item: ResourceItem): String {
        val v = item.resourceValue ?: return ""
        return when (v) {
            is PluralsResourceValue -> (0 until v.pluralsCount).joinToString(SEP) { "${v.getQuantity(it)}=${v.getValue(it)}" }
            is ArrayResourceValue -> (0 until v.elementCount).joinToString(SEP) { v.getElement(it) }
            is StyleResourceValue -> "${v.parentStyleName}{" + v.definedItems.joinToString(SEP) { "${it.attrName}=${it.value}" } + "}"
            is StyleableResourceValue -> v.allAttributes.joinToString(SEP) { attr(it) }
            is AttrResourceValue -> attr(v)
            else -> when (item.type) {
                ResourceType.COLOR -> color(v.value.orEmpty())
                ResourceType.DIMEN -> dimen(v.value.orEmpty())
                else -> v.value.orEmpty()
            }
        }
    }

    private fun attr(a: AttrResourceValue) = "${a.name}:${a.formats.sorted()}:${a.attributeValues.toSortedMap()}"

    private fun color(s: String): String {
        val t = s.trim()
        if (!t.startsWith("#")) return t
        val h = t.substring(1).lowercase()
        return "#" + when (h.length) {
            3 -> "ff" + h.map { "$it$it" }.joinToString("")
            4 -> h.map { "$it$it" }.joinToString("")
            6 -> "ff$h"
            else -> h
        }
    }

    private fun dimen(s: String): String {
        val m = DIMEN.matchEntire(s.trim()) ?: return s.trim()
        val unit = m.groupValues[2].let { if (it == "dip") "dp" else it }
        return String.format(Locale.ROOT, "%.2f", m.groupValues[1].toDouble()).trimEnd('0').trimEnd('.') + unit
    }

    /**
     * values XML 한 파일을 [text]로 읽는다 — 저장 전 내용은 디스크에 없어 파서가 읽을 스트림을 바꿔 준다. 한정자는 디렉터리 이름(`values-night`)에서 온다.
     * 파서는 깨진 XML을 로그만 남기고 읽은 데까지 내므로 [failed]로 가른다.
     */
    private class ValuesFile(file: File, text: String) : LocalResourceRepository<File>(""), LoadableResourceRepository {
        private val resDir = file.parentFile.parentFile
        private val table = EnumMap<ResourceType, ListMultimap<String, ResourceItem>>(ResourceType::class.java)
        val items: List<ResourceItem> get() = table.values.flatMap { it.values() }
        var failed = false
            private set

        init {
            val bytes = text.toByteArray()
            object : RepositoryLoader<ValuesFile>(resDir.toPath(), listOf(PathString(file)), ResourceNamespace.RES_AUTO) {
                override fun addResourceItem(item: BasicResourceItem, repository: ValuesFile) {
                    table.getOrPut(item.type) { ArrayListMultimap.create() }.put(item.name, item)
                }
                override fun getInputStream(file: PathString): InputStream = ByteArrayInputStream(bytes)
                override fun handleParsingError(file: PathString, e: Exception) { failed = true }
            }.loadRepositoryContents(this)
        }

        override fun accept(visitor: ResourceVisitor): ResourceVisitor.VisitResult = acceptByResources(table, visitor)
        override fun getNamespace(): ResourceNamespace = ResourceNamespace.RES_AUTO
        override fun getPackageName(): String? = null
        override fun getLibraryName(): String? = null
        override fun getOrigin(): Path = resDir.toPath()
        override fun getResourceUrl(relativeResourcePath: String) = RepositoryLoader.portableFileName(resDir.path) + "/" + relativeResourcePath
        override fun getSourceFile(relativeResourcePath: String, forFileResource: Boolean): PathString = PathString(resDir).resolve(relativeResourcePath)
        override fun containsUserDefinedResources() = true
        override fun getMap(namespace: ResourceNamespace, resourceType: ResourceType): ListMultimap<String, ResourceItem>? =
            if (namespace == ResourceNamespace.RES_AUTO) table[resourceType] else null
        override fun computeResourceDirs(): MutableSet<File> = mutableSetOf(resDir)
    }

    /**
     * 렌더러의 앱 리소스 저장소를 감싼다. 얹은 항목은 이름과 한정자(`FolderConfiguration`)가 같은 항목을 바꾸고, 그 한정자가 없으면 더한다.
     * 리졸버는 타입마다 [getResourcesInternal]로 읽어 설정에 맞는 것을 고른다(`ResourceRepositoryUtil.getConfiguredResources`).
     */
    private class Layered(private val base: CacheableResourceRepository) : AbstractResourceRepository(), CacheableResourceRepository {
        private class Layer(val merged: Map<ResourceType, ListMultimap<String, ResourceItem>>, val gen: Long)

        private val layer = MutableStateFlow(Layer(emptyMap(), 0))

        fun publish(items: Collection<ResourceItem>) {
            val merged = items.groupBy { it.type }.mapValues { (type, l) -> merge(type, l.groupBy { it.name }) }
            layer.value = Layer(merged, layer.value.gen + 1)
        }

        private fun merge(type: ResourceType, over: Map<String, List<ResourceItem>>): ListMultimap<String, ResourceItem> {
            val r = ArrayListMultimap.create(base.getResources(ResourceNamespace.RES_AUTO, type))
            for ((name, list) in over) {
                val have = r.get(name)
                for (item in list) {
                    val i = slotOf(have, item.configuration)
                    if (i >= 0) have[i] = item else have.add(item)
                }
            }
            return ImmutableListMultimap.copyOf(r)
        }

        override val modificationCount: Long get() = base.modificationCount + layer.value.gen
        override fun getNamespaces(): Set<ResourceNamespace> = base.namespaces

        override fun getResourcesInternal(namespace: ResourceNamespace, resourceType: ResourceType): ListMultimap<String, ResourceItem> =
            layer.value.merged[resourceType]?.takeIf { namespace == ResourceNamespace.RES_AUTO } ?: base.getResources(namespace, resourceType)

        override fun accept(visitor: ResourceVisitor): ResourceVisitor.VisitResult = base.accept(visitor)
        override fun getPublicResources(namespace: ResourceNamespace, type: ResourceType): Collection<ResourceItem> = base.getPublicResources(namespace, type)
        override fun getLeafResourceRepositories(): Collection<SingleNamespaceResourceRepository> = base.leafResourceRepositories
    }

    companion object {
        /**
         * [config] 자리의 항목. 같은 설정이 없으면 판 한정자만 다른 것 하나 — aapt2는 minSdk보다 높은 판이 필요한 한정자에 판을 덧붙여
         * (`night` → `night-v8`, `ldrtl` → `ldrtl-v17`) XML의 `values-night`가 APK에서는 `night-v8`이다. 판이 다른 것이 여럿이면 가르지 않는다.
         */
        internal fun slotOf(items: List<ResourceItem>, config: FolderConfiguration): Int {
            val exact = items.indexOfFirst { it.configuration == config }
            if (exact >= 0) return exact
            val bare = unversioned(config)
            val near = items.indices.filter { unversioned(items[it].configuration) == bare }
            return near.singleOrNull() ?: -1
        }

        private fun unversioned(c: FolderConfiguration): FolderConfiguration = FolderConfiguration.copyOf(c).apply { versionQualifier = null }

        /** 복수형 · 배열의 값을 잇는 글자. 공백이 아니어야 한다 — 판정이 값의 공백 문자를 본다. */
        private const val SEP = "\u0000"
        private val DIMEN = Regex("""(-?[0-9]*\.?[0-9]+)\s*([a-z]+)""")
        private val MANAGER_FIELDS = listOf("appResources", "projectResources", "moduleResources")

        /**
         * 렌더러의 저장소 관리자에 [Layered]를 끼운다. 렌더 모듈과 설정이 같은 관리자를 쥐어(`RenderEnvironmentBootstrapper`) 한 번 바꾸면 둘 다 본다.
         * 모양이 다르면(렌더러 판올림) null — 값 핫리로드 없이 지금처럼 낡음으로 간다.
         */
        fun install(renderer: Renderer): ResourceOverlay? = runCatching {
            val manager = renderer.module.resourceRepositoryManager as SingleRepoResourceRepositoryManager
            val base = manager.appResources
            val layered = Layered(base)
            val fields = MANAGER_FIELDS.map { SingleRepoResourceRepositoryManager::class.java.getDeclaredField(it).apply { isAccessible = true } }
            fields.forEach { it.set(manager, layered) }
            ResourceOverlay(base, layered)
        }.onFailure { System.err.println("[prevue] 리소스 값 핫리로드를 끄고 낡음으로 간다 — 렌더러의 리소스 저장소를 감싸지 못했다: $it") }.getOrNull()
    }
}
