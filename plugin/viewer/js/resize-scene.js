import { reduced } from "./motion.js";
import { phrase } from "./strings.js";

export function createResizeScene(root, hooks) {
  // 시제품에서 확정한 기하와 곡선을 유지하고, 그림 도착은 실제 디코드가 알린다.
  const $ = id => root.querySelector(`#${id}`);
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  // 몸체가 드리우는 그림자 — 짙기는 매 프레임 바뀌고 색은 tokens.css 의 --device-shade 다.
  const shade = a => `color-mix(in srgb, var(--device-shade) ${(a * 100).toFixed(1)}%, transparent)`;
  const DEVICES = {
    s26: { name: "Galaxy S26", short: "S26", fold: false,
      open: { w: 360, h: 780 },
      look: { open: { tone: "var(--device-tone-s26)", bezel: 5, radius: 26, cam: { w: 9, h: 9, y: 12 }, btn: [[1, 175, 95], [1, 300, 50]] } } },
    pixel9: { name: "Pixel 9", short: "Pixel 9", fold: false,
      open: { w: 411.43, h: 923.43 },
      look: { open: { tone: "var(--device-tone-pixel9)", bezel: 6, radius: 34, cam: { w: 10, h: 10, y: 13 }, btn: [[1, 190, 50], [1, 270, 95]] } } },
    ip17: { name: "iPhone 17", short: "iPhone 17", fold: false,
      open: { w: 402, h: 874 },
      look: { open: { tone: "var(--device-tone-ip17)", bezel: 5, radius: 55, cam: { w: 124, h: 36, y: 11 }, btn: [[-1, 150, 32], [-1, 205, 60], [-1, 280, 60], [1, 235, 100]] } } },
    ipair: { name: "iPhone Air", short: "iPhone Air", fold: false,
      open: { w: 420, h: 912 },
      look: { open: { tone: "var(--device-tone-ipair)", bezel: 4, radius: 57, cam: { w: 124, h: 36, y: 11 }, btn: [[-1, 155, 32], [-1, 215, 62], [-1, 292, 62], [1, 245, 104]] } } },
    ip17pm: { name: "iPhone 17 Pro Max", short: "17 Pro Max", fold: false,
      open: { w: 440, h: 956 },
      look: { open: { tone: "var(--device-tone-ip17pm)", bezel: 5, radius: 60, cam: { w: 124, h: 36, y: 11 }, btn: [[-1, 160, 34], [-1, 225, 66], [-1, 305, 66], [1, 255, 110]] } } },
    pixelfold: { name: "Pixel 9 Pro Fold", short: "9 Pro Fold", fold: true,
      cover: { w: 443.08, h: 994.46 }, open: { w: 851.69, h: 882.87, hinge: 425.85 },
      look: { cover: { tone: "var(--device-tone-pixelfold)", bezel: 6, radius: 30, cam: { w: 10, h: 10, y: 13 }, btn: [[1, 200, 50], [1, 280, 95]] },
              open:  { tone: "var(--device-tone-pixelfold)", bezel: 7, radius: 24, cam: { w: 9, h: 9, y: 12, x: .92 }, btn: [[1, 200, 50], [1, 280, 95]] } } },
    tablet: { name: "Pixel Tablet", short: "Pixel Tablet", fold: false,
      open: { w: 1280, h: 800 },
      look: { open: { tone: "var(--device-tone-tablet)", bezel: 34, radius: 34, cam: { w: 0, h: 0, y: 10 }, btn: [[1, 120, 70]] } } },
    ipduo: { name: "iPhone Duo", short: "iPhone Duo", fold: true,
      cover: { w: 466, h: 678 }, open: { w: 890, h: 626, hinge: 445 },
      look: { cover: { tone: "var(--device-tone-ipduo)", bezel: 6, radius: 44, cam: { w: 96, h: 30, y: 10 }, btn: [[1, 200, 80], [1, 470, 46]] },
              open:  { tone: "var(--device-tone-ipduo)", bezel: 6, radius: 30, cam: { w: 10, h: 10, y: 11, x: .75 }, btn: [[1, 200, 80], [1, 470, 46]] } } },
    fold8: { name: "Galaxy Z Fold8", short: "Fold8", fold: true,
      cover: { w: 475.43, h: 751.24 }, open: { w: 932.57, h: 704, hinge: 466.29 },
      look: { cover: { tone: "var(--device-tone-fold8)", bezel: 6, radius: 10, cam: { w: 9, h: 9, y: 10 }, btn: [[1, 170, 80], [1, 270, 55]] },
              open:  { tone: "var(--device-tone-fold8)", bezel: 6, radius: 10, cam: { w: 0, h: 0, y: 10 }, btn: [[1, 170, 80], [1, 270, 55]] } } },
    ultra: { name: "Galaxy Z Fold8 Ultra", short: "Fold8 Ultra", fold: true,
      cover: { w: 360, h: 840 }, open: { w: 752, h: 834.67, hinge: 376 },
      look: { cover: { tone: "var(--device-tone-ultra)", bezel: 5, radius: 5, cam: { w: 8, h: 8, y: 10 }, btn: [[1, 190, 85], [1, 300, 55]] },
              open:  { tone: "var(--device-tone-ultra)", bezel: 5, radius: 5, cam: { w: 0, h: 0, y: 10 }, btn: [[1, 190, 85], [1, 300, 55]] } } },
  };
  for (const d of Object.values(DEVICES)) for (const lk of Object.values(d.look)) {
    const b = lk.btn.map(([side, at, len]) => ({ side, at, len }));
    while (b.length < 5) { const l = b[b.length - 1]; b.push({ side: l.side, at: l.at + l.len, len: 0 }); }
    lk.btn = b;
  }
  const P = { rotDur: .6, rotLift: .42, rotLand: .18, rotDip: .12, shellK: 1.6,
    frameDur: .45, frameBounce: 0, outlineBounce: 0, outlineLead: 0, veil: .06,
    foldDur: .6, foldLift: .42, foldLand: .18, perspective: 3200, shade: .22, sheen: .1, lift: 0,
    swapDur: 320, swapBlur: 8, swapNear: .15, spinSwapA: .35, spinSwapB: .65,
    holdBlur: 24, holdRise: 150, revealFade: 240, revealDur: 280, swapZoom: .03, moveBlur: 6, settleSharp: 220,
    reducedFade: 240, reducedDim: .62, gap: 7, crease: .35,
    hingeLine: true, duoDur: 1, duoBlur: 24, duoDark: .85 };
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
      const [dev, state, turn] = sel.split(":"), d = DEVICES[dev];
      if (!d || !d[state]) return null;
      const s = d[state], rot = turn === "rot";
      st = { sel, kind: "device", dev, folded: state === "cover", rot, name: d.name, short: d.short,
        w: rot ? s.h : s.w, h: rot ? s.w : s.h, hinge: s.hinge };
    }
    if (target?.sel === sel) { st.w = target.w; st.h = target.h; }
    st.img = images.get(sel) || cur?.img || ORIGINAL.img;
    return st;
  }
  const lined = st => st.kind === "preset" || st.kind === "custom";
  const shelled = st => st.kind === "device";
  const devSel = (st, folded, rot) => `${st.dev}:${folded ? "cover" : "open"}${rot ? ":rot" : ""}`;
  const isOpen = st => st.kind === "device" && DEVICES[st.dev].fold && !st.folded;
  const lookOf = st => DEVICES[st.dev].look[st.folded ? "cover" : "open"];
  const bezelOf = st => lookOf(st).bezel * P.shellK;
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
  // CAPSULE_ROOM — 아래 캡슐(바닥 20 + 높이 약 40)과 그 위 틈. 맞춤일 때 기기가 캡슐에 가리지 않게 이만큼만 비운다.
  const TOP = 14, RULER_TOP = 34, RULER_SIDE = 90, FRAME_TOP = TOP + RULER_TOP, CAPSULE_ROOM = 64;
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
  function fit(st) {
    const r = room(), pad = x => shelled(x) ? 2 * bezelOf(x) : 0, each = x => Math.min(r.maxW / (x.w + pad(x)), r.maxH / (x.h + pad(x)), 2);
    const s = Math.min(each(ORIGINAL), each(st)), h = st.h * s;
    return { s, w: st.w * s, h, cx: r.cx, y: r.top + pad(st) * s / 2 + Math.max(0, (r.maxH - h - pad(st) * s) / 2) };
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
  function lookAt(now) {
    const A = look.a, B = look.b;
    if (!B) return DEVICES.s26.look.open;
    const k = easeOut(clamp((now - look.t0) / look.dur, 0, 1)), m = (x, y) => lerp(x, y, k);
    return { tone: B.tone, bezel: m(A.bezel, B.bezel), radius: m(A.radius, B.radius),
      cam: { w: m(A.cam.w, B.cam.w), h: m(A.cam.h, B.cam.h), y: m(A.cam.y, B.cam.y), x: m(A.cam.x ?? .5, B.cam.x ?? .5) },
      btn: B.btn.map((b, i) => { const a = A.btn[i];
        return a.side === b.side ? { side: b.side, at: m(a.at, b.at), len: m(a.len, b.len) }
                                 : k < .5 ? { side: a.side, at: a.at, len: a.len * (1 - 2 * k) } : { side: b.side, at: b.at, len: b.len * (2 * k - 1) }; }) };
  }

  function camBox(W0, H0, rot, cam, s) {
    const cw = cam.w * s, ch = cam.h * s, cy = cam.y * s, cx = (cam.x ?? .5) * W0 * s;
    const b = rot ? { left: H0 * s - cy - ch, top: cx - cw / 2, width: ch, height: cw } : { left: cx - cw / 2, top: cy, width: cw, height: ch };
    return { ...b, r: Math.min(cw, ch) / 2, on: cw > .5 };
  }
  const putCam = (el, b, dx, dy, op) => Object.assign(el.style, { left: b.left + dx + "px", top: b.top + dy + "px", width: b.width + "px", height: b.height + "px", borderRadius: b.r + "px", opacity: b.on ? op : 0 });

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
    const folding = !reducedOn() && same && from.folded !== to.folded && from.rot === to.rot;
    const spinning = !reducedOn() && same && from.rot !== to.rot && from.folded === to.folded;
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
  const rigEl = $("rig"), q = (root, s) => root.querySelector(s);
  const RG = {
    lift: q(rigEl, ".lift"), plate: q(rigEl, ".plate"), crease: q(rigEl, ".crease"), tTop: q(rigEl, ".r-top"), tBot: q(rigEl, ".r-bot"),
    base: q(rigEl, ".base"), leaf: q(rigEl, ".leaf"),
  };
  const faceOf = el => ({ el, cam: q(el, ".cam"), old: q(el, ".old"), veil: q(el, ".veil"), neu: q(el, ".neu"), shade: q(el, ".shade"), sheen: q(el, ".sheen"), cast: q(el, ".cast") });
  RG.F = { inner: faceOf(q(RG.leaf, ".inner")), outer: faceOf(q(RG.leaf, ".outer")), base: faceOf(q(RG.base, ".clip")) };
  RG.edge = { leafRing: q(RG.leaf, ".ring"), leafBez: q(RG.leaf, ".bez"), baseRing: q(RG.base, ".ring"), baseBez: q(RG.base, ".bez") };

  function startFold(from, to, now, cached) {
    const d = DEVICES[to.dev], dir = to.folded ? "fold" : "unfold", ax = to.rot ? "y" : "x", H = d.open.hinge;
    const f0 = fit(from), f1 = fit(to);
    freeze(now);
    if (cached) { const o = layer.old; o.fill = false; o.blur.snap(0); o.veil.snap(0); }
    const restBlur = layer.old.blur.at(now);
    const openU = f => ax === "x" ? f.cx - d.open.w * f.s / 2 + H * f.s : f.y + H * f.s;
    const coverU = f => ax === "x" ? f.cx - d.cover.w * f.s / 2 : f.y;
    const frame = { w: to.w, h: to.h };
    Object.assign(rig, {
      on: true, t0: now, dur: d === DEVICES.ipduo ? P.duoDur : P.foldDur, dir, d, ax, restBlur, oldSpec: layer.old.r, from, to, f0, f1, cached,
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
    return { t, th, p: e, s: lerp(rig.s0, rig.s1, e), hx: lerp(rig.hx0, rig.hx1, e), top: lerp(rig.f0.y, rig.f1.y, e), settled: t >= T };
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
    Object.assign(spin, { on: true, t0: now, dur: P.rotDur, from, to, f0: fit(from), f1: fit(to), dir: to.rot ? 1 : -1, cached });
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

  function paintFace(f, plan, s, now) {
    const o = layer.old, n = layer.neu, spec = rig.oldSpec;
    const [x, y] = rig.ax === "x" ? [-plan.du * s, 0] : [0, -plan.du * s];
    if (plan.role === "crisp") {
      place(f.old, spec, x, spec.dpW * s, spec.dpH * s, 1, rig.restBlur, y);
      f.veil.style.opacity = 0;
    } else if (rig.cached) {
      const ts = rig.to.img;
      place(f.old, ts, x, ts.dpW * s, ts.dpH * s, 1, 0, y);
      f.veil.style.opacity = 0;
      f.neu.style.opacity = 0;
      f.el.style.background = ts.edge;
      return;
    } else {
      const hs = holdSize(spec, plan.frame, o.fill);
      place(f.old, spec, x, hs.w * s, hs.h * s, 1, o.blur.at(now), y);
      f.veil.style.opacity = o.veil.at(now);
    }
    if (plan.neu && n.r) place(f.neu, n.r, x, n.r.dpW * s, n.r.dpH * s, n.op.at(now), n.blur.at(now), y);
    else f.neu.style.opacity = 0;
    f.el.style.background = (n.r && n.op.at(now) > .5 && plan.neu ? n.r : spec).edge;
  }

  function drawRig(now) {
    const { th, s, hx: hu, top: T0 } = rigAt(now), X = rig.ax === "x", { cx } = room();
    const k = th / 180, rad = th * Math.PI / 180, sn = Math.sin(rad), cs = Math.cos(rad);
    const lk = lookAt(now), r = lk.radius * s, t = lk.bezel * P.shellK * s;
    RG.edge.leafBez.style.borderColor = RG.edge.baseBez.style.borderColor = lk.tone;
    const Lu = lerp(rig.half.u, rig.cover.u, k) * s, Lv = lerp(rig.half.v, rig.cover.v, k) * s;
    // 커버가 펼친 반쪽보다 좁으면(Fold8 Ultra) 바닥 반쪽도 커버 폭으로 줄어야 다 접힌 순간 커버 밖으로 비어져 나오지 않는다.
    // 장이 바닥을 덮기 시작한 뒤(90° 너머)에만 줄인다 — 드러난 바닥의 가장자리가 접는 동안 미끄러지지 않게
    const Bu = lerp(rig.half.u, Math.min(rig.half.u, rig.cover.u), smooth(90, 180, th)) * s, Bv = Lv;
    const v0 = dv => X ? T0 : cx - dv / 2;
    const box = (u0, du, dv) => X ? { left: u0 + "px", top: v0(dv) + "px", width: du + "px", height: dv + "px" }
                                  : { left: v0(dv) + "px", top: u0 + "px", width: dv + "px", height: du + "px" };
    const sides = (us, ue, vs, ve) => X ? { l: us, r: ue, t: vs, b: ve } : { t: us, b: ue, l: vs, r: ve };
    const corners = (a, b) => X ? [a, b, b, a] : [a, a, b, b];
    const pivot = X ? `${hu}px ${T0 + Bv / 2}px` : `${cx}px ${hu}px`;
    RG.lift.style.perspective = P.perspective + "px";
    RG.lift.style.perspectiveOrigin = pivot;
    RG.lift.style.transformOrigin = pivot;
    RG.lift.style.transform = `scale(${1 + P.lift * sn})`;
    const tip = hu - Lu * cs, p0 = Math.min(hu, tip), p1 = Math.max(hu + Bu, tip);
    const pb = box(p0, p1 - p0, Bv);
    Object.assign(RG.plate.style, pb, { margin: -t + "px", width: parseFloat(pb.width) + 2 * t + "px", height: parseFloat(pb.height) + 2 * t + "px", borderRadius: r + t + "px",
      boxShadow: `var(--elevation-2), 0 ${10 + 18 * sn}px ${30 + 34 * sn}px ${shade(.05 * sn)}` });
    Object.assign(RG.base.style, box(hu, Bu, Bv));
    const hk = smooth(20, 160, th);
    q(RG.base, ".clip").style.borderRadius = corners(r * hk, r).map(v => v + "px").join(" ");
    paintFace(RG.F.base, rig.plan.base, s, now);
    const cast = P.shade * (.85 * smooth(90, 180, th) + .25 * sn);
    RG.F.base.cast.style.background = `linear-gradient(${X ? 90 : 180}deg, ${shade(cast)}, ${shade(cast * .35)} 45%, ${shade(0)} 90%)`;
    edge(RG.edge.baseRing, sides(-1.5 * hk, -1.5, -1.5, -1.5), sides(1.5 * hk, 1.5, 1.5, 1.5), corners((r + 1.5) * hk, r + 1.5), 1);
    edge(RG.edge.baseBez, sides(-t * hk, -t, -t, -t), sides(t * hk, t, t, t), corners((r + t) * hk, r + t), 1);
    Object.assign(RG.leaf.style, box(hu - Lu, Lu, Lv), { transformOrigin: X ? "100% 50%" : "50% 100%", transform: X ? `rotateY(${th.toFixed(3)}deg)` : `rotateX(${(-th).toFixed(3)}deg)` });
    const rk = r * hk;
    RG.F.inner.el.style.borderRadius = corners(r, rk).map(v => v + "px").join(" ");
    RG.F.outer.el.style.borderRadius = corners(rk, r).map(v => v + "px").join(" ");
    RG.F.outer.el.style.transform = X ? "rotateY(180deg)" : "rotateX(180deg)";
    paintFace(RG.F.inner, rig.plan.inner, s, now);
    paintFace(RG.F.outer, rig.plan.outer, s, now);
    const dv = rig.d, rot = !!rig.to.rot, oc = camBox(dv.open.w, dv.open.h, rot, dv.look.open.cam, s), sh = dv.open.hinge * s;
    putCam(RG.F.outer.cam, camBox(dv.cover.w, dv.cover.h, rot, dv.look.cover.cam, s), 0, 0, 1);
    putCam(RG.F.inner.cam, oc, 0, 0, 1);
    putCam(RG.F.base.cam, oc, X ? -sh : 0, X ? 0 : -sh, 1);
    RG.F.inner.shade.style.opacity = th < 90 ? (P.shade * (1 - cs)).toFixed(3) : 1;
    RG.F.outer.shade.style.opacity = th > 90 ? (P.shade * (1 + cs)).toFixed(3) : 1;
    for (const f of [RG.F.inner, RG.F.outer]) {
      f.sheen.style.opacity = X ? (P.sheen * sn).toFixed(3) : 0;
      f.sheen.style.transform = `translateX(${lerp(-28, 28, k)}%)`;
    }
    edge(RG.edge.leafRing, sides(-1.5, -1.5 * hk, -1.5, -1.5), sides(1.5, 1.5 * hk, 1.5, 1.5), corners(r + 1.5, (r + 1.5) * hk), 1);
    edge(RG.edge.leafBez, sides(-t, -t * hk, -t, -t), sides(t, t * hk, t, t), corners(r + t, (r + t) * hk), 1);
    const ck = P.crease * clamp(1 - th / 24, 0, 1), tk = clamp(1 - th / 24, 0, 1);
    RG.crease.classList.toggle("h", !X);
    Object.assign(RG.crease.style, X ? { left: hu + "px", top: T0 + "px", width: "", height: Bv + "px", opacity: ck * hingeOp.at(now) }
                                     : { left: cx - Bv / 2 + "px", top: hu + "px", width: Bv + "px", height: "", opacity: ck * hingeOp.at(now) });
    if (X) {
      Object.assign(RG.tTop.style, { left: hu + "px", top: T0 - t + "px", width: "1px", height: t + "px", opacity: tk });
      Object.assign(RG.tBot.style, { left: hu + "px", top: T0 + Bv + "px", width: "1px", height: t + "px", opacity: tk });
    } else {
      Object.assign(RG.tTop.style, { left: cx - Bv / 2 - t + "px", top: hu + "px", width: t + "px", height: "1px", opacity: tk });
      Object.assign(RG.tBot.style, { left: cx + Bv / 2 + "px", top: hu + "px", width: t + "px", height: "1px", opacity: tk });
    }
  }
  function edge(el, inset, width, radius, op) {
    Object.assign(el.style, {
      left: inset.l + "px", top: inset.t + "px", right: inset.r + "px", bottom: inset.b + "px",
      borderWidth: `${width.t}px ${width.r}px ${width.b}px ${width.l}px`,
      borderRadius: radius.map(v => v.toFixed(2) + "px").join(" "), opacity: op,
    });
  }

  const DU = { el: $("duo"), base: q($("duo"), ".duo-base"), band: q($("duo"), ".duo-band"), scr: q($("duo"), ".duo-scr"),
    flap: q($("duo"), ".duo-flap"), face: q($("duo"), ".duo-face"), dark: q($("duo"), ".duo-dark"), edge: q($("duo"), ".duo-edge .body"), ring: q($("duo"), ".duo-edge .ring") };
  // radii[i] = [앞 변 쪽 반경, 뒤 변 쪽 반경] — 눌린 장의 둥근 모서리는 두 변에서 다르게 줄어 타원이 된다.
  function roundPath(pts, radii, open) {
    const n = pts.length, f = v => v.toFixed(2), at = (a, b, r) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, k = Math.min(r, l / 2) / l; return [a[0] + dx * k, a[1] + dy * k]; };
    let d = "";
    pts.forEach((c, i) => { const pv = pts[(i + n - 1) % n], nx = pts[(i + 1) % n], a = at(c, pv, radii[i][0]), b = at(c, nx, radii[i][1]);
      // 3차 곡선(K=0.5523)이 원호에 붙는다 — 2차 곡선은 모서리가 약 2px 덜 둥글어 멈춘 틀(border-radius)과 어긋났다.
      const K = .5523, p1 = [a[0] + (c[0] - a[0]) * K, a[1] + (c[1] - a[1]) * K], p2 = [b[0] + (c[0] - b[0]) * K, b[1] + (c[1] - b[1]) * K];
      d += `${i ? "L" : "M"}${f(a[0])} ${f(a[1])}C${f(p1[0])} ${f(p1[1])} ${f(p2[0])} ${f(p2[1])} ${f(b[0])} ${f(b[1])}`; });
    return open ? d : d + "Z";
  }
  DU.baseImg = q(DU.scr, "img"); DU.baseCam = q(DU.scr, ".cam"); DU.btns = [...$("duo").querySelectorAll(".btn")];
  DU.hinge = q($("duo"), ".duo-edge .hinge"); DU.ringH = q($("duo"), ".duo-edge .hr");
  DU.outl = q($("duo"), ".duo-edge .outl"); DU.sheen = q($("duo"), ".duo-edge .sheen"); DU.grad = q($("duo"), "#duoSheen");
  DU.houtl = q($("duo"), ".duo-edge .houtl"); DU.hsheen = q($("duo"), ".duo-edge .hsheen"); DU.rim = q($("duo"), ".duo-edge .rim"); DU.rimhi = q($("duo"), ".duo-edge .rimhi");
  // CSS linear-gradient(150deg)을 그 상자에 깐 것과 같은 끝점.
  function sheenOn(x, y, w, h) {
    const a = 150 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), L = Math.abs(w * dx) + Math.abs(h * dy), cx = x + w / 2, cy = y + h / 2;
    for (const [k, v] of [["x1", cx - dx * L / 2], ["y1", cy - dy * L / 2], ["x2", cx + dx * L / 2], ["y2", cy + dy * L / 2]]) DU.grad.setAttribute(k, v.toFixed(2));
  }
  DU.layers = Array.from({ length: 5 }, () => { const l = document.createElement("div"); l.className = "duo-ly"; l.innerHTML = '<img class="ly" alt=""><div class="cam"></div>'; DU.face.append(l); return { el: l, img: q(l, "img"), cam: q(l, ".cam") }; });
  function duoSrc(which) {
    const open = rig.dir === "fold" ? rig.from : rig.to, cover = rig.dir === "fold" ? rig.to : rig.from;
    const st = which === "cover" ? cover : open, arriving = st === rig.to;
    if (!arriving || rig.cached) return { spec: st.img, blur: 0, size: { w: st.img.dpW, h: st.img.dpH } };
    return { spec: rig.oldSpec, blur: layer.old.blur.at(clock.t), size: holdSize(rig.oldSpec, st, layer.old.fill) };
  }
  function drawDuo(now) {
    const { th, s, hx: hu, top: T0 } = rigAt(now), X = rig.ax === "x", { cx } = room(), d = rig.d, lk = lookAt(now);
    const k = th / 180, rad = th * Math.PI / 180, sn = Math.sin(rad), cs = Math.cos(rad), E = P.perspective, t = lk.bezel * P.shellK * s;
    const Lu = lerp(rig.half.u, rig.cover.u, k) * s, Lv = lerp(rig.half.v, rig.cover.v, k) * s, Bu = rig.half.u * s, Bv = Lv, H = d.open.hinge * s;
    const vc = dv => X ? T0 + dv / 2 : cx;
    const pt = (u, v) => X ? [u, v] : [v, u];
    // 반경은 면마다 고정한다 — 기기 모양 모프(펼침 30 → 커버 44)를 따르면 접는 도중 두 장의 모서리가 커진다.
    // 힌지 쪽 모서리는 두 장이 겹치는 자리라 같은 반경을 쓴다 — 60~120°에 펼침에서 커버 반경으로 옮겨, 다 접혔을 때 아래 장이 비어져 나오지 않는다.
    const r = d.look.open.radius * s, hk = smooth(20, 160, th), rh = lerp(r, d.look.cover.radius * s, smooth(60, 120, th)) * hk;
    const b0 = vc(Bv) - Bv / 2, [bl, bt] = pt(hu, b0), [bw, bh] = X ? [Bu, Bv] : [Bv, Bu];
    Object.assign(DU.base.style, { left: bl + "px", top: bt + "px", width: bw + "px", height: bh + "px", borderRadius: (X ? `${rh}px ${r}px ${r}px ${rh}px` : `${rh}px ${rh}px ${r}px ${r}px`) });
    DU.scr.style.borderRadius = DU.base.style.borderRadius;
    const A = "var(--live)";
    DU.scr.style.boxShadow = X ? `1.5px 0 0 0 ${A}, 0 1.5px 0 0 ${A}, 0 -1.5px 0 0 ${A}` : `0 1.5px 0 0 ${A}, 1.5px 0 0 0 ${A}, -1.5px 0 0 0 ${A}`;
    const bs = duoSrc("open");
    place(DU.baseImg, bs.spec, X ? -H : 0, bs.size.w * s, bs.size.h * s, 1, bs.blur, X ? 0 : -H);
    DU.scr.style.background = bs.spec.edge;
    putCam(DU.baseCam, camBox(d.open.w, d.open.h, !!rig.to.rot, d.look.open.cam, s), X ? -H : 0, X ? 0 : -H, 1);
    const th2 = t * hk, R = r + t, Rh = rh + th2;
    Object.assign(DU.band.style, { left: (X ? -th2 : -t) + "px", top: (X ? -t : -th2) + "px", right: -t + "px", bottom: -t + "px", borderColor: lk.tone,
      borderWidth: X ? `${t}px ${t}px ${t}px ${th2}px` : `${th2}px ${t}px ${t}px ${t}px`,
      borderRadius: X ? `${Rh}px ${R}px ${R}px ${Rh}px` : `${Rh}px ${Rh}px ${R}px ${R}px` });
    const kF = E / Math.max(1, E - Lu * sn), uF = hu - Lu * cs * kF, vf = vc(Lv), hF = Lv / 2 * kF, sq = Math.abs(uF - hu) / Math.max(1, Lu);
    const quad = [pt(hu, vf - Lv / 2), pt(uF, vf - hF), pt(uF, vf + hF), pt(hu, vf + Lv / 2)];
    // 옆 단추는 몸체의 바깥 끝에 붙는다 — 접힌 장이 펼친 장보다 넓어지면(커버 466 > 반쪽 445dp) 그 끝을 따라간다.
    const outU = Math.max(hu + Bu, uF);
    lk.btn.forEach((b, i) => { const e = DU.btns[i]; if (!e) return; const a = b.at * s, ln = b.len * s;
      Object.assign(e.style, X ? { left: outU + t - .5 + "px", top: b0 + a + "px", width: "3px", height: ln + "px" }
                               : { left: b0 + Bv - a - ln + "px", top: outU + t - .5 + "px", width: ln + "px", height: "3px" },
        { backgroundColor: lk.tone, opacity: ln > .5 && b.side > 0 ? 1 : 0 }); });
    // 빛은 멈춘 몸체처럼 기기 전체 상자에 깐다 — 90°까지는 펼친 기기, 넘으면 접힌 장의 상자.
    const box = (u0, u1, v0, v1) => X ? [u0, v0, u1 - u0, v1 - v0] : [v0, u0, v1 - v0, u1 - u0];
    const vh = Math.max(Lv / 2, hF), openBox = box(hu - Bu - t, hu + Bu + t, b0 - t, b0 + Bv + t);
    sheenOn(...(th <= 90 ? openBox : box(hu - t, Math.max(hu, uF) + t, vf - vh - t, vf + vh + t)));
    const bandX = X ? bl - th2 : bl - t, bandY = X ? bt - t : bt - th2;
    Object.assign(DU.band.style, { backgroundColor: lk.tone, borderColor: "transparent", backgroundSize: `${openBox[2]}px ${openBox[3]}px`, backgroundPosition: `${openBox[0] - bandX}px ${openBox[1] - bandY}px` });
    // 변 순서는 힌지 위 → 먼 위 → 먼 아래 → 힌지 아래. 접히는 방향(u)은 내용과 같은 sq로, 힌지와 나란한 방향(v)은 그 변의 원근 배율로 준다.
    // 접히는 장은 90°까지 안쪽(펼친 화면), 넘으면 바깥(커버) 면이다. 바뀌는 순간은 장이 옆으로 서 보이지 않는다.
    const rf = (th > 90 ? d.look.cover.radius : d.look.open.radius) * s, rhf = rh;
    const rad4 = [[rhf, rhf * sq], [rf * sq, rf * kF], [rf * kF, rf * sq], [rhf * sq, rhf]], path = roundPath(quad, rad4);
    DU.flap.style.clipPath = `path("${path}")`;
    const side = roundPath(quad, rad4, true), hseg = (() => { const a = quad[3], b = quad[0], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, k = Math.min(rhf, l / 2) / l, f = v => v.toFixed(1);
      return `M${f(a[0] + (b[0] - a[0]) * k)} ${f(a[1] + (b[1] - a[1]) * k)}L${f(b[0] - (b[0] - a[0]) * k)} ${f(b[1] - (b[1] - a[1]) * k)}`; })(), hz = smooth(110, 178, th);
    for (const el of [DU.edge, DU.ring, DU.outl, DU.sheen, DU.rim, DU.rimhi]) el.setAttribute("d", side);
    for (const el of [DU.houtl, DU.hsheen]) el.setAttribute("d", hseg);
    // 멈춘 몸체(.shell)의 겹 — 바깥 .5px 어두운 선, 바깥 1px 밝은 테, 150° 빛. 띠 가운데 선 위에 그려 바깥 절반만 보인다.
    const px = v => Math.max(0, v).toFixed(2) + "px";
    DU.outl.style.strokeWidth = px(2 * t + 1); DU.sheen.style.strokeWidth = px(2 * t);
    Object.assign(DU.rim.style, { stroke: lk.tone, strokeWidth: px(2 * t) }); DU.rimhi.style.strokeWidth = px(2 * t);
    Object.assign(DU.houtl.style, { strokeWidth: px(2 * t * hz + 1), opacity: hz }); Object.assign(DU.hsheen.style, { strokeWidth: px(2 * t * hz), opacity: hz > .01 ? 1 : 0 }); DU.hinge.setAttribute("d", hseg); DU.ringH.setAttribute("d", hseg);
    Object.assign(DU.edge.style, { stroke: lk.tone, strokeWidth: px(2 * t - 2) });
    Object.assign(DU.hinge.style, { stroke: lk.tone, strokeWidth: (2 * t * hz).toFixed(2) + "px", opacity: hz > .01 ? 1 : 0 });
    DU.ringH.style.opacity = hz;
    DU.edge.parentNode.style.opacity = Math.abs(uF - hu) > 1 ? 1 : 0;
    const back = th > 90;
    const src = back ? duoSrc("cover") : duoSrc("open");
    const u0 = back ? hu : hu - Lu;
    const [fl, ft] = pt(u0, vf - Lv / 2), [fw, fh] = X ? [Lu, Lv] : [Lv, Lu];
    const origin = X ? (back ? "0 50%" : "100% 50%") : (back ? "50% 0" : "50% 100%");
    const squash = X ? `scaleX(${sq.toFixed(4)})` : `scaleY(${sq.toFixed(4)})`;
    Object.assign(DU.face.style, { left: fl + "px", top: ft + "px", width: fw + "px", height: fh + "px", transformOrigin: origin, transform: squash, background: src.spec.edge });
    Object.assign(DU.dark.style, { left: fl + "px", top: ft + "px", width: fw + "px", height: fh + "px", transformOrigin: origin, transform: squash });
    const dir = X ? (back ? "to right" : "to left") : (back ? "to bottom" : "to top");
    const lift = sn, camB = back ? camBox(d.cover.w, d.cover.h, !!rig.to.rot, d.look.cover.cam, s) : camBox(d.open.w, d.open.h, !!rig.to.rot, d.look.open.cam, s);
    DU.layers.forEach((L, i) => {
      const bl2 = i === 0 ? 0 : P.duoBlur * lift * Math.pow(i / 4, 1.35);
      place(L.img, src.spec, 0, src.size.w * s, src.size.h * s, 1, Math.max(bl2, src.blur));
      putCam(L.cam, camB, 0, 0, 1);
      L.el.style.webkitMaskImage = L.el.style.maskImage = i === 0 ? "none" : `linear-gradient(${dir}, transparent ${((i - .5) / 4 * 100).toFixed(1)}%, var(--device-shade) ${(i / 4 * 100).toFixed(1)}%)`;
      L.el.style.opacity = i === 0 || bl2 > .2 ? 1 : 0;
    });
    const stops = [0, .2, .4, .6, .8, 1].map(dd => `${shade(Math.min(1, 2 * lift * Math.pow(Math.max(0, (dd - .2) / .8), 1.35)) * P.duoDark)} ${dd * 100}%`);
    DU.dark.style.background = `linear-gradient(${dir}, ${stops.join(", ")})`;
  }

  const unitOf = el => ({ el, shell: q(el, ".shell"), btns: [...el.querySelectorAll(".btn")], cam: q(el, ".cam"), outline: q(el, ".outline"), stage: q(el, ".stage"), l0: q(el, ".l0"), l1: q(el, ".l1"), veil: q(el, ".veil"), crease: q(el, ".crease"), tTop: q(el, ".t-top"), tBot: q(el, ".t-bot") });
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
    const t = lk.bezel * P.shellK * s, L = cx - rect.w / 2;
    Object.assign(U.shell.style, { left: L - t + "px", top: y - t + "px", width: rect.w + 2 * t + "px", height: rect.h + 2 * t + "px", borderRadius: sr + t + "px",
      backgroundColor: lk.tone, opacity: ol.shell });
    const H0 = (ol.rot ? rect.w : rect.h) / s, bw = 3;
    lk.btn.forEach((b, i) => {
      const e = U.btns[i], a = b.at * s, ln = b.len * s;
      Object.assign(e.style, ol.rot
        ? { left: L + (H0 * s - a - ln) + "px", top: (b.side < 0 ? y - t - bw + .5 : y + rect.h + t - .5) + "px", width: ln + "px", height: bw + "px" }
        : { left: (b.side < 0 ? L - t - bw + .5 : L + rect.w + t - .5) + "px", top: y + a + "px", width: bw + "px", height: ln + "px" },
        { backgroundColor: lk.tone, opacity: ln > .5 ? ol.shell : 0 });
    });
    putCam(U.cam, camBox((ol.rot ? rect.h : rect.w) / s, H0, ol.rot, lk.cam, s), 0, 0, ol.shell);
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
      const duo = rig.d === DEVICES.ipduo;
      UA.el.hidden = true; UB.el.hidden = true; rigEl.hidden = duo; DU.el.hidden = !duo;
      duo ? drawDuo(now) : drawRig(now);
      return;
    }
    rigEl.hidden = true; DU.el.hidden = true; UA.el.hidden = false;
    const s = V.s.at(now), ua = spin.on ? spin.from : cur;
    if (spin.on) {
      const { p } = spinAt(now), { f0, f1 } = spin, c0y = f0.y + f0.h / 2, c1y = f1.y + f1.h / 2;
      UA.el.style.transformOrigin = `${f0.cx}px ${c0y}px`;
      UA.el.style.transform = `translate(${((f1.cx - f0.cx) * p).toFixed(2)}px, ${((c1y - c0y) * p).toFixed(2)}px) rotate(${(spin.dir * 90 * p).toFixed(3)}deg) scale(${(lerp(1, f1.s / f0.s, p) * (1 - P.rotDip * Math.sin(Math.PI * p))).toFixed(4)})`;
    }
    drawUnit(UA, { w: V.w.at(now), h: V.h.at(now), y: V.y.at(now) }, { w: O.w.at(now), h: O.h.at(now), op: outlineOp.at(now), crease: creaseOp.at(now), shell: shellOp.at(now), rot: !!ua.rot, look: lookAt(now) }, s, layer, now, unitOp.a.at(now), spin.on);
    if (fadeB) {
      UB.el.hidden = false;
      const f = fadeB.f, g = P.gap, st = fadeB.st;
      drawUnit(UB, { w: f.w, h: f.h, y: f.y }, { w: f.w + 2 * g, h: f.h + 2 * g, op: lined(st) ? 1 : 0, crease: isOpen(st) ? P.crease : 0, shell: shelled(st) ? 1 : 0, rot: !!st.rot, look: shelled(st) ? lookOf(st) : lookAt(now) }, f.s, fadeB.layers, now, unitOp.b.at(now));
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
    hooks.layout({ w: V.w.at(now), h: V.h.at(now), s: V.s.at(now), y: V.y.at(now), cx: room().cx, radius: lookAt(now).radius * V.s.at(now) * shellOp.at(now) }, !!tr || !!queued || rig.on || spin.on || !!draft);
  }
  const roll = { w: new Tw(411), h: new Tw(891) };
  const byId = id => document.getElementById(id);   // 패널은 장면 밖(본문 오른쪽)에 선다 — $ 는 장면 안만 찾는다
  const PN = { el: byId("panel"), pick: byId("pnPick") };
  const CTL = { el: byId("devCtl"), fold: byId("dcFold"), rot: byId("dcRot"), hinge: byId("dcHinge") };
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
      cam = lk.cam.w > lk.cam.h * 3
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
      byId("dcFoldLb").textContent = st.folded ? phrase("posture.unfold") : phrase("posture.fold");
      // 이름은 누르면 될 모양으로 정한다 — 원래 가로인 화면(Pixel Tablet · 펼친 Fold8)은 돌리지 않은 채로 넓다
      const turn = st.w > st.h ? phrase("posture.upright") : phrase("posture.rotate");
      byId("dcRotLb").textContent = turn;
      CTL.fold.title = (st.folded ? phrase("posture.unfold") : phrase("posture.fold")) + " ";
      CTL.fold.setAttribute("aria-label", st.folded ? phrase("posture.unfold") : phrase("posture.fold"));
      CTL.rot.title = turn + " ";
      CTL.rot.setAttribute("aria-label", turn);
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
    SL.el.hidden = !custom;
    paintSlider();
  }
  PN.pick.addEventListener("click", e => { const b = e.target.closest("[data-sel]"); if (b) pick(b.dataset.sel); });
  CTL.fold.addEventListener("click", () => toggleFold());
  CTL.rot.addEventListener("click", () => toggleTurn());
  CTL.hinge.addEventListener("click", () => toggleHinge());
  function paintHinge() { CTL.hinge.setAttribute("aria-pressed", P.hingeLine); CTL.hinge.title = (P.hingeLine ? phrase("posture.hinge.hide") : phrase("posture.hinge.show")) + " "; }
  function toggleHinge() {
    if (cur.kind !== "device" || !DEVICES[cur.dev].fold) return;
    P.hingeLine = !P.hingeLine; paintHinge();
    hingeOp.to(P.hingeLine ? 1 : 0, 200, performance.now());
    wake();
  }
  function toggleFold() { if (cur.kind === "device" && DEVICES[cur.dev].fold) request(devSel(cur, !cur.folded, cur.rot)); }
  function toggleTurn() { if (cur.kind === "device") request(devSel(cur, cur.folded, !cur.rot)); }

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
  function toCustom() {
    if (editing) return;   // 누름(pointerdown)과 초점(focus)이 함께 와도 한 번만 보낸다
    if (cur.kind !== "custom") request(`custom:${clamp(Math.round(cur.w), DP_MIN, DP_MAX)}x${clamp(Math.round(cur.h), DP_MIN, DP_MAX)}`);
    editing = true; paintPick();
  }
  for (const [axis, el] of [["w", RL.w], ["h", RL.h]]) {
    // 프리셋 · @Preview 는 초점만으로 커스텀이 된다. 기기는 누르거나 고칠 때만 — Tab 으로 지나가며 기기 몸체 · 자세를 잃지 않게
    el.addEventListener("focus", () => { el.select(); if (cur.kind !== "device") toCustom(); });
    el.addEventListener("pointerdown", toCustom);
    el.addEventListener("input", toCustom);
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
    const { cx } = room(), g = Math.max(P.gap, (lookAt(now).bezel * P.shellK * V.s.at(now) + 6) * shellOp.at(now)), w = V.w.at(now), h = V.h.at(now), T = V.y.at(now);
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
      if (!on) CTL.el.hidden = true;
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
  };

}
