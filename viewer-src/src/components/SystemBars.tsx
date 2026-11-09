import { useEffect, useLayoutEffect, useState } from 'react';
import { useHost } from '../host';
import type { Size, SystemUi } from '../state';
import { systemBarsHost } from './WorkspaceShell';

// 기기별 시스템 UI(D-169) — 데몬은 기기의 inset 만큼 앱을 밀고 layoutlib 의 바 뷰를 숨긴다. 여기는 그 자리에 그 기기의 바 모양을 덧그린다.
// 그림 전체를 덮는 SVG 하나를 dp 좌표(viewBox = 기기 화면 dp)로 그려 확대 · 맞춤에 같이 줄고 는다. 카메라 구멍 · 섬은 장면(resize-scene.js)이 그린다.
// 바의 글자색은 그 아래 그림의 밝기로 고른다 — 실제 기기도 앱이 고른 밝은 · 어두운 바를 그린다.

type Look = 'oneui' | 'pixel' | 'ios';
type Bars = { look: Look; statusDp: number; navDp: number };
type Ink = 'dark' | 'light';

export function barsOf(systemUi: SystemUi | null, size: Size | null): (Bars & { w: number; h: number }) | null {
  const b = systemUi?.shown ? systemUi.bars : null;
  if (!b?.insets || b.look === 'aosp' || size?.kind !== 'device') return null;
  return { look: b.look as Look, statusDp: b.insets.statusDp, navDp: b.insets.navDp, w: size.widthDp, h: size.heightDp };
}

const SAMPLE_W = 24, SAMPLE_H = 4, LIGHT_ABOVE = 0.6, RESAMPLE_MS = 1000;

/** 그림의 [top, bottom) 띠(비율)의 평균 밝기로 글자색을 고른다. 그림을 못 읽으면 어두운 글자다. */
function inkOver(img: HTMLImageElement | null, top: number, bottom: number): Ink {
  if (!img?.naturalWidth) return 'dark';
  try {
    const c = document.createElement('canvas');
    c.width = SAMPLE_W; c.height = SAMPLE_H;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return 'dark';
    const h = img.naturalHeight;
    g.drawImage(img, 0, top * h, img.naturalWidth, Math.max(1, (bottom - top) * h), 0, 0, SAMPLE_W, SAMPLE_H);
    const px = g.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    return sum / (px.length / 4) > LIGHT_ABOVE ? 'dark' : 'light';
  } catch { return 'dark'; }
}

function useInk(img: HTMLImageElement | null, bars: (Bars & { h: number }) | null): [Ink, Ink] {
  const [ink, setInk] = useState<[Ink, Ink]>(['dark', 'dark']);
  useEffect(() => {
    if (!img || !bars) return;
    const sample = () => setInk(old => {
      const next: [Ink, Ink] = [inkOver(img, 0, bars.statusDp / bars.h), inkOver(img, 1 - bars.navDp / bars.h, 1)];
      return next[0] === old[0] && next[1] === old[1] ? old : next;
    });
    sample();
    img.addEventListener('load', sample);
    const t = window.setInterval(sample, RESAMPLE_MS);
    return () => { img.removeEventListener('load', sample); window.clearInterval(t); };
  }, [img, bars?.statusDp, bars?.navDp, bars?.h]);
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

/** 안드로이드 상태바 — 왼쪽 시각, 오른쪽 신호 · 와이파이 · 배터리. One UI 는 배터리 숫자를 붙이고, Pixel 은 시각이 조금 굵다. */
function AndroidStatus({ look, w, s }: { look: 'oneui' | 'pixel'; w: number; s: number }) {
  const mid = s / 2, pad = look === 'pixel' ? 24 : 18;
  return <g className="sb-status">
    <text x={pad} y={mid} dominantBaseline="central" fontSize="14" fontWeight={look === 'pixel' ? 500 : 400}>12:45</text>
    {look === 'oneui' && <text x={w - pad} y={mid} dominantBaseline="central" textAnchor="end" fontSize="12">100%</text>}
    {SIGNAL(w - pad - (look === 'oneui' ? 100 : 64), mid - 5.5, 1)}
    {WIFI(w - pad - (look === 'oneui' ? 78 : 42), mid - 5.5, 1)}
    {BATTERY(w - pad - (look === 'oneui' ? 58 : 24), mid - 6, 1)}
  </g>;
}

/** iOS 상태바 — 섬의 양쪽 귀 가운데에 시각과 신호 · 와이파이 · 배터리. */
function IosStatus({ w, s }: { w: number; s: number }) {
  const ear = (w - 126) / 4, mid = s / 2 + 2;
  return <g className="sb-status">
    <text x={ear} y={mid} dominantBaseline="central" textAnchor="middle" fontSize="17" fontWeight={600}>9:41</text>
    {SIGNAL(w - ear - 36, mid - 5.5, 1)}
    {WIFI(w - ear - 14, mid - 5.5, 1)}
    {BATTERY(w - ear + 6, mid - 6, 1)}
  </g>;
}

/** 아래 — 안드로이드는 제스처 손잡이, iOS 는 홈 인디케이터. 둘 다 하단 inset 가운데의 둥근 막대다. */
function Handle({ look, w, h, n }: { look: Look; w: number; h: number; n: number }) {
  const [bw, bh] = look === 'ios' ? [134, 5] : look === 'pixel' ? [108, 4] : [120, 4];
  const y = look === 'ios' ? h - 8 - bh : h - n / 2 - bh / 2;
  return <rect className="sb-handle" x={(w - bw) / 2} y={y} width={bw} height={bh} rx={bh / 2} />;
}

/** 기기별 바 — 기기를 고르고 시스템 UI 를 켜고 출처 값이 있을 때만 그린다. 그 밖(공통 AOSP 바)은 렌더러가 그림에 그린다. */
export function SystemBarsOverlay({ systemUi, size, host }: { systemUi: SystemUi | null; size: Size | null; host?: HTMLElement }) {
  const { element, place } = useHost(host);
  const bars = barsOf(systemUi, size);
  const img = element?.parentElement?.querySelector<HTMLImageElement>('#shot') ?? null;
  const [top, bottom] = useInk(img, bars);
  useLayoutEffect(() => { if (element) element.hidden = !bars; }, [element, bars]);
  const body = bars && <svg viewBox={`0 0 ${bars.w} ${bars.h}`} preserveAspectRatio="none" fill="currentColor">
    {bars.statusDp > 0 && <g className={`sb-ink-${top}`}>
      {bars.look === 'ios' ? <IosStatus w={bars.w} s={bars.statusDp} /> : <AndroidStatus look={bars.look} w={bars.w} s={bars.statusDp} />}
    </g>}
    {bars.navDp > 0 && <g className={`sb-ink-${bottom}`}><Handle look={bars.look} w={bars.w} h={bars.h} n={bars.navDp} /></g>}
  </svg>;
  return place(body, systemBarsHost);
}
