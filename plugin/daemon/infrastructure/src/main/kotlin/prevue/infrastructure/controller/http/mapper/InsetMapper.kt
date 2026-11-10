package prevue.infrastructure.controller.http.mapper

import prevue.application.domain.model.DeviceInsetProfile
import prevue.application.domain.model.InsetEdges

internal fun DeviceInsetProfile.toJson(): Map<String, Any?> = mapOf(
    "supported" to supported, "issue" to issue,
    "safeArea" to safeArea?.toJson(),
    "measured" to measured?.let {
        mapOf(
            "statusBars" to it.statusBars.toJson(), "navigationBars" to it.navigationBars.toJson(),
            "captionBar" to it.captionBar.toJson(), "displayCutout" to it.displayCutout.toJson(),
            "systemOverlays" to it.systemOverlays?.toJson(),
        )
    },
    "evidence" to evidence?.let {
        mapOf("source" to it.source.site, "kind" to it.source.kind, "sourceUrl" to it.url,
            "capturedAt" to it.capturedAt, "conditions" to it.conditions)
    },
)

private fun InsetEdges.toJson(): Map<String, Double> = mapOf("left" to left, "top" to top, "right" to right, "bottom" to bottom)
