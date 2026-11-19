package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class TreeRefreshPolicyTest {
    @Test fun `refreshes the Compose tree for the first adapter`() {
        assertTrue(TreeRefreshPolicy.shouldRefresh(relayout = false, fitsContent = false, hasCurrentAdapter = false))
    }

    @Test fun `skips refresh when the current adapter is unchanged`() {
        assertFalse(TreeRefreshPolicy.shouldRefresh(relayout = false, fitsContent = false, hasCurrentAdapter = true))
    }

    @Test fun `refreshes after relayout or content fitting`() {
        assertTrue(TreeRefreshPolicy.shouldRefresh(relayout = true, fitsContent = false, hasCurrentAdapter = true))
        assertTrue(TreeRefreshPolicy.shouldRefresh(relayout = false, fitsContent = true, hasCurrentAdapter = true))
    }
}
