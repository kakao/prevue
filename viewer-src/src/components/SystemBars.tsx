import { useEffect, useLayoutEffect, useState } from 'react';
import { DEVICES } from '../../legacy/js/devices.js';
import { cameraOf } from '../../legacy/js/resize-scene.js';
import { useHost } from '../host';
import type { DeviceInsets, Size, SystemUi } from '../state';
import { sizeKey } from '../workspace/resize';
import { systemBarsHost } from './WorkspaceShell';

// 앱 인셋 선택과 독립된 표시다. 카메라는 장면이, 기기의 바(iOS · Android)는 이 층이, 기기 없는 크기의 Preview 기본 바는 렌더러가 그린다.
// cut 은 전달 인셋의 옆 컷아웃(좌 · 우)이다 — Android 상태 줄이 그만큼 안으로 들어간다.
// topCam 은 위 띠에서 시작하는 장면 카메라(resize-scene.js cameraOf)의 좌우 끝과 세로 가운데다 — 옆 · 아래 가장자리 카메라는 null 이다.
export type Bars = { device: string; ios: boolean; w: number; h: number; statusDp: number; navDp: number; side: 'left' | 'right' | null; sideDp: number; duo: boolean; folded: boolean; cut: [number, number]; radius: number; topCam: TopCam | null };
export type TopCam = { x0: number; x1: number; cy: number };
type Ink = 'dark' | 'light';
type Region = [number, number, number, number];

