import { useLayoutEffect, useSyncExternalStore, type CSSProperties } from 'react';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { DeviceInsets, Size } from '../state';
import { insetOverlayView, loadingView } from '../workspace/view';
import { insetMarksHost, insetOverlayHost } from './WorkspaceShell';

// 인셋 영역 보기 — 기기가 Composable에 전달한 인셋을 그림 위에 덧그린다. 뷰어만의 표시라 PNG · CLI · 데몬은 모른다(D-172와 같은 자리).
// 띠 · SAFE AREA 면은 화면 안(#insetOverlay), 값은 기기 몸체 밖(#insetMarks)의 dp 배지 · 치수선이 적는다. 전체 폭 · 높이는 장면의 치수 눈금(#ruler)이 이미 적는다.
// 둥근 모서리 · 카메라 구멍은 인셋 값에 없어 그리지 않는다.
const INSET_KINDS = ['statusBars', 'navigationBars', 'captionBar', 'displayCutout', 'systemOverlays'] as const;
const EDGES = ['top', 'right', 'bottom', 'left'] as const;
type Edge = typeof EDGES[number];
type Rect = { x: number; y: number; w: number; h: number };
type Widest = { kind: typeof INSET_KINDS[number]; value: number };
type Plan = { w: number; h: number; insets: DeviceInsets; widest: Record<Edge, Widest>; safe: Rect };

/**
 * 그릴 것 — 꺼져 있거나 기기가 아니면 null. widest 는 변마다 다섯 종류의 최댓값과 그 값을 낸 종류(같으면 INSET_KINDS 순서의 앞 종류)다.
 * safe 는 그 값을 뺀 안쪽(safeDrawing)이고, 배지도 같은 값을 적어 둘이 어긋나지 않는다.
 */
function insetPlanOf(on: boolean, insets: DeviceInsets | null | undefined, size: Size | null): Plan | null {
  if (!on || !insets || size?.kind !== 'device') return null;
  const w = size.widthDp, h = size.heightDp;
  const widest = Object.fromEntries(EDGES.map(e => {
    const kind = INSET_KINDS.reduce((a, k) => insets.values[k][e] > insets.values[a][e] ? k : a);
    return [e, { kind, value: Math.max(0, insets.values[kind][e]) }];
  })) as Record<Edge, Widest>;
  const m = Object.fromEntries(EDGES.map(e => [e, widest[e].value])) as Record<Edge, number>;
  return { w, h, insets, widest, safe: { x: m.left, y: m.top, w: Math.max(0, w - m.left - m.right), h: Math.max(0, h - m.top - m.bottom) } };
}

function usePlan(deviceInsets: DeviceInsets | null, size: Size | null) {
  const { on } = useSyncExternalStore(insetOverlayView.subscribe, insetOverlayView.get);
  return insetPlanOf(on, deviceInsets, size);
}

function band(edge: Edge, v: number, w: number, h: number): { fill: Rect; line: [number, number, number, number] } {
  switch (edge) {
    case 'top': return { fill: { x: 0, y: 0, w, h: v }, line: [0, v, w, v] };
    case 'bottom': return { fill: { x: 0, y: h - v, w, h: v }, line: [0, h - v, w, h - v] };
    case 'left': return { fill: { x: 0, y: 0, w: v, h }, line: [v, 0, v, h] };
    case 'right': return { fill: { x: w - v, y: 0, w: v, h }, line: [w - v, 0, w - v, h] };
  }
}

export function InsetOverlay({ deviceInsets, size, host }: { deviceInsets: DeviceInsets | null; size: Size | null; host?: HTMLElement }) {
  const { element, place } = useHost(host);
  const plan = usePlan(deviceInsets, size);
  useLayoutEffect(() => { if (element) element.hidden = !plan; }, [element, plan]);
  if (!plan) return place(null, insetOverlayHost);
  const { w, h, safe } = plan;
  const body = <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
    <rect className="io-safe" data-kind="safeDrawing" x={safe.x} y={safe.y} width={safe.w} height={safe.h} />
    {INSET_KINDS.map(kind => <g key={kind} className="io-band" data-kind={kind}>
      {EDGES.filter(e => plan.insets.values[kind][e] > 0).map(edge => {
        const { fill, line } = band(edge, plan.insets.values[kind][edge], w, h);
        return <g key={edge} data-edge={edge}>
          <rect className="io-fill" x={fill.x} y={fill.y} width={fill.w} height={fill.h} />
          <line className="io-line" x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} vectorEffect="non-scaling-stroke" />
        </g>;
      })}
    </g>)}
  </svg>;
  return place(body, insetOverlayHost);
}

