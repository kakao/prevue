import type { ReactNode, Ref } from 'react';
import { useMessages } from '../messages';

// 한 장의 정적 껍데기 — 장면 · 무대 · 검사 패널의 칸. 번들 밖의 resize-scene.js 와 workspace/focus.ts 가 이 요소들을 쥐고 계속 고친다.
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
        <defs><linearGradient id="duoSheen" gradientUnits="userSpaceOnUse"><stop offset="0" /><stop offset=".4" /><stop offset="1" /></linearGradient></defs>
        {/* 옆면(thick)은 장이 옆으로 선 순간에도 보여야 해 윤곽 묶음(draw) 밖에 둔다. 두께 띠(band)는 테보다 먼저,
            화면 가장자리(glow · inner)는 테 위에 그린다 — 접는 장(.duo-flap)이 안쪽 절반을 덮는다. */}
        <path className="thick" />
        <g className="draw">
          <g className="band"><path className="bl" /><path className="bc" /><path className="bd" /></g>
          <path className="outl" /><path className="houtl" /><path className="rim" /><path className="rimhi" /><path className="body" />
          <path className="glow" /><path className="glow" /><path className="glow" /><path className="inner" />
          <path className="sheen" stroke="url(#duoSheen)" /><path className="hinge" /><path className="hsheen" stroke="url(#duoSheen)" /><path className="ring" /><path className="ring hr" />
        </g>
      </svg>
      <div className="duo-flap"><div className="duo-face" /><div className="duo-dark" /></div>
    </div>
    <div className="rig" id="rig" hidden>
      <div className="lift">
        <div className="plate" />
        <div className="base">
          <div className="edge bez" />
          <div className="clip"><img className="ly old" alt="" /><div className="veil" /><img className="ly neu" alt="" /><div className="cast" /><div className="cam" /></div>
          <div className="edge ring" />
        </div>
        <div className="spine" />
        {/* 잎은 두께를 가진 상자다 — 앞뒤 면(lay)과 옆면 셋(side). 경첩 쪽 옆면은 둥근 몸통(spine)이 맡는다.
            테(bez)는 화면(clip) 밑에 깔아 몸체 색 · 광택을 채운다 — 화면이 그 안쪽을 덮는다. */}
        <div className="leaf">
          <div className="lay l-in">
            <div className="edge bez" />
            <div className="clip face inner"><img className="ly old" alt="" /><div className="veil" /><img className="ly neu" alt="" /><div className="shade" /><div className="sheen" /><div className="cam" /></div>
            <div className="edge ring" />
          </div>
          <div className="lay l-out">
            <div className="edge bez" />
            <div className="clip face outer"><img className="ly old" alt="" /><div className="veil" /><img className="ly neu" alt="" /><div className="shade" /><div className="sheen" /><div className="cam" /></div>
            <div className="edge ring" />
          </div>
          <div className="side s-far" /><div className="side s-a" /><div className="side s-b" />
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
/** 확대 줄의 바깥 요소 — 안과 at-fit 은 ZoomControls 가 맞춘다. */
export const zoomHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="zoom at-fit" id="zoomCtl" ref={ref}>{children}</div>;

/**
 * 정지 그림 · 스트림을 보이는 무대. 그림의 src 는 JSX 가 갖지 않는다 — focus.ts 가 크로스페이드 · 스트림 붙이기로 갈아 끼운다.
 * #shot 은 늘 붙어 있다 — 다시 붙이면 MJPEG 연결이 새로 열리고, WebKit 은 옛 연결을 닫지 않는다.
 */
export function PreviewStage({ loading = loadingHost() }: { loading?: ReactNode }) {
  return <div className="stage" id="stage">
    <img id="shot" alt="preview" />
    {loading}
    {/* 박스 · 꼬리표의 자리. 꼬리표의 안은 가리키기/PointOverlay 가 그린다. */}
    <div className="box" id="box" hidden /><div className="box pick" id="pickBox" hidden><span className="tag" /></div>
  </div>;
}

/** 무대 — 장면(기기 틀)과 캔버스. 조작 중에는 workspace/resize.ts 가 캔버스(#stage)를 장면의 틀 안으로 옮긴다. */
export function WorkspaceStage({ loading }: { loading?: ReactNode }) {
  return <div className="wrap"><ResizeScene /><PreviewStage loading={loading} /></div>;
}

/** 커스텀일 때만 그 행 아래에 펼친다. 끄는 동안은 틀만 따라오고 놓을 때 한 번 그린다(D-99). 눈금 위치 · 값은 resize-scene.js 가 잡는다. */
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
        <CustomSizeSliders />
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

/** 접는 기기의 접기 · 회전 · 힌지 표시. 가능한 자세만 보이고 이름표는 resize-scene.js 가 자세에 맞춰 바꾼다. */
export function DevicePosture() {
  const t = useT();
  return <section className="pn-sec" id="devCtl" role="group" {...t.label('posture.label')} hidden><h4 className="pn-h" {...t.text('posture.title')} />
    <div className="pn-seg">
      <button className="pn-it" id="dcFold" type="button"><span id="dcFoldLb" {...t.text('posture.fold')} /></button>
      <button className="pn-it" id="dcRot" type="button"><span id="dcRotLb" {...t.text('posture.rotate')} /></button>
      <button className="pn-it" id="dcHinge" type="button" aria-pressed="true" {...t.title('posture.hinge')} {...t.text('posture.hinge')} />
    </div>
  </section>;
}

/** 검사 패널의 칸 — 크기 · 기기, 자세, 맨 아래 확대 줄(배율 메뉴는 그 위로 열린다). */
export function WorkspacePanel({ zoom = zoomHost() }: { zoom?: ReactNode }) {
  return <><SizePicker /><DevicePosture />{zoom}</>;
}
