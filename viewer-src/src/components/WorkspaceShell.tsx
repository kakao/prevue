import { type ReactNode, type Ref } from 'react';
import { useMessages } from '../messages';

// 글은 data-t · data-t-<속성>으로도 단다 — 미리 그릴 때는 언어를 몰라 비워 두고, 페이지에서 strings.js 가 사전 문장으로 채운다.
function useT() {
  const { phrase } = useMessages();
  return {
    text: (key: string) => ({ 'data-t': key, children: phrase(key) }),
    title: (key: string) => ({ 'data-t-title': key, title: phrase(key) }),
    label: (key: string) => ({ 'data-t-aria-label': key, 'aria-label': phrase(key) }),
  };
}

const Unit = ({ id, hidden }: { id: string; hidden?: boolean }) => <div className="unit" id={id} hidden={hidden}>
  <div className="btn" /><div className="btn" /><div className="btn" /><div className="btn" /><div className="btn" />
  <div className="shell" /><div className="home" /><div className="outline" />
  <div className="stage"><img className="ly l0" alt="" /><div className="veil" /><img className="ly l1" alt="" /><div className="crease" /><div className="cam" /></div>
  <div className="tick t-top" /><div className="tick t-bot" />
</div>;

export function Ruler() {
  const t = useT();
  return <div className="ruler" id="ruler" hidden>
    <svg aria-hidden="true"><path className="ext" id="rlExt" /><path className="dim" id="rlDim" /></svg>
    <input className="rl-badge" id="rlW" type="text" inputMode="numeric" maxLength={4} {...t.label('size.w.label')} {...t.title('size.w.tip')} />
    <input className="rl-badge" id="rlH" type="text" inputMode="numeric" maxLength={4} {...t.label('size.h.label')} {...t.title('size.h.tip')} />
  </div>;
}

export function ResizeScene({ marks = insetMarksHost() }: { marks?: ReactNode }) {
  return <div className="resize-scene" id="resizeScene" hidden><div className="resize-geometry" id="resizeGeometry">
    <Unit id="ua" /><Unit id="ub" hidden />
    <Ruler />
    {marks}
    <div className="rig" id="rig" hidden>
      <div className="lift"><div className="space">
        <div className="plate" />
        <div className="slab base">
          <div className="face front"><div className="clip"><img className="ly old" alt="" /><div className="veil" /><img className="ly neu" alt="" /><div className="cast" /><div className="cam" /></div><div className="lit" /><div className="edge ring" /></div>
          <div className="face rear"><div className="lit" /></div>
        </div>
        <div className="slab leaf">
          <div className="face front"><div className="clip"><img className="ly old" alt="" /><div className="veil" /><img className="ly neu" alt="" /><div className="cam" /></div><div className="lit" /><div className="edge ring" /></div>
          <div className="face rear"><div className="clip"><img className="ly old" alt="" /><div className="veil" /><img className="ly neu" alt="" /><div className="cam" /></div><div className="lit" /><div className="edge ring" /></div>
        </div>
        <div className="spine" />
        <div className="crease" />
        <div className="tick r-top" /><div className="tick r-bot" />
      </div></div>
    </div>
  </div></div>;
}

export const loadingHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="workspace-loading" id="workspaceLoading" role="status" hidden ref={ref}>{children}</div>;
export const insetOverlayHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="inset-overlay" id="insetOverlay" aria-hidden="true" hidden ref={ref}>{children}</div>;
export const insetMarksHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="inset-marks" id="insetMarks" aria-hidden="true" hidden ref={ref}>{children}</div>;

export const systemUiHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="sys-ui" id="sysUiCtl" role="group" data-t-aria-label="systemUi.label" hidden ref={ref}>{children}</div>;
export const zoomHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="zoom at-fit" id="zoomCtl" role="group" data-t-aria-label="zoom.label" ref={ref}>{children}</div>;

// #shot 은 늘 붙어 있다 — 다시 붙이면 MJPEG 연결이 새로 열리고, WebKit 은 옛 연결을 닫지 않는다.
export function PreviewStage({ loading = loadingHost(), inset = insetOverlayHost() }: { loading?: ReactNode; inset?: ReactNode }) {
  return <div className="stage" id="stage">
    <img id="shot" alt="preview" />
    {loading}
    {/* 그림 위 표시 — 구조 테두리(#marks) · 손 아래 옅은 바탕(#box) · 고른 노드(#pickBox). workspace/point.ts 가 그린다. 카드는 그림 밖 #focusView 에 뜬다. */}
    {inset}
    <div className="marks" id="marks" aria-hidden="true" /><div className="box" id="box" /><div className="box pick" id="pickBox" hidden />
  </div>;
}

export function WorkspaceStage({ loading, inset, marks }: { loading?: ReactNode; inset?: ReactNode; marks?: ReactNode }) {
  return <div className="wrap"><ResizeScene marks={marks} /><PreviewStage loading={loading} inset={inset} /></div>;
}

export const menuHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="pn-fold" id="pnFold" ref={ref}>{children}</div>;
export const postureHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="dock-seg" id="devCtl" role="group" data-t-aria-label="posture.label" hidden ref={ref}>{children}</div>;
export const slidersHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="pn-sl" id="pnSl" role="group" data-t-aria-label="size.custom.label" hidden ref={ref}>{children}</div>;

export function WorkspacePanel({ menu = menuHost(), posture = postureHost(), sliders = slidersHost(), systemUi = systemUiHost(), zoom = zoomHost() }:
  { menu?: ReactNode; posture?: ReactNode; sliders?: ReactNode; systemUi?: ReactNode; zoom?: ReactNode }) {
  return <>{menu}{posture}{sliders}{systemUi}{zoom}</>;
}
