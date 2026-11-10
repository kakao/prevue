import { useEffect, useLayoutEffect, useState } from 'react';
import { useHost } from '../host';
import type { Size, SystemUi } from '../state';
import { systemBarsHost } from './WorkspaceShell';

// 앱 인셋 선택과 독립된 표시다. 카메라는 장면이, iOS 바는 이 층이, Android 기본 바는 렌더러가 그린다.
type Bars = { w: number; h: number; statusDp: number; navDp: number; side: 'left' | 'right' | null; sideDp: number; duo: boolean };
type Ink = 'dark' | 'light';
type Region = [number, number, number, number];

export function barsOf(systemUi: SystemUi | null, size: Size | null): Bars | null {
  const b = systemUi?.shown ? systemUi.bars : null;
  if (b?.look !== 'ios' || !b.insets || size?.kind !== 'device') return null;
  const area = size.insetProfile?.safeArea, duo = size.device === 'duo';
  const side = duo && area ? (area.left > 0 ? 'left' : area.right > 0 ? 'right' : null) : null;
  return { w: size.widthDp, h: size.heightDp, statusDp: b.insets.statusDp, navDp: b.insets.navDp,
    side, sideDp: side && area ? area[side] : 0, duo };
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

const SIGNAL = (x: number, y: number, s: number) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <rect x="0" y="7" width="3" height="4" rx=".8" /><rect x="4.5" y="5" width="3" height="6" rx=".8" />
  <rect x="9" y="2.5" width="3" height="8.5" rx=".8" /><rect x="13.5" y="0" width="3" height="11" rx=".8" />
</g>;
const WIFI = (x: number, y: number, s: number) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <path d="M7.5 11 L0 3.2 A11 11 0 0 1 15 3.2 Z" />
</g>;
const BATTERY = (x: number, y: number, s: number) => <g transform={`translate(${x} ${y}) scale(${s})`}>
  <rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45" />
  <rect x="2" y="2" width="19" height="8" rx="1.8" /><rect x="23.5" y="4" width="1.6" height="4" rx=".8" opacity=".45" />
</g>;

function IosStatus({ bars }: { bars: Bars }) {
  if (bars.side) {
    const mid = bars.side === 'left' ? bars.sideDp / 2 : bars.w - bars.sideDp / 2;
    return <g className="sb-status" data-edge={bars.side}>
      <text x={mid} y="86" dominantBaseline="central" textAnchor="middle" fontSize="15" fontWeight={600}>9:41</text>
      {SIGNAL(mid - 30, 104, .85)}{WIFI(mid - 10, 104, .85)}{BATTERY(mid + 8, 103.5, .85)}
    </g>;
  }
  const ear = bars.duo ? 48 : (bars.w - 126) / 4, mid = bars.statusDp / 2 + 2;
  return <g className="sb-status" data-edge="top">
    <text x={ear} y={mid} dominantBaseline="central" textAnchor="middle" fontSize="17" fontWeight={600}>9:41</text>
    {SIGNAL(bars.w - ear - 36, mid - 5.5, 1)}
    {WIFI(bars.w - ear - 14, mid - 5.5, 1)}
    {BATTERY(bars.w - ear + 6, mid - 6, 1)}
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
    {bars.navDp > 0 && <g className={`sb-ink-${bottom}`}>
      <rect className="sb-handle" x={(bars.w - 134) / 2} y={bars.h - 13} width="134" height="5" rx="2.5" />
    </g>}
  </svg>;
  return place(body, systemBarsHost);
}
