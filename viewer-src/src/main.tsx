import { post } from '../legacy/js/api.js';
import { boardMarks, moveCursor } from '../legacy/js/board.js';
import { pointCard } from '../legacy/js/board-point.js';
import { closeZoomMenu, enterFocus, exitFocus, toggleInteractive, zoomFit, zoomIn, zoomOut } from '../legacy/js/focus.js';
import { drawLegacy, startViewer } from '../legacy/js/main.js';
import { store } from '../legacy/js/store.js';
import { daemonText, phrase } from '../legacy/js/strings.js';
import { jumpTab, stepTab, tabCount } from './components/FileRail';
import { closeDirPop } from './components/ProjectHeader';
import { prepareViewer } from './preparation/PreparationScreen';
import { openQuickOpen, previewFilesChanged } from './components/QuickOpen';
import { helpOpen, toggleHelp } from './components/ShortcutHelp';
import { installShortcuts, shortcutTable, type ShortcutActions } from './shortcuts';
import { createViewerRoot, findHosts } from './ViewerRoot';

// 기존 모듈은 이 번들보다 먼저 평가된다(외부 import) — 그 모듈이 쥐는 바깥 요소는 index.html 에 있고, 안은 여기서 그린다.
// 준비 화면은 첫 상태보다 먼저 서서 본문을 막는다. 그 상태는 기존 화면이 보드를 다 놓은 뒤에 읽는다 — 가운데 카드를 배치로 고른다.
const preparation = prepareViewer();
const renderLegacy = (state: Parameters<typeof drawLegacy>[0]) => { drawLegacy(state); preparation?.update(state); };
const openCursor = () => { const { cursor } = boardMarks(); if (cursor != null) enterFocus(cursor); };
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
const viewer = createViewerRoot({ renderLegacy, messages: { phrase, daemonText }, hosts: findHosts(), shortcuts, board: { open: enterFocus, point: pointCard } });
startViewer(viewer.apply, viewer.connection, previewFilesChanged, preparation);

// 옛 카드 거르기의 검색어(파일별) — 거르기가 없어졌으니 한 번 치운다.
try { for (const k of Object.keys(localStorage)) if (k.startsWith('prevue.search:')) localStorage.removeItem(k); } catch { /* 못 치워도 쓰이지 않는다 */ }
