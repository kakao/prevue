package prevue.application.domain.model

import prevue.application.domain.model.DeviceOrientation.PORTRAIT
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_LEFT
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_RIGHT
import prevue.application.domain.model.DeviceModel.GALAXY_S26
import prevue.application.domain.model.DeviceModel.GALAXY_Z_FOLD8
import prevue.application.domain.model.DeviceModel.GALAXY_Z_FOLD8_ULTRA

internal object SamsungDeviceInsets {
    private const val BASE = "https://github.com/easyhooon/windowinsets.info/blob/3884efc51ee56798d139ae64d730719b1083573c/measurements"

    val profiles: Map<ScreenSize.Device, DeviceInsetProfile> = mapOf(
        ScreenSize.Device(GALAXY_S26, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 37.0, bottom = 15.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 37.0),
                navigationBars = InsetEdges(bottom = 15.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(top = 37.0),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-s/galaxy-s26/recapture-2026-09-28-rotation/main-gesture.json",
                "2026-09-28T05:22:41.549320Z", mapOf(
                    "android" to "16",
                    "buildId" to "BP4A.251205.006.S942NKSS4AZHA",
                    "densityDpi" to "480",
                    "resolutionPx" to "1080x2340",
                    "rotation" to "0",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                    "oneUi" to "8.5",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_S26, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 37.0, top = 30.0, bottom = 15.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 30.0),
                navigationBars = InsetEdges(bottom = 15.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(left = 37.0),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-s/galaxy-s26/recapture-2026-09-28-rotation/main-landscape-1-gesture.json",
                "2026-09-28T05:22:42.326832Z", mapOf(
                    "android" to "16",
                    "buildId" to "BP4A.251205.006.S942NKSS4AZHA",
                    "densityDpi" to "480",
                    "resolutionPx" to "2340x1080",
                    "rotation" to "1",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                    "oneUi" to "8.5",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_S26, false, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 30.0, right = 37.0, bottom = 15.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 30.0),
                navigationBars = InsetEdges(bottom = 15.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(right = 37.0),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-s/galaxy-s26/recapture-2026-09-28-rotation/main-landscape-3-gesture.json",
                "2026-09-28T05:22:43.077603Z", mapOf(
                    "android" to "16",
                    "buildId" to "BP4A.251205.006.S942NKSS4AZHA",
                    "densityDpi" to "480",
                    "resolutionPx" to "2340x1080",
                    "rotation" to "3",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                    "oneUi" to "8.5",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8, true, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 41.9, bottom = 14.86),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 41.9),
                navigationBars = InsetEdges(bottom = 14.86),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(top = 39.62),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8/recapture-2026-09-27-rotation/cover-gesture.json",
                "2026-09-27T15:40:30.461795Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F971NKSU1AZGI",
                    "densityDpi" to "420",
                    "resolutionPx" to "1248x1972",
                    "rotation" to "0",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1.08",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8, true, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 39.62, top = 30.1, bottom = 14.86),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 30.1),
                navigationBars = InsetEdges(bottom = 14.86),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(left = 39.62),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8/recapture-2026-09-27-rotation/cover-landscape-1-gesture.json",
                "2026-09-27T15:40:31.238889Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F971NKSU1AZGI",
                    "densityDpi" to "420",
                    "resolutionPx" to "1972x1248",
                    "rotation" to "1",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1.08",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8, true, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 30.1, right = 39.62, bottom = 14.86),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 30.1),
                navigationBars = InsetEdges(bottom = 14.86),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(right = 39.62),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8/recapture-2026-09-27-rotation/cover-landscape-3-gesture.json",
                "2026-09-27T15:40:31.992239Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F971NKSU1AZGI",
                    "densityDpi" to "420",
                    "resolutionPx" to "1972x1248",
                    "rotation" to "3",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1.08",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 40.0, bottom = 14.86),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 40.0),
                navigationBars = InsetEdges(bottom = 14.86),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8/recapture-2026-09-27-rotation/main-gesture.json",
                "2026-09-27T15:35:50.829564Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F971NKSU1AZGI",
                    "densityDpi" to "420",
                    "resolutionPx" to "2448x1848",
                    "rotation" to "0",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1.08",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 38.86, bottom = 14.86),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 38.86),
                navigationBars = InsetEdges(bottom = 14.86),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8/recapture-2026-09-27-rotation/main-portrait-1-gesture.json",
                "2026-09-27T15:36:23.067250Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F971NKSU1AZGI",
                    "densityDpi" to "420",
                    "resolutionPx" to "1848x2448",
                    "rotation" to "1",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1.08",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8_ULTRA, true, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 37.67, bottom = 15.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 37.67),
                navigationBars = InsetEdges(bottom = 15.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(top = 36.0),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8-ultra/recapture-2026-09-27-rotation/cover-gesture.json",
                "2026-09-27T14:45:35.782889Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F976USQU1AZGI",
                    "densityDpi" to "480",
                    "resolutionPx" to "1080x2520",
                    "rotation" to "0",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8_ULTRA, true, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 36.0, top = 30.0, bottom = 15.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 30.0),
                navigationBars = InsetEdges(bottom = 15.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(left = 36.0),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8-ultra/recapture-2026-09-27-rotation/cover-landscape-1-gesture.json",
                "2026-09-27T14:45:36.561954Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F976USQU1AZGI",
                    "densityDpi" to "480",
                    "resolutionPx" to "2520x1080",
                    "rotation" to "1",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8_ULTRA, true, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 30.0, right = 36.0, bottom = 15.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 30.0),
                navigationBars = InsetEdges(bottom = 15.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(right = 36.0),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8-ultra/recapture-2026-09-27-rotation/cover-landscape-3-gesture.json",
                "2026-09-27T14:45:37.312019Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F976USQU1AZGI",
                    "densityDpi" to "480",
                    "resolutionPx" to "2520x1080",
                    "rotation" to "3",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8_ULTRA, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 37.67, bottom = 15.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 37.67),
                navigationBars = InsetEdges(bottom = 15.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8-ultra/recapture-2026-09-27-rotation/main-gesture.json",
                "2026-09-27T14:42:43.866009Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F976USQU1AZGI",
                    "densityDpi" to "480",
                    "resolutionPx" to "2256x2504",
                    "rotation" to "0",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8_ULTRA, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 30.0, bottom = 15.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 30.0),
                navigationBars = InsetEdges(bottom = 15.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8-ultra/recapture-2026-09-27-rotation/main-landscape-1-gesture.json",
                "2026-09-27T14:48:00.406906Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F976USQU1AZGI",
                    "densityDpi" to "480",
                    "resolutionPx" to "2504x2256",
                    "rotation" to "1",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                    "oneUi" to "9.0",
                ),
            ),
        ),
        ScreenSize.Device(GALAXY_Z_FOLD8_ULTRA, false, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 30.0, bottom = 15.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 30.0),
                navigationBars = InsetEdges(bottom = 15.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(),
            ),
            evidence = InsetEvidence(
                InsetSource.SAMSUNG_RTL, "$BASE/galaxy-fold/galaxy-z-fold8-ultra/recapture-2026-09-27-rotation/main-landscape-3-gesture.json",
                "2026-09-27T14:44:20.199401Z", mapOf(
                    "android" to "17",
                    "buildId" to "CP2A.260605.016.F976USQU1AZGI",
                    "densityDpi" to "480",
                    "resolutionPx" to "2504x2256",
                    "rotation" to "3",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                    "oneUi" to "9.0",
                ),
            ),
        ),
    )
}
