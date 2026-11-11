import type { ReactNode, Ref } from 'react';
import { useMessages } from '../messages';

// 한 장의 정적 껍데기 — 장면 · 무대 · 조작 독의 칸. 번들 밖의 resize-scene.js 와 workspace/focus.ts 가 이 요소들을 쥐고 계속 고친다.
// 그래서 런타임의 React 는 이것을 그리지 않는다: 빌드가 이 JSX 를 index.html 에 미리 그려 넣고(src/prerender.tsx), 접기 하네스(tests/viewer/fold.mjs)도
// 그 마크업을 그대로 읽는다. 런타임 React 는 그 안의 바깥 요소(#zoomCtl · #workspaceLoading)에 움직이는 부분만 포털로 그린다. Storybook 은 이 JSX 를 그대로 그린다.
// 글은 data-t · data-t-<속성>으로도 단다 — 미리 그릴 때는 언어를 몰라 비워 두고, 페이지에서 strings.js 가 사전 문장으로 채운다.
function useT() {
  const { phrase } = useMessages();
  return {
    text: (key: string) => ({ 'data-t': key, children: phrase(key) }),
    title: (key: string) => ({ 'data-t-title': key, title: phrase(key) }),
    label: (key: string) => ({ 'data-t-aria-label': key, 'aria-label': phrase(key) }),
  };
}

/** 기기 한 대의 층 — 몸체 · 윤곽 · 화면(두 그림 사이의 베일) · 치수 눈금. 크기를 바꿀 때 #ua · #ub 가 엇갈린다. */
const Unit = ({ id, hidden }: { id: string; hidden?: boolean }) => <div className="unit" id={id} hidden={hidden}>
  <div className="btn" /><div className="btn" /><div className="btn" /><div className="btn" /><div className="btn" />
  <div className="shell" /><div className="outline" />
  <div className="stage"><img className="ly l0" alt="" /><div className="veil" /><img className="ly l1" alt="" /><div className="crease" /><div className="cam" /></div>
  <div className="tick t-top" /><div className="tick t-bot" />
</div>;

/** 치수선 — 지금 폭 · 높이를 읽고, 커스텀이면 숫자를 고친다. 자리 · 값 · 잠금은 resize-scene.js 가 쓴다. */
export function Ruler() {
  const t = useT();
  return <div className="ruler" id="ruler" hidden>
    <svg aria-hidden="true"><path className="ext" id="rlExt" /><path className="dim" id="rlDim" /></svg>
    <input className="rl-badge" id="rlW" type="text" inputMode="numeric" maxLength={4} {...t.label('size.w.label')} {...t.title('size.w.tip')} />
    <input className="rl-badge" id="rlH" type="text" inputMode="numeric" maxLength={4} {...t.label('size.h.label')} {...t.title('size.h.tip')} />
  </div>;
}

