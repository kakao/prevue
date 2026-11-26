import { boardMarks, moveCursor } from './runtime/board';
import { daemonText, phrase } from './runtime/strings';
import { closeRailDrawer, jumpTab, stepTab, tabCount } from './components/FileRail';
import type { PointActions } from './components/PointOverlay';
import { closeDirPop } from './components/ProjectHeader';
import type { WorkspaceActions } from './components/Workspace';
import { prepareViewer } from './preparation/PreparationScreen';
import { openQuickOpen, previewFilesChanged } from './components/QuickOpen';
import { closeSheet, currentLayer, galleryFilesChanged, galleryShown, loadFiles, openGallery, sheetOpen } from './gallery/layer';
import { helpOpen, toggleHelp } from './components/ShortcutHelp';
import { drawScreens, startViewer } from './session';
import { installShortcuts, shortcutTable, type ShortcutActions } from './shortcuts';
import { store } from './runtime/store';
import type { ViewerState } from './state';
import { createViewerRoot, findHosts } from './ViewerRoot';
import { createWorkspace, enterFocus, exitFocus, findWorkspaceParts, pickSystemUi } from './workspace/focus';
import { cancelChoice, choose, clearPick, closeCard, followChooser, forgetPreviewIndex, jump, peekRow, pickRow, pointCard, watchBlankClicks } from './workspace/point';

const preparation = prepareViewer();
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
  screen: () => !store.st ? 'offline' : galleryShown() ? 'gallery' : store.st.screen,
  tabCount, moveCursor, openCursor, exitFocus, openGallery, stepTab, jumpTab, openQuickOpen, helpOpen, toggleHelp,
  zoomIn: workspaceActions.zoomIn, zoomOut: workspaceActions.zoomOut, zoomFit: workspaceActions.zoomFit,
};
const shortcuts = shortcutTable(phrase, actions);
installShortcuts(shortcuts, actions, {
  chooserOpen: () => !!document.getElementById('chooser')?.classList.contains('on'),
  cancelChoice,
  closeZoomMenu: workspace.closeZoomMenu,
  closeDeviceMenu: workspace.closeDeviceMenu,
  closeDirPop,
  closeRailDrawer,
  closeCard,
  closeSheet,
  sheetOpen,
  openSheetFile: () => { if (!currentLayer().sheet?.closing) document.querySelector<HTMLElement>('#galleryView .gsheet-go')?.click(); },
});
const viewer = createViewerRoot({ afterCommit: renderScreens, messages: { phrase, daemonText }, hosts: findHosts(), shortcuts,
  board: { open: enterFocus, point: pointCard }, workspace: workspaceActions, dock: workspace.dock, point: pointActions });
startViewer({ workspace, render: viewer.apply, onConnection: viewer.connection, onPreviewFiles: () => { previewFilesChanged(); loadFiles(); forgetPreviewIndex(); }, onGalleryShots: galleryFilesChanged, onStreamOpen: loadFiles, prepared: preparation });

for (const id of ['bar', 'rail', 'panel', 'strip', 'chooser']) {
  document.getElementById(id)?.addEventListener('mousedown', e => { if (e.button === 0 && (e.target as Element).closest('button, [role=button]')) e.preventDefault(); });
}

try { for (const k of Object.keys(localStorage)) if (k.startsWith('prevue.search:')) localStorage.removeItem(k); } catch { /* 못 치워도 쓰이지 않는다 */ }
