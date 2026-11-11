package prevue.application.domain.model

data class InsetEdges(val left: Double = 0.0, val top: Double = 0.0, val right: Double = 0.0, val bottom: Double = 0.0) {
    init {
        require(listOf(left, top, right, bottom).all { it.isFinite() && it >= 0 }) { "인셋은 유한한 0 이상 dp 값이어야 한다" }
    }
}

data class AppInsets(
    val statusBars: InsetEdges = InsetEdges(),
    val navigationBars: InsetEdges = InsetEdges(),
    val captionBar: InsetEdges = InsetEdges(),
    val displayCutout: InsetEdges = InsetEdges(),
    val systemOverlays: InsetEdges = InsetEdges(),
) {
    companion object {
        val NONE = AppInsets()
    }
}

