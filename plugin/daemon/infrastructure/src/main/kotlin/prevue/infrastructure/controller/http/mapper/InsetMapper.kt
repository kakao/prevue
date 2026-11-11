package prevue.infrastructure.controller.http.mapper

import prevue.application.domain.model.DeviceInsetProfile
import prevue.application.domain.model.InsetEdges
import prevue.application.domain.model.DeviceInsetState
import prevue.application.domain.model.AppInsets

internal fun DeviceInsetProfile.toJson(): Map<String, Any?> = mapOf(
    "safeArea" to safeArea?.toJson(),
    "measured" to measured?.let {
        mapOf(
            "statusBars" to it.statusBars.toJson(), "navigationBars" to it.navigationBars.toJson(),
            "captionBar" to it.captionBar.toJson(), "displayCutout" to it.displayCutout.toJson(),
        )
    },
    "evidence" to evidence?.let {
        mapOf("source" to it.source.site, "kind" to it.source.kind, "sourceUrl" to it.url,
            "capturedAt" to it.capturedAt, "conditions" to it.conditions)
    },
)

private fun InsetEdges.toJson(): Map<String, Double> = mapOf("left" to left, "top" to top, "right" to right, "bottom" to bottom)

internal fun DeviceInsetState.toJson(): Map<String, Any?> = mapOf(
    "posture" to device.key, "basisPosture" to input.basisPosture,
    "values" to input.values.toJson(),
    "evidence" to with(input.evidence) { mapOf("source" to source.site, "sourceUrl" to url, "kind" to source.kind) },
)

internal fun AppInsets.toJson(): Map<String, Any?> = mapOf(
    "statusBars" to statusBars.toJson(), "navigationBars" to navigationBars.toJson(), "captionBar" to captionBar.toJson(),
    "displayCutout" to displayCutout.toJson(), "systemOverlays" to systemOverlays.toJson(),
)
