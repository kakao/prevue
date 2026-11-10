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
    val systemOverlays: InsetEdges? = null,
) {
    val appInsets: AppInsets?
        get() = systemOverlays?.let { AppInsets(statusBars, navigationBars, captionBar, displayCutout, it) }
}

data class DeviceInsetProfile(
    val safeArea: InsetEdges? = null,
    val measured: MeasuredInsets? = null,
    val evidence: InsetEvidence? = null,
    val mappingIssue: String? = null,
) {
    val issue: String?
        get() = mappingIssue ?: when {
            measured == null -> "해당 기기·화면·방향의 종류별 인셋 측정값을 검증하지 못했다"
            measured.systemOverlays == null -> "systemOverlays 인셋 종류의 측정값을 검증하지 못했다"
            else -> null
        }
    val verified: Boolean get() = issue == null
    val supported: Boolean get() = true
    val appInsets: AppInsets? get() = measured?.appInsets?.takeIf { verified }
}

object DeviceInsets {
    fun of(device: ScreenSize.Device): DeviceInsetProfile =
        AndroidDeviceInsets.profiles[device] ?: IosDeviceInsets.of(device) ?: DeviceInsetProfile()
}
