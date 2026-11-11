import { useEffect, useLayoutEffect, useState } from 'react';
import { useHost } from '../host';
import type { Size, SystemUi } from '../state';
import { systemBarsHost } from './WorkspaceShell';

// 앱 인셋 선택과 독립된 표시다. 카메라는 장면이, iOS 바는 이 층이, Android 기본 바는 렌더러가 그린다.
type Bars = { device: string; w: number; h: number; statusDp: number; navDp: number; side: 'left' | 'right' | null; sideDp: number; duo: boolean; folded: boolean };
type Ink = 'dark' | 'light';
type Region = [number, number, number, number];

export function barsOf(systemUi: SystemUi | null, size: Size | null): Bars | null {
  const b = systemUi?.shown ? systemUi.bars : null;
  if (b?.look !== 'ios' || !b.insets || size?.kind !== 'device') return null;
  const area = size.insetProfile?.safeArea, duo = size.device === 'duo';
  const side = duo && area ? (area.left > 0 ? 'left' : area.right > 0 ? 'right' : null) : null;
  return { device: size.device, w: size.widthDp, h: size.heightDp, statusDp: b.insets.statusDp, navDp: b.insets.navDp,
    side, sideDp: side && area ? area[side] : 0, duo, folded: size.folded };
}

const SAMPLE_W = 24, SAMPLE_H = 4, LIGHT_ABOVE = 0.6, RESAMPLE_MS = 1000;

function inkOver(img: HTMLImageElement, [x, y, w, h]: Region): Ink {
  if (!img.naturalWidth) return 'dark';
  try {
    const c = document.createElement('canvas');
    c.width = SAMPLE_W; c.height = SAMPLE_H;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return 'dark';
    g.drawImage(img, x * img.naturalWidth, y * img.naturalHeight, Math.max(1, w * img.naturalWidth), Math.max(1, h * img.naturalHeight), 0, 0, SAMPLE_W, SAMPLE_H);
    const px = g.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    let sum = 0, seen = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      sum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255; seen++;
    }
    return seen && sum / seen <= LIGHT_ABOVE ? 'light' : 'dark';
  } catch { return 'dark'; }
}

function useInk(img: HTMLImageElement | null, bars: Bars | null): [Ink, Ink] {
  const [ink, setInk] = useState<[Ink, Ink]>(['dark', 'dark']);
  const enabled = bars !== null;
  const { w = 1, h = 1, statusDp = 0, navDp = 0, side = null, sideDp = 0 } = bars ?? {};
  useEffect(() => {
    if (!img || !enabled) return;
    const status: Region = side ? [side === 'left' ? 0 : 1 - sideDp / w, 64 / h, sideDp / w, 64 / h] : [0, 0, 1, statusDp / h];
    const sample = () => setInk(old => {
      const next: [Ink, Ink] = [inkOver(img, status), inkOver(img, [0, 1 - navDp / h, 1, navDp / h])];
      return next[0] === old[0] && next[1] === old[1] ? old : next;
    });
    sample();
    img.addEventListener('load', sample);
    const t = window.setInterval(sample, RESAMPLE_MS);
    return () => { img.removeEventListener('load', sample); window.clearInterval(t); };
  }, [img, enabled, w, h, statusDp, navDp, side, sideDp]);
  return ink;
}

// 세로 상태바의 자리 · 크기는 iOS 27.0 시뮬레이터(9:41 · 막대 4 · Wi-Fi 3 · 배터리 100%) 3x 스크린숏을 pt 로 잰 값이다(시안: prototypes/ios-status-bar).
// top · right 는 오른쪽 아이콘 묶음(신호 왼쪽 끝 ~ 배터리 꼭지)의 윗변 · 오른쪽 끝, s 는 iPhone 17 대비 배율, time 은 시각의 가운데 · 기준선 · 글자 크기다.
// 묶음 가운데가 아일랜드 가운데(resize-scene.js 의 cam)와 같은 높이에 놓인다.
type IosLayout = { top: number; right: number; s: number; time: { cx: number; base: number; size: number } };
const IOS_STATUS: Record<string, IosLayout> = {
  ip17: { top: 26.33, right: 366.67, s: 1, time: { cx: 72.67, base: 39, size: 17 } },
  ipair: { top: 31.33, right: 385.33, s: 1.12, time: { cx: 76.33, base: 45.33, size: 17.7 } },
  ip17pm: { top: 25.33, right: 399.33, s: 1.12, time: { cx: 82.33, base: 39.33, size: 17.7 } },
};

