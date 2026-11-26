import type { DeviceEntry } from "../runtime/devices";
import { DEVICES } from "../runtime/devices";
import { reduced } from "../runtime/motion";
import type { Body, Box, Dev, DockView, Layers, Orientation, Radii, SceneImage, Shadow, Shape, Spring, St } from "./types";

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const smooth = (a: number, b: number, v: number) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
export const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
export const shade = (a: number) => `color-mix(in srgb, var(--device-shade) ${(a * 100).toFixed(1)}%, transparent)`;
export const springOf = (duration: number, bounce: number): Spring => ({ w0: 2 * Math.PI / Math.max(.05, duration), z: 1 - clamp(bounce, 0, .95) });
function osc({ w0, z }: Spring, x0: number, v0: number, t: number): [number, number] {
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z), e = Math.exp(-z * w0 * t), B = (v0 + z * w0 * x0) / wd;
    const c = Math.cos(wd * t), s = Math.sin(wd * t);
    return [e * (x0 * c + B * s), e * ((B * wd - z * w0 * x0) * c - (x0 * wd + z * w0 * B) * s)];
  }
  const e = Math.exp(-w0 * t), B = v0 + w0 * x0;
  return [e * (x0 + B * t), e * (B - w0 * (x0 + B * t))];
}
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t, sy = (t: number) => ((ay * t + by) * t + cy) * t, dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-6) return sy(t); const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1;
    t = x;
    while (hi - lo > 1e-6) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}
export class Val {
  to: number; x0 = 0; v0 = 0; t0 = 0; sp: Spring | null = null;
  constructor(v = 0) { this.to = v; }
  d(now: number): [number, number] {
    if (!this.sp) return [0, 0];
    const t = (now - this.t0) / 1000;
    return t <= 0 ? [this.x0, 0] : osc(this.sp, this.x0, this.v0, t);
  }
  at(now: number) { return this.to + this.d(now)[0]; }
  set(to: number, sp: Spring, now: number, delay = 0) {
    const [x, v] = this.d(now), cur = this.to + x;
    const moving = this.sp && (Math.abs(x) > 1e-4 || Math.abs(v) > 1e-4);
    this.x0 = cur - to; this.v0 = v; this.to = to; this.sp = sp; this.t0 = now + (moving ? 0 : delay);
  }
  snap(v: number) { this.to = v; this.sp = null; this.x0 = 0; this.v0 = 0; }
  done(now: number, eps = .25) { const [x, v] = this.d(now); return Math.abs(x) < eps && Math.abs(v) < eps * 20; }
}
export class Tw {
  a: number; b: number; t0 = 0; dur = 0;
  constructor(v = 0, public ease: (k: number) => number = easeOut) { this.a = v; this.b = v; }
  at(now: number) { if (this.dur <= 0) return this.b; const k = clamp((now - this.t0) / this.dur, 0, 1); return lerp(this.a, this.b, this.ease(k)); }
  to(b: number, dur: number, now: number) { this.a = this.at(now); this.b = b; this.t0 = now; this.dur = dur; }
  snap(v: number) { this.a = this.b = v; this.dur = 0; }
  done(now: number) { return this.dur <= 0 || now - this.t0 >= this.dur; }
}
// 기기 표(크기 · 베젤 · 반경 · 카메라 · 버튼 · 색)는 plugin/devices 스펙에서 생성한 devices.js 다 — 값의 출처(windowinsets.info · safearea.info)와 눈대중인 값은 스펙이 갖는다.