/** 크기 · 회전 · 접기 전환의 틀과 그림. 접는 기기는 #rig(책처럼) · #duo(조개처럼)가 맡는다. */
export function ResizeScene() {
  return <div className="resize-scene" id="resizeScene" hidden><div className="resize-geometry" id="resizeGeometry">
    <Unit id="ua" /><Unit id="ub" hidden />
    <Ruler />
    <div className="duo" id="duo" hidden>
      <div className="duo-base"><div className="duo-band" /><div className="duo-scr"><img className="ly" alt="" /><div className="cam" /></div></div>
      <div className="btn" /><div className="btn" />
      <svg className="duo-edge" aria-hidden="true">
        {/* 세 색은 resize.css 의 그림 블록이 준다 — 크롬의 JSX style 에는 그림 토큰을 쓰지 않는다. */}
        <defs><path id="duoSide" /><path id="duoHinge" /><linearGradient id="duoSheen" gradientUnits="userSpaceOnUse"><stop offset="0" /><stop offset=".4" /><stop offset="1" /></linearGradient></defs>
        <use className="outl" href="#duoSide" /><use className="houtl" href="#duoHinge" /><use className="rim" href="#duoSide" /><use className="rimhi" href="#duoSide" /><use className="body" href="#duoSide" />
        <use className="sheen" href="#duoSide" stroke="url(#duoSheen)" /><use className="hinge" href="#duoHinge" /><use className="hsheen" href="#duoHinge" stroke="url(#duoSheen)" /><use className="ring" href="#duoSide" /><use className="ring hr" href="#duoHinge" />
      </svg>
      <div className="duo-flap"><div className="duo-face" /><div className="duo-dark" /></div>
    </div>
    <div className="rig" id="rig" hidden>
      <div className="lift">
        <div className="plate" />
        <div className="base">
          <div className="clip"><img className="ly old" alt="" /><div className="veil" /><img className="ly neu" alt="" /><div className="cast" /><div className="cam" /></div>
          <div className="edge bez" /><div className="edge ring" />
        </div>
        <div className="leaf">
          <div className="clip face inner"><img className="ly old" alt="" /><div className="veil" /><img className="ly neu" alt="" /><div className="shade" /><div className="sheen" /><div className="cam" /></div>
          <div className="clip face outer"><img className="ly old" alt="" /><div className="veil" /><img className="ly neu" alt="" /><div className="shade" /><div className="sheen" /><div className="cam" /></div>
          <div className="edge bez" /><div className="edge ring" />
        </div>
        <div className="crease" />
        <div className="tick r-top" /><div className="tick r-bot" />
      </div>
    </div>
  </div></div>;
}

/** 첫 장 대기 표시의 바깥 요소 — 안과 hidden · failed 는 WorkspaceLoading 이 맞춘다. */
export const loadingHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="workspace-loading" id="workspaceLoading" role="status" hidden ref={ref}>{children}</div>;
/** 기기별 바를 덧그리는 층 — 그림 위, 가리키기 표시 아래. 안과 hidden 은 SystemBarsOverlay 가 맞춘다. */
export const systemBarsHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="sys-bars" id="sysBars" aria-hidden="true" hidden ref={ref}>{children}</div>;
/** 인셋 영역을 덧그리는 층 — 바 위, 가리키기 표시 아래. 안과 hidden 은 InsetOverlay 가 맞춘다. */
export const insetOverlayHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="inset-overlay" id="insetOverlay" aria-hidden="true" hidden ref={ref}>{children}</div>;
/** 인셋 범례 — 무대 왼쪽 위, 그림 밖. 안과 hidden 은 InsetLegend 가 맞춘다. */
export const insetLegendHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="inset-legend" id="insetLegend" hidden ref={ref}>{children}</div>;

/** 시스템 UI 의 바깥 요소 — 독의 가운데 조작과 확대 사이. 안과 hidden 은 SystemUiControl 이 맞춘다. */
export const systemUiHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="sys-ui" id="sysUiCtl" role="group" data-t-aria-label="systemUi.label" hidden ref={ref}>{children}</div>;
/** 확대의 바깥 요소 — 독의 오른쪽 끝. 안과 at-fit 은 ZoomControls 가 맞춘다. */
export const zoomHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="zoom at-fit" id="zoomCtl" role="group" data-t-aria-label="zoom.label" ref={ref}>{children}</div>;

/**
 * 정지 그림 · 스트림을 보이는 무대. 그림의 src 는 JSX 가 갖지 않는다 — focus.ts 가 크로스페이드 · 스트림 붙이기로 갈아 끼운다.
 * #shot 은 늘 붙어 있다 — 다시 붙이면 MJPEG 연결이 새로 열리고, WebKit 은 옛 연결을 닫지 않는다.
 */
