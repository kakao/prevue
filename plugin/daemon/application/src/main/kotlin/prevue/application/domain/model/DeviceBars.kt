package prevue.application.domain.model

object DeviceBars {
    fun of(device: ScreenSize.Device): BarInsets {
        val input = DeviceInsetInputs.of(device)
        return BarInsets(input.values.statusBars.top, input.values.navigationBars.bottom, input.evidence.source, input.evidence.url)
    }
}