// 자연 방향 화면(panel)을 sel 의 rot · right 로 돌린 자세 — 세로 / 가로 왼쪽 / 가로 오른쪽과 손에 든 회전 각도.
// 네 모서리 [좌상, 우상, 우하, 좌하] 를 4분의 1바퀴씩 돌린다 — camBox 의 회전과 같은 방향이다.
export const turnR = (r: Radii, n: number): Radii => { let o = r; for (let i = 0; i < ((n % 4) + 4) % 4; i++) o = [o[3], o[0], o[1], o[2]]; return o; };
// 조개형(hinge.axis height)은 힌지가 높이를 가른다 — 접기 장면은 책형과 같은 판 좌표(u 가 힌지를 가로지른다)에서 그리고 장면 전체를 90° 돌린다.
export const tallOf = (d: DeviceEntry) => d.plate?.axis === "height";
export const plateOf = (d: DeviceEntry, key: "open" | "cover") => tallOf(d) ? { w: d[key]!.h, h: d[key]!.w } : d[key]!;
export function turnOf(panel: { w: number; h: number }, rot: boolean, right: boolean): { orientation: Orientation; angle: number; mirrored: boolean } {
  const wide = panel.w > panel.h;
  const orientation = right ? "landscape-right" : ((rot ? panel.h : panel.w) > (rot ? panel.w : panel.h) ? "landscape-left" : "portrait");
  const angle = right ? (wide ? 180 : 90) : (rot ? (wide ? 90 : -90) : 0);
  return { orientation, angle, mirrored: angle < 0 || angle === 180 };
}
// 카메라 상자 — 스펙의 cam 은 위 가장자리 기준이다(w 는 가장자리를 따른 길이, h 는 깊이, x 는 가장자리를 따른 위치 비율).
// edge:"right" 면 자연 방향의 오른쪽 가장자리(x 는 위에서), "bottom" 이면 아래 가장자리(x 는 왼쪽에서)에 붙고, 자세가 돌면 그만큼 4분의 1바퀴씩 같이 돈다.
// notch 는 가장자리에 붙은 노치의 안쪽 모서리 반경이다 — 가장자리 쪽 두 모서리와, 옆 변에 닿은 모서리(Flip8 커버의 오른쪽 아래 컷아웃)는 각진다.
// rad · flat 은 기기를 바꾸는 보간용이다.
// 보간 중인 cam 은 rad · flat 을 이미 갖고, 스펙의 cam 은 notch 에서 나온다 — 두 곳이 같은 판단을 쓴다.
const camRad = (c: Shape) => c.rad ?? c.notch ?? Math.min(c.w, c.h) / 2, camFlat = (c: Shape) => c.flat ?? (c.notch !== undefined ? 1 : 0);
export function camBox(W0: number, H0: number, rot: boolean, cam: Shape, s: number, mirrored = false): Box {
  const own = cam.edge === "right" ? 1 : cam.edge === "bottom" ? 2 : 0, turns = (own + (rot ? 1 : 0) + (mirrored ? 2 : 0)) % 4;
  let fw = (own % 2 ? H0 : W0) * s, fh = (own % 2 ? W0 : H0) * s;
  const x = own === 2 ? 1 - (cam.x ?? .5) : cam.x ?? .5;
  let b = { left: x * fw - cam.w * s / 2, top: cam.y * s, width: cam.w * s, height: cam.h * s };
  for (let i = 0; i < turns; i++) {
    b = { left: fh - b.top - b.height, top: b.left, width: b.height, height: b.width };
    [fw, fh] = [fh, fw];
  }
  const rad = camRad(cam) * s, flat = camFlat(cam);
  const corners = [rad, rad, rad, rad], near = .5 * s, onL = b.left <= near, onT = b.top <= near, onR = b.left + b.width >= fw - near, onB = b.top + b.height >= fh - near;
  for (const k of [[0, 1], [1, 2], [2, 3], [3, 0]][turns]) corners[k] = rad * (1 - flat);
  [onL || onT, onT || onR, onR || onB, onB || onL].forEach((on, k) => { if (on) corners[k] = rad * (1 - flat); });
  return { ...b, corners: corners.map(v => v + "px").join(" "), on: cam.w * s > .5, lens: cam.lens ? s : 0 };
}
// 렌즈 구멍(lens) — 안쪽으로 3dp 들어간 2dp 테와 화면 기준 왼쪽 위의 유리 반점(지름의 14%, 가운데에서 지름의 12%씩 비킴). 데몬 DeviceChromePainter 와 같은 자리다.
export const LENS = { inset: 3, ring: 2, shift: .12, glint: .14 };
// 반점은 빛이 만든 것이라 화면에 고정이다 — 장면이 turn 도 돌면(접기 장면의 turnRig) 카메라 안에서 그만큼 거꾸로 돌려 둔다.
export const glintAt = (turn: number) => {
  const a = turn * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), x = -LENS.shift, y = -LENS.shift;
  const at = (v: number) => (.5 + v - LENS.glint / 2) * 100 + "%";
  return [at(x * c + y * s), at(-x * s + y * c)];
};
export const CAM_MAX = Math.max(1, ...Object.values(DEVICES).flatMap(d => Object.values(d.look).map(l => l!.cams.length)));
const HOME_K = .62;   // 홈 버튼 지름 / 위·아래 베젤 두께
export const P = { rotDur: .6, rotLift: .42, rotLand: .18, rotDip: .12, shellK: 1.6,
  frameDur: .45, frameBounce: 0, outlineBounce: 0, outlineLead: 0, veil: .06,
  foldDur: 1, foldLift: .42, foldLand: .18, perspective: 3200, shade: .22,
  swapDur: 220, swapBlur: 8, swapNear: .15, spinSwapA: .35, spinSwapB: .65,
  holdBlur: 24, holdRise: 150, holdLight: 8, holdDeepAfter: 250, holdDeepen: 200, fastReveal: 120, revealFade: 240, revealDur: 280, swapZoom: .03, moveBlur: 6, settleSharp: 220,
  reducedFade: 240, reducedDim: .62, gap: 7, crease: .35,
  foldBlur: 24, foldDark: .85, shrinkFrom: 90, ambient: .35, screenDim: .6, lightAz: 125, lightEl: 55, arcSegs: 4 };
