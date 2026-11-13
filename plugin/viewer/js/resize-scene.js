import { reduced } from "./motion.js";
import { phrase } from "./strings.js";
import { DEVICES } from "./devices.js";

// 기기 표(크기 · 베젤 · 반경 · 카메라 · 버튼 · 색)는 plugin/devices 스펙에서 생성한 devices.js 다 — 값의 출처(windowinsets.info · safearea.info)와 눈대중인 값은 스펙이 갖는다.

// 자연 방향 화면(panel)을 sel 의 rot · right 로 돌린 자세 — 세로 / 가로 왼쪽 / 가로 오른쪽과 손에 든 회전 각도.
function turnOf(panel, rot, right) {
  const wide = panel.w > panel.h;
  const orientation = right ? "landscape-right" : ((rot ? panel.h : panel.w) > (rot ? panel.w : panel.h) ? "landscape-left" : "portrait");
  const angle = right ? (wide ? 180 : 90) : (rot ? (wide ? 90 : -90) : 0);
  return { orientation, angle, mirrored: angle < 0 || angle === 180 };
}

// 기기 자세(sel)의 화면 dp 좌표 카메라 — 뷰어의 시스템 바가 장면과 같은 카메라를 피하고 맞춘다. 없으면 null.
export function cameraOf(sel) {
  const [dev, state, ...turns] = sel.split(":"), d = DEVICES[dev];
  if (!d?.[state]) return null;
  const panel = d[state], rot = turns.includes("rot"), b = camBox(panel.w, panel.h, rot, d.look[state].cam, 1, turnOf(panel, rot, turns.includes("right")).mirrored);
  return b.on ? { x: b.left, y: b.top, w: b.width, h: b.height } : null;
}

// 카메라 상자 — 스펙의 cam 은 위 가장자리 기준이다(w 는 가장자리를 따른 길이, h 는 깊이, x 는 가장자리를 따른 위치 비율).
// edge:"right" 면 자연 방향의 오른쪽 가장자리에 붙고(긴 변 노치), 자세가 돌면 그만큼 4분의 1바퀴씩 같이 돈다.
// notch 는 가장자리에 붙은 노치의 안쪽 모서리 반경이다 — 가장자리 쪽 두 모서리는 각진다. rad · flat 은 기기를 바꾸는 보간용이다.
// 보간 중인 cam 은 rad · flat 을 이미 갖고, 스펙의 cam 은 notch 에서 나온다 — 두 곳이 같은 판단을 쓴다.
const camRad = c => c.rad ?? c.notch ?? Math.min(c.w, c.h) / 2, camFlat = c => c.flat ?? (c.notch !== undefined ? 1 : 0);
function camBox(W0, H0, rot, cam, s, mirrored = false) {
  const own = cam.edge === "right" ? 1 : 0, turns = (own + (rot ? 1 : 0) + (mirrored ? 2 : 0)) % 4;
  let fw = (own ? H0 : W0) * s, fh = (own ? W0 : H0) * s;
  let b = { left: (cam.x ?? .5) * fw - cam.w * s / 2, top: cam.y * s, width: cam.w * s, height: cam.h * s };
  for (let i = 0; i < turns; i++) {
    b = { left: fh - b.top - b.height, top: b.left, width: b.height, height: b.width };
    [fw, fh] = [fh, fw];
  }
  const rad = camRad(cam) * s, flat = camFlat(cam);
  const corners = [rad, rad, rad, rad];
  for (const k of [[0, 1], [1, 2], [2, 3], [3, 0]][turns]) corners[k] = rad * (1 - flat);
  return { ...b, corners: corners.map(v => v + "px").join(" "), on: cam.w * s > .5 };
}

