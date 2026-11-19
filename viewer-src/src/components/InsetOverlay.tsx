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
type Kind = typeof INSET_KINDS[number];
type Plan = { w: number; h: number; insets: DeviceInsets; widest: Record<Edge, number>; safe: Rect };

/**
 * 그릴 것 — 꺼져 있거나 기기가 아니면 null. widest 는 변마다 다섯 종류의 최댓값이다.
 * safe 는 그 값을 뺀 안쪽(safeDrawing)이고, 굵은 배지도 같은 값을 적어 둘이 어긋나지 않는다.
 */
function insetPlanOf(on: boolean, insets: DeviceInsets | null | undefined, size: Size | null): Plan | null {
  if (!on || !insets || size?.kind !== 'device') return null;
  const w = size.widthDp, h = size.heightDp;
  const widest = Object.fromEntries(EDGES.map(e => [e, Math.max(0, ...INSET_KINDS.map(k => insets.values[k][e]))])) as Record<Edge, number>;
  return { w, h, insets, widest, safe: { x: widest.left, y: widest.top, w: Math.max(0, w - widest.left - widest.right), h: Math.max(0, h - widest.top - widest.bottom) } };
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
 * 몸체 밖의 치수 하나 — 변마다 값이 있는 종류를 레이블과 함께 단다. 컷아웃은 눈금(#ruler) 바깥 — 위 · 아래 변의 띠는 왼쪽에, 왼쪽 · 오른쪽 변의 띠는 위에 서고,
 * 나머지 종류는 위 · 아래 변의 띠는 오른쪽에, 왼쪽 · 오른쪽 변의 띠는 아래에 선다. 한쪽에 컷아웃 아닌 종류가 둘 이상이면 그쪽은 최댓값 하나만 적는다.
 * bold 는 그 변의 SAFE AREA 를 정하는 값(Plan.widest)과 같은 배지다 — 같은 값이면 둘 다 굵다.
 * from · to 는 그 축에서 화면 길이에 대한 비율이다.
 */
type Side = 'right' | 'bottom' | 'left' | 'top';
type Mark = { kind: Kind; edge: Edge; value: number; side: Side; bold: boolean; from: number; to: number };

function marksOf({ w, h, insets, widest }: Plan): Mark[] {
  return EDGES.flatMap(edge => {
    const vertical = edge === 'top' || edge === 'bottom';
    const along = vertical ? h : w;
    const others = INSET_KINDS.filter(k => k !== 'displayCutout')
      .reduce((a, k) => insets.values[k][edge] > insets.values[a][edge] ? k : a);
    const picks: [Kind, Side][] = [[others, vertical ? 'right' : 'bottom'], ['displayCutout', vertical ? 'left' : 'top']];
    return picks.flatMap(([kind, side]) => {
      const value = Math.max(0, insets.values[kind][edge]);
      if (!(value > 0)) return [];
      const [from, to] = edge === 'top' || edge === 'left' ? [0, value / along] : [1 - value / along, 1];
      return [{ kind, edge, value, side, bold: value === widest[edge], from, to }];
    });
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
      const span: CSSProperties = m.side === 'right' || m.side === 'left' ? { top: pct(m.from), height: pct(m.to - m.from) } : { left: pct(m.from), width: pct(m.to - m.from) };
      return <div key={`${m.kind} ${m.edge}`} className="im-dim" data-kind={m.kind} data-edge={m.edge} data-side={m.side} data-bold={m.bold}
        style={span}>
        <i className="im-ext im-from" /><i className="im-ext im-to" />
        <span className="im-badge"><em className="im-label">{phrase(`insetOverlay.kind.${m.kind}`)}</em><span className="im-val">{dpText(m.value)}</span></span>
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
