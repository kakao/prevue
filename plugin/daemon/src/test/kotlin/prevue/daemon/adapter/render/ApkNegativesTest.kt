package prevue.daemon.adapter.render

import com.android.ide.common.rendering.api.ResourceNamespace
import com.android.ide.common.rendering.api.ResourceReference
import com.android.ide.common.rendering.api.ResourceValueImpl
import com.android.ide.common.resources.ResourceItem
import com.android.ide.common.resources.configuration.FolderConfiguration
import com.android.resources.ResourceType
import com.android.tools.apk.analyzer.BinaryXmlParser
import com.google.common.collect.ArrayListMultimap
import java.lang.reflect.Proxy
import java.util.Locale
import java.util.concurrent.Executors
import com.google.devrel.gmscore.tools.apk.arsc.ResourceValue as BinaryValue
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/** 렌더러가 부호 없이 읽은 리소스 APK의 음수 치수 · 분수를 기기와 같은 값으로 — 양수는 렌더러와 글자까지 같다. */
class ApkNegativesTest {
    /** aapt2의 `floatToComplex`(ResourceUtils) — 크기에 따라 기수를 고르고 음수면 가수를 2의 보수로 넣는다. */
    private fun complex(value: Float, unit: Int): Int {
        val neg = value < 0
        val bits = ((if (neg) -value else value) * (1 shl 23) + .5f).toLong()
        val (radix, shift) = when {
            bits and 0x7fffffL == 0L -> 0 to 23
            bits and 0x7fffffL.inv() == 0L -> 3 to 0
            bits and 0x7fffffffL.inv() == 0L -> 2 to 8
            bits and 0x7fffffffffL.inv() == 0L -> 1 to 16
            else -> 0 to 23
        }
        var mantissa = ((bits shr shift) and 0xffffffL).toInt()
        if (neg) mantissa = -mantissa and 0xffffff
        return (mantissa shl 8) or (radix shl 4) or unit
    }

    /** 렌더러의 표기. 렌더러는 기본 로캘로 적어 소수점이 `,`인 로캘에서는 `1,5dp`다 — 고친 값은 layoutlib이 읽는 `.`로 적으니 소수점만 맞춰 견준다. */
    private fun renderer(data: Int, fraction: Boolean): String = BinaryXmlParser.formatValue(
        BinaryValue.builder().size(BinaryValue.SIZE).type(if (fraction) BinaryValue.Type.FRACTION else BinaryValue.Type.DIMENSION).data(data).build(), null)
        .replace(',', '.')

    @Test fun `렌더러는 가수의 부호를 버린다 — 고친 값은 소스 XML과 같다`() {
        assertEquals("16777192dp", renderer(complex(-24f, DP), false))
        assertEquals("-24dp", ApkNegatives.signed(complex(-24f, DP), false))
        assertEquals("1.5dp", renderer(complex(-0.5f, DP), false))
        assertEquals("-0.5dp", ApkNegatives.signed(complex(-0.5f, DP), false))
        assertEquals("150%p", renderer(complex(-0.5f, FRACTION_PARENT), true))
        assertEquals("-50%p", ApkNegatives.signed(complex(-0.5f, FRACTION_PARENT), true))
        assertEquals("-1px", ApkNegatives.signed(complex(-1f, PX), false))
    }

    @Test fun `양수는 렌더러와 같고 음수는 부호만 다르다 — 기수 넷 · 단위 전부`() {
        val values = listOf(0f, 0.25f, 0.5f, 0.999f, 1f, 1.5f, 2.5f, 9.33f, 46f, 255.75f, 256f, 300.5f, 1000f, 65535.5f, 70000f, 8388607f)
        for (v in values) for (unit in 0..5) {
            val pos = complex(v, unit)
            assertEquals(renderer(pos, false), ApkNegatives.signed(pos, false), "$v unit $unit")
            if (v > 0) assertEquals("-" + renderer(pos, false), ApkNegatives.signed(complex(-v, unit), false), "-$v unit $unit")
        }
        for (v in values.filter { it < 2f }) for (unit in 0..1) {
            assertEquals(renderer(complex(v, unit), true), ApkNegatives.signed(complex(v, unit), true))
            if (v > 0) assertEquals("-" + renderer(complex(v, unit), true), ApkNegatives.signed(complex(-v, unit), true))
        }
    }