// 커스텀 크기의 범위와 키 한 번의 걸음 — 치수선 입력과 슬라이더가 같이 쓴다
export const DP_MIN = 240;
export const DP_MAX = 1600;
export const stepOf = (e: KeyboardEvent) => e.shiftKey ? 10 : 1;
export const lined = (st: St) => st.kind === "preset" || st.kind === "custom";
export const shelled = (st: St): st is Dev => st.kind === "device";
export const devSel = (st: Dev, folded: boolean, orientation: string) => {
  const s = DEVICES[st.dev][folded ? "cover" : "open"]!, landscape = orientation !== "portrait";
  return `${st.dev}:${folded ? "cover" : "open"}${landscape !== (s.w > s.h) ? ":rot" : ""}${orientation === "landscape-right" ? ":right" : ""}`;
};
export const isOpen = (st: St) => st.kind === "device" && DEVICES[st.dev].fold && !st.folded;
export const lookOf = (st: Dev): Body => DEVICES[st.dev].look[st.folded ? "cover" : "open"]!;
// 몸체 두께 — bezel 은 네 변 공통(옆 변), ends 는 짧은 두 변(홈 버튼 기기의 위 · 아래)이 더 두꺼울 때의 값이다. 자리 · 눈금은 가장 두꺼운 변을 비켜 선다.
export const endsOf = (lk: Body) => lk.ends ?? lk.bezel;
export const edgeOf = (lk: Body) => Math.max(lk.bezel, endsOf(lk)) * P.shellK;
export const padsOf = (st: St): [number, number] => {
  if (!shelled(st)) return [0, 0];
  const lk = lookOf(st), b = lk.bezel * P.shellK, e = endsOf(lk) * P.shellK;
  return st.rot ? [2 * e, 2 * b] : [2 * b, 2 * e];
};
export const dims = (st: { w: number; h: number }) => `${Math.round(st.w)}×${Math.round(st.h)}`;
// CAPSULE_ROOM — 아래 캡슐(바닥 20 + 높이 약 40)과 조작 독(바닥 12 + 슬라이더를 띄운 높이 약 68) 중 큰 쪽과 그 위 틈. 맞춤일 때 기기가 가리지 않게 이만큼만 비운다.
const TOP = 14;
const RULER_TOP = 34;
export const RULER_SIDE = 90;
export const FRAME_TOP = TOP + RULER_TOP;
export const CAPSULE_ROOM = 88;
// 좁은 판(터미널 옆에 세운 브라우저)에서 양옆 90이 판의 절반 가까이를 먹어 넓은 기기가 작게 그려졌다 —
// 좁을수록 양옆을 높이 자와 그 숫자가 들어갈 만큼만 비운다(자 간격은 껍데기가 없는 틀의 P.gap — 껍데기가 있으면 옆 bezel 이 더 메운다). 틀은 판 가운데(아래 캡슐과 같은 가운데)에 두므로 오른쪽도 왼쪽과 같은 폭을 비운다.
// 그 폭은 배지의 실제 폭에서 나온다(자 간격 + 눈금 22 + 배지 반폭 + 판 끝 틈) — 배지가 커지면 같이 는다.
export const NARROW = 400;
export const WIDE = 800;
export const RULER_RAIL = 22;
export const PLATE_EDGE = 10;
export const BADGE_W = 45;
// 인셋 배지 — 오른쪽 배지는 몸체에서 48(resize.css 의 --im-off-x) 떨어진 선 가운데에 서고, 레이블이 붙어 가장 긴 배지의 반폭이 CHIP_HALF 다. 켜졌을 때만 양옆을 그만큼 비운다.
const CHIP_HALF = 56;
export const RIGHT_NEED = 48 + CHIP_HALF + PLATE_EDGE;
// 틀은 남는 세로 자리의 가운데다 — 위에 붙이면 작은 크기 · 가로로 넓은 기기에서 아래가 크게 비었다.
// 컷아웃 배지는 눈금(#ruler) 바깥에 선다 — 컷아웃이 위 · 아래 변이면 높이 눈금 왼쪽에, 왼쪽 · 오른쪽 변이면 폭 눈금 위에 자리가 더 든다.
// 어느 변인지는 스펙의 측정 자세(panel.cutIn)에서 오고, 오버레이가 켜졌는지는 hooks.insetOn 이 답한다(꺼졌으면 배지가 없어 줄이지 않는다). 자리가 모자랄 때만 틀을 줄이고, 틀은 가운데에 둔다.
// 폭은 몸체에서 배지 가운데까지(resize.css 의 --im-off-left 112 · --im-off-x 48) + 가장 긴 배지 반폭 + 판 끝 틈이고, 양옆 기본 폭(side)이 이미 비워 둔 만큼은 뺀다.
export const LANE_W = 112 + CHIP_HALF + PLATE_EDGE;
export const LANE_H = 32;
// 왼쪽 · 오른쪽 변의 컷아웃 아닌 배지는 몸체 아래(resize.css 의 --im-off-y 28) 선 가운데에 선다. CAPSULE_ROOM 은 조작 독 몫이라 창 높이를 채우는 기기에서 그 배지가 독 뒤로 들어갔다 —
// 그 줄에 배지가 있을 때만(hooks.insetBelow) 선까지 거리 + 배지 반높이만큼 아래를 더 비운다.
export const BELOW_H = 28 + 12;
export const cutEdgesOf = (st: Dev) => {
  const cutIn = DEVICES[st.dev][st.folded ? "cover" : "open"]!.cutIn, name = st.right ? "landscape-right" : st.w > st.h ? "landscape-left" : "portrait";
  // 측정하지 않은 가로 자세는 맞은편 가로(좌우만 바뀐다)의 변을 쓴다.
  return cutIn[name] ?? cutIn[name === "landscape-right" ? "landscape-left" : "landscape-right"] ?? "";
};
// fill — 도착 그림이 없어 옛 화면을 틀에 채워 흐린다. swap — 덮는 쪽 레이아웃으로 바꾸는 흐림 교체(가운데서 가장 흐리다).
export const layersOf = (img: SceneImage | null): Layers => ({ old: { r: img, held: false, grow: new Tw(0, k => smooth(0, 1, k)), blur: new Tw(0), veil: new Tw(0), op: new Tw(1) }, neu: { r: null, op: new Tw(0), blur: new Tw(0) }, swap: null });
export const swapAt = (sw: { t0: number; dur: number }, now: number) => clamp((now - sw.t0) / sw.dur, 0, 1);
export const bump = (k: number) => P.swapBlur * 4 * k * (1 - k);
// 크기 교체의 흐림 — 가운데서 가장 흐리고 틀이 멈추길 기다리지 않고 끝까지 걷는다
export const swapBlurAt = (k: number) => k < .5 ? bump(k) : lerp(P.swapBlur, 0, smooth(.5, 1, k));
// 카메라 보간 — 가장자리가 다르면 끝에서 줄어 사라졌다 다른 가장자리에서 자란다(버튼이 변을 바꿀 때와 같다).
const camLook = (a: Shape, b: Shape, k: number, m: (x: number, y: number) => number): Shape => {
  const swap = a.edge !== b.edge, grow = swap ? (k < .5 ? 1 - 2 * k : 2 * k - 1) : 1, from = swap && k < .5 ? a : b;
  return { w: swap ? from.w * grow : m(a.w, b.w), h: m(a.h, b.h), y: m(a.y, b.y), x: swap ? from.x ?? .5 : m(a.x ?? .5, b.x ?? .5),
    rad: m(camRad(a), camRad(b)), flat: m(camFlat(a), camFlat(b)), edge: from.edge, lens: (from.w > 0 ? from : a).lens };
};
// 그릴 모양 목록 — 짝이 없는 쪽은 같은 자리의 크기 0 으로 채워 제자리에서 줄거나 자란다(버튼 목록과 같다).
export const camsLook = (A: Shape[], B: Shape[], k: number, m: (x: number, y: number) => number) => Array.from({ length: Math.max(A.length, B.length) }, (_, i) =>
  camLook(A[i] ?? { ...B[i], w: 0, h: 0 }, B[i] ?? { ...A[i], w: 0, h: 0 }, k, m));
