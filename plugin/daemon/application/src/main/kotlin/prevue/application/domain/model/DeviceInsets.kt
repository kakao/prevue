package prevue.application.domain.model

data class InsetEvidence(
    val source: InsetSource,
    val url: String,
    val capturedAt: String?,
    val conditions: Map<String, String>,
)

data class MeasuredInsets(
    val statusBars: InsetEdges,
    val navigationBars: InsetEdges,
    val captionBar: InsetEdges,
    val displayCutout: InsetEdges,
) {
    val appInsets: AppInsets get() = AppInsets(statusBars, navigationBars, captionBar, displayCutout)
}

data class DeviceInsetProfile(
    val safeArea: InsetEdges? = null,
    val measured: MeasuredInsets? = null,
    val evidence: InsetEvidence? = null,
)

object DeviceInsets {
    fun of(device: ScreenSize.Device): DeviceInsetProfile =
        DEVICE_INSETS[device] ?: DeviceInsetProfile()
}
