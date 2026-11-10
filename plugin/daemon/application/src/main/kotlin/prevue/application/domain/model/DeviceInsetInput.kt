package prevue.application.domain.model

data class DeviceInsetInput(val values: AppInsets, val approximate: Boolean, val note: String?, val evidence: InsetEvidence?, val basisPosture: String)

object DeviceInsetInputs {
    fun of(device: ScreenSize.Device): DeviceInsetInput {
        val profile = device.insetProfile
        profile.appInsets?.let { return DeviceInsetInput(it, false, null, profile.evidence, device.key) }
        profile.measured?.let { m ->
            return DeviceInsetInput(m.completed(), true, "미측정 systemOverlays는 0으로 가정한 근삿값", profile.evidence, device.key)
        }
        profile.safeArea?.let { area ->
            val values = AppInsets(
                statusBars = InsetEdges(top = area.top), navigationBars = InsetEdges(bottom = area.bottom),
                displayCutout = area.copy(bottom = 0.0),
            )
            return DeviceInsetInput(values, true, "iOS safe area의 상단은 상태바, 하단은 내비게이션 바, 상단·측면은 컷아웃으로 근사", profile.evidence, device.key)
        }
        val opposite = device.copy(orientation = DeviceOrientation.LANDSCAPE_LEFT)
        val source = opposite.insetProfile
        val measured = source.measured?.takeIf { device.orientation == DeviceOrientation.LANDSCAPE_RIGHT }
        if (measured != null) return DeviceInsetInput(
            measured.completed().mirrored(), true, "반대 가로 자세의 좌우를 반전하고 미측정 systemOverlays는 0으로 가정한 근삿값", source.evidence, opposite.key,
        )
        return DeviceInsetInput(AppInsets(statusBars = InsetEdges(top = 24.0), navigationBars = InsetEdges(bottom = 24.0)), true,
            "측정 자료가 없어 상태바·내비게이션 바를 각각 24dp로 가정한 근삿값", null, device.key)
    }

    private fun MeasuredInsets.completed(): AppInsets = AppInsets(statusBars, navigationBars, captionBar, displayCutout, systemOverlays ?: InsetEdges())

    private fun AppInsets.mirrored(): AppInsets = AppInsets(
        statusBars.mirrored(), navigationBars.mirrored(), captionBar.mirrored(), displayCutout.mirrored(), systemOverlays.mirrored(),
    )

    private fun InsetEdges.mirrored(): InsetEdges = copy(left = right, right = left)
}

data class DeviceInsetState(val device: ScreenSize.Device) {
    val input: DeviceInsetInput get() = DeviceInsetInputs.of(device)
}