export function createResizeScene(root, hooks) {
  // 시제품에서 확정한 기하와 곡선을 유지하고, 그림 도착은 실제 디코드가 알린다.
  const $ = id => root.querySelector(`#${id}`);
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  // 몸체가 드리우는 그림자 — 짙기는 매 프레임 바뀌고 색은 tokens.css 의 --device-shade 다.
  const shade = a => `color-mix(in srgb, var(--device-shade) ${(a * 100).toFixed(1)}%, transparent)`;
  const HOME_K = .62;   // 홈 버튼 지름 / 위·아래 베젤 두께
  const P = { rotDur: .6, rotLift: .42, rotLand: .18, rotDip: .12, shellK: 1.6,
    frameDur: .45, frameBounce: 0, outlineBounce: 0, outlineLead: 0, veil: .06,
    foldDur: 1, foldLift: .42, foldLand: .18, perspective: 3200, shade: .22,
    swapDur: 320, swapBlur: 8, swapNear: .15, spinSwapA: .35, spinSwapB: .65,
    holdBlur: 24, holdRise: 150, revealFade: 240, revealDur: 280, swapZoom: .03, moveBlur: 6, settleSharp: 220,
    reducedFade: 240, reducedDim: .62, gap: 7, crease: .35,
    hingeLine: true, shrinkFrom: 90, ambient: .35, screenDim: .6, lightAz: 125, lightEl: 55, arcSegs: 4 };
  // 커스텀 크기의 범위와 키 한 번의 걸음 — 치수선 입력과 슬라이더가 같이 쓴다
  const DP_MIN = 240, DP_MAX = 1600, stepOf = e => e.shiftKey ? 10 : 1;
  const ORIGINAL = { sel: "original", kind: "original", name: "@Preview", w: 411, h: 891, img: null };
  const PRESETS = [{ sel: "narrow", name: phrase("size.narrow"), w: 320, h: 640 }, { sel: "foldable", name: phrase("size.foldable"), w: 673, h: 841 }];
  let target = null;
  const images = new Map();
  function resolve(sel) {
    let st;
    if (sel === "original") st = { ...ORIGINAL };
    else if (PRESETS.some(p => p.sel === sel)) st = { ...PRESETS.find(p => p.sel === sel), kind: "preset" };
    else if (/^custom:\d+x\d+$/.test(sel)) { const [w,h] = sel.slice(7).split("x").map(Number); st = { sel, kind: "custom", name: phrase("size.custom"), w, h }; }
    else {
      const [dev, state, ...turns] = sel.split(":"), d = DEVICES[dev];
      if (!d || !d[state]) return null;
      const s = d[state], rot = turns.includes("rot"), right = turns.includes("right");
      st = { sel, kind: "device", dev, folded: state === "cover", rot, right, ...turnOf(s, rot, right), name: d.name, short: d.short,
        w: rot ? s.h : s.w, h: rot ? s.w : s.h, hinge: s.hinge };
    }
    if (target?.sel === sel) { st.w = target.w; st.h = target.h; }
    st.img = images.get(sel) || cur?.img || ORIGINAL.img;
    return st;
  }
  const lined = st => st.kind === "preset" || st.kind === "custom";
  const shelled = st => st.kind === "device";
  const devSel = (st, folded, orientation) => {
    const s = DEVICES[st.dev][folded ? "cover" : "open"], landscape = orientation !== "portrait";
    return `${st.dev}:${folded ? "cover" : "open"}${landscape !== (s.w > s.h) ? ":rot" : ""}${orientation === "landscape-right" ? ":right" : ""}`;
  };
  const isOpen = st => st.kind === "device" && DEVICES[st.dev].fold && !st.folded;
  const lookOf = st => DEVICES[st.dev].look[st.folded ? "cover" : "open"];
  // 몸체 두께 — bezel 은 네 변 공통(옆 변), ends 는 짧은 두 변(홈 버튼 기기의 위 · 아래)이 더 두꺼울 때의 값이다. 자리 · 눈금은 가장 두꺼운 변을 비켜 선다.
  const endsOf = lk => lk.ends ?? lk.bezel;
  const edgeOf = lk => Math.max(lk.bezel, endsOf(lk)) * P.shellK;
  const padsOf = st => {
    if (!shelled(st)) return [0, 0];
    const lk = lookOf(st), b = lk.bezel * P.shellK, e = endsOf(lk) * P.shellK;
    return st.rot ? [2 * e, 2 * b] : [2 * b, 2 * e];
  };
  const dims = st => `${Math.round(st.w)}×${Math.round(st.h)}`;
  const springOf = (duration, bounce) => ({ w0: 2 * Math.PI / Math.max(.05, duration), z: 1 - clamp(bounce, 0, .95) });
  function osc({ w0, z }, x0, v0, t) {
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z), e = Math.exp(-z * w0 * t), B = (v0 + z * w0 * x0) / wd;
      const c = Math.cos(wd * t), s = Math.sin(wd * t);
      return [e * (x0 * c + B * s), e * ((B * wd - z * w0 * x0) * c - (x0 * wd + z * w0 * B) * s)];
    }
    const e = Math.exp(-w0 * t), B = v0 + w0 * x0;
    return [e * (x0 + B * t), e * (B - w0 * (x0 + B * t))];
  }

  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t, dx = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => {
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
  let foldEaseKey = "", foldEaseFn = null;
  const foldEase = () => {
    const k = `${P.foldLift},${P.foldLand}`;
    if (k !== foldEaseKey) { foldEaseKey = k; foldEaseFn = bezier(P.foldLift, 0, P.foldLand, 1); }
    return foldEaseFn;
  };

  class Val {
    constructor(v = 0) { this.to = v; this.x0 = 0; this.v0 = 0; this.t0 = 0; this.sp = null; }
    d(now) {
      if (!this.sp) return [0, 0];
      const t = (now - this.t0) / 1000;
      return t <= 0 ? [this.x0, 0] : osc(this.sp, this.x0, this.v0, t);
    }
    at(now) { return this.to + this.d(now)[0]; }
    set(to, sp, now, delay = 0) {
      const [x, v] = this.d(now), cur = this.to + x;
      const moving = this.sp && (Math.abs(x) > 1e-4 || Math.abs(v) > 1e-4);
      this.x0 = cur - to; this.v0 = v; this.to = to; this.sp = sp; this.t0 = now + (moving ? 0 : delay);
    }
    snap(v) { this.to = v; this.sp = null; this.x0 = 0; this.v0 = 0; }
    done(now, eps = .25) { const [x, v] = this.d(now); return Math.abs(x) < eps && Math.abs(v) < eps * 20; }
  }
  class Tw {
    constructor(v = 0) { this.a = v; this.b = v; this.t0 = 0; this.dur = 0; }
    at(now) { if (this.dur <= 0) return this.b; const k = clamp((now - this.t0) / this.dur, 0, 1); return lerp(this.a, this.b, easeOut(k)); }
    to(b, dur, now) { this.a = this.at(now); this.b = b; this.t0 = now; this.dur = dur; }
    snap(v) { this.a = this.b = v; this.dur = 0; }
    done(now) { return this.dur <= 0 || now - this.t0 >= this.dur; }
  }
  // CAPSULE_ROOM — 아래 캡슐(바닥 20 + 높이 약 40)과 조작 독(바닥 12 + 슬라이더를 띄운 높이 약 68) 중 큰 쪽과 그 위 틈. 맞춤일 때 기기가 가리지 않게 이만큼만 비운다.
  const TOP = 14, RULER_TOP = 34, RULER_SIDE = 90, FRAME_TOP = TOP + RULER_TOP, CAPSULE_ROOM = 88;
  // 좁은 판(터미널 옆에 세운 브라우저)에서 양옆 90이 판의 절반 가까이를 먹어 넓은 기기가 작게 그려졌다 —
  // 좁을수록 왼쪽은 높이 자와 그 숫자가 들어갈 만큼만, 오른쪽은 거의 비우고 틀은 남는 자리의 가운데에 둔다
  const NARROW = 400, WIDE = 800, SIDE_L = 60, SIDE_R = 16;
  const clock = { t: 0 };
  function room() {
    const W = root.clientWidth, k = clamp((W - NARROW) / (WIDE - NARROW), 0, 1);
    const l = lerp(SIDE_L, RULER_SIDE, k), r = lerp(SIDE_R, RULER_SIDE, k);
    return { W, cx: (W + l - r) / 2, top: FRAME_TOP, maxW: Math.max(60, W - l - r), maxH: Math.max(60, root.clientHeight - FRAME_TOP - CAPSULE_ROOM) };
  }
  // 틀은 남는 세로 자리의 가운데다 — 위에 붙이면 작은 크기 · 가로로 넓은 기기에서 아래가 크게 비었다.
  // 위 · 아래 가장자리에 카메라가 붙은 자세는 위 띠의 상태 줄과 카메라 인셋 치수선이 오른쪽에 두 칸으로 서 둘째 배지가 한 칸(LANE_W) 더 나간다 — 폭이 모자란 넓은 기기(Tab)는 양옆을 그만큼씩 비워 창 밖으로 안 나가게 한다(틀은 가운데에 둔다).
  const LANE_W = 64;
  const laneRoomOf = st => {
    if (!shelled(st) || st.w <= st.h) return 0;
    const panel = DEVICES[st.dev][st.folded ? "cover" : "open"], b = camBox(panel.w, panel.h, st.rot, lookOf(st).cam, 1, st.mirrored);
    return b.on && (b.top < 1 || b.top + b.height > (st.rot ? panel.w : panel.h) - 1) ? LANE_W : 0;
  };
  function fit(st) {
    const r = room(), each = (x, maxW) => { const [pw, ph] = padsOf(x); return Math.min(maxW / (x.w + pw), r.maxH / (x.h + ph), 2); };
    let s = Math.min(each(ORIGINAL, r.maxW), each(st, r.maxW));
    const lane = laneRoomOf(st);
    if (lane && (r.maxW - (st.w + padsOf(st)[0]) * s) / 2 < lane) s = Math.min(each(ORIGINAL, r.maxW - 2 * lane), each(st, r.maxW - 2 * lane));
    const h = st.h * s, ph = padsOf(st)[1] * s;
    return { s, w: st.w * s, h, cx: r.cx, y: r.top + ph / 2 + Math.max(0, (r.maxH - h - ph) / 2) };
  }
  let cur = null;
  let tr = null;
  let queued = null;

  const V = { w: new Val(), h: new Val(), s: new Val(), y: new Val(FRAME_TOP) };
  const O = { w: new Val(), h: new Val() };
  const outlineOp = new Tw(0), creaseOp = new Tw(0), rulerOp = new Tw(0), shellOp = new Tw(0), hingeOp = new Tw(1);
  function setFrame(f, now, sp, spO = sp, delay = 0) {
    const g = P.gap;
    for (const [v, to] of [[V.w, f.w], [V.h, f.h], [V.s, f.s], [V.y, f.y]]) sp ? v.set(to, sp, now, delay) : v.snap(to);
    for (const [v, to] of [[O.w, f.w + 2 * g], [O.h, f.h + 2 * g]]) spO ? v.set(to, spO, now) : v.snap(to);
  }
  // fill — 도착 그림이 없어 옛 화면을 틀에 채워 흐린다. swap — 덮는 쪽 레이아웃으로 바꾸는 흐림 교체(가운데서 가장 흐리다).
  const layersOf = img => ({ old: { r: img, held: false, fill: false, blur: new Tw(0), veil: new Tw(0), op: new Tw(1) }, neu: { r: null, op: new Tw(0), blur: new Tw(0) }, swap: null });
  const layer = layersOf(null);
  const swapAt = (sw, now) => clamp((now - sw.t0) / sw.dur, 0, 1);
  const bump = k => P.swapBlur * 4 * k * (1 - k);
  // 크기 교체의 흐림 — 가운데서 가장 흐리고, 틀이 아직 움직이면 다 걷지 않고 moveBlur 에 머문다(멈추면 tick 이 걷는다)
  const swapBlurAt = (sw, k) => k < .5 ? bump(k) : lerp(P.swapBlur, sw.tail || 0, smooth(.5, 1, k));
  const unitOp = { a: new Tw(1), b: new Tw(0) };
  let fadeB = null;

  const look = { a: null, b: null, t0: 0, dur: 460 };
  function setLook(lk, instant) {
    const now = clock.t;
    look.a = instant || !look.b ? lk : lookAt(now); look.b = lk; look.t0 = instant ? -1e9 : now;
  }
  // 카메라 보간 — 가장자리가 다르면 끝에서 줄어 사라졌다 다른 가장자리에서 자란다(버튼이 변을 바꿀 때와 같다).
  const camLook = (a, b, k, m) => {
    const swap = a.edge !== b.edge, grow = swap ? (k < .5 ? 1 - 2 * k : 2 * k - 1) : 1, from = swap && k < .5 ? a : b;
    return { w: swap ? from.w * grow : m(a.w, b.w), h: m(a.h, b.h), y: m(a.y, b.y), x: swap ? from.x ?? .5 : m(a.x ?? .5, b.x ?? .5),
      rad: m(camRad(a), camRad(b)), flat: m(camFlat(a), camFlat(b)), edge: from.edge };
  };
  function lookAt(now) {
    const A = look.a, B = look.b;
    if (!B) return DEVICES.s26.look.open;
    const k = easeOut(clamp((now - look.t0) / look.dur, 0, 1)), m = (x, y) => lerp(x, y, k);
    return { tone: B.tone, bezel: m(A.bezel, B.bezel), ends: m(endsOf(A), endsOf(B)), home: m(Number(A.home) || 0, Number(B.home) || 0), radius: m(A.radius, B.radius),
      cam: camLook(A.cam, B.cam, k, m),
      btn: B.btn.map((b, i) => { const a = A.btn[i];
        return a.side === b.side ? { side: b.side, at: m(a.at, b.at), len: m(a.len, b.len) }
                                 : k < .5 ? { side: a.side, at: a.at, len: a.len * (1 - 2 * k) } : { side: b.side, at: b.at, len: b.len * (2 * k - 1) }; }) };
  }

  const putCam = (el, b, dx, dy, op) => Object.assign(el.style, { left: b.left + dx + "px", top: b.top + dy + "px", width: b.width + "px", height: b.height + "px", borderRadius: b.corners, opacity: b.on ? op : 0 });

  function snapTo(sel) {
    const st = resolve(sel), f = fit(st);
    cur = st; tr = null; queued = null; rig.on = false; spin.on = false; fadeB = null; UA.el.style.transform = "";
    setFrame(f);
    rulerOp.snap(1);
    settle(st.img);
    outlineOp.snap(lined(st) ? 1 : 0); shellOp.snap(shelled(st) ? 1 : 0); creaseOp.snap(isOpen(st) ? P.crease : 0);
    unitOp.a.snap(1); unitOp.b.snap(0);
    paintBar(st, true);
  }
  function settle(img) {
    const o = layer.old, n = layer.neu;
    o.r = img; o.held = false; o.fill = false; o.blur.snap(0); o.veil.snap(0); o.op.snap(1);
    n.r = null; n.op.snap(0); n.blur.snap(0); layer.swap = null;
  }

  function freeze(now) {
    const n = layer.neu, o = layer.old, sw = layer.swap;
    const nb = sw ? swapBlurAt(sw, swapAt(sw, now)) : n.blur.at(now), nop = sw ? smooth(0, 1, swapAt(sw, now)) : n.op.at(now);
    if (n.r && nop > .5) { o.r = n.r; o.fill = false; o.blur.snap(nb); o.veil.snap(0); o.op.snap(1); }
    else if (sw) o.blur.snap(nb);
    o.held = true;
    n.r = null; n.op.snap(0); n.blur.snap(0); layer.swap = null;
  }
  // 도착 그림이 없으면 옛 화면을 틀에 채워 흐린다 — 빈칸 · 잘림 대신 흐린 화면이 자리를 지킨다.
  function hold(now) {
    const o = layer.old;
    o.fill = true; o.blur.to(Math.max(P.holdBlur, o.blur.at(now)), P.holdRise, now); o.veil.to(P.veil, P.holdRise, now);
  }
  function sharpen(now) {
    const o = layer.old;
    o.fill = false; o.blur.to(0, 120, now); o.veil.to(0, 120, now);
  }

  const reducedOn = () => reduced.matches;
  const atRest = now => V.w.done(now) && V.h.done(now) && V.y.done(now) && V.s.done(now, .002);
  // 눈에는 이미 멈춘 때 — 남은 거리가 3px 안. 끝 꼬리를 기다리면 흐림이 오래 남았다
  const nearRest = now => { const f = fit(cur); return Math.abs(V.w.at(now) - f.w) < 3 && Math.abs(V.h.at(now) - f.h) < 3 && Math.abs(V.y.at(now) - f.y) < 3; };

  function go(sel) {
    const now = performance.now(), to = resolve(sel);
    clock.t = now;
    if (!to || !cur || to.sel === cur.sel) return;
    if (rig.on || spin.on) { queued = to.sel; return; }
    const from = cur, same = from.kind === "device" && to.kind === "device" && from.dev === to.dev;
    const folding = !reducedOn() && same && from.folded !== to.folded;
    const spinning = !reducedOn() && same && from.angle !== to.angle && from.folded === to.folded;
    if ((folding || spinning) && !atRest(now)) { queued = to.sel; return; }
    queued = null;

    // 크기가 같은 칸끼리(프리셋 → 같은 치수 커스텀)는 그림도 틀도 같다 — 전환 없이 이름만 바꾼다. 흐린 채움 · 교체 흐림이 낄 자리가 없다
    const sameSize = !tr && !shelled(from) && !shelled(to) && Math.round(from.w) === Math.round(to.w) && Math.round(from.h) === Math.round(to.h);
    if (sameSize && from.img) {
      if (!images.has(to.sel)) images.set(to.sel, from.img);
      to.img = images.get(to.sel);
      cur = to; paintBar(to); wake();
      return;
    }
    const cached = images.has(to.sel);
    cur = to;
    paintBar(to);

    if (reducedOn()) startFade(from, to, now);
    else if (folding) startFold(from, to, now, cached);
    else if (spinning) startSpin(from, to, now, cached);
    else startSize(from, to, now, cached);
    if (cached && tr.kind !== "size") tr.arriveAt = now;
  }

  // 캐시가 있으면 틀을 덮는 쪽 레이아웃을 원래 dp로 둔다 — 커지면 처음에, 작아지면 틀이 새 크기에 닿을 즈음 바꾼다.
  function startSize(from, to, now, cached) {
    if (tr && tr.kind === "fade") endFade(now);
    freeze(now);
    const f0 = { w: V.w.at(now), h: V.h.at(now) }, f = fit(to);
    setFrame(f, now, springOf(P.frameDur, P.frameBounce), springOf(P.frameDur, P.outlineBounce), P.outlineLead);
    outlineOp.to(shelled(to) ? 0 : lined(from) || lined(to) ? 1 : outlineOp.b, 140, now);
    shellOp.to(shelled(to) ? 1 : 0, 220, now);
    creaseOp.to(isOpen(to) ? P.crease : 0, 220, now);
    if (cached) sharpen(now); else hold(now);
    tr = { kind: "size", from, to, t0: now, arriveAt: Infinity, arrived: false, cached, swapped: false,
      grow: to.w >= from.w && to.h >= from.h, f0, f1: f };
  }
  function nearTarget(now) {
    const { f0, f1 } = tr, part = (v, a, b) => Math.abs(a - b) < 1 ? 0 : Math.abs(v - b) / Math.abs(a - b);
    return Math.max(part(V.w.at(now), f0.w, f1.w), part(V.h.at(now), f0.h, f1.h)) < P.swapNear;
  }
  function startSwap(now) {
    const n = layer.neu;
    tr.swapped = tr.arrived = true;
    n.r = tr.to.img; n.op.snap(0); n.blur.snap(0);
    layer.swap = { t0: now, dur: P.swapDur, tail: P.moveBlur };
  }

  function startFade(from, to, now) {
    if (tr && tr.kind === "fade") endFade(now);
    if (rig.on) endRig(now);
    if (spin.on) endSpin(now);
    freeze(now);
    layer.old.fill = false; layer.old.blur.to(0, 120, now); layer.old.veil.to(0, 120, now);
    for (const v of [V.w, V.h, V.s, V.y, O.w, O.h]) v.snap(v.at(now));
    roll.w.snap(from.w); roll.h.snap(from.h);
    layer.old.op.to(P.reducedDim, 160, now);
    tr = { kind: "fade", from, to, t0: now, arriveAt: Infinity, arrived: false };
  }
  function endFade(now) {
    const t = tr;
    tr = null; fadeB = null;
    setFrame(fit(t.to));
    settle(t.to.img);
    outlineOp.snap(lined(t.to) ? 1 : 0); shellOp.snap(shelled(t.to) ? 1 : 0); creaseOp.snap(isOpen(t.to) ? P.crease : 0);
    unitOp.a.snap(1); unitOp.b.snap(0);
    rulerOp.to(1, 200, now);
  }

  function arrive() {
    const at = tr.arriveAt;
    tr.arrived = true;
    const cachedFold = (tr.kind === "fold" || tr.kind === "unfold") && rig.cached || tr.kind === "spin" && spin.cached;

    if (tr.kind === "spin" || cachedFold || tr.kind === "size" && tr.cached) return;
    if (tr.kind === "fade") {
      const f = fit(tr.to);
      fadeB = { f, st: tr.to, layers: layersOf(tr.to.img) };
      unitOp.b.snap(0); unitOp.b.to(1, P.reducedFade, at); unitOp.a.to(0, P.reducedFade, at);
      rulerOp.to(0, 120, at);
      return;
    }
    // 새 그림은 옛 화면의 흐림에서 시작해 걷히며 드러난다.
    const n = layer.neu;
    n.r = tr.to.img; n.op.snap(0); n.op.to(1, P.revealFade, at); n.blur.snap(Math.max(layer.old.blur.at(at), layer.old.blur.b));
    // 틀이 아직 움직이면 다 걷지 않는다 — 움직이는 동안은 옅게 흐리고, 멈추면 tick 이 걷는다(B + 흐림 → B)
    n.blur.to(tr.kind === "size" && !nearRest(at) ? P.moveBlur : 0, P.revealDur, at);
  }

  const rig = { on: false };
  function rigCamera(folded, scale) {
    const panel = rig.d[folded ? "cover" : "open"];
    return camBox(panel.w, panel.h, false, rig.d.look[folded ? "cover" : "open"].cam, scale);
  }
  // 접기 장면의 두 판은 두께 있는 상자다(앞면 · 뒷면 · 옆면 띠). 원근은 .lift 한 겹에만 두고 그 아래는 preserve-3d 라
  // 판의 조상에 overflow · filter · mask · opacity 를 두지 않는다 — 두면 납작해진다. 흐림 · 자르기는 면 안에서만 한다.
  const rigEl = $("rig"), q = (root, s) => root.querySelector(s);
  const RG = { lift: q(rigEl, ".lift"), space: q(rigEl, ".space"), plate: q(rigEl, ".plate"), spine: q(rigEl, ".spine"),
    crease: q(rigEl, ".crease"), tTop: q(rigEl, ".r-top"), tBot: q(rigEl, ".r-bot") };
  const faceOf = el => ({ el, cam: q(el, ".cam"), old: q(el, ".old"), veil: q(el, ".veil"), neu: q(el, ".neu"), cast: q(el, ".cast") });
  const sideOf = el => ({ body: el, clip: q(el, ".clip"), ring: q(el, ".ring"), lit: q(el, ".lit") });
  const panelOf = el => ({ el, front: sideOf(q(el, ".front")), back: sideOf(q(el, ".rear")), strips: [] });
  RG.base = panelOf(q(rigEl, ".slab.base")); RG.leaf = panelOf(q(rigEl, ".slab.leaf"));
  RG.btns = Array.from({ length: 5 }, () => { const el = document.createElement("div"); el.className = "btn"; RG.space.append(el); return el; });
  RG.F = { inner: faceOf(RG.leaf.front.clip), outer: faceOf(RG.leaf.back.clip), base: faceOf(RG.base.front.clip) };

  function startFold(from, to, now, cached) {
    const d = DEVICES[to.dev], dir = to.folded ? "fold" : "unfold", H = d.open.hinge;
    const f0 = fit(from), f1 = fit(to);
    freeze(now);
    if (cached) { const o = layer.old; o.fill = false; o.blur.snap(0); o.veil.snap(0); }
    const restBlur = layer.old.blur.at(now);
    const openU = f => f.cx - d.open.w * f.s / 2 + H * f.s;
    const coverU = f => f.cx - d.cover.w * f.s / 2;
    const frame = { w: to.w, h: to.h };
    // 짝 없는 방향(거꾸로 선 세로 대신 바로 선 세로)은 180° 돌지 않고 접기만 보인 뒤 정지 자세로 맞춘다
    const delta = ((to.angle - from.angle + 540) % 360) - 180, turn = Math.abs(delta) === 180 ? 0 : delta;
    Object.assign(rig, {
      on: true, turn, t0: now, dur: P.foldDur, dir, d, restBlur, oldSpec: layer.old.r, from, to, f0, f1, cached,
      s0: f0.s, s1: f1.s,
      half: { u: H, v: d.open.h }, cover: { u: d.cover.w, v: d.cover.h },
      hx0: dir === "fold" ? openU(f0) : coverU(f0),
      hx1: dir === "fold" ? coverU(f1) : openU(f1),
      plan: dir === "fold"
        ? { inner: { role: "crisp", du: 0 }, base: { role: "crisp", du: H }, outer: { role: "hold", du: 0, neu: true, frame } }
        : { outer: { role: "crisp", du: 0 }, inner: { role: "hold", du: 0, neu: true, frame }, base: { role: "hold", du: H, neu: true, frame } },
    });
    if (!cached) hold(now);
    creaseOp.snap(0);
    roll.w.snap(from.w); roll.h.snap(from.h);
    rulerOp.to(0, 120, now);
    tr = { kind: dir, from, to, t0: now, arriveAt: Infinity, arrived: false };
  }

  function rigAt(now) {
    const t = (now - rig.t0) / 1000, T = Math.max(.05, rig.dur);
    const e = foldEase()(clamp(t / T, 0, 1));
    const th = (rig.dir === "fold" ? e : 1 - e) * 180;
    const baseS = lerp(rig.s0, rig.s1, e), cy = lerp(rig.f0.y + rig.f0.h / 2, rig.f1.y + rig.f1.h / 2, e);
    const angle = rig.from.angle + rig.turn * e, rad = th * Math.PI / 180, a = angle * Math.PI / 180, k = th / 180;
    const u = lerp(rig.half.u, rig.cover.u, k), v = lerp(rig.half.v, rig.cover.v, k);
    const hx = lerp(rig.hx0, rig.hx1, e), r = room(), offset = (hx - r.cx) / baseS;
    const perspective = P.perspective / (P.perspective - (u + rig.d.plate.thickness) * Math.sin(rad) * baseS);
    const tip = -u * Math.cos(rad) * perspective, bezel = lookAt(now).bezel * P.shellK;
    // 회전 중 대각선과 원근으로 커진 장도 맞춤 영역 안에 둔다. 양끝 배율은 원래 fit과 같다.
    const baseU = lerp(rig.half.u, Math.min(rig.half.u, rig.cover.u), smooth(P.shrinkFrom, 180, th));
    const xs = [offset + Math.min(0, tip) - bezel, offset + Math.max(baseU, tip) + bezel];
    const ys = [-v * perspective / 2 - bezel, v * perspective / 2 + bezel];
    const corners = xs.flatMap(x => ys.map(y => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]));
    const extent = axis => Math.max(...corners.map(p => Math.abs(p[axis])));
    const s = Math.min(baseS, r.maxW / (2 * extent(0)), r.maxH / (2 * extent(1)));
    return { t, th, p: e, s, hx: r.cx + (hx - r.cx) * s / baseS, cy,
      angle, top: cy - v * s / 2, settled: t >= T };
  }

  function endRig(now) {
    rig.on = false;
    if (rig.cached) settle(cur.img);
    setFrame(fit(cur));
    outlineOp.snap(lined(cur) ? 1 : 0); shellOp.snap(shelled(cur) ? 1 : 0);
    creaseOp.snap(0); if (isOpen(cur)) creaseOp.to(P.crease, 240, now);
    rulerOp.to(1, 200, now);
  }

  const spin = { on: false };
  let spinEaseKey = "", spinEaseFn = null;
  const spinEase = () => {
    const k = `${P.rotLift},${P.rotLand}`;
    if (k !== spinEaseKey) { spinEaseKey = k; spinEaseFn = bezier(P.rotLift, 0, P.rotLand, 1); }
    return spinEaseFn;
  };
  // 몸체 · 틀만 돌고 내용은 반대로 돌아 똑바로 선다. 캐시가 있으면 45° 근처에서 가로 레이아웃으로 흐림 교체한다.
  function startSpin(from, to, now, cached) {
    freeze(now);
    if (cached) sharpen(now); else hold(now);
    const degrees = ((to.angle - from.angle + 540) % 360) - 180;
    Object.assign(spin, { on: true, t0: now, dur: P.rotDur, from, to, f0: fit(from), f1: fit(to), dir: degrees / 90, cached });
    roll.w.snap(from.w); roll.h.snap(from.h);
    rulerOp.to(0, 120, now);
    tr = { kind: "spin", from, to, t0: now, arriveAt: Infinity, arrived: false };
  }
  function spinAt(now) {
    const t = (now - spin.t0) / 1000, T = Math.max(.05, spin.dur);
    return { p: spinEase()(clamp(t / T, 0, 1)), done: t >= T };
  }
  function endSpin(now) {
    const st = spin.to, cached = spin.cached;
    spin.on = false;
    UA.el.style.transform = "";
    for (const img of [UA.l0, UA.l1]) img.style.transform = "";
    setFrame(fit(st));
    creaseOp.snap(isOpen(st) ? P.crease : 0);
    rulerOp.to(1, 200, now);
    if (cached) { settle(st.img); if (tr?.kind === "spin") tr = null; return; }
    // 그림이 아직이면 흐린 옛 화면을 새 틀에 둔 채 기다리고, 오면 흐림이 걷히며 드러난다.
    if (tr?.kind === "spin") Object.assign(tr, { kind: "size", cached: false, arrived: false, arriveAt: images.has(st.sel) ? now : Infinity });
  }

  const holdSize = (spec, frame, fill) => {
    if (!fill) return { w: spec.dpW, h: spec.dpH };
    const k = Math.max(frame.w / spec.dpW, frame.h / spec.dpH);
    return { w: spec.dpW * k, h: spec.dpH * k };
  };

  function place(img, spec, x, w, h, op, blur, y = 0) {
    if (!spec || op <= .001) { img.style.opacity = 0; return; }
    if (img.dataset.u !== spec.url) { img.src = spec.url; img.dataset.u = spec.url; }
    img.style.left = x + "px"; img.style.top = y + "px"; img.style.width = w + "px"; img.style.height = h + "px";
    img.style.opacity = op;
    img.style.filter = blur > .05 ? `blur(${blur.toFixed(2)}px)` : "none";
  }

  // 접기는 기기 고유 좌표에서 하고, 그림은 장면의 회전을 상쇄해 화면 위로 선다.
  function foldImage(img, spec, size, folded, du, s, now, blur = 0, opacity = 1) {
    const panel = rig.d[folded ? "cover" : "open"];
    place(img, spec, (panel.w - size.w) * s / 2 - du * s, size.w * s, size.h * s, opacity, blur, (panel.h - size.h) * s / 2);
    img.style.transform = `rotate(${-rigAt(now).angle}deg)`;
  }
  function paintFace(f, plan, s, now) {
    const o = layer.old, n = layer.neu, spec = rig.oldSpec, folded = plan === rig.plan.outer;
    const put = (img, src, size, blur, op = 1) => foldImage(img, src, size, folded, plan.du, s, now, blur, op);
    if (plan.role === "crisp") {
      put(f.old, spec, { w: spec.dpW, h: spec.dpH }, rig.restBlur);
      f.veil.style.opacity = 0;
    } else if (rig.cached) {
      const ts = rig.to.img;
      put(f.old, ts, { w: ts.dpW, h: ts.dpH }, 0);
      f.veil.style.opacity = 0;
      f.neu.style.opacity = 0;
      f.el.style.background = ts.edge;
      return;
    } else {
      put(f.old, spec, holdSize(spec, plan.frame, o.fill), o.blur.at(now));
      f.veil.style.opacity = o.veil.at(now);
    }
    if (plan.neu && n.r) put(f.neu, n.r, { w: n.r.dpW, h: n.r.dpH }, n.blur.at(now), n.op.at(now));
    else f.neu.style.opacity = 0;
    f.el.style.background = (n.r && n.op.at(now) > .5 && plan.neu ? n.r : spec).edge;
  }
  function turnRig(el, now) {
    const { angle, cy } = rigAt(now);
    el.style.transformOrigin = `${room().cx}px ${cy}px`;
    el.style.transform = `rotate(${angle}deg)`;
  }
  // 빛은 화면에 고정이고, 정면을 보는 면이 1이 되게 맞춘다 — 멈춘 장면의 밝기는 그대로이고 돌아간 면만 어두워지거나 밝아진다.
  const LIGHT = (() => { const az = P.lightAz * Math.PI / 180, el = P.lightEl * Math.PI / 180; return [Math.cos(el) * Math.cos(az), -Math.cos(el) * Math.sin(az), Math.sin(el)]; })();
  const lightOf = n => clamp(P.ambient + (1 - P.ambient) * Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / LIGHT[2], 0, 1.5);
  const rgbOf = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const tonedRgb = (rgb, b) => rgb.map(c => b <= 1 ? c * b : c + (255 - c) * (b - 1) * .5);
  const css = rgb => `rgb(${rgb.map(Math.round).join(" ")})`, toned = (rgb, b) => css(tonedRgb(rgb, b));
  // 옆면 띠 — 가운데는 받은 빛의 색, 두 가장자리는 18% 밝고 20% 어두워 이웃 띠와의 경계가 모서리처럼 읽힌다.
  const stripPaint = (rgb, b) => {
    const mid = toned(rgb, b), hi = `color-mix(in srgb, ${mid}, var(--device-veil) 18%)`, lo = `color-mix(in srgb, ${mid}, var(--device-shade) 20%)`;
    return `linear-gradient(90deg, ${hi} 0, ${mid} 10%, ${mid} 90%, ${lo} 100%)`;
  };
  // 화면은 스스로 빛나서 몸체보다 덜 어두워진다.
  const litOf = b => b <= 1 ? shade(P.screenDim * (1 - b)) : `color-mix(in srgb, var(--device-veil) ${((b - 1) * 25).toFixed(1)}%, transparent)`;
  const px = v => v.toFixed(2) + "px", radii = r => r.map(px).join(" ");
  // 둥근 사각형 윤곽의 옆면 띠 — 직선 변은 한 장, 모서리는 호에 외접하는 n장이라 이웃 띠의 끝이 만난다.
  function perimeter([x0, y0, x1, y1], [tl, tr, br, bl], n) {
    const out = [], d = 90 / n, rd = a => a * Math.PI / 180, w = r => 2 * r * Math.tan(rd(d) / 2);
    const arc = (cx, cy, r, a0) => { for (let i = 0; i < n; i++) { const a = a0 + (i + .5) * d; out.push({ x: cx + r * Math.cos(rd(a)), y: cy + r * Math.sin(rd(a)), a, len: w(r) }); } };
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
  // 판 하나 — 몸체 상자(body)와 그 안의 화면(scr). 좌표는 힌지 위 끝이 원점인 판의 평면이고, 뒷면은 두께 T 만큼 뒤에서 뒤집힌다.
  // normal(v) 은 판 좌표의 법선을 화면 좌표로 옮긴다. hingeLeft 는 판 좌표에서 힌지가 화면의 왼쪽 변인지다.
  function drawPanel(p, { body, bodyR, scr, scrR, backScrR, T, normal, tone, hk, hingeLeft }) {
    const [x0, y0, x1, y1] = body, W = x1 - x0, H = y1 - y0, cap = r => r.map(v => clamp(v, 0, Math.min(W, H) / 2));
    const R = cap(bodyR), mirror = r => [r[1], r[0], r[3], r[2]];
    for (const [f, back] of [[p.front, false], [p.back, true]]) {
      const sx = back ? x1 - scr[2] : scr[0] - x0, sr = back ? mirror(backScrR || scrR) : scrR, sw = scr[2] - scr[0], sh = scr[3] - scr[1];
      Object.assign(f.body.style, { left: px(x0), top: px(y0), width: px(W), height: px(H), backgroundColor: toned(tone, 1),
        borderRadius: radii(back ? mirror(R) : R), transform: back ? `translateZ(${px(-T)}) rotateY(180deg)` : "none" });
      if (f.clip) Object.assign(f.clip.style, { left: px(sx), top: px(scr[1] - y0), width: px(sw), height: px(sh), borderRadius: radii(sr) });
      if (f.ring) {
        // 고리는 화면 바깥 1.5px — 힌지 쪽은 접히기 시작하면서 생긴다(펼친 동안 두 판의 고리가 힌지에서 겹치지 않게).
        const hinge = 1.5 * hk, [l, r] = hingeLeft ? [hinge, 1.5] : [1.5, hinge], [ll, rr] = back ? [r, l] : [l, r];
        Object.assign(f.ring.style, { left: px(sx - ll), top: px(scr[1] - y0 - 1.5), width: px(sw + ll + rr), height: px(sh + 3),
          borderWidth: `1.5px ${px(rr)} 1.5px ${px(ll)}`, borderRadius: radii(sr.map(v => v + 1.5)) });
      }
      if (f.lit) f.lit.style.background = litOf(lightOf(normal([0, 0, back ? -1 : 1])));
    }
    const segs = perimeter(body, R, P.arcSegs);
    while (p.strips.length < segs.length) { const el = document.createElement("div"); el.className = "strip"; p.el.append(el); p.strips.push(el); }
    p.strips.forEach((el, i) => {
      const g = segs[i];
      if (!g || g.len < .05 || T < .05) { el.style.display = "none"; return; }
      // 이웃 띠와 .6px 겹쳐 안티에일리어싱이 남기는 틈을 덮는다
      const len = g.len + .6, a = g.a * Math.PI / 180;
      Object.assign(el.style, { display: "", width: px(T), height: px(len), marginLeft: px(-T / 2), marginTop: px(-len / 2),
        transform: `translate3d(${px(g.x)},${px(g.y)},${px(-T / 2)}) rotateZ(${g.a.toFixed(3)}deg) rotateY(90deg)` });
      el.style.background = stripPaint(tone, lightOf(normal([Math.cos(a), Math.sin(a), 0])));
    });
  }

  function drawRig(now) {
    const { th, s, hx: hu, top: T0, angle } = rigAt(now);
    const k = th / 180, rad = th * Math.PI / 180, sn = Math.sin(rad), cs = Math.cos(rad), d = rig.d;
    const lk = lookAt(now), t = lk.bezel * P.shellK * s, tone = rgbOf(lk.tone);
    const Lu = lerp(rig.half.u, rig.cover.u, k) * s, Lv = lerp(rig.half.v, rig.cover.v, k) * s;
    // 커버가 펼친 반쪽보다 좁으면 바닥 반쪽도 커버 폭으로 줄어야 다 접힌 순간 커버 밖으로 비어져 나오지 않는다.
    // 장이 바닥을 덮기 시작한 뒤에만 줄인다 — 드러난 바닥의 가장자리가 접는 동안 미끄러지지 않게
    const Bu = lerp(rig.half.u, Math.min(rig.half.u, rig.cover.u), smooth(P.shrinkFrom, 180, th)) * s, Bv = Lv;
    const T = d.plate.thickness * s, za = d.plate.gap * s / 2;
    // 다 접히면 커버는 바닥 화면보다 두께 + 틈만큼 앞에 있다 — 원근으로 커지지 않게 장면을 그만큼 뒤로 물려 보이는 화면이 양끝에서 z=0 에 선다.
    const lift = (T + 2 * za) * (1 - cs) / 2;
    const hk = smooth(20, 160, th), e = t * hk;
    // 반경은 면마다 고정한다 — 펼친 화면 반경에서 60~120° 사이에 커버 반경으로 옮겨, 다 접혔을 때 아래 판이 비어져 나오지 않는다.
    const rIn = d.look.open.radius * s, rOut = d.look.cover.radius * s, rB = lerp(rIn, rOut, smooth(60, 120, th)) + t, rH = rB * hk;
    const pivot = `${px(hu)} ${px(T0 + Bv / 2)}`;
    Object.assign(RG.lift.style, { perspective: P.perspective + "px", perspectiveOrigin: pivot });
    RG.space.style.transform = `translateZ(${px(-lift)})`;
    // 법선 — 판 좌표 → 접힘(rotateY) → 장면 회전(turnRig 의 rotate). 빛은 화면에 고정이다.
    const a = angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const turn = n => [n[0] * ca - n[1] * sa, n[0] * sa + n[1] * ca, n[2]];
    const fold = n => [n[0] * cs + n[2] * sn, n[1], -n[0] * sn + n[2] * cs];
    for (const p of [RG.base, RG.leaf]) Object.assign(p.el.style, { left: px(hu), top: px(T0) });
    RG.leaf.el.style.transform = `translateZ(${px(za)}) rotateY(${th.toFixed(3)}deg) translateZ(${px(-za)})`;
    drawPanel(RG.base, { body: [-e, -t, Bu + t, Bv + t], bodyR: [rH, rB, rB, rH], scr: [0, 0, Bu, Bv], scrR: [rIn * hk, rIn, rIn, rIn * hk], T, normal: turn, tone, hk, hingeLeft: true });
    drawPanel(RG.leaf, { body: [-Lu - t, -t, e, Lv + t], bodyR: [rB, rH, rH, rB], scr: [-Lu, 0, 0, Lv], scrR: [rIn, rIn * hk, rIn * hk, rIn],
      backScrR: [rOut, rOut * hk, rOut * hk, rOut], T, normal: n => turn(fold(n)), tone, hk, hingeLeft: false });
    paintFace(RG.F.base, rig.plan.base, s, now);
    paintFace(RG.F.inner, rig.plan.inner, s, now);
    paintFace(RG.F.outer, rig.plan.outer, s, now);
    const oc = rigCamera(false, s), sh = d.open.hinge * s;
    putCam(RG.F.outer.cam, rigCamera(true, s), 0, 0, 1);
    putCam(RG.F.inner.cam, oc, 0, 0, 1);
    putCam(RG.F.base.cam, oc, -sh, 0, 1);
    const cast = P.shade * (.85 * smooth(90, 180, th) + .25 * sn);
    RG.F.base.cast.style.background = `linear-gradient(90deg, ${shade(cast)}, ${shade(cast * .35)} 45%, ${shade(0)} 90%)`;

    // 책등 — 두 판의 뒤쪽 힌지 모서리를 잇는 띠. 펼치면 폭 0, 다 접히면 두께 둘 + 틈. 둥근 힌지 쪽 모서리까지 덮게 몸체 높이 전체에 반경을 준다.
    const bx = -e, bz = -T, dz = -T - za, lx = e * cs + dz * sn, lz = za - e * sn + dz * cs;
    const sl = Math.hypot(lx - bx, lz - bz), phi = Math.atan2(-(lz - bz), lx - bx), sv = Bv + 2 * t;
    Object.assign(RG.spine.style, { display: sl > .3 && T > .05 ? "" : "none", left: px(hu), top: px(T0 - t), width: px(sl + .6), height: px(sv), marginLeft: px(-(sl + .6) / 2),
      borderRadius: `${px(Math.min(rH, (sl + .6) / 2))} / ${px(rH)}`,
      transform: `translate3d(${px((bx + lx) / 2)},0,${px((bz + lz) / 2)}) rotateY(${(phi * 180 / Math.PI).toFixed(3)}deg)` });
    RG.spine.style.background = stripPaint(tone, lightOf(turn([Math.sin(phi), 0, Math.cos(phi)])));

    // 바닥에 드리우는 그림자 — 두 판을 덮는 상자 하나를 바닥 판 뒤에 둔다.
    const tip = hu - Lu * cs, p0 = Math.min(hu - e, tip - t), p1 = Math.max(hu + Bu + t, tip + t);
    Object.assign(RG.plate.style, { left: px(p0), top: px(T0 - t), width: px(p1 - p0), height: px(Bv + 2 * t), borderRadius: px(rB),
      transform: `translateZ(${px(-T - 1)})`, boxShadow: `var(--elevation-2), 0 ${10 + 18 * sn}px ${30 + 34 * sn}px ${shade(.05 * sn)}` });
    // 옆 단추는 접힌 몸체의 바깥 끝을 따라가고, 보이는 화면과 같은 깊이에 서 양끝에서 멈춘 몸체의 단추와 겹친다.
    lk.btn.forEach((b, i) => {
      Object.assign(RG.btns[i].style, { left: Math.max(hu + Bu, tip) + t - .5 + "px", top: T0 + b.at * s + "px",
        width: "3px", height: b.len * s + "px", backgroundColor: lk.tone, opacity: b.len * s > .5 ? 1 : 0, transform: `translateZ(${px(lift)})` });
    });
    const ck = P.crease * clamp(1 - th / 24, 0, 1), tk = clamp(1 - th / 24, 0, 1);
    Object.assign(RG.crease.style, { left: hu + "px", top: T0 + "px", height: Bv + "px", opacity: ck * hingeOp.at(now) });
    Object.assign(RG.tTop.style, { left: hu + "px", top: T0 - t + "px", width: "1px", height: t + "px", opacity: tk });
    Object.assign(RG.tBot.style, { left: hu + "px", top: T0 + Bv + "px", width: "1px", height: t + "px", opacity: tk });
  }

  const unitOf = el => ({ el, shell: q(el, ".shell"), btns: [...el.querySelectorAll(".btn")], cam: q(el, ".cam"), home: q(el, ".home"), outline: q(el, ".outline"), stage: q(el, ".stage"), l0: q(el, ".l0"), l1: q(el, ".l1"), veil: q(el, ".veil"), crease: q(el, ".crease"), tTop: q(el, ".t-top"), tBot: q(el, ".t-bot") });
  const UA = unitOf($("ua")), UB = unitOf($("ub"));

  function drawContent(U, rect, s, layers, now) {
    const o = layers.old, n = layers.neu, sw = layers.swap, k = sw ? swapAt(sw, now) : 0;
    const nop = sw ? smooth(0, 1, k) : n.op.at(now), nb = sw ? swapBlurAt(sw, k) : n.blur.at(now), ob = Math.max(o.blur.at(now), sw ? swapBlurAt(sw, k) : 0);
    U.l0.style.transform = U.l1.style.transform = "";
    if (o.r) {
      // 채운 그림은 가운데에 둔다 — 돌리는 동안의 똑바로 선 그림과 같은 자리라 돌기 전후에 튀지 않는다.
      const fill = o.held && o.fill, hs = holdSize(o.r, { w: rect.w / s, h: rect.h / s }, fill);
      place(U.l0, o.r, fill ? (rect.w - hs.w * s) / 2 : 0, hs.w * s, hs.h * s, o.op.at(now), ob, fill ? (rect.h - hs.h * s) / 2 : 0);
    } else U.l0.style.opacity = 0;
    U.veil.style.opacity = o.veil.at(now);
    if (n.r) place(U.l1, n.r, 0, n.r.dpW * s, n.r.dpH * s, nop, nb);
    else U.l1.style.opacity = 0;
    // 흐린 A 에서 흐린 B 로 — 녹아 바뀌는 동안 A 는 살짝 커지며 물러나고 B 는 살짝 작은 데서 제자리로 온다(가운데 기준)
    const q = n.r ? (sw ? smooth(0, 1, k) : nop) : 0;
    if (q > 0 && q < 1) {
      U.l0.style.transformOrigin = U.l1.style.transformOrigin = "50% 50%";
      U.l0.style.transform = `scale(${(1 + P.swapZoom * q).toFixed(4)})`;
      U.l1.style.transform = `scale(${(1 - P.swapZoom * (1 - q)).toFixed(4)})`;
    }
    return n.r && nop > .5 ? n.r : o.r;
  }
  // 돌리는 동안 — 틀은 몸체와 함께 돌고, 그림은 틀 가운데에서 반대로 돌아 화면 기준 0°에 선다.
  function drawUpright(U, rect, s, now) {
    const { p } = spinAt(now), deg = spin.dir * 90 * p, a = deg * Math.PI / 180, o = layer.old;
    const up = (img, spec, size, op, blur) => {
      place(img, spec, (rect.w - size.w) / 2, size.w, size.h, op, blur, (rect.h - size.h) / 2);
      img.style.transform = `rotate(${(-deg).toFixed(3)}deg)`;
    };
    U.veil.style.opacity = o.veil.at(now);
    if (!o.r) { U.l0.style.opacity = U.l1.style.opacity = 0; return null; }
    if (!spin.cached || !spin.to.img) {
      const box = { w: (Math.abs(rect.w * Math.cos(a)) + Math.abs(rect.h * Math.sin(a))) / s, h: (Math.abs(rect.w * Math.sin(a)) + Math.abs(rect.h * Math.cos(a))) / s };
      const hs = holdSize(o.r, box, true);
      up(U.l0, o.r, { w: hs.w * s, h: hs.h * s }, 1, o.blur.at(now));
      U.l1.style.opacity = 0;
      return o.r;
    }
    const w = smooth(P.spinSwapA, P.spinSwapB, p), b = bump(w), from = o.r, to = spin.to.img;
    up(U.l0, from, { w: from.dpW * s, h: from.dpH * s }, 1, b);
    up(U.l1, to, { w: to.dpW * s, h: to.dpH * s }, w, b);
    return w > .5 ? to : from;
  }

  function drawUnit(U, rect, ol, s, layers, now, opacity, turning = false) {
    const { cx } = room(), g = P.gap, y = rect.y;
    U.el.style.opacity = opacity;
    Object.assign(U.stage.style, { left: cx - rect.w / 2 + "px", top: y + "px", width: rect.w + "px", height: rect.h + "px" });
    const top = turning ? drawUpright(U, rect, s, now) : drawContent(U, rect, s, layers, now);
    U.stage.style.background = top ? top.edge : "var(--surface-container)";
    const lk = ol.look, sr = lk.radius * s * ol.shell;
    U.stage.style.borderRadius = sr.toFixed(2) + "px";
    Object.assign(U.outline.style, { left: cx - ol.w / 2 + "px", top: y - g + "px", width: ol.w + "px", height: ol.h + "px",
      borderRadius: sr > 0 ? sr + g + "px" : "0px", opacity: ol.op });
    const t = lk.bezel * P.shellK * s, te = endsOf(lk) * P.shellK * s, L = cx - rect.w / 2, tx = ol.rot ? te : t, ty = ol.rot ? t : te;
    Object.assign(U.shell.style, { left: L - tx + "px", top: y - ty + "px", width: rect.w + 2 * tx + "px", height: rect.h + 2 * ty + "px", borderRadius: sr + t + "px",
      backgroundColor: lk.tone, opacity: ol.shell });
    const H0 = (ol.rot ? rect.w : rect.h) / s, bw = 3;
    lk.btn.forEach((b, i) => {
      const e = U.btns[i], a = b.at * s, ln = b.len * s;
      Object.assign(e.style, ol.rot
        ? { left: L + (H0 * s - a - ln) + "px", top: (b.side < 0 ? y - t - bw + .5 : y + rect.h + t - .5) + "px", width: ln + "px", height: bw + "px" }
        : { left: (b.side < 0 ? L - t - bw + .5 : L + rect.w + t - .5) + "px", top: y + a + "px", width: bw + "px", height: ln + "px" },
        { backgroundColor: lk.tone, opacity: ln > .5 ? ol.shell : 0 });
      if (ol.mirrored) {
        e.style.left = 2 * L + rect.w - parseFloat(e.style.left) - parseFloat(e.style.width) + "px";
        e.style.top = 2 * y + rect.h - parseFloat(e.style.top) - parseFloat(e.style.height) + "px";
      }
    });
    const camera = camBox((ol.rot ? rect.h : rect.w) / s, H0, ol.rot, lk.cam, s, ol.mirrored);
    putCam(U.cam, camera, 0, 0, ol.shell);
    const hd = endsOf(lk) * P.shellK * HOME_K, homeAt = camBox((ol.rot ? rect.h : rect.w) / s, H0, ol.rot, { w: hd, h: hd, y: H0 + (endsOf(lk) * P.shellK - hd) / 2 }, s, ol.mirrored);
    const hk = Number(lk.home) || 0;
    putCam(U.home, { ...homeAt, on: homeAt.on && hk > .01 }, L, y, ol.shell * hk);
    const c = ol.crease, hz = ol.rot;
    U.crease.classList.toggle("h", hz);
    Object.assign(U.crease.style, hz ? { left: "0px", top: rect.h / 2 + "px", width: rect.w + "px", height: "", opacity: c * hingeOp.at(now) }
                                     : { left: rect.w / 2 + "px", top: "0px", width: "", height: rect.h + "px", opacity: c * hingeOp.at(now) });
    const so = c > 0 ? ol.shell * Math.min(1, c / Math.max(.01, P.crease)) : 0;
    if (hz) {
      Object.assign(U.tTop.style, { left: L - t + "px", top: y + rect.h / 2 + "px", width: t + "px", height: "1px", opacity: so });
      Object.assign(U.tBot.style, { left: L + rect.w + "px", top: y + rect.h / 2 + "px", width: t + "px", height: "1px", opacity: so });
    } else {
      Object.assign(U.tTop.style, { left: cx + "px", top: y - t + "px", width: "1px", height: t + "px", opacity: so });
      Object.assign(U.tBot.style, { left: cx + "px", top: y + rect.h + "px", width: "1px", height: t + "px", opacity: so });
    }
  }

  function draw(now) {
    if (rig.on) {
      UA.el.hidden = true; UB.el.hidden = true; rigEl.hidden = false;
      turnRig(rigEl, now);
      drawRig(now);
      return;
    }
    rigEl.hidden = true; UA.el.hidden = false;
    const s = V.s.at(now), ua = spin.on ? spin.from : cur;
    if (spin.on) {
      const { p } = spinAt(now), { f0, f1 } = spin, c0y = f0.y + f0.h / 2, c1y = f1.y + f1.h / 2;
      UA.el.style.transformOrigin = `${f0.cx}px ${c0y}px`;
      UA.el.style.transform = `translate(${((f1.cx - f0.cx) * p).toFixed(2)}px, ${((c1y - c0y) * p).toFixed(2)}px) rotate(${(spin.dir * 90 * p).toFixed(3)}deg) scale(${(lerp(1, f1.s / f0.s, p) * (1 - P.rotDip * Math.sin(Math.PI * p))).toFixed(4)})`;
    }
    drawUnit(UA, { w: V.w.at(now), h: V.h.at(now), y: V.y.at(now) }, { w: O.w.at(now), h: O.h.at(now), op: outlineOp.at(now), crease: creaseOp.at(now), shell: shellOp.at(now), rot: !!ua.rot, mirrored: !!ua.mirrored, look: lookAt(now) }, s, layer, now, unitOp.a.at(now), spin.on);
    if (fadeB) {
      UB.el.hidden = false;
      const f = fadeB.f, g = P.gap, st = fadeB.st;
      drawUnit(UB, { w: f.w, h: f.h, y: f.y }, { w: f.w + 2 * g, h: f.h + 2 * g, op: lined(st) ? 1 : 0, crease: isOpen(st) ? P.crease : 0, shell: shelled(st) ? 1 : 0, rot: !!st.rot, mirrored: !!st.mirrored, look: shelled(st) ? lookOf(st) : lookAt(now) }, f.s, fadeB.layers, now, unitOp.b.at(now));
    } else UB.el.hidden = true;
  }

  function tick() {
    const now = clock.t;
    if (tr && !tr.arrived && now >= tr.arriveAt) arrive();
    if (tr && tr.kind === "size" && tr.cached && !tr.swapped && (tr.grow || nearTarget(now) || now - tr.t0 > P.frameDur * 800)) startSwap(now);
    if (rig.on && rigAt(now).settled) endRig(now);
    if (spin.on && spinAt(now).done) endSpin(now);
    const n = layer.neu;
    const shown = layer.swap ? swapAt(layer.swap, now) >= 1 : n.op.done(now) && n.op.b === 1 && n.blur.done(now);
    if (!rig.on && n.r && shown) {
      const keep = layer.swap ? layer.swap.tail : n.blur.b;
      settle(n.r);
      if (tr?.kind === "size" && keep) layer.old.blur.snap(keep);
    }
    // 크기 전환은 틀이 멈춘 뒤에 선명해진다 — 움직이는 동안 늘었다 줄었다 하는 화면을 옅은 흐림이 가린다
    if (tr?.kind === "size" && tr.arrived && !layer.neu.r && nearRest(now) && layer.old.blur.b > 0 && !layer.old.fill) layer.old.blur.to(0, P.settleSharp, now);
    if (tr) {
      if (tr.kind === "fade") { if (tr.arrived && unitOp.b.done(now)) endFade(now); }
      else if (tr.kind !== "spin" && tr.arrived && !rig.on && !layer.neu.r && atRest(now) && O.w.done(now) && O.h.done(now) && layer.old.blur.b === 0 && layer.old.blur.done(now)) {
        tr = null;
        outlineOp.to(lined(cur) ? 1 : 0, 220, now);

      }
    }
    if (queued && !rig.on && !spin.on && (!tr || tr.kind === "size")) {
      const qs = queued, st = resolve(qs);
      const posing = cur.kind === "device" && st.kind === "device" && cur.dev === st.dev;
      if (!posing || atRest(now)) { queued = null; go(qs); }
    }
    if (draft && cur) { setFrame(fit({ ...cur, w: draft.w, h: draft.h })); roll.w.snap(draft.w); roll.h.snap(draft.h); }
    draw(now);
    root.classList.toggle("at-rest", !tr && !queued && !draft);
    drawRuler(now);
    hooks.layout({ w: V.w.at(now), h: V.h.at(now), s: V.s.at(now), y: V.y.at(now), cx: room().cx, radius: lookAt(now).radius * V.s.at(now) * shellOp.at(now), bezel: edgeOf(lookAt(now)) * V.s.at(now) * shellOp.at(now) }, !!tr || !!queued || rig.on || spin.on || !!draft);
  }
  const roll = { w: new Tw(411), h: new Tw(891) };
  const byId = id => document.getElementById(id);   // 조작 독은 장면 밖(무대 아래 가운데에 뜬다)에 선다 — $ 는 장면 안만 찾는다
  const PN = { el: byId("panel"), pick: byId("pnPick"), fold: byId("pnFold"), sum: byId("pnSum"), body: byId("pnBody") };
  const CTL = { el: byId("devCtl"), fold: byId("dcFold"), rot: byId("dcRot"), hinge: byId("dcHinge") };
  const ORIENT = { el: byId("dcOrientation"), menu: byId("dcOrientMenu") };
  const directions = [...ORIENT.menu.querySelectorAll("[data-orientation]")];
  const orientationOpen = () => CTL.rot.getAttribute("aria-expanded") === "true";
  function setOrientationOpen(on, focus = true) {
    if (on) setOpen(false);
    if (!on && ORIENT.menu.contains(document.activeElement)) CTL.rot.focus({ preventScroll: true });
    CTL.rot.setAttribute("aria-expanded", on);
    ORIENT.menu.classList.toggle("on", on);
    ORIENT.menu.inert = !on;
    if (on && focus) (directions.find(b => b.getAttribute("aria-checked") === "true") || directions[0]).focus();
  }
  ORIENT.menu.addEventListener("click", e => {
    const button = e.target.closest("[data-orientation]");
    if (!button || cur.kind !== "device") return;
    request(devSel(cur, cur.folded, button.dataset.orientation));
    setOrientationOpen(false);
  });
  ORIENT.menu.addEventListener("keydown", e => {
    if (e.key === "Tab") { setOrientationOpen(false); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const index = directions.indexOf(document.activeElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? directions.length - 1 : (index + (e.key === "ArrowUp" ? -1 : 1) + directions.length) % directions.length;
    directions[next].focus();
  });
  CTL.rot.addEventListener("keydown", e => {
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation(); setOrientationOpen(true);
  });
  const ROWS = [...PN.pick.querySelectorAll("[data-sel]")];
  // 칸은 이름과 dp 두 쪽이다. 기기 칸은 몸체 윤곽을 앞에 둔다 — 비율 · 모서리 · 카메라(구멍 · 섬)는 몸체 그림의 값에서 줄이고,
  // 접는 기기는 힌지 선을 긋는다. 이름은 줄이고 전체 이름은 툴팁에 둔다.
  const silOf = d => {
    const o = d.open, lk = d.look.open, k = 19 / Math.max(o.w, o.h), W = o.w * k, H = o.h * k, x = 10 - W / 2, y = 10 - H / 2, sw = 1.4;
    const f = n => n.toFixed(2), r = clamp((lk.radius + lk.bezel * P.shellK) * k * 1.8, 1.2, Math.min(W, H) / 3);
    const inset = sw / 2 + clamp(lk.bezel * P.shellK * k, .9, 2.2), ri = Math.max(.4, r - inset + sw / 2);
    const screen = (sx, sw2) => `<rect x="${f(sx)}" y="${f(y + inset)}" width="${f(sw2)}" height="${f(H - 2 * inset)}" rx="${f(ri)}" fill="currentColor" fill-opacity=".16"/>`;
    const glass = d.fold ? screen(x + inset, W / 2 - inset - .4) + screen(x + W / 2 + .4, W / 2 - inset - .4) : screen(x + inset, W - 2 * inset);
    let cam = "";
    if (lk.cam.w > 0) {
      const cx = x + W * (lk.cam.x ?? .5), cy = y + inset + 1.1;
      cam = lk.cam.edge === "right"
        ? `<rect x="${f(x + W - inset - 1.7)}" y="${f(y + H * (lk.cam.x ?? .5) - 1.8)}" width="1.2" height="3.6" rx=".6" fill="currentColor"/>`
        : lk.cam.w > lk.cam.h * 3
        ? `<rect x="${f(cx - 1.8)}" y="${f(cy - .6)}" width="3.6" height="1.2" rx=".6" fill="currentColor"/>`
        : `<circle cx="${f(cx)}" cy="${f(cy)}" r=".75" fill="currentColor"/>`;
    }
    const hinge = d.fold ? `<path d="M${f(x + W / 2)} ${f(y)}V${f(y + H)}" stroke="currentColor" stroke-width=".8"/>` : "";
    return `<svg class="pn-sil" viewBox="0 0 20 20" aria-hidden="true">${glass}<rect x="${f(x + sw / 2)}" y="${f(y + sw / 2)}" width="${f(W - sw)}" height="${f(H - sw)}" rx="${f(r)}" fill="none" stroke="currentColor" stroke-width="${sw}"/>${hinge}${cam}</svg>`;
  };
  for (const b of ROWS) {
    const d = DEVICES[b.dataset.sel];
    if (d) b.title = d.name;
    b.innerHTML = `${d ? silOf(d) : ""}<span class="nm">${d ? d.short : b.dataset.t ? phrase(b.dataset.t) : b.textContent}</span><span class="d"></span>`;
  }
  // 크기 · 기기 메뉴(D-167) — 독의 버튼 위로 열린다. 그림을 가리는 층이라 고르면 닫는다. 방향키로 지나가는 동안(고르기만 한다)은
  // 열어 둔다. 바깥 누름도 닫는다. Esc 는 다른 떠 있는 층과 한 줄로 단축키의 EscapeLayers 가 closeMenu 로 닫는다.
  // 자세 · 슬라이더는 독 가운데(#devCtl · #pnSl)가 갖는다.
  const SUM = { sil: PN.sum.querySelector(".pn-sum-sil"), nm: PN.sum.querySelector(".nm"), dev: null };
  const menuOpen = () => PN.sum.getAttribute("aria-expanded") === "true";
  function setOpen(on) {
    if (on) setOrientationOpen(false);
    if (!on && PN.body.contains(document.activeElement)) PN.sum.focus({ preventScroll: true });
    PN.sum.setAttribute("aria-expanded", on);
    PN.fold.classList.toggle("open", on);
    PN.body.inert = !on;
  }
  PN.sum.addEventListener("click", () => setOpen(!menuOpen()));
  // 바깥 누름은 창에서 받는다 — 장면이 켜진 동안만 걸고 끌 때 뗀다(Storybook 은 스토리마다 장면을 새로 만든다).
  const outside = e => {
    if (menuOpen() && !PN.fold.contains(e.target)) setOpen(false);
    if (orientationOpen() && !ORIENT.el.contains(e.target)) setOrientationOpen(false);
  };
  // 이름은 목록의 칸 이름 그대로다(기기는 짧은 이름). 치수 · 자세는 치수선과 자세 버튼이 말한다.
  function paintSum(key) {
    const dev = key === cur.dev ? DEVICES[key] : null, row = ROWS.find(b => b.dataset.sel === key);
    if (SUM.dev !== dev) { SUM.dev = dev; SUM.sil.innerHTML = dev ? silOf(dev) : ""; }
    SUM.nm.textContent = row.querySelector(".nm").textContent;
    PN.sum.classList.toggle("mono", row.classList.contains("mono"));
    PN.sum.title = `${dev ? dev.name : SUM.nm.textContent} · ${dims(cur)}`;
  }
  const itemOf = st => st.kind === "device" ? st.dev : st.sel;
  const openDims = d => `${Math.round(d.open.w)}×${Math.round(d.open.h)}`;
  // 커스텀 칸은 눈금자 숫자로 가는 입구다 — 지금 크기 그대로 커스텀이 되고, 장면이 멈추면 폭 숫자에 커서가 간다.
  let focusW = false;
  // 방향키로 지나가는 것은 고르기만 한다 — 커서까지 옮기면 라디오 묶음에서 빠져나가 다음 칩에 못 간다.
  function pick(sel, byKey) {
    focusW = false;
    dropDraft();
    // 슬라이더에 초점이 남으면 커스텀 칸이 고른 채로 남는다 — 숫자 입력처럼 놓고 간다
    slFocus = false;
    for (const el of [SL.w.thumb, SL.h.thumb]) if (document.activeElement === el) el.blur();
    // 숫자를 고치던 중이면 그 입력은 버린다 — 칩을 고르며 빠지는 blur 가 옛 숫자를 새 크기 위에 덧입혀 320×841 같은 커스텀이 됐다
    for (const el of [RL.w, RL.h]) if (document.activeElement === el) { el.dataset.cancel = "1"; el.blur(); }
    if (sel === "custom") {
      const w = clamp(Math.round(cur.w), DP_MIN, DP_MAX), h = clamp(Math.round(cur.h), DP_MIN, DP_MAX);
      if (cur.kind !== "custom") request(`custom:${w}x${h}`);
      if (!byKey) { focusW = true; wake(); }
      return;
    }
    if (DEVICES[sel]) return request(`${sel}:open`);
    request(sel);
  }
  function paintBar(st, instant) {
    const now = clock.t;
    if (instant) { roll.w.snap(st.w); roll.h.snap(st.h); } else { roll.w.to(st.w, 420, now); roll.h.to(st.h, 420, now); }
    if (st.kind === "device") {
      setLook(lookOf(st), instant);
      CTL.fold.hidden = CTL.hinge.hidden = !DEVICES[st.dev].fold;
      // 버튼은 아이콘만이다 — 그림은 data-* 로 상태를 따라가고(style.css), 이름은 툴팁 · aria-label 이 갖는다.
      const foldName = st.folded ? phrase("posture.unfold") : phrase("posture.fold");
      CTL.fold.dataset.folded = st.folded;
      CTL.fold.title = foldName;
      CTL.fold.setAttribute("aria-label", foldName);
      const turn = phrase("posture.orientation.tip", { orientation: phrase(`posture.${st.orientation}`) });
      CTL.rot.dataset.orientation = st.orientation;
      CTL.rot.title = turn;
      CTL.rot.setAttribute("aria-label", turn);
      for (const button of directions) button.setAttribute("aria-checked", button.dataset.orientation === st.orientation);
    }
    paintPick();
  }
  // 고른 칸의 dp 는 지금 크기다 — 접거나 돌린 기기 · 커스텀은 그 크기를, 나머지 기기는 펼친 크기를 적는다.
  function paintPick() {
    const custom = editing || (slFocus && cur.sel === slSent) || cur.kind === "custom", key = custom ? "custom" : itemOf(cur);
    for (const b of ROWS) {
      const sel = b.dataset.sel, on = sel === key, d = DEVICES[sel];
      b.setAttribute("aria-checked", on);
      const preset = PRESETS.find(x => x.sel === sel);
      b.lastElementChild.textContent = sel === "custom" ? (custom ? dims(cur) : `${DP_MIN}–${DP_MAX}`) : sel === "original" ? dims(ORIGINAL)
        : preset ? dims(preset) : on ? dims(cur) : openDims(d);
    }
    RL.el.classList.toggle("custom", custom);
    RL.el.classList.toggle("device", !custom && cur.kind === "device");
    CTL.el.hidden = custom || cur.kind !== "device";
    if (CTL.el.hidden) setOrientationOpen(false);
    SL.el.hidden = !custom;
    paintSum(key);
    paintSlider();
  }
  PN.pick.addEventListener("click", e => {
    const b = e.target.closest("[data-sel]");
    if (!b) return;
    pick(b.dataset.sel);
    setOpen(false);
  });
  CTL.fold.addEventListener("click", () => toggleFold());
  CTL.rot.addEventListener("click", () => setOrientationOpen(!orientationOpen()));
  CTL.hinge.addEventListener("click", () => toggleHinge());
  function paintHinge() { CTL.hinge.setAttribute("aria-pressed", P.hingeLine); CTL.hinge.title = P.hingeLine ? phrase("posture.hinge.hide") : phrase("posture.hinge.show"); }
  function toggleHinge() {
    if (cur.kind !== "device" || !DEVICES[cur.dev].fold) return;
    P.hingeLine = !P.hingeLine; paintHinge();
    hingeOp.to(P.hingeLine ? 1 : 0, 200, performance.now());
    wake();
  }
  // 접고 펼 때는 손에 든 회전(기본 방향에서 돈 각도)을 잇는다. 다른 화면에 그 각도가 없으면(거꾸로 선 세로) 세로로 간다.
  const foldSel = st => ["portrait", "landscape-left", "landscape-right"].map(o => devSel(st, !st.folded, o))
    .find(sel => resolve(sel).angle === st.angle) ?? devSel(st, !st.folded, "portrait");
  function toggleFold() { if (cur.kind === "device" && DEVICES[cur.dev].fold) request(foldSel(cur)); }

  const RL = { el: $("ruler"), ext: $("rlExt"), dim: $("rlDim"), w: $("rlW"), h: $("rlH"), shown: { w: "", h: "" } };
  let editing = false;
  function applyRuler(axis, raw) {
    const v = /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
    if (!(v > 0)) return;
    const n = clamp(v, DP_MIN, DP_MAX), w0 = Math.round(cur.w), h0 = Math.round(cur.h);
    const w = axis === "w" ? n : w0, h = axis === "h" ? n : h0;
    if (w === w0 && h === h0) return;
    roll[axis].snap(n);
    request(sizeSel(w, h));
  }
  const sizeSel = (w, h) => PRESETS.find(x => x.w === w && x.h === h)?.sel || `custom:${w}x${h}`;
  // 숫자를 고치기 시작하면 지금 크기 그대로 커스텀이 된다 — 기기를 고른 동안에도(D-99)
  function toCustom(typing = false) {
    if (editing) return;   // 누름(pointerdown)과 초점(focus)이 함께 와도 한 번만 보낸다
    if (cur.kind !== "custom") {
      const w = clamp(Math.round(cur.w), DP_MIN, DP_MAX), h = clamp(Math.round(cur.h), DP_MIN, DP_MAX);
      request(`custom:${w}x${h}`);
      // 초점을 받은 칸은 틀이 갱신하지 않는다 — 한계를 넘는 기기(1691dp)는 잘린 값을 바로 보인다(치는 중에는 덮지 않는다)
      if (!typing) for (const [axis, el, v] of [["w", RL.w, w], ["h", RL.h, h]]) { el.value = v; RL.shown[axis] = String(v); }
    }
    editing = true; paintPick();
  }
  for (const [axis, el] of [["w", RL.w], ["h", RL.h]]) {
    // 프리셋 · @Preview 는 초점만으로 커스텀이 된다. 기기는 누르거나 고칠 때만 — Tab 으로 지나가며 기기 몸체 · 자세를 잃지 않게
    el.addEventListener("focus", () => { el.select(); if (cur.kind !== "device") toCustom(); });
    el.addEventListener("pointerdown", () => toCustom());
    el.addEventListener("input", () => toCustom(true));
    el.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); el.blur(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); el.dataset.cancel = "1"; el.blur(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault(); toCustom();
        const d = (e.key === "ArrowUp" ? 1 : -1) * stepOf(e);
        el.value = clamp((parseInt(el.value, 10) || 0) + d, DP_MIN, DP_MAX);
      }
    });
    el.addEventListener("blur", e => {
      if (el.dataset.cancel) delete el.dataset.cancel;
      else applyRuler(axis, el.value);
      RL.shown[axis] = "";
      if (e.relatedTarget === RL.w || e.relatedTarget === RL.h) return;
      editing = false;
      paintPick();
      wake();
    });
  }
  // 커스텀 슬라이더(D-99) — 끄는 동안은 틀과 치수선 숫자만 따라온다(draft, 요청 없음). 놓거나 키 입력이 멈추면 치수선 입력과 같은 규칙으로 한 번 보낸다.
  // 보낸 뒤에도 새 상태가 올 때까지 draft 를 붙들어 틀이 옛 크기로 되튀지 않는다.
  const SL_KEY_SETTLE = 350;
  const slAt = v => `${((v - DP_MIN) / (DP_MAX - DP_MIN) * 100).toFixed(3)}%`;
  const SL = { el: byId("pnSl") };
  for (const box of SL.el.querySelectorAll(".sl")) {
    const track = box.querySelector(".sl-track");
    SL[box.dataset.axis] = { track, thumb: box.querySelector(".thumb"), fill: box.querySelector(".fill"), val: box.querySelector(".v b") };
    for (const t of track.querySelectorAll(".tick")) t.style.left = slAt(Number(t.dataset.v));
  }
  let draft = null, dragging = null, slFocus = false, keyTimer = 0, slSent = null;
  const slOff = () => SL.el.classList.contains("off");
  const slValue = axis => draft ? draft[axis] : clamp(Math.round(cur[axis]), DP_MIN, DP_MAX);
  function paintSlider() {
    for (const axis of ["w", "h"]) {
      const s = SL[axis], v = slValue(axis), at = slAt(v);
      s.fill.style.width = at; s.thumb.style.left = at; s.val.textContent = v;
      s.thumb.setAttribute("aria-valuenow", v); s.thumb.setAttribute("aria-valuetext", `${v}dp`);
    }
  }
  function slide(axis, v) {
    const n = clamp(Math.round(v), DP_MIN, DP_MAX);
    draft = { w: slValue("w"), h: slValue("h"), [axis]: n };
    paintSlider(); wake();
  }
  function commit() {
    clearTimeout(keyTimer); keyTimer = 0;
    if (!draft || dragging) return;
    const { w, h } = draft;
    if (w === Math.round(cur.w) && h === Math.round(cur.h)) { dropDraft(); return; }
    const sent = draft, sel = sizeSel(w, h);
    slSent = sel;
    request(sel).then(ok => { if (!ok && draft === sent) dropDraft(); });
  }
  function dropDraft() {
    clearTimeout(keyTimer); keyTimer = 0; dragging = null;
    if (!draft) return;
    draft = null;
    if (cur && !rig.on && !spin.on) setFrame(fit(cur));
    if (cur) { roll.w.snap(cur.w); roll.h.snap(cur.h); paintSlider(); }
    wake();
  }
  for (const axis of ["w", "h"]) {
    const { track, thumb } = SL[axis];
    const valueAt = x => { const r = track.getBoundingClientRect(); return DP_MIN + clamp((x - r.left) / r.width, 0, 1) * (DP_MAX - DP_MIN); };
    track.addEventListener("pointerdown", e => {
      if (e.button !== 0 || slOff() || !cur) return;
      e.preventDefault(); thumb.focus({ preventScroll: true, focusVisible: false });
      track.setPointerCapture(e.pointerId); dragging = axis;
      slide(axis, valueAt(e.clientX));
    });
    track.addEventListener("pointermove", e => { if (dragging === axis && track.hasPointerCapture(e.pointerId)) slide(axis, valueAt(e.clientX)); });
    const release = () => { if (dragging !== axis) return; dragging = null; commit(); };
    track.addEventListener("pointerup", release);
    track.addEventListener("lostpointercapture", release);
    thumb.addEventListener("keydown", e => {
      const step = stepOf(e), v = slValue(axis);
      const next = { ArrowRight: v + step, ArrowUp: v + step, ArrowLeft: v - step, ArrowDown: v - step, Home: DP_MIN, End: DP_MAX }[e.key];
      if (next === undefined || slOff() || !cur) return;
      e.preventDefault(); e.stopPropagation();
      slide(axis, next);
      clearTimeout(keyTimer); keyTimer = setTimeout(commit, SL_KEY_SETTLE);
    });
    thumb.addEventListener("focus", () => { slFocus = true; });
    thumb.addEventListener("blur", e => {
      if (e.relatedTarget === SL.w.thumb || e.relatedTarget === SL.h.thumb) return;
      if (keyTimer) commit();
      slFocus = false;
      if (cur) paintPick();
    });
  }
  PN.pick.addEventListener("pointerdown", () => { const el = document.activeElement; if (el === RL.w || el === RL.h) el.dataset.cancel = "1"; });
  function drawRuler(now) {
    const op = rulerOp.at(now);
    if (focusW && !tr && !queued && op > .99) { focusW = false; RL.w.focus(); }
    if (op < .01) { roll.w.snap(cur.w); roll.h.snap(cur.h); }
    RL.el.hidden = op < .01 && !editing;
    if (RL.el.hidden) return;
    RL.el.style.opacity = op;
    const { cx } = room(), g = Math.max(P.gap, (edgeOf(lookAt(now)) * V.s.at(now) + 6) * shellOp.at(now)), w = V.w.at(now), h = V.h.at(now), T = V.y.at(now);
    const L = cx - w / 2, R = cx + w / 2, B = T + h, M = (T + B) / 2, yr = T - g - 15, xr = L - g - 22, a = 4.5;
    for (const [axis, el] of [["w", RL.w], ["h", RL.h]]) {
      if (document.activeElement === el) continue;
      const v = String(Math.round(roll[axis].at(now)));
      if (RL.shown[axis] !== v) { el.value = v; RL.shown[axis] = v; }
    }
    const gw = clamp(RL.w.value.length * 7.2 + 16, 0, R - L - 4 * a) / 2, gh = clamp(30, 0, B - T - 4 * a) / 2;
    const f = v => v.toFixed(1);
    RL.ext.setAttribute("d", `M${f(L)} ${f(T - g)}V${f(yr - 5)}M${f(R)} ${f(T - g)}V${f(yr - 5)}M${f(L - g)} ${f(T)}H${f(xr - 5)}M${f(L - g)} ${f(B)}H${f(xr - 5)}`);
    RL.dim.setAttribute("d",
      `M${f(L)} ${f(yr)}H${f(cx - gw)}M${f(cx + gw)} ${f(yr)}H${f(R)}` +
      `M${f(L + a)} ${f(yr - a)}L${f(L)} ${f(yr)}L${f(L + a)} ${f(yr + a)}M${f(R - a)} ${f(yr - a)}L${f(R)} ${f(yr)}L${f(R - a)} ${f(yr + a)}` +
      `M${f(xr)} ${f(T)}V${f(M - gh)}M${f(xr)} ${f(M + gh)}V${f(B)}` +
      `M${f(xr - a)} ${f(T + a)}L${f(xr)} ${f(T)}L${f(xr + a)} ${f(T + a)}M${f(xr - a)} ${f(B - a)}L${f(xr)} ${f(B)}L${f(xr + a)} ${f(B - a)}`);
    RL.w.style.left = cx + "px"; RL.w.style.top = yr + "px";
    RL.h.style.left = xr + "px"; RL.h.style.top = M + "px";
  }

  let enabled = false, raf = 0, roomSize = "";
  function animate(ts) {
    raf = 0;
    if (!enabled || !cur) return;
    clock.t = ts;
    tick();
    const tweens = [outlineOp, creaseOp, rulerOp, shellOp, hingeOp, unitOp.a, unitOp.b, layer.old.blur, layer.old.veil, layer.old.op, layer.neu.op, layer.neu.blur, roll.w, roll.h];
    if (tr || queued || rig.on || spin.on || !atRest(ts) || ts < look.t0 + look.dur || tweens.some(v => !v.done(ts))) wake();
  }
  function wake() { if (enabled && !raf) raf = requestAnimationFrame(animate); }
  function request(sel) { return Promise.resolve(hooks.request(sel)); }
  // 칸은 위아래로 늘어선 한 묶음이다 — 방향키로 지나가는 것은 고르기만 한다(커서까지 옮기면 묶음에서 빠져나간다)
  PN.pick.addEventListener("keydown", e => {
    if (!ROWS.includes(e.target) || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation(); const i = ROWS.indexOf(e.target);
    const n = e.key === "Home" ? 0 : e.key === "End" ? ROWS.length - 1 : (i + (e.key === "ArrowUp" ? -1 : 1) + ROWS.length) % ROWS.length;
    ROWS[n].focus(); pick(ROWS[n].dataset.sel, true);
  });
  paintHinge();
  return {
    devices: new Set(Object.keys(DEVICES)),
    setOriginal(w,h,img) {
      Object.assign(ORIGINAL,{w,h,img});
      if (target?.sel === "original") Object.assign(target,{w,h});
      if (cur) paintPick();
      if (cur?.sel === "original") {
        Object.assign(cur,{w,h});
        if (tr?.kind !== "fade") setFrame(fit(cur), performance.now(), tr ? springOf(P.frameDur, P.frameBounce) : null);
        roll.w.to(w, 420, performance.now()); roll.h.to(h, 420, performance.now());
        wake();
      }
    },
    image(sel,img) {
      images.set(sel,img);
      wake();
      if (cur?.sel === sel) {
        cur.img = img;
        if (tr?.to.sel === sel) {
          tr.to.img = img; tr.arriveAt = performance.now();
          // 미리 그린 그림으로 이미 바꿨으면 같은 레이아웃의 새 그림으로 갈아 끼운다.
          if (tr.kind === "size" && tr.swapped) { if (layer.neu.r) layer.neu.r = img; else layer.old.r = img; }
        }
        else if (!tr) { layer.old.r = img; }
      }
    },
    update(st, instant = false) {
      target = st;
      // 보낸 크기가 돌아왔을 때만 놓는다 — 끄는 중 · 키 입력이 멈추기 전이거나 다른(늦은) 상태면 틀을 붙든다
      if (draft && !dragging && !keyTimer && Math.round(st.w) === draft.w && Math.round(st.h) === draft.h) draft = null;
      if (!cur || instant) snapTo(st.sel); else go(st.sel);
      if (instant) { clock.t = performance.now(); tick(); }
      if (enabled && !raf) raf = requestAnimationFrame(animate);
    },
    enable(on) {
      enabled = on; root.hidden = !on;
      if (on) addEventListener("pointerdown", outside, true);
      if (!on) { CTL.el.hidden = true; setOpen(false); setOrientationOpen(false); removeEventListener("pointerdown", outside, true); }
      if (!on) roomSize = "";
      if (!on) { cancelAnimationFrame(raf); raf=0; images.clear(); cur=null; tr=null; queued=null; dropDraft(); slFocus=false; }
      else if (!raf) raf=requestAnimationFrame(animate);
    },
    relayout() {
      const size = `${root.clientWidth}:${root.clientHeight}`;
      if (size === roomSize) return;
      roomSize = size;
      if (cur && !rig.on && !spin.on) setFrame(fit(cur), performance.now(), tr?.kind === "size" ? springOf(P.frameDur, P.frameBounce) : null);
      wake();
      if (cur) { clock.t = performance.now(); tick(); }
    },
    moving: () => !!tr || !!queued || rig.on || spin.on || !!draft,
    // 준비 중에는 슬라이더도 쉰다 — 칸 단추의 disabled 와 같은 자리에서 부른다
    sliderOff(on) {
      SL.el.classList.toggle("off", on);
      for (const axis of ["w", "h"]) { SL[axis].thumb.tabIndex = on ? -1 : 0; SL[axis].thumb.setAttribute("aria-disabled", on); }
      if (on) dropDraft();
    },
    clearImages() { images.clear(); },
    closeMenu() {
      if (orientationOpen()) { setOrientationOpen(false); return true; }
      if (!menuOpen()) return false;
      setOpen(false); return true;
    },
    // 고른 칸(sel)이 그릴 dp — 데몬 없이 장면을 띄우는 곳(Storybook)이 고른 것을 그대로 돌려줄 때 쓴다.
    sizeOf(sel) { const st = resolve(sel); return st && { w: st.w, h: st.h }; },
  };

}
