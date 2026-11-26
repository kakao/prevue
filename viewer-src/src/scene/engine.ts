import { DEVICES } from "../runtime/devices";
import { phrase } from "../runtime/strings";
import { BELOW_H, CAPSULE_ROOM, FRAME_TOP, LANE_H, LANE_W, NARROW, P, PLATE_EDGE, RIGHT_NEED, RULER_RAIL, RULER_SIDE, Val, WIDE, bezier, camBox, camsLook, clamp, cutEdgesOf, easeOut, edgeOf, endsOf, isOpen, layersOf, lerp, lined, padsOf, plateOf, reducedOn, rigCrease, shelled, smooth, springOf, swapAt, swapBlurAt, tallOf, turnOf, turnR } from "./calc";
import { paintBar } from "./dock";
import { draw, drawRig, drawRuler, paintShades } from "./draw";
import type { Scene } from "./state";
import type { Body, Dev, FoldDevice, Frame, Radii, SceneImage, Side, SizeTr, Spring, St } from "./types";

export function resolve(S: Scene, sel: string): St | null {
  let st: St;
  if (sel === "original") st = { ...S.ORIGINAL };
  else if (S.PRESETS.some(p => p.sel === sel)) st = { ...S.PRESETS.find(p => p.sel === sel)!, kind: "preset", img: null };
  else if (/^custom:\d+x\d+$/.test(sel)) { const [w,h] = sel.slice(7).split("x").map(Number); st = { sel, kind: "custom", name: phrase("size.custom"), w, h, img: null }; }
  else {
    const [dev, state, ...turns] = sel.split(":"), d = DEVICES[dev];
    const s = state === "open" || state === "cover" ? d?.[state] : undefined;
    if (!d || !s) return null;
    const rot = turns.includes("rot"), right = turns.includes("right");
    if (s.fixed && (rot || right)) return null;
    st = { sel, kind: "device", dev, folded: state === "cover", rot, right, ...turnOf(s, rot, right), name: d.name, short: d.short,
      w: rot ? s.h : s.w, h: rot ? s.w : s.h, hinge: s.hinge, img: null };
  }
  if (S.target?.sel === sel) { st.w = S.target.w; st.h = S.target.h; }
  st.img = S.images.get(sel) || S.cur?.img || S.ORIGINAL.img;
  return st;
}
const foldEase = (S: Scene) => {
  const k = `${P.foldLift},${P.foldLand}`;
  if (k !== S.foldEaseKey) { S.foldEaseKey = k; S.foldEaseFn = bezier(P.foldLift, 0, P.foldLand, 1); }
  return S.foldEaseFn!;
};
export function room(S: Scene, st?: St) {
  const W = S.root.clientWidth, k = clamp((W - NARROW) / (WIDE - NARROW), 0, 1);
  const side = Math.max(lerp(P.gap + RULER_RAIL + Math.ceil(S.badge.w / 2) + PLATE_EDGE, RULER_SIDE, k), st && shelled(st) && S.hooks.insetOn?.() ? RIGHT_NEED : 0);
  return { W, side, cx: W / 2, top: FRAME_TOP, maxW: Math.max(60, W - 2 * side), maxH: Math.max(60, S.root.clientHeight - FRAME_TOP - CAPSULE_ROOM) };
}
const belowOf = (S: Scene, st: St) => shelled(st) && S.hooks.insetOn?.() && S.hooks.insetBelow?.() ? BELOW_H : 0;
const cutLaneOf = (S: Scene, st: St, side: number) => {
  if (!shelled(st) || !S.hooks.insetOn?.()) return { w: 0, h: 0 };
  const edges = cutEdgesOf(st);
  return { w: edges.includes("w") ? Math.max(0, LANE_W - side) : 0, h: edges.includes("h") ? LANE_H : 0 };
};
export function fit(S: Scene, st: St): Frame {
  const r = room(S, st), lane = cutLaneOf(S, st, r.side), each = (x: St, maxW: number, maxH: number) => { const [pw, ph] = padsOf(x); return Math.min(maxW / (x.w + pw), maxH / (x.h + ph), 2); };
  const both = (maxW: number, maxH: number) => Math.min(each(S.ORIGINAL, maxW, maxH), each(st, maxW, maxH));
  let maxW = r.maxW, maxH = r.maxH, up = 0, s = both(maxW, maxH);
  // 위 · 아래 줄은 같이 비운다 — 한쪽만 비우면 틀이 줄어든 높이의 가운데로 옮겨 가 맞은편 여백이 그 절반만큼 준다.
  const freeH = (maxH - (st.h + padsOf(st)[1]) * s) / 2, below = belowOf(S, st), short = freeH < Math.max(lane.h, below);
  if (lane.w && (maxW - (st.w + padsOf(st)[0]) * s) / 2 < lane.w) maxW -= 2 * lane.w;
  if (lane.h && short) { maxH -= lane.h; up = lane.h; }
  if (below && short) maxH -= below;
  s = both(maxW, maxH);
  const h = st.h * s, ph = padsOf(st)[1] * s;
  return { s, w: st.w * s, h, cx: r.cx, y: r.top + up + ph / 2 + Math.max(0, (maxH - h - ph) / 2) };
}
export function setFrame(S: Scene, f: Frame, now = 0, sp?: Spring | null, spO = sp, delay = 0) {
  const g = P.gap;
  for (const [v, to] of [[S.V.w, f.w], [S.V.h, f.h], [S.V.s, f.s], [S.V.y, f.y]] as [Val, number][]) sp ? v.set(to, sp, now, delay) : v.snap(to);
  for (const [v, to] of [[S.O.w, f.w + 2 * g], [S.O.h, f.h + 2 * g]] as [Val, number][]) spO ? v.set(to, spO, now) : v.snap(to);
}
export function setLook(S: Scene, lk: Body, instant?: boolean) {
  const now = S.clock.t;
  S.look.a = instant || !S.look.b ? lk : lookAt(S, now); S.look.b = lk; S.look.t0 = instant ? -1e9 : now;
}
export function lookAt(S: Scene, now: number): Body {
  const A = S.look.a!, B = S.look.b;
  if (!B) return DEVICES.s26.look.open;
  const k = easeOut(clamp((now - S.look.t0) / S.look.dur, 0, 1)), m = (x: number, y: number) => lerp(x, y, k);
  return { tone: B.tone, bezel: m(A.bezel, B.bezel), ends: m(endsOf(A), endsOf(B)), home: m(Number(A.home) || 0, Number(B.home) || 0), radius: B.radius.map((r, i) => m(A.radius[i], r)) as Radii,
    cams: camsLook(A.cams, B.cams, k, m),
    btn: B.btn.map((b, i) => { const a = A.btn[i];
      return a.side === b.side ? { side: b.side, at: m(a.at, b.at), len: m(a.len, b.len) }
                               : k < .5 ? { side: a.side, at: a.at, len: a.len * (1 - 2 * k) } : { side: b.side, at: b.at, len: b.len * (2 * k - 1) }; }) };
}
export function snapTo(S: Scene, sel: string) {
  const st = resolve(S, sel)!, f = fit(S, st);
  S.cur = st; S.tr = null; S.queued = null; S.rig.on = false; S.spin.on = false; S.fadeB = null; S.UA.el.style.transform = ""; S.UA.el.style.removeProperty("--spin-s");
  setFrame(S, f);
  S.rulerOp.snap(1);
  settle(S, st.img);
  S.outlineOp.snap(lined(st) ? 1 : 0); S.shellOp.snap(shelled(st) ? 1 : 0); S.creaseOp.snap(isOpen(st) ? P.crease : 0);
  S.unitOp.a.snap(1); S.unitOp.b.snap(0);
  paintBar(S, st, true);
}
function settle(S: Scene, img: SceneImage | null) {
  const o = S.layer.old, n = S.layer.neu;
  o.r = img; o.held = false; o.grow.snap(0); o.blur.snap(0); o.veil.snap(0); o.op.snap(1);
  n.r = null; n.op.snap(0); n.blur.snap(0); S.layer.swap = null;
}
function freeze(S: Scene, now: number) {
  const n = S.layer.neu, o = S.layer.old, sw = S.layer.swap;
  const nb = sw ? swapBlurAt(swapAt(sw, now)) : n.blur.at(now), nop = sw ? smooth(0, 1, swapAt(sw, now)) : n.op.at(now);
  if (n.r && nop > .5) { o.r = n.r; o.grow.snap(0); o.blur.snap(nb); o.veil.snap(0); o.op.snap(1); }
  else if (sw) o.blur.snap(nb);
  o.held = true;
  n.r = null; n.op.snap(0); n.blur.snap(0); S.layer.swap = null;
}
// 도착 그림이 없으면 옛 화면을 틀에 채워 흐린다 — 빈칸 · 잘림 대신 흐린 화면이 자리를 지킨다.
// 채움은 흐림이 오르는 동안 원래 dp 자리에서 덮는 크기로 자란다 — 틀이 움직이던 중이면 그 사이가 커서 한 프레임에 튀었다.
// 기기를 바꿀 때 그림은 대개 수백 ms 안에 온다 — 크기 전환은 옅게만 흐리고(light), 그 안에 안 오면 tick 이 holdBlur 로 깊인다.
function hold(S: Scene, now: number, light = false) {
  const o = S.layer.old;
  o.grow.to(1, P.holdRise, now); o.blur.to(Math.max(light ? P.holdLight : P.holdBlur, o.blur.at(now)), P.holdRise, now); o.veil.to(P.veil, P.holdRise, now);
}
function sharpen(S: Scene, now: number) {
  const o = S.layer.old;
  o.grow.to(0, 120, now); o.blur.to(0, 120, now); o.veil.to(0, 120, now);
}
const atRest = (S: Scene, now: number) => S.V.w.done(now) && S.V.h.done(now) && S.V.y.done(now) && S.V.s.done(now, .002);
// 눈에는 이미 멈춘 때 — 남은 거리가 3px 안. 끝 꼬리를 기다리면 흐림이 오래 남았다
const nearRest = (S: Scene, now: number) => { const f = fit(S, S.cur!); return Math.abs(S.V.w.at(now) - f.w) < 3 && Math.abs(S.V.h.at(now) - f.h) < 3 && Math.abs(S.V.y.at(now) - f.y) < 3; };
export function go(S: Scene, sel: string) {
  const now = performance.now(), to = resolve(S, sel);
  S.clock.t = now;
  if (!to || !S.cur || to.sel === S.cur.sel) return;
  if (S.rig.on || S.spin.on) { S.queued = to.sel; return; }
  const from = S.cur, same = from.kind === "device" && to.kind === "device" && from.dev === to.dev;
  const folding = !reducedOn() && same && from.folded !== to.folded;
  const spinning = !reducedOn() && same && from.angle !== to.angle && from.folded === to.folded;
  if ((folding || spinning) && !atRest(S, now)) { S.queued = to.sel; return; }
  S.queued = null;

  // 크기가 같은 칸끼리(프리셋 → 같은 치수 커스텀)는 그림도 틀도 같다 — 전환 없이 이름만 바꾼다. 흐린 채움 · 교체 흐림이 낄 자리가 없다
  const sameSize = !S.tr && !shelled(from) && !shelled(to) && Math.round(from.w) === Math.round(to.w) && Math.round(from.h) === Math.round(to.h);
  if (sameSize && from.img) {
    if (!S.images.has(to.sel)) S.images.set(to.sel, from.img);
    to.img = S.images.get(to.sel)!;
    S.cur = to; paintBar(S, to); wake(S);
    return;
  }
  const cached = S.images.has(to.sel);
  S.cur = to;
  paintBar(S, to);

  if (reducedOn()) startFade(S, from, to, now);
  else if (folding) startFold(S, from, to, now, cached);
  else if (spinning) startSpin(S, from, to, now, cached);
  else startSize(S, from, to, now, cached);
  if (cached && S.tr!.kind !== "size") S.tr!.arriveAt = now;
}
// 캐시가 있으면 틀을 덮는 쪽 레이아웃을 원래 dp로 둔다 — 커지면 처음에, 작아지면 틀이 새 크기에 닿을 즈음 바꾼다.
function startSize(S: Scene, from: St, to: St, now: number, cached: boolean) {
  if (S.tr && S.tr.kind === "fade") endFade(S, now);
  freeze(S, now);
  const f0 = { w: S.V.w.at(now), h: S.V.h.at(now) }, f = fit(S, to);
  setFrame(S, f, now, springOf(P.frameDur, P.frameBounce), springOf(P.frameDur, P.outlineBounce), P.outlineLead);
  S.outlineOp.to(shelled(to) ? 0 : lined(from) || lined(to) ? 1 : S.outlineOp.b, 140, now);
  S.shellOp.to(shelled(to) ? 1 : 0, 220, now);
  S.creaseOp.to(isOpen(to) ? P.crease : 0, 220, now);
  if (cached) sharpen(S, now); else hold(S, now, true);
  S.tr = { kind: "size", from, to, t0: now, arriveAt: Infinity, arrived: false, cached, swapped: false, deepAt: cached ? 0 : now + P.holdDeepAfter,
    grow: to.w >= from.w && to.h >= from.h, f0, f1: f };
}
function nearTarget(S: Scene, now: number) {
  const { f0, f1 } = S.tr as SizeTr, part = (v: number, a: number, b: number) => Math.abs(a - b) < 1 ? 0 : Math.abs(v - b) / Math.abs(a - b);
  return Math.max(part(S.V.w.at(now), f0.w, f1.w), part(S.V.h.at(now), f0.h, f1.h)) < P.swapNear;
}
function startSwap(S: Scene, now: number) {
  const n = S.layer.neu, t = S.tr as SizeTr;
  t.swapped = t.arrived = true;
  n.r = t.to.img; n.op.snap(0); n.blur.snap(0);
  S.layer.swap = { t0: now, dur: P.swapDur };
}
function startFade(S: Scene, from: St, to: St, now: number) {
  if (S.tr && S.tr.kind === "fade") endFade(S, now);
  if (S.rig.on) endRig(S, now);
  if (S.spin.on) endSpin(S, now);
  freeze(S, now);
  S.layer.old.grow.to(0, 120, now); S.layer.old.blur.to(0, 120, now); S.layer.old.veil.to(0, 120, now);
  for (const v of [S.V.w, S.V.h, S.V.s, S.V.y, S.O.w, S.O.h]) v.snap(v.at(now));
  S.roll.w.snap(from.w); S.roll.h.snap(from.h);
  S.layer.old.op.to(P.reducedDim, 160, now);
  S.tr = { kind: "fade", from, to, t0: now, arriveAt: Infinity, arrived: false };
}
function endFade(S: Scene, now: number) {
  const t = S.tr!;
  S.tr = null; S.fadeB = null;
  setFrame(S, fit(S, t.to));
  settle(S, t.to.img);
  S.outlineOp.snap(lined(t.to) ? 1 : 0); S.shellOp.snap(shelled(t.to) ? 1 : 0); S.creaseOp.snap(isOpen(t.to) ? P.crease : 0);
  S.unitOp.a.snap(1); S.unitOp.b.snap(0);
  S.rulerOp.to(1, 200, now);
}
function arrive(S: Scene) {
  if (!S.tr) return;
  const at = S.tr.arriveAt;
  S.tr.arrived = true;
  const cachedFold = (S.tr.kind === "fold" || S.tr.kind === "unfold") && S.rig.cached || S.tr.kind === "spin" && S.spin.cached;

  if (S.tr.kind === "spin" || cachedFold || S.tr.kind === "size" && S.tr.cached) return;
  if (S.tr.kind === "fade") {
    const f = fit(S, S.tr.to);
    S.fadeB = { f, st: S.tr.to, layers: layersOf(S.tr.to.img) };
    S.unitOp.b.snap(0); S.unitOp.b.to(1, P.reducedFade, at); S.unitOp.a.to(0, P.reducedFade, at);
    S.rulerOp.to(0, 120, at);
    return;
  }
  const n = S.layer.neu;
  // 깊어지기 전에 온 그림은 그 순간의 옅은 흐림에서 바로 끝까지 걷는다 — 틀이 멈추길 기다리면 흐린 시간이 또렷한 시간과 맞먹었다.
  if (S.tr.deepAt) {
    S.tr.deepAt = 0;
    n.r = S.tr.to.img; n.op.snap(0); n.op.to(1, P.fastReveal, at); n.blur.snap(S.layer.old.blur.at(at)); n.blur.to(0, P.fastReveal, at);
    return;
  }
  // 새 그림은 옛 화면의 흐림에서 시작해 걷히며 드러난다.
  n.r = S.tr.to.img; n.op.snap(0); n.op.to(1, P.revealFade, at); n.blur.snap(Math.max(S.layer.old.blur.at(at), S.layer.old.blur.b));
  // 틀이 아직 움직이면 다 걷지 않는다 — 움직이는 동안은 옅게 흐리고, 멈추면 tick 이 걷는다(B + 흐림 → B)
  n.blur.to(S.tr.kind === "size" && !nearRest(S, at) ? P.moveBlur : 0, P.revealDur, at);
}
export function rigCamera(S: Scene, folded: boolean, scale: number) {
  const panel = S.rig.d[folded ? "cover" : "open"]!, tall = tallOf(S.rig.d);
  return S.rig.d.look[folded ? "cover" : "open"]!.cams.map(c => camBox(panel.w, panel.h, tall, c, scale, tall));
}
function startFold(S: Scene, from: Dev, to: Dev, now: number, cached: boolean) {
  const d = DEVICES[to.dev] as FoldDevice, dir = to.folded ? "fold" : "unfold", H = d.open.hinge!;
  const f0 = fit(S, from), f1 = fit(S, to);
  freeze(S, now);
  if (cached) { const o = S.layer.old; o.grow.snap(0); o.blur.snap(0); o.veil.snap(0); }
  const restBlur = S.layer.old.blur.at(now);
  const O = plateOf(d, "open"), C = plateOf(d, "cover");
  const openU = (f: Frame) => f.cx - O.w * f.s / 2 + H * f.s;
  const coverU = (f: Frame) => f.cx - C.w * f.s / 2;
  const frame = { w: to.w, h: to.h };
  // 짝 없는 방향(거꾸로 선 세로 대신 바로 선 세로)은 180° 돌지 않고 접기만 보인 뒤 정지 자세로 맞춘다
  const delta = ((to.angle - from.angle + 540) % 360) - 180, turn = Math.abs(delta) === 180 ? 0 : delta;
  Object.assign(S.rig, {
    on: true, turn, q: tallOf(d) ? 90 : 0, z: parseFloat(getComputedStyle(S.rigEl).getPropertyValue("--z")) || 1, t0: now, dur: P.foldDur, dir, d, restBlur, oldSpec: S.layer.old.r!, from, to, f0, f1, cached,
    s0: f0.s, s1: f1.s, sRef: Math.max(f0.s, f1.s),
    half: { u: H, v: O.h }, cover: { u: C.w, v: C.h },
    hx0: dir === "fold" ? openU(f0) : coverU(f0),
    hx1: dir === "fold" ? coverU(f1) : openU(f1),
    plan: dir === "fold"
      ? { inner: { role: "crisp", du: 0 }, base: { role: "crisp", du: H }, outer: { role: "hold", du: 0, neu: true, frame } }
      : { outer: { role: "crisp", du: 0 }, inner: { role: "hold", du: 0, neu: true, frame }, base: { role: "hold", du: H, neu: true, frame } },
  });
  S.rig.dip = rigDip(S);
  S.stretchOf.clear();
  paintShades(S);
  const openE = dir === "fold" ? 0 : 1, endOf = new Map<Side, number>([[S.RG.base.front, openE], [S.RG.leaf.front, openE], [S.RG.base.back, openE], [S.RG.leaf.back, 1 - openE]]);
  for (const [side, e] of endOf) side.gloss.style.setProperty("--turn", rigAngle(S, e) + "deg");
  const ends = [...endOf].filter(([, e]) => e === 1).map(([side]) => side);
  S.seeding = new Set(ends.flatMap(side => [side.gloss, ...side.fit]));
  drawRig(S, now + S.rig.dur * 1000);
  S.seeding = null;
  if (!cached) hold(S, now);
  S.creaseOp.snap(0);
  S.roll.w.snap(from.w); S.roll.h.snap(from.h);
  S.rulerOp.to(0, 120, now);
  S.tr = { kind: dir, from, to, t0: now, arriveAt: Infinity, arrived: false };
}
const rigAngle = (S: Scene, e: number) => S.rig.from.angle + S.rig.turn * e + S.rig.q;
// 판 좌표의 몸체 두께 [왼 · 오른 변(u), 위 · 아래 변(v)] — ends 는 기기 자연 방향의 위 · 아래라 조개형(tall)은 u, 책형은 v 다.
export const rigEdges = (S: Scene, lk: Body): [number, number] => { const side = lk.bezel * P.shellK, end = endsOf(lk) * P.shellK; return tallOf(S.rig.d) ? [end, side] : [side, end]; };
// 접는 한 자세(e 는 이징을 지난 진행)와 그 자세가 맞춤 영역에 들려면 필요한 배율 비(1 이하).
function rigPose(S: Scene, e: number, [bu, bv]: [number, number]) {
  const th = (S.rig.dir === "fold" ? e : 1 - e) * 180;
  const baseS = lerp(S.rig.s0, S.rig.s1, e), cy = lerp(S.rig.f0.y + S.rig.f0.h / 2, S.rig.f1.y + S.rig.f1.h / 2, e);
  const angle = rigAngle(S, e), rad = th * Math.PI / 180, a = angle * Math.PI / 180, k = th / 180;
  const u = lerp(S.rig.half.u, S.rig.cover.u, k), v = lerp(S.rig.half.v, S.rig.cover.v, k);
  const hx = lerp(S.rig.hx0, S.rig.hx1, e), r = room(S), offset = (hx - r.cx) / baseS;
  const perspective = P.perspective / (P.perspective - (u + S.rig.d.plate.thickness) * Math.sin(rad) * baseS);
  const tip = -u * Math.cos(rad) * perspective;
  const baseU = lerp(S.rig.half.u, Math.min(S.rig.half.u, S.rig.cover.u), smooth(P.shrinkFrom, 180, th));
  const xs = [offset + Math.min(0, tip) - bu, offset + Math.max(baseU, tip) + bu];
  const ys = [-v * perspective / 2 - bv, v * perspective / 2 + bv];
  const corners = xs.flatMap(x => ys.map(y => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]));
  const extent = (axis: number) => Math.max(...corners.map(p => Math.abs(p[axis])));
  const need = Math.min(1, r.maxW / (2 * extent(0) * baseS), r.maxH / (2 * extent(1) * baseS));
  return { th, baseS, cy, angle, v, hx, r, need };
}
// 회전 중 대각선과 원근으로 커진 장도 맞춤 영역 안에 둔다. 프레임마다 모자란 만큼 줄이면 경계에 닿는 순간 배율이 꺾여
// 기기 전체가 덜컥였다 — 시작할 때 전 구간의 모자람을 재고, 양끝 0에서 그 자리까지 부드럽게 오르내리는 곡선의 최댓값으로 준다.
// 양끝은 정지 자세의 fit 이라 재지 않는다.
function rigDip(S: Scene) {
  const [ou, ov] = rigEdges(S, S.rig.d.look.open), [cu, cv] = rigEdges(S, S.rig.d.look.cover), bezel: [number, number] = [Math.max(ou, cu), Math.max(ov, cv)], n = 48, need: [number, number][] = [];
  for (let i = 1; i < n; i++) { const e = i / n, lack = 1 - rigPose(S, e, bezel).need; if (lack > 0) need.push([e, lack + .004]); }
  const hump = (e: number, c: number) => e <= c ? smooth(0, c, e) : 1 - smooth(c, 1, e);
  return (e: number) => need.reduce((m, [c, lack]) => Math.max(m, lack * hump(e, c)), 0);
}
export function rigAt(S: Scene, now: number) {
  const t = (now - S.rig.t0) / 1000, T = Math.max(.05, S.rig.dur);
  const e = foldEase(S)(clamp(t / T, 0, 1));
  const { th, baseS, cy, angle, v, hx, r } = rigPose(S, e, rigEdges(S, lookAt(S, now)));
  const s = baseS * (1 - S.rig.dip(e));
  return { t, th, p: e, s, hx: r.cx + (hx - r.cx) * s / baseS, cy,
    angle, top: cy - v * s / 2, settled: t >= T };
}
function endRig(S: Scene, now: number) {
  const shown = P.crease * rigCrease(rigAt(S, now).th);
  S.rig.on = false;
  if (S.rig.cached) settle(S, S.cur!.img);
  setFrame(S, fit(S, S.cur!));
  S.outlineOp.snap(lined(S.cur!) ? 1 : 0); S.shellOp.snap(shelled(S.cur!) ? 1 : 0);
  S.creaseOp.snap(isOpen(S.cur!) ? shown : 0); if (isOpen(S.cur!)) S.creaseOp.to(P.crease, 240, now);
  S.rulerOp.to(1, 200, now);
}
const spinEase = (S: Scene) => {
  const k = `${P.rotLift},${P.rotLand}`;
  if (k !== S.spinEaseKey) { S.spinEaseKey = k; S.spinEaseFn = bezier(P.rotLift, 0, P.rotLand, 1); }
  return S.spinEaseFn!;
};
// 몸체 · 틀만 돌고 내용은 반대로 돌아 똑바로 선다. 캐시가 있으면 45° 근처에서 가로 레이아웃으로 흐림 교체한다.
function startSpin(S: Scene, from: Dev, to: Dev, now: number, cached: boolean) {
  freeze(S, now);
  if (cached) sharpen(S, now); else hold(S, now);
  const degrees = ((to.angle - from.angle + 540) % 360) - 180;
  Object.assign(S.spin, { on: true, t0: now, dur: P.rotDur, from, to, f0: fit(S, from), f1: fit(S, to), dir: degrees / 90, cached });
  S.roll.w.snap(from.w); S.roll.h.snap(from.h);
  S.rulerOp.to(0, 120, now);
  S.tr = { kind: "spin", from, to, t0: now, arriveAt: Infinity, arrived: false };
}
export function spinAt(S: Scene, now: number) {
  const t = (now - S.spin.t0) / 1000, T = Math.max(.05, S.spin.dur);
  return { p: spinEase(S)(clamp(t / T, 0, 1)), done: t >= T };
}
function endSpin(S: Scene, now: number) {
  const st = S.spin.to, cached = S.spin.cached;
  S.spin.on = false;
  S.UA.el.style.transform = "";
  S.UA.el.style.removeProperty("--spin-s");
  for (const img of [S.UA.l0, S.UA.l1]) img.style.transform = "";
  setFrame(S, fit(S, st));
  S.creaseOp.snap(isOpen(st) ? P.crease : 0);
  S.rulerOp.to(1, 200, now);
  if (cached) { settle(S, st.img); if (S.tr?.kind === "spin") S.tr = null; return; }
  // 그림이 아직이면 흐린 옛 화면을 새 틀에 둔 채 기다리고, 오면 흐림이 걷히며 드러난다.
  if (S.tr?.kind === "spin") Object.assign(S.tr, { kind: "size", cached: false, arrived: false, arriveAt: S.images.has(st.sel) ? now : Infinity });
}
export function tick(S: Scene) {
  const now = S.clock.t;
  if (S.tr && !S.tr.arrived && now >= S.tr.arriveAt) arrive(S);
  if (S.tr?.deepAt && now >= S.tr.deepAt) { S.tr.deepAt = 0; S.layer.old.blur.to(Math.max(P.holdBlur, S.layer.old.blur.at(now)), P.holdDeepen, now); }
  if (S.tr && S.tr.kind === "size" && S.tr.cached && !S.tr.swapped && (S.tr.grow || nearTarget(S, now) || now - S.tr.t0 > P.frameDur * 800)) startSwap(S, now);
  if (S.rig.on && rigAt(S, now).settled) endRig(S, now);
  if (S.spin.on && spinAt(S, now).done) endSpin(S, now);
  const n = S.layer.neu;
  const shown = S.layer.swap ? swapAt(S.layer.swap, now) >= 1 : n.op.done(now) && n.op.b === 1 && n.blur.done(now);
  if (!S.rig.on && n.r && shown) {
    const keep = S.layer.swap ? 0 : n.blur.b;
    settle(S, n.r);
    if (S.tr?.kind === "size" && keep) S.layer.old.blur.snap(keep);
  }
  // 크기 전환은 틀이 멈춘 뒤에 선명해진다 — 움직이는 동안 늘었다 줄었다 하는 화면을 옅은 흐림이 가린다
  if (S.tr?.kind === "size" && S.tr.arrived && !S.layer.neu.r && nearRest(S, now) && S.layer.old.blur.b > 0 && !(S.layer.old.grow.b > 0)) S.layer.old.blur.to(0, P.settleSharp, now);
  if (S.tr) {
    if (S.tr.kind === "fade") { if (S.tr.arrived && S.unitOp.b.done(now)) endFade(S, now); }
    else if (S.tr.kind !== "spin" && S.tr.arrived && !S.rig.on && !S.layer.neu.r && atRest(S, now) && S.O.w.done(now) && S.O.h.done(now) && S.layer.old.blur.b === 0 && S.layer.old.blur.done(now)) {
      S.tr = null;
      S.outlineOp.to(lined(S.cur!) ? 1 : 0, 220, now);

    }
  }
  if (S.queued && !S.rig.on && !S.spin.on && (!S.tr || S.tr.kind === "size")) {
    const qs = S.queued, st = resolve(S, qs)!;
    const here = S.cur!, posing = here.kind === "device" && st.kind === "device" && here.dev === st.dev;
    if (!posing || atRest(S, now)) { S.queued = null; go(S, qs); }
  }
  if (S.draft && S.cur) { setFrame(S, fit(S, { ...S.cur, w: S.draft.w, h: S.draft.h })); S.roll.w.snap(S.draft.w); S.roll.h.snap(S.draft.h); }
  draw(S, now);
  S.root.classList.toggle("at-rest", !S.tr && !S.queued && !S.draft);
  drawRuler(S, now);
  S.hooks.layout({ w: S.V.w.at(now), h: S.V.h.at(now), s: S.V.s.at(now), y: S.V.y.at(now), cx: room(S).cx, radius: turnR(lookAt(S, now).radius, (S.cur?.rot ? 1 : 0) + (S.cur?.mirrored ? 2 : 0)).map(r => r * S.V.s.at(now) * S.shellOp.at(now)) as Radii, bezel: edgeOf(lookAt(S, now)) * S.V.s.at(now) * S.shellOp.at(now) }, !!S.tr || !!S.queued || S.rig.on || S.spin.on || !!S.draft);
}
export function animate(S: Scene, ts: number) {
  S.raf = 0;
  if (!S.enabled || !S.cur) return;
  S.clock.t = ts;
  tick(S);
  const tweens = [S.outlineOp, S.creaseOp, S.rulerOp, S.shellOp, S.hingeOp, S.unitOp.a, S.unitOp.b, S.layer.old.grow, S.layer.old.blur, S.layer.old.veil, S.layer.old.op, S.layer.neu.op, S.layer.neu.blur, S.roll.w, S.roll.h];
  if (S.tr || S.queued || S.rig.on || S.spin.on || !atRest(S, ts) || ts < S.look.t0 + S.look.dur || tweens.some(v => !v.done(ts))) wake(S);
}
export function wake(S: Scene) { if (S.enabled && !S.raf) S.raf = requestAnimationFrame((ts: number) => animate(S, ts)); }
export function request(S: Scene, sel: string) { return Promise.resolve(S.hooks.request(sel)); }
export function relayout(S: Scene, force = false) {
  const size = `${S.root.clientWidth}:${S.root.clientHeight}:${S.badge.w}`;
  if (size === S.roomSize && !force) return;
  S.roomSize = size;
  if (S.cur && !S.rig.on && !S.spin.on) setFrame(S, fit(S, S.cur), performance.now(), S.tr?.kind === "size" ? springOf(P.frameDur, P.frameBounce) : null);
  wake(S);
  if (S.cur) { S.clock.t = performance.now(); tick(S); }
}
