package prevue.infrastructure.render

import com.android.tools.preview.ParametrizedComposePreviewElementTemplate
import com.android.tools.render.StandaloneRenderModelModule
import prevue.application.domain.rule.ParamLabels

internal object ProviderValues {
    fun labels(module: StandaloneRenderModelModule, provider: String?, n: Int): List<String?> =
        if (n == 1) listOf(null) else ParamLabels.of(read(module, provider, n), n)

    // 외부: 렌더러는 제공자를 모듈의 사설 로더(getPrivate)에서 읽는다 — 그 로더의 kotlin 표준 라이브러리는 우리 것과 다른 클래스라 JDK 타입으로만 받는다.
    private fun read(module: StandaloneRenderModelModule, provider: String?, n: Int): List<Any?> = runCatching {
        if (provider == null) return emptyList()
        val parent = ParametrizedComposePreviewElementTemplate::class.java.classLoader
        module.environment.moduleClassLoaderManager.getPrivate(parent).use { ref ->
            val loader = ref.classLoader
            val type = loader.loadClass(provider)
            val instance = type.getDeclaredConstructor().apply { isAccessible = true }.newInstance()
            val values = type.getMethod("getValues").invoke(instance)
            val iterator = loader.loadClass("kotlin.sequences.Sequence").getMethod("iterator").invoke(values) as Iterator<*>
            buildList { while (size < n && iterator.hasNext()) add(iterator.next()) }
        }
    }.getOrElse { emptyList() }
}
