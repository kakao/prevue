import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { IosStatus, type Bars } from '../../viewer-src/src/components/SystemBars';
import '../../viewer-src/legacy/resize.css';
import './android-status-bar.css';

// Android 기기 시스템 바를 뷰어 오버레이로 그릴 때의 후보(D-176) — 기기 실제 크기(1dp = 1px, 넓은 기기는 줄여서)에서 본다.
// 상태바 · 내비게이션 높이는 windowinsets.info 측정값(PixelDeviceInsets · SamsungDeviceInsets)이고, 측정 26건이 모두 제스처 내비게이션이라 버튼 바는 없다.
// 아이콘 모양 · 자리는 Material 아이콘과 실기기 인상을 따른 근사다 — iOS 처럼 기기 스크린숏으로 잰 값이 아니다.
// 모서리 · 카메라는 고를 때(2026-11-11)의 장면(plugin/viewer/js/resize-scene.js) 값이다 — 지금 장면 카메라는 windowinsets.info 컷아웃을 따른다.
// 고른 것(2026-11-11, 사용자): A 공통 Material — 제조사와 상관없이 한 벌. SystemBars.tsx 의 AndroidStatus · NavHandle 에 옮겼고, 이 스토리는 고른 기록으로 남는다.
// 고를 때 뷰어는 장면의 카메라 · 모서리를 몰라 줄 높이를 상태바 가운데(최대 17), 좌우 여백을 20 + 옆 컷아웃으로 단순화했고, 위 구석 카메라(Pixel 9 Pro Fold 펼침 세로)만 따로 피했다 — 지금은 SystemBars.tsx 가 장면의 cameraOf 로 위 띠 카메라 가운데에 맞춘다.
const meta = { title: '시안/Android 시스템 바' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type Maker = 'pixel' | 'samsung';
type Cam = { cx: number; cy: number; r: number };
type Device = { id: string; name: string; maker: Maker; w: number; h: number; statusDp: number; navDp: number;
  radius: number; cam: Cam | null; cutL?: number; cutR?: number; zoom?: number };

const DEVICES: Device[] = [
  { id: 's26', name: 'Galaxy S26 세로', maker: 'samsung', w: 360, h: 780, statusDp: 37, navDp: 15, radius: 26, cam: { cx: 180, cy: 16.5, r: 4.5 } },
  { id: 'pixel9', name: 'Pixel 9 세로', maker: 'pixel', w: 411.43, h: 923.43, statusDp: 65.9, navDp: 24, radius: 34, cam: { cx: 205.71, cy: 18, r: 5 } },
  { id: 'pixelfold', name: 'Pixel 9 Pro Fold 펼침 세로', maker: 'pixel', w: 851.69, h: 882.87, statusDp: 55.79, navDp: 24.21, radius: 24, cam: { cx: 783.6, cy: 16.5, r: 4.5 }, zoom: .6 },
  { id: 's26-l', name: 'Galaxy S26 가로 왼쪽', maker: 'samsung', w: 780, h: 360, statusDp: 30, navDp: 15, radius: 26, cam: null, cutL: 37, zoom: .6 },
  { id: 'pixelfold-r', name: 'Pixel 9 Pro Fold 펼침 가로 오른쪽', maker: 'pixel', w: 882.87, h: 851.69, statusDp: 36.1, navDp: 55.79, radius: 24, cam: { cx: 812.2, cy: 835.2, r: 4.5 }, zoom: .6 },
  { id: 'tablet', name: 'Pixel Tablet 가로', maker: 'pixel', w: 1280, h: 800, statusDp: 24, navDp: 32, radius: 34, cam: null, zoom: .45 },
];

// 상태 줄의 가운데 높이 — 위에 카메라 구멍이 있으면 그 가운데(실기기에서 아이콘 줄이 구멍과 같은 높이다), 없으면 상태바 가운데.
const rowY = (d: Device) => d.cam && d.cam.cy < d.statusDp ? d.cam.cy : d.statusDp / 2;
// 좌우 여백 — 둥근 모서리만큼 안으로, 컷아웃이 옆에 있으면 그만큼 더, 구석 카메라가 위에 있으면 그 앞에서 멈춘다.
function edges(d: Device): [number, number] {
  const pad = Math.max(16, d.radius * .7);
  let left = pad + (d.cutL ?? 0), right = d.w - pad - (d.cutR ?? 0);
  if (d.cam && d.cam.cy < d.statusDp) {
    if (d.cam.cx > d.w * .6) right = Math.min(right, d.cam.cx - d.cam.r - 10);
    if (d.cam.cx < d.w * .4) left = Math.max(left, d.cam.cx + d.cam.r + 10);
  }
  return [left, right];
}

const at = (cx: number, cy: number, r: number, deg: number) => { const a = deg * Math.PI / 180; return `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`; };
const wedge = (cx: number, cy: number, r: number, half: number) => `M${cx} ${cy} L${at(cx, cy, r, -half)} A${r} ${r} 0 0 1 ${at(cx, cy, r, half)} Z`;
const band = (cx: number, cy: number, inner: number, outer: number, half: number) =>
  `M${at(cx, cy, outer, -half)} A${outer} ${outer} 0 0 1 ${at(cx, cy, outer, half)} L${at(cx, cy, inner, half)} A${inner} ${inner} 0 0 0 ${at(cx, cy, inner, -half)} Z`;

// 아이콘 묶음 — 높이 13 의 줄 안, 왼쪽 끝 x 0. width 는 오른쪽 끝이다.
type Glyphs = { width: number; body: ReactNode };
type Look = { key: string; name: string; time: { size: number; weight: number; spacing?: number }; icons: Glyphs; handle: { w: number; h: number } };

// 공통 Material — Android 기본(AOSP) 아이콘: 꽉 찬 부채꼴 Wi-Fi, 직각삼각형 신호, 세로 배터리.
const MATERIAL: Look = { key: 'material', name: 'Material', time: { size: 14, weight: 500 }, handle: { w: 108, h: 4 },
  icons: { width: 46, body: <g strokeLinejoin="round" stroke="currentColor" strokeWidth="1">
    <path d={wedge(8.85, 12.5, 12, 45)} />
    <path d="M22 13 L35 13 L35 0 Z" />
    <rect x="41.5" y="-.2" width="3" height="1.6" rx=".5" strokeWidth="0" />
    <rect x="40" y="1.4" width="6" height="11.6" rx="1.2" strokeWidth="0" />
  </g> } };

// Pixel — Android 16 Material 3 Expressive: 둥근 부채꼴 · 둥근 삼각형, 가로 알약 배터리, 시각이 조금 크다.
const PIXEL: Look = { key: 'pixel', name: 'Pixel', time: { size: 15, weight: 500, spacing: .2 }, handle: { w: 108, h: 4 },
  icons: { width: 63, body: <>
    <g strokeLinejoin="round" stroke="currentColor" strokeWidth="2.4"><path d={wedge(9, 11.6, 10.4, 44)} /><path d="M23.5 12 L34.5 12 L34.5 1 Z" /></g>
    <rect x="40" y="1.25" width="20.5" height="10.5" rx="4.2" />
    <rect x="61.2" y="4.5" width="1.8" height="4" rx=".9" opacity=".55" />
  </> } };

// One UI — 8.5: 얇은 시각, 세 겹 Wi-Fi, 막대 넷 신호, 테두리 있는 가로 배터리, 가는 제스처 힌트.
const ONE_UI: Look = { key: 'oneui', name: 'One UI', time: { size: 13.5, weight: 400 }, handle: { w: 116, h: 3 },
  icons: { width: 57, body: <>
    <g stroke="currentColor" strokeWidth="1" strokeLinejoin="round">
      <path d={band(8, 12.4, 8.6, 11, 44)} /><path d={band(8, 12.4, 4.6, 6.8, 44)} /><path d={wedge(8, 12.4, 2.8, 44)} />
    </g>
    {[3.8, 6.4, 9, 11.6].map((h, i) => <rect key={i} x={20 + i * 3.6} y={12.4 - h} width="2.4" height={h} rx=".7" />)}
    <rect x="35.5" y="1.2" width="19.5" height="10.4" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity=".45" />
    <rect x="37" y="2.7" width="16.5" height="7.4" rx="1.8" />
    <path d="M56 4.9h.3a.7.7 0 0 1 .7.7v1.6a.7.7 0 0 1-.7.7H56z" opacity=".5" />
  </> } };

function AndroidStatus({ d, look }: { d: Device; look: Look }) {
  const [left, right] = edges(d), y = rowY(d);
  return <>
    <text x={left} y={y} dominantBaseline="central" fontSize={look.time.size} fontWeight={look.time.weight} letterSpacing={look.time.spacing}>9:41</text>
    <g transform={`translate(${right - look.icons.width} ${y - 6.5})`}>{look.icons.body}</g>
  </>;
}
// 제스처 핸들 — 내비게이션 띠 가운데(24dp 보다 두꺼우면 아래 24dp 의 가운데)에 둔다.
const handleOf = (d: Device, look: Look) => {
  const cy = d.h - Math.min(d.navDp, 24) / 2;
  return <rect x={(d.w - look.handle.w) / 2} y={cy - look.handle.h / 2} width={look.handle.w} height={look.handle.h} rx={look.handle.h / 2} />;
};

type Option = { key: string; name: string; why: string; lookOf: (d: Device) => Look };
const OPTIONS: Option[] = [
  { key: 'A', name: 'A 공통 Material ✓', why: '모든 Android 기기에 같은 AOSP 모양을 씁니다. 기기마다 다른 것은 높이 · 카메라 · 모서리뿐입니다. 하나만 유지하면 됩니다.', lookOf: () => MATERIAL },
  { key: 'B', name: 'B 제조사별', why: 'Pixel 기기(Pixel 9 · 9 Pro Fold · Tablet)는 Android 16 Pixel 모양, Galaxy(S26 · Fold8 · Fold8 Ultra)는 One UI 8.5 모양입니다. 실제 기기 인상에 가깝지만 두 벌을 유지합니다.', lookOf: d => d.maker === 'pixel' ? PIXEL : ONE_UI },
];

type Ground = 'bright' | 'dark';
function Strip({ d, look, ground, part, zoom = d.zoom ?? 1 }: { d: Device; look: Look; ground: Ground; part: 'top' | 'bottom'; zoom?: number }) {
  const topH = d.statusDp + 14, bottomH = Math.max(d.navDp, 24) + 14;
  const y0 = part === 'top' ? 0 : d.h - bottomH, vh = part === 'top' ? topH : bottomH;
  const ink = ground === 'bright' ? 'dark' : 'light';
  return <svg className="asb-strip" width={d.w * zoom} height={vh * zoom} viewBox={`0 ${y0} ${d.w} ${vh}`} fill="currentColor" aria-hidden="true">
    <rect className="asb-body" x="0" y={y0} width={d.w} height={vh} />
    <rect className={`asb-${ground}`} x="0" y="0" width={d.w} height={d.h} rx={d.radius} />
    {d.cam && <circle className="asb-cam" cx={d.cam.cx} cy={d.cam.cy} r={d.cam.r} />}
    <g className="sys-bars"><g className={`sb-ink-${ink}`}>{part === 'top' ? <AndroidStatus d={d} look={look} /> : handleOf(d, look)}</g></g>
  </svg>;
}

function Phone({ d, look, ground }: { d: Device; look: Look; ground: Ground }) {
  return <figure className="asb-phone">
    <Strip d={d} look={look} ground={ground} part="top" />
    <Strip d={d} look={look} ground={ground} part="bottom" />
  </figure>;
}

// 비교용 — 이미 고른 iPhone 17 상태바(SystemBars.tsx 의 IosStatus, 시안 A 실측)와 홈 인디케이터.
const IP17: Bars = { device: 'ip17', ios: true, cut: [0, 0], topCam: null, w: 402, h: 874, statusDp: 62, navDp: 34, side: null, sideDp: 0, duo: false, folded: false };
function IosStrip({ ground, zoom = 1 }: { ground: Ground; zoom?: number }) {
  const ink = ground === 'bright' ? 'dark' : 'light';
  return <svg className="asb-strip" width={IP17.w * zoom} height={76 * zoom} viewBox={`0 0 ${IP17.w} 76`} fill="currentColor" aria-hidden="true">
    <rect className="asb-body" x="0" y="0" width={IP17.w} height="76" />
    <rect className={`asb-${ground}`} x="0" y="0" width={IP17.w} height={IP17.h} rx="55" />
    <rect className="asb-cam" x={(IP17.w - 125.33) / 2} y="14" width="125.33" height="36.67" rx="18.33" />
    <g className="sys-bars"><g className={`sb-ink-${ink}`}><IosStatus bars={IP17} /></g></g>
  </svg>;
}

function Sheet({ theme }: { theme: 'light' | 'dark' }) {
  return <section className="asb-sheet" data-theme={theme}>
    <h2>{theme === 'light' ? '라이트' : '다크'} 뷰어</h2>
    <div>
      <h3>비교 — iPhone 17 (고른 iOS 안)</h3>
      <div className="asb-grid"><IosStrip ground="bright" /><IosStrip ground="dark" /></div>
    </div>
    {OPTIONS.map(o => <div key={o.key}>
      <h3>{o.name}</h3>
      <p className="asb-note">{o.why}</p>
      <div className="asb-grid">
        {DEVICES.map(d => <div className="asb-col" key={d.id}>
          <span className="asb-tag">{d.name} · {Math.round(d.w)}dp · 상태 {d.statusDp} · 내비 {d.navDp}{d.zoom ? ` · ×${d.zoom}` : ''}</span>
          <Phone d={d} look={o.lookOf(d)} ground="bright" />
          <Phone d={d} look={o.lookOf(d)} ground="dark" />
        </div>)}
      </div>
    </div>)}
    <div>
      <h3>크게 보기(3배) — 상태바</h3>
      <div className="asb-big">
        <div><span className="asb-tag">iPhone 17 (iOS)</span><IosStrip ground="bright" zoom={3} /></div>
        {[MATERIAL, PIXEL, ONE_UI].map(look => <div key={look.key}>
          <span className="asb-tag">{look.name} — {look === ONE_UI ? 'Galaxy S26' : 'Pixel 9'}</span>
          <Strip d={look === ONE_UI ? DEVICES[0] : DEVICES[1]} look={look} ground="bright" part="top" zoom={3} />
          <Strip d={look === ONE_UI ? DEVICES[0] : DEVICES[1]} look={look} ground="dark" part="top" zoom={3} />
        </div>)}
      </div>
    </div>
  </section>;
}

export const Candidates: Story = { name: '후보', render: () => <div className="asb-sheets"><Sheet theme="light" /><Sheet theme="dark" /></div> };