export function PreviewStage({ loading = loadingHost(), bars = systemBarsHost(), inset = insetOverlayHost() }: { loading?: ReactNode; bars?: ReactNode; inset?: ReactNode }) {
  return <div className="stage" id="stage">
    <img id="shot" alt="preview" />
    {loading}
    {/* 그림 위 표시 — 구조 테두리(#marks) · 손 아래 옅은 바탕(#box) · 고른 노드(#pickBox). workspace/point.ts 가 그린다. 카드는 그림 밖 #focusView 에 뜬다. */}
    {bars}
    {inset}
    <div className="marks" id="marks" aria-hidden="true" /><div className="box" id="box" /><div className="box pick" id="pickBox" hidden />
  </div>;
}

/** 무대 — 장면(기기 틀)과 캔버스. 조작 중에는 workspace/resize.ts 가 캔버스(#stage)를 장면의 틀 안으로 옮긴다. */
export function WorkspaceStage({ loading, bars, inset, legend = insetLegendHost() }: { loading?: ReactNode; bars?: ReactNode; inset?: ReactNode; legend?: ReactNode }) {
  return <div className="wrap"><ResizeScene /><PreviewStage loading={loading} bars={bars} inset={inset} />{legend}</div>;
}

/** 커스텀일 때만 조작 독 가운데에 뜬다. 끄는 동안은 틀만 따라오고 놓을 때 한 번 그린다(D-99). 눈금 위치 · 값은 resize-scene.js 가 잡는다. */
export function CustomSizeSliders() {
  const t = useT();
  const slider = (axis: 'w' | 'h', label: string, ticks: number[]) => <div className="sl" data-axis={axis}>
    <div className="sl-h"><span id={axis === 'w' ? 'slWLb' : 'slHLb'} {...t.text(label)} /><span className="v"><b /><small>dp</small></span></div>
    <div className="sl-track"><span className="fill" />
      {ticks.map(v => <span className="tick" data-v={v} key={v}><i /><em>{v}</em></span>)}
      <span className="thumb" role="slider" tabIndex={0} aria-labelledby={axis === 'w' ? 'slWLb' : 'slHLb'} aria-valuemin={240} aria-valuemax={1600} />
    </div>
  </div>;
  return <div className="pn-sl" id="pnSl" role="group" {...t.label('size.custom.label')} hidden>
    {slider('w', 'size.w', [600, 840])}
    {slider('h', 'size.h', [480, 900])}
  </div>;
}

/** 원래 크기 · 프리셋 · 커스텀 · 기기. 칸 이름 · 윤곽 · dp 는 resize-scene.js 가 기기 표에서 채운다(커스텀의 data-t 는 그 장면이 읽는다). */
export function SizePicker() {
  const t = useT();
  const pick = (sel: string, tip?: string, children?: ReactNode, mono = false) =>
    <button className={mono ? 'pn-it mono' : 'pn-it'} type="button" role="radio" data-sel={sel} key={sel} {...(tip ? t.title(tip) : {})}>{children}</button>;
  return <div className="pn-pick" id="pnPick" role="radiogroup" {...t.label('panel.pick')}>
    <section className="pn-sec"><h4 className="pn-h" {...t.text('panel.size')} />
      <div className="pn-list">
        {pick('original', 'size.original.tip', '@Preview', true)}
        {pick('narrow', 'size.narrow.tip', '320×640')}
        {pick('foldable', 'size.foldable.tip', '673×841')}
        <button className="pn-it" type="button" role="radio" data-sel="custom" {...t.title('size.custom.tip')} {...t.text('size.custom')} />
      </div>
    </section>
    <section className="pn-sec"><h4 className="pn-h" {...t.text('panel.device')} />
      <div className="pn-list">
        <h5 className="pn-g">Android</h5>
        {['s26', 'pixel9', 'fold8', 'ultra', 'pixelfold', 'tablet'].map(sel => pick(sel))}
        <h5 className="pn-g">iPhone</h5>
        {['ip17', 'ipair', 'ip17pm', 'ipduo'].map(sel => pick(sel))}
      </div>
    </section>
  </div>;
}

