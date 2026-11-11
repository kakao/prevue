import { useLayoutEffect, useSyncExternalStore } from 'react';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { DeviceInsets, Size } from '../state';
import { insetOverlayView, loadingView } from '../workspace/view';
import { insetLegendHost, insetOverlayHost } from './WorkspaceShell';

// 인셋 영역 보기 — 기기가 Composable에 전달한 인셋을 그림 위에 덧그린다. 뷰어만의 표시라 PNG · CLI · 데몬은 모른다(D-172와 같은 자리).
// 띠는 종류마다 따로 그려 겹치면 색이 섞이고, 어느 종류가 몇 dp인지는 범례가 적는다. 둥근 모서리 · 카메라 구멍은 인셋 값에 없어 그리지 않는다.
const INSET_KINDS = ['statusBars', 'navigationBars', 'captionBar', 'displayCutout', 'systemOverlays'] as const;
const EDGES = ['top', 'right', 'bottom', 'left'] as const;
type Edge = typeof EDGES[number];
type Rect = { x: number; y: number; w: number; h: number };

/** 그릴 것 — 꺼져 있거나 기기가 아니면 null. safe 는 다섯 종류를 모두 뺀 안쪽(safeDrawing)이다. */
function insetPlanOf(on: boolean, insets: DeviceInsets | null | undefined, size: Size | null): { w: number; h: number; insets: DeviceInsets; safe: Record<Edge, number> } | null {
  if (!on || !insets || size?.kind !== 'device') return null;
  const safe = Object.fromEntries(EDGES.map(e => [e, Math.max(0, ...INSET_KINDS.map(k => insets.values[k][e]))])) as Record<Edge, number>;
  return { w: size.widthDp, h: size.heightDp, insets, safe };
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
  const { on } = useSyncExternalStore(insetOverlayView.subscribe, insetOverlayView.get);
  const plan = insetPlanOf(on, deviceInsets, size);
  useLayoutEffect(() => { if (element) element.hidden = !plan; }, [element, plan]);
  if (!plan) return place(null, insetOverlayHost);
  const { w, h, safe } = plan;
  const inner: Rect = { x: safe.left, y: safe.top, w: Math.max(0, w - safe.left - safe.right), h: Math.max(0, h - safe.top - safe.bottom) };
  const body = <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
    {INSET_KINDS.map(kind => <g key={kind} className="io-band" data-kind={kind}>
      {EDGES.filter(e => plan.insets.values[kind][e] > 0).map(edge => {
        const { fill, line } = band(edge, plan.insets.values[kind][edge], w, h);
        return <g key={edge} data-edge={edge}>
          <rect className="io-fill" x={fill.x} y={fill.y} width={fill.w} height={fill.h} />
          <line className="io-line" x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} vectorEffect="non-scaling-stroke" />
        </g>;
      })}
    </g>)}
    <g className="io-safe">
      <rect className="io-safe-halo" x={inner.x} y={inner.y} width={inner.w} height={inner.h} vectorEffect="non-scaling-stroke" />
      <rect className="io-safe-line" x={inner.x} y={inner.y} width={inner.w} height={inner.h} vectorEffect="non-scaling-stroke" />
    </g>
  </svg>;
  return place(body, insetOverlayHost);
}

const dp = (v: number) => String(Math.round(v * 10) / 10);

/** 범례 — 지금 자세에서 0이 아닌 종류만, 변마다 dp. 마지막 줄은 SafeArea(safeDrawing) 선이다. */
export function InsetLegend({ deviceInsets, size, host }: { deviceInsets: DeviceInsets | null; size: Size | null; host?: HTMLElement }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const { on } = useSyncExternalStore(insetOverlayView.subscribe, insetOverlayView.get);
  const plan = insetPlanOf(on, deviceInsets, size);
  useLayoutEffect(() => { if (element) element.hidden = !plan; }, [element, plan]);
  if (!plan) return place(null, insetLegendHost);
  const sides = (edges: Record<Edge, number>) => EDGES.filter(e => edges[e] > 0).map(e => `${phrase(`insetOverlay.edge.${e}`)} ${dp(edges[e])}`).join(' · ');
  const rows = INSET_KINDS.filter(k => EDGES.some(e => plan.insets.values[k][e] > 0));
  const body = <>
    <div className="il-head">{phrase('insetOverlay.legend')}</div>
    <ul>
      {rows.map(k => <li key={k} data-kind={k}><i className="il-swatch" aria-hidden="true" /><code>{k}</code><span>{sides(plan.insets.values[k])}</span></li>)}
      <li data-kind="safeDrawing"><i className="il-swatch il-safe" aria-hidden="true" /><code>safeDrawing</code><span>{phrase('insetOverlay.safe')}</span></li>
    </ul>
  </>;
  return place(body, insetLegendHost);
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