    @Test fun `소수점은 기본 로캘과 상관없이 점이다 — layoutlib 이 Float parseFloat 로 다시 읽는다`() {
        val saved = Locale.getDefault()
        val format = Locale.getDefault(Locale.Category.FORMAT)
        val display = Locale.getDefault(Locale.Category.DISPLAY)
        Locale.setDefault(Locale.GERMANY)
        val pool = Executors.newSingleThreadExecutor()
        try {
            val got = pool.submit<List<String>> {
                listOf(ApkNegatives.signed(complex(-0.5f, DP), false), ApkNegatives.signed(complex(-0.5f, FRACTION_PARENT), true))
            }.get()
            assertEquals(listOf("-0.5dp", "-50%p"), got)
        } finally {
            pool.shutdown()
            Locale.setDefault(saved)
            Locale.setDefault(Locale.Category.FORMAT, format)
            Locale.setDefault(Locale.Category.DISPLAY, display)
        }
    }

    private val ref = ResourceReference(ResourceNamespace.RES_AUTO, ResourceType.DIMEN, "panel_height")
    private fun cfg(q: String) = FolderConfiguration.getConfigForQualifierString(q)!!
    /** 리소스 APK의 항목(렌더러의 `ApkResourceItem`은 internal이다) — 한정자와 값만 낸다. */
    private fun item(q: String, value: String, fresh: Boolean = false): ResourceItem {
        val c = cfg(q)
        val v = ResourceValueImpl(ref, value)
        return Proxy.newProxyInstance(javaClass.classLoader, arrayOf(ResourceItem::class.java)) { _, m, _ ->
            when (m.name) { "getConfiguration" -> c; "getResourceValue" -> if (fresh) ResourceValueImpl(ref, value) else v; else -> null }
        } as ResourceItem
    }
    private fun negative(q: String) = ApkNegatives.Negative(ResourceType.DIMEN, ResourceNamespace.RES_AUTO, "panel_height", cfg(q), "16777192dp", "-24dp")

    @Test fun `그 한정자의 항목만 고친다`() {
        val items = ArrayListMultimap.create<String, ResourceItem>().apply {
            put("panel_height", item("", "16777192dp"))
            put("panel_height", item("sw800dp", "16777192dp"))
        }
        assertTrue(ApkNegatives.apply(items, negative("sw800dp")))
        assertEquals(listOf("16777192dp", "-24dp"), items.get("panel_height").map { it.resourceValue!!.value })
    }

    @Test fun `값이 렌더러가 낸 것과 다르면 손대지 않는다 — 다른 정의가 이겼거나 렌더러가 고쳐졌다`() {
        val items = ArrayListMultimap.create<String, ResourceItem>().apply { put("panel_height", item("", "-24dp")) }
        assertFalse(ApkNegatives.apply(items, negative("")))
        assertFalse(ApkNegatives.apply(ArrayListMultimap.create(), negative("")))
        assertEquals("-24dp", items.get("panel_height").single().resourceValue!!.value)
    }

    @Test fun `값을 부를 때마다 새로 만드는 항목이면 고친 것으로 세지 않는다`() {
        val items = ArrayListMultimap.create<String, ResourceItem>().apply { put("panel_height", item("", "16777192dp", fresh = true)) }
        assertFalse(ApkNegatives.apply(items, negative("")))
    }

    private companion object {
        const val PX = 0
        const val DP = 1
        const val FRACTION_PARENT = 1
    }
}
