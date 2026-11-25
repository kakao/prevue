import { i as e, n as t, r as n, t as r } from "./react.js";
import { createScene as i, handoffMs as a, i as o, n as s, r as c, sceneEasing as l, sceneMs as u, t as d } from "./preparation-scene.js";
import { applyReveal as f, boardMarks as p, cancelReveal as m, cardAt as h, cardStage as g, clearTrees as _, moveCursor as v, onRelayout as y, returnCard as b, reveal as x, ringCard as S, setCursor as C, stuckHead as w, subscribeBoard as T, syncBoard as E, trees as D } from "./board.js";
import { daemonText as O, phrase as k } from "./strings.js";
import { connect as ee, fetchGalleryCard as A, fetchGallerySheet as j, fetchPreviewFiles as M, fetchProjectFiles as N, get as te, post as P, reportStreamWidth as ne, viewerStream as re } from "./api.js";
import { capsuleContent as ie, dismissOnce as ae, flash as F, hideOnce as oe, renderError as se, setStatus as ce, setSummary as le, showOnce as ue, subscribeCapsule as de } from "./capsule.js";
import { MORPH_LEAD as fe, frameMorph as pe, freeze as me, hold as he, motionMs as I, motionToken as ge, radiiOf as _e, reduced as ve, swapImage as ye, transition as be, transitioning as xe } from "./motion.js";
import { createStore as Se, store as L } from "./store.js";
import { DP_MAX as Ce, DP_MIN as R, createResizeScene as we, itemName as Te, silhouette as z, slAt as Ee, stepOf as De } from "./resize-scene.js";
import { DEVICES as Oe, DEVICE_MENU as ke } from "./devices.js";
// src/components/FileIcon.tsx
var B = e(), V = t(), Ae = (e) => e ? e.startsWith("android") ? "android" : "kmp" : "file", je = /* @__PURE__ */ (0, V.jsx)("path", { d: "M7 13H2.5V1.5h5L10 4V7" }), Me = {
	file: /* @__PURE__ */ (0, V.jsx)("path", { d: "M4 2h5.5L12 4.5V14H4z" }),
	android: /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [je, /* @__PURE__ */ (0, V.jsxs)("g", {
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
	kmp: /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [je, /* @__PURE__ */ (0, V.jsx)("path", {
		className: "mk-kmp",
		fill: "currentColor",
		stroke: "none",
		transform: "translate(7.2 7.2) scale(.18333)",
		d: "M0 22.5629V0.0835311L22.4794 22.5629H0ZM0 25.4372V48H0.0572568L22.6201 25.4372H0ZM25.9906 22.0094L48 0H3.98128L25.9906 22.0094ZM26.0193 26.1028L4.1221 48H47.9164L26.0193 26.1028Z"
	})] })
};
function Ne({ kind: e }) {
	return /* @__PURE__ */ (0, V.jsx)("svg", {
		className: "rt-ic",
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.4",
		strokeLinejoin: "round",
		strokeLinecap: "round",
		"aria-hidden": "true",
		children: Me[e]
	});
}
// src/match.ts
var H = -1e9, Pe = /[/._\-\s]/, Fe = (e) => e !== e.toLowerCase();
function Ie(e, t) {
	if (t === 0) return !0;
	let n = e[t - 1], r = e[t];
	return Pe.test(n) || Fe(r) && !Fe(n) || /\d/.test(r) && !/\d/.test(n);
}
function Le(e, t) {
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
	for (let e = 0; e < r; e++) a[e] === i[0] && (o[0][e] = 1 + (Ie(t, e) ? 8 : 0) + (e === 0 ? 4 : 0) - e * .02);
	for (let e = 1; e < n; e++) {
		let n = H, c = -1;
		for (let l = e; l < r; l++) {
			if (l >= 2 && o[e - 1][l - 2] > n && (n = o[e - 1][l - 2], c = l - 2), a[l] !== i[e]) continue;
			let r = Ie(t, l) ? 8 : 0, u = o[e - 1][l - 1] > H ? o[e - 1][l - 1] + 1 + 5 + r : H, d = n > H ? n + 1 + r - 3 : H;
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
var Re = (e) => e.dir ??= e.rel.slice(0, e.rel.length - e.name.length).toLowerCase(), ze = {
	name: 30,
	fn: 15,
	path: 0
};
function Be(e, t) {
	let n = 0, r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of e) {
		let e = null, o = Le(a, t.name);
		o && (e = {
			s: o.score + ze.name,
			kind: "name",
			idx: o.idx
		});
		for (let n of t.functions) {
			let t = Le(a, n);
			t && (!e || t.score + ze.fn > e.s) && (e = {
				s: t.score + ze.fn,
				kind: "fn",
				fn: n,
				idx: t.idx
			});
		}
		if (!e && Re(t).includes(a.toLowerCase()) && (e = {
			s: 10 + ze.path,
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
function Ve(e, t) {
	if (!e || t == null) return null;
	for (let n of e.groups) for (let e of n.cards) if (e.index === t) return e;
	return null;
}
// src/gallery/layer.ts
var He = {
	open: !1,
	openedOver: null,
	files: null,
	ready: !1,
	sheet: null
}, Ue = /* @__PURE__ */ new Set();
function We(e) {
	if (!Object.keys(e).every((t) => He[t] === e[t])) {
		He = {
			...He,
			...e
		};
		for (let e of Ue) e();
	}
}
var Ge = (e) => (Ue.add(e), () => {
	Ue.delete(e);
}), Ke = () => He, W = () => (0, B.useSyncExternalStore)(Ge, Ke), qe = () => He, Je = !1, Ye = 0, Xe = () => Je;
function Ze(e) {
	Je = e;
}
function Qe() {
	We({
		open: !0,
		openedOver: U(L.st)
	});
}
function $e() {
	We({
		open: !1,
		sheet: null
	});
}
function et(e) {
	We({ sheet: {
		path: e,
		closing: !1
	} });
}
function tt() {
	let e = He.sheet;
	return !e || !Je ? !1 : (e.closing || We({ sheet: {
		...e,
		closing: !0
	} }), !0);
}
function nt() {
	We({ sheet: null });
}
var rt = () => Je && !!He.sheet;
async function it() {
	let e = ++Ye, t = await M().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === Ye && We(t);
}
function at() {
	Je && it();
}
addEventListener("visibilitychange", () => {
	Je && document.visibilityState === "visible" && it();
});
function ot(e, t) {
	let n = W();
	return t === "lost" || !e?.header.repo ? !1 : e.screen === "empty" || n.open && e.screen !== "focus" && U(e) === n.openedOver;
}
// src/components/QuickOpen.tsx
var st = 8, ct = 5, lt = [], ut = (e) => e.map((e) => ({
	...e,
	name: e.rel.split("/").pop()
}));
function dt(e) {
	if (!e || !e.fns.size) return null;
	let t = null;
	for (let [n, r] of e.fns) (!t || r.size > t[1].size) && (t = [n, r]);
	return {
		fn: t[0],
		idx: t[1],
		more: e.fns.size - 1
	};
}
function ft(e, t, n) {
	let r = t.trim().split(/\s+/).filter(Boolean);
	if (!e) return {
		sections: [],
		more: 0,
		empty: !r.length,
		loading: !0
	};
	if (!r.length) {
		let t = new Map(e.map((e) => [e.path, e])), r = e.slice(0, ct), i = new Set(r.map((e) => e.path)), a = n.map((e) => t.get(e)).filter((e) => !!e && !i.has(e.path)), o = st - r.length, s = a.length < o ? e.slice(ct).filter((e) => !a.includes(e)).slice(0, o - a.length) : [], c = [{
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
		let e = Be(r, t);
		e && i.push({
			f: t,
			m: e
		});
	}
	i.sort((e, t) => t.m.score - e.m.score || t.f.mtime - e.f.mtime);
	let a = i.slice(0, st).map((e) => ({
		...e,
		fn: dt(e.m)
	}));
	return {
		sections: a.length ? [{ rows: a }] : [],
		more: Math.max(0, i.length - st),
		empty: !1,
		loading: !1
	};
}
function pt({ text: e, idx: t }) {
	if (!t?.size) return e;
	let n = [];
	return [...e].forEach((e, r) => {
		let i = t.has(r), a = n[n.length - 1];
		a && a[1] === i ? a[0] += e : n.push([e, i]);
	}), n.map(([e, t], n) => t ? /* @__PURE__ */ (0, V.jsx)("b", { children: e }, n) : e);
}
var mt = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.4",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M3 8h10M9 4l4 4-4 4" })
}), ht = (e) => (e || "").replace(/^:/, "").replace(/:/g, "/"), gt = -1, _t = -1, vt = !1;
addEventListener("mousemove", (e) => {
	vt = e.screenX !== gt || e.screenY !== _t, gt = e.screenX, _t = e.screenY;
}, !0);
var yt = (0, B.memo)(function({ files: e, ready: t, query: n, sel: r, recent: i = lt, fieldRef: a, onQuery: o, onSelect: l, onPick: u, onEscape: d, onLeave: f }) {
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
	}, []), b = (0, B.useMemo)(() => e && ut(e), [e]), { sections: x, more: S, empty: C, loading: w } = (0, B.useMemo)(() => ft(b, n, i), [
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
			vt && E !== t && l(t);
		},
		onClick: () => u?.(e),
		children: [
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "qo-arrow",
				children: mt
			}),
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "qo-name",
				children: /* @__PURE__ */ (0, V.jsx)(pt, {
					text: e.f.name,
					idx: e.m?.name
				})
			}),
			e.fn && /* @__PURE__ */ (0, V.jsxs)("span", {
				className: "qo-fn",
				children: [
					"› ",
					/* @__PURE__ */ (0, V.jsx)(pt, {
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
				children: ht(e.f.module)
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
function bt({ hosts: e, children: t }) {
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
var G = {
	open: !1,
	files: null,
	ready: !1,
	query: "",
	sel: -1,
	recent: []
}, xt = /* @__PURE__ */ new Set();
function St(e, t = !1) {
	if (!Object.keys(e).every((t) => G[t] === e[t]) && (G = {
		...G,
		...e
	}, !t)) for (let e of xt) e();
}
var Ct = (e) => (xt.add(e), () => {
	xt.delete(e);
}), wt = () => G, Tt = null, K = null, Et = null, Dt = null, Ot = 0, kt = !1, At = !1, jt = null, Mt = 0, Nt = () => "prevue.recent:" + (L.st?.header.repo || "");
function Pt() {
	try {
		return JSON.parse(localStorage.getItem(Nt()) || "[]");
	} catch {
		return [];
	}
}
function Ft(e, t = !1) {
	if (!e) return;
	let n = [e, ...Pt().filter((t) => t !== e)].slice(0, 20);
	try {
		localStorage.setItem(Nt(), JSON.stringify(n));
	} catch {}
	St({ recent: n }, t);
}
async function It() {
	let e = ++Mt, t = await M().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === Mt && St(t);
}
function Lt(e = null) {
	if (Tt) {
		if (!G.open) {
			let { sheet: t, curtain: n } = Tt;
			kt = !0, Dt = e && e !== document.body ? e : null, Et?.setAttribute("aria-expanded", "true"), t.hidden = !1, n.hidden = !1, t.classList.remove("closing"), St({
				open: !0,
				query: "",
				sel: -1,
				recent: Pt()
			}), requestAnimationFrame(() => {
				G.open && (n.classList.add("on"), t.classList.add("on"));
			}), It();
		}
		K?.focus({ preventScroll: !0 }), K?.select();
	}
}
function Rt(e = !1, t = !1) {
	if (Ot = 0, !G.open || !Tt) return;
	let { sheet: n, curtain: r } = Tt;
	K && (K.value = "", K.blur()), t && Dt?.isConnected && Dt.focus({ preventScroll: !0 }), Dt = null, St({ open: !1 }), Et?.setAttribute("aria-expanded", "false"), r.classList.remove("on"), n.classList.remove("on"), e ? (n.hidden = !0, r.hidden = !0) : (n.classList.add("closing"), setTimeout(() => {
		G.open || (n.hidden = !0, r.hidden = !0, n.classList.remove("closing"));
	}, 220));
}
function zt() {
	G.open && It();
}
function Bt() {
	let e = Ot = performance.now();
	setTimeout(() => {
		Ot === e && Rt();
	}, 1500);
}
async function Vt(e, { phrase: t, daemonText: n }) {
	let r = e.f, i = L.st, a = e.fn ? e.fn.fn : null;
	if (Ft(r.path, !0), r.path === U(i)) {
		$e(), x(r.path, a), i?.screen === "focus" && i.focus ? (Bt(), P("/viewer/exit")) : (Rt(), f());
		return;
	}
	x(r.path, a), Bt();
	let o = await P("/viewer/open", { file: r.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	o.ok || (Ot = 0, m(), F(n(o.message) || t("open.cannot")));
}
var Ht = (e) => {
	e ? K = e : K && !K.isConnected && (K = null);
}, Ut = (e, t) => St({
	query: e,
	sel: t
}), Wt = (e) => St({ sel: e }), Gt = () => Rt(!1, !0), Kt = (e) => {
	G.open && Tt && e && !Tt.sheet.contains(e) && e !== Et && Rt();
}, qt = (0, B.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, B.useLayoutEffect)(() => {
		if (!n) return;
		Et = n, n.title = t("rail.open.tip"), n.setAttribute("aria-label", t("rail.open.label"));
		let e = (e) => G.open ? Rt(!1, !0) : Lt(e.detail === 0 ? n : null);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), Et = null;
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
function Jt({ state: e, draw: t, connection: n, hosts: r }) {
	let i = s(), a = (0, B.useSyncExternalStore)(Ct, wt);
	(0, B.useLayoutEffect)(() => {
		Tt = r;
		let e = (e) => {
			let t = e.target;
			G.open && !r.sheet.contains(t) && !r.curtain.contains(t) && !Et?.contains(t) && Rt();
		}, t = () => Rt(!1, !0);
		return document.addEventListener("pointerdown", e, !0), r.curtain.addEventListener("click", t), () => {
			document.removeEventListener("pointerdown", e, !0), r.curtain.removeEventListener("click", t), Tt = null;
		};
	}, [r]), (0, B.useLayoutEffect)(() => {
		if (!e) return;
		let t = U(e);
		t && t !== jt && (jt = t, Ft(t)), Ot && e.screen !== "empty" && Rt(!0);
	}, [t]), (0, B.useLayoutEffect)(() => {
		n === "lost" && Rt(!0);
	}, [n]), (0, B.useLayoutEffect)(() => {
		kt ? (r.sheet.classList.add("enter"), kt = !1, At = !0, requestAnimationFrame(() => {
			At = !1;
		})) : At || r.sheet.classList.remove("enter");
	});
	let o = (0, B.useCallback)((e) => Vt(e, i), [i]), c = /* @__PURE__ */ (0, V.jsx)(yt, {
		files: a.files,
		ready: a.ready,
		query: a.query,
		sel: a.sel,
		recent: a.recent,
		fieldRef: Ht,
		onQuery: Ut,
		onSelect: Wt,
		onPick: o,
		onEscape: Gt,
		onLeave: Kt
	});
	return /* @__PURE__ */ (0, V.jsx)(bt, {
		hosts: r,
		children: c
	});
}
// src/components/fit.ts
var Yt = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
function Xt(e) {
	let t = e.match(Yt) || [e], n = "";
	for (let e = t.length - 1; e > 0 && !(n && (t[e] + n).length > 12); e--) n = t[e] + n;
	return n.length >= e.length - 2 ? "" : n;
}
var Zt = null, Qt = (e, t) => (Zt ??= document.createElement("canvas").getContext("2d"), Zt.font = t, Zt.measureText(e).width), $t = (e) => {
	let t = getComputedStyle(e);
	return `${t.fontWeight} ${t.fontSize} ${t.fontFamily}`;
};
function en(e, t, n) {
	if (Qt(e, n) <= t) return e;
	let r = Xt(e), i = r.match(Yt) || [], a = i.map((e, t) => i.slice(t).join(""));
	for (let [r, i] of [...a.map((e) => [e, 3]), [a[a.length - 1] || "", 1]]) for (let a = e.length - r.length - 1; a >= i; a--) {
		let i = e.slice(0, a) + "…" + r;
		if (Qt(i, n) <= t) return i;
	}
	for (let i = 1; i < r.length; i++) {
		let a = e[0] + "…" + r.slice(i);
		if (Qt(a, n) <= t) return a;
	}
	return e[0] + "…";
}
// src/components/FileRail.tsx
var tn = "prevue.sharedOnce", nn = [], rn = matchMedia("(max-width: 640px)"), an = (e) => {}, on = () => document.body.classList.contains("rail-drawer"), sn = () => on() ? (an(!1), !0) : !1, cn = [];
function ln(e) {
	let t = cn.findIndex((e) => e.active), n = cn[Math.max(0, Math.min(cn.length - 1, t + e))];
	n && (n.active ? $e() : P("/viewer/tab", { key: n.key }));
}
function un(e) {
	let t = cn[e - 1];
	t && (t.active ? $e() : P("/viewer/tab", { key: t.key }));
}
var dn = () => cn.length, fn = 56;
function pn(e, t, n = !1) {
	let r = [...t.querySelectorAll(".rt:not(.leaving)")];
	if (!r.length || e.hidden) return;
	let i = (e, t) => e.querySelector(t), a = $t(i(r[0], ".rt-name")), o = $t(i(r[0], ".rt-mod")), s = parseFloat(getComputedStyle(r[0]).columnGap) || 0, c = (t) => t.dataset.name + "|" + i(t, ".rt-mod").textContent + "|" + e.clientWidth, l = r.filter((e) => n || e.dataset.fitted !== c(e));
	if (!l.length) return;
	for (let e of l) i(e, ".rt-mod").style.maxWidth = "0px";
	let u = l.map((e) => i(e, ".rt-name").clientWidth + (i(e, ".rt-mod").textContent ? s : 0));
	l.forEach((e, t) => {
		let n = i(e, ".rt-name"), r = i(e, ".rt-mod"), l = u[t], d = l;
		if (r.textContent) {
			let t = Math.min(Math.ceil(Qt(r.textContent, o)), Math.max(l - s - Math.ceil(Qt(e.dataset.name, a)), fn));
			r.style.maxWidth = t + "px", d = l - s - t;
		} else r.style.maxWidth = "";
		n.textContent = en(e.dataset.name, d, a), e.dataset.fitted = c(e);
	});
}
function mn({ tab: e, leaving: t, enter: n, onGone: r, observe: i }) {
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
	let d = Ae(e.sourceSet), f = () => P("/viewer/close", { key: e.key });
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
			e.active ? (sn(), $e()) : P("/viewer/tab", { key: e.key });
		},
		onAuxClick: (e) => {
			e.button === 1 && (e.preventDefault(), f());
		},
		children: [
			/* @__PURE__ */ (0, V.jsx)(Ne, { kind: d }),
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
function hn({ tabs: e, screen: t, gallery: n = !1, hosts: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(r?.list), [l, u] = (0, B.useState)(null), [d, f] = (0, B.useState)(null), p = r?.rail ?? l, m = r?.empty ?? d, h = (0, B.useRef)(null), g = e ?? nn, _ = t !== "focus", v = (0, B.useRef)(g), [y, b] = (0, B.useState)([]);
	if (v.current !== g) {
		let e = new Set(g.map((e) => e.key)), t = v.current.filter((t) => !e.has(t.key) && !y.some((e) => e.key === t.key));
		(t.length || y.some((t) => e.has(t.key))) && b([...y.filter((t) => !e.has(t.key)), ...t]), v.current = g;
	}
	let x = (e) => b((t) => t.filter((t) => t.key !== e)), S = (0, B.useRef)(!1), C = (0, B.useRef)(null), w = S.current && _ && !ve.matches && !document.hidden, T = (0, B.useRef)({
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
	}, D = (0, B.useRef)(n);
	D.current = n;
	let O = (0, B.useRef)(E);
	O.current = E;
	let [k] = (0, B.useState)(() => new ResizeObserver(() => O.current(T.current.sliding))), ee = (e, t) => {
		e && (t ? k.observe(e) : k.unobserve(e));
	};
	(0, B.useEffect)(() => () => k.disconnect(), [k]), (0, B.useEffect)(() => {
		p && a && document.fonts?.ready.then(() => pn(p, a, !0));
	}, [p, a]), (0, B.useEffect)(() => {
		if (!r) return;
		let { toggle: e, scrim: t, open: n, all: i } = r;
		an = (t) => {
			document.body.classList.toggle("rail-drawer", t), e.setAttribute("aria-expanded", String(t));
		};
		let a = () => an(!on()), o = () => an(!1);
		return e.addEventListener("click", a), t.addEventListener("click", o), n.addEventListener("click", o), i.addEventListener("click", o), rn.addEventListener("change", o), () => {
			e.removeEventListener("click", a), t.removeEventListener("click", o), n.removeEventListener("click", o), i.removeEventListener("click", o), rn.removeEventListener("change", o);
		};
	}, [r]), (0, B.useLayoutEffect)(() => {
		if (!e || !p || !a) return;
		p.hidden = !_, _ || sn(), r && document.body.classList.toggle("rail-on", _), m && (m.hidden = e.length > 0), pn(p, a), cn = e;
		let t = e.find((e) => e.active);
		t && Ae(t.sourceSet) === "kmp" ? ue(tn, () => i("capsule.sharedOnce", { sourceSet: t.sourceSet })) : oe(tn);
		let n = t?.key ?? null, o = S.current && _ && n !== C.current && C.current !== null;
		o && sn(), C.current = n, S.current = _, E(o);
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
	}), A.map(({ tab: e, leaving: t }) => /* @__PURE__ */ (0, V.jsx)(mn, {
		tab: e,
		leaving: t,
		enter: w,
		onGone: x,
		observe: ee
	}, e.key))] });
	return r ? /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [c(j, () => null), /* @__PURE__ */ (0, V.jsx)(qt, { host: r.open })] }) : /* @__PURE__ */ (0, V.jsxs)("nav", {
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
			/* @__PURE__ */ (0, V.jsx)(qt, {})
		]
	});
}
// src/components/ProjectHeader.tsx
var gn = 8, _n = (e) => [...e].reduce((e, t) => e * 31 + t.codePointAt(0) >>> 0, 7) % gn + 1, vn = () => !1, yn = () => vn();
function bn({ header: e, tabs: t, app: n, iconUrl: r = "/app-icon.png", host: i, brand: a }) {
	let { phrase: c } = s(), { element: l, place: u } = o(i), [d, f] = (0, B.useState)(!1), [p, m] = (0, B.useState)(null), h = (0, B.useRef)({
		open: !1,
		byKey: !1
	}), g = (0, B.useRef)(null), _ = (0, B.useRef)(null), v = (0, B.useRef)(null), y = e ? n?.name || e.repoLeaf : "";
	(0, B.useLayoutEffect)(() => {
		a && n?.prevue && (a.title = `Prevue ${n.prevue}`);
	}, [a, n]), (0, B.useLayoutEffect)(() => {
		v.current?.style.setProperty("background", e ? `var(--avatar-${_n(y)})` : "");
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
		vn = () => {
			if (!h.current.open) return !1;
			h.current.open = !1;
			let e = document.activeElement;
			return e && _.current?.contains(e) && (h.current.byKey ? g.current?.focus({ preventScroll: !0 }) : e.blur()), m(null), !0;
		};
		let e = (e) => {
			!_.current?.contains(e.target) && e.target !== g.current && vn();
		};
		return addEventListener("pointerdown", e), () => {
			removeEventListener("pointerdown", e), vn = () => !1;
		};
	}, []);
	let b = (e, t) => {
		navigator.clipboard.writeText(e).then(() => F(c("header.copied", {
			what: t,
			text: e
		})), () => F(e));
	}, x = (e) => {
		vn() || (h.current = {
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
						b(e?.repo || "", c("header.copy.path")), vn();
					},
					children: c("header.dir.copy")
				}), /* @__PURE__ */ (0, V.jsx)("button", {
					type: "button",
					id: "dirReveal",
					hidden: n ? !n.reveal : !1,
					onClick: () => {
						P("/viewer/reveal"), vn();
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
function xn() {
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
var Sn = !1, Cn = null, wn = null, Tn = null, En = () => Sn;
function Dn(e = !Sn, t = !1) {
	if (!wn) return;
	let { scrim: n, sheet: r } = wn;
	e && !Sn && (Cn = t && document.activeElement !== document.body ? document.activeElement : null), Sn = e, e ? (n.hidden = !1, requestAnimationFrame(() => {
		Sn && (n.classList.add("on"), r.focus({ preventScroll: !0 }));
	})) : (n.classList.remove("on"), setTimeout(() => {
		Sn || (n.hidden = !0);
	}, 220), n.contains(document.activeElement) && document.activeElement.blur(), Cn && Cn.isConnected && Cn.focus({ preventScroll: !0 }), Cn = null), Tn?.setAttribute("aria-expanded", String(e));
}
var On = (0, B.memo)(function({ table: e, logo: t = "prevue.svg", host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = (0, B.useRef)(null);
	return (0, B.useLayoutEffect)(() => {
		if (!i || !c.current) return;
		wn = {
			scrim: i,
			sheet: c.current
		};
		let e = (e) => {
			e.target === i && Dn(!1);
		};
		return i.addEventListener("click", e), () => {
			i.removeEventListener("click", e), wn = null;
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
}), kn = (0, B.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, B.useLayoutEffect)(() => {
		if (!n) return;
		Tn = n, n.title = t("header.help.tip"), n.setAttribute("aria-label", t("header.help"));
		let e = (e) => Dn(!Sn, e.detail === 0);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), Tn = null;
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
}), An = Promise.resolve();
async function jn(e, t, n) {
	let r = await P("/viewer/touch", {
		x: t,
		y: n,
		type: e
	});
	r.ok || F(k("input.touch.failed", { status: r.status }));
}
function Mn(e, t, n) {
	An = An.then(() => jn(e, t, n)).catch(() => {});
}
var q = null, Nn = () => !!q;
function Pn(e, t) {
	Ln(), q = [e, t], Mn("press", e, t);
}
function Fn(e, t) {
	q && Math.abs(e - q[0]) + Math.abs(t - q[1]) > 6 && (q = [e, t], Vn(e, t));
}
function In(e, t) {
	q && (q = null, Mn("release", e, t));
}
function Ln() {
	q && In(...q);
}
function Rn() {
	q = null, zn = null;
}
var zn = null, Bn = !1;
function Vn(e, t) {
	zn = [e, t], Bn || (Bn = !0, An = An.then(() => {
		Bn = !1;
		let e = zn;
		return zn = null, e ? jn("drag", e[0], e[1]) : null;
	}).catch(() => {}));
}
var Hn = null;
function Un(e, t, n, r) {
	Hn ? (Hn.dx += n, Hn.dy += r, Hn.x = e, Hn.y = t) : (Hn = {
		x: e,
		y: t,
		dx: n,
		dy: r
	}, An = An.then(() => {
		let e = Hn;
		return Hn = null, P("/viewer/wheel", {
			x: Math.round(e.x),
			y: Math.round(e.y),
			dx: e.dx,
			dy: e.dy
		});
	}).catch(() => {}));
}
// src/workspace/card.ts
var Wn = (e) => ({
	id: String(e.id),
	name: e.name || `${e.fileName}:${e.lineNumber}`
});
function Gn(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = (e) => {
		for (let t = e.ups.length - 1; t >= 0; t--) if (n.has(e.ups[t])) return e.ups[t];
		return null;
	}, i = r(t), a = e.filter((e) => r(e) === i).sort((e, t) => e.id - t.id);
	return {
		ups: t.ups.filter((e) => n.has(e)).map((e) => Wn(n.get(e))),
		here: Wn(t),
		before: a.filter((e) => e.id < t.id).map(Wn),
		after: a.filter((e) => e.id > t.id).map(Wn),
		downs: e.filter((e) => r(e) === t.id).sort((e, t) => e.id - t.id).map(Wn)
	};
}
function Kn(e, t) {
	let [n, r, i, a] = e.bounds, o = t ?? 1;
	return {
		width: (i - n) * o,
		height: (a - r) * o,
		unit: t ? "dp" : "px",
		padded: !!e.mods?.some((e) => e.name === "padding")
	};
}
function qn(e) {
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
function Jn(e, t) {
	if (e.origin === "compose" || e.origin === "library") return e.origin;
	if (e.origin !== "project" || !t || !e.name) return null;
	let n = t.modules.get(e.name);
	return n ? { module: n } : null;
}
function Yn(e, t, n) {
	return !t || !e ? [] : (t.callers.get(e) || []).filter((e) => e.file !== n.file || e.fn !== n.fn);
}
// src/workspace/view.ts
var Xn = Se({
	pct: 100,
	real: !1,
	atFit: !0,
	menu: !1,
	disabled: !1
}), Zn = Se({
	on: !1,
	failed: !1
}), Qn = Se({
	host: null,
	shot: null,
	card: null
}), $n = Se({ on: !1 }), er = (e, t) => e.every((e, n) => e === t[n]);
function tr(e) {
	if (e.modifiers) return e.modifiers;
	for (let t of e.children || []) if (er(t.bounds, e.bounds)) {
		let e = tr(t);
		if (e) return e;
	}
	return null;
}
function nr(e) {
	let t = L.projectFiles.size ? (e) => L.projectFiles.has(e.fileName) : () => !0, n = [], r = (e, i, a, o) => {
		for (let s of e) {
			let { children: e, modifiers: c, ...l } = s, [u, d, f, p] = s.bounds, m = i.concat(s.name ? [s.name] : []), h = s.name && t(s) ? a.concat([s.name]) : a, g = o;
			if (f > u && p > d && s.lineNumber > 0) {
				let e = n.length;
				n.push({
					...l,
					id: e,
					ups: o,
					mods: tr(s),
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
var rr = (e, t) => e.area - t.area || t.chain.length - e.chain.length;
function ir(e) {
	return L.projectFiles.size ? e.filter((e) => L.projectFiles.has(e.fileName)) : e;
}
function ar(e, t, n) {
	return e.find((e) => {
		let [r, i, a, o] = e.bounds;
		return t >= r && t < a && n >= i && n < o;
	});
}
var or = (e) => +(e.dataset.fullW ?? 0) || e.naturalWidth, sr = (e) => +(e.dataset.fullH ?? 0) || e.naturalHeight;
function cr(e, t, n) {
	let r = or(n), i = sr(n);
	return !r || !i ? 0 : Math.min(e / r, t / i);
}
function lr(e) {
	let t = e.getBoundingClientRect();
	return cr(t.width, t.height, e) || 1;
}
function ur(e, t) {
	let n = t.getBoundingClientRect(), r = lr(t) || 1;
	return [Math.round((e.clientX - n.left) / r), Math.round((e.clientY - n.top) / r)];
}
function dr(e, t, n) {
	let [r, i, a, o] = t.bounds;
	e.style.left = r * n + "px", e.style.top = i * n + "px", e.style.width = (a - r) * n + "px", e.style.height = (o - i) * n + "px";
}
function fr(e, t, n) {
	e.hidden = !1, dr(e, t, n);
}
function pr(e, t, n) {
	t ? (dr(e, t, n), e.classList.add("on")) : e.classList.remove("on");
}
function mr(e, t) {
	t.classList.remove("over"), t.classList.contains("peek") || pr(e, null, 1);
}
var hr = /* @__PURE__ */ new WeakMap();
function gr(e, t, n) {
	let r = hr.get(e);
	r && r.list === t && r.s === n || (hr.set(e, {
		list: t,
		s: n
	}), L.projectFiles.size ? e.replaceChildren(...t.map((e) => {
		let t = document.createElement("div");
		return t.className = "ol", dr(t, e, n), t;
	})) : e.replaceChildren());
}
async function _r(e, t, n) {
	let r = ++vr;
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
		if (r !== vr) return;
		i.ref ? br(i.ref, n, i.file) : i.needChoice || n(O(i.message ?? null) || `${e.fileName}:${e.lineNumber}`);
	} catch (e) {
		if (r === vr) {
			let t = e.message;
			n(k("point.failed", { why: t })), F(k("point.failed", { why: t }));
		}
	}
}
var vr = 0, yr = (e) => navigator.clipboard ? navigator.clipboard.writeText(e) : Promise.reject(Error(k("point.noClipboard")));
function br(e, t, n) {
	let r = ++vr, i = () => {
		r === vr && t(k("point.copied", { ref: e }), e, !0, n);
	}, a = () => {
		yr(e).then(i, () => {
			r === vr && t(k("point.copyBlocked", { ref: e }), e, !1, n);
		});
	};
	yr(e).then(i, () => {
		r === vr && t(k("point.copyRetry", { ref: e }), e, !1, n, a);
	});
}
var xr = (e) => {
	e && F(e);
}, Sr = xr, Cr = null, wr = null, Tr = 0;
function Er() {
	Cr = null, wr = null, Tr++;
}
function Dr() {
	if (Cr) return Promise.resolve(Cr);
	let e = Tr;
	return wr ??= M().then((t) => e === Tr ? (wr = null, t.ready ? Cr = qn(t) : null) : null, () => (e === Tr && (wr = null), null));
}
var J = null, Or = /* @__PURE__ */ new WeakMap();
function kr(e) {
	let t = Or.get(e);
	return t || Or.set(e, t = () => e.isConnected ? e.getBoundingClientRect() : null), t;
}
var Ar = () => J?.img ?? null;
function jr(e, t) {
	for (let t of document.querySelectorAll(".box.pick")) t !== e.pick && (t.hidden = !0);
	J && J.hover !== e.hover && pr(J.hover, null, 1), fr(e.pick, t, e.scale()), e.pick.style.animation = "none", e.pick.offsetWidth, e.pick.style.animation = "", J = {
		...e,
		hit: t,
		shot: kr(e.img)
	};
	let n = Mr(t);
	Sr = n, _r(t, e.previewId, n);
}
function Mr(e) {
	let t = J, n = L.projectFiles.size ? Gn(t.list, e) : null, r = {
		msg: null,
		ref: `${e.fileName}:${e.lineNumber}`
	}, i = () => ({
		node: e,
		say: r,
		box: Kn(e, t.dpPerPx),
		tree: n,
		modifiers: e.mods,
		previews: Yn(e.name, Cr, t.seen),
		origin: Jn(e, Cr)
	}), a = () => {
		J?.hit === e && Qn.set({
			host: t.host,
			shot: t.shot,
			card: i()
		});
	};
	return a(), Cr || Dr().then((e) => {
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
function Nr(e) {
	let t = J?.list.find((t) => String(t.id) === e.id);
	J && t && jr(J, t);
}
function Pr(e) {
	if (!J) return;
	let t = e ? J.list.find((t) => String(t.id) === e.id) ?? null : null;
	pr(J.hover, t, J.scale()), t && gr(J.marks, J.list, J.scale()), J.marks.classList.toggle("peek", !!t);
}
async function Fr(e) {
	Y();
	let t = L.st;
	if (x(e.file, e.fn), e.file === U(t)) {
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
function Y() {
	for (let e of document.querySelectorAll(".box.pick")) e.hidden = !0;
	J && (pr(J.hover, null, 1), J.marks.classList.remove("peek")), J = null, Qn.set({
		host: null,
		shot: null,
		card: null
	}), Sr = xr, vr++;
}
function Ir() {
	return J ? (Y(), !0) : !1;
}
function Lr() {
	addEventListener("pointerdown", (e) => {
		if (!J || e.button !== 0) return;
		let t = e.target;
		t?.closest && t.closest("main") && !t.closest(".point-card, .cstage, #stage") && Y();
	}, !0);
}
async function Rr(e) {
	let t = await P("/viewer/choose", { path: e }).then((e) => e.json()).catch(() => ({}));
	t.ref && br(t.ref, Sr, t.file);
}
function zr() {
	P("/viewer/cancel");
}
var Br = 8, Vr = 16;
function Hr(e) {
	let t = document.documentElement, n = t.clientWidth, r = t.clientHeight, i = e.offsetWidth, a = e.offsetHeight, o = document.querySelector(".pc-float:not([data-leaving]) .pc-head"), s = o && o.getClientRects().length && getComputedStyle(o).visibility !== "hidden" ? o.getBoundingClientRect() : null, c, l, u = !1;
	s ? (c = s.left, l = s.bottom + Br, l + a > r - Vr && s.top - Br - a >= Vr && (l = s.top - Br - a, u = !0)) : (c = (n - i) / 2, l = document.getElementById("bar").getBoundingClientRect().bottom + Vr), c = Math.max(Vr, Math.min(c, n - i - Vr)), l = Math.max(Vr, Math.min(l, r - a - Vr));
	let d = Math.round(c) + "px", f = Math.round(l) + "px";
	e.style.left !== d && (e.style.left = d), e.style.top !== f && (e.style.top = f), e.classList.toggle("up", u);
}
var Ur = !1;
function Wr(e) {
	if (Hr(e), Ur) return;
	Ur = !0;
	let t = () => {
		e.classList.contains("on") ? (Hr(e), requestAnimationFrame(t)) : Ur = !1;
	};
	requestAnimationFrame(t);
}
function Gr(e, { stage: t, img: n, box: r, pick: i, marks: a }, o) {
	let s = null, c = !1, l = async () => {
		let t = Ve(L.st?.board, e);
		if (!t || !t.ok || !t.treeUrl) return null;
		let n = D.get(t.treeUrl);
		if (n) return s = n, s;
		try {
			s = ir(nr((await te(t.treeUrl).then((e) => e.json())).composeViewInfo || []).sort(rr)), D.set(t.treeUrl, s);
		} catch {
			s = null;
		}
		return s;
	};
	t.addEventListener("mouseenter", () => {
		s = null, c = !0, a.classList.add("over"), l().then((e) => {
			e && c && gr(a, e, lr(n));
		});
	}, { signal: o }), t.addEventListener("mouseleave", () => {
		c = !1, mr(r, a);
	}, { signal: o }), n.addEventListener("mousemove", (e) => {
		s && pr(r, ar(s, ...ur(e, n)) ?? null, lr(n));
	}, { signal: o }), n.addEventListener("load", () => {
		s = null, J?.img === n && Y();
	}, { signal: o }), o.addEventListener("abort", () => {
		J?.img === n && Y();
	}), n.addEventListener("click", async (o) => {
		C(e);
		let c = s || await l();
		if (!c) return;
		let u = ar(c, ...ur(o, n));
		if (!u) {
			J?.img === n && Y();
			return;
		}
		let d = Ve(L.st?.board, e), f = or(n);
		jr({
			list: c,
			img: n,
			hover: r,
			pick: i,
			marks: a,
			host: document.getElementById("boardView"),
			scale: () => lr(n),
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
var Kr = [
	"statusBars",
	"navigationBars",
	"captionBar",
	"displayCutout",
	"systemOverlays"
], qr = [
	"top",
	"right",
	"bottom",
	"left"
];
function Jr(e, t) {
	let n = t === "top" || t === "bottom";
	return e === "displayCutout" ? n ? "left" : "top" : n ? "right" : "bottom";
}
var Yr = (e) => !!e && Kr.some((t) => qr.some((n) => Jr(t, n) === "bottom" && e.values[t][n] > 0)), Xr = (e) => e ? e.kind === "device" ? `${e.device}:${e.folded ? "cover" : "open"}${e.landscape ? ":rot" : ""}${e.orientation === "landscape-right" ? ":right" : ""}` : e.preset || `custom:${e.widthDp}x${e.heightDp}` : "original";
function Zr(e, t, n) {
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
function Qr({ root: e, geometry: t, shot: n, stage: r, wrap: i, layout: a, dimensions: o, originalSize: s, zoomState: c, preparation: l, firstFrame: u }) {
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
	let A = (e) => (T.has(e.src) || T.set(e.src, Zr(e, e.naturalWidth, e.naturalHeight)), T.get(e.src)), j = we(e, {
		request: (e) => {
			if (S) return Promise.resolve(!1);
			let [t, n, ...r] = e.split(":"), i = j.devices.has(t) ? {
				device: t,
				folded: n === "cover",
				orientation: r.includes("right") ? "landscape-right" : j.sizeOf(e).w > j.sizeOf(e).h ? "landscape-left" : "portrait"
			} : { size: e.startsWith("custom:") ? e.slice(7) : e };
			return O(i);
		},
		insetOn: () => $n.get().on,
		insetBelow: () => Yr(m?.deviceInsets),
		layout: (t, n) => {
			if (!f) return;
			let i = c();
			d && i.z !== 1 && (i.x += (1 - i.z) * (d.cx - d.w / 2 - (t.cx - t.w / 2)), i.y += (1 - i.z) * (d.y - t.y)), d = t, a(t), ce(), r.classList.toggle("resize-hidden", n || !b && !S), e.classList.toggle("await-live", !b);
		}
	});
	$n.subscribe(() => {
		f && j.relayout(!0);
	});
	function M(t, r = !1) {
		S = t, e.classList.toggle("preparing", t), n.setAttribute("aria-busy", String(t && !r)), Zn.set({
			on: t,
			failed: r
		});
		for (let n of e.querySelectorAll("input")) n.disabled = t;
		j.dock.lock(t), l(t, r);
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
				edge: Zr(e, e.width, e.height)
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
			sel: Xr(t),
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
		let d = Xr(a.size), w = !!m && d !== h;
		w && (te(), x = !0, b = !1, r.classList.add("resize-hidden"));
		let T = m;
		m = a, h = d;
		let E = !w && !!T && Yr(T.deviceInsets) !== Yr(a.deviceInsets);
		T && !w && a.imageUrl !== T.imageUrl && j.clearImages();
		for (let e of a.postures || []) {
			let t = v;
			ne(e.imageUrl).then((n) => {
				f && t === v && m?.postures?.some((t) => t.imageUrl === e.imageUrl) && j.image(Xr(e.size), N(n, e.size));
			}).catch(() => {});
		}
		if (y && j.update(ae(a), !T), E && $n.get().on && j.relayout(!0), c) return b = !1, _ = g = null, n.onload = null, n.removeAttribute("src"), M(!0, !0), r.classList.remove("resize-hidden"), !0;
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
function $r() {
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
function ei({ focusView: e, wrap: t, stage: n, shot: r, box: i, pickBox: a, marks: o, scene: s, insetMarks: c, geometry: l, panel: u, header: d }) {
	let f = [], p = [], m = !1;
	function h() {
		m && (p = ir(f));
	}
	function g() {
		if (e.hidden) return;
		let n = getComputedStyle(document.documentElement), r = parseInt(n.getPropertyValue("--cap-room")) || 76, i = document.body.classList.contains("resizing-ui"), a = window.innerHeight - t.getBoundingClientRect().top - (i ? 0 : r + 16), o = parseInt(n.getPropertyValue("--stage-min-h")) || 260, s = Math.max(o, Math.round(a));
		document.documentElement.style.setProperty("--view-h", s + "px");
		let c = getComputedStyle(t), l = s - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
		document.documentElement.style.setProperty("--stage-max-h", l + "px"), W.relayout(), t.classList.contains("resize-wrap") || x(l - 2), H(), T();
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
			f = nr(t.composeViewInfo || []).sort(rr), p = ir(f), le(L.projectFiles.size ? "" : k("focus.noIndex", { n: f.length })), m = !0, pr(i, null, 1), a.hidden = !0, Ar() === r && Y();
		} catch (e) {
			ce(k("focus.tree.failed", { why: e.message }), "error");
		}
	}
	function A(e) {
		let t = !!(e && e.interactive);
		if (t || Rn(), u.hidden = !e, e || U(), n.classList.toggle("live", t), ke = e && e.pxPerDp || null, e && e.previewId === Ee || (W.disable(), Ee = e ? e.previewId : null, _ = v = 0, delete r.dataset.fullW, delete r.dataset.fullH, r.style.width = "", Ne(1, 0, 0, !1)), !e) {
			j?.entering && ie(), W.disable(), r.hasAttribute("src") && (r.removeAttribute("src"), r.dataset.url = "");
			for (let e of n.querySelectorAll("img.ghost")) e.remove();
			return;
		}
		let i = L.st;
		if (n.style.cursor = t ? "pointer" : "crosshair", e.treeUrl !== E && O(e.treeUrl), W.update(e, i.error)) return;
		Ne(z.z, z.x, z.y, !1);
		let a = t ? e.streamUrl ? re(e.streamUrl) : Ve(i.board, i.board?.focus)?.imageUrl || "" : e.imageUrl;
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
			ready: !W.preparing(),
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
		W.suspend(), N(!1, I("--duration-short2"));
		let u = y() && r.naturalWidth ? me(r) : null;
		Promise.all([u, new Promise((e) => setTimeout(e, I("--duration-short2")))]).then(() => {
			n.style.setProperty("--z", "1");
			let e = ii(n);
			n.style.removeProperty("--z"), l(), s() ? be(() => {
				t(), N(!0, 0);
				let n = a(), r = n && ii(n);
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
	let Ce = (e) => ur(e, r), R = () => !!(L.st && L.st.focus && L.st.focus.interactive), we = () => {
		Ar() === r && Y();
	}, Te = (e) => !R() || e.altKey;
	n.addEventListener("mousemove", (e) => {
		let t = m && Te(e);
		o.classList.toggle("over", t), t && gr(o, p, B()), pr(i, t ? ar(p, ...Ce(e)) ?? null : null, B());
	}), n.addEventListener("mouseleave", () => mr(i, o)), n.addEventListener("mousedown", (e) => {
		e.button !== 0 || W.moving() || (De || !R() && z.z > 1 && !e.altKey ? Ge(e) : R() && !e.altKey && (e.preventDefault(), we(), Pn(...Ce(e))));
	}), window.addEventListener("mousemove", (e) => {
		Nn() && Fn(...Ce(e));
	}), window.addEventListener("mouseup", (e) => {
		Nn() && In(...Ce(e));
	}), n.addEventListener("click", async (t) => {
		if (W.moving()) return;
		if (Oe) {
			Oe = !1;
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
		let n = ar(p, ...Ce(t));
		if (!n) {
			Ar() === r && Y();
			return;
		}
		let s = L.st, c = s.focus, l = s.board;
		jr({
			list: p,
			img: r,
			hover: i,
			pick: a,
			marks: o,
			host: e,
			scale: B,
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
	}, Ee = null, De = !1, Oe = !1, ke = null;
	function B() {
		return cr(r.offsetWidth, r.offsetHeight, r) || 1;
	}
	function V() {
		let e = W.pxPerDp();
		return e ? 1 / e : ke && (_ || r.naturalWidth) ? 1 / (B() * ke) : null;
	}
	let Ae = () => Math.min(1, V() || 1), je = () => Math.max(8, (V() || 1) * 4);
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
		W.preparing() || ([z.z, z.x, z.y] = Me(Math.min(je(), Math.max(Ae(), e)), r, i), n.classList.toggle("zoom-anim", !!a), n.style.transform = W.zoom(a) || z.z === 1 ? "" : `translate(${z.x}px, ${z.y}px) scale(${z.z})`, t.style.setProperty("--z", String(z.z)), n.classList.toggle("zoomed", z.z > 1), H(), T());
	}
	function H() {
		let e = V();
		Xn.set({
			pct: Math.round((e ? z.z / e : z.z) * 100),
			real: !!e,
			atFit: z.z === 1
		});
	}
	function Pe(e, t, r, i) {
		let a = n.getBoundingClientRect(), o = a.left - z.x, s = a.top - z.y, c = (t - a.left) / z.z, l = (r - a.top) / z.z, u = Math.min(je(), Math.max(Ae(), e));
		Ne(u, t - o - c * u, r - s - l * u, i);
	}
	function Fe(e) {
		let n = t.getBoundingClientRect();
		Pe(e, n.left + n.width / 2, n.top + n.height / 2, !0);
	}
	let Ie = (e) => Fe(z.z * e), Le = () => Ie(1.25), Re = () => Ie(1 / 1.25), ze = () => Ne(1, 0, 0, !0), Be = !1;
	function U() {
		if (!Xn.get().menu) return !1;
		Xn.set({ menu: !1 });
		let e = document.getElementById("zoomMenu"), t = document.activeElement;
		return e && t && e.contains(t) && (Be ? document.getElementById("zoomPct")?.focus({ preventScroll: !0 }) : t.blur()), !0;
	}
	function He(e) {
		let t = !Xn.get().menu;
		t && (Be = e), Xn.set({ menu: t });
	}
	function Ue(e) {
		U(), e === "fit" ? ze() : Fe((V() || 1) * Number(e));
	}
	addEventListener("pointerdown", (e) => {
		let t = document.getElementById("zoomCtl");
		t && t.contains(e.target) || U();
	}), addEventListener("resize", () => {
		g(), Ne(z.z, z.x, z.y, !1);
	}), r.addEventListener("load", () => {
		b(), g();
	}), t.addEventListener("wheel", (t) => {
		e.hidden || (t.ctrlKey || t.metaKey ? (t.preventDefault(), Pe(z.z * Math.exp(-t.deltaY * .01), t.clientX, t.clientY, !1)) : R() ? (t.preventDefault(), W.moving() || (we(), We(t))) : z.z > 1 && (t.preventDefault(), Ne(z.z, z.x - t.deltaX, z.y - t.deltaY, !1)));
	}, { passive: !1 });
	function We(e) {
		let n = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? t.clientHeight : 1, i = B() * z.z || 1, [a, o] = Ce(e);
		Un(Math.max(0, Math.min(_ || r.naturalWidth, a)), Math.max(0, Math.min(v || r.naturalHeight, o)), e.deltaX * n / i, e.deltaY * n / i);
	}
	function Ge(e) {
		e.preventDefault();
		let t = e.clientX, r = e.clientY, i = z.x, a = z.y;
		n.classList.add("panning");
		let o = (e) => {
			Math.abs(e.clientX - t) + Math.abs(e.clientY - r) > 3 && (Oe = !0), Ne(z.z, i + e.clientX - t, a + e.clientY - r, !1);
		}, s = () => {
			n.classList.remove("panning"), removeEventListener("mousemove", o), removeEventListener("mouseup", s);
		};
		addEventListener("mousemove", o), addEventListener("mouseup", s);
	}
	let Ke = (e) => !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
	addEventListener("keydown", (t) => {
		let r = t.target;
		t.code !== "Space" || e.hidden || Ke(r) || r?.closest && r.closest("button, [role=button]") || (t.preventDefault(), De || (De = !0, n.classList.add("grab")));
	}), addEventListener("keyup", (e) => {
		e.code === "Space" && (De = !1, n.classList.remove("grab"));
	}), addEventListener("blur", () => {
		De = !1, n.classList.remove("grab"), Ln();
	});
	let W = Qr({
		root: s,
		geometry: l,
		shot: r,
		stage: n,
		wrap: t,
		zoomState: () => z,
		preparation(e, t) {
			t && se(), Xn.set({ disabled: e }), e && U();
		},
		firstFrame: ue,
		originalSize() {
			let e = Ve(L.st?.board, L.st?.board?.focus);
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
			if (clearTimeout(C), W.suspend(), !y()) return;
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
		zoomMenuPick: Ue,
		toggleZoomMenu: He,
		closeZoomMenu: U,
		closeDeviceMenu: () => W.closeMenu(),
		dock: W.dock
	};
}
var ti = (e) => e && e.naturalWidth ? e.naturalWidth / e.naturalHeight : 0, ni = /* @__PURE__ */ new Map();
function ri(e) {
	let t = e?.dataset.still;
	if (!t) return null;
	if (!ni.has(t)) {
		let e = new Image();
		e.src = t, ni.set(t, e), ni.size > 8 && ni.delete(ni.keys().next().value);
	}
	return ni.get(t);
}
function ii(e) {
	if (!e) return null;
	let t = e.querySelector("img"), n = getComputedStyle(e), r = t && t.getAttribute("src") || "";
	return {
		el: e,
		rect: e.getBoundingClientRect(),
		radius: _e(n),
		shadow: n.boxShadow,
		url: t ? r.startsWith("/stream") ? t.dataset.still || "" : t.currentSrc || r : "",
		ratio: ti(t) || ti(ri(t))
	};
}
function ai(e) {
	P("/viewer/focus", { index: e }).catch((e) => ce(k("focus.enter.failed", { why: e.message }), "error"));
}
function oi() {
	L.st && L.st.focus && P("/viewer/exit");
}
function si(e) {
	P("/viewer/systemUi", { systemUi: e }).catch((e) => F(k("request.failed", { why: e.message })));
}
// src/session.ts
var ci = () => document.getElementById("boardView"), li, ui = null;
function di(e) {
	return ui && !e.error && e.screen === "focus" && e.focus?.previewId === ui.id && (e.busy || !e.focus.streamUrl || e.focus.streamUrl === ui.stream && e.focus.imageUrl === ui.image) ? !0 : (ui = null, !1);
}
var fi = /* @__PURE__ */ new Map(), pi = null, mi = {
	wasBoard: !1,
	arrive: !1,
	file: null
};
function hi(e) {
	let t = !ci().hidden, n = e.board ? e.board.file : null;
	t && pi && (e.screen !== "board" || n !== pi) && fi.set(pi, scrollY), mi = {
		wasBoard: t,
		arrive: e.screen === "board" && (!t || n !== pi),
		file: n
	}, pi = n;
}
function gi(e) {
	let { wasBoard: t, arrive: n, file: r } = mi;
	li.render(e.screen === "focus" ? e.focus : null), li.syncHistory(e), se(O(e.error)), li.fitStage(), n ? scrollTo(0, fi.get(r) || 0) : t && e.screen !== "board" && scrollTo(0, 0), f();
}
var _i = (e) => {}, vi = (e) => {
	let t = (e.tabs || []).find((e) => e.active);
	return t ? t.key : null;
};
function yi(e, t, n) {
	let r = (t) => {
		let n = e.tabs.findIndex((e) => e.key === t);
		return n < 0 ? e.tabs.length : n;
	};
	return Math.sign(r(n) - r(t));
}
var bi = (e) => e?.screen === "focus" && e.focus?.interactive ? `${vi(e)} ${e.board?.focus ?? ""} ${e.focus.previewId}` : null, xi = !1;
function Si(e) {
	if (L.st && e.version <= L.st.version) return;
	let t = L.st;
	if (t?.focus?.interactive && e.focus?.interactive && t.focus.previewId === e.focus.previewId && JSON.stringify(t.focus.size) !== JSON.stringify(e.focus.size) && (ui = {
		id: e.focus.previewId,
		stream: t.focus.streamUrl,
		image: t.focus.imageUrl
	}), L.st = e, bi(t) !== bi(e) && $n.set({ on: !1 }), xe()) {
		xi = !0;
		return;
	}
	let n = t && t.screen, r = e.screen, i = t && vi(t) && vi(e) && vi(t) !== vi(e);
	t && (i || n !== r || t.board && e.board && t.board.focus !== e.board.focus && r === "focus") && Y();
	let a = () => {
		xi && (xi = !1, _i(L.st));
	}, o = () => L.st;
	if (i) {
		let n = document.documentElement;
		n.style.setProperty("--tab-dir", String(yi(t, vi(t), vi(e)))), n.classList.add("vt-tab"), be(() => _i(o()), a), setTimeout(() => n.classList.remove("vt-tab"), 500);
	} else if (n === "board" && r === "focus") {
		let t = e.board ? ii(g(h(e.board.focus))) : null;
		be(() => {
			_i(o()), li.morphIn(t);
		}, a, { workspace: !0 });
	} else if (n === "focus" && r === "board") {
		let e = null;
		li.morphOut(() => _i(o()), a, () => g(e = o().screen === "board" ? b(o().board.focus) : null), () => S(e), () => o().screen === "board");
	} else n === "focus" && r === "focus" && t.board && e.board && t.board.focus !== e.board.focus ? be(() => _i(o()), a, { workspace: !0 }) : _i(e);
}
var Ci = 0, wi = () => {
	let e = ++Ci;
	N().then((t) => {
		e === Ci && (L.projectFiles = new Map(Object.entries(t.files || {})), _(), li.renarrow());
	}).catch(() => {});
}, Ti = !1, Ei = () => {}, Di = null, Oi = () => {
	Di?.fail(k("prep.lost")), ce(k("status.lost"), "error"), Ei("lost"), L.st = null;
}, ki = 6e4, Ai = !1, ji = 0, Mi = 0, Ni = null, Pi = (e) => !e.busy && !(e.board?.groups || []).some((e) => e.cards.some((e) => !e.rendered));
function Fi() {
	Ai = !0, Ei("restarting"), clearTimeout(ji), ji = window.setTimeout(Oi, ki);
}
function Ii(e) {
	if (Ai) {
		if (e.boot === Ni) return;
		Mi ||= (clearTimeout(ji), window.setTimeout(() => location.reload(), ki)), Pi(e) && location.reload();
	} else Ni && e.boot !== Ni ? location.reload() : (Ni = e.boot, Si(e));
}
function Li({ workspace: e, render: t, onConnection: n, onPreviewFiles: r, prepared: i = null }) {
	li = e, _i = (e) => {
		hi(e), t(e, di(e));
	}, Ei = n, Di = i, ee({
		open: () => {
			Ti && !Ai ? location.reload() : Ti || wi();
		},
		state: Ii,
		ui: (e) => {
			e.kind === "flash" ? F(O(e.text ?? null)) : e.kind === "previewFiles" ? r() : e.kind === "projectFiles" ? wi() : e.kind === "restart" && !Di && Fi();
		},
		error: () => {
			Ti = !0, Ai || Oi();
		}
	});
}
// src/shortcuts.ts
function Ri(e, t) {
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
					run: (e) => (Bi(e) === "+" ? t.zoomIn : t.zoomOut)()
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
					run: (e) => t.jumpTab(Number(Bi(e)))
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
function zi(e) {
	return e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
}
function Bi(e) {
	return e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") ? "⇧" + e.key : /^Digit[1-9]$/.test(e.code) && !e.shiftKey ? e.code.slice(5) : e.code === "KeyI" ? "i" : e.code === "Slash" && e.shiftKey ? "?" : e.code === "Equal" ? "+" : e.code === "Minus" ? "-" : e.code === "Digit0" ? "0" : e.key;
}
function Vi(e, t, n) {
	let r = (r) => {
		if ((r.metaKey || r.ctrlKey) && !r.altKey && !r.shiftKey && r.code === "KeyK" && t.screen() !== "offline") {
			r.preventDefault(), n.sheetOpen() || t.openQuickOpen(document.activeElement);
			return;
		}
		if (r.metaKey || r.ctrlKey || r.altKey || zi(r.target)) return;
		let i = Bi(r), a = i === "Enter" && r.target instanceof Element && r.target.closest("button, [role=button]");
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
var Hi = n(), Ui = r();
function Wi({ pending: e, host: t }) {
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
// src/gallery/cards.ts
var Gi = (e) => e.rel.slice(e.rel.lastIndexOf("/") + 1).replace(/\.kts?$/, ""), Ki = (e) => e.rel.match(/(?:^|\/)src\/[^/]+\/(?:java|kotlin)\/(.+)\/[^/]+$/)?.[1].split("/") ?? [];
function qi(e) {
	let t = e.map(Ki).filter((e) => e.length);
	return t.length ? t.reduce((e, t) => {
		let n = 0;
		for (; n < e.length && n < t.length && e[n] === t[n];) n++;
		return e.slice(0, n);
	}) : [];
}
function Ji(e, t) {
	let n = Ki(e);
	return n.length ? n.slice(t.length).join(".") || n.join(".") : e.rel.includes("/") ? e.rel.slice(0, e.rel.lastIndexOf("/")) : "";
}
function Yi(e) {
	let t = (e || "").split(":").filter(Boolean);
	for (; t.length > 1 && (t.at(-1) === "impl" || t.at(-1) === "api");) t.pop();
	return t.join("/");
}
function Xi(e, t, n, r) {
	let i = Math.round((t - e) / 6e4);
	return i < 60 ? n("gallery.ago.minutes", { n: Math.max(i, 1) }) : i < 1440 ? n("gallery.ago.hours", { n: Math.round(i / 60) }) : i < 20160 ? n("gallery.ago.days", { n: Math.round(i / 1440) }) : new Date(e).toLocaleDateString(r, {
		month: "short",
		day: "numeric"
	});
}
var Zi = (e) => [...e].sort((e, t) => t.mtime - e.mtime || e.rel.localeCompare(t.rel)), Qi = (e) => `${e.mtime} ${e.path}`, $i = { status: "idle" };
function ea(e, t = 1) {
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
			r.delete(e) && c(e, $i);
		},
		lost(e, t, r) {
			a.has(e) || n.get(e)?.status !== "done" || (a.add(e), c(e, $i), u(e, t, r));
		},
		pause(e) {
			s = e, e || l();
		},
		get: (e) => n.get(e) ?? $i,
		subscribe(e) {
			return i.add(e), () => {
				i.delete(e);
			};
		}
	};
}
// src/components/GallerySheet.tsx
var ta = 3, na = 1.5, ra = 420, ia = 640, aa = 16, oa = 10 / 16, sa = 40, ca = 1.2;
function la(e, t) {
	return (e.startsWith(t) ? e.slice(t.length) : e).replace(/^Preview/, "").replace(/Preview$/, "").replace(/^_+|_+$/g, "");
}
function ua(e, t, n) {
	let r = e.status === "done" || e.status === "error" ? e.sheets : t.functions.length, i = Math.min(ta, Math.max(1, r, n?.sheets.length ?? 0)), a = Gi(t);
	return Array.from({ length: i }, (r, i) => {
		let o = n?.sheets[i];
		return {
			shot: i === 0 && e.status === "done" ? e.image : o?.image ?? (n || i === 0 && e.status === "error" ? "failed" : null),
			label: o ? o.variant ?? la(o.name, a) : n ? "" : la(t.functions[i] ?? "", a)
		};
	});
}
var da = () => /* @__PURE__ */ (0, V.jsx)("svg", {
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
}), fa = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M2 4.5V12.5h12V5.5H8L6.5 4H2z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), pa = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), ma = (e) => e.bottom > 0 && e.top < innerHeight && e.right > 0 && e.left < innerWidth && e.width > 0, X = (e) => e?.getBoundingClientRect() ?? null, ha = (e, t) => [{
	transformOrigin: "top left",
	transform: `translate(${e.left - t.left}px, ${e.top - t.top}px) scale(${e.width / t.width}, ${e.height / t.height})`
}, {
	transformOrigin: "top left",
	transform: "none"
}], ga = (e, t) => [{ transform: `translate(${e}px, ${t}px)` }, { transform: "none" }];
function _a(e, t) {
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
function va(e, t) {
	let n = (e) => t.querySelector(e), r = X(e.querySelector(".gcard-hit")), i = X(e.querySelector(".gcard-cover")), a = X(n(".gsheet-shell")), o = X(n(".gsheet-mediabg")), s = [{
		el: n(".gsheet-shell"),
		kf: ha(r, a)
	}, {
		el: n(".gsheet-mediabg"),
		kf: ha(i, o)
	}], c = X(e.querySelector(".gcard-shot"));
	c && t.querySelectorAll(".gsheet-shot").forEach((e) => s.push({
		el: e,
		kf: e.querySelector("img") ? _a(c, X(e)) : ha(c, X(e))
	}));
	let l = (t, r) => {
		let i = X(e.querySelector(r)), a = X(n(t));
		return i && a ? [i.left - a.left, i.top - a.top] : [0, 0];
	}, u = (r, i) => {
		let a = n(r), o = e.querySelector(i);
		if (!o) return;
		let c = X(o), l = X(a), u = o.cloneNode(!0);
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
	ya(t), u(".gsheet-file", ".gcard-file"), t.querySelectorAll(".gsheet-cap").forEach((e) => s.push({
		el: e,
		kf: [{}, {}],
		fade: !0
	}));
	let d = t.querySelector(".gcard-count"), f = e.querySelector(".gcard-count");
	d && s.push(f ? {
		el: d,
		kf: ga(X(f).left - X(d).left, X(f).top - X(d).top)
	} : {
		el: d,
		kf: [{}, {}],
		fade: !0
	});
	let [p, m] = l(".gsheet-info", ".gcard-info");
	s.push({
		el: n(".gsheet-info"),
		kf: ga(p, m)
	}), u(".gsheet-pkgrow", ".gcard-pkgrow");
	let h = t.querySelector(".gsheet-mod");
	if (h) {
		let [e, t] = l(".gsheet-mod", ".gcard-mod");
		s.push({
			el: h,
			kf: ga(e, t)
		});
	}
	return s.push({
		el: n(".gsheet-go"),
		kf: ga(r.right - a.right, r.bottom - a.bottom),
		fade: !0
	}), s;
}
var ya = (e) => e.parentElement?.querySelectorAll(".gsheet-ghost").forEach((e) => e.remove()), ba = (e) => e.slice().reverse().map((e, t, n) => ({
	...e,
	offset: e.offset == null ? n.length === 1 ? 1 : t / (n.length - 1) : 1 - e.offset
}));
function xa(e) {
	let t = [];
	for (let n = e; n && n !== document.body; n = n.parentElement) for (let e of n.parentElement?.children ?? []) e === n || e.hasAttribute("inert") || e.tagName === "SCRIPT" || (e.setAttribute("inert", ""), e.setAttribute("data-sheet-inert", ""), t.push(e));
	return t;
}
function Sa(e) {
	if (e.key !== "Tab") return;
	let t = [...e.currentTarget.querySelectorAll("button")], n = t[(t.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + t.length) % t.length];
	n && (e.preventDefault(), n.focus());
}
var Ca = (e) => document.querySelector(`#galleryView .gcard-slot[data-path="${CSS.escape(e)}"] .gcard`);
function wa({ file: e, text: t, view: n, closing: r, onClose: i, onClosed: a, onOpen: o }) {
	let { phrase: c } = s(), l = (0, B.useRef)(null), [u, d] = (0, B.useState)(null), [f, p] = (0, B.useState)(null), m = ua(n, e, u), h = m.map((e) => e.shot && e.shot !== "failed" ? e.shot : n.status === "done" ? n.image : null).every((e) => e && e.w > e.h * ca) ? "col" : "row", g = n.status === "done" ? n.sheets : 0;
	return (0, B.useEffect)(() => {
		let t = !0;
		return j(e.path).then((e) => e ?? { sheets: [] }, () => ({ sheets: [] })).then((e) => {
			t && d(e);
		}), () => {
			t = !1;
		};
	}, [e.path]), (0, B.useLayoutEffect)(() => {
		let t = document.documentElement, n = document.body, r = [
			t.style.overflow,
			n.style.overflow,
			t.style.scrollbarGutter
		];
		t.style.scrollbarGutter = "stable", t.style.overflow = n.style.overflow = "hidden";
		let i = xa(l.current.parentElement), a = Ca(e.path)?.getBoundingClientRect(), o = l.current, s = Math.min(ia, Math.max(ra, (a?.width ?? ra) * na), innerWidth - 32), c = `${Math.round(s * oa - sa)}px`;
		o.style.width = `${s}px`, o.style.setProperty("--stage-h", c);
		let u = o.offsetHeight, d = a ? a.left + a.width / 2 : innerWidth / 2, f = a ? a.top + a.height / 2 : innerHeight / 2;
		return p({
			width: s,
			left: Math.min(Math.max(aa, d - s / 2), innerWidth - s - aa),
			top: Math.max(aa, Math.min(f - u / 2, innerHeight - u - aa)),
			"--stage-h": c
		}), () => {
			t.style.overflow = r[0], n.style.overflow = r[1], t.style.scrollbarGutter = r[2], i.forEach((e) => {
				e.removeAttribute("inert"), e.removeAttribute("data-sheet-inert");
			});
			let a = Ca(e.path);
			a && (a.style.visibility = ""), l.current && ya(l.current);
		};
	}, []), (0, B.useLayoutEffect)(() => {
		if (!f) return;
		let t = Ca(e.path), n = l.current, r = I("--duration-long3"), i = ge("--easing-spring"), a = I("--duration-medium2");
		if (n.parentElement.querySelector(".gsheet-scrim").animate([{ opacity: 0 }, { opacity: 1 }], { duration: a }), n.querySelector(".gsheet-go")?.focus({ preventScroll: !0 }), !t || ve.matches || !ma(t.getBoundingClientRect())) {
			n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: a });
			return;
		}
		let o = [];
		for (let e of va(t, n)) o.push(e.el.animate(e.kf, {
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
			ya(n), n.getAnimations({ subtree: !0 }).forEach((e) => {
				e.effect?.getKeyframes().some((e) => "opacity" in e) && e.cancel();
			});
		}).catch(() => void 0);
	}, [f]), (0, B.useLayoutEffect)(() => {
		if (!r) return;
		let t = Ca(e.path), n = l.current, i = !0, o = () => {
			i && (n.parentElement.style.visibility = "hidden", document.querySelectorAll("[data-sheet-inert]").forEach((e) => {
				e.removeAttribute("inert"), e.removeAttribute("data-sheet-inert");
			}), t && (t.style.visibility = "", t.querySelector(".gcard-hit")?.focus({ preventScroll: !0 })), a());
		}, s = I("--duration-long1"), c = ge("--easing-standard"), u = I("--duration-short2");
		n.parentElement.getAnimations({ subtree: !0 }).forEach((e) => e.cancel()), n.contains(document.activeElement) && document.activeElement.blur(), ya(n), n.classList.add("closing");
		let d = [n.parentElement.querySelector(".gsheet-scrim").animate([{ opacity: 1 }, { opacity: 0 }], {
			duration: s,
			easing: c,
			fill: "forwards"
		})];
		if (t && !ve.matches && ma(t.getBoundingClientRect())) for (let e of va(t, n)) d.push(e.el.animate(ba(e.kf), {
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
			"data-cap": m.some((e) => e.label) || void 0,
			style: f ?? { visibility: "hidden" },
			onKeyDown: Sa,
			children: [
				/* @__PURE__ */ (0, V.jsx)("span", { className: "gsheet-shell" }),
				/* @__PURE__ */ (0, V.jsx)("span", { className: "gsheet-mediabg" }),
				/* @__PURE__ */ (0, V.jsxs)("div", {
					className: "gsheet-stage",
					"data-flow": h,
					style: { "--k": m.length },
					children: [m.map((e, t) => /* @__PURE__ */ (0, V.jsxs)("span", {
						className: "gsheet-fig",
						style: { zIndex: m.length - t },
						children: [/* @__PURE__ */ (0, V.jsx)("span", {
							className: "gsheet-shot",
							"data-state": e.shot === "failed" ? "failed" : e.shot ? "done" : "loading",
							children: e.shot === "failed" ? /* @__PURE__ */ (0, V.jsx)("span", {
								className: "gsheet-failed",
								children: c("gallery.failed")
							}) : e.shot ? /* @__PURE__ */ (0, V.jsx)("img", {
								src: e.shot.url,
								width: e.shot.w,
								height: e.shot.h,
								alt: ""
							}) : /* @__PURE__ */ (0, V.jsx)("span", { className: "gcard-ph" })
						}), e.label && /* @__PURE__ */ (0, V.jsx)("span", {
							className: "gsheet-cap",
							children: e.label
						})]
					}, t)), g > 1 && /* @__PURE__ */ (0, V.jsxs)("span", {
						className: "gcard-count",
						"aria-label": c("board.count", { n: g }),
						children: [/* @__PURE__ */ (0, V.jsx)(pa, {}), g]
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
							children: [/* @__PURE__ */ (0, V.jsx)(fa, {}), /* @__PURE__ */ (0, V.jsx)("span", {
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
								children: [/* @__PURE__ */ (0, V.jsx)("span", { children: c("gallery.sheet.open") }), /* @__PURE__ */ (0, V.jsx)(da, {})]
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
var Ta = ea(A);
function Ea(e) {
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
var Da = Ea("0px"), Oa = Ea("200% 0px"), ka = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), Aa = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M2 4.5V12.5h12V5.5H8L6.5 4H2z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3",
		strokeLinejoin: "round"
	})
}), ja = () => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 18 18",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", {
		d: "M3 3h5v5H3zM10 3h5v5h-5zM3 10h5v5H3zM10 10h5v5h-5z",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.3"
	})
});
function Ma({ text: e, className: t }) {
	let n = (0, B.useRef)(null), [r, i] = (0, B.useState)(e);
	return (0, B.useLayoutEffect)(() => {
		let t = n.current, r = () => {
			t.clientWidth && i(en(e, t.clientWidth, $t(t)));
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
var Na = (0, B.memo)(function({ text: e, view: t, near: n = !0, onOpen: r, onLost: i }) {
	let { phrase: a, daemonText: o } = s(), c = t.status === "done" ? "done" : t.status === "error" ? "failed" : "loading", l = t.status !== "done" || t.image.w <= t.image.h, u = t.status === "done" ? t.sheets : 0;
	return /* @__PURE__ */ (0, V.jsx)("article", {
		className: "gcard",
		"data-state": c,
		"aria-busy": c === "loading",
		children: /* @__PURE__ */ (0, V.jsxs)("button", {
			className: "gcard-hit",
			type: "button",
			"aria-haspopup": "dialog",
			onClick: r,
			children: [/* @__PURE__ */ (0, V.jsxs)("span", {
				className: "gcard-cover",
				children: [t.status === "error" ? /* @__PURE__ */ (0, V.jsx)("span", {
					className: "gcard-failed",
					title: o(t.failure) || void 0,
					children: a("gallery.failed")
				}) : /* @__PURE__ */ (0, V.jsxs)("span", {
					className: "gcard-stack",
					"data-o": l ? "tall" : "wide",
					children: [(u > 2 ? ["l", "r"] : u > 1 ? ["r"] : []).map((e) => /* @__PURE__ */ (0, V.jsx)("span", {
						className: "gcard-ghost",
						"data-g": e
					}, e)), /* @__PURE__ */ (0, V.jsx)("span", {
						className: "gcard-shot",
						children: t.status === "done" && n ? /* @__PURE__ */ (0, V.jsx)("img", {
							src: t.image.url,
							width: t.image.w,
							height: t.image.h,
							alt: "",
							decoding: "async",
							onLoad: (e) => e.currentTarget.classList.add("in"),
							onError: i
						}) : /* @__PURE__ */ (0, V.jsx)("span", { className: "gcard-ph" })
					})]
				}), u > 1 && /* @__PURE__ */ (0, V.jsxs)("span", {
					className: "gcard-count",
					"aria-label": a("board.count", { n: u }),
					children: [/* @__PURE__ */ (0, V.jsx)(ka, {}), u]
				})]
			}), /* @__PURE__ */ (0, V.jsxs)("span", {
				className: "gcard-body",
				children: [
					/* @__PURE__ */ (0, V.jsx)(Ma, {
						className: "gcard-file",
						text: e.name
					}),
					/* @__PURE__ */ (0, V.jsxs)("span", {
						className: "gcard-pkgrow",
						children: [/* @__PURE__ */ (0, V.jsx)(Aa, {}), /* @__PURE__ */ (0, V.jsx)(Ma, {
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
}), Pa = (0, B.memo)(function({ f: e, order: t, name: n, pkg: r, mod: i, changed: a, cards: o, onOpen: s }) {
	let c = (0, B.useRef)(null), l = Qi(e), u = (0, B.useSyncExternalStore)(o.subscribe, () => o.get(l)), [d, f] = (0, B.useState)(!1);
	(0, B.useEffect)(() => {
		let n = c.current, r = Da().add(n, (n) => n ? o.want(l, e.path, t) : o.drop(l)), i = Oa().add(n, f);
		return () => {
			r(), i(), o.drop(l);
		};
	}, [
		l,
		t,
		o
	]);
	let p = (0, B.useMemo)(() => ({
		name: n,
		pkg: r,
		mod: i,
		changed: a
	}), [
		n,
		r,
		i,
		a
	]), m = (0, B.useCallback)(() => s(e), [s, e]), h = (0, B.useCallback)(() => o.lost(l, e.path, t), [
		o,
		l,
		e,
		t
	]);
	return /* @__PURE__ */ (0, V.jsx)("div", {
		ref: c,
		className: "gcard-slot",
		"data-path": e.path,
		children: /* @__PURE__ */ (0, V.jsx)(Na, {
			text: p,
			view: u,
			near: d,
			onOpen: m,
			onLost: h
		})
	});
});
async function Fa(e, { phrase: t, daemonText: n }) {
	if (e.path === U(L.st)) {
		$e();
		return;
	}
	let r = await P("/viewer/open", { file: e.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	r.ok || F(n(r.message) || t("open.cannot"));
}
var Ia = (0, B.memo)(function({ files: e, ready: t, cards: n, now: r = Date.now(), onOpen: i }) {
	let { phrase: a } = s(), o = (0, B.useMemo)(() => e ? Zi(e) : null, [e]), c = (0, B.useMemo)(() => e ? qi(e) : [], [e]), l = document.documentElement.lang || "en";
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
			children: o.map((e, t) => /* @__PURE__ */ (0, V.jsx)(Pa, {
				f: e,
				order: t,
				cards: n,
				onOpen: i,
				name: Gi(e),
				pkg: Ji(e, c),
				mod: Yi(e.module),
				changed: Xi(e.mtime, r, a, l)
			}, e.path))
		}) : /* @__PURE__ */ (0, V.jsx)("p", {
			className: "gallery-note",
			children: a("quickopen.none")
		})]
	});
});
function La({ shown: e, state: t, draw: n, host: r }) {
	let i = s(), a = W(), { element: c, place: l } = o(r), u = (0, B.useRef)({
		gallery: 0,
		board: 0,
		over: !1
	});
	(0, B.useLayoutEffect)(() => {
		if (!t) return;
		let e = qe();
		e.open && (t.screen === "focus" || U(t) !== e.openedOver) && $e();
	}, [n]), (0, B.useLayoutEffect)(() => {
		if (!c) return;
		let n = Xe();
		if (Ze(e), c.hidden = !e, e === n) return;
		let r = t?.screen === "board" || t?.screen === "vacant";
		if (e) {
			it(), r && (u.current.board = scrollY), u.current.over = r;
			let e = u.current.gallery;
			queueMicrotask(() => scrollTo(0, e));
		} else if (u.current.gallery = scrollY, u.current.over && r && U(t) === qe().openedOver) {
			let e = u.current.board;
			queueMicrotask(() => scrollTo(0, e));
		}
	}, [e, c]), (0, B.useLayoutEffect)(() => {
		Ta.pause(!e || !!a.sheet);
	}, [e, a.sheet]), (0, B.useEffect)(() => {
		a.sheet && (!e || a.files && !a.files.some((e) => e.path === a.sheet.path)) && nt();
	}, [
		e,
		a.files,
		a.sheet
	]);
	let d = (0, B.useRef)(i);
	d.current = i;
	let f = (0, B.useCallback)((e) => et(e.path), []), p = e && a.sheet ? a.files?.find((e) => e.path === a.sheet.path) ?? null : null;
	return l(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)(Ia, {
		files: a.files,
		ready: a.ready,
		cards: Ta,
		onOpen: f
	}), p && /* @__PURE__ */ (0, V.jsx)(Ra, {
		f: p,
		closing: a.sheet.closing,
		onOpen: () => Fa(p, d.current)
	}, p.path)] }), (e, t) => /* @__PURE__ */ (0, V.jsx)("section", {
		id: "galleryView",
		className: "gallery",
		ref: e,
		children: t
	}));
}
function Ra({ f: e, closing: t, onOpen: n }) {
	let { phrase: r } = s(), i = Qi(e), a = (0, B.useSyncExternalStore)(Ta.subscribe, () => Ta.get(i)), o = document.documentElement.lang || "en", c = (0, B.useMemo)(() => ({
		name: Gi(e),
		pkg: Ji(e, []),
		mod: Yi(e.module),
		changed: Xi(e.mtime, Date.now(), r, o)
	}), [
		e,
		r,
		o
	]);
	return /* @__PURE__ */ (0, V.jsx)(wa, {
		file: e,
		text: c,
		view: a,
		closing: t,
		onClose: tt,
		onClosed: nt,
		onOpen: n
	});
}
function za({ on: e, count: t, host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n);
	return (0, B.useLayoutEffect)(() => {
		i && (i.classList.toggle("on", e), e ? i.setAttribute("aria-current", "page") : i.removeAttribute("aria-current"));
	}, [i, e]), (0, B.useLayoutEffect)(() => {
		if (!i) return;
		let t = () => {
			e || Qe();
		};
		return i.addEventListener("click", t), () => i.removeEventListener("click", t);
	}, [i, e]), a(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsx)(ja, {}),
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
var Ba = (0, B.memo)(function({ content: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = (0, B.useSyncExternalStore)(de, ie), { error: c, log: l, once: u } = e ?? a, d = !!(c.trim() || l.trim()) || !!u;
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
			onClick: ae,
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
}), Va = {
	cursor: null,
	returned: null
}, Ha = (e, t) => e.groups.flatMap((e) => e.cards).find((e) => e.index === t), Ua = 300 / 360, Wa = .25, Ga = 100, Ka = 160, qa = 360, Ja = 640, Ya = 120;
function Xa(e, t, n) {
	let r = (t) => e.reduce((e, n) => e + Math.max(n * t, Ga), 0) + n * (e.length - 1);
	if (r(Ua) <= t) return {
		s: Ua,
		w: r(Ua),
		wrap: !1
	};
	if (r(Wa) > t) return {
		s: Math.min(Ua, ...e.map((e) => e * Wa >= Ga ? Wa : Ga / e)),
		w: t,
		wrap: !0
	};
	let i = Wa, a = Ua;
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
var Za = /* @__PURE__ */ new Map();
function Qa(e, t) {
	let n = t.cards.map((t) => {
		let n = e + "|" + t.previewId, r = Za.get(n);
		return t.widthDp && t.heightDp && Za.set(n, [t.widthDp, t.heightDp]), [t.widthDp || r?.[0], t.heightDp || r?.[1]];
	}), r = n.filter(([e, t]) => e && t).sort((e, t) => t[0] - e[0])[0];
	return n.map(([e, n], i) => {
		let a = t.cards[i].failure && r;
		return [e || (a ? r[0] : qa), n || (a ? r[1] : Ja)];
	});
}
function $a(e, t, n) {
	let r = e.clientWidth;
	if (!r) return 0;
	let i = e.querySelectorAll(":scope > .group"), a = i[0]?.querySelector(".board"), o = a && parseFloat(getComputedStyle(a).columnGap) || 24;
	return t.groups.forEach((a, s) => {
		let c = i[s];
		if (!c) return;
		let l = Qa(t.file, a), { s: u, w: d, wrap: f } = Xa(l.map((e) => e[0]), r, o);
		c.style.width = f ? "100%" : Math.max(Ka, d) + "px", c.querySelector(".board").classList.toggle("spill", f);
		let p = c.querySelector(".sc"), m = u < .8333323333333333, h = a.cards.some((e) => e.dpGuess);
		p.hidden = !m, p.textContent = m ? (h ? "≈" : "") + Math.round(u * 100) + "%" : "", p.title = n("zoom.tip.real") + (h ? " · " + n("board.scale.guess") : ""), a.cards.forEach((t, n) => {
			let r = e.querySelector(`.card[data-i="${t.index}"]`);
			if (!r) return;
			let [i, a] = l[n], o = Math.max(i * u, Ga);
			r.style.width = o + "px";
			let s = r.querySelector(".cstage img");
			s.style.width = i * u + "px", s.style.aspectRatio = `auto ${i} / ${a}`;
			let c = r.querySelector(".ph"), d = Math.max(Ya, a * u);
			c.style.width = o + "px", c.style.height = d + "px", c.style.setProperty("--lines", String(Math.max(1, Math.floor((d - 55) / 16.7))));
		});
	}), r;
}
var eo = (e) => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 12 12",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.1",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: e
}), to = /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("rect", {
	x: "3.25",
	y: "1.25",
	width: "5.5",
	height: "9.5",
	rx: "1.2"
}), /* @__PURE__ */ (0, V.jsx)("path", { d: "M5.25 9h1.5" })] }), no = {
	portrait: eo(to),
	landscape: eo(/* @__PURE__ */ (0, V.jsx)("rect", {
		x: "1.25",
		y: "3",
		width: "9.5",
		height: "6",
		rx: "1.2"
	})),
	device: eo(to),
	dark: eo(/* @__PURE__ */ (0, V.jsx)("path", { d: "M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z" })),
	font: /* @__PURE__ */ (0, V.jsx)("span", {
		className: "aa",
		children: "Aa"
	}),
	locale: eo(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("circle", {
		cx: "6",
		cy: "6",
		r: "4.75"
	}), /* @__PURE__ */ (0, V.jsx)("path", { d: "M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75" })] })),
	api: eo(/* @__PURE__ */ (0, V.jsx)("path", { d: "M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5" })),
	systemUi: eo(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("rect", {
		x: "3.25",
		y: "1.25",
		width: "5.5",
		height: "9.5",
		rx: "1.2"
	}), /* @__PURE__ */ (0, V.jsx)("path", { d: "M3.5 3.25h5" })] }))
}, ro = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "currentColor",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z" })
});
function io({ card: e }) {
	let { daemonText: t } = s();
	return /* @__PURE__ */ (0, V.jsx)("span", {
		className: "specs",
		title: e.args,
		children: e.specs.map((e, n) => {
			let r = t(e.text), [i, a] = e.kind === "size" ? r.split("×").map(Number) : [], o = e.kind === "size" ? i > a ? "landscape" : "portrait" : e.kind;
			return /* @__PURE__ */ (0, V.jsxs)("span", {
				className: "spec",
				children: [no[o] ?? null, /* @__PURE__ */ (0, V.jsxs)("span", { children: [r, e.kind === "size" && /* @__PURE__ */ (0, V.jsx)("span", {
					className: "unit",
					children: "dp"
				})] })]
			}, n);
		})
	});
}
var ao = (0, B.memo)(function({ card: e, fn: t, cursor: n = !1, returned: r = !1, actions: i }) {
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
		p ? (t.dataset.url !== e.imageUrl && (ye(t, e.imageUrl), u.current.classList.remove("on"), d.current.hidden = !0), t.hidden = !1) : t.hidden = !0;
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
					children: [ro, /* @__PURE__ */ (0, V.jsx)("span", {
						className: "go-t",
						children: a("card.go")
					})]
				}),
				/* @__PURE__ */ (0, V.jsx)("div", {
					className: "sub",
					children: /* @__PURE__ */ (0, V.jsx)(io, { card: e })
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
function oo({ group: e, marks: t = Va, actions: n }) {
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
				children: e.cards.map((r) => /* @__PURE__ */ (0, V.jsx)(ao, {
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
function so({ board: e, screen: t, hosts: n, actions: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n?.cards), [l, u] = (0, B.useState)(null), d = n?.view ?? l, f = (0, B.useSyncExternalStore)(T, p), m = (0, B.useRef)({
		board: null,
		live: null
	}), h = (0, B.useMemo)(() => {
		let n = m.current;
		if (t === "focus" && e) return n.live = Ha(e, e.focus)?.imageUrl ?? null, n.board;
		let r = e && Ha(e, e.focus);
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
		d && (t !== null && (d.hidden = t !== "board"), t !== "focus" && (E(h), h && a && (x.current = $a(a, h, i) || x.current)));
	}, [
		h,
		t,
		d,
		a
	]), (0, B.useEffect)(() => {
		if (!a) return;
		let e = () => {
			v.current && (x.current = $a(a, v.current, b.current) || x.current);
		}, t = new ResizeObserver(() => {
			let t = a.clientWidth;
			t && t !== x.current && e();
		});
		return t.observe(a), y(e), () => {
			t.disconnect(), y(() => {});
		};
	}, [a]);
	let S = h && /* @__PURE__ */ (0, V.jsx)(B.Fragment, { children: h.groups.map((e, t) => /* @__PURE__ */ (0, V.jsx)(oo, {
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
function co({ rows: e, host: t }) {
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
function lo({ state: e, connection: t = null, host: n, bar: r }) {
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
var uo = {
	choose() {},
	cancel() {},
	follow() {},
	pick() {},
	peek() {},
	jump() {},
	close() {}
}, Z = (e) => /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), fo = Z(/* @__PURE__ */ (0, V.jsx)("path", { d: "M4 4l8 8M12 4l-8 8" })), po = Z(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
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
] })), mo = {
	width: Z(/* @__PURE__ */ (0, V.jsx)("path", { d: "M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5" })),
	height: Z(/* @__PURE__ */ (0, V.jsx)("path", { d: "M8 2v12M5.5 4.5 8 2l2.5 2.5M5.5 11.5 8 14l2.5-2.5" })),
	size: Z(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("path", { d: "M2.5 6V2.5H6M10 13.5h3.5V10" }), /* @__PURE__ */ (0, V.jsx)("path", { d: "M2.5 2.5l11 11" })] })),
	padding: Z(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("rect", {
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
	click: Z(/* @__PURE__ */ (0, V.jsx)("path", { d: "M5 2.5l7.5 4.8-3.4.9 2 3.4-1.6.9-2-3.4L5 11.5z" })),
	text: Z(/* @__PURE__ */ (0, V.jsx)("path", { d: "M3.5 3.5h9M8 3.5v9M6 12.5h4" })),
	color: Z(/* @__PURE__ */ (0, V.jsx)("path", { d: "M8 2.5S4 7 4 9.75a4 4 0 0 0 8 0C12 7 8 2.5 8 2.5z" }))
};
function ho(e) {
	let t = /#L(\d+)$/.exec(e), n = e.replace(/^@/, "").replace(/#L\d+$/, "");
	return t ? `${n.slice(n.lastIndexOf("/") + 1)}:${t[1]}` : n;
}
function go(e, t) {
	let n = t && e.startsWith(t + "/") ? e.slice(t.length + 1) : e, r = n.lastIndexOf("/") + 1, i = n.indexOf("/src/");
	return (i > 0 && i < r ? n.slice(0, i) + "/…/" : n.slice(0, r)) + n.slice(r);
}
function _o(e, t) {
	let n = (e.uchain || e.chain || []).slice(-6).join(" › ");
	return (t.ref ? [
		t.ref,
		e.name,
		n
	] : [t.msg, n]).filter(Boolean).join("\n");
}
var vo = [.5, 3.2], yo = 2, bo = (e) => String(Math.round(e * 10) / 10), xo = () => typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, So = (e) => {
	e.button === 0 && e.target.closest("button") && e.preventDefault();
};
function Co({ row: e, here: t, actions: n, children: r }) {
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
function wo({ tree: e, actions: t, settled: n }) {
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
			children: c.rows.map((e) => /* @__PURE__ */ (0, V.jsx)(Co, {
				row: e,
				actions: t
			}, e.id))
		})
	}, `fold-${e.id}`) : void 0, m = (e) => /* @__PURE__ */ (0, V.jsx)(Co, {
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
		/* @__PURE__ */ (0, V.jsx)(Co, {
			row: i,
			here: !0,
			actions: t,
			children: h
		}, i.id),
		o.map(m)
	] }), _ = Math.max(0, r.length - yo), v = r.slice(_).reduceRight((e, n) => /* @__PURE__ */ (0, V.jsx)(Co, {
		row: n,
		actions: t,
		children: /* @__PURE__ */ (0, V.jsx)("ul", {
			className: "pc-group",
			children: e
		})
	}, n.id), g);
	return /* @__PURE__ */ (0, V.jsxs)("ul", {
		className: "pc-tree",
		children: [r.slice(0, _).map((e) => /* @__PURE__ */ (0, V.jsx)(Co, {
			row: e,
			actions: t
		}, e.id)), v]
	});
}
function To({ say: e }) {
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
var Eo = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 24 24",
	fill: "currentColor",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M12.135.003a2.577 2.577 0 0 0-1.42.344L2.55 5.06a2.577 2.577 0 0 0-.953.967l3.957 2.17a1.765 1.765 0 0 1 .603-.588l4.951-2.86a1.761 1.761 0 0 1 1.76 0l4.951 2.86a1.753 1.753 0 0 1 .526.46l3.921-2.265a2.577 2.577 0 0 0-.816-.744L13.291.347a2.577 2.577 0 0 0-1.152-.34Zm-.145 4.912a1.36 1.36 0 0 0-.68.182L6.36 7.953a1.345 1.345 0 0 0-.454.435l1.92 1.055a1.05 1.05 0 0 1 .31-.275l3.34-1.928a1.054 1.054 0 0 1 1.051 0l3.336 1.928a1.066 1.066 0 0 1 .238.199l.018-.01-.002-.002 1.877-1.08a1.353 1.353 0 0 0-.373-.322l-4.95-2.86a1.357 1.357 0 0 0-.68-.178Zm10.432 1.149-3.92 2.26a1.757 1.757 0 0 1 .2.812v5.715c0 .627-.332 1.21-.88 1.528l-4.95 2.86a1.761 1.761 0 0 1-.64.214v4.524a2.577 2.577 0 0 0 1.059-.313l8.162-4.713a2.577 2.577 0 0 0 1.289-2.23V7.297a2.577 2.577 0 0 0-.318-1.228Zm-20.937.238a2.577 2.577 0 0 0-.227.99v9.43c0 .918.491 1.767 1.293 2.229l8.162 4.713a2.57 2.57 0 0 0 1.225.336v-4.531a1.761 1.761 0 0 1-.833-.235L6.156 16.38a1.765 1.765 0 0 1-.877-1.528V9.136a1.776 1.776 0 0 1 .131-.676Zm16.67 2.223-1.89 1.092a1.058 1.058 0 0 1 .124.46v3.856c0 .378-.2.72-.526.907l-3.336 1.93a1.04 1.04 0 0 1-.295.107v2.17c.152-.027.304-.078.44-.157l4.949-2.859a1.36 1.36 0 0 0 .68-1.18V9.136a1.36 1.36 0 0 0-.147-.607Zm-12.387.13a1.36 1.36 0 0 0-.088.481v5.715a1.36 1.36 0 0 0 .68 1.18l4.95 2.86c.194.112.412.166.627.177v-2.174a1.054 1.054 0 0 1-.46-.123L8.14 14.843a1.054 1.054 0 0 1-.532-.908v-3.853a.99.99 0 0 1 .077-.38l-.034-.013z" })
}), Do = Z(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("path", { d: "M8 4.5C6.6 3.4 4.6 3 2.5 3.2v9.1c2.1-.2 4.1.2 5.5 1.3 1.4-1.1 3.4-1.5 5.5-1.3V3.2C11.4 3 9.4 3.4 8 4.5z" }), /* @__PURE__ */ (0, V.jsx)("path", { d: "M8 4.5v9" })] }));
function Oo({ origin: e }) {
	let { phrase: t } = s();
	return e ? e === "compose" ? /* @__PURE__ */ (0, V.jsxs)("span", {
		className: "pc-chip compose",
		title: t("point.card.compose.title"),
		children: [Eo, t("point.card.compose")]
	}) : e === "library" ? /* @__PURE__ */ (0, V.jsxs)("span", {
		className: "pc-chip library",
		title: t("point.card.library.title"),
		children: [Do, t("point.card.library")]
	}) : /* @__PURE__ */ (0, V.jsx)("span", {
		className: "pc-chip module",
		title: t("point.card.module.title", { module: e.module }),
		children: e.module
	}) : null;
}
function ko({ box: e }) {
	let t = e.width > 0 && e.height > 0 ? e.width / e.height : 1, n = Math.min(vo[1], Math.max(vo[0], t));
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
				bo(e.width),
				/* @__PURE__ */ (0, V.jsx)("i", { children: "×" }),
				bo(e.height),
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "pc-unit",
					children: e.unit
				})
			]
		})]
	});
}
function Ao(e) {
	return e.sizes?.length ? e.sizes.length === 2 ? "size" : e.sizes[0] : e.color ? "color" : {
		padding: "padding",
		clickable: "click",
		text: "text"
	}[e.name] ?? null;
}
function jo({ modifiers: e }) {
	let { phrase: t } = s();
	return /* @__PURE__ */ (0, V.jsx)("div", {
		className: "pc-mods",
		children: /* @__PURE__ */ (0, V.jsx)("ol", {
			className: "pc-scroll",
			tabIndex: 0,
			"aria-label": t("point.card.modifiers"),
			children: e.map((e, n) => {
				let r = Ao(e);
				return /* @__PURE__ */ (0, V.jsxs)("li", { children: [
					r ? /* @__PURE__ */ (0, V.jsx)("span", {
						className: "pc-kind",
						title: t(`point.card.kind.${r}`),
						"aria-label": t(`point.card.kind.${r}`),
						children: mo[r]
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
function Mo({ card: e, actions: t = uo }) {
	let { phrase: n } = s(), { node: r, say: i, box: a, tree: o, modifiers: c, previews: l, origin: u } = e, d = (0, B.useRef)(null), f = (0, B.useRef)(!1), p = (e) => {
		let t = d.current, n = t?.querySelector(".pc-node.here > .pc-row");
		if (!t || !n) return;
		let r = t.scrollTop + n.getBoundingClientRect().top - t.getBoundingClientRect().top - (t.clientHeight - n.offsetHeight) / 2;
		t.scrollTo({
			top: r,
			behavior: e && !xo() ? "smooth" : "auto"
		});
	}, m = o?.here.id;
	(0, B.useLayoutEffect)(() => {
		p(f.current), f.current = !0;
	}, [m]);
	let [h, g] = (0, B.useState)(!1);
	(0, B.useEffect)(() => g(!1), [m, r.lineNumber]);
	let _ = i.file ? `${i.file.slice(i.file.lastIndexOf("/") + 1)}:${r.lineNumber}` : i.ref ? ho(i.ref) : "", v = l.length > 1, y = v ? n("point.card.previews", { n: l.length }) : l[0] && n("point.card.jump", { name: l[0].fn }), b = m ?? `${r.name}:${r.lineNumber}`;
	return /* @__PURE__ */ (0, V.jsx)("section", {
		className: "point-card",
		"aria-label": n("point.card.label"),
		onMouseDown: So,
		children: /* @__PURE__ */ (0, V.jsxs)("div", {
			className: "pc-body",
			children: [
				/* @__PURE__ */ (0, V.jsxs)("header", {
					className: "pc-head",
					children: [
						/* @__PURE__ */ (0, V.jsxs)("div", {
							className: "pc-id pc-swap",
							title: _o(r, i),
							children: [/* @__PURE__ */ (0, V.jsxs)("span", {
								className: "pc-nameline",
								children: [/* @__PURE__ */ (0, V.jsx)("span", {
									className: "pc-name",
									children: r.name || r.fileName
								}), /* @__PURE__ */ (0, V.jsx)(Oo, { origin: u })]
							}), i.ref && /* @__PURE__ */ (0, V.jsxs)("span", {
								className: "pc-refline",
								children: [/* @__PURE__ */ (0, V.jsx)("span", {
									className: "pc-ref",
									children: _
								}), /* @__PURE__ */ (0, V.jsx)(To, { say: i })]
							})]
						}, `id-${b}`),
						y && /* @__PURE__ */ (0, V.jsxs)("button", {
							type: "button",
							className: "pc-jump",
							title: y,
							"aria-label": y,
							"aria-expanded": v ? h : void 0,
							onClick: () => v ? g((e) => !e) : t.jump(l[0]),
							children: [po, v && /* @__PURE__ */ (0, V.jsx)("span", { children: l.length })]
						}),
						/* @__PURE__ */ (0, V.jsx)("button", {
							type: "button",
							className: "pc-close",
							title: n("point.card.close"),
							"aria-label": n("point.card.close"),
							onClick: t.close,
							children: fo
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
							children: [po, /* @__PURE__ */ (0, V.jsx)("span", { children: e.fn })]
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
						children: /* @__PURE__ */ (0, V.jsx)(wo, {
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
						children: [/* @__PURE__ */ (0, V.jsx)(ko, { box: a }), c && c.length > 0 && /* @__PURE__ */ (0, V.jsx)(jo, { modifiers: c })]
					}, `detail-${b}`)
				})
			]
		})
	});
}
function No({ room: e, shot: t, card: n, space: r }) {
	let i = t.left + t.width + r.gap;
	return {
		left: i + n.width <= e.right - r.edge ? i : Math.max(e.left + r.edge, t.left - r.gap - n.width),
		top: Math.max(r.edge, t.top)
	};
}
var Po = (e, t) => parseFloat(getComputedStyle(e).getPropertyValue(t)) || 0, Fo = (e) => {
	let t = document.getElementById(e);
	return t && !t.hidden && t.offsetWidth ? t.getBoundingClientRect() : null;
};
function Io({ host: e, shot: t, leaving: n = !1, onLeft: r, children: i }) {
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
			gap: Po(n, "--space-16"),
			edge: Po(n, "--space-8")
		}, i = 0, o = "", s = () => {
			let a = t(), c = e.getBoundingClientRect(), l = "hidden";
			if (a && a.width) {
				let t = Fo("rail"), i = No({
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
function Lo({ host: e, shot: t, card: n, actions: r }) {
	let i = (0, B.useRef)(/* @__PURE__ */ new WeakMap()), a = (0, B.useRef)(0), o = (0, B.useRef)(null), [s, c] = (0, B.useState)(!0), l = !!(e && t && n);
	e && t && n && (o.current = {
		host: e,
		shot: t,
		card: n
	}, s && c(!1));
	let u = o.current;
	return !u || s ? null : (i.current.has(u.shot) || i.current.set(u.shot, ++a.current), (0, Hi.createPortal)(/* @__PURE__ */ (0, V.jsx)(Io, {
		host: u.host,
		shot: u.shot,
		leaving: !l,
		onLeft: () => c(!0),
		children: /* @__PURE__ */ (0, V.jsx)(Mo, {
			card: u.card,
			actions: r
		})
	}, i.current.get(u.shot)), u.host));
}
function Ro({ actions: e }) {
	let { host: t, shot: n, card: r } = (0, B.useSyncExternalStore)(Qn.subscribe, Qn.get);
	return /* @__PURE__ */ (0, V.jsx)(Lo, {
		host: t,
		shot: n,
		card: r,
		actions: e
	});
}
function zo({ choice: e, repo: t, host: n, actions: r = uo }) {
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
			children: go(e.startsWith(u.repoRoot + "/") ? e.slice(u.repoRoot.length + 1) : e, t)
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
function Bo({ screen: e, vacant: t, host: n }) {
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
function Vo() {
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
var Ho = ({ id: e, hidden: t }) => /* @__PURE__ */ (0, V.jsxs)("div", {
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
function Uo() {
	let e = Vo();
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
function Wo({ marks: e = qo() }) {
	return /* @__PURE__ */ (0, V.jsx)("div", {
		className: "resize-scene",
		id: "resizeScene",
		hidden: !0,
		children: /* @__PURE__ */ (0, V.jsxs)("div", {
			className: "resize-geometry",
			id: "resizeGeometry",
			children: [
				/* @__PURE__ */ (0, V.jsx)(Ho, { id: "ua" }),
				/* @__PURE__ */ (0, V.jsx)(Ho, {
					id: "ub",
					hidden: !0
				}),
				/* @__PURE__ */ (0, V.jsx)(Uo, {}),
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
var Go = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "workspace-loading",
	id: "workspaceLoading",
	role: "status",
	hidden: !0,
	ref: e,
	children: t
}), Ko = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "inset-overlay",
	id: "insetOverlay",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), qo = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "inset-marks",
	id: "insetMarks",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), Jo = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "sys-ui",
	id: "sysUiCtl",
	role: "group",
	"data-t-aria-label": "systemUi.label",
	hidden: !0,
	ref: e,
	children: t
}), Yo = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "zoom at-fit",
	id: "zoomCtl",
	role: "group",
	"data-t-aria-label": "zoom.label",
	ref: e,
	children: t
});
function Xo({ loading: e = Go(), inset: t = Ko() }) {
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
function Zo({ loading: e, inset: t, marks: n }) {
	return /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "wrap",
		children: [/* @__PURE__ */ (0, V.jsx)(Wo, { marks: n }), /* @__PURE__ */ (0, V.jsx)(Xo, {
			loading: e,
			inset: t
		})]
	});
}
var Qo = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "pn-fold",
	id: "pnFold",
	ref: e,
	children: t
}), $o = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "dock-seg",
	id: "devCtl",
	role: "group",
	"data-t-aria-label": "posture.label",
	hidden: !0,
	ref: e,
	children: t
}), es = (e, t) => /* @__PURE__ */ (0, V.jsx)("div", {
	className: "pn-sl",
	id: "pnSl",
	role: "group",
	"data-t-aria-label": "size.custom.label",
	hidden: !0,
	ref: e,
	children: t
});
function ts({ menu: e = Qo(), posture: t = $o(), sliders: n = es(), systemUi: r = Jo(), zoom: i = Yo() }) {
	return /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		e,
		t,
		n,
		r,
		i
	] });
}
// src/components/Dock.tsx
var Q = (e, t) => (0, B.useSyncExternalStore)(e.view.subscribe, () => e.view.get()[t]), ns = (e) => /* @__PURE__ */ (0, V.jsx)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), rs = ns(/* @__PURE__ */ (0, V.jsxs)("g", {
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
})), is = ns(/* @__PURE__ */ (0, V.jsxs)("g", {
	className: "fold-ic",
	children: [/* @__PURE__ */ (0, V.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, V.jsx)("path", { d: "M3 10h4.5M5.5 7.8 7.7 10l-2.2 2.2M17 10h-4.5M14.5 7.8 12.3 10l2.2 2.2" })]
})), as = ns(/* @__PURE__ */ (0, V.jsxs)("g", {
	className: "unfold-ic",
	children: [/* @__PURE__ */ (0, V.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, V.jsx)("path", { d: "M7.5 10H3M5.2 7.8 3 10l2.2 2.2M12.5 10H17M14.8 7.8 17 10l-2.2 2.2" })]
})), os = ns(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("rect", {
	x: "3.5",
	y: "4",
	width: "13",
	height: "12",
	rx: "1.5"
}), /* @__PURE__ */ (0, V.jsx)("path", {
	d: "M10 4v12",
	strokeDasharray: "1.6 1.6"
})] })), ss = /* @__PURE__ */ (0, V.jsx)("svg", {
	className: "tb-chev",
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "m4.5 6.5 3.5 3.5 3.5-3.5" })
}), cs = ({ dev: e }) => /* @__PURE__ */ (0, V.jsx)("svg", {
	className: "pn-sil",
	viewBox: "0 0 20 20",
	"aria-hidden": "true",
	dangerouslySetInnerHTML: { __html: z(Oe[e]) }
}), ls = [
	"portrait",
	"landscape-left",
	"landscape-right"
];
function us(e, t, n) {
	return [
		"ArrowDown",
		"ArrowUp",
		"Home",
		"End"
	].includes(e.key) ? (e.preventDefault(), e.stopPropagation(), e.key === "Home" ? 0 : e.key === "End" ? t.length - 1 : (n + (e.key === "ArrowUp" ? -1 : 1) + t.length) % t.length) : -1;
}
function ds({ dock: e }) {
	let { phrase: t } = s(), n = Q(e, "checked"), r = Q(e, "rows"), i = Q(e, "locked"), a = (0, B.useRef)(null), o = (t, n = !1) => {
		e.pick(t, n);
		let r = document.activeElement;
		r instanceof HTMLElement && r.matches("#pnSl [role=\"slider\"]") && r.blur();
	}, c = (a, s, c = !1) => {
		let l = Oe[a];
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
				l && /* @__PURE__ */ (0, V.jsx)(cs, { dev: a }),
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "nm",
					children: a === "custom" ? t("size.custom") : Te(a)
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
			let r = us(e, t, n);
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
				children: ke.map(({ group: e, ids: t }) => /* @__PURE__ */ (0, V.jsxs)(B.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("h5", {
					className: "pn-g",
					children: e
				}), t.map((e) => c(e))] }, e))
			})]
		})]
	});
}
function fs({ dock: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = Q(e, "menu"), c = Q(e, "locked"), l = Q(e, "sumKey"), u = Q(e, "sumDev"), d = Q(e, "sumTitle"), f = (0, B.useRef)(null), p = (0, B.useRef)(null);
	return (0, B.useLayoutEffect)(() => {
		r?.classList.toggle("open", a), !a && p.current?.contains(document.activeElement) && f.current?.focus({ preventScroll: !0 });
	}, [r, a]), i(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsxs)("button", {
		className: l === "original" ? "tb-btn pn-sum mono" : "tb-btn pn-sum",
		id: "pnSum",
		type: "button",
		"aria-haspopup": "true",
		"aria-expanded": a,
		"aria-controls": "pnBody",
		title: d || n("panel.pick"),
		disabled: c,
		ref: f,
		onClick: () => e.setMenu(!a),
		children: [
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "pn-sum-sil",
				children: u && /* @__PURE__ */ (0, V.jsx)(cs, { dev: u })
			}),
			/* @__PURE__ */ (0, V.jsx)("span", {
				className: "nm",
				children: l && Te(l)
			}),
			ss
		]
	}), /* @__PURE__ */ (0, V.jsx)("div", {
		className: "pn-body",
		id: "pnBody",
		inert: !a,
		ref: p,
		children: /* @__PURE__ */ (0, V.jsx)(ds, { dock: e })
	})] }), Qo);
}
function ps({ dock: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = Q(e, "posture"), c = Q(e, "locked"), l = Q(e, "orientMenu"), u = Q(e, "foldable"), d = Q(e, "folded"), f = Q(e, "orientFixed"), p = Q(e, "orientation"), m = Q(e, "hinge"), h = (0, B.useRef)(null), g = (0, B.useRef)(null);
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
		let n = [...g.current.querySelectorAll("[data-orientation]")], r = us(t, n, n.indexOf(document.activeElement));
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
				children: [rs, ss]
			}), /* @__PURE__ */ (0, V.jsx)("div", {
				className: l ? "zoom-menu on" : "zoom-menu",
				id: "dcOrientMenu",
				role: "menu",
				"aria-label": n("posture.orientation"),
				inert: !l,
				ref: g,
				onKeyDown: _,
				children: ls.map((t) => /* @__PURE__ */ (0, V.jsx)("button", {
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
			children: [is, as]
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
			children: os
		})
	] }), $o);
}
var ms = {
	ArrowRight: (e, t) => e + t,
	ArrowUp: (e, t) => e + t,
	ArrowLeft: (e, t) => e - t,
	ArrowDown: (e, t) => e - t,
	Home: () => R,
	End: () => Ce
};
function hs({ dock: e, axis: t, label: n, ticks: r }) {
	let { phrase: i } = s(), a = Q(e, t === "w" ? "slW" : "slH"), o = Q(e, "locked"), c = (0, B.useRef)(null), l = t === "w" ? "slWLb" : "slHLb", u = Ee(a), d = (e, t) => {
		let n = e.getBoundingClientRect();
		return R + Math.min(1, Math.max(0, (t - n.left) / n.width)) * (Ce - R);
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
					style: { left: Ee(e) },
					children: [/* @__PURE__ */ (0, V.jsx)("i", {}), /* @__PURE__ */ (0, V.jsx)("em", { children: e })]
				}, e)),
				/* @__PURE__ */ (0, V.jsx)("span", {
					className: "thumb",
					role: "slider",
					tabIndex: o ? -1 : 0,
					"aria-labelledby": l,
					"aria-valuemin": R,
					"aria-valuemax": Ce,
					"aria-valuenow": a,
					"aria-valuetext": `${a}dp`,
					"aria-disabled": o,
					style: { left: u },
					ref: c,
					onKeyDown: (n) => {
						let r = ms[n.key]?.(a, De(n.nativeEvent));
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
function gs({ dock: e, host: t }) {
	let { element: n, place: r } = o(t), i = Q(e, "sliders"), a = Q(e, "locked");
	return (0, B.useLayoutEffect)(() => {
		n && (n.hidden = !i, n.classList.toggle("off", a));
	}, [
		n,
		i,
		a
	]), r(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)(hs, {
		dock: e,
		axis: "w",
		label: "size.w",
		ticks: [600, 840]
	}), /* @__PURE__ */ (0, V.jsx)(hs, {
		dock: e,
		axis: "h",
		label: "size.h",
		ticks: [480, 900]
	})] }), es);
}
// src/components/InsetOverlay.tsx
function _s(e, t, n) {
	if (!e || !t || n?.kind !== "device") return null;
	let r = n.widthDp, i = n.heightDp, a = Object.fromEntries(qr.map((e) => [e, Math.max(0, ...Kr.map((n) => t.values[n][e]))]));
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
function vs(e, t) {
	let { on: n } = (0, B.useSyncExternalStore)($n.subscribe, $n.get);
	return _s(n, e, t);
}
function ys(e, t, n, r) {
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
function bs({ deviceInsets: e, size: t, host: n }) {
	let { element: r, place: i } = o(n), a = vs(e, t);
	if ((0, B.useLayoutEffect)(() => {
		r && (r.hidden = !a);
	}, [r, a]), !a) return i(null, Ko);
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
		}), Kr.map((e) => /* @__PURE__ */ (0, V.jsx)("g", {
			className: "io-band",
			"data-kind": e,
			children: qr.filter((t) => a.insets.values[e][t] > 0).map((t) => {
				let { fill: n, line: r } = ys(t, a.insets.values[e][t], s, c);
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
	}), Ko);
}
var xs = (e) => String(Math.round(e * 100) / 100);
function Ss({ w: e, h: t, insets: n, widest: r }) {
	return qr.flatMap((i) => {
		let a = i === "top" || i === "bottom" ? t : e, o = Kr.filter((e) => e !== "displayCutout").reduce((e, t) => n.values[t][i] > n.values[e][i] ? t : e);
		return [[o, Jr(o, i)], ["displayCutout", Jr("displayCutout", i)]].flatMap(([e, t]) => {
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
var Cs = (e) => `${e * 100}%`;
function ws({ deviceInsets: e, size: t, host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = vs(e, t);
	if ((0, B.useLayoutEffect)(() => {
		i && (i.hidden = !c);
	}, [i, c]), !c) return a(null, qo);
	let { w: l, h: u, safe: d } = c;
	return a(/* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [Ss(c).map((e) => {
		let t = e.side === "right" || e.side === "left" ? {
			top: Cs(e.from),
			height: Cs(e.to - e.from)
		} : {
			left: Cs(e.from),
			width: Cs(e.to - e.from)
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
						children: xs(e.value)
					})]
				})
			]
		}, `${e.kind} ${e.edge}`);
	}), /* @__PURE__ */ (0, V.jsxs)("div", {
		className: "im-safe",
		"data-kind": "safeDrawing",
		style: {
			left: Cs((d.x + d.w / 2) / l),
			top: Cs((d.y + d.h / 2) / u)
		},
		children: [/* @__PURE__ */ (0, V.jsx)("b", { children: r("insetOverlay.safeArea") }), /* @__PURE__ */ (0, V.jsxs)("span", { children: [
			xs(d.w),
			" × ",
			xs(d.h)
		] })]
	})] }), qo);
}
var Ts = /* @__PURE__ */ (0, V.jsxs)("svg", {
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
function Es() {
	let { phrase: e } = s(), { on: t } = (0, B.useSyncExternalStore)($n.subscribe, $n.get), { on: n } = (0, B.useSyncExternalStore)(Zn.subscribe, Zn.get), r = e("insetOverlay.now", { value: e(t ? "systemUi.on" : "systemUi.off") });
	return /* @__PURE__ */ (0, V.jsx)("button", {
		type: "button",
		id: "insetBtn",
		className: "tb-btn",
		"aria-pressed": t,
		"aria-label": r,
		title: r,
		disabled: n,
		onClick: () => $n.set({ on: !t }),
		children: Ts
	});
}
// src/components/Workspace.tsx
var Ds = {
	exit() {},
	zoomIn() {},
	zoomOut() {},
	zoomFit() {},
	zoomMenuPick() {},
	toggleZoomMenu() {},
	pickSystemUi() {}
};
function Os({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e), { on: i, failed: a } = (0, B.useSyncExternalStore)(Zn.subscribe, Zn.get);
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
	})] }), Go);
}
var ks = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M4 8h8" })
}), As = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M4 8h8M8 4v8" })
}), js = (e) => (0, B.useSyncExternalStore)(Xn.subscribe, () => Xn.get()[e]);
function Ms({ real: e, menu: t, disabled: n, actions: r }) {
	let { phrase: i } = s(), a = js("pct");
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
var Ns = (0, B.memo)(function({ host: e, actions: t = Ds }) {
	let { phrase: n } = s(), { element: r, place: i } = o(e), a = js("real"), c = js("atFit"), l = js("menu"), u = js("disabled");
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
			children: ks
		}),
		/* @__PURE__ */ (0, V.jsx)(Ms, {
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
			children: As
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
	] }), Yo);
}), Ps = /* @__PURE__ */ (0, V.jsxs)("svg", {
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
function Fs({ systemUi: e, deviceInsets: t = null, host: n, actions: r = Ds }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), { on: l } = (0, B.useSyncExternalStore)(Zn.subscribe, Zn.get), u = !e && !t;
	(0, B.useLayoutEffect)(() => {
		a && (a.hidden = u);
	}, [a, u]);
	let d = !!e?.shown, f = i(t ? "insetOverlay.label" : "systemUi.label");
	if ((0, B.useLayoutEffect)(() => {
		a?.setAttribute("aria-label", f);
	}, [a, f]), t) return c(/* @__PURE__ */ (0, V.jsx)(Es, {}), Jo);
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
		children: Ps
	}), Jo);
}
var Is = 12, Ls = 48;
function Rs(e, t) {
	let n = e.querySelector("#backName"), r = t.querySelector("#wsName"), i = t.querySelector("#wsFn"), a = e.parentElement, o = document.getElementById("barR");
	if (!n || !r || !i || !a || !o || (n.style.maxWidth = "", n.style.display = "", t.hidden || !(t.offsetParent instanceof HTMLElement))) return;
	if (getComputedStyle(t).position !== "absolute") {
		t.style.removeProperty("--ws-left"), t.style.removeProperty("--ws-max");
		return;
	}
	let s = t.offsetParent.clientWidth, c = o.offsetLeft - Is, l = Math.min(Math.max(r.scrollWidth, i.hidden ? 0 : i.scrollWidth) + 1, s * .34), u = Math.min(s / 2 - l / 2, c - l), d = () => {
		let e = 0;
		for (let t of a.children) t instanceof HTMLElement && t.offsetParent && (e = Math.max(e, a.offsetLeft + t.offsetLeft + t.offsetWidth));
		return e + Is;
	}, f = d();
	if (f > u && !e.hidden) {
		let e = n.offsetWidth - (f - u);
		e < Ls ? n.style.display = "none" : n.style.maxWidth = `${e}px`, f = d();
	}
	let p = Math.max(u, f), m = Math.max(0, Math.min(l, c - p));
	t.style.setProperty("--ws-left", `${p + m / 2}px`), t.style.setProperty("--ws-max", `${m}px`);
}
var zs = /* @__PURE__ */ (0, V.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.8",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, V.jsx)("path", { d: "M10 3.5 5.5 8l4.5 4.5" })
});
function Bs({ state: e, hosts: t, actions: n = Ds }) {
	let { phrase: r } = s(), i = o(t?.back), a = o(t?.title), c = e?.screen === "focus" ? e.focus : null, l = c ? (e.tabs || []).find((e) => e.active) : void 0, u = c ? Ve(e?.board, e?.board?.focus) : null;
	(0, B.useLayoutEffect)(() => {
		document.body.classList.toggle("ws", !!c), i.element && (i.element.hidden = !c), a.element && (a.element.hidden = !c, a.element.title = c ? u ? u.title : l ? l.title : c.previewId : ""), i.element && a.element && Rs(i.element, a.element);
	}), (0, B.useLayoutEffect)(() => () => document.body.classList.remove("ws"), []), (0, B.useLayoutEffect)(() => {
		let e = i.element, t = a.element, n = e?.parentElement?.parentElement, r = document.getElementById("barR");
		if (!e || !t) return;
		let o = new ResizeObserver(() => Rs(e, t));
		for (let e of [n, r]) e && o.observe(e);
		return () => o.disconnect();
	}, [i.element, a.element]);
	let d = /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [zs, /* @__PURE__ */ (0, V.jsx)("span", {
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
function Vs({ screen: e, systemUi: t = null, deviceInsets: n = null, size: r = null, hosts: i, actions: a = Ds, dock: o }) {
	let { phrase: c } = s(), [l, u] = (0, B.useState)(null), d = i?.view ?? l;
	return (0, B.useLayoutEffect)(() => {
		d && e !== null && (d.hidden = e !== "focus");
	}, [e, d]), i ? /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		o && /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
			/* @__PURE__ */ (0, V.jsx)(fs, {
				dock: o,
				host: i.menu
			}),
			/* @__PURE__ */ (0, V.jsx)(ps, {
				dock: o,
				host: i.posture
			}),
			/* @__PURE__ */ (0, V.jsx)(gs, {
				dock: o,
				host: i.sliders
			})
		] }),
		/* @__PURE__ */ (0, V.jsx)(Os, { host: i.loading }),
		/* @__PURE__ */ (0, V.jsx)(bs, {
			deviceInsets: n,
			size: r,
			host: i.inset
		}),
		/* @__PURE__ */ (0, V.jsx)(ws, {
			deviceInsets: n,
			size: r,
			host: i.insetMarks
		}),
		/* @__PURE__ */ (0, V.jsx)(Fs, {
			systemUi: t,
			deviceInsets: n,
			host: i.systemUi,
			actions: a
		}),
		/* @__PURE__ */ (0, V.jsx)(Ns, {
			host: i.zoom,
			actions: a
		})
	] }) : /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [/* @__PURE__ */ (0, V.jsx)("section", {
		id: "focusView",
		ref: u,
		children: /* @__PURE__ */ (0, V.jsx)(Zo, {
			loading: /* @__PURE__ */ (0, V.jsx)(Os, {}),
			inset: /* @__PURE__ */ (0, V.jsx)(bs, {
				deviceInsets: n,
				size: r
			}),
			marks: /* @__PURE__ */ (0, V.jsx)(ws, {
				deviceInsets: n,
				size: r
			})
		})
	}), /* @__PURE__ */ (0, V.jsx)("div", {
		className: "panel",
		id: "panel",
		role: "toolbar",
		"aria-label": c("panel.label"),
		children: /* @__PURE__ */ (0, V.jsx)(ts, {
			...o && {
				menu: /* @__PURE__ */ (0, V.jsx)(fs, { dock: o }),
				posture: /* @__PURE__ */ (0, V.jsx)(ps, { dock: o }),
				sliders: /* @__PURE__ */ (0, V.jsx)(gs, { dock: o })
			},
			systemUi: /* @__PURE__ */ (0, V.jsx)(Fs, {
				systemUi: t,
				deviceInsets: n,
				actions: a
			}),
			zoom: /* @__PURE__ */ (0, V.jsx)(Ns, { actions: a })
		})
	})] });
}
// src/ViewerRoot.tsx
function Hs() {
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
function Us({ state: e, draw: t = 0, statusState: n = e, connection: r = null, app: i = null, shortcuts: a = [], hosts: o, board: s, workspace: c, dock: l, point: u, renderLegacy: d }) {
	(0, B.useLayoutEffect)(() => {
		e && d(e);
	}, [t]);
	let f = ot(e, r), p = W().files, m = f ? "gallery" : e?.screen ?? null;
	return o ? /* @__PURE__ */ (0, V.jsxs)(V.Fragment, { children: [
		/* @__PURE__ */ (0, V.jsx)(bn, {
			header: e?.header ?? null,
			tabs: e?.tabs ?? [],
			app: i,
			host: o.app,
			brand: o.brand
		}),
		/* @__PURE__ */ (0, V.jsx)(lo, {
			state: n,
			connection: r,
			host: o.status,
			bar: o.bar
		}),
		/* @__PURE__ */ (0, V.jsx)(kn, { host: o.helpButton }),
		/* @__PURE__ */ (0, V.jsx)(hn, {
			tabs: e?.tabs ?? null,
			screen: e?.screen ?? null,
			gallery: f,
			hosts: o.rail
		}),
		/* @__PURE__ */ (0, V.jsx)(za, {
			on: f,
			count: p?.length ?? null,
			host: o.railAll
		}),
		/* @__PURE__ */ (0, V.jsx)(co, {
			rows: e?.stale ?? null,
			host: o.stale
		}),
		/* @__PURE__ */ (0, V.jsx)(Wi, {
			pending: !!e?.buildPending,
			host: o.buildNotice
		}),
		/* @__PURE__ */ (0, V.jsx)(La, {
			shown: f,
			state: e,
			draw: t,
			host: o.gallery
		}),
		/* @__PURE__ */ (0, V.jsx)(so, {
			board: e?.board ?? null,
			screen: m,
			hosts: o.board,
			actions: s
		}),
		/* @__PURE__ */ (0, V.jsx)(Jt, {
			state: e,
			draw: t,
			connection: r,
			hosts: o.quickOpen
		}),
		/* @__PURE__ */ (0, V.jsx)(Bo, {
			screen: m,
			vacant: e?.vacant ?? null,
			host: o.vacant
		}),
		/* @__PURE__ */ (0, V.jsx)(Vs, {
			screen: e?.screen ?? null,
			systemUi: e?.focus?.systemUi ?? null,
			deviceInsets: e?.focus?.deviceInsets ?? null,
			size: e?.focus?.size ?? null,
			hosts: o.workspace,
			actions: c,
			dock: l
		}),
		/* @__PURE__ */ (0, V.jsx)(Bs, {
			state: e,
			hosts: o.workspaceHeader,
			actions: c
		}),
		/* @__PURE__ */ (0, V.jsx)(Ro, { actions: u }),
		/* @__PURE__ */ (0, V.jsx)(zo, {
			choice: e?.choice ?? null,
			repo: e?.header?.repo,
			host: o.chooser,
			actions: u
		}),
		/* @__PURE__ */ (0, V.jsx)(Ba, { host: o.capsule }),
		/* @__PURE__ */ (0, V.jsx)(On, {
			table: a,
			host: o.help
		})
	] }) : null;
}
function Ws({ renderLegacy: e, messages: t, hosts: n, shortcuts: r, board: i, workspace: a, dock: o, point: s }) {
	let c = document.createElement("div");
	c.hidden = !0, document.body.append(c);
	let l = (0, Ui.createRoot)(c), u = null, f = null, p = null, m = null, h = 0, g = () => l.render(/* @__PURE__ */ (0, V.jsx)(d.Provider, {
		value: t,
		children: /* @__PURE__ */ (0, V.jsx)(Us, {
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
	return (0, Hi.flushSync)(g), te("/app.json").then((e) => e.json()).then((e) => {
		m = e, g();
	}).catch(() => {
		m = {}, g();
	}), {
		apply(e, t = !1) {
			u = e, t && f || (f = e), h++, (0, Hi.flushSync)(g);
		},
		connection(e) {
			p = e, (0, Hi.flushSync)(g);
		},
		dispose() {
			l.unmount(), c.remove();
		}
	};
}
// src/main.tsx
var Gs = xn(), $ = ei($r()), Ks = (e) => {
	gi(e), Gs?.update(e);
}, qs = () => {
	let { cursor: e } = p();
	e != null && ai(e);
}, Js = {
	exit: oi,
	zoomIn: $.zoomIn,
	zoomOut: $.zoomOut,
	zoomFit: $.zoomFit,
	zoomMenuPick: $.zoomMenuPick,
	toggleZoomMenu: $.toggleZoomMenu,
	pickSystemUi: si
}, Ys = {
	choose: Rr,
	cancel: zr,
	follow: Wr,
	pick: Nr,
	peek: Pr,
	jump: Fr,
	close: Y
};
Lr();
var Xs = {
	screen: () => L.st ? Xe() ? "gallery" : L.st.screen : "offline",
	tabCount: dn,
	moveCursor: v,
	openCursor: qs,
	exitFocus: oi,
	openGallery: Qe,
	stepTab: ln,
	jumpTab: un,
	openQuickOpen: Lt,
	helpOpen: En,
	toggleHelp: Dn,
	zoomIn: Js.zoomIn,
	zoomOut: Js.zoomOut,
	zoomFit: Js.zoomFit
}, Zs = Ri(k, Xs);
Vi(Zs, Xs, {
	chooserOpen: () => !!document.getElementById("chooser")?.classList.contains("on"),
	cancelChoice: zr,
	closeZoomMenu: $.closeZoomMenu,
	closeDeviceMenu: $.closeDeviceMenu,
	closeDirPop: yn,
	closeRailDrawer: sn,
	closeCard: Ir,
	closeSheet: tt,
	sheetOpen: rt,
	openSheetFile: () => {
		qe().sheet?.closing || document.querySelector("#galleryView .gsheet-go")?.click();
	}
});
var Qs = Ws({
	renderLegacy: Ks,
	messages: {
		phrase: k,
		daemonText: O
	},
	hosts: Hs(),
	shortcuts: Zs,
	board: {
		open: ai,
		point: Gr
	},
	workspace: Js,
	dock: $.dock,
	point: Ys
});
Li({
	workspace: $,
	render: Qs.apply,
	onConnection: Qs.connection,
	onPreviewFiles: () => {
		zt(), at(), Er();
	},
	prepared: Gs
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
