// status → JSON. 마지막 결과와 낡음의 이유도 여기서 정한다 — 여러 응답이 같이 싣는다.
package prevue.infrastructure.controller.http.mapper

import prevue.application.domain.model.LastResult
import prevue.application.domain.model.ReloadResult
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.Settled
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.StaleReason
import prevue.application.domain.model.SystemUi
import prevue.application.domain.model.BarInsets
import prevue.application.domain.model.SystemUiState
import prevue.application.domain.model.Status
import prevue.application.domain.model.Work
import prevue.infrastructure.json.string

internal fun Status.toJson(): Map<String, Any?> = mapOf(
    "repo" to module.repo, "module" to module.module, "variant" to module.variant, "kotlinModule" to module.kotlinModule,
    "borrowedFrom" to module.borrowedFrom, "borrowedCount" to module.borrowedCount,
    // CLI가 이것으로 어느 데몬에게 보낼지, 새 자리에 띄울지 정한다(D-50) — 여기 있는 모듈은 `show`만 보낸다(기준 3)
    "modules" to module.modules, "renderModules" to renderModules,
    "preview" to preview?.toJson(), "shownBy" to shownBy, "shownAt" to shownAt,
    "board" to board?.toJson(), "interactive" to interactive, "reloadPending" to reloadPending,
    "compilerWarm" to engine.compilerWarm, "bootstrapMs" to engine.bootstrapMs,
    "loaderGen" to engine.loaderGen, "tasksOnLoader" to engine.tasksOnLoader,
    "overlay" to engine.overlay, "out" to engine.out, "outBytes" to engine.outBytes, "outMaxBytes" to engine.outMaxBytes,
    "touchModeError" to engine.touchModeError,
    "selection" to selection?.toJson(), "tabs" to tabs.map { it.toJson() }, "stale" to stale.staleJson(),
    "memory" to mapOf("heapUsedMb" to engine.heapUsedMb, "heapMaxMb" to engine.heapMaxMb, "rssMb" to engine.rssMb),
    "last" to (last?.toJson() ?: emptyMap<String, Any?>()),
    "work" to work?.toJson(), "size" to size?.toJson(), "systemUi" to systemUi?.toJson(), "deviceInsets" to deviceInsets?.toJson(), "kmp" to kmp,
) + (module.sourceSet?.let { mapOf("sourceSet" to it) } ?: emptyMap()) +
    (watch?.let { mapOf("watch" to it.source, "staleWatch" to it.build, "valuesWatch" to it.values) } ?: emptyMap())   // "stale"로 두면 낡음의 이유들을 덮는다

internal fun ScreenSize.toJson(): Map<String, Any?>? = when (this) {
    ScreenSize.Original -> null
    is ScreenSize.Dp -> mapOf("kind" to if (preset != null) "preset" else "custom", "preset" to preset, "widthDp" to widthDp, "heightDp" to heightDp)
    is ScreenSize.Device -> mapOf(
        "kind" to "device", "device" to model.id, "name" to model.label, "folded" to folded, "landscape" to landscape,
        "widthDp" to widthDp, "heightDp" to heightDp, "hingeDp" to hingeDp, "dpi" to model.dpi,
        "orientation" to orientation.key, "widthPx" to widthPx, "heightPx" to heightPx,
        "insetProfile" to insetProfile.toJson(),
    )
}

internal fun SystemUiState.toJson(): Map<String, Any?> = mapOf(
    "choice" to choice.key, "annotated" to annotated, "shown" to shown,
    "bars" to bars?.let { b -> mapOf("look" to b.look.key, "insets" to b.insets?.toJson()) },
)

private fun BarInsets.toJson(): Map<String, Any?> =
    mapOf("statusDp" to statusDp, "navDp" to navDp, "source" to source.site, "kind" to source.kind, "sourceUrl" to url)

internal fun Map<String, Any?>.toSystemUi(): SystemUi? = SystemUi.parse(string("systemUi"))

internal fun Map<String, Any?>.toScreenSize(): ScreenSize? =
    ScreenSize.parse(string("size"), string("device"), this["folded"] == true, this["landscape"] == true, string("orientation"))

internal fun LastResult.toJson(): Map<String, Any?> = when (this) {
    is ShowResult -> toJson()
    is Settled -> toJson()
    is ReloadResult.CompileFailed -> toJson()
}

internal fun StaleReason.toJson(): Map<String, Any?> =
    mapOf("files" to files, "what" to what.text) + (message?.let { mapOf("message" to it.text) } ?: emptyMap()) +
        mapOf("remedy" to remedy.text, "since" to since) + if (pending) mapOf("pending" to true) else emptyMap()

internal fun Map<String, StaleReason>.staleJson(): Map<String, Any?> = mapValues { it.value.toJson() }

internal fun Work.toJson(): Map<String, Any?> = when (this) {
    is Work.Compiling -> mapOf("kind" to "compiling", "files" to files.map { it.path }, "by" to by)
    is Work.Rendering -> mapOf("kind" to "rendering", "preview" to preview.toJson(), "by" to by)
}
