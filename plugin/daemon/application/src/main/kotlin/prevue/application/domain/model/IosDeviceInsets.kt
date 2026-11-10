package prevue.application.domain.model

import prevue.application.domain.model.DeviceOrientation.PORTRAIT
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_LEFT
import prevue.application.domain.model.DeviceOrientation.LANDSCAPE_RIGHT
import prevue.application.domain.model.DeviceModel.IPHONE_17
import prevue.application.domain.model.DeviceModel.IPHONE_AIR
import prevue.application.domain.model.DeviceModel.IPHONE_17_PRO_MAX
import prevue.application.domain.model.DeviceModel.IPHONE_DUO

internal object IosDeviceInsets {
    private val profiles: Map<ScreenSize.Device, DeviceInsetProfile> = mapOf(
        ScreenSize.Device(IPHONE_17, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 62.0, bottom = 34.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-17.md", null, mapOf(
                    "sdk" to "27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "1206x2622",
                    "orientation" to "portrait",
                    "sourceSha256" to "af44102b199f57635feb1553f29b2ed33db2c7155ea43963c956e5df3c1407c6",
                    "checkedAt" to "2026-11-10",
                    "ios" to "27.0 (24A434)",
                    "displayZoom" to "off",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_17, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 62.0, right = 62.0, bottom = 20.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-17.md", null, mapOf(
                    "sdk" to "27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2622x1206",
                    "orientation" to "landscape-left",
                    "sourceSha256" to "af44102b199f57635feb1553f29b2ed33db2c7155ea43963c956e5df3c1407c6",
                    "checkedAt" to "2026-11-10",
                    "ios" to "27.0 (24A434)",
                    "displayZoom" to "off",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_17, false, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 62.0, right = 62.0, bottom = 20.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-17.md", null, mapOf(
                    "sdk" to "27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2622x1206",
                    "orientation" to "landscape-right",
                    "sourceSha256" to "af44102b199f57635feb1553f29b2ed33db2c7155ea43963c956e5df3c1407c6",
                    "checkedAt" to "2026-11-10",
                    "ios" to "27.0 (24A434)",
                    "displayZoom" to "off",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_AIR, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 68.0, bottom = 34.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-air.md", null, mapOf(
                    "sdk" to "27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "1260x2736",
                    "orientation" to "portrait",
                    "sourceSha256" to "7fed673516bf0f56b2287a2d5fe02fae4ae0cf13dddb09ea690f4ed5f4f22a61",
                    "checkedAt" to "2026-11-10",
                    "ios" to "27.0 (24A434)",
                    "displayZoom" to "off",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_AIR, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 68.0, right = 68.0, bottom = 20.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-air.md", null, mapOf(
                    "sdk" to "27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2736x1260",
                    "orientation" to "landscape-left",
                    "sourceSha256" to "7fed673516bf0f56b2287a2d5fe02fae4ae0cf13dddb09ea690f4ed5f4f22a61",
                    "checkedAt" to "2026-11-10",
                    "ios" to "27.0 (24A434)",
                    "displayZoom" to "off",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_AIR, false, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 68.0, right = 68.0, bottom = 20.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-air.md", null, mapOf(
                    "sdk" to "27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2736x1260",
                    "orientation" to "landscape-right",
                    "sourceSha256" to "7fed673516bf0f56b2287a2d5fe02fae4ae0cf13dddb09ea690f4ed5f4f22a61",
                    "checkedAt" to "2026-11-10",
                    "ios" to "27.0 (24A434)",
                    "displayZoom" to "off",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_17_PRO_MAX, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 62.0, bottom = 34.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-17-pro-max.md", null, mapOf(
                    "sdk" to "27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "1320x2868",
                    "orientation" to "portrait",
                    "sourceSha256" to "5259eec653e5677806f8d1cac5dee303de912ffb0f99ccecbcf9add6325bc96b",
                    "checkedAt" to "2026-11-10",
                    "ios" to "27.0 (24A434)",
                    "displayZoom" to "off",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_17_PRO_MAX, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 62.0, right = 62.0, bottom = 20.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-17-pro-max.md", null, mapOf(
                    "sdk" to "27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2868x1320",
                    "orientation" to "landscape-left",
                    "sourceSha256" to "5259eec653e5677806f8d1cac5dee303de912ffb0f99ccecbcf9add6325bc96b",
                    "checkedAt" to "2026-11-10",
                    "ios" to "27.0 (24A434)",
                    "displayZoom" to "off",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_17_PRO_MAX, false, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 62.0, right = 62.0, bottom = 20.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-17-pro-max.md", null, mapOf(
                    "sdk" to "27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2868x1320",
                    "orientation" to "landscape-right",
                    "sourceSha256" to "5259eec653e5677806f8d1cac5dee303de912ffb0f99ccecbcf9add6325bc96b",
                    "checkedAt" to "2026-11-10",
                    "ios" to "27.0 (24A434)",
                    "displayZoom" to "off",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_DUO, true, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(right = 84.0, bottom = 34.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-duo.md", null, mapOf(
                    "sdk" to "Xcode 27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "1398x2034",
                    "orientation" to "portrait",
                    "sourceSha256" to "c7dcd3399163cc376f9e18212d1c712ca8beda700fc55e7772b82df299ade7a6",
                    "checkedAt" to "2026-11-10",
                    "splitView" to "off",
                    "innerCamera" to "off",
                    "horizontalToolbar" to "off",
                    "pose" to "closed",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_DUO, true, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(right = 84.0, bottom = 34.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-duo.md", null, mapOf(
                    "sdk" to "Xcode 27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2034x1398",
                    "orientation" to "landscape-left",
                    "sourceSha256" to "c7dcd3399163cc376f9e18212d1c712ca8beda700fc55e7772b82df299ade7a6",
                    "checkedAt" to "2026-11-10",
                    "splitView" to "off",
                    "innerCamera" to "off",
                    "horizontalToolbar" to "off",
                    "pose" to "closed",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_DUO, true, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(left = 84.0, bottom = 34.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-duo.md", null, mapOf(
                    "sdk" to "Xcode 27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2034x1398",
                    "orientation" to "landscape-right",
                    "sourceSha256" to "c7dcd3399163cc376f9e18212d1c712ca8beda700fc55e7772b82df299ade7a6",
                    "checkedAt" to "2026-11-10",
                    "splitView" to "off",
                    "innerCamera" to "off",
                    "horizontalToolbar" to "off",
                    "pose" to "closed",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_DUO, false, PORTRAIT) to DeviceInsetProfile(
            safeArea = InsetEdges(top = 82.0, bottom = 34.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-duo.md", null, mapOf(
                    "sdk" to "Xcode 27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2007x2853",
                    "orientation" to "portrait",
                    "sourceSha256" to "c7dcd3399163cc376f9e18212d1c712ca8beda700fc55e7772b82df299ade7a6",
                    "checkedAt" to "2026-11-10",
                    "splitView" to "off",
                    "innerCamera" to "off",
                    "horizontalToolbar" to "off",
                    "pose" to "fully-open",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_DUO, false, LANDSCAPE_LEFT) to DeviceInsetProfile(
            safeArea = InsetEdges(right = 84.0, bottom = 34.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-duo.md", null, mapOf(
                    "sdk" to "Xcode 27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2853x2007",
                    "orientation" to "landscape-left",
                    "sourceSha256" to "c7dcd3399163cc376f9e18212d1c712ca8beda700fc55e7772b82df299ade7a6",
                    "checkedAt" to "2026-11-10",
                    "splitView" to "off",
                    "innerCamera" to "off",
                    "horizontalToolbar" to "off",
                    "pose" to "fully-open",
                ),
            ),
        ),
        ScreenSize.Device(IPHONE_DUO, false, LANDSCAPE_RIGHT) to DeviceInsetProfile(
            safeArea = InsetEdges(right = 84.0, bottom = 34.0),
            evidence = InsetEvidence(
                InsetSource.SAFE_AREA, "https://safearea.info/iphone-duo.md", null, mapOf(
                    "sdk" to "Xcode 27.1",
                    "scale" to "3",
                    "unit" to "pt",
                    "resolutionPx" to "2853x2007",
                    "orientation" to "landscape-right",
                    "sourceSha256" to "c7dcd3399163cc376f9e18212d1c712ca8beda700fc55e7772b82df299ade7a6",
                    "checkedAt" to "2026-11-10",
                    "splitView" to "off",
                    "innerCamera" to "off",
                    "horizontalToolbar" to "off",
                    "pose" to "fully-open",
                ),
            ),
        ),
    )

    fun of(device: ScreenSize.Device): DeviceInsetProfile? = profiles[device]?.copy(mappingIssue = device.model.appInsetsIssue)
}