// 홈 버튼 — 자연 방향의 아래 베젤(ends) 가운데. 멈춘 몸체와 접기 판이 같은 자리를 써야 착지가 이어진다.
export const homeBox = (lk: Body, W0: number, H0: number, rot: boolean, s: number, mirrored: boolean, hk: number) => {
  const e = endsOf(lk) * P.shellK, hd = e * HOME_K, b = camBox(W0, H0, rot, { w: hd, h: hd, y: H0 + (e - hd) / 2 }, s, mirrored);
  return { ...b, on: b.on && hk > .01 };
};
export const reducedOn = () => reduced.matches;
export const rigCrease = (th: number) => clamp(1 - th / 24, 0, 1);
export const holdSize = (spec: SceneImage, frame: { w: number; h: number }, fill: boolean) => {
  if (!fill) return { w: spec.dpW, h: spec.dpH };
  const k = Math.max(frame.w / spec.dpW, frame.h / spec.dpH);
  return { w: spec.dpW * k, h: spec.dpH * k };
};
// 빛은 화면에 고정이고, 정면을 보는 면이 1이 되게 맞춘다 — 멈춘 장면의 밝기는 그대로이고 돌아간 면만 어두워지거나 밝아진다.
const LIGHT = (() => { const az = P.lightAz * Math.PI / 180, el = P.lightEl * Math.PI / 180; return [Math.cos(el) * Math.cos(az), -Math.cos(el) * Math.sin(az), Math.sin(el)]; })();
export const lightOf = (n: number[]) => clamp(P.ambient + (1 - P.ambient) * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / LIGHT[2], 0, 1.5);
export const rgbOf = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
export const toned = (rgb: number[], b: number) => `rgb(${rgb.map(c => Math.round(b <= 1 ? c * b : c + (255 - c) * (b - 1) * .5)).join(" ")})`;
// 옆면 띠 — 가운데는 받은 빛의 색, 두 가장자리는 18% 밝고 20% 어두워 이웃 띠와의 경계가 모서리처럼 읽힌다.
export const stripPaint = (rgb: number[], b: number) => {
  const mid = toned(rgb, b), hi = `color-mix(in srgb, ${mid}, var(--device-veil) 18%)`, lo = `color-mix(in srgb, ${mid}, var(--device-shade) 20%)`;
  return `linear-gradient(90deg, ${hi} 0, ${mid} 10%, ${mid} 90%, ${lo} 100%)`;
};
// 화면은 스스로 빛나서 몸체보다 덜 어두워진다.
// 색은 둘 중 하나로 두고 세기는 불투명도로 준다 — 색이 프레임마다 바뀌면 층을 다시 래스터한다.
export const litOf = (b: number): [string, number] => b <= 1 ? ["var(--device-shade)", P.screenDim * (1 - b)] : ["var(--device-veil)", (b - 1) * .25];
export const splitTop = (text: string) => { const out: string[] = []; let depth = 0, from = 0;
  for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === "(") depth++; else if (c === ")") depth--; else if (c === "," && !depth) { out.push(text.slice(from, i)); from = i + 1; } }
  return [...out, text.slice(from)].filter(p => p.trim()); };
