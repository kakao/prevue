import { DEVICES } from "../runtime/devices";
import { LENS, P, bump, camBox, castShadow, clamp, edgeOf, endsOf, glintAt, holdSize, homeBox, isOpen, lerp, lightOf, lined, litOf, lookOf, perimeter, plateOf, px, radii, rgbOf, rigCrease, shade, shelled, smooth, splitTop, stripPaint, swapAt, swapBlurAt, tallOf, toned, turnR } from "./calc";
import { lookAt, rigAt, rigCamera, rigEdges, room, spinAt } from "./engine";
import type { Scene, Unit } from "./state";
import type { Axis, Box, Face, Layers, Outline, Panel, PanelSpec, Plan, SceneImage, Shadow, Side } from "./types";

function stretch(S: Scene, el: HTMLElement, w: number, h: number) {
  let st = S.stretchOf.get(el);
  if (!st && S.seeding && !S.seeding.has(el)) return;
  if (!st) { st = { w0: Math.max(w, 1), h0: Math.max(h, 1), k: [1, 1] }; S.stretchOf.set(el, st); Object.assign(el.style, { width: px(st.w0), height: px(st.h0) }); }
  st.k = [w / st.w0, h / st.h0];
  el.style.transform = `scale(${st.k[0].toFixed(5)}, ${st.k[1].toFixed(5)})`;
}
export function paintShades(S: Scene) {
  S.RG.F.base.cast.style.background = `linear-gradient(90deg, ${shade(1)}, ${shade(.35)} 45%, ${shade(0)} 90%)`;
  for (const [f, dir] of [[S.RG.F.inner, "to left"], [S.RG.F.outer, "to right"]] as [Face, string][]) {
    f.dark!.style.background = `linear-gradient(${dir}, ${[0, .2, .4, .6, .8, 1].map(dd => `${shade(Math.min(1, 2 * Math.pow(Math.max(0, (dd - .2) / .8), 1.35)) * P.foldDark)} ${dd * 100}%`).join(", ")})`;
    f.blurs.forEach(({ el }, i) => { el.style.webkitMaskImage = el.style.maskImage = `linear-gradient(${dir}, transparent ${((i + .5) / 4 * 100).toFixed(1)}%, var(--device-shade) ${((i + 1) / 4 * 100).toFixed(1)}%)`; });
  }
}
function foldImage(S: Scene, img: HTMLImageElement, spec: SceneImage | null, size: { w: number; h: number }, folded: boolean, du: number, s: number, now: number, blur = 0, opacity = 1) {
  const panel = plateOf(S.rig.d, folded ? "cover" : "open");
  place(img, spec, (panel.w - size.w) * s / 2 - du * s, size.w * s, size.h * s, opacity, blur, (panel.h - size.h) * s / 2);
  img.style.transform = `rotate(${-rigAt(S, now).angle}deg)`;
}
function paintFace(S: Scene, f: Face, plan: Plan, s: number, now: number, u: number) {
  const o = S.layer.old, n = S.layer.neu, spec = S.rig.oldSpec, folded = plan === S.rig.plan.outer;
  const put = (img: HTMLImageElement, src: SceneImage | null, size: { w: number; h: number }, blur: number, op = 1) => foldImage(S, img, src, size, folded, plan.du, s, now, blur * u, op);
  if (plan.role === "crisp") {
    put(f.old, spec, { w: spec.dpW, h: spec.dpH }, S.rig.restBlur);
    f.veil.style.opacity = "0";
  } else if (S.rig.cached) {
    const ts = S.rig.to.img!;
    put(f.old, ts, { w: ts.dpW, h: ts.dpH }, 0);
    f.veil.style.opacity = "0";
    f.neu.style.opacity = "0";
    f.el.style.background = ts.edge;
    return;
  } else {
    put(f.old, spec, holdSize(spec, plan.frame!, o.grow.b > 0), o.blur.at(now));
    f.veil.style.opacity = String(o.veil.at(now));
  }
  if (plan.neu && n.r) put(f.neu, n.r, { w: n.r.dpW, h: n.r.dpH }, n.blur.at(now), n.op.at(now));
  else f.neu.style.opacity = "0";
  f.el.style.background = (n.r && n.op.at(now) > .5 && plan.neu ? n.r : spec).edge;
}
function turnRig(S: Scene, el: HTMLElement, now: number) {
  const { angle, cy } = rigAt(S, now);
  el.style.transformOrigin = `${room(S).cx}px ${cy}px`;
  el.style.transform = `rotate(${angle}deg)`;
}
function drawPanel(S: Scene, p: Panel, { body, span, bodyR, scr, scrR, backScrR, T, normal, tone, hk, hingeLeft, u }: PanelSpec) {
  const [x0, y0, x1, y1] = body, W = x1 - x0, H = y1 - y0, cap = (r: number[]) => r.map(v => clamp(v, 0, Math.min(W, H) / 2));
  const R = cap(bodyR), mirror = (r: number[]) => [r[1], r[0], r[3], r[2]];
  for (const [f, back] of [[p.front, false], [p.back, true]] as [Side, boolean][]) {
    const sx = back ? x1 - scr[2] : scr[0] - x0, sr = back ? mirror(backScrR || scrR) : scrR, sw = scr[2] - scr[0], sh = scr[3] - scr[1];
    Object.assign(f.body.style, { left: px(x0), top: px(y0), width: px(W), height: px(H), backgroundColor: toned(tone, 1),
      borderRadius: radii(back ? mirror(R) : R), transform: back ? `translateZ(${px(-T)}) rotateY(180deg)` : "none" });
    if (f.clip) Object.assign(f.clip.style, { left: px(sx), top: px(scr[1] - y0), width: px(sw), height: px(sh), borderRadius: radii(sr) });
    if (f.ring) {
      const w = 2 * u / S.rig.z, hinge = w * hk, [l, r] = hingeLeft ? [hinge, w] : [w, hinge], [ll, rr] = back ? [r, l] : [l, r];
      Object.assign(f.ring.style, { left: px(sx - ll), top: px(scr[1] - y0 - w), width: px(sw + ll + rr), height: px(sh + 2 * w),
        borderWidth: `${px(w)} ${px(rr)} ${px(w)} ${px(ll)}`, borderRadius: radii(sr.map(v => v + w)) });
    }
    if (f.lit) { const [color, a] = litOf(lightOf(normal([0, 0, back ? -1 : 1]))); f.lit.style.background = color; f.lit.style.opacity = a.toFixed(4); }
    f.gloss.style.left = back ? "0px" : px(span[0] - x0);
    stretch(S, f.gloss, back ? W : span[1] - span[0], H);
    for (const el of f.fit) stretch(S, el, sw, sh);
  }
  const segs = perimeter(body, R, P.arcSegs);
  while (p.strips.length < segs.length) { const el = document.createElement("div"); el.className = "strip"; p.el.append(el); p.strips.push(el); }
  p.strips.forEach((el, i) => {
    const g = segs[i];
    if (!g || g.len < .05 || T < .05) { el.style.display = "none"; return; }
    const len = g.len + .6 * u, a = g.a * Math.PI / 180;
    Object.assign(el.style, { display: "", width: px(T), height: px(len), marginLeft: px(-T / 2), marginTop: px(-len / 2),
      transform: `translate3d(${px(g.x)},${px(g.y)},${px(-T / 2)}) rotateZ(${g.a.toFixed(3)}deg) rotateY(90deg)` });
    el.style.background = stripPaint(tone, lightOf(normal([Math.cos(a), Math.sin(a), 0])));
  });
}
function smear(S: Scene, f: Face, lift: number, u: number) {
  const on = S.rig.d.plate.blur && lift > .01, top = Number(f.neu.style.opacity) > .5 ? f.neu : f.old;
  f.blurs.forEach(({ el, inv, img }, i) => {
    const blur = P.foldBlur * lift * Math.pow((i + 1) / 4, 1.35) * u, base = parseFloat((/blur\(([\d.]+)px\)/.exec(top.style.filter) || ["0", "0"])[1]);
    el.style.opacity = on && blur > .2 ? "1" : "0";
    if (!on || blur <= .2) return;
    if (img.src !== top.src) img.src = top.src;
    const [kx, ky] = S.stretchOf.get(el)!.k;
    inv.style.transform = `scale(${(1 / kx).toFixed(5)}, ${(1 / ky).toFixed(5)})`;
    Object.assign(img.style, { left: top.style.left, top: top.style.top, width: top.style.width, height: top.style.height, transform: top.style.transform,
      filter: `blur(${Math.max(blur, base).toFixed(2)}px)` });
  });
  f.dark!.style.opacity = on ? lift.toFixed(4) : "0";
}
function tallButtons(S: Scene, { hu, T0, Bv, t, s, k, sn, cs, lift, tone, u }: { hu: number; T0: number; Bv: number; t: number; s: number; k: number; sn: number; cs: number; lift: number; tone: string; u: number }) {
  const d = S.rig.d, H = d.open.hinge!, bw = 3 * u;
  d.look.open.btn.forEach((bo, i) => {
    const bc = d.look.cover.btn[i], leaf = bo.at < H;
    const w0 = lerp(leaf ? H - bo.at - bo.len : bo.at - H, bc.at, leaf ? k : 0), w1 = lerp(leaf ? H - bo.at : bo.at + bo.len - H, bc.at + bc.len, leaf ? k : 0);
    const [u0, u1] = leaf ? [-w1 * cs, -w0 * cs].sort((a, b) => a - b) : [w0, w1], wm = (w0 + w1) / 2;
    Object.assign(S.RG.btns[i].style, { left: px(hu + u0 * s), top: px(bo.side > 0 ? T0 - t - bw + .5 * u : T0 + Bv + t - .5 * u), width: px((u1 - u0) * s), height: px(bw),
      backgroundColor: tone, opacity: (leaf ? lerp(bo.len, bc.len, k) : bo.len) * s > .5 * u ? 1 : 0, transform: `translateZ(${px(lift + (leaf ? wm * s * sn : 0))})` });
  });
}
const elevation = (S: Scene) => S.elevationOf ??= splitTop(getComputedStyle(S.rigEl).getPropertyValue("--elevation-2")).map((part): Shadow | null => {
  const m = /^\s*(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(.+)$/.exec(part);
  return m ? [+m[1], +m[2], +m[3], +m[4], m[5].trim()] : null;
}).filter((e): e is Shadow => e !== null);
export function drawRig(S: Scene, now: number) {
  const { th, s: sNow, hx: hu, top, cy, angle } = rigAt(S, now);
  const s = S.rig.sRef, K = sNow / s, u = 1 / K, T0 = cy - (cy - top) * s / sNow;
  const k = th / 180, rad = th * Math.PI / 180, sn = Math.sin(rad), cs = Math.cos(rad), d = S.rig.d;
  const lk = lookAt(S, now), t = lk.bezel * P.shellK * s, [tu, tv] = rigEdges(S, lk).map(b => b * s), tone = rgbOf(lk.tone);
  const Lu = lerp(S.rig.half.u, S.rig.cover.u, k) * s, Lv = lerp(S.rig.half.v, S.rig.cover.v, k) * s;
  const Bu = lerp(S.rig.half.u, Math.min(S.rig.half.u, S.rig.cover.u), smooth(P.shrinkFrom, 180, th)) * s, Bv = Lv;
  const T = d.plate.thickness * s, za = d.plate.gap * s / 2;
  const lift = (T + 2 * za) * (1 - cs) / 2;
  const hk = smooth(20, 160, th), e = tu * hk;
  const q = tallOf(d) ? 3 : 0, R = turnR(d.look.open.radius, q).map(v => v * s), C = turnR(d.look.cover.radius, q).map(v => v * s);
  const sm = smooth(60, 120, th), mix = (a: number, b: number) => lerp(a, b, sm) + t;
  const baseR = [mix(R[0], C[0]) * hk, mix(R[1], C[1]), mix(R[2], C[2]), mix(R[3], C[3]) * hk];
  const leafR = [mix(R[0], C[1]), mix(R[1], C[0]) * hk, mix(R[2], C[3]) * hk, mix(R[3], C[2])];
  const rB = baseR[1], rH = baseR[0];
  const pivot = `${px(hu)} ${px(cy)}`, k3 = K.toFixed(5);
  Object.assign(S.RG.lift.style, { perspective: P.perspective + "px", perspectiveOrigin: pivot });
  Object.assign(S.RG.space.style, { transformOrigin: pivot, transform: `scale3d(${k3},${k3},${k3}) translateZ(${px(-lift)})` });
  const a = angle * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
  const turn = (n: number[]) => [n[0] * ca - n[1] * sa, n[0] * sa + n[1] * ca, n[2]];
  const fold = (n: number[]) => [n[0] * cs + n[2] * sn, n[1], -n[0] * sn + n[2] * cs];
  for (const p of [S.RG.base, S.RG.leaf]) Object.assign(p.el.style, { left: px(hu), top: px(T0) });
  S.RG.leaf.el.style.transform = `translateZ(${px(za)}) rotateY(${th.toFixed(3)}deg) translateZ(${px(-za)})`;
  const span = [-Lu - tu, Bu + tu];
  drawPanel(S, S.RG.base, { body: [-e, -tv, Bu + tu, Bv + tv], span, bodyR: baseR, scr: [0, 0, Bu, Bv], scrR: [R[0] * hk, R[1], R[2], R[3] * hk], T, normal: turn, tone, hk, hingeLeft: true, u });
  drawPanel(S, S.RG.leaf, { body: [-Lu - tu, -tv, e, Lv + tv], span, bodyR: leafR, scr: [-Lu, 0, 0, Lv], scrR: [R[0], R[1] * hk, R[2] * hk, R[3]],
    backScrR: [C[1], C[0] * hk, C[3] * hk, C[2]], T, normal: n => turn(fold(n)), tone, hk, hingeLeft: false, u });
  paintFace(S, S.RG.F.base, S.rig.plan.base, s, now, u);
  paintFace(S, S.RG.F.inner, S.rig.plan.inner, s, now, u);
  paintFace(S, S.RG.F.outer, S.rig.plan.outer, s, now, u);
  smear(S, S.RG.F.inner, th <= 90 ? sn : 0, u);
  smear(S, S.RG.F.outer, th > 90 ? sn : 0, u);
  const oc = rigCamera(S, false, s), sh = d.open.hinge! * s;
  putCams(S.RG.F.outer.cams, rigCamera(S, true, s), 0, 0, 1, angle);
  putCams(S.RG.F.inner.cams, oc, 0, 0, 1, angle);
  putCams(S.RG.F.base.cams, oc, -sh, 0, 1, angle);
  const home = (folded: boolean): [Box, number] => { const panel = d[folded ? "cover" : "open"], hk = Number(d.look[folded ? "cover" : "open"].home) || 0;
    return [homeBox(lk, panel.w, panel.h, tallOf(d), s, tallOf(d), hk), hk]; };
  const [oh, on] = home(false), [ch, cn] = home(true);
  putCam(S.RG.base.front.home, oh, e - sh, tv, on);
  putCam(S.RG.leaf.front.home, oh, tu, tv, on);
  putCam(S.RG.leaf.back.home, ch, e, tv, cn);
  const cast = P.shade * (.85 * smooth(90, 180, th) + .25 * sn);
  S.RG.F.base.cast.style.opacity = cast.toFixed(4);

  const bx = -e, bz = -T, dz = -T - za, lx = e * cs + dz * sn, lz = za - e * sn + dz * cs;
  const sl = Math.hypot(lx - bx, lz - bz), phi = Math.atan2(-(lz - bz), lx - bx), sv = Bv + 2 * tv;
  Object.assign(S.RG.spine.style, { display: sl > .3 && T > .05 ? "" : "none", left: px(hu), top: px(T0 - tv), width: px(sl + .6 * u), height: px(sv), marginLeft: px(-(sl + .6 * u) / 2),
    borderRadius: `${px(Math.min(rH, (sl + .6 * u) / 2))} / ${px(rH)}`,
    transform: `translate3d(${px((bx + lx) / 2)},0,${px((bz + lz) / 2)}) rotateY(${(phi * 180 / Math.PI).toFixed(3)}deg)` });
  S.RG.spine.style.background = stripPaint(tone, lightOf(turn([Math.sin(phi), 0, Math.cos(phi)])));

  const tip = hu - Lu * cs, p0 = Math.min(hu - e, tip - tu), p1 = Math.max(hu + Bu + tu, tip + tu);
  Object.assign(S.RG.plate.style, { left: px(p0), top: px(T0 - tv), width: px(p1 - p0), height: px(Bv + 2 * tv), borderRadius: px(rB),
    transform: `translateZ(${px(-T - u)})`, boxShadow: castShadow([...elevation(S), [0, (10 + 18 * sn), (30 + 34 * sn), 0, shade(.05 * sn)]], a, u) });
  if (tallOf(d)) tallButtons(S, { hu, T0, Bv, t: tv, s, k, sn, cs, lift, tone: lk.tone, u });
  else lk.btn.forEach((b, i) => {
    Object.assign(S.RG.btns[i].style, { left: px(Math.max(hu + Bu, tip) + tu - .5 * u), top: px(T0 + b.at * s),
      width: px(3 * u), height: px(b.len * s), backgroundColor: lk.tone, opacity: b.len * s > .5 * u ? 1 : 0, transform: `translateZ(${px(lift)})` });
  });
  const tk = rigCrease(th), ck = P.crease * tk;
  Object.assign(S.RG.crease.style, { left: px(hu), top: px(T0), width: px(14 * u), marginLeft: px(-7 * u), height: px(Bv), opacity: ck * S.hingeOp.at(now) });
  const tx = hu - (ca + sa > 0 ? 0 : u);
  Object.assign(S.RG.tTop.style, { left: px(tx), top: px(T0 - tv), width: px(u), height: px(tv), opacity: tk });
  Object.assign(S.RG.tBot.style, { left: px(tx), top: px(T0 + Bv), width: px(u), height: px(tv), opacity: tk });
}
function drawContent(U: Unit, rect: { w: number; h: number; y: number }, s: number, layers: Layers, now: number): SceneImage | null {
  const o = layers.old, n = layers.neu, sw = layers.swap, k = sw ? swapAt(sw, now) : 0;
  const nop = sw ? smooth(0, 1, k) : n.op.at(now), nb = sw ? swapBlurAt(k) : n.blur.at(now), ob = Math.max(o.blur.at(now), sw ? swapBlurAt(k) : 0);
  U.l0.style.transform = U.l1.style.transform = "";
  if (o.r) {
    const k = o.held ? o.grow.at(now) : 0, hs = holdSize(o.r, { w: rect.w / s, h: rect.h / s }, k > 0), w = lerp(o.r.dpW, hs.w, k) * s, h = lerp(o.r.dpH, hs.h, k) * s;
    place(U.l0, o.r, (rect.w - hs.w * s) / 2 * k, w, h, o.op.at(now), ob, (rect.h - hs.h * s) / 2 * k);
  } else U.l0.style.opacity = "0";
  U.veil.style.opacity = String(o.veil.at(now));
  if (n.r) place(U.l1, n.r, 0, n.r.dpW * s, n.r.dpH * s, nop, nb);
  else U.l1.style.opacity = "0";
  const q = n.r ? (sw ? smooth(0, 1, k) : nop) : 0;
  if (q > 0 && q < 1) {
    U.l0.style.transformOrigin = U.l1.style.transformOrigin = "50% 50%";
    U.l0.style.transform = `scale(${(1 + P.swapZoom * q).toFixed(4)})`;
    U.l1.style.transform = `scale(${(1 - P.swapZoom * (1 - q)).toFixed(4)})`;
  }
  return n.r && nop > .5 ? n.r : o.r;
}
function drawUpright(S: Scene, U: Unit, rect: { w: number; h: number; y: number }, s: number, now: number): SceneImage | null {
  const { p } = spinAt(S, now), deg = S.spin.dir * 90 * p, a = deg * Math.PI / 180, o = S.layer.old;
  const up = (img: HTMLImageElement, spec: SceneImage, size: { w: number; h: number }, op: number, blur: number, dx = 0, dy = 0) => {
    place(img, spec, (rect.w - size.w) / 2 + dx, size.w, size.h, op, blur, (rect.h - size.h) / 2 + dy);
    img.style.transform = `rotate(${(-deg).toFixed(3)}deg)`;
  };
  U.veil.style.opacity = String(o.veil.at(now));
  if (!o.r) { U.l0.style.opacity = U.l1.style.opacity = "0"; return null; }
  if (!S.spin.cached || !S.spin.to.img) {
    const box = { w: (Math.abs(rect.w * Math.cos(a)) + Math.abs(rect.h * Math.sin(a))) / s, h: (Math.abs(rect.w * Math.sin(a)) + Math.abs(rect.h * Math.cos(a))) / s };
    const hs = holdSize(o.r, box, true), k = o.grow.at(now), size = { w: lerp(o.r.dpW, hs.w, k) * s, h: lerp(o.r.dpH, hs.h, k) * s };
    up(U.l0, o.r, size, 1, o.blur.at(now), (o.r.dpW * s - rect.w) / 2 * (1 - k), (o.r.dpH * s - rect.h) / 2 * (1 - k));
    U.l1.style.opacity = "0";
    return o.r;
  }
  const w = smooth(P.spinSwapA, P.spinSwapB, p), b = bump(w), from = o.r, to = S.spin.to.img;
  up(U.l0, from, { w: from.dpW * s, h: from.dpH * s }, 1, b);
  up(U.l1, to, { w: to.dpW * s, h: to.dpH * s }, w, b);
  return w > .5 ? to : from;
}
function drawUnit(S: Scene, U: Unit, rect: { w: number; h: number; y: number }, ol: Outline, s: number, layers: Layers, now: number, opacity: number, turning = false) {
  const { cx } = room(S), g = P.gap, y = rect.y;
  U.el.style.opacity = String(opacity);
  Object.assign(U.stage.style, { left: cx - rect.w / 2 + "px", top: y + "px", width: rect.w + "px", height: rect.h + "px" });
  const top = turning ? drawUpright(S, U, rect, s, now) : drawContent(U, rect, s, layers, now);
  U.stage.style.background = top ? top.edge : "var(--surface-container)";
  const lk = ol.look, sr = turnR(lk.radius, (ol.rot ? 1 : 0) + (ol.mirrored ? 2 : 0)).map(r => r * s * ol.shell);
  U.stage.style.borderRadius = radii(sr);
  Object.assign(U.outline.style, { left: cx - ol.w / 2 + "px", top: y - g + "px", width: ol.w + "px", height: ol.h + "px",
    borderRadius: radii(sr.map(r => r > 0 ? r + g : 0)), opacity: ol.op });
  const t = lk.bezel * P.shellK * s, te = endsOf(lk) * P.shellK * s, L = cx - rect.w / 2, tx = ol.rot ? te : t, ty = ol.rot ? t : te;
  Object.assign(U.shell.style, { left: L - tx + "px", top: y - ty + "px", width: rect.w + 2 * tx + "px", height: rect.h + 2 * ty + "px", borderRadius: radii(sr.map(r => r + t)),
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
  putCams(U.cams, lk.cams.map(c => camBox((ol.rot ? rect.h : rect.w) / s, H0, ol.rot, c, s, ol.mirrored)), 0, 0, ol.shell);
  const hk = Number(lk.home) || 0;
  putCam(U.home, homeBox(lk, (ol.rot ? rect.h : rect.w) / s, H0, ol.rot, s, ol.mirrored, hk), L, y, ol.shell * hk);
  const c = ol.crease, hz = ol.rot !== !!ol.tall;
  U.crease.classList.toggle("h", hz);
  Object.assign(U.crease.style, hz ? { left: "0px", top: rect.h / 2 + "px", width: rect.w + "px", height: "", opacity: c * S.hingeOp.at(now) }
                                   : { left: rect.w / 2 + "px", top: "0px", width: "", height: rect.h + "px", opacity: c * S.hingeOp.at(now) });
  const so = c > 0 ? ol.shell * Math.min(1, c / Math.max(.01, P.crease)) : 0;
  if (hz) {
    Object.assign(U.tTop.style, { left: L - tx + "px", top: y + rect.h / 2 + "px", width: tx + "px", height: "1px", opacity: so });
    Object.assign(U.tBot.style, { left: L + rect.w + "px", top: y + rect.h / 2 + "px", width: tx + "px", height: "1px", opacity: so });
  } else {
    Object.assign(U.tTop.style, { left: cx + "px", top: y - ty + "px", width: "1px", height: ty + "px", opacity: so });
    Object.assign(U.tBot.style, { left: cx + "px", top: y + rect.h + "px", width: "1px", height: ty + "px", opacity: so });
  }
}
export function draw(S: Scene, now: number) {
  if (S.rig.on) {
    S.UA.el.hidden = true; S.UB.el.hidden = true; S.rigEl.hidden = false;
    turnRig(S, S.rigEl, now);
    drawRig(S, now);
    return;
  }
  S.rigEl.hidden = true; S.UA.el.hidden = false;
  const s = S.V.s.at(now), ua = (S.spin.on ? S.spin.from : S.cur)!;
  if (S.spin.on) {
    const { p } = spinAt(S, now), { f0, f1 } = S.spin, c0y = f0.y + f0.h / 2, c1y = f1.y + f1.h / 2;
    S.UA.el.style.transformOrigin = `${f0.cx}px ${c0y}px`;
    const k = (lerp(1, f1.s / f0.s, p) * (1 - P.rotDip * Math.sin(Math.PI * p))).toFixed(4);
    S.UA.el.style.transform = `translate(${((f1.cx - f0.cx) * p).toFixed(2)}px, ${((c1y - c0y) * p).toFixed(2)}px) rotate(${(S.spin.dir * 90 * p).toFixed(3)}deg) scale(${k})`;
    S.UA.el.style.setProperty("--spin-s", k);
  }
  drawUnit(S, S.UA, { w: S.V.w.at(now), h: S.V.h.at(now), y: S.V.y.at(now) }, { w: S.O.w.at(now), h: S.O.h.at(now), op: S.outlineOp.at(now), crease: S.creaseOp.at(now), shell: S.shellOp.at(now), rot: !!ua.rot, mirrored: !!ua.mirrored, tall: ua.kind === "device" && tallOf(DEVICES[ua.dev]), look: lookAt(S, now) }, s, S.layer, now, S.unitOp.a.at(now), S.spin.on);
  if (S.fadeB) {
    S.UB.el.hidden = false;
    const f = S.fadeB.f, g = P.gap, st = S.fadeB.st;
    drawUnit(S, S.UB, { w: f.w, h: f.h, y: f.y }, { w: f.w + 2 * g, h: f.h + 2 * g, op: lined(st) ? 1 : 0, crease: isOpen(st) ? P.crease : 0, shell: shelled(st) ? 1 : 0, rot: !!st.rot, mirrored: !!st.mirrored, tall: st.kind === "device" && tallOf(DEVICES[st.dev]), look: shelled(st) ? lookOf(st) : lookAt(S, now) }, f.s, S.fadeB.layers, now, S.unitOp.b.at(now));
  } else S.UB.el.hidden = true;
}
export function drawRuler(S: Scene, now: number) {
  const op = S.rulerOp.at(now);
  if (S.focusW && !S.tr && !S.queued && op > .99) { S.focusW = false; S.RL.w.focus(); }
  if (op < .01) { S.roll.w.snap(S.cur!.w); S.roll.h.snap(S.cur!.h); }
  S.RL.el.hidden = op < .01 && !S.editing;
  if (S.RL.el.hidden) return;
  S.RL.el.style.opacity = String(op);
  const { cx } = room(S), g = Math.max(P.gap, (edgeOf(lookAt(S, now)) * S.V.s.at(now) + 6) * S.shellOp.at(now)), w = S.V.w.at(now), h = S.V.h.at(now), T = S.V.y.at(now);
  const L = cx - w / 2, R = cx + w / 2, B = T + h, M = (T + B) / 2, yr = T - g - 15, xr = L - g - 22, a = 4.5;
  for (const [axis, el] of [["w", S.RL.w], ["h", S.RL.h]] as [Axis, HTMLInputElement][]) {
    if (document.activeElement === el) continue;
    const v = String(Math.round(S.roll[axis].at(now)));
    if (S.RL.shown[axis] !== v) { el.value = v; S.RL.shown[axis] = v; }
  }
  const gw = clamp(S.RL.w.value.length * 7.2 + 16, 0, R - L - 4 * a) / 2, gh = clamp(30, 0, B - T - 4 * a) / 2;
  const f = (v: number) => v.toFixed(1);
  S.RL.ext.setAttribute("d", `M${f(L)} ${f(T - g)}V${f(yr - 5)}M${f(R)} ${f(T - g)}V${f(yr - 5)}M${f(L - g)} ${f(T)}H${f(xr - 5)}M${f(L - g)} ${f(B)}H${f(xr - 5)}`);
  S.RL.dim.setAttribute("d",
    `M${f(L)} ${f(yr)}H${f(cx - gw)}M${f(cx + gw)} ${f(yr)}H${f(R)}` +
    `M${f(L + a)} ${f(yr - a)}L${f(L)} ${f(yr)}L${f(L + a)} ${f(yr + a)}M${f(R - a)} ${f(yr - a)}L${f(R)} ${f(yr)}L${f(R - a)} ${f(yr + a)}` +
    `M${f(xr)} ${f(T)}V${f(M - gh)}M${f(xr)} ${f(M + gh)}V${f(B)}` +
    `M${f(xr - a)} ${f(T + a)}L${f(xr)} ${f(T)}L${f(xr + a)} ${f(T + a)}M${f(xr - a)} ${f(B - a)}L${f(xr)} ${f(B)}L${f(xr + a)} ${f(B - a)}`);
  S.RL.w.style.left = cx + "px"; S.RL.w.style.top = yr + "px";
  S.RL.h.style.left = xr + "px"; S.RL.h.style.top = M + "px";
}

function place(img: HTMLImageElement, spec: SceneImage | null, x: number, w: number, h: number, op: number, blur: number, y = 0) {
  if (!spec || op <= .001) { img.style.opacity = "0"; return; }
  if (img.dataset.u !== spec.url) { img.src = spec.url; img.dataset.u = spec.url; }
  img.style.left = x + "px"; img.style.top = y + "px"; img.style.width = w + "px"; img.style.height = h + "px";
  img.style.opacity = String(op);
  img.style.filter = blur > .05 ? `blur(${blur.toFixed(2)}px)` : "none";
}
const putCam = (el: HTMLElement, b: Box, dx: number, dy: number, op: number, turn = 0) => {
  Object.assign(el.style, { left: b.left + dx + "px", top: b.top + dy + "px", width: b.width + "px", height: b.height + "px", borderRadius: b.corners, opacity: b.on ? op : 0 });
  el.classList.toggle("lens", !!b.lens);
  if (!b.lens) return;
  const [gx, gy] = glintAt(turn);
  for (const [k, v] of [["--lens-inset", LENS.inset * b.lens + "px"], ["--lens-ring", LENS.ring * b.lens + "px"], ["--lens-glint-x", gx], ["--lens-glint-y", gy], ["--lens-glint", LENS.glint * 100 + "%"]]) el.style.setProperty(k, v);
};
const putCams = (els: HTMLElement[], boxes: Box[], dx: number, dy: number, op: number, turn = 0) => els.forEach((el, i) => boxes[i] ? putCam(el, boxes[i], dx, dy, op, turn) : (el.style.opacity = "0"));
