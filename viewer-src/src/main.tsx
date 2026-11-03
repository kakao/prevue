import { post } from '../legacy/js/api.js';
import { moveCursor, openCursor } from '../legacy/js/board.js';
import { closeZoomMenu, exitFocus, toggleInteractive, zoomFit, zoomIn, zoomOut } from '../legacy/js/focus.js';
import { drawLegacy, startViewer } from '../legacy/js/main.js';
import { openQuickOpen } from '../legacy/js/quickopen.js';
import { store } from '../legacy/js/store.js';
import { daemonText, phrase } from '../legacy/js/strings.js';
import { jumpTab, stepTab, tabCount } from './components/FileRail';
import { closeDirPop } from './components/ProjectHeader';
import { helpOpen, toggleHelp } from './components/ShortcutHelp';
import { installShortcuts, shortcutTable, type ShortcutActions } from './shortcuts';
import { createViewerRoot, findHosts } from './ViewerRoot';

// 기존 모듈은 이 번들보다 먼저 평가된다(외부 import) — 그 모듈이 쥐는 바깥 요소는 index.html 에 있고, 안은 여기서 그린다.
const actions: ShortcutActions = {
  screen: () => store.st ? store.st.screen : 'offline',
  fromBoard: () => !!store.st?.focus?.fromBoard,
  tabCount, moveCursor, openCursor, exitFocus, toggleInteractive, zoomIn, zoomOut, zoomFit, stepTab, jumpTab, openQuickOpen, helpOpen, toggleHelp,
};
const shortcuts = shortcutTable(phrase, actions);
installShortcuts(shortcuts, actions, {
  chooserOpen: () => !!document.getElementById('chooser')?.classList.contains('on'),
  cancelChoice: () => { post('/viewer/cancel'); },
  closeZoomMenu,
  closeDirPop,
});
const viewer = createViewerRoot({ renderLegacy: drawLegacy, messages: { phrase, daemonText }, hosts: findHosts(), shortcuts });
startViewer(viewer.apply, viewer.connection);