const icon = (d: ReactNode) => <svg className="tb-ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const ROTATE = icon(<><rect x="6.5" y="3" width="7" height="12" rx="1.5" /><path d="M16.5 9.5a6.5 6.5 0 0 1-3.2 5.6M15.4 17.2l-2.1-2.1 2.6-.9" /></>);
const FOLD = icon(<><path d="M10 4v12" strokeDasharray="1.6 1.6" /><path d="M3.5 5.5h13v9h-13z" /><path d="M10 5.5 14 3v9.5l-4 2" /></>);
const HINGE = icon(<><rect x="3.5" y="4" width="13" height="12" rx="1.5" /><path d="M10 4v12" strokeDasharray="1.6 1.6" /></>);
const CHEVRON = <svg className="tb-chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4.5 6.5 3.5 3.5 3.5-3.5" /></svg>;

/** 기기의 돌리기 · 접기 · 힌지 표시 — 독 가운데의 글자 붙은 버튼. 가능한 자세만 보이고 이름(글자 · 툴팁 · aria-label)은 resize-scene.js 가 자세에 맞춰 바꾼다. */
export function DevicePosture() {
  const t = useT();
  return <div className="dock-seg" id="devCtl" role="group" {...t.label('posture.label')} hidden>
    <div className="orientation-pick" id="dcOrientation">
      <button className="tb-btn" id="dcRot" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="dcOrientMenu">{ROTATE}<span id="dcRotLb" {...t.text('posture.portrait')} />{CHEVRON}</button>
      <div className="zoom-menu" id="dcOrientMenu" role="menu" {...t.label('posture.orientation')} inert>
        {['portrait', 'landscape-left', 'landscape-right'].map(value => <button key={value} type="button" role="menuitemradio" tabIndex={-1} aria-checked="false" data-orientation={value} {...t.text(`posture.${value}`)} />)}
      </div>
    </div>
    <button className="tb-btn" id="dcFold" type="button">{FOLD}<span id="dcFoldLb" {...t.text('posture.fold')} /></button>
    <button className="tb-btn" id="dcHinge" type="button" aria-pressed="true" {...t.title('posture.hinge')}>{HINGE}<span {...t.text('posture.hinge')} /></button>
  </div>;
}

/**
 * 크기 · 기기 고르기 — 독 왼쪽의 버튼 하나(지금 고른 것의 윤곽 · 이름)와 그 위로 열리는 메뉴(D-167).
 * 메뉴는 그림을 가리는 떠 있는 층이라 고르면 닫힌다 — 방향키로 지나가는 동안만 열어 둔다. 고른 것의 조작(자세 · 슬라이더)은 독 가운데가 맡는다.
 * 버튼의 글과 열고 닫기는 resize-scene.js 가 맞춘다. 메뉴의 몸통은 떼어 놓아도 같은 모양인 한 덩어리다.
 */
export function DeviceMenu() {
  const t = useT();
  return <div className="pn-fold" id="pnFold">
    <button className="tb-btn pn-sum" id="pnSum" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="pnBody" {...t.title('panel.pick')}>
      <span className="pn-sum-sil" /><span className="nm" />{CHEVRON}
    </button>
    <div className="pn-body" id="pnBody" inert><SizePicker /></div>
  </div>;
}

/**
 * 조작 독(D-167) — 무대 아래 가운데에 늘 떠 있는 한 줄. 왼쪽에 크기 · 기기 메뉴, 가운데에 고른 것의 조작(기기면 자세, 커스텀이면 폭 · 높이 슬라이더,
 * @Preview · 프리셋이면 없음), 그 뒤에 시스템 UI(D-159 ①), 오른쪽 끝에 확대. 헤더는 한 줄로 두고 무대는 창을 다 쓴다. 가운데 칸의 hidden 은 resize-scene.js 가 정한다.
 */
export function WorkspacePanel({ systemUi = systemUiHost(), zoom = zoomHost() }: { systemUi?: ReactNode; zoom?: ReactNode }) {
  return <><DeviceMenu /><DevicePosture /><CustomSizeSliders />{systemUi}{zoom}</>;
}
