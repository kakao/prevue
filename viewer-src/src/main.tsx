import { boardMarks, moveCursor } from './runtime/board';
import { daemonText, phrase } from './runtime/strings';
import { jumpTab, stepTab, tabCount } from './components/FileRail';
import type { PointActions } from './components/PointOverlay';
import { closeDirPop } from './components/ProjectHeader';
import type { WorkspaceActions } from './components/Workspace';
import { prepareViewer } from './preparation/PreparationScreen';
import { openQuickOpen, previewFilesChanged } from './components/QuickOpen';
import { helpOpen, toggleHelp } from './components/ShortcutHelp';
import { drawScreens, startViewer } from './session';
import { installShortcuts, shortcutTable, type ShortcutActions } from './shortcuts';
import { store } from './runtime/store';
import type { ViewerState } from './state';
import { createViewerRoot, findHosts } from './ViewerRoot';
import { createWorkspace, enterFocus, exitFocus, findWorkspaceParts, pickSystemUi } from './workspace/focus';
import { cancelChoice, choose, clearPick, closeCard, followChooser, forgetPreviewIndex, jump, peekRow, pickRow, pointCard, watchBlankClicks } from './workspace/point';

// 남은 기존 모듈(api · store · board · capsule · motion · strings)은 이 번들보다 먼저 평가된다(외부 import). 그 모듈들은 DOM 을 쥐지 않는다.
// 준비 화면은 첫 상태보다 먼저 서서 본문을 막는다. 그 상태는 화면이 보드를 다 놓은 뒤에 읽는다 — 가운데 카드를 배치로 고른다.
const preparation = prepareViewer();
// 한 장의 요소는 빌드가 index.html 에 미리 그린 껍데기라 처음부터 있다 — 작업 공간을 먼저 만들어 React 루트와 연결에 넘긴다.
const workspace = createWorkspace(findWorkspaceParts());
const renderScreens = (state: ViewerState) => { drawScreens(state); preparation?.update(state); };
const openCursor = () => { const { cursor } = boardMarks(); if (cursor != null) enterFocus(cursor); };
const workspaceActions: WorkspaceActions = {
  exit: exitFocus,
  zoomIn: workspace.zoomIn, zoomOut: workspace.zoomOut, zoomFit: workspace.zoomFit,
  zoomMenuPick: workspace.zoomMenuPick, toggleZoomMenu: workspace.toggleZoomMenu,
  pickSystemUi,
};
const pointActions: PointActions = { choose, cancel: cancelChoice, follow: followChooser, pick: pickRow, peek: peekRow, jump, close: clearPick };
watchBlankClicks();
const actions: ShortcutActions = {
  screen: () => store.st ? store.st.screen : 'offline',
  tabCount, moveCursor, openCursor, exitFocus, stepTab, jumpTab, openQuickOpen, helpOpen, toggleHelp,
  zoomIn: workspaceActions.zoomIn, zoomOut: workspaceActions.zoomOut, zoomFit: workspaceActions.zoomFit,
};
const shortcuts = shortcutTable(phrase, actions);
installShortcuts(shortcuts, actions, {
  chooserOpen: () => !!document.getElementById('chooser')?.classList.contains('on'),
  cancelChoice,
  closeZoomMenu: workspace.closeZoomMenu,
  closeDeviceMenu: workspace.closeDeviceMenu,
  closeDirPop,
  closeCard,
});
const viewer = createViewerRoot({ renderLegacy: renderScreens, messages: { phrase, daemonText }, hosts: findHosts(), shortcuts,
  board: { open: enterFocus, point: pointCard }, workspace: workspaceActions, point: pointActions });
startViewer({ workspace, render: viewer.apply, onConnection: viewer.connection, onPreviewFiles: () => { previewFilesChanged(); forgetPreviewIndex(); }, prepared: preparation });

/*
 * 마우스로 누른 버튼은 포커스를 쥐지 않는다(D-63) — Chromium 은 누른 버튼에 포커스를 줘서, 다음 Enter(고른 카드 열기)를
 * 그 버튼이 가져갔다(도움말이 다시 열렸다). 레일의 줄 · 닫기 · 파일 열기도 같다. Safari 는 처음부터 주지 않는다. 키보드(Tab → Enter · Space)는 그대로다.
 * 빠른 열기 줄과 같은 수법이고, 글자를 고르는 자리(폴더 경로)는 버튼이 아니라 그대로 고를 수 있다.
 */
for (const id of ['bar', 'rail', 'panel', 'strip', 'chooser']) {
  document.getElementById(id)?.addEventListener('mousedown', e => { if (e.button === 0 && (e.target as Element).closest('button, [role=button]')) e.preventDefault(); });
}

// 옛 카드 거르기의 검색어(파일별) — 거르기가 없어졌으니 한 번 치운다.
try { for (const k of Object.keys(localStorage)) if (k.startsWith('prevue.search:')) localStorage.removeItem(k); } catch { /* 못 치워도 쓰이지 않는다 */ }