export const px = (v: number) => v.toFixed(2) + "px";
export const radii = (r: number[]) => r.map(px).join(" ");
// 둥근 사각형 윤곽의 옆면 띠 — 직선 변은 한 장, 모서리는 호에 외접하는 n장이라 이웃 띠의 끝이 만난다.
export function perimeter([x0, y0, x1, y1]: number[], [tl, tr, br, bl]: number[], n: number) {
  const out: { x: number; y: number; a: number; len: number }[] = [], d = 90 / n, rd = (a: number) => a * Math.PI / 180, w = (r: number) => 2 * r * Math.tan(rd(d) / 2);
  const arc = (cx: number, cy: number, r: number, a0: number) => { for (let i = 0; i < n; i++) { const a = a0 + (i + .5) * d; out.push({ x: cx + r * Math.cos(rd(a)), y: cy + r * Math.sin(rd(a)), a, len: w(r) }); } };
  out.push({ x: (x0 + tl + x1 - tr) / 2, y: y0, a: 270, len: x1 - tr - x0 - tl });
  arc(x1 - tr, y0 + tr, tr, 270);
  out.push({ x: x1, y: (y0 + tr + y1 - br) / 2, a: 0, len: y1 - br - y0 - tr });
  arc(x1 - br, y1 - br, br, 0);
  out.push({ x: (x0 + bl + x1 - br) / 2, y: y1, a: 90, len: x1 - br - x0 - bl });
  arc(x0 + bl, y1 - bl, bl, 90);
  out.push({ x: x0, y: (y0 + tl + y1 - bl) / 2, a: 180, len: y1 - bl - y0 - tl });
  arc(x0 + tl, y0 + tl, tl, 180);
  return out;
}
export const castShadow = (list: Shadow[], a: number, u: number) => list.map(([x, y, b, sp, color]) =>
  `${px((x * Math.cos(a) + y * Math.sin(a)) * u)} ${px((-x * Math.sin(a) + y * Math.cos(a)) * u)} ${px(b * u)} ${px(sp * u)} ${color}`).join(", ");
