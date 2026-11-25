import { i as e, n as t, r as n, t as r } from "./react.js";
import { createScene as i, handoffMs as a, i as o, n as s, r as c, sceneEasing as l, sceneMs as u, t as d } from "./preparation-scene.js";
import { applyReveal as f, boardMarks as p, cancelReveal as m, cardAt as h, cardStage as g, clearTrees as _, moveCursor as v, onRelayout as y, returnCard as b, reveal as x, ringCard as S, setCursor as C, stuckHead as w, subscribeBoard as T, syncBoard as E, trees as D } from "./board.js";
import { daemonText as O, phrase as k } from "./strings.js";
import { connect as ee, fetchGalleryCard as A, fetchGallerySheet as j, fetchPreviewFiles as M, fetchProjectFiles as N, get as te, post as P, reportStreamWidth as ne, viewerStream as re } from "./api.js";
import { capsuleContent as ie, dismissOnce as ae, flash as F, hideOnce as oe, renderError as se, setStatus as ce, setSummary as le, showOnce as ue, subscribeCapsule as de } from "./capsule.js";
import { MORPH_LEAD as fe, frameMorph as pe, freeze as me, hold as he, motionMs as I, motionToken as ge, radiiOf as _e, reduced as ve, swapImage as ye, transition as be, transitioning as xe } from "./motion.js";
import { store as L } from "./store.js";
import { createResizeScene as Se } from "./resize-scene.js";
import { DEVICE_MENU as Ce } from "./devices.js";
// src/components/FileIcon.tsx
var R = e(), z = t(), we = (e) => e ? e.startsWith("android") ? "android" : "kmp" : "file", B = /* @__PURE__ */ (0, z.jsx)("path", { d: "M7 13H2.5V1.5h5L10 4V7" }), Te = {
	file: /* @__PURE__ */ (0, z.jsx)("path", { d: "M4 2h5.5L12 4.5V14H4z" }),
	android: /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [B, /* @__PURE__ */ (0, z.jsxs)("g", {
		className: "mk-android",
		transform: "translate(5.5 6.4) scale(.75)",
		children: [/* @__PURE__ */ (0, z.jsx)("path", {
			fill: "currentColor",
			stroke: "none",
			d: "M2 12a6 6 0 0 1 12 0z"
		}), /* @__PURE__ */ (0, z.jsx)("path", {
			d: "M4.8 6.4 3.4 4.2M11.2 6.4l1.4-2.2",
			strokeWidth: "1.6"
		})]
	})] }),
	kmp: /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [B, /* @__PURE__ */ (0, z.jsx)("path", {
		className: "mk-kmp",
		fill: "currentColor",
		stroke: "none",
		transform: "translate(7.2 7.2) scale(.18333)",
		d: "M0 22.5629V0.0835311L22.4794 22.5629H0ZM0 25.4372V48H0.0572568L22.6201 25.4372H0ZM25.9906 22.0094L48 0H3.98128L25.9906 22.0094ZM26.0193 26.1028L4.1221 48H47.9164L26.0193 26.1028Z"
	})] })
};
function Ee({ kind: e }) {
	return /* @__PURE__ */ (0, z.jsx)("svg", {
		className: "rt-ic",
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.4",
		strokeLinejoin: "round",
		strokeLinecap: "round",
		"aria-hidden": "true",
		children: Te[e]
	});
}
// src/match.ts
var V = -1e9, De = /[/._\-\s]/, Oe = (e) => e !== e.toLowerCase();
function ke(e, t) {
	if (t === 0) return !0;
	let n = e[t - 1], r = e[t];
	return De.test(n) || Oe(r) && !Oe(n) || /\d/.test(r) && !/\d/.test(n);
}
function Ae(e, t) {
	let n = e.length, r = t.length;
	if (!n) return {
		score: 0,
		idx: []
	};
	if (n > r) return null;
	let i = e.toLowerCase(), a = t.toLowerCase();
	for (let e = 0, t = 0; e < n; t++) {
		if (t >= r) return null;
		a[t] === i[e] && e++;
	}
	let o = Array.from({ length: n }, () => new Float64Array(r).fill(V)), s = Array.from({ length: n }, () => new Int32Array(r).fill(-1));
	for (let e = 0; e < r; e++) a[e] === i[0] && (o[0][e] = 1 + (ke(t, e) ? 8 : 0) + (e === 0 ? 4 : 0) - e * .02);
	for (let e = 1; e < n; e++) {
		let n = V, c = -1;
		for (let l = e; l < r; l++) {
			if (l >= 2 && o[e - 1][l - 2] > n && (n = o[e - 1][l - 2], c = l - 2), a[l] !== i[e]) continue;
			let r = ke(t, l) ? 8 : 0, u = o[e - 1][l - 1] > V ? o[e - 1][l - 1] + 1 + 5 + r : V, d = n > V ? n + 1 + r - 3 : V;
			u >= d && u > V ? (o[e][l] = u, s[e][l] = l - 1) : d > V && (o[e][l] = d, s[e][l] = c);
		}
	}
	let c = V, l = -1;
	for (let e = 0; e < r; e++) o[n - 1][e] > c && (c = o[n - 1][e], l = e);
	if (l < 0) return null;
	let u = Array(n);
	for (let e = n - 1; e >= 0; e--) u[e] = l, l = s[e][l];
	return {
		score: c,
		idx: u
	};
}
var je = (e) => e.dir ??= e.rel.slice(0, e.rel.length - e.name.length).toLowerCase(), Me = {
	name: 30,
	fn: 15,
	path: 0
};
function Ne(e, t) {
	let n = 0, r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of e) {
		let e = null, o = Ae(a, t.name);
		o && (e = {
			s: o.score + Me.name,
			kind: "name",
			idx: o.idx
		});
		for (let n of t.functions) {
			let t = Ae(a, n);
			t && (!e || t.score + Me.fn > e.s) && (e = {
				s: t.score + Me.fn,
				kind: "fn",
				fn: n,
				idx: t.idx
			});
		}
		if (!e && je(t).includes(a.toLowerCase()) && (e = {
			s: 10 + Me.path,
			kind: "path"
		}), !e) return null;
		if (n += e.s, e.kind === "name") e.idx.forEach((e) => r.add(e));
		else if (e.kind === "fn") {
			let t = i.get(e.fn) || /* @__PURE__ */ new Set();
			e.idx.forEach((e) => t.add(e)), i.set(e.fn, t);
		}
	}
	return {
		score: n,
		name: r,
		fns: i
	};
}
// src/state.ts
var H = (e) => {
	let t = (e?.tabs || []).find((e) => e.active);
	return t ? t.key : e?.board?.file ?? null;
};
function Pe(e, t) {
	if (!e || t == null) return null;
	for (let n of e.groups) for (let e of n.cards) if (e.index === t) return e;
	return null;
}
// src/gallery/layer.ts
var U = {
	open: !1,
	openedOver: null,
	files: null,
	ready: !1,
	sheet: null
}, Fe = /* @__PURE__ */ new Set();
function Ie(e) {
	if (!Object.keys(e).every((t) => U[t] === e[t])) {
		U = {
			...U,
			...e
		};
		for (let e of Fe) e();
	}
}
var Le = (e) => (Fe.add(e), () => {
	Fe.delete(e);
}), Re = () => U, ze = () => (0, R.useSyncExternalStore)(Le, Re), Be = () => U, W = !1, Ve = 0, He = () => W;
function Ue(e) {
	W = e;
}
function We() {
	Ie({
		open: !0,
		openedOver: H(L.st)
	});
}
function Ge() {
	Ie({
		open: !1,
		sheet: null
	});
}
function G(e) {
	Ie({ sheet: {
		path: e,
		closing: !1
	} });
}
function Ke() {
	let e = U.sheet;
	return !e || !W ? !1 : (e.closing || Ie({ sheet: {
		...e,
		closing: !0
	} }), !0);
}
function qe() {
	Ie({ sheet: null });
}
var Je = () => W && !!U.sheet;
async function Ye() {
	let e = ++Ve, t = await M().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === Ve && Ie(t);
}
function Xe() {
	W && Ye();
}
addEventListener("visibilitychange", () => {
	W && document.visibilityState === "visible" && Ye();
});
function Ze(e, t) {
	let n = ze();
	return t === "lost" || !e?.header.repo ? !1 : e.screen === "empty" || n.open && e.screen !== "focus" && H(e) === n.openedOver;
}
// src/components/QuickOpen.tsx
var Qe = 8, $e = 5, et = [], tt = (e) => e.map((e) => ({
	...e,
	name: e.rel.split("/").pop()
}));
function nt(e) {
	if (!e || !e.fns.size) return null;
	let t = null;
	for (let [n, r] of e.fns) (!t || r.size > t[1].size) && (t = [n, r]);
	return {
		fn: t[0],
		idx: t[1],
		more: e.fns.size - 1
	};
}
function rt(e, t, n) {
	let r = t.trim().split(/\s+/).filter(Boolean);
	if (!e) return {
		sections: [],
		more: 0,
		empty: !r.length,
		loading: !0
	};
	if (!r.length) {
		let t = new Map(e.map((e) => [e.path, e])), r = e.slice(0, $e), i = new Set(r.map((e) => e.path)), a = n.map((e) => t.get(e)).filter((e) => !!e && !i.has(e.path)), o = Qe - r.length, s = a.length < o ? e.slice($e).filter((e) => !a.includes(e)).slice(0, o - a.length) : [], c = [{
			title: "quickopen.changed",
			rows: [...r, ...s].map((e) => ({
				f: e,
				fn: null
			}))
		}];
		return a.length && c.push({
			title: "quickopen.opened",
			rows: a.slice(0, o).map((e) => ({
				f: e,
				fn: null
			}))
		}), {
			sections: c,
			more: 0,
			empty: !0,
			loading: !1
		};
	}
	let i = [];
	for (let t of e) {
		let e = Ne(r, t);
		e && i.push({
			f: t,
			m: e
		});
	}
	i.sort((e, t) => t.m.score - e.m.score || t.f.mtime - e.f.mtime);
	let a = i.slice(0, Qe).map((e) => ({
		...e,
		fn: nt(e.m)
	}));
	return {
		sections: a.length ? [{ rows: a }] : [],
		more: Math.max(0, i.length - Qe),
		empty: !1,
		loading: !1
	};
}
function it({ text: e, idx: t }) {
	if (!t?.size) return e;
	let n = [];
	return [...e].forEach((e, r) => {
		let i = t.has(r), a = n[n.length - 1];
		a && a[1] === i ? a[0] += e : n.push([e, i]);
	}), n.map(([e, t], n) => t ? /* @__PURE__ */ (0, z.jsx)("b", { children: e }, n) : e);
}
var at = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.4",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M3 8h10M9 4l4 4-4 4" })
}), ot = (e) => (e || "").replace(/^:/, "").replace(/:/g, "/"), st = -1, ct = -1, lt = !1;
addEventListener("mousemove", (e) => {
	lt = e.screenX !== st || e.screenY !== ct, st = e.screenX, ct = e.screenY;
}, !0);
var ut = (0, R.memo)(function({ files: e, ready: t, query: n, sel: r, recent: i = et, fieldRef: a, onQuery: o, onSelect: l, onPick: u, onEscape: d, onLeave: f }) {
	let { phrase: p } = s(), m = (0, R.useRef)(null), h = (0, R.useRef)(null), [g, _] = (0, R.useState)(null), v = (0, R.useRef)({
		fieldRef: a,
		onQuery: o
	});
	v.current = {
		fieldRef: a,
		onQuery: o
	};
	let y = (0, R.useCallback)((e) => {
		_(e), v.current.fieldRef?.(e);
	}, []), b = (0, R.useMemo)(() => e && tt(e), [e]), { sections: x, more: S, empty: C, loading: w } = (0, R.useMemo)(() => rt(b, n, i), [
		b,
		n,
		i
	]), T = (0, R.useMemo)(() => x.flatMap((e) => e.rows), [x]), E = Math.min(r, T.length - 1);
	(0, R.useLayoutEffect)(() => {
		r > E && l(E);
	}, [r, E]), (0, R.useLayoutEffect)(() => {
		if (!g) return;
		let e = () => v.current.onQuery(g.value, g.value.trim() ? 0 : -1);
		return g.addEventListener("input", e), () => g.removeEventListener("input", e);
	}, [g]), (0, R.useLayoutEffect)(() => {
		c(m.current), m.current.querySelectorAll("*").forEach(c), E >= 0 && h.current.querySelector(`.qo-row[data-i="${E}"]`)?.scrollIntoView({ block: "nearest" });
	});
	let D = (e) => {
		if (!e.nativeEvent.isComposing) {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				if (e.preventDefault(), !T.length) return;
				let t = e.key === "ArrowDown" ? 1 : -1;
				l(E < 0 ? t > 0 ? 0 : T.length - 1 : (E + t + T.length) % T.length);
			} else if (e.key === "Enter") {
				e.preventDefault();
				let t = T[Math.max(0, E)];
				t && u?.(t);
			} else e.key === "Escape" && (e.preventDefault(), e.currentTarget.value ? (e.currentTarget.value = "", o("", -1)) : d?.());
		}
	}, O = (e, t) => /* @__PURE__ */ (0, z.jsxs)("div", {
		className: t === E ? "qo-row sel" : "qo-row",
		role: "option",
		"aria-selected": t === E,
		"data-i": t,
		style: { "--i": t },
		title: e.f.rel,
		onMouseDown: (e) => e.preventDefault(),
		onMouseMove: () => {
			lt && E !== t && l(t);
		},
		onClick: () => u?.(e),
		children: [
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: "qo-arrow",
				children: at
			}),
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: "qo-name",
				children: /* @__PURE__ */ (0, z.jsx)(it, {
					text: e.f.name,
					idx: e.m?.name
				})
			}),
			e.fn && /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "qo-fn",
				children: [
					"› ",
					/* @__PURE__ */ (0, z.jsx)(it, {
						text: e.fn.fn,
						idx: e.fn.idx
					}),
					e.fn.more ? /* @__PURE__ */ (0, z.jsx)("span", {
						className: "qo-fn-more",
						children: ` +${e.fn.more}`
					}) : null
				]
			}),
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: "qo-mod",
				children: ot(e.f.module)
			})
		]
	}, e.f.path), k = null;
	w || !t && !T.length ? k = /* @__PURE__ */ (0, z.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.loading")
	}) : T.length || (k = C ? /* @__PURE__ */ (0, z.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.none")
	}) : /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "qo-none",
		children: [p("quickopen.noMatch", { q: n.trim() }), /* @__PURE__ */ (0, z.jsx)("div", {
			className: "qo-why",
			children: p("quickopen.noMatch.why")
		})]
	}));
	let ee = 0;
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "qo-col",
		ref: m,
		onMouseDown: (e) => {
			e.target !== g && e.preventDefault();
		},
		children: [
			/* @__PURE__ */ (0, z.jsxs)("label", {
				className: "qo-field",
				children: [
					/* @__PURE__ */ (0, z.jsxs)("svg", {
						viewBox: "0 0 16 16",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinecap: "round",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, z.jsx)("circle", {
							cx: "7",
							cy: "7",
							r: "4.5"
						}), /* @__PURE__ */ (0, z.jsx)("path", { d: "m10.5 10.5 3 3" })]
					}),
					/* @__PURE__ */ (0, z.jsx)("input", {
						id: "q",
						type: "search",
						ref: y,
						placeholder: p("quickopen.placeholder"),
						autoComplete: "off",
						spellCheck: !1,
						"aria-label": p("quickopen.field"),
						"aria-controls": "qoIn",
						onKeyDown: D,
						onBlur: (e) => f?.(e.relatedTarget)
					}),
					/* @__PURE__ */ (0, z.jsx)("kbd", {
						className: "qo-esc",
						"aria-hidden": "true",
						children: "esc"
					})
				]
			}),
			/* @__PURE__ */ (0, z.jsxs)("div", {
				className: "qo-in",
				id: "qoIn",
				role: "listbox",
				"aria-label": p("quickopen.list"),
				ref: h,
				children: [
					k,
					x.map((e, t) => [e.title ? /* @__PURE__ */ (0, z.jsx)("div", {
						className: "qo-h",
						children: p(e.title)
					}, `h${t}`) : null, ...e.rows.map((e) => O(e, ee++))]),
					S ? /* @__PURE__ */ (0, z.jsx)("div", {
						className: "qo-foot",
						children: p("quickopen.more", { n: S })
					}) : null
				]
			}),
			/* @__PURE__ */ (0, z.jsx)("div", {
				className: "qo-hint",
				children: /* @__PURE__ */ (0, z.jsxs)("span", {
					className: "qo-keys",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, z.jsx)("span", { children: p("quickopen.keys.move") }),
						/* @__PURE__ */ (0, z.jsx)("span", { children: p("quickopen.keys.open") }),
						/* @__PURE__ */ (0, z.jsx)("span", { children: p("quickopen.keys.close") })
					]
				})
			})
		]
	});
});
function dt({ hosts: e, children: t }) {
	let { place: n } = o(e?.sheet);
	return n(t, (e, t) => /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("div", {
		className: "qo-curtain on",
		id: "qoCurtain"
	}), /* @__PURE__ */ (0, z.jsx)("div", {
		className: "qo-sheet on",
		id: "qoSheet",
		ref: e,
		children: t
	})] }));
}
var K = {
	open: !1,
	files: null,
	ready: !1,
	query: "",
	sel: -1,
	recent: []
}, ft = /* @__PURE__ */ new Set();
function pt(e, t = !1) {
	if (!Object.keys(e).every((t) => K[t] === e[t]) && (K = {
		...K,
		...e
	}, !t)) for (let e of ft) e();
}
var mt = (e) => (ft.add(e), () => {
	ft.delete(e);
}), ht = () => K, gt = null, q = null, _t = null, vt = null, yt = 0, bt = !1, xt = !1, St = null, Ct = 0, wt = () => "prevue.recent:" + (L.st?.header.repo || "");
function Tt() {
	try {
		return JSON.parse(localStorage.getItem(wt()) || "[]");
	} catch {
		return [];
	}
}
function Et(e, t = !1) {
	if (!e) return;
	let n = [e, ...Tt().filter((t) => t !== e)].slice(0, 20);
	try {
		localStorage.setItem(wt(), JSON.stringify(n));
	} catch {}
	pt({ recent: n }, t);
}
async function Dt() {
	let e = ++Ct, t = await M().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === Ct && pt(t);
}
function Ot(e = null) {
	if (gt) {
		if (!K.open) {
			let { sheet: t, curtain: n } = gt;
			bt = !0, vt = e && e !== document.body ? e : null, _t?.setAttribute("aria-expanded", "true"), t.hidden = !1, n.hidden = !1, t.classList.remove("closing"), pt({
				open: !0,
				query: "",
				sel: -1,
				recent: Tt()
			}), requestAnimationFrame(() => {
				K.open && (n.classList.add("on"), t.classList.add("on"));
			}), Dt();
		}
		q?.focus({ preventScroll: !0 }), q?.select();
	}
}
function J(e = !1, t = !1) {
	if (yt = 0, !K.open || !gt) return;
	let { sheet: n, curtain: r } = gt;
	q && (q.value = "", q.blur()), t && vt?.isConnected && vt.focus({ preventScroll: !0 }), vt = null, pt({ open: !1 }), _t?.setAttribute("aria-expanded", "false"), r.classList.remove("on"), n.classList.remove("on"), e ? (n.hidden = !0, r.hidden = !0) : (n.classList.add("closing"), setTimeout(() => {
		K.open || (n.hidden = !0, r.hidden = !0, n.classList.remove("closing"));
	}, 220));
}
function kt() {
	K.open && Dt();
}
function At() {
	let e = yt = performance.now();
	setTimeout(() => {
		yt === e && J();
	}, 1500);
}
async function jt(e, { phrase: t, daemonText: n }) {
	let r = e.f, i = L.st, a = e.fn ? e.fn.fn : null;
	if (Et(r.path, !0), r.path === H(i)) {
		Ge(), x(r.path, a), i?.screen === "focus" && i.focus ? (At(), P("/viewer/exit")) : (J(), f());
		return;
	}
	x(r.path, a), At();
	let o = await P("/viewer/open", { file: r.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	o.ok || (yt = 0, m(), F(n(o.message) || t("open.cannot")));
}
var Mt = (e) => {
	e ? q = e : q && !q.isConnected && (q = null);
}, Nt = (e, t) => pt({
	query: e,
	sel: t
}), Pt = (e) => pt({ sel: e }), Ft = () => J(!1, !0), It = (e) => {
	K.open && gt && e && !gt.sheet.contains(e) && e !== _t && J();
}, Lt = (0, R.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, R.useLayoutEffect)(() => {
		if (!n) return;
		_t = n, n.title = t("rail.open.tip"), n.setAttribute("aria-label", t("rail.open.label"));
		let e = (e) => K.open ? J(!1, !0) : Ot(e.detail === 0 ? n : null);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), _t = null;
		};
	}, [n, t]), r(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)("svg", {
			viewBox: "0 0 16 16",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinecap: "round",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M8 3.5v9M3.5 8h9" })
		}),
		/* @__PURE__ */ (0, z.jsx)("span", {
			className: "rail-open-t",
			children: t("rail.open")
		}),
		/* @__PURE__ */ (0, z.jsx)("kbd", { children: "⌘K" })
	] }), (e, t) => /* @__PURE__ */ (0, z.jsx)("button", {
		className: "rail-open",
		id: "railOpen",
		ref: e,
		type: "button",
		"aria-haspopup": "listbox",
		"aria-expanded": "false",
		"aria-controls": "qoSheet",
		children: t
	}));
});
function Rt({ state: e, draw: t, connection: n, hosts: r }) {
	let i = s(), a = (0, R.useSyncExternalStore)(mt, ht);
	(0, R.useLayoutEffect)(() => {
		gt = r;
		let e = (e) => {
			let t = e.target;
			K.open && !r.sheet.contains(t) && !r.curtain.contains(t) && !_t?.contains(t) && J();
		}, t = () => J(!1, !0);
		return document.addEventListener("pointerdown", e, !0), r.curtain.addEventListener("click", t), () => {
			document.removeEventListener("pointerdown", e, !0), r.curtain.removeEventListener("click", t), gt = null;
		};
	}, [r]), (0, R.useLayoutEffect)(() => {
		if (!e) return;
		let t = H(e);
		t && t !== St && (St = t, Et(t)), yt && e.screen !== "empty" && J(!0);
	}, [t]), (0, R.useLayoutEffect)(() => {
		n === "lost" && J(!0);
	}, [n]), (0, R.useLayoutEffect)(() => {
		bt ? (r.sheet.classList.add("enter"), bt = !1, xt = !0, requestAnimationFrame(() => {
			xt = !1;
		})) : xt || r.sheet.classList.remove("enter");
	});
	let o = (0, R.useCallback)((e) => jt(e, i), [i]), c = /* @__PURE__ */ (0, z.jsx)(ut, {
		files: a.files,
		ready: a.ready,
		query: a.query,
		sel: a.sel,
		recent: a.recent,
		fieldRef: Mt,
		onQuery: Nt,
		onSelect: Pt,
		onPick: o,
		onEscape: Ft,
		onLeave: It
	});
	return /* @__PURE__ */ (0, z.jsx)(dt, {
		hosts: r,
		children: c
	});
}
// src/components/fit.ts
var zt = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
function Bt(e) {
	let t = e.match(zt) || [e], n = "";
	for (let e = t.length - 1; e > 0 && !(n && (t[e] + n).length > 12); e--) n = t[e] + n;
	return n.length >= e.length - 2 ? "" : n;
}
var Vt = null, Ht = (e, t) => (Vt ??= document.createElement("canvas").getContext("2d"), Vt.font = t, Vt.measureText(e).width), Ut = (e) => {
	let t = getComputedStyle(e);
	return `${t.fontWeight} ${t.fontSize} ${t.fontFamily}`;
};
function Wt(e, t, n) {
	if (Ht(e, n) <= t) return e;
	let r = Bt(e), i = r.match(zt) || [], a = i.map((e, t) => i.slice(t).join(""));
	for (let [r, i] of [...a.map((e) => [e, 3]), [a[a.length - 1] || "", 1]]) for (let a = e.length - r.length - 1; a >= i; a--) {
		let i = e.slice(0, a) + "…" + r;
		if (Ht(i, n) <= t) return i;
	}
	for (let i = 1; i < r.length; i++) {
		let a = e[0] + "…" + r.slice(i);
		if (Ht(a, n) <= t) return a;
	}
	return e[0] + "…";
}
// src/components/FileRail.tsx
var Gt = "prevue.sharedOnce", Kt = [], qt = matchMedia("(max-width: 640px)"), Jt = (e) => {}, Yt = () => document.body.classList.contains("rail-drawer"), Xt = () => Yt() ? (Jt(!1), !0) : !1, Zt = [];
function Qt(e) {
	let t = Zt.findIndex((e) => e.active), n = Zt[Math.max(0, Math.min(Zt.length - 1, t + e))];
	n && (n.active ? Ge() : P("/viewer/tab", { key: n.key }));
}
function $t(e) {
	let t = Zt[e - 1];
	t && (t.active ? Ge() : P("/viewer/tab", { key: t.key }));
}
var en = () => Zt.length, tn = 56;
function nn(e, t, n = !1) {
	let r = [...t.querySelectorAll(".rt:not(.leaving)")];
	if (!r.length || e.hidden) return;
	let i = (e, t) => e.querySelector(t), a = Ut(i(r[0], ".rt-name")), o = Ut(i(r[0], ".rt-mod")), s = parseFloat(getComputedStyle(r[0]).columnGap) || 0, c = (t) => t.dataset.name + "|" + i(t, ".rt-mod").textContent + "|" + e.clientWidth, l = r.filter((e) => n || e.dataset.fitted !== c(e));
	if (!l.length) return;
	for (let e of l) i(e, ".rt-mod").style.maxWidth = "0px";
	let u = l.map((e) => i(e, ".rt-name").clientWidth + (i(e, ".rt-mod").textContent ? s : 0));
	l.forEach((e, t) => {
		let n = i(e, ".rt-name"), r = i(e, ".rt-mod"), l = u[t], d = l;
		if (r.textContent) {
			let t = Math.min(Math.ceil(Ht(r.textContent, o)), Math.max(l - s - Math.ceil(Ht(e.dataset.name, a)), tn));
			r.style.maxWidth = t + "px", d = l - s - t;
		} else r.style.maxWidth = "";
		n.textContent = Wt(e.dataset.name, d, a), e.dataset.fitted = c(e);
	});
}
function rn({ tab: e, leaving: t, enter: n, onGone: r, observe: i }) {
	let { phrase: a } = s(), o = (0, R.useRef)(null), [l, u] = (0, R.useState)(n);
	(0, R.useLayoutEffect)(() => {
		let e = o.current;
		c(e), i(e, !0);
		let t = 0;
		return l && (t = requestAnimationFrame(() => {
			t = requestAnimationFrame(() => u(!1));
		})), () => {
			cancelAnimationFrame(t), i(e, !1);
		};
	}, []), (0, R.useLayoutEffect)(() => {
		if (!t) return;
		let n = o.current;
		if (ve.matches || document.hidden) {
			r(e.key);
			return;
		}
		let i = (t) => {
			t && t.target !== n || r(e.key);
		};
		n.addEventListener("transitionend", i);
		let a = setTimeout(i, 500);
		return () => {
			n.removeEventListener("transitionend", i), clearTimeout(a);
		};
	}, [t]);
	let d = we(e.sourceSet), f = () => P("/viewer/close", { key: e.key });
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		ref: o,
		role: "tab",
		"data-key": e.key,
		"data-name": e.name,
		"data-ic": d,
		"aria-selected": e.active,
		className: [
			"rt",
			e.active && "active",
			e.stale && "stale",
			l && "entering",
			t && "leaving"
		].filter(Boolean).join(" "),
		title: d === "kmp" ? e.title + "\n" + a("tabs.sharedTip") : e.title,
		onClick: () => {
			e.active ? (Xt(), Ge()) : P("/viewer/tab", { key: e.key });
		},
		onAuxClick: (e) => {
			e.button === 1 && (e.preventDefault(), f());
		},
		children: [
			/* @__PURE__ */ (0, z.jsx)(Ee, { kind: d }),
			/* @__PURE__ */ (0, z.jsx)("span", { className: "rt-name" }),
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: "rt-mod",
				children: ((e.dim || "") + (e.module ? " · " + e.module : "")).replace(/^\s*·\s*/, "")
			}),
			/* @__PURE__ */ (0, z.jsx)("button", {
				type: "button",
				className: "rt-x",
				tabIndex: -1,
				"aria-label": a("tabs.close"),
				onClick: (e) => {
					e.stopPropagation(), f();
				},
				children: /* @__PURE__ */ (0, z.jsx)("svg", {
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, z.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
				})
			})
		]
	});
}
function an({ tabs: e, screen: t, gallery: n = !1, hosts: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(r?.list), [l, u] = (0, R.useState)(null), [d, f] = (0, R.useState)(null), p = r?.rail ?? l, m = r?.empty ?? d, h = (0, R.useRef)(null), g = e ?? Kt, _ = t !== "focus", v = (0, R.useRef)(g), [y, b] = (0, R.useState)([]);
	if (v.current !== g) {
		let e = new Set(g.map((e) => e.key)), t = v.current.filter((t) => !e.has(t.key) && !y.some((e) => e.key === t.key));
		(t.length || y.some((t) => e.has(t.key))) && b([...y.filter((t) => !e.has(t.key)), ...t]), v.current = g;
	}
	let x = (e) => b((t) => t.filter((t) => t.key !== e)), S = (0, R.useRef)(!1), C = (0, R.useRef)(null), w = S.current && _ && !ve.matches && !document.hidden, T = (0, R.useRef)({
		y: 0,
		stretch: null,
		sliding: !1
	}), E = (e) => {
		let t = h.current, n = T.current;
		if (!t || !a) return;
		let r = D.current ? null : a.querySelector(".rt.active:not(.leaving)");
		if (t.hidden = !r, !r) return;
		let i = r.offsetTop;
		e && !ve.matches && i !== n.y ? (n.stretch?.cancel(), n.sliding = !0, (n.stretch = t.animate([{ transform: `translateY(${n.y}px)` }, { transform: `translateY(${i}px)` }], {
			duration: I("--duration-medium2"),
			easing: ge("--easing-standard")
		})).finished.then(() => {
			n.stretch = null, n.sliding = !1;
		}, () => {})) : n.stretch && !e && (n.stretch.cancel(), n.stretch = null, n.sliding = !1), n.y = i, t.style.transform = `translateY(${i}px)`;
	}, D = (0, R.useRef)(n);
	D.current = n;
	let O = (0, R.useRef)(E);
	O.current = E;
	let [k] = (0, R.useState)(() => new ResizeObserver(() => O.current(T.current.sliding))), ee = (e, t) => {
		e && (t ? k.observe(e) : k.unobserve(e));
	};
	(0, R.useEffect)(() => () => k.disconnect(), [k]), (0, R.useEffect)(() => {
		p && a && document.fonts?.ready.then(() => nn(p, a, !0));
	}, [p, a]), (0, R.useEffect)(() => {
		if (!r) return;
		let { toggle: e, scrim: t, open: n, all: i } = r;
		Jt = (t) => {
			document.body.classList.toggle("rail-drawer", t), e.setAttribute("aria-expanded", String(t));
		};
		let a = () => Jt(!Yt()), o = () => Jt(!1);
		return e.addEventListener("click", a), t.addEventListener("click", o), n.addEventListener("click", o), i.addEventListener("click", o), qt.addEventListener("change", o), () => {
			e.removeEventListener("click", a), t.removeEventListener("click", o), n.removeEventListener("click", o), i.removeEventListener("click", o), qt.removeEventListener("change", o);
		};
	}, [r]), (0, R.useLayoutEffect)(() => {
		if (!e || !p || !a) return;
		p.hidden = !_, _ || Xt(), r && document.body.classList.toggle("rail-on", _), m && (m.hidden = e.length > 0), nn(p, a), Zt = e;
		let t = e.find((e) => e.active);
		t && we(t.sourceSet) === "kmp" ? ue(Gt, () => i("capsule.sharedOnce", { sourceSet: t.sourceSet })) : oe(Gt);
		let n = t?.key ?? null, o = S.current && _ && n !== C.current && C.current !== null;
		o && Xt(), C.current = n, S.current = _, E(o);
	}, [
		e,
		t,
		n,
		p,
		a,
		m
	]);
	let A = [...g.map((e) => ({
		tab: e,
		leaving: !1
	})), ...y.map((e) => ({
		tab: e,
		leaving: !0
	}))], j = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("div", {
		className: "rail-glider instant",
		id: "railGlider",
		ref: h,
		hidden: !0
	}), A.map(({ tab: e, leaving: t }) => /* @__PURE__ */ (0, z.jsx)(rn, {
		tab: e,
		leaving: t,
		enter: w,
		onGone: x,
		observe: ee
	}, e.key))] });
	return r ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [c(j, () => null), /* @__PURE__ */ (0, z.jsx)(Lt, { host: r.open })] }) : /* @__PURE__ */ (0, z.jsxs)("nav", {
		className: "rail",
		id: "rail",
		ref: u,
		"aria-label": i("rail.title"),
		children: [
			/* @__PURE__ */ (0, z.jsx)("h4", {
				className: "rail-h",
				children: i("rail.title")
			}),
			c(j, (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
				className: "rail-list",
				id: "railList",
				ref: e,
				role: "tablist",
				"aria-orientation": "vertical",
				children: t
			})),
			/* @__PURE__ */ (0, z.jsx)("p", {
				className: "rail-empty",
				id: "railEmpty",
				ref: f,
				hidden: !0,
				children: i("rail.empty")
			}),
			/* @__PURE__ */ (0, z.jsx)(Lt, {})
		]
	});
}
// src/components/ProjectHeader.tsx
var on = 8, sn = (e) => [...e].reduce((e, t) => e * 31 + t.codePointAt(0) >>> 0, 7) % on + 1, cn = () => !1, ln = () => cn();
function un({ header: e, tabs: t, app: n, iconUrl: r = "/app-icon.png", host: i, brand: a }) {
	let { phrase: c } = s(), { element: l, place: u } = o(i), [d, f] = (0, R.useState)(!1), [p, m] = (0, R.useState)(null), h = (0, R.useRef)({
		open: !1,
		byKey: !1
	}), g = (0, R.useRef)(null), _ = (0, R.useRef)(null), v = (0, R.useRef)(null), y = e ? n?.name || e.repoLeaf : "";
	(0, R.useLayoutEffect)(() => {
		a && n?.prevue && (a.title = `Prevue ${n.prevue}`);
	}, [a, n]), (0, R.useLayoutEffect)(() => {
		v.current?.style.setProperty("background", e ? `var(--avatar-${sn(y)})` : "");
	}, [e, y]), (0, R.useLayoutEffect)(() => {
		if (!e || !i) return;
		let n = t.find((e) => e.active);
		document.title = n ? `${n.name} — ${y}` : y;
	}, [
		e,
		i,
		t,
		y
	]), (0, R.useEffect)(() => {
		cn = () => {
			if (!h.current.open) return !1;
			h.current.open = !1;
			let e = document.activeElement;
			return e && _.current?.contains(e) && (h.current.byKey ? g.current?.focus({ preventScroll: !0 }) : e.blur()), m(null), !0;
		};
		let e = (e) => {
			!_.current?.contains(e.target) && e.target !== g.current && cn();
		};
		return addEventListener("pointerdown", e), () => {
			removeEventListener("pointerdown", e), cn = () => !1;
		};
	}, []);
	let b = (e, t) => {
		navigator.clipboard.writeText(e).then(() => F(c("header.copied", {
			what: t,
			text: e
		})), () => F(e));
	}, x = (e) => {
		cn() || (h.current = {
			open: !0,
			byKey: e.detail === 0
		}, m({ left: Math.round(e.currentTarget.getBoundingClientRect().left - (l?.getBoundingClientRect().left ?? 0) - 6) }));
	}, S = e ? [
		e.module,
		e.sourceSet && /* @__PURE__ */ (0, z.jsx)("span", {
			title: c("header.sourceSet", { variant: e.variant }),
			children: e.sourceSet
		}, "ss"),
		e.variant
	].filter(Boolean).flatMap((e, t) => [" · ", /* @__PURE__ */ (0, z.jsx)(R.Fragment, { children: e }, t)]) : [];
	return u(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)("span", {
			className: "app-tile",
			id: "appTile",
			ref: v,
			"aria-hidden": "true",
			hidden: d,
			children: [...y][0] || ""
		}),
		/* @__PURE__ */ (0, z.jsx)("img", {
			className: "app-icon",
			id: "appIcon",
			alt: "",
			hidden: !d,
			src: n?.icon ? r : void 0,
			onLoad: () => f(!0)
		}),
		/* @__PURE__ */ (0, z.jsxs)("div", {
			className: "app-t",
			children: [/* @__PURE__ */ (0, z.jsx)("div", {
				className: "app-name",
				id: "appName",
				children: y
			}), /* @__PURE__ */ (0, z.jsxs)("div", {
				className: "proj",
				id: "proj",
				children: [
					/* @__PURE__ */ (0, z.jsx)("button", {
						className: "pj",
						id: "pjDir",
						ref: g,
						type: "button",
						"aria-haspopup": "dialog",
						"aria-expanded": p ? "true" : "false",
						"aria-controls": "dirPop",
						onClick: x,
						children: e?.repoLeaf
					}),
					/* @__PURE__ */ (0, z.jsxs)("button", {
						className: "pj pj-br",
						id: "pjBr",
						type: "button",
						title: c("brand.copyBranch"),
						hidden: !e?.branch,
						onClick: () => b(e?.branch || "", c("header.copy.branch")),
						children: [/* @__PURE__ */ (0, z.jsxs)("svg", {
							viewBox: "0 0 16 16",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "1.5",
							strokeLinecap: "round",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, z.jsx)("circle", {
									cx: "5",
									cy: "3.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, z.jsx)("circle", {
									cx: "5",
									cy: "12.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, z.jsx)("circle", {
									cx: "11",
									cy: "5.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, z.jsx)("path", { d: "M5 5v6M11 7c0 2.5-6 2-6 4" })
							]
						}), /* @__PURE__ */ (0, z.jsx)("span", {
							id: "pjBrName",
							children: e?.branch || ""
						})]
					}),
					/* @__PURE__ */ (0, z.jsx)("span", {
						className: "pj-rest",
						id: "pjRest",
						children: S
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, z.jsxs)("div", {
			className: `pop dir-pop${p ? " on" : ""}`,
			id: "dirPop",
			ref: _,
			role: "dialog",
			"aria-label": c("header.dir"),
			style: p ? { left: `${p.left}px` } : void 0,
			children: [/* @__PURE__ */ (0, z.jsx)("div", {
				className: "dir-path",
				id: "dirPath",
				children: (e?.repo || "").split(/(?<=\/)/).flatMap((e, t) => [e, /* @__PURE__ */ (0, z.jsx)("wbr", {}, t)])
			}), /* @__PURE__ */ (0, z.jsxs)("div", {
				className: "dir-act",
				children: [/* @__PURE__ */ (0, z.jsx)("button", {
					type: "button",
					id: "dirCopy",
					onClick: () => {
						b(e?.repo || "", c("header.copy.path")), cn();
					},
					children: c("header.dir.copy")
				}), /* @__PURE__ */ (0, z.jsx)("button", {
					type: "button",
					id: "dirReveal",
					hidden: n ? !n.reveal : !1,
					onClick: () => {
						P("/viewer/reveal"), cn();
					},
					children: c("header.dir.reveal")
				})]
			})]
		})
	] }), (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
		className: "app",
		id: "app",
		ref: e,
		children: t
	}));
}
// src/preparation/PreparationScreen.ts
function dn() {
	let e = new URL(location.href).searchParams;
	if (!e.has("prepare")) return null;
	let t = Object.fromEntries(e), n = i(t), r = [...document.querySelectorAll("body > header, #rail, body > main, #staleBar")], o = !0, s = !1, c = null, d = null, f = null, p = !1, m = [], h = 0, g = !1, _ = 0, v = new AbortController(), y = /* @__PURE__ */ new Set(), b = () => new Promise((e) => {
		y.add(e), requestAnimationFrame(() => {
			y.delete(e), e();
		});
	}), x = (e) => e?.board ? JSON.stringify([
		e.board.file,
		e.board.gen,
		e.board.groups.flatMap((e) => e.cards.map((e) => [e.previewId, e.imageUrl]))
	]) : null, S = (e, t) => {
		m.push(window.setTimeout(e, t));
	};
	function C(e) {
		document.body.classList.toggle("preparing", e), r.forEach((t) => {
			t.inert = e, e ? t.setAttribute("aria-hidden", "true") : t.removeAttribute("aria-hidden");
		});
	}
	function w() {
		if (!o) return;
		o = !1, h++, v.abort(), m.forEach(clearTimeout), y.forEach((e) => e()), y.clear(), n.destroy(), C(!1), document.documentElement.classList.remove("preparation-cover"), document.removeEventListener("keydown", E, !0), document.removeEventListener("pointerdown", D, !0), document.removeEventListener("wheel", D, !0), removeEventListener("resize", ee);
		let e = new URL(location.href);
		[
			"prepare",
			"started",
			"id",
			"file",
			"phase",
			"phaseStarted",
			"preparationStatus"
		].forEach((t) => e.searchParams.delete(t)), history.replaceState(null, "", e);
	}
	function T(e = !1) {
		if (!o || !s) return;
		if (e || !f) {
			w();
			return;
		}
		if (p) return;
		p = !0, m.forEach(clearTimeout), m = [], document.documentElement.classList.remove("preparation-cover"), f.stage.scrollIntoView({
			block: "center",
			behavior: "instant"
		});
		let t = u("--duration-extra-long2"), r = u("--motion-stagger"), i = getComputedStyle(document.documentElement).getPropertyValue("--motion-enter-shift").trim() || "0px";
		[...document.querySelectorAll(".card")].filter((e) => {
			let t = e.getBoundingClientRect();
			return t.bottom > 0 && t.top < innerHeight && t.right > 0 && t.left < innerWidth;
		}).forEach((e, n) => e.animate([{
			opacity: 0,
			transform: `translateY(${i})`
		}, {
			opacity: 1,
			transform: "none"
		}], {
			duration: t,
			delay: r * n,
			easing: l("--easing-decelerate"),
			fill: "backwards"
		})), n.host.style.pointerEvents = "none", n.animate(n.host, [{ opacity: 1 }, { opacity: 0 }], {
			duration: t,
			easing: l("--easing-standard"),
			fill: "forwards"
		}).finished.then(w, w);
	}
	function E(e) {
		s && !p && ["Enter", " "].includes(e.key) && (e.preventDefault(), e.stopImmediatePropagation(), T(!0));
	}
	function D() {
		s && !p && T(!0);
	}
	function ee() {
		f && !p && n.fit(f.card.widthDp || n.image.naturalWidth, f.card.heightDp || n.image.naturalHeight);
	}
	function A(e) {
		o && !s && (g = !0, _ = d?.board?.gen ?? 0, h++, c = null, n.fail(e));
	}
	async function j() {
		if (o && !s && /^http:\/\/127\.0\.0\.1:\d+\/preparation\/[a-f0-9]{32}$/.test(t.preparationStatus || "")) {
			try {
				let e = await (await fetch(t.preparationStatus, { signal: v.signal })).json();
				if (e.id !== t.id) return;
				if (e.phase === "failure") {
					A(e.errorKey ? k(e.errorKey) : e.error);
					return;
				}
				if (e.finished) return;
			} catch {
				if (!o || s) return;
			}
			S(j, 300);
		}
	}
	function M(e, t) {
		let n = (e.board?.groups.flatMap((e) => e.cards) || []).map((e) => ({
			card: e,
			stage: document.querySelector(`.card[data-i="${e.index}"] .cstage`)
		})).filter((e) => !!e.stage?.offsetWidth && (!t || !!(e.card.ok && e.card.imageUrl)));
		if (!n.length) return null;
		let r = n.map((e) => e.stage.getBoundingClientRect()), i = (Math.min(...r.map((e) => e.left)) + Math.max(...r.map((e) => e.right))) / 2, a = (Math.min(...r.map((e) => e.top)) + Math.max(...r.map((e) => e.bottom))) / 2;
		return n.reduce((e, t, n) => {
			let o = r[n], s = Math.hypot(o.x + o.width / 2 - i, o.y + o.height / 2 - a);
			return !e || s < e.distance ? {
				...t,
				distance: s
			} : e;
		}, null);
	}
	async function N(e, r) {
		if (await b(), await b(), !o || r !== h) return;
		let i = M(e, !0);
		if (!i) {
			A(k("prep.image.missing"));
			return;
		}
		let c = new Image();
		c.src = i.card.imageUrl;
		try {
			await c.decode();
		} catch {
			o && r === h && A(k("prep.image.unreadable"));
			return;
		}
		if (!o || r !== h || x(d) !== x(e)) return;
		f = i, n.image.src = c.src, n.image.dataset.index = String(i.card.index), n.image.alt = i.card.title, n.fit(i.card.widthDp || c.naturalWidth, i.card.heightDp || c.naturalHeight);
		let l = Date.now() - Number(t.started) < 1500;
		n.host.dataset.tempo = l ? "fast" : "normal", n.reveal(l), s = !0, C(!1), S(() => {
			o && (n.host.dataset.boardArrival = "presenting", S(() => T(), l ? 800 : 2500));
		}, n.reduced.matches ? 0 : a(l));
	}
	return C(!0), document.documentElement.classList.add("preparation-cover"), document.addEventListener("keydown", E, !0), document.addEventListener("pointerdown", D, !0), document.addEventListener("wheel", D, {
		capture: !0,
		passive: !0
	}), addEventListener("resize", ee), j(), {
		update(e) {
			if (!o) return;
			if (d = e, t.file && e.board && e.board.file !== t.file || g && e.board && e.board.gen !== _) {
				w();
				return;
			}
			if (g) return;
			let r = x(e);
			if (s && (r !== c || e.screen !== "board")) {
				w();
				return;
			}
			if (s) return;
			if (e.error) {
				A(O(e.error));
				return;
			}
			if (!t.file && e.header.repo && e.screen === "empty" || e.screen === "focus" && e.focus?.imageUrl && !e.busy) {
				w();
				return;
			}
			if (!e.board) return;
			n.setPhase("render");
			let i = M(e, !1);
			i?.card.widthDp && i.card.heightDp && !s && n.fit(i.card.widthDp, i.card.heightDp);
			let a = e.board.groups.flatMap((e) => e.cards);
			if (e.busy || !a.length || a.some((e) => !e.rendered || e.stale)) return;
			let l = a.find((e) => e.ok === !1);
			if (l) {
				A(O(l.failure) || k("prep.render.failed"));
				return;
			}
			if (r === c) return;
			c = r;
			let u = ++h;
			N(e, u).catch((e) => {
				o && u === h && A(e.message);
			});
		},
		fail: A
	};
}
// src/components/ShortcutHelp.tsx
var fn = !1, pn = null, mn = null, hn = null, gn = () => fn;
function _n(e = !fn, t = !1) {
	if (!mn) return;
	let { scrim: n, sheet: r } = mn;
	e && !fn && (pn = t && document.activeElement !== document.body ? document.activeElement : null), fn = e, e ? (n.hidden = !1, requestAnimationFrame(() => {
		fn && (n.classList.add("on"), r.focus({ preventScroll: !0 }));
	})) : (n.classList.remove("on"), setTimeout(() => {
		fn || (n.hidden = !0);
	}, 220), n.contains(document.activeElement) && document.activeElement.blur(), pn && pn.isConnected && pn.focus({ preventScroll: !0 }), pn = null), hn?.setAttribute("aria-expanded", String(e));
}
var vn = (0, R.memo)(function({ table: e, logo: t = "prevue.svg", host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = (0, R.useRef)(null);
	return (0, R.useLayoutEffect)(() => {
		if (!i || !c.current) return;
		mn = {
			scrim: i,
			sheet: c.current
		};
		let e = (e) => {
			e.target === i && _n(!1);
		};
		return i.addEventListener("click", e), () => {
			i.removeEventListener("click", e), mn = null;
		};
	}, [i]), a(/* @__PURE__ */ (0, z.jsxs)("div", {
		className: "sheet",
		ref: c,
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "helpTitle",
		tabIndex: -1,
		children: [
			/* @__PURE__ */ (0, z.jsxs)("div", {
				className: "sheet-brand",
				children: [/* @__PURE__ */ (0, z.jsx)("img", {
					src: t,
					alt: ""
				}), "Prevue"]
			}),
			/* @__PURE__ */ (0, z.jsx)("h2", {
				id: "helpTitle",
				children: r("help.title")
			}),
			/* @__PURE__ */ (0, z.jsx)("div", {
				className: "sheet-body",
				children: e.map((e) => [/* @__PURE__ */ (0, z.jsx)("h3", { children: e.group }, `h${e.group}`), /* @__PURE__ */ (0, z.jsx)("dl", { children: e.rows.map((e, t) => [/* @__PURE__ */ (0, z.jsx)("dt", { children: e.cap.map((t, n) => [n && e.combo ? /* @__PURE__ */ (0, z.jsx)("span", {
					className: "plus",
					children: "+"
				}, `p${n}`) : null, /* @__PURE__ */ (0, z.jsx)("kbd", { children: t }, `k${n}`)]) }, `t${t}`), /* @__PURE__ */ (0, z.jsx)("dd", { children: e.label }, `d${t}`)]) }, `l${e.group}`)])
			})
		]
	}), (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
		className: "scrim",
		id: "help",
		ref: e,
		hidden: !0,
		children: t
	}));
}), yn = (0, R.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, R.useLayoutEffect)(() => {
		if (!n) return;
		hn = n, n.title = t("header.help.tip"), n.setAttribute("aria-label", t("header.help"));
		let e = (e) => _n(!fn, e.detail === 0);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), hn = null;
		};
	}, [n, t]), r("?", (e, t) => /* @__PURE__ */ (0, z.jsx)("button", {
		className: "icon-btn",
		id: "helpBtn",
		ref: e,
		type: "button",
		"aria-haspopup": "dialog",
		"aria-expanded": "false",
		children: t
	}));
}), bn = Promise.resolve();
async function xn(e, t, n) {
	let r = await P("/viewer/touch", {
		x: t,
		y: n,
		type: e
	});
	r.ok || F(k("input.touch.failed", { status: r.status }));
}
function Sn(e, t, n) {
	bn = bn.then(() => xn(e, t, n)).catch(() => {});
}
var Y = null, Cn = () => !!Y;
function wn(e, t) {
	Dn(), Y = [e, t], Sn("press", e, t);
}
function Tn(e, t) {
	Y && Math.abs(e - Y[0]) + Math.abs(t - Y[1]) > 6 && (Y = [e, t], jn(e, t));
}
function En(e, t) {
	Y && (Y = null, Sn("release", e, t));
}
function Dn() {
	Y && En(...Y);
}
function On() {
	Y = null, kn = null;
}
var kn = null, An = !1;
function jn(e, t) {
	kn = [e, t], An || (An = !0, bn = bn.then(() => {
		An = !1;
		let e = kn;
		return kn = null, e ? xn("drag", e[0], e[1]) : null;
	}).catch(() => {}));
}
var Mn = null;
function Nn(e, t, n, r) {
	Mn ? (Mn.dx += n, Mn.dy += r, Mn.x = e, Mn.y = t) : (Mn = {
		x: e,
		y: t,
		dx: n,
		dy: r
	}, bn = bn.then(() => {
		let e = Mn;
		return Mn = null, P("/viewer/wheel", {
			x: Math.round(e.x),
			y: Math.round(e.y),
			dx: e.dx,
			dy: e.dy
		});
	}).catch(() => {}));
}
// src/workspace/card.ts
var Pn = (e) => ({
	id: String(e.id),
	name: e.name || `${e.fileName}:${e.lineNumber}`
});
function Fn(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = (e) => {
		for (let t = e.ups.length - 1; t >= 0; t--) if (n.has(e.ups[t])) return e.ups[t];
		return null;
	}, i = r(t), a = e.filter((e) => r(e) === i).sort((e, t) => e.id - t.id);
	return {
		ups: t.ups.filter((e) => n.has(e)).map((e) => Pn(n.get(e))),
		here: Pn(t),
		before: a.filter((e) => e.id < t.id).map(Pn),
		after: a.filter((e) => e.id > t.id).map(Pn),
		downs: e.filter((e) => r(e) === t.id).sort((e, t) => e.id - t.id).map(Pn)
	};
}
function In(e, t) {
	let [n, r, i, a] = e.bounds, o = t ?? 1;
	return {
		width: (i - n) * o,
		height: (a - r) * o,
		unit: t ? "dp" : "px",
		padded: !!e.mods?.some((e) => e.name === "padding")
	};
}
function Ln(e) {
	let t = new Map((e.composables || []).map((e) => [e.name, e.module])), n = /* @__PURE__ */ new Map();
	for (let t of e.files || []) for (let e of t.previews || []) for (let r of new Set(e.calls)) {
		let i = n.get(r) ?? [];
		i.push({
			file: t.path,
			rel: t.rel,
			fn: e.fn
		}), n.set(r, i);
	}
	return {
		modules: t,
		callers: n
	};
}
function Rn(e, t) {
	if (e.origin === "compose" || e.origin === "library") return e.origin;
	if (e.origin !== "project" || !t || !e.name) return null;
	let n = t.modules.get(e.name);
	return n ? { module: n } : null;
}
function zn(e, t, n) {
	return !t || !e ? [] : (t.callers.get(e) || []).filter((e) => e.file !== n.file || e.fn !== n.fn);
}
// src/workspace/view.ts
function Bn(e) {
	let t = e, n = /* @__PURE__ */ new Set();
	return {
		get: () => t,
		set(e) {
			if (!Object.keys(e).every((n) => t[n] === e[n])) {
				t = {
					...t,
					...e
				};
				for (let e of n) e();
			}
		},
		subscribe(e) {
			return n.add(e), () => {
				n.delete(e);
			};
		}
	};
}
var Vn = Bn({
	pct: 100,
	real: !1,
	atFit: !0,
	menu: !1,
	disabled: !1
}), Hn = Bn({
	on: !1,
	failed: !1
}), Un = Bn({
	host: null,
	shot: null,
	card: null
}), Wn = Bn({ on: !1 }), Gn = (e, t) => e.every((e, n) => e === t[n]);
function Kn(e) {
	if (e.modifiers) return e.modifiers;
	for (let t of e.children || []) if (Gn(t.bounds, e.bounds)) {
		let e = Kn(t);
		if (e) return e;
	}
	return null;
}
function qn(e) {
	let t = L.projectFiles.size ? (e) => L.projectFiles.has(e.fileName) : () => !0, n = [], r = (e, i, a, o) => {
		for (let s of e) {
			let { children: e, modifiers: c, ...l } = s, [u, d, f, p] = s.bounds, m = i.concat(s.name ? [s.name] : []), h = s.name && t(s) ? a.concat([s.name]) : a, g = o;
			if (f > u && p > d && s.lineNumber > 0) {
				let e = n.length;
				n.push({
					...l,
					id: e,
					ups: o,
					mods: Kn(s),
					area: (f - u) * (p - d),
					chain: m,
					uchain: h
				}), g = o.concat([e]);
			}
			r(e || [], m, h, g);
		}
	};
	return r(e, [], [], []), n;
}
var Jn = (e, t) => e.area - t.area || t.chain.length - e.chain.length;
function Yn(e) {
	return L.projectFiles.size ? e.filter((e) => L.projectFiles.has(e.fileName)) : e;
}
function Xn(e, t, n) {
	return e.find((e) => {
		let [r, i, a, o] = e.bounds;
		return t >= r && t < a && n >= i && n < o;
	});
}
var Zn = (e) => +(e.dataset.fullW ?? 0) || e.naturalWidth, Qn = (e) => +(e.dataset.fullH ?? 0) || e.naturalHeight;
function $n(e, t, n) {
	let r = Zn(n), i = Qn(n);
	return !r || !i ? 0 : Math.min(e / r, t / i);
}
function er(e) {
	let t = e.getBoundingClientRect();
	return $n(t.width, t.height, e) || 1;
}
function tr(e, t) {
	let n = t.getBoundingClientRect(), r = er(t) || 1;
	return [Math.round((e.clientX - n.left) / r), Math.round((e.clientY - n.top) / r)];
}
function nr(e, t, n) {
	let [r, i, a, o] = t.bounds;
	e.style.left = r * n + "px", e.style.top = i * n + "px", e.style.width = (a - r) * n + "px", e.style.height = (o - i) * n + "px";
}
function rr(e, t, n) {
	e.hidden = !1, nr(e, t, n);
}
function ir(e, t, n) {
	t ? (nr(e, t, n), e.classList.add("on")) : e.classList.remove("on");
}
function ar(e, t) {
	t.classList.remove("over"), t.classList.contains("peek") || ir(e, null, 1);
}
var or = /* @__PURE__ */ new WeakMap();
function sr(e, t, n) {
	let r = or.get(e);
	r && r.list === t && r.s === n || (or.set(e, {
		list: t,
		s: n
	}), L.projectFiles.size ? e.replaceChildren(...t.map((e) => {
		let t = document.createElement("div");
		return t.className = "ol", nr(t, e, n), t;
	})) : e.replaceChildren());
}
async function cr(e, t, n) {
	let r = ++lr;
	try {
		let i = await P("/viewer/point", {
			fileName: e.fileName,
			line: e.lineNumber,
			node: e.name || null,
			chain: e.chain || [],
			userChain: e.uchain || e.chain || [],
			bounds: e.bounds,
			previewId: t
		}).then((e) => e.json());
		if (r !== lr) return;
		i.ref ? dr(i.ref, n, i.file) : i.needChoice || n(O(i.message ?? null) || `${e.fileName}:${e.lineNumber}`);
	} catch (e) {
		if (r === lr) {
			let t = e.message;
			n(k("point.failed", { why: t })), F(k("point.failed", { why: t }));
		}
	}
}
var lr = 0, ur = (e) => navigator.clipboard ? navigator.clipboard.writeText(e) : Promise.reject(Error(k("point.noClipboard")));
function dr(e, t, n) {
	let r = ++lr, i = () => {
		r === lr && t(k("point.copied", { ref: e }), e, !0, n);
	}, a = () => {
		ur(e).then(i, () => {
			r === lr && t(k("point.copyBlocked", { ref: e }), e, !1, n);
		});
	};
	ur(e).then(i, () => {
		r === lr && t(k("point.copyRetry", { ref: e }), e, !1, n, a);
	});
}
var fr = (e) => {
	e && F(e);
}, pr = fr, mr = null, hr = null, gr = 0;
function _r() {
	mr = null, hr = null, gr++;
}
function vr() {
	if (mr) return Promise.resolve(mr);
	let e = gr;
	return hr ??= M().then((t) => e === gr ? (hr = null, t.ready ? mr = Ln(t) : null) : null, () => (e === gr && (hr = null), null));
}
var X = null, yr = /* @__PURE__ */ new WeakMap();
function br(e) {
	let t = yr.get(e);
	return t || yr.set(e, t = () => e.isConnected ? e.getBoundingClientRect() : null), t;
}
var xr = () => X?.img ?? null;
function Sr(e, t) {
	for (let t of document.querySelectorAll(".box.pick")) t !== e.pick && (t.hidden = !0);
	X && X.hover !== e.hover && ir(X.hover, null, 1), rr(e.pick, t, e.scale()), e.pick.style.animation = "none", e.pick.offsetWidth, e.pick.style.animation = "", X = {
		...e,
		hit: t,
		shot: br(e.img)
	};
	let n = Cr(t);
	pr = n, cr(t, e.previewId, n);
}
function Cr(e) {
	let t = X, n = L.projectFiles.size ? Fn(t.list, e) : null, r = {
		msg: null,
		ref: `${e.fileName}:${e.lineNumber}`
	}, i = () => ({
		node: e,
		say: r,
		box: In(e, t.dpPerPx),
		tree: n,
		modifiers: e.mods,
		previews: zn(e.name, mr, t.seen),
		origin: Rn(e, mr)
	}), a = () => {
		X?.hit === e && Un.set({
			host: t.host,
			shot: t.shot,
			card: i()
		});
	};
	return a(), mr || vr().then((e) => {
		e && a();
	}), (e, t, n, i, o) => {
		r = {
			msg: e,
			ref: t,
			copied: n,
			file: i,
			again: o
		}, a();
	};
}
function wr(e) {
	let t = X?.list.find((t) => String(t.id) === e.id);
	X && t && Sr(X, t);
}
function Tr(e) {
	if (!X) return;
	let t = e ? X.list.find((t) => String(t.id) === e.id) ?? null : null;
	ir(X.hover, t, X.scale()), t && sr(X.marks, X.list, X.scale()), X.marks.classList.toggle("peek", !!t);
}
async function Er(e) {
	Z();
	let t = L.st;
	if (x(e.file, e.fn), e.file === H(t)) {
		t?.screen === "focus" && t.focus ? P("/viewer/exit") : f();
		return;
	}
	let n = await P("/viewer/open", {
		file: e.file,
		fn: e.fn
	}).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: k("open.failed", { why: e.message })
	}));
	n.ok || (m(), F(O(n.message ?? null) || k("open.cannot")));
}
function Z() {
	for (let e of document.querySelectorAll(".box.pick")) e.hidden = !0;
	X && (ir(X.hover, null, 1), X.marks.classList.remove("peek")), X = null, Un.set({
		host: null,
		shot: null,
		card: null
	}), pr = fr, lr++;
}
function Dr() {
	return X ? (Z(), !0) : !1;
}
function Or() {
	addEventListener("pointerdown", (e) => {
		if (!X || e.button !== 0) return;
		let t = e.target;
		t?.closest && t.closest("main") && !t.closest(".point-card, .cstage, #stage") && Z();
	}, !0);
}
async function kr(e) {
	let t = await P("/viewer/choose", { path: e }).then((e) => e.json()).catch(() => ({}));
	t.ref && dr(t.ref, pr, t.file);
}
function Ar() {
	P("/viewer/cancel");
}
var jr = 8, Mr = 16;
function Nr(e) {
	let t = document.documentElement, n = t.clientWidth, r = t.clientHeight, i = e.offsetWidth, a = e.offsetHeight, o = document.querySelector(".pc-float:not([data-leaving]) .pc-head"), s = o && o.getClientRects().length && getComputedStyle(o).visibility !== "hidden" ? o.getBoundingClientRect() : null, c, l, u = !1;
	s ? (c = s.left, l = s.bottom + jr, l + a > r - Mr && s.top - jr - a >= Mr && (l = s.top - jr - a, u = !0)) : (c = (n - i) / 2, l = document.getElementById("bar").getBoundingClientRect().bottom + Mr), c = Math.max(Mr, Math.min(c, n - i - Mr)), l = Math.max(Mr, Math.min(l, r - a - Mr));
	let d = Math.round(c) + "px", f = Math.round(l) + "px";
	e.style.left !== d && (e.style.left = d), e.style.top !== f && (e.style.top = f), e.classList.toggle("up", u);
}
var Pr = !1;
function Fr(e) {
	if (Nr(e), Pr) return;
	Pr = !0;
	let t = () => {
		e.classList.contains("on") ? (Nr(e), requestAnimationFrame(t)) : Pr = !1;
	};
	requestAnimationFrame(t);
}
function Ir(e, { stage: t, img: n, box: r, pick: i, marks: a }, o) {
	let s = null, c = !1, l = async () => {
		let t = Pe(L.st?.board, e);
		if (!t || !t.ok || !t.treeUrl) return null;
		let n = D.get(t.treeUrl);
		if (n) return s = n, s;
		try {
			s = Yn(qn((await te(t.treeUrl).then((e) => e.json())).composeViewInfo || []).sort(Jn)), D.set(t.treeUrl, s);
		} catch {
			s = null;
		}
		return s;
	};
	t.addEventListener("mouseenter", () => {
		s = null, c = !0, a.classList.add("over"), l().then((e) => {
			e && c && sr(a, e, er(n));
		});
	}, { signal: o }), t.addEventListener("mouseleave", () => {
		c = !1, ar(r, a);
	}, { signal: o }), n.addEventListener("mousemove", (e) => {
		s && ir(r, Xn(s, ...tr(e, n)) ?? null, er(n));
	}, { signal: o }), n.addEventListener("load", () => {
		s = null, X?.img === n && Z();
	}, { signal: o }), o.addEventListener("abort", () => {
		X?.img === n && Z();
	}), n.addEventListener("click", async (o) => {
		C(e);
		let c = s || await l();
		if (!c) return;
		let u = Xn(c, ...tr(o, n));
		if (!u) {
			X?.img === n && Z();
			return;
		}
		let d = Pe(L.st?.board, e), f = Zn(n);
		Sr({
			list: c,
			img: n,
			hover: r,
			pick: i,
			marks: a,
			host: document.getElementById("boardView"),
			scale: () => er(n),
			previewId: d.previewId,
			dpPerPx: d.widthDp && f ? d.widthDp / f : null,
			seen: {
				file: L.st?.board?.file ?? null,
				fn: t.closest(".card")?.dataset.fn ?? null
			}
		}, u);
	}, { signal: o });
}
// src/workspace/insets.ts
var Lr = [
	"statusBars",
	"navigationBars",
	"captionBar",
	"displayCutout",
	"systemOverlays"
], Rr = [
	"top",
	"right",
	"bottom",
	"left"
];
function zr(e, t) {
	let n = t === "top" || t === "bottom";
	return e === "displayCutout" ? n ? "left" : "top" : n ? "right" : "bottom";
}
var Br = (e) => !!e && Lr.some((t) => Rr.some((n) => zr(t, n) === "bottom" && e.values[t][n] > 0)), Vr = (e) => e ? e.kind === "device" ? `${e.device}:${e.folded ? "cover" : "open"}${e.landscape ? ":rot" : ""}${e.orientation === "landscape-right" ? ":right" : ""}` : e.preset || `custom:${e.widthDp}x${e.heightDp}` : "original";
function Hr(e, t, n) {
	try {
		let r = document.createElement("canvas");
		r.width = 132, r.height = 132;
		let i = r.getContext("2d", { willReadFrequently: !0 });
		i.drawImage(e, t - 3, 0, 3, n, 0, 0, 4, 128), i.drawImage(e, 0, n - 3, t, 3, 4, 128, 128, 4);
		let a = /* @__PURE__ */ new Map(), o = (e) => {
			for (let t = 0; t < e.length; t += 4) {
				let n = `${e[t] >> 2},${e[t + 1] >> 2},${e[t + 2] >> 2}`, r = a.get(n) || [
					0,
					0,
					0,
					0
				];
				r[0]++, r[1] += e[t], r[2] += e[t + 1], r[3] += e[t + 2], a.set(n, r);
			}
		};
		o(i.getImageData(0, 0, 4, 128).data), o(i.getImageData(4, 128, 128, 4).data);
		let [s, c, l, u] = [...a.values()].sort((e, t) => t[0] - e[0])[0];
		return `rgb(${Math.round(c / s)},${Math.round(l / s)},${Math.round(u / s)})`;
	} catch {
		return "var(--surface-container)";
	}
}
function Ur({ root: e, geometry: t, shot: n, stage: r, wrap: i, layout: a, dimensions: o, originalSize: s, zoomState: c, preparation: l, firstFrame: u }) {
	let d = null, f = !1, p = null, m = null, h = null, g = null, _ = null, v = 0, y = null, b = !1, x = !1, S = !1, C = null, w = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), E = !1, D = null, O = (e) => new Promise((t) => {
		E ? (D?.settle(!0), D = {
			body: e,
			settle: t
		}) : ee(e, t);
	});
	function ee(e, t) {
		E = !0, P("/viewer/resize", e).then((e) => {
			if (!e.ok) throw Error(`HTTP ${e.status}`);
			return !0;
		}).catch((e) => (F(k("resize.failed", { why: e.message })), !1)).then((e) => {
			t(e);
			let n = D;
			D = null, E = !1, n && ee(n.body, n.settle);
		});
	}
	let A = (e) => (T.has(e.src) || T.set(e.src, Hr(e, e.naturalWidth, e.naturalHeight)), T.get(e.src)), j = Se(e, {
		request: (e) => {
			if (S) return Promise.resolve(!1);
			let [t, n, ...r] = e.split(":"), i = j.devices.has(t) ? {
				device: t,
				folded: n === "cover",
				orientation: r.includes("right") ? "landscape-right" : j.sizeOf(e).w > j.sizeOf(e).h ? "landscape-left" : "portrait"
			} : { size: e.startsWith("custom:") ? e.slice(7) : e };
			return O(i);
		},
		insetOn: () => Wn.get().on,
		insetBelow: () => Br(m?.deviceInsets),
		layout: (t, n) => {
			if (!f) return;
			let i = c();
			d && i.z !== 1 && (i.x += (1 - i.z) * (d.cx - d.w / 2 - (t.cx - t.w / 2)), i.y += (1 - i.z) * (d.y - t.y)), d = t, a(t), ce(), r.classList.toggle("resize-hidden", n || !b && !S), e.classList.toggle("await-live", !b);
		}
	});
	Wn.subscribe(() => {
		f && j.relayout(!0);
	});
	function M(t, r = !1) {
		S = t, e.classList.toggle("preparing", t), n.setAttribute("aria-busy", String(t && !r)), Hn.set({
			on: t,
			failed: r
		});
		for (let n of e.querySelectorAll("input")) n.disabled = t;
		for (let e of document.querySelectorAll("#pnSum, #pnPick button, #devCtl button")) e.disabled = t;
		j.sliderOff(t), l(t, r);
	}
	function N(e, t) {
		let n = m?.pxPerDp || 2.625;
		return {
			url: e.src,
			dpW: t?.widthDp || e.naturalWidth / n,
			dpH: t?.heightDp || e.naturalHeight / n,
			edge: A(e)
		};
	}
	function te() {
		if (n.naturalWidth && m && b) try {
			let e = document.createElement("canvas");
			e.width = n.naturalWidth, e.height = n.naturalHeight, e.getContext("2d").drawImage(n, 0, 0);
			let t = o(), r = m.pxPerDp || 2.625;
			j.image(h, {
				url: e.toDataURL("image/jpeg", .92),
				dpW: m.size?.widthDp || t.w / r,
				dpH: m.size?.heightDp || t.h / r,
				edge: Hr(e, e.width, e.height)
			});
		} catch {}
	}
	function ne(e) {
		if (!w.has(e)) {
			let t = new Image();
			t.src = e, w.set(e, t.decode().then(() => t).catch((t) => {
				throw w.delete(e), t;
			}));
		}
		return w.get(e);
	}
	function ie(e) {
		let t = /* @__PURE__ */ new Set([e.imageUrl, ...(e.postures || []).map((e) => e.imageUrl)]);
		for (let e of w.keys()) t.has(e) || w.delete(e);
		let n = new Set([...t].map((e) => new URL(e, location.href).href));
		for (let e of T.keys()) n.has(e) || T.delete(e);
	}
	function ae(e) {
		let t = e.size;
		return {
			sel: Vr(t),
			w: t?.widthDp || y?.w || 411,
			h: t?.heightDp || y?.h || 891
		};
	}
	function oe(a, c) {
		if (!a?.interactive) return se(), !1;
		let l = p !== a.previewId;
		if (l && se(), f = !0, r.parentElement !== t && t.append(r), document.body.classList.add("resizing-ui"), i.classList.add("resize-wrap"), l || !p) {
			p = a.previewId, M(!0), n.removeAttribute("src"), n.dataset.url = "";
			let t = s(), r = o(), i = a.pxPerDp || 2.625, c = !!(t?.w && t?.h || r.w && r.h);
			y = {
				w: t?.w || r.w / i || 411,
				h: t?.h || r.h / i || 891,
				img: null
			}, e.classList.toggle("measuring", !a.size && !c), j.setOriginal(y.w, y.h, null), j.enable(!0);
		}
		let d = Vr(a.size), w = !!m && d !== h;
		w && (te(), x = !0, b = !1, r.classList.add("resize-hidden"));
		let T = m;
		m = a, h = d;
		let E = !w && !!T && Br(T.deviceInsets) !== Br(a.deviceInsets);
		T && !w && a.imageUrl !== T.imageUrl && j.clearImages();
		for (let e of a.postures || []) {
			let t = v;
			ne(e.imageUrl).then((n) => {
				f && t === v && m?.postures?.some((t) => t.imageUrl === e.imageUrl) && j.image(Vr(e.size), N(n, e.size));
			}).catch(() => {});
		}
		if (y && j.update(ae(a), !T), E && Wn.get().on && j.relayout(!0), c) return b = !1, _ = g = null, n.onload = null, n.removeAttribute("src"), M(!0, !0), r.classList.remove("resize-hidden"), !0;
		if (S && M(!0, !!c), !c && !document.hidden && a.streamUrl && (!x || a.streamUrl !== g || a.imageUrl !== T?.imageUrl) && (a.streamUrl !== g || !b || w)) {
			let t = `${v}:${d}:${a.streamUrl}:${a.imageUrl}`;
			if (_ !== t) {
				_ = t;
				let i = v;
				ne(a.imageUrl).then((s) => {
					if (!f || document.hidden || i !== v || _ !== t || h !== d) return;
					let c = a.size;
					if (!c) {
						let e = a.pxPerDp || 2.625, t = {
							w: s.naturalWidth / e,
							h: s.naturalHeight / e,
							img: N(s, c)
						}, n = y?.w !== t.w || y.h !== t.h;
						y = t, j.setOriginal(y.w, y.h, y.img), (S || n) && j.update(ae(a), S);
					}
					j.image(d, N(s, c)), g = a.streamUrl, x = !1, o(s.naturalWidth, s.naturalHeight), n.onload = () => {
						if (n.onload = null, !f || document.hidden || i !== v || h !== d || g !== a.streamUrl) return;
						b = !0;
						let t = S;
						M(!1), e.classList.remove("await-live", "measuring"), r.classList.toggle("resize-hidden", j.moving()), n.dataset.still = a.imageUrl, n.src = n.dataset.url = re(a.streamUrl), t && !u() && !ve.matches && (C = n.animate([{ opacity: 0 }, { opacity: 1 }], {
							duration: I("--duration-short3"),
							easing: ge("--easing-decelerate")
						}));
					}, n.src = a.imageUrl, n.dataset.url = a.imageUrl;
				}).catch((e) => {
					i === v && (_ = null, S && M(!0, !0), F(k("resize.image.failed", { why: e.message })));
				});
			}
		}
		return ie(a), !0;
	}
	function se() {
		if (f || p) {
			v++, f = !1, p = h = g = _ = null, m = null, y = null, b = x = !1, C?.cancel(), C = null, M(!1), i.append(r), j.enable(!1), w.clear(), T.clear(), e.classList.remove("measuring"), t.style.transform = "", document.body.classList.remove("resizing-ui"), i.classList.remove("resize-wrap"), r.classList.remove("resize-hidden"), n.onload = null;
			for (let e of [
				"left",
				"top",
				"width",
				"height",
				"border-radius"
			]) r.style.removeProperty(e);
		}
	}
	function ce() {
		if (!d) return;
		let e = c(), n = d.cx - d.w / 2, r = d.y;
		t.style.transform = `translate(${e.x + (1 - e.z) * n}px, ${e.y + (1 - e.z) * r}px) scale(${e.z})`;
	}
	return {
		update: oe,
		disable: se,
		preparing: () => S,
		suspend() {
			v++, g = _ = null, n.onload = null;
		},
		zoom(e) {
			return f ? (t.classList.toggle("zoom-anim", !!e), ce(), !0) : !1;
		},
		relayout: () => {
			f && j.relayout();
		},
		closeMenu: () => j.closeMenu(),
		pxPerDp: () => f && d ? d.s : null,
		moving: () => f && (!b || j.moving())
	};
}
// src/workspace/focus.ts
function Wr() {
	let e = (e) => document.getElementById(e), t = e("stage");
	return {
		focusView: e("focusView"),
		wrap: t.parentElement,
		stage: t,
		shot: e("shot"),
		box: e("box"),
		pickBox: e("pickBox"),
		marks: e("marks"),
		scene: e("resizeScene"),
		insetMarks: e("insetMarks"),
		geometry: e("resizeGeometry"),
		panel: e("panel"),
		header: [e("back"), e("wsTitle")]
	};
}
function Gr({ focusView: e, wrap: t, stage: n, shot: r, box: i, pickBox: a, marks: o, scene: s, insetMarks: c, geometry: l, panel: u, header: d }) {
	let f = [], p = [], m = !1;
	function h() {
		m && (p = Yn(f));
	}
	function g() {
		if (e.hidden) return;
		let n = getComputedStyle(document.documentElement), r = parseInt(n.getPropertyValue("--cap-room")) || 76, i = document.body.classList.contains("resizing-ui"), a = window.innerHeight - t.getBoundingClientRect().top - (i ? 0 : r + 16), o = parseInt(n.getPropertyValue("--stage-min-h")) || 260, s = Math.max(o, Math.round(a));
		document.documentElement.style.setProperty("--view-h", s + "px");
		let c = getComputedStyle(t), l = s - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
		document.documentElement.style.setProperty("--stage-max-h", l + "px"), G.relayout(), t.classList.contains("resize-wrap") || x(l - 2), H(), T();
	}
	let _ = 0, v = 0, y = () => (r.getAttribute("src") || "").startsWith("/stream");
	function b() {
		(r.getAttribute("src") || "").startsWith("data:") || !r.naturalWidth || y() && _ || (_ = r.naturalWidth, v = r.naturalHeight, r.dataset.fullW = String(_), r.dataset.fullH = String(v));
	}
	function x(e) {
		r.style.width = _ ? Math.min(_, e * _ / v) + "px" : "";
	}
	let S = 0, C = 0;
	function T() {
		!document.hidden && y() && !e.hidden && _ && (clearTimeout(C), C = window.setTimeout(() => {
			if (G.moving()) {
				T();
				return;
			}
			let e = Math.round(r.offsetWidth * devicePixelRatio * B.z);
			e && e !== S && (S = e, ne(e).catch(() => {}));
		}, 120));
	}
	let E = null, D = Promise.resolve();
	function O(e) {
		return e === E ? D : (E = e, D = ee(e));
	}
	async function ee(e) {
		try {
			let t = await te(e).then((e) => {
				if (!e.ok) throw Error(k("focus.tree.http", { status: e.status }));
				return e.json();
			});
			if (e !== E) return;
			if (t.failure) {
				m = !1;
				return;
			}
			f = qn(t.composeViewInfo || []).sort(Jn), p = Yn(f), le(L.projectFiles.size ? "" : k("focus.noIndex", { n: f.length })), m = !0, ir(i, null, 1), a.hidden = !0, xr() === r && Z();
		} catch (e) {
			ce(k("focus.tree.failed", { why: e.message }), "error");
		}
	}
	function A(e) {
		let t = !!(e && e.interactive);
		if (t || On(), u.hidden = !e, e || W(), n.classList.toggle("live", t), De = e && e.pxPerDp || null, e && e.previewId === Te || (G.disable(), Te = e ? e.previewId : null, _ = v = 0, delete r.dataset.fullW, delete r.dataset.fullH, r.style.width = "", Ne(1, 0, 0, !1)), !e) {
			j?.entering && ie(), G.disable(), r.hasAttribute("src") && (r.removeAttribute("src"), r.dataset.url = "");
			for (let e of n.querySelectorAll("img.ghost")) e.remove();
			return;
		}
		let i = L.st;
		if (n.style.cursor = t ? "pointer" : "crosshair", e.treeUrl !== E && O(e.treeUrl), G.update(e, i.error)) return;
		Ne(B.z, B.x, B.y, !1);
		let a = t ? e.streamUrl ? re(e.streamUrl) : Pe(i.board, i.board?.focus)?.imageUrl || "" : e.imageUrl;
		r.dataset.url !== a && (a.startsWith("/stream") && (S = 0), ye(r, a));
	}
	let j = null, M = (e, t) => e > 0 && t > 0 && Math.abs(e / t - 1) < .01, N = (e, t) => {
		for (let n of [
			s,
			u,
			...d
		]) n.style.setProperty("--deco-dur", t + "ms"), n.classList.toggle("deco-off", !e);
	};
	function ie() {
		if (!j) return;
		let t = j;
		j = null, clearTimeout(t.lead), clearTimeout(t.giveUp), t.m.cancel();
		for (let e of t.hidden) e.classList.remove("morph-target");
		e.classList.remove("morph-hold"), N(!0, 0);
	}
	function ae(t) {
		j === t && (j = null, clearTimeout(t.lead), clearTimeout(t.giveUp), e.classList.remove("morph-hold"), N(!0, I("--duration-short4")), t.m.finish(t.same ? 150 : 0));
	}
	function oe(r) {
		if (ie(), !r || ve.matches || document.hidden || e.hidden || !t.classList.contains("resize-wrap")) return;
		let i = n.getBoundingClientRect();
		if (!i.width || !i.height) return;
		let a = M(r.ratio, i.width / i.height), o = getComputedStyle(n);
		e.classList.add("morph-hold"), N(!1, 0);
		let s = pe({
			from: r.rect,
			to: () => n.getBoundingClientRect(),
			radius: [r.radius, _e(o)],
			shadow: [r.shadow, o.boxShadow],
			a: r.url,
			b: a ? null : "",
			swapAt: 0,
			swapMs: 250
		}), c = j = {
			m: s,
			same: a,
			hidden: [],
			entering: !0,
			ready: !G.preparing(),
			landed: !1
		};
		c.lead = window.setTimeout(() => {
			j === c && N(!0, I("--duration-short4"));
		}, fe), s.landed.then(() => requestAnimationFrame(() => {
			j === c && (c.landed = !0, !c.same || c.ready ? ae(c) : c.giveUp = window.setTimeout(() => ae(c), 5e3));
		}));
	}
	function se() {
		j?.entering && ae(j);
	}
	function ue() {
		let e = j;
		return !e || !e.entering || !e.same ? !1 : (e.ready = !0, e.landed && ae(e), !0);
	}
	function de(t, i, a, o = () => {}, s = () => !0) {
		ie();
		let c = () => be(() => {
			t(), a(), o();
		}, i, {
			workspace: !0,
			image: r
		});
		if (ve.matches || document.hidden || e.hidden || !n.offsetWidth) {
			c();
			return;
		}
		let l = he();
		G.suspend(), N(!1, I("--duration-short2"));
		let u = y() && r.naturalWidth ? me(r) : null;
		Promise.all([u, new Promise((e) => setTimeout(e, I("--duration-short2")))]).then(() => {
			n.style.setProperty("--z", "1");
			let e = Yr(n);
			n.style.removeProperty("--z"), l(), s() ? be(() => {
				t(), N(!0, 0);
				let n = a(), r = n && Yr(n);
				if (!n || !r || !r.rect.width || !e.url) {
					o();
					return;
				}
				let i = M(e.ratio, r.ratio);
				n.classList.add("morph-target");
				let s = r.rect, c = pe({
					from: e.rect,
					to: () => {
						if (!n.isConnected) {
							let e = a();
							e && (e.classList.add("morph-target"), l.hidden = [e], n = e);
						}
						return n.isConnected && (s = n.getBoundingClientRect()), s;
					},
					radius: [e.radius, r.radius],
					shadow: [e.shadow, r.shadow],
					a: e.url,
					b: r.url,
					swapAt: i ? 400 : 0,
					swapMs: i ? 150 : 250,
					ceiling: () => w(n)
				}), l = j = {
					m: c,
					same: i,
					hidden: [n]
				};
				c.landed.then(() => requestAnimationFrame(() => {
					if (j === l) {
						j = null;
						for (let e of l.hidden) e.classList.remove("morph-target");
						c.finish(0);
					}
				}));
			}, i, { workspace: !0 }) : (N(!0, 0), t(), i());
		});
	}
	let ge = !1, xe = () => !!(history.state && history.state.prevueWs);
	function Se(e) {
		let t = !!(e && e.screen === "focus" && e.focus);
		t && !xe() ? (history.scrollRestoration = "manual", history.pushState({ prevueWs: !0 }, "")) : !t && xe() && !ge && (ge = !0, history.back());
	}
	addEventListener("popstate", () => {
		ge ? ge = !1 : L.st && L.st.screen === "focus" && L.st.focus && P("/viewer/exit");
	});
	let Ce = (e) => tr(e, r), R = () => !!(L.st && L.st.focus && L.st.focus.interactive), z = () => {
		xr() === r && Z();
	}, we = (e) => !R() || e.altKey;
	n.addEventListener("mousemove", (e) => {
		let t = m && we(e);
		o.classList.toggle("over", t), t && sr(o, p, Oe()), ir(i, t ? Xn(p, ...Ce(e)) ?? null : null, Oe());
	}), n.addEventListener("mouseleave", () => ar(i, o)), n.addEventListener("mousedown", (e) => {
		e.button !== 0 || G.moving() || (Ee || !R() && B.z > 1 && !e.altKey ? We(e) : R() && !e.altKey && (e.preventDefault(), z(), wn(...Ce(e))));
	}), window.addEventListener("mousemove", (e) => {
		Cn() && Tn(...Ce(e));
	}), window.addEventListener("mouseup", (e) => {
		Cn() && En(...Ce(e));
	}), n.addEventListener("click", async (t) => {
		if (G.moving()) return;
		if (V) {
			V = !1;
			return;
		}
		if (R() && !t.altKey || !m || !L.st || !L.st.focus) return;
		if (R()) try {
			await O((await P("/viewer/catchup").then((e) => e.json())).treeUrl || E);
		} catch (e) {
			F(k("point.sync.failed", { why: e.message }));
			return;
		}
		await D;
		let n = Xn(p, ...Ce(t));
		if (!n) {
			xr() === r && Z();
			return;
		}
		let s = L.st, c = s.focus, l = s.board;
		Sr({
			list: p,
			img: r,
			hover: i,
			pick: a,
			marks: o,
			host: e,
			scale: Oe,
			previewId: c.previewId,
			dpPerPx: c.pxPerDp ? 1 / c.pxPerDp : null,
			seen: {
				file: l?.file ?? null,
				fn: l?.groups.find((e) => e.cards.some((e) => e.index === l.focus))?.name ?? null
			}
		}, n);
	});
	let B = {
		z: 1,
		x: 0,
		y: 0
	}, Te = null, Ee = !1, V = !1, De = null;
	function Oe() {
		return $n(r.offsetWidth, r.offsetHeight, r) || 1;
	}
	function ke() {
		let e = G.pxPerDp();
		return e ? 1 / e : De && (_ || r.naturalWidth) ? 1 / (Oe() * De) : null;
	}
	let Ae = () => Math.min(1, ke() || 1), je = () => Math.max(8, (ke() || 1) * 4);
	function Me(e, r, i) {
		if (e <= 1) return [
			e,
			n.offsetWidth * (1 - e) / 2,
			n.offsetHeight * (1 - e) / 2
		];
		let a = n.offsetWidth * e, o = n.offsetHeight * e, s = t.clientWidth, c = t.clientHeight, l = n.offsetLeft, u = n.offsetTop;
		return [
			e,
			Math.min(s / 2 - l, Math.max(s / 2 - l - a, r)),
			Math.min(c / 2 - u, Math.max(c / 2 - u - o, i))
		];
	}
	function Ne(e, r, i, a) {
		G.preparing() || ([B.z, B.x, B.y] = Me(Math.min(je(), Math.max(Ae(), e)), r, i), n.classList.toggle("zoom-anim", !!a), n.style.transform = G.zoom(a) || B.z === 1 ? "" : `translate(${B.x}px, ${B.y}px) scale(${B.z})`, t.style.setProperty("--z", String(B.z)), n.classList.toggle("zoomed", B.z > 1), H(), T());
	}
	function H() {
		let e = ke();
		Vn.set({
			pct: Math.round((e ? B.z / e : B.z) * 100),
			real: !!e,
			atFit: B.z === 1
		});
	}
	function U(e, t, r, i) {
		let a = n.getBoundingClientRect(), o = a.left - B.x, s = a.top - B.y, c = (t - a.left) / B.z, l = (r - a.top) / B.z, u = Math.min(je(), Math.max(Ae(), e));
		Ne(u, t - o - c * u, r - s - l * u, i);
	}
	function Fe(e) {
		let n = t.getBoundingClientRect();
		U(e, n.left + n.width / 2, n.top + n.height / 2, !0);
	}
	let Ie = (e) => Fe(B.z * e), Le = () => Ie(1.25), Re = () => Ie(1 / 1.25), ze = () => Ne(1, 0, 0, !0), Be = !1;
	function W() {
		if (!Vn.get().menu) return !1;
		Vn.set({ menu: !1 });
		let e = document.getElementById("zoomMenu"), t = document.activeElement;
		return e && t && e.contains(t) && (Be ? document.getElementById("zoomPct")?.focus({ preventScroll: !0 }) : t.blur()), !0;
	}
	function Ve(e) {
		let t = !Vn.get().menu;
		t && (Be = e), Vn.set({ menu: t });
	}
	function He(e) {
		W(), e === "fit" ? ze() : Fe((ke() || 1) * Number(e));
	}
	addEventListener("pointerdown", (e) => {
		let t = document.getElementById("zoomCtl");
		t && t.contains(e.target) || W();
	}), addEventListener("resize", () => {
		g(), Ne(B.z, B.x, B.y, !1);
	}), r.addEventListener("load", () => {
		b(), g();
	}), t.addEventListener("wheel", (t) => {
		e.hidden || (t.ctrlKey || t.metaKey ? (t.preventDefault(), U(B.z * Math.exp(-t.deltaY * .01), t.clientX, t.clientY, !1)) : R() ? (t.preventDefault(), G.moving() || (z(), Ue(t))) : B.z > 1 && (t.preventDefault(), Ne(B.z, B.x - t.deltaX, B.y - t.deltaY, !1)));
	}, { passive: !1 });
	function Ue(e) {
		let n = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? t.clientHeight : 1, i = Oe() * B.z || 1, [a, o] = Ce(e);
		Nn(Math.max(0, Math.min(_ || r.naturalWidth, a)), Math.max(0, Math.min(v || r.naturalHeight, o)), e.deltaX * n / i, e.deltaY * n / i);
	}
	function We(e) {
		e.preventDefault();
		let t = e.clientX, r = e.clientY, i = B.x, a = B.y;
		n.classList.add("panning");
		let o = (e) => {
			Math.abs(e.clientX - t) + Math.abs(e.clientY - r) > 3 && (V = !0), Ne(B.z, i + e.clientX - t, a + e.clientY - r, !1);
		}, s = () => {
			n.classList.remove("panning"), removeEventListener("mousemove", o), removeEventListener("mouseup", s);
		};
		addEventListener("mousemove", o), addEventListener("mouseup", s);
	}
	let Ge = (e) => !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
	addEventListener("keydown", (t) => {
		let r = t.target;
		t.code !== "Space" || e.hidden || Ge(r) || r?.closest && r.closest("button, [role=button]") || (t.preventDefault(), Ee || (Ee = !0, n.classList.add("grab")));
	}), addEventListener("keyup", (e) => {
		e.code === "Space" && (Ee = !1, n.classList.remove("grab"));
	}), addEventListener("blur", () => {
		Ee = !1, n.classList.remove("grab"), Dn();
	});
	let G = Ur({
		root: s,
		geometry: l,
		shot: r,
		stage: n,
		wrap: t,
		zoomState: () => B,
		preparation(e, t) {
			t && se(), Vn.set({ disabled: e }), e && W();
		},
		firstFrame: ue,
		originalSize() {
			let e = Pe(L.st?.board, L.st?.board?.focus);
			return e ? {
				w: e.widthDp,
				h: e.heightDp
			} : null;
		},
		dimensions(e, t) {
			return e && t && (_ = e, v = t, r.dataset.fullW = String(e), r.dataset.fullH = String(t), S = 0, T()), {
				w: _,
				h: v
			};
		},
		layout(e) {
			n.style.left = e.cx - e.w / 2 + "px", n.style.top = e.y + "px", n.style.width = e.w + "px", n.style.height = e.h + "px", n.style.borderRadius = e.radius.map((e) => e + "px").join(" "), Object.assign(c.style, {
				left: n.style.left,
				top: n.style.top,
				width: n.style.width,
				height: n.style.height
			}), c.style.setProperty("--im-bezel", e.bezel + "px"), H(), T();
		}
	});
	return document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			if (clearTimeout(C), G.suspend(), !y()) return;
			let e = r.getAttribute("src");
			me(r), r.getAttribute("src") === e && r.removeAttribute("src"), r.dataset.url = "";
		} else L.st?.screen === "focus" && A(L.st.focus);
	}), {
		render: A,
		fitStage: g,
		renarrow: h,
		syncHistory: Se,
		morphIn: oe,
		morphOut: de,
		image: () => r,
		zoomIn: Le,
		zoomOut: Re,
		zoomFit: ze,
		zoomMenuPick: He,
		toggleZoomMenu: Ve,
		closeZoomMenu: W,
		closeDeviceMenu: () => G.closeMenu()
	};
}
var Kr = (e) => e && e.naturalWidth ? e.naturalWidth / e.naturalHeight : 0, qr = /* @__PURE__ */ new Map();
function Jr(e) {
	let t = e?.dataset.still;
	if (!t) return null;
	if (!qr.has(t)) {
		let e = new Image();
		e.src = t, qr.set(t, e), qr.size > 8 && qr.delete(qr.keys().next().value);
	}
	return qr.get(t);
}
function Yr(e) {
	if (!e) return null;
	let t = e.querySelector("img"), n = getComputedStyle(e), r = t && t.getAttribute("src") || "";
	return {
		el: e,
		rect: e.getBoundingClientRect(),
		radius: _e(n),
		shadow: n.boxShadow,
		url: t ? r.startsWith("/stream") ? t.dataset.still || "" : t.currentSrc || r : "",
		ratio: Kr(t) || Kr(Jr(t))
	};
}
function Xr(e) {
	P("/viewer/focus", { index: e }).catch((e) => ce(k("focus.enter.failed", { why: e.message }), "error"));
}
function Zr() {
	L.st && L.st.focus && P("/viewer/exit");
}
function Qr(e) {
	P("/viewer/systemUi", { systemUi: e }).catch((e) => F(k("request.failed", { why: e.message })));
}
// src/session.ts
var $r = () => document.getElementById("boardView"), ei, ti = null;
function ni(e) {
	return ti && !e.error && e.screen === "focus" && e.focus?.previewId === ti.id && (e.busy || !e.focus.streamUrl || e.focus.streamUrl === ti.stream && e.focus.imageUrl === ti.image) ? !0 : (ti = null, !1);
}
var ri = /* @__PURE__ */ new Map(), ii = null, ai = {
	wasBoard: !1,
	arrive: !1,
	file: null
};
function oi(e) {
	let t = !$r().hidden, n = e.board ? e.board.file : null;
	t && ii && (e.screen !== "board" || n !== ii) && ri.set(ii, scrollY), ai = {
		wasBoard: t,
		arrive: e.screen === "board" && (!t || n !== ii),
		file: n
	}, ii = n;
}
function si(e) {
	let { wasBoard: t, arrive: n, file: r } = ai;
	ei.render(e.screen === "focus" ? e.focus : null), ei.syncHistory(e), se(O(e.error)), ei.fitStage(), n ? scrollTo(0, ri.get(r) || 0) : t && e.screen !== "board" && scrollTo(0, 0), f();
}
var ci = (e) => {}, li = (e) => {
	let t = (e.tabs || []).find((e) => e.active);
	return t ? t.key : null;
};
function ui(e, t, n) {
	let r = (t) => {
		let n = e.tabs.findIndex((e) => e.key === t);
		return n < 0 ? e.tabs.length : n;
	};
	return Math.sign(r(n) - r(t));
}
var di = (e) => e?.screen === "focus" && e.focus?.interactive ? `${li(e)} ${e.board?.focus ?? ""} ${e.focus.previewId}` : null, fi = !1;
function pi(e) {
	if (L.st && e.version <= L.st.version) return;
	let t = L.st;
	if (t?.focus?.interactive && e.focus?.interactive && t.focus.previewId === e.focus.previewId && JSON.stringify(t.focus.size) !== JSON.stringify(e.focus.size) && (ti = {
		id: e.focus.previewId,
		stream: t.focus.streamUrl,
		image: t.focus.imageUrl
	}), L.st = e, di(t) !== di(e) && Wn.set({ on: !1 }), xe()) {
		fi = !0;
		return;
	}
	let n = t && t.screen, r = e.screen, i = t && li(t) && li(e) && li(t) !== li(e);
	t && (i || n !== r || t.board && e.board && t.board.focus !== e.board.focus && r === "focus") && Z();
	let a = () => {
		fi && (fi = !1, ci(L.st));
	}, o = () => L.st;
	if (i) {
		let n = document.documentElement;
		n.style.setProperty("--tab-dir", String(ui(t, li(t), li(e)))), n.classList.add("vt-tab"), be(() => ci(o()), a), setTimeout(() => n.classList.remove("vt-tab"), 500);
	} else if (n === "board" && r === "focus") {
		let t = e.board ? Yr(g(h(e.board.focus))) : null;
		be(() => {
			ci(o()), ei.morphIn(t);
		}, a, { workspace: !0 });
	} else if (n === "focus" && r === "board") {
		let e = null;
		ei.morphOut(() => ci(o()), a, () => g(e = o().screen === "board" ? b(o().board.focus) : null), () => S(e), () => o().screen === "board");
	} else n === "focus" && r === "focus" && t.board && e.board && t.board.focus !== e.board.focus ? be(() => ci(o()), a, { workspace: !0 }) : ci(e);
}
var mi = 0, hi = () => {
	let e = ++mi;
	N().then((t) => {
		e === mi && (L.projectFiles = new Map(Object.entries(t.files || {})), _(), ei.renarrow());
	}).catch(() => {});
}, gi = !1, _i = () => {}, vi = null, yi = () => {
	vi?.fail(k("prep.lost")), ce(k("status.lost"), "error"), _i("lost"), L.st = null;
}, bi = 6e4, xi = !1, Si = 0, Ci = 0, wi = null, Ti = (e) => !e.busy && !(e.board?.groups || []).some((e) => e.cards.some((e) => !e.rendered));
function Ei() {
	xi = !0, _i("restarting"), clearTimeout(Si), Si = window.setTimeout(yi, bi);
}
function Di(e) {
	if (xi) {
		if (e.boot === wi) return;
		Ci ||= (clearTimeout(Si), window.setTimeout(() => location.reload(), bi)), Ti(e) && location.reload();
	} else wi && e.boot !== wi ? location.reload() : (wi = e.boot, pi(e));
}
function Oi({ workspace: e, render: t, onConnection: n, onPreviewFiles: r, prepared: i = null }) {
	ei = e, ci = (e) => {
		oi(e), t(e, ni(e));
	}, _i = n, vi = i, ee({
		open: () => {
			gi && !xi ? location.reload() : gi || hi();
		},
		state: Di,
		ui: (e) => {
			e.kind === "flash" ? F(O(e.text ?? null)) : e.kind === "previewFiles" ? r() : e.kind === "projectFiles" ? hi() : e.kind === "restart" && !vi && Ei();
		},
		error: () => {
			gi = !0, xi || yi();
		}
	});
}
// src/shortcuts.ts
function ki(e, t) {
	return [
		{
			group: e("keys.group.board"),
			rows: [
				{
					keys: ["ArrowLeft", "ArrowRight"],
					cap: ["←", "→"],
					label: e("keys.card.pick"),
					when: () => t.screen() === "board",
					run: (e) => t.moveCursor(e.key === "ArrowLeft" ? -1 : 1)
				},
				{
					keys: ["Enter", "i"],
					cap: ["↩", "I"],
					label: e("keys.card.open"),
					when: () => t.screen() === "board",
					run: () => t.openCursor()
				},
				{
					keys: ["Escape"],
					cap: ["esc"],
					label: e("keys.board.gallery"),
					when: () => t.screen() === "board",
					run: () => t.openGallery()
				}
			]
		},
		{
			group: e("keys.group.single"),
			rows: [
				{
					keys: ["Escape", "i"],
					cap: ["esc", "I"],
					label: e("keys.single.back"),
					when: () => t.screen() === "focus",
					run: () => t.exitFocus()
				},
				{
					keys: ["+", "-"],
					cap: ["+", "−"],
					label: e("keys.single.zoom"),
					when: () => t.screen() === "focus",
					run: (e) => (ji(e) === "+" ? t.zoomIn : t.zoomOut)()
				},
				{
					keys: ["0"],
					cap: ["0"],
					label: e("keys.single.fit"),
					when: () => t.screen() === "focus",
					run: () => t.zoomFit()
				},
				{
					cap: [e("keys.cap.twoFingers"), e("keys.cap.scroll")],
					label: e("keys.single.scroll")
				},
				{
					cap: ["Space", e("keys.cap.drag")],
					combo: !0,
					label: e("keys.single.pan")
				},
				{
					cap: ["⌥", e("keys.cap.click")],
					combo: !0,
					label: e("keys.single.point")
				}
			]
		},
		{
			group: e("keys.group.tabs"),
			rows: [
				{
					keys: ["⇧ArrowLeft", "⇧ArrowRight"],
					cap: ["⇧←", "⇧→"],
					label: e("keys.tabs.step"),
					when: () => t.tabCount() > 1,
					run: (e) => t.stepTab(e.key === "ArrowLeft" ? -1 : 1)
				},
				{
					keys: [
						"1",
						"2",
						"3",
						"4",
						"5",
						"6",
						"7",
						"8",
						"9"
					],
					cap: [
						"1",
						"…",
						"9"
					],
					label: e("keys.tabs.jump"),
					when: () => t.tabCount() > 1,
					run: (e) => t.jumpTab(Number(ji(e)))
				},
				{
					cap: ["×"],
					label: e("keys.tabs.close")
				}
			]
		},
		{
			group: e("keys.group.anywhere"),
			rows: [
				{
					keys: ["/"],
					cap: ["/", "⌘K"],
					label: e("keys.any.open"),
					when: () => t.screen() !== "offline",
					run: () => t.openQuickOpen(document.activeElement)
				},
				{
					cap: [e("keys.cap.click")],
					label: e("keys.any.point")
				},
				{
					keys: ["?"],
					cap: ["?"],
					label: e("keys.any.help"),
					when: () => !0,
					run: () => t.toggleHelp(!t.helpOpen(), !0)
				}
			]
		}
	];
}
function Ai(e) {
	return e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
}
function ji(e) {
	return e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") ? "⇧" + e.key : /^Digit[1-9]$/.test(e.code) && !e.shiftKey ? e.code.slice(5) : e.code === "KeyI" ? "i" : e.code === "Slash" && e.shiftKey ? "?" : e.code === "Equal" ? "+" : e.code === "Minus" ? "-" : e.code === "Digit0" ? "0" : e.key;
}
function Mi(e, t, n) {
	let r = (r) => {
		if ((r.metaKey || r.ctrlKey) && !r.altKey && !r.shiftKey && r.code === "KeyK" && t.screen() !== "offline") {
			r.preventDefault(), t.openQuickOpen(document.activeElement);
			return;
		}
		if (r.metaKey || r.ctrlKey || r.altKey || Ai(r.target)) return;
		let i = ji(r), a = i === "Enter" && r.target instanceof Element && r.target.closest("button, [role=button]");
		if (!(a && a.matches(":focus-visible"))) {
			if (i === "Escape" && t.helpOpen()) r.preventDefault(), t.toggleHelp(!1);
			else if (i === "Escape" && n.chooserOpen()) r.preventDefault(), n.cancelChoice();
			else if (i === "Escape" && n.closeZoomMenu()) r.preventDefault();
			else if (i === "Escape" && n.closeDeviceMenu()) r.preventDefault();
			else if (i === "Escape" && n.closeDirPop()) r.preventDefault();
			else if (i === "Escape" && n.closeRailDrawer()) r.preventDefault();
			else if (i === "Escape" && n.closeCard()) r.preventDefault();
			else if (i === "Escape" && n.closeSheet()) r.preventDefault();
			else if (n.sheetOpen() && !t.helpOpen()) i === "Enter" && (r.preventDefault(), n.openSheetFile());
			else if (!(t.helpOpen() && i !== "?")) {
				for (let t of e) for (let e of t.rows) if (e.run && e.keys.includes(i) && e.when()) {
					r.preventDefault(), e.run(r);
					return;
				}
			}
		}
	};
	return addEventListener("keydown", r), () => removeEventListener("keydown", r);
}
// src/components/BuildNotice.tsx
var Ni = n(), Pi = r();
function Fi({ pending: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t);
	return (0, R.useLayoutEffect)(() => {
		r && (r.hidden = !e);
	}, [r, e]), i(n("build.notice"), (e, t) => /* @__PURE__ */ (0, z.jsx)("aside", {
		className: "build-notice",
		id: "buildNotice",
		role: "status",
		ref: e,
		hidden: !0,
		children: t
	}));
}
// src/gallery/cards.ts
var Ii = (e) => e.rel.slice(e.rel.lastIndexOf("/") + 1).replace(/\.kts?$/, ""), Li = (e) => e.rel.match(/(?:^|\/)src\/[^/]+\/(?:java|kotlin)\/(.+)\/[^/]+$/)?.[1].split("/") ?? [];
function Ri(e) {
	let t = e.map(Li).filter((e) => e.length);
	return t.length ? t.reduce((e, t) => {
		let n = 0;
		for (; n < e.length && n < t.length && e[n] === t[n];) n++;
		return e.slice(0, n);
	}) : [];
}
function zi(e, t) {
	let n = Li(e);
	return n.length ? n.slice(t.length).join(".") || n.join(".") : e.rel.includes("/") ? e.rel.slice(0, e.rel.lastIndexOf("/")) : "";
}
function Bi(e) {
	let t = (e || "").split(":").filter(Boolean);
	for (; t.length > 1 && (t.at(-1) === "impl" || t.at(-1) === "api");) t.pop();
	return t.join("/");
}
function Vi(e, t, n, r) {
	let i = Math.round((t - e) / 6e4);
	return i < 60 ? n("gallery.ago.minutes", { n: Math.max(i, 1) }) : i < 1440 ? n("gallery.ago.hours", { n: Math.round(i / 60) }) : i < 20160 ? n("gallery.ago.days", { n: Math.round(i / 1440) }) : new Date(e).toLocaleDateString(r, {
		month: "short",
		day: "numeric"
	});
}
var Hi = (e) => [...e].sort((e, t) => t.mtime - e.mtime || e.rel.localeCompare(t.rel)), Ui = (e) => `${e.mtime} ${e.path}`, Wi = { status: "idle" };
function Gi(e, t = 1) {
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), o = 0, s = !1, c = (e, t) => {
		n.set(e, t);
		for (let e of i) e();
	};
	function l() {
		for (; !s && o < t && r.size;) {
			let t = null;
			for (let e of r) (!t || e[1].order < t[1].order) && (t = e);
			let [n, { path: i }] = t;
			r.delete(n), o++, c(n, { status: "loading" }), e(i).then((e) => c(n, e?.ok && e.image ? {
				status: "done",
				sheets: e.sheets,
				image: e.image
			} : {
				status: "error",
				sheets: e?.sheets ?? 0,
				failure: e?.failure ?? null
			}), () => c(n, {
				status: "error",
				sheets: 0,
				failure: null
			})).finally(() => {
				o--, l();
			});
		}
	}
	function u(e, t, i) {
		let a = n.get(e)?.status ?? "idle";
		(a === "idle" || a === "wait") && (r.set(e, {
			path: t,
			order: i
		}), a === "idle" && c(e, { status: "wait" }), l());
	}
	return {
		want: u,
		drop(e) {
			r.delete(e) && c(e, Wi);
		},
		lost(e, t, r) {
			a.has(e) || n.get(e)?.status !== "done" || (a.add(e), c(e, Wi), u(e, t, r));
		},
		pause(e) {
			s = e, e || l();
		},
		get: (e) => n.get(e) ?? Wi,
		subscribe(e) {
			return i.add(e), () => {
				i.delete(e);
			};
		}
	};
}
var Ki = 1.5, qi = 420, Ji = 640, Yi = 16, Xi = 10 / 16, Zi = 40, Qi = 1.2;
function $i(e, t) {
	return (e.startsWith(t) ? e.slice(t.length) : e).replace(/^Preview/, "").replace(/Preview$/, "").replace(/^_+|_+$/g, "");
}
function ea(e, t, n) {
	let r = e.status === "done" || e.status === "error" ? e.sheets : t.functions.length, i = Math.min(3, Math.max(1, r, n?.sheets.length ?? 0)), a = Ii(t);
	return Array.from({ length: i }, (r, i) => {
		let o = n?.sheets[i];
		return {
			shot: i === 0 && e.status === "done" ? e.image : o?.image ?? (n || i === 0 && e.status === "error" ? "failed" : null),
			label: o ? o.variant ?? $i(o.name, a) : n ? "" : $i(t.functions[i] ?? "", a)
		};
	});
}
var ta = () => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", {
		d: "M3 8h10M9 4l4 4-4 4",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.5",
		strokeLinecap: "round",
		strokeLinejoin: "round"
	})
}), na = () => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", {
		d: "M2 4.5V12.5h12V5.5H8L6.5 4H2z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), ra = () => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", {
		d: "M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), ia = (e) => e.bottom > 0 && e.top < innerHeight && e.right > 0 && e.left < innerWidth && e.width > 0, Q = (e) => e?.getBoundingClientRect() ?? null, aa = (e, t) => [{
	transformOrigin: "top left",
	transform: `translate(${e.left - t.left}px, ${e.top - t.top}px) scale(${e.width / t.width}, ${e.height / t.height})`
}, {
	transformOrigin: "top left",
	transform: "none"
}], oa = (e, t) => [{ transform: `translate(${e}px, ${t}px)` }, { transform: "none" }];
function sa(e, t) {
	let n = e.width / t.width;
	return Array.from({ length: 17 }, (r, i) => {
		let a = i / 16, o = n + (1 - n) * a, s = e.height + (t.height - e.height) * a;
		return {
			offset: a,
			transformOrigin: "top left",
			clipPath: `inset(0 0 ${Math.max(0, Math.min(100, (1 - s / (t.height * o)) * 100))}% 0)`,
			transform: `translate(${(e.left - t.left) * (1 - a)}px, ${(e.top - t.top) * (1 - a)}px) scale(${o})`
		};
	});
}
function ca(e, t) {
	let n = (e) => t.querySelector(e), r = Q(e.querySelector(".gcard-hit")), i = Q(e.querySelector(".gcard-cover")), a = Q(n(".gsheet-shell")), o = Q(n(".gsheet-mediabg")), s = [{
		el: n(".gsheet-shell"),
		kf: aa(r, a)
	}, {
		el: n(".gsheet-mediabg"),
		kf: aa(i, o)
	}], c = Q(e.querySelector(".gcard-shot"));
	c && t.querySelectorAll(".gsheet-shot").forEach((e) => s.push({
		el: e,
		kf: e.querySelector("img") ? sa(c, Q(e)) : aa(c, Q(e))
	}));
	let l = (t, r) => {
		let i = Q(e.querySelector(r)), a = Q(n(t));
		return i && a ? [i.left - a.left, i.top - a.top] : [0, 0];
	}, u = (r, i) => {
		let a = n(r), o = e.querySelector(i);
		if (!o) return;
		let c = Q(o), l = Q(a), u = o.cloneNode(!0);
		u.classList.add("gsheet-ghost"), Object.assign(u.style, {
			position: "fixed",
			left: `${c.left}px`,
			top: `${c.top}px`,
			width: `${c.width}px`,
			height: `${c.height}px`,
			margin: "0",
			pointerEvents: "none"
		}), t.parentElement.appendChild(u);
		let d = Math.max(0, l.width - c.width), f = Math.max(0, l.height - c.height);
		s.push({
			el: a,
			kf: [{
				transform: `translate(${c.left - l.left}px, ${c.top - l.top}px)`,
				clipPath: `inset(0 ${d}px ${f}px 0)`
			}, {
				transform: "none",
				clipPath: "inset(0 0 0 0)"
			}],
			op: [
				0,
				1,
				.3,
				.8
			]
		}), s.push({
			el: u,
			kf: [{ transform: "none" }, { transform: `translate(${l.left - c.left}px, ${l.top - c.top}px)` }],
			op: [
				1,
				0,
				0,
				.5
			]
		});
	};
	la(t), u(".gsheet-file", ".gcard-file"), t.querySelectorAll(".gsheet-cap").forEach((e) => s.push({
		el: e,
		kf: [{}, {}],
		fade: !0
	}));
	let d = t.querySelector(".gcard-count"), f = e.querySelector(".gcard-count");
	d && s.push(f ? {
		el: d,
		kf: oa(Q(f).left - Q(d).left, Q(f).top - Q(d).top)
	} : {
		el: d,
		kf: [{}, {}],
		fade: !0
	});
	let [p, m] = l(".gsheet-info", ".gcard-info");
	s.push({
		el: n(".gsheet-info"),
		kf: oa(p, m)
	}), u(".gsheet-pkgrow", ".gcard-pkgrow");
	let h = t.querySelector(".gsheet-mod");
	if (h) {
		let [e, t] = l(".gsheet-mod", ".gcard-mod");
		s.push({
			el: h,
			kf: oa(e, t)
		});
	}
	return s.push({
		el: n(".gsheet-go"),
		kf: oa(r.right - a.right, r.bottom - a.bottom),
		fade: !0
	}), s;
}
var la = (e) => e.parentElement?.querySelectorAll(".gsheet-ghost").forEach((e) => e.remove()), ua = (e) => e.slice().reverse().map((e, t, n) => ({
	...e,
	offset: e.offset == null ? n.length === 1 ? 1 : t / (n.length - 1) : 1 - e.offset
})), da = (e) => document.querySelector(`#galleryView .gcard-slot[data-path="${CSS.escape(e)}"] .gcard`);
function fa({ file: e, text: t, view: n, closing: r, onClose: i, onClosed: a, onOpen: o }) {
	let { phrase: c } = s(), l = (0, R.useRef)(null), [u, d] = (0, R.useState)(null), [f, p] = (0, R.useState)(null), m = ea(n, e, u), h = m.map((e) => e.shot && e.shot !== "failed" ? e.shot : n.status === "done" ? n.image : null).every((e) => e && e.w > e.h * Qi) ? "col" : "row", g = n.status === "done" ? n.sheets : 0, _ = (0, R.useRef)({ onClosed: a });
	return _.current = { onClosed: a }, (0, R.useEffect)(() => {
		let t = !0;
		return j(e.path).then((e) => e ?? { sheets: [] }, () => ({ sheets: [] })).then((e) => {
			t && d(e);
		}), () => {
			t = !1;
		};
	}, [e.path]), (0, R.useLayoutEffect)(() => {
		let t = document.documentElement, n = document.body, r = [
			t.style.overflow,
			n.style.overflow,
			t.style.scrollbarGutter
		];
		t.style.scrollbarGutter = "stable", t.style.overflow = n.style.overflow = "hidden";
		let i = document.querySelector("#galleryView .gallery-in");
		i?.setAttribute("inert", "");
		let a = da(e.path)?.getBoundingClientRect(), o = l.current, s = Math.min(Ji, Math.max(qi, (a?.width ?? qi) * Ki), innerWidth - 32), c = `${Math.round(s * Xi - Zi)}px`;
		o.style.width = `${s}px`, o.style.setProperty("--stage-h", c);
		let u = o.offsetHeight, d = a ? a.left + a.width / 2 : innerWidth / 2, f = a ? a.top + a.height / 2 : innerHeight / 2;
		return p({
			width: s,
			left: Math.min(Math.max(Yi, d - s / 2), innerWidth - s - Yi),
			top: Math.max(Yi, Math.min(f - u / 2, innerHeight - u - Yi)),
			"--stage-h": c
		}), () => {
			t.style.overflow = r[0], n.style.overflow = r[1], t.style.scrollbarGutter = r[2], i?.removeAttribute("inert");
			let a = da(e.path);
			a && (a.style.visibility = ""), l.current && la(l.current);
		};
	}, []), (0, R.useLayoutEffect)(() => {
		if (!f) return;
		let t = da(e.path), n = l.current, r = I("--duration-long3"), i = ge("--easing-spring"), a = I("--duration-medium2");
		if (n.parentElement.querySelector(".gsheet-scrim").animate([{ opacity: 0 }, { opacity: 1 }], { duration: a }), n.querySelector(".gsheet-go")?.focus({ preventScroll: !0 }), !t || ve.matches || !ia(t.getBoundingClientRect())) {
			n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: a });
			return;
		}
		let o = [];
		for (let e of ca(t, n)) o.push(e.el.animate(e.kf, {
			duration: r,
			easing: i
		})), e.fade && e.el.animate([{ opacity: 0 }, { opacity: 1 }], {
			duration: a,
			delay: r * .35,
			fill: "backwards"
		}), e.op && o.push(e.el.animate([{ opacity: e.op[0] }, { opacity: e.op[1] }], {
			delay: r * e.op[2],
			duration: r * (e.op[3] - e.op[2]),
			fill: "both"
		}));
		t.style.visibility = "hidden", Promise.all(o.map((e) => e.finished)).then(() => {
			la(n), n.getAnimations({ subtree: !0 }).forEach((e) => {
				e.effect?.getKeyframes().some((e) => "opacity" in e) && e.cancel();
			});
		}).catch(() => void 0);
	}, [f]), (0, R.useLayoutEffect)(() => {
		if (!r) return;
		let t = da(e.path), n = l.current, i = !0, a = () => {
			i && (n.parentElement.style.visibility = "hidden", document.querySelector("#galleryView .gallery-in")?.removeAttribute("inert"), t && (t.style.visibility = "", t.querySelector(".gcard-hit")?.focus({ preventScroll: !0 })), _.current.onClosed());
		}, o = I("--duration-long1"), s = ge("--easing-standard"), c = I("--duration-short2");
		n.parentElement.getAnimations({ subtree: !0 }).forEach((e) => e.cancel()), la(n), n.classList.add("closing");
		let u = [n.parentElement.querySelector(".gsheet-scrim").animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: o,
			easing: s,
			fill: "forwards"
		})];
		if (t && !ve.matches && ia(t.getBoundingClientRect())) for (let e of ca(t, n)) u.push(e.el.animate(ua(e.kf), {
			duration: o,
			easing: s,
			fill: "forwards"
		})), e.fade && u.push(e.el.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: c,
			fill: "forwards"
		})), e.op && u.push(e.el.animate([{ opacity: e.op[1] }, { opacity: e.op[0] }], {
			delay: o * (1 - e.op[3]),
			duration: o * (e.op[3] - e.op[2]),
			fill: "both"
		}));
		else u.push(n.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: I("--duration-short4"),
			easing: s,
			fill: "forwards"
		}));
		return Promise.all(u.map((e) => e.finished)).then(a).catch(() => void 0), () => {
			i = !1;
		};
	}, [r]), /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "gsheet-layer",
		children: [/* @__PURE__ */ (0, z.jsx)("div", {
			className: "gsheet-scrim",
			onClick: i
		}), /* @__PURE__ */ (0, z.jsxs)("section", {
			ref: l,
			className: "gsheet",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": t.name,
			"data-cap": m.some((e) => e.label) || void 0,
			style: f ?? { visibility: "hidden" },
			children: [
				/* @__PURE__ */ (0, z.jsx)("span", { className: "gsheet-shell" }),
				/* @__PURE__ */ (0, z.jsx)("span", { className: "gsheet-mediabg" }),
				/* @__PURE__ */ (0, z.jsxs)("div", {
					className: "gsheet-stage",
					"data-flow": h,
					style: { "--k": m.length },
					children: [m.map((e, t) => /* @__PURE__ */ (0, z.jsxs)("span", {
						className: "gsheet-fig",
						style: { zIndex: m.length - t },
						children: [/* @__PURE__ */ (0, z.jsx)("span", {
							className: "gsheet-shot",
							"data-state": e.shot === "failed" ? "failed" : e.shot ? "done" : "loading",
							children: e.shot === "failed" ? /* @__PURE__ */ (0, z.jsx)("span", {
								className: "gsheet-failed",
								children: c("gallery.failed")
							}) : e.shot ? /* @__PURE__ */ (0, z.jsx)("img", {
								src: e.shot.url,
								width: e.shot.w,
								height: e.shot.h,
								alt: ""
							}) : /* @__PURE__ */ (0, z.jsx)("span", { className: "gcard-ph" })
						}), e.label && /* @__PURE__ */ (0, z.jsx)("span", {
							className: "gsheet-cap",
							children: e.label
						})]
					}, t)), g > 1 && /* @__PURE__ */ (0, z.jsxs)("span", {
						className: "gcard-count",
						"aria-label": c("board.count", { n: g }),
						children: [/* @__PURE__ */ (0, z.jsx)(ra, {}), g]
					})]
				}),
				/* @__PURE__ */ (0, z.jsxs)("div", {
					className: "gsheet-body",
					children: [
						/* @__PURE__ */ (0, z.jsx)("span", {
							className: "gsheet-file",
							children: t.name
						}),
						/* @__PURE__ */ (0, z.jsxs)("span", {
							className: "gsheet-pkgrow",
							children: [/* @__PURE__ */ (0, z.jsx)(na, {}), /* @__PURE__ */ (0, z.jsx)("span", {
								className: "gsheet-pkg",
								children: t.pkg
							})]
						}),
						/* @__PURE__ */ (0, z.jsxs)("span", {
							className: "gsheet-foot",
							children: [/* @__PURE__ */ (0, z.jsxs)("span", {
								className: "gsheet-meta",
								children: [t.mod && /* @__PURE__ */ (0, z.jsx)("span", {
									className: "gsheet-mod",
									children: t.mod
								}), /* @__PURE__ */ (0, z.jsx)("span", {
									className: "gsheet-info",
									children: t.changed
								})]
							}), /* @__PURE__ */ (0, z.jsxs)("button", {
								className: "gsheet-go",
								type: "button",
								onClick: o,
								children: [/* @__PURE__ */ (0, z.jsx)("span", { children: c("gallery.sheet.open") }), /* @__PURE__ */ (0, z.jsx)(ta, {})]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, z.jsx)("button", {
					className: "gsheet-close",
					type: "button",
					onClick: i,
					children: c("gallery.sheet.close")
				})
			]
		})]
	});
}
// src/components/Gallery.tsx
var pa = Gi(A);
function ma(e) {
	let t = null;
	return () => t ??= (() => {
		let t = /* @__PURE__ */ new Map(), n = new IntersectionObserver((e) => {
			for (let n of e) t.get(n.target)?.(n.isIntersecting);
		}, { rootMargin: e });
		return { add(e, r) {
			return t.set(e, r), n.observe(e), () => {
				t.delete(e), n.unobserve(e);
			};
		} };
	})();
}
var ha = ma("0px"), ga = ma("200% 0px"), _a = () => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", {
		d: "M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), va = () => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", {
		d: "M2 4.5V12.5h12V5.5H8L6.5 4H2z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), ya = () => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 18 18",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", {
		d: "M3 3h5v5H3zM10 3h5v5h-5zM3 10h5v5H3zM10 10h5v5h-5z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3"
	})
});
function ba({ text: e, className: t }) {
	let n = (0, R.useRef)(null), [r, i] = (0, R.useState)(e);
	return (0, R.useLayoutEffect)(() => {
		let t = n.current, r = () => {
			t.clientWidth && i(Wt(e, t.clientWidth, Ut(t)));
		};
		r();
		let a = new ResizeObserver(r);
		return a.observe(t), () => a.disconnect();
	}, [e]), /* @__PURE__ */ (0, z.jsx)("span", {
		ref: n,
		className: t,
		title: r === e ? void 0 : e,
		children: r
	});
}
var xa = (0, R.memo)(function({ text: e, view: t, near: n = !0, onOpen: r, onLost: i }) {
	let { phrase: a, daemonText: o } = s(), c = t.status === "done" ? "done" : t.status === "error" ? "failed" : "loading", l = t.status !== "done" || t.image.w <= t.image.h, u = t.status === "done" ? t.sheets : 0;
	return /* @__PURE__ */ (0, z.jsx)("article", {
		className: "gcard",
		"data-state": c,
		"aria-busy": c === "loading",
		children: /* @__PURE__ */ (0, z.jsxs)("button", {
			className: "gcard-hit",
			type: "button",
			"aria-haspopup": "dialog",
			onClick: r,
			children: [/* @__PURE__ */ (0, z.jsxs)("span", {
				className: "gcard-cover",
				children: [t.status === "error" ? /* @__PURE__ */ (0, z.jsx)("span", {
					className: "gcard-failed",
					title: o(t.failure) || void 0,
					children: a("gallery.failed")
				}) : /* @__PURE__ */ (0, z.jsxs)("span", {
					className: "gcard-stack",
					"data-o": l ? "tall" : "wide",
					children: [(u > 2 ? ["l", "r"] : u > 1 ? ["r"] : []).map((e) => /* @__PURE__ */ (0, z.jsx)("span", {
						className: "gcard-ghost",
						"data-g": e
					}, e)), /* @__PURE__ */ (0, z.jsx)("span", {
						className: "gcard-shot",
						children: t.status === "done" && n ? /* @__PURE__ */ (0, z.jsx)("img", {
							src: t.image.url,
							width: t.image.w,
							height: t.image.h,
							alt: "",
							decoding: "async",
							onLoad: (e) => e.currentTarget.classList.add("in"),
							onError: i
						}) : /* @__PURE__ */ (0, z.jsx)("span", { className: "gcard-ph" })
					})]
				}), u > 1 && /* @__PURE__ */ (0, z.jsxs)("span", {
					className: "gcard-count",
					"aria-label": a("board.count", { n: u }),
					children: [/* @__PURE__ */ (0, z.jsx)(_a, {}), u]
				})]
			}), /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "gcard-body",
				children: [
					/* @__PURE__ */ (0, z.jsx)(ba, {
						className: "gcard-file",
						text: e.name
					}),
					/* @__PURE__ */ (0, z.jsxs)("span", {
						className: "gcard-pkgrow",
						children: [/* @__PURE__ */ (0, z.jsx)(va, {}), /* @__PURE__ */ (0, z.jsx)(ba, {
							className: "gcard-pkg",
							text: e.pkg
						})]
					}),
					/* @__PURE__ */ (0, z.jsxs)("span", {
						className: "gcard-foot",
						children: [e.mod && /* @__PURE__ */ (0, z.jsx)("span", {
							className: "gcard-mod",
							children: e.mod
						}), /* @__PURE__ */ (0, z.jsx)("span", {
							className: "gcard-info",
							children: e.changed
						})]
					})
				]
			})]
		})
	});
}), Sa = (0, R.memo)(function({ f: e, order: t, name: n, pkg: r, mod: i, changed: a, cards: o, onOpen: s }) {
	let c = (0, R.useRef)(null), l = Ui(e), u = (0, R.useSyncExternalStore)(o.subscribe, () => o.get(l)), [d, f] = (0, R.useState)(!1);
	(0, R.useEffect)(() => {
		let n = c.current, r = ha().add(n, (n) => n ? o.want(l, e.path, t) : o.drop(l)), i = ga().add(n, f);
		return () => {
			r(), i(), o.drop(l);
		};
	}, [
		l,
		t,
		o
	]);
	let p = (0, R.useMemo)(() => ({
		name: n,
		pkg: r,
		mod: i,
		changed: a
	}), [
		n,
		r,
		i,
		a
	]), m = (0, R.useCallback)(() => s(e), [s, e]), h = (0, R.useCallback)(() => o.lost(l, e.path, t), [
		o,
		l,
		e,
		t
	]);
	return /* @__PURE__ */ (0, z.jsx)("div", {
		ref: c,
		className: "gcard-slot",
		"data-path": e.path,
		children: /* @__PURE__ */ (0, z.jsx)(xa, {
			text: p,
			view: u,
			near: d,
			onOpen: m,
			onLost: h
		})
	});
});
async function Ca(e, { phrase: t, daemonText: n }) {
	if (e.path === H(L.st)) {
		Ge();
		return;
	}
	let r = await P("/viewer/open", { file: e.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	r.ok || F(n(r.message) || t("open.cannot"));
}
var wa = (0, R.memo)(function({ files: e, ready: t, cards: n, now: r = Date.now(), onOpen: i }) {
	let { phrase: a } = s(), o = (0, R.useMemo)(() => e ? Hi(e) : null, [e]), c = (0, R.useMemo)(() => e ? Ri(e) : [], [e]), l = document.documentElement.lang || "en";
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "gallery-in",
		children: [/* @__PURE__ */ (0, z.jsxs)("div", {
			className: "gallery-head",
			children: [
				/* @__PURE__ */ (0, z.jsx)("h1", {
					className: "gallery-title",
					children: a("gallery.title")
				}),
				o && /* @__PURE__ */ (0, z.jsx)("span", {
					className: "gallery-n",
					children: o.length
				}),
				/* @__PURE__ */ (0, z.jsx)("span", {
					className: "gallery-sort",
					children: a("gallery.sort")
				})
			]
		}), !o || !t && !o.length ? /* @__PURE__ */ (0, z.jsx)("p", {
			className: "gallery-note",
			children: a("quickopen.loading")
		}) : o.length ? /* @__PURE__ */ (0, z.jsx)("div", {
			className: "gallery-grid",
			children: o.map((e, t) => /* @__PURE__ */ (0, z.jsx)(Sa, {
				f: e,
				order: t,
				cards: n,
				onOpen: i,
				name: Ii(e),
				pkg: zi(e, c),
				mod: Bi(e.module),
				changed: Vi(e.mtime, r, a, l)
			}, e.path))
		}) : /* @__PURE__ */ (0, z.jsx)("p", {
			className: "gallery-note",
			children: a("quickopen.none")
		})]
	});
});
function Ta({ shown: e, state: t, draw: n, host: r }) {
	let i = s(), a = ze(), { element: c, place: l } = o(r), u = (0, R.useRef)({
		gallery: 0,
		board: 0,
		over: !1
	});
	(0, R.useLayoutEffect)(() => {
		if (!t) return;
		let e = Be();
		e.open && (t.screen === "focus" || H(t) !== e.openedOver) && Ge();
	}, [n]), (0, R.useLayoutEffect)(() => {
		if (!c) return;
		let n = He();
		if (Ue(e), c.hidden = !e, pa.pause(!e), e === n) return;
		let r = t?.screen === "board" || t?.screen === "vacant";
		if (e) {
			Ye(), r && (u.current.board = scrollY), u.current.over = r;
			let e = u.current.gallery;
			queueMicrotask(() => scrollTo(0, e));
		} else if (u.current.gallery = scrollY, u.current.over && r && H(t) === Be().openedOver) {
			let e = u.current.board;
			queueMicrotask(() => scrollTo(0, e));
		}
	}, [e, c]), (0, R.useEffect)(() => {
		pa.pause(!e || !!a.sheet);
	}, [e, a.sheet]), (0, R.useEffect)(() => {
		a.sheet && (!e || a.files && !a.files.some((e) => e.path === a.sheet.path)) && qe();
	}, [
		e,
		a.files,
		a.sheet
	]);
	let d = (0, R.useRef)(i);
	d.current = i;
	let f = (0, R.useCallback)((e) => G(e.path), []), p = e && a.sheet ? a.files?.find((e) => e.path === a.sheet.path) ?? null : null;
	return l(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)(wa, {
		files: a.files,
		ready: a.ready,
		cards: pa,
		onOpen: f
	}), p && /* @__PURE__ */ (0, z.jsx)(Ea, {
		f: p,
		closing: a.sheet.closing,
		onOpen: () => Ca(p, d.current)
	}, p.path)] }), (e, t) => /* @__PURE__ */ (0, z.jsx)("section", {
		id: "galleryView",
		className: "gallery",
		ref: e,
		children: t
	}));
}
function Ea({ f: e, closing: t, onOpen: n }) {
	let { phrase: r } = s(), i = Ui(e), a = (0, R.useSyncExternalStore)(pa.subscribe, () => pa.get(i)), o = document.documentElement.lang || "en", c = (0, R.useMemo)(() => ({
		name: Ii(e),
		pkg: zi(e, []),
		mod: Bi(e.module),
		changed: Vi(e.mtime, Date.now(), r, o)
	}), [
		e,
		r,
		o
	]);
	return /* @__PURE__ */ (0, z.jsx)(fa, {
		file: e,
		text: c,
		view: a,
		closing: t,
		onClose: Ke,
		onClosed: qe,
		onOpen: n
	});
}
function Da({ on: e, count: t, host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n);
	return (0, R.useLayoutEffect)(() => {
		i && (i.classList.toggle("on", e), e ? i.setAttribute("aria-current", "page") : i.removeAttribute("aria-current"));
	}, [i, e]), (0, R.useLayoutEffect)(() => {
		if (!i) return;
		let t = () => {
			e || We();
		};
		return i.addEventListener("click", t), () => i.removeEventListener("click", t);
	}, [i, e]), a(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(ya, {}),
		/* @__PURE__ */ (0, z.jsx)("span", {
			className: "rail-open-t",
			children: r("rail.all")
		}),
		t != null && /* @__PURE__ */ (0, z.jsx)("span", {
			className: "rail-all-n",
			children: t
		})
	] }), (t, n) => /* @__PURE__ */ (0, z.jsx)("button", {
		className: e ? "rail-all on" : "rail-all",
		id: "railAll",
		ref: t,
		type: "button",
		children: n
	}));
}
// src/components/NotificationCapsule.tsx
var Oa = (0, R.memo)(function({ content: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = (0, R.useSyncExternalStore)(de, ie), { error: c, log: l, once: u } = e ?? a, d = !!(c.trim() || l.trim()) || !!u;
	(0, R.useLayoutEffect)(() => {
		r?.classList.toggle("on", d);
	}, [r, d]);
	let [f, ...p] = u ? u.text.split(/(?<=[.。])\s+/) : [];
	return i(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsxs)("div", {
		className: "cap-once",
		id: "capOnce",
		hidden: !u,
		children: [/* @__PURE__ */ (0, z.jsx)("span", {
			id: "capOnceText",
			children: u && /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("b", { children: f }), p.length ? " " + p.join(" ") : null] })
		}), /* @__PURE__ */ (0, z.jsx)("button", {
			className: "cap-x",
			id: "capOnceX",
			type: "button",
			title: n("capsule.dismiss"),
			"aria-label": n("capsule.dismiss"),
			onClick: ae,
			children: /* @__PURE__ */ (0, z.jsx)("svg", {
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, z.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
			})
		})]
	}), /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "cap-main",
		children: [/* @__PURE__ */ (0, z.jsx)("div", {
			id: "sel",
			className: c ? "error" : "",
			children: c
		}), /* @__PURE__ */ (0, z.jsx)("div", {
			className: "log",
			id: "log",
			children: l
		})]
	})] }), (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
		className: "capsule",
		id: "strip",
		ref: e,
		role: "status",
		children: t
	}));
}), ka = {
	cursor: null,
	returned: null
}, Aa = (e, t) => e.groups.flatMap((e) => e.cards).find((e) => e.index === t), ja = 300 / 360, Ma = .25, Na = 100, Pa = 160, Fa = 360, Ia = 640, La = 120;
function Ra(e, t, n) {
	let r = (t) => e.reduce((e, n) => e + Math.max(n * t, Na), 0) + n * (e.length - 1);
	if (r(ja) <= t) return {
		s: ja,
		w: r(ja),
		wrap: !1
	};
	if (r(Ma) > t) return {
		s: Math.min(ja, ...e.map((e) => e * Ma >= Na ? Ma : Na / e)),
		w: t,
		wrap: !0
	};
	let i = Ma, a = ja;
	for (let e = 0; e < 24; e++) {
		let e = (i + a) / 2;
		r(e) <= t ? i = e : a = e;
	}
	return {
		s: i,
		w: r(i),
		wrap: !1
	};
}
var za = /* @__PURE__ */ new Map();
function Ba(e, t) {
	let n = t.cards.map((t) => {
		let n = e + "|" + t.previewId, r = za.get(n);
		return t.widthDp && t.heightDp && za.set(n, [t.widthDp, t.heightDp]), [t.widthDp || r?.[0], t.heightDp || r?.[1]];
	}), r = n.filter(([e, t]) => e && t).sort((e, t) => t[0] - e[0])[0];
	return n.map(([e, n], i) => {
		let a = t.cards[i].failure && r;
		return [e || (a ? r[0] : Fa), n || (a ? r[1] : Ia)];
	});
}
function Va(e, t, n) {
	let r = e.clientWidth;
	if (!r) return 0;
	let i = e.querySelectorAll(":scope > .group"), a = i[0]?.querySelector(".board"), o = a && parseFloat(getComputedStyle(a).columnGap) || 24;
	return t.groups.forEach((a, s) => {
		let c = i[s];
		if (!c) return;
		let l = Ba(t.file, a), { s: u, w: d, wrap: f } = Ra(l.map((e) => e[0]), r, o);
		c.style.width = f ? "100%" : Math.max(Pa, d) + "px", c.querySelector(".board").classList.toggle("spill", f);
		let p = c.querySelector(".sc"), m = u < .8333323333333333, h = a.cards.some((e) => e.dpGuess);
		p.hidden = !m, p.textContent = m ? (h ? "≈" : "") + Math.round(u * 100) + "%" : "", p.title = n("zoom.tip.real") + (h ? " · " + n("board.scale.guess") : ""), a.cards.forEach((t, n) => {
			let r = e.querySelector(`.card[data-i="${t.index}"]`);
			if (!r) return;
			let [i, a] = l[n], o = Math.max(i * u, Na);
			r.style.width = o + "px";
			let s = r.querySelector(".cstage img");
			s.style.width = i * u + "px", s.style.aspectRatio = `auto ${i} / ${a}`;
			let c = r.querySelector(".ph"), d = Math.max(La, a * u);
			c.style.width = o + "px", c.style.height = d + "px", c.style.setProperty("--lines", String(Math.max(1, Math.floor((d - 55) / 16.7))));
		});
	}), r;
}
var Ha = (e) => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 12 12",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.1",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: e
}), Ua = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
	x: "3.25",
	y: "1.25",
	width: "5.5",
	height: "9.5",
	rx: "1.2"
}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M5.25 9h1.5" })] }), Wa = {
	portrait: Ha(Ua),
	landscape: Ha(/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "1.25",
		y: "3",
		width: "9.5",
		height: "6",
		rx: "1.2"
	})),
	device: Ha(Ua),
	dark: Ha(/* @__PURE__ */ (0, z.jsx)("path", { d: "M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z" })),
	font: /* @__PURE__ */ (0, z.jsx)("span", {
		className: "aa",
		children: "Aa"
	}),
	locale: Ha(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("circle", {
		cx: "6",
		cy: "6",
		r: "4.75"
	}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75" })] })),
	api: Ha(/* @__PURE__ */ (0, z.jsx)("path", { d: "M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5" })),
	systemUi: Ha(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "3.25",
		y: "1.25",
		width: "5.5",
		height: "9.5",
		rx: "1.2"
	}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M3.5 3.25h5" })] }))
}, Ga = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "currentColor",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z" })
});
function Ka({ card: e }) {
	let { daemonText: t } = s();
	return /* @__PURE__ */ (0, z.jsx)("span", {
		className: "specs",
		title: e.args,
		children: e.specs.map((e, n) => {
			let r = t(e.text), [i, a] = e.kind === "size" ? r.split("×").map(Number) : [], o = e.kind === "size" ? i > a ? "landscape" : "portrait" : e.kind;
			return /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "spec",
				children: [Wa[o] ?? null, /* @__PURE__ */ (0, z.jsxs)("span", { children: [r, e.kind === "size" && /* @__PURE__ */ (0, z.jsx)("span", {
					className: "unit",
					children: "dp"
				})] })]
			}, n);
		})
	});
}
var qa = (0, R.memo)(function({ card: e, fn: t, cursor: n = !1, returned: r = !1, actions: i }) {
	let { phrase: a, daemonText: o } = s(), c = (0, R.useRef)(null), l = (0, R.useRef)(null), u = (0, R.useRef)(null), d = (0, R.useRef)(null), f = (0, R.useRef)(null), p = !!(e.ok && e.imageUrl);
	(0, R.useLayoutEffect)(() => {
		if (!i) return;
		let t = new AbortController();
		return i.point(e.index, {
			stage: c.current,
			img: l.current,
			box: u.current,
			pick: d.current,
			marks: f.current
		}, t.signal), () => t.abort();
	}, [i, e.index]), (0, R.useLayoutEffect)(() => {
		let t = l.current;
		p ? (t.dataset.url !== e.imageUrl && (ye(t, e.imageUrl), u.current.classList.remove("on"), d.current.hidden = !0), t.hidden = !1) : t.hidden = !0;
	}, [p, e.imageUrl]);
	let m = !p && e.failure ? o(e.failure) : null;
	return /* @__PURE__ */ (0, z.jsxs)("article", {
		"data-i": e.index,
		"data-fn": t,
		className: [
			"card",
			e.isFocus && "focus",
			e.stale && "stale",
			!e.label && "noname",
			n && "cursor",
			r && "returned"
		].filter(Boolean).join(" "),
		children: [/* @__PURE__ */ (0, z.jsxs)("div", {
			className: "label",
			children: [
				/* @__PURE__ */ (0, z.jsx)("span", {
					className: "fn",
					title: e.label ? e.label + "\n" + e.title : e.title,
					children: e.label
				}),
				/* @__PURE__ */ (0, z.jsxs)("button", {
					className: "go",
					type: "button",
					title: a("card.go.tip"),
					onClick: () => {
						C(e.index), i?.open(e.index);
					},
					children: [Ga, /* @__PURE__ */ (0, z.jsx)("span", {
						className: "go-t",
						children: a("card.go")
					})]
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "sub",
					children: /* @__PURE__ */ (0, z.jsx)(Ka, { card: e })
				})
			]
		}), /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "cstage",
			ref: c,
			children: [
				/* @__PURE__ */ (0, z.jsx)("img", {
					alt: "",
					hidden: !0,
					ref: l
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "marks",
					"aria-hidden": "true",
					ref: f
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "box",
					ref: u
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "box pick",
					hidden: !0,
					ref: d
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: m ? "ph bad" : "ph",
					hidden: p,
					title: m ?? "",
					children: m ? /* @__PURE__ */ (0, z.jsx)("span", {
						className: "why",
						children: m
					}) : a("card.waiting")
				})
			]
		})]
	});
});
function Ja({ group: e, marks: t = ka, actions: n }) {
	let { phrase: r } = s(), i = e.cards.every((e) => !e.label);
	return /* @__PURE__ */ (0, z.jsxs)("section", {
		className: i ? "group nameless" : "group",
		"data-fn": e.name,
		children: [/* @__PURE__ */ (0, z.jsxs)("div", {
			className: "ghead",
			children: [/* @__PURE__ */ (0, z.jsx)("span", {
				className: "gn",
				title: e.name,
				children: e.name
			}), /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "m",
				children: [
					/* @__PURE__ */ (0, z.jsx)("span", {
						className: "n",
						children: r("board.count", { n: e.cards.length })
					}),
					/* @__PURE__ */ (0, z.jsx)("span", {
						className: "sc",
						hidden: !0
					}),
					/* @__PURE__ */ (0, z.jsx)("span", {
						className: "bad",
						children: e.failed ? `· ${r("board.failed", { n: e.failed })}` : ""
					})
				]
			})]
		}), /* @__PURE__ */ (0, z.jsx)("div", {
			className: "gbody",
			children: /* @__PURE__ */ (0, z.jsx)("div", {
				className: "board",
				children: e.cards.map((r) => /* @__PURE__ */ (0, z.jsx)(qa, {
					card: r,
					fn: e.name,
					cursor: t.cursor === r.index,
					returned: t.returned === r.index,
					actions: n
				}, r.index))
			})
		})]
	});
}
function Ya({ board: e, screen: t, hosts: n, actions: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n?.cards), [l, u] = (0, R.useState)(null), d = n?.view ?? l, f = (0, R.useSyncExternalStore)(T, p), m = (0, R.useRef)({
		board: null,
		live: null
	}), h = (0, R.useMemo)(() => {
		let n = m.current;
		if (t === "focus" && e) return n.live = Aa(e, e.focus)?.imageUrl ?? null, n.board;
		let r = e && Aa(e, e.focus);
		return e && n.board?.file === e.file && n.live && r?.imageUrl === n.live ? {
			...n.board,
			focus: e.focus
		} : (n.board = e, n.live = null, e);
	}, [e, t]), g = h ? h.file + "|" + h.groups.map((e) => e.cards.map((e) => e.previewId).join(",")).join("|") : "";
	(0, R.useLayoutEffect)(() => {
		_();
	}, [g]);
	let v = (0, R.useRef)(h), b = (0, R.useRef)(i), x = (0, R.useRef)(0);
	v.current = h, b.current = i, (0, R.useLayoutEffect)(() => {
		d && (t !== null && (d.hidden = t !== "board"), t !== "focus" && (E(h), h && a && (x.current = Va(a, h, i) || x.current)));
	}, [
		h,
		t,
		d,
		a
	]), (0, R.useEffect)(() => {
		if (!a) return;
		let e = () => {
			v.current && (x.current = Va(a, v.current, b.current) || x.current);
		}, t = new ResizeObserver(() => {
			let t = a.clientWidth;
			t && t !== x.current && e();
		});
		return t.observe(a), y(e), () => {
			t.disconnect(), y(() => {});
		};
	}, [a]);
	let S = h && /* @__PURE__ */ (0, z.jsx)(R.Fragment, { children: h.groups.map((e, t) => /* @__PURE__ */ (0, z.jsx)(Ja, {
		group: e,
		marks: f,
		actions: r
	}, t)) }, g);
	return n ? c(S, () => null) : /* @__PURE__ */ (0, z.jsx)("section", {
		id: "boardView",
		ref: u,
		children: c(S, (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
			className: "board",
			id: "cards",
			ref: e,
			children: t
		}))
	});
}
// src/components/StaleBanner.tsx
function Xa({ rows: e, host: t }) {
	let { daemonText: n } = s(), { element: r, place: i } = o(t), a = (0, R.useRef)([]);
	e?.length && (a.current = e);
	let c = !!e?.length;
	return (0, R.useLayoutEffect)(() => {
		r && e && (r.classList.toggle("on", c), t && document.body.classList.toggle("stale", c));
	}, [
		r,
		t,
		e,
		c
	]), i(/* @__PURE__ */ (0, z.jsx)("div", {
		className: "in",
		children: /* @__PURE__ */ (0, z.jsx)("div", {
			className: "rows",
			id: "staleRows",
			children: a.current.map((e, t) => /* @__PURE__ */ (0, z.jsxs)("div", {
				className: "row",
				children: [/* @__PURE__ */ (0, z.jsx)("span", {
					className: "head",
					children: n(e.head)
				}), /* @__PURE__ */ (0, z.jsx)("span", {
					className: "why",
					children: e.why.map(n).join(" · ")
				})]
			}, t))
		})
	}), (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
		className: "stalebar",
		id: "staleBar",
		ref: e,
		children: t
	}));
}
// src/components/StatusPill.tsx
function Za({ state: e, connection: t = null, host: n, bar: r }) {
	let { phrase: i, daemonText: a } = s(), { element: c, place: l } = o(n), u = e?.timing.find((e) => e.head), d = !!e?.timing.some((e) => e.over), f = !!e && (!!e.error || e.stale.length > 0 || !!e.board?.groups.some((e) => e.failed)), p = e ? e.busy ? "busy" : f ? "error" : d ? "over" : u ? "idle" : "none" : "none", m = e ? e.busy ? a(e.boardNote) : u ? u.text : "" : "";
	t === "restarting" && (p = "busy", m = i("status.restarting")), t === "lost" && (p = "error", m = i("status.lost.short"));
	let h = t === "restarting" || t !== "lost" && !!e?.busy;
	return (0, R.useLayoutEffect)(() => {
		c && (e || t) && (c.dataset.state = p);
	}, [
		c,
		e,
		t,
		p
	]), (0, R.useLayoutEffect)(() => {
		r && (e || t) && r.classList.toggle("busy", h);
	}, [
		r,
		e,
		t,
		h
	]), l(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsxs)("span", {
			className: "st-ic",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, z.jsx)("svg", {
					className: "i-ok",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					children: /* @__PURE__ */ (0, z.jsx)("path", { d: "m3.5 8.5 3 3 6-7" })
				}),
				/* @__PURE__ */ (0, z.jsx)("svg", {
					className: "i-busy",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M8 2.5a5.5 5.5 0 1 1-5.5 5.5" })
				}),
				/* @__PURE__ */ (0, z.jsxs)("svg", {
					className: "i-bad",
					viewBox: "0 0 16 16",
					children: [
						/* @__PURE__ */ (0, z.jsx)("circle", {
							cx: "8",
							cy: "8",
							r: "6.5",
							fill: "currentColor"
						}),
						/* @__PURE__ */ (0, z.jsx)("path", {
							className: "mark",
							d: "M8 4.8v3.8",
							strokeWidth: "1.7",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ (0, z.jsx)("circle", {
							className: "mark",
							cx: "8",
							cy: "11.2",
							r: ".95"
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, z.jsx)("span", {
			className: "st-text",
			id: "statusText",
			children: m
		}),
		/* @__PURE__ */ (0, z.jsxs)("div", {
			className: "pop",
			role: "tooltip",
			children: [
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "note",
					id: "note",
					children: a(e?.boardNote ?? null)
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "who",
					id: "who",
					children: a(e?.who ?? null)
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "settle",
					id: "settle",
					children: a(e?.settle ?? null)
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "timing",
					id: "timing",
					children: e?.timing.flatMap((e, t) => [/* @__PURE__ */ (0, z.jsx)("span", {
						className: e.over ? "over" : void 0,
						children: a(e.label)
					}, `k${t}`), /* @__PURE__ */ (0, z.jsx)("b", {
						className: e.over ? "over" : void 0,
						children: e.text
					}, `v${t}`)])
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "where",
					id: "where",
					children: e ? location.host : ""
				})
			]
		})
	] }), (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
		className: "status",
		id: "status",
		ref: e,
		tabIndex: 0,
		"data-state": "none",
		children: t
	}));
}
// src/components/PointOverlay.tsx
var Qa = {
	choose() {},
	cancel() {},
	follow() {},
	pick() {},
	peek() {},
	jump() {},
	close() {}
}, $ = (e) => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), $a = $(/* @__PURE__ */ (0, z.jsx)("path", { d: "M4 4l8 8M12 4l-8 8" })), eo = $(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
	/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "2",
		y: "3",
		width: "12",
		height: "10",
		rx: "1.5"
	}),
	/* @__PURE__ */ (0, z.jsx)("path", { d: "M2.5 11.5L6 8l2.5 2.5 2-2 3 3" }),
	/* @__PURE__ */ (0, z.jsx)("circle", {
		cx: "10.5",
		cy: "6",
		r: "0.75",
		fill: "currentColor",
		stroke: "none"
	})
] })), to = {
	width: $(/* @__PURE__ */ (0, z.jsx)("path", { d: "M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5" })),
	height: $(/* @__PURE__ */ (0, z.jsx)("path", { d: "M8 2v12M5.5 4.5 8 2l2.5 2.5M5.5 11.5 8 14l2.5-2.5" })),
	size: $(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M2.5 6V2.5H6M10 13.5h3.5V10" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M2.5 2.5l11 11" })] })),
	padding: $(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "2.5",
		y: "2.5",
		width: "11",
		height: "11",
		rx: "1.5"
	}), /* @__PURE__ */ (0, z.jsx)("rect", {
		x: "5.5",
		y: "5.5",
		width: "5",
		height: "5",
		rx: "0.5",
		strokeDasharray: "1.5 1.5"
	})] })),
	click: $(/* @__PURE__ */ (0, z.jsx)("path", { d: "M5 2.5l7.5 4.8-3.4.9 2 3.4-1.6.9-2-3.4L5 11.5z" })),
	text: $(/* @__PURE__ */ (0, z.jsx)("path", { d: "M3.5 3.5h9M8 3.5v9M6 12.5h4" })),
	color: $(/* @__PURE__ */ (0, z.jsx)("path", { d: "M8 2.5S4 7 4 9.75a4 4 0 0 0 8 0C12 7 8 2.5 8 2.5z" }))
};
function no(e) {
	let t = /#L(\d+)$/.exec(e), n = e.replace(/^@/, "").replace(/#L\d+$/, "");
	return t ? `${n.slice(n.lastIndexOf("/") + 1)}:${t[1]}` : n;
}
function ro(e, t) {
	let n = t && e.startsWith(t + "/") ? e.slice(t.length + 1) : e, r = n.lastIndexOf("/") + 1, i = n.indexOf("/src/");
	return (i > 0 && i < r ? n.slice(0, i) + "/…/" : n.slice(0, r)) + n.slice(r);
}
function io(e, t) {
	let n = (e.uchain || e.chain || []).slice(-6).join(" › ");
	return (t.ref ? [
		t.ref,
		e.name,
		n
	] : [t.msg, n]).filter(Boolean).join("\n");
}
var ao = [.5, 3.2], oo = 2, so = (e) => String(Math.round(e * 10) / 10), co = () => typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, lo = (e) => {
	e.button === 0 && e.target.closest("button") && e.preventDefault();
};
function uo({ row: e, here: t, actions: n, children: r }) {
	return /* @__PURE__ */ (0, z.jsxs)("li", {
		className: `pc-node${t ? " here" : ""}`,
		"data-id": e.id,
		children: [/* @__PURE__ */ (0, z.jsx)("div", {
			className: "pc-row",
			onMouseEnter: () => n.peek(e),
			onMouseLeave: () => n.peek(null),
			children: /* @__PURE__ */ (0, z.jsx)("button", {
				type: "button",
				className: "pc-pick",
				"aria-current": t ? "true" : void 0,
				onFocus: () => n.peek(e),
				onBlur: () => n.peek(null),
				onClick: () => n.pick(e),
				children: e.name
			})
		}), r]
	});
}
function fo({ tree: e, actions: t, settled: n }) {
	let { ups: r, here: i, before: a, after: o, downs: s } = e, [c, l] = (0, R.useState)(null), [u, d] = (0, R.useState)(!1), f = (0, R.useRef)(null);
	(0, R.useLayoutEffect)(() => {
		let e = f.current;
		if (e && e.here !== i.id) {
			d(!s.some((t) => t.id === e.here));
			let t = [
				...a,
				...o,
				...s
			], n = new Set([
				...r,
				i,
				...t
			].map((e) => e.id)), c = e.downs.filter((e) => !n.has(e.id));
			l(c.length && t.some((t) => t.id === e.here) ? {
				at: e.here,
				rows: c
			} : null);
		}
		f.current = {
			here: i.id,
			downs: s
		};
	}, [i.id]);
	let p = (e) => c?.at === e.id ? /* @__PURE__ */ (0, z.jsx)("div", {
		className: "pc-foldout",
		inert: !0,
		onAnimationEnd: (e) => {
			e.target === e.currentTarget && (l(null), n());
		},
		children: /* @__PURE__ */ (0, z.jsx)("ul", {
			className: "pc-group",
			children: c.rows.map((e) => /* @__PURE__ */ (0, z.jsx)(uo, {
				row: e,
				actions: t
			}, e.id))
		})
	}, `fold-${e.id}`) : void 0, m = (e) => /* @__PURE__ */ (0, z.jsx)(uo, {
		row: e,
		actions: t,
		children: p(e)
	}, e.id), h = s.length ? /* @__PURE__ */ (0, z.jsx)("div", {
		className: u ? "pc-unfold" : void 0,
		onAnimationEnd: (e) => {
			e.target === e.currentTarget && n();
		},
		children: /* @__PURE__ */ (0, z.jsx)("ul", {
			className: "pc-group",
			children: s.map(m)
		})
	}, `unfold-${i.id}`) : null, g = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		a.map(m),
		/* @__PURE__ */ (0, z.jsx)(uo, {
			row: i,
			here: !0,
			actions: t,
			children: h
		}, i.id),
		o.map(m)
	] }), _ = Math.max(0, r.length - oo), v = r.slice(_).reduceRight((e, n) => /* @__PURE__ */ (0, z.jsx)(uo, {
		row: n,
		actions: t,
		children: /* @__PURE__ */ (0, z.jsx)("ul", {
			className: "pc-group",
			children: e
		})
	}, n.id), g);
	return /* @__PURE__ */ (0, z.jsxs)("ul", {
		className: "pc-tree",
		children: [r.slice(0, _).map((e) => /* @__PURE__ */ (0, z.jsx)(uo, {
			row: e,
			actions: t
		}, e.id)), v]
	});
}
function po({ say: e }) {
	let { phrase: t } = s();
	return e.copied === !1 ? e.again ? /* @__PURE__ */ (0, z.jsx)("button", {
		type: "button",
		className: "pc-rescue",
		title: t("point.card.retry.title", { ref: e.ref ?? "" }),
		onClick: e.again,
		children: t("point.card.retry")
	}) : /* @__PURE__ */ (0, z.jsx)("span", {
		className: "pc-rescue off",
		children: t("point.card.blocked")
	}) : null;
}
var mo = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 24 24",
	fill: "currentColor",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M12.135.003a2.577 2.577 0 0 0-1.42.344L2.55 5.06a2.577 2.577 0 0 0-.953.967l3.957 2.17a1.765 1.765 0 0 1 .603-.588l4.951-2.86a1.761 1.761 0 0 1 1.76 0l4.951 2.86a1.753 1.753 0 0 1 .526.46l3.921-2.265a2.577 2.577 0 0 0-.816-.744L13.291.347a2.577 2.577 0 0 0-1.152-.34Zm-.145 4.912a1.36 1.36 0 0 0-.68.182L6.36 7.953a1.345 1.345 0 0 0-.454.435l1.92 1.055a1.05 1.05 0 0 1 .31-.275l3.34-1.928a1.054 1.054 0 0 1 1.051 0l3.336 1.928a1.066 1.066 0 0 1 .238.199l.018-.01-.002-.002 1.877-1.08a1.353 1.353 0 0 0-.373-.322l-4.95-2.86a1.357 1.357 0 0 0-.68-.178Zm10.432 1.149-3.92 2.26a1.757 1.757 0 0 1 .2.812v5.715c0 .627-.332 1.21-.88 1.528l-4.95 2.86a1.761 1.761 0 0 1-.64.214v4.524a2.577 2.577 0 0 0 1.059-.313l8.162-4.713a2.577 2.577 0 0 0 1.289-2.23V7.297a2.577 2.577 0 0 0-.318-1.228Zm-20.937.238a2.577 2.577 0 0 0-.227.99v9.43c0 .918.491 1.767 1.293 2.229l8.162 4.713a2.57 2.57 0 0 0 1.225.336v-4.531a1.761 1.761 0 0 1-.833-.235L6.156 16.38a1.765 1.765 0 0 1-.877-1.528V9.136a1.776 1.776 0 0 1 .131-.676Zm16.67 2.223-1.89 1.092a1.058 1.058 0 0 1 .124.46v3.856c0 .378-.2.72-.526.907l-3.336 1.93a1.04 1.04 0 0 1-.295.107v2.17c.152-.027.304-.078.44-.157l4.949-2.859a1.36 1.36 0 0 0 .68-1.18V9.136a1.36 1.36 0 0 0-.147-.607Zm-12.387.13a1.36 1.36 0 0 0-.088.481v5.715a1.36 1.36 0 0 0 .68 1.18l4.95 2.86c.194.112.412.166.627.177v-2.174a1.054 1.054 0 0 1-.46-.123L8.14 14.843a1.054 1.054 0 0 1-.532-.908v-3.853a.99.99 0 0 1 .077-.38l-.034-.013z" })
}), ho = $(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M8 4.5C6.6 3.4 4.6 3 2.5 3.2v9.1c2.1-.2 4.1.2 5.5 1.3 1.4-1.1 3.4-1.5 5.5-1.3V3.2C11.4 3 9.4 3.4 8 4.5z" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M8 4.5v9" })] }));
function go({ origin: e }) {
	let { phrase: t } = s();
	return e ? e === "compose" ? /* @__PURE__ */ (0, z.jsxs)("span", {
		className: "pc-chip compose",
		title: t("point.card.compose.title"),
		children: [mo, t("point.card.compose")]
	}) : e === "library" ? /* @__PURE__ */ (0, z.jsxs)("span", {
		className: "pc-chip library",
		title: t("point.card.library.title"),
		children: [ho, t("point.card.library")]
	}) : /* @__PURE__ */ (0, z.jsx)("span", {
		className: "pc-chip module",
		title: t("point.card.module.title", { module: e.module }),
		children: e.module
	}) : null;
}
function _o({ box: e }) {
	let t = e.width > 0 && e.height > 0 ? e.width / e.height : 1, n = Math.min(ao[1], Math.max(ao[0], t));
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "pc-size",
		children: [/* @__PURE__ */ (0, z.jsx)("div", {
			className: "pc-glyph",
			children: /* @__PURE__ */ (0, z.jsx)("div", {
				className: `pc-shape${e.padded ? " padded" : ""}`,
				style: { "--ratio": n },
				children: e.padded && /* @__PURE__ */ (0, z.jsx)("i", {})
			})
		}), /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "pc-dims",
			children: [
				so(e.width),
				/* @__PURE__ */ (0, z.jsx)("i", { children: "×" }),
				so(e.height),
				/* @__PURE__ */ (0, z.jsx)("span", {
					className: "pc-unit",
					children: e.unit
				})
			]
		})]
	});
}
function vo(e) {
	return e.sizes?.length ? e.sizes.length === 2 ? "size" : e.sizes[0] : e.color ? "color" : {
		padding: "padding",
		clickable: "click",
		text: "text"
	}[e.name] ?? null;
}
function yo({ modifiers: e }) {
	let { phrase: t } = s();
	return /* @__PURE__ */ (0, z.jsx)("div", {
		className: "pc-mods",
		children: /* @__PURE__ */ (0, z.jsx)("ol", {
			className: "pc-scroll",
			tabIndex: 0,
			"aria-label": t("point.card.modifiers"),
			children: e.map((e, n) => {
				let r = vo(e);
				return /* @__PURE__ */ (0, z.jsxs)("li", { children: [
					r ? /* @__PURE__ */ (0, z.jsx)("span", {
						className: "pc-kind",
						title: t(`point.card.kind.${r}`),
						"aria-label": t(`point.card.kind.${r}`),
						children: to[r]
					}) : /* @__PURE__ */ (0, z.jsx)("span", { className: "pc-kind" }),
					/* @__PURE__ */ (0, z.jsx)("span", {
						className: "pc-mod-name",
						children: e.name
					}),
					(e.value || e.color) && /* @__PURE__ */ (0, z.jsxs)("span", {
						className: "pc-mod-value",
						title: e.value,
						children: [e.color && /* @__PURE__ */ (0, z.jsx)("i", {
							className: "pc-swatch",
							style: { background: e.color }
						}), /* @__PURE__ */ (0, z.jsx)("span", { children: e.value })]
					})
				] }, `${n}-${e.name}`);
			})
		})
	});
}
function bo({ card: e, actions: t = Qa }) {
	let { phrase: n } = s(), { node: r, say: i, box: a, tree: o, modifiers: c, previews: l, origin: u } = e, d = (0, R.useRef)(null), f = (0, R.useRef)(!1), p = (e) => {
		let t = d.current, n = t?.querySelector(".pc-node.here > .pc-row");
		if (!t || !n) return;
		let r = t.scrollTop + n.getBoundingClientRect().top - t.getBoundingClientRect().top - (t.clientHeight - n.offsetHeight) / 2;
		t.scrollTo({
			top: r,
			behavior: e && !co() ? "smooth" : "auto"
		});
	}, m = o?.here.id;
	(0, R.useLayoutEffect)(() => {
		p(f.current), f.current = !0;
	}, [m]);
	let [h, g] = (0, R.useState)(!1);
	(0, R.useEffect)(() => g(!1), [m, r.lineNumber]);
	let _ = i.file ? `${i.file.slice(i.file.lastIndexOf("/") + 1)}:${r.lineNumber}` : i.ref ? no(i.ref) : "", v = l.length > 1, y = v ? n("point.card.previews", { n: l.length }) : l[0] && n("point.card.jump", { name: l[0].fn }), b = m ?? `${r.name}:${r.lineNumber}`;
	return /* @__PURE__ */ (0, z.jsx)("section", {
		className: "point-card",
		"aria-label": n("point.card.label"),
		onMouseDown: lo,
		children: /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "pc-body",
			children: [
				/* @__PURE__ */ (0, z.jsxs)("header", {
					className: "pc-head",
					children: [
						/* @__PURE__ */ (0, z.jsxs)("div", {
							className: "pc-id pc-swap",
							title: io(r, i),
							children: [/* @__PURE__ */ (0, z.jsxs)("span", {
								className: "pc-nameline",
								children: [/* @__PURE__ */ (0, z.jsx)("span", {
									className: "pc-name",
									children: r.name || r.fileName
								}), /* @__PURE__ */ (0, z.jsx)(go, { origin: u })]
							}), i.ref && /* @__PURE__ */ (0, z.jsxs)("span", {
								className: "pc-refline",
								children: [/* @__PURE__ */ (0, z.jsx)("span", {
									className: "pc-ref",
									children: _
								}), /* @__PURE__ */ (0, z.jsx)(po, { say: i })]
							})]
						}, `id-${b}`),
						y && /* @__PURE__ */ (0, z.jsxs)("button", {
							type: "button",
							className: "pc-jump",
							title: y,
							"aria-label": y,
							"aria-expanded": v ? h : void 0,
							onClick: () => v ? g((e) => !e) : t.jump(l[0]),
							children: [eo, v && /* @__PURE__ */ (0, z.jsx)("span", { children: l.length })]
						}),
						/* @__PURE__ */ (0, z.jsx)("button", {
							type: "button",
							className: "pc-close",
							title: n("point.card.close"),
							"aria-label": n("point.card.close"),
							onClick: t.close,
							children: $a
						})
					]
				}),
				v && /* @__PURE__ */ (0, z.jsx)("div", {
					className: "pc-fold",
					"data-open": h || void 0,
					inert: !h,
					children: /* @__PURE__ */ (0, z.jsx)("ul", {
						className: "pc-previews",
						children: l.map((e) => /* @__PURE__ */ (0, z.jsx)("li", { children: /* @__PURE__ */ (0, z.jsxs)("button", {
							type: "button",
							className: "pc-preview",
							title: `${e.fn} — ${e.rel}`,
							onClick: () => t.jump(e),
							children: [eo, /* @__PURE__ */ (0, z.jsx)("span", { children: e.fn })]
						}) }, `${e.file}#${e.fn}`))
					})
				}),
				!i.ref && /* @__PURE__ */ (0, z.jsx)("p", {
					className: "pc-msg",
					children: i.msg
				}),
				o && /* @__PURE__ */ (0, z.jsx)("div", {
					className: "pc-panel pc-tree-panel",
					children: /* @__PURE__ */ (0, z.jsx)("div", {
						className: "pc-scroll",
						ref: d,
						children: /* @__PURE__ */ (0, z.jsx)(fo, {
							tree: o,
							actions: t,
							settled: () => p(!0)
						})
					})
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "pc-panel pc-detail",
					children: /* @__PURE__ */ (0, z.jsxs)("div", {
						className: "pc-detail-in pc-swap",
						children: [/* @__PURE__ */ (0, z.jsx)(_o, { box: a }), c && c.length > 0 && /* @__PURE__ */ (0, z.jsx)(yo, { modifiers: c })]
					}, `detail-${b}`)
				})
			]
		})
	});
}
function xo({ room: e, shot: t, card: n, space: r }) {
	let i = t.left + t.width + r.gap;
	return {
		left: i + n.width <= e.right - r.edge ? i : Math.max(e.left + r.edge, t.left - r.gap - n.width),
		top: Math.max(r.edge, t.top)
	};
}
var So = (e, t) => parseFloat(getComputedStyle(e).getPropertyValue(t)) || 0, Co = (e) => {
	let t = document.getElementById(e);
	return t && !t.hidden && t.offsetWidth ? t.getBoundingClientRect() : null;
};
function wo({ host: e, shot: t, leaving: n = !1, onLeft: r, children: i }) {
	let a = (0, R.useRef)(null), o = (0, R.useRef)(r);
	o.current = r;
	let [s, c] = (0, R.useState)(0), [l, u] = (0, R.useState)(!1);
	(0, R.useLayoutEffect)(() => {
		let e = a.current?.querySelector(".pc-body");
		if (!e) return;
		let t = 0, n = new ResizeObserver(() => {
			let n = e.getAnimations({ subtree: !0 }).filter((e) => e.playState === "running" && e instanceof CSSTransition && e.transitionProperty === "grid-template-rows"), r = ++t;
			n.length ? Promise.all(n.map((e) => e.finished.catch(() => {}))).then(() => {
				r === t && c(e.offsetHeight);
			}) : c(e.offsetHeight);
		});
		return n.observe(e), c(e.offsetHeight), () => {
			t = -1, n.disconnect();
		};
	}, []), (0, R.useLayoutEffect)(() => {
		let n = a.current;
		if (!n) return;
		let r = {
			gap: So(n, "--space-16"),
			edge: So(n, "--space-8")
		}, i = 0, o = "", s = () => {
			let a = t(), c = e.getBoundingClientRect(), l = "hidden";
			if (a && a.width) {
				let t = Co("rail"), i = xo({
					room: {
						left: Math.max(0, (t?.right ?? 0) - c.left),
						right: Math.min(e.clientWidth, innerWidth - c.left)
					},
					shot: {
						left: a.left - c.left,
						top: a.top - c.top,
						width: a.width,
						height: a.height
					},
					card: { width: n.offsetWidth },
					space: r
				});
				l = `${Math.round(i.left)},${Math.round(i.top)},${i.left < a.left - c.left ? "left" : "right"}`;
			}
			if (l !== o) {
				if (o = l, l === "hidden") n.style.visibility = "hidden";
				else {
					let [e, t, r] = l.split(",");
					n.style.left = e + "px", n.style.top = t + "px", n.dataset.side = r, n.style.visibility = "";
				}
			}
			i = requestAnimationFrame(s);
		};
		s();
		let c = requestAnimationFrame(() => u(!0));
		return () => {
			cancelAnimationFrame(i), cancelAnimationFrame(c);
		};
	}, [e, t]), (0, R.useEffect)(() => {
		let e = a.current;
		if (!n || !e) return;
		let t = !0;
		return (e.getAnimations().find((e) => e instanceof CSSTransition && e.transitionProperty === "opacity")?.finished ?? Promise.resolve()).catch(() => {}).then(() => {
			t && o.current?.();
		}), () => {
			t = !1;
		};
	}, [n]);
	let d = { "--h": s ? `${s}px` : void 0 };
	return /* @__PURE__ */ (0, z.jsx)("div", {
		ref: a,
		className: "pc-float",
		style: d,
		"data-placed": l || void 0,
		"data-leaving": n || void 0,
		inert: n,
		"aria-hidden": n || void 0,
		children: i
	});
}
function To({ host: e, shot: t, card: n, actions: r }) {
	let i = (0, R.useRef)(/* @__PURE__ */ new WeakMap()), a = (0, R.useRef)(0), o = (0, R.useRef)(null), [s, c] = (0, R.useState)(!0), l = !!(e && t && n);
	e && t && n && (o.current = {
		host: e,
		shot: t,
		card: n
	}, s && c(!1));
	let u = o.current;
	return !u || s ? null : (i.current.has(u.shot) || i.current.set(u.shot, ++a.current), (0, Ni.createPortal)(/* @__PURE__ */ (0, z.jsx)(wo, {
		host: u.host,
		shot: u.shot,
		leaving: !l,
		onLeft: () => c(!0),
		children: /* @__PURE__ */ (0, z.jsx)(bo, {
			card: u.card,
			actions: r
		})
	}, i.current.get(u.shot)), u.host));
}
function Eo({ actions: e }) {
	let { host: t, shot: n, card: r } = (0, R.useSyncExternalStore)(Un.subscribe, Un.get);
	return /* @__PURE__ */ (0, z.jsx)(To, {
		host: t,
		shot: n,
		card: r,
		actions: e
	});
}
function Do({ choice: e, repo: t, host: n, actions: r = Qa }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), l = (0, R.useRef)(e);
	e && (l.current = e);
	let u = l.current;
	return (0, R.useLayoutEffect)(() => {
		a && (a.classList.toggle("on", !!e), a.setAttribute("aria-hidden", String(!e)), e ? r.follow(a) : a.contains(document.activeElement) && document.activeElement.blur());
	}, [e, a]), c(u && /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)("h2", { children: i("choose.title", {
			file: u.fileName,
			n: u.candidates.length
		}) }),
		/* @__PURE__ */ (0, z.jsx)("p", { children: i("choose.sub") }),
		u.candidates.map((e) => /* @__PURE__ */ (0, z.jsx)("button", {
			type: "button",
			className: "opt",
			title: e,
			onClick: () => r.choose(e),
			children: ro(e.startsWith(u.repoRoot + "/") ? e.slice(u.repoRoot.length + 1) : e, t)
		}, e)),
		/* @__PURE__ */ (0, z.jsx)("button", {
			type: "button",
			className: "cancel",
			onClick: r.cancel,
			children: i("choose.cancel")
		})
	] }), (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
		className: "chooser",
		id: "chooser",
		role: "dialog",
		"aria-label": i("choose.label"),
		"aria-hidden": "true",
		ref: e,
		children: t
	}));
}
// src/components/VacantTab.tsx
function Oo({ screen: e, vacant: t, host: n }) {
	let { phrase: r, daemonText: i } = s(), { element: a, place: c } = o(n);
	return (0, R.useLayoutEffect)(() => {
		a && e !== null && (a.hidden = e !== "vacant");
	}, [e, a]), c(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("p", {
		className: "vacant-msg",
		id: "vacantMsg",
		children: i(t)
	}), /* @__PURE__ */ (0, z.jsx)("p", {
		className: "vacant-hint",
		children: r("vacant.hint")
	})] }), (e, t) => /* @__PURE__ */ (0, z.jsx)("section", {
		id: "vacantView",
		className: "vacant",
		ref: e,
		children: t
	}));
}
// src/components/WorkspaceShell.tsx
function ko() {
	let { phrase: e } = s();
	return {
		text: (t) => ({
			"data-t": t,
			children: e(t)
		}),
		title: (t) => ({
			"data-t-title": t,
			title: e(t)
		}),
		label: (t) => ({
			"data-t-aria-label": t,
			"aria-label": e(t)
		})
	};
}
var Ao = ({ id: e, hidden: t }) => /* @__PURE__ */ (0, z.jsxs)("div", {
	className: "unit",
	id: e,
	hidden: t,
	children: [
		/* @__PURE__ */ (0, z.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, z.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, z.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, z.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, z.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, z.jsx)("div", { className: "shell" }),
		/* @__PURE__ */ (0, z.jsx)("div", { className: "home" }),
		/* @__PURE__ */ (0, z.jsx)("div", { className: "outline" }),
		/* @__PURE__ */ (0, z.jsxs)("div", {
			className: "stage",
			children: [
				/* @__PURE__ */ (0, z.jsx)("img", {
					className: "ly l0",
					alt: ""
				}),
				/* @__PURE__ */ (0, z.jsx)("div", { className: "veil" }),
				/* @__PURE__ */ (0, z.jsx)("img", {
					className: "ly l1",
					alt: ""
				}),
				/* @__PURE__ */ (0, z.jsx)("div", { className: "crease" }),
				/* @__PURE__ */ (0, z.jsx)("div", { className: "cam" })
			]
		}),
		/* @__PURE__ */ (0, z.jsx)("div", { className: "tick t-top" }),
		/* @__PURE__ */ (0, z.jsx)("div", { className: "tick t-bot" })
	]
});
function jo() {
	let e = ko();
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "ruler",
		id: "ruler",
		hidden: !0,
		children: [
			/* @__PURE__ */ (0, z.jsxs)("svg", {
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, z.jsx)("path", {
					className: "ext",
					id: "rlExt"
				}), /* @__PURE__ */ (0, z.jsx)("path", {
					className: "dim",
					id: "rlDim"
				})]
			}),
			/* @__PURE__ */ (0, z.jsx)("input", {
				className: "rl-badge",
				id: "rlW",
				type: "text",
				inputMode: "numeric",
				maxLength: 4,
				...e.label("size.w.label"),
				...e.title("size.w.tip")
			}),
			/* @__PURE__ */ (0, z.jsx)("input", {
				className: "rl-badge",
				id: "rlH",
				type: "text",
				inputMode: "numeric",
				maxLength: 4,
				...e.label("size.h.label"),
				...e.title("size.h.tip")
			})
		]
	});
}
function Mo({ marks: e = Fo() }) {
	return /* @__PURE__ */ (0, z.jsx)("div", {
		className: "resize-scene",
		id: "resizeScene",
		hidden: !0,
		children: /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "resize-geometry",
			id: "resizeGeometry",
			children: [
				/* @__PURE__ */ (0, z.jsx)(Ao, { id: "ua" }),
				/* @__PURE__ */ (0, z.jsx)(Ao, {
					id: "ub",
					hidden: !0
				}),
				/* @__PURE__ */ (0, z.jsx)(jo, {}),
				e,
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "rig",
					id: "rig",
					hidden: !0,
					children: /* @__PURE__ */ (0, z.jsx)("div", {
						className: "lift",
						children: /* @__PURE__ */ (0, z.jsxs)("div", {
							className: "space",
							children: [
								/* @__PURE__ */ (0, z.jsx)("div", { className: "plate" }),
								/* @__PURE__ */ (0, z.jsxs)("div", {
									className: "slab base",
									children: [/* @__PURE__ */ (0, z.jsxs)("div", {
										className: "face front",
										children: [
											/* @__PURE__ */ (0, z.jsxs)("div", {
												className: "clip",
												children: [
													/* @__PURE__ */ (0, z.jsx)("img", {
														className: "ly old",
														alt: ""
													}),
													/* @__PURE__ */ (0, z.jsx)("div", { className: "veil" }),
													/* @__PURE__ */ (0, z.jsx)("img", {
														className: "ly neu",
														alt: ""
													}),
													/* @__PURE__ */ (0, z.jsx)("div", { className: "cast" }),
													/* @__PURE__ */ (0, z.jsx)("div", { className: "cam" })
												]
											}),
											/* @__PURE__ */ (0, z.jsx)("div", { className: "lit" }),
											/* @__PURE__ */ (0, z.jsx)("div", { className: "edge ring" })
										]
									}), /* @__PURE__ */ (0, z.jsx)("div", {
										className: "face rear",
										children: /* @__PURE__ */ (0, z.jsx)("div", { className: "lit" })
									})]
								}),
								/* @__PURE__ */ (0, z.jsxs)("div", {
									className: "slab leaf",
									children: [/* @__PURE__ */ (0, z.jsxs)("div", {
										className: "face front",
										children: [
											/* @__PURE__ */ (0, z.jsxs)("div", {
												className: "clip",
												children: [
													/* @__PURE__ */ (0, z.jsx)("img", {
														className: "ly old",
														alt: ""
													}),
													/* @__PURE__ */ (0, z.jsx)("div", { className: "veil" }),
													/* @__PURE__ */ (0, z.jsx)("img", {
														className: "ly neu",
														alt: ""
													}),
													/* @__PURE__ */ (0, z.jsx)("div", { className: "cam" })
												]
											}),
											/* @__PURE__ */ (0, z.jsx)("div", { className: "lit" }),
											/* @__PURE__ */ (0, z.jsx)("div", { className: "edge ring" })
										]
									}), /* @__PURE__ */ (0, z.jsxs)("div", {
										className: "face rear",
										children: [
											/* @__PURE__ */ (0, z.jsxs)("div", {
												className: "clip",
												children: [
													/* @__PURE__ */ (0, z.jsx)("img", {
														className: "ly old",
														alt: ""
													}),
													/* @__PURE__ */ (0, z.jsx)("div", { className: "veil" }),
													/* @__PURE__ */ (0, z.jsx)("img", {
														className: "ly neu",
														alt: ""
													}),
													/* @__PURE__ */ (0, z.jsx)("div", { className: "cam" })
												]
											}),
											/* @__PURE__ */ (0, z.jsx)("div", { className: "lit" }),
											/* @__PURE__ */ (0, z.jsx)("div", { className: "edge ring" })
										]
									})]
								}),
								/* @__PURE__ */ (0, z.jsx)("div", { className: "spine" }),
								/* @__PURE__ */ (0, z.jsx)("div", { className: "crease" }),
								/* @__PURE__ */ (0, z.jsx)("div", { className: "tick r-top" }),
								/* @__PURE__ */ (0, z.jsx)("div", { className: "tick r-bot" })
							]
						})
					})
				})
			]
		})
	});
}
var No = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "workspace-loading",
	id: "workspaceLoading",
	role: "status",
	hidden: !0,
	ref: e,
	children: t
}), Po = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "inset-overlay",
	id: "insetOverlay",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), Fo = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "inset-marks",
	id: "insetMarks",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), Io = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "sys-ui",
	id: "sysUiCtl",
	role: "group",
	"data-t-aria-label": "systemUi.label",
	hidden: !0,
	ref: e,
	children: t
}), Lo = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "zoom at-fit",
	id: "zoomCtl",
	role: "group",
	"data-t-aria-label": "zoom.label",
	ref: e,
	children: t
});
function Ro({ loading: e = No(), inset: t = Po() }) {
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "stage",
		id: "stage",
		children: [
			/* @__PURE__ */ (0, z.jsx)("img", {
				id: "shot",
				alt: "preview"
			}),
			e,
			t,
			/* @__PURE__ */ (0, z.jsx)("div", {
				className: "marks",
				id: "marks",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, z.jsx)("div", {
				className: "box",
				id: "box"
			}),
			/* @__PURE__ */ (0, z.jsx)("div", {
				className: "box pick",
				id: "pickBox",
				hidden: !0
			})
		]
	});
}
function zo({ loading: e, inset: t, marks: n }) {
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "wrap",
		children: [/* @__PURE__ */ (0, z.jsx)(Mo, { marks: n }), /* @__PURE__ */ (0, z.jsx)(Ro, {
			loading: e,
			inset: t
		})]
	});
}
function Bo() {
	let e = ko(), t = (t, n, r) => /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "sl",
		"data-axis": t,
		children: [/* @__PURE__ */ (0, z.jsxs)("div", {
			className: "sl-h",
			children: [/* @__PURE__ */ (0, z.jsx)("span", {
				id: t === "w" ? "slWLb" : "slHLb",
				...e.text(n)
			}), /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "v",
				children: [/* @__PURE__ */ (0, z.jsx)("b", {}), /* @__PURE__ */ (0, z.jsx)("small", { children: "dp" })]
			})]
		}), /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "sl-track",
			children: [
				/* @__PURE__ */ (0, z.jsx)("span", { className: "fill" }),
				r.map((e) => /* @__PURE__ */ (0, z.jsxs)("span", {
					className: "tick",
					"data-v": e,
					children: [/* @__PURE__ */ (0, z.jsx)("i", {}), /* @__PURE__ */ (0, z.jsx)("em", { children: e })]
				}, e)),
				/* @__PURE__ */ (0, z.jsx)("span", {
					className: "thumb",
					role: "slider",
					tabIndex: 0,
					"aria-labelledby": t === "w" ? "slWLb" : "slHLb",
					"aria-valuemin": 240,
					"aria-valuemax": 1600
				})
			]
		})]
	});
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "pn-sl",
		id: "pnSl",
		role: "group",
		...e.label("size.custom.label"),
		hidden: !0,
		children: [t("w", "size.w", [600, 840]), t("h", "size.h", [480, 900])]
	});
}
function Vo() {
	let e = ko(), t = (t, n, r, i = !1) => /* @__PURE__ */ (0, z.jsx)("button", {
		className: i ? "pn-it mono" : "pn-it",
		type: "button",
		role: "radio",
		"data-sel": t,
		...n ? e.title(n) : {},
		children: r
	}, t);
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "pn-pick",
		id: "pnPick",
		role: "radiogroup",
		...e.label("panel.pick"),
		children: [/* @__PURE__ */ (0, z.jsxs)("section", {
			className: "pn-sec",
			children: [/* @__PURE__ */ (0, z.jsx)("h4", {
				className: "pn-h",
				...e.text("panel.size")
			}), /* @__PURE__ */ (0, z.jsxs)("div", {
				className: "pn-list",
				children: [
					t("original", "size.original.tip", "@Preview", !0),
					t("narrow", "size.narrow.tip", "320×640"),
					t("foldable", "size.foldable.tip", "673×841"),
					/* @__PURE__ */ (0, z.jsx)("button", {
						className: "pn-it",
						type: "button",
						role: "radio",
						"data-sel": "custom",
						...e.title("size.custom.tip"),
						...e.text("size.custom")
					})
				]
			})]
		}), /* @__PURE__ */ (0, z.jsxs)("section", {
			className: "pn-sec",
			children: [/* @__PURE__ */ (0, z.jsx)("h4", {
				className: "pn-h",
				...e.text("panel.device")
			}), /* @__PURE__ */ (0, z.jsx)("div", {
				className: "pn-list",
				children: Ce.map(({ group: e, ids: n }) => /* @__PURE__ */ (0, z.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("h5", {
					className: "pn-g",
					children: e
				}), n.map((e) => t(e))] }, e))
			})]
		})]
	});
}
var Ho = (e) => /* @__PURE__ */ (0, z.jsx)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), Uo = Ho(/* @__PURE__ */ (0, z.jsxs)("g", {
	className: "turn",
	children: [/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "6.5",
		y: "3",
		width: "7",
		height: "14",
		rx: "1.6"
	}), /* @__PURE__ */ (0, z.jsx)("circle", {
		cx: "10",
		cy: "5.8",
		r: ".6",
		fill: "currentColor"
	})]
})), Wo = Ho(/* @__PURE__ */ (0, z.jsxs)("g", {
	className: "fold-ic",
	children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M3 10h4.5M5.5 7.8 7.7 10l-2.2 2.2M17 10h-4.5M14.5 7.8 12.3 10l2.2 2.2" })]
})), Go = Ho(/* @__PURE__ */ (0, z.jsxs)("g", {
	className: "unfold-ic",
	children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M7.5 10H3M5.2 7.8 3 10l2.2 2.2M12.5 10H17M14.8 7.8 17 10l-2.2 2.2" })]
})), Ko = Ho(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
	x: "3.5",
	y: "4",
	width: "13",
	height: "12",
	rx: "1.5"
}), /* @__PURE__ */ (0, z.jsx)("path", {
	d: "M10 4v12",
	strokeDasharray: "1.6 1.6"
})] })), qo = /* @__PURE__ */ (0, z.jsx)("svg", {
	className: "tb-chev",
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "m4.5 6.5 3.5 3.5 3.5-3.5" })
});
function Jo() {
	let e = ko();
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "dock-seg",
		id: "devCtl",
		role: "group",
		...e.label("posture.label"),
		hidden: !0,
		children: [
			/* @__PURE__ */ (0, z.jsxs)("div", {
				className: "orientation-pick",
				id: "dcOrientation",
				children: [/* @__PURE__ */ (0, z.jsxs)("button", {
					className: "tb-btn",
					id: "dcRot",
					type: "button",
					"data-orientation": "portrait",
					"aria-haspopup": "menu",
					"aria-expanded": "false",
					"aria-controls": "dcOrientMenu",
					...e.title("posture.orientation"),
					...e.label("posture.orientation"),
					children: [Uo, qo]
				}), /* @__PURE__ */ (0, z.jsx)("div", {
					className: "zoom-menu",
					id: "dcOrientMenu",
					role: "menu",
					...e.label("posture.orientation"),
					inert: !0,
					children: [
						"portrait",
						"landscape-left",
						"landscape-right"
					].map((t) => /* @__PURE__ */ (0, z.jsx)("button", {
						type: "button",
						role: "menuitemradio",
						tabIndex: -1,
						"aria-checked": "false",
						"data-orientation": t,
						...e.text(`posture.${t}`)
					}, t))
				})]
			}),
			/* @__PURE__ */ (0, z.jsxs)("button", {
				className: "tb-btn",
				id: "dcFold",
				type: "button",
				"data-folded": "false",
				...e.title("posture.fold"),
				...e.label("posture.fold"),
				children: [Wo, Go]
			}),
			/* @__PURE__ */ (0, z.jsx)("button", {
				className: "tb-btn",
				id: "dcHinge",
				type: "button",
				"aria-pressed": "true",
				...e.title("posture.hinge.hide"),
				...e.label("posture.hinge"),
				children: Ko
			})
		]
	});
}
function Yo() {
	let e = ko();
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "pn-fold",
		id: "pnFold",
		children: [/* @__PURE__ */ (0, z.jsxs)("button", {
			className: "tb-btn pn-sum",
			id: "pnSum",
			type: "button",
			"aria-haspopup": "true",
			"aria-expanded": "false",
			"aria-controls": "pnBody",
			...e.title("panel.pick"),
			children: [
				/* @__PURE__ */ (0, z.jsx)("span", { className: "pn-sum-sil" }),
				/* @__PURE__ */ (0, z.jsx)("span", { className: "nm" }),
				qo
			]
		}), /* @__PURE__ */ (0, z.jsx)("div", {
			className: "pn-body",
			id: "pnBody",
			inert: !0,
			children: /* @__PURE__ */ (0, z.jsx)(Vo, {})
		})]
	});
}
function Xo({ systemUi: e = Io(), zoom: t = Lo() }) {
	return /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(Yo, {}),
		/* @__PURE__ */ (0, z.jsx)(Jo, {}),
		/* @__PURE__ */ (0, z.jsx)(Bo, {}),
		e,
		t
	] });
}
// src/components/InsetOverlay.tsx
function Zo(e, t, n) {
	if (!e || !t || n?.kind !== "device") return null;
	let r = n.widthDp, i = n.heightDp, a = Object.fromEntries(Rr.map((e) => [e, Math.max(0, ...Lr.map((n) => t.values[n][e]))]));
	return {
		w: r,
		h: i,
		insets: t,
		widest: a,
		safe: {
			x: a.left,
			y: a.top,
			w: Math.max(0, r - a.left - a.right),
			h: Math.max(0, i - a.top - a.bottom)
		}
	};
}
function Qo(e, t) {
	let { on: n } = (0, R.useSyncExternalStore)(Wn.subscribe, Wn.get);
	return Zo(n, e, t);
}
function $o(e, t, n, r) {
	switch (e) {
		case "top": return {
			fill: {
				x: 0,
				y: 0,
				w: n,
				h: t
			},
			line: [
				0,
				t,
				n,
				t
			]
		};
		case "bottom": return {
			fill: {
				x: 0,
				y: r - t,
				w: n,
				h: t
			},
			line: [
				0,
				r - t,
				n,
				r - t
			]
		};
		case "left": return {
			fill: {
				x: 0,
				y: 0,
				w: t,
				h: r
			},
			line: [
				t,
				0,
				t,
				r
			]
		};
		case "right": return {
			fill: {
				x: n - t,
				y: 0,
				w: t,
				h: r
			},
			line: [
				n - t,
				0,
				n - t,
				r
			]
		};
	}
}
function es({ deviceInsets: e, size: t, host: n }) {
	let { element: r, place: i } = o(n), a = Qo(e, t);
	if ((0, R.useLayoutEffect)(() => {
		r && (r.hidden = !a);
	}, [r, a]), !a) return i(null, Po);
	let { w: s, h: c, safe: l } = a;
	return i(/* @__PURE__ */ (0, z.jsxs)("svg", {
		viewBox: `0 0 ${s} ${c}`,
		preserveAspectRatio: "none",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, z.jsx)("rect", {
			className: "io-safe",
			"data-kind": "safeDrawing",
			x: l.x,
			y: l.y,
			width: l.w,
			height: l.h
		}), Lr.map((e) => /* @__PURE__ */ (0, z.jsx)("g", {
			className: "io-band",
			"data-kind": e,
			children: Rr.filter((t) => a.insets.values[e][t] > 0).map((t) => {
				let { fill: n, line: r } = $o(t, a.insets.values[e][t], s, c);
				return /* @__PURE__ */ (0, z.jsxs)("g", {
					"data-edge": t,
					children: [/* @__PURE__ */ (0, z.jsx)("rect", {
						className: "io-fill",
						x: n.x,
						y: n.y,
						width: n.w,
						height: n.h
					}), /* @__PURE__ */ (0, z.jsx)("line", {
						className: "io-line",
						x1: r[0],
						y1: r[1],
						x2: r[2],
						y2: r[3],
						vectorEffect: "non-scaling-stroke"
					})]
				}, t);
			})
		}, e))]
	}), Po);
}
var ts = (e) => String(Math.round(e * 100) / 100);
function ns({ w: e, h: t, insets: n, widest: r }) {
	return Rr.flatMap((i) => {
		let a = i === "top" || i === "bottom" ? t : e, o = Lr.filter((e) => e !== "displayCutout").reduce((e, t) => n.values[t][i] > n.values[e][i] ? t : e);
		return [[o, zr(o, i)], ["displayCutout", zr("displayCutout", i)]].flatMap(([e, t]) => {
			let o = Math.max(0, n.values[e][i]);
			if (!(o > 0)) return [];
			let [s, c] = i === "top" || i === "left" ? [0, o / a] : [1 - o / a, 1];
			return [{
				kind: e,
				edge: i,
				value: o,
				side: t,
				bold: o === r[i],
				from: s,
				to: c
			}];
		});
	});
}
var rs = (e) => `${e * 100}%`;
function is({ deviceInsets: e, size: t, host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = Qo(e, t);
	if ((0, R.useLayoutEffect)(() => {
		i && (i.hidden = !c);
	}, [i, c]), !c) return a(null, Fo);
	let { w: l, h: u, safe: d } = c;
	return a(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [ns(c).map((e) => {
		let t = e.side === "right" || e.side === "left" ? {
			top: rs(e.from),
			height: rs(e.to - e.from)
		} : {
			left: rs(e.from),
			width: rs(e.to - e.from)
		};
		return /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "im-dim",
			"data-kind": e.kind,
			"data-edge": e.edge,
			"data-side": e.side,
			"data-bold": e.bold,
			style: t,
			children: [
				/* @__PURE__ */ (0, z.jsx)("i", { className: "im-ext im-from" }),
				/* @__PURE__ */ (0, z.jsx)("i", { className: "im-ext im-to" }),
				/* @__PURE__ */ (0, z.jsxs)("span", {
					className: "im-badge",
					children: [/* @__PURE__ */ (0, z.jsx)("em", {
						className: "im-label",
						children: r(`insetOverlay.kind.${e.kind}`)
					}), /* @__PURE__ */ (0, z.jsx)("span", {
						className: "im-val",
						children: ts(e.value)
					})]
				})
			]
		}, `${e.kind} ${e.edge}`);
	}), /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "im-safe",
		"data-kind": "safeDrawing",
		style: {
			left: rs((d.x + d.w / 2) / l),
			top: rs((d.y + d.h / 2) / u)
		},
		children: [/* @__PURE__ */ (0, z.jsx)("b", { children: r("insetOverlay.safeArea") }), /* @__PURE__ */ (0, z.jsxs)("span", { children: [
			ts(d.w),
			" × ",
			ts(d.h)
		] })]
	})] }), Fo);
}
var as = /* @__PURE__ */ (0, z.jsxs)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: [/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "4.5",
		y: "2.5",
		width: "11",
		height: "15",
		rx: "1.8"
	}), /* @__PURE__ */ (0, z.jsx)("rect", {
		x: "7",
		y: "5.5",
		width: "6",
		height: "9",
		strokeDasharray: "1.6 1.6"
	})]
});
function os() {
	let { phrase: e } = s(), { on: t } = (0, R.useSyncExternalStore)(Wn.subscribe, Wn.get), { on: n } = (0, R.useSyncExternalStore)(Hn.subscribe, Hn.get), r = e("insetOverlay.now", { value: e(t ? "systemUi.on" : "systemUi.off") });
	return /* @__PURE__ */ (0, z.jsx)("button", {
		type: "button",
		id: "insetBtn",
		className: "tb-btn",
		"aria-pressed": t,
		"aria-label": r,
		title: r,
		disabled: n,
		onClick: () => Wn.set({ on: !t }),
		children: as
	});
}
// src/components/Workspace.tsx
var ss = {
	exit() {},
	zoomIn() {},
	zoomOut() {},
	zoomFit() {},
	zoomMenuPick() {},
	toggleZoomMenu() {},
	pickSystemUi() {}
};
function cs({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e), { on: i, failed: a } = (0, R.useSyncExternalStore)(Hn.subscribe, Hn.get);
	return (0, R.useLayoutEffect)(() => {
		n && (n.hidden = !i, n.classList.toggle("failed", a));
	}, [
		n,
		i,
		a
	]), r(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("span", {
		className: "workspace-spinner",
		"aria-hidden": "true"
	}), /* @__PURE__ */ (0, z.jsx)("span", {
		id: "workspaceLoadingText",
		children: t(a ? "workspace.loading.failed" : "workspace.loading")
	})] }), No);
}
var ls = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M4 8h8" })
}), us = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M4 8h8M8 4v8" })
}), ds = (e) => (0, R.useSyncExternalStore)(Vn.subscribe, () => Vn.get()[e]);
function fs({ real: e, menu: t, disabled: n, actions: r }) {
	let { phrase: i } = s(), a = ds("pct");
	return /* @__PURE__ */ (0, z.jsxs)("button", {
		type: "button",
		id: "zoomPct",
		className: "z-pct",
		"aria-haspopup": "menu",
		"aria-expanded": t,
		disabled: n,
		title: i(e ? "zoom.tip.real" : "zoom.tip.fit"),
		onClick: (e) => r.toggleZoomMenu(e.detail === 0),
		children: [a, "%"]
	});
}
var ps = (0, R.memo)(function({ host: e, actions: t = ss }) {
	let { phrase: n } = s(), { element: r, place: i } = o(e), a = ds("real"), c = ds("atFit"), l = ds("menu"), u = ds("disabled");
	return (0, R.useLayoutEffect)(() => {
		r?.classList.toggle("at-fit", c);
	}, [r, c]), i(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)("button", {
			type: "button",
			id: "zoomOutBtn",
			"aria-label": n("zoom.out"),
			title: n("zoom.out.tip"),
			disabled: u,
			onClick: t.zoomOut,
			children: ls
		}),
		/* @__PURE__ */ (0, z.jsx)(fs, {
			real: a,
			menu: l,
			disabled: u,
			actions: t
		}),
		/* @__PURE__ */ (0, z.jsx)("button", {
			type: "button",
			id: "zoomInBtn",
			"aria-label": n("zoom.in"),
			title: n("zoom.in.tip"),
			disabled: u,
			onClick: t.zoomIn,
			children: us
		}),
		/* @__PURE__ */ (0, z.jsx)("button", {
			type: "button",
			id: "zoomFitBtn",
			className: "z-fit",
			title: n("zoom.fit.tip"),
			disabled: u,
			tabIndex: c ? -1 : 0,
			"aria-hidden": c,
			onClick: t.zoomFit,
			children: n("zoom.fit")
		}),
		/* @__PURE__ */ (0, z.jsxs)("div", {
			className: l ? "zoom-menu on" : "zoom-menu",
			id: "zoomMenu",
			role: "menu",
			children: [
				/* @__PURE__ */ (0, z.jsxs)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "fit",
					disabled: u,
					onClick: () => t.zoomMenuPick("fit"),
					children: [/* @__PURE__ */ (0, z.jsx)("span", { children: n("zoom.fit") }), /* @__PURE__ */ (0, z.jsx)("kbd", { children: "0" })]
				}),
				/* @__PURE__ */ (0, z.jsx)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "1",
					hidden: !a,
					disabled: u,
					onClick: () => t.zoomMenuPick("1"),
					children: n("zoom.real")
				}),
				/* @__PURE__ */ (0, z.jsx)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "2",
					disabled: u,
					onClick: () => t.zoomMenuPick("2"),
					children: "200%"
				})
			]
		})
	] }), Lo);
}), ms = /* @__PURE__ */ (0, z.jsxs)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: [/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "5.5",
		y: "2.5",
		width: "9",
		height: "15",
		rx: "1.8"
	}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M5.5 5.5h9M8.5 15h3" })]
});
function hs({ systemUi: e, deviceInsets: t = null, host: n, actions: r = ss }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), { on: l } = (0, R.useSyncExternalStore)(Hn.subscribe, Hn.get), u = !e && !t;
	(0, R.useLayoutEffect)(() => {
		a && (a.hidden = u);
	}, [a, u]);
	let d = !!e?.shown, f = i(t ? "insetOverlay.label" : "systemUi.label");
	if ((0, R.useLayoutEffect)(() => {
		a?.setAttribute("aria-label", f);
	}, [a, f]), t) return c(/* @__PURE__ */ (0, z.jsx)(os, {}), Io);
	let p = d ? e?.bars?.insets : null, m = [
		i("systemUi.now", { value: i(d ? "systemUi.on" : "systemUi.off") }),
		p && i("systemUi.tip.device", {
			status: p.statusDp,
			nav: p.navDp,
			source: `${p.source} (${p.kind})`
		}),
		i("systemUi.tip")
	].filter(Boolean).join("\n");
	return c(/* @__PURE__ */ (0, z.jsx)("button", {
		type: "button",
		id: "sysUiBtn",
		className: "tb-btn",
		"aria-pressed": d,
		"aria-label": f,
		disabled: l,
		title: m,
		onClick: () => {
			e && r.pickSystemUi(!d === e.annotated ? "annotated" : d ? "off" : "on");
		},
		children: ms
	}), Io);
}
var gs = 12, _s = 48;
function vs(e, t) {
	let n = e.querySelector("#backName"), r = t.querySelector("#wsName"), i = t.querySelector("#wsFn"), a = e.parentElement, o = document.getElementById("barR");
	if (!n || !r || !i || !a || !o || (n.style.maxWidth = "", n.style.display = "", t.hidden || !(t.offsetParent instanceof HTMLElement))) return;
	if (getComputedStyle(t).position !== "absolute") {
		t.style.removeProperty("--ws-left"), t.style.removeProperty("--ws-max");
		return;
	}
	let s = t.offsetParent.clientWidth, c = o.offsetLeft - gs, l = Math.min(Math.max(r.scrollWidth, i.hidden ? 0 : i.scrollWidth) + 1, s * .34), u = Math.min(s / 2 - l / 2, c - l), d = () => {
		let e = 0;
		for (let t of a.children) t instanceof HTMLElement && t.offsetParent && (e = Math.max(e, a.offsetLeft + t.offsetLeft + t.offsetWidth));
		return e + gs;
	}, f = d();
	if (f > u && !e.hidden) {
		let e = n.offsetWidth - (f - u);
		e < _s ? n.style.display = "none" : n.style.maxWidth = `${e}px`, f = d();
	}
	let p = Math.max(u, f), m = Math.max(0, Math.min(l, c - p));
	t.style.setProperty("--ws-left", `${p + m / 2}px`), t.style.setProperty("--ws-max", `${m}px`);
}
var ys = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.8",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M10 3.5 5.5 8l4.5 4.5" })
});
function bs({ state: e, hosts: t, actions: n = ss }) {
	let { phrase: r } = s(), i = o(t?.back), a = o(t?.title), c = e?.screen === "focus" ? e.focus : null, l = c ? (e.tabs || []).find((e) => e.active) : void 0, u = c ? Pe(e?.board, e?.board?.focus) : null;
	(0, R.useLayoutEffect)(() => {
		document.body.classList.toggle("ws", !!c), i.element && (i.element.hidden = !c), a.element && (a.element.hidden = !c, a.element.title = c ? u ? u.title : l ? l.title : c.previewId : ""), i.element && a.element && vs(i.element, a.element);
	}), (0, R.useLayoutEffect)(() => () => document.body.classList.remove("ws"), []), (0, R.useLayoutEffect)(() => {
		let e = i.element, t = a.element, n = e?.parentElement?.parentElement, r = document.getElementById("barR");
		if (!e || !t) return;
		let o = new ResizeObserver(() => vs(e, t));
		for (let e of [n, r]) e && o.observe(e);
		return () => o.disconnect();
	}, [i.element, a.element]);
	let d = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [ys, /* @__PURE__ */ (0, z.jsx)("span", {
		id: "backName",
		children: l ? l.name : r("nav.board")
	})] }), f = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("span", {
		className: "ws-name",
		id: "wsName",
		children: c ? c.name || c.fn || c.previewId : ""
	}), /* @__PURE__ */ (0, z.jsx)("span", {
		className: "ws-fn",
		id: "wsFn",
		hidden: !c?.name,
		children: c?.name ? c.fn : ""
	})] });
	return (0, R.useLayoutEffect)(() => {
		let e = i.element;
		if (!e) return;
		let t = () => n.exit();
		return e.addEventListener("click", t), () => e.removeEventListener("click", t);
	}, [i.element, n]), /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [i.place(d, (e, t) => /* @__PURE__ */ (0, z.jsx)("button", {
		className: "back",
		id: "back",
		type: "button",
		ref: e,
		children: t
	})), a.place(f, (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
		className: "ws-title",
		id: "wsTitle",
		ref: e,
		children: t
	}))] });
}
function xs({ screen: e, systemUi: t = null, deviceInsets: n = null, size: r = null, hosts: i, actions: a = ss }) {
	let { phrase: o } = s(), [c, l] = (0, R.useState)(null), u = i?.view ?? c;
	return (0, R.useLayoutEffect)(() => {
		u && e !== null && (u.hidden = e !== "focus");
	}, [e, u]), i ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(cs, { host: i.loading }),
		/* @__PURE__ */ (0, z.jsx)(es, {
			deviceInsets: n,
			size: r,
			host: i.inset
		}),
		/* @__PURE__ */ (0, z.jsx)(is, {
			deviceInsets: n,
			size: r,
			host: i.insetMarks
		}),
		/* @__PURE__ */ (0, z.jsx)(hs, {
			systemUi: t,
			deviceInsets: n,
			host: i.systemUi,
			actions: a
		}),
		/* @__PURE__ */ (0, z.jsx)(ps, {
			host: i.zoom,
			actions: a
		})
	] }) : /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("section", {
		id: "focusView",
		ref: l,
		children: /* @__PURE__ */ (0, z.jsx)(zo, {
			loading: /* @__PURE__ */ (0, z.jsx)(cs, {}),
			inset: /* @__PURE__ */ (0, z.jsx)(es, {
				deviceInsets: n,
				size: r
			}),
			marks: /* @__PURE__ */ (0, z.jsx)(is, {
				deviceInsets: n,
				size: r
			})
		})
	}), /* @__PURE__ */ (0, z.jsx)("div", {
		className: "panel",
		id: "panel",
		role: "toolbar",
		"aria-label": o("panel.label"),
		children: /* @__PURE__ */ (0, z.jsx)(Xo, {
			systemUi: /* @__PURE__ */ (0, z.jsx)(hs, {
				systemUi: t,
				deviceInsets: n,
				actions: a
			}),
			zoom: /* @__PURE__ */ (0, z.jsx)(ps, { actions: a })
		})
	})] });
}
// src/ViewerRoot.tsx
function Ss() {
	let e = (e) => document.getElementById(e);
	return {
		bar: e("bar"),
		brand: e("brand"),
		app: e("app"),
		status: e("status"),
		helpButton: e("helpBtn"),
		rail: {
			rail: e("rail"),
			list: e("railList"),
			empty: e("railEmpty"),
			open: e("railOpen"),
			all: e("railAll"),
			toggle: e("railToggle"),
			scrim: e("railScrim")
		},
		railAll: e("railAll"),
		gallery: e("galleryView"),
		stale: e("staleBar"),
		buildNotice: e("buildNotice"),
		board: {
			view: e("boardView"),
			cards: e("cards")
		},
		quickOpen: {
			sheet: e("qoSheet"),
			curtain: e("qoCurtain")
		},
		capsule: e("strip"),
		help: e("help"),
		vacant: e("vacantView"),
		workspace: {
			view: e("focusView"),
			panel: e("panel"),
			systemUi: e("sysUiCtl"),
			inset: e("insetOverlay"),
			insetMarks: e("insetMarks"),
			zoom: e("zoomCtl"),
			loading: e("workspaceLoading")
		},
		workspaceHeader: {
			back: e("back"),
			title: e("wsTitle")
		},
		chooser: e("chooser")
	};
}
function Cs({ state: e, draw: t = 0, statusState: n = e, connection: r = null, app: i = null, shortcuts: a = [], hosts: o, board: s, workspace: c, point: l, renderLegacy: u }) {
	(0, R.useLayoutEffect)(() => {
		e && u(e);
	}, [t]);
	let d = Ze(e, r), f = ze().files, p = d ? "gallery" : e?.screen ?? null;
	return o ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(un, {
			header: e?.header ?? null,
			tabs: e?.tabs ?? [],
			app: i,
			host: o.app,
			brand: o.brand
		}),
		/* @__PURE__ */ (0, z.jsx)(Za, {
			state: n,
			connection: r,
			host: o.status,
			bar: o.bar
		}),
		/* @__PURE__ */ (0, z.jsx)(yn, { host: o.helpButton }),
		/* @__PURE__ */ (0, z.jsx)(an, {
			tabs: e?.tabs ?? null,
			screen: e?.screen ?? null,
			gallery: d,
			hosts: o.rail
		}),
		/* @__PURE__ */ (0, z.jsx)(Da, {
			on: d,
			count: f?.length ?? null,
			host: o.railAll
		}),
		/* @__PURE__ */ (0, z.jsx)(Xa, {
			rows: e?.stale ?? null,
			host: o.stale
		}),
		/* @__PURE__ */ (0, z.jsx)(Fi, {
			pending: !!e?.buildPending,
			host: o.buildNotice
		}),
		/* @__PURE__ */ (0, z.jsx)(Ta, {
			shown: d,
			state: e,
			draw: t,
			host: o.gallery
		}),
		/* @__PURE__ */ (0, z.jsx)(Ya, {
			board: e?.board ?? null,
			screen: p,
			hosts: o.board,
			actions: s
		}),
		/* @__PURE__ */ (0, z.jsx)(Rt, {
			state: e,
			draw: t,
			connection: r,
			hosts: o.quickOpen
		}),
		/* @__PURE__ */ (0, z.jsx)(Oo, {
			screen: p,
			vacant: e?.vacant ?? null,
			host: o.vacant
		}),
		/* @__PURE__ */ (0, z.jsx)(xs, {
			screen: e?.screen ?? null,
			systemUi: e?.focus?.systemUi ?? null,
			deviceInsets: e?.focus?.deviceInsets ?? null,
			size: e?.focus?.size ?? null,
			hosts: o.workspace,
			actions: c
		}),
		/* @__PURE__ */ (0, z.jsx)(bs, {
			state: e,
			hosts: o.workspaceHeader,
			actions: c
		}),
		/* @__PURE__ */ (0, z.jsx)(Eo, { actions: l }),
		/* @__PURE__ */ (0, z.jsx)(Do, {
			choice: e?.choice ?? null,
			repo: e?.header?.repo,
			host: o.chooser,
			actions: l
		}),
		/* @__PURE__ */ (0, z.jsx)(Oa, { host: o.capsule }),
		/* @__PURE__ */ (0, z.jsx)(vn, {
			table: a,
			host: o.help
		})
	] }) : null;
}
function ws({ renderLegacy: e, messages: t, hosts: n, shortcuts: r, board: i, workspace: a, point: o }) {
	let s = document.createElement("div");
	s.hidden = !0, document.body.append(s);
	let c = (0, Pi.createRoot)(s), l = null, u = null, f = null, p = null, m = 0, h = () => c.render(/* @__PURE__ */ (0, z.jsx)(d.Provider, {
		value: t,
		children: /* @__PURE__ */ (0, z.jsx)(Cs, {
			state: l,
			draw: m,
			statusState: u,
			connection: f,
			app: p,
			shortcuts: r,
			hosts: n,
			board: i,
			workspace: a,
			point: o,
			renderLegacy: e
		})
	}));
	return (0, Ni.flushSync)(h), te("/app.json").then((e) => e.json()).then((e) => {
		p = e, h();
	}).catch(() => {
		p = {}, h();
	}), {
		apply(e, t = !1) {
			l = e, t && u || (u = e), m++, (0, Ni.flushSync)(h);
		},
		connection(e) {
			f = e, (0, Ni.flushSync)(h);
		},
		dispose() {
			c.unmount(), s.remove();
		}
	};
}
// src/main.tsx
var Ts = dn(), Es = Gr(Wr()), Ds = (e) => {
	si(e), Ts?.update(e);
}, Os = () => {
	let { cursor: e } = p();
	e != null && Xr(e);
}, ks = {
	exit: Zr,
	zoomIn: Es.zoomIn,
	zoomOut: Es.zoomOut,
	zoomFit: Es.zoomFit,
	zoomMenuPick: Es.zoomMenuPick,
	toggleZoomMenu: Es.toggleZoomMenu,
	pickSystemUi: Qr
}, As = {
	choose: kr,
	cancel: Ar,
	follow: Fr,
	pick: wr,
	peek: Tr,
	jump: Er,
	close: Z
};
Or();
var js = {
	screen: () => L.st ? He() ? "gallery" : L.st.screen : "offline",
	tabCount: en,
	moveCursor: v,
	openCursor: Os,
	exitFocus: Zr,
	openGallery: We,
	stepTab: Qt,
	jumpTab: $t,
	openQuickOpen: Ot,
	helpOpen: gn,
	toggleHelp: _n,
	zoomIn: ks.zoomIn,
	zoomOut: ks.zoomOut,
	zoomFit: ks.zoomFit
}, Ms = ki(k, js);
Mi(Ms, js, {
	chooserOpen: () => !!document.getElementById("chooser")?.classList.contains("on"),
	cancelChoice: Ar,
	closeZoomMenu: Es.closeZoomMenu,
	closeDeviceMenu: Es.closeDeviceMenu,
	closeDirPop: ln,
	closeRailDrawer: Xt,
	closeCard: Dr,
	closeSheet: Ke,
	sheetOpen: Je,
	openSheetFile: () => document.querySelector("#galleryView .gsheet-go")?.click()
});
var Ns = ws({
	renderLegacy: Ds,
	messages: {
		phrase: k,
		daemonText: O
	},
	hosts: Ss(),
	shortcuts: Ms,
	board: {
		open: Xr,
		point: Ir
	},
	workspace: ks,
	point: As
});
Oi({
	workspace: Es,
	render: Ns.apply,
	onConnection: Ns.connection,
	onPreviewFiles: () => {
		kt(), Xe(), _r();
	},
	prepared: Ts
});
for (let e of [
	"bar",
	"rail",
	"panel",
	"strip",
	"chooser"
]) document.getElementById(e)?.addEventListener("mousedown", (e) => {
	e.button === 0 && e.target.closest("button, [role=button]") && e.preventDefault();
});
try {
	for (let e of Object.keys(localStorage)) e.startsWith("prevue.search:") && localStorage.removeItem(e);
} catch {}
