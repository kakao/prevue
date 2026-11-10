package prevue.application.domain.model

import prevue.application.domain.model.DeviceOrientation.PORTRAIT
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_LEFT
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_RIGHT
import prevue.application.domain.model.DeviceModel.PIXEL_9
import prevue.application.domain.model.DeviceModel.PIXEL_9_PRO_FOLD
import prevue.application.domain.model.DeviceModel.PIXEL_TABLET

internal object PixelDeviceInsets {
    private const val BASE = "https://github.com/easyhooon/windowinsets.info/blob/3884efc51ee56798d139ae64d730719b1083573c/measurements"

    val profiles: Map<ScreenSize.Device, DeviceInsetProfile> = mapOf(
        ScreenSize.Device(PIXEL_9, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 54.1, top = 52.19, bottom = 24.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 52.19),
                navigationBars = InsetEdges(bottom = 24.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(left = 54.1),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-9/emulator-2026-09-27/landscape-1-gesture.json",
                "2026-09-27T14:05:14.080426Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "420",
                    "resolutionPx" to "2424x1080",
                    "rotation" to "1",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_9, false, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 52.19, right = 54.1, bottom = 24.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 52.19),
                navigationBars = InsetEdges(bottom = 24.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(right = 54.1),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-9/emulator-2026-09-27/landscape-3-gesture.json",
                "2026-09-27T14:05:15.089846Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "420",
                    "resolutionPx" to "2424x1080",
                    "rotation" to "3",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_9, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 65.9, bottom = 24.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 65.9),
                navigationBars = InsetEdges(bottom = 24.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(top = 65.9),
            ),
            evidence = InsetEvidence(
                InsetSource.FIREBASE_TEST_LAB, "$BASE/pixel/pixel-9/testlab-2026-09-28/main-gesture.json",
                "2026-09-27T16:23:34.240378Z", mapOf(
                    "android" to "16",
                    "buildId" to "CP1A.260505.005",
                    "densityDpi" to "420",
                    "resolutionPx" to "1080x2424",
                    "rotation" to "0",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_9_PRO_FOLD, true, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 62.36, bottom = 24.21),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 62.36),
                navigationBars = InsetEdges(bottom = 24.21),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(top = 62.36),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-9-pro-fold/emulator-2026-09-27/cover-gesture.json",
                "2026-09-27T13:20:37.028253Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "390",
                    "resolutionPx" to "1080x2424",
                    "rotation" to "0",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_9_PRO_FOLD, true, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 62.36, top = 52.1, bottom = 24.21),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 52.1),
                navigationBars = InsetEdges(bottom = 24.21),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(left = 62.36),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-9-pro-fold/emulator-2026-09-27/cover-landscape-1-gesture.json",
                "2026-09-27T13:20:37.966282Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "390",
                    "resolutionPx" to "2424x1080",
                    "rotation" to "1",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_9_PRO_FOLD, true, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 52.1, right = 62.36, bottom = 24.21),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 52.1),
                navigationBars = InsetEdges(bottom = 24.21),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(right = 62.36),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-9-pro-fold/emulator-2026-09-27/cover-landscape-3-gesture.json",
                "2026-09-27T13:20:38.925624Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "390",
                    "resolutionPx" to "2424x1080",
                    "rotation" to "3",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_9_PRO_FOLD, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 55.79, bottom = 24.21),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 55.79),
                navigationBars = InsetEdges(bottom = 24.21),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(top = 55.79),
            ),
            evidence = InsetEvidence(
                InsetSource.FIREBASE_TEST_LAB, "$BASE/pixel/pixel-9-pro-fold/testlab-2026-09-28/main-gesture.json",
                "2026-09-27T15:26:38.436447Z", mapOf(
                    "android" to "16",
                    "buildId" to "CP1A.260305.018",
                    "densityDpi" to "390",
                    "resolutionPx" to "2076x2152",
                    "rotation" to "0",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1.1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_9_PRO_FOLD, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 55.79, bottom = 32.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 55.79),
                navigationBars = InsetEdges(bottom = 32.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(top = 55.79),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-9-pro-fold/emulator-2026-09-27/main-landscape-1-gesture.json",
                "2026-09-27T13:20:13.014581Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "390",
                    "resolutionPx" to "2152x2076",
                    "rotation" to "1",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_9_PRO_FOLD, false, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 36.1, bottom = 55.79),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 36.1),
                navigationBars = InsetEdges(bottom = 55.79),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(bottom = 55.79),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-9-pro-fold/emulator-2026-09-27/main-landscape-3-gesture.json",
                "2026-09-27T13:20:27.392014Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "390",
                    "resolutionPx" to "2152x2076",
                    "rotation" to "3",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_TABLET, false, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 24.0, bottom = 32.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 24.0),
                navigationBars = InsetEdges(bottom = 32.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-tablet/emulator-2026-09-27/landscape-2-gesture.json",
                "2026-09-27T13:56:59.111874Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "320",
                    "resolutionPx" to "2560x1600",
                    "rotation" to "2",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_TABLET, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 24.0, bottom = 32.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 24.0),
                navigationBars = InsetEdges(bottom = 32.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-tablet/emulator-2026-09-27/main-gesture.json",
                "2026-09-27T13:56:38.795975Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "320",
                    "resolutionPx" to "2560x1600",
                    "rotation" to "0",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
        ScreenSize.Device(PIXEL_TABLET, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 24.0, bottom = 32.0),
            measured = MeasuredInsets(
                statusBars = InsetEdges(top = 24.0),
                navigationBars = InsetEdges(bottom = 32.0),
                captionBar = InsetEdges(),
                displayCutout = InsetEdges(),
            ),
            evidence = InsetEvidence(
                InsetSource.ANDROID_EMULATOR, "$BASE/pixel/pixel-tablet/emulator-2026-09-27/portrait-1-gesture.json",
                "2026-09-27T13:56:49.652796Z", mapOf(
                    "android" to "17",
                    "buildId" to "CE2A.260420.019",
                    "densityDpi" to "320",
                    "resolutionPx" to "1600x2560",
                    "rotation" to "1",
                    "navigation" to "gesture",
                    "multiWindow" to "false",
                    "fontScale" to "1",
                ),
            ),
        ),
    )
}
