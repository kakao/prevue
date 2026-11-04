import { useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { get } from '../legacy/js/api.js';
import type { Connection } from '../legacy/js/main.js';
import { FileRail, type RailHosts } from './components/FileRail';
import { ProjectHeader, type AppInfo } from './components/ProjectHeader';
import { HelpButton, ShortcutHelp } from './components/ShortcutHelp';
import { NotificationCapsule } from './components/NotificationCapsule';
import { PreviewBoard, type BoardActions, type BoardHosts } from './components/PreviewBoard';
import { QuickOpen, type QuickOpenHosts } from './components/QuickOpen';
import { StaleBanner } from './components/StaleBanner';
import { StatusPill } from './components/StatusPill';
import { MessagesContext, type Messages } from './messages';
import type { ShortcutGroup } from './shortcuts';
import type { ViewerState } from './state';

/** index.html 이 두는 영역의 바깥 요소 — 기존 모듈이 처음부터 쥐는 요소가 그 안에 섞여 있어 바깥은 마크업이 갖는다. */
export type Hosts = {
  bar: HTMLElement; brand: HTMLElement; app: HTMLElement; status: HTMLElement; helpButton: HTMLElement;
  rail: RailHosts; stale: HTMLElement; board: BoardHosts; quickOpen: QuickOpenHosts; capsule: HTMLElement; help: HTMLElement;
};

export function findHosts(): Hosts {
  const $ = (id: string) => document.getElementById(id)!;
  return {
    bar: $('bar'), brand: $('brand'), app: $('app'), status: $('status'), helpButton: $('helpBtn'),
    rail: { rail: $('rail'), list: $('railList'), empty: $('railEmpty'), open: $('railOpen') },
    stale: $('staleBar'), board: { view: $('boardView'), cards: $('cards') },
    quickOpen: { sheet: $('qoSheet'), curtain: $('qoCurtain'), start: $('startView') }, capsule: $('strip'), help: $('help'),
  };
}

export function ViewerRoot({ state, draw = 0, statusState = state, connection = null, app = null, shortcuts = [], hosts, board, renderLegacy }: {
  state: ViewerState | null;
  /** apply 한 번에 하나씩 는다 — 기존 화면은 apply 마다 한 번만 그린다(앱 정보가 늦게 와도 다시 그리지 않는다). */
  draw?: number;
  statusState?: ViewerState | null;
  connection?: Connection | null;
  app?: AppInfo | null;
  shortcuts?: ShortcutGroup[];
  hosts?: Hosts;
  board?: BoardActions;
  renderLegacy: (state: ViewerState) => void;
}) {
  // 기존 영역은 기존 JS만 쓴다. React 가 맡은 영역은 자식이라 그 효과가 먼저 돈다 — 헤더 · 레일이 기존 화면보다 먼저 자리를 잡는다.
  useLayoutEffect(() => { if (state) renderLegacy(state); }, [draw]);
  if (!hosts) return null;
  return <>
    <ProjectHeader header={state?.header ?? null} tabs={state?.tabs ?? []} app={app} host={hosts.app} brand={hosts.brand} />
    <StatusPill state={statusState} connection={connection} host={hosts.status} bar={hosts.bar} />
    <HelpButton host={hosts.helpButton} />
    <FileRail tabs={state?.tabs ?? null} screen={state?.screen ?? null} hosts={hosts.rail} />
    <StaleBanner rows={state?.stale ?? null} host={hosts.stale} />
    {/* 레일이 접히고 펴진 뒤에 잰다 — 보드의 배율은 레일을 뺀 폭으로 정한다. */}
    <PreviewBoard board={state?.board ?? null} screen={state?.screen ?? null} hosts={hosts.board} actions={board} />
    {/* 빈 화면은 시작 화면이 갖는다. 팔레트는 새 화면을 그리는 이 커밋에서 걷힌다. */}
    <QuickOpen state={state} draw={draw} connection={connection} hosts={hosts.quickOpen} />
    <NotificationCapsule host={hosts.capsule} />
    <ShortcutHelp table={shortcuts} host={hosts.help} />
  </>;
}

export function createViewerRoot({ renderLegacy, messages, hosts, shortcuts, board }: {
  renderLegacy: (state: ViewerState) => void;
  messages: Messages;
  hosts: Hosts;
  shortcuts: ShortcutGroup[];
  board: BoardActions;
}) {
  const container = document.createElement('div');
  container.hidden = true;
  document.body.append(container);
  const root = createRoot(container);
  let state: ViewerState | null = null, statusState: ViewerState | null = null, connection: Connection | null = null, app: AppInfo | null = null, draw = 0;
  const render = () => root.render(<MessagesContext.Provider value={messages}>
    <ViewerRoot state={state} draw={draw} statusState={statusState} connection={connection} app={app} shortcuts={shortcuts} hosts={hosts} board={board} renderLegacy={renderLegacy} />
  </MessagesContext.Provider>);
  // 끊김은 상태가 오기 전에도 알린다 — 첫 상태를 기다리지 않고 바로 붙인다.
  flushSync(render);
  // 대상 앱의 런처 아이콘과 이름(B1 · H12) — 폰에서 보이는 그대로. 데몬 하나가 앱 하나라 한 번만 묻는다.
  get('/app.json').then(r => r.json()).then((a: AppInfo) => { app = a; render(); }).catch(() => { app = {}; render(); });
  return {
    apply(next: ViewerState, holdStatus = false) {
      state = next;
      if (!holdStatus || !statusState) statusState = next;
      draw++;
      // View Transition의 새 화면 스냅숏 전에 기존 영역도 함께 커밋한다.
      flushSync(render);
    },
    connection(next: Connection) { connection = next; flushSync(render); },
    dispose() { root.unmount(); container.remove(); },
  };
}
