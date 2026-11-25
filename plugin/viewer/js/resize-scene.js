import { DEVICES as e } from "./devices.js";
import { reduced as t } from "./motion.js";
import { phrase as n } from "./strings.js";
// src/scene/calc.ts
var r = (e, t, n) => e + (t - e) * n, i = (e, t, n) => Math.min(n, Math.max(t, e)), a = (e, t, n) => {
	let r = i((n - e) / (t - e), 0, 1);
	return r * r * (3 - 2 * r);
}, o = (e) => 1 - (1 - e) ** 3, s = (e) => `color-mix(in srgb, var(--device-shade) ${(e * 100).toFixed(1)}%, transparent)`, c = (e, t) => ({
	w0: 2 * Math.PI / Math.max(.05, e),
	z: 1 - i(t, 0, .95)
});
function l({ w0: e, z: t }, n, r, i) {
	if (t < 1) {
		let a = e * Math.sqrt(1 - t * t), o = Math.exp(-t * e * i), s = (r + t * e * n) / a, c = Math.cos(a * i), l = Math.sin(a * i);
		return [o * (n * c + s * l), o * ((s * a - t * e * n) * c - (n * a + t * e * s) * l)];
	}
	let a = Math.exp(-e * i), o = r + e * n;
	return [a * (n + o * i), a * (o - e * (n + o * i))];
}
function u(e, t, n, r) {
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
var d = class {
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
		return t <= 0 ? [this.x0, 0] : l(this.sp, this.x0, this.v0, t);
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
}, f = class {
	ease;
	a;
	b;
	t0 = 0;
	dur = 0;
	constructor(e = 0, t = o) {
		this.ease = t, this.a = e, this.b = e;
	}
	at(e) {
		if (this.dur <= 0) return this.b;
		let t = i((e - this.t0) / this.dur, 0, 1);
		return r(this.a, this.b, this.ease(t));
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
}, p = (e, t) => {
	let n = e;
	for (let e = 0; e < (t % 4 + 4) % 4; e++) n = [
		n[3],
		n[0],
		n[1],
		n[2]
	];
	return n;
}, m = (e) => e.plate?.axis === "height", h = (e, t) => m(e) ? {
	w: e[t].h,
	h: e[t].w
} : e[t];
function g(e, t, n) {
	let r = e.w > e.h, i = n ? "landscape-right" : (t ? e.h : e.w) > (t ? e.w : e.h) ? "landscape-left" : "portrait", a = n ? r ? 180 : 90 : t ? r ? 90 : -90 : 0;
	return {
		orientation: i,
		angle: a,
		mirrored: a < 0 || a === 180
	};
}
var _ = (e) => e.rad ?? e.notch ?? Math.min(e.w, e.h) / 2, v = (e) => e.flat ?? (e.notch === void 0 ? 0 : 1);
function y(e, t, n, r, i, a = !1) {
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
	let d = _(r) * i, f = v(r), p = [
		d,
		d,
		d,
		d
	], m = .5 * i, h = u.left <= m, g = u.top <= m, y = u.left + u.width >= c - m, b = u.top + u.height >= l - m;
	for (let e of [
		[0, 1],
		[1, 2],
		[2, 3],
		[3, 0]
	][s]) p[e] = d * (1 - f);
	return [
		h || g,
		g || y,
		y || b,
		b || h
	].forEach((e, t) => {
		e && (p[t] = d * (1 - f));
	}), {
		...u,
		corners: p.map((e) => e + "px").join(" "),
		on: r.w * i > .5,
		lens: r.lens ? i : 0
	};
}
var b = {
	inset: 3,
	ring: 2,
	shift: .12,
	glint: .14
}, x = (e) => {
	let t = e * Math.PI / 180, n = Math.cos(t), r = Math.sin(t), i = -b.shift, a = -b.shift, o = (e) => (.5 + e - b.glint / 2) * 100 + "%";
	return [o(i * n + a * r), o(-i * r + a * n)];
}, S = Math.max(1, ...Object.values(e).flatMap((e) => Object.values(e.look).map((e) => e.cams.length))), C = .62, w = {
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
}, T = 1600, E = (e) => e.shiftKey ? 10 : 1, D = (e) => e.kind === "preset" || e.kind === "custom", O = (e) => e.kind === "device", k = (t, n, r) => {
	let i = e[t.dev][n ? "cover" : "open"], a = r !== "portrait";
	return `${t.dev}:${n ? "cover" : "open"}${a === i.w > i.h ? "" : ":rot"}${r === "landscape-right" ? ":right" : ""}`;
}, A = (t) => t.kind === "device" && e[t.dev].fold && !t.folded, j = (t) => e[t.dev].look[t.folded ? "cover" : "open"], M = (e) => e.ends ?? e.bezel, N = (e) => Math.max(e.bezel, M(e)) * w.shellK, P = (e) => {
	if (!O(e)) return [0, 0];
	let t = j(e), n = t.bezel * w.shellK, r = M(t) * w.shellK;
	return e.rot ? [2 * r, 2 * n] : [2 * n, 2 * r];
}, F = (e) => `${Math.round(e.w)}×${Math.round(e.h)}`, I = (t) => {
	let n = e[t.dev][t.folded ? "cover" : "open"].cutIn, r = t.right ? "landscape-right" : t.w > t.h ? "landscape-left" : "portrait";
	return n[r] ?? n[r === "landscape-right" ? "landscape-left" : "landscape-right"] ?? "";
}, ee = (e) => ({
	old: {
		r: e,
		held: !1,
		grow: new f(0, (e) => a(0, 1, e)),
		blur: new f(0),
		veil: new f(0),
		op: new f(1)
	},
	neu: {
		r: null,
		op: new f(0),
		blur: new f(0)
	},
	swap: null
}), L = (e, t) => i((t - e.t0) / e.dur, 0, 1), R = (e) => w.swapBlur * 4 * e * (1 - e), te = (e) => e < .5 ? R(e) : r(w.swapBlur, 0, a(.5, 1, e)), z = (e, t, n, r) => {
	let i = e.edge !== t.edge, a = i ? n < .5 ? 1 - 2 * n : 2 * n - 1 : 1, o = i && n < .5 ? e : t;
	return {
		w: i ? o.w * a : r(e.w, t.w),
		h: r(e.h, t.h),
		y: r(e.y, t.y),
		x: i ? o.x ?? .5 : r(e.x ?? .5, t.x ?? .5),
		rad: r(_(e), _(t)),
		flat: r(v(e), v(t)),
		edge: o.edge,
		lens: (o.w > 0 ? o : e).lens
	};
}, ne = (e, t, n, r) => Array.from({ length: Math.max(e.length, t.length) }, (i, a) => z(e[a] ?? {
	...t[a],
	w: 0,
	h: 0
}, t[a] ?? {
	...e[a],
	w: 0,
	h: 0
}, n, r)), re = (e, t, n, r, i, a, o) => {
	let s = M(e) * w.shellK, c = s * C, l = y(t, n, r, {
		w: c,
		h: c,
		y: n + (s - c) / 2
	}, i, a);
	return {
		...l,
		on: l.on && o > .01
	};
}, ie = () => t.matches, ae = (e) => i(1 - e / 24, 0, 1), oe = (e, t, n) => {
	if (!n) return {
		w: e.dpW,
		h: e.dpH
	};
	let r = Math.max(t.w / e.dpW, t.h / e.dpH);
	return {
		w: e.dpW * r,
		h: e.dpH * r
	};
}, se = (() => {
	let e = w.lightAz * Math.PI / 180, t = w.lightEl * Math.PI / 180;
	return [
		Math.cos(t) * Math.cos(e),
		-Math.cos(t) * Math.sin(e),
		Math.sin(t)
	];
})(), ce = (e) => i(w.ambient + (1 - w.ambient) * Math.max(0, e[0] * se[0] + e[1] * se[1] + e[2] * se[2]) / se[2], 0, 1.5), le = (e) => [
	1,
	3,
	5
].map((t) => parseInt(e.slice(t, t + 2), 16)), ue = (e, t) => `rgb(${e.map((e) => Math.round(t <= 1 ? e * t : e + (255 - e) * (t - 1) * .5)).join(" ")})`, de = (e, t) => {
	let n = ue(e, t);
	return `linear-gradient(90deg, ${`color-mix(in srgb, ${n}, var(--device-veil) 18%)`} 0, ${n} 10%, ${n} 90%, ${`color-mix(in srgb, ${n}, var(--device-shade) 20%)`} 100%)`;
}, fe = (e) => e <= 1 ? ["var(--device-shade)", w.screenDim * (1 - e)] : ["var(--device-veil)", (e - 1) * .25], pe = (e) => {
	let t = [], n = 0, r = 0;
	for (let i = 0; i < e.length; i++) {
		let a = e[i];
		a === "(" ? n++ : a === ")" ? n-- : a === "," && !n && (t.push(e.slice(r, i)), r = i + 1);
	}
	return [...t, e.slice(r)].filter((e) => e.trim());
}, B = (e) => e.toFixed(2) + "px", V = (e) => e.map(B).join(" ");
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
var he = (e, t, n) => e.map(([e, r, i, a, o]) => `${B((e * Math.cos(t) + r * Math.sin(t)) * n)} ${B((-e * Math.sin(t) + r * Math.cos(t)) * n)} ${B(i * n)} ${B(a * n)} ${o}`).join(", "), ge = (e) => {
	let t = e.open, n = e.look.open, r = 19 / Math.max(t.w, t.h), a = t.w * r, o = t.h * r, s = 10 - a / 2, c = 10 - o / 2, l = 1.4, u = (e) => e.toFixed(2), d = i((Math.max(...n.radius) + n.bezel * w.shellK) * r * 1.8, 1.2, Math.min(a, o) / 3), f = l / 2 + i(n.bezel * w.shellK * r, .9, 2.2), p = Math.max(.4, d - f + l / 2), h = m(e), g = (e, t, n, r) => `<rect x="${u(e)}" y="${u(t)}" width="${u(n)}" height="${u(r)}" rx="${u(p)}" fill="currentColor" fill-opacity=".16"/>`, _ = e.fold ? h ? g(s + f, c + f, a - 2 * f, o / 2 - f - .4) + g(s + f, c + o / 2 + .4, a - 2 * f, o / 2 - f - .4) : g(s + f, c + f, a / 2 - f - .4, o - 2 * f) + g(s + a / 2 + .4, c + f, a / 2 - f - .4, o - 2 * f) : g(s + f, c + f, a - 2 * f, o - 2 * f), v = "", y = n.cuts[0];
	if (y) {
		let e = s + a * (y.x ?? .5), t = c + f + 1.1;
		v = y.edge === "right" ? `<rect x="${u(s + a - f - 1.7)}" y="${u(c + o * (y.x ?? .5) - 1.8)}" width="1.2" height="3.6" rx=".6" fill="currentColor"/>` : y.w > y.h * 3 ? `<rect x="${u(e - 1.8)}" y="${u(t - .6)}" width="3.6" height="1.2" rx=".6" fill="currentColor"/>` : `<circle cx="${u(e)}" cy="${u(t)}" r=".75" fill="currentColor"/>`;
	}
	let b = e.fold ? `<path d="${h ? `M${u(s)} ${u(c + o / 2)}H${u(s + a)}` : `M${u(s + a / 2)} ${u(c)}V${u(c + o)}`}" stroke="currentColor" stroke-width=".8"/>` : "";
	return `<svg class="pn-sil" viewBox="0 0 20 20" aria-hidden="true">${_}<rect x="${u(s + l / 2)}" y="${u(c + l / 2)}" width="${u(a - l)}" height="${u(o - l)}" rx="${u(d)}" fill="none" stroke="currentColor" stroke-width="${l}"/>${b}${v}</svg>`;
}, _e = (e) => e.kind === "device" ? e.dev : e.sel, ve = (e) => `${Math.round(e.open.w)}×${Math.round(e.open.h)}`, ye = (e) => `${((e - 240) / 1360 * 100).toFixed(3)}%`;
// src/scene/draw.ts
function be(e, t, n, r) {
	let i = e.stretchOf.get(t);
	(i || !e.seeding || e.seeding.has(t)) && (i || (i = {
		w0: Math.max(n, 1),
		h0: Math.max(r, 1),
		k: [1, 1]
	}, e.stretchOf.set(t, i), Object.assign(t.style, {
		width: B(i.w0),
		height: B(i.h0)
	})), i.k = [n / i.w0, r / i.h0], t.style.transform = `scale(${i.k[0].toFixed(5)}, ${i.k[1].toFixed(5)})`);
}
function xe(e) {
	e.RG.F.base.cast.style.background = `linear-gradient(90deg, ${s(1)}, ${s(.35)} 45%, ${s(0)} 90%)`;
	for (let [t, n] of [[e.RG.F.inner, "to left"], [e.RG.F.outer, "to right"]]) t.dark.style.background = `linear-gradient(${n}, ${[
		0,
		.2,
		.4,
		.6,
		.8,
		1
	].map((e) => `${s(Math.min(1, 2 * Math.max(0, (e - .2) / .8) ** 1.35) * w.foldDark)} ${e * 100}%`).join(", ")})`, t.blurs.forEach(({ el: e }, t) => {
		e.style.webkitMaskImage = e.style.maskImage = `linear-gradient(${n}, transparent ${((t + .5) / 4 * 100).toFixed(1)}%, var(--device-shade) ${((t + 1) / 4 * 100).toFixed(1)}%)`;
	});
}
function Se(e, t, n, r, i, a, o, s, c = 0, l = 1) {
	let u = h(e.rig.d, i ? "cover" : "open");
	H(t, n, (u.w - r.w) * o / 2 - a * o, r.w * o, r.h * o, l, c, (u.h - r.h) * o / 2), t.style.transform = `rotate(${-ot(e, s).angle}deg)`;
}
function Ce(e, t, n, r, i, a) {
	let o = e.layer.old, s = e.layer.neu, c = e.rig.oldSpec, l = n === e.rig.plan.outer, u = (t, o, s, c, u = 1) => Se(e, t, o, s, l, n.du, r, i, c * a, u);
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
	} else u(t.old, c, oe(c, n.frame, o.grow.b > 0), o.blur.at(i)), t.veil.style.opacity = String(o.veil.at(i));
	n.neu && s.r ? u(t.neu, s.r, {
		w: s.r.dpW,
		h: s.r.dpH
	}, s.blur.at(i), s.op.at(i)) : t.neu.style.opacity = "0", t.el.style.background = (s.r && s.op.at(i) > .5 && n.neu ? s.r : c).edge;
}
function we(e, t, n) {
	let { angle: r, cy: i } = ot(e, n);
	t.style.transformOrigin = `${W(e).cx}px ${i}px`, t.style.transform = `rotate(${r}deg)`;
}
function Te(e, t, { body: n, span: r, bodyR: a, scr: o, scrR: s, backScrR: c, T: l, normal: u, tone: d, hk: f, hingeLeft: p, u: m }) {
	let [h, g, _, v] = n, y = _ - h, b = v - g, x = ((e) => e.map((e) => i(e, 0, Math.min(y, b) / 2)))(a), S = (e) => [
		e[1],
		e[0],
		e[3],
		e[2]
	];
	for (let [n, i] of [[t.front, !1], [t.back, !0]]) {
		let t = i ? _ - o[2] : o[0] - h, a = i ? S(c || s) : s, v = o[2] - o[0], C = o[3] - o[1];
		if (Object.assign(n.body.style, {
			left: B(h),
			top: B(g),
			width: B(y),
			height: B(b),
			backgroundColor: ue(d, 1),
			borderRadius: V(i ? S(x) : x),
			transform: i ? `translateZ(${B(-l)}) rotateY(180deg)` : "none"
		}), n.clip && Object.assign(n.clip.style, {
			left: B(t),
			top: B(o[1] - g),
			width: B(v),
			height: B(C),
			borderRadius: V(a)
		}), n.ring) {
			let r = 2 * m / e.rig.z, s = r * f, [c, l] = p ? [s, r] : [r, s], [u, d] = i ? [l, c] : [c, l];
			Object.assign(n.ring.style, {
				left: B(t - u),
				top: B(o[1] - g - r),
				width: B(v + u + d),
				height: B(C + 2 * r),
				borderWidth: `${B(r)} ${B(d)} ${B(r)} ${B(u)}`,
				borderRadius: V(a.map((e) => e + r))
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
		n.gloss.style.left = i ? "0px" : B(r[0] - h), be(e, n.gloss, i ? y : r[1] - r[0], b);
		for (let t of n.fit) be(e, t, v, C);
	}
	let C = me(n, x, w.arcSegs);
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
			width: B(l),
			height: B(r),
			marginLeft: B(-l / 2),
			marginTop: B(-r / 2),
			transform: `translate3d(${B(n.x)},${B(n.y)},${B(-l / 2)}) rotateZ(${n.a.toFixed(3)}deg) rotateY(90deg)`
		}), e.style.background = de(d, ce(u([
			Math.cos(i),
			Math.sin(i),
			0
		])));
	});
}
function Ee(e, t, n, r) {
	let i = e.rig.d.plate.blur && n > .01, a = Number(t.neu.style.opacity) > .5 ? t.neu : t.old;
	t.blurs.forEach(({ el: t, inv: o, img: s }, c) => {
		let l = w.foldBlur * n * ((c + 1) / 4) ** 1.35 * r, u = parseFloat((/blur\(([\d.]+)px\)/.exec(a.style.filter) || ["0", "0"])[1]);
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
function De(e, { hu: t, T0: n, Bv: i, t: a, s: o, k: s, sn: c, cs: l, lift: u, tone: d, u: f }) {
	let p = e.rig.d, m = p.open.hinge, h = 3 * f;
	p.look.open.btn.forEach((g, _) => {
		let v = p.look.cover.btn[_], y = g.at < m, b = r(y ? m - g.at - g.len : g.at - m, v.at, y ? s : 0), x = r(y ? m - g.at : g.at + g.len - m, v.at + v.len, y ? s : 0), [S, C] = y ? [-x * l, -b * l].sort((e, t) => e - t) : [b, x], w = (b + x) / 2;
		Object.assign(e.RG.btns[_].style, {
			left: B(t + S * o),
			top: B(g.side > 0 ? n - a - h + .5 * f : n + i + a - .5 * f),
			width: B((C - S) * o),
			height: B(h),
			backgroundColor: d,
			opacity: +((y ? r(g.len, v.len, s) : g.len) * o > .5 * f),
			transform: `translateZ(${B(u + (y ? w * o * c : 0))})`
		});
	});
}
var Oe = (e) => e.elevationOf ??= pe(getComputedStyle(e.rigEl).getPropertyValue("--elevation-2")).map((e) => {
	let t = /^\s*(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(.+)$/.exec(e);
	return t ? [
		+t[1],
		+t[2],
		+t[3],
		+t[4],
		t[5].trim()
	] : null;
}).filter((e) => e !== null);
function ke(e, t) {
	let { th: n, s: i, hx: o, top: c, cy: l, angle: u } = ot(e, t), d = e.rig.sRef, f = i / d, h = 1 / f, g = l - (l - c) * d / i, _ = n / 180, v = n * Math.PI / 180, y = Math.sin(v), b = Math.cos(v), x = e.rig.d, S = q(e, t), C = S.bezel * w.shellK * d, [T, E] = rt(e, S).map((e) => e * d), D = le(S.tone), O = r(e.rig.half.u, e.rig.cover.u, _) * d, k = r(e.rig.half.v, e.rig.cover.v, _) * d, A = r(e.rig.half.u, Math.min(e.rig.half.u, e.rig.cover.u), a(w.shrinkFrom, 180, n)) * d, j = k, M = x.plate.thickness * d, N = x.plate.gap * d / 2, P = (M + 2 * N) * (1 - b) / 2, F = a(20, 160, n), I = T * F, ee = m(x) ? 3 : 0, L = p(x.look.open.radius, ee).map((e) => e * d), R = p(x.look.cover.radius, ee).map((e) => e * d), te = a(60, 120, n), z = (e, t) => r(e, t, te) + C, ne = [
		z(L[0], R[0]) * F,
		z(L[1], R[1]),
		z(L[2], R[2]),
		z(L[3], R[3]) * F
	], ie = [
		z(L[0], R[1]),
		z(L[1], R[0]) * F,
		z(L[2], R[3]) * F,
		z(L[3], R[2])
	], oe = ne[1], se = ne[0], ue = `${B(o)} ${B(l)}`, fe = f.toFixed(5);
	Object.assign(e.RG.lift.style, {
		perspective: w.perspective + "px",
		perspectiveOrigin: ue
	}), Object.assign(e.RG.space.style, {
		transformOrigin: ue,
		transform: `scale3d(${fe},${fe},${fe}) translateZ(${B(-P)})`
	});
	let pe = u * Math.PI / 180, V = Math.cos(pe), me = Math.sin(pe), ge = (e) => [
		e[0] * V - e[1] * me,
		e[0] * me + e[1] * V,
		e[2]
	], _e = (e) => [
		e[0] * b + e[2] * y,
		e[1],
		-e[0] * y + e[2] * b
	];
	for (let t of [e.RG.base, e.RG.leaf]) Object.assign(t.el.style, {
		left: B(o),
		top: B(g)
	});
	e.RG.leaf.el.style.transform = `translateZ(${B(N)}) rotateY(${n.toFixed(3)}deg) translateZ(${B(-N)})`;
	let ve = [-O - T, A + T];
	Te(e, e.RG.base, {
		body: [
			-I,
			-E,
			A + T,
			j + E
		],
		span: ve,
		bodyR: ne,
		scr: [
			0,
			0,
			A,
			j
		],
		scrR: [
			L[0] * F,
			L[1],
			L[2],
			L[3] * F
		],
		T: M,
		normal: ge,
		tone: D,
		hk: F,
		hingeLeft: !0,
		u: h
	}), Te(e, e.RG.leaf, {
		body: [
			-O - T,
			-E,
			I,
			k + E
		],
		span: ve,
		bodyR: ie,
		scr: [
			-O,
			0,
			0,
			k
		],
		scrR: [
			L[0],
			L[1] * F,
			L[2] * F,
			L[3]
		],
		backScrR: [
			R[1],
			R[0] * F,
			R[3] * F,
			R[2]
		],
		T: M,
		normal: (e) => ge(_e(e)),
		tone: D,
		hk: F,
		hingeLeft: !1,
		u: h
	}), Ce(e, e.RG.F.base, e.rig.plan.base, d, t, h), Ce(e, e.RG.F.inner, e.rig.plan.inner, d, t, h), Ce(e, e.RG.F.outer, e.rig.plan.outer, d, t, h), Ee(e, e.RG.F.inner, n <= 90 ? y : 0, h), Ee(e, e.RG.F.outer, n > 90 ? y : 0, h);
	let ye = et(e, !1, d), be = x.open.hinge * d;
	Ie(e.RG.F.outer.cams, et(e, !0, d), 0, 0, 1, u), Ie(e.RG.F.inner.cams, ye, 0, 0, 1, u), Ie(e.RG.F.base.cams, ye, -be, 0, 1, u);
	let xe = (e) => {
		let t = x[e ? "cover" : "open"], n = Number(x.look[e ? "cover" : "open"].home) || 0;
		return [re(S, t.w, t.h, m(x), d, m(x), n), n];
	}, [Se, we] = xe(!1), [ke, Ae] = xe(!0);
	Fe(e.RG.base.front.home, Se, I - be, E, we), Fe(e.RG.leaf.front.home, Se, T, E, we), Fe(e.RG.leaf.back.home, ke, I, E, Ae);
	let je = w.shade * (.85 * a(90, 180, n) + .25 * y);
	e.RG.F.base.cast.style.opacity = je.toFixed(4);
	let Me = -I, Ne = -M, Pe = -M - N, H = I * b + Pe * y, U = N - I * y + Pe * b, Le = Math.hypot(H - Me, U - Ne), W = Math.atan2(-(U - Ne), H - Me), Re = j + 2 * E;
	Object.assign(e.RG.spine.style, {
		display: Le > .3 && M > .05 ? "" : "none",
		left: B(o),
		top: B(g - E),
		width: B(Le + .6 * h),
		height: B(Re),
		marginLeft: B(-(Le + .6 * h) / 2),
		borderRadius: `${B(Math.min(se, (Le + .6 * h) / 2))} / ${B(se)}`,
		transform: `translate3d(${B((Me + H) / 2)},0,${B((Ne + U) / 2)}) rotateY(${(W * 180 / Math.PI).toFixed(3)}deg)`
	}), e.RG.spine.style.background = de(D, ce(ge([
		Math.sin(W),
		0,
		Math.cos(W)
	])));
	let ze = o - O * b, G = Math.min(o - I, ze - T), K = Math.max(o + A + T, ze + T);
	Object.assign(e.RG.plate.style, {
		left: B(G),
		top: B(g - E),
		width: B(K - G),
		height: B(j + 2 * E),
		borderRadius: B(oe),
		transform: `translateZ(${B(-M - h)})`,
		boxShadow: he([...Oe(e), [
			0,
			10 + 18 * y,
			30 + 34 * y,
			0,
			s(.05 * y)
		]], pe, h)
	}), m(x) ? De(e, {
		hu: o,
		T0: g,
		Bv: j,
		t: E,
		s: d,
		k: _,
		sn: y,
		cs: b,
		lift: P,
		tone: S.tone,
		u: h
	}) : S.btn.forEach((t, n) => {
		Object.assign(e.RG.btns[n].style, {
			left: B(Math.max(o + A, ze) + T - .5 * h),
			top: B(g + t.at * d),
			width: B(3 * h),
			height: B(t.len * d),
			backgroundColor: S.tone,
			opacity: +(t.len * d > .5 * h),
			transform: `translateZ(${B(P)})`
		});
	});
	let Be = ae(n), Ve = w.crease * Be;
	Object.assign(e.RG.crease.style, {
		left: B(o),
		top: B(g),
		width: B(14 * h),
		marginLeft: B(-7 * h),
		height: B(j),
		opacity: Ve * e.hingeOp.at(t)
	});
	let J = o - (V + me > 0 ? 0 : h);
	Object.assign(e.RG.tTop.style, {
		left: B(J),
		top: B(g - E),
		width: B(h),
		height: B(E),
		opacity: Be
	}), Object.assign(e.RG.tBot.style, {
		left: B(J),
		top: B(g + j),
		width: B(h),
		height: B(E),
		opacity: Be
	});
}
function Ae(e, t, n, i, o) {
	let s = i.old, c = i.neu, l = i.swap, u = l ? L(l, o) : 0, d = l ? a(0, 1, u) : c.op.at(o), f = l ? te(u) : c.blur.at(o), p = Math.max(s.blur.at(o), l ? te(u) : 0);
	if (e.l0.style.transform = e.l1.style.transform = "", s.r) {
		let i = s.held ? s.grow.at(o) : 0, a = oe(s.r, {
			w: t.w / n,
			h: t.h / n
		}, i > 0), c = r(s.r.dpW, a.w, i) * n, l = r(s.r.dpH, a.h, i) * n;
		H(e.l0, s.r, (t.w - a.w * n) / 2 * i, c, l, s.op.at(o), p, (t.h - a.h * n) / 2 * i);
	} else e.l0.style.opacity = "0";
	e.veil.style.opacity = String(s.veil.at(o)), c.r ? H(e.l1, c.r, 0, c.r.dpW * n, c.r.dpH * n, d, f) : e.l1.style.opacity = "0";
	let m = c.r ? l ? a(0, 1, u) : d : 0;
	return m > 0 && m < 1 && (e.l0.style.transformOrigin = e.l1.style.transformOrigin = "50% 50%", e.l0.style.transform = `scale(${(1 + w.swapZoom * m).toFixed(4)})`, e.l1.style.transform = `scale(${(1 - w.swapZoom * (1 - m)).toFixed(4)})`), c.r && d > .5 ? c.r : s.r;
}
function je(e, t, n, i, o) {
	let { p: s } = ut(e, o), c = e.spin.dir * 90 * s, l = c * Math.PI / 180, u = e.layer.old, d = (e, t, r, i, a, o = 0, s = 0) => {
		H(e, t, (n.w - r.w) / 2 + o, r.w, r.h, i, a, (n.h - r.h) / 2 + s), e.style.transform = `rotate(${(-c).toFixed(3)}deg)`;
	};
	if (t.veil.style.opacity = String(u.veil.at(o)), !u.r) return t.l0.style.opacity = t.l1.style.opacity = "0", null;
	if (!e.spin.cached || !e.spin.to.img) {
		let e = {
			w: (Math.abs(n.w * Math.cos(l)) + Math.abs(n.h * Math.sin(l))) / i,
			h: (Math.abs(n.w * Math.sin(l)) + Math.abs(n.h * Math.cos(l))) / i
		}, a = oe(u.r, e, !0), s = u.grow.at(o), c = {
			w: r(u.r.dpW, a.w, s) * i,
			h: r(u.r.dpH, a.h, s) * i
		};
		return d(t.l0, u.r, c, 1, u.blur.at(o), (u.r.dpW * i - n.w) / 2 * (1 - s), (u.r.dpH * i - n.h) / 2 * (1 - s)), t.l1.style.opacity = "0", u.r;
	}
	let f = a(w.spinSwapA, w.spinSwapB, s), p = R(f), m = u.r, h = e.spin.to.img;
	return d(t.l0, m, {
		w: m.dpW * i,
		h: m.dpH * i
	}, 1, p), d(t.l1, h, {
		w: h.dpW * i,
		h: h.dpH * i
	}, f, p), f > .5 ? h : m;
}
function Me(e, t, n, r, i, a, o, s, c = !1) {
	let { cx: l } = W(e), u = w.gap, d = n.y;
	t.el.style.opacity = String(s), Object.assign(t.stage.style, {
		left: l - n.w / 2 + "px",
		top: d + "px",
		width: n.w + "px",
		height: n.h + "px"
	});
	let f = c ? je(e, t, n, i, o) : Ae(t, n, i, a, o);
	t.stage.style.background = f ? f.edge : "var(--surface-container)";
	let m = r.look, h = p(m.radius, +!!r.rot + (r.mirrored ? 2 : 0)).map((e) => e * i * r.shell);
	t.stage.style.borderRadius = V(h), Object.assign(t.outline.style, {
		left: l - r.w / 2 + "px",
		top: d - u + "px",
		width: r.w + "px",
		height: r.h + "px",
		borderRadius: V(h.map((e) => e > 0 ? e + u : 0)),
		opacity: r.op
	});
	let g = m.bezel * w.shellK * i, _ = M(m) * w.shellK * i, v = l - n.w / 2, b = r.rot ? _ : g, x = r.rot ? g : _;
	Object.assign(t.shell.style, {
		left: v - b + "px",
		top: d - x + "px",
		width: n.w + 2 * b + "px",
		height: n.h + 2 * x + "px",
		borderRadius: V(h.map((e) => e + g)),
		backgroundColor: m.tone,
		opacity: r.shell
	});
	let S = (r.rot ? n.w : n.h) / i;
	m.btn.forEach((e, a) => {
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
			backgroundColor: m.tone,
			opacity: c > .5 ? r.shell : 0
		}), r.mirrored && (o.style.left = 2 * v + n.w - parseFloat(o.style.left) - parseFloat(o.style.width) + "px", o.style.top = 2 * d + n.h - parseFloat(o.style.top) - parseFloat(o.style.height) + "px");
	}), Ie(t.cams, m.cams.map((e) => y((r.rot ? n.h : n.w) / i, S, r.rot, e, i, r.mirrored)), 0, 0, r.shell);
	let C = Number(m.home) || 0;
	Fe(t.home, re(m, (r.rot ? n.h : n.w) / i, S, r.rot, i, r.mirrored, C), v, d, r.shell * C);
	let T = r.crease, E = r.rot !== !!r.tall;
	t.crease.classList.toggle("h", E), Object.assign(t.crease.style, E ? {
		left: "0px",
		top: n.h / 2 + "px",
		width: n.w + "px",
		height: "",
		opacity: T * e.hingeOp.at(o)
	} : {
		left: n.w / 2 + "px",
		top: "0px",
		width: "",
		height: n.h + "px",
		opacity: T * e.hingeOp.at(o)
	});
	let D = T > 0 ? r.shell * Math.min(1, T / Math.max(.01, w.crease)) : 0;
	E ? (Object.assign(t.tTop.style, {
		left: v - b + "px",
		top: d + n.h / 2 + "px",
		width: b + "px",
		height: "1px",
		opacity: D
	}), Object.assign(t.tBot.style, {
		left: v + n.w + "px",
		top: d + n.h / 2 + "px",
		width: b + "px",
		height: "1px",
		opacity: D
	})) : (Object.assign(t.tTop.style, {
		left: l + "px",
		top: d - x + "px",
		width: "1px",
		height: x + "px",
		opacity: D
	}), Object.assign(t.tBot.style, {
		left: l + "px",
		top: d + n.h + "px",
		width: "1px",
		height: x + "px",
		opacity: D
	}));
}
function Ne(t, n) {
	if (t.rig.on) {
		t.UA.el.hidden = !0, t.UB.el.hidden = !0, t.rigEl.hidden = !1, we(t, t.rigEl, n), ke(t, n);
		return;
	}
	t.rigEl.hidden = !0, t.UA.el.hidden = !1;
	let i = t.V.s.at(n), a = t.spin.on ? t.spin.from : t.cur;
	if (t.spin.on) {
		let { p: e } = ut(t, n), { f0: i, f1: a } = t.spin, o = i.y + i.h / 2, s = a.y + a.h / 2;
		t.UA.el.style.transformOrigin = `${i.cx}px ${o}px`;
		let c = (r(1, a.s / i.s, e) * (1 - w.rotDip * Math.sin(Math.PI * e))).toFixed(4);
		t.UA.el.style.transform = `translate(${((a.cx - i.cx) * e).toFixed(2)}px, ${((s - o) * e).toFixed(2)}px) rotate(${(t.spin.dir * 90 * e).toFixed(3)}deg) scale(${c})`, t.UA.el.style.setProperty("--spin-s", c);
	}
	if (Me(t, t.UA, {
		w: t.V.w.at(n),
		h: t.V.h.at(n),
		y: t.V.y.at(n)
	}, {
		w: t.O.w.at(n),
		h: t.O.h.at(n),
		op: t.outlineOp.at(n),
		crease: t.creaseOp.at(n),
		shell: t.shellOp.at(n),
		rot: !!a.rot,
		mirrored: !!a.mirrored,
		tall: a.kind === "device" && m(e[a.dev]),
		look: q(t, n)
	}, i, t.layer, n, t.unitOp.a.at(n), t.spin.on), t.fadeB) {
		t.UB.el.hidden = !1;
		let r = t.fadeB.f, i = w.gap, a = t.fadeB.st;
		Me(t, t.UB, {
			w: r.w,
			h: r.h,
			y: r.y
		}, {
			w: r.w + 2 * i,
			h: r.h + 2 * i,
			op: +!!D(a),
			crease: A(a) ? w.crease : 0,
			shell: +!!O(a),
			rot: !!a.rot,
			mirrored: !!a.mirrored,
			tall: a.kind === "device" && m(e[a.dev]),
			look: O(a) ? j(a) : q(t, n)
		}, r.s, t.fadeB.layers, n, t.unitOp.b.at(n));
	} else t.UB.el.hidden = !0;
}
function Pe(e, t) {
	let n = e.rulerOp.at(t);
	if (e.focusW && !e.tr && !e.queued && n > .99 && (e.focusW = !1, e.RL.w.focus()), n < .01 && (e.roll.w.snap(e.cur.w), e.roll.h.snap(e.cur.h)), e.RL.el.hidden = n < .01 && !e.editing, e.RL.el.hidden) return;
	e.RL.el.style.opacity = String(n);
	let { cx: r } = W(e), a = Math.max(w.gap, (N(q(e, t)) * e.V.s.at(t) + 6) * e.shellOp.at(t)), o = e.V.w.at(t), s = e.V.h.at(t), c = e.V.y.at(t), l = r - o / 2, u = r + o / 2, d = c + s, f = (c + d) / 2, p = c - a - 15, m = l - a - 22, h = 4.5;
	for (let [n, r] of [["w", e.RL.w], ["h", e.RL.h]]) {
		if (document.activeElement === r) continue;
		let i = String(Math.round(e.roll[n].at(t)));
		e.RL.shown[n] !== i && (r.value = i, e.RL.shown[n] = i);
	}
	let g = i(e.RL.w.value.length * 7.2 + 16, 0, u - l - 4 * h) / 2, _ = i(30, 0, d - c - 4 * h) / 2, v = (e) => e.toFixed(1);
	e.RL.ext.setAttribute("d", `M${v(l)} ${v(c - a)}V${v(p - 5)}M${v(u)} ${v(c - a)}V${v(p - 5)}M${v(l - a)} ${v(c)}H${v(m - 5)}M${v(l - a)} ${v(d)}H${v(m - 5)}`), e.RL.dim.setAttribute("d", `M${v(l)} ${v(p)}H${v(r - g)}M${v(r + g)} ${v(p)}H${v(u)}M${v(l + h)} ${v(p - h)}L${v(l)} ${v(p)}L${v(l + h)} ${v(p + h)}M${v(u - h)} ${v(p - h)}L${v(u)} ${v(p)}L${v(u - h)} ${v(p + h)}M${v(m)} ${v(c)}V${v(f - _)}M${v(m)} ${v(f + _)}V${v(d)}M${v(m - h)} ${v(c + h)}L${v(m)} ${v(c)}L${v(m + h)} ${v(c + h)}M${v(m - h)} ${v(d - h)}L${v(m)} ${v(d)}L${v(m + h)} ${v(d - h)}`), e.RL.w.style.left = r + "px", e.RL.w.style.top = p + "px", e.RL.h.style.left = m + "px", e.RL.h.style.top = f + "px";
}
function H(e, t, n, r, i, a, o, s = 0) {
	!t || a <= .001 ? e.style.opacity = "0" : (e.dataset.u !== t.url && (e.src = t.url, e.dataset.u = t.url), e.style.left = n + "px", e.style.top = s + "px", e.style.width = r + "px", e.style.height = i + "px", e.style.opacity = String(a), e.style.filter = o > .05 ? `blur(${o.toFixed(2)}px)` : "none");
}
var Fe = (e, t, n, r, i, a = 0) => {
	if (Object.assign(e.style, {
		left: t.left + n + "px",
		top: t.top + r + "px",
		width: t.width + "px",
		height: t.height + "px",
		borderRadius: t.corners,
		opacity: t.on ? i : 0
	}), e.classList.toggle("lens", !!t.lens), !t.lens) return;
	let [o, s] = x(a);
	for (let [n, r] of [
		["--lens-inset", b.inset * t.lens + "px"],
		["--lens-ring", b.ring * t.lens + "px"],
		["--lens-glint-x", o],
		["--lens-glint-y", s],
		["--lens-glint", b.glint * 100 + "%"]
	]) e.style.setProperty(n, r);
}, Ie = (e, t, n, r, i, a = 0) => e.forEach((e, o) => t[o] ? Fe(e, t[o], n, r, i, a) : e.style.opacity = "0");
// src/scene/engine.ts
function U(t, r) {
	let i;
	if (r === "original") i = { ...t.ORIGINAL };
	else if (t.PRESETS.some((e) => e.sel === r)) i = {
		...t.PRESETS.find((e) => e.sel === r),
		kind: "preset",
		img: null
	};
	else if (/^custom:\d+x\d+$/.test(r)) {
		let [e, t] = r.slice(7).split("x").map(Number);
		i = {
			sel: r,
			kind: "custom",
			name: n("size.custom"),
			w: e,
			h: t,
			img: null
		};
	} else {
		let [t, n, ...a] = r.split(":"), o = e[t], s = n === "open" || n === "cover" ? o?.[n] : void 0;
		if (!o || !s) return null;
		let c = a.includes("rot"), l = a.includes("right");
		if (s.fixed && (c || l)) return null;
		i = {
			sel: r,
			kind: "device",
			dev: t,
			folded: n === "cover",
			rot: c,
			right: l,
			...g(s, c, l),
			name: o.name,
			short: o.short,
			w: c ? s.h : s.w,
			h: c ? s.w : s.h,
			hinge: s.hinge,
			img: null
		};
	}
	return t.target?.sel === r && (i.w = t.target.w, i.h = t.target.h), i.img = t.images.get(r) || t.cur?.img || t.ORIGINAL.img, i;
}
var Le = (e) => {
	let t = `${w.foldLift},${w.foldLand}`;
	return t !== e.foldEaseKey && (e.foldEaseKey = t, e.foldEaseFn = u(w.foldLift, 0, w.foldLand, 1)), e.foldEaseFn;
};
function W(e, t) {
	let n = e.root.clientWidth, a = i((n - 400) / 400, 0, 1), o = Math.max(r(w.gap + 22 + Math.ceil(e.badge.w / 2) + 10, 90, a), t && O(t) && e.hooks.insetOn?.() ? 114 : 0);
	return {
		W: n,
		side: o,
		cx: n / 2,
		top: 48,
		maxW: Math.max(60, n - 2 * o),
		maxH: Math.max(60, e.root.clientHeight - 48 - 88)
	};
}
var Re = (e, t) => O(t) && e.hooks.insetOn?.() && e.hooks.insetBelow?.() ? 40 : 0, ze = (e, t, n) => {
	if (!O(t) || !e.hooks.insetOn?.()) return {
		w: 0,
		h: 0
	};
	let r = I(t);
	return {
		w: r.includes("w") ? Math.max(0, 178 - n) : 0,
		h: r.includes("h") ? 32 : 0
	};
};
function G(e, t) {
	let n = W(e, t), r = ze(e, t, n.side), i = (e, t, n) => {
		let [r, i] = P(e);
		return Math.min(t / (e.w + r), n / (e.h + i), 2);
	}, a = (n, r) => Math.min(i(e.ORIGINAL, n, r), i(t, n, r)), o = n.maxW, s = n.maxH, c = 0, l = a(o, s), u = (s - (t.h + P(t)[1]) * l) / 2, d = Re(e, t), f = u < Math.max(r.h, d);
	r.w && (o - (t.w + P(t)[0]) * l) / 2 < r.w && (o -= 2 * r.w), r.h && f && (s -= r.h, c = r.h), d && f && (s -= d), l = a(o, s);
	let p = t.h * l, m = P(t)[1] * l;
	return {
		s: l,
		w: t.w * l,
		h: p,
		cx: n.cx,
		y: n.top + c + m / 2 + Math.max(0, (s - p - m) / 2)
	};
}
function K(e, t, n = 0, r, i = r, a = 0) {
	let o = w.gap;
	for (let [i, o] of [
		[e.V.w, t.w],
		[e.V.h, t.h],
		[e.V.s, t.s],
		[e.V.y, t.y]
	]) r ? i.set(o, r, n, a) : i.snap(o);
	for (let [r, a] of [[e.O.w, t.w + 2 * o], [e.O.h, t.h + 2 * o]]) i ? r.set(a, i, n) : r.snap(a);
}
function Be(e, t, n) {
	let r = e.clock.t;
	e.look.a = n || !e.look.b ? t : q(e, r), e.look.b = t, e.look.t0 = n ? -1e9 : r;
}
function q(t, n) {
	let a = t.look.a, s = t.look.b;
	if (!s) return e.s26.look.open;
	let c = o(i((n - t.look.t0) / t.look.dur, 0, 1)), l = (e, t) => r(e, t, c);
	return {
		tone: s.tone,
		bezel: l(a.bezel, s.bezel),
		ends: l(M(a), M(s)),
		home: l(Number(a.home) || 0, Number(s.home) || 0),
		radius: s.radius.map((e, t) => l(a.radius[t], e)),
		cams: ne(a.cams, s.cams, c, l),
		btn: s.btn.map((e, t) => {
			let n = a.btn[t];
			return n.side === e.side ? {
				side: e.side,
				at: l(n.at, e.at),
				len: l(n.len, e.len)
			} : c < .5 ? {
				side: n.side,
				at: n.at,
				len: n.len * (1 - 2 * c)
			} : {
				side: e.side,
				at: e.at,
				len: e.len * (2 * c - 1)
			};
		})
	};
}
function Ve(e, t) {
	let n = U(e, t), r = G(e, n);
	e.cur = n, e.tr = null, e.queued = null, e.rig.on = !1, e.spin.on = !1, e.fadeB = null, e.UA.el.style.transform = "", e.UA.el.style.removeProperty("--spin-s"), K(e, r), e.rulerOp.snap(1), J(e, n.img), e.outlineOp.snap(+!!D(n)), e.shellOp.snap(+!!O(n)), e.creaseOp.snap(A(n) ? w.crease : 0), e.unitOp.a.snap(1), e.unitOp.b.snap(0), xt(e, n, !0);
}
function J(e, t) {
	let n = e.layer.old, r = e.layer.neu;
	n.r = t, n.held = !1, n.grow.snap(0), n.blur.snap(0), n.veil.snap(0), n.op.snap(1), r.r = null, r.op.snap(0), r.blur.snap(0), e.layer.swap = null;
}
function He(e, t) {
	let n = e.layer.neu, r = e.layer.old, i = e.layer.swap, o = i ? te(L(i, t)) : n.blur.at(t), s = i ? a(0, 1, L(i, t)) : n.op.at(t);
	n.r && s > .5 ? (r.r = n.r, r.grow.snap(0), r.blur.snap(o), r.veil.snap(0), r.op.snap(1)) : i && r.blur.snap(o), r.held = !0, n.r = null, n.op.snap(0), n.blur.snap(0), e.layer.swap = null;
}
function Ue(e, t, n = !1) {
	let r = e.layer.old;
	r.grow.to(1, w.holdRise, t), r.blur.to(Math.max(n ? w.holdLight : w.holdBlur, r.blur.at(t)), w.holdRise, t), r.veil.to(w.veil, w.holdRise, t);
}
function We(e, t) {
	let n = e.layer.old;
	n.grow.to(0, 120, t), n.blur.to(0, 120, t), n.veil.to(0, 120, t);
}
var Ge = (e, t) => e.V.w.done(t) && e.V.h.done(t) && e.V.y.done(t) && e.V.s.done(t, .002), Ke = (e, t) => {
	let n = G(e, e.cur);
	return Math.abs(e.V.w.at(t) - n.w) < 3 && Math.abs(e.V.h.at(t) - n.h) < 3 && Math.abs(e.V.y.at(t) - n.y) < 3;
};
function qe(e, t) {
	let n = performance.now(), r = U(e, t);
	if (e.clock.t = n, !r || !e.cur || r.sel === e.cur.sel) return;
	if (e.rig.on || e.spin.on) {
		e.queued = r.sel;
		return;
	}
	let i = e.cur, a = i.kind === "device" && r.kind === "device" && i.dev === r.dev, o = !ie() && a && i.folded !== r.folded, s = !ie() && a && i.angle !== r.angle && i.folded === r.folded;
	if ((o || s) && !Ge(e, n)) {
		e.queued = r.sel;
		return;
	}
	if (e.queued = null, !e.tr && !O(i) && !O(r) && Math.round(i.w) === Math.round(r.w) && Math.round(i.h) === Math.round(r.h) && i.img) {
		e.images.has(r.sel) || e.images.set(r.sel, i.img), r.img = e.images.get(r.sel), e.cur = r, xt(e, r), Y(e);
		return;
	}
	let c = e.images.has(r.sel);
	e.cur = r, xt(e, r), ie() ? Ze(e, i, r, n) : o ? tt(e, i, r, n, c) : s ? lt(e, i, r, n, c) : Je(e, i, r, n, c), c && e.tr.kind !== "size" && (e.tr.arriveAt = n);
}
function Je(e, t, n, r, i) {
	e.tr && e.tr.kind === "fade" && Qe(e, r), He(e, r);
	let a = {
		w: e.V.w.at(r),
		h: e.V.h.at(r)
	}, o = G(e, n);
	K(e, o, r, c(w.frameDur, w.frameBounce), c(w.frameDur, w.outlineBounce), w.outlineLead), e.outlineOp.to(O(n) ? 0 : D(t) || D(n) ? 1 : e.outlineOp.b, 140, r), e.shellOp.to(+!!O(n), 220, r), e.creaseOp.to(A(n) ? w.crease : 0, 220, r), i ? We(e, r) : Ue(e, r, !0), e.tr = {
		kind: "size",
		from: t,
		to: n,
		t0: r,
		arriveAt: Infinity,
		arrived: !1,
		cached: i,
		swapped: !1,
		deepAt: i ? 0 : r + w.holdDeepAfter,
		grow: n.w >= t.w && n.h >= t.h,
		f0: a,
		f1: o
	};
}
function Ye(e, t) {
	let { f0: n, f1: r } = e.tr, i = (e, t, n) => Math.abs(t - n) < 1 ? 0 : Math.abs(e - n) / Math.abs(t - n);
	return Math.max(i(e.V.w.at(t), n.w, r.w), i(e.V.h.at(t), n.h, r.h)) < w.swapNear;
}
function Xe(e, t) {
	let n = e.layer.neu, r = e.tr;
	r.swapped = r.arrived = !0, n.r = r.to.img, n.op.snap(0), n.blur.snap(0), e.layer.swap = {
		t0: t,
		dur: w.swapDur
	};
}
function Ze(e, t, n, r) {
	e.tr && e.tr.kind === "fade" && Qe(e, r), e.rig.on && st(e, r), e.spin.on && dt(e, r), He(e, r), e.layer.old.grow.to(0, 120, r), e.layer.old.blur.to(0, 120, r), e.layer.old.veil.to(0, 120, r);
	for (let t of [
		e.V.w,
		e.V.h,
		e.V.s,
		e.V.y,
		e.O.w,
		e.O.h
	]) t.snap(t.at(r));
	e.roll.w.snap(t.w), e.roll.h.snap(t.h), e.layer.old.op.to(w.reducedDim, 160, r), e.tr = {
		kind: "fade",
		from: t,
		to: n,
		t0: r,
		arriveAt: Infinity,
		arrived: !1
	};
}
function Qe(e, t) {
	let n = e.tr;
	e.tr = null, e.fadeB = null, K(e, G(e, n.to)), J(e, n.to.img), e.outlineOp.snap(+!!D(n.to)), e.shellOp.snap(+!!O(n.to)), e.creaseOp.snap(A(n.to) ? w.crease : 0), e.unitOp.a.snap(1), e.unitOp.b.snap(0), e.rulerOp.to(1, 200, t);
}
function $e(e) {
	if (!e.tr) return;
	let t = e.tr.arriveAt;
	e.tr.arrived = !0;
	let n = (e.tr.kind === "fold" || e.tr.kind === "unfold") && e.rig.cached || e.tr.kind === "spin" && e.spin.cached;
	if (e.tr.kind === "spin" || n || e.tr.kind === "size" && e.tr.cached) return;
	if (e.tr.kind === "fade") {
		e.fadeB = {
			f: G(e, e.tr.to),
			st: e.tr.to,
			layers: ee(e.tr.to.img)
		}, e.unitOp.b.snap(0), e.unitOp.b.to(1, w.reducedFade, t), e.unitOp.a.to(0, w.reducedFade, t), e.rulerOp.to(0, 120, t);
		return;
	}
	let r = e.layer.neu;
	e.tr.deepAt ? (e.tr.deepAt = 0, r.r = e.tr.to.img, r.op.snap(0), r.op.to(1, w.fastReveal, t), r.blur.snap(e.layer.old.blur.at(t)), r.blur.to(0, w.fastReveal, t)) : (r.r = e.tr.to.img, r.op.snap(0), r.op.to(1, w.revealFade, t), r.blur.snap(Math.max(e.layer.old.blur.at(t), e.layer.old.blur.b)), r.blur.to(e.tr.kind === "size" && !Ke(e, t) ? w.moveBlur : 0, w.revealDur, t));
}
function et(e, t, n) {
	let r = e.rig.d[t ? "cover" : "open"], i = m(e.rig.d);
	return e.rig.d.look[t ? "cover" : "open"].cams.map((e) => y(r.w, r.h, i, e, n, i));
}
function tt(t, n, r, i, a) {
	let o = e[r.dev], s = r.folded ? "fold" : "unfold", c = o.open.hinge, l = G(t, n), u = G(t, r);
	if (He(t, i), a) {
		let e = t.layer.old;
		e.grow.snap(0), e.blur.snap(0), e.veil.snap(0);
	}
	let d = t.layer.old.blur.at(i), f = h(o, "open"), p = h(o, "cover"), g = (e) => e.cx - f.w * e.s / 2 + c * e.s, _ = (e) => e.cx - p.w * e.s / 2, v = {
		w: r.w,
		h: r.h
	}, y = (r.angle - n.angle + 540) % 360 - 180, b = Math.abs(y) === 180 ? 0 : y;
	Object.assign(t.rig, {
		on: !0,
		turn: b,
		q: m(o) ? 90 : 0,
		z: parseFloat(getComputedStyle(t.rigEl).getPropertyValue("--z")) || 1,
		t0: i,
		dur: w.foldDur,
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
		hx0: s === "fold" ? g(l) : _(l),
		hx1: s === "fold" ? _(u) : g(u),
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
	}), t.rig.dip = at(t), t.stretchOf.clear(), xe(t);
	let x = s === "fold" ? 0 : 1, S = /* @__PURE__ */ new Map([
		[t.RG.base.front, x],
		[t.RG.leaf.front, x],
		[t.RG.base.back, x],
		[t.RG.leaf.back, 1 - x]
	]);
	for (let [e, n] of S) e.gloss.style.setProperty("--turn", nt(t, n) + "deg");
	let C = [...S].filter(([, e]) => e === 1).map(([e]) => e);
	t.seeding = new Set(C.flatMap((e) => [e.gloss, ...e.fit])), ke(t, i + t.rig.dur * 1e3), t.seeding = null, a || Ue(t, i), t.creaseOp.snap(0), t.roll.w.snap(n.w), t.roll.h.snap(n.h), t.rulerOp.to(0, 120, i), t.tr = {
		kind: s,
		from: n,
		to: r,
		t0: i,
		arriveAt: Infinity,
		arrived: !1
	};
}
var nt = (e, t) => e.rig.from.angle + e.rig.turn * t + e.rig.q, rt = (e, t) => {
	let n = t.bezel * w.shellK, r = M(t) * w.shellK;
	return m(e.rig.d) ? [r, n] : [n, r];
};
function it(e, t, [n, i]) {
	let o = (e.rig.dir === "fold" ? t : 1 - t) * 180, s = r(e.rig.s0, e.rig.s1, t), c = r(e.rig.f0.y + e.rig.f0.h / 2, e.rig.f1.y + e.rig.f1.h / 2, t), l = nt(e, t), u = o * Math.PI / 180, d = l * Math.PI / 180, f = o / 180, p = r(e.rig.half.u, e.rig.cover.u, f), m = r(e.rig.half.v, e.rig.cover.v, f), h = r(e.rig.hx0, e.rig.hx1, t), g = W(e), _ = (h - g.cx) / s, v = w.perspective / (w.perspective - (p + e.rig.d.plate.thickness) * Math.sin(u) * s), y = -p * Math.cos(u) * v, b = r(e.rig.half.u, Math.min(e.rig.half.u, e.rig.cover.u), a(w.shrinkFrom, 180, o)), x = [_ + Math.min(0, y) - n, _ + Math.max(b, y) + n], S = [-m * v / 2 - i, m * v / 2 + i], C = x.flatMap((e) => S.map((t) => [e * Math.cos(d) - t * Math.sin(d), e * Math.sin(d) + t * Math.cos(d)])), T = (e) => Math.max(...C.map((t) => Math.abs(t[e])));
	return {
		th: o,
		baseS: s,
		cy: c,
		angle: l,
		v: m,
		hx: h,
		r: g,
		need: Math.min(1, g.maxW / (2 * T(0) * s), g.maxH / (2 * T(1) * s))
	};
}
function at(e) {
	let [t, n] = rt(e, e.rig.d.look.open), [r, i] = rt(e, e.rig.d.look.cover), o = [Math.max(t, r), Math.max(n, i)], s = [];
	for (let t = 1; t < 48; t++) {
		let n = t / 48, r = 1 - it(e, n, o).need;
		r > 0 && s.push([n, r + .004]);
	}
	let c = (e, t) => e <= t ? a(0, t, e) : 1 - a(t, 1, e);
	return (e) => s.reduce((t, [n, r]) => Math.max(t, r * c(e, n)), 0);
}
function ot(e, t) {
	let n = (t - e.rig.t0) / 1e3, r = Math.max(.05, e.rig.dur), a = Le(e)(i(n / r, 0, 1)), { th: o, baseS: s, cy: c, angle: l, v: u, hx: d, r: f } = it(e, a, rt(e, q(e, t))), p = s * (1 - e.rig.dip(a));
	return {
		t: n,
		th: o,
		p: a,
		s: p,
		hx: f.cx + (d - f.cx) * p / s,
		cy: c,
		angle: l,
		top: c - u * p / 2,
		settled: n >= r
	};
}
function st(e, t) {
	let n = w.crease * ae(ot(e, t).th);
	e.rig.on = !1, e.rig.cached && J(e, e.cur.img), K(e, G(e, e.cur)), e.outlineOp.snap(+!!D(e.cur)), e.shellOp.snap(+!!O(e.cur)), e.creaseOp.snap(A(e.cur) ? n : 0), A(e.cur) && e.creaseOp.to(w.crease, 240, t), e.rulerOp.to(1, 200, t);
}
var ct = (e) => {
	let t = `${w.rotLift},${w.rotLand}`;
	return t !== e.spinEaseKey && (e.spinEaseKey = t, e.spinEaseFn = u(w.rotLift, 0, w.rotLand, 1)), e.spinEaseFn;
};
function lt(e, t, n, r, i) {
	He(e, r), i ? We(e, r) : Ue(e, r);
	let a = (n.angle - t.angle + 540) % 360 - 180;
	Object.assign(e.spin, {
		on: !0,
		t0: r,
		dur: w.rotDur,
		from: t,
		to: n,
		f0: G(e, t),
		f1: G(e, n),
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
function ut(e, t) {
	let n = (t - e.spin.t0) / 1e3, r = Math.max(.05, e.spin.dur);
	return {
		p: ct(e)(i(n / r, 0, 1)),
		done: n >= r
	};
}
function dt(e, t) {
	let n = e.spin.to, r = e.spin.cached;
	e.spin.on = !1, e.UA.el.style.transform = "", e.UA.el.style.removeProperty("--spin-s");
	for (let t of [e.UA.l0, e.UA.l1]) t.style.transform = "";
	K(e, G(e, n)), e.creaseOp.snap(A(n) ? w.crease : 0), e.rulerOp.to(1, 200, t), r ? (J(e, n.img), e.tr?.kind === "spin" && (e.tr = null)) : e.tr?.kind === "spin" && Object.assign(e.tr, {
		kind: "size",
		cached: !1,
		arrived: !1,
		arriveAt: e.images.has(n.sel) ? t : Infinity
	});
}
function ft(e) {
	let t = e.clock.t;
	e.tr && !e.tr.arrived && t >= e.tr.arriveAt && $e(e), e.tr?.deepAt && t >= e.tr.deepAt && (e.tr.deepAt = 0, e.layer.old.blur.to(Math.max(w.holdBlur, e.layer.old.blur.at(t)), w.holdDeepen, t)), e.tr && e.tr.kind === "size" && e.tr.cached && !e.tr.swapped && (e.tr.grow || Ye(e, t) || t - e.tr.t0 > w.frameDur * 800) && Xe(e, t), e.rig.on && ot(e, t).settled && st(e, t), e.spin.on && ut(e, t).done && dt(e, t);
	let n = e.layer.neu, r = e.layer.swap ? L(e.layer.swap, t) >= 1 : n.op.done(t) && n.op.b === 1 && n.blur.done(t);
	if (!e.rig.on && n.r && r) {
		let t = e.layer.swap ? 0 : n.blur.b;
		J(e, n.r), e.tr?.kind === "size" && t && e.layer.old.blur.snap(t);
	}
	if (e.tr?.kind === "size" && e.tr.arrived && !e.layer.neu.r && Ke(e, t) && e.layer.old.blur.b > 0 && !(e.layer.old.grow.b > 0) && e.layer.old.blur.to(0, w.settleSharp, t), e.tr && (e.tr.kind === "fade" ? e.tr.arrived && e.unitOp.b.done(t) && Qe(e, t) : e.tr.kind !== "spin" && e.tr.arrived && !e.rig.on && !e.layer.neu.r && Ge(e, t) && e.O.w.done(t) && e.O.h.done(t) && e.layer.old.blur.b === 0 && e.layer.old.blur.done(t) && (e.tr = null, e.outlineOp.to(+!!D(e.cur), 220, t))), e.queued && !e.rig.on && !e.spin.on && (!e.tr || e.tr.kind === "size")) {
		let n = e.queued, r = U(e, n), i = e.cur;
		(i.kind !== "device" || r.kind !== "device" || i.dev !== r.dev || Ge(e, t)) && (e.queued = null, qe(e, n));
	}
	e.draft && e.cur && (K(e, G(e, {
		...e.cur,
		w: e.draft.w,
		h: e.draft.h
	})), e.roll.w.snap(e.draft.w), e.roll.h.snap(e.draft.h)), Ne(e, t), e.root.classList.toggle("at-rest", !e.tr && !e.queued && !e.draft), Pe(e, t), e.hooks.layout({
		w: e.V.w.at(t),
		h: e.V.h.at(t),
		s: e.V.s.at(t),
		y: e.V.y.at(t),
		cx: W(e).cx,
		radius: p(q(e, t).radius, +!!e.cur?.rot + (e.cur?.mirrored ? 2 : 0)).map((n) => n * e.V.s.at(t) * e.shellOp.at(t)),
		bezel: N(q(e, t)) * e.V.s.at(t) * e.shellOp.at(t)
	}, !!e.tr || !!e.queued || e.rig.on || e.spin.on || !!e.draft);
}
function pt(e, t) {
	if (e.raf = 0, !e.enabled || !e.cur) return;
	e.clock.t = t, ft(e);
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
	(e.tr || e.queued || e.rig.on || e.spin.on || !Ge(e, t) || t < e.look.t0 + e.look.dur || n.some((e) => !e.done(t))) && Y(e);
}
function Y(e) {
	e.enabled && !e.raf && (e.raf = requestAnimationFrame((t) => pt(e, t)));
}
function X(e, t) {
	return Promise.resolve(e.hooks.request(t));
}
function mt(e, t = !1) {
	let n = `${e.root.clientWidth}:${e.root.clientHeight}:${e.badge.w}`;
	(n !== e.roomSize || t) && (e.roomSize = n, e.cur && !e.rig.on && !e.spin.on && K(e, G(e, e.cur), performance.now(), e.tr?.kind === "size" ? c(w.frameDur, w.frameBounce) : null), Y(e), e.cur && (e.clock.t = performance.now(), ft(e)));
}
// src/scene/dock.ts
var ht = (e) => e.CTL.rot.getAttribute("aria-expanded") === "true";
function Z(e, t, n = !0) {
	t && _t(e, !1), !t && e.ORIENT.menu.contains(document.activeElement) && e.CTL.rot.focus({ preventScroll: !0 }), e.CTL.rot.setAttribute("aria-expanded", String(t)), e.ORIENT.menu.classList.toggle("on", t), e.ORIENT.menu.inert = !t, t && n && (e.directions.find((e) => e.getAttribute("aria-checked") === "true") || e.directions[0]).focus();
}
var gt = (e) => e.PN.sum.getAttribute("aria-expanded") === "true";
function _t(e, t) {
	t && Z(e, !1), !t && e.PN.body.contains(document.activeElement) && e.PN.sum.focus({ preventScroll: !0 }), e.PN.sum.setAttribute("aria-expanded", String(t)), e.PN.fold.classList.toggle("open", t), e.PN.body.inert = !t;
}
var vt = (e, t) => {
	gt(e) && !e.PN.fold.contains(t.target) && _t(e, !1), ht(e) && !e.ORIENT.el.contains(t.target) && Z(e, !1);
};
function yt(t, n) {
	let r = t.cur, i = r.kind === "device" && n === r.dev ? e[n] : null, a = t.ROWS.find((e) => e.dataset.sel === n);
	t.SUM.dev !== i && (t.SUM.dev = i, t.SUM.sil.innerHTML = i ? ge(i) : ""), t.SUM.nm.textContent = a.querySelector(".nm").textContent, t.PN.sum.classList.toggle("mono", a.classList.contains("mono")), t.PN.sum.title = `${i ? i.name : t.SUM.nm.textContent} · ${F(r)}`;
}
function bt(t, n, r) {
	t.focusW = !1, Ft(t), t.slFocus = !1;
	for (let e of [t.SL.w.thumb, t.SL.h.thumb]) document.activeElement === e && e.blur();
	for (let e of [t.RL.w, t.RL.h]) document.activeElement === e && (e.dataset.cancel = "1", e.blur());
	if (n === "custom") {
		let e = i(Math.round(t.cur.w), 240, T), n = i(Math.round(t.cur.h), 240, T);
		t.cur.kind !== "custom" && X(t, `custom:${e}x${n}`), r || (t.focusW = !0, Y(t));
	} else {
		if (e[n]) return X(t, `${n}:open`);
		X(t, n);
	}
}
function xt(t, r, i) {
	let a = t.clock.t;
	if (i ? (t.roll.w.snap(r.w), t.roll.h.snap(r.h)) : (t.roll.w.to(r.w, 420, a), t.roll.h.to(r.h, 420, a)), r.kind === "device") {
		Be(t, j(r), i), t.CTL.fold.hidden = t.CTL.hinge.hidden = !e[r.dev].fold, t.ORIENT.el.hidden = !!e[r.dev][r.folded ? "cover" : "open"].fixed, t.ORIENT.el.hidden && Z(t, !1, !1);
		let a = r.folded ? n("posture.unfold") : n("posture.fold");
		t.CTL.fold.dataset.folded = String(r.folded), t.CTL.fold.title = a, t.CTL.fold.setAttribute("aria-label", a);
		let o = n("posture.orientation.tip", { orientation: n(`posture.${r.orientation}`) });
		t.CTL.rot.dataset.orientation = r.orientation, t.CTL.rot.title = o, t.CTL.rot.setAttribute("aria-label", o);
		for (let e of t.directions) e.setAttribute("aria-checked", String(e.dataset.orientation === r.orientation));
	}
	St(t);
}
function St(t) {
	let n = t.cur, r = t.editing || t.slFocus && n.sel === t.slSent || n.kind === "custom", i = r ? "custom" : _e(n);
	for (let a of t.ROWS) {
		let o = a.dataset.sel, s = o === i, c = e[o];
		a.setAttribute("aria-checked", String(s));
		let l = t.PRESETS.find((e) => e.sel === o);
		a.lastElementChild.textContent = o === "custom" ? r ? F(n) : `240–${T}` : o === "original" ? F(t.ORIGINAL) : l ? F(l) : s ? F(n) : ve(c);
	}
	t.RL.el.classList.toggle("custom", r), t.RL.el.classList.toggle("device", !r && n.kind === "device"), t.CTL.el.hidden = r || n.kind !== "device", t.CTL.el.hidden && Z(t, !1), t.SL.el.hidden = !r, yt(t, i), Mt(t);
}
function Ct(e) {
	e.CTL.hinge.setAttribute("aria-pressed", String(e.hingeLine)), e.CTL.hinge.title = e.hingeLine ? n("posture.hinge.hide") : n("posture.hinge.show");
}
function wt(t) {
	let n = t.cur;
	n.kind === "device" && e[n.dev].fold && (t.hingeLine = !t.hingeLine, Ct(t), t.hingeOp.to(+!!t.hingeLine, 200, performance.now()), Y(t));
}
var Tt = (e, t) => [
	"portrait",
	"landscape-left",
	"landscape-right"
].map((e) => k(t, !t.folded, e)).find((n) => {
	let r = U(e, n);
	return r?.kind === "device" && r.angle === t.angle;
}) ?? k(t, !t.folded, "portrait");
function Et(t) {
	let n = t.cur;
	n.kind === "device" && e[n.dev].fold && X(t, Tt(t, n));
}
function Dt(e, t, n) {
	let r = /^\d+$/.test(n.trim()) ? Number(n) : NaN;
	if (!(r > 0)) return;
	let a = i(r, 240, T), o = Math.round(e.cur.w), s = Math.round(e.cur.h), c = t === "w" ? a : o, l = t === "h" ? a : s;
	(c !== o || l !== s) && (e.roll[t].snap(a), X(e, Ot(e, c, l)));
}
var Ot = (e, t, n) => e.PRESETS.find((e) => e.w === t && e.h === n)?.sel || `custom:${t}x${n}`;
function kt(e, t = !1) {
	if (!e.editing) {
		if (e.cur.kind !== "custom") {
			let n = i(Math.round(e.cur.w), 240, T), r = i(Math.round(e.cur.h), 240, T);
			if (X(e, `custom:${n}x${r}`), !t) for (let [t, i, a] of [[
				"w",
				e.RL.w,
				n
			], [
				"h",
				e.RL.h,
				r
			]]) i.value = String(a), e.RL.shown[t] = String(a);
		}
		e.editing = !0, St(e);
	}
}
var At = (e) => e.SL.el.classList.contains("off"), jt = (e, t) => e.draft ? e.draft[t] : i(Math.round(e.cur[t]), 240, T);
function Mt(e) {
	for (let t of ["w", "h"]) {
		let n = e.SL[t], r = jt(e, t), i = ye(r);
		n.fill.style.width = i, n.thumb.style.left = i, n.val.textContent = String(r), n.thumb.setAttribute("aria-valuenow", String(r)), n.thumb.setAttribute("aria-valuetext", `${r}dp`);
	}
}
function Nt(e, t, n) {
	let r = i(Math.round(n), 240, T);
	e.draft = {
		w: jt(e, "w"),
		h: jt(e, "h"),
		[t]: r
	}, Mt(e), Y(e);
}
function Pt(e) {
	if (clearTimeout(e.keyTimer), e.keyTimer = 0, !e.draft || e.dragging) return;
	let { w: t, h: n } = e.draft;
	if (t === Math.round(e.cur.w) && n === Math.round(e.cur.h)) {
		Ft(e);
		return;
	}
	let r = e.draft, i = Ot(e, t, n);
	e.slSent = i, X(e, i).then((t) => {
		!t && e.draft === r && Ft(e);
	});
}
function Ft(e) {
	clearTimeout(e.keyTimer), e.keyTimer = 0, e.dragging = null, e.draft && (e.draft = null, e.cur && !e.rig.on && !e.spin.on && K(e, G(e, e.cur)), e.cur && (e.roll.w.snap(e.cur.w), e.roll.h.snap(e.cur.h), Mt(e)), Y(e));
}
function It(t) {
	t.ORIENT.menu.addEventListener("click", (e) => {
		let n = e.target.closest("[data-orientation]"), r = t.cur;
		n && r.kind === "device" && (X(t, k(r, r.folded, n.dataset.orientation)), Z(t, !1));
	}), t.ORIENT.menu.addEventListener("keydown", (e) => {
		if (e.key === "Tab") {
			Z(t, !1);
			return;
		}
		if (![
			"ArrowDown",
			"ArrowUp",
			"Home",
			"End"
		].includes(e.key)) return;
		e.preventDefault(), e.stopPropagation();
		let n = t.directions.indexOf(document.activeElement), r = e.key === "Home" ? 0 : e.key === "End" ? t.directions.length - 1 : (n + (e.key === "ArrowUp" ? -1 : 1) + t.directions.length) % t.directions.length;
		t.directions[r].focus();
	}), t.CTL.rot.addEventListener("keydown", (e) => {
		["ArrowDown", "ArrowUp"].includes(e.key) && (e.preventDefault(), e.stopPropagation(), Z(t, !0));
	});
	for (let r of t.ROWS) {
		let t = e[r.dataset.sel];
		t && (r.title = t.name), r.innerHTML = `${t ? ge(t) : ""}<span class="nm">${t ? t.short : r.dataset.t ? n(r.dataset.t) : r.textContent}</span><span class="d"></span>`;
	}
	t.PN.sum.addEventListener("click", () => _t(t, !gt(t))), t.PN.pick.addEventListener("click", (e) => {
		let n = e.target.closest("[data-sel]");
		n && (bt(t, n.dataset.sel), _t(t, !1));
	}), t.CTL.fold.addEventListener("click", () => Et(t)), t.CTL.rot.addEventListener("click", () => Z(t, !ht(t))), t.CTL.hinge.addEventListener("click", () => wt(t));
	for (let [e, n] of [["w", t.RL.w], ["h", t.RL.h]]) n.addEventListener("focus", () => {
		n.select(), t.cur.kind !== "device" && kt(t);
	}), n.addEventListener("pointerdown", () => kt(t)), n.addEventListener("input", () => kt(t, !0)), n.addEventListener("keydown", (e) => {
		if (e.key === "Enter") e.preventDefault(), n.blur();
		else if (e.key === "Escape") e.preventDefault(), e.stopPropagation(), n.dataset.cancel = "1", n.blur();
		else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
			e.preventDefault(), kt(t);
			let r = (e.key === "ArrowUp" ? 1 : -1) * E(e);
			n.value = String(i((parseInt(n.value, 10) || 0) + r, 240, T));
		}
	}), n.addEventListener("blur", (r) => {
		n.dataset.cancel ? delete n.dataset.cancel : Dt(t, e, n.value), t.RL.shown[e] = "", r.relatedTarget !== t.RL.w && r.relatedTarget !== t.RL.h && (t.editing = !1, St(t), Y(t));
	});
	for (let e of ["w", "h"]) {
		let { track: n, thumb: r } = t.SL[e], a = (e) => {
			let t = n.getBoundingClientRect();
			return 240 + i((e - t.left) / t.width, 0, 1) * (T - 240);
		};
		n.addEventListener("pointerdown", (i) => {
			i.button === 0 && !At(t) && t.cur && (i.preventDefault(), r.focus({
				preventScroll: !0,
				focusVisible: !1
			}), n.setPointerCapture(i.pointerId), t.dragging = e, Nt(t, e, a(i.clientX)));
		}), n.addEventListener("pointermove", (r) => {
			t.dragging === e && n.hasPointerCapture(r.pointerId) && Nt(t, e, a(r.clientX));
		});
		let o = () => {
			t.dragging === e && (t.dragging = null, Pt(t));
		};
		n.addEventListener("pointerup", o), n.addEventListener("lostpointercapture", o), r.addEventListener("keydown", (n) => {
			let r = E(n), i = jt(t, e), a = {
				ArrowRight: i + r,
				ArrowUp: i + r,
				ArrowLeft: i - r,
				ArrowDown: i - r,
				Home: 240,
				End: T
			}[n.key];
			a !== void 0 && !At(t) && t.cur && (n.preventDefault(), n.stopPropagation(), Nt(t, e, a), clearTimeout(t.keyTimer), t.keyTimer = window.setTimeout(() => Pt(t), 350));
		}), r.addEventListener("focus", () => {
			t.slFocus = !0;
		}), r.addEventListener("blur", (e) => {
			e.relatedTarget !== t.SL.w.thumb && e.relatedTarget !== t.SL.h.thumb && (t.keyTimer && Pt(t), t.slFocus = !1, t.cur && St(t));
		});
	}
	t.PN.pick.addEventListener("pointerdown", () => {
		let e = document.activeElement;
		(e === t.RL.w || e === t.RL.h) && (e.dataset.cancel = "1");
	}), t.PN.pick.addEventListener("keydown", (e) => {
		if (!t.ROWS.includes(e.target) || ![
			"ArrowDown",
			"ArrowUp",
			"Home",
			"End"
		].includes(e.key)) return;
		e.preventDefault(), e.stopPropagation();
		let n = t.ROWS.indexOf(e.target), r = e.key === "Home" ? 0 : e.key === "End" ? t.ROWS.length - 1 : (n + (e.key === "ArrowUp" ? -1 : 1) + t.ROWS.length) % t.ROWS.length;
		t.ROWS[r].focus(), bt(t, t.ROWS[r].dataset.sel, !0);
	}), Ct(t), new ResizeObserver(() => {
		let e = t.RL.h.offsetWidth;
		e && e !== t.badge.w && (t.badge.w = e, mt(t));
	}).observe(t.RL.h, { box: "border-box" });
}
// src/scene/state.ts
var Lt = (e) => ({
	el: e,
	cam: Q(e, ".cam"),
	cams: Vt(e),
	old: Q(e, ".old"),
	veil: Q(e, ".veil"),
	neu: Q(e, ".neu"),
	cast: Q(e, ".cast"),
	blurs: [],
	dark: null
}), Rt = (e) => {
	let t = document.createElement("div"), n = document.createElement("div"), r = document.createElement("div");
	return t.className = "gloss", n.className = "rim", r.className = "home", e.prepend(t, n), e.append(r), {
		body: e,
		gloss: t,
		home: r,
		clip: Ht(e, ".clip"),
		ring: Ht(e, ".ring"),
		lit: Ht(e, ".lit"),
		fit: []
	};
}, zt = (e) => ({
	el: e,
	front: Rt(Q(e, ".front")),
	back: Rt(Q(e, ".rear")),
	strips: []
}), Bt = (e) => ({
	el: e,
	shell: Q(e, ".shell"),
	btns: [...e.querySelectorAll(".btn")],
	cams: Vt(e),
	home: Q(e, ".home"),
	outline: Q(e, ".outline"),
	stage: Q(e, ".stage"),
	l0: Q(e, ".l0"),
	l1: Q(e, ".l1"),
	veil: Q(e, ".veil"),
	crease: Q(e, ".crease"),
	tTop: Q(e, ".t-top"),
	tBot: Q(e, ".t-bot")
}), Vt = (e) => {
	let t = e.querySelector(".cam"), n = [t];
	for (; n.length < S;) {
		let e = t.cloneNode();
		n[n.length - 1].after(e), n.push(e);
	}
	return n;
}, Q = (e, t) => e.querySelector(t), Ht = (e, t) => e.querySelector(t), $ = (e) => document.getElementById(e);
function Ut(e, t) {
	let r = (t) => e.querySelector(`#${t}`), i = {
		sel: "original",
		kind: "original",
		name: "@Preview",
		w: 411,
		h: 891,
		img: null
	}, a = [{
		sel: "narrow",
		name: n("size.narrow"),
		w: 320,
		h: 640
	}, {
		sel: "foldable",
		name: n("size.foldable"),
		w: 673,
		h: 841
	}], o = /* @__PURE__ */ new Map(), s = { t: 0 }, c = { w: 45 }, l = {
		w: new d(),
		h: new d(),
		s: new d(),
		y: new d(48)
	}, u = {
		w: new d(),
		h: new d()
	}, p = new f(0), m = new f(0), h = new f(0), g = new f(0), _ = new f(1), v = ee(null), y = {
		a: new f(1),
		b: new f(0)
	}, b = {
		a: null,
		b: null,
		t0: 0,
		dur: 460
	}, x = { on: !1 }, S = r("rig"), C = Q(S, ".space"), w = zt(Q(S, ".slab.base")), T = zt(Q(S, ".slab.leaf")), E = {
		lift: Q(S, ".lift"),
		space: C,
		plate: Q(S, ".plate"),
		spine: Q(S, ".spine"),
		crease: Q(S, ".crease"),
		tTop: Q(S, ".r-top"),
		tBot: Q(S, ".r-bot"),
		base: w,
		leaf: T,
		btns: Array.from({ length: 5 }, () => {
			let e = document.createElement("div");
			return e.className = "btn", C.append(e), e;
		}),
		F: {
			inner: Lt(T.front.clip),
			outer: Lt(T.back.clip),
			base: Lt(w.front.clip)
		}
	};
	for (let [e, t] of [[E.leaf.front, E.F.inner], [E.leaf.back, E.F.outer]]) t.blurs = Array.from({ length: 4 }, () => {
		let e = document.createElement("div");
		return e.className = "smear", e.innerHTML = "<div class=\"unstretch\"><img class=\"ly\" alt=\"\"></div>", t.el.insertBefore(e, t.cam), {
			el: e,
			inv: Q(e, ".unstretch"),
			img: Q(e, "img")
		};
	}), t.dark = document.createElement("div"), t.dark.className = "smear", t.el.insertBefore(t.dark, t.cam), e.fit.push(...t.blurs.map((e) => e.el), t.dark);
	E.base.front.fit.push(E.F.base.cast);
	let D = /* @__PURE__ */ new Map(), O = { on: !1 }, k = Bt(r("ua")), A = Bt(r("ub")), j = {
		w: new f(411),
		h: new f(891)
	}, M = {
		el: $("panel"),
		pick: $("pnPick"),
		fold: $("pnFold"),
		sum: $("pnSum"),
		body: $("pnBody")
	}, N = {
		el: $("devCtl"),
		fold: $("dcFold"),
		rot: $("dcRot"),
		hinge: $("dcHinge")
	}, P = {
		el: $("dcOrientation"),
		menu: $("dcOrientMenu")
	}, F = [...P.menu.querySelectorAll("[data-orientation]")], I = [...M.pick.querySelectorAll("[data-sel]")], L = {
		sil: M.sum.querySelector(".pn-sum-sil"),
		nm: M.sum.querySelector(".nm"),
		dev: null
	}, R = {
		el: r("ruler"),
		ext: r("rlExt"),
		dim: r("rlDim"),
		w: r("rlW"),
		h: r("rlH"),
		shown: {
			w: "",
			h: ""
		}
	}, te = $("pnSl"), z = {};
	for (let e of te.querySelectorAll(".sl")) {
		let t = e.querySelector(".sl-track");
		z[e.dataset.axis] = {
			track: t,
			thumb: e.querySelector(".thumb"),
			fill: e.querySelector(".fill"),
			val: e.querySelector(".v b")
		};
		for (let e of t.querySelectorAll(".tick")) e.style.left = ye(Number(e.dataset.v));
	}
	return {
		root: e,
		hooks: t,
		hingeLine: !0,
		ORIGINAL: i,
		PRESETS: a,
		target: null,
		images: o,
		foldEaseKey: "",
		foldEaseFn: null,
		clock: s,
		badge: c,
		cur: null,
		tr: null,
		queued: null,
		V: l,
		O: u,
		outlineOp: p,
		creaseOp: m,
		rulerOp: h,
		shellOp: g,
		hingeOp: _,
		layer: v,
		unitOp: y,
		fadeB: null,
		look: b,
		rig: x,
		rigEl: S,
		RG: E,
		stretchOf: D,
		seeding: null,
		spin: O,
		spinEaseKey: "",
		spinEaseFn: null,
		elevationOf: null,
		UA: k,
		UB: A,
		roll: j,
		PN: M,
		CTL: N,
		ORIENT: P,
		directions: F,
		ROWS: I,
		SUM: L,
		focusW: !1,
		RL: R,
		editing: !1,
		SL: {
			el: te,
			w: z.w,
			h: z.h
		},
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
function Wt(t, n) {
	let r = Ut(t, n);
	It(r);
	let i = (e) => vt(r, e);
	return {
		devices: new Set(Object.keys(e)),
		setOriginal(e, t, n) {
			Object.assign(r.ORIGINAL, {
				w: e,
				h: t,
				img: n
			}), r.target?.sel === "original" && Object.assign(r.target, {
				w: e,
				h: t
			}), r.cur && St(r), r.cur?.sel === "original" && (Object.assign(r.cur, {
				w: e,
				h: t
			}), r.tr?.kind !== "fade" && K(r, G(r, r.cur), performance.now(), r.tr ? c(w.frameDur, w.frameBounce) : null), r.roll.w.to(e, 420, performance.now()), r.roll.h.to(t, 420, performance.now()), Y(r));
		},
		image(e, t) {
			r.images.set(e, t), Y(r), r.cur?.sel === e && (r.cur.img = t, r.tr?.to.sel === e ? (r.tr.to.img = t, r.tr.arriveAt = performance.now(), r.tr.kind === "size" && r.tr.swapped && (r.layer.neu.r ? r.layer.neu.r = t : r.layer.old.r = t)) : r.tr || (r.layer.old.r = t));
		},
		update(e, t = !1) {
			r.target = e, r.draft && !r.dragging && !r.keyTimer && Math.round(e.w) === r.draft.w && Math.round(e.h) === r.draft.h && (r.draft = null), !r.cur || t ? Ve(r, e.sel) : qe(r, e.sel), t && (r.clock.t = performance.now(), ft(r)), r.enabled && !r.raf && (r.raf = requestAnimationFrame((e) => pt(r, e)));
		},
		enable(e) {
			r.enabled = e, r.root.hidden = !e, e && addEventListener("pointerdown", i, !0), e || (r.CTL.el.hidden = !0, _t(r, !1), Z(r, !1), removeEventListener("pointerdown", i, !0)), e || (r.roomSize = ""), e ? r.raf ||= requestAnimationFrame((e) => pt(r, e)) : (cancelAnimationFrame(r.raf), r.raf = 0, r.images.clear(), r.cur = null, r.tr = null, r.queued = null, Ft(r), r.slFocus = !1);
		},
		relayout: (e) => mt(r, e),
		moving: () => !!r.tr || !!r.queued || r.rig.on || r.spin.on || !!r.draft,
		sliderOff(e) {
			r.SL.el.classList.toggle("off", e);
			for (let t of ["w", "h"]) r.SL[t].thumb.tabIndex = e ? -1 : 0, r.SL[t].thumb.setAttribute("aria-disabled", String(e));
			e && Ft(r);
		},
		clearImages() {
			r.images.clear();
		},
		closeMenu() {
			return ht(r) ? (Z(r, !1), !0) : gt(r) ? (_t(r, !1), !0) : !1;
		},
		sizeOf(e) {
			let t = U(r, e);
			return t && {
				w: t.w,
				h: t.h
			};
		}
	};
}
export { Wt as createResizeScene };
