import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import './flip8-cover-camera.css';

// Galaxy Z Flip8 커버의 카메라 컷아웃 시안 — 사각 노치 대신 실물처럼 둥근 구멍 셋을 그릴 때의 모양을 고른다.
// 화면 크기 · 모서리 · 배제 상자는 plugin/devices/flip8.json 의 값이다(948×1048px · 380dpi → 399.16×441.26dp).
// 배제 상자는 실기기 dumpsys display 의 boundingRect Rect(428, 839 - 948, 1048)px = 218.95×88dp 아래 · 오른쪽에 붙은 사각이다.
// 구멍 셋은 실물 사진(2026-11-18)을 adb 스크린숏 글자 10곳에 맞춘 호모그래피로 펴서 잰 값이다(±2dp, 화면 왼쪽 위 기준 dp).
// 고른 것(2026-11-18, 사용자): B 렌즈 링 — 렌즈 둘에 얇은 테와 유리 반점, 플래시는 평면 구멍.
// 내비 핸들은 데몬 DeviceChrome 의 규칙대로 배제 상자 옆 남은 띠 중 넓은 쪽 가운데다. 화면 내용은 다이얼러를 흉내 낸 그림이다.
const meta = { title: '시안/Flip8 커버 카메라', args: { box: true, zoom: 1.25 } } satisfies Meta<Args>;
export default meta;
type Args = { box: boolean; zoom: number };
type Story = StoryObj<Args>;

const W = 948 / 380 * 160, H = 1048 / 380 * 160;
const RADIUS = [5.05, 5.05, 40.84, 40.84] as const;
const BEZEL = 5;
const BOX = { x: .7257 * W - 218.95 / 2, y: H - 88, w: 218.95, h: 88, notch: 24 };
const HOLES = [
  { name: '플래시', cx: 206.3, cy: 394.2, d: 29 },
  { name: '렌즈 1', cx: 271.2, cy: 396.5, d: 76 },
  { name: '렌즈 2', cx: 351.8, cy: 397.3, d: 76 },
];
const HANDLE = { cx: BOX.x / 2, cy: H - 12, w: 108, h: 4 };

const f = (n: number) => n.toFixed(2);
// 네 모서리 반경이 다른 사각(좌상 · 우상 · 우하 · 좌하)
function rounded(x: number, y: number, w: number, h: number, [a, b, c, d]: readonly number[]) {
  return `M${f(x + a)} ${f(y)}H${f(x + w - b)}A${b} ${b} 0 0 1 ${f(x + w)} ${f(y + b)}V${f(y + h - c)}A${c} ${c} 0 0 1 ${f(x + w - c)} ${f(y + h)}`
    + `H${f(x + d)}A${d} ${d} 0 0 1 ${f(x)} ${f(y + h - d)}V${f(y + a)}A${a} ${a} 0 0 1 ${f(x + a)} ${f(y)}Z`;
}

// 다이얼러를 흉내 낸 화면 — 구멍 둘레에 내용이 보이는지 보려는 그림이라 자리는 실물 인상만 따른다.
function Content() {
  const keys = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];
  return <g>
    <rect className="fcc-screen" x={0} y={0} width={W} height={H} />
    {keys.map(([k, s], i) => {
      const x = 52 + (i % 3) * 82, y = 150 + Math.floor(i / 3) * 52;
      return <g key={k}><text className="fcc-ink" x={x} y={y} fontSize={30}>{k}</text><text className="fcc-ink-soft" x={x + 22} y={y} fontSize={12}>{s}</text></g>;
    })}
    <circle className="fcc-call" cx={W - 52} cy={192} r={26} />
    <rect className="fcc-ink-soft" x={32} y={330} width={150} height={22} rx={11} />
    <rect className="fcc-ink-soft" x={30} y={372} width={140} height={14} rx={7} />
    <rect className="fcc-ink-soft" x={30} y={300} width={W - 60} height={10} rx={5} />
  </g>;
}

