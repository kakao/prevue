import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { Focus, Size, SystemUi, ViewerState } from '../state';
import { loadingView, zoomView } from '../workspace/view';
import { SystemBarsOverlay } from './SystemBars';
import { loadingHost, systemUiHost, WorkspacePanel, WorkspaceStage, zoomHost } from './WorkspaceShell';

// 한 장 — 기기를 손에 쥔 작업 공간(D-57). 이름 · 출구는 헤더가, 크기 · 기기 · 자세 · 확대는 무대 아래 가운데의 조작 독이 갖고(D-167)
// 무대는 창을 다 쓴다.
// 장면 · 무대 · 조작 독의 칸은 빌드가 index.html 에 미리 그린 정적 껍데기다(WorkspaceShell). 여기는 그 안팎에서 움직이는 것 —
// 확대 · 첫 장 대기 · 내비게이션 바 — 만 그린다.
export type WorkspaceActions = {
  exit(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomFit(): void;
  zoomMenuPick(z: string): void;
  /** byKey 면 키보드로 누른 것이다 — 메뉴를 닫을 때 포커스를 배율로 돌려준다. */
  toggleZoomMenu(byKey: boolean): void;
  pickSystemUi(choice: string): void;
};
export type WorkspaceHosts = { view: HTMLElement; panel: HTMLElement; systemUi: HTMLElement; bars: HTMLElement; zoom: HTMLElement; loading: HTMLElement };
export type WorkspaceHeaderHosts = { back: HTMLElement; title: HTMLElement };

const NO_ACTIONS: WorkspaceActions = { exit() {}, zoomIn() {}, zoomOut() {}, zoomFit() {}, zoomMenuPick() {}, toggleZoomMenu() {}, pickSystemUi() {} };

/** 첫 장을 기다리는 자리 표시 — 받지 못했으면 실패 문장. 그동안 조작 도구는 잠기고 출구(#back)는 남는다. */
export function WorkspaceLoading({ host }: { host?: HTMLElement }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const { on, failed } = useSyncExternalStore(loadingView.subscribe, loadingView.get);
  useLayoutEffect(() => {
    if (!element) return;
    element.hidden = !on;
    element.classList.toggle('failed', failed);
  }, [element, on, failed]);
  const body = <><span className="workspace-spinner" aria-hidden="true" /><span id="workspaceLoadingText">{phrase(failed ? 'workspace.loading.failed' : 'workspace.loading')}</span></>;
  return place(body, loadingHost);
}

const MINUS = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 8h8" /></svg>;
const PLUS = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 8h8M8 4v8" /></svg>;

/**
 * 확대는 늘 보인다(W4) — 숨은 제스처(핀치 · ⌘ + 휠)를 받치는 눈에 보이는 컨트롤. 조작 독의 오른쪽 끝이다(D-167). 배율의 100% 는 1dp = 1 CSS px(실제 크기)다.
 * 맞춤이 아니면 `맞춤` 단추가 폭이 자라며 살아나 처음 화면으로 돌린다 — 그래서 hidden 대신 클래스로 접는다. 메뉴는 그 위로 열린다.
 */
export function ZoomControls({ host, actions = NO_ACTIONS }: { host?: HTMLElement; actions?: WorkspaceActions }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const { pct, real, atFit, menu, disabled } = useSyncExternalStore(zoomView.subscribe, zoomView.get);
  useLayoutEffect(() => { element?.classList.toggle('at-fit', atFit); }, [element, atFit]);
  const body = <>
    <button type="button" id="zoomOutBtn" aria-label={phrase('zoom.out')} title={phrase('zoom.out.tip')} disabled={disabled} onClick={actions.zoomOut}>{MINUS}</button>
    <button type="button" id="zoomPct" className="z-pct" aria-haspopup="menu" aria-expanded={menu} disabled={disabled}
      title={phrase(real ? 'zoom.tip.real' : 'zoom.tip.fit')} onClick={e => actions.toggleZoomMenu(e.detail === 0)}>{pct}%</button>
    <button type="button" id="zoomInBtn" aria-label={phrase('zoom.in')} title={phrase('zoom.in.tip')} disabled={disabled} onClick={actions.zoomIn}>{PLUS}</button>
    <button type="button" id="zoomFitBtn" className="z-fit" title={phrase('zoom.fit.tip')} disabled={disabled}
      tabIndex={atFit ? -1 : 0} aria-hidden={atFit} onClick={actions.zoomFit}>{phrase('zoom.fit')}</button>
    <div className={menu ? 'zoom-menu on' : 'zoom-menu'} id="zoomMenu" role="menu">
      <button type="button" role="menuitem" data-z="fit" disabled={disabled} onClick={() => actions.zoomMenuPick('fit')}><span>{phrase('zoom.fit')}</span><kbd>0</kbd></button>
      <button type="button" role="menuitem" data-z="1" hidden={!real} disabled={disabled} onClick={() => actions.zoomMenuPick('1')}>{phrase('zoom.real')}</button>
      <button type="button" role="menuitem" data-z="2" disabled={disabled} onClick={() => actions.zoomMenuPick('2')}>200%</button>
    </div>
  </>;
  return place(body, zoomHost);
}

const BARS = <svg className="tb-ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5.5" y="2.5" width="9" height="15" rx="1.8" /><path d="M5.5 5.5h9M8.5 15h3" /></svg>;
/**
 * 시스템 UI(D-159 ①) — 상태바 · 내비바를 켜고 끄는 토글 하나. 처음 값은 어노테이션(`showSystemUi`)을 따른다. 누르면 데몬이 이 한 장의 spec 만
 * 덮어써 렌더러가 실제 바를 그리거나 뺀다 — 어노테이션과 같은 값으로 돌아오면 덮어쓰기를 걷고, 나가면 어노테이션대로다.
 * 인터랙티브가 아니면(systemUi 가 null) 숨고, 첫 장을 기다리는 동안은 잠긴다.
 */
export function SystemUiControl({ systemUi, host, actions = NO_ACTIONS }: { systemUi: SystemUi | null; host?: HTMLElement; actions?: WorkspaceActions }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const { on: waiting } = useSyncExternalStore(loadingView.subscribe, loadingView.get);
  useLayoutEffect(() => { if (element) element.hidden = !systemUi; }, [element, systemUi]);
  const shown = !!systemUi?.shown;
  const insets = shown ? systemUi?.bars?.insets : null;
  const tip = insets
    ? phrase('systemUi.tip.device', { status: insets.statusDp, nav: insets.navDp, source: insets.source }) + '\n' + phrase('systemUi.tip')
    : phrase('systemUi.tip');
  const flip = () => { if (systemUi) actions.pickSystemUi(!shown === systemUi.annotated ? 'annotated' : !shown ? 'on' : 'off'); };
  const body = <button type="button" id="sysUiBtn" className="tb-btn" aria-pressed={shown} aria-label={phrase('systemUi.label')} disabled={waiting} title={tip} onClick={flip}>
    {BARS}<span className="sys-lb">{phrase('systemUi.label')}</span><span className="sys-sep" aria-hidden="true">·</span><span className="sys-v">{phrase(shown ? 'systemUi.on' : 'systemUi.off')}</span>
  </button>;
  return place(body, systemUiHost);
}

/*
 * 제목 칸의 자리(D-63) — 가운데에 34%까지 서고, 모자라면 뒤로 버튼의 탭 이름부터 줄이고(iOS 내비게이션 바, 48px 아래면 이름을 뺀다),
 * 오른쪽 도구에 닿으면 왼쪽으로 비켜 선다. 34% 하나로 두면 1100px 아래에서 함수 이름 줄이 뒤로 버튼 밑으로, 긴 한 줄 제목이 알약 밑으로
 * 들어갔고, 가운데만 고집하면 반쪽 창(720px)에서 제목이 사라졌다. 좁은 창(줄에 흘러 놓임)은 재지 않는다.
 * offset* 로 잰다 — 들어올 때의 push(translate)는 크기를 안 바꿔 다시 재지 않으니, 그 사이에 재면 12px 이 남는다.
 */
const TITLE_GAP = 12, BACK_MIN = 48;
function fitTitle(back: HTMLElement, title: HTMLElement) {
  const backName = back.querySelector<HTMLElement>('#backName'), wsName = title.querySelector<HTMLElement>('#wsName'), wsFn = title.querySelector<HTMLElement>('#wsFn');
  const barL = back.parentElement, barR = document.getElementById('barR');
  if (!backName || !wsName || !wsFn || !barL || !barR) return;
  backName.style.maxWidth = ''; backName.style.display = '';
  if (title.hidden || !(title.offsetParent instanceof HTMLElement)) return;
  if (getComputedStyle(title).position !== 'absolute') { title.style.removeProperty('--ws-left'); title.style.removeProperty('--ws-max'); return; }
  const rowW = title.offsetParent.clientWidth, right = barR.offsetLeft - TITLE_GAP;
  const want = Math.min(Math.max(wsName.scrollWidth, wsFn.hidden ? 0 : wsFn.scrollWidth) + 1, rowW * 0.34);
  const at = Math.min(rowW / 2 - want / 2, right - want);
  const edge = () => { let r = 0; for (const el of barL.children) if (el instanceof HTMLElement && el.offsetParent) r = Math.max(r, barL.offsetLeft + el.offsetLeft + el.offsetWidth); return r + TITLE_GAP; };
  let left = edge();
  if (left > at && !back.hidden) {
    const keep = backName.offsetWidth - (left - at);
    if (keep < BACK_MIN) backName.style.display = 'none'; else backName.style.maxWidth = `${keep}px`;
    left = edge();
  }
  const x = Math.max(at, left), w = Math.max(0, Math.min(want, right - x));
  title.style.setProperty('--ws-left', `${x + w / 2}px`);
  title.style.setProperty('--ws-max', `${w}px`);
}

const BACK = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3.5 5.5 8l4.5 4.5" /></svg>;

/**
 * 헤더가 내비게이션 바가 된다(W2) — 앱 록업 · 파일 레일 · 보드 도구가 물러나고, 돌아갈 곳 · 이 장의 이름이 남는다.
 * 뒤로 버튼이 그 파일(탭 이름)을 갖는다 — FQN 으로 열어도 그 파일 보드 위의 한 장이라 늘 돌아갈 데가 있다(D-155).
 * 제목은 두 줄(D-63) — 위 프리뷰 이름(name=), 아래 함수 이름. 이름이 없으면 함수 이름 한 줄. 데몬이 구조로 싣는다 —
 * 카드 이름표를 잘라 쓰면 이름표 규칙이 바뀔 때마다 깨지고, 묶음의 다섯 장이 모두 `foldable`이면 어느 함수인지 안 남았다.
 */
export function WorkspaceHeader({ state, hosts, actions = NO_ACTIONS }: { state: ViewerState | null; hosts?: WorkspaceHeaderHosts; actions?: WorkspaceActions }) {
  const { phrase } = useMessages();
  const back = useHost(hosts?.back), title = useHost(hosts?.title);
  const f: Focus | null = state?.screen === 'focus' ? state.focus : null;
  const tab = f ? (state!.tabs || []).find(t => t.active) : undefined;
  const card = f && state?.board ? state.board.groups.flatMap(g => g.cards).find(c => c.index === state.board!.focus) : undefined;

  useLayoutEffect(() => {
    document.body.classList.toggle('ws', !!f);
    if (back.element) back.element.hidden = !f;
    if (title.element) { title.element.hidden = !f; title.element.title = f ? (card ? card.title : tab ? tab.title : f.previewId) : ''; }
    if (back.element && title.element) fitTitle(back.element, title.element);
  });
  // 내비게이션 바는 이 컴포넌트가 있는 동안만이다 — Storybook 에서 다음 스토리로 body.ws 가 새지 않게 걷는다.
  useLayoutEffect(() => () => document.body.classList.remove('ws'), []);
  // 창 폭 · 알약 글자가 바뀌면 자리가 움직인다. 뒤로 버튼은 보지 않는다 — 여기서 줄이므로 보면 줄일 때마다 다시 불린다.
  useLayoutEffect(() => {
    const b = back.element, t = title.element, row = b?.parentElement?.parentElement, right = document.getElementById('barR');
    if (!b || !t) return;
    const observer = new ResizeObserver(() => fitTitle(b, t));
    for (const el of [row, right]) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [back.element, title.element]);

  const backBody = <>{BACK}<span id="backName">{tab ? tab.name : phrase('nav.board')}</span></>;
  const titleBody = <><span className="ws-name" id="wsName">{f ? f.name || f.fn || f.previewId : ''}</span><span className="ws-fn" id="wsFn" hidden={!f?.name}>{f?.name ? f.fn : ''}</span></>;
  // 바깥 요소(#back)의 누름은 여기서 단다 — 마크업이 가진 버튼이라 안만 그리는 포털로는 onClick 을 달 수 없다.
  useLayoutEffect(() => {
    const b = back.element;
    if (!b) return;
    const exit = () => actions.exit();
    b.addEventListener('click', exit);
    return () => b.removeEventListener('click', exit);
  }, [back.element, actions]);
  return <>
    {back.place(backBody, (ref, body) => <button className="back" id="back" type="button" ref={ref}>{body}</button>)}
    {title.place(titleBody, (ref, body) => <div className="ws-title" id="wsTitle" ref={ref}>{body}</div>)}
  </>;
}

/**
 * 한 장의 배치 — 무대(장면 + 캔버스)와 그 아래 가운데의 조작 독. 진입 · 복귀의 틀 모프는 session.ts 가 고르고 focus.ts 가 띄운다.
 * 섹션의 hidden 은 같은 커밋의 레이아웃 효과에서 맞춘다 — session.ts 가 무대의 높이를 재는 것이 그 뒤다.
 * 뷰어에서는 껍데기가 이미 index.html 에 있어 움직이는 칸만 포털로 그리고, Storybook 에서는 껍데기째 그린다.
 */
export function Workspace({ screen, systemUi = null, size = null, hosts, actions = NO_ACTIONS }: {
  screen: ViewerState['screen'] | null; systemUi?: SystemUi | null; size?: Size | null; hosts?: WorkspaceHosts; actions?: WorkspaceActions;
}) {
  const { phrase } = useMessages();
  const [view, setView] = useState<HTMLElement | null>(null);
  const viewEl = hosts?.view ?? view;
  useLayoutEffect(() => { if (viewEl && screen !== null) viewEl.hidden = screen !== 'focus'; }, [screen, viewEl]);
  if (hosts) return <><WorkspaceLoading host={hosts.loading} /><SystemBarsOverlay systemUi={systemUi} size={size} host={hosts.bars} /><SystemUiControl systemUi={systemUi} host={hosts.systemUi} actions={actions} /><ZoomControls host={hosts.zoom} actions={actions} /></>;
  return <>
    <section id="focusView" ref={setView}><WorkspaceStage loading={<WorkspaceLoading />} bars={<SystemBarsOverlay systemUi={systemUi} size={size} />} /></section>
    <div className="panel" id="panel" role="toolbar" aria-label={phrase('panel.label')}><WorkspacePanel systemUi={<SystemUiControl systemUi={systemUi} actions={actions} />} zoom={<ZoomControls actions={actions} />} /></div>
  </>;
}
