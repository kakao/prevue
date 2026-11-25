import { i as e, n as t, r as n, t as r } from "./react.js";
import { createScene as i, handoffMs as a, i as o, n as s, r as c, sceneEasing as l, sceneMs as u, t as d } from "./preparation-scene.js";
import { applyReveal as f, boardMarks as p, cancelReveal as m, cardAt as h, cardStage as g, clearTrees as _, moveCursor as v, onRelayout as y, returnCard as b, reveal as x, ringCard as S, setCursor as C, stuckHead as w, subscribeBoard as T, syncBoard as E, trees as D } from "./board.js";
import { daemonText as O, phrase as k } from "./strings.js";
import { connect as A, fetchGalleryCard as j, fetchPreviewFiles as M, fetchProjectFiles as N, get as ee, post as P, reportStreamWidth as te, viewerStream as ne } from "./api.js";
import { capsuleContent as F, dismissOnce as re, flash as I, hideOnce as ie, renderError as ae, setStatus as oe, setSummary as se, showOnce as ce, subscribeCapsule as le } from "./capsule.js";
import { MORPH_LEAD as ue, frameMorph as de, freeze as fe, hold as pe, motionMs as me, motionToken as he, radiiOf as ge, reduced as _e, swapImage as ve, transition as ye, transitioning as be } from "./motion.js";
import { store as L } from "./store.js";
import { createResizeScene as xe } from "./resize-scene.js";
import { DEVICE_MENU as Se } from "./devices.js";
// src/components/FileIcon.tsx
var R = e(), z = t(), Ce = (e) => e ? e.startsWith("android") ? "android" : "kmp" : "file", we = /* @__PURE__ */ (0, z.jsx)("path", { d: "M7 13H2.5V1.5h5L10 4V7" }), B = {
	file: /* @__PURE__ */ (0, z.jsx)("path", { d: "M4 2h5.5L12 4.5V14H4z" }),
	android: /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [we, /* @__PURE__ */ (0, z.jsxs)("g", {
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
	kmp: /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [we, /* @__PURE__ */ (0, z.jsx)("path", {
		className: "mk-kmp",
		fill: "currentColor",
		stroke: "none",
		transform: "translate(7.2 7.2) scale(.18333)",
		d: "M0 22.5629V0.0835311L22.4794 22.5629H0ZM0 25.4372V48H0.0572568L22.6201 25.4372H0ZM25.9906 22.0094L48 0H3.98128L25.9906 22.0094ZM26.0193 26.1028L4.1221 48H47.9164L26.0193 26.1028Z"
	})] })
};
function Te({ kind: e }) {
	return /* @__PURE__ */ (0, z.jsx)("svg", {
		className: "rt-ic",
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.4",
		strokeLinejoin: "round",
		strokeLinecap: "round",
		"aria-hidden": "true",
		children: B[e]
	});
}
// src/match.ts
var V = -1e9, Ee = /[/._\-\s]/, De = (e) => e !== e.toLowerCase();
function Oe(e, t) {
	if (t === 0) return !0;
	let n = e[t - 1], r = e[t];
	return Ee.test(n) || De(r) && !De(n) || /\d/.test(r) && !/\d/.test(n);
}
function ke(e, t) {
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
	for (let e = 0; e < r; e++) a[e] === i[0] && (o[0][e] = 1 + (Oe(t, e) ? 8 : 0) + (e === 0 ? 4 : 0) - e * .02);
	for (let e = 1; e < n; e++) {
		let n = V, c = -1;
		for (let l = e; l < r; l++) {
			if (l >= 2 && o[e - 1][l - 2] > n && (n = o[e - 1][l - 2], c = l - 2), a[l] !== i[e]) continue;
			let r = Oe(t, l) ? 8 : 0, u = o[e - 1][l - 1] > V ? o[e - 1][l - 1] + 1 + 5 + r : V, d = n > V ? n + 1 + r - 3 : V;
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
var Ae = (e) => e.dir ??= e.rel.slice(0, e.rel.length - e.name.length).toLowerCase(), je = {
	name: 30,
	fn: 15,
	path: 0
};
function Me(e, t) {
	let n = 0, r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of e) {
		let e = null, o = ke(a, t.name);
		o && (e = {
			s: o.score + je.name,
			kind: "name",
			idx: o.idx
		});
		for (let n of t.functions) {
			let t = ke(a, n);
			t && (!e || t.score + je.fn > e.s) && (e = {
				s: t.score + je.fn,
				kind: "fn",
				fn: n,
				idx: t.idx
			});
		}
		if (!e && Ae(t).includes(a.toLowerCase()) && (e = {
			s: 10 + je.path,
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
function Ne(e, t) {
	if (!e || t == null) return null;
	for (let n of e.groups) for (let e of n.cards) if (e.index === t) return e;
	return null;
}
// src/gallery/layer.ts
var U = {
	open: !1,
	openedOver: null,
	files: null,
	ready: !1
}, Pe = /* @__PURE__ */ new Set();
function Fe(e) {
	if (!Object.keys(e).every((t) => U[t] === e[t])) {
		U = {
			...U,
			...e
		};
		for (let e of Pe) e();
	}
}
var Ie = (e) => (Pe.add(e), () => {
	Pe.delete(e);
}), Le = () => U, Re = () => (0, R.useSyncExternalStore)(Ie, Le), ze = () => U, Be = !1, Ve = !0, He = 0, Ue = () => Be;
function We(e) {
	Be = e;
}
function Ge() {
	Fe({
		open: !0,
		openedOver: H(L.st)
	});
}
function Ke() {
	Fe({ open: !1 });
}
async function W() {
	let e = ++He;
	Ve = !1;
	let t = await M().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === He && Fe(t);
}
var qe = () => Ve || !U.files;
function Je() {
	Be ? W() : Ve = !0;
}
function Ye(e, t) {
	let n = Re();
	return t === "lost" || !e?.header.repo ? !1 : e.screen === "empty" || n.open && e.screen !== "focus" && H(e) === n.openedOver;
}
// src/components/QuickOpen.tsx
var Xe = 8, Ze = 5, Qe = [], $e = (e) => e.map((e) => ({
	...e,
	name: e.rel.split("/").pop()
}));
function et(e) {
	if (!e || !e.fns.size) return null;
	let t = null;
	for (let [n, r] of e.fns) (!t || r.size > t[1].size) && (t = [n, r]);
	return {
		fn: t[0],
		idx: t[1],
		more: e.fns.size - 1
	};
}
function tt(e, t, n) {
	let r = t.trim().split(/\s+/).filter(Boolean);
	if (!e) return {
		sections: [],
		more: 0,
		empty: !r.length,
		loading: !0
	};
	if (!r.length) {
		let t = new Map(e.map((e) => [e.path, e])), r = e.slice(0, Ze), i = new Set(r.map((e) => e.path)), a = n.map((e) => t.get(e)).filter((e) => !!e && !i.has(e.path)), o = Xe - r.length, s = a.length < o ? e.slice(Ze).filter((e) => !a.includes(e)).slice(0, o - a.length) : [], c = [{
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
		let e = Me(r, t);
		e && i.push({
			f: t,
			m: e
		});
	}
	i.sort((e, t) => t.m.score - e.m.score || t.f.mtime - e.f.mtime);
	let a = i.slice(0, Xe).map((e) => ({
		...e,
		fn: et(e.m)
	}));
	return {
		sections: a.length ? [{ rows: a }] : [],
		more: Math.max(0, i.length - Xe),
		empty: !1,
		loading: !1
	};
}
function nt({ text: e, idx: t }) {
	if (!t?.size) return e;
	let n = [];
	return [...e].forEach((e, r) => {
		let i = t.has(r), a = n[n.length - 1];
		a && a[1] === i ? a[0] += e : n.push([e, i]);
	}), n.map(([e, t], n) => t ? /* @__PURE__ */ (0, z.jsx)("b", { children: e }, n) : e);
}
var rt = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.4",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M3 8h10M9 4l4 4-4 4" })
}), it = (e) => (e || "").replace(/^:/, "").replace(/:/g, "/"), at = -1, ot = -1, st = !1;
addEventListener("mousemove", (e) => {
	st = e.screenX !== at || e.screenY !== ot, at = e.screenX, ot = e.screenY;
}, !0);
var ct = (0, R.memo)(function({ files: e, ready: t, query: n, sel: r, recent: i = Qe, fieldRef: a, onQuery: o, onSelect: l, onPick: u, onEscape: d, onLeave: f }) {
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
	}, []), b = (0, R.useMemo)(() => e && $e(e), [e]), { sections: x, more: S, empty: C, loading: w } = (0, R.useMemo)(() => tt(b, n, i), [
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
			st && E !== t && l(t);
		},
		onClick: () => u?.(e),
		children: [
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: "qo-arrow",
				children: rt
			}),
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: "qo-name",
				children: /* @__PURE__ */ (0, z.jsx)(nt, {
					text: e.f.name,
					idx: e.m?.name
				})
			}),
			e.fn && /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "qo-fn",
				children: [
					"› ",
					/* @__PURE__ */ (0, z.jsx)(nt, {
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
				children: it(e.f.module)
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
	let A = 0;
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
					}, `h${t}`) : null, ...e.rows.map((e) => O(e, A++))]),
					S ? /* @__PURE__ */ (0, z.jsx)("div", {
						className: "qo-foot",
						children: p("quickopen.more", { n: S })
					}) : null
				]
			}),
			/* @__PURE__ */ (0, z.jsxs)("div", {
				className: "qo-hint",
				children: [/* @__PURE__ */ (0, z.jsxs)("span", {
					className: "qo-keys",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, z.jsx)("span", { children: p("quickopen.keys.move") }),
						/* @__PURE__ */ (0, z.jsx)("span", { children: p("quickopen.keys.open") }),
						/* @__PURE__ */ (0, z.jsx)("span", { children: p("quickopen.keys.close") })
					]
				}), /* @__PURE__ */ (0, z.jsxs)("span", {
					className: "qo-term",
					children: [
						/* @__PURE__ */ (0, z.jsx)("span", { children: p("quickopen.term") }),
						" ",
						/* @__PURE__ */ (0, z.jsxs)("code", { children: [
							"prevue show <",
							/* @__PURE__ */ (0, z.jsx)("span", { children: p("quickopen.term.file") }),
							">"
						] })
					]
				})]
			})
		]
	});
});
function lt({ hosts: e, children: t }) {
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
var G = {
	open: !1,
	files: null,
	ready: !1,
	query: "",
	sel: -1,
	recent: []
}, ut = /* @__PURE__ */ new Set();
function dt(e, t = !1) {
	if (!Object.keys(e).every((t) => G[t] === e[t]) && (G = {
		...G,
		...e
	}, !t)) for (let e of ut) e();
}
var ft = (e) => (ut.add(e), () => {
	ut.delete(e);
}), pt = () => G, K = null, q = null, mt = null, ht = null, gt = 0, _t = !1, vt = !1, yt = null, bt = 0, xt = () => "prevue.recent:" + (L.st?.header.repo || "");
function St() {
	try {
		return JSON.parse(localStorage.getItem(xt()) || "[]");
	} catch {
		return [];
	}
}
function Ct(e, t = !1) {
	if (!e) return;
	let n = [e, ...St().filter((t) => t !== e)].slice(0, 20);
	try {
		localStorage.setItem(xt(), JSON.stringify(n));
	} catch {}
	dt({ recent: n }, t);
}
async function wt() {
	let e = ++bt, t = await M().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === bt && dt(t);
}
function Tt(e = null) {
	if (K) {
		if (!G.open) {
			let { sheet: t, curtain: n } = K;
			_t = !0, ht = e && e !== document.body ? e : null, mt?.setAttribute("aria-expanded", "true"), t.hidden = !1, n.hidden = !1, t.classList.remove("closing"), dt({
				open: !0,
				query: "",
				sel: -1,
				recent: St()
			}), requestAnimationFrame(() => {
				G.open && (n.classList.add("on"), t.classList.add("on"));
			}), wt();
		}
		q?.focus({ preventScroll: !0 }), q?.select();
	}
}
function J(e = !1, t = !1) {
	if (gt = 0, !G.open || !K) return;
	let { sheet: n, curtain: r } = K;
	q && (q.value = "", q.blur()), t && ht?.isConnected && ht.focus({ preventScroll: !0 }), ht = null, dt({ open: !1 }), mt?.setAttribute("aria-expanded", "false"), r.classList.remove("on"), n.classList.remove("on"), e ? (n.hidden = !0, r.hidden = !0) : (n.classList.add("closing"), setTimeout(() => {
		G.open || (n.hidden = !0, r.hidden = !0, n.classList.remove("closing"));
	}, 220));
}
function Et() {
	G.open && wt();
}
function Dt() {
	let e = gt = performance.now();
	setTimeout(() => {
		gt === e && J();
	}, 1500);
}
async function Ot(e, { phrase: t, daemonText: n }) {
	let r = e.f, i = L.st, a = e.fn ? e.fn.fn : null;
	if (Ct(r.path, !0), r.path === H(i)) {
		Ke(), x(r.path, a), i?.screen === "focus" && i.focus ? (Dt(), P("/viewer/exit")) : (J(), f());
		return;
	}
	x(r.path, a), Dt();
	let o = await P("/viewer/open", { file: r.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	o.ok || (gt = 0, m(), I(n(o.message) || t("open.cannot")));
}
var kt = (e) => {
	e ? q = e : q && !q.isConnected && (q = null);
}, At = (e, t) => dt({
	query: e,
	sel: t
}), jt = (e) => dt({ sel: e }), Mt = () => J(!1, !0), Nt = (e) => {
	G.open && K && e && !K.sheet.contains(e) && e !== mt && J();
}, Pt = (0, R.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, R.useLayoutEffect)(() => {
		if (!n) return;
		mt = n, n.title = t("rail.open.tip"), n.setAttribute("aria-label", t("rail.open.label"));
		let e = (e) => G.open ? J(!1, !0) : Tt(e.detail === 0 ? n : null);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), mt = null;
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
function Ft({ state: e, draw: t, connection: n, hosts: r }) {
	let i = s(), a = (0, R.useSyncExternalStore)(ft, pt);
	(0, R.useLayoutEffect)(() => {
		K = r;
		let e = (e) => {
			let t = e.target;
			G.open && !r.sheet.contains(t) && !r.curtain.contains(t) && !mt?.contains(t) && J();
		}, t = () => J(!1, !0);
		return document.addEventListener("pointerdown", e, !0), r.curtain.addEventListener("click", t), () => {
			document.removeEventListener("pointerdown", e, !0), r.curtain.removeEventListener("click", t), K = null;
		};
	}, [r]), (0, R.useLayoutEffect)(() => {
		if (!e) return;
		let t = H(e);
		t && t !== yt && (yt = t, Ct(t)), gt && e.screen !== "empty" && J(!0);
	}, [t]), (0, R.useLayoutEffect)(() => {
		n === "lost" && J(!0);
	}, [n]), (0, R.useLayoutEffect)(() => {
		_t ? (r.sheet.classList.add("enter"), _t = !1, vt = !0, requestAnimationFrame(() => {
			vt = !1;
		})) : vt || r.sheet.classList.remove("enter");
	});
	let o = (0, R.useCallback)((e) => Ot(e, i), [i]), c = /* @__PURE__ */ (0, z.jsx)(ct, {
		files: a.files,
		ready: a.ready,
		query: a.query,
		sel: a.sel,
		recent: a.recent,
		fieldRef: kt,
		onQuery: At,
		onSelect: jt,
		onPick: o,
		onEscape: Mt,
		onLeave: Nt
	});
	return /* @__PURE__ */ (0, z.jsx)(lt, {
		hosts: r,
		children: c
	});
}
// src/components/fit.ts
var It = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
function Lt(e) {
	let t = e.match(It) || [e], n = "";
	for (let e = t.length - 1; e > 0 && !(n && (t[e] + n).length > 12); e--) n = t[e] + n;
	return n.length >= e.length - 2 ? "" : n;
}
var Rt = null, zt = (e, t) => (Rt ??= document.createElement("canvas").getContext("2d"), Rt.font = t, Rt.measureText(e).width), Bt = (e) => {
	let t = getComputedStyle(e);
	return `${t.fontWeight} ${t.fontSize} ${t.fontFamily}`;
};
function Vt(e, t, n) {
	if (zt(e, n) <= t) return e;
	let r = Lt(e), i = r.match(It) || [], a = i.map((e, t) => i.slice(t).join(""));
	for (let [r, i] of [...a.map((e) => [e, 3]), [a[a.length - 1] || "", 1]]) for (let a = e.length - r.length - 1; a >= i; a--) {
		let i = e.slice(0, a) + "…" + r;
		if (zt(i, n) <= t) return i;
	}
	for (let i = 1; i < r.length; i++) {
		let a = e[0] + "…" + r.slice(i);
		if (zt(a, n) <= t) return a;
	}
	return e[0] + "…";
}
// src/components/FileRail.tsx
var Ht = "prevue.sharedOnce", Ut = [], Wt = matchMedia("(max-width: 640px)"), Gt = (e) => {}, Kt = () => document.body.classList.contains("rail-drawer"), qt = () => Kt() ? (Gt(!1), !0) : !1, Jt = [];
function Yt(e) {
	let t = Jt.findIndex((e) => e.active), n = Jt[Math.max(0, Math.min(Jt.length - 1, t + e))];
	n && !n.active && P("/viewer/tab", { key: n.key });
}
function Xt(e) {
	let t = Jt[e - 1];
	t && !t.active && P("/viewer/tab", { key: t.key });
}
var Zt = () => Jt.length, Qt = 56;
function $t(e, t, n = !1) {
	let r = [...t.querySelectorAll(".rt:not(.leaving)")];
	if (!r.length || e.hidden) return;
	let i = (e, t) => e.querySelector(t), a = Bt(i(r[0], ".rt-name")), o = Bt(i(r[0], ".rt-mod")), s = parseFloat(getComputedStyle(r[0]).columnGap) || 0, c = (t) => t.dataset.name + "|" + i(t, ".rt-mod").textContent + "|" + e.clientWidth, l = r.filter((e) => n || e.dataset.fitted !== c(e));
	if (!l.length) return;
	for (let e of l) i(e, ".rt-mod").style.maxWidth = "0px";
	let u = l.map((e) => i(e, ".rt-name").clientWidth + (i(e, ".rt-mod").textContent ? s : 0));
	l.forEach((e, t) => {
		let n = i(e, ".rt-name"), r = i(e, ".rt-mod"), l = u[t], d = l;
		if (r.textContent) {
			let t = Math.min(Math.ceil(zt(r.textContent, o)), Math.max(l - s - Math.ceil(zt(e.dataset.name, a)), Qt));
			r.style.maxWidth = t + "px", d = l - s - t;
		} else r.style.maxWidth = "";
		n.textContent = Vt(e.dataset.name, d, a), e.dataset.fitted = c(e);
	});
}
function en({ tab: e, leaving: t, enter: n, onGone: r, observe: i }) {
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
	let d = Ce(e.sourceSet), f = () => P("/viewer/close", { key: e.key });
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
			e.active ? (qt(), Ke()) : P("/viewer/tab", { key: e.key });
		},
		onAuxClick: (e) => {
			e.button === 1 && (e.preventDefault(), f());
		},
		children: [
			/* @__PURE__ */ (0, z.jsx)(Te, { kind: d }),
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
function tn({ tabs: e, screen: t, gallery: n = !1, hosts: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(r?.list), [l, u] = (0, R.useState)(null), [d, f] = (0, R.useState)(null), p = r?.rail ?? l, m = r?.empty ?? d, h = (0, R.useRef)(null), g = e ?? Ut, _ = t !== "focus", v = (0, R.useRef)(g), [y, b] = (0, R.useState)([]);
	if (v.current !== g) {
		let e = new Set(g.map((e) => e.key)), t = v.current.filter((t) => !e.has(t.key) && !y.some((e) => e.key === t.key));
		(t.length || y.some((t) => e.has(t.key))) && b([...y.filter((t) => !e.has(t.key)), ...t]), v.current = g;
	}
	let x = (e) => b((t) => t.filter((t) => t.key !== e)), S = (0, R.useRef)(!1), C = (0, R.useRef)(null), w = S.current && _ && !_e.matches && !document.hidden, T = (0, R.useRef)({
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
			duration: me("--duration-medium2"),
			easing: he("--easing-standard")
		})).finished.then(() => {
			n.stretch = null, n.sliding = !1;
		}, () => {})) : n.stretch && !e && (n.stretch.cancel(), n.stretch = null, n.sliding = !1), n.y = i, t.style.transform = `translateY(${i}px)`;
	}, D = (0, R.useRef)(n);
	D.current = n;
	let O = (0, R.useRef)(E);
	O.current = E;
	let [k] = (0, R.useState)(() => new ResizeObserver(() => O.current(T.current.sliding))), A = (e, t) => {
		e && (t ? k.observe(e) : k.unobserve(e));
	};
	(0, R.useEffect)(() => () => k.disconnect(), [k]), (0, R.useEffect)(() => {
		p && a && document.fonts?.ready.then(() => $t(p, a, !0));
	}, [p, a]), (0, R.useEffect)(() => {
		if (!r) return;
		let { toggle: e, scrim: t, open: n, all: i } = r;
		Gt = (t) => {
			document.body.classList.toggle("rail-drawer", t), e.setAttribute("aria-expanded", String(t));
		};
		let a = () => Gt(!Kt()), o = () => Gt(!1);
		return e.addEventListener("click", a), t.addEventListener("click", o), n.addEventListener("click", o), i.addEventListener("click", o), Wt.addEventListener("change", o), () => {
			e.removeEventListener("click", a), t.removeEventListener("click", o), n.removeEventListener("click", o), i.removeEventListener("click", o), Wt.removeEventListener("change", o);
		};
	}, [r]), (0, R.useLayoutEffect)(() => {
		if (!e || !p || !a) return;
		p.hidden = !_, _ || qt(), r && document.body.classList.toggle("rail-on", _), m && (m.hidden = e.length > 0), $t(p, a), Jt = e;
		let t = e.find((e) => e.active);
		t && Ce(t.sourceSet) === "kmp" ? ce(Ht, () => i("capsule.sharedOnce", { sourceSet: t.sourceSet })) : ie(Ht);
		let n = t?.key ?? null, o = S.current && _ && n !== C.current && C.current !== null;
		o && qt(), C.current = n, S.current = _, E(o);
	}, [
		e,
		t,
		n,
		p,
		a,
		m
	]);
	let j = [...g.map((e) => ({
		tab: e,
		leaving: !1
	})), ...y.map((e) => ({
		tab: e,
		leaving: !0
	}))], M = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("div", {
		className: "rail-glider instant",
		id: "railGlider",
		ref: h,
		hidden: !0
	}), j.map(({ tab: e, leaving: t }) => /* @__PURE__ */ (0, z.jsx)(en, {
		tab: e,
		leaving: t,
		enter: w,
		onGone: x,
		observe: A
	}, e.key))] });
	return r ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [c(M, () => null), /* @__PURE__ */ (0, z.jsx)(Pt, { host: r.open })] }) : /* @__PURE__ */ (0, z.jsxs)("nav", {
		className: "rail",
		id: "rail",
		ref: u,
		"aria-label": i("rail.title"),
		children: [
			/* @__PURE__ */ (0, z.jsx)("h4", {
				className: "rail-h",
				children: i("rail.title")
			}),
			c(M, (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
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
			/* @__PURE__ */ (0, z.jsx)(Pt, {})
		]
	});
}
// src/components/ProjectHeader.tsx
var nn = 8, rn = (e) => [...e].reduce((e, t) => e * 31 + t.codePointAt(0) >>> 0, 7) % nn + 1, an = () => !1, on = () => an();
function sn({ header: e, tabs: t, app: n, iconUrl: r = "/app-icon.png", host: i, brand: a }) {
	let { phrase: c } = s(), { element: l, place: u } = o(i), [d, f] = (0, R.useState)(!1), [p, m] = (0, R.useState)(null), h = (0, R.useRef)({
		open: !1,
		byKey: !1
	}), g = (0, R.useRef)(null), _ = (0, R.useRef)(null), v = (0, R.useRef)(null), y = e ? n?.name || e.repoLeaf : "";
	(0, R.useLayoutEffect)(() => {
		a && n?.prevue && (a.title = `Prevue ${n.prevue}`);
	}, [a, n]), (0, R.useLayoutEffect)(() => {
		v.current?.style.setProperty("background", e ? `var(--avatar-${rn(y)})` : "");
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
		an = () => {
			if (!h.current.open) return !1;
			h.current.open = !1;
			let e = document.activeElement;
			return e && _.current?.contains(e) && (h.current.byKey ? g.current?.focus({ preventScroll: !0 }) : e.blur()), m(null), !0;
		};
		let e = (e) => {
			!_.current?.contains(e.target) && e.target !== g.current && an();
		};
		return addEventListener("pointerdown", e), () => {
			removeEventListener("pointerdown", e), an = () => !1;
		};
	}, []);
	let b = (e, t) => {
		navigator.clipboard.writeText(e).then(() => I(c("header.copied", {
			what: t,
			text: e
		})), () => I(e));
	}, x = (e) => {
		an() || (h.current = {
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
						b(e?.repo || "", c("header.copy.path")), an();
					},
					children: c("header.dir.copy")
				}), /* @__PURE__ */ (0, z.jsx)("button", {
					type: "button",
					id: "dirReveal",
					hidden: n ? !n.reveal : !1,
					onClick: () => {
						P("/viewer/reveal"), an();
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
function cn() {
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
		o = !1, h++, v.abort(), m.forEach(clearTimeout), y.forEach((e) => e()), y.clear(), n.destroy(), C(!1), document.documentElement.classList.remove("preparation-cover"), document.removeEventListener("keydown", E, !0), document.removeEventListener("pointerdown", D, !0), document.removeEventListener("wheel", D, !0), removeEventListener("resize", A);
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
	function A() {
		f && !p && n.fit(f.card.widthDp || n.image.naturalWidth, f.card.heightDp || n.image.naturalHeight);
	}
	function j(e) {
		o && !s && (g = !0, _ = d?.board?.gen ?? 0, h++, c = null, n.fail(e));
	}
	async function M() {
		if (o && !s && /^http:\/\/127\.0\.0\.1:\d+\/preparation\/[a-f0-9]{32}$/.test(t.preparationStatus || "")) {
			try {
				let e = await (await fetch(t.preparationStatus, { signal: v.signal })).json();
				if (e.id !== t.id) return;
				if (e.phase === "failure") {
					j(e.errorKey ? k(e.errorKey) : e.error);
					return;
				}
				if (e.finished) return;
			} catch {
				if (!o || s) return;
			}
			S(M, 300);
		}
	}
	function N(e, t) {
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
	async function ee(e, r) {
		if (await b(), await b(), !o || r !== h) return;
		let i = N(e, !0);
		if (!i) {
			j(k("prep.image.missing"));
			return;
		}
		let c = new Image();
		c.src = i.card.imageUrl;
		try {
			await c.decode();
		} catch {
			o && r === h && j(k("prep.image.unreadable"));
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
	}), addEventListener("resize", A), M(), {
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
				j(O(e.error));
				return;
			}
			if (!t.file && e.header.repo && e.screen === "empty" || e.screen === "focus" && e.focus?.imageUrl && !e.busy) {
				w();
				return;
			}
			if (!e.board) return;
			n.setPhase("render");
			let i = N(e, !1);
			i?.card.widthDp && i.card.heightDp && !s && n.fit(i.card.widthDp, i.card.heightDp);
			let a = e.board.groups.flatMap((e) => e.cards);
			if (e.busy || !a.length || a.some((e) => !e.rendered || e.stale)) return;
			let l = a.find((e) => e.ok === !1);
			if (l) {
				j(O(l.failure) || k("prep.render.failed"));
				return;
			}
			if (r === c) return;
			c = r;
			let u = ++h;
			ee(e, u).catch((e) => {
				o && u === h && j(e.message);
			});
		},
		fail: j
	};
}
// src/components/ShortcutHelp.tsx
var ln = !1, un = null, dn = null, fn = null, pn = () => ln;
function mn(e = !ln, t = !1) {
	if (!dn) return;
	let { scrim: n, sheet: r } = dn;
	e && !ln && (un = t && document.activeElement !== document.body ? document.activeElement : null), ln = e, e ? (n.hidden = !1, requestAnimationFrame(() => {
		ln && (n.classList.add("on"), r.focus({ preventScroll: !0 }));
	})) : (n.classList.remove("on"), setTimeout(() => {
		ln || (n.hidden = !0);
	}, 220), n.contains(document.activeElement) && document.activeElement.blur(), un && un.isConnected && un.focus({ preventScroll: !0 }), un = null), fn?.setAttribute("aria-expanded", String(e));
}
var hn = (0, R.memo)(function({ table: e, logo: t = "prevue.svg", host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = (0, R.useRef)(null);
	return (0, R.useLayoutEffect)(() => {
		if (!i || !c.current) return;
		dn = {
			scrim: i,
			sheet: c.current
		};
		let e = (e) => {
			e.target === i && mn(!1);
		};
		return i.addEventListener("click", e), () => {
			i.removeEventListener("click", e), dn = null;
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
}), gn = (0, R.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, R.useLayoutEffect)(() => {
		if (!n) return;
		fn = n, n.title = t("header.help.tip"), n.setAttribute("aria-label", t("header.help"));
		let e = (e) => mn(!ln, e.detail === 0);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), fn = null;
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
}), _n = Promise.resolve();
async function vn(e, t, n) {
	let r = await P("/viewer/touch", {
		x: t,
		y: n,
		type: e
	});
	r.ok || I(k("input.touch.failed", { status: r.status }));
}
function yn(e, t, n) {
	_n = _n.then(() => vn(e, t, n)).catch(() => {});
}
var Y = null, bn = () => !!Y;
function xn(e, t) {
	wn(), Y = [e, t], yn("press", e, t);
}
function Sn(e, t) {
	Y && Math.abs(e - Y[0]) + Math.abs(t - Y[1]) > 6 && (Y = [e, t], On(e, t));
}
function Cn(e, t) {
	Y && (Y = null, yn("release", e, t));
}
function wn() {
	Y && Cn(...Y);
}
function Tn() {
	Y = null, En = null;
}
var En = null, Dn = !1;
function On(e, t) {
	En = [e, t], Dn || (Dn = !0, _n = _n.then(() => {
		Dn = !1;
		let e = En;
		return En = null, e ? vn("drag", e[0], e[1]) : null;
	}).catch(() => {}));
}
var kn = null;
function An(e, t, n, r) {
	kn ? (kn.dx += n, kn.dy += r, kn.x = e, kn.y = t) : (kn = {
		x: e,
		y: t,
		dx: n,
		dy: r
	}, _n = _n.then(() => {
		let e = kn;
		return kn = null, P("/viewer/wheel", {
			x: Math.round(e.x),
			y: Math.round(e.y),
			dx: e.dx,
			dy: e.dy
		});
	}).catch(() => {}));
}
// src/workspace/card.ts
var jn = (e) => ({
	id: String(e.id),
	name: e.name || `${e.fileName}:${e.lineNumber}`
});
function Mn(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = (e) => {
		for (let t = e.ups.length - 1; t >= 0; t--) if (n.has(e.ups[t])) return e.ups[t];
		return null;
	}, i = r(t), a = e.filter((e) => r(e) === i).sort((e, t) => e.id - t.id);
	return {
		ups: t.ups.filter((e) => n.has(e)).map((e) => jn(n.get(e))),
		here: jn(t),
		before: a.filter((e) => e.id < t.id).map(jn),
		after: a.filter((e) => e.id > t.id).map(jn),
		downs: e.filter((e) => r(e) === t.id).sort((e, t) => e.id - t.id).map(jn)
	};
}
function Nn(e, t) {
	let [n, r, i, a] = e.bounds, o = t ?? 1;
	return {
		width: (i - n) * o,
		height: (a - r) * o,
		unit: t ? "dp" : "px",
		padded: !!e.mods?.some((e) => e.name === "padding")
	};
}
function Pn(e) {
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
function Fn(e, t) {
	if (e.origin === "compose" || e.origin === "library") return e.origin;
	if (e.origin !== "project" || !t || !e.name) return null;
	let n = t.modules.get(e.name);
	return n ? { module: n } : null;
}
function In(e, t, n) {
	return !t || !e ? [] : (t.callers.get(e) || []).filter((e) => e.file !== n.file || e.fn !== n.fn);
}
// src/workspace/view.ts
function Ln(e) {
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
var Rn = Ln({
	pct: 100,
	real: !1,
	atFit: !0,
	menu: !1,
	disabled: !1
}), zn = Ln({
	on: !1,
	failed: !1
}), Bn = Ln({
	host: null,
	shot: null,
	card: null
}), X = Ln({ on: !1 }), Vn = (e, t) => e.every((e, n) => e === t[n]);
function Hn(e) {
	if (e.modifiers) return e.modifiers;
	for (let t of e.children || []) if (Vn(t.bounds, e.bounds)) {
		let e = Hn(t);
		if (e) return e;
	}
	return null;
}
function Un(e) {
	let t = L.projectFiles.size ? (e) => L.projectFiles.has(e.fileName) : () => !0, n = [], r = (e, i, a, o) => {
		for (let s of e) {
			let { children: e, modifiers: c, ...l } = s, [u, d, f, p] = s.bounds, m = i.concat(s.name ? [s.name] : []), h = s.name && t(s) ? a.concat([s.name]) : a, g = o;
			if (f > u && p > d && s.lineNumber > 0) {
				let e = n.length;
				n.push({
					...l,
					id: e,
					ups: o,
					mods: Hn(s),
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
var Wn = (e, t) => e.area - t.area || t.chain.length - e.chain.length;
function Gn(e) {
	return L.projectFiles.size ? e.filter((e) => L.projectFiles.has(e.fileName)) : e;
}
function Kn(e, t, n) {
	return e.find((e) => {
		let [r, i, a, o] = e.bounds;
		return t >= r && t < a && n >= i && n < o;
	});
}
var qn = (e) => +(e.dataset.fullW ?? 0) || e.naturalWidth, Jn = (e) => +(e.dataset.fullH ?? 0) || e.naturalHeight;
function Yn(e, t, n) {
	let r = qn(n), i = Jn(n);
	return !r || !i ? 0 : Math.min(e / r, t / i);
}
function Xn(e) {
	let t = e.getBoundingClientRect();
	return Yn(t.width, t.height, e) || 1;
}
function Zn(e, t) {
	let n = t.getBoundingClientRect(), r = Xn(t) || 1;
	return [Math.round((e.clientX - n.left) / r), Math.round((e.clientY - n.top) / r)];
}
function Qn(e, t, n) {
	let [r, i, a, o] = t.bounds;
	e.style.left = r * n + "px", e.style.top = i * n + "px", e.style.width = (a - r) * n + "px", e.style.height = (o - i) * n + "px";
}
function $n(e, t, n) {
	e.hidden = !1, Qn(e, t, n);
}
function er(e, t, n) {
	t ? (Qn(e, t, n), e.classList.add("on")) : e.classList.remove("on");
}
function tr(e, t) {
	t.classList.remove("over"), t.classList.contains("peek") || er(e, null, 1);
}
var nr = /* @__PURE__ */ new WeakMap();
function rr(e, t, n) {
	let r = nr.get(e);
	r && r.list === t && r.s === n || (nr.set(e, {
		list: t,
		s: n
	}), L.projectFiles.size ? e.replaceChildren(...t.map((e) => {
		let t = document.createElement("div");
		return t.className = "ol", Qn(t, e, n), t;
	})) : e.replaceChildren());
}
async function ir(e, t, n) {
	let r = ++ar;
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
		if (r !== ar) return;
		i.ref ? sr(i.ref, n, i.file) : i.needChoice || n(O(i.message ?? null) || `${e.fileName}:${e.lineNumber}`);
	} catch (e) {
		if (r === ar) {
			let t = e.message;
			n(k("point.failed", { why: t })), I(k("point.failed", { why: t }));
		}
	}
}
var ar = 0, or = (e) => navigator.clipboard ? navigator.clipboard.writeText(e) : Promise.reject(Error(k("point.noClipboard")));
function sr(e, t, n) {
	let r = ++ar, i = () => {
		r === ar && t(k("point.copied", { ref: e }), e, !0, n);
	}, a = () => {
		or(e).then(i, () => {
			r === ar && t(k("point.copyBlocked", { ref: e }), e, !1, n);
		});
	};
	or(e).then(i, () => {
		r === ar && t(k("point.copyRetry", { ref: e }), e, !1, n, a);
	});
}
var cr = (e) => {
	e && I(e);
}, lr = cr, ur = null, dr = null, fr = 0;
function pr() {
	ur = null, dr = null, fr++;
}
function mr() {
	if (ur) return Promise.resolve(ur);
	let e = fr;
	return dr ??= M().then((t) => e === fr ? (dr = null, t.ready ? ur = Pn(t) : null) : null, () => (e === fr && (dr = null), null));
}
var Z = null, hr = /* @__PURE__ */ new WeakMap();
function gr(e) {
	let t = hr.get(e);
	return t || hr.set(e, t = () => e.isConnected ? e.getBoundingClientRect() : null), t;
}
var _r = () => Z?.img ?? null;
function vr(e, t) {
	for (let t of document.querySelectorAll(".box.pick")) t !== e.pick && (t.hidden = !0);
	Z && Z.hover !== e.hover && er(Z.hover, null, 1), $n(e.pick, t, e.scale()), e.pick.style.animation = "none", e.pick.offsetWidth, e.pick.style.animation = "", Z = {
		...e,
		hit: t,
		shot: gr(e.img)
	};
	let n = yr(t);
	lr = n, ir(t, e.previewId, n);
}
function yr(e) {
	let t = Z, n = L.projectFiles.size ? Mn(t.list, e) : null, r = {
		msg: null,
		ref: `${e.fileName}:${e.lineNumber}`
	}, i = () => ({
		node: e,
		say: r,
		box: Nn(e, t.dpPerPx),
		tree: n,
		modifiers: e.mods,
		previews: In(e.name, ur, t.seen),
		origin: Fn(e, ur)
	}), a = () => {
		Z?.hit === e && Bn.set({
			host: t.host,
			shot: t.shot,
			card: i()
		});
	};
	return a(), ur || mr().then((e) => {
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
function br(e) {
	let t = Z?.list.find((t) => String(t.id) === e.id);
	Z && t && vr(Z, t);
}
function xr(e) {
	if (!Z) return;
	let t = e ? Z.list.find((t) => String(t.id) === e.id) ?? null : null;
	er(Z.hover, t, Z.scale()), t && rr(Z.marks, Z.list, Z.scale()), Z.marks.classList.toggle("peek", !!t);
}
async function Sr(e) {
	Q();
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
	n.ok || (m(), I(O(n.message ?? null) || k("open.cannot")));
}
function Q() {
	for (let e of document.querySelectorAll(".box.pick")) e.hidden = !0;
	Z && (er(Z.hover, null, 1), Z.marks.classList.remove("peek")), Z = null, Bn.set({
		host: null,
		shot: null,
		card: null
	}), lr = cr, ar++;
}
function Cr() {
	return Z ? (Q(), !0) : !1;
}
function wr() {
	addEventListener("pointerdown", (e) => {
		if (!Z || e.button !== 0) return;
		let t = e.target;
		t?.closest && t.closest("main") && !t.closest(".point-card, .cstage, #stage") && Q();
	}, !0);
}
async function Tr(e) {
	let t = await P("/viewer/choose", { path: e }).then((e) => e.json()).catch(() => ({}));
	t.ref && sr(t.ref, lr, t.file);
}
function Er() {
	P("/viewer/cancel");
}
var Dr = 8, Or = 16;
function kr(e) {
	let t = document.documentElement, n = t.clientWidth, r = t.clientHeight, i = e.offsetWidth, a = e.offsetHeight, o = document.querySelector(".pc-float:not([data-leaving]) .pc-head"), s = o && o.getClientRects().length && getComputedStyle(o).visibility !== "hidden" ? o.getBoundingClientRect() : null, c, l, u = !1;
	s ? (c = s.left, l = s.bottom + Dr, l + a > r - Or && s.top - Dr - a >= Or && (l = s.top - Dr - a, u = !0)) : (c = (n - i) / 2, l = document.getElementById("bar").getBoundingClientRect().bottom + Or), c = Math.max(Or, Math.min(c, n - i - Or)), l = Math.max(Or, Math.min(l, r - a - Or));
	let d = Math.round(c) + "px", f = Math.round(l) + "px";
	e.style.left !== d && (e.style.left = d), e.style.top !== f && (e.style.top = f), e.classList.toggle("up", u);
}
var Ar = !1;
function jr(e) {
	if (kr(e), Ar) return;
	Ar = !0;
	let t = () => {
		e.classList.contains("on") ? (kr(e), requestAnimationFrame(t)) : Ar = !1;
	};
	requestAnimationFrame(t);
}
function Mr(e, { stage: t, img: n, box: r, pick: i, marks: a }, o) {
	let s = null, c = !1, l = async () => {
		let t = Ne(L.st?.board, e);
		if (!t || !t.ok || !t.treeUrl) return null;
		let n = D.get(t.treeUrl);
		if (n) return s = n, s;
		try {
			s = Gn(Un((await ee(t.treeUrl).then((e) => e.json())).composeViewInfo || []).sort(Wn)), D.set(t.treeUrl, s);
		} catch {
			s = null;
		}
		return s;
	};
	t.addEventListener("mouseenter", () => {
		s = null, c = !0, a.classList.add("over"), l().then((e) => {
			e && c && rr(a, e, Xn(n));
		});
	}, { signal: o }), t.addEventListener("mouseleave", () => {
		c = !1, tr(r, a);
	}, { signal: o }), n.addEventListener("mousemove", (e) => {
		s && er(r, Kn(s, ...Zn(e, n)) ?? null, Xn(n));
	}, { signal: o }), n.addEventListener("load", () => {
		s = null, Z?.img === n && Q();
	}, { signal: o }), o.addEventListener("abort", () => {
		Z?.img === n && Q();
	}), n.addEventListener("click", async (o) => {
		C(e);
		let c = s || await l();
		if (!c) return;
		let u = Kn(c, ...Zn(o, n));
		if (!u) {
			Z?.img === n && Q();
			return;
		}
		let d = Ne(L.st?.board, e), f = qn(n);
		vr({
			list: c,
			img: n,
			hover: r,
			pick: i,
			marks: a,
			host: document.getElementById("boardView"),
			scale: () => Xn(n),
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
var Nr = [
	"statusBars",
	"navigationBars",
	"captionBar",
	"displayCutout",
	"systemOverlays"
], Pr = [
	"top",
	"right",
	"bottom",
	"left"
];
function Fr(e, t) {
	let n = t === "top" || t === "bottom";
	return e === "displayCutout" ? n ? "left" : "top" : n ? "right" : "bottom";
}
var Ir = (e) => !!e && Nr.some((t) => Pr.some((n) => Fr(t, n) === "bottom" && e.values[t][n] > 0)), Lr = (e) => e ? e.kind === "device" ? `${e.device}:${e.folded ? "cover" : "open"}${e.landscape ? ":rot" : ""}${e.orientation === "landscape-right" ? ":right" : ""}` : e.preset || `custom:${e.widthDp}x${e.heightDp}` : "original";
function Rr(e, t, n) {
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
function zr({ root: e, geometry: t, shot: n, stage: r, wrap: i, layout: a, dimensions: o, originalSize: s, zoomState: c, preparation: l, firstFrame: u }) {
	let d = null, f = !1, p = null, m = null, h = null, g = null, _ = null, v = 0, y = null, b = !1, x = !1, S = !1, C = null, w = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), E = !1, D = null, O = (e) => new Promise((t) => {
		E ? (D?.settle(!0), D = {
			body: e,
			settle: t
		}) : A(e, t);
	});
	function A(e, t) {
		E = !0, P("/viewer/resize", e).then((e) => {
			if (!e.ok) throw Error(`HTTP ${e.status}`);
			return !0;
		}).catch((e) => (I(k("resize.failed", { why: e.message })), !1)).then((e) => {
			t(e);
			let n = D;
			D = null, E = !1, n && A(n.body, n.settle);
		});
	}
	let j = (e) => (T.has(e.src) || T.set(e.src, Rr(e, e.naturalWidth, e.naturalHeight)), T.get(e.src)), M = xe(e, {
		request: (e) => {
			if (S) return Promise.resolve(!1);
			let [t, n, ...r] = e.split(":"), i = M.devices.has(t) ? {
				device: t,
				folded: n === "cover",
				orientation: r.includes("right") ? "landscape-right" : M.sizeOf(e).w > M.sizeOf(e).h ? "landscape-left" : "portrait"
			} : { size: e.startsWith("custom:") ? e.slice(7) : e };
			return O(i);
		},
		insetOn: () => X.get().on,
		insetBelow: () => Ir(m?.deviceInsets),
		layout: (t, n) => {
			if (!f) return;
			let i = c();
			d && i.z !== 1 && (i.x += (1 - i.z) * (d.cx - d.w / 2 - (t.cx - t.w / 2)), i.y += (1 - i.z) * (d.y - t.y)), d = t, a(t), se(), r.classList.toggle("resize-hidden", n || !b && !S), e.classList.toggle("await-live", !b);
		}
	});
	X.subscribe(() => {
		f && M.relayout(!0);
	});
	function N(t, r = !1) {
		S = t, e.classList.toggle("preparing", t), n.setAttribute("aria-busy", String(t && !r)), zn.set({
			on: t,
			failed: r
		});
		for (let n of e.querySelectorAll("input")) n.disabled = t;
		for (let e of document.querySelectorAll("#pnSum, #pnPick button, #devCtl button")) e.disabled = t;
		M.sliderOff(t), l(t, r);
	}
	function ee(e, t) {
		let n = m?.pxPerDp || 2.625;
		return {
			url: e.src,
			dpW: t?.widthDp || e.naturalWidth / n,
			dpH: t?.heightDp || e.naturalHeight / n,
			edge: j(e)
		};
	}
	function te() {
		if (n.naturalWidth && m && b) try {
			let e = document.createElement("canvas");
			e.width = n.naturalWidth, e.height = n.naturalHeight, e.getContext("2d").drawImage(n, 0, 0);
			let t = o(), r = m.pxPerDp || 2.625;
			M.image(h, {
				url: e.toDataURL("image/jpeg", .92),
				dpW: m.size?.widthDp || t.w / r,
				dpH: m.size?.heightDp || t.h / r,
				edge: Rr(e, e.width, e.height)
			});
		} catch {}
	}
	function F(e) {
		if (!w.has(e)) {
			let t = new Image();
			t.src = e, w.set(e, t.decode().then(() => t).catch((t) => {
				throw w.delete(e), t;
			}));
		}
		return w.get(e);
	}
	function re(e) {
		let t = /* @__PURE__ */ new Set([e.imageUrl, ...(e.postures || []).map((e) => e.imageUrl)]);
		for (let e of w.keys()) t.has(e) || w.delete(e);
		let n = new Set([...t].map((e) => new URL(e, location.href).href));
		for (let e of T.keys()) n.has(e) || T.delete(e);
	}
	function ie(e) {
		let t = e.size;
		return {
			sel: Lr(t),
			w: t?.widthDp || y?.w || 411,
			h: t?.heightDp || y?.h || 891
		};
	}
	function ae(a, c) {
		if (!a?.interactive) return oe(), !1;
		let l = p !== a.previewId;
		if (l && oe(), f = !0, r.parentElement !== t && t.append(r), document.body.classList.add("resizing-ui"), i.classList.add("resize-wrap"), l || !p) {
			p = a.previewId, N(!0), n.removeAttribute("src"), n.dataset.url = "";
			let t = s(), r = o(), i = a.pxPerDp || 2.625, c = !!(t?.w && t?.h || r.w && r.h);
			y = {
				w: t?.w || r.w / i || 411,
				h: t?.h || r.h / i || 891,
				img: null
			}, e.classList.toggle("measuring", !a.size && !c), M.setOriginal(y.w, y.h, null), M.enable(!0);
		}
		let d = Lr(a.size), w = !!m && d !== h;
		w && (te(), x = !0, b = !1, r.classList.add("resize-hidden"));
		let T = m;
		m = a, h = d;
		let E = !w && !!T && Ir(T.deviceInsets) !== Ir(a.deviceInsets);
		T && !w && a.imageUrl !== T.imageUrl && M.clearImages();
		for (let e of a.postures || []) {
			let t = v;
			F(e.imageUrl).then((n) => {
				f && t === v && m?.postures?.some((t) => t.imageUrl === e.imageUrl) && M.image(Lr(e.size), ee(n, e.size));
			}).catch(() => {});
		}
		if (y && M.update(ie(a), !T), E && X.get().on && M.relayout(!0), c) return b = !1, _ = g = null, n.onload = null, n.removeAttribute("src"), N(!0, !0), r.classList.remove("resize-hidden"), !0;
		if (S && N(!0, !!c), !c && !document.hidden && a.streamUrl && (!x || a.streamUrl !== g || a.imageUrl !== T?.imageUrl) && (a.streamUrl !== g || !b || w)) {
			let t = `${v}:${d}:${a.streamUrl}:${a.imageUrl}`;
			if (_ !== t) {
				_ = t;
				let i = v;
				F(a.imageUrl).then((s) => {
					if (!f || document.hidden || i !== v || _ !== t || h !== d) return;
					let c = a.size;
					if (!c) {
						let e = a.pxPerDp || 2.625, t = {
							w: s.naturalWidth / e,
							h: s.naturalHeight / e,
							img: ee(s, c)
						}, n = y?.w !== t.w || y.h !== t.h;
						y = t, M.setOriginal(y.w, y.h, y.img), (S || n) && M.update(ie(a), S);
					}
					M.image(d, ee(s, c)), g = a.streamUrl, x = !1, o(s.naturalWidth, s.naturalHeight), n.onload = () => {
						if (n.onload = null, !f || document.hidden || i !== v || h !== d || g !== a.streamUrl) return;
						b = !0;
						let t = S;
						N(!1), e.classList.remove("await-live", "measuring"), r.classList.toggle("resize-hidden", M.moving()), n.dataset.still = a.imageUrl, n.src = n.dataset.url = ne(a.streamUrl), t && !u() && !_e.matches && (C = n.animate([{ opacity: 0 }, { opacity: 1 }], {
							duration: me("--duration-short3"),
							easing: he("--easing-decelerate")
						}));
					}, n.src = a.imageUrl, n.dataset.url = a.imageUrl;
				}).catch((e) => {
					i === v && (_ = null, S && N(!0, !0), I(k("resize.image.failed", { why: e.message })));
				});
			}
		}
		return re(a), !0;
	}
	function oe() {
		if (f || p) {
			v++, f = !1, p = h = g = _ = null, m = null, y = null, b = x = !1, C?.cancel(), C = null, N(!1), i.append(r), M.enable(!1), w.clear(), T.clear(), e.classList.remove("measuring"), t.style.transform = "", document.body.classList.remove("resizing-ui"), i.classList.remove("resize-wrap"), r.classList.remove("resize-hidden"), n.onload = null;
			for (let e of [
				"left",
				"top",
				"width",
				"height",
				"border-radius"
			]) r.style.removeProperty(e);
		}
	}
	function se() {
		if (!d) return;
		let e = c(), n = d.cx - d.w / 2, r = d.y;
		t.style.transform = `translate(${e.x + (1 - e.z) * n}px, ${e.y + (1 - e.z) * r}px) scale(${e.z})`;
	}
	return {
		update: ae,
		disable: oe,
		preparing: () => S,
		suspend() {
			v++, g = _ = null, n.onload = null;
		},
		zoom(e) {
			return f ? (t.classList.toggle("zoom-anim", !!e), se(), !0) : !1;
		},
		relayout: () => {
			f && M.relayout();
		},
		closeMenu: () => M.closeMenu(),
		pxPerDp: () => f && d ? d.s : null,
		moving: () => f && (!b || M.moving())
	};
}
// src/workspace/focus.ts
function Br() {
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
function Vr({ focusView: e, wrap: t, stage: n, shot: r, box: i, pickBox: a, marks: o, scene: s, insetMarks: c, geometry: l, panel: u, header: d }) {
	let f = [], p = [], m = !1;
	function h() {
		m && (p = Gn(f));
	}
	function g() {
		if (e.hidden) return;
		let n = getComputedStyle(document.documentElement), r = parseInt(n.getPropertyValue("--cap-room")) || 76, i = document.body.classList.contains("resizing-ui"), a = window.innerHeight - t.getBoundingClientRect().top - (i ? 0 : r + 16), o = parseInt(n.getPropertyValue("--stage-min-h")) || 260, s = Math.max(o, Math.round(a));
		document.documentElement.style.setProperty("--view-h", s + "px");
		let c = getComputedStyle(t), l = s - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
		document.documentElement.style.setProperty("--stage-max-h", l + "px"), W.relayout(), t.classList.contains("resize-wrap") || x(l - 2), U(), T();
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
			if (W.moving()) {
				T();
				return;
			}
			let e = Math.round(r.offsetWidth * devicePixelRatio * B.z);
			e && e !== S && (S = e, te(e).catch(() => {}));
		}, 120));
	}
	let E = null, D = Promise.resolve();
	function O(e) {
		return e === E ? D : (E = e, D = A(e));
	}
	async function A(e) {
		try {
			let t = await ee(e).then((e) => {
				if (!e.ok) throw Error(k("focus.tree.http", { status: e.status }));
				return e.json();
			});
			if (e !== E) return;
			if (t.failure) {
				m = !1;
				return;
			}
			f = Un(t.composeViewInfo || []).sort(Wn), p = Gn(f), se(L.projectFiles.size ? "" : k("focus.noIndex", { n: f.length })), m = !0, er(i, null, 1), a.hidden = !0, _r() === r && Q();
		} catch (e) {
			oe(k("focus.tree.failed", { why: e.message }), "error");
		}
	}
	function j(e) {
		let t = !!(e && e.interactive);
		if (t || Tn(), u.hidden = !e, e || Ve(), n.classList.toggle("live", t), De = e && e.pxPerDp || null, e && e.previewId === Te || (W.disable(), Te = e ? e.previewId : null, _ = v = 0, delete r.dataset.fullW, delete r.dataset.fullH, r.style.width = "", H(1, 0, 0, !1)), !e) {
			M?.entering && re(), W.disable(), r.hasAttribute("src") && (r.removeAttribute("src"), r.dataset.url = "");
			for (let e of n.querySelectorAll("img.ghost")) e.remove();
			return;
		}
		let i = L.st;
		if (n.style.cursor = t ? "pointer" : "crosshair", e.treeUrl !== E && O(e.treeUrl), W.update(e, i.error)) return;
		H(B.z, B.x, B.y, !1);
		let a = t ? e.streamUrl ? ne(e.streamUrl) : Ne(i.board, i.board?.focus)?.imageUrl || "" : e.imageUrl;
		r.dataset.url !== a && (a.startsWith("/stream") && (S = 0), ve(r, a));
	}
	let M = null, N = (e, t) => e > 0 && t > 0 && Math.abs(e / t - 1) < .01, F = (e, t) => {
		for (let n of [
			s,
			u,
			...d
		]) n.style.setProperty("--deco-dur", t + "ms"), n.classList.toggle("deco-off", !e);
	};
	function re() {
		if (!M) return;
		let t = M;
		M = null, clearTimeout(t.lead), clearTimeout(t.giveUp), t.m.cancel();
		for (let e of t.hidden) e.classList.remove("morph-target");
		e.classList.remove("morph-hold"), F(!0, 0);
	}
	function ie(t) {
		M === t && (M = null, clearTimeout(t.lead), clearTimeout(t.giveUp), e.classList.remove("morph-hold"), F(!0, me("--duration-short4")), t.m.finish(t.same ? 150 : 0));
	}
	function ae(r) {
		if (re(), !r || _e.matches || document.hidden || e.hidden || !t.classList.contains("resize-wrap")) return;
		let i = n.getBoundingClientRect();
		if (!i.width || !i.height) return;
		let a = N(r.ratio, i.width / i.height), o = getComputedStyle(n);
		e.classList.add("morph-hold"), F(!1, 0);
		let s = de({
			from: r.rect,
			to: () => n.getBoundingClientRect(),
			radius: [r.radius, ge(o)],
			shadow: [r.shadow, o.boxShadow],
			a: r.url,
			b: a ? null : "",
			swapAt: 0,
			swapMs: 250
		}), c = M = {
			m: s,
			same: a,
			hidden: [],
			entering: !0,
			ready: !W.preparing(),
			landed: !1
		};
		c.lead = window.setTimeout(() => {
			M === c && F(!0, me("--duration-short4"));
		}, ue), s.landed.then(() => requestAnimationFrame(() => {
			M === c && (c.landed = !0, !c.same || c.ready ? ie(c) : c.giveUp = window.setTimeout(() => ie(c), 5e3));
		}));
	}
	function ce() {
		M?.entering && ie(M);
	}
	function le() {
		let e = M;
		return !e || !e.entering || !e.same ? !1 : (e.ready = !0, e.landed && ie(e), !0);
	}
	function he(t, i, a, o = () => {}, s = () => !0) {
		re();
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
		let l = pe();
		W.suspend(), F(!1, me("--duration-short2"));
		let u = y() && r.naturalWidth ? fe(r) : null;
		Promise.all([u, new Promise((e) => setTimeout(e, me("--duration-short2")))]).then(() => {
			n.style.setProperty("--z", "1");
			let e = Gr(n);
			n.style.removeProperty("--z"), l(), s() ? ye(() => {
				t(), F(!0, 0);
				let n = a(), r = n && Gr(n);
				if (!n || !r || !r.rect.width || !e.url) {
					o();
					return;
				}
				let i = N(e.ratio, r.ratio);
				n.classList.add("morph-target");
				let s = r.rect, c = de({
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
				}), l = M = {
					m: c,
					same: i,
					hidden: [n]
				};
				c.landed.then(() => requestAnimationFrame(() => {
					if (M === l) {
						M = null;
						for (let e of l.hidden) e.classList.remove("morph-target");
						c.finish(0);
					}
				}));
			}, i, { workspace: !0 }) : (F(!0, 0), t(), i());
		});
	}
	let be = !1, xe = () => !!(history.state && history.state.prevueWs);
	function Se(e) {
		let t = !!(e && e.screen === "focus" && e.focus);
		t && !xe() ? (history.scrollRestoration = "manual", history.pushState({ prevueWs: !0 }, "")) : !t && xe() && !be && (be = !0, history.back());
	}
	addEventListener("popstate", () => {
		be ? be = !1 : L.st && L.st.screen === "focus" && L.st.focus && P("/viewer/exit");
	});
	let R = (e) => Zn(e, r), z = () => !!(L.st && L.st.focus && L.st.focus.interactive), Ce = () => {
		_r() === r && Q();
	}, we = (e) => !z() || e.altKey;
	n.addEventListener("mousemove", (e) => {
		let t = m && we(e);
		o.classList.toggle("over", t), t && rr(o, p, Oe()), er(i, t ? Kn(p, ...R(e)) ?? null : null, Oe());
	}), n.addEventListener("mouseleave", () => tr(i, o)), n.addEventListener("mousedown", (e) => {
		e.button !== 0 || W.moving() || (V || !z() && B.z > 1 && !e.altKey ? Ge(e) : z() && !e.altKey && (e.preventDefault(), Ce(), xn(...R(e))));
	}), window.addEventListener("mousemove", (e) => {
		bn() && Sn(...R(e));
	}), window.addEventListener("mouseup", (e) => {
		bn() && Cn(...R(e));
	}), n.addEventListener("click", async (t) => {
		if (W.moving()) return;
		if (Ee) {
			Ee = !1;
			return;
		}
		if (z() && !t.altKey || !m || !L.st || !L.st.focus) return;
		if (z()) try {
			await O((await P("/viewer/catchup").then((e) => e.json())).treeUrl || E);
		} catch (e) {
			I(k("point.sync.failed", { why: e.message }));
			return;
		}
		await D;
		let n = Kn(p, ...R(t));
		if (!n) {
			_r() === r && Q();
			return;
		}
		let s = L.st, c = s.focus, l = s.board;
		vr({
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
	}, Te = null, V = !1, Ee = !1, De = null;
	function Oe() {
		return Yn(r.offsetWidth, r.offsetHeight, r) || 1;
	}
	function ke() {
		let e = W.pxPerDp();
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
	function H(e, r, i, a) {
		W.preparing() || ([B.z, B.x, B.y] = Me(Math.min(je(), Math.max(Ae(), e)), r, i), n.classList.toggle("zoom-anim", !!a), n.style.transform = W.zoom(a) || B.z === 1 ? "" : `translate(${B.x}px, ${B.y}px) scale(${B.z})`, t.style.setProperty("--z", String(B.z)), n.classList.toggle("zoomed", B.z > 1), U(), T());
	}
	function U() {
		let e = ke();
		Rn.set({
			pct: Math.round((e ? B.z / e : B.z) * 100),
			real: !!e,
			atFit: B.z === 1
		});
	}
	function Pe(e, t, r, i) {
		let a = n.getBoundingClientRect(), o = a.left - B.x, s = a.top - B.y, c = (t - a.left) / B.z, l = (r - a.top) / B.z, u = Math.min(je(), Math.max(Ae(), e));
		H(u, t - o - c * u, r - s - l * u, i);
	}
	function Fe(e) {
		let n = t.getBoundingClientRect();
		Pe(e, n.left + n.width / 2, n.top + n.height / 2, !0);
	}
	let Ie = (e) => Fe(B.z * e), Le = () => Ie(1.25), Re = () => Ie(1 / 1.25), ze = () => H(1, 0, 0, !0), Be = !1;
	function Ve() {
		if (!Rn.get().menu) return !1;
		Rn.set({ menu: !1 });
		let e = document.getElementById("zoomMenu"), t = document.activeElement;
		return e && t && e.contains(t) && (Be ? document.getElementById("zoomPct")?.focus({ preventScroll: !0 }) : t.blur()), !0;
	}
	function He(e) {
		let t = !Rn.get().menu;
		t && (Be = e), Rn.set({ menu: t });
	}
	function Ue(e) {
		Ve(), e === "fit" ? ze() : Fe((ke() || 1) * Number(e));
	}
	addEventListener("pointerdown", (e) => {
		let t = document.getElementById("zoomCtl");
		t && t.contains(e.target) || Ve();
	}), addEventListener("resize", () => {
		g(), H(B.z, B.x, B.y, !1);
	}), r.addEventListener("load", () => {
		b(), g();
	}), t.addEventListener("wheel", (t) => {
		e.hidden || (t.ctrlKey || t.metaKey ? (t.preventDefault(), Pe(B.z * Math.exp(-t.deltaY * .01), t.clientX, t.clientY, !1)) : z() ? (t.preventDefault(), W.moving() || (Ce(), We(t))) : B.z > 1 && (t.preventDefault(), H(B.z, B.x - t.deltaX, B.y - t.deltaY, !1)));
	}, { passive: !1 });
	function We(e) {
		let n = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? t.clientHeight : 1, i = Oe() * B.z || 1, [a, o] = R(e);
		An(Math.max(0, Math.min(_ || r.naturalWidth, a)), Math.max(0, Math.min(v || r.naturalHeight, o)), e.deltaX * n / i, e.deltaY * n / i);
	}
	function Ge(e) {
		e.preventDefault();
		let t = e.clientX, r = e.clientY, i = B.x, a = B.y;
		n.classList.add("panning");
		let o = (e) => {
			Math.abs(e.clientX - t) + Math.abs(e.clientY - r) > 3 && (Ee = !0), H(B.z, i + e.clientX - t, a + e.clientY - r, !1);
		}, s = () => {
			n.classList.remove("panning"), removeEventListener("mousemove", o), removeEventListener("mouseup", s);
		};
		addEventListener("mousemove", o), addEventListener("mouseup", s);
	}
	let Ke = (e) => !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
	addEventListener("keydown", (t) => {
		let r = t.target;
		t.code !== "Space" || e.hidden || Ke(r) || r?.closest && r.closest("button, [role=button]") || (t.preventDefault(), V || (V = !0, n.classList.add("grab")));
	}), addEventListener("keyup", (e) => {
		e.code === "Space" && (V = !1, n.classList.remove("grab"));
	}), addEventListener("blur", () => {
		V = !1, n.classList.remove("grab"), wn();
	});
	let W = zr({
		root: s,
		geometry: l,
		shot: r,
		stage: n,
		wrap: t,
		zoomState: () => B,
		preparation(e, t) {
			t && ce(), Rn.set({ disabled: e }), e && Ve();
		},
		firstFrame: le,
		originalSize() {
			let e = Ne(L.st?.board, L.st?.board?.focus);
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
			}), c.style.setProperty("--im-bezel", e.bezel + "px"), U(), T();
		}
	});
	return document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			if (clearTimeout(C), W.suspend(), !y()) return;
			let e = r.getAttribute("src");
			fe(r), r.getAttribute("src") === e && r.removeAttribute("src"), r.dataset.url = "";
		} else L.st?.screen === "focus" && j(L.st.focus);
	}), {
		render: j,
		fitStage: g,
		renarrow: h,
		syncHistory: Se,
		morphIn: ae,
		morphOut: he,
		image: () => r,
		zoomIn: Le,
		zoomOut: Re,
		zoomFit: ze,
		zoomMenuPick: Ue,
		toggleZoomMenu: He,
		closeZoomMenu: Ve,
		closeDeviceMenu: () => W.closeMenu()
	};
}
var Hr = (e) => e && e.naturalWidth ? e.naturalWidth / e.naturalHeight : 0, Ur = /* @__PURE__ */ new Map();
function Wr(e) {
	let t = e?.dataset.still;
	if (!t) return null;
	if (!Ur.has(t)) {
		let e = new Image();
		e.src = t, Ur.set(t, e), Ur.size > 8 && Ur.delete(Ur.keys().next().value);
	}
	return Ur.get(t);
}
function Gr(e) {
	if (!e) return null;
	let t = e.querySelector("img"), n = getComputedStyle(e), r = t && t.getAttribute("src") || "";
	return {
		el: e,
		rect: e.getBoundingClientRect(),
		radius: ge(n),
		shadow: n.boxShadow,
		url: t ? r.startsWith("/stream") ? t.dataset.still || "" : t.currentSrc || r : "",
		ratio: Hr(t) || Hr(Wr(t))
	};
}
function Kr(e) {
	P("/viewer/focus", { index: e }).catch((e) => oe(k("focus.enter.failed", { why: e.message }), "error"));
}
function qr() {
	L.st && L.st.focus && P("/viewer/exit");
}
function Jr(e) {
	P("/viewer/systemUi", { systemUi: e }).catch((e) => I(k("request.failed", { why: e.message })));
}
// src/session.ts
var Yr = () => document.getElementById("boardView"), Xr, Zr = null;
function Qr(e) {
	return Zr && !e.error && e.screen === "focus" && e.focus?.previewId === Zr.id && (e.busy || !e.focus.streamUrl || e.focus.streamUrl === Zr.stream && e.focus.imageUrl === Zr.image) ? !0 : (Zr = null, !1);
}
var $r = /* @__PURE__ */ new Map(), ei = null, ti = {
	wasBoard: !1,
	arrive: !1,
	file: null
};
function ni(e) {
	let t = !Yr().hidden, n = e.board ? e.board.file : null;
	t && ei && (e.screen !== "board" || n !== ei) && $r.set(ei, scrollY), ti = {
		wasBoard: t,
		arrive: e.screen === "board" && (!t || n !== ei),
		file: n
	}, ei = n;
}
function ri(e) {
	let { wasBoard: t, arrive: n, file: r } = ti;
	Xr.render(e.screen === "focus" ? e.focus : null), Xr.syncHistory(e), ae(O(e.error)), Xr.fitStage(), n ? scrollTo(0, $r.get(r) || 0) : t && e.screen !== "board" && scrollTo(0, 0), f();
}
var ii = (e) => {}, ai = (e) => {
	let t = (e.tabs || []).find((e) => e.active);
	return t ? t.key : null;
};
function oi(e, t, n) {
	let r = (t) => {
		let n = e.tabs.findIndex((e) => e.key === t);
		return n < 0 ? e.tabs.length : n;
	};
	return Math.sign(r(n) - r(t));
}
var si = (e) => e?.screen === "focus" && e.focus?.interactive ? `${ai(e)} ${e.board?.focus ?? ""} ${e.focus.previewId}` : null, ci = !1;
function li(e) {
	if (L.st && e.version <= L.st.version) return;
	let t = L.st;
	if (t?.focus?.interactive && e.focus?.interactive && t.focus.previewId === e.focus.previewId && JSON.stringify(t.focus.size) !== JSON.stringify(e.focus.size) && (Zr = {
		id: e.focus.previewId,
		stream: t.focus.streamUrl,
		image: t.focus.imageUrl
	}), L.st = e, si(t) !== si(e) && X.set({ on: !1 }), be()) {
		ci = !0;
		return;
	}
	let n = t && t.screen, r = e.screen, i = t && ai(t) && ai(e) && ai(t) !== ai(e);
	t && (i || n !== r || t.board && e.board && t.board.focus !== e.board.focus && r === "focus") && Q();
	let a = () => {
		ci && (ci = !1, ii(L.st));
	}, o = () => L.st;
	if (i) {
		let n = document.documentElement;
		n.style.setProperty("--tab-dir", String(oi(t, ai(t), ai(e)))), n.classList.add("vt-tab"), ye(() => ii(o()), a), setTimeout(() => n.classList.remove("vt-tab"), 500);
	} else if (n === "board" && r === "focus") {
		let t = e.board ? Gr(g(h(e.board.focus))) : null;
		ye(() => {
			ii(o()), Xr.morphIn(t);
		}, a, { workspace: !0 });
	} else if (n === "focus" && r === "board") {
		let e = null;
		Xr.morphOut(() => ii(o()), a, () => g(e = o().screen === "board" ? b(o().board.focus) : null), () => S(e), () => o().screen === "board");
	} else n === "focus" && r === "focus" && t.board && e.board && t.board.focus !== e.board.focus ? ye(() => ii(o()), a, { workspace: !0 }) : ii(e);
}
var ui = 0, di = () => {
	let e = ++ui;
	N().then((t) => {
		e === ui && (L.projectFiles = new Map(Object.entries(t.files || {})), _(), Xr.renarrow());
	}).catch(() => {});
}, fi = !1, pi = () => {}, mi = null, hi = () => {
	mi?.fail(k("prep.lost")), oe(k("status.lost"), "error"), pi("lost"), L.st = null;
}, gi = 6e4, _i = !1, vi = 0, yi = 0, bi = null, xi = (e) => !e.busy && !(e.board?.groups || []).some((e) => e.cards.some((e) => !e.rendered));
function Si() {
	_i = !0, pi("restarting"), clearTimeout(vi), vi = window.setTimeout(hi, gi);
}
function Ci(e) {
	if (_i) {
		if (e.boot === bi) return;
		yi ||= (clearTimeout(vi), window.setTimeout(() => location.reload(), gi)), xi(e) && location.reload();
	} else bi && e.boot !== bi ? location.reload() : (bi = e.boot, li(e));
}
function wi({ workspace: e, render: t, onConnection: n, onPreviewFiles: r, prepared: i = null }) {
	Xr = e, ii = (e) => {
		ni(e), t(e, Qr(e));
	}, pi = n, mi = i, A({
		open: () => {
			fi && !_i ? location.reload() : fi || di();
		},
		state: Ci,
		ui: (e) => {
			e.kind === "flash" ? I(O(e.text ?? null)) : e.kind === "previewFiles" ? r() : e.kind === "projectFiles" ? di() : e.kind === "restart" && !mi && Si();
		},
		error: () => {
			fi = !0, _i || hi();
		}
	});
}
// src/shortcuts.ts
function Ti(e, t) {
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
					run: (e) => (Di(e) === "+" ? t.zoomIn : t.zoomOut)()
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
					run: (e) => t.jumpTab(Number(Di(e)))
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
function Ei(e) {
	return e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
}
function Di(e) {
	return e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") ? "⇧" + e.key : /^Digit[1-9]$/.test(e.code) && !e.shiftKey ? e.code.slice(5) : e.code === "KeyI" ? "i" : e.code === "Slash" && e.shiftKey ? "?" : e.code === "Equal" ? "+" : e.code === "Minus" ? "-" : e.code === "Digit0" ? "0" : e.key;
}
function Oi(e, t, n) {
	let r = (r) => {
		if ((r.metaKey || r.ctrlKey) && !r.altKey && !r.shiftKey && r.code === "KeyK" && t.screen() !== "offline") {
			r.preventDefault(), t.openQuickOpen(document.activeElement);
			return;
		}
		if (r.metaKey || r.ctrlKey || r.altKey || Ei(r.target)) return;
		let i = Di(r), a = i === "Enter" && r.target instanceof Element && r.target.closest("button, [role=button]");
		if (!(a && a.matches(":focus-visible"))) {
			if (i === "Escape" && t.helpOpen()) r.preventDefault(), t.toggleHelp(!1);
			else if (i === "Escape" && n.chooserOpen()) r.preventDefault(), n.cancelChoice();
			else if (i === "Escape" && n.closeZoomMenu()) r.preventDefault();
			else if (i === "Escape" && n.closeDeviceMenu()) r.preventDefault();
			else if (i === "Escape" && n.closeDirPop()) r.preventDefault();
			else if (i === "Escape" && n.closeRailDrawer()) r.preventDefault();
			else if (i === "Escape" && n.closeCard()) r.preventDefault();
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
var ki = n(), Ai = r();
function ji({ pending: e, host: t }) {
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
var Mi = (e) => e.rel.slice(e.rel.lastIndexOf("/") + 1).replace(/\.kts?$/, ""), Ni = (e) => e.rel.match(/\/src\/[^/]+\/(?:java|kotlin)\/(.+)\/[^/]+$/)?.[1].split("/") ?? [];
function Pi(e) {
	let t = e.map(Ni).filter((e) => e.length);
	return t.length ? t.reduce((e, t) => {
		let n = 0;
		for (; n < e.length && n < t.length && e[n] === t[n];) n++;
		return e.slice(0, n);
	}) : [];
}
function Fi(e, t) {
	let n = Ni(e);
	return n.length ? n.slice(t.length).join(".") || n.join(".") : e.rel.includes("/") ? e.rel.slice(0, e.rel.lastIndexOf("/")) : "";
}
function Ii(e) {
	let t = (e || "").split(":").filter(Boolean);
	for (; t.length > 1 && (t.at(-1) === "impl" || t.at(-1) === "api");) t.pop();
	return t.join("/");
}
function Li(e, t, n, r) {
	let i = Math.round((t - e) / 6e4);
	return i < 60 ? n("gallery.ago.minutes", { n: Math.max(i, 1) }) : i < 1440 ? n("gallery.ago.hours", { n: Math.round(i / 60) }) : i < 20160 ? n("gallery.ago.days", { n: Math.round(i / 1440) }) : new Date(e).toLocaleDateString(r, {
		month: "short",
		day: "numeric"
	});
}
var Ri = (e) => [...e].sort((e, t) => t.mtime - e.mtime || e.rel.localeCompare(t.rel)), zi = (e) => `${e.mtime} ${e.path}`, Bi = { status: "idle" };
function Vi(e, t = 1) {
	let n = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Set(), a = 0, o = !1, s = (e, t) => {
		n.set(e, t);
		for (let e of i) e();
	};
	function c() {
		for (; !o && a < t && r.size;) {
			let t = null;
			for (let e of r) (!t || e[1].order < t[1].order) && (t = e);
			let [n, { path: i }] = t;
			r.delete(n), a++, s(n, { status: "loading" }), e(i).then((e) => s(n, e?.ok && e.image ? {
				status: "done",
				sheets: e.sheets,
				image: e.image
			} : {
				status: "error",
				sheets: e?.sheets ?? 0,
				failure: e?.failure ?? null
			}), () => s(n, {
				status: "error",
				sheets: 0,
				failure: null
			})).finally(() => {
				a--, c();
			});
		}
	}
	return {
		want(e, t, i) {
			let a = n.get(e)?.status ?? "idle";
			(a === "idle" || a === "wait") && (r.set(e, {
				path: t,
				order: i
			}), a === "idle" && s(e, { status: "wait" }), c());
		},
		drop(e) {
			r.delete(e) && s(e, Bi);
		},
		pause(e) {
			o = e, e || c();
		},
		get: (e) => n.get(e) ?? Bi,
		subscribe(e) {
			return i.add(e), () => {
				i.delete(e);
			};
		}
	};
}
// src/components/Gallery.tsx
var Hi = Vi(j);
function Ui(e) {
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
var Wi = Ui("0px"), Gi = Ui("200% 0px"), Ki = () => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", {
		d: "M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), qi = () => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", {
		d: "M2 4.5V12.5h12V5.5H8L6.5 4H2z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), Ji = () => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 18 18",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", {
		d: "M3 3h5v5H3zM10 3h5v5h-5zM3 10h5v5H3zM10 10h5v5h-5z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3"
	})
});
function Yi({ text: e, className: t }) {
	let n = (0, R.useRef)(null), [r, i] = (0, R.useState)(e);
	return (0, R.useLayoutEffect)(() => {
		let t = n.current, r = () => {
			t.clientWidth && i(Vt(e, t.clientWidth, Bt(t)));
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
var Xi = (0, R.memo)(function({ text: e, view: t, near: n = !0, onOpen: r }) {
	let { phrase: i, daemonText: a } = s(), o = t.status === "done" ? "done" : t.status === "error" ? "failed" : "loading", c = t.status !== "done" || t.image.w <= t.image.h, l = t.status === "done" ? t.sheets : 0;
	return /* @__PURE__ */ (0, z.jsx)("article", {
		className: "gcard",
		"data-state": o,
		"aria-busy": o === "loading",
		children: /* @__PURE__ */ (0, z.jsxs)("button", {
			className: "gcard-hit",
			type: "button",
			onClick: r,
			children: [/* @__PURE__ */ (0, z.jsxs)("span", {
				className: "gcard-cover",
				children: [t.status === "error" ? /* @__PURE__ */ (0, z.jsx)("span", {
					className: "gcard-failed",
					title: a(t.failure) || void 0,
					children: i("gallery.failed")
				}) : /* @__PURE__ */ (0, z.jsx)("span", {
					className: "gcard-stack",
					"data-o": c ? "tall" : "wide",
					children: /* @__PURE__ */ (0, z.jsx)("span", {
						className: "gcard-shot",
						children: t.status === "done" && n ? /* @__PURE__ */ (0, z.jsx)("img", {
							src: t.image.url,
							width: t.image.w,
							height: t.image.h,
							alt: "",
							decoding: "async",
							onLoad: (e) => e.currentTarget.classList.add("in")
						}) : /* @__PURE__ */ (0, z.jsx)("span", { className: "gcard-ph" })
					})
				}), l > 1 && /* @__PURE__ */ (0, z.jsxs)("span", {
					className: "gcard-count",
					"aria-label": i("board.count", { n: l }),
					children: [/* @__PURE__ */ (0, z.jsx)(Ki, {}), l]
				})]
			}), /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "gcard-body",
				children: [
					/* @__PURE__ */ (0, z.jsx)(Yi, {
						className: "gcard-file",
						text: e.name
					}),
					/* @__PURE__ */ (0, z.jsxs)("span", {
						className: "gcard-pkgrow",
						children: [/* @__PURE__ */ (0, z.jsx)(qi, {}), /* @__PURE__ */ (0, z.jsx)(Yi, {
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
});
function Zi({ f: e, order: t, text: n, cards: r, onOpen: i }) {
	let a = (0, R.useRef)(null), o = zi(e), s = (0, R.useSyncExternalStore)(r.subscribe, () => r.get(o)), [c, l] = (0, R.useState)(!1);
	return (0, R.useEffect)(() => {
		let n = a.current, i = Wi().add(n, (n) => n ? r.want(o, e.path, t) : r.drop(o)), s = Gi().add(n, l);
		return () => {
			i(), s(), r.drop(o);
		};
	}, [
		o,
		t,
		r
	]), /* @__PURE__ */ (0, z.jsx)("div", {
		ref: a,
		className: "gcard-slot",
		"data-path": e.path,
		children: /* @__PURE__ */ (0, z.jsx)(Xi, {
			text: n,
			view: s,
			near: c,
			onOpen: () => i(e)
		})
	});
}
async function Qi(e, { phrase: t, daemonText: n }) {
	if (e.path === H(L.st)) {
		Ke();
		return;
	}
	let r = await P("/viewer/open", { file: e.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	r.ok || I(n(r.message) || t("open.cannot"));
}
function $i({ files: e, ready: t, cards: n, now: r = Date.now(), onOpen: i }) {
	let { phrase: a } = s(), o = (0, R.useMemo)(() => e ? Ri(e) : null, [e]), c = (0, R.useMemo)(() => e ? Pi(e) : [], [e]), l = document.documentElement.lang || "en";
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
			children: o.map((e, t) => /* @__PURE__ */ (0, z.jsx)(Zi, {
				f: e,
				order: t,
				cards: n,
				onOpen: i,
				text: {
					name: Mi(e),
					pkg: Fi(e, c),
					mod: Ii(e.module),
					changed: Li(e.mtime, r, a, l)
				}
			}, e.path))
		}) : /* @__PURE__ */ (0, z.jsx)("p", {
			className: "gallery-note",
			children: a("quickopen.none")
		})]
	});
}
function ea({ shown: e, state: t, draw: n, host: r }) {
	let i = s(), a = Re(), { element: c, place: l } = o(r), u = (0, R.useRef)({
		gallery: 0,
		board: 0,
		over: !1
	});
	return (0, R.useLayoutEffect)(() => {
		if (!t) return;
		let e = ze();
		e.open && (t.screen === "focus" || H(t) !== e.openedOver) && Ke();
	}, [n]), (0, R.useLayoutEffect)(() => {
		if (!c) return;
		let n = Ue();
		if (We(e), c.hidden = !e, Hi.pause(!e), e === n) return;
		let r = t?.screen === "board" || t?.screen === "vacant";
		if (e) {
			qe() && W(), r && (u.current.board = scrollY), u.current.over = r;
			let e = u.current.gallery;
			queueMicrotask(() => scrollTo(0, e));
		} else if (u.current.gallery = scrollY, u.current.over && r && H(t) === ze().openedOver) {
			let e = u.current.board;
			queueMicrotask(() => scrollTo(0, e));
		}
	}, [e, c]), l(/* @__PURE__ */ (0, z.jsx)($i, {
		files: a.files,
		ready: a.ready,
		cards: Hi,
		onOpen: (e) => Qi(e, i)
	}), (e, t) => /* @__PURE__ */ (0, z.jsx)("section", {
		id: "galleryView",
		className: "gallery",
		ref: e,
		children: t
	}));
}
function ta({ on: e, count: t, host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n);
	return (0, R.useLayoutEffect)(() => {
		i && (i.classList.toggle("on", e), e ? i.setAttribute("aria-current", "page") : i.removeAttribute("aria-current"));
	}, [i, e]), (0, R.useLayoutEffect)(() => {
		if (!i) return;
		let t = () => {
			e || Ge();
		};
		return i.addEventListener("click", t), () => i.removeEventListener("click", t);
	}, [i, e]), a(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(Ji, {}),
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
var na = (0, R.memo)(function({ content: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = (0, R.useSyncExternalStore)(le, F), { error: c, log: l, once: u } = e ?? a, d = !!(c.trim() || l.trim()) || !!u;
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
			onClick: re,
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
}), ra = {
	cursor: null,
	returned: null
}, ia = (e, t) => e.groups.flatMap((e) => e.cards).find((e) => e.index === t), aa = 300 / 360, oa = .25, sa = 100, ca = 160, la = 360, ua = 640, da = 120;
function fa(e, t, n) {
	let r = (t) => e.reduce((e, n) => e + Math.max(n * t, sa), 0) + n * (e.length - 1);
	if (r(aa) <= t) return {
		s: aa,
		w: r(aa),
		wrap: !1
	};
	if (r(oa) > t) return {
		s: Math.min(aa, ...e.map((e) => e * oa >= sa ? oa : sa / e)),
		w: t,
		wrap: !0
	};
	let i = oa, a = aa;
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
var pa = /* @__PURE__ */ new Map();
function ma(e, t) {
	let n = t.cards.map((t) => {
		let n = e + "|" + t.previewId, r = pa.get(n);
		return t.widthDp && t.heightDp && pa.set(n, [t.widthDp, t.heightDp]), [t.widthDp || r?.[0], t.heightDp || r?.[1]];
	}), r = n.filter(([e, t]) => e && t).sort((e, t) => t[0] - e[0])[0];
	return n.map(([e, n], i) => {
		let a = t.cards[i].failure && r;
		return [e || (a ? r[0] : la), n || (a ? r[1] : ua)];
	});
}
function ha(e, t, n) {
	let r = e.clientWidth;
	if (!r) return 0;
	let i = e.querySelectorAll(":scope > .group"), a = i[0]?.querySelector(".board"), o = a && parseFloat(getComputedStyle(a).columnGap) || 24;
	return t.groups.forEach((a, s) => {
		let c = i[s];
		if (!c) return;
		let l = ma(t.file, a), { s: u, w: d, wrap: f } = fa(l.map((e) => e[0]), r, o);
		c.style.width = f ? "100%" : Math.max(ca, d) + "px", c.querySelector(".board").classList.toggle("spill", f);
		let p = c.querySelector(".sc"), m = u < .8333323333333333, h = a.cards.some((e) => e.dpGuess);
		p.hidden = !m, p.textContent = m ? (h ? "≈" : "") + Math.round(u * 100) + "%" : "", p.title = n("zoom.tip.real") + (h ? " · " + n("board.scale.guess") : ""), a.cards.forEach((t, n) => {
			let r = e.querySelector(`.card[data-i="${t.index}"]`);
			if (!r) return;
			let [i, a] = l[n], o = Math.max(i * u, sa);
			r.style.width = o + "px";
			let s = r.querySelector(".cstage img");
			s.style.width = i * u + "px", s.style.aspectRatio = `auto ${i} / ${a}`;
			let c = r.querySelector(".ph"), d = Math.max(da, a * u);
			c.style.width = o + "px", c.style.height = d + "px", c.style.setProperty("--lines", String(Math.max(1, Math.floor((d - 55) / 16.7))));
		});
	}), r;
}
var ga = (e) => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 12 12",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.1",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: e
}), _a = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
	x: "3.25",
	y: "1.25",
	width: "5.5",
	height: "9.5",
	rx: "1.2"
}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M5.25 9h1.5" })] }), va = {
	portrait: ga(_a),
	landscape: ga(/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "1.25",
		y: "3",
		width: "9.5",
		height: "6",
		rx: "1.2"
	})),
	device: ga(_a),
	dark: ga(/* @__PURE__ */ (0, z.jsx)("path", { d: "M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z" })),
	font: /* @__PURE__ */ (0, z.jsx)("span", {
		className: "aa",
		children: "Aa"
	}),
	locale: ga(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("circle", {
		cx: "6",
		cy: "6",
		r: "4.75"
	}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75" })] })),
	api: ga(/* @__PURE__ */ (0, z.jsx)("path", { d: "M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5" })),
	systemUi: ga(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "3.25",
		y: "1.25",
		width: "5.5",
		height: "9.5",
		rx: "1.2"
	}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M3.5 3.25h5" })] }))
}, ya = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "currentColor",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z" })
});
function ba({ card: e }) {
	let { daemonText: t } = s();
	return /* @__PURE__ */ (0, z.jsx)("span", {
		className: "specs",
		title: e.args,
		children: e.specs.map((e, n) => {
			let r = t(e.text), [i, a] = e.kind === "size" ? r.split("×").map(Number) : [], o = e.kind === "size" ? i > a ? "landscape" : "portrait" : e.kind;
			return /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "spec",
				children: [va[o] ?? null, /* @__PURE__ */ (0, z.jsxs)("span", { children: [r, e.kind === "size" && /* @__PURE__ */ (0, z.jsx)("span", {
					className: "unit",
					children: "dp"
				})] })]
			}, n);
		})
	});
}
var xa = (0, R.memo)(function({ card: e, fn: t, cursor: n = !1, returned: r = !1, actions: i }) {
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
		p ? (t.dataset.url !== e.imageUrl && (ve(t, e.imageUrl), u.current.classList.remove("on"), d.current.hidden = !0), t.hidden = !1) : t.hidden = !0;
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
					children: [ya, /* @__PURE__ */ (0, z.jsx)("span", {
						className: "go-t",
						children: a("card.go")
					})]
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "sub",
					children: /* @__PURE__ */ (0, z.jsx)(ba, { card: e })
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
function Sa({ group: e, marks: t = ra, actions: n }) {
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
				children: e.cards.map((r) => /* @__PURE__ */ (0, z.jsx)(xa, {
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
function Ca({ board: e, screen: t, hosts: n, actions: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n?.cards), [l, u] = (0, R.useState)(null), d = n?.view ?? l, f = (0, R.useSyncExternalStore)(T, p), m = (0, R.useRef)({
		board: null,
		live: null
	}), h = (0, R.useMemo)(() => {
		let n = m.current;
		if (t === "focus" && e) return n.live = ia(e, e.focus)?.imageUrl ?? null, n.board;
		let r = e && ia(e, e.focus);
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
		d && (t !== null && (d.hidden = t !== "board"), t !== "focus" && (E(h), h && a && (x.current = ha(a, h, i) || x.current)));
	}, [
		h,
		t,
		d,
		a
	]), (0, R.useEffect)(() => {
		if (!a) return;
		let e = () => {
			v.current && (x.current = ha(a, v.current, b.current) || x.current);
		}, t = new ResizeObserver(() => {
			let t = a.clientWidth;
			t && t !== x.current && e();
		});
		return t.observe(a), y(e), () => {
			t.disconnect(), y(() => {});
		};
	}, [a]);
	let S = h && /* @__PURE__ */ (0, z.jsx)(R.Fragment, { children: h.groups.map((e, t) => /* @__PURE__ */ (0, z.jsx)(Sa, {
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
function wa({ rows: e, host: t }) {
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
function Ta({ state: e, connection: t = null, host: n, bar: r }) {
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
var Ea = {
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
}), Da = $(/* @__PURE__ */ (0, z.jsx)("path", { d: "M4 4l8 8M12 4l-8 8" })), Oa = $(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
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
] })), ka = {
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
function Aa(e) {
	let t = /#L(\d+)$/.exec(e), n = e.replace(/^@/, "").replace(/#L\d+$/, "");
	return t ? `${n.slice(n.lastIndexOf("/") + 1)}:${t[1]}` : n;
}
function ja(e, t) {
	let n = t && e.startsWith(t + "/") ? e.slice(t.length + 1) : e, r = n.lastIndexOf("/") + 1, i = n.indexOf("/src/");
	return (i > 0 && i < r ? n.slice(0, i) + "/…/" : n.slice(0, r)) + n.slice(r);
}
function Ma(e, t) {
	let n = (e.uchain || e.chain || []).slice(-6).join(" › ");
	return (t.ref ? [
		t.ref,
		e.name,
		n
	] : [t.msg, n]).filter(Boolean).join("\n");
}
var Na = [.5, 3.2], Pa = 2, Fa = (e) => String(Math.round(e * 10) / 10), Ia = () => typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, La = (e) => {
	e.button === 0 && e.target.closest("button") && e.preventDefault();
};
function Ra({ row: e, here: t, actions: n, children: r }) {
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
function za({ tree: e, actions: t, settled: n }) {
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
			children: c.rows.map((e) => /* @__PURE__ */ (0, z.jsx)(Ra, {
				row: e,
				actions: t
			}, e.id))
		})
	}, `fold-${e.id}`) : void 0, m = (e) => /* @__PURE__ */ (0, z.jsx)(Ra, {
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
		/* @__PURE__ */ (0, z.jsx)(Ra, {
			row: i,
			here: !0,
			actions: t,
			children: h
		}, i.id),
		o.map(m)
	] }), _ = Math.max(0, r.length - Pa), v = r.slice(_).reduceRight((e, n) => /* @__PURE__ */ (0, z.jsx)(Ra, {
		row: n,
		actions: t,
		children: /* @__PURE__ */ (0, z.jsx)("ul", {
			className: "pc-group",
			children: e
		})
	}, n.id), g);
	return /* @__PURE__ */ (0, z.jsxs)("ul", {
		className: "pc-tree",
		children: [r.slice(0, _).map((e) => /* @__PURE__ */ (0, z.jsx)(Ra, {
			row: e,
			actions: t
		}, e.id)), v]
	});
}
function Ba({ say: e }) {
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
var Va = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 24 24",
	fill: "currentColor",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M12.135.003a2.577 2.577 0 0 0-1.42.344L2.55 5.06a2.577 2.577 0 0 0-.953.967l3.957 2.17a1.765 1.765 0 0 1 .603-.588l4.951-2.86a1.761 1.761 0 0 1 1.76 0l4.951 2.86a1.753 1.753 0 0 1 .526.46l3.921-2.265a2.577 2.577 0 0 0-.816-.744L13.291.347a2.577 2.577 0 0 0-1.152-.34Zm-.145 4.912a1.36 1.36 0 0 0-.68.182L6.36 7.953a1.345 1.345 0 0 0-.454.435l1.92 1.055a1.05 1.05 0 0 1 .31-.275l3.34-1.928a1.054 1.054 0 0 1 1.051 0l3.336 1.928a1.066 1.066 0 0 1 .238.199l.018-.01-.002-.002 1.877-1.08a1.353 1.353 0 0 0-.373-.322l-4.95-2.86a1.357 1.357 0 0 0-.68-.178Zm10.432 1.149-3.92 2.26a1.757 1.757 0 0 1 .2.812v5.715c0 .627-.332 1.21-.88 1.528l-4.95 2.86a1.761 1.761 0 0 1-.64.214v4.524a2.577 2.577 0 0 0 1.059-.313l8.162-4.713a2.577 2.577 0 0 0 1.289-2.23V7.297a2.577 2.577 0 0 0-.318-1.228Zm-20.937.238a2.577 2.577 0 0 0-.227.99v9.43c0 .918.491 1.767 1.293 2.229l8.162 4.713a2.57 2.57 0 0 0 1.225.336v-4.531a1.761 1.761 0 0 1-.833-.235L6.156 16.38a1.765 1.765 0 0 1-.877-1.528V9.136a1.776 1.776 0 0 1 .131-.676Zm16.67 2.223-1.89 1.092a1.058 1.058 0 0 1 .124.46v3.856c0 .378-.2.72-.526.907l-3.336 1.93a1.04 1.04 0 0 1-.295.107v2.17c.152-.027.304-.078.44-.157l4.949-2.859a1.36 1.36 0 0 0 .68-1.18V9.136a1.36 1.36 0 0 0-.147-.607Zm-12.387.13a1.36 1.36 0 0 0-.088.481v5.715a1.36 1.36 0 0 0 .68 1.18l4.95 2.86c.194.112.412.166.627.177v-2.174a1.054 1.054 0 0 1-.46-.123L8.14 14.843a1.054 1.054 0 0 1-.532-.908v-3.853a.99.99 0 0 1 .077-.38l-.034-.013z" })
}), Ha = $(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M8 4.5C6.6 3.4 4.6 3 2.5 3.2v9.1c2.1-.2 4.1.2 5.5 1.3 1.4-1.1 3.4-1.5 5.5-1.3V3.2C11.4 3 9.4 3.4 8 4.5z" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M8 4.5v9" })] }));
function Ua({ origin: e }) {
	let { phrase: t } = s();
	return e ? e === "compose" ? /* @__PURE__ */ (0, z.jsxs)("span", {
		className: "pc-chip compose",
		title: t("point.card.compose.title"),
		children: [Va, t("point.card.compose")]
	}) : e === "library" ? /* @__PURE__ */ (0, z.jsxs)("span", {
		className: "pc-chip library",
		title: t("point.card.library.title"),
		children: [Ha, t("point.card.library")]
	}) : /* @__PURE__ */ (0, z.jsx)("span", {
		className: "pc-chip module",
		title: t("point.card.module.title", { module: e.module }),
		children: e.module
	}) : null;
}
function Wa({ box: e }) {
	let t = e.width > 0 && e.height > 0 ? e.width / e.height : 1, n = Math.min(Na[1], Math.max(Na[0], t));
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
				Fa(e.width),
				/* @__PURE__ */ (0, z.jsx)("i", { children: "×" }),
				Fa(e.height),
				/* @__PURE__ */ (0, z.jsx)("span", {
					className: "pc-unit",
					children: e.unit
				})
			]
		})]
	});
}
function Ga(e) {
	return e.sizes?.length ? e.sizes.length === 2 ? "size" : e.sizes[0] : e.color ? "color" : {
		padding: "padding",
		clickable: "click",
		text: "text"
	}[e.name] ?? null;
}
function Ka({ modifiers: e }) {
	let { phrase: t } = s();
	return /* @__PURE__ */ (0, z.jsx)("div", {
		className: "pc-mods",
		children: /* @__PURE__ */ (0, z.jsx)("ol", {
			className: "pc-scroll",
			tabIndex: 0,
			"aria-label": t("point.card.modifiers"),
			children: e.map((e, n) => {
				let r = Ga(e);
				return /* @__PURE__ */ (0, z.jsxs)("li", { children: [
					r ? /* @__PURE__ */ (0, z.jsx)("span", {
						className: "pc-kind",
						title: t(`point.card.kind.${r}`),
						"aria-label": t(`point.card.kind.${r}`),
						children: ka[r]
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
function qa({ card: e, actions: t = Ea }) {
	let { phrase: n } = s(), { node: r, say: i, box: a, tree: o, modifiers: c, previews: l, origin: u } = e, d = (0, R.useRef)(null), f = (0, R.useRef)(!1), p = (e) => {
		let t = d.current, n = t?.querySelector(".pc-node.here > .pc-row");
		if (!t || !n) return;
		let r = t.scrollTop + n.getBoundingClientRect().top - t.getBoundingClientRect().top - (t.clientHeight - n.offsetHeight) / 2;
		t.scrollTo({
			top: r,
			behavior: e && !Ia() ? "smooth" : "auto"
		});
	}, m = o?.here.id;
	(0, R.useLayoutEffect)(() => {
		p(f.current), f.current = !0;
	}, [m]);
	let [h, g] = (0, R.useState)(!1);
	(0, R.useEffect)(() => g(!1), [m, r.lineNumber]);
	let _ = i.file ? `${i.file.slice(i.file.lastIndexOf("/") + 1)}:${r.lineNumber}` : i.ref ? Aa(i.ref) : "", v = l.length > 1, y = v ? n("point.card.previews", { n: l.length }) : l[0] && n("point.card.jump", { name: l[0].fn }), b = m ?? `${r.name}:${r.lineNumber}`;
	return /* @__PURE__ */ (0, z.jsx)("section", {
		className: "point-card",
		"aria-label": n("point.card.label"),
		onMouseDown: La,
		children: /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "pc-body",
			children: [
				/* @__PURE__ */ (0, z.jsxs)("header", {
					className: "pc-head",
					children: [
						/* @__PURE__ */ (0, z.jsxs)("div", {
							className: "pc-id pc-swap",
							title: Ma(r, i),
							children: [/* @__PURE__ */ (0, z.jsxs)("span", {
								className: "pc-nameline",
								children: [/* @__PURE__ */ (0, z.jsx)("span", {
									className: "pc-name",
									children: r.name || r.fileName
								}), /* @__PURE__ */ (0, z.jsx)(Ua, { origin: u })]
							}), i.ref && /* @__PURE__ */ (0, z.jsxs)("span", {
								className: "pc-refline",
								children: [/* @__PURE__ */ (0, z.jsx)("span", {
									className: "pc-ref",
									children: _
								}), /* @__PURE__ */ (0, z.jsx)(Ba, { say: i })]
							})]
						}, `id-${b}`),
						y && /* @__PURE__ */ (0, z.jsxs)("button", {
							type: "button",
							className: "pc-jump",
							title: y,
							"aria-label": y,
							"aria-expanded": v ? h : void 0,
							onClick: () => v ? g((e) => !e) : t.jump(l[0]),
							children: [Oa, v && /* @__PURE__ */ (0, z.jsx)("span", { children: l.length })]
						}),
						/* @__PURE__ */ (0, z.jsx)("button", {
							type: "button",
							className: "pc-close",
							title: n("point.card.close"),
							"aria-label": n("point.card.close"),
							onClick: t.close,
							children: Da
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
							children: [Oa, /* @__PURE__ */ (0, z.jsx)("span", { children: e.fn })]
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
						children: /* @__PURE__ */ (0, z.jsx)(za, {
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
						children: [/* @__PURE__ */ (0, z.jsx)(Wa, { box: a }), c && c.length > 0 && /* @__PURE__ */ (0, z.jsx)(Ka, { modifiers: c })]
					}, `detail-${b}`)
				})
			]
		})
	});
}
function Ja({ room: e, shot: t, card: n, space: r }) {
	let i = t.left + t.width + r.gap;
	return {
		left: i + n.width <= e.right - r.edge ? i : Math.max(e.left + r.edge, t.left - r.gap - n.width),
		top: Math.max(r.edge, t.top)
	};
}
var Ya = (e, t) => parseFloat(getComputedStyle(e).getPropertyValue(t)) || 0, Xa = (e) => {
	let t = document.getElementById(e);
	return t && !t.hidden && t.offsetWidth ? t.getBoundingClientRect() : null;
};
function Za({ host: e, shot: t, leaving: n = !1, onLeft: r, children: i }) {
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
			gap: Ya(n, "--space-16"),
			edge: Ya(n, "--space-8")
		}, i = 0, o = "", s = () => {
			let a = t(), c = e.getBoundingClientRect(), l = "hidden";
			if (a && a.width) {
				let t = Xa("rail"), i = Ja({
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
function Qa({ host: e, shot: t, card: n, actions: r }) {
	let i = (0, R.useRef)(/* @__PURE__ */ new WeakMap()), a = (0, R.useRef)(0), o = (0, R.useRef)(null), [s, c] = (0, R.useState)(!0), l = !!(e && t && n);
	e && t && n && (o.current = {
		host: e,
		shot: t,
		card: n
	}, s && c(!1));
	let u = o.current;
	return !u || s ? null : (i.current.has(u.shot) || i.current.set(u.shot, ++a.current), (0, ki.createPortal)(/* @__PURE__ */ (0, z.jsx)(Za, {
		host: u.host,
		shot: u.shot,
		leaving: !l,
		onLeft: () => c(!0),
		children: /* @__PURE__ */ (0, z.jsx)(qa, {
			card: u.card,
			actions: r
		})
	}, i.current.get(u.shot)), u.host));
}
function $a({ actions: e }) {
	let { host: t, shot: n, card: r } = (0, R.useSyncExternalStore)(Bn.subscribe, Bn.get);
	return /* @__PURE__ */ (0, z.jsx)(Qa, {
		host: t,
		shot: n,
		card: r,
		actions: e
	});
}
function eo({ choice: e, repo: t, host: n, actions: r = Ea }) {
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
			children: ja(e.startsWith(u.repoRoot + "/") ? e.slice(u.repoRoot.length + 1) : e, t)
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
function to({ screen: e, vacant: t, host: n }) {
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
function no() {
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
var ro = ({ id: e, hidden: t }) => /* @__PURE__ */ (0, z.jsxs)("div", {
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
function io() {
	let e = no();
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
function ao({ marks: e = co() }) {
	return /* @__PURE__ */ (0, z.jsx)("div", {
		className: "resize-scene",
		id: "resizeScene",
		hidden: !0,
		children: /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "resize-geometry",
			id: "resizeGeometry",
			children: [
				/* @__PURE__ */ (0, z.jsx)(ro, { id: "ua" }),
				/* @__PURE__ */ (0, z.jsx)(ro, {
					id: "ub",
					hidden: !0
				}),
				/* @__PURE__ */ (0, z.jsx)(io, {}),
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
var oo = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "workspace-loading",
	id: "workspaceLoading",
	role: "status",
	hidden: !0,
	ref: e,
	children: t
}), so = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "inset-overlay",
	id: "insetOverlay",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), co = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "inset-marks",
	id: "insetMarks",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), lo = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "sys-ui",
	id: "sysUiCtl",
	role: "group",
	"data-t-aria-label": "systemUi.label",
	hidden: !0,
	ref: e,
	children: t
}), uo = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "zoom at-fit",
	id: "zoomCtl",
	role: "group",
	"data-t-aria-label": "zoom.label",
	ref: e,
	children: t
});
function fo({ loading: e = oo(), inset: t = so() }) {
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
function po({ loading: e, inset: t, marks: n }) {
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "wrap",
		children: [/* @__PURE__ */ (0, z.jsx)(ao, { marks: n }), /* @__PURE__ */ (0, z.jsx)(fo, {
			loading: e,
			inset: t
		})]
	});
}
function mo() {
	let e = no(), t = (t, n, r) => /* @__PURE__ */ (0, z.jsxs)("div", {
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
function ho() {
	let e = no(), t = (t, n, r, i = !1) => /* @__PURE__ */ (0, z.jsx)("button", {
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
				children: Se.map(({ group: e, ids: n }) => /* @__PURE__ */ (0, z.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("h5", {
					className: "pn-g",
					children: e
				}), n.map((e) => t(e))] }, e))
			})]
		})]
	});
}
var go = (e) => /* @__PURE__ */ (0, z.jsx)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), _o = go(/* @__PURE__ */ (0, z.jsxs)("g", {
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
})), vo = go(/* @__PURE__ */ (0, z.jsxs)("g", {
	className: "fold-ic",
	children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M3 10h4.5M5.5 7.8 7.7 10l-2.2 2.2M17 10h-4.5M14.5 7.8 12.3 10l2.2 2.2" })]
})), yo = go(/* @__PURE__ */ (0, z.jsxs)("g", {
	className: "unfold-ic",
	children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M7.5 10H3M5.2 7.8 3 10l2.2 2.2M12.5 10H17M14.8 7.8 17 10l-2.2 2.2" })]
})), bo = go(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
	x: "3.5",
	y: "4",
	width: "13",
	height: "12",
	rx: "1.5"
}), /* @__PURE__ */ (0, z.jsx)("path", {
	d: "M10 4v12",
	strokeDasharray: "1.6 1.6"
})] })), xo = /* @__PURE__ */ (0, z.jsx)("svg", {
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
function So() {
	let e = no();
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
					children: [_o, xo]
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
				children: [vo, yo]
			}),
			/* @__PURE__ */ (0, z.jsx)("button", {
				className: "tb-btn",
				id: "dcHinge",
				type: "button",
				"aria-pressed": "true",
				...e.title("posture.hinge.hide"),
				...e.label("posture.hinge"),
				children: bo
			})
		]
	});
}
function Co() {
	let e = no();
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
				xo
			]
		}), /* @__PURE__ */ (0, z.jsx)("div", {
			className: "pn-body",
			id: "pnBody",
			inert: !0,
			children: /* @__PURE__ */ (0, z.jsx)(ho, {})
		})]
	});
}
function wo({ systemUi: e = lo(), zoom: t = uo() }) {
	return /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(Co, {}),
		/* @__PURE__ */ (0, z.jsx)(So, {}),
		/* @__PURE__ */ (0, z.jsx)(mo, {}),
		e,
		t
	] });
}
// src/components/InsetOverlay.tsx
function To(e, t, n) {
	if (!e || !t || n?.kind !== "device") return null;
	let r = n.widthDp, i = n.heightDp, a = Object.fromEntries(Pr.map((e) => [e, Math.max(0, ...Nr.map((n) => t.values[n][e]))]));
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
function Eo(e, t) {
	let { on: n } = (0, R.useSyncExternalStore)(X.subscribe, X.get);
	return To(n, e, t);
}
function Do(e, t, n, r) {
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
function Oo({ deviceInsets: e, size: t, host: n }) {
	let { element: r, place: i } = o(n), a = Eo(e, t);
	if ((0, R.useLayoutEffect)(() => {
		r && (r.hidden = !a);
	}, [r, a]), !a) return i(null, so);
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
		}), Nr.map((e) => /* @__PURE__ */ (0, z.jsx)("g", {
			className: "io-band",
			"data-kind": e,
			children: Pr.filter((t) => a.insets.values[e][t] > 0).map((t) => {
				let { fill: n, line: r } = Do(t, a.insets.values[e][t], s, c);
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
	}), so);
}
var ko = (e) => String(Math.round(e * 100) / 100);
function Ao({ w: e, h: t, insets: n, widest: r }) {
	return Pr.flatMap((i) => {
		let a = i === "top" || i === "bottom" ? t : e, o = Nr.filter((e) => e !== "displayCutout").reduce((e, t) => n.values[t][i] > n.values[e][i] ? t : e);
		return [[o, Fr(o, i)], ["displayCutout", Fr("displayCutout", i)]].flatMap(([e, t]) => {
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
var jo = (e) => `${e * 100}%`;
function Mo({ deviceInsets: e, size: t, host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = Eo(e, t);
	if ((0, R.useLayoutEffect)(() => {
		i && (i.hidden = !c);
	}, [i, c]), !c) return a(null, co);
	let { w: l, h: u, safe: d } = c;
	return a(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [Ao(c).map((e) => {
		let t = e.side === "right" || e.side === "left" ? {
			top: jo(e.from),
			height: jo(e.to - e.from)
		} : {
			left: jo(e.from),
			width: jo(e.to - e.from)
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
						children: ko(e.value)
					})]
				})
			]
		}, `${e.kind} ${e.edge}`);
	}), /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "im-safe",
		"data-kind": "safeDrawing",
		style: {
			left: jo((d.x + d.w / 2) / l),
			top: jo((d.y + d.h / 2) / u)
		},
		children: [/* @__PURE__ */ (0, z.jsx)("b", { children: r("insetOverlay.safeArea") }), /* @__PURE__ */ (0, z.jsxs)("span", { children: [
			ko(d.w),
			" × ",
			ko(d.h)
		] })]
	})] }), co);
}
var No = /* @__PURE__ */ (0, z.jsxs)("svg", {
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
function Po() {
	let { phrase: e } = s(), { on: t } = (0, R.useSyncExternalStore)(X.subscribe, X.get), { on: n } = (0, R.useSyncExternalStore)(zn.subscribe, zn.get), r = e("insetOverlay.now", { value: e(t ? "systemUi.on" : "systemUi.off") });
	return /* @__PURE__ */ (0, z.jsx)("button", {
		type: "button",
		id: "insetBtn",
		className: "tb-btn",
		"aria-pressed": t,
		"aria-label": r,
		title: r,
		disabled: n,
		onClick: () => X.set({ on: !t }),
		children: No
	});
}
// src/components/Workspace.tsx
var Fo = {
	exit() {},
	zoomIn() {},
	zoomOut() {},
	zoomFit() {},
	zoomMenuPick() {},
	toggleZoomMenu() {},
	pickSystemUi() {}
};
function Io({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e), { on: i, failed: a } = (0, R.useSyncExternalStore)(zn.subscribe, zn.get);
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
	})] }), oo);
}
var Lo = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M4 8h8" })
}), Ro = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M4 8h8M8 4v8" })
}), zo = (e) => (0, R.useSyncExternalStore)(Rn.subscribe, () => Rn.get()[e]);
function Bo({ real: e, menu: t, disabled: n, actions: r }) {
	let { phrase: i } = s(), a = zo("pct");
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
var Vo = (0, R.memo)(function({ host: e, actions: t = Fo }) {
	let { phrase: n } = s(), { element: r, place: i } = o(e), a = zo("real"), c = zo("atFit"), l = zo("menu"), u = zo("disabled");
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
			children: Lo
		}),
		/* @__PURE__ */ (0, z.jsx)(Bo, {
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
			children: Ro
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
	] }), uo);
}), Ho = /* @__PURE__ */ (0, z.jsxs)("svg", {
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
function Uo({ systemUi: e, deviceInsets: t = null, host: n, actions: r = Fo }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), { on: l } = (0, R.useSyncExternalStore)(zn.subscribe, zn.get), u = !e && !t;
	(0, R.useLayoutEffect)(() => {
		a && (a.hidden = u);
	}, [a, u]);
	let d = !!e?.shown, f = i(t ? "insetOverlay.label" : "systemUi.label");
	if ((0, R.useLayoutEffect)(() => {
		a?.setAttribute("aria-label", f);
	}, [a, f]), t) return c(/* @__PURE__ */ (0, z.jsx)(Po, {}), lo);
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
		children: Ho
	}), lo);
}
var Wo = 12, Go = 48;
function Ko(e, t) {
	let n = e.querySelector("#backName"), r = t.querySelector("#wsName"), i = t.querySelector("#wsFn"), a = e.parentElement, o = document.getElementById("barR");
	if (!n || !r || !i || !a || !o || (n.style.maxWidth = "", n.style.display = "", t.hidden || !(t.offsetParent instanceof HTMLElement))) return;
	if (getComputedStyle(t).position !== "absolute") {
		t.style.removeProperty("--ws-left"), t.style.removeProperty("--ws-max");
		return;
	}
	let s = t.offsetParent.clientWidth, c = o.offsetLeft - Wo, l = Math.min(Math.max(r.scrollWidth, i.hidden ? 0 : i.scrollWidth) + 1, s * .34), u = Math.min(s / 2 - l / 2, c - l), d = () => {
		let e = 0;
		for (let t of a.children) t instanceof HTMLElement && t.offsetParent && (e = Math.max(e, a.offsetLeft + t.offsetLeft + t.offsetWidth));
		return e + Wo;
	}, f = d();
	if (f > u && !e.hidden) {
		let e = n.offsetWidth - (f - u);
		e < Go ? n.style.display = "none" : n.style.maxWidth = `${e}px`, f = d();
	}
	let p = Math.max(u, f), m = Math.max(0, Math.min(l, c - p));
	t.style.setProperty("--ws-left", `${p + m / 2}px`), t.style.setProperty("--ws-max", `${m}px`);
}
var qo = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.8",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M10 3.5 5.5 8l4.5 4.5" })
});
function Jo({ state: e, hosts: t, actions: n = Fo }) {
	let { phrase: r } = s(), i = o(t?.back), a = o(t?.title), c = e?.screen === "focus" ? e.focus : null, l = c ? (e.tabs || []).find((e) => e.active) : void 0, u = c ? Ne(e?.board, e?.board?.focus) : null;
	(0, R.useLayoutEffect)(() => {
		document.body.classList.toggle("ws", !!c), i.element && (i.element.hidden = !c), a.element && (a.element.hidden = !c, a.element.title = c ? u ? u.title : l ? l.title : c.previewId : ""), i.element && a.element && Ko(i.element, a.element);
	}), (0, R.useLayoutEffect)(() => () => document.body.classList.remove("ws"), []), (0, R.useLayoutEffect)(() => {
		let e = i.element, t = a.element, n = e?.parentElement?.parentElement, r = document.getElementById("barR");
		if (!e || !t) return;
		let o = new ResizeObserver(() => Ko(e, t));
		for (let e of [n, r]) e && o.observe(e);
		return () => o.disconnect();
	}, [i.element, a.element]);
	let d = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [qo, /* @__PURE__ */ (0, z.jsx)("span", {
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
function Yo({ screen: e, systemUi: t = null, deviceInsets: n = null, size: r = null, hosts: i, actions: a = Fo }) {
	let { phrase: o } = s(), [c, l] = (0, R.useState)(null), u = i?.view ?? c;
	return (0, R.useLayoutEffect)(() => {
		u && e !== null && (u.hidden = e !== "focus");
	}, [e, u]), i ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(Io, { host: i.loading }),
		/* @__PURE__ */ (0, z.jsx)(Oo, {
			deviceInsets: n,
			size: r,
			host: i.inset
		}),
		/* @__PURE__ */ (0, z.jsx)(Mo, {
			deviceInsets: n,
			size: r,
			host: i.insetMarks
		}),
		/* @__PURE__ */ (0, z.jsx)(Uo, {
			systemUi: t,
			deviceInsets: n,
			host: i.systemUi,
			actions: a
		}),
		/* @__PURE__ */ (0, z.jsx)(Vo, {
			host: i.zoom,
			actions: a
		})
	] }) : /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("section", {
		id: "focusView",
		ref: l,
		children: /* @__PURE__ */ (0, z.jsx)(po, {
			loading: /* @__PURE__ */ (0, z.jsx)(Io, {}),
			inset: /* @__PURE__ */ (0, z.jsx)(Oo, {
				deviceInsets: n,
				size: r
			}),
			marks: /* @__PURE__ */ (0, z.jsx)(Mo, {
				deviceInsets: n,
				size: r
			})
		})
	}), /* @__PURE__ */ (0, z.jsx)("div", {
		className: "panel",
		id: "panel",
		role: "toolbar",
		"aria-label": o("panel.label"),
		children: /* @__PURE__ */ (0, z.jsx)(wo, {
			systemUi: /* @__PURE__ */ (0, z.jsx)(Uo, {
				systemUi: t,
				deviceInsets: n,
				actions: a
			}),
			zoom: /* @__PURE__ */ (0, z.jsx)(Vo, { actions: a })
		})
	})] });
}
// src/ViewerRoot.tsx
function Xo() {
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
function Zo({ state: e, draw: t = 0, statusState: n = e, connection: r = null, app: i = null, shortcuts: a = [], hosts: o, board: s, workspace: c, point: l, renderLegacy: u }) {
	(0, R.useLayoutEffect)(() => {
		e && u(e);
	}, [t]);
	let d = Ye(e, r), f = Re().files, p = d ? "gallery" : e?.screen ?? null;
	return o ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(sn, {
			header: e?.header ?? null,
			tabs: e?.tabs ?? [],
			app: i,
			host: o.app,
			brand: o.brand
		}),
		/* @__PURE__ */ (0, z.jsx)(Ta, {
			state: n,
			connection: r,
			host: o.status,
			bar: o.bar
		}),
		/* @__PURE__ */ (0, z.jsx)(gn, { host: o.helpButton }),
		/* @__PURE__ */ (0, z.jsx)(tn, {
			tabs: e?.tabs ?? null,
			screen: e?.screen ?? null,
			gallery: d,
			hosts: o.rail
		}),
		/* @__PURE__ */ (0, z.jsx)(ta, {
			on: d,
			count: f?.length ?? null,
			host: o.railAll
		}),
		/* @__PURE__ */ (0, z.jsx)(wa, {
			rows: e?.stale ?? null,
			host: o.stale
		}),
		/* @__PURE__ */ (0, z.jsx)(ji, {
			pending: !!e?.buildPending,
			host: o.buildNotice
		}),
		/* @__PURE__ */ (0, z.jsx)(ea, {
			shown: d,
			state: e,
			draw: t,
			host: o.gallery
		}),
		/* @__PURE__ */ (0, z.jsx)(Ca, {
			board: e?.board ?? null,
			screen: p,
			hosts: o.board,
			actions: s
		}),
		/* @__PURE__ */ (0, z.jsx)(Ft, {
			state: e,
			draw: t,
			connection: r,
			hosts: o.quickOpen
		}),
		/* @__PURE__ */ (0, z.jsx)(to, {
			screen: p,
			vacant: e?.vacant ?? null,
			host: o.vacant
		}),
		/* @__PURE__ */ (0, z.jsx)(Yo, {
			screen: e?.screen ?? null,
			systemUi: e?.focus?.systemUi ?? null,
			deviceInsets: e?.focus?.deviceInsets ?? null,
			size: e?.focus?.size ?? null,
			hosts: o.workspace,
			actions: c
		}),
		/* @__PURE__ */ (0, z.jsx)(Jo, {
			state: e,
			hosts: o.workspaceHeader,
			actions: c
		}),
		/* @__PURE__ */ (0, z.jsx)($a, { actions: l }),
		/* @__PURE__ */ (0, z.jsx)(eo, {
			choice: e?.choice ?? null,
			repo: e?.header?.repo,
			host: o.chooser,
			actions: l
		}),
		/* @__PURE__ */ (0, z.jsx)(na, { host: o.capsule }),
		/* @__PURE__ */ (0, z.jsx)(hn, {
			table: a,
			host: o.help
		})
	] }) : null;
}
function Qo({ renderLegacy: e, messages: t, hosts: n, shortcuts: r, board: i, workspace: a, point: o }) {
	let s = document.createElement("div");
	s.hidden = !0, document.body.append(s);
	let c = (0, Ai.createRoot)(s), l = null, u = null, f = null, p = null, m = 0, h = () => c.render(/* @__PURE__ */ (0, z.jsx)(d.Provider, {
		value: t,
		children: /* @__PURE__ */ (0, z.jsx)(Zo, {
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
	return (0, ki.flushSync)(h), ee("/app.json").then((e) => e.json()).then((e) => {
		p = e, h();
	}).catch(() => {
		p = {}, h();
	}), {
		apply(e, t = !1) {
			l = e, t && u || (u = e), m++, (0, ki.flushSync)(h);
		},
		connection(e) {
			f = e, (0, ki.flushSync)(h);
		},
		dispose() {
			c.unmount(), s.remove();
		}
	};
}
// src/main.tsx
var $o = cn(), es = Vr(Br()), ts = (e) => {
	ri(e), $o?.update(e);
}, ns = () => {
	let { cursor: e } = p();
	e != null && Kr(e);
}, rs = {
	exit: qr,
	zoomIn: es.zoomIn,
	zoomOut: es.zoomOut,
	zoomFit: es.zoomFit,
	zoomMenuPick: es.zoomMenuPick,
	toggleZoomMenu: es.toggleZoomMenu,
	pickSystemUi: Jr
}, is = {
	choose: Tr,
	cancel: Er,
	follow: jr,
	pick: br,
	peek: xr,
	jump: Sr,
	close: Q
};
wr();
var as = {
	screen: () => L.st ? Ue() ? "gallery" : L.st.screen : "offline",
	tabCount: Zt,
	moveCursor: v,
	openCursor: ns,
	exitFocus: qr,
	openGallery: Ge,
	stepTab: Yt,
	jumpTab: Xt,
	openQuickOpen: Tt,
	helpOpen: pn,
	toggleHelp: mn,
	zoomIn: rs.zoomIn,
	zoomOut: rs.zoomOut,
	zoomFit: rs.zoomFit
}, os = Ti(k, as);
Oi(os, as, {
	chooserOpen: () => !!document.getElementById("chooser")?.classList.contains("on"),
	cancelChoice: Er,
	closeZoomMenu: es.closeZoomMenu,
	closeDeviceMenu: es.closeDeviceMenu,
	closeDirPop: on,
	closeRailDrawer: qt,
	closeCard: Cr
});
var ss = Qo({
	renderLegacy: ts,
	messages: {
		phrase: k,
		daemonText: O
	},
	hosts: Xo(),
	shortcuts: os,
	board: {
		open: Kr,
		point: Mr
	},
	workspace: rs,
	point: is
});
wi({
	workspace: es,
	render: ss.apply,
	onConnection: ss.connection,
	onPreviewFiles: () => {
		Et(), Je(), pr();
	},
	prepared: $o
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
