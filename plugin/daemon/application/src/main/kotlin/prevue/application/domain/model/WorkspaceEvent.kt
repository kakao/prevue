package prevue.application.domain.model

sealed interface WorkspaceEvent {
    data object NewTask : WorkspaceEvent
    data class Touched(val type: String, val by: String) : WorkspaceEvent
    data class TabEvicted(val tab: Tab) : WorkspaceEvent
    data object PreviewFilesChanged : WorkspaceEvent
    data object GalleryShotsChanged : WorkspaceEvent
    data class TabVacated(val tab: Tab) : WorkspaceEvent
    data object ProjectFilesChanged : WorkspaceEvent
}
