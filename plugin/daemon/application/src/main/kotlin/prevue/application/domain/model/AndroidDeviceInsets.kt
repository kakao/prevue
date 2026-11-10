package prevue.application.domain.model

internal object AndroidDeviceInsets {
    val profiles: Map<ScreenSize.Device, DeviceInsetProfile> = SamsungDeviceInsets.profiles + PixelDeviceInsets.profiles
}