type Look = { key: string; name: string; note: string; draw: () => ReactNode };
const NOTCH: Look = { key: 'now', name: '지금 · 사각 노치', note: '배제 상자를 그대로 칠한다(안쪽 모서리 24dp).',
  draw: () => <path className="fcc-cam" d={rounded(BOX.x, BOX.y, BOX.w + 1, BOX.h + 1, [BOX.notch, 0, 0, 0])} /> };
const FLAT: Look = { key: 'a', name: 'A · 구멍 셋, 평면', note: '다른 기기의 펀치홀과 같은 카메라 색 한 겹.',
  draw: () => HOLES.map(h => <circle key={h.name} className="fcc-cam" cx={h.cx} cy={h.cy} r={h.d / 2} />) };
const RING: Look = { key: 'b', name: 'B · 구멍 셋, 렌즈 링', note: '렌즈 둘에 얇은 테와 유리 반점을 더한다 — 다른 기기에는 없는 결.',
  draw: () => HOLES.map(h => <g key={h.name}>
    <circle className="fcc-cam" cx={h.cx} cy={h.cy} r={h.d / 2} />
    {h.d > 40 && <><circle className="fcc-ring" cx={h.cx} cy={h.cy} r={h.d / 2 - 4} strokeWidth={2} /><circle className="fcc-glass" cx={h.cx - h.d * .12} cy={h.cy - h.d * .12} r={h.d * .07} /></>}
  </g>) };

function Cover({ look, box, zoom }: { look: Look; box: boolean; zoom: number }) {
  const vw = W + 2 * BEZEL, vh = H + 2 * BEZEL, outer = RADIUS.map(r => r + BEZEL);
  const clip = `fcc-clip-${look.key}`;
  return <figure className="fcc-col">
    <svg className="fcc-svg" width={vw * zoom} height={vh * zoom} viewBox={`${-BEZEL} ${-BEZEL} ${vw} ${vh}`}>
      <path className="fcc-body" d={rounded(-BEZEL, -BEZEL, vw, vh, outer)} />
      <clipPath id={clip}><path d={rounded(0, 0, W, H, RADIUS)} /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <Content />
        <rect className="fcc-handle" x={HANDLE.cx - HANDLE.w / 2} y={HANDLE.cy - HANDLE.h / 2} width={HANDLE.w} height={HANDLE.h} rx={HANDLE.h / 2} />
        {look.draw()}
        {box && <><rect className="fcc-box" x={BOX.x + .5} y={BOX.y + .5} width={BOX.w - 1} height={BOX.h - 1} strokeWidth={1} />
          <text className="fcc-box-label" x={BOX.x + 4} y={BOX.y - 4}>배제 상자 218.95×88</text></>}
      </g>
    </svg>
    <figcaption><b>{look.name}</b><span className="fcc-tag">{look.note}</span></figcaption>
  </figure>;
}

function Sheet({ looks, box, zoom }: Args & { looks: Look[] }) {
  return <div className="fcc-sheet">
    <h2>Galaxy Z Flip8 커버 — 카메라 컷아웃</h2>
    <p className="fcc-note">분홍 점선은 시스템이 보고하는 배제 상자다 — 인셋 · safe area(아래 88dp) · 내비 핸들 자리는 어느 안이든 이 상자를 따르고, 그리는 모양만 바뀐다.
      구멍(dp) — 플래시 (206.3, 394.2) ⌀29 · 렌즈 1 (271.2, 396.5) ⌀76 · 렌즈 2 (351.8, 397.3) ⌀76.</p>
    <div className="fcc-grid">{looks.map(l => <Cover key={l.key} look={l} box={box} zoom={zoom} />)}</div>
  </div>;
}

export const Compare: Story = { name: '나란히', render: a => <Sheet {...a} looks={[NOTCH, FLAT, RING]} /> };
export const Flat: Story = { name: 'A 크게', args: { zoom: 2 }, render: a => <Sheet {...a} looks={[FLAT]} /> };
export const Ring: Story = { name: 'B 크게', args: { zoom: 2 }, render: a => <Sheet {...a} looks={[RING]} /> };
