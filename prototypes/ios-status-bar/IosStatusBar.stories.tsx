import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import '../../viewer-src/legacy/resize.css';
import './ios-status-bar.css';

// iPhone 시스템 바(SystemBars.tsx 의 IosStatus)를 iOS 처럼 다시 그릴 때의 후보 — 지금 모양을 기준으로 기기 실제 크기(1dp = 1px)에서 본다.
// 수치는 iOS 27.0 시뮬레이터(Xcode 27.1, status_bar override 9:41 · 막대 4 · Wi-Fi 3 · 배터리 100%)의 3x 스크린숏을 pt 로 잰 값이다(2026-11-11).
// 고른 것(2026-11-11, 사용자): A 실측. SystemBars.tsx 의 IosStatus 와 장면의 iPhone 아일랜드(cam)에 옮겼고, 이 스토리는 고른 기록으로 남는다.
// 모서리는 장면(plugin/viewer/js/resize-scene.js)의 값이다. 아일랜드는 알림이 뜨는 순간의 스크린숏에서 잰 값(125.33×36.67, 위 14 · Air 20)이고, 지금 장면은 셋 다 124×36 · 위 11 이다.
const meta = { title: '시안/iPhone 시스템 바' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type Device = { id: string; name: string; w: number; h: number; statusDp: number; navDp: number; radius: number;
  islandY: number; top: number; right: number; s: number; time: { cx: number; base: number; size: number } };

// top · right 는 오른쪽 아이콘 묶음(신호 왼쪽 끝 ~ 배터리 꼭지 오른쪽 끝)의 윗변 · 오른쪽 끝, s 는 iPhone 17 대비 배율, time 은 시각 글자의 가운데 · 기준선 · 크기다.
const DEVICES: Device[] = [
  { id: 'ip17', name: 'iPhone 17', w: 402, h: 874, statusDp: 62, navDp: 34, radius: 55, islandY: 14,
    top: 26.33, right: 366.67, s: 1, time: { cx: 72.67, base: 39, size: 17 } },
  { id: 'ipair', name: 'iPhone Air', w: 420, h: 912, statusDp: 68, navDp: 34, radius: 57, islandY: 20,
    top: 31.33, right: 385.33, s: 1.12, time: { cx: 76.33, base: 45.33, size: 17.7 } },
  { id: 'ip17pm', name: 'iPhone 17 Pro Max', w: 440, h: 956, statusDp: 62, navDp: 34, radius: 60, islandY: 14,
    top: 25.33, right: 399.33, s: 1.12, time: { cx: 82.33, base: 39.33, size: 17.7 } },
];
type Island = { w: number; h: number; y: number };
const NOW_ISLAND: Island = { w: 124, h: 36, y: 11 };
const islandOf = (d: Device): Island => ({ w: 125.33, h: 36.67, y: d.islandY });

// 지금 — SystemBars.tsx 의 IosStatus 그대로.
const NOW_SIGNAL = (x: number, y: number) => <g transform={`translate(${x} ${y})`}>
  <rect x="0" y="7" width="3" height="4" rx=".8" /><rect x="4.5" y="5" width="3" height="6" rx=".8" />
  <rect x="9" y="2.5" width="3" height="8.5" rx=".8" /><rect x="13.5" y="0" width="3" height="11" rx=".8" />
</g>;
const NOW_WIFI = (x: number, y: number) => <g transform={`translate(${x} ${y})`}><path d="M7.5 11 L0 3.2 A11 11 0 0 1 15 3.2 Z" /></g>;
const NOW_BATTERY = (x: number, y: number) => <g transform={`translate(${x} ${y})`}>
  <rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45" />
  <rect x="2" y="2" width="19" height="8" rx="1.8" /><rect x="23.5" y="4" width="1.6" height="4" rx=".8" opacity=".45" />
</g>;
function NowStatus({ d }: { d: Device }) {
  const ear = (d.w - 126) / 4, mid = d.statusDp / 2 + 2;
  return <>
    <text x={ear} y={mid} dominantBaseline="central" textAnchor="middle" fontSize="17" fontWeight={600}>9:41</text>
    {NOW_SIGNAL(d.w - ear - 36, mid - 5.5)}{NOW_WIFI(d.w - ear - 14, mid - 5.5)}{NOW_BATTERY(d.w - ear + 6, mid - 6)}
  </>;
}

// 후보 — 실측 그림. 좌표는 iPhone 17(배율 1)의 오른쪽 묶음 안이고, 윗변이 y 0, 신호 왼쪽 끝이 x 0 이다.
const GROUP_W = 78.33;
const at = (cx: number, cy: number, r: number, deg: number) => { const a = deg * Math.PI / 180; return `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`; };
// Wi-Fi 부채꼴 한 겹 — 가운데 o 에서 반지름 inner~outer, 위로 ±half 도. 모서리는 획(round join)으로 둥글게 하고 그만큼 안으로 줄인다.
const band = (cx: number, cy: number, inner: number, outer: number, half: number) => inner > 0
  ? `M${at(cx, cy, outer, -half)} A${outer} ${outer} 0 0 1 ${at(cx, cy, outer, half)} L${at(cx, cy, inner, half)} A${inner} ${inner} 0 0 0 ${at(cx, cy, inner, -half)} Z`
  : `M${cx} ${cy} L${at(cx, cy, outer, -half)} A${outer} ${outer} 0 0 1 ${at(cx, cy, outer, half)} Z`;
const ROUND = .5, WIFI_O = { x: 35.33, y: 12.6 }, WIFI_HALF = 41;
const SIGNAL = <>{[4.67, 7, 9.67, 12.33].map((h, i) => <rect key={i} x={i * 5.33} y={12.33 - h} width="3.33" height={h} rx="1" />)}</>;
const WIFI = <g stroke="currentColor" strokeWidth={ROUND * 2} strokeLinejoin="round">
  <path d={band(WIFI_O.x, WIFI_O.y, 10 + ROUND, 12.6 - ROUND, WIFI_HALF)} />
  <path d={band(WIFI_O.x, WIFI_O.y, 6 + ROUND, 8.27 - ROUND, WIFI_HALF)} />
  <path d={band(WIFI_O.x, WIFI_O.y - ROUND, 0, 3.93 - ROUND, WIFI_HALF)} />
</g>;
function Battery({ percent }: { percent: boolean }) {
  return <>
    <rect x="51.5" y=".17" width="24" height="12" rx="3.7" fill="none" stroke="currentColor" opacity=".4" />
    {percent
      ? <><mask id="isb-pct"><rect x="53" y="1.67" width="21" height="9" fill="white" />
            <text x="63.5" y="6.3" dominantBaseline="central" textAnchor="middle" fontSize="9" fontWeight={700} fill="black" letterSpacing="-.2">100</text></mask>
          <rect x="53" y="1.67" width="21" height="9" rx="2.3" mask="url(#isb-pct)" /></>
      : <rect x="53" y="1.67" width="21" height="9" rx="2.3" />}
    <path d="M77 4.17h.4a.93.93 0 0 1 .93.93v2.14a.93.93 0 0 1-.93.93H77z" opacity=".5" />
  </>;
}
function MeasuredStatus({ d, percent = false }: { d: Device; percent?: boolean }) {
  return <>
    <text x={d.time.cx} y={d.time.base} textAnchor="middle" fontSize={d.time.size} fontWeight={600}>9:41</text>
    <g transform={`translate(${d.right - GROUP_W * d.s} ${d.top}) scale(${d.s})`}>{SIGNAL}{WIFI}<Battery percent={percent} /></g>
  </>;
}

// 홈 인디케이터 — 지금과 후보가 같다(시뮬레이터 앱 화면에서 잰 값으로 맞춘다).
const HOME = (d: Device) => <rect x={(d.w - 134) / 2} y={d.h - 13} width="134" height="5" rx="2.5" />;

type Look = { key: string; name: string; why: string; island: (d: Device) => Island; status: (d: Device) => ReactNode };
const LOOKS: Look[] = [
  { key: 'now', name: '지금', why: 'Wi-Fi 가 쐐기 하나, 아이콘이 작고 자리가 기기마다 같은 식(귀 가운데 · statusDp/2)입니다. 아일랜드가 3pt 높고 작습니다.', island: () => NOW_ISLAND, status: d => <NowStatus d={d} /> },
  { key: 'A', name: 'A 실측 ✓', why: '시뮬레이터에서 잰 자리 · 크기 · 모양. Wi-Fi 부채꼴 세 겹, 막대 넷, 테두리가 옅은 배터리. Air · Pro Max 는 아이콘이 1.12배이고, 아이콘 줄 가운데가 아일랜드 가운데와 같습니다. 아일랜드도 실측 자리로 옮깁니다.', island: islandOf, status: d => <MeasuredStatus d={d} /> },
  { key: 'B', name: 'B 실측 + 배터리 숫자', why: 'A 에 "배터리 잔량(%)" 설정을 켠 모양 — 배터리 안에 숫자를 뚫어 그립니다.', island: islandOf, status: d => <MeasuredStatus d={d} percent /> },
];

const TOP_H = 76, BOTTOM_H = 44;
type Ground = 'bright' | 'dark';
/** 화면 한 조각 — 위(상태바)나 아래(홈 인디케이터)를 기기 dp 좌표 그대로 자른다. 바깥은 기기 몸체, 화면 모서리는 장면의 반지름이다. */
function Strip({ d, look, ground, part, zoom = 1 }: { d: Device; look: Look; ground: Ground; part: 'top' | 'bottom'; zoom?: number }) {
  const y0 = part === 'top' ? 0 : d.h - BOTTOM_H, vh = part === 'top' ? TOP_H : BOTTOM_H;
  const ink = ground === 'bright' ? 'dark' : 'light';
  return <svg className="isb-strip" width={d.w * zoom} height={vh * zoom} viewBox={`0 ${y0} ${d.w} ${vh}`} fill="currentColor" aria-hidden="true">
    <rect className="isb-body" x="0" y={y0} width={d.w} height={vh} />
    <rect className={`isb-ground isb-${ground}`} x="0" y="0" width={d.w} height={d.h} rx={d.radius} />
    {part === 'top' && (i => <rect className="isb-island" x={(d.w - i.w) / 2} y={i.y} width={i.w} height={i.h} rx={i.h / 2} />)(look.island(d))}
    <g className="sys-bars"><g className={`sb-ink-${ink}`}>{part === 'top' ? look.status(d) : HOME(d)}</g></g>
  </svg>;
}

function Phone({ d, look, ground }: { d: Device; look: Look; ground: Ground }) {
  return <figure className="isb-phone">
    <Strip d={d} look={look} ground={ground} part="top" />
    <Strip d={d} look={look} ground={ground} part="bottom" />
  </figure>;
}

function Sheet({ theme }: { theme: 'light' | 'dark' }) {
  return <section className="isb-sheet" data-theme={theme}>
    <h2>{theme === 'light' ? '라이트' : '다크'} 뷰어</h2>
    {LOOKS.map(look => <div key={look.key}>
      <h3>{look.name}</h3>
      <p className="isb-note">{look.why}</p>
      <div className="isb-grid">
        {DEVICES.map(d => <div className="isb-col" key={d.id}>
          <span className="isb-tag">{d.name} · {d.w}dp</span>
          <Phone d={d} look={look} ground="bright" />
          <Phone d={d} look={look} ground="dark" />
        </div>)}
      </div>
    </div>)}
    <div>
      <h3>크게 보기(3배) — iPhone 17 상태바</h3>
      <div className="isb-big">{LOOKS.map(look => <div key={look.key}>
        <span className="isb-tag">{look.name}</span>
        <Strip d={DEVICES[0]} look={look} ground="bright" part="top" zoom={3} />
        <Strip d={DEVICES[0]} look={look} ground="dark" part="top" zoom={3} />
      </div>)}</div>
    </div>
  </section>;
}

export const Candidates: Story = { name: '후보', render: () => <div className="isb-sheets"><Sheet theme="light" /><Sheet theme="dark" /></div> };
