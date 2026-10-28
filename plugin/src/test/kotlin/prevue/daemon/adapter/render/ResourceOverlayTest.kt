package prevue.daemon.adapter.render

import com.android.ide.common.resources.ResourceItem
import com.android.ide.common.resources.configuration.FolderConfiguration
import java.lang.reflect.Proxy
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/** D-68. 얹을 자리 — XML의 한정자와 리소스 APK의 한정자가 aapt2의 판 덧붙이기(`night` → `night-v8`)로 갈려도 같은 자리다. */
class ResourceOverlayTest {
    private fun cfg(q: String) = FolderConfiguration.getConfigForQualifierString(q)!!
    private fun item(q: String): ResourceItem {
        val c = cfg(q)
        return Proxy.newProxyInstance(javaClass.classLoader, arrayOf(ResourceItem::class.java)) { _, m, _ ->
            if (m.name == "getConfiguration") c else null
        } as ResourceItem
    }

    @Test fun `같은 한정자가 먼저다`() {
        assertEquals(1, ResourceOverlay.slotOf(listOf(item(""), item("night"), item("night-v8")), cfg("night")))
        assertEquals(0, ResourceOverlay.slotOf(listOf(item(""), item("v21")), cfg("")))
    }

    @Test fun `판 한정자만 다르면 같은 자리다`() {
        assertEquals(1, ResourceOverlay.slotOf(listOf(item(""), item("night-v8")), cfg("night")))
        assertEquals(1, ResourceOverlay.slotOf(listOf(item(""), item("ldrtl-v17")), cfg("ldrtl")))
    }

    @Test fun `판만 다른 것이 여럿이거나 다른 한정자면 가르지 않는다`() {
        assertEquals(-1, ResourceOverlay.slotOf(listOf(item("v21"), item("v23")), cfg("")))
        assertEquals(-1, ResourceOverlay.slotOf(listOf(item("land")), cfg("night")))
    }
}