export function barsOf(systemUi: SystemUi | null, size: Size | null, deviceInsets: DeviceInsets | null = null): Bars | null {
  const b = systemUi?.shown ? systemUi.bars : null;
  if (!b?.insets || size?.kind !== 'device') return null;
  const cutout = deviceInsets?.values.displayCutout, cam = cameraOf(sizeKey(size));
  const topCam = cam && cam.y < b.insets.statusDp ? { x0: cam.x, x1: cam.x + cam.w, cy: cam.y + cam.h / 2 } : null;
  const area = size.insetProfile?.safeArea, duo = size.device === 'duo';
  const side = duo && area ? (area.left > 0 ? 'left' : area.right > 0 ? 'right' : null) : null;
  return { device: size.device, ios: b.look === 'ios', w: size.widthDp, h: size.heightDp, statusDp: b.insets.statusDp, navDp: b.insets.navDp,
    side, sideDp: side && area ? area[side] : 0, duo, folded: size.folded, cut: [cutout?.left ?? 0, cutout?.right ?? 0], radius: DEVICES[size.device]?.look?.[size.folded ? 'cover' : 'open']?.radius ?? 0, topCam };
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

// 세로 상태바의 자리 · 크기는 iOS 27.0 시뮬레이터(9:41 · 막대 4 · Wi-Fi 3 · 배터리 100%) 3x 스크린숏을 pt 로 잰 값이다(시안: prototypes/ios-status-bar). 단 iPhone SE 3세대는 시뮬레이터가 없어 눈대중한 근사다 — 사람 확인 전.
// top · right 는 오른쪽 아이콘 묶음(신호 왼쪽 끝 ~ 배터리 꼭지)의 윗변 · 오른쪽 끝, s 는 iPhone 17 대비 배율, time 은 시각의 가운데 · 기준선 · 글자 크기다.
// 값은 기기 스펙의 look.status 다(devices.js). 묶음 가운데가 아일랜드 가운데(resize-scene.js 의 cam)와 같은 높이에 놓인다(아일랜드가 없는 SE · 노치 17e 는 위 띠 가운데). left 가 있으면 신호 · Wi-Fi 와 배터리가 갈린다.

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

export function IosStatus({ bars }: { bars: Bars }) {
  if (bars.duo) return <DuoStatus bars={bars} />;
  const layout = DEVICES[bars.device]?.status;
  if (!layout) return null;
  const time = <text className="sb-time" x={layout.time.cx} y={layout.time.base} textAnchor="middle" fontSize={layout.time.size} fontWeight={600}>9:41</text>;
  if (layout.left === undefined) return <g className="sb-status" data-edge="top">
    {time}
    <g className="sb-icons" transform={`translate(${layout.right - GROUP_W * layout.s} ${layout.top}) scale(${layout.s})`}>{SIGNAL}{WIFI}{BATTERY}</g>
  </g>;
  // 갈린 상태바(홈 버튼 기기) — 신호 · Wi-Fi 는 왼쪽 끝(left)에, 배터리는 오른쪽 끝(right)에 따로 놓는다. 좌표는 같은 묶음 안이다(배터리 x 51.5~78.33).
  const place = (x: number) => `translate(${x} ${layout.top}) scale(${layout.s})`;
  return <g className="sb-status" data-edge="top">
    {time}
    <g className="sb-icons sb-icons-left" transform={place(layout.left)}>{SIGNAL}{WIFI}</g>
    <g className="sb-icons sb-icons-right" transform={place(layout.right - GROUP_W * layout.s)}>{BATTERY}</g>
  </g>;
}

// Android 기기는 제조사와 상관없이 공통 Material(AOSP) 모양 한 벌이다(시안: prototypes/android-status-bar, 2026-11-11 사용자가 골랐다).
// 아이콘은 Material 아이콘을 따른 근사다. 상태 줄의 세로 가운데는 위 띠의 카메라 가운데(없으면 띠 가운데)이고, 좌우는 EDGE · 옆 컷아웃 · 둥근 화면 모서리가 상자를 자르지 않는 여백(cornerInset)만큼 안에서 위 카메라를 비켜 선다.
// 크기는 상태바 높이에 비례한다 — ROW_BASE(띠 24dp)에서 1배, ROW_TOP(66dp, Pixel 9 세로)부터 ROW_GROW 만큼 큰 상한이다.
const EDGE = 20, CAM_GAP = 8, A_ICONS_W = 46, A_ICONS_H = 13, A_TIME = 14, ROW_BASE = 24, ROW_TOP = 66, ROW_GROW = .3;
const A_ICONS = <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
  <path d={`M8.85 12.5 L${at(8.85, 12.5, 12, -45)} A12 12 0 0 1 ${at(8.85, 12.5, 12, 45)} Z`} />
  <path d="M22 13 L35 13 L35 0 Z" />
  <rect x="41.5" y="-.2" width="3" height="1.6" rx=".5" strokeWidth="0" />
  <rect x="40" y="1.4" width="6" height="11.6" rx="1.2" strokeWidth="0" />
</g>;
// 제스처 핸들 108×4 — 측정 자료가 모두 제스처 내비게이션이라 버튼 바는 없다. 내비 띠 가운데(24dp 보다 두꺼우면 아래 24dp 의 가운데)에 둔다.
const A_HANDLE = { w: 108, h: 4, band: 24 };

// 둥근 화면 모서리(반경 r)가 윗변 높이 top 의 상자 꼭짓점을 자르지 않는 가장자리 쪽 최소 여백 — 원 방정식으로 푼다. 윗변이 r 보다 아래면 0.
// 시각 글자 상자의 높이 ÷ 글꼴 크기 — 측정한 상자(sb-time)를 덮는 근사다.
const TEXT_BOX = 1.3;
const cornerInset = (r: number, top: number) => r > 0 && top < r ? r - Math.sqrt(r * r - (r - Math.max(0, top)) ** 2) : 0;

function androidRow(bars: Bars) {
  const k = 1 + ROW_GROW * Math.min(1, Math.max(0, (bars.statusDp - ROW_BASE) / (ROW_TOP - ROW_BASE))), cam = bars.topCam;
  const camLeft = cam && cam.x1 < bars.w / 2, camRight = cam && cam.x0 > bars.w / 2;
  const y = cam ? cam.cy : bars.statusDp / 2;
  const roundTime = cornerInset(bars.radius, y - A_TIME * k * TEXT_BOX / 2), roundIcons = cornerInset(bars.radius, y - A_ICONS_H * k / 2);
  const left = Math.max(EDGE + bars.cut[0], roundTime, camLeft ? cam.x1 + CAM_GAP : 0);
  const right = Math.min(bars.w - EDGE - bars.cut[1], bars.w - roundIcons, camRight ? cam.x0 - CAM_GAP : Infinity);
  return { k, y, left, right };
}

function AndroidStatus({ bars }: { bars: Bars }) {
  const { k, y, left, right } = androidRow(bars);
  return <g className="sb-status sb-android-status" data-edge="top">
    <text className="sb-time" x={left} y={y} dominantBaseline="central" fontSize={A_TIME * k} fontWeight={500}>9:41</text>
    <g className="sb-icons" transform={`translate(${right - A_ICONS_W * k} ${y - A_ICONS_H / 2 * k}) scale(${k})`}>{A_ICONS}</g>
  </g>;
}

function NavHandle({ bars }: { bars: Bars }) {
  if (bars.ios) return <rect className="sb-handle" x={(bars.w - 134) / 2} y={bars.h - 13} width="134" height="5" rx="2.5" />;
  const cy = bars.h - Math.min(bars.navDp, A_HANDLE.band) / 2;
  return <rect className="sb-handle" x={(bars.w - A_HANDLE.w) / 2} y={cy - A_HANDLE.h / 2} width={A_HANDLE.w} height={A_HANDLE.h} rx={A_HANDLE.h / 2} />;
}

export function SystemBarsOverlay({ systemUi, size, deviceInsets = null, host }: { systemUi: SystemUi | null; size: Size | null; deviceInsets?: DeviceInsets | null; host?: HTMLElement }) {
  const { element, place } = useHost(host);
  const bars = barsOf(systemUi, size, deviceInsets);
  const img = element?.parentElement?.querySelector<HTMLImageElement>('#shot') ?? null;
  const [status, bottom] = useInk(img, bars);
  useLayoutEffect(() => { if (element) element.hidden = !bars; }, [element, bars]);
  const body = bars && <svg viewBox={`0 0 ${bars.w} ${bars.h}`} preserveAspectRatio="none" fill="currentColor" aria-hidden="true">
    {(bars.statusDp > 0 || bars.side) && <g className={`sb-ink-${status}`}>{bars.ios ? <IosStatus bars={bars} /> : <AndroidStatus bars={bars} />}</g>}
    {!bars.duo && bars.navDp > 0 && <g className={`sb-ink-${bottom}`}><NavHandle bars={bars} /></g>}
  </svg>;
  return place(body, systemBarsHost);
}
