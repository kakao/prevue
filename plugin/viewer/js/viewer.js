import { i as e, n as t, r as n, t as r } from "./react.js";
import { createScene as i, handoffMs as a, i as o, n as s, r as c, sceneEasing as l, sceneMs as u, t as d } from "./preparation-scene.js";
import { applyReveal as f, boardMarks as p, cancelReveal as m, cardAt as h, cardStage as g, clearTrees as _, moveCursor as v, onRelayout as y, returnCard as b, reveal as x, ringCard as S, setCursor as C, stuckHead as w, subscribeBoard as T, syncBoard as E, trees as D } from "./board.js";
import { daemonText as O, phrase as k } from "./strings.js";
import { connect as ee, fetchGalleryCard as A, fetchPreviewFiles as j, fetchProjectFiles as M, get as te, post as N, reportStreamWidth as ne, viewerStream as re } from "./api.js";
import { capsuleContent as P, dismissOnce as ie, flash as F, hideOnce as ae, renderError as oe, setStatus as se, setSummary as ce, showOnce as le, subscribeCapsule as ue } from "./capsule.js";
import { MORPH_LEAD as de, frameMorph as fe, freeze as pe, hold as me, motionMs as I, motionToken as he, radiiOf as ge, reduced as _e, swapImage as ve, transition as ye, transitioning as be } from "./motion.js";
import { createStore as xe, store as L } from "./store.js";
import { DP_MAX as Se, DP_MIN as R, createResizeScene as Ce, itemName as we, silhouette as Te, slAt as z, stepOf as Ee } from "./resize-scene.js";
import { DEVICES as De, DEVICE_MENU as Oe } from "./devices.js";
// src/components/FileIcon.tsx
var B = e(), V = t(), ke = (e) => e ? e.startsWith("android") ? "android" : "kmp" : "file", Ae = /* @__PURE__ */ (0, V.jsx)("path", { d: "M7 13H2.5V1.5h5L10 4V7" }), je = {
	file: /* @__PURE__ */ (0, V.jsx)("path", { d: "M4 2h5.5L12 4.5V14H4z" }),
	android: /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [Ae, /* @__PURE__ */ (0, V.jsxs)("g", {
		className: "mk-android",
		transform: "translate(5.5 6.4) scale(.75)",
		children: [/* @__PURE__ */ (0, V.jsx)("path", {
			fill: "currentColor",
			stroke: "none",
			d: "M2 12a6 6 0 0 1 12 0z"
		}), /* @__PURE__ */ (0, V.jsx)("path", {
			d: "M4.8 6.4 3.4 4.2M11.2 6.4l1.4-2.2",
			strokeWidth: "1.6"
		})]
	})] }),
	kmp: /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [Ae, /* @__PURE__ */ (0, V.jsx)("path", {
		className: "mk-kmp",
		fill: "currentColor",
		stroke: "none",
		transform: "translate(7.2 7.2) scale(.18333)",
		d: "M0 22.5629V0.0835311L22.4794 22.5629H0ZM0 25.4372V48H0.0572568L22.6201 25.4372H0ZM25.9906 22.0094L48 0H3.98128L25.9906 22.0094ZM26.0193 26.1028L4.1221 48H47.9164L26.0193 26.1028Z"
	})] })
};
function Me({ kind: e }) {
	return /* @__PURE__ */ (0, V.jsx)("svg", {
		className: "rt-ic",
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.4",
		strokeLinejoin: "round",
		strokeLinecap: "round",
		"aria-hidden": "true",
		children: je[e]
	});
}
// src/match.ts
var H = -1e9, Ne = /[/._\-\s]/, Pe = (e) => e !== e.toLowerCase();
function Fe(e, t) {
	if (t === 0) return !0;
	let n = e[t - 1], r = e[t];
	return Ne.test(n) || Pe(r) && !Pe(n) || /\d/.test(r) && !/\d/.test(n);
}
function Ie(e, t) {
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
	let o = Array.from({ length: n }, () => new Float64Array(r).fill(H)), s = Array.from({ length: n }, () => new Int32Array(r).fill(-1));
	for (let e = 0; e < r; e++) a[e] === i[0] && (o[0][e] = 1 + (Fe(t, e) ? 8 : 0) + (e === 0 ? 4 : 0) - e * .02);
	for (let e = 1; e < n; e++) {
		let n = H, c = -1;
		for (let l = e; l < r; l++) {
			if (l >= 2 && o[e - 1][l - 2] > n && (n = o[e - 1][l - 2], c = l - 2), a[l] !== i[e]) continue;
			let r = Fe(t, l) ? 8 : 0, u = o[e - 1][l - 1] > H ? o[e - 1][l - 1] + 1 + 5 + r : H, d = n > H ? n + 1 + r - 3 : H;
			u >= d && u > H ? (o[e][l] = u, s[e][l] = l - 1) : d > H && (o[e][l] = d, s[e][l] = c);
		}
	}
	let c = H, l = -1;
	for (let e = 0; e < r; e++) o[n - 1][e] > c && (c = o[n - 1][e], l = e);
	if (l < 0) return null;
	let u = Array(n);
	for (let e = n - 1; e >= 0; e--) u[e] = l, l = s[e][l];
	return {
		score: c,
		idx: u
	};
}
var Le = (e) => e.dir ??= e.rel.slice(0, e.rel.length - e.name.length).toLowerCase(), Re = {
	name: 30,
	fn: 15,
	path: 0
};
function ze(e, t) {
	let n = 0, r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of e) {
		let e = null, o = Ie(a, t.name);
		o && (e = {
			s: o.score + Re.name,
			kind: "name",
			idx: o.idx
		});
		for (let n of t.functions) {
			let t = Ie(a, n);
			t && (!e || t.score + Re.fn > e.s) && (e = {
				s: t.score + Re.fn,
				kind: "fn",
				fn: n,
				idx: t.idx
			});
		}
		if (!e && Le(t).includes(a.toLowerCase()) && (e = {
			s: 10 + Re.path,
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
var U = (e) => {
	let t = (e?.tabs || []).find((e) => e.active);
	return t ? t.key : e?.board?.file ?? null;
};
function Be(e, t) {
	if (!e || t == null) return null;
	for (let n of e.groups) for (let e of n.cards) if (e.index === t) return e;
	return null;
}
// src/gallery/layer.ts
var W = {
	open: !1,
	openedOver: null,
	files: null,
	ready: !1,
	sheet: null
}, Ve = /* @__PURE__ */ new Set();
function He(e) {
	if (!Object.keys(e).every((t) => W[t] === e[t])) {
		W = {
			...W,
			...e
		};
		for (let e of Ve) e();
	}
}
var Ue = (e) => (Ve.add(e), () => {
	Ve.delete(e);
}), We = () => W, Ge = () => (0, B.useSyncExternalStore)(Ue, We), G = () => W, Ke = !1, qe = 0, Je = () => Ke;
function Ye(e) {
	Ke = e;
}
function Xe() {
	He({
		open: !0,
		openedOver: U(L.st)
	});
}
function Ze() {
	He({
		open: !1,
		sheet: null
	});
}
function Qe(e) {
	He({ sheet: {
		path: e,
		closing: !1
	} });
}
function $e() {
	let e = W.sheet;
	return !e || !Ke ? !1 : (e.closing || He({ sheet: {
		...e,
		closing: !0
	} }), !0);
}
function et() {
	He({ sheet: null });
}
var tt = () => Ke && !!W.sheet;
async function nt() {
	let e = ++qe, t = await j().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === qe && He(t);
}
function rt() {
	Ke && nt();
}
addEventListener("visibilitychange", () => {
	Ke && document.visibilityState === "visible" && nt();
});
function it(e, t) {
	let n = Ge();
	return t === "lost" || !e?.header.repo ? !1 : e.screen === "empty" || n.open && e.screen !== "focus" && U(e) === n.openedOver;
}
// src/components/QuickOpen.tsx
var at = 8, ot = 5, st = [], ct = (e) => e.map((e) => ({
	...e,
	name: e.rel.split("/").pop()
}));
function lt(e) {
	if (!e || !e.fns.size) return null;
	let t = null;
	for (let [n, r] of e.fns) (!t || r.size > t[1].size) && (t = [n, r]);
	return {
		fn: t[0],
		idx: t[1],
		more: e.fns.size - 1
	};
}
function ut(e, t, n) {
	let r = t.trim().split(/\s+/).filter(Boolean);
	if (!e) return {
		sections: [],
		more: 0,
		empty: !r.length,
		loading: !0
	};
	if (!r.length) {
		let t = new Map(e.map((e) => [e.path, e])), r = e.slice(0, ot), i = new Set(r.map((e) => e.path)), a = n.map((e) => t.get(e)).filter((e) => !!e && !i.has(e.path)), o = at - r.length, s = a.length < o ? e.slice(ot).filter((e) => !a.includes(e)).slice(0, o - a.length) : [], c = [{
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
		let e = ze(r, t);
		e && i.push({
			f: t,
			m: e
		});
	}
	i.sort((e, t) => t.m.score - e.m.score || t.f.mtime - e.f.mtime);
	let a = i.slice(0, at).map((e) => ({
		...e,
		fn: lt(e.m)
	}));
	return {
		sections: a.length ? [{ rows: a }] : [],
		more: Math.max(0, i.length - at),
		empty: !1,
		loading: !1
	};
}
function dt({ text: e, idx: t }) {
	if (!t?.size) return e;
	let n = [];
	return [...e].forEach((e, r) => {
		let i = t.has(r), a = n[n.length - 1];
		a && a[1] === i ? a[0] += e : n.push([e, i]);
	}), n.map(([e, t], n) => t ? /* @__PURE__ */ (0, V.jsx)("b", { children: e }, n) : e);
}
var ft = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.4",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M3 8h10M9 4l4 4-4 4" })
}), pt = (e) => (e || "").replace(/^:/, "").replace(/:/g, "/"), mt = -1, ht = -1, gt = !1;
addEventListener("mousemove", (e) => {
	gt = e.screenX !== mt || e.screenY !== ht, mt = e.screenX, ht = e.screenY;
}, !0);
var _t = (0, B.memo)(function({ files: e, ready: t, query: n, sel: r, recent: i = st, fieldRef: a, onQuery: o, onSelect: l, onPick: u, onEscape: d, onLeave: f }) {
	let { phrase: p } = s(), m = (0, B.useRef)(null), h = (0, B.useRef)(null), [g, _] = (0, B.useState)(null), v = (0, B.useRef)({
		fieldRef: a,
		onQuery: o
	});
	v.current = {
		fieldRef: a,
		onQuery: o
	};
	let y = (0, B.useCallback)((e) => {
		_(e), v.current.fieldRef?.(e);
	}, []), b = (0, B.useMemo)(() => e && ct(e), [e]), { sections: x, more: S, empty: C, loading: w } = (0, B.useMemo)(() => ut(b, n, i), [
		b,
		n,
		i
	]), T = (0, B.useMemo)(() => x.flatMap((e) => e.rows), [x]), E = Math.min(r, T.length - 1);
	(0, B.useLayoutEffect)(() => {
		r > E && l(E);
	}, [r, E]), (0, B.useLayoutEffect)(() => {
		if (!g) return;
		let e = () => v.current.onQuery(g.value, g.value.trim() ? 0 : -1);
		return g.addEventListener("input", e), () => g.removeEventListener("input", e);
	}, [g]), (0, B.useLayoutEffect)(() => {
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
	}, O = (e, t) => /* @__PURE__ */ (0, V.jsxs)("div", {
		className: t === E ? "qo-row sel" : "qo-row",
		role: "option",
		"aria-selected": t === E,
		"data-i": t,
		style: { "--i": t },
		title: e.f.rel,
		onMouseDown: (e) => e.preventDefault(),
		onMouseMove: () => {
			gt && E !== t && l(t);
		},
		onClick: () => u?.(e),
		children: [
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "qo-arrow",
				children: ft
			}),
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "qo-name",
				children: /* @__PURE__ */ (0, V.jsx)(dt, {
					text: e.f.name,
					idx: e.m?.name
				})
			}),
			e.fn && /* @__PURE__ */ (0, V.jsxs)("span", {
				className: "qo-fn",
				children: [
					"› ",
					/* @__PURE__ */ (0, V.jsx)(dt, {
						text: e.fn.fn,
						idx: e.fn.idx
					}),
					e.fn.more ? /* @__PURE__ */ (0, V.jsx)("span", {
						className: "qo-fn-more",
						children: ` +${e.fn.more}`
					}) : null
				]
			}),
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "qo-mod",
				children: pt(e.f.module)
			})
		]
	}, e.f.path), k = null;
	w || !t && !T.length ? k = /* @__PURE__ */ (0, V.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.loading")
	}) : T.length || (k = C ? /* @__PURE__ */ (0, V.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.none")
	}) : /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "qo-none",
		children: [p("quickopen.noMatch", { q: n.trim() }), /* @__PURE__ */ (0, V.jsx)("div", {
			className: "qo-why",
			children: p("quickopen.noMatch.why")
		})]
	}));
	let ee = 0;
	return /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "qo-col",
		ref: m,
		onMouseDown: (e) => {
			e.target !== g && e.preventDefault();
		},
		children: [
			/* @__PURE__ */ (0, V.jsxs)("label", {
				className: "qo-field",
				children: [
					/* @__PURE__ */ (0, V.jsxs)("svg", {
						viewBox: "0 0 16 16",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinecap: "round",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, V.jsx)("circle", {
							cx: "7",
							cy: "7",
							r: "4.5"
						}), /* @__PURE__ */ (0, V.jsx)("path", { d: "m10.5 10.5 3 3" })]
					}),
					/* @__PURE__ */ (0, V.jsx)("input", {
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
					/* @__PURE__ */ (0, V.jsx)("kbd", {
						className: "qo-esc",
						"aria-hidden": "true",
						children: "esc"
					})
				]
			}),
			/* @__PURE__ */ (0, V.jsxs)("div", {
				className: "qo-in",
				id: "qoIn",
				role: "listbox",
				"aria-label": p("quickopen.list"),
				ref: h,
				children: [
					k,
					x.map((e, t) => [e.title ? /* @__PURE__ */ (0, V.jsx)("div", {
						className: "qo-h",
						children: p(e.title)
					}, `h${t}`) : null, ...e.rows.map((e) => O(e, ee++))]),
					S ? /* @__PURE__ */ (0, V.jsx)("div", {
						className: "qo-foot",
						children: p("quickopen.more", { n: S })
					}) : null
				]
			}),
			/* @__PURE__ */ (0, V.jsx)("div", {
				className: "qo-hint",
				children: /* @__PURE__ */ (0, V.jsxs)("span", {
					className: "qo-keys",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, V.jsx)("span", { children: p("quickopen.keys.move") }),
						/* @__PURE__ */ (0, V.jsx)("span", { children: p("quickopen.keys.open") }),
						/* @__PURE__ */ (0, V.jsx)("span", { children: p("quickopen.keys.close") })
					]
				})
			})
		]
	});
});
function vt({ hosts: e, children: t }) {
	let { place: n } = o(e?.sheet);
	return n(t, (e, t) => /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("div", {
		className: "qo-curtain on",
		id: "qoCurtain"
	}), /* @__PURE__ */ (0, V.jsx)("div", {
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
}, yt = /* @__PURE__ */ new Set();
function bt(e, t = !1) {
	if (!Object.keys(e).every((t) => K[t] === e[t]) && (K = {
		...K,
		...e
	}, !t)) for (let e of yt) e();
}
var xt = (e) => (yt.add(e), () => {
	yt.delete(e);
}), St = () => K, Ct = null, q = null, wt = null, Tt = null, Et = 0, Dt = !1, Ot = !1, kt = null, At = 0, jt = () => "prevue.recent:" + (L.st?.header.repo || "");
function Mt() {
	try {
		return JSON.parse(localStorage.getItem(jt()) || "[]");
	} catch {
		return [];
	}
}
function Nt(e, t = !1) {
	if (!e) return;
	let n = [e, ...Mt().filter((t) => t !== e)].slice(0, 20);
	try {
		localStorage.setItem(jt(), JSON.stringify(n));
	} catch {}
	bt({ recent: n }, t);
}
async function Pt() {
	let e = ++At, t = await j().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === At && bt(t);
}
function Ft(e = null) {
	if (Ct) {
		if (!K.open) {
			let { sheet: t, curtain: n } = Ct;
			Dt = !0, Tt = e && e !== document.body ? e : null, wt?.setAttribute("aria-expanded", "true"), t.hidden = !1, n.hidden = !1, t.classList.remove("closing"), bt({
				open: !0,
				query: "",
				sel: -1,
				recent: Mt()
			}), requestAnimationFrame(() => {
				K.open && (n.classList.add("on"), t.classList.add("on"));
			}), Pt();
		}
		q?.focus({ preventScroll: !0 }), q?.select();
	}
}
function It(e = !1, t = !1) {
	if (Et = 0, !K.open || !Ct) return;
	let { sheet: n, curtain: r } = Ct;
	q && (q.value = "", q.blur()), t && Tt?.isConnected && Tt.focus({ preventScroll: !0 }), Tt = null, bt({ open: !1 }), wt?.setAttribute("aria-expanded", "false"), r.classList.remove("on"), n.classList.remove("on"), e ? (n.hidden = !0, r.hidden = !0) : (n.classList.add("closing"), setTimeout(() => {
		K.open || (n.hidden = !0, r.hidden = !0, n.classList.remove("closing"));
	}, 220));
}
function Lt() {
	K.open && Pt();
}
function Rt() {
	let e = Et = performance.now();
	setTimeout(() => {
		Et === e && It();
	}, 1500);
}
async function zt(e, { phrase: t, daemonText: n }) {
	let r = e.f, i = L.st, a = e.fn ? e.fn.fn : null;
	if (Nt(r.path, !0), r.path === U(i)) {
		Ze(), x(r.path, a), i?.screen === "focus" && i.focus ? (Rt(), N("/viewer/exit")) : (It(), f());
		return;
	}
	x(r.path, a), Rt();
	let o = await N("/viewer/open", { file: r.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	o.ok || (Et = 0, m(), F(n(o.message) || t("open.cannot")));
}
var Bt = (e) => {
	e ? q = e : q && !q.isConnected && (q = null);
}, Vt = (e, t) => bt({
	query: e,
	sel: t
}), Ht = (e) => bt({ sel: e }), Ut = () => It(!1, !0), Wt = (e) => {
	K.open && Ct && e && !Ct.sheet.contains(e) && e !== wt && It();
}, Gt = (0, B.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, B.useLayoutEffect)(() => {
		if (!n) return;
		wt = n, n.title = t("rail.open.tip"), n.setAttribute("aria-label", t("rail.open.label"));
		let e = (e) => K.open ? It(!1, !0) : Ft(e.detail === 0 ? n : null);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), wt = null;
		};
	}, [n, t]), r(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsx)("svg", {
			viewBox: "0 0 16 16",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinecap: "round",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M8 3.5v9M3.5 8h9" })
		}),
		/* @__PURE__ */ (0, V.jsx)("span", {
			className: "rail-open-t",
			children: t("rail.open")
		}),
		/* @__PURE__ */ (0, V.jsx)("kbd", { children: "⌘K" })
	] }), (e, t) => /* @__PURE__ */ (0, V.jsx)("button", {
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
function Kt({ state: e, draw: t, connection: n, hosts: r }) {
	let i = s(), a = (0, B.useSyncExternalStore)(xt, St);
	(0, B.useLayoutEffect)(() => {
		Ct = r;
		let e = (e) => {
			let t = e.target;
			K.open && !r.sheet.contains(t) && !r.curtain.contains(t) && !wt?.contains(t) && It();
		}, t = () => It(!1, !0);
		return document.addEventListener("pointerdown", e, !0), r.curtain.addEventListener("click", t), () => {
			document.removeEventListener("pointerdown", e, !0), r.curtain.removeEventListener("click", t), Ct = null;
		};
	}, [r]), (0, B.useLayoutEffect)(() => {
		if (!e) return;
		let t = U(e);
		t && t !== kt && (kt = t, Nt(t)), Et && e.screen !== "empty" && It(!0);
	}, [t]), (0, B.useLayoutEffect)(() => {
		n === "lost" && It(!0);
	}, [n]), (0, B.useLayoutEffect)(() => {
		Dt ? (r.sheet.classList.add("enter"), Dt = !1, Ot = !0, requestAnimationFrame(() => {
			Ot = !1;
		})) : Ot || r.sheet.classList.remove("enter");
	});
	let o = (0, B.useCallback)((e) => zt(e, i), [i]), c = /* @__PURE__ */ (0, V.jsx)(_t, {
		files: a.files,
		ready: a.ready,
		query: a.query,
		sel: a.sel,
		recent: a.recent,
		fieldRef: Bt,
		onQuery: Vt,
		onSelect: Ht,
		onPick: o,
		onEscape: Ut,
		onLeave: Wt
	});
	return /* @__PURE__ */ (0, V.jsx)(vt, {
		hosts: r,
		children: c
	});
}
// src/components/fit.ts
var qt = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
function Jt(e) {
	let t = e.match(qt) || [e], n = "";
	for (let e = t.length - 1; e > 0 && !(n && (t[e] + n).length > 12); e--) n = t[e] + n;
	return n.length >= e.length - 2 ? "" : n;
}
var Yt = null, Xt = (e, t) => (Yt ??= document.createElement("canvas").getContext("2d"), Yt.font = t, Yt.measureText(e).width), Zt = (e) => {
	let t = getComputedStyle(e);
	return `${t.fontWeight} ${t.fontSize} ${t.fontFamily}`;
};
function Qt(e, t, n) {
	if (Xt(e, n) <= t) return e;
	let r = Jt(e), i = r.match(qt) || [], a = i.map((e, t) => i.slice(t).join(""));
	for (let [r, i] of [...a.map((e) => [e, 3]), [a[a.length - 1] || "", 1]]) for (let a = e.length - r.length - 1; a >= i; a--) {
		let i = e.slice(0, a) + "…" + r;
		if (Xt(i, n) <= t) return i;
	}
	for (let i = 1; i < r.length; i++) {
		let a = e[0] + "…" + r.slice(i);
		if (Xt(a, n) <= t) return a;
	}
	return e[0] + "…";
}
// src/components/FileRail.tsx
var $t = "prevue.sharedOnce", en = [], tn = matchMedia("(max-width: 640px)"), nn = (e) => {}, rn = () => document.body.classList.contains("rail-drawer"), an = () => rn() ? (nn(!1), !0) : !1, on = [];
function sn(e) {
	let t = on.findIndex((e) => e.active), n = on[Math.max(0, Math.min(on.length - 1, t + e))];
	n && (n.active ? Ze() : N("/viewer/tab", { key: n.key }));
}
function cn(e) {
	let t = on[e - 1];
	t && (t.active ? Ze() : N("/viewer/tab", { key: t.key }));
}
var ln = () => on.length, un = 56;
function dn(e, t, n = !1) {
	let r = [...t.querySelectorAll(".rt:not(.leaving)")];
	if (!r.length || e.hidden) return;
	let i = (e, t) => e.querySelector(t), a = Zt(i(r[0], ".rt-name")), o = Zt(i(r[0], ".rt-mod")), s = parseFloat(getComputedStyle(r[0]).columnGap) || 0, c = (t) => t.dataset.name + "|" + i(t, ".rt-mod").textContent + "|" + e.clientWidth, l = r.filter((e) => n || e.dataset.fitted !== c(e));
	if (!l.length) return;
	for (let e of l) i(e, ".rt-mod").style.maxWidth = "0px";
	let u = l.map((e) => i(e, ".rt-name").clientWidth + (i(e, ".rt-mod").textContent ? s : 0));
	l.forEach((e, t) => {
		let n = i(e, ".rt-name"), r = i(e, ".rt-mod"), l = u[t], d = l;
		if (r.textContent) {
			let t = Math.min(Math.ceil(Xt(r.textContent, o)), Math.max(l - s - Math.ceil(Xt(e.dataset.name, a)), un));
			r.style.maxWidth = t + "px", d = l - s - t;
		} else r.style.maxWidth = "";
		n.textContent = Qt(e.dataset.name, d, a), e.dataset.fitted = c(e);
	});
}
function fn({ tab: e, leaving: t, enter: n, onGone: r, observe: i }) {
	let { phrase: a } = s(), o = (0, B.useRef)(null), [l, u] = (0, B.useState)(n);
	(0, B.useLayoutEffect)(() => {
		let e = o.current;
		c(e), i(e, !0);
		let t = 0;
		return l && (t = requestAnimationFrame(() => {
			t = requestAnimationFrame(() => u(!1));
		})), () => {
			cancelAnimationFrame(t), i(e, !1);
		};
	}, []), (0, B.useLayoutEffect)(() => {
		if (!t) return;
		let n = o.current;
		if (_e.matches || document.hidden) {
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
	let d = ke(e.sourceSet), f = () => N("/viewer/close", { key: e.key });
	return /* @__PURE__ */ (0, V.jsxs)("div", {
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
			e.active ? (an(), Ze()) : N("/viewer/tab", { key: e.key });
		},
		onAuxClick: (e) => {
			e.button === 1 && (e.preventDefault(), f());
		},
		children: [
			/* @__PURE__ */ (0, V.jsx)(Me, { kind: d }),
			/* @__PURE__ */ (0, V.jsx)("span", { className: "rt-name" }),
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "rt-mod",
				children: ((e.dim || "") + (e.module ? " · " + e.module : "")).replace(/^\s*·\s*/, "")
			}),
			/* @__PURE__ */ (0, V.jsx)("button", {
				type: "button",
				className: "rt-x",
				tabIndex: -1,
				"aria-label": a("tabs.close"),
				onClick: (e) => {
					e.stopPropagation(), f();
				},
				children: /* @__PURE__ */ (0, V.jsx)("svg", {
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, V.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
				})
			})
		]
	});
}
function pn({ tabs: e, screen: t, gallery: n = !1, hosts: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(r?.list), [l, u] = (0, B.useState)(null), [d, f] = (0, B.useState)(null), p = r?.rail ?? l, m = r?.empty ?? d, h = (0, B.useRef)(null), g = e ?? en, _ = t !== "focus", v = (0, B.useRef)(g), [y, b] = (0, B.useState)([]);
	if (v.current !== g) {
		let e = new Set(g.map((e) => e.key)), t = v.current.filter((t) => !e.has(t.key) && !y.some((e) => e.key === t.key));
		(t.length || y.some((t) => e.has(t.key))) && b([...y.filter((t) => !e.has(t.key)), ...t]), v.current = g;
	}
	let x = (e) => b((t) => t.filter((t) => t.key !== e)), S = (0, B.useRef)(!1), C = (0, B.useRef)(null), w = S.current && _ && !_e.matches && !document.hidden, T = (0, B.useRef)({
		y: 0,
		stretch: null,
		sliding: !1
	}), E = (e) => {
		let t = h.current, n = T.current;
		if (!t || !a) return;
		let r = D.current ? null : a.querySelector(".rt.active:not(.leaving)");
		if (t.hidden = !r, !r) return;
		let i = r.offsetTop;
		e && !_e.matches && i !== n.y ? (n.stretch?.cancel(), n.sliding = !0, (n.stretch = t.animate([{ transform: `translateY(${n.y}px)` }, { transform: `translateY(${i}px)` }], {
			duration: I("--duration-medium2"),
			easing: he("--easing-standard")
		})).finished.then(() => {
			n.stretch = null, n.sliding = !1;
		}, () => {})) : n.stretch && !e && (n.stretch.cancel(), n.stretch = null, n.sliding = !1), n.y = i, t.style.transform = `translateY(${i}px)`;
	}, D = (0, B.useRef)(n);
	D.current = n;
	let O = (0, B.useRef)(E);
	O.current = E;
	let [k] = (0, B.useState)(() => new ResizeObserver(() => O.current(T.current.sliding))), ee = (e, t) => {
		e && (t ? k.observe(e) : k.unobserve(e));
	};
	(0, B.useEffect)(() => () => k.disconnect(), [k]), (0, B.useEffect)(() => {
		p && a && document.fonts?.ready.then(() => dn(p, a, !0));
	}, [p, a]), (0, B.useEffect)(() => {
		if (!r) return;
		let { toggle: e, scrim: t, open: n, all: i } = r;
		nn = (t) => {
			document.body.classList.toggle("rail-drawer", t), e.setAttribute("aria-expanded", String(t));
		};
		let a = () => nn(!rn()), o = () => nn(!1);
		return e.addEventListener("click", a), t.addEventListener("click", o), n.addEventListener("click", o), i.addEventListener("click", o), tn.addEventListener("change", o), () => {
			e.removeEventListener("click", a), t.removeEventListener("click", o), n.removeEventListener("click", o), i.removeEventListener("click", o), tn.removeEventListener("change", o);
		};
	}, [r]), (0, B.useLayoutEffect)(() => {
		if (!e || !p || !a) return;
		p.hidden = !_, _ || an(), r && document.body.classList.toggle("rail-on", _), m && (m.hidden = e.length > 0), dn(p, a), on = e;
		let t = e.find((e) => e.active);
		t && ke(t.sourceSet) === "kmp" ? le($t, () => i("capsule.sharedOnce", { sourceSet: t.sourceSet })) : ae($t);
		let n = t?.key ?? null, o = S.current && _ && n !== C.current && C.current !== null;
		o && an(), C.current = n, S.current = _, E(o);
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
	}))], j = /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("div", {
		className: "rail-glider instant",
		id: "railGlider",
		ref: h,
		hidden: !0
	}), A.map(({ tab: e, leaving: t }) => /* @__PURE__ */ (0, V.jsx)(fn, {
		tab: e,
		leaving: t,
		enter: w,
		onGone: x,
		observe: ee
	}, e.key))] });
	return r ? /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [c(j, () => null), /* @__PURE__ */ (0, V.jsx)(Gt, { host: r.open })] }) : /* @__PURE__ */ (0, V.jsxs)("nav", {
		className: "rail",
		id: "rail",
		ref: u,
		"aria-label": i("rail.title"),
		children: [
			/* @__PURE__ */ (0, V.jsx)("h4", {
				className: "rail-h",
				children: i("rail.title")
			}),
			c(j, (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
				className: "rail-list",
				id: "railList",
				ref: e,
				role: "tablist",
				"aria-orientation": "vertical",
				children: t
			})),
			/* @__PURE__ */ (0, V.jsx)("p", {
				className: "rail-empty",
				id: "railEmpty",
				ref: f,
				hidden: !0,
				children: i("rail.empty")
			}),
			/* @__PURE__ */ (0, V.jsx)(Gt, {})
		]
	});
}
// src/components/ProjectHeader.tsx
var mn = 8, hn = (e) => [...e].reduce((e, t) => e * 31 + t.codePointAt(0) >>> 0, 7) % mn + 1, gn = () => !1, _n = () => gn();
function vn({ header: e, tabs: t, app: n, iconUrl: r = "/app-icon.png", host: i, brand: a }) {
	let { phrase: c } = s(), { element: l, place: u } = o(i), [d, f] = (0, B.useState)(!1), [p, m] = (0, B.useState)(null), h = (0, B.useRef)({
		open: !1,
		byKey: !1
	}), g = (0, B.useRef)(null), _ = (0, B.useRef)(null), v = (0, B.useRef)(null), y = e ? n?.name || e.repoLeaf : "";
	(0, B.useLayoutEffect)(() => {
		a && n?.prevue && (a.title = `Prevue ${n.prevue}`);
	}, [a, n]), (0, B.useLayoutEffect)(() => {
		v.current?.style.setProperty("background", e ? `var(--avatar-${hn(y)})` : "");
	}, [e, y]), (0, B.useLayoutEffect)(() => {
		if (!e || !i) return;
		let n = t.find((e) => e.active);
		document.title = n ? `${n.name} — ${y}` : y;
	}, [
		e,
		i,
		t,
		y
	]), (0, B.useEffect)(() => {
		gn = () => {
			if (!h.current.open) return !1;
			h.current.open = !1;
			let e = document.activeElement;
			return e && _.current?.contains(e) && (h.current.byKey ? g.current?.focus({ preventScroll: !0 }) : e.blur()), m(null), !0;
		};
		let e = (e) => {
			!_.current?.contains(e.target) && e.target !== g.current && gn();
		};
		return addEventListener("pointerdown", e), () => {
			removeEventListener("pointerdown", e), gn = () => !1;
		};
	}, []);
	let b = (e, t) => {
		navigator.clipboard.writeText(e).then(() => F(c("header.copied", {
			what: t,
			text: e
		})), () => F(e));
	}, x = (e) => {
		gn() || (h.current = {
			open: !0,
			byKey: e.detail === 0
		}, m({ left: Math.round(e.currentTarget.getBoundingClientRect().left - (l?.getBoundingClientRect().left ?? 0) - 6) }));
	}, S = e ? [
		e.module,
		e.sourceSet && /* @__PURE__ */ (0, V.jsx)("span", {
			title: c("header.sourceSet", { variant: e.variant }),
			children: e.sourceSet
		}, "ss"),
		e.variant
	].filter(Boolean).flatMap((e, t) => [" · ", /* @__PURE__ */ (0, V.jsx)(B.Fragment, { children: e }, t)]) : [];
	return u(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsx)("span", {
			className: "app-tile",
			id: "appTile",
			ref: v,
			"aria-hidden": "true",
			hidden: d,
			children: [...y][0] || ""
		}),
		/* @__PURE__ */ (0, V.jsx)("img", {
			className: "app-icon",
			id: "appIcon",
			alt: "",
			hidden: !d,
			src: n?.icon ? r : void 0,
			onLoad: () => f(!0)
		}),
		/* @__PURE__ */ (0, V.jsxs)("div", {
			className: "app-t",
			children: [/* @__PURE__ */ (0, V.jsx)("div", {
				className: "app-name",
				id: "appName",
				children: y
			}), /* @__PURE__ */ (0, V.jsxs)("div", {
				className: "proj",
				id: "proj",
				children: [
					/* @__PURE__ */ (0, V.jsx)("button", {
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
					/* @__PURE__ */ (0, V.jsxs)("button", {
						className: "pj pj-br",
						id: "pjBr",
						type: "button",
						title: c("brand.copyBranch"),
						hidden: !e?.branch,
						onClick: () => b(e?.branch || "", c("header.copy.branch")),
						children: [/* @__PURE__ */ (0, V.jsxs)("svg", {
							viewBox: "0 0 16 16",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "1.5",
							strokeLinecap: "round",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, V.jsx)("circle", {
									cx: "5",
									cy: "3.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, V.jsx)("circle", {
									cx: "5",
									cy: "12.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, V.jsx)("circle", {
									cx: "11",
									cy: "5.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, V.jsx)("path", { d: "M5 5v6M11 7c0 2.5-6 2-6 4" })
							]
						}), /* @__PURE__ */ (0, V.jsx)("span", {
							id: "pjBrName",
							children: e?.branch || ""
						})]
					}),
					/* @__PURE__ */ (0, V.jsx)("span", {
						className: "pj-rest",
						id: "pjRest",
						children: S
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, V.jsxs)("div", {
			className: `pop dir-pop${p ? " on" : ""}`,
			id: "dirPop",
			ref: _,
			role: "dialog",
			"aria-label": c("header.dir"),
			style: p ? { left: `${p.left}px` } : void 0,
			children: [/* @__PURE__ */ (0, V.jsx)("div", {
				className: "dir-path",
				id: "dirPath",
				children: (e?.repo || "").split(/(?<=\/)/).flatMap((e, t) => [e, /* @__PURE__ */ (0, V.jsx)("wbr", {}, t)])
			}), /* @__PURE__ */ (0, V.jsxs)("div", {
				className: "dir-act",
				children: [/* @__PURE__ */ (0, V.jsx)("button", {
					type: "button",
					id: "dirCopy",
					onClick: () => {
						b(e?.repo || "", c("header.copy.path")), gn();
					},
					children: c("header.dir.copy")
				}), /* @__PURE__ */ (0, V.jsx)("button", {
					type: "button",
					id: "dirReveal",
					hidden: n ? !n.reveal : !1,
					onClick: () => {
						N("/viewer/reveal"), gn();
					},
					children: c("header.dir.reveal")
				})]
			})]
		})
	] }), (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
		className: "app",
		id: "app",
		ref: e,
		children: t
	}));
}
// src/preparation/PreparationScreen.ts
function yn() {
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
	async function te(e, r) {
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
			te(e, u).catch((e) => {
				o && u === h && A(e.message);
			});
		},
		fail: A
	};
}
// src/components/ShortcutHelp.tsx
var bn = !1, xn = null, Sn = null, Cn = null, wn = () => bn;
function Tn(e = !bn, t = !1) {
	if (!Sn) return;
	let { scrim: n, sheet: r } = Sn;
	e && !bn && (xn = t && document.activeElement !== document.body ? document.activeElement : null), bn = e, e ? (n.hidden = !1, requestAnimationFrame(() => {
		bn && (n.classList.add("on"), r.focus({ preventScroll: !0 }));
	})) : (n.classList.remove("on"), setTimeout(() => {
		bn || (n.hidden = !0);
	}, 220), n.contains(document.activeElement) && document.activeElement.blur(), xn && xn.isConnected && xn.focus({ preventScroll: !0 }), xn = null), Cn?.setAttribute("aria-expanded", String(e));
}
var En = (0, B.memo)(function({ table: e, logo: t = "prevue.svg", host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = (0, B.useRef)(null);
	return (0, B.useLayoutEffect)(() => {
		if (!i || !c.current) return;
		Sn = {
			scrim: i,
			sheet: c.current
		};
		let e = (e) => {
			e.target === i && Tn(!1);
		};
		return i.addEventListener("click", e), () => {
			i.removeEventListener("click", e), Sn = null;
		};
	}, [i]), a(/* @__PURE__ */ (0, V.jsxs)("div", {
		className: "sheet",
		ref: c,
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "helpTitle",
		tabIndex: -1,
		children: [
			/* @__PURE__ */ (0, V.jsxs)("div", {
				className: "sheet-brand",
				children: [/* @__PURE__ */ (0, V.jsx)("img", {
					src: t,
					alt: ""
				}), "Prevue"]
			}),
			/* @__PURE__ */ (0, V.jsx)("h2", {
				id: "helpTitle",
				children: r("help.title")
			}),
			/* @__PURE__ */ (0, V.jsx)("div", {
				className: "sheet-body",
				children: e.map((e) => [/* @__PURE__ */ (0, V.jsx)("h3", { children: e.group }, `h${e.group}`), /* @__PURE__ */ (0, V.jsx)("dl", { children: e.rows.map((e, t) => [/* @__PURE__ */ (0, V.jsx)("dt", { children: e.cap.map((t, n) => [n && e.combo ? /* @__PURE__ */ (0, V.jsx)("span", {
					className: "plus",
					children: "+"
				}, `p${n}`) : null, /* @__PURE__ */ (0, V.jsx)("kbd", { children: t }, `k${n}`)]) }, `t${t}`), /* @__PURE__ */ (0, V.jsx)("dd", { children: e.label }, `d${t}`)]) }, `l${e.group}`)])
			})
		]
	}), (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
		className: "scrim",
		id: "help",
		ref: e,
		hidden: !0,
		children: t
	}));
}), Dn = (0, B.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, B.useLayoutEffect)(() => {
		if (!n) return;
		Cn = n, n.title = t("header.help.tip"), n.setAttribute("aria-label", t("header.help"));
		let e = (e) => Tn(!bn, e.detail === 0);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), Cn = null;
		};
	}, [n, t]), r("?", (e, t) => /* @__PURE__ */ (0, V.jsx)("button", {
		className: "icon-btn",
		id: "helpBtn",
		ref: e,
		type: "button",
		"aria-haspopup": "dialog",
		"aria-expanded": "false",
		children: t
	}));
}), On = Promise.resolve();
async function kn(e, t, n) {
	let r = await N("/viewer/touch", {
		x: t,
		y: n,
		type: e
	});
	r.ok || F(k("input.touch.failed", { status: r.status }));
}
function An(e, t, n) {
	On = On.then(() => kn(e, t, n)).catch(() => {});
}
var J = null, jn = () => !!J;
function Mn(e, t) {
	Fn(), J = [e, t], An("press", e, t);
}
function Nn(e, t) {
	J && Math.abs(e - J[0]) + Math.abs(t - J[1]) > 6 && (J = [e, t], zn(e, t));
}
function Pn(e, t) {
	J && (J = null, An("release", e, t));
}
function Fn() {
	J && Pn(...J);
}
function In() {
	J = null, Ln = null;
}
var Ln = null, Rn = !1;
function zn(e, t) {
	Ln = [e, t], Rn || (Rn = !0, On = On.then(() => {
		Rn = !1;
		let e = Ln;
		return Ln = null, e ? kn("drag", e[0], e[1]) : null;
	}).catch(() => {}));
}
var Bn = null;
function Vn(e, t, n, r) {
	Bn ? (Bn.dx += n, Bn.dy += r, Bn.x = e, Bn.y = t) : (Bn = {
		x: e,
		y: t,
		dx: n,
		dy: r
	}, On = On.then(() => {
		let e = Bn;
		return Bn = null, N("/viewer/wheel", {
			x: Math.round(e.x),
			y: Math.round(e.y),
			dx: e.dx,
			dy: e.dy
		});
	}).catch(() => {}));
}
// src/workspace/card.ts
var Hn = (e) => ({
	id: String(e.id),
	name: e.name || `${e.fileName}:${e.lineNumber}`
});
function Un(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = (e) => {
		for (let t = e.ups.length - 1; t >= 0; t--) if (n.has(e.ups[t])) return e.ups[t];
		return null;
	}, i = r(t), a = e.filter((e) => r(e) === i).sort((e, t) => e.id - t.id);
	return {
		ups: t.ups.filter((e) => n.has(e)).map((e) => Hn(n.get(e))),
		here: Hn(t),
		before: a.filter((e) => e.id < t.id).map(Hn),
		after: a.filter((e) => e.id > t.id).map(Hn),
		downs: e.filter((e) => r(e) === t.id).sort((e, t) => e.id - t.id).map(Hn)
	};
}
function Wn(e, t) {
	let [n, r, i, a] = e.bounds, o = t ?? 1;
	return {
		width: (i - n) * o,
		height: (a - r) * o,
		unit: t ? "dp" : "px",
		padded: !!e.mods?.some((e) => e.name === "padding")
	};
}
function Gn(e) {
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
function Kn(e, t) {
	if (e.origin === "compose" || e.origin === "library") return e.origin;
	if (e.origin !== "project" || !t || !e.name) return null;
	let n = t.modules.get(e.name);
	return n ? { module: n } : null;
}
function qn(e, t, n) {
	return !t || !e ? [] : (t.callers.get(e) || []).filter((e) => e.file !== n.file || e.fn !== n.fn);
}
// src/workspace/view.ts
var Jn = xe({
	pct: 100,
	real: !1,
	atFit: !0,
	menu: !1,
	disabled: !1
}), Yn = xe({
	on: !1,
	failed: !1
}), Xn = xe({
	host: null,
	shot: null,
	card: null
}), Zn = xe({ on: !1 }), Qn = (e, t) => e.every((e, n) => e === t[n]);
function $n(e) {
	if (e.modifiers) return e.modifiers;
	for (let t of e.children || []) if (Qn(t.bounds, e.bounds)) {
		let e = $n(t);
		if (e) return e;
	}
	return null;
}
function er(e) {
	let t = L.projectFiles.size ? (e) => L.projectFiles.has(e.fileName) : () => !0, n = [], r = (e, i, a, o) => {
		for (let s of e) {
			let { children: e, modifiers: c, ...l } = s, [u, d, f, p] = s.bounds, m = i.concat(s.name ? [s.name] : []), h = s.name && t(s) ? a.concat([s.name]) : a, g = o;
			if (f > u && p > d && s.lineNumber > 0) {
				let e = n.length;
				n.push({
					...l,
					id: e,
					ups: o,
					mods: $n(s),
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
var tr = (e, t) => e.area - t.area || t.chain.length - e.chain.length;
function nr(e) {
	return L.projectFiles.size ? e.filter((e) => L.projectFiles.has(e.fileName)) : e;
}
function rr(e, t, n) {
	return e.find((e) => {
		let [r, i, a, o] = e.bounds;
		return t >= r && t < a && n >= i && n < o;
	});
}
var ir = (e) => +(e.dataset.fullW ?? 0) || e.naturalWidth, ar = (e) => +(e.dataset.fullH ?? 0) || e.naturalHeight;
function or(e, t, n) {
	let r = ir(n), i = ar(n);
	return !r || !i ? 0 : Math.min(e / r, t / i);
}
function sr(e) {
	let t = e.getBoundingClientRect();
	return or(t.width, t.height, e) || 1;
}
function cr(e, t) {
	let n = t.getBoundingClientRect(), r = sr(t) || 1;
	return [Math.round((e.clientX - n.left) / r), Math.round((e.clientY - n.top) / r)];
}
function lr(e, t, n) {
	let [r, i, a, o] = t.bounds;
	e.style.left = r * n + "px", e.style.top = i * n + "px", e.style.width = (a - r) * n + "px", e.style.height = (o - i) * n + "px";
}
function ur(e, t, n) {
	e.hidden = !1, lr(e, t, n);
}
function dr(e, t, n) {
	t ? (lr(e, t, n), e.classList.add("on")) : e.classList.remove("on");
}
function fr(e, t) {
	t.classList.remove("over"), t.classList.contains("peek") || dr(e, null, 1);
}
var pr = /* @__PURE__ */ new WeakMap();
function mr(e, t, n) {
	let r = pr.get(e);
	r && r.list === t && r.s === n || (pr.set(e, {
		list: t,
		s: n
	}), L.projectFiles.size ? e.replaceChildren(...t.map((e) => {
		let t = document.createElement("div");
		return t.className = "ol", lr(t, e, n), t;
	})) : e.replaceChildren());
}
async function hr(e, t, n) {
	let r = ++gr;
	try {
		let i = await N("/viewer/point", {
			fileName: e.fileName,
			line: e.lineNumber,
			node: e.name || null,
			chain: e.chain || [],
			userChain: e.uchain || e.chain || [],
			bounds: e.bounds,
			previewId: t
		}).then((e) => e.json());
		if (r !== gr) return;
		i.ref ? vr(i.ref, n, i.file) : i.needChoice || n(O(i.message ?? null) || `${e.fileName}:${e.lineNumber}`);
	} catch (e) {
		if (r === gr) {
			let t = e.message;
			n(k("point.failed", { why: t })), F(k("point.failed", { why: t }));
		}
	}
}
var gr = 0, _r = (e) => navigator.clipboard ? navigator.clipboard.writeText(e) : Promise.reject(Error(k("point.noClipboard")));
function vr(e, t, n) {
	let r = ++gr, i = () => {
		r === gr && t(k("point.copied", { ref: e }), e, !0, n);
	}, a = () => {
		_r(e).then(i, () => {
			r === gr && t(k("point.copyBlocked", { ref: e }), e, !1, n);
		});
	};
	_r(e).then(i, () => {
		r === gr && t(k("point.copyRetry", { ref: e }), e, !1, n, a);
	});
}
var yr = (e) => {
	e && F(e);
}, br = yr, xr = null, Sr = null, Cr = 0;
function wr() {
	xr = null, Sr = null, Cr++;
}
function Tr() {
	if (xr) return Promise.resolve(xr);
	let e = Cr;
	return Sr ??= j().then((t) => e === Cr ? (Sr = null, t.ready ? xr = Gn(t) : null) : null, () => (e === Cr && (Sr = null), null));
}
var Y = null, Er = /* @__PURE__ */ new WeakMap();
function Dr(e) {
	let t = Er.get(e);
	return t || Er.set(e, t = () => e.isConnected ? e.getBoundingClientRect() : null), t;
}
var Or = () => Y?.img ?? null;
function kr(e, t) {
	for (let t of document.querySelectorAll(".box.pick")) t !== e.pick && (t.hidden = !0);
	Y && Y.hover !== e.hover && dr(Y.hover, null, 1), ur(e.pick, t, e.scale()), e.pick.style.animation = "none", e.pick.offsetWidth, e.pick.style.animation = "", Y = {
		...e,
		hit: t,
		shot: Dr(e.img)
	};
	let n = Ar(t);
	br = n, hr(t, e.previewId, n);
}
function Ar(e) {
	let t = Y, n = L.projectFiles.size ? Un(t.list, e) : null, r = {
		msg: null,
		ref: `${e.fileName}:${e.lineNumber}`
	}, i = () => ({
		node: e,
		say: r,
		box: Wn(e, t.dpPerPx),
		tree: n,
		modifiers: e.mods,
		previews: qn(e.name, xr, t.seen),
		origin: Kn(e, xr)
	}), a = () => {
		Y?.hit === e && Xn.set({
			host: t.host,
			shot: t.shot,
			card: i()
		});
	};
	return a(), xr || Tr().then((e) => {
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
function jr(e) {
	let t = Y?.list.find((t) => String(t.id) === e.id);
	Y && t && kr(Y, t);
}
function Mr(e) {
	if (!Y) return;
	let t = e ? Y.list.find((t) => String(t.id) === e.id) ?? null : null;
	dr(Y.hover, t, Y.scale()), t && mr(Y.marks, Y.list, Y.scale()), Y.marks.classList.toggle("peek", !!t);
}
async function Nr(e) {
	X();
	let t = L.st;
	if (x(e.file, e.fn), e.file === U(t)) {
		t?.screen === "focus" && t.focus ? N("/viewer/exit") : f();
		return;
	}
	let n = await N("/viewer/open", {
		file: e.file,
		fn: e.fn
	}).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: k("open.failed", { why: e.message })
	}));
	n.ok || (m(), F(O(n.message ?? null) || k("open.cannot")));
}
function X() {
	for (let e of document.querySelectorAll(".box.pick")) e.hidden = !0;
	Y && (dr(Y.hover, null, 1), Y.marks.classList.remove("peek")), Y = null, Xn.set({
		host: null,
		shot: null,
		card: null
	}), br = yr, gr++;
}
function Pr() {
	return Y ? (X(), !0) : !1;
}
function Fr() {
	addEventListener("pointerdown", (e) => {
		if (!Y || e.button !== 0) return;
		let t = e.target;
		t?.closest && t.closest("main") && !t.closest(".point-card, .cstage, #stage") && X();
	}, !0);
}
async function Ir(e) {
	let t = await N("/viewer/choose", { path: e }).then((e) => e.json()).catch(() => ({}));
	t.ref && vr(t.ref, br, t.file);
}
function Lr() {
	N("/viewer/cancel");
}
var Rr = 8, zr = 16;
function Br(e) {
	let t = document.documentElement, n = t.clientWidth, r = t.clientHeight, i = e.offsetWidth, a = e.offsetHeight, o = document.querySelector(".pc-float:not([data-leaving]) .pc-head"), s = o && o.getClientRects().length && getComputedStyle(o).visibility !== "hidden" ? o.getBoundingClientRect() : null, c, l, u = !1;
	s ? (c = s.left, l = s.bottom + Rr, l + a > r - zr && s.top - Rr - a >= zr && (l = s.top - Rr - a, u = !0)) : (c = (n - i) / 2, l = document.getElementById("bar").getBoundingClientRect().bottom + zr), c = Math.max(zr, Math.min(c, n - i - zr)), l = Math.max(zr, Math.min(l, r - a - zr));
	let d = Math.round(c) + "px", f = Math.round(l) + "px";
	e.style.left !== d && (e.style.left = d), e.style.top !== f && (e.style.top = f), e.classList.toggle("up", u);
}
var Vr = !1;
function Hr(e) {
	if (Br(e), Vr) return;
	Vr = !0;
	let t = () => {
		e.classList.contains("on") ? (Br(e), requestAnimationFrame(t)) : Vr = !1;
	};
	requestAnimationFrame(t);
}
function Ur(e, { stage: t, img: n, box: r, pick: i, marks: a }, o) {
	let s = null, c = !1, l = async () => {
		let t = Be(L.st?.board, e);
		if (!t || !t.ok || !t.treeUrl) return null;
		let n = D.get(t.treeUrl);
		if (n) return s = n, s;
		try {
			s = nr(er((await te(t.treeUrl).then((e) => e.json())).composeViewInfo || []).sort(tr)), D.set(t.treeUrl, s);
		} catch {
			s = null;
		}
		return s;
	};
	t.addEventListener("mouseenter", () => {
		s = null, c = !0, a.classList.add("over"), l().then((e) => {
			e && c && mr(a, e, sr(n));
		});
	}, { signal: o }), t.addEventListener("mouseleave", () => {
		c = !1, fr(r, a);
	}, { signal: o }), n.addEventListener("mousemove", (e) => {
		s && dr(r, rr(s, ...cr(e, n)) ?? null, sr(n));
	}, { signal: o }), n.addEventListener("load", () => {
		s = null, Y?.img === n && X();
	}, { signal: o }), o.addEventListener("abort", () => {
		Y?.img === n && X();
	}), n.addEventListener("click", async (o) => {
		C(e);
		let c = s || await l();
		if (!c) return;
		let u = rr(c, ...cr(o, n));
		if (!u) {
			Y?.img === n && X();
			return;
		}
		let d = Be(L.st?.board, e), f = ir(n);
		kr({
			list: c,
			img: n,
			hover: r,
			pick: i,
			marks: a,
			host: document.getElementById("boardView"),
			scale: () => sr(n),
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
var Wr = [
	"statusBars",
	"navigationBars",
	"captionBar",
	"displayCutout",
	"systemOverlays"
], Gr = [
	"top",
	"right",
	"bottom",
	"left"
];
function Kr(e, t) {
	let n = t === "top" || t === "bottom";
	return e === "displayCutout" ? n ? "left" : "top" : n ? "right" : "bottom";
}
var qr = (e) => !!e && Wr.some((t) => Gr.some((n) => Kr(t, n) === "bottom" && e.values[t][n] > 0)), Jr = (e) => e ? e.kind === "device" ? `${e.device}:${e.folded ? "cover" : "open"}${e.landscape ? ":rot" : ""}${e.orientation === "landscape-right" ? ":right" : ""}` : e.preset || `custom:${e.widthDp}x${e.heightDp}` : "original";
function Yr(e, t, n) {
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
function Xr({ root: e, geometry: t, shot: n, stage: r, wrap: i, layout: a, dimensions: o, originalSize: s, zoomState: c, preparation: l, firstFrame: u }) {
	let d = null, f = !1, p = null, m = null, h = null, g = null, _ = null, v = 0, y = null, b = !1, x = !1, S = !1, C = null, w = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), E = !1, D = null, O = (e) => new Promise((t) => {
		E ? (D?.settle(!0), D = {
			body: e,
			settle: t
		}) : ee(e, t);
	});
	function ee(e, t) {
		E = !0, N("/viewer/resize", e).then((e) => {
			if (!e.ok) throw Error(`HTTP ${e.status}`);
			return !0;
		}).catch((e) => (F(k("resize.failed", { why: e.message })), !1)).then((e) => {
			t(e);
			let n = D;
			D = null, E = !1, n && ee(n.body, n.settle);
		});
	}
	let A = (e) => (T.has(e.src) || T.set(e.src, Yr(e, e.naturalWidth, e.naturalHeight)), T.get(e.src)), j = Ce(e, {
		request: (e) => {
			if (S) return Promise.resolve(!1);
			let [t, n, ...r] = e.split(":"), i = j.devices.has(t) ? {
				device: t,
				folded: n === "cover",
				orientation: r.includes("right") ? "landscape-right" : j.sizeOf(e).w > j.sizeOf(e).h ? "landscape-left" : "portrait"
			} : { size: e.startsWith("custom:") ? e.slice(7) : e };
			return O(i);
		},
		insetOn: () => Zn.get().on,
		insetBelow: () => qr(m?.deviceInsets),
		layout: (t, n) => {
			if (!f) return;
			let i = c();
			d && i.z !== 1 && (i.x += (1 - i.z) * (d.cx - d.w / 2 - (t.cx - t.w / 2)), i.y += (1 - i.z) * (d.y - t.y)), d = t, a(t), ce(), r.classList.toggle("resize-hidden", n || !b && !S), e.classList.toggle("await-live", !b);
		}
	});
	Zn.subscribe(() => {
		f && j.relayout(!0);
	});
	function M(t, r = !1) {
		S = t, e.classList.toggle("preparing", t), n.setAttribute("aria-busy", String(t && !r)), Yn.set({
			on: t,
			failed: r
		});
		for (let n of e.querySelectorAll("input")) n.disabled = t;
		j.dock.lock(t), l(t, r);
	}
	function te(e, t) {
		let n = m?.pxPerDp || 2.625;
		return {
			url: e.src,
			dpW: t?.widthDp || e.naturalWidth / n,
			dpH: t?.heightDp || e.naturalHeight / n,
			edge: A(e)
		};
	}
	function ne() {
		if (n.naturalWidth && m && b) try {
			let e = document.createElement("canvas");
			e.width = n.naturalWidth, e.height = n.naturalHeight, e.getContext("2d").drawImage(n, 0, 0);
			let t = o(), r = m.pxPerDp || 2.625;
			j.image(h, {
				url: e.toDataURL("image/jpeg", .92),
				dpW: m.size?.widthDp || t.w / r,
				dpH: m.size?.heightDp || t.h / r,
				edge: Yr(e, e.width, e.height)
			});
		} catch {}
	}
	function P(e) {
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
			sel: Jr(t),
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
		let d = Jr(a.size), w = !!m && d !== h;
		w && (ne(), x = !0, b = !1, r.classList.add("resize-hidden"));
		let T = m;
		m = a, h = d;
		let E = !w && !!T && qr(T.deviceInsets) !== qr(a.deviceInsets);
		T && !w && a.imageUrl !== T.imageUrl && j.clearImages();
		for (let e of a.postures || []) {
			let t = v;
			P(e.imageUrl).then((n) => {
				f && t === v && m?.postures?.some((t) => t.imageUrl === e.imageUrl) && j.image(Jr(e.size), te(n, e.size));
			}).catch(() => {});
		}
		if (y && j.update(ae(a), !T), E && Zn.get().on && j.relayout(!0), c) return b = !1, _ = g = null, n.onload = null, n.removeAttribute("src"), M(!0, !0), r.classList.remove("resize-hidden"), !0;
		if (S && M(!0, !!c), !c && !document.hidden && a.streamUrl && (!x || a.streamUrl !== g || a.imageUrl !== T?.imageUrl) && (a.streamUrl !== g || !b || w)) {
			let t = `${v}:${d}:${a.streamUrl}:${a.imageUrl}`;
			if (_ !== t) {
				_ = t;
				let i = v;
				P(a.imageUrl).then((s) => {
					if (!f || document.hidden || i !== v || _ !== t || h !== d) return;
					let c = a.size;
					if (!c) {
						let e = a.pxPerDp || 2.625, t = {
							w: s.naturalWidth / e,
							h: s.naturalHeight / e,
							img: te(s, c)
						}, n = y?.w !== t.w || y.h !== t.h;
						y = t, j.setOriginal(y.w, y.h, y.img), (S || n) && j.update(ae(a), S);
					}
					j.image(d, te(s, c)), g = a.streamUrl, x = !1, o(s.naturalWidth, s.naturalHeight), n.onload = () => {
						if (n.onload = null, !f || document.hidden || i !== v || h !== d || g !== a.streamUrl) return;
						b = !0;
						let t = S;
						M(!1), e.classList.remove("await-live", "measuring"), r.classList.toggle("resize-hidden", j.moving()), n.dataset.still = a.imageUrl, n.src = n.dataset.url = re(a.streamUrl), t && !u() && !_e.matches && (C = n.animate([{ opacity: 0 }, { opacity: 1 }], {
							duration: I("--duration-short3"),
							easing: he("--easing-decelerate")
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
		dock: j.dock,
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
function Zr() {
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
function Qr({ focusView: e, wrap: t, stage: n, shot: r, box: i, pickBox: a, marks: o, scene: s, insetMarks: c, geometry: l, panel: u, header: d }) {
	let f = [], p = [], m = !1;
	function h() {
		m && (p = nr(f));
	}
	function g() {
		if (e.hidden) return;
		let n = getComputedStyle(document.documentElement), r = parseInt(n.getPropertyValue("--cap-room")) || 76, i = document.body.classList.contains("resizing-ui"), a = window.innerHeight - t.getBoundingClientRect().top - (i ? 0 : r + 16), o = parseInt(n.getPropertyValue("--stage-min-h")) || 260, s = Math.max(o, Math.round(a));
		document.documentElement.style.setProperty("--view-h", s + "px");
		let c = getComputedStyle(t), l = s - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
		document.documentElement.style.setProperty("--stage-max-h", l + "px"), G.relayout(), t.classList.contains("resize-wrap") || x(l - 2), Ne(), T();
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
			let e = Math.round(r.offsetWidth * devicePixelRatio * z.z);
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
			f = er(t.composeViewInfo || []).sort(tr), p = nr(f), ce(L.projectFiles.size ? "" : k("focus.noIndex", { n: f.length })), m = !0, dr(i, null, 1), a.hidden = !0, Or() === r && X();
		} catch (e) {
			se(k("focus.tree.failed", { why: e.message }), "error");
		}
	}
	function A(e) {
		let t = !!(e && e.interactive);
		if (t || In(), u.hidden = !e, e || W(), n.classList.toggle("live", t), B = e && e.pxPerDp || null, e && e.previewId === Ee || (G.disable(), Ee = e ? e.previewId : null, _ = v = 0, delete r.dataset.fullW, delete r.dataset.fullH, r.style.width = "", H(1, 0, 0, !1)), !e) {
			j?.entering && ie(), G.disable(), r.hasAttribute("src") && (r.removeAttribute("src"), r.dataset.url = "");
			for (let e of n.querySelectorAll("img.ghost")) e.remove();
			return;
		}
		let i = L.st;
		if (n.style.cursor = t ? "pointer" : "crosshair", e.treeUrl !== E && O(e.treeUrl), G.update(e, i.error)) return;
		H(z.z, z.x, z.y, !1);
		let a = t ? e.streamUrl ? re(e.streamUrl) : Be(i.board, i.board?.focus)?.imageUrl || "" : e.imageUrl;
		r.dataset.url !== a && (a.startsWith("/stream") && (S = 0), ve(r, a));
	}
	let j = null, M = (e, t) => e > 0 && t > 0 && Math.abs(e / t - 1) < .01, P = (e, t) => {
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
		e.classList.remove("morph-hold"), P(!0, 0);
	}
	function ae(t) {
		j === t && (j = null, clearTimeout(t.lead), clearTimeout(t.giveUp), e.classList.remove("morph-hold"), P(!0, I("--duration-short4")), t.m.finish(t.same ? 150 : 0));
	}
	function oe(r) {
		if (ie(), !r || _e.matches || document.hidden || e.hidden || !t.classList.contains("resize-wrap")) return;
		let i = n.getBoundingClientRect();
		if (!i.width || !i.height) return;
		let a = M(r.ratio, i.width / i.height), o = getComputedStyle(n);
		e.classList.add("morph-hold"), P(!1, 0);
		let s = fe({
			from: r.rect,
			to: () => n.getBoundingClientRect(),
			radius: [r.radius, ge(o)],
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
			j === c && P(!0, I("--duration-short4"));
		}, de), s.landed.then(() => requestAnimationFrame(() => {
			j === c && (c.landed = !0, !c.same || c.ready ? ae(c) : c.giveUp = window.setTimeout(() => ae(c), 5e3));
		}));
	}
	function le() {
		j?.entering && ae(j);
	}
	function ue() {
		let e = j;
		return !e || !e.entering || !e.same ? !1 : (e.ready = !0, e.landed && ae(e), !0);
	}
	function he(t, i, a, o = () => {}, s = () => !0) {
		ie();
		let c = () => ye(() => {
			t(), a(), o();
		}, i, {
			workspace: !0,
			image: r
		});
		if (_e.matches || document.hidden || e.hidden || !n.offsetWidth) {
			c();
			return;
		}
		let l = me();
		G.suspend(), P(!1, I("--duration-short2"));
		let u = y() && r.naturalWidth ? pe(r) : null;
		Promise.all([u, new Promise((e) => setTimeout(e, I("--duration-short2")))]).then(() => {
			n.style.setProperty("--z", "1");
			let e = ni(n);
			n.style.removeProperty("--z"), l(), s() ? ye(() => {
				t(), P(!0, 0);
				let n = a(), r = n && ni(n);
				if (!n || !r || !r.rect.width || !e.url) {
					o();
					return;
				}
				let i = M(e.ratio, r.ratio);
				n.classList.add("morph-target");
				let s = r.rect, c = fe({
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
			}, i, { workspace: !0 }) : (P(!0, 0), t(), i());
		});
	}
	let be = !1, xe = () => !!(history.state && history.state.prevueWs);
	function Se(e) {
		let t = !!(e && e.screen === "focus" && e.focus);
		t && !xe() ? (history.scrollRestoration = "manual", history.pushState({ prevueWs: !0 }, "")) : !t && xe() && !be && (be = !0, history.back());
	}
	addEventListener("popstate", () => {
		be ? be = !1 : L.st && L.st.screen === "focus" && L.st.focus && N("/viewer/exit");
	});
	let R = (e) => cr(e, r), Ce = () => !!(L.st && L.st.focus && L.st.focus.interactive), we = () => {
		Or() === r && X();
	}, Te = (e) => !Ce() || e.altKey;
	n.addEventListener("mousemove", (e) => {
		let t = m && Te(e);
		o.classList.toggle("over", t), t && mr(o, p, V()), dr(i, t ? rr(p, ...R(e)) ?? null : null, V());
	}), n.addEventListener("mouseleave", () => fr(i, o)), n.addEventListener("mousedown", (e) => {
		e.button !== 0 || G.moving() || (De || !Ce() && z.z > 1 && !e.altKey ? We(e) : Ce() && !e.altKey && (e.preventDefault(), we(), Mn(...R(e))));
	}), window.addEventListener("mousemove", (e) => {
		jn() && Nn(...R(e));
	}), window.addEventListener("mouseup", (e) => {
		jn() && Pn(...R(e));
	}), n.addEventListener("click", async (t) => {
		if (G.moving()) return;
		if (Oe) {
			Oe = !1;
			return;
		}
		if (Ce() && !t.altKey || !m || !L.st || !L.st.focus) return;
		if (Ce()) try {
			await O((await N("/viewer/catchup").then((e) => e.json())).treeUrl || E);
		} catch (e) {
			F(k("point.sync.failed", { why: e.message }));
			return;
		}
		await D;
		let n = rr(p, ...R(t));
		if (!n) {
			Or() === r && X();
			return;
		}
		let s = L.st, c = s.focus, l = s.board;
		kr({
			list: p,
			img: r,
			hover: i,
			pick: a,
			marks: o,
			host: e,
			scale: V,
			previewId: c.previewId,
			dpPerPx: c.pxPerDp ? 1 / c.pxPerDp : null,
			seen: {
				file: l?.file ?? null,
				fn: l?.groups.find((e) => e.cards.some((e) => e.index === l.focus))?.name ?? null
			}
		}, n);
	});
	let z = {
		z: 1,
		x: 0,
		y: 0
	}, Ee = null, De = !1, Oe = !1, B = null;
	function V() {
		return or(r.offsetWidth, r.offsetHeight, r) || 1;
	}
	function ke() {
		let e = G.pxPerDp();
		return e ? 1 / e : B && (_ || r.naturalWidth) ? 1 / (V() * B) : null;
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
	function H(e, r, i, a) {
		G.preparing() || ([z.z, z.x, z.y] = Me(Math.min(je(), Math.max(Ae(), e)), r, i), n.classList.toggle("zoom-anim", !!a), n.style.transform = G.zoom(a) || z.z === 1 ? "" : `translate(${z.x}px, ${z.y}px) scale(${z.z})`, t.style.setProperty("--z", String(z.z)), n.classList.toggle("zoomed", z.z > 1), Ne(), T());
	}
	function Ne() {
		let e = ke();
		Jn.set({
			pct: Math.round((e ? z.z / e : z.z) * 100),
			real: !!e,
			atFit: z.z === 1
		});
	}
	function Pe(e, t, r, i) {
		let a = n.getBoundingClientRect(), o = a.left - z.x, s = a.top - z.y, c = (t - a.left) / z.z, l = (r - a.top) / z.z, u = Math.min(je(), Math.max(Ae(), e));
		H(u, t - o - c * u, r - s - l * u, i);
	}
	function Fe(e) {
		let n = t.getBoundingClientRect();
		Pe(e, n.left + n.width / 2, n.top + n.height / 2, !0);
	}
	let Ie = (e) => Fe(z.z * e), Le = () => Ie(1.25), Re = () => Ie(1 / 1.25), ze = () => H(1, 0, 0, !0), U = !1;
	function W() {
		if (!Jn.get().menu) return !1;
		Jn.set({ menu: !1 });
		let e = document.getElementById("zoomMenu"), t = document.activeElement;
		return e && t && e.contains(t) && (U ? document.getElementById("zoomPct")?.focus({ preventScroll: !0 }) : t.blur()), !0;
	}
	function Ve(e) {
		let t = !Jn.get().menu;
		t && (U = e), Jn.set({ menu: t });
	}
	function He(e) {
		W(), e === "fit" ? ze() : Fe((ke() || 1) * Number(e));
	}
	addEventListener("pointerdown", (e) => {
		let t = document.getElementById("zoomCtl");
		t && t.contains(e.target) || W();
	}), addEventListener("resize", () => {
		g(), H(z.z, z.x, z.y, !1);
	}), r.addEventListener("load", () => {
		b(), g();
	}), t.addEventListener("wheel", (t) => {
		e.hidden || (t.ctrlKey || t.metaKey ? (t.preventDefault(), Pe(z.z * Math.exp(-t.deltaY * .01), t.clientX, t.clientY, !1)) : Ce() ? (t.preventDefault(), G.moving() || (we(), Ue(t))) : z.z > 1 && (t.preventDefault(), H(z.z, z.x - t.deltaX, z.y - t.deltaY, !1)));
	}, { passive: !1 });
	function Ue(e) {
		let n = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? t.clientHeight : 1, i = V() * z.z || 1, [a, o] = R(e);
		Vn(Math.max(0, Math.min(_ || r.naturalWidth, a)), Math.max(0, Math.min(v || r.naturalHeight, o)), e.deltaX * n / i, e.deltaY * n / i);
	}
	function We(e) {
		e.preventDefault();
		let t = e.clientX, r = e.clientY, i = z.x, a = z.y;
		n.classList.add("panning");
		let o = (e) => {
			Math.abs(e.clientX - t) + Math.abs(e.clientY - r) > 3 && (Oe = !0), H(z.z, i + e.clientX - t, a + e.clientY - r, !1);
		}, s = () => {
			n.classList.remove("panning"), removeEventListener("mousemove", o), removeEventListener("mouseup", s);
		};
		addEventListener("mousemove", o), addEventListener("mouseup", s);
	}
	let Ge = (e) => !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
	addEventListener("keydown", (t) => {
		let r = t.target;
		t.code !== "Space" || e.hidden || Ge(r) || r?.closest && r.closest("button, [role=button]") || (t.preventDefault(), De || (De = !0, n.classList.add("grab")));
	}), addEventListener("keyup", (e) => {
		e.code === "Space" && (De = !1, n.classList.remove("grab"));
	}), addEventListener("blur", () => {
		De = !1, n.classList.remove("grab"), Fn();
	});
	let G = Xr({
		root: s,
		geometry: l,
		shot: r,
		stage: n,
		wrap: t,
		zoomState: () => z,
		preparation(e, t) {
			t && le(), Jn.set({ disabled: e }), e && W();
		},
		firstFrame: ue,
		originalSize() {
			let e = Be(L.st?.board, L.st?.board?.focus);
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
			}), c.style.setProperty("--im-bezel", e.bezel + "px"), Ne(), T();
		}
	});
	return document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			if (clearTimeout(C), G.suspend(), !y()) return;
			let e = r.getAttribute("src");
			pe(r), r.getAttribute("src") === e && r.removeAttribute("src"), r.dataset.url = "";
		} else L.st?.screen === "focus" && A(L.st.focus);
	}), {
		render: A,
		fitStage: g,
		renarrow: h,
		syncHistory: Se,
		morphIn: oe,
		morphOut: he,
		image: () => r,
		zoomIn: Le,
		zoomOut: Re,
		zoomFit: ze,
		zoomMenuPick: He,
		toggleZoomMenu: Ve,
		closeZoomMenu: W,
		closeDeviceMenu: () => G.closeMenu(),
		dock: G.dock
	};
}
var $r = (e) => e && e.naturalWidth ? e.naturalWidth / e.naturalHeight : 0, ei = /* @__PURE__ */ new Map();
function ti(e) {
	let t = e?.dataset.still;
	if (!t) return null;
	if (!ei.has(t)) {
		let e = new Image();
		e.src = t, ei.set(t, e), ei.size > 8 && ei.delete(ei.keys().next().value);
	}
	return ei.get(t);
}
function ni(e) {
	if (!e) return null;
	let t = e.querySelector("img"), n = getComputedStyle(e), r = t && t.getAttribute("src") || "";
	return {
		el: e,
		rect: e.getBoundingClientRect(),
		radius: ge(n),
		shadow: n.boxShadow,
		url: t ? r.startsWith("/stream") ? t.dataset.still || "" : t.currentSrc || r : "",
		ratio: $r(t) || $r(ti(t))
	};
}
function ri(e) {
	N("/viewer/focus", { index: e }).catch((e) => se(k("focus.enter.failed", { why: e.message }), "error"));
}
function ii() {
	L.st && L.st.focus && N("/viewer/exit");
}
function ai(e) {
	N("/viewer/systemUi", { systemUi: e }).catch((e) => F(k("request.failed", { why: e.message })));
}
// src/session.ts
var oi = () => document.getElementById("boardView"), si, ci = null;
function li(e) {
	return ci && !e.error && e.screen === "focus" && e.focus?.previewId === ci.id && (e.busy || !e.focus.streamUrl || e.focus.streamUrl === ci.stream && e.focus.imageUrl === ci.image) ? !0 : (ci = null, !1);
}
var ui = /* @__PURE__ */ new Map(), di = null, fi = {
	wasBoard: !1,
	arrive: !1,
	file: null
};
function pi(e) {
	let t = !oi().hidden, n = e.board ? e.board.file : null;
	t && di && (e.screen !== "board" || n !== di) && ui.set(di, scrollY), fi = {
		wasBoard: t,
		arrive: e.screen === "board" && (!t || n !== di),
		file: n
	}, di = n;
}
function mi(e) {
	let { wasBoard: t, arrive: n, file: r } = fi;
	si.render(e.screen === "focus" ? e.focus : null), si.syncHistory(e), oe(O(e.error)), si.fitStage(), n ? scrollTo(0, ui.get(r) || 0) : t && e.screen !== "board" && scrollTo(0, 0), f();
}
var hi = (e) => {}, gi = (e) => {
	let t = (e.tabs || []).find((e) => e.active);
	return t ? t.key : null;
};
function _i(e, t, n) {
	let r = (t) => {
		let n = e.tabs.findIndex((e) => e.key === t);
		return n < 0 ? e.tabs.length : n;
	};
	return Math.sign(r(n) - r(t));
}
var vi = (e) => e?.screen === "focus" && e.focus?.interactive ? `${gi(e)} ${e.board?.focus ?? ""} ${e.focus.previewId}` : null, yi = !1;
function bi(e) {
	if (L.st && e.version <= L.st.version) return;
	let t = L.st;
	if (t?.focus?.interactive && e.focus?.interactive && t.focus.previewId === e.focus.previewId && JSON.stringify(t.focus.size) !== JSON.stringify(e.focus.size) && (ci = {
		id: e.focus.previewId,
		stream: t.focus.streamUrl,
		image: t.focus.imageUrl
	}), L.st = e, vi(t) !== vi(e) && Zn.set({ on: !1 }), be()) {
		yi = !0;
		return;
	}
	let n = t && t.screen, r = e.screen, i = t && gi(t) && gi(e) && gi(t) !== gi(e);
	t && (i || n !== r || t.board && e.board && t.board.focus !== e.board.focus && r === "focus") && X();
	let a = () => {
		yi && (yi = !1, hi(L.st));
	}, o = () => L.st;
	if (i) {
		let n = document.documentElement;
		n.style.setProperty("--tab-dir", String(_i(t, gi(t), gi(e)))), n.classList.add("vt-tab"), ye(() => hi(o()), a), setTimeout(() => n.classList.remove("vt-tab"), 500);
	} else if (n === "board" && r === "focus") {
		let t = e.board ? ni(g(h(e.board.focus))) : null;
		ye(() => {
			hi(o()), si.morphIn(t);
		}, a, { workspace: !0 });
	} else if (n === "focus" && r === "board") {
		let e = null;
		si.morphOut(() => hi(o()), a, () => g(e = o().screen === "board" ? b(o().board.focus) : null), () => S(e), () => o().screen === "board");
	} else n === "focus" && r === "focus" && t.board && e.board && t.board.focus !== e.board.focus ? ye(() => hi(o()), a, { workspace: !0 }) : hi(e);
}
var xi = 0, Si = () => {
	let e = ++xi;
	M().then((t) => {
		e === xi && (L.projectFiles = new Map(Object.entries(t.files || {})), _(), si.renarrow());
	}).catch(() => {});
}, Ci = !1, wi = () => {}, Ti = null, Ei = () => {
	Ti?.fail(k("prep.lost")), se(k("status.lost"), "error"), wi("lost"), L.st = null;
}, Di = 6e4, Oi = !1, ki = 0, Ai = 0, ji = null, Mi = (e) => !e.busy && !(e.board?.groups || []).some((e) => e.cards.some((e) => !e.rendered));
function Ni() {
	Oi = !0, wi("restarting"), clearTimeout(ki), ki = window.setTimeout(Ei, Di);
}
function Pi(e) {
	if (Oi) {
		if (e.boot === ji) return;
		Ai ||= (clearTimeout(ki), window.setTimeout(() => location.reload(), Di)), Mi(e) && location.reload();
	} else ji && e.boot !== ji ? location.reload() : (ji = e.boot, bi(e));
}
function Fi({ workspace: e, render: t, onConnection: n, onPreviewFiles: r, onGalleryShots: i, prepared: a = null }) {
	si = e, hi = (e) => {
		pi(e), t(e, li(e));
	}, wi = n, Ti = a, ee({
		open: () => {
			Ci && !Oi ? location.reload() : Ci || Si();
		},
		state: Pi,
		ui: (e) => {
			e.kind === "flash" ? F(O(e.text ?? null)) : e.kind === "previewFiles" ? r() : e.kind === "galleryShots" ? i() : e.kind === "projectFiles" ? Si() : e.kind === "restart" && !Ti && Ni();
		},
		error: () => {
			Ci = !0, Oi || Ei();
		}
	});
}
// src/shortcuts.ts
function Ii(e, t) {
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
					run: (e) => (Ri(e) === "+" ? t.zoomIn : t.zoomOut)()
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
					run: (e) => t.jumpTab(Number(Ri(e)))
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
function Li(e) {
	return e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
}
function Ri(e) {
	return e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") ? "⇧" + e.key : /^Digit[1-9]$/.test(e.code) && !e.shiftKey ? e.code.slice(5) : e.code === "KeyI" ? "i" : e.code === "Slash" && e.shiftKey ? "?" : e.code === "Equal" ? "+" : e.code === "Minus" ? "-" : e.code === "Digit0" ? "0" : e.key;
}
function zi(e, t, n) {
	let r = (r) => {
		if ((r.metaKey || r.ctrlKey) && !r.altKey && !r.shiftKey && r.code === "KeyK" && t.screen() !== "offline") {
			r.preventDefault(), n.sheetOpen() || t.openQuickOpen(document.activeElement);
			return;
		}
		if (r.metaKey || r.ctrlKey || r.altKey || Li(r.target)) return;
		let i = Ri(r), a = i === "Enter" && r.target instanceof Element && r.target.closest("button, [role=button]");
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
var Bi = n(), Vi = r();
function Hi({ pending: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t);
	return (0, B.useLayoutEffect)(() => {
		r && (r.hidden = !e);
	}, [r, e]), i(n("build.notice"), (e, t) => /* @__PURE__ */ (0, V.jsx)("aside", {
		className: "build-notice",
		id: "buildNotice",
		role: "status",
		ref: e,
		hidden: !0,
		children: t
	}));
}
// src/gallery/queue.ts
var Ui = { status: "idle" };
function Wi(e) {
	let t = e?.front[0];
	return e && t ? {
		status: "done",
		sheets: e.sheets,
		front: e.front,
		image: t.image
	} : {
		status: "error",
		sheets: e?.sheets ?? 0,
		failure: e?.failure ?? null
	};
}
function Gi(e, t = 1) {
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Set(), a = /* @__PURE__ */ new Set(), o = 0, s = !1, c = (e, t) => {
		n.set(e, t);
		for (let e of i) e();
	};
	function l() {
		for (; o < t && r.size;) {
			let t = null;
			for (let e of r) (!s || e[1].urgent) && (!t || e[1].order < t[1].order) && (t = e);
			if (!t) return;
			let [n, { path: i }] = t;
			r.delete(n), o++, c(n, { status: "loading" }), e(i).then((e) => c(n, Wi(e)), () => c(n, Wi(null))).finally(() => {
				o--, l();
			});
		}
	}
	function u(e, t, i) {
		let a = n.get(e)?.status ?? "idle";
		if (a !== "idle" && a !== "wait") return;
		let o = r.get(e)?.urgent;
		r.set(e, o ? {
			path: t,
			order: -1,
			urgent: o
		} : {
			path: t,
			order: i
		}), a === "idle" && c(e, { status: "wait" }), l();
	}
	return {
		want: u,
		urgent(e, t) {
			let i = n.get(e)?.status ?? "idle";
			(i === "idle" || i === "wait") && (r.set(e, {
				path: t,
				order: -1,
				urgent: !0
			}), i === "idle" && c(e, { status: "wait" }), l());
		},
		drop(e) {
			!r.get(e)?.urgent && r.delete(e) && c(e, Ui);
		},
		lost(e, t, r) {
			a.has(e) || n.get(e)?.status !== "done" || (a.add(e), c(e, Ui), u(e, t, r));
		},
		pause(e) {
			s = e, e || l();
		},
		get: (e) => n.get(e) ?? Ui,
		subscribe(e) {
			return i.add(e), () => {
				i.delete(e);
			};
		}
	};
}
// src/gallery/cards.ts
var Ki = (e) => e.rel.slice(e.rel.lastIndexOf("/") + 1).replace(/\.kts?$/, ""), qi = (e) => e.rel.match(/(?:^|\/)src\/[^/]+\/(?:java|kotlin)\/(.+)\/[^/]+$/)?.[1].split("/") ?? [];
function Ji(e) {
	let t = e.map(qi).filter((e) => e.length);
	return t.length ? t.reduce((e, t) => {
		let n = 0;
		for (; n < e.length && n < t.length && e[n] === t[n];) n++;
		return e.slice(0, n);
	}) : [];
}
function Yi(e, t) {
	let n = qi(e);
	return n.length ? n.slice(t.length).join(".") || n.join(".") : e.rel.includes("/") ? e.rel.slice(0, e.rel.lastIndexOf("/")) : "";
}
function Xi(e) {
	let t = (e || "").split(":").filter(Boolean);
	for (; t.length > 1 && (t.at(-1) === "impl" || t.at(-1) === "api");) t.pop();
	return t.join("/");
}
function Zi(e, t, n, r) {
	let i = Math.round((t - e) / 6e4);
	return i < 60 ? n("gallery.ago.minutes", { n: Math.max(i, 1) }) : i < 1440 ? n("gallery.ago.hours", { n: Math.round(i / 60) }) : i < 20160 ? n("gallery.ago.days", { n: Math.round(i / 1440) }) : new Date(e).toLocaleDateString(r, {
		month: "short",
		day: "numeric"
	});
}
var Qi = (e) => [...e].sort((e, t) => t.mtime - e.mtime || e.rel.localeCompare(t.rel)), $i = (e) => `${e.mtime} ${e.path}`, ea = (e) => e.shots ? Wi(e.shots) : null, ta = (e, t) => t?.at != null && e.mtime > t.at, na = 3, ra = 1.5, ia = 420, aa = 640, oa = 16, sa = 10 / 16, ca = 40, la = 1.2;
function ua(e, t) {
	return (e.startsWith(t) ? e.slice(t.length) : e).replace(/^Preview/, "").replace(/Preview$/, "").replace(/^_+|_+$/g, "");
}
function da(e, t) {
	let n = Ki(t);
	return e.status === "done" ? e.front.map((e) => ({
		shot: e.image,
		label: e.variant ?? ua(e.name, n)
	})) : e.status === "error" ? [{
		shot: "failed",
		label: ""
	}] : t.functions.slice(0, na).map((e) => ({
		shot: null,
		label: ua(e, n)
	}));
}
var fa = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M3 8h10M9 4l4 4-4 4",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.5",
		strokeLinecap: "round",
		strokeLinejoin: "round"
	})
}), pa = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M2 4.5V12.5h12V5.5H8L6.5 4H2z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), ma = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), ha = (e) => e.bottom > 0 && e.top < innerHeight && e.right > 0 && e.left < innerWidth && e.width > 0, Z = (e) => e?.getBoundingClientRect() ?? null, ga = (e, t) => [{
	transformOrigin: "top left",
	transform: `translate(${e.left - t.left}px, ${e.top - t.top}px) scale(${e.width / t.width}, ${e.height / t.height})`
}, {
	transformOrigin: "top left",
	transform: "none"
}], _a = (e, t) => [{ transform: `translate(${e}px, ${t}px)` }, { transform: "none" }];
function va(e, t) {
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
function ya(e, t) {
	let n = (e) => t.querySelector(e), r = Z(e.querySelector(".gcard-hit")), i = Z(e.querySelector(".gcard-cover")), a = Z(n(".gsheet-shell")), o = Z(n(".gsheet-mediabg")), s = [{
		el: n(".gsheet-shell"),
		kf: ga(r, a)
	}, {
		el: n(".gsheet-mediabg"),
		kf: ga(i, o)
	}], c = Z(e.querySelector(".gcard-shot"));
	c && t.querySelectorAll(".gsheet-shot").forEach((e) => s.push({
		el: e,
		kf: e.querySelector("img") ? va(c, Z(e)) : ga(c, Z(e))
	}));
	let l = (t, r) => {
		let i = Z(e.querySelector(r)), a = Z(n(t));
		return i && a ? [i.left - a.left, i.top - a.top] : [0, 0];
	}, u = (r, i) => {
		let a = n(r), o = e.querySelector(i);
		if (!o) return;
		let c = Z(o), l = Z(a), u = o.cloneNode(!0);
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
	ba(t), u(".gsheet-file", ".gcard-file"), t.querySelectorAll(".gsheet-cap").forEach((e) => s.push({
		el: e,
		kf: [{}, {}],
		fade: !0
	}));
	let d = t.querySelector(".gcard-count"), f = e.querySelector(".gcard-count");
	d && s.push(f ? {
		el: d,
		kf: _a(Z(f).left - Z(d).left, Z(f).top - Z(d).top)
	} : {
		el: d,
		kf: [{}, {}],
		fade: !0
	});
	let [p, m] = l(".gsheet-info", ".gcard-info");
	s.push({
		el: n(".gsheet-info"),
		kf: _a(p, m)
	}), u(".gsheet-pkgrow", ".gcard-pkgrow");
	let h = t.querySelector(".gsheet-mod");
	if (h) {
		let [e, t] = l(".gsheet-mod", ".gcard-mod");
		s.push({
			el: h,
			kf: _a(e, t)
		});
	}
	return s.push({
		el: n(".gsheet-go"),
		kf: _a(r.right - a.right, r.bottom - a.bottom),
		fade: !0
	}), s;
}
var ba = (e) => e.parentElement?.querySelectorAll(".gsheet-ghost").forEach((e) => e.remove()), xa = (e) => e.slice().reverse().map((e, t, n) => ({
	...e,
	offset: e.offset == null ? n.length === 1 ? 1 : t / (n.length - 1) : 1 - e.offset
}));
function Sa(e) {
	let t = [];
	for (let n = e; n && n !== document.body; n = n.parentElement) for (let e of n.parentElement?.children ?? []) e === n || e.hasAttribute("inert") || e.tagName === "SCRIPT" || (e.setAttribute("inert", ""), e.setAttribute("data-sheet-inert", ""), t.push(e));
	return t;
}
function Ca(e) {
	if (e.key !== "Tab") return;
	let t = [...e.currentTarget.querySelectorAll("button")], n = t[(t.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + t.length) % t.length];
	n && (e.preventDefault(), n.focus());
}
var wa = (e) => document.querySelector(`#galleryView .gcard-slot[data-path="${CSS.escape(e)}"] .gcard`);
function Ta({ file: e, text: t, view: n, closing: r, onClose: i, onClosed: a, onOpen: o }) {
	let { phrase: c } = s(), l = (0, B.useRef)(null), [u, d] = (0, B.useState)(null), f = da(n, e), p = f.map((e) => e.shot && e.shot !== "failed" ? e.shot : null).every((e) => e && e.w > e.h * la) ? "col" : "row", m = n.status === "done" ? n.sheets : 0;
	return (0, B.useLayoutEffect)(() => {
		let t = document.documentElement, n = document.body, r = [
			t.style.overflow,
			n.style.overflow,
			t.style.scrollbarGutter
		];
		t.style.scrollbarGutter = "stable", t.style.overflow = n.style.overflow = "hidden";
		let i = Sa(l.current.parentElement), a = wa(e.path)?.getBoundingClientRect(), o = l.current, s = Math.min(aa, Math.max(ia, (a?.width ?? ia) * ra), innerWidth - 32), c = `${Math.round(s * sa - ca)}px`;
		o.style.width = `${s}px`, o.style.setProperty("--stage-h", c);
		let u = o.offsetHeight, f = a ? a.left + a.width / 2 : innerWidth / 2, p = a ? a.top + a.height / 2 : innerHeight / 2;
		return d({
			width: s,
			left: Math.min(Math.max(oa, f - s / 2), innerWidth - s - oa),
			top: Math.max(oa, Math.min(p - u / 2, innerHeight - u - oa)),
			"--stage-h": c
		}), () => {
			t.style.overflow = r[0], n.style.overflow = r[1], t.style.scrollbarGutter = r[2], i.forEach((e) => {
				e.removeAttribute("inert"), e.removeAttribute("data-sheet-inert");
			});
			let a = wa(e.path);
			a && (a.style.visibility = ""), l.current && ba(l.current);
		};
	}, []), (0, B.useLayoutEffect)(() => {
		if (!u) return;
		let t = wa(e.path), n = l.current, r = I("--duration-long3"), i = he("--easing-spring"), a = I("--duration-medium2");
		if (n.parentElement.querySelector(".gsheet-scrim").animate([{ opacity: 0 }, { opacity: 1 }], { duration: a }), n.querySelector(".gsheet-go")?.focus({ preventScroll: !0 }), !t || _e.matches || !ha(t.getBoundingClientRect())) {
			n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: a });
			return;
		}
		let o = [];
		for (let e of ya(t, n)) o.push(e.el.animate(e.kf, {
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
			ba(n), n.getAnimations({ subtree: !0 }).forEach((e) => {
				e.effect?.getKeyframes().some((e) => "opacity" in e) && e.cancel();
			});
		}).catch(() => void 0);
	}, [u]), (0, B.useLayoutEffect)(() => {
		if (!r) return;
		let t = wa(e.path), n = l.current, i = !0, o = () => {
			i && (n.parentElement.style.visibility = "hidden", document.querySelectorAll("[data-sheet-inert]").forEach((e) => {
				e.removeAttribute("inert"), e.removeAttribute("data-sheet-inert");
			}), t && (t.style.visibility = "", t.querySelector(".gcard-hit")?.focus({ preventScroll: !0 })), a());
		}, s = I("--duration-long1"), c = he("--easing-standard"), u = I("--duration-short2");
		n.parentElement.getAnimations({ subtree: !0 }).forEach((e) => e.cancel()), n.contains(document.activeElement) && document.activeElement.blur(), ba(n), n.classList.add("closing");
		let d = [n.parentElement.querySelector(".gsheet-scrim").animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: s,
			easing: c,
			fill: "forwards"
		})];
		if (t && !_e.matches && ha(t.getBoundingClientRect())) for (let e of ya(t, n)) d.push(e.el.animate(xa(e.kf), {
			duration: s,
			easing: c,
			fill: "forwards"
		})), e.fade && d.push(e.el.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: u,
			fill: "forwards"
		})), e.op && d.push(e.el.animate([{ opacity: e.op[1] }, { opacity: e.op[0] }], {
			delay: s * (1 - e.op[3]),
			duration: s * (e.op[3] - e.op[2]),
			fill: "both"
		}));
		else d.push(n.animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: I("--duration-short4"),
			easing: c,
			fill: "forwards"
		}));
		return Promise.all(d.map((e) => e.finished)).then(o).catch(() => void 0), () => {
			i = !1;
		};
	}, [r]), /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "gsheet-layer",
		children: [/* @__PURE__ */ (0, V.jsx)("div", {
			className: "gsheet-scrim",
			onClick: i
		}), /* @__PURE__ */ (0, V.jsxs)("section", {
			ref: l,
			className: "gsheet",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": t.name,
			"data-cap": f.some((e) => e.label) || void 0,
			style: u ?? { visibility: "hidden" },
			onKeyDown: Ca,
			children: [
				/* @__PURE__ */ (0, V.jsx)("span", { className: "gsheet-shell" }),
				/* @__PURE__ */ (0, V.jsx)("span", { className: "gsheet-mediabg" }),
				/* @__PURE__ */ (0, V.jsxs)("div", {
					className: "gsheet-stage",
					"data-flow": p,
					style: { "--k": f.length },
					children: [f.map((t, n) => {
						let r = !!t.shot && t.shot !== "failed" && ta(e, t.shot);
						return /* @__PURE__ */ (0, V.jsxs)("span", {
							className: "gsheet-fig",
							"data-stale": r || void 0,
							style: { zIndex: f.length - n },
							children: [/* @__PURE__ */ (0, V.jsxs)("span", {
								className: "gsheet-shot",
								"data-state": t.shot === "failed" ? "failed" : t.shot ? "done" : "loading",
								children: [r && /* @__PURE__ */ (0, V.jsx)("span", {
									className: "gsheet-old",
									title: c("gallery.stale.why"),
									children: c("gallery.stale")
								}), t.shot === "failed" ? /* @__PURE__ */ (0, V.jsx)("span", {
									className: "gsheet-failed",
									children: c("gallery.failed")
								}) : t.shot ? /* @__PURE__ */ (0, V.jsx)("img", {
									src: t.shot.url,
									width: t.shot.w,
									height: t.shot.h,
									alt: ""
								}) : /* @__PURE__ */ (0, V.jsx)("span", { className: "gcard-ph" })]
							}), t.label && /* @__PURE__ */ (0, V.jsx)("span", {
								className: "gsheet-cap",
								children: t.label
							})]
						}, n);
					}), m > 1 && /* @__PURE__ */ (0, V.jsxs)("span", {
						className: "gcard-count",
						"aria-label": c("board.count", { n: m }),
						children: [/* @__PURE__ */ (0, V.jsx)(ma, {}), m]
					})]
				}),
				/* @__PURE__ */ (0, V.jsxs)("div", {
					className: "gsheet-body",
					children: [
						/* @__PURE__ */ (0, V.jsx)("span", {
							className: "gsheet-file",
							children: t.name
						}),
						/* @__PURE__ */ (0, V.jsxs)("span", {
							className: "gsheet-pkgrow",
							children: [/* @__PURE__ */ (0, V.jsx)(pa, {}), /* @__PURE__ */ (0, V.jsx)("span", {
								className: "gsheet-pkg",
								children: t.pkg
							})]
						}),
						/* @__PURE__ */ (0, V.jsxs)("span", {
							className: "gsheet-foot",
							children: [/* @__PURE__ */ (0, V.jsxs)("span", {
								className: "gsheet-meta",
								children: [t.mod && /* @__PURE__ */ (0, V.jsx)("span", {
									className: "gsheet-mod",
									children: t.mod
								}), /* @__PURE__ */ (0, V.jsx)("span", {
									className: "gsheet-info",
									children: t.changed
								})]
							}), /* @__PURE__ */ (0, V.jsxs)("button", {
								className: "gsheet-go",
								type: "button",
								onClick: o,
								children: [/* @__PURE__ */ (0, V.jsx)("span", { children: c("gallery.sheet.open") }), /* @__PURE__ */ (0, V.jsx)(fa, {})]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, V.jsx)("button", {
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
var Ea = Gi(A);
function Da(e) {
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
var Oa = Da("0px"), ka = Da("200% 0px"), Aa = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), ja = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M2 4.5V12.5h12V5.5H8L6.5 4H2z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), Ma = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 18 18",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M3 3h5v5H3zM10 3h5v5h-5zM3 10h5v5H3zM10 10h5v5h-5z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3"
	})
});
function Na({ text: e, className: t }) {
	let n = (0, B.useRef)(null), [r, i] = (0, B.useState)(e);
	return (0, B.useLayoutEffect)(() => {
		let t = n.current, r = () => {
			t.clientWidth && i(Qt(e, t.clientWidth, Zt(t)));
		};
		r();
		let a = new ResizeObserver(r);
		return a.observe(t), () => a.disconnect();
	}, [e]), /* @__PURE__ */ (0, V.jsx)("span", {
		ref: n,
		className: t,
		title: r === e ? void 0 : e,
		children: r
	});
}
var Pa = [], Fa = (0, B.memo)(function({ text: e, view: t, stale: n = !1, near: r = !0, shown: i = !0, onOpen: a, onLost: o }) {
	let c = t.status === "done" ? [t.front[1]?.image ?? null, t.front[2]?.image ?? null] : Pa, { phrase: l, daemonText: u } = s(), d = t.status === "done" ? "done" : t.status === "error" ? "failed" : "loading", f = t.status !== "done" || t.image.w <= t.image.h, p = t.status === "done" ? t.sheets : 0;
	return /* @__PURE__ */ (0, V.jsx)("article", {
		className: "gcard",
		"data-state": d,
		"data-stale": n || void 0,
		"aria-busy": d === "loading",
		children: /* @__PURE__ */ (0, V.jsxs)("button", {
			className: "gcard-hit",
			type: "button",
			"aria-haspopup": "dialog",
			onClick: a,
			children: [/* @__PURE__ */ (0, V.jsxs)("span", {
				className: "gcard-cover",
				children: [
					t.status === "error" ? /* @__PURE__ */ (0, V.jsx)("span", {
						className: "gcard-failed",
						title: u(t.failure) || void 0,
						children: l("gallery.failed")
					}) : /* @__PURE__ */ (0, V.jsxs)("span", {
						className: "gcard-stack",
						"data-o": f ? "tall" : "wide",
						children: [["r", "l"].slice(0, c.filter(Boolean).length).map((e) => {
							let t = i ? c[e === "r" ? 0 : 1] : null;
							return /* @__PURE__ */ (0, V.jsx)("span", {
								className: "gcard-ghost",
								"data-g": e,
								children: t && /* @__PURE__ */ (0, V.jsx)("img", {
									src: t.url,
									width: t.w,
									height: t.h,
									alt: "",
									decoding: "async"
								})
							}, e);
						}), /* @__PURE__ */ (0, V.jsx)("span", {
							className: "gcard-shot",
							children: t.status === "done" && r ? /* @__PURE__ */ (0, V.jsx)("img", {
								src: t.image.url,
								width: t.image.w,
								height: t.image.h,
								alt: "",
								decoding: "async",
								onLoad: (e) => e.currentTarget.classList.add("in"),
								onError: o
							}) : /* @__PURE__ */ (0, V.jsx)("span", { className: "gcard-ph" })
						})]
					}),
					n && /* @__PURE__ */ (0, V.jsx)("span", {
						className: "gcard-old",
						title: l("gallery.stale.why"),
						children: l("gallery.stale")
					}),
					p > 1 && /* @__PURE__ */ (0, V.jsxs)("span", {
						className: "gcard-count",
						"aria-label": l("board.count", { n: p }),
						children: [/* @__PURE__ */ (0, V.jsx)(Aa, {}), p]
					})
				]
			}), /* @__PURE__ */ (0, V.jsxs)("span", {
				className: "gcard-body",
				children: [
					/* @__PURE__ */ (0, V.jsx)(Na, {
						className: "gcard-file",
						text: e.name
					}),
					/* @__PURE__ */ (0, V.jsxs)("span", {
						className: "gcard-pkgrow",
						children: [/* @__PURE__ */ (0, V.jsx)(ja, {}), /* @__PURE__ */ (0, V.jsx)(Na, {
							className: "gcard-pkg",
							text: e.pkg
						})]
					}),
					/* @__PURE__ */ (0, V.jsxs)("span", {
						className: "gcard-foot",
						children: [e.mod && /* @__PURE__ */ (0, V.jsx)("span", {
							className: "gcard-mod",
							children: e.mod
						}), /* @__PURE__ */ (0, V.jsx)("span", {
							className: "gcard-info",
							children: e.changed
						})]
					})
				]
			})]
		})
	});
}), Ia = (0, B.memo)(function({ f: e, order: t, name: n, pkg: r, mod: i, changed: a, cards: o, onOpen: s }) {
	let c = (0, B.useRef)(null), l = $i(e), u = (0, B.useSyncExternalStore)(o.subscribe, () => o.get(l)), [d, f] = (0, B.useState)(!1), p = (0, B.useMemo)(() => d ? null : ea(e), [d, e]), m = !!p, h = p ?? u, [g, _] = (0, B.useState)(!1), [v, y] = (0, B.useState)(!1);
	(0, B.useEffect)(() => {
		let n = c.current, r = Oa().add(n, (n) => {
			y(n), n ? m || o.want(l, e.path, t) : o.drop(l);
		}), i = ka().add(n, _);
		return () => {
			r(), i(), o.drop(l);
		};
	}, [
		l,
		t,
		o,
		m
	]);
	let b = (0, B.useMemo)(() => ({
		name: n,
		pkg: r,
		mod: i,
		changed: a
	}), [
		n,
		r,
		i,
		a
	]), x = (0, B.useCallback)(() => s(e), [s, e]), S = (0, B.useCallback)(() => m ? f(!0) : o.lost(l, e.path, t), [
		m,
		o,
		l,
		e,
		t
	]), C = h.status === "done" && ta(e, h.image);
	return /* @__PURE__ */ (0, V.jsx)("div", {
		ref: c,
		className: "gcard-slot",
		"data-path": e.path,
		children: /* @__PURE__ */ (0, V.jsx)(Fa, {
			text: b,
			view: h,
			stale: C,
			near: g,
			shown: v,
			onOpen: x,
			onLost: S
		})
	});
});
async function La(e, { phrase: t, daemonText: n }) {
	if (e.path === U(L.st)) {
		Ze();
		return;
	}
	let r = await N("/viewer/open", { file: e.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	r.ok || F(n(r.message) || t("open.cannot"));
}
var Ra = (0, B.memo)(function({ files: e, ready: t, cards: n, now: r = Date.now(), onOpen: i }) {
	let { phrase: a } = s(), o = (0, B.useMemo)(() => e ? Qi(e) : null, [e]), c = (0, B.useMemo)(() => e ? Ji(e) : [], [e]), l = document.documentElement.lang || "en";
	return /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "gallery-in",
		children: [/* @__PURE__ */ (0, V.jsxs)("div", {
			className: "gallery-head",
			children: [
				/* @__PURE__ */ (0, V.jsx)("h1", {
					className: "gallery-title",
					children: a("gallery.title")
				}),
				o && /* @__PURE__ */ (0, V.jsx)("span", {
					className: "gallery-n",
					children: o.length
				}),
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "gallery-sort",
					children: a("gallery.sort")
				})
			]
		}), !o || !t && !o.length ? /* @__PURE__ */ (0, V.jsx)("p", {
			className: "gallery-note",
			children: a("quickopen.loading")
		}) : o.length ? /* @__PURE__ */ (0, V.jsx)("div", {
			className: "gallery-grid",
			children: o.map((e, t) => /* @__PURE__ */ (0, V.jsx)(Ia, {
				f: e,
				order: t,
				cards: n,
				onOpen: i,
				name: Ki(e),
				pkg: Yi(e, c),
				mod: Xi(e.module),
				changed: Zi(e.mtime, r, a, l)
			}, e.path))
		}) : /* @__PURE__ */ (0, V.jsx)("p", {
			className: "gallery-note",
			children: a("quickopen.none")
		})]
	});
});
function za({ shown: e, state: t, draw: n, host: r }) {
	let i = s(), a = Ge(), { element: c, place: l } = o(r), u = (0, B.useRef)({
		gallery: 0,
		board: 0,
		over: !1
	});
	(0, B.useLayoutEffect)(() => {
		if (!t) return;
		let e = G();
		e.open && (t.screen === "focus" || U(t) !== e.openedOver) && Ze();
	}, [n]), (0, B.useLayoutEffect)(() => {
		if (!c) return;
		let n = Je();
		if (Ye(e), c.hidden = !e, e === n) return;
		let r = t?.screen === "board" || t?.screen === "vacant";
		if (e) {
			nt(), r && (u.current.board = scrollY), u.current.over = r;
			let e = u.current.gallery;
			queueMicrotask(() => scrollTo(0, e));
		} else if (u.current.gallery = scrollY, u.current.over && r && U(t) === G().openedOver) {
			let e = u.current.board;
			queueMicrotask(() => scrollTo(0, e));
		}
	}, [e, c]), (0, B.useLayoutEffect)(() => {
		Ea.pause(!e || !!a.sheet);
	}, [e, a.sheet]), (0, B.useEffect)(() => {
		a.sheet && (!e || a.files && !a.files.some((e) => e.path === a.sheet.path)) && et();
	}, [
		e,
		a.files,
		a.sheet
	]);
	let d = (0, B.useRef)(i);
	d.current = i;
	let f = (0, B.useCallback)((e) => Qe(e.path), []), p = e && a.sheet ? a.files?.find((e) => e.path === a.sheet.path) ?? null : null;
	return l(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)(Ra, {
		files: a.files,
		ready: a.ready,
		cards: Ea,
		onOpen: f
	}), p && /* @__PURE__ */ (0, V.jsx)(Ba, {
		f: p,
		closing: a.sheet.closing,
		onOpen: () => La(p, d.current)
	}, p.path)] }), (e, t) => /* @__PURE__ */ (0, V.jsx)("section", {
		id: "galleryView",
		className: "gallery",
		ref: e,
		children: t
	}));
}
function Ba({ f: e, closing: t, onOpen: n }) {
	let { phrase: r } = s(), i = $i(e), a = (0, B.useSyncExternalStore)(Ea.subscribe, () => Ea.get(i)), o = (0, B.useMemo)(() => ea(e), [e]), c = o ?? a;
	(0, B.useEffect)(() => {
		o || Ea.urgent(i, e.path);
	}, [i]);
	let l = document.documentElement.lang || "en", u = (0, B.useMemo)(() => ({
		name: Ki(e),
		pkg: Yi(e, []),
		mod: Xi(e.module),
		changed: Zi(e.mtime, Date.now(), r, l)
	}), [
		e,
		r,
		l
	]);
	return /* @__PURE__ */ (0, V.jsx)(Ta, {
		file: e,
		text: u,
		view: c,
		closing: t,
		onClose: $e,
		onClosed: et,
		onOpen: n
	});
}
function Va({ on: e, count: t, host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n);
	return (0, B.useLayoutEffect)(() => {
		i && (i.classList.toggle("on", e), e ? i.setAttribute("aria-current", "page") : i.removeAttribute("aria-current"));
	}, [i, e]), (0, B.useLayoutEffect)(() => {
		if (!i) return;
		let t = () => {
			e || Xe();
		};
		return i.addEventListener("click", t), () => i.removeEventListener("click", t);
	}, [i, e]), a(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsx)(Ma, {}),
		/* @__PURE__ */ (0, V.jsx)("span", {
			className: "rail-open-t",
			children: r("rail.all")
		}),
		t != null && /* @__PURE__ */ (0, V.jsx)("span", {
			className: "rail-all-n",
			children: t
		})
	] }), (t, n) => /* @__PURE__ */ (0, V.jsx)("button", {
		className: e ? "rail-all on" : "rail-all",
		id: "railAll",
		ref: t,
		type: "button",
		children: n
	}));
}
// src/components/NotificationCapsule.tsx
var Ha = (0, B.memo)(function({ content: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = (0, B.useSyncExternalStore)(ue, P), { error: c, log: l, once: u } = e ?? a, d = !!(c.trim() || l.trim()) || !!u;
	(0, B.useLayoutEffect)(() => {
		r?.classList.toggle("on", d);
	}, [r, d]);
	let [f, ...p] = u ? u.text.split(/(?<=[.。])\s+/) : [];
	return i(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsxs)("div", {
		className: "cap-once",
		id: "capOnce",
		hidden: !u,
		children: [/* @__PURE__ */ (0, V.jsx)("span", {
			id: "capOnceText",
			children: u && /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("b", { children: f }), p.length ? " " + p.join(" ") : null] })
		}), /* @__PURE__ */ (0, V.jsx)("button", {
			className: "cap-x",
			id: "capOnceX",
			type: "button",
			title: n("capsule.dismiss"),
			"aria-label": n("capsule.dismiss"),
			onClick: ie,
			children: /* @__PURE__ */ (0, V.jsx)("svg", {
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, V.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
			})
		})]
	}), /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "cap-main",
		children: [/* @__PURE__ */ (0, V.jsx)("div", {
			id: "sel",
			className: c ? "error" : "",
			children: c
		}), /* @__PURE__ */ (0, V.jsx)("div", {
			className: "log",
			id: "log",
			children: l
		})]
	})] }), (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
		className: "capsule",
		id: "strip",
		ref: e,
		role: "status",
		children: t
	}));
}), Ua = {
	cursor: null,
	returned: null
}, Wa = (e, t) => e.groups.flatMap((e) => e.cards).find((e) => e.index === t), Ga = 300 / 360, Ka = .25, qa = 100, Ja = 160, Ya = 360, Xa = 640, Za = 120;
function Qa(e, t, n) {
	let r = (t) => e.reduce((e, n) => e + Math.max(n * t, qa), 0) + n * (e.length - 1);
	if (r(Ga) <= t) return {
		s: Ga,
		w: r(Ga),
		wrap: !1
	};
	if (r(Ka) > t) return {
		s: Math.min(Ga, ...e.map((e) => e * Ka >= qa ? Ka : qa / e)),
		w: t,
		wrap: !0
	};
	let i = Ka, a = Ga;
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
var $a = /* @__PURE__ */ new Map();
function eo(e, t) {
	let n = t.cards.map((t) => {
		let n = e + "|" + t.previewId, r = $a.get(n);
		return t.widthDp && t.heightDp && $a.set(n, [t.widthDp, t.heightDp]), [t.widthDp || r?.[0], t.heightDp || r?.[1]];
	}), r = n.filter(([e, t]) => e && t).sort((e, t) => t[0] - e[0])[0];
	return n.map(([e, n], i) => {
		let a = t.cards[i].failure && r;
		return [e || (a ? r[0] : Ya), n || (a ? r[1] : Xa)];
	});
}
function to(e, t, n) {
	let r = e.clientWidth;
	if (!r) return 0;
	let i = e.querySelectorAll(":scope > .group"), a = i[0]?.querySelector(".board"), o = a && parseFloat(getComputedStyle(a).columnGap) || 24;
	return t.groups.forEach((a, s) => {
		let c = i[s];
		if (!c) return;
		let l = eo(t.file, a), { s: u, w: d, wrap: f } = Qa(l.map((e) => e[0]), r, o);
		c.style.width = f ? "100%" : Math.max(Ja, d) + "px", c.querySelector(".board").classList.toggle("spill", f);
		let p = c.querySelector(".sc"), m = u < .8333323333333333, h = a.cards.some((e) => e.dpGuess);
		p.hidden = !m, p.textContent = m ? (h ? "≈" : "") + Math.round(u * 100) + "%" : "", p.title = n("zoom.tip.real") + (h ? " · " + n("board.scale.guess") : ""), a.cards.forEach((t, n) => {
			let r = e.querySelector(`.card[data-i="${t.index}"]`);
			if (!r) return;
			let [i, a] = l[n], o = Math.max(i * u, qa);
			r.style.width = o + "px";
			let s = r.querySelector(".cstage img");
			s.style.width = i * u + "px", s.style.aspectRatio = `auto ${i} / ${a}`;
			let c = r.querySelector(".ph"), d = Math.max(Za, a * u);
			c.style.width = o + "px", c.style.height = d + "px", c.style.setProperty("--lines", String(Math.max(1, Math.floor((d - 55) / 16.7))));
		});
	}), r;
}
var no = (e) => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 12 12",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.1",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: e
}), ro = /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("rect", {
	x: "3.25",
	y: "1.25",
	width: "5.5",
	height: "9.5",
	rx: "1.2"
}), /* @__PURE__ */ (0, V.jsx)("path", { d: "M5.25 9h1.5" })] }), io = {
	portrait: no(ro),
	landscape: no(/* @__PURE__ */ (0, V.jsx)("rect", {
		x: "1.25",
		y: "3",
		width: "9.5",
		height: "6",
		rx: "1.2"
	})),
	device: no(ro),
	dark: no(/* @__PURE__ */ (0, V.jsx)("path", { d: "M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z" })),
	font: /* @__PURE__ */ (0, V.jsx)("span", {
		className: "aa",
		children: "Aa"
	}),
	locale: no(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("circle", {
		cx: "6",
		cy: "6",
		r: "4.75"
	}), /* @__PURE__ */ (0, V.jsx)("path", { d: "M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75" })] })),
	api: no(/* @__PURE__ */ (0, V.jsx)("path", { d: "M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5" })),
	systemUi: no(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("rect", {
		x: "3.25",
		y: "1.25",
		width: "5.5",
		height: "9.5",
		rx: "1.2"
	}), /* @__PURE__ */ (0, V.jsx)("path", { d: "M3.5 3.25h5" })] }))
}, ao = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "currentColor",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z" })
});
function oo({ card: e }) {
	let { daemonText: t } = s();
	return /* @__PURE__ */ (0, V.jsx)("span", {
		className: "specs",
		title: e.args,
		children: e.specs.map((e, n) => {
			let r = t(e.text), [i, a] = e.kind === "size" ? r.split("×").map(Number) : [], o = e.kind === "size" ? i > a ? "landscape" : "portrait" : e.kind;
			return /* @__PURE__ */ (0, V.jsxs)("span", {
				className: "spec",
				children: [io[o] ?? null, /* @__PURE__ */ (0, V.jsxs)("span", { children: [r, e.kind === "size" && /* @__PURE__ */ (0, V.jsx)("span", {
					className: "unit",
					children: "dp"
				})] })]
			}, n);
		})
	});
}
var so = (0, B.memo)(function({ card: e, fn: t, cursor: n = !1, returned: r = !1, actions: i }) {
	let { phrase: a, daemonText: o } = s(), c = (0, B.useRef)(null), l = (0, B.useRef)(null), u = (0, B.useRef)(null), d = (0, B.useRef)(null), f = (0, B.useRef)(null), p = !!(e.ok && e.imageUrl);
	(0, B.useLayoutEffect)(() => {
		if (!i) return;
		let t = new AbortController();
		return i.point(e.index, {
			stage: c.current,
			img: l.current,
			box: u.current,
			pick: d.current,
			marks: f.current
		}, t.signal), () => t.abort();
	}, [i, e.index]), (0, B.useLayoutEffect)(() => {
		let t = l.current;
		p ? (t.dataset.url !== e.imageUrl && (ve(t, e.imageUrl), u.current.classList.remove("on"), d.current.hidden = !0), t.hidden = !1) : t.hidden = !0;
	}, [p, e.imageUrl]);
	let m = !p && e.failure ? o(e.failure) : null;
	return /* @__PURE__ */ (0, V.jsxs)("article", {
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
		children: [/* @__PURE__ */ (0, V.jsxs)("div", {
			className: "label",
			children: [
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "fn",
					title: e.label ? e.label + "\n" + e.title : e.title,
					children: e.label
				}),
				/* @__PURE__ */ (0, V.jsxs)("button", {
					className: "go",
					type: "button",
					title: a("card.go.tip"),
					onClick: () => {
						C(e.index), i?.open(e.index);
					},
					children: [ao, /* @__PURE__ */ (0, V.jsx)("span", {
						className: "go-t",
						children: a("card.go")
					})]
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "sub",
					children: /* @__PURE__ */ (0, V.jsx)(oo, { card: e })
				})
			]
		}), /* @__PURE__ */ (0, V.jsxs)("div", {
			className: "cstage",
			ref: c,
			children: [
				/* @__PURE__ */ (0, V.jsx)("img", {
					alt: "",
					hidden: !0,
					ref: l
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "marks",
					"aria-hidden": "true",
					ref: f
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "box",
					ref: u
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "box pick",
					hidden: !0,
					ref: d
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: m ? "ph bad" : "ph",
					hidden: p,
					title: m ?? "",
					children: m ? /* @__PURE__ */ (0, V.jsx)("span", {
						className: "why",
						children: m
					}) : a("card.waiting")
				})
			]
		})]
	});
});
function co({ group: e, marks: t = Ua, actions: n }) {
	let { phrase: r } = s(), i = e.cards.every((e) => !e.label);
	return /* @__PURE__ */ (0, V.jsxs)("section", {
		className: i ? "group nameless" : "group",
		"data-fn": e.name,
		children: [/* @__PURE__ */ (0, V.jsxs)("div", {
			className: "ghead",
			children: [/* @__PURE__ */ (0, V.jsx)("span", {
				className: "gn",
				title: e.name,
				children: e.name
			}), /* @__PURE__ */ (0, V.jsxs)("span", {
				className: "m",
				children: [
					/* @__PURE__ */ (0, V.jsx)("span", {
						className: "n",
						children: r("board.count", { n: e.cards.length })
					}),
					/* @__PURE__ */ (0, V.jsx)("span", {
						className: "sc",
						hidden: !0
					}),
					/* @__PURE__ */ (0, V.jsx)("span", {
						className: "bad",
						children: e.failed ? `· ${r("board.failed", { n: e.failed })}` : ""
					})
				]
			})]
		}), /* @__PURE__ */ (0, V.jsx)("div", {
			className: "gbody",
			children: /* @__PURE__ */ (0, V.jsx)("div", {
				className: "board",
				children: e.cards.map((r) => /* @__PURE__ */ (0, V.jsx)(so, {
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
function lo({ board: e, screen: t, hosts: n, actions: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n?.cards), [l, u] = (0, B.useState)(null), d = n?.view ?? l, f = (0, B.useSyncExternalStore)(T, p), m = (0, B.useRef)({
		board: null,
		live: null
	}), h = (0, B.useMemo)(() => {
		let n = m.current;
		if (t === "focus" && e) return n.live = Wa(e, e.focus)?.imageUrl ?? null, n.board;
		let r = e && Wa(e, e.focus);
		return e && n.board?.file === e.file && n.live && r?.imageUrl === n.live ? {
			...n.board,
			focus: e.focus
		} : (n.board = e, n.live = null, e);
	}, [e, t]), g = h ? h.file + "|" + h.groups.map((e) => e.cards.map((e) => e.previewId).join(",")).join("|") : "";
	(0, B.useLayoutEffect)(() => {
		_();
	}, [g]);
	let v = (0, B.useRef)(h), b = (0, B.useRef)(i), x = (0, B.useRef)(0);
	v.current = h, b.current = i, (0, B.useLayoutEffect)(() => {
		d && (t !== null && (d.hidden = t !== "board"), t !== "focus" && (E(h), h && a && (x.current = to(a, h, i) || x.current)));
	}, [
		h,
		t,
		d,
		a
	]), (0, B.useEffect)(() => {
		if (!a) return;
		let e = () => {
			v.current && (x.current = to(a, v.current, b.current) || x.current);
		}, t = new ResizeObserver(() => {
			let t = a.clientWidth;
			t && t !== x.current && e();
		});
		return t.observe(a), y(e), () => {
			t.disconnect(), y(() => {});
		};
	}, [a]);
	let S = h && /* @__PURE__ */ (0, V.jsx)(B.Fragment, { children: h.groups.map((e, t) => /* @__PURE__ */ (0, V.jsx)(co, {
		group: e,
		marks: f,
		actions: r
	}, t)) }, g);
	return n ? c(S, () => null) : /* @__PURE__ */ (0, V.jsx)("section", {
		id: "boardView",
		ref: u,
		children: c(S, (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
			className: "board",
			id: "cards",
			ref: e,
			children: t
		}))
	});
}
// src/components/StaleBanner.tsx
function uo({ rows: e, host: t }) {
	let { daemonText: n } = s(), { element: r, place: i } = o(t), a = (0, B.useRef)([]);
	e?.length && (a.current = e);
	let c = !!e?.length;
	return (0, B.useLayoutEffect)(() => {
		r && e && (r.classList.toggle("on", c), t && document.body.classList.toggle("stale", c));
	}, [
		r,
		t,
		e,
		c
	]), i(/* @__PURE__ */ (0, V.jsx)("div", {
		className: "in",
		children: /* @__PURE__ */ (0, V.jsx)("div", {
			className: "rows",
			id: "staleRows",
			children: a.current.map((e, t) => /* @__PURE__ */ (0, V.jsxs)("div", {
				className: "row",
				children: [/* @__PURE__ */ (0, V.jsx)("span", {
					className: "head",
					children: n(e.head)
				}), /* @__PURE__ */ (0, V.jsx)("span", {
					className: "why",
					children: e.why.map(n).join(" · ")
				})]
			}, t))
		})
	}), (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
		className: "stalebar",
		id: "staleBar",
		ref: e,
		children: t
	}));
}
// src/components/StatusPill.tsx
function fo({ state: e, connection: t = null, host: n, bar: r }) {
	let { phrase: i, daemonText: a } = s(), { element: c, place: l } = o(n), u = e?.timing.find((e) => e.head), d = !!e?.timing.some((e) => e.over), f = !!e && (!!e.error || e.stale.length > 0 || !!e.board?.groups.some((e) => e.failed)), p = e ? e.busy ? "busy" : f ? "error" : d ? "over" : u ? "idle" : "none" : "none", m = e ? e.busy ? a(e.boardNote) : u ? u.text : "" : "";
	t === "restarting" && (p = "busy", m = i("status.restarting")), t === "lost" && (p = "error", m = i("status.lost.short"));
	let h = t === "restarting" || t !== "lost" && !!e?.busy;
	return (0, B.useLayoutEffect)(() => {
		c && (e || t) && (c.dataset.state = p);
	}, [
		c,
		e,
		t,
		p
	]), (0, B.useLayoutEffect)(() => {
		r && (e || t) && r.classList.toggle("busy", h);
	}, [
		r,
		e,
		t,
		h
	]), l(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsxs)("span", {
			className: "st-ic",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, V.jsx)("svg", {
					className: "i-ok",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					children: /* @__PURE__ */ (0, V.jsx)("path", { d: "m3.5 8.5 3 3 6-7" })
				}),
				/* @__PURE__ */ (0, V.jsx)("svg", {
					className: "i-busy",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M8 2.5a5.5 5.5 0 1 1-5.5 5.5" })
				}),
				/* @__PURE__ */ (0, V.jsxs)("svg", {
					className: "i-bad",
					viewBox: "0 0 16 16",
					children: [
						/* @__PURE__ */ (0, V.jsx)("circle", {
							cx: "8",
							cy: "8",
							r: "6.5",
							fill: "currentColor"
						}),
						/* @__PURE__ */ (0, V.jsx)("path", {
							className: "mark",
							d: "M8 4.8v3.8",
							strokeWidth: "1.7",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ (0, V.jsx)("circle", {
							className: "mark",
							cx: "8",
							cy: "11.2",
							r: ".95"
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, V.jsx)("span", {
			className: "st-text",
			id: "statusText",
			children: m
		}),
		/* @__PURE__ */ (0, V.jsxs)("div", {
			className: "pop",
			role: "tooltip",
			children: [
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "note",
					id: "note",
					children: a(e?.boardNote ?? null)
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "who",
					id: "who",
					children: a(e?.who ?? null)
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "settle",
					id: "settle",
					children: a(e?.settle ?? null)
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "timing",
					id: "timing",
					children: e?.timing.flatMap((e, t) => [/* @__PURE__ */ (0, V.jsx)("span", {
						className: e.over ? "over" : void 0,
						children: a(e.label)
					}, `k${t}`), /* @__PURE__ */ (0, V.jsx)("b", {
						className: e.over ? "over" : void 0,
						children: e.text
					}, `v${t}`)])
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "where",
					id: "where",
					children: e ? location.host : ""
				})
			]
		})
	] }), (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
		className: "status",
		id: "status",
		ref: e,
		tabIndex: 0,
		"data-state": "none",
		children: t
	}));
}
// src/components/PointOverlay.tsx
var po = {
	choose() {},
	cancel() {},
	follow() {},
	pick() {},
	peek() {},
	jump() {},
	close() {}
}, Q = (e) => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), mo = Q(/* @__PURE__ */ (0, V.jsx)("path", { d: "M4 4l8 8M12 4l-8 8" })), ho = Q(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
	/* @__PURE__ */ (0, V.jsx)("rect", {
		x: "2",
		y: "3",
		width: "12",
		height: "10",
		rx: "1.5"
	}),
	/* @__PURE__ */ (0, V.jsx)("path", { d: "M2.5 11.5L6 8l2.5 2.5 2-2 3 3" }),
	/* @__PURE__ */ (0, V.jsx)("circle", {
		cx: "10.5",
		cy: "6",
		r: "0.75",
		fill: "currentColor",
		stroke: "none"
	})
] })), go = {
	width: Q(/* @__PURE__ */ (0, V.jsx)("path", { d: "M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5" })),
	height: Q(/* @__PURE__ */ (0, V.jsx)("path", { d: "M8 2v12M5.5 4.5 8 2l2.5 2.5M5.5 11.5 8 14l2.5-2.5" })),
	size: Q(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("path", { d: "M2.5 6V2.5H6M10 13.5h3.5V10" }), /* @__PURE__ */ (0, V.jsx)("path", { d: "M2.5 2.5l11 11" })] })),
	padding: Q(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("rect", {
		x: "2.5",
		y: "2.5",
		width: "11",
		height: "11",
		rx: "1.5"
	}), /* @__PURE__ */ (0, V.jsx)("rect", {
		x: "5.5",
		y: "5.5",
		width: "5",
		height: "5",
		rx: "0.5",
		strokeDasharray: "1.5 1.5"
	})] })),
	click: Q(/* @__PURE__ */ (0, V.jsx)("path", { d: "M5 2.5l7.5 4.8-3.4.9 2 3.4-1.6.9-2-3.4L5 11.5z" })),
	text: Q(/* @__PURE__ */ (0, V.jsx)("path", { d: "M3.5 3.5h9M8 3.5v9M6 12.5h4" })),
	color: Q(/* @__PURE__ */ (0, V.jsx)("path", { d: "M8 2.5S4 7 4 9.75a4 4 0 0 0 8 0C12 7 8 2.5 8 2.5z" }))
};
function _o(e) {
	let t = /#L(\d+)$/.exec(e), n = e.replace(/^@/, "").replace(/#L\d+$/, "");
	return t ? `${n.slice(n.lastIndexOf("/") + 1)}:${t[1]}` : n;
}
function vo(e, t) {
	let n = t && e.startsWith(t + "/") ? e.slice(t.length + 1) : e, r = n.lastIndexOf("/") + 1, i = n.indexOf("/src/");
	return (i > 0 && i < r ? n.slice(0, i) + "/…/" : n.slice(0, r)) + n.slice(r);
}
function yo(e, t) {
	let n = (e.uchain || e.chain || []).slice(-6).join(" › ");
	return (t.ref ? [
		t.ref,
		e.name,
		n
	] : [t.msg, n]).filter(Boolean).join("\n");
}
var bo = [.5, 3.2], xo = 2, So = (e) => String(Math.round(e * 10) / 10), Co = () => typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, wo = (e) => {
	e.button === 0 && e.target.closest("button") && e.preventDefault();
};
function To({ row: e, here: t, actions: n, children: r }) {
	return /* @__PURE__ */ (0, V.jsxs)("li", {
		className: `pc-node${t ? " here" : ""}`,
		"data-id": e.id,
		children: [/* @__PURE__ */ (0, V.jsx)("div", {
			className: "pc-row",
			onMouseEnter: () => n.peek(e),
			onMouseLeave: () => n.peek(null),
			children: /* @__PURE__ */ (0, V.jsx)("button", {
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
function Eo({ tree: e, actions: t, settled: n }) {
	let { ups: r, here: i, before: a, after: o, downs: s } = e, [c, l] = (0, B.useState)(null), [u, d] = (0, B.useState)(!1), f = (0, B.useRef)(null);
	(0, B.useLayoutEffect)(() => {
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
	let p = (e) => c?.at === e.id ? /* @__PURE__ */ (0, V.jsx)("div", {
		className: "pc-foldout",
		inert: !0,
		onAnimationEnd: (e) => {
			e.target === e.currentTarget && (l(null), n());
		},
		children: /* @__PURE__ */ (0, V.jsx)("ul", {
			className: "pc-group",
			children: c.rows.map((e) => /* @__PURE__ */ (0, V.jsx)(To, {
				row: e,
				actions: t
			}, e.id))
		})
	}, `fold-${e.id}`) : void 0, m = (e) => /* @__PURE__ */ (0, V.jsx)(To, {
		row: e,
		actions: t,
		children: p(e)
	}, e.id), h = s.length ? /* @__PURE__ */ (0, V.jsx)("div", {
		className: u ? "pc-unfold" : void 0,
		onAnimationEnd: (e) => {
			e.target === e.currentTarget && n();
		},
		children: /* @__PURE__ */ (0, V.jsx)("ul", {
			className: "pc-group",
			children: s.map(m)
		})
	}, `unfold-${i.id}`) : null, g = /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		a.map(m),
		/* @__PURE__ */ (0, V.jsx)(To, {
			row: i,
			here: !0,
			actions: t,
			children: h
		}, i.id),
		o.map(m)
	] }), _ = Math.max(0, r.length - xo), v = r.slice(_).reduceRight((e, n) => /* @__PURE__ */ (0, V.jsx)(To, {
		row: n,
		actions: t,
		children: /* @__PURE__ */ (0, V.jsx)("ul", {
			className: "pc-group",
			children: e
		})
	}, n.id), g);
	return /* @__PURE__ */ (0, V.jsxs)("ul", {
		className: "pc-tree",
		children: [r.slice(0, _).map((e) => /* @__PURE__ */ (0, V.jsx)(To, {
			row: e,
			actions: t
		}, e.id)), v]
	});
}
function Do({ say: e }) {
	let { phrase: t } = s();
	return e.copied === !1 ? e.again ? /* @__PURE__ */ (0, V.jsx)("button", {
		type: "button",
		className: "pc-rescue",
		title: t("point.card.retry.title", { ref: e.ref ?? "" }),
		onClick: e.again,
		children: t("point.card.retry")
	}) : /* @__PURE__ */ (0, V.jsx)("span", {
		className: "pc-rescue off",
		children: t("point.card.blocked")
	}) : null;
}
var Oo = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 24 24",
	fill: "currentColor",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M12.135.003a2.577 2.577 0 0 0-1.42.344L2.55 5.06a2.577 2.577 0 0 0-.953.967l3.957 2.17a1.765 1.765 0 0 1 .603-.588l4.951-2.86a1.761 1.761 0 0 1 1.76 0l4.951 2.86a1.753 1.753 0 0 1 .526.46l3.921-2.265a2.577 2.577 0 0 0-.816-.744L13.291.347a2.577 2.577 0 0 0-1.152-.34Zm-.145 4.912a1.36 1.36 0 0 0-.68.182L6.36 7.953a1.345 1.345 0 0 0-.454.435l1.92 1.055a1.05 1.05 0 0 1 .31-.275l3.34-1.928a1.054 1.054 0 0 1 1.051 0l3.336 1.928a1.066 1.066 0 0 1 .238.199l.018-.01-.002-.002 1.877-1.08a1.353 1.353 0 0 0-.373-.322l-4.95-2.86a1.357 1.357 0 0 0-.68-.178Zm10.432 1.149-3.92 2.26a1.757 1.757 0 0 1 .2.812v5.715c0 .627-.332 1.21-.88 1.528l-4.95 2.86a1.761 1.761 0 0 1-.64.214v4.524a2.577 2.577 0 0 0 1.059-.313l8.162-4.713a2.577 2.577 0 0 0 1.289-2.23V7.297a2.577 2.577 0 0 0-.318-1.228Zm-20.937.238a2.577 2.577 0 0 0-.227.99v9.43c0 .918.491 1.767 1.293 2.229l8.162 4.713a2.57 2.57 0 0 0 1.225.336v-4.531a1.761 1.761 0 0 1-.833-.235L6.156 16.38a1.765 1.765 0 0 1-.877-1.528V9.136a1.776 1.776 0 0 1 .131-.676Zm16.67 2.223-1.89 1.092a1.058 1.058 0 0 1 .124.46v3.856c0 .378-.2.72-.526.907l-3.336 1.93a1.04 1.04 0 0 1-.295.107v2.17c.152-.027.304-.078.44-.157l4.949-2.859a1.36 1.36 0 0 0 .68-1.18V9.136a1.36 1.36 0 0 0-.147-.607Zm-12.387.13a1.36 1.36 0 0 0-.088.481v5.715a1.36 1.36 0 0 0 .68 1.18l4.95 2.86c.194.112.412.166.627.177v-2.174a1.054 1.054 0 0 1-.46-.123L8.14 14.843a1.054 1.054 0 0 1-.532-.908v-3.853a.99.99 0 0 1 .077-.38l-.034-.013z" })
}), ko = Q(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("path", { d: "M8 4.5C6.6 3.4 4.6 3 2.5 3.2v9.1c2.1-.2 4.1.2 5.5 1.3 1.4-1.1 3.4-1.5 5.5-1.3V3.2C11.4 3 9.4 3.4 8 4.5z" }), /* @__PURE__ */ (0, V.jsx)("path", { d: "M8 4.5v9" })] }));
function Ao({ origin: e }) {
	let { phrase: t } = s();
	return e ? e === "compose" ? /* @__PURE__ */ (0, V.jsxs)("span", {
		className: "pc-chip compose",
		title: t("point.card.compose.title"),
		children: [Oo, t("point.card.compose")]
	}) : e === "library" ? /* @__PURE__ */ (0, V.jsxs)("span", {
		className: "pc-chip library",
		title: t("point.card.library.title"),
		children: [ko, t("point.card.library")]
	}) : /* @__PURE__ */ (0, V.jsx)("span", {
		className: "pc-chip module",
		title: t("point.card.module.title", { module: e.module }),
		children: e.module
	}) : null;
}
function jo({ box: e }) {
	let t = e.width > 0 && e.height > 0 ? e.width / e.height : 1, n = Math.min(bo[1], Math.max(bo[0], t));
	return /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "pc-size",
		children: [/* @__PURE__ */ (0, V.jsx)("div", {
			className: "pc-glyph",
			children: /* @__PURE__ */ (0, V.jsx)("div", {
				className: `pc-shape${e.padded ? " padded" : ""}`,
				style: { "--ratio": n },
				children: e.padded && /* @__PURE__ */ (0, V.jsx)("i", {})
			})
		}), /* @__PURE__ */ (0, V.jsxs)("div", {
			className: "pc-dims",
			children: [
				So(e.width),
				/* @__PURE__ */ (0, V.jsx)("i", { children: "×" }),
				So(e.height),
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "pc-unit",
					children: e.unit
				})
			]
		})]
	});
}
function Mo(e) {
	return e.sizes?.length ? e.sizes.length === 2 ? "size" : e.sizes[0] : e.color ? "color" : {
		padding: "padding",
		clickable: "click",
		text: "text"
	}[e.name] ?? null;
}
function No({ modifiers: e }) {
	let { phrase: t } = s();
	return /* @__PURE__ */ (0, V.jsx)("div", {
		className: "pc-mods",
		children: /* @__PURE__ */ (0, V.jsx)("ol", {
			className: "pc-scroll",
			tabIndex: 0,
			"aria-label": t("point.card.modifiers"),
			children: e.map((e, n) => {
				let r = Mo(e);
				return /* @__PURE__ */ (0, V.jsxs)("li", { children: [
					r ? /* @__PURE__ */ (0, V.jsx)("span", {
						className: "pc-kind",
						title: t(`point.card.kind.${r}`),
						"aria-label": t(`point.card.kind.${r}`),
						children: go[r]
					}) : /* @__PURE__ */ (0, V.jsx)("span", { className: "pc-kind" }),
					/* @__PURE__ */ (0, V.jsx)("span", {
						className: "pc-mod-name",
						children: e.name
					}),
					(e.value || e.color) && /* @__PURE__ */ (0, V.jsxs)("span", {
						className: "pc-mod-value",
						title: e.value,
						children: [e.color && /* @__PURE__ */ (0, V.jsx)("i", {
							className: "pc-swatch",
							style: { background: e.color }
						}), /* @__PURE__ */ (0, V.jsx)("span", { children: e.value })]
					})
				] }, `${n}-${e.name}`);
			})
		})
	});
}
function Po({ card: e, actions: t = po }) {
	let { phrase: n } = s(), { node: r, say: i, box: a, tree: o, modifiers: c, previews: l, origin: u } = e, d = (0, B.useRef)(null), f = (0, B.useRef)(!1), p = (e) => {
		let t = d.current, n = t?.querySelector(".pc-node.here > .pc-row");
		if (!t || !n) return;
		let r = t.scrollTop + n.getBoundingClientRect().top - t.getBoundingClientRect().top - (t.clientHeight - n.offsetHeight) / 2;
		t.scrollTo({
			top: r,
			behavior: e && !Co() ? "smooth" : "auto"
		});
	}, m = o?.here.id;
	(0, B.useLayoutEffect)(() => {
		p(f.current), f.current = !0;
	}, [m]);
	let [h, g] = (0, B.useState)(!1);
	(0, B.useEffect)(() => g(!1), [m, r.lineNumber]);
	let _ = i.file ? `${i.file.slice(i.file.lastIndexOf("/") + 1)}:${r.lineNumber}` : i.ref ? _o(i.ref) : "", v = l.length > 1, y = v ? n("point.card.previews", { n: l.length }) : l[0] && n("point.card.jump", { name: l[0].fn }), b = m ?? `${r.name}:${r.lineNumber}`;
	return /* @__PURE__ */ (0, V.jsx)("section", {
		className: "point-card",
		"aria-label": n("point.card.label"),
		onMouseDown: wo,
		children: /* @__PURE__ */ (0, V.jsxs)("div", {
			className: "pc-body",
			children: [
				/* @__PURE__ */ (0, V.jsxs)("header", {
					className: "pc-head",
					children: [
						/* @__PURE__ */ (0, V.jsxs)("div", {
							className: "pc-id pc-swap",
							title: yo(r, i),
							children: [/* @__PURE__ */ (0, V.jsxs)("span", {
								className: "pc-nameline",
								children: [/* @__PURE__ */ (0, V.jsx)("span", {
									className: "pc-name",
									children: r.name || r.fileName
								}), /* @__PURE__ */ (0, V.jsx)(Ao, { origin: u })]
							}), i.ref && /* @__PURE__ */ (0, V.jsxs)("span", {
								className: "pc-refline",
								children: [/* @__PURE__ */ (0, V.jsx)("span", {
									className: "pc-ref",
									children: _
								}), /* @__PURE__ */ (0, V.jsx)(Do, { say: i })]
							})]
						}, `id-${b}`),
						y && /* @__PURE__ */ (0, V.jsxs)("button", {
							type: "button",
							className: "pc-jump",
							title: y,
							"aria-label": y,
							"aria-expanded": v ? h : void 0,
							onClick: () => v ? g((e) => !e) : t.jump(l[0]),
							children: [ho, v && /* @__PURE__ */ (0, V.jsx)("span", { children: l.length })]
						}),
						/* @__PURE__ */ (0, V.jsx)("button", {
							type: "button",
							className: "pc-close",
							title: n("point.card.close"),
							"aria-label": n("point.card.close"),
							onClick: t.close,
							children: mo
						})
					]
				}),
				v && /* @__PURE__ */ (0, V.jsx)("div", {
					className: "pc-fold",
					"data-open": h || void 0,
					inert: !h,
					children: /* @__PURE__ */ (0, V.jsx)("ul", {
						className: "pc-previews",
						children: l.map((e) => /* @__PURE__ */ (0, V.jsx)("li", { children: /* @__PURE__ */ (0, V.jsxs)("button", {
							type: "button",
							className: "pc-preview",
							title: `${e.fn} — ${e.rel}`,
							onClick: () => t.jump(e),
							children: [ho, /* @__PURE__ */ (0, V.jsx)("span", { children: e.fn })]
						}) }, `${e.file}#${e.fn}`))
					})
				}),
				!i.ref && /* @__PURE__ */ (0, V.jsx)("p", {
					className: "pc-msg",
					children: i.msg
				}),
				o && /* @__PURE__ */ (0, V.jsx)("div", {
					className: "pc-panel pc-tree-panel",
					children: /* @__PURE__ */ (0, V.jsx)("div", {
						className: "pc-scroll",
						ref: d,
						children: /* @__PURE__ */ (0, V.jsx)(Eo, {
							tree: o,
							actions: t,
							settled: () => p(!0)
						})
					})
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "pc-panel pc-detail",
					children: /* @__PURE__ */ (0, V.jsxs)("div", {
						className: "pc-detail-in pc-swap",
						children: [/* @__PURE__ */ (0, V.jsx)(jo, { box: a }), c && c.length > 0 && /* @__PURE__ */ (0, V.jsx)(No, { modifiers: c })]
					}, `detail-${b}`)
				})
			]
		})
	});
}
function Fo({ room: e, shot: t, card: n, space: r }) {
	let i = t.left + t.width + r.gap;
	return {
		left: i + n.width <= e.right - r.edge ? i : Math.max(e.left + r.edge, t.left - r.gap - n.width),
		top: Math.max(r.edge, t.top)
	};
}
var Io = (e, t) => parseFloat(getComputedStyle(e).getPropertyValue(t)) || 0, Lo = (e) => {
	let t = document.getElementById(e);
	return t && !t.hidden && t.offsetWidth ? t.getBoundingClientRect() : null;
};
function Ro({ host: e, shot: t, leaving: n = !1, onLeft: r, children: i }) {
	let a = (0, B.useRef)(null), o = (0, B.useRef)(r);
	o.current = r;
	let [s, c] = (0, B.useState)(0), [l, u] = (0, B.useState)(!1);
	(0, B.useLayoutEffect)(() => {
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
	}, []), (0, B.useLayoutEffect)(() => {
		let n = a.current;
		if (!n) return;
		let r = {
			gap: Io(n, "--space-16"),
			edge: Io(n, "--space-8")
		}, i = 0, o = "", s = () => {
			let a = t(), c = e.getBoundingClientRect(), l = "hidden";
			if (a && a.width) {
				let t = Lo("rail"), i = Fo({
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
	}, [e, t]), (0, B.useEffect)(() => {
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
	return /* @__PURE__ */ (0, V.jsx)("div", {
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
function zo({ host: e, shot: t, card: n, actions: r }) {
	let i = (0, B.useRef)(/* @__PURE__ */ new WeakMap()), a = (0, B.useRef)(0), o = (0, B.useRef)(null), [s, c] = (0, B.useState)(!0), l = !!(e && t && n);
	e && t && n && (o.current = {
		host: e,
		shot: t,
		card: n
	}, s && c(!1));
	let u = o.current;
	return !u || s ? null : (i.current.has(u.shot) || i.current.set(u.shot, ++a.current), (0, Bi.createPortal)(/* @__PURE__ */ (0, V.jsx)(Ro, {
		host: u.host,
		shot: u.shot,
		leaving: !l,
		onLeft: () => c(!0),
		children: /* @__PURE__ */ (0, V.jsx)(Po, {
			card: u.card,
			actions: r
		})
	}, i.current.get(u.shot)), u.host));
}
function Bo({ actions: e }) {
	let { host: t, shot: n, card: r } = (0, B.useSyncExternalStore)(Xn.subscribe, Xn.get);
	return /* @__PURE__ */ (0, V.jsx)(zo, {
		host: t,
		shot: n,
		card: r,
		actions: e
	});
}
function Vo({ choice: e, repo: t, host: n, actions: r = po }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), l = (0, B.useRef)(e);
	e && (l.current = e);
	let u = l.current;
	return (0, B.useLayoutEffect)(() => {
		a && (a.classList.toggle("on", !!e), a.setAttribute("aria-hidden", String(!e)), e ? r.follow(a) : a.contains(document.activeElement) && document.activeElement.blur());
	}, [e, a]), c(u && /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsx)("h2", { children: i("choose.title", {
			file: u.fileName,
			n: u.candidates.length
		}) }),
		/* @__PURE__ */ (0, V.jsx)("p", { children: i("choose.sub") }),
		u.candidates.map((e) => /* @__PURE__ */ (0, V.jsx)("button", {
			type: "button",
			className: "opt",
			title: e,
			onClick: () => r.choose(e),
			children: vo(e.startsWith(u.repoRoot + "/") ? e.slice(u.repoRoot.length + 1) : e, t)
		}, e)),
		/* @__PURE__ */ (0, V.jsx)("button", {
			type: "button",
			className: "cancel",
			onClick: r.cancel,
			children: i("choose.cancel")
		})
	] }), (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
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
function Ho({ screen: e, vacant: t, host: n }) {
	let { phrase: r, daemonText: i } = s(), { element: a, place: c } = o(n);
	return (0, B.useLayoutEffect)(() => {
		a && e !== null && (a.hidden = e !== "vacant");
	}, [e, a]), c(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("p", {
		className: "vacant-msg",
		id: "vacantMsg",
		children: i(t)
	}), /* @__PURE__ */ (0, V.jsx)("p", {
		className: "vacant-hint",
		children: r("vacant.hint")
	})] }), (e, t) => /* @__PURE__ */ (0, V.jsx)("section", {
		id: "vacantView",
		className: "vacant",
		ref: e,
		children: t
	}));
}
// src/components/WorkspaceShell.tsx
function Uo() {
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
var Wo = ({ id: e, hidden: t }) => /* @__PURE__ */ (0, V.jsxs)("div", {
	className: "unit",
	id: e,
	hidden: t,
	children: [
		/* @__PURE__ */ (0, V.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, V.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, V.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, V.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, V.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, V.jsx)("div", { className: "shell" }),
		/* @__PURE__ */ (0, V.jsx)("div", { className: "home" }),
		/* @__PURE__ */ (0, V.jsx)("div", { className: "outline" }),
		/* @__PURE__ */ (0, V.jsxs)("div", {
			className: "stage",
			children: [
				/* @__PURE__ */ (0, V.jsx)("img", {
					className: "ly l0",
					alt: ""
				}),
				/* @__PURE__ */ (0, V.jsx)("div", { className: "veil" }),
				/* @__PURE__ */ (0, V.jsx)("img", {
					className: "ly l1",
					alt: ""
				}),
				/* @__PURE__ */ (0, V.jsx)("div", { className: "crease" }),
				/* @__PURE__ */ (0, V.jsx)("div", { className: "cam" })
			]
		}),
		/* @__PURE__ */ (0, V.jsx)("div", { className: "tick t-top" }),
		/* @__PURE__ */ (0, V.jsx)("div", { className: "tick t-bot" })
	]
});
function Go() {
	let e = Uo();
	return /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "ruler",
		id: "ruler",
		hidden: !0,
		children: [
			/* @__PURE__ */ (0, V.jsxs)("svg", {
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, V.jsx)("path", {
					className: "ext",
					id: "rlExt"
				}), /* @__PURE__ */ (0, V.jsx)("path", {
					className: "dim",
					id: "rlDim"
				})]
			}),
			/* @__PURE__ */ (0, V.jsx)("input", {
				className: "rl-badge",
				id: "rlW",
				type: "text",
				inputMode: "numeric",
				maxLength: 4,
				...e.label("size.w.label"),
				...e.title("size.w.tip")
			}),
			/* @__PURE__ */ (0, V.jsx)("input", {
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
function Ko({ marks: e = Yo() }) {
	return /* @__PURE__ */ (0, V.jsx)("div", {
		className: "resize-scene",
		id: "resizeScene",
		hidden: !0,
		children: /* @__PURE__ */ (0, V.jsxs)("div", {
			className: "resize-geometry",
			id: "resizeGeometry",
			children: [
				/* @__PURE__ */ (0, V.jsx)(Wo, { id: "ua" }),
				/* @__PURE__ */ (0, V.jsx)(Wo, {
					id: "ub",
					hidden: !0
				}),
				/* @__PURE__ */ (0, V.jsx)(Go, {}),
				e,
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "rig",
					id: "rig",
					hidden: !0,
					children: /* @__PURE__ */ (0, V.jsx)("div", {
						className: "lift",
						children: /* @__PURE__ */ (0, V.jsxs)("div", {
							className: "space",
							children: [
								/* @__PURE__ */ (0, V.jsx)("div", { className: "plate" }),
								/* @__PURE__ */ (0, V.jsxs)("div", {
									className: "slab base",
									children: [/* @__PURE__ */ (0, V.jsxs)("div", {
										className: "face front",
										children: [
											/* @__PURE__ */ (0, V.jsxs)("div", {
												className: "clip",
												children: [
													/* @__PURE__ */ (0, V.jsx)("img", {
														className: "ly old",
														alt: ""
													}),
													/* @__PURE__ */ (0, V.jsx)("div", { className: "veil" }),
													/* @__PURE__ */ (0, V.jsx)("img", {
														className: "ly neu",
														alt: ""
													}),
													/* @__PURE__ */ (0, V.jsx)("div", { className: "cast" }),
													/* @__PURE__ */ (0, V.jsx)("div", { className: "cam" })
												]
											}),
											/* @__PURE__ */ (0, V.jsx)("div", { className: "lit" }),
											/* @__PURE__ */ (0, V.jsx)("div", { className: "edge ring" })
										]
									}), /* @__PURE__ */ (0, V.jsx)("div", {
										className: "face rear",
										children: /* @__PURE__ */ (0, V.jsx)("div", { className: "lit" })
									})]
								}),
								/* @__PURE__ */ (0, V.jsxs)("div", {
									className: "slab leaf",
									children: [/* @__PURE__ */ (0, V.jsxs)("div", {
										className: "face front",
										children: [
											/* @__PURE__ */ (0, V.jsxs)("div", {
												className: "clip",
												children: [
													/* @__PURE__ */ (0, V.jsx)("img", {
														className: "ly old",
														alt: ""
													}),
													/* @__PURE__ */ (0, V.jsx)("div", { className: "veil" }),
													/* @__PURE__ */ (0, V.jsx)("img", {
														className: "ly neu",
														alt: ""
													}),
													/* @__PURE__ */ (0, V.jsx)("div", { className: "cam" })
												]
											}),
											/* @__PURE__ */ (0, V.jsx)("div", { className: "lit" }),
											/* @__PURE__ */ (0, V.jsx)("div", { className: "edge ring" })
										]
									}), /* @__PURE__ */ (0, V.jsxs)("div", {
										className: "face rear",
										children: [
											/* @__PURE__ */ (0, V.jsxs)("div", {
												className: "clip",
												children: [
													/* @__PURE__ */ (0, V.jsx)("img", {
														className: "ly old",
														alt: ""
													}),
													/* @__PURE__ */ (0, V.jsx)("div", { className: "veil" }),
													/* @__PURE__ */ (0, V.jsx)("img", {
														className: "ly neu",
														alt: ""
													}),
													/* @__PURE__ */ (0, V.jsx)("div", { className: "cam" })
												]
											}),
											/* @__PURE__ */ (0, V.jsx)("div", { className: "lit" }),
											/* @__PURE__ */ (0, V.jsx)("div", { className: "edge ring" })
										]
									})]
								}),
								/* @__PURE__ */ (0, V.jsx)("div", { className: "spine" }),
								/* @__PURE__ */ (0, V.jsx)("div", { className: "crease" }),
								/* @__PURE__ */ (0, V.jsx)("div", { className: "tick r-top" }),
								/* @__PURE__ */ (0, V.jsx)("div", { className: "tick r-bot" })
							]
						})
					})
				})
			]
		})
	});
}
var qo = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "workspace-loading",
	id: "workspaceLoading",
	role: "status",
	hidden: !0,
	ref: e,
	children: t
}), Jo = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "inset-overlay",
	id: "insetOverlay",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), Yo = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "inset-marks",
	id: "insetMarks",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), Xo = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "sys-ui",
	id: "sysUiCtl",
	role: "group",
	"data-t-aria-label": "systemUi.label",
	hidden: !0,
	ref: e,
	children: t
}), Zo = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "zoom at-fit",
	id: "zoomCtl",
	role: "group",
	"data-t-aria-label": "zoom.label",
	ref: e,
	children: t
});
function Qo({ loading: e = qo(), inset: t = Jo() }) {
	return /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "stage",
		id: "stage",
		children: [
			/* @__PURE__ */ (0, V.jsx)("img", {
				id: "shot",
				alt: "preview"
			}),
			e,
			t,
			/* @__PURE__ */ (0, V.jsx)("div", {
				className: "marks",
				id: "marks",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, V.jsx)("div", {
				className: "box",
				id: "box"
			}),
			/* @__PURE__ */ (0, V.jsx)("div", {
				className: "box pick",
				id: "pickBox",
				hidden: !0
			})
		]
	});
}
function $o({ loading: e, inset: t, marks: n }) {
	return /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "wrap",
		children: [/* @__PURE__ */ (0, V.jsx)(Ko, { marks: n }), /* @__PURE__ */ (0, V.jsx)(Qo, {
			loading: e,
			inset: t
		})]
	});
}
var es = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "pn-fold",
	id: "pnFold",
	ref: e,
	children: t
}), ts = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "dock-seg",
	id: "devCtl",
	role: "group",
	"data-t-aria-label": "posture.label",
	hidden: !0,
	ref: e,
	children: t
}), ns = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "pn-sl",
	id: "pnSl",
	role: "group",
	"data-t-aria-label": "size.custom.label",
	hidden: !0,
	ref: e,
	children: t
});
function rs({ menu: e = es(), posture: t = ts(), sliders: n = ns(), systemUi: r = Xo(), zoom: i = Zo() }) {
	return /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		e,
		t,
		n,
		r,
		i
	] });
}
// src/components/Dock.tsx
var $ = (e, t) => (0, B.useSyncExternalStore)(e.view.subscribe, () => e.view.get()[t]), is = (e) => /* @__PURE__ */ (0, V.jsx)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), as = is(/* @__PURE__ */ (0, V.jsxs)("g", {
	className: "turn",
	children: [/* @__PURE__ */ (0, V.jsx)("rect", {
		x: "6.5",
		y: "3",
		width: "7",
		height: "14",
		rx: "1.6"
	}), /* @__PURE__ */ (0, V.jsx)("circle", {
		cx: "10",
		cy: "5.8",
		r: ".6",
		fill: "currentColor"
	})]
})), os = is(/* @__PURE__ */ (0, V.jsxs)("g", {
	className: "fold-ic",
	children: [/* @__PURE__ */ (0, V.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, V.jsx)("path", { d: "M3 10h4.5M5.5 7.8 7.7 10l-2.2 2.2M17 10h-4.5M14.5 7.8 12.3 10l2.2 2.2" })]
})), ss = is(/* @__PURE__ */ (0, V.jsxs)("g", {
	className: "unfold-ic",
	children: [/* @__PURE__ */ (0, V.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, V.jsx)("path", { d: "M7.5 10H3M5.2 7.8 3 10l2.2 2.2M12.5 10H17M14.8 7.8 17 10l-2.2 2.2" })]
})), cs = is(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("rect", {
	x: "3.5",
	y: "4",
	width: "13",
	height: "12",
	rx: "1.5"
}), /* @__PURE__ */ (0, V.jsx)("path", {
	d: "M10 4v12",
	strokeDasharray: "1.6 1.6"
})] })), ls = /* @__PURE__ */ (0, V.jsx)("svg", {
	className: "tb-chev",
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "m4.5 6.5 3.5 3.5 3.5-3.5" })
}), us = ({ dev: e }) => /* @__PURE__ */ (0, V.jsx)("svg", {
	className: "pn-sil",
	viewBox: "0 0 20 20",
	"aria-hidden": "true",
	dangerouslySetInnerHTML: { __html: Te(De[e]) }
}), ds = [
	"portrait",
	"landscape-left",
	"landscape-right"
];
function fs(e, t, n) {
	return [
		"ArrowDown",
		"ArrowUp",
		"Home",
		"End"
	].includes(e.key) ? (e.preventDefault(), e.stopPropagation(), e.key === "Home" ? 0 : e.key === "End" ? t.length - 1 : (n + (e.key === "ArrowUp" ? -1 : 1) + t.length) % t.length) : -1;
}
function ps({ dock: e }) {
	let { phrase: t } = s(), n = $(e, "checked"), r = $(e, "rows"), i = $(e, "locked"), a = (0, B.useRef)(null), o = (t, n = !1) => {
		e.pick(t, n);
		let r = document.activeElement;
		r instanceof HTMLElement && r.matches("#pnSl [role=\"slider\"]") && r.blur();
	}, c = (a, s, c = !1) => {
		let l = De[a];
		return /* @__PURE__ */ (0, V.jsxs)("button", {
			className: c ? "pn-it mono" : "pn-it",
			type: "button",
			role: "radio",
			"data-sel": a,
			"aria-checked": a === n,
			title: l ? l.name : s && t(s),
			disabled: i,
			onClick: () => {
				o(a), e.setMenu(!1);
			},
			children: [
				l && /* @__PURE__ */ (0, V.jsx)(us, { dev: a }),
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "nm",
					children: we(a)
				}),
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "d",
					children: r[a] ?? ""
				})
			]
		}, a);
	};
	return /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "pn-pick",
		id: "pnPick",
		role: "radiogroup",
		"aria-label": t("panel.pick"),
		ref: a,
		onKeyDown: (e) => {
			let t = [...a.current.querySelectorAll("[data-sel]")], n = t.indexOf(e.target);
			if (n < 0) return;
			let r = fs(e, t, n);
			r < 0 || (t[r].focus(), o(t[r].dataset.sel, !0));
		},
		onPointerDown: e.cancelRuler,
		children: [/* @__PURE__ */ (0, V.jsxs)("section", {
			className: "pn-sec",
			children: [/* @__PURE__ */ (0, V.jsx)("h4", {
				className: "pn-h",
				children: t("panel.size")
			}), /* @__PURE__ */ (0, V.jsxs)("div", {
				className: "pn-list",
				children: [
					c("original", "size.original.tip", !0),
					c("narrow", "size.narrow.tip"),
					c("foldable", "size.foldable.tip"),
					c("custom", "size.custom.tip")
				]
			})]
		}), /* @__PURE__ */ (0, V.jsxs)("section", {
			className: "pn-sec",
			children: [/* @__PURE__ */ (0, V.jsx)("h4", {
				className: "pn-h",
				children: t("panel.device")
			}), /* @__PURE__ */ (0, V.jsx)("div", {
				className: "pn-list",
				children: Oe.map(({ group: e, ids: t }) => /* @__PURE__ */ (0, V.jsxs)(B.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("h5", {
					className: "pn-g",
					children: e
				}), t.map((e) => c(e))] }, e))
			})]
		})]
	});
}
function ms({ dock: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = $(e, "menu"), c = $(e, "locked"), l = $(e, "checked"), u = $(e, "sumTitle"), d = (0, B.useRef)(null), f = (0, B.useRef)(null);
	return (0, B.useLayoutEffect)(() => {
		r?.classList.toggle("open", a), !a && f.current?.contains(document.activeElement) && d.current?.focus({ preventScroll: !0 });
	}, [r, a]), i(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsxs)("button", {
		className: l === "original" ? "tb-btn pn-sum mono" : "tb-btn pn-sum",
		id: "pnSum",
		type: "button",
		"aria-haspopup": "true",
		"aria-expanded": a,
		"aria-controls": "pnBody",
		title: u || n("panel.pick"),
		disabled: c,
		ref: d,
		onClick: () => e.setMenu(!a),
		children: [
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "pn-sum-sil",
				children: De[l] && /* @__PURE__ */ (0, V.jsx)(us, { dev: l })
			}),
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "nm",
				children: l && we(l)
			}),
			ls
		]
	}), /* @__PURE__ */ (0, V.jsx)("div", {
		className: "pn-body",
		id: "pnBody",
		inert: !a,
		ref: f,
		children: /* @__PURE__ */ (0, V.jsx)(ps, { dock: e })
	})] }), es);
}
function hs({ dock: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = $(e, "posture"), c = $(e, "locked"), l = $(e, "orientMenu"), u = $(e, "foldable"), d = $(e, "folded"), f = $(e, "orientFixed"), p = $(e, "orientation"), m = $(e, "hinge"), h = (0, B.useRef)(null), g = (0, B.useRef)(null);
	(0, B.useLayoutEffect)(() => {
		r && (r.hidden = !a);
	}, [r, a]), (0, B.useLayoutEffect)(() => {
		let e = [...g.current?.querySelectorAll("[data-orientation]") ?? []];
		l ? (e.find((e) => e.getAttribute("aria-checked") === "true") ?? e[0])?.focus() : g.current?.contains(document.activeElement) && h.current?.focus({ preventScroll: !0 });
	}, [l]);
	let _ = (t) => {
		if (t.key === "Tab") {
			e.setOrientMenu(!1);
			return;
		}
		let n = [...g.current.querySelectorAll("[data-orientation]")], r = fs(t, n, n.indexOf(document.activeElement));
		r >= 0 && n[r].focus();
	}, v = n("posture.orientation.tip", { orientation: n(`posture.${p}`) }), y = n(d ? "posture.unfold" : "posture.fold");
	return i(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsxs)("div", {
			className: "orientation-pick",
			id: "dcOrientation",
			hidden: f,
			children: [/* @__PURE__ */ (0, V.jsxs)("button", {
				className: "tb-btn",
				id: "dcRot",
				type: "button",
				"data-orientation": p,
				"aria-haspopup": "menu",
				"aria-expanded": l,
				"aria-controls": "dcOrientMenu",
				title: v,
				"aria-label": v,
				disabled: c,
				ref: h,
				onClick: () => e.setOrientMenu(!l),
				onKeyDown: (t) => {
					(t.key === "ArrowDown" || t.key === "ArrowUp") && (t.preventDefault(), t.stopPropagation(), e.setOrientMenu(!0));
				},
				children: [as, ls]
			}), /* @__PURE__ */ (0, V.jsx)("div", {
				className: l ? "zoom-menu on" : "zoom-menu",
				id: "dcOrientMenu",
				role: "menu",
				"aria-label": n("posture.orientation"),
				inert: !l,
				ref: g,
				onKeyDown: _,
				children: ds.map((t) => /* @__PURE__ */ (0, V.jsx)("button", {
					type: "button",
					role: "menuitemradio",
					tabIndex: -1,
					"aria-checked": t === p,
					"data-orientation": t,
					disabled: c,
					onClick: () => e.orient(t),
					children: n(`posture.${t}`)
				}, t))
			})]
		}),
		/* @__PURE__ */ (0, V.jsxs)("button", {
			className: "tb-btn",
			id: "dcFold",
			type: "button",
			"data-folded": d,
			title: y,
			"aria-label": y,
			hidden: !u,
			disabled: c,
			onClick: e.fold,
			children: [os, ss]
		}),
		/* @__PURE__ */ (0, V.jsx)("button", {
			className: "tb-btn",
			id: "dcHinge",
			type: "button",
			"aria-pressed": m,
			title: n(m ? "posture.hinge.hide" : "posture.hinge.show"),
			"aria-label": n("posture.hinge"),
			hidden: !u,
			disabled: c,
			onClick: e.hinge,
			children: cs
		})
	] }), ts);
}
var gs = {
	ArrowRight: (e, t) => e + t,
	ArrowUp: (e, t) => e + t,
	ArrowLeft: (e, t) => e - t,
	ArrowDown: (e, t) => e - t,
	Home: () => R,
	End: () => Se
};
function _s({ dock: e, axis: t, label: n, ticks: r }) {
	let { phrase: i } = s(), a = $(e, t === "w" ? "slW" : "slH"), o = $(e, "locked"), c = (0, B.useRef)(null), l = t === "w" ? "slWLb" : "slHLb", u = z(a), d = (e, t) => {
		let n = e.getBoundingClientRect();
		return R + Math.min(1, Math.max(0, (t - n.left) / n.width)) * (Se - R);
	};
	return /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "sl",
		"data-axis": t,
		children: [/* @__PURE__ */ (0, V.jsxs)("div", {
			className: "sl-h",
			children: [/* @__PURE__ */ (0, V.jsx)("span", {
				id: l,
				children: i(n)
			}), /* @__PURE__ */ (0, V.jsxs)("span", {
				className: "v",
				children: [/* @__PURE__ */ (0, V.jsx)("b", { children: a }), /* @__PURE__ */ (0, V.jsx)("small", { children: "dp" })]
			})]
		}), /* @__PURE__ */ (0, V.jsxs)("div", {
			className: "sl-track",
			onPointerDown: (n) => {
				n.button !== 0 || o || (n.preventDefault(), c.current.focus({
					preventScroll: !0,
					focusVisible: !1
				}), n.currentTarget.setPointerCapture(n.pointerId), e.grab(t, d(n.currentTarget, n.clientX)));
			},
			onPointerMove: (n) => {
				n.currentTarget.hasPointerCapture(n.pointerId) && e.drag(t, d(n.currentTarget, n.clientX));
			},
			onPointerUp: () => e.release(t),
			onLostPointerCapture: () => e.release(t),
			children: [
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "fill",
					style: { width: u }
				}),
				r.map((e) => /* @__PURE__ */ (0, V.jsxs)("span", {
					className: "tick",
					"data-v": e,
					style: { left: z(e) },
					children: [/* @__PURE__ */ (0, V.jsx)("i", {}), /* @__PURE__ */ (0, V.jsx)("em", { children: e })]
				}, e)),
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "thumb",
					role: "slider",
					tabIndex: o ? -1 : 0,
					"aria-labelledby": l,
					"aria-valuemin": R,
					"aria-valuemax": Se,
					"aria-valuenow": a,
					"aria-valuetext": `${a}dp`,
					"aria-disabled": o,
					style: { left: u },
					ref: c,
					onKeyDown: (n) => {
						let r = gs[n.key]?.(a, Ee(n.nativeEvent));
						r === void 0 || o || (n.preventDefault(), n.stopPropagation(), e.step(t, r));
					},
					onFocus: () => e.sliderFocus(!0),
					onBlur: (t) => {
						t.relatedTarget instanceof Element && t.relatedTarget.matches("#pnSl [role=\"slider\"]") || e.sliderFocus(!1);
					}
				})
			]
		})]
	});
}
function vs({ dock: e, host: t }) {
	let { element: n, place: r } = o(t), i = $(e, "sliders"), a = $(e, "locked");
	return (0, B.useLayoutEffect)(() => {
		n && (n.hidden = !i, n.classList.toggle("off", a));
	}, [
		n,
		i,
		a
	]), r(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)(_s, {
		dock: e,
		axis: "w",
		label: "size.w",
		ticks: [600, 840]
	}), /* @__PURE__ */ (0, V.jsx)(_s, {
		dock: e,
		axis: "h",
		label: "size.h",
		ticks: [480, 900]
	})] }), ns);
}
// src/components/InsetOverlay.tsx
function ys(e, t, n) {
	if (!e || !t || n?.kind !== "device") return null;
	let r = n.widthDp, i = n.heightDp, a = Object.fromEntries(Gr.map((e) => [e, Math.max(0, ...Wr.map((n) => t.values[n][e]))]));
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
function bs(e, t) {
	let { on: n } = (0, B.useSyncExternalStore)(Zn.subscribe, Zn.get);
	return ys(n, e, t);
}
function xs(e, t, n, r) {
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
function Ss({ deviceInsets: e, size: t, host: n }) {
	let { element: r, place: i } = o(n), a = bs(e, t);
	if ((0, B.useLayoutEffect)(() => {
		r && (r.hidden = !a);
	}, [r, a]), !a) return i(null, Jo);
	let { w: s, h: c, safe: l } = a;
	return i(/* @__PURE__ */ (0, V.jsxs)("svg", {
		viewBox: `0 0 ${s} ${c}`,
		preserveAspectRatio: "none",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, V.jsx)("rect", {
			className: "io-safe",
			"data-kind": "safeDrawing",
			x: l.x,
			y: l.y,
			width: l.w,
			height: l.h
		}), Wr.map((e) => /* @__PURE__ */ (0, V.jsx)("g", {
			className: "io-band",
			"data-kind": e,
			children: Gr.filter((t) => a.insets.values[e][t] > 0).map((t) => {
				let { fill: n, line: r } = xs(t, a.insets.values[e][t], s, c);
				return /* @__PURE__ */ (0, V.jsxs)("g", {
					"data-edge": t,
					children: [/* @__PURE__ */ (0, V.jsx)("rect", {
						className: "io-fill",
						x: n.x,
						y: n.y,
						width: n.w,
						height: n.h
					}), /* @__PURE__ */ (0, V.jsx)("line", {
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
	}), Jo);
}
var Cs = (e) => String(Math.round(e * 100) / 100);
function ws({ w: e, h: t, insets: n, widest: r }) {
	return Gr.flatMap((i) => {
		let a = i === "top" || i === "bottom" ? t : e, o = Wr.filter((e) => e !== "displayCutout").reduce((e, t) => n.values[t][i] > n.values[e][i] ? t : e);
		return [[o, Kr(o, i)], ["displayCutout", Kr("displayCutout", i)]].flatMap(([e, t]) => {
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
var Ts = (e) => `${e * 100}%`;
function Es({ deviceInsets: e, size: t, host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = bs(e, t);
	if ((0, B.useLayoutEffect)(() => {
		i && (i.hidden = !c);
	}, [i, c]), !c) return a(null, Yo);
	let { w: l, h: u, safe: d } = c;
	return a(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [ws(c).map((e) => {
		let t = e.side === "right" || e.side === "left" ? {
			top: Ts(e.from),
			height: Ts(e.to - e.from)
		} : {
			left: Ts(e.from),
			width: Ts(e.to - e.from)
		};
		return /* @__PURE__ */ (0, V.jsxs)("div", {
			className: "im-dim",
			"data-kind": e.kind,
			"data-edge": e.edge,
			"data-side": e.side,
			"data-bold": e.bold,
			style: t,
			children: [
				/* @__PURE__ */ (0, V.jsx)("i", { className: "im-ext im-from" }),
				/* @__PURE__ */ (0, V.jsx)("i", { className: "im-ext im-to" }),
				/* @__PURE__ */ (0, V.jsxs)("span", {
					className: "im-badge",
					children: [/* @__PURE__ */ (0, V.jsx)("em", {
						className: "im-label",
						children: r(`insetOverlay.kind.${e.kind}`)
					}), /* @__PURE__ */ (0, V.jsx)("span", {
						className: "im-val",
						children: Cs(e.value)
					})]
				})
			]
		}, `${e.kind} ${e.edge}`);
	}), /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "im-safe",
		"data-kind": "safeDrawing",
		style: {
			left: Ts((d.x + d.w / 2) / l),
			top: Ts((d.y + d.h / 2) / u)
		},
		children: [/* @__PURE__ */ (0, V.jsx)("b", { children: r("insetOverlay.safeArea") }), /* @__PURE__ */ (0, V.jsxs)("span", { children: [
			Cs(d.w),
			" × ",
			Cs(d.h)
		] })]
	})] }), Yo);
}
var Ds = /* @__PURE__ */ (0, V.jsxs)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: [/* @__PURE__ */ (0, V.jsx)("rect", {
		x: "4.5",
		y: "2.5",
		width: "11",
		height: "15",
		rx: "1.8"
	}), /* @__PURE__ */ (0, V.jsx)("rect", {
		x: "7",
		y: "5.5",
		width: "6",
		height: "9",
		strokeDasharray: "1.6 1.6"
	})]
});
function Os() {
	let { phrase: e } = s(), { on: t } = (0, B.useSyncExternalStore)(Zn.subscribe, Zn.get), { on: n } = (0, B.useSyncExternalStore)(Yn.subscribe, Yn.get), r = e("insetOverlay.now", { value: e(t ? "systemUi.on" : "systemUi.off") });
	return /* @__PURE__ */ (0, V.jsx)("button", {
		type: "button",
		id: "insetBtn",
		className: "tb-btn",
		"aria-pressed": t,
		"aria-label": r,
		title: r,
		disabled: n,
		onClick: () => Zn.set({ on: !t }),
		children: Ds
	});
}
// src/components/Workspace.tsx
var ks = {
	exit() {},
	zoomIn() {},
	zoomOut() {},
	zoomFit() {},
	zoomMenuPick() {},
	toggleZoomMenu() {},
	pickSystemUi() {}
};
function As({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e), { on: i, failed: a } = (0, B.useSyncExternalStore)(Yn.subscribe, Yn.get);
	return (0, B.useLayoutEffect)(() => {
		n && (n.hidden = !i, n.classList.toggle("failed", a));
	}, [
		n,
		i,
		a
	]), r(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("span", {
		className: "workspace-spinner",
		"aria-hidden": "true"
	}), /* @__PURE__ */ (0, V.jsx)("span", {
		id: "workspaceLoadingText",
		children: t(a ? "workspace.loading.failed" : "workspace.loading")
	})] }), qo);
}
var js = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M4 8h8" })
}), Ms = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M4 8h8M8 4v8" })
}), Ns = (e) => (0, B.useSyncExternalStore)(Jn.subscribe, () => Jn.get()[e]);
function Ps({ real: e, menu: t, disabled: n, actions: r }) {
	let { phrase: i } = s(), a = Ns("pct");
	return /* @__PURE__ */ (0, V.jsxs)("button", {
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
var Fs = (0, B.memo)(function({ host: e, actions: t = ks }) {
	let { phrase: n } = s(), { element: r, place: i } = o(e), a = Ns("real"), c = Ns("atFit"), l = Ns("menu"), u = Ns("disabled");
	return (0, B.useLayoutEffect)(() => {
		r?.classList.toggle("at-fit", c);
	}, [r, c]), i(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsx)("button", {
			type: "button",
			id: "zoomOutBtn",
			"aria-label": n("zoom.out"),
			title: n("zoom.out.tip"),
			disabled: u,
			onClick: t.zoomOut,
			children: js
		}),
		/* @__PURE__ */ (0, V.jsx)(Ps, {
			real: a,
			menu: l,
			disabled: u,
			actions: t
		}),
		/* @__PURE__ */ (0, V.jsx)("button", {
			type: "button",
			id: "zoomInBtn",
			"aria-label": n("zoom.in"),
			title: n("zoom.in.tip"),
			disabled: u,
			onClick: t.zoomIn,
			children: Ms
		}),
		/* @__PURE__ */ (0, V.jsx)("button", {
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
		/* @__PURE__ */ (0, V.jsxs)("div", {
			className: l ? "zoom-menu on" : "zoom-menu",
			id: "zoomMenu",
			role: "menu",
			children: [
				/* @__PURE__ */ (0, V.jsxs)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "fit",
					disabled: u,
					onClick: () => t.zoomMenuPick("fit"),
					children: [/* @__PURE__ */ (0, V.jsx)("span", { children: n("zoom.fit") }), /* @__PURE__ */ (0, V.jsx)("kbd", { children: "0" })]
				}),
				/* @__PURE__ */ (0, V.jsx)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "1",
					hidden: !a,
					disabled: u,
					onClick: () => t.zoomMenuPick("1"),
					children: n("zoom.real")
				}),
				/* @__PURE__ */ (0, V.jsx)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "2",
					disabled: u,
					onClick: () => t.zoomMenuPick("2"),
					children: "200%"
				})
			]
		})
	] }), Zo);
}), Is = /* @__PURE__ */ (0, V.jsxs)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: [/* @__PURE__ */ (0, V.jsx)("rect", {
		x: "5.5",
		y: "2.5",
		width: "9",
		height: "15",
		rx: "1.8"
	}), /* @__PURE__ */ (0, V.jsx)("path", { d: "M5.5 5.5h9M8.5 15h3" })]
});
function Ls({ systemUi: e, deviceInsets: t = null, host: n, actions: r = ks }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), { on: l } = (0, B.useSyncExternalStore)(Yn.subscribe, Yn.get), u = !e && !t;
	(0, B.useLayoutEffect)(() => {
		a && (a.hidden = u);
	}, [a, u]);
	let d = !!e?.shown, f = i(t ? "insetOverlay.label" : "systemUi.label");
	if ((0, B.useLayoutEffect)(() => {
		a?.setAttribute("aria-label", f);
	}, [a, f]), t) return c(/* @__PURE__ */ (0, V.jsx)(Os, {}), Xo);
	let p = d ? e?.bars?.insets : null, m = [
		i("systemUi.now", { value: i(d ? "systemUi.on" : "systemUi.off") }),
		p && i("systemUi.tip.device", {
			status: p.statusDp,
			nav: p.navDp,
			source: `${p.source} (${p.kind})`
		}),
		i("systemUi.tip")
	].filter(Boolean).join("\n");
	return c(/* @__PURE__ */ (0, V.jsx)("button", {
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
		children: Is
	}), Xo);
}
var Rs = 12, zs = 48;
function Bs(e, t) {
	let n = e.querySelector("#backName"), r = t.querySelector("#wsName"), i = t.querySelector("#wsFn"), a = e.parentElement, o = document.getElementById("barR");
	if (!n || !r || !i || !a || !o || (n.style.maxWidth = "", n.style.display = "", t.hidden || !(t.offsetParent instanceof HTMLElement))) return;
	if (getComputedStyle(t).position !== "absolute") {
		t.style.removeProperty("--ws-left"), t.style.removeProperty("--ws-max");
		return;
	}
	let s = t.offsetParent.clientWidth, c = o.offsetLeft - Rs, l = Math.min(Math.max(r.scrollWidth, i.hidden ? 0 : i.scrollWidth) + 1, s * .34), u = Math.min(s / 2 - l / 2, c - l), d = () => {
		let e = 0;
		for (let t of a.children) t instanceof HTMLElement && t.offsetParent && (e = Math.max(e, a.offsetLeft + t.offsetLeft + t.offsetWidth));
		return e + Rs;
	}, f = d();
	if (f > u && !e.hidden) {
		let e = n.offsetWidth - (f - u);
		e < zs ? n.style.display = "none" : n.style.maxWidth = `${e}px`, f = d();
	}
	let p = Math.max(u, f), m = Math.max(0, Math.min(l, c - p));
	t.style.setProperty("--ws-left", `${p + m / 2}px`), t.style.setProperty("--ws-max", `${m}px`);
}
var Vs = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.8",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M10 3.5 5.5 8l4.5 4.5" })
});
function Hs({ state: e, hosts: t, actions: n = ks }) {
	let { phrase: r } = s(), i = o(t?.back), a = o(t?.title), c = e?.screen === "focus" ? e.focus : null, l = c ? (e.tabs || []).find((e) => e.active) : void 0, u = c ? Be(e?.board, e?.board?.focus) : null;
	(0, B.useLayoutEffect)(() => {
		document.body.classList.toggle("ws", !!c), i.element && (i.element.hidden = !c), a.element && (a.element.hidden = !c, a.element.title = c ? u ? u.title : l ? l.title : c.previewId : ""), i.element && a.element && Bs(i.element, a.element);
	}), (0, B.useLayoutEffect)(() => () => document.body.classList.remove("ws"), []), (0, B.useLayoutEffect)(() => {
		let e = i.element, t = a.element, n = e?.parentElement?.parentElement, r = document.getElementById("barR");
		if (!e || !t) return;
		let o = new ResizeObserver(() => Bs(e, t));
		for (let e of [n, r]) e && o.observe(e);
		return () => o.disconnect();
	}, [i.element, a.element]);
	let d = /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [Vs, /* @__PURE__ */ (0, V.jsx)("span", {
		id: "backName",
		children: l ? l.name : r("nav.board")
	})] }), f = /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("span", {
		className: "ws-name",
		id: "wsName",
		children: c ? c.name || c.fn || c.previewId : ""
	}), /* @__PURE__ */ (0, V.jsx)("span", {
		className: "ws-fn",
		id: "wsFn",
		hidden: !c?.name,
		children: c?.name ? c.fn : ""
	})] });
	return (0, B.useLayoutEffect)(() => {
		let e = i.element;
		if (!e) return;
		let t = () => n.exit();
		return e.addEventListener("click", t), () => e.removeEventListener("click", t);
	}, [i.element, n]), /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [i.place(d, (e, t) => /* @__PURE__ */ (0, V.jsx)("button", {
		className: "back",
		id: "back",
		type: "button",
		ref: e,
		children: t
	})), a.place(f, (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
		className: "ws-title",
		id: "wsTitle",
		ref: e,
		children: t
	}))] });
}
function Us({ screen: e, systemUi: t = null, deviceInsets: n = null, size: r = null, hosts: i, actions: a = ks, dock: o }) {
	let { phrase: c } = s(), [l, u] = (0, B.useState)(null), d = i?.view ?? l;
	return (0, B.useLayoutEffect)(() => {
		d && e !== null && (d.hidden = e !== "focus");
	}, [e, d]), i ? /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		o && /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
			/* @__PURE__ */ (0, V.jsx)(ms, {
				dock: o,
				host: i.menu
			}),
			/* @__PURE__ */ (0, V.jsx)(hs, {
				dock: o,
				host: i.posture
			}),
			/* @__PURE__ */ (0, V.jsx)(vs, {
				dock: o,
				host: i.sliders
			})
		] }),
		/* @__PURE__ */ (0, V.jsx)(As, { host: i.loading }),
		/* @__PURE__ */ (0, V.jsx)(Ss, {
			deviceInsets: n,
			size: r,
			host: i.inset
		}),
		/* @__PURE__ */ (0, V.jsx)(Es, {
			deviceInsets: n,
			size: r,
			host: i.insetMarks
		}),
		/* @__PURE__ */ (0, V.jsx)(Ls, {
			systemUi: t,
			deviceInsets: n,
			host: i.systemUi,
			actions: a
		}),
		/* @__PURE__ */ (0, V.jsx)(Fs, {
			host: i.zoom,
			actions: a
		})
	] }) : /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("section", {
		id: "focusView",
		ref: u,
		children: /* @__PURE__ */ (0, V.jsx)($o, {
			loading: /* @__PURE__ */ (0, V.jsx)(As, {}),
			inset: /* @__PURE__ */ (0, V.jsx)(Ss, {
				deviceInsets: n,
				size: r
			}),
			marks: /* @__PURE__ */ (0, V.jsx)(Es, {
				deviceInsets: n,
				size: r
			})
		})
	}), /* @__PURE__ */ (0, V.jsx)("div", {
		className: "panel",
		id: "panel",
		role: "toolbar",
		"aria-label": c("panel.label"),
		children: /* @__PURE__ */ (0, V.jsx)(rs, {
			...o && {
				menu: /* @__PURE__ */ (0, V.jsx)(ms, { dock: o }),
				posture: /* @__PURE__ */ (0, V.jsx)(hs, { dock: o }),
				sliders: /* @__PURE__ */ (0, V.jsx)(vs, { dock: o })
			},
			systemUi: /* @__PURE__ */ (0, V.jsx)(Ls, {
				systemUi: t,
				deviceInsets: n,
				actions: a
			}),
			zoom: /* @__PURE__ */ (0, V.jsx)(Fs, { actions: a })
		})
	})] });
}
// src/ViewerRoot.tsx
function Ws() {
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
			menu: e("pnFold"),
			posture: e("devCtl"),
			sliders: e("pnSl"),
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
function Gs({ state: e, draw: t = 0, statusState: n = e, connection: r = null, app: i = null, shortcuts: a = [], hosts: o, board: s, workspace: c, dock: l, point: u, renderLegacy: d }) {
	(0, B.useLayoutEffect)(() => {
		e && d(e);
	}, [t]);
	let f = it(e, r), p = Ge().files, m = f ? "gallery" : e?.screen ?? null;
	return o ? /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsx)(vn, {
			header: e?.header ?? null,
			tabs: e?.tabs ?? [],
			app: i,
			host: o.app,
			brand: o.brand
		}),
		/* @__PURE__ */ (0, V.jsx)(fo, {
			state: n,
			connection: r,
			host: o.status,
			bar: o.bar
		}),
		/* @__PURE__ */ (0, V.jsx)(Dn, { host: o.helpButton }),
		/* @__PURE__ */ (0, V.jsx)(pn, {
			tabs: e?.tabs ?? null,
			screen: e?.screen ?? null,
			gallery: f,
			hosts: o.rail
		}),
		/* @__PURE__ */ (0, V.jsx)(Va, {
			on: f,
			count: p?.length ?? null,
			host: o.railAll
		}),
		/* @__PURE__ */ (0, V.jsx)(uo, {
			rows: e?.stale ?? null,
			host: o.stale
		}),
		/* @__PURE__ */ (0, V.jsx)(Hi, {
			pending: !!e?.buildPending,
			host: o.buildNotice
		}),
		/* @__PURE__ */ (0, V.jsx)(za, {
			shown: f,
			state: e,
			draw: t,
			host: o.gallery
		}),
		/* @__PURE__ */ (0, V.jsx)(lo, {
			board: e?.board ?? null,
			screen: m,
			hosts: o.board,
			actions: s
		}),
		/* @__PURE__ */ (0, V.jsx)(Kt, {
			state: e,
			draw: t,
			connection: r,
			hosts: o.quickOpen
		}),
		/* @__PURE__ */ (0, V.jsx)(Ho, {
			screen: m,
			vacant: e?.vacant ?? null,
			host: o.vacant
		}),
		/* @__PURE__ */ (0, V.jsx)(Us, {
			screen: e?.screen ?? null,
			systemUi: e?.focus?.systemUi ?? null,
			deviceInsets: e?.focus?.deviceInsets ?? null,
			size: e?.focus?.size ?? null,
			hosts: o.workspace,
			actions: c,
			dock: l
		}),
		/* @__PURE__ */ (0, V.jsx)(Hs, {
			state: e,
			hosts: o.workspaceHeader,
			actions: c
		}),
		/* @__PURE__ */ (0, V.jsx)(Bo, { actions: u }),
		/* @__PURE__ */ (0, V.jsx)(Vo, {
			choice: e?.choice ?? null,
			repo: e?.header?.repo,
			host: o.chooser,
			actions: u
		}),
		/* @__PURE__ */ (0, V.jsx)(Ha, { host: o.capsule }),
		/* @__PURE__ */ (0, V.jsx)(En, {
			table: a,
			host: o.help
		})
	] }) : null;
}
function Ks({ renderLegacy: e, messages: t, hosts: n, shortcuts: r, board: i, workspace: a, dock: o, point: s }) {
	let c = document.createElement("div");
	c.hidden = !0, document.body.append(c);
	let l = (0, Vi.createRoot)(c), u = null, f = null, p = null, m = null, h = 0, g = () => l.render(/* @__PURE__ */ (0, V.jsx)(d.Provider, {
		value: t,
		children: /* @__PURE__ */ (0, V.jsx)(Gs, {
			state: u,
			draw: h,
			statusState: f,
			connection: p,
			app: m,
			shortcuts: r,
			hosts: n,
			board: i,
			workspace: a,
			dock: o,
			point: s,
			renderLegacy: e
		})
	}));
	return (0, Bi.flushSync)(g), te("/app.json").then((e) => e.json()).then((e) => {
		m = e, g();
	}).catch(() => {
		m = {}, g();
	}), {
		apply(e, t = !1) {
			u = e, t && f || (f = e), h++, (0, Bi.flushSync)(g);
		},
		connection(e) {
			p = e, (0, Bi.flushSync)(g);
		},
		dispose() {
			l.unmount(), c.remove();
		}
	};
}
// src/main.tsx
var qs = yn(), Js = Qr(Zr()), Ys = (e) => {
	mi(e), qs?.update(e);
}, Xs = () => {
	let { cursor: e } = p();
	e != null && ri(e);
}, Zs = {
	exit: ii,
	zoomIn: Js.zoomIn,
	zoomOut: Js.zoomOut,
	zoomFit: Js.zoomFit,
	zoomMenuPick: Js.zoomMenuPick,
	toggleZoomMenu: Js.toggleZoomMenu,
	pickSystemUi: ai
}, Qs = {
	choose: Ir,
	cancel: Lr,
	follow: Hr,
	pick: jr,
	peek: Mr,
	jump: Nr,
	close: X
};
Fr();
var $s = {
	screen: () => L.st ? Je() ? "gallery" : L.st.screen : "offline",
	tabCount: ln,
	moveCursor: v,
	openCursor: Xs,
	exitFocus: ii,
	openGallery: Xe,
	stepTab: sn,
	jumpTab: cn,
	openQuickOpen: Ft,
	helpOpen: wn,
	toggleHelp: Tn,
	zoomIn: Zs.zoomIn,
	zoomOut: Zs.zoomOut,
	zoomFit: Zs.zoomFit
}, ec = Ii(k, $s);
zi(ec, $s, {
	chooserOpen: () => !!document.getElementById("chooser")?.classList.contains("on"),
	cancelChoice: Lr,
	closeZoomMenu: Js.closeZoomMenu,
	closeDeviceMenu: Js.closeDeviceMenu,
	closeDirPop: _n,
	closeRailDrawer: an,
	closeCard: Pr,
	closeSheet: $e,
	sheetOpen: tt,
	openSheetFile: () => {
		G().sheet?.closing || document.querySelector("#galleryView .gsheet-go")?.click();
	}
});
var tc = Ks({
	renderLegacy: Ys,
	messages: {
		phrase: k,
		daemonText: O
	},
	hosts: Ws(),
	shortcuts: ec,
	board: {
		open: ri,
		point: Ur
	},
	workspace: Zs,
	dock: Js.dock,
	point: Qs
});
Fi({
	workspace: Js,
	render: tc.apply,
	onConnection: tc.connection,
	onPreviewFiles: () => {
		Lt(), rt(), wr();
	},
	onGalleryShots: rt,
	prepared: qs
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