// 아래 그림의 좌표는 배율 1 의 묶음 안이다 — 윗변 y 0, 신호 왼쪽 끝 x 0, 꼭지 오른쪽 끝 x 78.33.
const GROUP_W = 78.33;
const SIGNAL = <>{[4.67, 7, 9.67, 12.33].map((h, i) => <rect key={i} x={i * 5.33} y={12.33 - h} width="3.33" height={h} rx="1" />)}</>;
const at = (cx: number, cy: number, r: number, deg: number) => { const a = deg * Math.PI / 180; return `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`; };
// Wi-Fi 부채꼴 한 겹 — 가운데에서 반지름 inner~outer, 위로 ±half 도(inner 0 이면 쐐기). 모서리는 획의 round join 으로 둥글리고 그만큼 반지름을 줄여 둔다.
const band = (cx: number, cy: number, inner: number, outer: number, half: number) => inner > 0
  ? `M${at(cx, cy, outer, -half)} A${outer} ${outer} 0 0 1 ${at(cx, cy, outer, half)} L${at(cx, cy, inner, half)} A${inner} ${inner} 0 0 0 ${at(cx, cy, inner, -half)} Z`
  : `M${cx} ${cy} L${at(cx, cy, outer, -half)} A${outer} ${outer} 0 0 1 ${at(cx, cy, outer, half)} Z`;
const ROUND = .5, WIFI_X = 35.33, WIFI_Y = 12.6, WIFI_HALF = 41;
const WIFI = <g stroke="currentColor" strokeWidth={ROUND * 2} strokeLinejoin="round">
  <path d={band(WIFI_X, WIFI_Y, 10 + ROUND, 12.6 - ROUND, WIFI_HALF)} />
  <path d={band(WIFI_X, WIFI_Y, 6 + ROUND, 8.27 - ROUND, WIFI_HALF)} />
  <path d={band(WIFI_X, WIFI_Y - ROUND, 0, 3.93 - ROUND, WIFI_HALF)} />
</g>;
const BATTERY = <>
  <rect x="51.5" y=".17" width="24" height="12" rx="3.7" fill="none" stroke="currentColor" opacity=".4" />
  <rect x="53" y="1.67" width="21" height="9" rx="2.3" />
  <path d="M77 4.17h.4a.93.93 0 0 1 .93.93v2.14a.93.93 0 0 1-.93.93H77z" opacity=".5" />
</>;

function DuoIndicator({ x, y }: { x: number; y: number }) {
  return <g className="sb-duo-indicator" transform={`translate(${x} ${y})`}>
    <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M-16 9 A18 18 0 1 1 16 9" />
      <path d="M-8 -1 Q0 -9 8 -1 M-5 2 Q0 -3 5 2" />
    </g>
    <circle cy="5" r="1.7" />
    <g opacity=".35"><circle cx="-10" cy="16" r="1.6" /><circle cx="-5" cy="19" r="1.6" />
      <circle cy="20" r="1.6" /><circle cx="5" cy="19" r="1.6" /><circle cx="10" cy="16" r="1.6" /></g>
  </g>;
}

function DuoStatus({ bars }: { bars: Bars }) {
  const x = bars.side ? (bars.side === 'left' ? bars.sideDp / 2 : bars.w - bars.sideDp / 2) : bars.w - 46;
  const y = bars.side ? (bars.folded ? 124 : 78) : 42;
  return <g className="sb-status sb-duo-status" data-edge={bars.side ?? 'top'}>
    <text x={bars.side ? x : x - 52} y={bars.side ? y - 40 : y} dominantBaseline="central" textAnchor="middle" fontSize="15" fontWeight={600}>9:41</text>
    <DuoIndicator x={x} y={y} />
  </g>;
}

function IosStatus({ bars }: { bars: Bars }) {
  if (bars.duo) return <DuoStatus bars={bars} />;
  const layout = IOS_STATUS[bars.device];
  if (!layout) return null;
  return <g className="sb-status" data-edge="top">
    <text className="sb-time" x={layout.time.cx} y={layout.time.base} textAnchor="middle" fontSize={layout.time.size} fontWeight={600}>9:41</text>
    <g className="sb-icons" transform={`translate(${layout.right - GROUP_W * layout.s} ${layout.top}) scale(${layout.s})`}>{SIGNAL}{WIFI}{BATTERY}</g>
  </g>;
}

export function SystemBarsOverlay({ systemUi, size, host }: { systemUi: SystemUi | null; size: Size | null; host?: HTMLElement }) {
  const { element, place } = useHost(host);
  const bars = barsOf(systemUi, size);
  const img = element?.parentElement?.querySelector<HTMLImageElement>('#shot') ?? null;
  const [status, bottom] = useInk(img, bars);
  useLayoutEffect(() => { if (element) element.hidden = !bars; }, [element, bars]);
  const body = bars && <svg viewBox={`0 0 ${bars.w} ${bars.h}`} preserveAspectRatio="none" fill="currentColor" aria-hidden="true">
    {(bars.statusDp > 0 || bars.side) && <g className={`sb-ink-${status}`}><IosStatus bars={bars} /></g>}
    {!bars.duo && bars.navDp > 0 && <g className={`sb-ink-${bottom}`}>
      <rect className="sb-handle" x={(bars.w - 134) / 2} y={bars.h - 13} width="134" height="5" rx="2.5" />
    </g>}
  </svg>;
  return place(body, systemBarsHost);
}
