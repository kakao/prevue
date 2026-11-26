import { useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { get } from './runtime/api';
import { BuildNotice } from './components/BuildNotice';
import { FileRail, type RailHosts } from './components/FileRail';
import { Gallery, GalleryEntry } from './components/Gallery';
import { useGalleryShown, useLayer } from './gallery/layer';
import { ProjectHeader, type AppInfo } from './components/ProjectHeader';
import { HelpButton, ShortcutHelp } from './components/ShortcutHelp';
import { NotificationCapsule } from './components/NotificationCapsule';
import { PreviewBoard, type BoardActions, type BoardHosts } from './components/PreviewBoard';
import { QuickOpen, type QuickOpenHosts } from './components/QuickOpen';
import { StaleBanner } from './components/StaleBanner';
import { StatusPill } from './components/StatusPill';
import { ChoicePopover, PointOverlay, type PointActions } from './components/PointOverlay';
import { VacantTab } from './components/VacantTab';
import { Workspace, WorkspaceHeader, type WorkspaceActions, type WorkspaceHeaderHosts, type WorkspaceHosts } from './components/Workspace';
import { MessagesContext, type Messages } from './messages';
import type { Connection } from './session';
import type { ShortcutGroup } from './shortcuts';
import type { SceneDock } from './runtime/resize-scene';
import type { ViewerState } from './state';

export type Hosts = {
  bar: HTMLElement; brand: HTMLElement; app: HTMLElement; status: HTMLElement; helpButton: HTMLElement;
  rail: RailHosts; railAll: HTMLElement; gallery: HTMLElement; stale: HTMLElement; buildNotice: HTMLElement; board: BoardHosts; quickOpen: QuickOpenHosts; capsule: HTMLElement; help: HTMLElement;
  vacant: HTMLElement; workspace: WorkspaceHosts; workspaceHeader: WorkspaceHeaderHosts; chooser: HTMLElement;
};

export function findHosts(): Hosts {
  const $ = (id: string) => document.getElementById(id)!;
  return {
    bar: $('bar'), brand: $('brand'), app: $('app'), status: $('status'), helpButton: $('helpBtn'),
    rail: { rail: $('rail'), list: $('railList'), empty: $('railEmpty'), open: $('railOpen'), all: $('railAll'), toggle: $('railToggle'), scrim: $('railScrim') },
    railAll: $('railAll'), gallery: $('galleryView'),
    stale: $('staleBar'), buildNotice: $('buildNotice'), board: { view: $('boardView'), cards: $('cards') },
    quickOpen: { sheet: $('qoSheet'), curtain: $('qoCurtain') }, capsule: $('strip'), help: $('help'),
    vacant: $('vacantView'), workspace: { view: $('focusView'), panel: $('panel'), menu: $('pnFold'), posture: $('devCtl'), sliders: $('pnSl'), systemUi: $('sysUiCtl'), inset: $('insetOverlay'), insetMarks: $('insetMarks'), zoom: $('zoomCtl'), loading: $('workspaceLoading') }, workspaceHeader: { back: $('back'), title: $('wsTitle') }, chooser: $('chooser'),
  };
}

export function ViewerRoot({ state, draw = 0, statusState = state, connection = null, app = null, shortcuts = [], hosts, board, workspace, dock, point, afterCommit }: {
  state: ViewerState | null;
  draw?: number;
  statusState?: ViewerState | null;
  connection?: Connection | null;
  app?: AppInfo | null;
  shortcuts?: ShortcutGroup[];
  hosts?: Hosts;
  board?: BoardActions;
  workspace?: WorkspaceActions;
  dock?: SceneDock;
  point?: PointActions;
  afterCommit: (state: ViewerState) => void;
}) {
  useLayoutEffect(() => { if (state) afterCommit(state); }, [draw]);
  const gallery = useGalleryShown(state, connection);
  const { files, ready } = useLayer();
  const screen = gallery ? 'gallery' : state?.screen ?? null;
  if (!hosts) return null;
  return <>
    <ProjectHeader header={state?.header ?? null} tabs={state?.tabs ?? []} app={app} host={hosts.app} brand={hosts.brand} />
    <StatusPill state={statusState} connection={connection} host={hosts.status} bar={hosts.bar} />
    <HelpButton host={hosts.helpButton} />
    <FileRail tabs={state?.tabs ?? null} screen={state?.screen ?? null} gallery={gallery} hosts={hosts.rail} />
    <GalleryEntry on={gallery} count={ready ? files?.length ?? null : null} host={hosts.railAll} />
    <StaleBanner rows={state?.stale ?? null} host={hosts.stale} />
    <BuildNotice pending={!!state?.buildPending} host={hosts.buildNotice} />
    <Gallery shown={gallery} state={state} draw={draw} host={hosts.gallery} />
    <PreviewBoard board={state?.board ?? null} screen={screen} hosts={hosts.board} actions={board} />
    <QuickOpen state={state} draw={draw} connection={connection} hosts={hosts.quickOpen} />
    <VacantTab screen={screen} vacant={state?.vacant ?? null} host={hosts.vacant} />
    <Workspace screen={state?.screen ?? null} systemUi={state?.focus?.systemUi ?? null} deviceInsets={state?.focus?.deviceInsets ?? null} size={state?.focus?.size ?? null} hosts={hosts.workspace} actions={workspace} dock={dock} />
    <WorkspaceHeader state={state} hosts={hosts.workspaceHeader} actions={workspace} />
    <PointOverlay actions={point} />
    <ChoicePopover choice={state?.choice ?? null} repo={state?.header?.repo} host={hosts.chooser} actions={point} />
    <NotificationCapsule host={hosts.capsule} />
    <ShortcutHelp table={shortcuts} host={hosts.help} />
  </>;
}

export function createViewerRoot({ afterCommit, messages, hosts, shortcuts, board, workspace, dock, point }: {
  afterCommit: (state: ViewerState) => void;
  messages: Messages;
  hosts: Hosts;
  shortcuts: ShortcutGroup[];
  board: BoardActions;
  workspace: WorkspaceActions;
  dock: SceneDock;
  point: PointActions;
}) {
  const container = document.createElement('div');
  container.hidden = true;
  document.body.append(container);
  const root = createRoot(container);
  let state: ViewerState | null = null, statusState: ViewerState | null = null, connection: Connection | null = null, app: AppInfo | null = null, draw = 0;
  const render = () => root.render(<MessagesContext.Provider value={messages}>
    <ViewerRoot state={state} draw={draw} statusState={statusState} connection={connection} app={app} shortcuts={shortcuts} hosts={hosts} board={board} workspace={workspace} dock={dock} point={point} afterCommit={afterCommit} />
  </MessagesContext.Provider>);
  flushSync(render);
  get('/app.json').then(r => r.json()).then((a: AppInfo) => { app = a; render(); }).catch(() => { app = {}; render(); });
  return {
    apply(next: ViewerState, holdStatus = false) {
      state = next;
      if (!holdStatus || !statusState) statusState = next;
      draw++;
      flushSync(render);
    },
    connection(next: Connection) { connection = next; flushSync(render); },
    dispose() { root.unmount(); container.remove(); },
  };
}