export const silhouette = (d: DeviceEntry) => {
  const o = d.open, lk = d.look.open, k = 19 / Math.max(o.w, o.h), W = o.w * k, H = o.h * k, x = 10 - W / 2, y = 10 - H / 2, sw = 1.4;
  const f = (n: number) => n.toFixed(2), r = clamp((Math.max(...lk.radius) + lk.bezel * P.shellK) * k * 1.8, 1.2, Math.min(W, H) / 3);
  const inset = sw / 2 + clamp(lk.bezel * P.shellK * k, .9, 2.2), ri = Math.max(.4, r - inset + sw / 2), tall = tallOf(d);
  const screen = (sx: number, sy: number, sw2: number, sh2: number) => `<rect x="${f(sx)}" y="${f(sy)}" width="${f(sw2)}" height="${f(sh2)}" rx="${f(ri)}" fill="currentColor" fill-opacity=".16"/>`;
  const glass = !d.fold ? screen(x + inset, y + inset, W - 2 * inset, H - 2 * inset)
    : tall ? screen(x + inset, y + inset, W - 2 * inset, H / 2 - inset - .4) + screen(x + inset, y + H / 2 + .4, W - 2 * inset, H / 2 - inset - .4)
    : screen(x + inset, y + inset, W / 2 - inset - .4, H - 2 * inset) + screen(x + W / 2 + .4, y + inset, W / 2 - inset - .4, H - 2 * inset);
  let cam = "";
  const cut = lk.cuts[0];
  if (cut) {
    const cx = x + W * (cut.x ?? .5), cy = y + inset + 1.1;
    cam = cut.edge === "right"
      ? `<rect x="${f(x + W - inset - 1.7)}" y="${f(y + H * (cut.x ?? .5) - 1.8)}" width="1.2" height="3.6" rx=".6" fill="currentColor"/>`
      : cut.w > cut.h * 3
      ? `<rect x="${f(cx - 1.8)}" y="${f(cy - .6)}" width="3.6" height="1.2" rx=".6" fill="currentColor"/>`
      : `<circle cx="${f(cx)}" cy="${f(cy)}" r=".75" fill="currentColor"/>`;
  }
  const hinge = !d.fold ? "" : `<path d="${tall ? `M${f(x)} ${f(y + H / 2)}H${f(x + W)}` : `M${f(x + W / 2)} ${f(y)}V${f(y + H)}`}" stroke="currentColor" stroke-width=".8"/>`;
  return `${glass}<rect x="${f(x + sw / 2)}" y="${f(y + sw / 2)}" width="${f(W - sw)}" height="${f(H - sw)}" rx="${f(r)}" fill="none" stroke="currentColor" stroke-width="${sw}"/>${hinge}${cam}`;
};
export const itemOf = (st: St) => st.kind === "device" ? st.dev : st.sel;
export const openDims = (d: DeviceEntry) => `${Math.round(d.open.w)}×${Math.round(d.open.h)}`;
// 커스텀 슬라이더(D-99) — 끄는 동안은 틀과 치수선 숫자만 따라온다(draft, 요청 없음). 놓거나 키 입력이 멈추면 치수선 입력과 같은 규칙으로 한 번 보낸다.
// 보낸 뒤에도 새 상태가 올 때까지 draft 를 붙들어 틀이 옛 크기로 되튀지 않는다.
export const SL_KEY_SETTLE = 350;
export const DOCK_START: DockView = { menu: false, orientMenu: false, locked: false, checked: "", rows: {}, sumTitle: "",
  posture: false, sliders: false, foldable: false, folded: false, orientFixed: false, orientation: "portrait", hinge: true, slW: DP_MIN, slH: DP_MIN };
export const slAt = (v: number) => `${((v - DP_MIN) / (DP_MAX - DP_MIN) * 100).toFixed(3)}%`;
