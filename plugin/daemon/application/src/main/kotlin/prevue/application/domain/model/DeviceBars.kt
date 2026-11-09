package prevue.application.domain.model

import prevue.application.domain.model.DeviceModel.GALAXY_S26
import prevue.application.domain.model.DeviceModel.GALAXY_Z_FOLD8
import prevue.application.domain.model.DeviceModel.GALAXY_Z_FOLD8_ULTRA
import prevue.application.domain.model.DeviceModel.IPHONE_17
import prevue.application.domain.model.DeviceModel.IPHONE_17_PRO_MAX
import prevue.application.domain.model.DeviceModel.IPHONE_AIR
import prevue.application.domain.model.DeviceModel.PIXEL_9
import prevue.application.domain.model.DeviceModel.PIXEL_9_PRO_FOLD
import prevue.application.domain.model.DeviceModel.PIXEL_TABLET
import prevue.application.domain.model.InsetSource.ANDROID_EMULATOR
import prevue.application.domain.model.InsetSource.FIREBASE_TEST_LAB
import prevue.application.domain.model.InsetSource.SAFE_AREA
import prevue.application.domain.model.InsetSource.SAMSUNG_RTL
import prevue.application.domain.model.ScreenSize.Device

object DeviceBars {
    private const val MEASUREMENTS = "https://github.com/easyhooon/windowinsets.info/tree/main/measurements"
    private const val S26 = "$MEASUREMENTS/galaxy-s/galaxy-s26"
    private const val FOLD8 = "$MEASUREMENTS/galaxy-fold/galaxy-z-fold8"
    private const val ULTRA = "$MEASUREMENTS/galaxy-fold/galaxy-z-fold8-ultra"
    private const val PIXEL9 = "$MEASUREMENTS/pixel/pixel-9"
    private const val PIXEL_FOLD = "$MEASUREMENTS/pixel/pixel-9-pro-fold"
    private const val TABLET = "$MEASUREMENTS/pixel/pixel-tablet"

    private val MEASURED: Map<Device, BarInsets> = mapOf(
        Device(GALAXY_S26) to BarInsets(37.0, 15.0, SAMSUNG_RTL, S26),
        Device(GALAXY_S26, landscape = true) to BarInsets(30.0, 15.0, SAMSUNG_RTL, S26),
        Device(GALAXY_Z_FOLD8) to BarInsets(40.0, 14.86, SAMSUNG_RTL, FOLD8),
        Device(GALAXY_Z_FOLD8, landscape = true) to BarInsets(38.86, 14.86, SAMSUNG_RTL, FOLD8),
        Device(GALAXY_Z_FOLD8, folded = true) to BarInsets(41.9, 14.86, SAMSUNG_RTL, FOLD8),
        Device(GALAXY_Z_FOLD8, folded = true, landscape = true) to BarInsets(30.1, 14.86, SAMSUNG_RTL, FOLD8),
        Device(GALAXY_Z_FOLD8_ULTRA) to BarInsets(37.67, 15.0, SAMSUNG_RTL, ULTRA),
        Device(GALAXY_Z_FOLD8_ULTRA, landscape = true) to BarInsets(30.0, 15.0, SAMSUNG_RTL, ULTRA),
        Device(GALAXY_Z_FOLD8_ULTRA, folded = true) to BarInsets(37.67, 15.0, SAMSUNG_RTL, ULTRA),
        Device(GALAXY_Z_FOLD8_ULTRA, folded = true, landscape = true) to BarInsets(30.0, 15.0, SAMSUNG_RTL, ULTRA),
        Device(PIXEL_9) to BarInsets(65.9, 24.0, FIREBASE_TEST_LAB, PIXEL9),
        Device(PIXEL_9_PRO_FOLD) to BarInsets(55.79, 24.21, FIREBASE_TEST_LAB, PIXEL_FOLD),
        Device(PIXEL_9_PRO_FOLD, folded = true) to BarInsets(62.36, 24.21, ANDROID_EMULATOR, PIXEL_FOLD),
        Device(PIXEL_TABLET) to BarInsets(36.0, 32.0, FIREBASE_TEST_LAB, TABLET),
        Device(PIXEL_TABLET, landscape = true) to BarInsets(36.0, 32.0, FIREBASE_TEST_LAB, TABLET),
        Device(IPHONE_17) to BarInsets(62.0, 34.0, SAFE_AREA, "https://safearea.info/iphone-17"),
        Device(IPHONE_AIR) to BarInsets(68.0, 34.0, SAFE_AREA, "https://safearea.info/iphone-air"),
        Device(IPHONE_17_PRO_MAX) to BarInsets(62.0, 34.0, SAFE_AREA, "https://safearea.info/iphone-17-pro-max"),
    )

    fun of(d: Device): BarInsets? = MEASURED[d]
}
