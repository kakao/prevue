package prevue.daemon.domain.model

sealed interface WorkspaceEvent {
    data object NewTask : WorkspaceEvent
    /** 정착을 기다리지 않는 터치를 넣었다. 그림은 프레임 스트림이 민다 — 누가 넣었든(뷰어 · `prevue touch --no-settle`) 스트림을 깨운다. */
    data class Touched(val type: String, val by: String) : WorkspaceEvent
    /** 상한을 넘어 가장 오래 안 본 탭을 닫았다 — 사람에게 한 줄 알린다. */
    data class TabEvicted(val tab: Tab) : WorkspaceEvent
    /** D-56. 열 수 있는 프리뷰 파일 목록이 바뀌었다(파일이 생기거나 없어지거나 프리뷰 함수가 바뀜). 저장마다 바뀌는 mtime만으로는 내지 않는다. */
    data object PreviewFilesChanged : WorkspaceEvent
    /** 지금 탭의 파일이 그릴 것을 잃었다([Tab.vacant]) — 사람에게 한 번 알린다. 같은 까닭이 이어지면 다시 내지 않는다. */
    data class TabVacated(val tab: Tab) : WorkspaceEvent
    /** 소스 파일 색인이 바뀌었다(파일이 생기거나 없어짐). 뷰어가 트리를 거르는 목록을 다시 받는다. */
    data object ProjectFilesChanged : WorkspaceEvent
}
