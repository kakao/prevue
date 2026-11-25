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

/** 기기 한 대의 층 — 몸체 · 윤곽 · 화면(두 그림 사이의 베일) · 치수 눈금. 크기를 바꿀 때 #ua · #ub 가 엇갈린다. */
const Unit = ({ id, hidden }: { id: string; hidden?: boolean }) => <div className="unit" id={id} hidden={hidden}>
  <div className="btn" /><div className="btn" /><div className="btn" /><div className="btn" /><div className="btn" />
  <div className="shell" /><div className="home" /><div className="outline" />
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

/** 크기 · 회전 · 접기 전환의 틀과 그림. 접는 기기는 #rig 가 두께 있는 두 판으로 접는다. */
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

/** 첫 장 대기 표시의 바깥 요소 — 안과 hidden · failed 는 WorkspaceLoading 이 맞춘다. */
export const loadingHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="workspace-loading" id="workspaceLoading" role="status" hidden ref={ref}>{children}</div>;
/** 인셋 영역을 덧그리는 층 — 그림 위, 가리키기 표시 아래. 안과 hidden 은 InsetOverlay 가 맞춘다. */
export const insetOverlayHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="inset-overlay" id="insetOverlay" aria-hidden="true" hidden ref={ref}>{children}</div>;
/** 인셋 표지 — 화면과 같은 상자에 서되 #stage 밖이라 잘리지 않아, 기기 몸체 바깥에 dp 배지 · 치수선을 둔다. 상자는 workspace/focus.ts 의 layout 이, 안과 hidden 은 InsetMarks 가 맞춘다. */
export const insetMarksHost = (ref?: Ref<HTMLDivElement>, children?: ReactNode) =>
  <div className="inset-marks" id="insetMarks" aria-hidden="true" hidden ref={ref}>{children}</div>;

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
export function PreviewStage({ loading = loadingHost(), inset = insetOverlayHost() }: { loading?: ReactNode; inset?: ReactNode }) {
  return <div className="stage" id="stage">
    <img id="shot" alt="preview" />
    {loading}
    {/* 그림 위 표시 — 구조 테두리(#marks) · 손 아래 옅은 바탕(#box) · 고른 노드(#pickBox). workspace/point.ts 가 그린다. 카드는 그림 밖 #focusView 에 뜬다. */}
    {inset}
    <div className="marks" id="marks" aria-hidden="true" /><div className="box" id="box" /><div className="box pick" id="pickBox" hidden />
  </div>;
}

/** 무대 — 장면(기기 틀)과 캔버스. 조작 중에는 workspace/resize.ts 가 캔버스(#stage)를 장면의 틀 안으로 옮긴다. */
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
