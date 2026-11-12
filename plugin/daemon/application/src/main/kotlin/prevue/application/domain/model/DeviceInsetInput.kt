package prevue.application.domain.model

data class DeviceInsetInput(val values: AppInsets, val evidence: InsetEvidence, val basisPosture: String)

object DeviceInsetInputs {
    fun of(device: ScreenSize.Device): DeviceInsetInput {
        val basis = device.takeUnless { it.insetProfile.evidence == null && it.orientation == DeviceOrientation.LANDSCAPE_RIGHT }
            ?: device.copy(orientation = DeviceOrientation.LANDSCAPE_LEFT)
        val profile = basis.insetProfile
        val evidence = profile.evidence ?: error("${device.key} 자세의 인셋 자료가 없다")
        val values = profile.measured?.appInsets ?: profile.safeArea?.iosAppInsets() ?: error("${device.key} 자세의 인셋 값이 없다")
        return DeviceInsetInput(if (basis == device) values else values.mirrored(), evidence, basis.key)
    }

    private fun InsetEdges.iosAppInsets(): AppInsets = AppInsets(
        statusBars = InsetEdges(top = top), navigationBars = InsetEdges(bottom = bottom), displayCutout = copy(bottom = 0.0),
    )

    private fun AppInsets.mirrored(): AppInsets = AppInsets(
        statusBars.mirrored(), navigationBars.mirrored(), captionBar.mirrored(), displayCutout.mirrored(), systemOverlays.mirrored(),
    )

    private fun InsetEdges.mirrored(): InsetEdges = copy(left = right, right = left)
}

data class DeviceInsetState(val device: ScreenSize.Device) {
    val input: DeviceInsetInput get() = DeviceInsetInputs.of(device)
}
