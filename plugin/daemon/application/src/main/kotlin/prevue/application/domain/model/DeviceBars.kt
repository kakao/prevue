package prevue.application.domain.model

object DeviceBars {
    fun of(device: ScreenSize.Device): BarInsets? {
        if (device.model.look != BarLook.IOS) return null
        val profile = device.insetProfile
        val area = profile.safeArea ?: return null
        val evidence = profile.evidence ?: return null
        return BarInsets(area.top, area.bottom, evidence.source, evidence.url)
    }
}
