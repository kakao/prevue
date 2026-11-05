package prevue.infrastructure.bindings

import java.io.File
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import dev.zacsweers.metro.Inject
import prevue.infrastructure.render.BootingEngine

@Inject
public class RendererLoss internal constructor(private val engine: BootingEngine) {
    public suspend fun await(): Pair<String, File?> {
        val lost = engine.await().lost.filterNotNull().first()
        return lost.reason.text to lost.preview.file
    }
}
