import { DEVICES as e, DEVICE_MENU as t } from "./devices.js";
import { reduced as n } from "./motion.js";
import { phrase as r } from "./strings.js";
import { createStore as i } from "./store.js";
// src/scene/calc.ts
var a = (e, t, n) => e + (t - e) * n, o = (e, t, n) => Math.min(n, Math.max(t, e)), s = (e, t, n) => {
	let r = o((n - e) / (t - e), 0, 1);
	return r * r * (3 - 2 * r);
}, c = (e) => 1 - (1 - e) ** 3, l = (e) => `color-mix(in srgb, var(--device-shade) ${(e * 100).toFixed(1)}%, transparent)`, u = (e, t) => ({
	w0: 2 * Math.PI / Math.max(.05, e),
	z: 1 - o(t, 0, .95)
});
function d({ w0: e, z: t }, n, r, i) {
	if (t < 1) {
		let a = e * Math.sqrt(1 - t * t), o = Math.exp(-t * e * i), s = (r + t * e * n) / a, c = Math.cos(a * i), l = Math.sin(a * i);
		return [o * (n * c + s * l), o * ((s * a - t * e * n) * c - (n * a + t * e * s) * l)];
	}
	let a = Math.exp(-e * i), o = r + e * n;
	return [a * (n + o * i), a * (o - e * (n + o * i))];
}
function f(e, t, n, r) {
	let i = 3 * e, a = 3 * (n - e) - i, o = 1 - i - a, s = 3 * t, c = 3 * (r - t) - s, l = 1 - s - c, u = (e) => ((o * e + a) * e + i) * e, d = (e) => ((l * e + c) * e + s) * e, f = (e) => (3 * o * e + 2 * a) * e + i;
	return (e) => {
		if (e <= 0) return 0;
		if (e >= 1) return 1;
		let t = e;
		for (let n = 0; n < 8; n++) {
			let n = u(t) - e;
			if (Math.abs(n) < 1e-6) return d(t);
			let r = f(t);
			if (Math.abs(r) < 1e-6) break;
			t -= n / r;
		}
		let n = 0, r = 1;
		for (t = e; r - n > 1e-6;) u(t) < e ? n = t : r = t, t = (n + r) / 2;
		return d(t);
	};
}
var p = class {
	to;
	x0 = 0;
	v0 = 0;
	t0 = 0;
	sp = null;
	constructor(e = 0) {
		this.to = e;
	}
	d(e) {
		if (!this.sp) return [0, 0];
		let t = (e - this.t0) / 1e3;
		return t <= 0 ? [this.x0, 0] : d(this.sp, this.x0, this.v0, t);
	}
	at(e) {
		return this.to + this.d(e)[0];
	}
	set(e, t, n, r = 0) {
		let [i, a] = this.d(n), o = this.to + i, s = this.sp && (Math.abs(i) > 1e-4 || Math.abs(a) > 1e-4);
		this.x0 = o - e, this.v0 = a, this.to = e, this.sp = t, this.t0 = n + (s ? 0 : r);
	}
	snap(e) {
		this.to = e, this.sp = null, this.x0 = 0, this.v0 = 0;
	}
	done(e, t = .25) {
		let [n, r] = this.d(e);
		return Math.abs(n) < t && Math.abs(r) < t * 20;
	}
}, m = class {
	ease;
	a;
	b;
	t0 = 0;
	dur = 0;
	constructor(e = 0, t = c) {
		this.ease = t, this.a = e, this.b = e;
	}
	at(e) {
		if (this.dur <= 0) return this.b;
		let t = o((e - this.t0) / this.dur, 0, 1);
		return a(this.a, this.b, this.ease(t));
	}
	to(e, t, n) {
		this.a = this.at(n), this.b = e, this.t0 = n, this.dur = t;
	}
	snap(e) {
		this.a = this.b = e, this.dur = 0;
	}
	done(e) {
		return this.dur <= 0 || e - this.t0 >= this.dur;
	}
}, h = (e, t) => {
	let n = e;
	for (let e = 0; e < (t % 4 + 4) % 4; e++) n = [
		n[3],
		n[0],
		n[1],
		n[2]
	];
	return n;
}, g = (e) => e.plate?.axis === "height", _ = (e, t) => g(e) ? {
	w: e[t].h,
	h: e[t].w
} : e[t];
function v(e, t, n) {
	let r = e.w > e.h, i = n ? "landscape-right" : (t ? e.h : e.w) > (t ? e.w : e.h) ? "landscape-left" : "portrait", a = n ? r ? 180 : 90 : t ? r ? 90 : -90 : 0;
	return {
		orientation: i,
		angle: a,
		mirrored: a < 0 || a === 180
	};
}
var y = (e) => e.rad ?? e.notch ?? Math.min(e.w, e.h) / 2, b = (e) => e.flat ?? (e.notch === void 0 ? 0 : 1);
function x(e, t, n, r, i, a = !1) {
	let o = r.edge === "right" ? 1 : r.edge === "bottom" ? 2 : 0, s = (o + +!!n + (a ? 2 : 0)) % 4, c = (o % 2 ? t : e) * i, l = (o % 2 ? e : t) * i, u = {
		left: (o === 2 ? 1 - (r.x ?? .5) : r.x ?? .5) * c - r.w * i / 2,
		top: r.y * i,
		width: r.w * i,
		height: r.h * i
	};
	for (let e = 0; e < s; e++) u = {
		left: l - u.top - u.height,
		top: u.left,
		width: u.height,
		height: u.width
	}, [c, l] = [l, c];
	let d = y(r) * i, f = b(r), p = [
		d,
		d,
		d,
		d
	], m = .5 * i, h = u.left <= m, g = u.top <= m, _ = u.left + u.width >= c - m, v = u.top + u.height >= l - m;
	for (let e of [
		[0, 1],
		[1, 2],
		[2, 3],
		[3, 0]
	][s]) p[e] = d * (1 - f);
	return [
		h || g,
		g || _,
		_ || v,
		v || h
	].forEach((e, t) => {
		e && (p[t] = d * (1 - f));
	}), {
		...u,
		corners: p.map((e) => e + "px").join(" "),
		on: r.w * i > .5,
		lens: r.lens ? i : 0
	};
}
var S = {
	inset: 3,
	ring: 2,
	shift: .12,
	glint: .14
}, C = (e) => {
	let t = e * Math.PI / 180, n = Math.cos(t), r = Math.sin(t), i = -S.shift, a = -S.shift, o = (e) => (.5 + e - S.glint / 2) * 100 + "%";
	return [o(i * n + a * r), o(-i * r + a * n)];
}, w = Math.max(1, ...Object.values(e).flatMap((e) => Object.values(e.look).map((e) => e.cams.length))), T = .62, E = {
	rotDur: .6,
	rotLift: .42,
	rotLand: .18,
	rotDip: .12,
	shellK: 1.6,
	frameDur: .45,
	frameBounce: 0,
	outlineBounce: 0,
	outlineLead: 0,
	veil: .06,
	foldDur: 1,
	foldLift: .42,
	foldLand: .18,
	perspective: 3200,
	shade: .22,
	swapDur: 220,
	swapBlur: 8,
	swapNear: .15,
	spinSwapA: .35,
	spinSwapB: .65,
	holdBlur: 24,
	holdRise: 150,
	holdLight: 8,
	holdDeepAfter: 250,
	holdDeepen: 200,
	fastReveal: 120,
	revealFade: 240,
	revealDur: 280,
	swapZoom: .03,
	moveBlur: 6,
	settleSharp: 220,
	reducedFade: 240,
	reducedDim: .62,
	gap: 7,
	crease: .35,
	foldBlur: 24,
	foldDark: .85,
	shrinkFrom: 90,
	ambient: .35,
	screenDim: .6,
	lightAz: 125,
	lightEl: 55,
	arcSegs: 4
}, D = 240, O = 1600, k = (e) => e.shiftKey ? 10 : 1, A = (e) => e.kind === "preset" || e.kind === "custom", j = (e) => e.kind === "device", M = (t, n, r) => {
	let i = e[t.dev][n ? "cover" : "open"], a = r !== "portrait";
	return `${t.dev}:${n ? "cover" : "open"}${a === i.w > i.h ? "" : ":rot"}${r === "landscape-right" ? ":right" : ""}`;
}, N = (t) => t.kind === "device" && e[t.dev].fold && !t.folded, P = (t) => e[t.dev].look[t.folded ? "cover" : "open"], F = (e) => e.ends ?? e.bezel, I = (e) => Math.max(e.bezel, F(e)) * E.shellK, L = (e) => {
	if (!j(e)) return [0, 0];
	let t = P(e), n = t.bezel * E.shellK, r = F(t) * E.shellK;
	return e.rot ? [2 * r, 2 * n] : [2 * n, 2 * r];
}, R = (e) => `${Math.round(e.w)}×${Math.round(e.h)}`, z = (t) => {
	let n = e[t.dev][t.folded ? "cover" : "open"].cutIn, r = t.right ? "landscape-right" : t.w > t.h ? "landscape-left" : "portrait";
	return n[r] ?? n[r === "landscape-right" ? "landscape-left" : "landscape-right"] ?? "";
}, ee = (e) => ({
	old: {
		r: e,
		held: !1,
		grow: new m(0, (e) => s(0, 1, e)),
		blur: new m(0),
		veil: new m(0),
		op: new m(1)
	},
	neu: {
		r: null,
		op: new m(0),
		blur: new m(0)
	},
	swap: null
}), B = (e, t) => o((t - e.t0) / e.dur, 0, 1), te = (e) => E.swapBlur * 4 * e * (1 - e), ne = (e) => e < .5 ? te(e) : a(E.swapBlur, 0, s(.5, 1, e)), re = (e, t, n, r) => {
	let i = e.edge !== t.edge, a = i ? n < .5 ? 1 - 2 * n : 2 * n - 1 : 1, o = i && n < .5 ? e : t;
	return {
		w: i ? o.w * a : r(e.w, t.w),
		h: r(e.h, t.h),
		y: r(e.y, t.y),
		x: i ? o.x ?? .5 : r(e.x ?? .5, t.x ?? .5),
		rad: r(y(e), y(t)),
		flat: r(b(e), b(t)),
		edge: o.edge,
		lens: (o.w > 0 ? o : e).lens
	};
}, ie = (e, t, n, r) => Array.from({ length: Math.max(e.length, t.length) }, (i, a) => re(e[a] ?? {
	...t[a],
	w: 0,
	h: 0
}, t[a] ?? {
	...e[a],
	w: 0,
	h: 0
}, n, r)), ae = (e, t, n, r, i, a, o) => {
	let s = F(e) * E.shellK, c = s * T, l = x(t, n, r, {
		w: c,
		h: c,
		y: n + (s - c) / 2
	}, i, a);
	return {
		...l,
		on: l.on && o > .01
	};
}, oe = () => n.matches, se = (e) => o(1 - e / 24, 0, 1), V = (e, t, n) => {
	if (!n) return {
		w: e.dpW,
		h: e.dpH
	};
	let r = Math.max(t.w / e.dpW, t.h / e.dpH);
	return {
		w: e.dpW * r,
		h: e.dpH * r
	};
}, H = (() => {
	let e = E.lightAz * Math.PI / 180, t = E.lightEl * Math.PI / 180;
	return [
		Math.cos(t) * Math.cos(e),
		-Math.cos(t) * Math.sin(e),
		Math.sin(t)
	];
})(), ce = (e) => o(E.ambient + (1 - E.ambient) * Math.max(0, e[0] * H[0] + e[1] * H[1] + e[2] * H[2]) / H[2], 0, 1.5), le = (e) => [
	1,
	3,
	5
].map((t) => parseInt(e.slice(t, t + 2), 16)), ue = (e, t) => `rgb(${e.map((e) => Math.round(t <= 1 ? e * t : e + (255 - e) * (t - 1) * .5)).join(" ")})`, de = (e, t) => {
	let n = ue(e, t);
	return `linear-gradient(90deg, ${`color-mix(in srgb, ${n}, var(--device-veil) 18%)`} 0, ${n} 10%, ${n} 90%, ${`color-mix(in srgb, ${n}, var(--device-shade) 20%)`} 100%)`;
}, fe = (e) => e <= 1 ? ["var(--device-shade)", E.screenDim * (1 - e)] : ["var(--device-veil)", (e - 1) * .25], pe = (e) => {
	let t = [], n = 0, r = 0;
	for (let i = 0; i < e.length; i++) {
		let a = e[i];
		a === "(" ? n++ : a === ")" ? n-- : a === "," && !n && (t.push(e.slice(r, i)), r = i + 1);
	}
	return [...t, e.slice(r)].filter((e) => e.trim());
}, U = (e) => e.toFixed(2) + "px", W = (e) => e.map(U).join(" ");
function me([e, t, n, r], [i, a, o, s], c) {
	let l = [], u = 90 / c, d = (e) => e * Math.PI / 180, f = (e) => 2 * e * Math.tan(d(u) / 2), p = (e, t, n, r) => {
		for (let i = 0; i < c; i++) {
			let a = r + (i + .5) * u;
			l.push({
				x: e + n * Math.cos(d(a)),
				y: t + n * Math.sin(d(a)),
				a,
				len: f(n)
			});
		}
	};
	return l.push({
		x: (e + i + n - a) / 2,
		y: t,
		a: 270,
		len: n - a - e - i
	}), p(n - a, t + a, a, 270), l.push({
		x: n,
		y: (t + a + r - o) / 2,
		a: 0,
		len: r - o - t - a
	}), p(n - o, r - o, o, 0), l.push({
		x: (e + s + n - o) / 2,
		y: r,
		a: 90,
		len: n - o - e - s
	}), p(e + s, r - s, s, 90), l.push({
		x: e,
		y: (t + i + r - s) / 2,
		a: 180,
		len: r - s - t - i
	}), p(e + i, t + i, i, 180), l;
}
var he = (e, t, n) => e.map(([e, r, i, a, o]) => `${U((e * Math.cos(t) + r * Math.sin(t)) * n)} ${U((-e * Math.sin(t) + r * Math.cos(t)) * n)} ${U(i * n)} ${U(a * n)} ${o}`).join(", "), ge = (e) => {
	let t = e.open, n = e.look.open, r = 19 / Math.max(t.w, t.h), i = t.w * r, a = t.h * r, s = 10 - i / 2, c = 10 - a / 2, l = 1.4, u = (e) => e.toFixed(2), d = o((Math.max(...n.radius) + n.bezel * E.shellK) * r * 1.8, 1.2, Math.min(i, a) / 3), f = l / 2 + o(n.bezel * E.shellK * r, .9, 2.2), p = Math.max(.4, d - f + l / 2), m = g(e), h = (e, t, n, r) => `<rect x="${u(e)}" y="${u(t)}" width="${u(n)}" height="${u(r)}" rx="${u(p)}" fill="currentColor" fill-opacity=".16"/>`, _ = e.fold ? m ? h(s + f, c + f, i - 2 * f, a / 2 - f - .4) + h(s + f, c + a / 2 + .4, i - 2 * f, a / 2 - f - .4) : h(s + f, c + f, i / 2 - f - .4, a - 2 * f) + h(s + i / 2 + .4, c + f, i / 2 - f - .4, a - 2 * f) : h(s + f, c + f, i - 2 * f, a - 2 * f), v = "", y = n.cuts[0];
	if (y) {
		let e = s + i * (y.x ?? .5), t = c + f + 1.1;
		v = y.edge === "right" ? `<rect x="${u(s + i - f - 1.7)}" y="${u(c + a * (y.x ?? .5) - 1.8)}" width="1.2" height="3.6" rx=".6" fill="currentColor"/>` : y.w > y.h * 3 ? `<rect x="${u(e - 1.8)}" y="${u(t - .6)}" width="3.6" height="1.2" rx=".6" fill="currentColor"/>` : `<circle cx="${u(e)}" cy="${u(t)}" r=".75" fill="currentColor"/>`;
	}
	let b = e.fold ? `<path d="${m ? `M${u(s)} ${u(c + a / 2)}H${u(s + i)}` : `M${u(s + i / 2)} ${u(c)}V${u(c + a)}`}" stroke="currentColor" stroke-width=".8"/>` : "";
	return `${_}<rect x="${u(s + l / 2)}" y="${u(c + l / 2)}" width="${u(i - l)}" height="${u(a - l)}" rx="${u(d)}" fill="none" stroke="currentColor" stroke-width="${l}"/>${b}${v}`;
}, _e = (e) => e.kind === "device" ? e.dev : e.sel, ve = (e) => `${Math.round(e.open.w)}×${Math.round(e.open.h)}`, ye = {
	menu: !1,
	orientMenu: !1,
	locked: !1,
	checked: "",
	rows: {},
	sumTitle: "",
	posture: !1,
	sliders: !1,
	foldable: !1,
	folded: !1,
	orientFixed: !1,
	orientation: "portrait",
	hinge: !0,
	slW: 240,
	slH: 240
}, be = (e) => `${((e - 240) / 1360 * 100).toFixed(3)}%`;
// src/scene/draw.ts
function xe(e, t, n, r) {
	let i = e.stretchOf.get(t);
	(i || !e.seeding || e.seeding.has(t)) && (i || (i = {
		w0: Math.max(n, 1),
		h0: Math.max(r, 1),
		k: [1, 1]
	}, e.stretchOf.set(t, i), Object.assign(t.style, {
		width: U(i.w0),
		height: U(i.h0)
	})), i.k = [n / i.w0, r / i.h0], t.style.transform = `scale(${i.k[0].toFixed(5)}, ${i.k[1].toFixed(5)})`);
}
function Se(e) {
	e.RG.F.base.cast.style.background = `linear-gradient(90deg, ${l(1)}, ${l(.35)} 45%, ${l(0)} 90%)`;
	for (let [t, n] of [[e.RG.F.inner, "to left"], [e.RG.F.outer, "to right"]]) t.dark.style.background = `linear-gradient(${n}, ${[
		0,
		.2,
		.4,
		.6,
		.8,
		1
	].map((e) => `${l(Math.min(1, 2 * Math.max(0, (e - .2) / .8) ** 1.35) * E.foldDark)} ${e * 100}%`).join(", ")})`, t.blurs.forEach(({ el: e }, t) => {
		e.style.webkitMaskImage = e.style.maskImage = `linear-gradient(${n}, transparent ${((t + .5) / 4 * 100).toFixed(1)}%, var(--device-shade) ${((t + 1) / 4 * 100).toFixed(1)}%)`;
	});
}
function Ce(e, t, n, r, i, a, o, s, c = 0, l = 1) {
	let u = _(e.rig.d, i ? "cover" : "open");
	Ie(t, n, (u.w - r.w) * o / 2 - a * o, r.w * o, r.h * o, l, c, (u.h - r.h) * o / 2), t.style.transform = `rotate(${-lt(e, s).angle}deg)`;
}
function we(e, t, n, r, i, a) {
	let o = e.layer.old, s = e.layer.neu, c = e.rig.oldSpec, l = n === e.rig.plan.outer, u = (t, o, s, c, u = 1) => Ce(e, t, o, s, l, n.du, r, i, c * a, u);
	if (n.role === "crisp") u(t.old, c, {
		w: c.dpW,
		h: c.dpH
	}, e.rig.restBlur), t.veil.style.opacity = "0";
	else if (e.rig.cached) {
		let n = e.rig.to.img;
		u(t.old, n, {
			w: n.dpW,
			h: n.dpH
		}, 0), t.veil.style.opacity = "0", t.neu.style.opacity = "0", t.el.style.background = n.edge;
		return;
	} else u(t.old, c, V(c, n.frame, o.grow.b > 0), o.blur.at(i)), t.veil.style.opacity = String(o.veil.at(i));
	n.neu && s.r ? u(t.neu, s.r, {
		w: s.r.dpW,
		h: s.r.dpH
	}, s.blur.at(i), s.op.at(i)) : t.neu.style.opacity = "0", t.el.style.background = (s.r && s.op.at(i) > .5 && n.neu ? s.r : c).edge;
}
function Te(e, t, n) {
	let { angle: r, cy: i } = lt(e, n);
	t.style.transformOrigin = `${K(e).cx}px ${i}px`, t.style.transform = `rotate(${r}deg)`;
}
function Ee(e, t, { body: n, span: r, bodyR: i, scr: a, scrR: s, backScrR: c, T: l, normal: u, tone: d, hk: f, hingeLeft: p, u: m }) {
	let [h, g, _, v] = n, y = _ - h, b = v - g, x = ((e) => e.map((e) => o(e, 0, Math.min(y, b) / 2)))(i), S = (e) => [
		e[1],
		e[0],
		e[3],
		e[2]
	];
	for (let [n, i] of [[t.front, !1], [t.back, !0]]) {
		let t = i ? _ - a[2] : a[0] - h, o = i ? S(c || s) : s, v = a[2] - a[0], C = a[3] - a[1];
		if (Object.assign(n.body.style, {
			left: U(h),
			top: U(g),
			width: U(y),
			height: U(b),
			backgroundColor: ue(d, 1),
			borderRadius: W(i ? S(x) : x),
			transform: i ? `translateZ(${U(-l)}) rotateY(180deg)` : "none"
		}), n.clip && Object.assign(n.clip.style, {
			left: U(t),
			top: U(a[1] - g),
			width: U(v),
			height: U(C),
			borderRadius: W(o)
		}), n.ring) {
			let r = 2 * m / e.rig.z, s = r * f, [c, l] = p ? [s, r] : [r, s], [u, d] = i ? [l, c] : [c, l];
			Object.assign(n.ring.style, {
				left: U(t - u),
				top: U(a[1] - g - r),
				width: U(v + u + d),
				height: U(C + 2 * r),
				borderWidth: `${U(r)} ${U(d)} ${U(r)} ${U(u)}`,
				borderRadius: W(o.map((e) => e + r))
			});
		}
		if (n.lit) {
			let [e, t] = fe(ce(u([
				0,
				0,
				i ? -1 : 1
			])));
			n.lit.style.background = e, n.lit.style.opacity = t.toFixed(4);
		}
		n.gloss.style.left = i ? "0px" : U(r[0] - h), xe(e, n.gloss, i ? y : r[1] - r[0], b);
		for (let t of n.fit) xe(e, t, v, C);
	}
	let C = me(n, x, E.arcSegs);
	for (; t.strips.length < C.length;) {
		let e = document.createElement("div");
		e.className = "strip", t.el.append(e), t.strips.push(e);
	}
	t.strips.forEach((e, t) => {
		let n = C[t];
		if (!n || n.len < .05 || l < .05) {
			e.style.display = "none";
			return;
		}
		let r = n.len + .6 * m, i = n.a * Math.PI / 180;
		Object.assign(e.style, {
			display: "",
			width: U(l),
			height: U(r),
			marginLeft: U(-l / 2),
			marginTop: U(-r / 2),
			transform: `translate3d(${U(n.x)},${U(n.y)},${U(-l / 2)}) rotateZ(${n.a.toFixed(3)}deg) rotateY(90deg)`
		}), e.style.background = de(d, ce(u([
			Math.cos(i),
			Math.sin(i),
			0
		])));
	});
}
function De(e, t, n, r) {
	let i = e.rig.d.plate.blur && n > .01, a = Number(t.neu.style.opacity) > .5 ? t.neu : t.old;
	t.blurs.forEach(({ el: t, inv: o, img: s }, c) => {
		let l = E.foldBlur * n * ((c + 1) / 4) ** 1.35 * r, u = parseFloat((/blur\(([\d.]+)px\)/.exec(a.style.filter) || ["0", "0"])[1]);
		if (t.style.opacity = i && l > .2 ? "1" : "0", !i || l <= .2) return;
		s.src !== a.src && (s.src = a.src);
		let [d, f] = e.stretchOf.get(t).k;
		o.style.transform = `scale(${(1 / d).toFixed(5)}, ${(1 / f).toFixed(5)})`, Object.assign(s.style, {
			left: a.style.left,
			top: a.style.top,
			width: a.style.width,
			height: a.style.height,
			transform: a.style.transform,
			filter: `blur(${Math.max(l, u).toFixed(2)}px)`
		});
	}), t.dark.style.opacity = i ? n.toFixed(4) : "0";
}
function Oe(e, { hu: t, T0: n, Bv: r, t: i, s: o, k: s, sn: c, cs: l, lift: u, tone: d, u: f }) {
	let p = e.rig.d, m = p.open.hinge, h = 3 * f;
	p.look.open.btn.forEach((g, _) => {
		let v = p.look.cover.btn[_], y = g.at < m, b = a(y ? m - g.at - g.len : g.at - m, v.at, y ? s : 0), x = a(y ? m - g.at : g.at + g.len - m, v.at + v.len, y ? s : 0), [S, C] = y ? [-x * l, -b * l].sort((e, t) => e - t) : [b, x], w = (b + x) / 2;
		Object.assign(e.RG.btns[_].style, {
			left: U(t + S * o),
			top: U(g.side > 0 ? n - i - h + .5 * f : n + r + i - .5 * f),
			width: U((C - S) * o),
			height: U(h),
			backgroundColor: d,
			opacity: +((y ? a(g.len, v.len, s) : g.len) * o > .5 * f),
			transform: `translateZ(${U(u + (y ? w * o * c : 0))})`
		});
	});
}
var ke = (e) => e.elevationOf ??= pe(getComputedStyle(e.rigEl).getPropertyValue("--elevation-2")).map((e) => {
	let t = /^\s*(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(.+)$/.exec(e);
	return t ? [
		+t[1],
		+t[2],
		+t[3],
		+t[4],
		t[5].trim()
	] : null;
}).filter((e) => e !== null);
function Ae(e, t) {
	let { th: n, s: r, hx: i, top: o, cy: c, angle: u } = lt(e, t), d = e.rig.sRef, f = r / d, p = 1 / f, m = c - (c - o) * d / r, _ = n / 180, v = n * Math.PI / 180, y = Math.sin(v), b = Math.cos(v), x = e.rig.d, S = Y(e, t), C = S.bezel * E.shellK * d, [w, T] = ot(e, S).map((e) => e * d), D = le(S.tone), O = a(e.rig.half.u, e.rig.cover.u, _) * d, k = a(e.rig.half.v, e.rig.cover.v, _) * d, A = a(e.rig.half.u, Math.min(e.rig.half.u, e.rig.cover.u), s(E.shrinkFrom, 180, n)) * d, j = k, M = x.plate.thickness * d, N = x.plate.gap * d / 2, P = (M + 2 * N) * (1 - b) / 2, F = s(20, 160, n), I = w * F, L = g(x) ? 3 : 0, R = h(x.look.open.radius, L).map((e) => e * d), z = h(x.look.cover.radius, L).map((e) => e * d), ee = s(60, 120, n), B = (e, t) => a(e, t, ee) + C, te = [
		B(R[0], z[0]) * F,
		B(R[1], z[1]),
		B(R[2], z[2]),
		B(R[3], z[3]) * F
	], ne = [
		B(R[0], z[1]),
		B(R[1], z[0]) * F,
		B(R[2], z[3]) * F,
		B(R[3], z[2])
	], re = te[1], ie = te[0], oe = `${U(i)} ${U(c)}`, V = f.toFixed(5);
	Object.assign(e.RG.lift.style, {
		perspective: E.perspective + "px",
		perspectiveOrigin: oe
	}), Object.assign(e.RG.space.style, {
		transformOrigin: oe,
		transform: `scale3d(${V},${V},${V}) translateZ(${U(-P)})`
	});
	let H = u * Math.PI / 180, ue = Math.cos(H), fe = Math.sin(H), pe = (e) => [
		e[0] * ue - e[1] * fe,
		e[0] * fe + e[1] * ue,
		e[2]
	], W = (e) => [
		e[0] * b + e[2] * y,
		e[1],
		-e[0] * y + e[2] * b
	];
	for (let t of [e.RG.base, e.RG.leaf]) Object.assign(t.el.style, {
		left: U(i),
		top: U(m)
	});
	e.RG.leaf.el.style.transform = `translateZ(${U(N)}) rotateY(${n.toFixed(3)}deg) translateZ(${U(-N)})`;
	let me = [-O - w, A + w];
	Ee(e, e.RG.base, {
		body: [
			-I,
			-T,
			A + w,
			j + T
		],
		span: me,
		bodyR: te,
		scr: [
			0,
			0,
			A,
			j
		],
		scrR: [
			R[0] * F,
			R[1],
			R[2],
			R[3] * F
		],
		T: M,
		normal: pe,
		tone: D,
		hk: F,
		hingeLeft: !0,
		u: p
	}), Ee(e, e.RG.leaf, {
		body: [
			-O - w,
			-T,
			I,
			k + T
		],
		span: me,
		bodyR: ne,
		scr: [
			-O,
			0,
			0,
			k
		],
		scrR: [
			R[0],
			R[1] * F,
			R[2] * F,
			R[3]
		],
		backScrR: [
			z[1],
			z[0] * F,
			z[3] * F,
			z[2]
		],
		T: M,
		normal: (e) => pe(W(e)),
		tone: D,
		hk: F,
		hingeLeft: !1,
		u: p
	}), we(e, e.RG.F.base, e.rig.plan.base, d, t, p), we(e, e.RG.F.inner, e.rig.plan.inner, d, t, p), we(e, e.RG.F.outer, e.rig.plan.outer, d, t, p), De(e, e.RG.F.inner, n <= 90 ? y : 0, p), De(e, e.RG.F.outer, n > 90 ? y : 0, p);
	let ge = rt(e, !1, d), _e = x.open.hinge * d;
	Re(e.RG.F.outer.cams, rt(e, !0, d), 0, 0, 1, u), Re(e.RG.F.inner.cams, ge, 0, 0, 1, u), Re(e.RG.F.base.cams, ge, -_e, 0, 1, u);
	let ve = (e) => {
		let t = x[e ? "cover" : "open"], n = Number(x.look[e ? "cover" : "open"].home) || 0;
		return [ae(S, t.w, t.h, g(x), d, g(x), n), n];
	}, [ye, be] = ve(!1), [xe, Se] = ve(!0);
	Le(e.RG.base.front.home, ye, I - _e, T, be), Le(e.RG.leaf.front.home, ye, w, T, be), Le(e.RG.leaf.back.home, xe, I, T, Se);
	let Ce = E.shade * (.85 * s(90, 180, n) + .25 * y);
	e.RG.F.base.cast.style.opacity = Ce.toFixed(4);
	let Te = -I, Ae = -M, je = -M - N, Me = I * b + je * y, Ne = N - I * y + je * b, Pe = Math.hypot(Me - Te, Ne - Ae), Fe = Math.atan2(-(Ne - Ae), Me - Te), Ie = j + 2 * T;
	Object.assign(e.RG.spine.style, {
		display: Pe > .3 && M > .05 ? "" : "none",
		left: U(i),
		top: U(m - T),
		width: U(Pe + .6 * p),
		height: U(Ie),
		marginLeft: U(-(Pe + .6 * p) / 2),
		borderRadius: `${U(Math.min(ie, (Pe + .6 * p) / 2))} / ${U(ie)}`,
		transform: `translate3d(${U((Te + Me) / 2)},0,${U((Ae + Ne) / 2)}) rotateY(${(Fe * 180 / Math.PI).toFixed(3)}deg)`
	}), e.RG.spine.style.background = de(D, ce(pe([
		Math.sin(Fe),
		0,
		Math.cos(Fe)
	])));
	let G = i - O * b, ze = Math.min(i - I, G - w), K = Math.max(i + A + w, G + w);
	Object.assign(e.RG.plate.style, {
		left: U(ze),
		top: U(m - T),
		width: U(K - ze),
		height: U(j + 2 * T),
		borderRadius: U(re),
		transform: `translateZ(${U(-M - p)})`,
		boxShadow: he([...ke(e), [
			0,
			10 + 18 * y,
			30 + 34 * y,
			0,
			l(.05 * y)
		]], H, p)
	}), g(x) ? Oe(e, {
		hu: i,
		T0: m,
		Bv: j,
		t: T,
		s: d,
		k: _,
		sn: y,
		cs: b,
		lift: P,
		tone: S.tone,
		u: p
	}) : S.btn.forEach((t, n) => {
		Object.assign(e.RG.btns[n].style, {
			left: U(Math.max(i + A, G) + w - .5 * p),
			top: U(m + t.at * d),
			width: U(3 * p),
			height: U(t.len * d),
			backgroundColor: S.tone,
			opacity: +(t.len * d > .5 * p),
			transform: `translateZ(${U(P)})`
		});
	});
	let Be = se(n), Ve = E.crease * Be;
	Object.assign(e.RG.crease.style, {
		left: U(i),
		top: U(m),
		width: U(14 * p),
		marginLeft: U(-7 * p),
		height: U(j),
		opacity: Ve * e.hingeOp.at(t)
	});
	let q = i - (ue + fe > 0 ? 0 : p);
	Object.assign(e.RG.tTop.style, {
		left: U(q),
		top: U(m - T),
		width: U(p),
		height: U(T),
		opacity: Be
	}), Object.assign(e.RG.tBot.style, {
		left: U(q),
		top: U(m + j),
		width: U(p),
		height: U(T),
		opacity: Be
	});
}
function je(e, t, n, r, i) {
	let o = r.old, c = r.neu, l = r.swap, u = l ? B(l, i) : 0, d = l ? s(0, 1, u) : c.op.at(i), f = l ? ne(u) : c.blur.at(i), p = Math.max(o.blur.at(i), l ? ne(u) : 0);
	if (e.l0.style.transform = e.l1.style.transform = "", o.r) {
		let r = o.held ? o.grow.at(i) : 0, s = V(o.r, {
			w: t.w / n,
			h: t.h / n
		}, r > 0), c = a(o.r.dpW, s.w, r) * n, l = a(o.r.dpH, s.h, r) * n;
		Ie(e.l0, o.r, (t.w - s.w * n) / 2 * r, c, l, o.op.at(i), p, (t.h - s.h * n) / 2 * r);
	} else e.l0.style.opacity = "0";
	e.veil.style.opacity = String(o.veil.at(i)), c.r ? Ie(e.l1, c.r, 0, c.r.dpW * n, c.r.dpH * n, d, f) : e.l1.style.opacity = "0";
	let m = c.r ? l ? s(0, 1, u) : d : 0;
	return m > 0 && m < 1 && (e.l0.style.transformOrigin = e.l1.style.transformOrigin = "50% 50%", e.l0.style.transform = `scale(${(1 + E.swapZoom * m).toFixed(4)})`, e.l1.style.transform = `scale(${(1 - E.swapZoom * (1 - m)).toFixed(4)})`), c.r && d > .5 ? c.r : o.r;
}
function Me(e, t, n, r, i) {
	let { p: o } = pt(e, i), c = e.spin.dir * 90 * o, l = c * Math.PI / 180, u = e.layer.old, d = (e, t, r, i, a, o = 0, s = 0) => {
		Ie(e, t, (n.w - r.w) / 2 + o, r.w, r.h, i, a, (n.h - r.h) / 2 + s), e.style.transform = `rotate(${(-c).toFixed(3)}deg)`;
	};
	if (t.veil.style.opacity = String(u.veil.at(i)), !u.r) return t.l0.style.opacity = t.l1.style.opacity = "0", null;
	if (!e.spin.cached || !e.spin.to.img) {
		let e = {
			w: (Math.abs(n.w * Math.cos(l)) + Math.abs(n.h * Math.sin(l))) / r,
			h: (Math.abs(n.w * Math.sin(l)) + Math.abs(n.h * Math.cos(l))) / r
		}, o = V(u.r, e, !0), s = u.grow.at(i), c = {
			w: a(u.r.dpW, o.w, s) * r,
			h: a(u.r.dpH, o.h, s) * r
		};
		return d(t.l0, u.r, c, 1, u.blur.at(i), (u.r.dpW * r - n.w) / 2 * (1 - s), (u.r.dpH * r - n.h) / 2 * (1 - s)), t.l1.style.opacity = "0", u.r;
	}
	let f = s(E.spinSwapA, E.spinSwapB, o), p = te(f), m = u.r, h = e.spin.to.img;
	return d(t.l0, m, {
		w: m.dpW * r,
		h: m.dpH * r
	}, 1, p), d(t.l1, h, {
		w: h.dpW * r,
		h: h.dpH * r
	}, f, p), f > .5 ? h : m;
}
function Ne(e, t, n, r, i, a, o, s, c = !1) {
	let { cx: l } = K(e), u = E.gap, d = n.y;
	t.el.style.opacity = String(s), Object.assign(t.stage.style, {
		left: l - n.w / 2 + "px",
		top: d + "px",
		width: n.w + "px",
		height: n.h + "px"
	});
	let f = c ? Me(e, t, n, i, o) : je(t, n, i, a, o);
	t.stage.style.background = f ? f.edge : "var(--surface-container)";
	let p = r.look, m = h(p.radius, +!!r.rot + (r.mirrored ? 2 : 0)).map((e) => e * i * r.shell);
	t.stage.style.borderRadius = W(m), Object.assign(t.outline.style, {
		left: l - r.w / 2 + "px",
		top: d - u + "px",
		width: r.w + "px",
		height: r.h + "px",
		borderRadius: W(m.map((e) => e > 0 ? e + u : 0)),
		opacity: r.op
	});
	let g = p.bezel * E.shellK * i, _ = F(p) * E.shellK * i, v = l - n.w / 2, y = r.rot ? _ : g, b = r.rot ? g : _;
	Object.assign(t.shell.style, {
		left: v - y + "px",
		top: d - b + "px",
		width: n.w + 2 * y + "px",
		height: n.h + 2 * b + "px",
		borderRadius: W(m.map((e) => e + g)),
		backgroundColor: p.tone,
		opacity: r.shell
	});
	let S = (r.rot ? n.w : n.h) / i;
	p.btn.forEach((e, a) => {
		let o = t.btns[a], s = e.at * i, c = e.len * i;
		Object.assign(o.style, r.rot ? {
			left: v + (S * i - s - c) + "px",
			top: (e.side < 0 ? d - g - 3 + .5 : d + n.h + g - .5) + "px",
			width: c + "px",
			height: "3px"
		} : {
			left: (e.side < 0 ? v - g - 3 + .5 : v + n.w + g - .5) + "px",
			top: d + s + "px",
			width: "3px",
			height: c + "px"
		}, {
			backgroundColor: p.tone,
			opacity: c > .5 ? r.shell : 0
		}), r.mirrored && (o.style.left = 2 * v + n.w - parseFloat(o.style.left) - parseFloat(o.style.width) + "px", o.style.top = 2 * d + n.h - parseFloat(o.style.top) - parseFloat(o.style.height) + "px");
	}), Re(t.cams, p.cams.map((e) => x((r.rot ? n.h : n.w) / i, S, r.rot, e, i, r.mirrored)), 0, 0, r.shell);
	let C = Number(p.home) || 0;
	Le(t.home, ae(p, (r.rot ? n.h : n.w) / i, S, r.rot, i, r.mirrored, C), v, d, r.shell * C);
	let w = r.crease, T = r.rot !== !!r.tall;
	t.crease.classList.toggle("h", T), Object.assign(t.crease.style, T ? {
		left: "0px",
		top: n.h / 2 + "px",
		width: n.w + "px",
		height: "",
		opacity: w * e.hingeOp.at(o)
	} : {
		left: n.w / 2 + "px",
		top: "0px",
		width: "",
		height: n.h + "px",
		opacity: w * e.hingeOp.at(o)
	});
	let D = w > 0 ? r.shell * Math.min(1, w / Math.max(.01, E.crease)) : 0;
	T ? (Object.assign(t.tTop.style, {
		left: v - y + "px",
		top: d + n.h / 2 + "px",
		width: y + "px",
		height: "1px",
		opacity: D
	}), Object.assign(t.tBot.style, {
		left: v + n.w + "px",
		top: d + n.h / 2 + "px",
		width: y + "px",
		height: "1px",
		opacity: D
	})) : (Object.assign(t.tTop.style, {
		left: l + "px",
		top: d - b + "px",
		width: "1px",
		height: b + "px",
		opacity: D
	}), Object.assign(t.tBot.style, {
		left: l + "px",
		top: d + n.h + "px",
		width: "1px",
		height: b + "px",
		opacity: D
	}));
}
function Pe(t, n) {
	if (t.rig.on) {
		t.UA.el.hidden = !0, t.UB.el.hidden = !0, t.rigEl.hidden = !1, Te(t, t.rigEl, n), Ae(t, n);
		return;
	}
	t.rigEl.hidden = !0, t.UA.el.hidden = !1;
	let r = t.V.s.at(n), i = t.spin.on ? t.spin.from : t.cur;
	if (t.spin.on) {
		let { p: e } = pt(t, n), { f0: r, f1: i } = t.spin, o = r.y + r.h / 2, s = i.y + i.h / 2;
		t.UA.el.style.transformOrigin = `${r.cx}px ${o}px`;
		let c = (a(1, i.s / r.s, e) * (1 - E.rotDip * Math.sin(Math.PI * e))).toFixed(4);
		t.UA.el.style.transform = `translate(${((i.cx - r.cx) * e).toFixed(2)}px, ${((s - o) * e).toFixed(2)}px) rotate(${(t.spin.dir * 90 * e).toFixed(3)}deg) scale(${c})`, t.UA.el.style.setProperty("--spin-s", c);
	}
	if (Ne(t, t.UA, {
		w: t.V.w.at(n),
		h: t.V.h.at(n),
		y: t.V.y.at(n)
	}, {
		w: t.O.w.at(n),
		h: t.O.h.at(n),
		op: t.outlineOp.at(n),
		crease: t.creaseOp.at(n),
		shell: t.shellOp.at(n),
		rot: !!i.rot,
		mirrored: !!i.mirrored,
		tall: i.kind === "device" && g(e[i.dev]),
		look: Y(t, n)
	}, r, t.layer, n, t.unitOp.a.at(n), t.spin.on), t.fadeB) {
		t.UB.el.hidden = !1;
		let r = t.fadeB.f, i = E.gap, a = t.fadeB.st;
		Ne(t, t.UB, {
			w: r.w,
			h: r.h,
			y: r.y
		}, {
			w: r.w + 2 * i,
			h: r.h + 2 * i,
			op: +!!A(a),
			crease: N(a) ? E.crease : 0,
			shell: +!!j(a),
			rot: !!a.rot,
			mirrored: !!a.mirrored,
			tall: a.kind === "device" && g(e[a.dev]),
			look: j(a) ? P(a) : Y(t, n)
		}, r.s, t.fadeB.layers, n, t.unitOp.b.at(n));
	} else t.UB.el.hidden = !0;
}
function Fe(e, t) {
	let n = e.rulerOp.at(t);
	if (e.focusW && !e.tr && !e.queued && n > .99 && (e.focusW = !1, e.RL.w.focus()), n < .01 && (e.roll.w.snap(e.cur.w), e.roll.h.snap(e.cur.h)), e.RL.el.hidden = n < .01 && !e.editing, e.RL.el.hidden) return;
	e.RL.el.style.opacity = String(n);
	let { cx: r } = K(e), i = Math.max(E.gap, (I(Y(e, t)) * e.V.s.at(t) + 6) * e.shellOp.at(t)), a = e.V.w.at(t), s = e.V.h.at(t), c = e.V.y.at(t), l = r - a / 2, u = r + a / 2, d = c + s, f = (c + d) / 2, p = c - i - 15, m = l - i - 22, h = 4.5;
	for (let [n, r] of [["w", e.RL.w], ["h", e.RL.h]]) {
		if (document.activeElement === r) continue;
		let i = String(Math.round(e.roll[n].at(t)));
		e.RL.shown[n] !== i && (r.value = i, e.RL.shown[n] = i);
	}
	let g = o(e.RL.w.value.length * 7.2 + 16, 0, u - l - 4 * h) / 2, _ = o(30, 0, d - c - 4 * h) / 2, v = (e) => e.toFixed(1);
	e.RL.ext.setAttribute("d", `M${v(l)} ${v(c - i)}V${v(p - 5)}M${v(u)} ${v(c - i)}V${v(p - 5)}M${v(l - i)} ${v(c)}H${v(m - 5)}M${v(l - i)} ${v(d)}H${v(m - 5)}`), e.RL.dim.setAttribute("d", `M${v(l)} ${v(p)}H${v(r - g)}M${v(r + g)} ${v(p)}H${v(u)}M${v(l + h)} ${v(p - h)}L${v(l)} ${v(p)}L${v(l + h)} ${v(p + h)}M${v(u - h)} ${v(p - h)}L${v(u)} ${v(p)}L${v(u - h)} ${v(p + h)}M${v(m)} ${v(c)}V${v(f - _)}M${v(m)} ${v(f + _)}V${v(d)}M${v(m - h)} ${v(c + h)}L${v(m)} ${v(c)}L${v(m + h)} ${v(c + h)}M${v(m - h)} ${v(d - h)}L${v(m)} ${v(d)}L${v(m + h)} ${v(d - h)}`), e.RL.w.style.left = r + "px", e.RL.w.style.top = p + "px", e.RL.h.style.left = m + "px", e.RL.h.style.top = f + "px";
}
function Ie(e, t, n, r, i, a, o, s = 0) {
	!t || a <= .001 ? e.style.opacity = "0" : (e.dataset.u !== t.url && (e.src = t.url, e.dataset.u = t.url), e.style.left = n + "px", e.style.top = s + "px", e.style.width = r + "px", e.style.height = i + "px", e.style.opacity = String(a), e.style.filter = o > .05 ? `blur(${o.toFixed(2)}px)` : "none");
}
var Le = (e, t, n, r, i, a = 0) => {
	if (Object.assign(e.style, {
		left: t.left + n + "px",
		top: t.top + r + "px",
		width: t.width + "px",
		height: t.height + "px",
		borderRadius: t.corners,
		opacity: t.on ? i : 0
	}), e.classList.toggle("lens", !!t.lens), !t.lens) return;
	let [o, s] = C(a);
	for (let [n, r] of [
		["--lens-inset", S.inset * t.lens + "px"],
		["--lens-ring", S.ring * t.lens + "px"],
		["--lens-glint-x", o],
		["--lens-glint-y", s],
		["--lens-glint", S.glint * 100 + "%"]
	]) e.style.setProperty(n, r);
}, Re = (e, t, n, r, i, a = 0) => e.forEach((e, o) => t[o] ? Le(e, t[o], n, r, i, a) : e.style.opacity = "0");
// src/scene/engine.ts
function G(t, n) {
	let i;
	if (n === "original") i = { ...t.ORIGINAL };
	else if (t.PRESETS.some((e) => e.sel === n)) i = {
		...t.PRESETS.find((e) => e.sel === n),
		kind: "preset",
		img: null
	};
	else if (/^custom:\d+x\d+$/.test(n)) {
		let [e, t] = n.slice(7).split("x").map(Number);
		i = {
			sel: n,
			kind: "custom",
			name: r("size.custom"),
			w: e,
			h: t,
			img: null
		};
	} else {
		let [t, r, ...a] = n.split(":"), o = e[t], s = r === "open" || r === "cover" ? o?.[r] : void 0;
		if (!o || !s) return null;
		let c = a.includes("rot"), l = a.includes("right");
		if (s.fixed && (c || l)) return null;
		i = {
			sel: n,
			kind: "device",
			dev: t,
			folded: r === "cover",
			rot: c,
			right: l,
			...v(s, c, l),
			name: o.name,
			short: o.short,
			w: c ? s.h : s.w,
			h: c ? s.w : s.h,
			hinge: s.hinge,
			img: null
		};
	}
	return t.target?.sel === n && (i.w = t.target.w, i.h = t.target.h), i.img = t.images.get(n) || t.cur?.img || t.ORIGINAL.img, i;
}
var ze = (e) => {
	let t = `${E.foldLift},${E.foldLand}`;
	return t !== e.foldEaseKey && (e.foldEaseKey = t, e.foldEaseFn = f(E.foldLift, 0, E.foldLand, 1)), e.foldEaseFn;
};
function K(e, t) {
	let n = e.root.clientWidth, r = o((n - 400) / 400, 0, 1), i = Math.max(a(E.gap + 22 + Math.ceil(e.badge.w / 2) + 10, 90, r), t && j(t) && e.hooks.insetOn?.() ? 114 : 0);
	return {
		W: n,
		side: i,
		cx: n / 2,
		top: 48,
		maxW: Math.max(60, n - 2 * i),
		maxH: Math.max(60, e.root.clientHeight - 48 - 88)
	};
}
var Be = (e, t) => j(t) && e.hooks.insetOn?.() && e.hooks.insetBelow?.() ? 40 : 0, Ve = (e, t, n) => {
	if (!j(t) || !e.hooks.insetOn?.()) return {
		w: 0,
		h: 0
	};
	let r = z(t);
	return {
		w: r.includes("w") ? Math.max(0, 178 - n) : 0,
		h: r.includes("h") ? 32 : 0
	};
};
function q(e, t) {
	let n = K(e, t), r = Ve(e, t, n.side), i = (e, t, n) => {
		let [r, i] = L(e);
		return Math.min(t / (e.w + r), n / (e.h + i), 2);
	}, a = (n, r) => Math.min(i(e.ORIGINAL, n, r), i(t, n, r)), o = n.maxW, s = n.maxH, c = 0, l = a(o, s), u = (s - (t.h + L(t)[1]) * l) / 2, d = Be(e, t), f = u < Math.max(r.h, d);
	r.w && (o - (t.w + L(t)[0]) * l) / 2 < r.w && (o -= 2 * r.w), r.h && f && (s -= r.h, c = r.h), d && f && (s -= d), l = a(o, s);
	let p = t.h * l, m = L(t)[1] * l;
	return {
		s: l,
		w: t.w * l,
		h: p,
		cx: n.cx,
		y: n.top + c + m / 2 + Math.max(0, (s - p - m) / 2)
	};
}
function J(e, t, n = 0, r, i = r, a = 0) {
	let o = E.gap;
	for (let [i, o] of [
		[e.V.w, t.w],
		[e.V.h, t.h],
		[e.V.s, t.s],
		[e.V.y, t.y]
	]) r ? i.set(o, r, n, a) : i.snap(o);
	for (let [r, a] of [[e.O.w, t.w + 2 * o], [e.O.h, t.h + 2 * o]]) i ? r.set(a, i, n) : r.snap(a);
}
function He(e, t, n) {
	let r = e.clock.t;
	e.look.a = n || !e.look.b ? t : Y(e, r), e.look.b = t, e.look.t0 = n ? -1e9 : r;
}
function Y(t, n) {
	let r = t.look.a, i = t.look.b;
	if (!i) return e.s26.look.open;
	let s = c(o((n - t.look.t0) / t.look.dur, 0, 1)), l = (e, t) => a(e, t, s);
	return {
		tone: i.tone,
		bezel: l(r.bezel, i.bezel),
		ends: l(F(r), F(i)),
		home: l(Number(r.home) || 0, Number(i.home) || 0),
		radius: i.radius.map((e, t) => l(r.radius[t], e)),
		cams: ie(r.cams, i.cams, s, l),
		btn: i.btn.map((e, t) => {
			let n = r.btn[t];
			return n.side === e.side ? {
				side: e.side,
				at: l(n.at, e.at),
				len: l(n.len, e.len)
			} : s < .5 ? {
				side: n.side,
				at: n.at,
				len: n.len * (1 - 2 * s)
			} : {
				side: e.side,
				at: e.at,
				len: e.len * (2 * s - 1)
			};
		})
	};
}
function Ue(e, t) {
	let n = G(e, t), r = q(e, n);
	e.cur = n, e.tr = null, e.queued = null, e.rig.on = !1, e.spin.on = !1, e.fadeB = null, e.UA.el.style.transform = "", e.UA.el.style.removeProperty("--spin-s"), J(e, r), e.rulerOp.snap(1), We(e, n.img), e.outlineOp.snap(+!!A(n)), e.shellOp.snap(+!!j(n)), e.creaseOp.snap(N(n) ? E.crease : 0), e.unitOp.a.snap(1), e.unitOp.b.snap(0), Ot(e, n, !0);
}
function We(e, t) {
	let n = e.layer.old, r = e.layer.neu;
	n.r = t, n.held = !1, n.grow.snap(0), n.blur.snap(0), n.veil.snap(0), n.op.snap(1), r.r = null, r.op.snap(0), r.blur.snap(0), e.layer.swap = null;
}
function Ge(e, t) {
	let n = e.layer.neu, r = e.layer.old, i = e.layer.swap, a = i ? ne(B(i, t)) : n.blur.at(t), o = i ? s(0, 1, B(i, t)) : n.op.at(t);
	n.r && o > .5 ? (r.r = n.r, r.grow.snap(0), r.blur.snap(a), r.veil.snap(0), r.op.snap(1)) : i && r.blur.snap(a), r.held = !0, n.r = null, n.op.snap(0), n.blur.snap(0), e.layer.swap = null;
}
function Ke(e, t, n = !1) {
	let r = e.layer.old;
	r.grow.to(1, E.holdRise, t), r.blur.to(Math.max(n ? E.holdLight : E.holdBlur, r.blur.at(t)), E.holdRise, t), r.veil.to(E.veil, E.holdRise, t);
}
function qe(e, t) {
	let n = e.layer.old;
	n.grow.to(0, 120, t), n.blur.to(0, 120, t), n.veil.to(0, 120, t);
}
var Je = (e, t) => e.V.w.done(t) && e.V.h.done(t) && e.V.y.done(t) && e.V.s.done(t, .002), Ye = (e, t) => {
	let n = q(e, e.cur);
	return Math.abs(e.V.w.at(t) - n.w) < 3 && Math.abs(e.V.h.at(t) - n.h) < 3 && Math.abs(e.V.y.at(t) - n.y) < 3;
};
function Xe(e, t) {
	let n = performance.now(), r = G(e, t);
	if (e.clock.t = n, !r || !e.cur || r.sel === e.cur.sel) return;
	if (e.rig.on || e.spin.on) {
		e.queued = r.sel;
		return;
	}
	let i = e.cur, a = i.kind === "device" && r.kind === "device" && i.dev === r.dev, o = !oe() && a && i.folded !== r.folded, s = !oe() && a && i.angle !== r.angle && i.folded === r.folded;
	if ((o || s) && !Je(e, n)) {
		e.queued = r.sel;
		return;
	}
	if (e.queued = null, !e.tr && !j(i) && !j(r) && Math.round(i.w) === Math.round(r.w) && Math.round(i.h) === Math.round(r.h) && i.img) {
		e.images.has(r.sel) || e.images.set(r.sel, i.img), r.img = e.images.get(r.sel), e.cur = r, Ot(e, r), X(e);
		return;
	}
	let c = e.images.has(r.sel);
	e.cur = r, Ot(e, r), oe() ? et(e, i, r, n) : o ? it(e, i, r, n, c) : s ? ft(e, i, r, n, c) : Ze(e, i, r, n, c), c && e.tr.kind !== "size" && (e.tr.arriveAt = n);
}
function Ze(e, t, n, r, i) {
	e.tr && e.tr.kind === "fade" && tt(e, r), Ge(e, r);
	let a = {
		w: e.V.w.at(r),
		h: e.V.h.at(r)
	}, o = q(e, n);
	J(e, o, r, u(E.frameDur, E.frameBounce), u(E.frameDur, E.outlineBounce), E.outlineLead), e.outlineOp.to(j(n) ? 0 : A(t) || A(n) ? 1 : e.outlineOp.b, 140, r), e.shellOp.to(+!!j(n), 220, r), e.creaseOp.to(N(n) ? E.crease : 0, 220, r), i ? qe(e, r) : Ke(e, r, !0), e.tr = {
		kind: "size",
		from: t,
		to: n,
		t0: r,
		arriveAt: Infinity,
		arrived: !1,
		cached: i,
		swapped: !1,
		deepAt: i ? 0 : r + E.holdDeepAfter,
		grow: n.w >= t.w && n.h >= t.h,
		f0: a,
		f1: o
	};
}
function Qe(e, t) {
	let { f0: n, f1: r } = e.tr, i = (e, t, n) => Math.abs(t - n) < 1 ? 0 : Math.abs(e - n) / Math.abs(t - n);
	return Math.max(i(e.V.w.at(t), n.w, r.w), i(e.V.h.at(t), n.h, r.h)) < E.swapNear;
}
function $e(e, t) {
	let n = e.layer.neu, r = e.tr;
	r.swapped = r.arrived = !0, n.r = r.to.img, n.op.snap(0), n.blur.snap(0), e.layer.swap = {
		t0: t,
		dur: E.swapDur
	};
}
function et(e, t, n, r) {
	e.tr && e.tr.kind === "fade" && tt(e, r), e.rig.on && ut(e, r), e.spin.on && mt(e, r), Ge(e, r), e.layer.old.grow.to(0, 120, r), e.layer.old.blur.to(0, 120, r), e.layer.old.veil.to(0, 120, r);
	for (let t of [
		e.V.w,
		e.V.h,
		e.V.s,
		e.V.y,
		e.O.w,
		e.O.h
	]) t.snap(t.at(r));
	e.roll.w.snap(t.w), e.roll.h.snap(t.h), e.layer.old.op.to(E.reducedDim, 160, r), e.tr = {
		kind: "fade",
		from: t,
		to: n,
		t0: r,
		arriveAt: Infinity,
		arrived: !1
	};
}
function tt(e, t) {
	let n = e.tr;
	e.tr = null, e.fadeB = null, J(e, q(e, n.to)), We(e, n.to.img), e.outlineOp.snap(+!!A(n.to)), e.shellOp.snap(+!!j(n.to)), e.creaseOp.snap(N(n.to) ? E.crease : 0), e.unitOp.a.snap(1), e.unitOp.b.snap(0), e.rulerOp.to(1, 200, t);
}
function nt(e) {
	if (!e.tr) return;
	let t = e.tr.arriveAt;
	e.tr.arrived = !0;
	let n = (e.tr.kind === "fold" || e.tr.kind === "unfold") && e.rig.cached || e.tr.kind === "spin" && e.spin.cached;
	if (e.tr.kind === "spin" || n || e.tr.kind === "size" && e.tr.cached) return;
	if (e.tr.kind === "fade") {
		e.fadeB = {
			f: q(e, e.tr.to),
			st: e.tr.to,
			layers: ee(e.tr.to.img)
		}, e.unitOp.b.snap(0), e.unitOp.b.to(1, E.reducedFade, t), e.unitOp.a.to(0, E.reducedFade, t), e.rulerOp.to(0, 120, t);
		return;
	}
	let r = e.layer.neu;
	e.tr.deepAt ? (e.tr.deepAt = 0, r.r = e.tr.to.img, r.op.snap(0), r.op.to(1, E.fastReveal, t), r.blur.snap(e.layer.old.blur.at(t)), r.blur.to(0, E.fastReveal, t)) : (r.r = e.tr.to.img, r.op.snap(0), r.op.to(1, E.revealFade, t), r.blur.snap(Math.max(e.layer.old.blur.at(t), e.layer.old.blur.b)), r.blur.to(e.tr.kind === "size" && !Ye(e, t) ? E.moveBlur : 0, E.revealDur, t));
}
function rt(e, t, n) {
	let r = e.rig.d[t ? "cover" : "open"], i = g(e.rig.d);
	return e.rig.d.look[t ? "cover" : "open"].cams.map((e) => x(r.w, r.h, i, e, n, i));
}
function it(t, n, r, i, a) {
	let o = e[r.dev], s = r.folded ? "fold" : "unfold", c = o.open.hinge, l = q(t, n), u = q(t, r);
	if (Ge(t, i), a) {
		let e = t.layer.old;
		e.grow.snap(0), e.blur.snap(0), e.veil.snap(0);
	}
	let d = t.layer.old.blur.at(i), f = _(o, "open"), p = _(o, "cover"), m = (e) => e.cx - f.w * e.s / 2 + c * e.s, h = (e) => e.cx - p.w * e.s / 2, v = {
		w: r.w,
		h: r.h
	}, y = (r.angle - n.angle + 540) % 360 - 180, b = Math.abs(y) === 180 ? 0 : y;
	Object.assign(t.rig, {
		on: !0,
		turn: b,
		q: g(o) ? 90 : 0,
		z: parseFloat(getComputedStyle(t.rigEl).getPropertyValue("--z")) || 1,
		t0: i,
		dur: E.foldDur,
		dir: s,
		d: o,
		restBlur: d,
		oldSpec: t.layer.old.r,
		from: n,
		to: r,
		f0: l,
		f1: u,
		cached: a,
		s0: l.s,
		s1: u.s,
		sRef: Math.max(l.s, u.s),
		half: {
			u: c,
			v: f.h
		},
		cover: {
			u: p.w,
			v: p.h
		},
		hx0: s === "fold" ? m(l) : h(l),
		hx1: s === "fold" ? h(u) : m(u),
		plan: s === "fold" ? {
			inner: {
				role: "crisp",
				du: 0
			},
			base: {
				role: "crisp",
				du: c
			},
			outer: {
				role: "hold",
				du: 0,
				neu: !0,
				frame: v
			}
		} : {
			outer: {
				role: "crisp",
				du: 0
			},
			inner: {
				role: "hold",
				du: 0,
				neu: !0,
				frame: v
			},
			base: {
				role: "hold",
				du: c,
				neu: !0,
				frame: v
			}
		}
	}), t.rig.dip = ct(t), t.stretchOf.clear(), Se(t);
	let x = s === "fold" ? 0 : 1, S = /* @__PURE__ */ new Map([
		[t.RG.base.front, x],
		[t.RG.leaf.front, x],
		[t.RG.base.back, x],
		[t.RG.leaf.back, 1 - x]
	]);
	for (let [e, n] of S) e.gloss.style.setProperty("--turn", at(t, n) + "deg");
	let C = [...S].filter(([, e]) => e === 1).map(([e]) => e);
	t.seeding = new Set(C.flatMap((e) => [e.gloss, ...e.fit])), Ae(t, i + t.rig.dur * 1e3), t.seeding = null, a || Ke(t, i), t.creaseOp.snap(0), t.roll.w.snap(n.w), t.roll.h.snap(n.h), t.rulerOp.to(0, 120, i), t.tr = {
		kind: s,
		from: n,
		to: r,
		t0: i,
		arriveAt: Infinity,
		arrived: !1
	};
}
var at = (e, t) => e.rig.from.angle + e.rig.turn * t + e.rig.q, ot = (e, t) => {
	let n = t.bezel * E.shellK, r = F(t) * E.shellK;
	return g(e.rig.d) ? [r, n] : [n, r];
};
function st(e, t, [n, r]) {
	let i = (e.rig.dir === "fold" ? t : 1 - t) * 180, o = a(e.rig.s0, e.rig.s1, t), c = a(e.rig.f0.y + e.rig.f0.h / 2, e.rig.f1.y + e.rig.f1.h / 2, t), l = at(e, t), u = i * Math.PI / 180, d = l * Math.PI / 180, f = i / 180, p = a(e.rig.half.u, e.rig.cover.u, f), m = a(e.rig.half.v, e.rig.cover.v, f), h = a(e.rig.hx0, e.rig.hx1, t), g = K(e), _ = (h - g.cx) / o, v = E.perspective / (E.perspective - (p + e.rig.d.plate.thickness) * Math.sin(u) * o), y = -p * Math.cos(u) * v, b = a(e.rig.half.u, Math.min(e.rig.half.u, e.rig.cover.u), s(E.shrinkFrom, 180, i)), x = [_ + Math.min(0, y) - n, _ + Math.max(b, y) + n], S = [-m * v / 2 - r, m * v / 2 + r], C = x.flatMap((e) => S.map((t) => [e * Math.cos(d) - t * Math.sin(d), e * Math.sin(d) + t * Math.cos(d)])), w = (e) => Math.max(...C.map((t) => Math.abs(t[e])));
	return {
		th: i,
		baseS: o,
		cy: c,
		angle: l,
		v: m,
		hx: h,
		r: g,
		need: Math.min(1, g.maxW / (2 * w(0) * o), g.maxH / (2 * w(1) * o))
	};
}
function ct(e) {
	let [t, n] = ot(e, e.rig.d.look.open), [r, i] = ot(e, e.rig.d.look.cover), a = [Math.max(t, r), Math.max(n, i)], o = [];
	for (let t = 1; t < 48; t++) {
		let n = t / 48, r = 1 - st(e, n, a).need;
		r > 0 && o.push([n, r + .004]);
	}
	let c = (e, t) => e <= t ? s(0, t, e) : 1 - s(t, 1, e);
	return (e) => o.reduce((t, [n, r]) => Math.max(t, r * c(e, n)), 0);
}
function lt(e, t) {
	let n = (t - e.rig.t0) / 1e3, r = Math.max(.05, e.rig.dur), i = ze(e)(o(n / r, 0, 1)), { th: a, baseS: s, cy: c, angle: l, v: u, hx: d, r: f } = st(e, i, ot(e, Y(e, t))), p = s * (1 - e.rig.dip(i));
	return {
		t: n,
		th: a,
		p: i,
		s: p,
		hx: f.cx + (d - f.cx) * p / s,
		cy: c,
		angle: l,
		top: c - u * p / 2,
		settled: n >= r
	};
}
function ut(e, t) {
	let n = E.crease * se(lt(e, t).th);
	e.rig.on = !1, e.rig.cached && We(e, e.cur.img), J(e, q(e, e.cur)), e.outlineOp.snap(+!!A(e.cur)), e.shellOp.snap(+!!j(e.cur)), e.creaseOp.snap(N(e.cur) ? n : 0), N(e.cur) && e.creaseOp.to(E.crease, 240, t), e.rulerOp.to(1, 200, t);
}
var dt = (e) => {
	let t = `${E.rotLift},${E.rotLand}`;
	return t !== e.spinEaseKey && (e.spinEaseKey = t, e.spinEaseFn = f(E.rotLift, 0, E.rotLand, 1)), e.spinEaseFn;
};
function ft(e, t, n, r, i) {
	Ge(e, r), i ? qe(e, r) : Ke(e, r);
	let a = (n.angle - t.angle + 540) % 360 - 180;
	Object.assign(e.spin, {
		on: !0,
		t0: r,
		dur: E.rotDur,
		from: t,
		to: n,
		f0: q(e, t),
		f1: q(e, n),
		dir: a / 90,
		cached: i
	}), e.roll.w.snap(t.w), e.roll.h.snap(t.h), e.rulerOp.to(0, 120, r), e.tr = {
		kind: "spin",
		from: t,
		to: n,
		t0: r,
		arriveAt: Infinity,
		arrived: !1
	};
}
function pt(e, t) {
	let n = (t - e.spin.t0) / 1e3, r = Math.max(.05, e.spin.dur);
	return {
		p: dt(e)(o(n / r, 0, 1)),
		done: n >= r
	};
}
function mt(e, t) {
	let n = e.spin.to, r = e.spin.cached;
	e.spin.on = !1, e.UA.el.style.transform = "", e.UA.el.style.removeProperty("--spin-s");
	for (let t of [e.UA.l0, e.UA.l1]) t.style.transform = "";
	J(e, q(e, n)), e.creaseOp.snap(N(n) ? E.crease : 0), e.rulerOp.to(1, 200, t), r ? (We(e, n.img), e.tr?.kind === "spin" && (e.tr = null)) : e.tr?.kind === "spin" && Object.assign(e.tr, {
		kind: "size",
		cached: !1,
		arrived: !1,
		arriveAt: e.tr.arrived || e.images.has(n.sel) ? t : Infinity
	});
}
function ht(e) {
	let t = e.clock.t;
	e.tr && !e.tr.arrived && t >= e.tr.arriveAt && nt(e), e.tr?.deepAt && t >= e.tr.deepAt && (e.tr.deepAt = 0, e.layer.old.blur.to(Math.max(E.holdBlur, e.layer.old.blur.at(t)), E.holdDeepen, t)), e.tr && e.tr.kind === "size" && e.tr.cached && !e.tr.swapped && (e.tr.grow || Qe(e, t) || t - e.tr.t0 > E.frameDur * 800) && $e(e, t), e.rig.on && lt(e, t).settled && ut(e, t), e.spin.on && pt(e, t).done && mt(e, t);
	let n = e.layer.neu, r = e.layer.swap ? B(e.layer.swap, t) >= 1 : n.op.done(t) && n.op.b === 1 && n.blur.done(t);
	if (!e.rig.on && n.r && r) {
		let t = e.layer.swap ? 0 : n.blur.b;
		We(e, n.r), e.tr?.kind === "size" && t && e.layer.old.blur.snap(t);
	}
	if (e.tr?.kind === "size" && e.tr.arrived && !e.layer.neu.r && Ye(e, t) && e.layer.old.blur.b > 0 && !(e.layer.old.grow.b > 0) && e.layer.old.blur.to(0, E.settleSharp, t), e.tr && (e.tr.kind === "fade" ? e.tr.arrived && e.unitOp.b.done(t) && tt(e, t) : e.tr.kind !== "spin" && e.tr.arrived && !e.rig.on && !e.layer.neu.r && Je(e, t) && e.O.w.done(t) && e.O.h.done(t) && e.layer.old.blur.b === 0 && e.layer.old.blur.done(t) && (e.tr = null, e.outlineOp.to(+!!A(e.cur), 220, t))), e.queued && !e.rig.on && !e.spin.on && (!e.tr || e.tr.kind === "size")) {
		let n = e.queued, r = G(e, n), i = e.cur;
		(i.kind !== "device" || r.kind !== "device" || i.dev !== r.dev || Je(e, t)) && (e.queued = null, Xe(e, n));
	}
	e.draft && e.cur && (J(e, q(e, {
		...e.cur,
		w: e.draft.w,
		h: e.draft.h
	})), e.roll.w.snap(e.draft.w), e.roll.h.snap(e.draft.h)), Pe(e, t), e.root.classList.toggle("at-rest", !e.tr && !e.queued && !e.draft), Fe(e, t), e.hooks.layout({
		w: e.V.w.at(t),
		h: e.V.h.at(t),
		s: e.V.s.at(t),
		y: e.V.y.at(t),
		cx: K(e).cx,
		radius: h(Y(e, t).radius, +!!e.cur?.rot + (e.cur?.mirrored ? 2 : 0)).map((n) => n * e.V.s.at(t) * e.shellOp.at(t)),
		bezel: I(Y(e, t)) * e.V.s.at(t) * e.shellOp.at(t)
	}, !!e.tr || !!e.queued || e.rig.on || e.spin.on || !!e.draft);
}
function gt(e, t) {
	if (e.raf = 0, !e.enabled || !e.cur) return;
	e.clock.t = t, ht(e);
	let n = [
		e.outlineOp,
		e.creaseOp,
		e.rulerOp,
		e.shellOp,
		e.hingeOp,
		e.unitOp.a,
		e.unitOp.b,
		e.layer.old.grow,
		e.layer.old.blur,
		e.layer.old.veil,
		e.layer.old.op,
		e.layer.neu.op,
		e.layer.neu.blur,
		e.roll.w,
		e.roll.h
	];
	(e.tr || e.queued || e.rig.on || e.spin.on || !Je(e, t) || t < e.look.t0 + e.look.dur || n.some((e) => !e.done(t))) && X(e);
}
function X(e) {
	e.enabled && !e.raf && (e.raf = requestAnimationFrame((t) => gt(e, t)));
}
function Z(e, t) {
	return Promise.resolve(e.hooks.request(t));
}
function _t(e, t = !1) {
	let n = `${e.root.clientWidth}:${e.root.clientHeight}:${e.badge.w}`;
	(n !== e.roomSize || t) && (e.roomSize = n, e.cur && !e.rig.on && !e.spin.on && J(e, q(e, e.cur), performance.now(), e.tr?.kind === "size" ? u(E.frameDur, E.frameBounce) : null), X(e), e.cur && (e.clock.t = performance.now(), ht(e)));
}
// src/scene/dock.ts
var vt = [
	"original",
	"narrow",
	"foldable",
	"custom",
	...t.flatMap((e) => e.ids)
], yt = {
	original: "@Preview",
	narrow: "320×640",
	foldable: "673×841"
}, bt = (t) => e[t] ? e[t].short : t === "custom" ? r("size.custom") : yt[t] ?? t, xt = (e) => e.dock.get().orientMenu;
function Q(e, t) {
	t && Ct(e, !1), e.dock.set({ orientMenu: t });
}
var St = (e) => e.dock.get().menu;
function Ct(e, t) {
	t && Q(e, !1), e.dock.set({ menu: t });
}
var wt = (e, t) => {
	let n = t.target instanceof Element ? t.target : null;
	St(e) && !n?.closest("#pnFold") && Ct(e, !1), xt(e) && !n?.closest("#dcOrientation") && Q(e, !1);
};
function Tt(t, n) {
	t.dock.set({ sumTitle: `${e[n] ? e[n].name : bt(n)} · ${R(t.cur)}` });
}
function Et(t, n, r) {
	if (t.focusW = !1, Bt(t), t.slFocus = !1, Dt(t), n === "custom") {
		let e = o(Math.round(t.cur.w), 240, O), n = o(Math.round(t.cur.h), 240, O);
		t.cur.kind !== "custom" && Z(t, `custom:${e}x${n}`), r || (t.focusW = !0, X(t));
	} else {
		if (e[n]) return Z(t, `${n}:open`);
		Z(t, n);
	}
}
function Dt(e) {
	for (let t of [e.RL.w, e.RL.h]) document.activeElement === t && (t.dataset.cancel = "1", t.blur());
}
function Ot(t, n, r) {
	let i = t.clock.t;
	if (r ? (t.roll.w.snap(n.w), t.roll.h.snap(n.h)) : (t.roll.w.to(n.w, 420, i), t.roll.h.to(n.h, 420, i)), n.kind === "device") {
		He(t, P(n), r);
		let i = !!e[n.dev][n.folded ? "cover" : "open"].fixed;
		t.dock.set({
			foldable: !!e[n.dev].fold,
			folded: n.folded,
			orientFixed: i,
			orientation: n.orientation
		}), i && Q(t, !1);
	}
	kt(t);
}
function kt(t) {
	let n = t.cur, r = t.editing || t.slFocus && n.sel === t.slSent || n.kind === "custom", i = r ? "custom" : _e(n), a = {};
	for (let o of vt) {
		let s = t.PRESETS.find((e) => e.sel === o);
		a[o] = o === "custom" ? r ? R(n) : `240–${O}` : o === "original" ? R(t.ORIGINAL) : s ? R(s) : o === i ? R(n) : ve(e[o]);
	}
	let o = t.dock.get().rows, s = vt.every((e) => o[e] === a[e]), c = !r && n.kind === "device";
	t.RL.el.classList.toggle("custom", r), t.RL.el.classList.toggle("device", c), t.dock.set({
		checked: i,
		rows: s ? o : a,
		posture: c,
		sliders: r
	}), c || Q(t, !1), Tt(t, i), Lt(t);
}
function At(t) {
	let n = t.cur;
	n.kind === "device" && e[n.dev].fold && (t.hingeLine = !t.hingeLine, t.dock.set({ hinge: t.hingeLine }), t.hingeOp.to(+!!t.hingeLine, 200, performance.now()), X(t));
}
var jt = (e, t) => [
	"portrait",
	"landscape-left",
	"landscape-right"
].map((e) => M(t, !t.folded, e)).find((n) => {
	let r = G(e, n);
	return r?.kind === "device" && r.angle === t.angle;
}) ?? M(t, !t.folded, "portrait");
function Mt(t) {
	let n = t.cur;
	n.kind === "device" && e[n.dev].fold && Z(t, jt(t, n));
}
function Nt(e, t, n) {
	let r = /^\d+$/.test(n.trim()) ? Number(n) : NaN;
	if (!(r > 0)) return;
	let i = o(r, 240, O), a = Math.round(e.cur.w), s = Math.round(e.cur.h), c = t === "w" ? i : a, l = t === "h" ? i : s;
	(c !== a || l !== s) && (e.roll[t].snap(i), Z(e, Pt(e, c, l)));
}
var Pt = (e, t, n) => e.PRESETS.find((e) => e.w === t && e.h === n)?.sel || `custom:${t}x${n}`;
function Ft(e, t = !1) {
	if (!e.editing) {
		if (e.cur.kind !== "custom") {
			let n = o(Math.round(e.cur.w), 240, O), r = o(Math.round(e.cur.h), 240, O);
			if (Z(e, `custom:${n}x${r}`), !t) for (let [t, i, a] of [[
				"w",
				e.RL.w,
				n
			], [
				"h",
				e.RL.h,
				r
			]]) i.value = String(a), e.RL.shown[t] = String(a);
		}
		e.editing = !0, kt(e);
	}
}
var It = (e, t) => e.draft ? e.draft[t] : o(Math.round(e.cur[t]), 240, O);
function Lt(e) {
	e.dock.set({
		slW: It(e, "w"),
		slH: It(e, "h")
	});
}
function Rt(e, t, n) {
	let r = o(Math.round(n), 240, O);
	e.draft = {
		w: It(e, "w"),
		h: It(e, "h"),
		[t]: r
	}, Lt(e), X(e);
}
function zt(e) {
	if (clearTimeout(e.keyTimer), e.keyTimer = 0, !e.draft || e.dragging) return;
	let { w: t, h: n } = e.draft;
	if (t === Math.round(e.cur.w) && n === Math.round(e.cur.h)) {
		Bt(e);
		return;
	}
	let r = e.draft, i = Pt(e, t, n);
	e.slSent = i, Z(e, i).then((t) => {
		!t && e.draft === r && Bt(e);
	});
}
function Bt(e) {
	clearTimeout(e.keyTimer), e.keyTimer = 0, e.dragging = null, e.draft && (e.draft = null, e.cur && !e.rig.on && !e.spin.on && J(e, q(e, e.cur)), e.cur && (e.roll.w.snap(e.cur.w), e.roll.h.snap(e.cur.h), Lt(e)), X(e));
}
function Vt(e) {
	for (let [t, n] of [["w", e.RL.w], ["h", e.RL.h]]) n.addEventListener("focus", () => {
		n.select(), e.cur.kind !== "device" && Ft(e);
	}), n.addEventListener("pointerdown", () => Ft(e)), n.addEventListener("input", () => Ft(e, !0)), n.addEventListener("keydown", (t) => {
		if (t.key === "Enter") t.preventDefault(), n.blur();
		else if (t.key === "Escape") t.preventDefault(), t.stopPropagation(), n.dataset.cancel = "1", n.blur();
		else if (t.key === "ArrowUp" || t.key === "ArrowDown") {
			t.preventDefault(), Ft(e);
			let r = (t.key === "ArrowUp" ? 1 : -1) * k(t);
			n.value = String(o((parseInt(n.value, 10) || 0) + r, 240, O));
		}
	}), n.addEventListener("blur", (r) => {
		n.dataset.cancel ? delete n.dataset.cancel : Nt(e, t, n.value), e.RL.shown[t] = "", r.relatedTarget !== e.RL.w && r.relatedTarget !== e.RL.h && (e.editing = !1, kt(e), X(e));
	});
	new ResizeObserver(() => {
		let t = e.RL.h.offsetWidth;
		t && t !== e.badge.w && (e.badge.w = t, _t(e));
	}).observe(e.RL.h, { box: "border-box" });
	let t = () => !!e.cur && !e.dock.get().locked;
	return {
		view: e.dock,
		setMenu: (t) => Ct(e, t),
		setOrientMenu: (t) => Q(e, t),
		pick: (t, n) => {
			e.cur && Et(e, t, n);
		},
		orient(t) {
			let n = e.cur;
			n?.kind === "device" && Z(e, M(n, n.folded, t)), Q(e, !1);
		},
		fold: () => {
			e.cur && Mt(e);
		},
		hinge: () => {
			e.cur && At(e);
		},
		cancelRuler() {
			for (let t of [e.RL.w, e.RL.h]) document.activeElement === t && (t.dataset.cancel = "1");
		},
		grab(n, r) {
			t() && (e.dragging = n, Rt(e, n, r));
		},
		drag(t, n) {
			e.dragging === t && Rt(e, t, n);
		},
		release(t) {
			e.dragging === t && (e.dragging = null, zt(e));
		},
		step(n, r) {
			t() && (Rt(e, n, r), clearTimeout(e.keyTimer), e.keyTimer = window.setTimeout(() => zt(e), 350));
		},
		sliderFocus(t) {
			t ? e.slFocus = !0 : (e.keyTimer && zt(e), e.slFocus = !1, e.cur && kt(e));
		},
		lock(t) {
			e.dock.set({ locked: t }), t && Bt(e);
		}
	};
}
// src/scene/state.ts
var Ht = (e) => ({
	el: e,
	cam: $(e, ".cam"),
	cams: Kt(e),
	old: $(e, ".old"),
	veil: $(e, ".veil"),
	neu: $(e, ".neu"),
	cast: $(e, ".cast"),
	blurs: [],
	dark: null
}), Ut = (e) => {
	let t = document.createElement("div"), n = document.createElement("div"), r = document.createElement("div");
	return t.className = "gloss", n.className = "rim", r.className = "home", e.prepend(t, n), e.append(r), {
		body: e,
		gloss: t,
		home: r,
		clip: qt(e, ".clip"),
		ring: qt(e, ".ring"),
		lit: qt(e, ".lit"),
		fit: []
	};
}, Wt = (e) => ({
	el: e,
	front: Ut($(e, ".front")),
	back: Ut($(e, ".rear")),
	strips: []
}), Gt = (e) => ({
	el: e,
	shell: $(e, ".shell"),
	btns: [...e.querySelectorAll(".btn")],
	cams: Kt(e),
	home: $(e, ".home"),
	outline: $(e, ".outline"),
	stage: $(e, ".stage"),
	l0: $(e, ".l0"),
	l1: $(e, ".l1"),
	veil: $(e, ".veil"),
	crease: $(e, ".crease"),
	tTop: $(e, ".t-top"),
	tBot: $(e, ".t-bot")
}), Kt = (e) => {
	let t = e.querySelector(".cam"), n = [t];
	for (; n.length < w;) {
		let e = t.cloneNode();
		n[n.length - 1].after(e), n.push(e);
	}
	return n;
}, $ = (e, t) => e.querySelector(t), qt = (e, t) => e.querySelector(t);
function Jt(e, t) {
	let n = (t) => e.querySelector(`#${t}`), a = {
		sel: "original",
		kind: "original",
		name: "@Preview",
		w: 411,
		h: 891,
		img: null
	}, o = [{
		sel: "narrow",
		name: r("size.narrow"),
		w: 320,
		h: 640
	}, {
		sel: "foldable",
		name: r("size.foldable"),
		w: 673,
		h: 841
	}], s = /* @__PURE__ */ new Map(), c = { t: 0 }, l = { w: 45 }, u = {
		w: new p(),
		h: new p(),
		s: new p(),
		y: new p(48)
	}, d = {
		w: new p(),
		h: new p()
	}, f = new m(0), h = new m(0), g = new m(0), _ = new m(0), v = new m(1), y = ee(null), b = {
		a: new m(1),
		b: new m(0)
	}, x = {
		a: null,
		b: null,
		t0: 0,
		dur: 460
	}, S = { on: !1 }, C = n("rig"), w = $(C, ".space"), T = Wt($(C, ".slab.base")), E = Wt($(C, ".slab.leaf")), D = {
		lift: $(C, ".lift"),
		space: w,
		plate: $(C, ".plate"),
		spine: $(C, ".spine"),
		crease: $(C, ".crease"),
		tTop: $(C, ".r-top"),
		tBot: $(C, ".r-bot"),
		base: T,
		leaf: E,
		btns: Array.from({ length: 5 }, () => {
			let e = document.createElement("div");
			return e.className = "btn", w.append(e), e;
		}),
		F: {
			inner: Ht(E.front.clip),
			outer: Ht(E.back.clip),
			base: Ht(T.front.clip)
		}
	};
	for (let [e, t] of [[D.leaf.front, D.F.inner], [D.leaf.back, D.F.outer]]) t.blurs = Array.from({ length: 4 }, () => {
		let e = document.createElement("div");
		return e.className = "smear", e.innerHTML = "<div class=\"unstretch\"><img class=\"ly\" alt=\"\"></div>", t.el.insertBefore(e, t.cam), {
			el: e,
			inv: $(e, ".unstretch"),
			img: $(e, "img")
		};
	}), t.dark = document.createElement("div"), t.dark.className = "smear", t.el.insertBefore(t.dark, t.cam), e.fit.push(...t.blurs.map((e) => e.el), t.dark);
	D.base.front.fit.push(D.F.base.cast);
	let O = /* @__PURE__ */ new Map(), k = { on: !1 }, A = Gt(n("ua")), j = Gt(n("ub")), M = {
		w: new m(411),
		h: new m(891)
	}, N = {
		el: n("ruler"),
		ext: n("rlExt"),
		dim: n("rlDim"),
		w: n("rlW"),
		h: n("rlH"),
		shown: {
			w: "",
			h: ""
		}
	};
	return {
		root: e,
		hooks: t,
		hingeLine: !0,
		ORIGINAL: a,
		PRESETS: o,
		target: null,
		images: s,
		foldEaseKey: "",
		foldEaseFn: null,
		clock: c,
		badge: l,
		cur: null,
		tr: null,
		queued: null,
		V: u,
		O: d,
		outlineOp: f,
		creaseOp: h,
		rulerOp: g,
		shellOp: _,
		hingeOp: v,
		layer: y,
		unitOp: b,
		fadeB: null,
		look: x,
		rig: S,
		rigEl: C,
		RG: D,
		stretchOf: O,
		seeding: null,
		spin: k,
		spinEaseKey: "",
		spinEaseFn: null,
		elevationOf: null,
		UA: A,
		UB: j,
		roll: M,
		dock: i(ye),
		focusW: !1,
		RL: N,
		editing: !1,
		draft: null,
		dragging: null,
		slFocus: !1,
		keyTimer: 0,
		slSent: null,
		enabled: !1,
		raf: 0,
		roomSize: ""
	};
}
// src/runtime/resize-scene.ts
function Yt(t, n) {
	let r = Jt(t, n), i = Vt(r), a = (e) => wt(r, e);
	return {
		devices: new Set(Object.keys(e)),
		dock: i,
		setOriginal(e, t, n) {
			Object.assign(r.ORIGINAL, {
				w: e,
				h: t,
				img: n
			}), r.target?.sel === "original" && Object.assign(r.target, {
				w: e,
				h: t
			}), r.cur && kt(r), r.cur?.sel === "original" && (Object.assign(r.cur, {
				w: e,
				h: t
			}), r.tr?.kind !== "fade" && J(r, q(r, r.cur), performance.now(), r.tr ? u(E.frameDur, E.frameBounce) : null), r.roll.w.to(e, 420, performance.now()), r.roll.h.to(t, 420, performance.now()), X(r));
		},
		image(e, t) {
			r.images.set(e, t), X(r), r.cur?.sel === e && (r.cur.img = t, r.tr?.to.sel === e ? (r.tr.to.img = t, r.tr.arriveAt = performance.now(), r.tr.kind === "size" && r.tr.swapped && (r.layer.neu.r ? r.layer.neu.r = t : r.layer.old.r = t)) : r.tr || (r.layer.old.r = t));
		},
		update(e, t = !1) {
			r.target = e, r.draft && !r.dragging && !r.keyTimer && Math.round(e.w) === r.draft.w && Math.round(e.h) === r.draft.h && (r.draft = null), !r.cur || t ? Ue(r, e.sel) : Xe(r, e.sel), t && (r.clock.t = performance.now(), ht(r)), r.enabled && !r.raf && (r.raf = requestAnimationFrame((e) => gt(r, e)));
		},
		enable(e) {
			r.enabled = e, r.root.hidden = !e, e && addEventListener("pointerdown", a, !0), e || (r.dock.set({ posture: !1 }), Ct(r, !1), Q(r, !1), removeEventListener("pointerdown", a, !0)), e || (r.roomSize = ""), e ? r.raf ||= requestAnimationFrame((e) => gt(r, e)) : (cancelAnimationFrame(r.raf), r.raf = 0, r.images.clear(), r.cur = null, r.tr = null, r.queued = null, Bt(r), r.slFocus = !1);
		},
		relayout: (e) => _t(r, e),
		moving: () => !!r.tr || !!r.queued || r.rig.on || r.spin.on || !!r.draft,
		clearImages() {
			r.images.clear();
		},
		closeMenu() {
			return xt(r) ? (Q(r, !1), !0) : St(r) ? (Ct(r, !1), !0) : !1;
		},
		sizeOf(e) {
			let t = G(r, e);
			return t && {
				w: t.w,
				h: t.h
			};
		}
	};
}
export { ye as DOCK_START, O as DP_MAX, D as DP_MIN, Yt as createResizeScene, bt as itemName, ge as silhouette, be as slAt, k as stepOf };
