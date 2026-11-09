package prevue.application.domain.model

import prevue.application.domain.model.DeviceModel.GALAXY_S26
import prevue.application.domain.model.DeviceModel.GALAXY_Z_FOLD8
import prevue.application.domain.model.DeviceModel.GALAXY_Z_FOLD8_ULTRA
import prevue.application.domain.model.DeviceModel.IPHONE_17
import prevue.application.domain.model.DeviceModel.IPHONE_17_PRO_MAX
import prevue.application.domain.model.DeviceModel.IPHONE_AIR
import prevue.application.domain.model.DeviceModel.IPHONE_DUO
import prevue.application.domain.model.DeviceModel.PIXEL_9
import prevue.application.domain.model.DeviceModel.PIXEL_9_PRO_FOLD
import prevue.application.domain.model.DeviceModel.PIXEL_TABLET
import prevue.application.domain.model.InsetSource.SAFE_AREA
import prevue.application.domain.model.InsetSource.WINDOW_INSETS
import prevue.application.domain.model.InsetSource.WINDOW_INSETS_EMULATOR

object DeviceBars {
    private data class Posture(val model: DeviceModel, val folded: Boolean, val landscape: Boolean)

    private val MEASURED: Map<Posture, BarInsets> = mapOf(
        Posture(GALAXY_S26, folded = false, landscape = false) to BarInsets(37.0, 15.0, WINDOW_INSETS),
        Posture(GALAXY_S26, folded = false, landscape = true) to BarInsets(30.0, 15.0, WINDOW_INSETS),
        Posture(PIXEL_9, folded = false, landscape = false) to BarInsets(65.9, 24.0, WINDOW_INSETS),
        Posture(GALAXY_Z_FOLD8, folded = false, landscape = false) to BarInsets(40.0, 14.86, WINDOW_INSETS),
        Posture(GALAXY_Z_FOLD8, folded = true, landscape = false) to BarInsets(41.9, 14.86, WINDOW_INSETS),
        Posture(GALAXY_Z_FOLD8_ULTRA, folded = false, landscape = false) to BarInsets(37.67, 15.0, WINDOW_INSETS),
        Posture(GALAXY_Z_FOLD8_ULTRA, folded = true, landscape = false) to BarInsets(37.67, 15.0, WINDOW_INSETS),
        Posture(PIXEL_9_PRO_FOLD, folded = false, landscape = false) to BarInsets(55.79, 24.21, WINDOW_INSETS),
        Posture(PIXEL_9_PRO_FOLD, folded = true, landscape = false) to BarInsets(62.36, 24.21, WINDOW_INSETS_EMULATOR),
        Posture(PIXEL_TABLET, folded = false, landscape = false) to BarInsets(36.0, 32.0, WINDOW_INSETS),
        Posture(PIXEL_TABLET, folded = false, landscape = true) to BarInsets(36.0, 32.0, WINDOW_INSETS),
        Posture(IPHONE_17, folded = false, landscape = false) to BarInsets(62.0, 34.0, SAFE_AREA),
        Posture(IPHONE_AIR, folded = false, landscape = false) to BarInsets(68.0, 34.0, SAFE_AREA),
        Posture(IPHONE_17_PRO_MAX, folded = false, landscape = false) to BarInsets(62.0, 34.0, SAFE_AREA),
        Posture(IPHONE_DUO, folded = true, landscape = false) to BarInsets(0.0, 34.0, SAFE_AREA),
    )

    fun of(d: ScreenSize.Device): BarInsets? = MEASURED[Posture(d.model, d.folded, d.landscape)]
}