/** 배지 숫자 — 소수 둘째 자리까지, 끝 0은 뗀다(41.9 · 14.86). */
const dpText = (v: number) => String(Math.round(v * 100) / 100);

/**
 * 몸체 밖의 치수 하나 — 위 · 아래 변의 띠는 오른쪽에, 왼쪽 · 오른쪽 변의 띠는 아래에 선다.
 * 변마다 SAFE AREA 를 정하는 값(Plan.widest) 하나만 적고 그 값을 낸 종류의 색을 쓴다.
 * 종류마다 달면 펀치홀 위쪽처럼 statusBars 와 displayCutout 이 비슷한 숫자로 나란히 떠 같은 것을 두 번 잰 것처럼 보인다. 어디가 무엇에 가려졌는지는 띠가 보여 준다.
 * from · to 는 그 축에서 화면 길이에 대한 비율이다.
 */
type Mark = { kind: string; edge: Edge; value: number; side: 'right' | 'bottom'; from: number; to: number };

function marksOf({ w, h, widest }: Plan): Mark[] {
  return EDGES.flatMap(edge => {
    const { kind, value: v } = widest[edge];
    if (!(v > 0)) return [];
    const along = edge === 'top' || edge === 'bottom' ? h : w;
    const [from, to] = edge === 'top' || edge === 'left' ? [0, v / along] : [1 - v / along, 1];
    return [{ kind, edge, value: v, side: edge === 'top' || edge === 'bottom' ? 'right' : 'bottom', from, to } as Mark];
  });
}

const pct = (r: number) => `${r * 100}%`;

export function InsetMarks({ deviceInsets, size, host }: { deviceInsets: DeviceInsets | null; size: Size | null; host?: HTMLElement }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const plan = usePlan(deviceInsets, size);
  useLayoutEffect(() => { if (element) element.hidden = !plan; }, [element, plan]);
  if (!plan) return place(null, insetMarksHost);
  const { w, h, safe } = plan;
  const body = <>
    {marksOf(plan).map(m => {
      const span: CSSProperties = m.side === 'right' ? { top: pct(m.from), height: pct(m.to - m.from) } : { left: pct(m.from), width: pct(m.to - m.from) };
      return <div key={`${m.kind} ${m.edge}`} className="im-dim" data-kind={m.kind} data-edge={m.edge} data-side={m.side}
        style={span}>
        <i className="im-ext im-from" /><i className="im-ext im-to" />
        <span className="im-badge">{dpText(m.value)}</span>
      </div>;
    })}
    <div className="im-safe" data-kind="safeDrawing"
      style={{ left: pct((safe.x + safe.w / 2) / w), top: pct((safe.y + safe.h / 2) / h) }}>
      <b>{phrase('insetOverlay.safeArea')}</b><span>{dpText(safe.w)} × {dpText(safe.h)}</span>
    </div>
  </>;
  return place(body, insetMarksHost);
}

const INSET_ICON = <svg className="tb-ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <rect x="4.5" y="2.5" width="11" height="15" rx="1.8" /><rect x="7" y="5.5" width="6" height="9" strokeDasharray="1.6 1.6" />
</svg>;

/** 독의 켬/끔 — 아이콘만 두고 켜지면 눌린 모양이다. 이름과 지금 상태는 title · aria-label 이 갖는다. */
export function InsetOverlayButton() {
  const { phrase } = useMessages();
  const { on } = useSyncExternalStore(insetOverlayView.subscribe, insetOverlayView.get);
  const { on: waiting } = useSyncExternalStore(loadingView.subscribe, loadingView.get);
  const name = phrase('insetOverlay.now', { value: phrase(on ? 'systemUi.on' : 'systemUi.off') });
  return <button type="button" id="insetBtn" className="tb-btn" aria-pressed={on} aria-label={name} title={name} disabled={waiting}
    onClick={() => insetOverlayView.set({ on: !on })}>{INSET_ICON}</button>;
}
