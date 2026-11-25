import { reduced as e } from "./motion.js";
import { phrase as t } from "./strings.js";
import { DEVICES as n } from "./devices.js";
// src/runtime/resize-scene.ts
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
}, ee = Math.max(1, ...Object.values(n).flatMap((e) => Object.values(e.look).map((e) => e.cams.length)));
function S(l, S) {
	let C = (e) => l.querySelector(`#${e}`), w = {
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
		hingeLine: !0,
		foldBlur: 24,
		foldDark: .85,
		shrinkFrom: 90,
		ambient: .35,
		screenDim: .6,
		lightAz: 125,
		lightEl: 55,
		arcSegs: 4
	}, T = 1600, te = (e) => e.shiftKey ? 10 : 1, ne = {
		sel: "original",
		kind: "original",
		name: "@Preview",
		w: 411,
		h: 891,
		img: null
	}, re = [{
		sel: "narrow",
		name: t("size.narrow"),
		w: 320,
		h: 640
	}, {
		sel: "foldable",
		name: t("size.foldable"),
		w: 673,
		h: 841
	}], E = null, D = /* @__PURE__ */ new Map();
	function ie(e) {
		let r;
		if (e === "original") r = { ...ne };
		else if (re.some((t) => t.sel === e)) r = {
			...re.find((t) => t.sel === e),
			kind: "preset",
			img: null
		};
		else if (/^custom:\d+x\d+$/.test(e)) {
			let [n, i] = e.slice(7).split("x").map(Number);
			r = {
				sel: e,
				kind: "custom",
				name: t("size.custom"),
				w: n,
				h: i,
				img: null
			};
		} else {
			let [t, i, ...a] = e.split(":"), o = n[t], s = i === "open" || i === "cover" ? o?.[i] : void 0;
			if (!o || !s) return null;
			let c = a.includes("rot"), l = a.includes("right");
			if (s.fixed && (c || l)) return null;
			r = {
				sel: e,
				kind: "device",
				dev: t,
				folded: i === "cover",
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
		return E?.sel === e && (r.w = E.w, r.h = E.h), r.img = D.get(e) || N?.img || ne.img, r;
	}
	let ae = (e) => e.kind === "preset" || e.kind === "custom", O = (e) => e.kind === "device", oe = (e, t, r) => {
		let i = n[e.dev][t ? "cover" : "open"], a = r !== "portrait";
		return `${e.dev}:${t ? "cover" : "open"}${a === i.w > i.h ? "" : ":rot"}${r === "landscape-right" ? ":right" : ""}`;
	}, se = (e) => e.kind === "device" && n[e.dev].fold && !e.folded, k = (e) => n[e.dev].look[e.folded ? "cover" : "open"], A = (e) => e.ends ?? e.bezel, ce = (e) => Math.max(e.bezel, A(e)) * w.shellK, j = (e) => {
		if (!O(e)) return [0, 0];
		let t = k(e), n = t.bezel * w.shellK, r = A(t) * w.shellK;
		return e.rot ? [2 * r, 2 * n] : [2 * n, 2 * r];
	}, le = (e) => `${Math.round(e.w)}×${Math.round(e.h)}`, ue = "", de = null, fe = () => {
		let e = `${w.foldLift},${w.foldLand}`;
		return e !== ue && (ue = e, de = u(w.foldLift, 0, w.foldLand, 1)), de;
	}, pe = { t: 0 }, me = { w: 45 };
	function he(e) {
		let t = l.clientWidth, n = i((t - 400) / 400, 0, 1), a = Math.max(r(w.gap + 22 + Math.ceil(me.w / 2) + 10, 90, n), e && O(e) && S.insetOn?.() ? 114 : 0);
		return {
			W: t,
			side: a,
			cx: t / 2,
			top: 48,
			maxW: Math.max(60, t - 2 * a),
			maxH: Math.max(60, l.clientHeight - 48 - 88)
		};
	}
	let ge = (e) => O(e) && S.insetOn?.() && S.insetBelow?.() ? 40 : 0, _e = (e) => {
		let t = n[e.dev][e.folded ? "cover" : "open"].cutIn, r = e.right ? "landscape-right" : e.w > e.h ? "landscape-left" : "portrait";
		return t[r] ?? t[r === "landscape-right" ? "landscape-left" : "landscape-right"] ?? "";
	}, ve = (e, t) => {
		if (!O(e) || !S.insetOn?.()) return {
			w: 0,
			h: 0
		};
		let n = _e(e);
		return {
			w: n.includes("w") ? Math.max(0, 178 - t) : 0,
			h: n.includes("h") ? 32 : 0
		};
	};
	function M(e) {
		let t = he(e), n = ve(e, t.side), r = (e, t, n) => {
			let [r, i] = j(e);
			return Math.min(t / (e.w + r), n / (e.h + i), 2);
		}, i = (t, n) => Math.min(r(ne, t, n), r(e, t, n)), a = t.maxW, o = t.maxH, s = 0, c = i(a, o), l = (o - (e.h + j(e)[1]) * c) / 2, u = ge(e), d = l < Math.max(n.h, u);
		n.w && (a - (e.w + j(e)[0]) * c) / 2 < n.w && (a -= 2 * n.w), n.h && d && (o -= n.h, s = n.h), u && d && (o -= u), c = i(a, o);
		let f = e.h * c, p = j(e)[1] * c;
		return {
			s: c,
			w: e.w * c,
			h: f,
			cx: t.cx,
			y: t.top + s + p / 2 + Math.max(0, (o - f - p) / 2)
		};
	}
	let N = null, P = null, F = null, I = {
		w: new d(),
		h: new d(),
		s: new d(),
		y: new d(48)
	}, ye = {
		w: new d(),
		h: new d()
	}, be = new f(0), xe = new f(0), Se = new f(0), Ce = new f(0), we = new f(1);
	function L(e, t = 0, n, r = n, i = 0) {
		let a = w.gap;
		for (let [r, a] of [
			[I.w, e.w],
			[I.h, e.h],
			[I.s, e.s],
			[I.y, e.y]
		]) n ? r.set(a, n, t, i) : r.snap(a);
		for (let [n, i] of [[ye.w, e.w + 2 * a], [ye.h, e.h + 2 * a]]) r ? n.set(i, r, t) : n.snap(i);
	}
	let Te = (e) => ({
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
	}), R = Te(null), Ee = (e, t) => i((t - e.t0) / e.dur, 0, 1), De = (e) => w.swapBlur * 4 * e * (1 - e), Oe = (e) => e < .5 ? De(e) : r(w.swapBlur, 0, a(.5, 1, e)), z = {
		a: new f(1),
		b: new f(0)
	}, ke = null, B = {
		a: null,
		b: null,
		t0: 0,
		dur: 460
	};
	function Ae(e, t) {
		let n = pe.t;
		B.a = t || !B.b ? e : Ne(n), B.b = e, B.t0 = t ? -1e9 : n;
	}
	let je = (e, t, n, r) => {
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
	}, Me = (e, t, n, r) => Array.from({ length: Math.max(e.length, t.length) }, (i, a) => je(e[a] ?? {
		...t[a],
		w: 0,
		h: 0
	}, t[a] ?? {
		...e[a],
		w: 0,
		h: 0
	}, n, r));
	function Ne(e) {
		let t = B.a, a = B.b;
		if (!a) return n.s26.look.open;
		let s = o(i((e - B.t0) / B.dur, 0, 1)), c = (e, t) => r(e, t, s);
		return {
			tone: a.tone,
			bezel: c(t.bezel, a.bezel),
			ends: c(A(t), A(a)),
			home: c(Number(t.home) || 0, Number(a.home) || 0),
			radius: a.radius.map((e, n) => c(t.radius[n], e)),
			cams: Me(t.cams, a.cams, s, c),
			btn: a.btn.map((e, n) => {
				let r = t.btn[n];
				return r.side === e.side ? {
					side: e.side,
					at: c(r.at, e.at),
					len: c(r.len, e.len)
				} : s < .5 ? {
					side: r.side,
					at: r.at,
					len: r.len * (1 - 2 * s)
				} : {
					side: e.side,
					at: e.at,
					len: e.len * (2 * s - 1)
				};
			})
		};
	}
	let Pe = (e, t, n, r, i, a, o) => {
		let s = A(e) * w.shellK, c = s * .62, l = y(t, n, r, {
			w: c,
			h: c,
			y: n + (s - c) / 2
		}, i, a);
		return {
			...l,
			on: l.on && o > .01
		};
	}, Fe = (e, t, n, r, i, a = 0) => {
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
	}, Ie = (e) => {
		let t = e.querySelector(".cam"), n = [t];
		for (; n.length < ee;) {
			let e = t.cloneNode();
			n[n.length - 1].after(e), n.push(e);
		}
		return n;
	}, Le = (e, t, n, r, i, a = 0) => e.forEach((e, o) => t[o] ? Fe(e, t[o], n, r, i, a) : e.style.opacity = "0");
	function Re(e) {
		let t = ie(e), n = M(t);
		N = t, P = null, F = null, V.on = !1, G.on = !1, ke = null, q.el.style.transform = "", q.el.style.removeProperty("--spin-s"), L(n), Se.snap(1), ze(t.img), be.snap(+!!ae(t)), Ce.snap(+!!O(t)), xe.snap(se(t) ? w.crease : 0), z.a.snap(1), z.b.snap(0), hn(t, !0);
	}
	function ze(e) {
		let t = R.old, n = R.neu;
		t.r = e, t.held = !1, t.grow.snap(0), t.blur.snap(0), t.veil.snap(0), t.op.snap(1), n.r = null, n.op.snap(0), n.blur.snap(0), R.swap = null;
	}
	function Be(e) {
		let t = R.neu, n = R.old, r = R.swap, i = r ? Oe(Ee(r, e)) : t.blur.at(e), o = r ? a(0, 1, Ee(r, e)) : t.op.at(e);
		t.r && o > .5 ? (n.r = t.r, n.grow.snap(0), n.blur.snap(i), n.veil.snap(0), n.op.snap(1)) : r && n.blur.snap(i), n.held = !0, t.r = null, t.op.snap(0), t.blur.snap(0), R.swap = null;
	}
	function Ve(e, t = !1) {
		let n = R.old;
		n.grow.to(1, w.holdRise, e), n.blur.to(Math.max(t ? w.holdLight : w.holdBlur, n.blur.at(e)), w.holdRise, e), n.veil.to(w.veil, w.holdRise, e);
	}
	function He(e) {
		let t = R.old;
		t.grow.to(0, 120, e), t.blur.to(0, 120, e), t.veil.to(0, 120, e);
	}
	let Ue = () => e.matches, We = (e) => I.w.done(e) && I.h.done(e) && I.y.done(e) && I.s.done(e, .002), Ge = (e) => {
		let t = M(N);
		return Math.abs(I.w.at(e) - t.w) < 3 && Math.abs(I.h.at(e) - t.h) < 3 && Math.abs(I.y.at(e) - t.y) < 3;
	};
	function Ke(e) {
		let t = performance.now(), n = ie(e);
		if (pe.t = t, !n || !N || n.sel === N.sel) return;
		if (V.on || G.on) {
			F = n.sel;
			return;
		}
		let r = N, i = r.kind === "device" && n.kind === "device" && r.dev === n.dev, a = !Ue() && i && r.folded !== n.folded, o = !Ue() && i && r.angle !== n.angle && r.folded === n.folded;
		if ((a || o) && !We(t)) {
			F = n.sel;
			return;
		}
		if (F = null, !P && !O(r) && !O(n) && Math.round(r.w) === Math.round(n.w) && Math.round(r.h) === Math.round(n.h) && r.img) {
			D.has(n.sel) || D.set(n.sel, r.img), n.img = D.get(n.sel), N = n, hn(n), Wn();
			return;
		}
		let s = D.has(n.sel);
		N = n, hn(n), Ue() ? Xe(r, n, t) : a ? dt(r, n, t, s) : o ? St(r, n, t, s) : qe(r, n, t, s), s && P.kind !== "size" && (P.arriveAt = t);
	}
	function qe(e, t, n, r) {
		P && P.kind === "fade" && Ze(n), Be(n);
		let i = {
			w: I.w.at(n),
			h: I.h.at(n)
		}, a = M(t);
		L(a, n, c(w.frameDur, w.frameBounce), c(w.frameDur, w.outlineBounce), w.outlineLead), be.to(O(t) ? 0 : ae(e) || ae(t) ? 1 : be.b, 140, n), Ce.to(+!!O(t), 220, n), xe.to(se(t) ? w.crease : 0, 220, n), r ? He(n) : Ve(n, !0), P = {
			kind: "size",
			from: e,
			to: t,
			t0: n,
			arriveAt: Infinity,
			arrived: !1,
			cached: r,
			swapped: !1,
			deepAt: r ? 0 : n + w.holdDeepAfter,
			grow: t.w >= e.w && t.h >= e.h,
			f0: i,
			f1: a
		};
	}
	function Je(e) {
		let { f0: t, f1: n } = P, r = (e, t, n) => Math.abs(t - n) < 1 ? 0 : Math.abs(e - n) / Math.abs(t - n);
		return Math.max(r(I.w.at(e), t.w, n.w), r(I.h.at(e), t.h, n.h)) < w.swapNear;
	}
	function Ye(e) {
		let t = R.neu, n = P;
		n.swapped = n.arrived = !0, t.r = n.to.img, t.op.snap(0), t.blur.snap(0), R.swap = {
			t0: e,
			dur: w.swapDur
		};
	}
	function Xe(e, t, n) {
		P && P.kind === "fade" && Ze(n), V.on && vt(n), G.on && wt(n), Be(n), R.old.grow.to(0, 120, n), R.old.blur.to(0, 120, n), R.old.veil.to(0, 120, n);
		for (let e of [
			I.w,
			I.h,
			I.s,
			I.y,
			ye.w,
			ye.h
		]) e.snap(e.at(n));
		J.w.snap(e.w), J.h.snap(e.h), R.old.op.to(w.reducedDim, 160, n), P = {
			kind: "fade",
			from: e,
			to: t,
			t0: n,
			arriveAt: Infinity,
			arrived: !1
		};
	}
	function Ze(e) {
		let t = P;
		P = null, ke = null, L(M(t.to)), ze(t.to.img), be.snap(+!!ae(t.to)), Ce.snap(+!!O(t.to)), xe.snap(se(t.to) ? w.crease : 0), z.a.snap(1), z.b.snap(0), Se.to(1, 200, e);
	}
	function Qe() {
		if (!P) return;
		let e = P.arriveAt;
		P.arrived = !0;
		let t = (P.kind === "fold" || P.kind === "unfold") && V.cached || P.kind === "spin" && G.cached;
		if (P.kind === "spin" || t || P.kind === "size" && P.cached) return;
		if (P.kind === "fade") {
			ke = {
				f: M(P.to),
				st: P.to,
				layers: Te(P.to.img)
			}, z.b.snap(0), z.b.to(1, w.reducedFade, e), z.a.to(0, w.reducedFade, e), Se.to(0, 120, e);
			return;
		}
		let n = R.neu;
		P.deepAt ? (P.deepAt = 0, n.r = P.to.img, n.op.snap(0), n.op.to(1, w.fastReveal, e), n.blur.snap(R.old.blur.at(e)), n.blur.to(0, w.fastReveal, e)) : (n.r = P.to.img, n.op.snap(0), n.op.to(1, w.revealFade, e), n.blur.snap(Math.max(R.old.blur.at(e), R.old.blur.b)), n.blur.to(P.kind === "size" && !Ge(e) ? w.moveBlur : 0, w.revealDur, e));
	}
	let V = { on: !1 };
	function $e(e, t) {
		let n = V.d[e ? "cover" : "open"], r = m(V.d);
		return V.d.look[e ? "cover" : "open"].cams.map((e) => y(n.w, n.h, r, e, t, r));
	}
	let H = C("rig"), U = (e, t) => e.querySelector(t), et = (e, t) => e.querySelector(t), tt = (e) => ({
		el: e,
		cam: U(e, ".cam"),
		cams: Ie(e),
		old: U(e, ".old"),
		veil: U(e, ".veil"),
		neu: U(e, ".neu"),
		cast: U(e, ".cast"),
		blurs: [],
		dark: null
	}), nt = (e) => {
		let t = document.createElement("div"), n = document.createElement("div"), r = document.createElement("div");
		return t.className = "gloss", n.className = "rim", r.className = "home", e.prepend(t, n), e.append(r), {
			body: e,
			gloss: t,
			home: r,
			clip: et(e, ".clip"),
			ring: et(e, ".ring"),
			lit: et(e, ".lit"),
			fit: []
		};
	}, rt = (e) => ({
		el: e,
		front: nt(U(e, ".front")),
		back: nt(U(e, ".rear")),
		strips: []
	}), it = U(H, ".space"), at = rt(U(H, ".slab.base")), ot = rt(U(H, ".slab.leaf")), W = {
		lift: U(H, ".lift"),
		space: it,
		plate: U(H, ".plate"),
		spine: U(H, ".spine"),
		crease: U(H, ".crease"),
		tTop: U(H, ".r-top"),
		tBot: U(H, ".r-bot"),
		base: at,
		leaf: ot,
		btns: Array.from({ length: 5 }, () => {
			let e = document.createElement("div");
			return e.className = "btn", it.append(e), e;
		}),
		F: {
			inner: tt(ot.front.clip),
			outer: tt(ot.back.clip),
			base: tt(at.front.clip)
		}
	};
	for (let [e, t] of [[W.leaf.front, W.F.inner], [W.leaf.back, W.F.outer]]) t.blurs = Array.from({ length: 4 }, () => {
		let e = document.createElement("div");
		return e.className = "smear", e.innerHTML = "<div class=\"unstretch\"><img class=\"ly\" alt=\"\"></div>", t.el.insertBefore(e, t.cam), {
			el: e,
			inv: U(e, ".unstretch"),
			img: U(e, "img")
		};
	}), t.dark = document.createElement("div"), t.dark.className = "smear", t.el.insertBefore(t.dark, t.cam), e.fit.push(...t.blurs.map((e) => e.el), t.dark);
	W.base.front.fit.push(W.F.base.cast);
	let st = /* @__PURE__ */ new Map(), ct = null;
	function lt(e, t, n) {
		let r = st.get(e);
		(r || !ct || ct.has(e)) && (r || (r = {
			w0: Math.max(t, 1),
			h0: Math.max(n, 1),
			k: [1, 1]
		}, st.set(e, r), Object.assign(e.style, {
			width: K(r.w0),
			height: K(r.h0)
		})), r.k = [t / r.w0, n / r.h0], e.style.transform = `scale(${r.k[0].toFixed(5)}, ${r.k[1].toFixed(5)})`);
	}
	function ut() {
		W.F.base.cast.style.background = `linear-gradient(90deg, ${s(1)}, ${s(.35)} 45%, ${s(0)} 90%)`;
		for (let [e, t] of [[W.F.inner, "to left"], [W.F.outer, "to right"]]) e.dark.style.background = `linear-gradient(${t}, ${[
			0,
			.2,
			.4,
			.6,
			.8,
			1
		].map((e) => `${s(Math.min(1, 2 * Math.max(0, (e - .2) / .8) ** 1.35) * w.foldDark)} ${e * 100}%`).join(", ")})`, e.blurs.forEach(({ el: e }, n) => {
			e.style.webkitMaskImage = e.style.maskImage = `linear-gradient(${t}, transparent ${((n + .5) / 4 * 100).toFixed(1)}%, var(--device-shade) ${((n + 1) / 4 * 100).toFixed(1)}%)`;
		});
	}
	function dt(e, t, r, i) {
		let a = n[t.dev], o = t.folded ? "fold" : "unfold", s = a.open.hinge, c = M(e), l = M(t);
		if (Be(r), i) {
			let e = R.old;
			e.grow.snap(0), e.blur.snap(0), e.veil.snap(0);
		}
		let u = R.old.blur.at(r), d = h(a, "open"), f = h(a, "cover"), p = (e) => e.cx - d.w * e.s / 2 + s * e.s, g = (e) => e.cx - f.w * e.s / 2, _ = {
			w: t.w,
			h: t.h
		}, v = (t.angle - e.angle + 540) % 360 - 180;
		Object.assign(V, {
			on: !0,
			turn: Math.abs(v) === 180 ? 0 : v,
			q: m(a) ? 90 : 0,
			z: parseFloat(getComputedStyle(H).getPropertyValue("--z")) || 1,
			t0: r,
			dur: w.foldDur,
			dir: o,
			d: a,
			restBlur: u,
			oldSpec: R.old.r,
			from: e,
			to: t,
			f0: c,
			f1: l,
			cached: i,
			s0: c.s,
			s1: l.s,
			sRef: Math.max(c.s, l.s),
			half: {
				u: s,
				v: d.h
			},
			cover: {
				u: f.w,
				v: f.h
			},
			hx0: o === "fold" ? p(c) : g(c),
			hx1: o === "fold" ? g(l) : p(l),
			plan: o === "fold" ? {
				inner: {
					role: "crisp",
					du: 0
				},
				base: {
					role: "crisp",
					du: s
				},
				outer: {
					role: "hold",
					du: 0,
					neu: !0,
					frame: _
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
					frame: _
				},
				base: {
					role: "hold",
					du: s,
					neu: !0,
					frame: _
				}
			}
		}), V.dip = ht(), st.clear(), ut();
		let y = o === "fold" ? 0 : 1, b = /* @__PURE__ */ new Map([
			[W.base.front, y],
			[W.leaf.front, y],
			[W.base.back, y],
			[W.leaf.back, 1 - y]
		]);
		for (let [e, t] of b) e.gloss.style.setProperty("--turn", ft(t) + "deg");
		let x = [...b].filter(([, e]) => e === 1).map(([e]) => e);
		ct = new Set(x.flatMap((e) => [e.gloss, ...e.fit])), Gt(r + V.dur * 1e3), ct = null, i || Ve(r), xe.snap(0), J.w.snap(e.w), J.h.snap(e.h), Se.to(0, 120, r), P = {
			kind: o,
			from: e,
			to: t,
			t0: r,
			arriveAt: Infinity,
			arrived: !1
		};
	}
	let ft = (e) => V.from.angle + V.turn * e + V.q, pt = (e) => {
		let t = e.bezel * w.shellK, n = A(e) * w.shellK;
		return m(V.d) ? [n, t] : [t, n];
	};
	function mt(e, [t, n]) {
		let i = (V.dir === "fold" ? e : 1 - e) * 180, o = r(V.s0, V.s1, e), s = r(V.f0.y + V.f0.h / 2, V.f1.y + V.f1.h / 2, e), c = ft(e), l = i * Math.PI / 180, u = c * Math.PI / 180, d = i / 180, f = r(V.half.u, V.cover.u, d), p = r(V.half.v, V.cover.v, d), m = r(V.hx0, V.hx1, e), h = he(), g = (m - h.cx) / o, _ = w.perspective / (w.perspective - (f + V.d.plate.thickness) * Math.sin(l) * o), v = -f * Math.cos(l) * _, y = r(V.half.u, Math.min(V.half.u, V.cover.u), a(w.shrinkFrom, 180, i)), b = [g + Math.min(0, v) - t, g + Math.max(y, v) + t], x = [-p * _ / 2 - n, p * _ / 2 + n], ee = b.flatMap((e) => x.map((t) => [e * Math.cos(u) - t * Math.sin(u), e * Math.sin(u) + t * Math.cos(u)])), S = (e) => Math.max(...ee.map((t) => Math.abs(t[e])));
		return {
			th: i,
			baseS: o,
			cy: s,
			angle: c,
			v: p,
			hx: m,
			r: h,
			need: Math.min(1, h.maxW / (2 * S(0) * o), h.maxH / (2 * S(1) * o))
		};
	}
	function ht() {
		let [e, t] = pt(V.d.look.open), [n, r] = pt(V.d.look.cover), i = [Math.max(e, n), Math.max(t, r)], o = [];
		for (let e = 1; e < 48; e++) {
			let t = e / 48, n = 1 - mt(t, i).need;
			n > 0 && o.push([t, n + .004]);
		}
		let s = (e, t) => e <= t ? a(0, t, e) : 1 - a(t, 1, e);
		return (e) => o.reduce((t, [n, r]) => Math.max(t, r * s(e, n)), 0);
	}
	function gt(e) {
		let t = (e - V.t0) / 1e3, n = Math.max(.05, V.dur), r = fe()(i(t / n, 0, 1)), { th: a, baseS: o, cy: s, angle: c, v: l, hx: u, r: d } = mt(r, pt(Ne(e))), f = o * (1 - V.dip(r));
		return {
			t,
			th: a,
			p: r,
			s: f,
			hx: d.cx + (u - d.cx) * f / o,
			cy: s,
			angle: c,
			top: s - l * f / 2,
			settled: t >= n
		};
	}
	let _t = (e) => i(1 - e / 24, 0, 1);
	function vt(e) {
		let t = w.crease * _t(gt(e).th);
		V.on = !1, V.cached && ze(N.img), L(M(N)), be.snap(+!!ae(N)), Ce.snap(+!!O(N)), xe.snap(se(N) ? t : 0), se(N) && xe.to(w.crease, 240, e), Se.to(1, 200, e);
	}
	let G = { on: !1 }, yt = "", bt = null, xt = () => {
		let e = `${w.rotLift},${w.rotLand}`;
		return e !== yt && (yt = e, bt = u(w.rotLift, 0, w.rotLand, 1)), bt;
	};
	function St(e, t, n, r) {
		Be(n), r ? He(n) : Ve(n);
		let i = (t.angle - e.angle + 540) % 360 - 180;
		Object.assign(G, {
			on: !0,
			t0: n,
			dur: w.rotDur,
			from: e,
			to: t,
			f0: M(e),
			f1: M(t),
			dir: i / 90,
			cached: r
		}), J.w.snap(e.w), J.h.snap(e.h), Se.to(0, 120, n), P = {
			kind: "spin",
			from: e,
			to: t,
			t0: n,
			arriveAt: Infinity,
			arrived: !1
		};
	}
	function Ct(e) {
		let t = (e - G.t0) / 1e3, n = Math.max(.05, G.dur);
		return {
			p: xt()(i(t / n, 0, 1)),
			done: t >= n
		};
	}
	function wt(e) {
		let t = G.to, n = G.cached;
		G.on = !1, q.el.style.transform = "", q.el.style.removeProperty("--spin-s");
		for (let e of [q.l0, q.l1]) e.style.transform = "";
		L(M(t)), xe.snap(se(t) ? w.crease : 0), Se.to(1, 200, e), n ? (ze(t.img), P?.kind === "spin" && (P = null)) : P?.kind === "spin" && Object.assign(P, {
			kind: "size",
			cached: !1,
			arrived: !1,
			arriveAt: D.has(t.sel) ? e : Infinity
		});
	}
	let Tt = (e, t, n) => {
		if (!n) return {
			w: e.dpW,
			h: e.dpH
		};
		let r = Math.max(t.w / e.dpW, t.h / e.dpH);
		return {
			w: e.dpW * r,
			h: e.dpH * r
		};
	};
	function Et(e, t, n, r, i, a, o, s = 0) {
		!t || a <= .001 ? e.style.opacity = "0" : (e.dataset.u !== t.url && (e.src = t.url, e.dataset.u = t.url), e.style.left = n + "px", e.style.top = s + "px", e.style.width = r + "px", e.style.height = i + "px", e.style.opacity = String(a), e.style.filter = o > .05 ? `blur(${o.toFixed(2)}px)` : "none");
	}
	function Dt(e, t, n, r, i, a, o, s = 0, c = 1) {
		let l = h(V.d, r ? "cover" : "open");
		Et(e, t, (l.w - n.w) * a / 2 - i * a, n.w * a, n.h * a, c, s, (l.h - n.h) * a / 2), e.style.transform = `rotate(${-gt(o).angle}deg)`;
	}
	function Ot(e, t, n, r, i) {
		let a = R.old, o = R.neu, s = V.oldSpec, c = t === V.plan.outer, l = (e, a, o, s, l = 1) => Dt(e, a, o, c, t.du, n, r, s * i, l);
		if (t.role === "crisp") l(e.old, s, {
			w: s.dpW,
			h: s.dpH
		}, V.restBlur), e.veil.style.opacity = "0";
		else if (V.cached) {
			let t = V.to.img;
			l(e.old, t, {
				w: t.dpW,
				h: t.dpH
			}, 0), e.veil.style.opacity = "0", e.neu.style.opacity = "0", e.el.style.background = t.edge;
			return;
		} else l(e.old, s, Tt(s, t.frame, a.grow.b > 0), a.blur.at(r)), e.veil.style.opacity = String(a.veil.at(r));
		t.neu && o.r ? l(e.neu, o.r, {
			w: o.r.dpW,
			h: o.r.dpH
		}, o.blur.at(r), o.op.at(r)) : e.neu.style.opacity = "0", e.el.style.background = (o.r && o.op.at(r) > .5 && t.neu ? o.r : s).edge;
	}
	function kt(e, t) {
		let { angle: n, cy: r } = gt(t);
		e.style.transformOrigin = `${he().cx}px ${r}px`, e.style.transform = `rotate(${n}deg)`;
	}
	let At = (() => {
		let e = w.lightAz * Math.PI / 180, t = w.lightEl * Math.PI / 180;
		return [
			Math.cos(t) * Math.cos(e),
			-Math.cos(t) * Math.sin(e),
			Math.sin(t)
		];
	})(), jt = (e) => i(w.ambient + (1 - w.ambient) * Math.max(0, e[0] * At[0] + e[1] * At[1] + e[2] * At[2]) / At[2], 0, 1.5), Mt = (e) => [
		1,
		3,
		5
	].map((t) => parseInt(e.slice(t, t + 2), 16)), Nt = (e, t) => `rgb(${e.map((e) => Math.round(t <= 1 ? e * t : e + (255 - e) * (t - 1) * .5)).join(" ")})`, Pt = (e, t) => {
		let n = Nt(e, t);
		return `linear-gradient(90deg, ${`color-mix(in srgb, ${n}, var(--device-veil) 18%)`} 0, ${n} 10%, ${n} 90%, ${`color-mix(in srgb, ${n}, var(--device-shade) 20%)`} 100%)`;
	}, Ft = (e) => e <= 1 ? ["var(--device-shade)", w.screenDim * (1 - e)] : ["var(--device-veil)", (e - 1) * .25], It = (e) => {
		let t = [], n = 0, r = 0;
		for (let i = 0; i < e.length; i++) {
			let a = e[i];
			a === "(" ? n++ : a === ")" ? n-- : a === "," && !n && (t.push(e.slice(r, i)), r = i + 1);
		}
		return [...t, e.slice(r)].filter((e) => e.trim());
	}, K = (e) => e.toFixed(2) + "px", Lt = (e) => e.map(K).join(" ");
	function Rt([e, t, n, r], [i, a, o, s], c) {
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
	function zt(e, { body: t, span: n, bodyR: r, scr: a, scrR: o, backScrR: s, T: c, normal: l, tone: u, hk: d, hingeLeft: f, u: p }) {
		let [m, h, g, _] = t, v = g - m, y = _ - h, b = ((e) => e.map((e) => i(e, 0, Math.min(v, y) / 2)))(r), x = (e) => [
			e[1],
			e[0],
			e[3],
			e[2]
		];
		for (let [t, r] of [[e.front, !1], [e.back, !0]]) {
			let e = r ? g - a[2] : a[0] - m, i = r ? x(s || o) : o, _ = a[2] - a[0], ee = a[3] - a[1];
			if (Object.assign(t.body.style, {
				left: K(m),
				top: K(h),
				width: K(v),
				height: K(y),
				backgroundColor: Nt(u, 1),
				borderRadius: Lt(r ? x(b) : b),
				transform: r ? `translateZ(${K(-c)}) rotateY(180deg)` : "none"
			}), t.clip && Object.assign(t.clip.style, {
				left: K(e),
				top: K(a[1] - h),
				width: K(_),
				height: K(ee),
				borderRadius: Lt(i)
			}), t.ring) {
				let n = 2 * p / V.z, o = n * d, [s, c] = f ? [o, n] : [n, o], [l, u] = r ? [c, s] : [s, c];
				Object.assign(t.ring.style, {
					left: K(e - l),
					top: K(a[1] - h - n),
					width: K(_ + l + u),
					height: K(ee + 2 * n),
					borderWidth: `${K(n)} ${K(u)} ${K(n)} ${K(l)}`,
					borderRadius: Lt(i.map((e) => e + n))
				});
			}
			if (t.lit) {
				let [e, n] = Ft(jt(l([
					0,
					0,
					r ? -1 : 1
				])));
				t.lit.style.background = e, t.lit.style.opacity = n.toFixed(4);
			}
			t.gloss.style.left = r ? "0px" : K(n[0] - m), lt(t.gloss, r ? v : n[1] - n[0], y);
			for (let e of t.fit) lt(e, _, ee);
		}
		let ee = Rt(t, b, w.arcSegs);
		for (; e.strips.length < ee.length;) {
			let t = document.createElement("div");
			t.className = "strip", e.el.append(t), e.strips.push(t);
		}
		e.strips.forEach((e, t) => {
			let n = ee[t];
			if (!n || n.len < .05 || c < .05) {
				e.style.display = "none";
				return;
			}
			let r = n.len + .6 * p, i = n.a * Math.PI / 180;
			Object.assign(e.style, {
				display: "",
				width: K(c),
				height: K(r),
				marginLeft: K(-c / 2),
				marginTop: K(-r / 2),
				transform: `translate3d(${K(n.x)},${K(n.y)},${K(-c / 2)}) rotateZ(${n.a.toFixed(3)}deg) rotateY(90deg)`
			}), e.style.background = Pt(u, jt(l([
				Math.cos(i),
				Math.sin(i),
				0
			])));
		});
	}
	function Bt(e, t, n) {
		let r = V.d.plate.blur && t > .01, i = Number(e.neu.style.opacity) > .5 ? e.neu : e.old;
		e.blurs.forEach(({ el: e, inv: a, img: o }, s) => {
			let c = w.foldBlur * t * ((s + 1) / 4) ** 1.35 * n, l = parseFloat((/blur\(([\d.]+)px\)/.exec(i.style.filter) || ["0", "0"])[1]);
			if (e.style.opacity = r && c > .2 ? "1" : "0", !r || c <= .2) return;
			o.src !== i.src && (o.src = i.src);
			let [u, d] = st.get(e).k;
			a.style.transform = `scale(${(1 / u).toFixed(5)}, ${(1 / d).toFixed(5)})`, Object.assign(o.style, {
				left: i.style.left,
				top: i.style.top,
				width: i.style.width,
				height: i.style.height,
				transform: i.style.transform,
				filter: `blur(${Math.max(c, l).toFixed(2)}px)`
			});
		}), e.dark.style.opacity = r ? t.toFixed(4) : "0";
	}
	function Vt({ hu: e, T0: t, Bv: n, t: i, s: a, k: o, sn: s, cs: c, lift: l, tone: u, u: d }) {
		let f = V.d, p = f.open.hinge, m = 3 * d;
		f.look.open.btn.forEach((h, g) => {
			let _ = f.look.cover.btn[g], v = h.at < p, y = r(v ? p - h.at - h.len : h.at - p, _.at, v ? o : 0), b = r(v ? p - h.at : h.at + h.len - p, _.at + _.len, v ? o : 0), [x, ee] = v ? [-b * c, -y * c].sort((e, t) => e - t) : [y, b], S = (y + b) / 2;
			Object.assign(W.btns[g].style, {
				left: K(e + x * a),
				top: K(h.side > 0 ? t - i - m + .5 * d : t + n + i - .5 * d),
				width: K((ee - x) * a),
				height: K(m),
				backgroundColor: u,
				opacity: +((v ? r(h.len, _.len, o) : h.len) * a > .5 * d),
				transform: `translateZ(${K(l + (v ? S * a * s : 0))})`
			});
		});
	}
	let Ht = null, Ut = () => Ht ??= It(getComputedStyle(H).getPropertyValue("--elevation-2")).map((e) => {
		let t = /^\s*(-?[\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+([\d.]+)(?:px)?\s+(-?[\d.]+)(?:px)?\s+(.+)$/.exec(e);
		return t ? [
			+t[1],
			+t[2],
			+t[3],
			+t[4],
			t[5].trim()
		] : null;
	}).filter((e) => e !== null), Wt = (e, t, n) => e.map(([e, r, i, a, o]) => `${K((e * Math.cos(t) + r * Math.sin(t)) * n)} ${K((-e * Math.sin(t) + r * Math.cos(t)) * n)} ${K(i * n)} ${K(a * n)} ${o}`).join(", ");
	function Gt(e) {
		let { th: t, s: n, hx: i, top: o, cy: c, angle: l } = gt(e), u = V.sRef, d = n / u, f = 1 / d, h = c - (c - o) * u / n, g = t / 180, _ = t * Math.PI / 180, v = Math.sin(_), y = Math.cos(_), b = V.d, x = Ne(e), ee = x.bezel * w.shellK * u, [S, C] = pt(x).map((e) => e * u), T = Mt(x.tone), te = r(V.half.u, V.cover.u, g) * u, ne = r(V.half.v, V.cover.v, g) * u, re = r(V.half.u, Math.min(V.half.u, V.cover.u), a(w.shrinkFrom, 180, t)) * u, E = ne, D = b.plate.thickness * u, ie = b.plate.gap * u / 2, ae = (D + 2 * ie) * (1 - y) / 2, O = a(20, 160, t), oe = S * O, se = m(b) ? 3 : 0, k = p(b.look.open.radius, se).map((e) => e * u), A = p(b.look.cover.radius, se).map((e) => e * u), ce = a(60, 120, t), j = (e, t) => r(e, t, ce) + ee, le = [
			j(k[0], A[0]) * O,
			j(k[1], A[1]),
			j(k[2], A[2]),
			j(k[3], A[3]) * O
		], ue = [
			j(k[0], A[1]),
			j(k[1], A[0]) * O,
			j(k[2], A[3]) * O,
			j(k[3], A[2])
		], de = le[1], fe = le[0], pe = `${K(i)} ${K(c)}`, me = d.toFixed(5);
		Object.assign(W.lift.style, {
			perspective: w.perspective + "px",
			perspectiveOrigin: pe
		}), Object.assign(W.space.style, {
			transformOrigin: pe,
			transform: `scale3d(${me},${me},${me}) translateZ(${K(-ae)})`
		});
		let he = l * Math.PI / 180, ge = Math.cos(he), _e = Math.sin(he), ve = (e) => [
			e[0] * ge - e[1] * _e,
			e[0] * _e + e[1] * ge,
			e[2]
		], M = (e) => [
			e[0] * y + e[2] * v,
			e[1],
			-e[0] * v + e[2] * y
		];
		for (let e of [W.base, W.leaf]) Object.assign(e.el.style, {
			left: K(i),
			top: K(h)
		});
		W.leaf.el.style.transform = `translateZ(${K(ie)}) rotateY(${t.toFixed(3)}deg) translateZ(${K(-ie)})`;
		let N = [-te - S, re + S];
		zt(W.base, {
			body: [
				-oe,
				-C,
				re + S,
				E + C
			],
			span: N,
			bodyR: le,
			scr: [
				0,
				0,
				re,
				E
			],
			scrR: [
				k[0] * O,
				k[1],
				k[2],
				k[3] * O
			],
			T: D,
			normal: ve,
			tone: T,
			hk: O,
			hingeLeft: !0,
			u: f
		}), zt(W.leaf, {
			body: [
				-te - S,
				-C,
				oe,
				ne + C
			],
			span: N,
			bodyR: ue,
			scr: [
				-te,
				0,
				0,
				ne
			],
			scrR: [
				k[0],
				k[1] * O,
				k[2] * O,
				k[3]
			],
			backScrR: [
				A[1],
				A[0] * O,
				A[3] * O,
				A[2]
			],
			T: D,
			normal: (e) => ve(M(e)),
			tone: T,
			hk: O,
			hingeLeft: !1,
			u: f
		}), Ot(W.F.base, V.plan.base, u, e, f), Ot(W.F.inner, V.plan.inner, u, e, f), Ot(W.F.outer, V.plan.outer, u, e, f), Bt(W.F.inner, t <= 90 ? v : 0, f), Bt(W.F.outer, t > 90 ? v : 0, f);
		let P = $e(!1, u), F = b.open.hinge * u;
		Le(W.F.outer.cams, $e(!0, u), 0, 0, 1, l), Le(W.F.inner.cams, P, 0, 0, 1, l), Le(W.F.base.cams, P, -F, 0, 1, l);
		let I = (e) => {
			let t = b[e ? "cover" : "open"], n = Number(b.look[e ? "cover" : "open"].home) || 0;
			return [Pe(x, t.w, t.h, m(b), u, m(b), n), n];
		}, [ye, be] = I(!1), [xe, Se] = I(!0);
		Fe(W.base.front.home, ye, oe - F, C, be), Fe(W.leaf.front.home, ye, S, C, be), Fe(W.leaf.back.home, xe, oe, C, Se);
		let Ce = w.shade * (.85 * a(90, 180, t) + .25 * v);
		W.F.base.cast.style.opacity = Ce.toFixed(4);
		let L = -oe, Te = -D, R = -D - ie, Ee = oe * y + R * v, De = ie - oe * v + R * y, Oe = Math.hypot(Ee - L, De - Te), z = Math.atan2(-(De - Te), Ee - L), ke = E + 2 * C;
		Object.assign(W.spine.style, {
			display: Oe > .3 && D > .05 ? "" : "none",
			left: K(i),
			top: K(h - C),
			width: K(Oe + .6 * f),
			height: K(ke),
			marginLeft: K(-(Oe + .6 * f) / 2),
			borderRadius: `${K(Math.min(fe, (Oe + .6 * f) / 2))} / ${K(fe)}`,
			transform: `translate3d(${K((L + Ee) / 2)},0,${K((Te + De) / 2)}) rotateY(${(z * 180 / Math.PI).toFixed(3)}deg)`
		}), W.spine.style.background = Pt(T, jt(ve([
			Math.sin(z),
			0,
			Math.cos(z)
		])));
		let B = i - te * y, Ae = Math.min(i - oe, B - S), je = Math.max(i + re + S, B + S);
		Object.assign(W.plate.style, {
			left: K(Ae),
			top: K(h - C),
			width: K(je - Ae),
			height: K(E + 2 * C),
			borderRadius: K(de),
			transform: `translateZ(${K(-D - f)})`,
			boxShadow: Wt([...Ut(), [
				0,
				10 + 18 * v,
				30 + 34 * v,
				0,
				s(.05 * v)
			]], he, f)
		}), m(b) ? Vt({
			hu: i,
			T0: h,
			Bv: E,
			t: C,
			s: u,
			k: g,
			sn: v,
			cs: y,
			lift: ae,
			tone: x.tone,
			u: f
		}) : x.btn.forEach((e, t) => {
			Object.assign(W.btns[t].style, {
				left: K(Math.max(i + re, B) + S - .5 * f),
				top: K(h + e.at * u),
				width: K(3 * f),
				height: K(e.len * u),
				backgroundColor: x.tone,
				opacity: +(e.len * u > .5 * f),
				transform: `translateZ(${K(ae)})`
			});
		});
		let Me = _t(t), Ie = w.crease * Me;
		Object.assign(W.crease.style, {
			left: K(i),
			top: K(h),
			width: K(14 * f),
			marginLeft: K(-7 * f),
			height: K(E),
			opacity: Ie * we.at(e)
		});
		let Re = i - (ge + _e > 0 ? 0 : f);
		Object.assign(W.tTop.style, {
			left: K(Re),
			top: K(h - C),
			width: K(f),
			height: K(C),
			opacity: Me
		}), Object.assign(W.tBot.style, {
			left: K(Re),
			top: K(h + E),
			width: K(f),
			height: K(C),
			opacity: Me
		});
	}
	let Kt = (e) => ({
		el: e,
		shell: U(e, ".shell"),
		btns: [...e.querySelectorAll(".btn")],
		cams: Ie(e),
		home: U(e, ".home"),
		outline: U(e, ".outline"),
		stage: U(e, ".stage"),
		l0: U(e, ".l0"),
		l1: U(e, ".l1"),
		veil: U(e, ".veil"),
		crease: U(e, ".crease"),
		tTop: U(e, ".t-top"),
		tBot: U(e, ".t-bot")
	}), q = Kt(C("ua")), qt = Kt(C("ub"));
	function Jt(e, t, n, i, o) {
		let s = i.old, c = i.neu, l = i.swap, u = l ? Ee(l, o) : 0, d = l ? a(0, 1, u) : c.op.at(o), f = l ? Oe(u) : c.blur.at(o), p = Math.max(s.blur.at(o), l ? Oe(u) : 0);
		if (e.l0.style.transform = e.l1.style.transform = "", s.r) {
			let i = s.held ? s.grow.at(o) : 0, a = Tt(s.r, {
				w: t.w / n,
				h: t.h / n
			}, i > 0), c = r(s.r.dpW, a.w, i) * n, l = r(s.r.dpH, a.h, i) * n;
			Et(e.l0, s.r, (t.w - a.w * n) / 2 * i, c, l, s.op.at(o), p, (t.h - a.h * n) / 2 * i);
		} else e.l0.style.opacity = "0";
		e.veil.style.opacity = String(s.veil.at(o)), c.r ? Et(e.l1, c.r, 0, c.r.dpW * n, c.r.dpH * n, d, f) : e.l1.style.opacity = "0";
		let m = c.r ? l ? a(0, 1, u) : d : 0;
		return m > 0 && m < 1 && (e.l0.style.transformOrigin = e.l1.style.transformOrigin = "50% 50%", e.l0.style.transform = `scale(${(1 + w.swapZoom * m).toFixed(4)})`, e.l1.style.transform = `scale(${(1 - w.swapZoom * (1 - m)).toFixed(4)})`), c.r && d > .5 ? c.r : s.r;
	}
	function Yt(e, t, n, i) {
		let { p: o } = Ct(i), s = G.dir * 90 * o, c = s * Math.PI / 180, l = R.old, u = (e, n, r, i, a, o = 0, c = 0) => {
			Et(e, n, (t.w - r.w) / 2 + o, r.w, r.h, i, a, (t.h - r.h) / 2 + c), e.style.transform = `rotate(${(-s).toFixed(3)}deg)`;
		};
		if (e.veil.style.opacity = String(l.veil.at(i)), !l.r) return e.l0.style.opacity = e.l1.style.opacity = "0", null;
		if (!G.cached || !G.to.img) {
			let a = {
				w: (Math.abs(t.w * Math.cos(c)) + Math.abs(t.h * Math.sin(c))) / n,
				h: (Math.abs(t.w * Math.sin(c)) + Math.abs(t.h * Math.cos(c))) / n
			}, o = Tt(l.r, a, !0), s = l.grow.at(i), d = {
				w: r(l.r.dpW, o.w, s) * n,
				h: r(l.r.dpH, o.h, s) * n
			};
			return u(e.l0, l.r, d, 1, l.blur.at(i), (l.r.dpW * n - t.w) / 2 * (1 - s), (l.r.dpH * n - t.h) / 2 * (1 - s)), e.l1.style.opacity = "0", l.r;
		}
		let d = a(w.spinSwapA, w.spinSwapB, o), f = De(d), p = l.r, m = G.to.img;
		return u(e.l0, p, {
			w: p.dpW * n,
			h: p.dpH * n
		}, 1, f), u(e.l1, m, {
			w: m.dpW * n,
			h: m.dpH * n
		}, d, f), d > .5 ? m : p;
	}
	function Xt(e, t, n, r, i, a, o, s = !1) {
		let { cx: c } = he(), l = w.gap, u = t.y;
		e.el.style.opacity = String(o), Object.assign(e.stage.style, {
			left: c - t.w / 2 + "px",
			top: u + "px",
			width: t.w + "px",
			height: t.h + "px"
		});
		let d = s ? Yt(e, t, r, a) : Jt(e, t, r, i, a);
		e.stage.style.background = d ? d.edge : "var(--surface-container)";
		let f = n.look, m = p(f.radius, +!!n.rot + (n.mirrored ? 2 : 0)).map((e) => e * r * n.shell);
		e.stage.style.borderRadius = Lt(m), Object.assign(e.outline.style, {
			left: c - n.w / 2 + "px",
			top: u - l + "px",
			width: n.w + "px",
			height: n.h + "px",
			borderRadius: Lt(m.map((e) => e > 0 ? e + l : 0)),
			opacity: n.op
		});
		let h = f.bezel * w.shellK * r, g = A(f) * w.shellK * r, _ = c - t.w / 2, v = n.rot ? g : h, b = n.rot ? h : g;
		Object.assign(e.shell.style, {
			left: _ - v + "px",
			top: u - b + "px",
			width: t.w + 2 * v + "px",
			height: t.h + 2 * b + "px",
			borderRadius: Lt(m.map((e) => e + h)),
			backgroundColor: f.tone,
			opacity: n.shell
		});
		let x = (n.rot ? t.w : t.h) / r;
		f.btn.forEach((i, a) => {
			let o = e.btns[a], s = i.at * r, c = i.len * r;
			Object.assign(o.style, n.rot ? {
				left: _ + (x * r - s - c) + "px",
				top: (i.side < 0 ? u - h - 3 + .5 : u + t.h + h - .5) + "px",
				width: c + "px",
				height: "3px"
			} : {
				left: (i.side < 0 ? _ - h - 3 + .5 : _ + t.w + h - .5) + "px",
				top: u + s + "px",
				width: "3px",
				height: c + "px"
			}, {
				backgroundColor: f.tone,
				opacity: c > .5 ? n.shell : 0
			}), n.mirrored && (o.style.left = 2 * _ + t.w - parseFloat(o.style.left) - parseFloat(o.style.width) + "px", o.style.top = 2 * u + t.h - parseFloat(o.style.top) - parseFloat(o.style.height) + "px");
		}), Le(e.cams, f.cams.map((e) => y((n.rot ? t.h : t.w) / r, x, n.rot, e, r, n.mirrored)), 0, 0, n.shell);
		let ee = Number(f.home) || 0;
		Fe(e.home, Pe(f, (n.rot ? t.h : t.w) / r, x, n.rot, r, n.mirrored, ee), _, u, n.shell * ee);
		let S = n.crease, C = n.rot !== !!n.tall;
		e.crease.classList.toggle("h", C), Object.assign(e.crease.style, C ? {
			left: "0px",
			top: t.h / 2 + "px",
			width: t.w + "px",
			height: "",
			opacity: S * we.at(a)
		} : {
			left: t.w / 2 + "px",
			top: "0px",
			width: "",
			height: t.h + "px",
			opacity: S * we.at(a)
		});
		let T = S > 0 ? n.shell * Math.min(1, S / Math.max(.01, w.crease)) : 0;
		C ? (Object.assign(e.tTop.style, {
			left: _ - v + "px",
			top: u + t.h / 2 + "px",
			width: v + "px",
			height: "1px",
			opacity: T
		}), Object.assign(e.tBot.style, {
			left: _ + t.w + "px",
			top: u + t.h / 2 + "px",
			width: v + "px",
			height: "1px",
			opacity: T
		})) : (Object.assign(e.tTop.style, {
			left: c + "px",
			top: u - b + "px",
			width: "1px",
			height: b + "px",
			opacity: T
		}), Object.assign(e.tBot.style, {
			left: c + "px",
			top: u + t.h + "px",
			width: "1px",
			height: b + "px",
			opacity: T
		}));
	}
	function Zt(e) {
		if (V.on) {
			q.el.hidden = !0, qt.el.hidden = !0, H.hidden = !1, kt(H, e), Gt(e);
			return;
		}
		H.hidden = !0, q.el.hidden = !1;
		let t = I.s.at(e), i = G.on ? G.from : N;
		if (G.on) {
			let { p: t } = Ct(e), { f0: n, f1: i } = G, a = n.y + n.h / 2, o = i.y + i.h / 2;
			q.el.style.transformOrigin = `${n.cx}px ${a}px`;
			let s = (r(1, i.s / n.s, t) * (1 - w.rotDip * Math.sin(Math.PI * t))).toFixed(4);
			q.el.style.transform = `translate(${((i.cx - n.cx) * t).toFixed(2)}px, ${((o - a) * t).toFixed(2)}px) rotate(${(G.dir * 90 * t).toFixed(3)}deg) scale(${s})`, q.el.style.setProperty("--spin-s", s);
		}
		if (Xt(q, {
			w: I.w.at(e),
			h: I.h.at(e),
			y: I.y.at(e)
		}, {
			w: ye.w.at(e),
			h: ye.h.at(e),
			op: be.at(e),
			crease: xe.at(e),
			shell: Ce.at(e),
			rot: !!i.rot,
			mirrored: !!i.mirrored,
			tall: i.kind === "device" && m(n[i.dev]),
			look: Ne(e)
		}, t, R, e, z.a.at(e), G.on), ke) {
			qt.el.hidden = !1;
			let t = ke.f, r = w.gap, i = ke.st;
			Xt(qt, {
				w: t.w,
				h: t.h,
				y: t.y
			}, {
				w: t.w + 2 * r,
				h: t.h + 2 * r,
				op: +!!ae(i),
				crease: se(i) ? w.crease : 0,
				shell: +!!O(i),
				rot: !!i.rot,
				mirrored: !!i.mirrored,
				tall: i.kind === "device" && m(n[i.dev]),
				look: O(i) ? k(i) : Ne(e)
			}, t.s, ke.layers, e, z.b.at(e));
		} else qt.el.hidden = !0;
	}
	function Qt() {
		let e = pe.t;
		P && !P.arrived && e >= P.arriveAt && Qe(), P?.deepAt && e >= P.deepAt && (P.deepAt = 0, R.old.blur.to(Math.max(w.holdBlur, R.old.blur.at(e)), w.holdDeepen, e)), P && P.kind === "size" && P.cached && !P.swapped && (P.grow || Je(e) || e - P.t0 > w.frameDur * 800) && Ye(e), V.on && gt(e).settled && vt(e), G.on && Ct(e).done && wt(e);
		let t = R.neu, n = R.swap ? Ee(R.swap, e) >= 1 : t.op.done(e) && t.op.b === 1 && t.blur.done(e);
		if (!V.on && t.r && n) {
			let e = R.swap ? 0 : t.blur.b;
			ze(t.r), P?.kind === "size" && e && R.old.blur.snap(e);
		}
		if (P?.kind === "size" && P.arrived && !R.neu.r && Ge(e) && R.old.blur.b > 0 && !(R.old.grow.b > 0) && R.old.blur.to(0, w.settleSharp, e), P && (P.kind === "fade" ? P.arrived && z.b.done(e) && Ze(e) : P.kind !== "spin" && P.arrived && !V.on && !R.neu.r && We(e) && ye.w.done(e) && ye.h.done(e) && R.old.blur.b === 0 && R.old.blur.done(e) && (P = null, be.to(+!!ae(N), 220, e))), F && !V.on && !G.on && (!P || P.kind === "size")) {
			let t = F, n = ie(t), r = N;
			(r.kind !== "device" || n.kind !== "device" || r.dev !== n.dev || We(e)) && (F = null, Ke(t));
		}
		$ && N && (L(M({
			...N,
			w: $.w,
			h: $.h
		})), J.w.snap($.w), J.h.snap($.h)), Zt(e), l.classList.toggle("at-rest", !P && !F && !$), zn(e), S.layout({
			w: I.w.at(e),
			h: I.h.at(e),
			s: I.s.at(e),
			y: I.y.at(e),
			cx: he().cx,
			radius: p(Ne(e).radius, +!!N?.rot + (N?.mirrored ? 2 : 0)).map((t) => t * I.s.at(e) * Ce.at(e)),
			bezel: ce(Ne(e)) * I.s.at(e) * Ce.at(e)
		}, !!P || !!F || V.on || G.on || !!$);
	}
	let J = {
		w: new f(411),
		h: new f(891)
	}, Y = (e) => document.getElementById(e), X = {
		el: Y("panel"),
		pick: Y("pnPick"),
		fold: Y("pnFold"),
		sum: Y("pnSum"),
		body: Y("pnBody")
	}, Z = {
		el: Y("devCtl"),
		fold: Y("dcFold"),
		rot: Y("dcRot"),
		hinge: Y("dcHinge")
	}, $t = {
		el: Y("dcOrientation"),
		menu: Y("dcOrientMenu")
	}, en = [...$t.menu.querySelectorAll("[data-orientation]")], tn = () => Z.rot.getAttribute("aria-expanded") === "true";
	function nn(e, t = !0) {
		e && cn(!1), !e && $t.menu.contains(document.activeElement) && Z.rot.focus({ preventScroll: !0 }), Z.rot.setAttribute("aria-expanded", String(e)), $t.menu.classList.toggle("on", e), $t.menu.inert = !e, e && t && (en.find((e) => e.getAttribute("aria-checked") === "true") || en[0]).focus();
	}
	$t.menu.addEventListener("click", (e) => {
		let t = e.target.closest("[data-orientation]"), n = N;
		t && n.kind === "device" && (Gn(oe(n, n.folded, t.dataset.orientation)), nn(!1));
	}), $t.menu.addEventListener("keydown", (e) => {
		if (e.key === "Tab") {
			nn(!1);
			return;
		}
		if (![
			"ArrowDown",
			"ArrowUp",
			"Home",
			"End"
		].includes(e.key)) return;
		e.preventDefault(), e.stopPropagation();
		let t = en.indexOf(document.activeElement), n = e.key === "Home" ? 0 : e.key === "End" ? en.length - 1 : (t + (e.key === "ArrowUp" ? -1 : 1) + en.length) % en.length;
		en[n].focus();
	}), Z.rot.addEventListener("keydown", (e) => {
		["ArrowDown", "ArrowUp"].includes(e.key) && (e.preventDefault(), e.stopPropagation(), nn(!0));
	});
	let rn = [...X.pick.querySelectorAll("[data-sel]")], an = (e) => {
		let t = e.open, n = e.look.open, r = 19 / Math.max(t.w, t.h), a = t.w * r, o = t.h * r, s = 10 - a / 2, c = 10 - o / 2, l = 1.4, u = (e) => e.toFixed(2), d = i((Math.max(...n.radius) + n.bezel * w.shellK) * r * 1.8, 1.2, Math.min(a, o) / 3), f = l / 2 + i(n.bezel * w.shellK * r, .9, 2.2), p = Math.max(.4, d - f + l / 2), h = m(e), g = (e, t, n, r) => `<rect x="${u(e)}" y="${u(t)}" width="${u(n)}" height="${u(r)}" rx="${u(p)}" fill="currentColor" fill-opacity=".16"/>`, _ = e.fold ? h ? g(s + f, c + f, a - 2 * f, o / 2 - f - .4) + g(s + f, c + o / 2 + .4, a - 2 * f, o / 2 - f - .4) : g(s + f, c + f, a / 2 - f - .4, o - 2 * f) + g(s + a / 2 + .4, c + f, a / 2 - f - .4, o - 2 * f) : g(s + f, c + f, a - 2 * f, o - 2 * f), v = "", y = n.cuts[0];
		if (y) {
			let e = s + a * (y.x ?? .5), t = c + f + 1.1;
			v = y.edge === "right" ? `<rect x="${u(s + a - f - 1.7)}" y="${u(c + o * (y.x ?? .5) - 1.8)}" width="1.2" height="3.6" rx=".6" fill="currentColor"/>` : y.w > y.h * 3 ? `<rect x="${u(e - 1.8)}" y="${u(t - .6)}" width="3.6" height="1.2" rx=".6" fill="currentColor"/>` : `<circle cx="${u(e)}" cy="${u(t)}" r=".75" fill="currentColor"/>`;
		}
		let b = e.fold ? `<path d="${h ? `M${u(s)} ${u(c + o / 2)}H${u(s + a)}` : `M${u(s + a / 2)} ${u(c)}V${u(c + o)}`}" stroke="currentColor" stroke-width=".8"/>` : "";
		return `<svg class="pn-sil" viewBox="0 0 20 20" aria-hidden="true">${_}<rect x="${u(s + l / 2)}" y="${u(c + l / 2)}" width="${u(a - l)}" height="${u(o - l)}" rx="${u(d)}" fill="none" stroke="currentColor" stroke-width="${l}"/>${b}${v}</svg>`;
	};
	for (let e of rn) {
		let r = n[e.dataset.sel];
		r && (e.title = r.name), e.innerHTML = `${r ? an(r) : ""}<span class="nm">${r ? r.short : e.dataset.t ? t(e.dataset.t) : e.textContent}</span><span class="d"></span>`;
	}
	let on = {
		sil: X.sum.querySelector(".pn-sum-sil"),
		nm: X.sum.querySelector(".nm"),
		dev: null
	}, sn = () => X.sum.getAttribute("aria-expanded") === "true";
	function cn(e) {
		e && nn(!1), !e && X.body.contains(document.activeElement) && X.sum.focus({ preventScroll: !0 }), X.sum.setAttribute("aria-expanded", String(e)), X.fold.classList.toggle("open", e), X.body.inert = !e;
	}
	X.sum.addEventListener("click", () => cn(!sn()));
	let ln = (e) => {
		sn() && !X.fold.contains(e.target) && cn(!1), tn() && !$t.el.contains(e.target) && nn(!1);
	};
	function un(e) {
		let t = N, r = t.kind === "device" && e === t.dev ? n[e] : null, i = rn.find((t) => t.dataset.sel === e);
		on.dev !== r && (on.dev = r, on.sil.innerHTML = r ? an(r) : ""), on.nm.textContent = i.querySelector(".nm").textContent, X.sum.classList.toggle("mono", i.classList.contains("mono")), X.sum.title = `${r ? r.name : on.nm.textContent} · ${le(t)}`;
	}
	let dn = (e) => e.kind === "device" ? e.dev : e.sel, fn = (e) => `${Math.round(e.open.w)}×${Math.round(e.open.h)}`, pn = !1;
	function mn(e, t) {
		pn = !1, Rn(), An = !1;
		for (let e of [On.w.thumb, On.h.thumb]) document.activeElement === e && e.blur();
		for (let e of [Q.w, Q.h]) document.activeElement === e && (e.dataset.cancel = "1", e.blur());
		if (e === "custom") {
			let e = i(Math.round(N.w), 240, T), n = i(Math.round(N.h), 240, T);
			N.kind !== "custom" && Gn(`custom:${e}x${n}`), t || (pn = !0, Wn());
		} else {
			if (n[e]) return Gn(`${e}:open`);
			Gn(e);
		}
	}
	function hn(e, r) {
		let i = pe.t;
		if (r ? (J.w.snap(e.w), J.h.snap(e.h)) : (J.w.to(e.w, 420, i), J.h.to(e.h, 420, i)), e.kind === "device") {
			Ae(k(e), r), Z.fold.hidden = Z.hinge.hidden = !n[e.dev].fold, $t.el.hidden = !!n[e.dev][e.folded ? "cover" : "open"].fixed, $t.el.hidden && nn(!1, !1);
			let i = e.folded ? t("posture.unfold") : t("posture.fold");
			Z.fold.dataset.folded = String(e.folded), Z.fold.title = i, Z.fold.setAttribute("aria-label", i);
			let a = t("posture.orientation.tip", { orientation: t(`posture.${e.orientation}`) });
			Z.rot.dataset.orientation = e.orientation, Z.rot.title = a, Z.rot.setAttribute("aria-label", a);
			for (let t of en) t.setAttribute("aria-checked", String(t.dataset.orientation === e.orientation));
		}
		gn();
	}
	function gn() {
		let e = N, t = xn || An && e.sel === Mn || e.kind === "custom", r = t ? "custom" : dn(e);
		for (let i of rn) {
			let a = i.dataset.sel, o = a === r, s = n[a];
			i.setAttribute("aria-checked", String(o));
			let c = re.find((e) => e.sel === a);
			i.lastElementChild.textContent = a === "custom" ? t ? le(e) : `240–${T}` : a === "original" ? le(ne) : c ? le(c) : o ? le(e) : fn(s);
		}
		Q.el.classList.toggle("custom", t), Q.el.classList.toggle("device", !t && e.kind === "device"), Z.el.hidden = t || e.kind !== "device", Z.el.hidden && nn(!1), On.el.hidden = !t, un(r), Fn();
	}
	X.pick.addEventListener("click", (e) => {
		let t = e.target.closest("[data-sel]");
		t && (mn(t.dataset.sel), cn(!1));
	}), Z.fold.addEventListener("click", () => bn()), Z.rot.addEventListener("click", () => nn(!tn())), Z.hinge.addEventListener("click", () => vn());
	function _n() {
		Z.hinge.setAttribute("aria-pressed", String(w.hingeLine)), Z.hinge.title = w.hingeLine ? t("posture.hinge.hide") : t("posture.hinge.show");
	}
	function vn() {
		let e = N;
		e.kind === "device" && n[e.dev].fold && (w.hingeLine = !w.hingeLine, _n(), we.to(+!!w.hingeLine, 200, performance.now()), Wn());
	}
	let yn = (e) => [
		"portrait",
		"landscape-left",
		"landscape-right"
	].map((t) => oe(e, !e.folded, t)).find((t) => {
		let n = ie(t);
		return n?.kind === "device" && n.angle === e.angle;
	}) ?? oe(e, !e.folded, "portrait");
	function bn() {
		let e = N;
		e.kind === "device" && n[e.dev].fold && Gn(yn(e));
	}
	let Q = {
		el: C("ruler"),
		ext: C("rlExt"),
		dim: C("rlDim"),
		w: C("rlW"),
		h: C("rlH"),
		shown: {
			w: "",
			h: ""
		}
	}, xn = !1;
	function Sn(e, t) {
		let n = /^\d+$/.test(t.trim()) ? Number(t) : NaN;
		if (!(n > 0)) return;
		let r = i(n, 240, T), a = Math.round(N.w), o = Math.round(N.h), s = e === "w" ? r : a, c = e === "h" ? r : o;
		(s !== a || c !== o) && (J[e].snap(r), Gn(Cn(s, c)));
	}
	let Cn = (e, t) => re.find((n) => n.w === e && n.h === t)?.sel || `custom:${e}x${t}`;
	function wn(e = !1) {
		if (!xn) {
			if (N.kind !== "custom") {
				let t = i(Math.round(N.w), 240, T), n = i(Math.round(N.h), 240, T);
				if (Gn(`custom:${t}x${n}`), !e) for (let [e, r, i] of [[
					"w",
					Q.w,
					t
				], [
					"h",
					Q.h,
					n
				]]) r.value = String(i), Q.shown[e] = String(i);
			}
			xn = !0, gn();
		}
	}
	for (let [e, t] of [["w", Q.w], ["h", Q.h]]) t.addEventListener("focus", () => {
		t.select(), N.kind !== "device" && wn();
	}), t.addEventListener("pointerdown", () => wn()), t.addEventListener("input", () => wn(!0)), t.addEventListener("keydown", (e) => {
		if (e.key === "Enter") e.preventDefault(), t.blur();
		else if (e.key === "Escape") e.preventDefault(), e.stopPropagation(), t.dataset.cancel = "1", t.blur();
		else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
			e.preventDefault(), wn();
			let n = (e.key === "ArrowUp" ? 1 : -1) * te(e);
			t.value = String(i((parseInt(t.value, 10) || 0) + n, 240, T));
		}
	}), t.addEventListener("blur", (n) => {
		t.dataset.cancel ? delete t.dataset.cancel : Sn(e, t.value), Q.shown[e] = "", n.relatedTarget !== Q.w && n.relatedTarget !== Q.h && (xn = !1, gn(), Wn());
	});
	let Tn = (e) => `${((e - 240) / 1360 * 100).toFixed(3)}%`, En = Y("pnSl"), Dn = {};
	for (let e of En.querySelectorAll(".sl")) {
		let t = e.querySelector(".sl-track");
		Dn[e.dataset.axis] = {
			track: t,
			thumb: e.querySelector(".thumb"),
			fill: e.querySelector(".fill"),
			val: e.querySelector(".v b")
		};
		for (let e of t.querySelectorAll(".tick")) e.style.left = Tn(Number(e.dataset.v));
	}
	let On = {
		el: En,
		w: Dn.w,
		h: Dn.h
	}, $ = null, kn = null, An = !1, jn = 0, Mn = null, Nn = () => On.el.classList.contains("off"), Pn = (e) => $ ? $[e] : i(Math.round(N[e]), 240, T);
	function Fn() {
		for (let e of ["w", "h"]) {
			let t = On[e], n = Pn(e), r = Tn(n);
			t.fill.style.width = r, t.thumb.style.left = r, t.val.textContent = String(n), t.thumb.setAttribute("aria-valuenow", String(n)), t.thumb.setAttribute("aria-valuetext", `${n}dp`);
		}
	}
	function In(e, t) {
		let n = i(Math.round(t), 240, T);
		$ = {
			w: Pn("w"),
			h: Pn("h"),
			[e]: n
		}, Fn(), Wn();
	}
	function Ln() {
		if (clearTimeout(jn), jn = 0, !$ || kn) return;
		let { w: e, h: t } = $;
		if (e === Math.round(N.w) && t === Math.round(N.h)) {
			Rn();
			return;
		}
		let n = $, r = Cn(e, t);
		Mn = r, Gn(r).then((e) => {
			!e && $ === n && Rn();
		});
	}
	function Rn() {
		clearTimeout(jn), jn = 0, kn = null, $ && ($ = null, N && !V.on && !G.on && L(M(N)), N && (J.w.snap(N.w), J.h.snap(N.h), Fn()), Wn());
	}
	for (let e of ["w", "h"]) {
		let { track: t, thumb: n } = On[e], r = (e) => {
			let n = t.getBoundingClientRect();
			return 240 + i((e - n.left) / n.width, 0, 1) * 1360;
		};
		t.addEventListener("pointerdown", (i) => {
			i.button === 0 && !Nn() && N && (i.preventDefault(), n.focus({
				preventScroll: !0,
				focusVisible: !1
			}), t.setPointerCapture(i.pointerId), kn = e, In(e, r(i.clientX)));
		}), t.addEventListener("pointermove", (n) => {
			kn === e && t.hasPointerCapture(n.pointerId) && In(e, r(n.clientX));
		});
		let a = () => {
			kn === e && (kn = null, Ln());
		};
		t.addEventListener("pointerup", a), t.addEventListener("lostpointercapture", a), n.addEventListener("keydown", (t) => {
			let n = te(t), r = Pn(e), i = {
				ArrowRight: r + n,
				ArrowUp: r + n,
				ArrowLeft: r - n,
				ArrowDown: r - n,
				Home: 240,
				End: T
			}[t.key];
			i !== void 0 && !Nn() && N && (t.preventDefault(), t.stopPropagation(), In(e, i), clearTimeout(jn), jn = window.setTimeout(Ln, 350));
		}), n.addEventListener("focus", () => {
			An = !0;
		}), n.addEventListener("blur", (e) => {
			e.relatedTarget !== On.w.thumb && e.relatedTarget !== On.h.thumb && (jn && Ln(), An = !1, N && gn());
		});
	}
	X.pick.addEventListener("pointerdown", () => {
		let e = document.activeElement;
		(e === Q.w || e === Q.h) && (e.dataset.cancel = "1");
	});
	function zn(e) {
		let t = Se.at(e);
		if (pn && !P && !F && t > .99 && (pn = !1, Q.w.focus()), t < .01 && (J.w.snap(N.w), J.h.snap(N.h)), Q.el.hidden = t < .01 && !xn, Q.el.hidden) return;
		Q.el.style.opacity = String(t);
		let { cx: n } = he(), r = Math.max(w.gap, (ce(Ne(e)) * I.s.at(e) + 6) * Ce.at(e)), a = I.w.at(e), o = I.h.at(e), s = I.y.at(e), c = n - a / 2, l = n + a / 2, u = s + o, d = (s + u) / 2, f = s - r - 15, p = c - r - 22, m = 4.5;
		for (let [t, n] of [["w", Q.w], ["h", Q.h]]) {
			if (document.activeElement === n) continue;
			let r = String(Math.round(J[t].at(e)));
			Q.shown[t] !== r && (n.value = r, Q.shown[t] = r);
		}
		let h = i(Q.w.value.length * 7.2 + 16, 0, l - c - 4 * m) / 2, g = i(30, 0, u - s - 4 * m) / 2, _ = (e) => e.toFixed(1);
		Q.ext.setAttribute("d", `M${_(c)} ${_(s - r)}V${_(f - 5)}M${_(l)} ${_(s - r)}V${_(f - 5)}M${_(c - r)} ${_(s)}H${_(p - 5)}M${_(c - r)} ${_(u)}H${_(p - 5)}`), Q.dim.setAttribute("d", `M${_(c)} ${_(f)}H${_(n - h)}M${_(n + h)} ${_(f)}H${_(l)}M${_(c + m)} ${_(f - m)}L${_(c)} ${_(f)}L${_(c + m)} ${_(f + m)}M${_(l - m)} ${_(f - m)}L${_(l)} ${_(f)}L${_(l - m)} ${_(f + m)}M${_(p)} ${_(s)}V${_(d - g)}M${_(p)} ${_(d + g)}V${_(u)}M${_(p - m)} ${_(s + m)}L${_(p)} ${_(s)}L${_(p + m)} ${_(s + m)}M${_(p - m)} ${_(u - m)}L${_(p)} ${_(u)}L${_(p + m)} ${_(u - m)}`), Q.w.style.left = n + "px", Q.w.style.top = f + "px", Q.h.style.left = p + "px", Q.h.style.top = d + "px";
	}
	let Bn = !1, Vn = 0, Hn = "";
	function Un(e) {
		if (Vn = 0, !Bn || !N) return;
		pe.t = e, Qt();
		let t = [
			be,
			xe,
			Se,
			Ce,
			we,
			z.a,
			z.b,
			R.old.grow,
			R.old.blur,
			R.old.veil,
			R.old.op,
			R.neu.op,
			R.neu.blur,
			J.w,
			J.h
		];
		(P || F || V.on || G.on || !We(e) || e < B.t0 + B.dur || t.some((t) => !t.done(e))) && Wn();
	}
	function Wn() {
		Bn && !Vn && (Vn = requestAnimationFrame(Un));
	}
	function Gn(e) {
		return Promise.resolve(S.request(e));
	}
	X.pick.addEventListener("keydown", (e) => {
		if (!rn.includes(e.target) || ![
			"ArrowDown",
			"ArrowUp",
			"Home",
			"End"
		].includes(e.key)) return;
		e.preventDefault(), e.stopPropagation();
		let t = rn.indexOf(e.target), n = e.key === "Home" ? 0 : e.key === "End" ? rn.length - 1 : (t + (e.key === "ArrowUp" ? -1 : 1) + rn.length) % rn.length;
		rn[n].focus(), mn(rn[n].dataset.sel, !0);
	}), _n();
	function Kn(e = !1) {
		let t = `${l.clientWidth}:${l.clientHeight}:${me.w}`;
		(t !== Hn || e) && (Hn = t, N && !V.on && !G.on && L(M(N), performance.now(), P?.kind === "size" ? c(w.frameDur, w.frameBounce) : null), Wn(), N && (pe.t = performance.now(), Qt()));
	}
	return new ResizeObserver(() => {
		let e = Q.h.offsetWidth;
		e && e !== me.w && (me.w = e, Kn());
	}).observe(Q.h, { box: "border-box" }), {
		devices: new Set(Object.keys(n)),
		setOriginal(e, t, n) {
			Object.assign(ne, {
				w: e,
				h: t,
				img: n
			}), E?.sel === "original" && Object.assign(E, {
				w: e,
				h: t
			}), N && gn(), N?.sel === "original" && (Object.assign(N, {
				w: e,
				h: t
			}), P?.kind !== "fade" && L(M(N), performance.now(), P ? c(w.frameDur, w.frameBounce) : null), J.w.to(e, 420, performance.now()), J.h.to(t, 420, performance.now()), Wn());
		},
		image(e, t) {
			D.set(e, t), Wn(), N?.sel === e && (N.img = t, P?.to.sel === e ? (P.to.img = t, P.arriveAt = performance.now(), P.kind === "size" && P.swapped && (R.neu.r ? R.neu.r = t : R.old.r = t)) : P || (R.old.r = t));
		},
		update(e, t = !1) {
			E = e, $ && !kn && !jn && Math.round(e.w) === $.w && Math.round(e.h) === $.h && ($ = null), !N || t ? Re(e.sel) : Ke(e.sel), t && (pe.t = performance.now(), Qt()), Bn && !Vn && (Vn = requestAnimationFrame(Un));
		},
		enable(e) {
			Bn = e, l.hidden = !e, e && addEventListener("pointerdown", ln, !0), e || (Z.el.hidden = !0, cn(!1), nn(!1), removeEventListener("pointerdown", ln, !0)), e || (Hn = ""), e ? Vn ||= requestAnimationFrame(Un) : (cancelAnimationFrame(Vn), Vn = 0, D.clear(), N = null, P = null, F = null, Rn(), An = !1);
		},
		relayout: Kn,
		moving: () => !!P || !!F || V.on || G.on || !!$,
		sliderOff(e) {
			On.el.classList.toggle("off", e);
			for (let t of ["w", "h"]) On[t].thumb.tabIndex = e ? -1 : 0, On[t].thumb.setAttribute("aria-disabled", String(e));
			e && Rn();
		},
		clearImages() {
			D.clear();
		},
		closeMenu() {
			return tn() ? (nn(!1), !0) : sn() ? (cn(!1), !0) : !1;
		},
		sizeOf(e) {
			let t = ie(e);
			return t && {
				w: t.w,
				h: t.h
			};
		}
	};
}
export { S as createResizeScene };
