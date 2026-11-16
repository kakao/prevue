import { i as e, n as t, r as n, t as r } from "./react.js";
import { createScene as i, handoffMs as a, i as o, n as s, r as c, sceneEasing as l, sceneMs as u, t as d } from "./preparation-scene.js";
import { applyReveal as f, boardMarks as p, cancelReveal as m, cardAt as h, cardStage as g, clearTrees as _, moveCursor as v, onRelayout as y, returnCard as b, reveal as x, ringCard as S, setCursor as C, stuckHead as w, subscribeBoard as T, syncBoard as E, trees as D } from "./board.js";
import { daemonText as O, phrase as k } from "./strings.js";
import { connect as A, fetchPreviewFiles as j, fetchProjectFiles as M, get as N, post as P, reportStreamWidth as ee, viewerStream as te } from "./api.js";
import { capsuleContent as ne, dismissOnce as F, flash as I, hideOnce as re, renderError as ie, setStatus as ae, setSummary as oe, showOnce as se, subscribeCapsule as ce } from "./capsule.js";
import { MORPH_LEAD as le, frameMorph as ue, freeze as de, hold as fe, motionMs as pe, motionToken as me, radiiOf as he, reduced as ge, swapImage as _e, transition as ve, transitioning as ye } from "./motion.js";
import { store as L } from "./store.js";
import { cameraOf as be, createResizeScene as xe } from "./resize-scene.js";
import { DEVICES as Se, DEVICE_MENU as Ce } from "./devices.js";
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
function H(e, t) {
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
var Ne = (e) => {
	let t = (e?.tabs || []).find((e) => e.active);
	return t ? t.key : e?.board?.file ?? null;
};
function Pe(e, t) {
	if (!e || t == null) return null;
	for (let n of e.groups) for (let e of n.cards) if (e.index === t) return e;
	return null;
}
// src/components/QuickOpen.tsx
var Fe = 8, Ie = 5, Le = [], Re = (e) => e.map((e) => ({
	...e,
	name: e.rel.split("/").pop()
}));
function ze(e) {
	if (!e || !e.fns.size) return null;
	let t = null;
	for (let [n, r] of e.fns) (!t || r.size > t[1].size) && (t = [n, r]);
	return {
		fn: t[0],
		idx: t[1],
		more: e.fns.size - 1
	};
}
function Be(e, t, n) {
	let r = t.trim().split(/\s+/).filter(Boolean);
	if (!e) return {
		sections: [],
		more: 0,
		empty: !r.length,
		loading: !0
	};
	if (!r.length) {
		let t = new Map(e.map((e) => [e.path, e])), r = e.slice(0, Ie), i = new Set(r.map((e) => e.path)), a = n.map((e) => t.get(e)).filter((e) => !!e && !i.has(e.path)), o = Fe - r.length, s = a.length < o ? e.slice(Ie).filter((e) => !a.includes(e)).slice(0, o - a.length) : [], c = [{
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
		let e = H(r, t);
		e && i.push({
			f: t,
			m: e
		});
	}
	i.sort((e, t) => t.m.score - e.m.score || t.f.mtime - e.f.mtime);
	let a = i.slice(0, Fe).map((e) => ({
		...e,
		fn: ze(e.m)
	}));
	return {
		sections: a.length ? [{ rows: a }] : [],
		more: Math.max(0, i.length - Fe),
		empty: !1,
		loading: !1
	};
}
function Ve({ text: e, idx: t }) {
	if (!t?.size) return e;
	let n = [];
	return [...e].forEach((e, r) => {
		let i = t.has(r), a = n[n.length - 1];
		a && a[1] === i ? a[0] += e : n.push([e, i]);
	}), n.map(([e, t], n) => t ? /* @__PURE__ */ (0, z.jsx)("b", { children: e }, n) : e);
}
var He = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.4",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M3 8h10M9 4l4 4-4 4" })
}), Ue = (e) => (e || "").replace(/^:/, "").replace(/:/g, "/"), We = -1, Ge = -1, Ke = !1;
addEventListener("mousemove", (e) => {
	Ke = e.screenX !== We || e.screenY !== Ge, We = e.screenX, Ge = e.screenY;
}, !0);
var qe = (0, R.memo)(function({ files: e, ready: t, query: n, sel: r, recent: i = Le, fieldRef: a, onQuery: o, onSelect: l, onPick: u, onEscape: d, onLeave: f }) {
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
	}, []), b = (0, R.useMemo)(() => e && Re(e), [e]), { sections: x, more: S, empty: C, loading: w } = (0, R.useMemo)(() => Be(b, n, i), [
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
			Ke && E !== t && l(t);
		},
		onClick: () => u?.(e),
		children: [
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: "qo-arrow",
				children: He
			}),
			/* @__PURE__ */ (0, z.jsx)("span", {
				className: "qo-name",
				children: /* @__PURE__ */ (0, z.jsx)(Ve, {
					text: e.f.name,
					idx: e.m?.name
				})
			}),
			e.fn && /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "qo-fn",
				children: [
					"› ",
					/* @__PURE__ */ (0, z.jsx)(Ve, {
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
				children: Ue(e.f.module)
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
function U({ hosts: e, children: t }) {
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
function Je({ host: e, children: t }) {
	let { phrase: n } = s(), { place: r } = o(e);
	return r(/* @__PURE__ */ (0, z.jsxs)("div", {
		className: "start-in",
		children: [/* @__PURE__ */ (0, z.jsx)("p", {
			className: "start-lead",
			children: n("start.lead")
		}), t]
	}), (e, t) => /* @__PURE__ */ (0, z.jsx)("section", {
		id: "startView",
		className: "start",
		ref: e,
		children: t
	}));
}
var W = {
	open: !1,
	files: null,
	ready: !1,
	query: "",
	sel: -1,
	recent: []
}, Ye = /* @__PURE__ */ new Set();
function Xe(e, t = !1) {
	if (!Object.keys(e).every((t) => W[t] === e[t]) && (W = {
		...W,
		...e
	}, !t)) for (let e of Ye) e();
}
var Ze = (e) => (Ye.add(e), () => {
	Ye.delete(e);
}), Qe = () => W, G = null, K = null, $e = null, q = !1, et = null, tt = 0, nt = !1, rt = !1, it = null, at = 0, ot = () => "prevue.recent:" + (L.st?.header.repo || "");
function st() {
	try {
		return JSON.parse(localStorage.getItem(ot()) || "[]");
	} catch {
		return [];
	}
}
function ct(e, t = !1) {
	if (!e) return;
	let n = [e, ...st().filter((t) => t !== e)].slice(0, 20);
	try {
		localStorage.setItem(ot(), JSON.stringify(n));
	} catch {}
	Xe({ recent: n }, t);
}
async function lt() {
	let e = ++at, t = await j().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === at && Xe(t);
}
function ut(e = null) {
	if (q) K?.focus({ preventScroll: !0 }), K?.select();
	else if (G) {
		if (!W.open) {
			let { sheet: t, curtain: n } = G;
			nt = !0, et = e && e !== document.body ? e : null, $e?.setAttribute("aria-expanded", "true"), t.hidden = !1, n.hidden = !1, t.classList.remove("closing"), Xe({
				open: !0,
				query: "",
				sel: -1,
				recent: st()
			}), requestAnimationFrame(() => {
				W.open && (n.classList.add("on"), t.classList.add("on"));
			}), lt();
		}
		K?.focus({ preventScroll: !0 }), K?.select();
	}
}
function J(e = !1, t = !1) {
	if (tt = 0, !W.open || !G) return;
	let { sheet: n, curtain: r } = G;
	K && (K.value = "", K.blur()), t && et?.isConnected && et.focus({ preventScroll: !0 }), et = null, Xe({ open: !1 }), $e?.setAttribute("aria-expanded", "false"), r.classList.remove("on"), n.classList.remove("on"), e ? (n.hidden = !0, r.hidden = !0) : (n.classList.add("closing"), setTimeout(() => {
		W.open || (n.hidden = !0, r.hidden = !0, n.classList.remove("closing"));
	}, 220));
}
function dt() {
	(W.open || q) && lt();
}
function ft() {
	let e = tt = performance.now();
	setTimeout(() => {
		tt === e && J();
	}, 1500);
}
async function pt(e, { phrase: t, daemonText: n }) {
	let r = e.f, i = L.st, a = e.fn ? e.fn.fn : null;
	if (ct(r.path, !0), r.path === Ne(i)) {
		x(r.path, a), i?.screen === "focus" && i.focus ? (ft(), P("/viewer/exit")) : (J(), f());
		return;
	}
	x(r.path, a), ft();
	let o = await P("/viewer/open", { file: r.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	o.ok || (tt = 0, m(), I(n(o.message) || t("open.cannot")));
}
var mt = (e) => {
	e ? K = e : K && !K.isConnected && (K = null);
}, ht = (e, t) => Xe({
	query: e,
	sel: t
}), gt = (e) => Xe({ sel: e }), _t = () => {
	q ? K?.blur() : J(!1, !0);
}, vt = (e) => {
	W.open && G && e && !G.sheet.contains(e) && e !== $e && J();
}, yt = (0, R.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, R.useLayoutEffect)(() => {
		if (!n) return;
		$e = n, n.title = t("rail.open.tip"), n.setAttribute("aria-label", t("rail.open.label"));
		let e = (e) => W.open ? J(!1, !0) : ut(e.detail === 0 ? n : null);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), $e = null;
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
function bt({ state: e, draw: t, connection: n, hosts: r }) {
	let i = s(), a = (0, R.useSyncExternalStore)(Ze, Qe), o = n !== "lost" && e?.screen === "empty" && !!e.header.repo;
	(0, R.useLayoutEffect)(() => {
		G = r;
		let e = (e) => {
			let t = e.target;
			W.open && !r.sheet.contains(t) && !r.curtain.contains(t) && !$e?.contains(t) && J();
		}, t = () => J(!1, !0), n = () => {
			q && !document.hidden && lt();
		};
		return document.addEventListener("pointerdown", e, !0), r.curtain.addEventListener("click", t), document.addEventListener("visibilitychange", n), () => {
			document.removeEventListener("pointerdown", e, !0), r.curtain.removeEventListener("click", t), document.removeEventListener("visibilitychange", n), G = null, q = !1;
		};
	}, [r]), (0, R.useLayoutEffect)(() => {
		o !== q && (q = o, o ? (J(!0), nt = !0, r.start.hidden = !1, lt()) : (r.start.hidden = !0, r.start.classList.remove("enter")), Xe({
			query: "",
			sel: -1,
			...o ? { recent: st() } : {}
		}));
	}, [o]), (0, R.useLayoutEffect)(() => {
		if (!e) return;
		let t = Ne(e);
		t && t !== it && (it = t, ct(t)), tt && e.screen !== "empty" && J(!0);
	}, [t]), (0, R.useLayoutEffect)(() => {
		n === "lost" && J(!0);
	}, [n]), (0, R.useLayoutEffect)(() => {
		nt ? ((q ? r.start : r.sheet).classList.add("enter"), (q ? r.sheet : r.start).classList.remove("enter"), nt = !1, rt = !0, requestAnimationFrame(() => {
			rt = !1;
		})) : rt || (r.sheet.classList.remove("enter"), r.start.classList.remove("enter"));
	});
	let c = (0, R.useCallback)((e) => pt(e, i), [i]), l = /* @__PURE__ */ (0, z.jsx)(qe, {
		files: a.files,
		ready: a.ready,
		query: a.query,
		sel: a.sel,
		recent: a.recent,
		fieldRef: mt,
		onQuery: ht,
		onSelect: gt,
		onPick: c,
		onEscape: _t,
		onLeave: vt
	});
	return /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)(U, {
		hosts: r,
		children: !o && l
	}), /* @__PURE__ */ (0, z.jsx)(Je, {
		host: r.start,
		children: o && l
	})] });
}
// src/components/FileRail.tsx
var xt = "prevue.sharedOnce", St = [], Ct = matchMedia("(max-width: 640px)"), wt = (e) => {}, Tt = () => document.body.classList.contains("rail-drawer"), Et = () => Tt() ? (wt(!1), !0) : !1, Dt = [];
function Ot(e) {
	let t = Dt.findIndex((e) => e.active), n = Dt[Math.max(0, Math.min(Dt.length - 1, t + e))];
	n && !n.active && P("/viewer/tab", { key: n.key });
}
function kt(e) {
	let t = Dt[e - 1];
	t && !t.active && P("/viewer/tab", { key: t.key });
}
var At = () => Dt.length, jt = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
function Mt(e) {
	let t = e.match(jt) || [e], n = "";
	for (let e = t.length - 1; e > 0 && !(n && (t[e] + n).length > 12); e--) n = t[e] + n;
	return n.length >= e.length - 2 ? "" : n;
}
var Nt = null, Pt = (e, t) => (Nt ??= document.createElement("canvas").getContext("2d"), Nt.font = t, Nt.measureText(e).width), Ft = (e) => {
	let t = getComputedStyle(e);
	return `${t.fontWeight} ${t.fontSize} ${t.fontFamily}`;
};
function It(e, t, n) {
	if (Pt(e, n) <= t) return e;
	let r = Mt(e), i = r.match(jt) || [], a = i.map((e, t) => i.slice(t).join(""));
	for (let [r, i] of [...a.map((e) => [e, 3]), [a[a.length - 1] || "", 1]]) for (let a = e.length - r.length - 1; a >= i; a--) {
		let i = e.slice(0, a) + "…" + r;
		if (Pt(i, n) <= t) return i;
	}
	for (let i = 1; i < r.length; i++) {
		let a = e[0] + "…" + r.slice(i);
		if (Pt(a, n) <= t) return a;
	}
	return e[0] + "…";
}
var Lt = 56;
function Rt(e, t, n = !1) {
	let r = [...t.querySelectorAll(".rt:not(.leaving)")];
	if (!r.length || e.hidden) return;
	let i = (e, t) => e.querySelector(t), a = Ft(i(r[0], ".rt-name")), o = Ft(i(r[0], ".rt-mod")), s = parseFloat(getComputedStyle(r[0]).columnGap) || 0, c = (t) => t.dataset.name + "|" + i(t, ".rt-mod").textContent + "|" + e.clientWidth, l = r.filter((e) => n || e.dataset.fitted !== c(e));
	if (!l.length) return;
	for (let e of l) i(e, ".rt-mod").style.maxWidth = "0px";
	let u = l.map((e) => i(e, ".rt-name").clientWidth + (i(e, ".rt-mod").textContent ? s : 0));
	l.forEach((e, t) => {
		let n = i(e, ".rt-name"), r = i(e, ".rt-mod"), l = u[t], d = l;
		if (r.textContent) {
			let t = Math.min(Math.ceil(Pt(r.textContent, o)), Math.max(l - s - Math.ceil(Pt(e.dataset.name, a)), Lt));
			r.style.maxWidth = t + "px", d = l - s - t;
		} else r.style.maxWidth = "";
		n.textContent = It(e.dataset.name, d, a), e.dataset.fitted = c(e);
	});
}
function zt({ tab: e, leaving: t, enter: n, onGone: r, observe: i }) {
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
		if (ge.matches || document.hidden) {
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
			e.active ? Et() : P("/viewer/tab", { key: e.key });
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
function Bt({ tabs: e, screen: t, hosts: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n?.list), [c, l] = (0, R.useState)(null), [u, d] = (0, R.useState)(null), f = n?.rail ?? c, p = n?.empty ?? u, m = (0, R.useRef)(null), h = e ?? St, g = t !== "focus", _ = (0, R.useRef)(h), [v, y] = (0, R.useState)([]);
	if (_.current !== h) {
		let e = new Set(h.map((e) => e.key)), t = _.current.filter((t) => !e.has(t.key) && !v.some((e) => e.key === t.key));
		(t.length || v.some((t) => e.has(t.key))) && y([...v.filter((t) => !e.has(t.key)), ...t]), _.current = h;
	}
	let b = (e) => y((t) => t.filter((t) => t.key !== e)), x = (0, R.useRef)(!1), S = (0, R.useRef)(null), C = x.current && g && !ge.matches && !document.hidden, w = (0, R.useRef)({
		y: 0,
		stretch: null,
		sliding: !1
	}), T = (e) => {
		let t = m.current, n = w.current;
		if (!t || !i) return;
		let r = i.querySelector(".rt.active:not(.leaving)");
		if (t.hidden = !r, !r) return;
		let a = r.offsetTop;
		e && !ge.matches && a !== n.y ? (n.stretch?.cancel(), n.sliding = !0, (n.stretch = t.animate([{ transform: `translateY(${n.y}px)` }, { transform: `translateY(${a}px)` }], {
			duration: pe("--duration-medium2"),
			easing: me("--easing-standard")
		})).finished.then(() => {
			n.stretch = null, n.sliding = !1;
		}, () => {})) : n.stretch && !e && (n.stretch.cancel(), n.stretch = null, n.sliding = !1), n.y = a, t.style.transform = `translateY(${a}px)`;
	}, E = (0, R.useRef)(T);
	E.current = T;
	let [D] = (0, R.useState)(() => new ResizeObserver(() => E.current(w.current.sliding))), O = (e, t) => {
		e && (t ? D.observe(e) : D.unobserve(e));
	};
	(0, R.useEffect)(() => () => D.disconnect(), [D]), (0, R.useEffect)(() => {
		f && i && document.fonts?.ready.then(() => Rt(f, i, !0));
	}, [f, i]), (0, R.useEffect)(() => {
		if (!n) return;
		let { toggle: e, scrim: t, open: r } = n;
		wt = (t) => {
			document.body.classList.toggle("rail-drawer", t), e.setAttribute("aria-expanded", String(t));
		};
		let i = () => wt(!Tt()), a = () => wt(!1);
		return e.addEventListener("click", i), t.addEventListener("click", a), r.addEventListener("click", a), Ct.addEventListener("change", a), () => {
			e.removeEventListener("click", i), t.removeEventListener("click", a), r.removeEventListener("click", a), Ct.removeEventListener("change", a);
		};
	}, [n]), (0, R.useLayoutEffect)(() => {
		if (!e || !f || !i) return;
		f.hidden = !g, g || Et(), n && document.body.classList.toggle("rail-on", g), p && (p.hidden = e.length > 0), Rt(f, i), Dt = e;
		let t = e.find((e) => e.active);
		t && we(t.sourceSet) === "kmp" ? se(xt, () => r("capsule.sharedOnce", { sourceSet: t.sourceSet })) : re(xt);
		let a = t?.key ?? null, o = x.current && g && a !== S.current && S.current !== null;
		o && Et(), S.current = a, x.current = g, T(o);
	}, [
		e,
		t,
		f,
		i,
		p
	]);
	let k = [...h.map((e) => ({
		tab: e,
		leaving: !1
	})), ...v.map((e) => ({
		tab: e,
		leaving: !0
	}))], A = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("div", {
		className: "rail-glider instant",
		id: "railGlider",
		ref: m,
		hidden: !0
	}), k.map(({ tab: e, leaving: t }) => /* @__PURE__ */ (0, z.jsx)(zt, {
		tab: e,
		leaving: t,
		enter: C,
		onGone: b,
		observe: O
	}, e.key))] });
	return n ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [a(A, () => null), /* @__PURE__ */ (0, z.jsx)(yt, { host: n.open })] }) : /* @__PURE__ */ (0, z.jsxs)("nav", {
		className: "rail",
		id: "rail",
		ref: l,
		"aria-label": r("rail.title"),
		children: [
			/* @__PURE__ */ (0, z.jsx)("h4", {
				className: "rail-h",
				children: r("rail.title")
			}),
			a(A, (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
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
				ref: d,
				hidden: !0,
				children: r("rail.empty")
			}),
			/* @__PURE__ */ (0, z.jsx)(yt, {})
		]
	});
}
// src/components/ProjectHeader.tsx
var Vt = 8, Ht = (e) => [...e].reduce((e, t) => e * 31 + t.codePointAt(0) >>> 0, 7) % Vt + 1, Ut = () => !1, Wt = () => Ut();
function Gt({ header: e, tabs: t, app: n, iconUrl: r = "/app-icon.png", host: i, brand: a }) {
	let { phrase: c } = s(), { element: l, place: u } = o(i), [d, f] = (0, R.useState)(!1), [p, m] = (0, R.useState)(null), h = (0, R.useRef)({
		open: !1,
		byKey: !1
	}), g = (0, R.useRef)(null), _ = (0, R.useRef)(null), v = (0, R.useRef)(null), y = e ? n?.name || e.repoLeaf : "";
	(0, R.useLayoutEffect)(() => {
		a && n?.prevue && (a.title = `Prevue ${n.prevue}`);
	}, [a, n]), (0, R.useLayoutEffect)(() => {
		v.current?.style.setProperty("background", e ? `var(--avatar-${Ht(y)})` : "");
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
		Ut = () => {
			if (!h.current.open) return !1;
			h.current.open = !1;
			let e = document.activeElement;
			return e && _.current?.contains(e) && (h.current.byKey ? g.current?.focus({ preventScroll: !0 }) : e.blur()), m(null), !0;
		};
		let e = (e) => {
			!_.current?.contains(e.target) && e.target !== g.current && Ut();
		};
		return addEventListener("pointerdown", e), () => {
			removeEventListener("pointerdown", e), Ut = () => !1;
		};
	}, []);
	let b = (e, t) => {
		navigator.clipboard.writeText(e).then(() => I(c("header.copied", {
			what: t,
			text: e
		})), () => I(e));
	}, x = (e) => {
		Ut() || (h.current = {
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
						b(e?.repo || "", c("header.copy.path")), Ut();
					},
					children: c("header.dir.copy")
				}), /* @__PURE__ */ (0, z.jsx)("button", {
					type: "button",
					id: "dirReveal",
					hidden: n ? !n.reveal : !1,
					onClick: () => {
						P("/viewer/reveal"), Ut();
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
function Kt() {
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
	async function P(e, r) {
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
			P(e, u).catch((e) => {
				o && u === h && j(e.message);
			});
		},
		fail: j
	};
}
// src/components/ShortcutHelp.tsx
var qt = !1, Jt = null, Yt = null, Xt = null, Zt = () => qt;
function Qt(e = !qt, t = !1) {
	if (!Yt) return;
	let { scrim: n, sheet: r } = Yt;
	e && !qt && (Jt = t && document.activeElement !== document.body ? document.activeElement : null), qt = e, e ? (n.hidden = !1, requestAnimationFrame(() => {
		qt && (n.classList.add("on"), r.focus({ preventScroll: !0 }));
	})) : (n.classList.remove("on"), setTimeout(() => {
		qt || (n.hidden = !0);
	}, 220), n.contains(document.activeElement) && document.activeElement.blur(), Jt && Jt.isConnected && Jt.focus({ preventScroll: !0 }), Jt = null), Xt?.setAttribute("aria-expanded", String(e));
}
var $t = (0, R.memo)(function({ table: e, logo: t = "prevue.svg", host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = (0, R.useRef)(null);
	return (0, R.useLayoutEffect)(() => {
		if (!i || !c.current) return;
		Yt = {
			scrim: i,
			sheet: c.current
		};
		let e = (e) => {
			e.target === i && Qt(!1);
		};
		return i.addEventListener("click", e), () => {
			i.removeEventListener("click", e), Yt = null;
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
}), en = (0, R.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, R.useLayoutEffect)(() => {
		if (!n) return;
		Xt = n, n.title = t("header.help.tip"), n.setAttribute("aria-label", t("header.help"));
		let e = (e) => Qt(!qt, e.detail === 0);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), Xt = null;
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
}), tn = Promise.resolve();
async function nn(e, t, n) {
	let r = await P("/viewer/touch", {
		x: t,
		y: n,
		type: e
	});
	r.ok || I(k("input.touch.failed", { status: r.status }));
}
function rn(e, t, n) {
	tn = tn.then(() => nn(e, t, n)).catch(() => {});
}
var Y = null, an = () => !!Y;
function on(e, t) {
	Y = [e, t], rn("press", e, t);
}
function sn(e, t) {
	Y && Math.abs(e - Y[0]) + Math.abs(t - Y[1]) > 6 && (Y = [e, t], dn(e, t));
}
function cn(e, t) {
	Y && (Y = null, rn("release", e, t));
}
var ln = null, un = !1;
function dn(e, t) {
	ln = [e, t], un || (un = !0, tn = tn.then(() => {
		un = !1;
		let e = ln;
		return ln = null, e ? nn("drag", e[0], e[1]) : null;
	}).catch(() => {}));
}
var X = null;
function fn(e, t, n, r) {
	X ? (X.dx += n, X.dy += r, X.x = e, X.y = t) : (X = {
		x: e,
		y: t,
		dx: n,
		dy: r
	}, tn = tn.then(() => {
		let e = X;
		return X = null, P("/viewer/wheel", {
			x: Math.round(e.x),
			y: Math.round(e.y),
			dx: e.dx,
			dy: e.dy
		});
	}).catch(() => {}));
}
// src/workspace/card.ts
var pn = (e) => ({
	id: String(e.id),
	name: e.name || `${e.fileName}:${e.lineNumber}`
});
function mn(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = (e) => {
		for (let t = e.ups.length - 1; t >= 0; t--) if (n.has(e.ups[t])) return e.ups[t];
		return null;
	}, i = r(t), a = e.filter((e) => r(e) === i).sort((e, t) => e.id - t.id);
	return {
		ups: t.ups.filter((e) => n.has(e)).map((e) => pn(n.get(e))),
		here: pn(t),
		before: a.filter((e) => e.id < t.id).map(pn),
		after: a.filter((e) => e.id > t.id).map(pn),
		downs: e.filter((e) => r(e) === t.id).sort((e, t) => e.id - t.id).map(pn)
	};
}
function hn(e, t) {
	let [n, r, i, a] = e.bounds, o = t ?? 1;
	return {
		width: (i - n) * o,
		height: (a - r) * o,
		unit: t ? "dp" : "px",
		padded: !!e.mods?.some((e) => e.name === "padding")
	};
}
function gn(e) {
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
function _n(e, t) {
	if (!t || !e) return null;
	let n = t.modules.get(e);
	return n ? { module: n } : "compose";
}
function vn(e, t, n) {
	return !t || !e ? [] : (t.callers.get(e) || []).filter((e) => e.file !== n.file || e.fn !== n.fn);
}
// src/workspace/view.ts
function yn(e) {
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
var bn = yn({
	pct: 100,
	real: !1,
	atFit: !0,
	menu: !1,
	disabled: !1
}), xn = yn({
	on: !1,
	failed: !1
}), Sn = yn({
	host: null,
	shot: null,
	card: null
}), Cn = yn({ on: !1 }), wn = (e, t) => e.every((e, n) => e === t[n]);
function Tn(e) {
	if (e.modifiers) return e.modifiers;
	for (let t of e.children || []) if (wn(t.bounds, e.bounds)) {
		let e = Tn(t);
		if (e) return e;
	}
	return null;
}
function En(e) {
	let t = L.projectFiles.size ? (e) => L.projectFiles.has(e.fileName) : () => !0, n = [], r = (e, i, a, o) => {
		for (let s of e) {
			let { children: e, modifiers: c, ...l } = s, [u, d, f, p] = s.bounds, m = i.concat(s.name ? [s.name] : []), h = s.name && t(s) ? a.concat([s.name]) : a, g = o;
			if (f > u && p > d && s.lineNumber > 0) {
				let e = n.length;
				n.push({
					...l,
					id: e,
					ups: o,
					mods: Tn(s),
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
var Dn = (e, t) => e.area - t.area || t.chain.length - e.chain.length;
function On(e) {
	return L.projectFiles.size ? e.filter((e) => L.projectFiles.has(e.fileName)) : e;
}
function kn(e, t, n) {
	return e.find((e) => {
		let [r, i, a, o] = e.bounds;
		return t >= r && t < a && n >= i && n < o;
	});
}
var An = (e) => +(e.dataset.fullW ?? 0) || e.naturalWidth, jn = (e) => +(e.dataset.fullH ?? 0) || e.naturalHeight;
function Mn(e, t, n) {
	let r = An(n), i = jn(n);
	return !r || !i ? 0 : Math.min(e / r, t / i);
}
function Nn(e) {
	let t = e.getBoundingClientRect();
	return Mn(t.width, t.height, e) || 1;
}
function Pn(e, t) {
	let n = t.getBoundingClientRect(), r = Nn(t) || 1;
	return [Math.round((e.clientX - n.left) / r), Math.round((e.clientY - n.top) / r)];
}
function Fn(e, t, n) {
	let [r, i, a, o] = t.bounds;
	e.style.left = r * n + "px", e.style.top = i * n + "px", e.style.width = (a - r) * n + "px", e.style.height = (o - i) * n + "px";
}
function In(e, t, n) {
	e.hidden = !1, Fn(e, t, n);
}
function Ln(e, t, n) {
	t ? (Fn(e, t, n), e.classList.add("on")) : e.classList.remove("on");
}
function Rn(e, t) {
	t.classList.remove("over"), t.classList.contains("peek") || Ln(e, null, 1);
}
var zn = /* @__PURE__ */ new WeakMap();
function Bn(e, t, n) {
	let r = zn.get(e);
	r && r.list === t && r.s === n || (zn.set(e, {
		list: t,
		s: n
	}), L.projectFiles.size ? e.replaceChildren(...t.map((e) => {
		let t = document.createElement("div");
		return t.className = "ol", Fn(t, e, n), t;
	})) : e.replaceChildren());
}
async function Vn(e, t, n) {
	let r = ++Hn;
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
		if (r !== Hn) return;
		i.ref ? Wn(i.ref, n, i.file) : i.needChoice || n(O(i.message ?? null) || `${e.fileName}:${e.lineNumber}`);
	} catch (e) {
		if (r === Hn) {
			let t = e.message;
			n(k("point.failed", { why: t })), I(k("point.failed", { why: t }));
		}
	}
}
var Hn = 0, Un = (e) => navigator.clipboard ? navigator.clipboard.writeText(e) : Promise.reject(Error(k("point.noClipboard")));
function Wn(e, t, n) {
	let r = ++Hn, i = () => {
		r === Hn && t(k("point.copied", { ref: e }), e, !0, n);
	}, a = () => {
		Un(e).then(i, () => {
			r === Hn && t(k("point.copyBlocked", { ref: e }), e, !1, n);
		});
	};
	Un(e).then(i, () => {
		r === Hn && t(k("point.copyRetry", { ref: e }), e, !1, n, a);
	});
}
var Gn = (e) => {
	e && I(e);
}, Kn = Gn, qn = null, Jn = null, Yn = 0;
function Xn() {
	qn = null, Jn = null, Yn++;
}
function Zn() {
	if (qn) return Promise.resolve(qn);
	let e = Yn;
	return Jn ??= j().then((t) => e === Yn ? (Jn = null, t.ready ? qn = gn(t) : null) : null, () => (e === Yn && (Jn = null), null));
}
var Z = null, Qn = /* @__PURE__ */ new WeakMap();
function $n(e) {
	let t = Qn.get(e);
	return t || Qn.set(e, t = () => e.isConnected ? e.getBoundingClientRect() : null), t;
}
var er = () => Z?.img ?? null;
function tr(e, t) {
	for (let t of document.querySelectorAll(".box.pick")) t !== e.pick && (t.hidden = !0);
	Z && Z.hover !== e.hover && Ln(Z.hover, null, 1), In(e.pick, t, e.scale()), e.pick.style.animation = "none", e.pick.offsetWidth, e.pick.style.animation = "", Z = {
		...e,
		hit: t,
		shot: $n(e.img)
	};
	let n = nr(t);
	Kn = n, Vn(t, e.previewId, n);
}
function nr(e) {
	let t = Z, n = L.projectFiles.size ? mn(t.list, e) : null, r = {
		msg: null,
		ref: `${e.fileName}:${e.lineNumber}`
	}, i = () => ({
		node: e,
		say: r,
		box: hn(e, t.dpPerPx),
		tree: n,
		modifiers: e.mods,
		previews: vn(e.name, qn, t.seen),
		origin: _n(e.name, qn)
	}), a = () => {
		Z?.hit === e && Sn.set({
			host: t.host,
			shot: t.shot,
			card: i()
		});
	};
	return a(), qn || Zn().then((e) => {
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
function rr(e) {
	let t = Z?.list.find((t) => String(t.id) === e.id);
	Z && t && tr(Z, t);
}
function ir(e) {
	if (!Z) return;
	let t = e ? Z.list.find((t) => String(t.id) === e.id) ?? null : null;
	Ln(Z.hover, t, Z.scale()), t && Bn(Z.marks, Z.list, Z.scale()), Z.marks.classList.toggle("peek", !!t);
}
async function ar(e) {
	Q();
	let t = L.st;
	if (x(e.file, e.fn), e.file === Ne(t)) {
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
	Z && (Ln(Z.hover, null, 1), Z.marks.classList.remove("peek")), Z = null, Sn.set({
		host: null,
		shot: null,
		card: null
	}), Kn = Gn, Hn++;
}
function or() {
	return Z ? (Q(), !0) : !1;
}
function sr() {
	addEventListener("pointerdown", (e) => {
		if (!Z || e.button !== 0) return;
		let t = e.target;
		t?.closest && t.closest("main") && !t.closest(".point-card, .cstage, #stage") && Q();
	}, !0);
}
async function cr(e) {
	let t = await P("/viewer/choose", { path: e }).then((e) => e.json()).catch(() => ({}));
	t.ref && Wn(t.ref, Kn, t.file);
}
function lr() {
	P("/viewer/cancel");
}
var ur = 8, dr = 16;
function fr(e) {
	let t = document.documentElement, n = t.clientWidth, r = t.clientHeight, i = e.offsetWidth, a = e.offsetHeight, o = document.querySelector(".pc-float:not([data-leaving]) .pc-head"), s = o && o.getClientRects().length && getComputedStyle(o).visibility !== "hidden" ? o.getBoundingClientRect() : null, c, l, u = !1;
	s ? (c = s.left, l = s.bottom + ur, l + a > r - dr && s.top - ur - a >= dr && (l = s.top - ur - a, u = !0)) : (c = (n - i) / 2, l = document.getElementById("bar").getBoundingClientRect().bottom + dr), c = Math.max(dr, Math.min(c, n - i - dr)), l = Math.max(dr, Math.min(l, r - a - dr));
	let d = Math.round(c) + "px", f = Math.round(l) + "px";
	e.style.left !== d && (e.style.left = d), e.style.top !== f && (e.style.top = f), e.classList.toggle("up", u);
}
var pr = !1;
function mr(e) {
	if (fr(e), pr) return;
	pr = !0;
	let t = () => {
		e.classList.contains("on") ? (fr(e), requestAnimationFrame(t)) : pr = !1;
	};
	requestAnimationFrame(t);
}
function hr(e, { stage: t, img: n, box: r, pick: i, marks: a }, o) {
	let s = null, c = !1, l = async () => {
		let t = Pe(L.st?.board, e);
		if (!t || !t.ok || !t.treeUrl) return null;
		let n = D.get(t.treeUrl);
		if (n) return s = n, s;
		try {
			s = On(En((await N(t.treeUrl).then((e) => e.json())).composeViewInfo || []).sort(Dn)), D.set(t.treeUrl, s);
		} catch {
			s = null;
		}
		return s;
	};
	t.addEventListener("mouseenter", () => {
		s = null, c = !0, a.classList.add("over"), l().then((e) => {
			e && c && Bn(a, e, Nn(n));
		});
	}, { signal: o }), t.addEventListener("mouseleave", () => {
		c = !1, Rn(r, a);
	}, { signal: o }), n.addEventListener("mousemove", (e) => {
		s && Ln(r, kn(s, ...Pn(e, n)) ?? null, Nn(n));
	}, { signal: o }), n.addEventListener("load", () => {
		s = null, Z?.img === n && Q();
	}, { signal: o }), o.addEventListener("abort", () => {
		Z?.img === n && Q();
	}), n.addEventListener("click", async (o) => {
		C(e);
		let c = s || await l();
		if (!c) return;
		let u = kn(c, ...Pn(o, n));
		if (!u) {
			Z?.img === n && Q();
			return;
		}
		let d = Pe(L.st?.board, e), f = An(n);
		tr({
			list: c,
			img: n,
			hover: r,
			pick: i,
			marks: a,
			host: document.getElementById("boardView"),
			scale: () => Nn(n),
			previewId: d.previewId,
			dpPerPx: d.widthDp && f ? d.widthDp / f : null,
			seen: {
				file: L.st?.board?.file ?? null,
				fn: t.closest(".card")?.dataset.fn ?? null
			}
		}, u);
	}, { signal: o });
}
// src/workspace/resize.ts
var gr = (e) => e ? e.kind === "device" ? `${e.device}:${e.folded ? "cover" : "open"}${e.landscape ? ":rot" : ""}${e.orientation === "landscape-right" ? ":right" : ""}` : e.preset || `custom:${e.widthDp}x${e.heightDp}` : "original";
function _r(e, t, n) {
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
function vr({ root: e, geometry: t, shot: n, stage: r, wrap: i, layout: a, dimensions: o, originalSize: s, zoomState: c, preparation: l, firstFrame: u }) {
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
	let j = (e) => (T.has(e.src) || T.set(e.src, _r(e, e.naturalWidth, e.naturalHeight)), T.get(e.src)), M = xe(e, {
		request: (e) => {
			if (S) return Promise.resolve(!1);
			let [t, n, ...r] = e.split(":"), i = M.devices.has(t) ? {
				device: t,
				folded: n === "cover",
				orientation: r.includes("right") ? "landscape-right" : M.sizeOf(e).w > M.sizeOf(e).h ? "landscape-left" : "portrait"
			} : { size: e.startsWith("custom:") ? e.slice(7) : e };
			return O(i);
		},
		layout: (t, n) => {
			if (!f) return;
			let i = c();
			d && i.z !== 1 && (i.x += (1 - i.z) * (d.cx - d.w / 2 - (t.cx - t.w / 2)), i.y += (1 - i.z) * (d.y - t.y)), d = t, a(t), se(), r.classList.toggle("resize-hidden", n || !b && !S), e.classList.toggle("await-live", !b);
		}
	});
	function N(t, r = !1) {
		S = t, e.classList.toggle("preparing", t), n.setAttribute("aria-busy", String(t && !r)), xn.set({
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
	function ne() {
		if (n.naturalWidth && m && b) try {
			let e = document.createElement("canvas");
			e.width = n.naturalWidth, e.height = n.naturalHeight, e.getContext("2d").drawImage(n, 0, 0);
			let t = o(), r = m.pxPerDp || 2.625;
			M.image(h, {
				url: e.toDataURL("image/jpeg", .92),
				dpW: m.size?.widthDp || t.w / r,
				dpH: m.size?.heightDp || t.h / r,
				edge: _r(e, e.width, e.height)
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
			sel: gr(t),
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
		let d = gr(a.size), w = !!m && d !== h;
		w && (ne(), x = !0, b = !1, r.classList.add("resize-hidden"));
		let T = m;
		m = a, h = d, T && !w && a.imageUrl !== T.imageUrl && M.clearImages();
		for (let e of a.postures || []) {
			let t = v;
			F(e.imageUrl).then((n) => {
				f && t === v && m?.postures?.some((t) => t.imageUrl === e.imageUrl) && M.image(gr(e.size), ee(n, e.size));
			}).catch(() => {});
		}
		if (y && M.update(ie(a), !T), c) return b = !1, _ = g = null, n.onload = null, n.removeAttribute("src"), N(!0, !0), r.classList.remove("resize-hidden"), !0;
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
						N(!1), e.classList.remove("await-live", "measuring"), r.classList.toggle("resize-hidden", M.moving()), n.dataset.still = a.imageUrl, n.src = n.dataset.url = te(a.streamUrl), t && !u() && !ge.matches && (C = n.animate([{ opacity: 0 }, { opacity: 1 }], {
							duration: pe("--duration-short3"),
							easing: me("--easing-decelerate")
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
function yr() {
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
function br({ focusView: e, wrap: t, stage: n, shot: r, box: i, pickBox: a, marks: o, scene: s, insetMarks: c, geometry: l, panel: u, header: d }) {
	let f = [], p = [], m = !1;
	function h() {
		m && (p = On(f));
	}
	function g() {
		if (e.hidden) return;
		let n = getComputedStyle(document.documentElement), r = parseInt(n.getPropertyValue("--cap-room")) || 76, i = document.body.classList.contains("resizing-ui"), a = window.innerHeight - t.getBoundingClientRect().top - (i ? 0 : r + 16), o = parseInt(n.getPropertyValue("--stage-min-h")) || 260, s = Math.max(o, Math.round(a));
		document.documentElement.style.setProperty("--view-h", s + "px");
		let c = getComputedStyle(t), l = s - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
		document.documentElement.style.setProperty("--stage-max-h", l + "px"), U.relayout(), t.classList.contains("resize-wrap") || x(l - 2), Ne(), T();
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
			if (U.moving()) {
				T();
				return;
			}
			let e = Math.round(r.offsetWidth * devicePixelRatio * B.z);
			e && e !== S && (S = e, ee(e).catch(() => {}));
		}, 120));
	}
	let E = null, D = Promise.resolve();
	function O(e) {
		return e === E ? D : (E = e, D = A(e));
	}
	async function A(e) {
		try {
			let t = await N(e).then((e) => {
				if (!e.ok) throw Error(k("focus.tree.http", { status: e.status }));
				return e.json();
			});
			if (e !== E) return;
			if (t.failure) {
				m = !1;
				return;
			}
			f = En(t.composeViewInfo || []).sort(Dn), p = On(f), oe(L.projectFiles.size ? "" : k("focus.noIndex", { n: f.length })), m = !0, Ln(i, null, 1), a.hidden = !0, er() === r && Q();
		} catch (e) {
			ae(k("focus.tree.failed", { why: e.message }), "error");
		}
	}
	function j(e) {
		let t = !!(e && e.interactive);
		if (u.hidden = !e, e || He(), n.classList.toggle("live", t), De = e && e.pxPerDp || null, e && e.previewId === Te || (U.disable(), Te = e ? e.previewId : null, _ = v = 0, delete r.dataset.fullW, delete r.dataset.fullH, r.style.width = "", H(1, 0, 0, !1)), !e) {
			M?.entering && re(), U.disable(), r.hasAttribute("src") && (r.removeAttribute("src"), r.dataset.url = "");
			for (let e of n.querySelectorAll("img.ghost")) e.remove();
			return;
		}
		let i = L.st;
		if (n.style.cursor = t ? "pointer" : "crosshair", e.treeUrl !== E && O(e.treeUrl), U.update(e, i.error)) return;
		H(B.z, B.x, B.y, !1);
		let a = t ? e.streamUrl ? te(e.streamUrl) : Pe(i.board, i.board?.focus)?.imageUrl || "" : e.imageUrl;
		r.dataset.url !== a && (a.startsWith("/stream") && (S = 0), _e(r, a));
	}
	let M = null, ne = (e, t) => e > 0 && t > 0 && Math.abs(e / t - 1) < .01, F = (e, t) => {
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
		M === t && (M = null, clearTimeout(t.lead), clearTimeout(t.giveUp), e.classList.remove("morph-hold"), F(!0, pe("--duration-short4")), t.m.finish(t.same ? 150 : 0));
	}
	function se(r) {
		if (re(), !r || ge.matches || document.hidden || e.hidden || !t.classList.contains("resize-wrap")) return;
		let i = n.getBoundingClientRect();
		if (!i.width || !i.height) return;
		let a = ne(r.ratio, i.width / i.height), o = getComputedStyle(n);
		e.classList.add("morph-hold"), F(!1, 0);
		let s = ue({
			from: r.rect,
			to: () => n.getBoundingClientRect(),
			radius: [r.radius, he(o)],
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
			ready: !U.preparing(),
			landed: !1
		};
		c.lead = window.setTimeout(() => {
			M === c && F(!0, pe("--duration-short4"));
		}, le), s.landed.then(() => requestAnimationFrame(() => {
			M === c && (c.landed = !0, !c.same || c.ready ? ie(c) : c.giveUp = window.setTimeout(() => ie(c), 5e3));
		}));
	}
	function ce() {
		M?.entering && ie(M);
	}
	function me() {
		let e = M;
		return !e || !e.entering || !e.same ? !1 : (e.ready = !0, e.landed && ie(e), !0);
	}
	function ye(t, i, a, o = () => {}, s = () => !0) {
		re();
		let c = () => ve(() => {
			t(), a(), o();
		}, i, {
			workspace: !0,
			image: r
		});
		if (ge.matches || document.hidden || e.hidden || !n.offsetWidth) {
			c();
			return;
		}
		let l = fe();
		U.suspend(), F(!1, pe("--duration-short2"));
		let u = y() && r.naturalWidth ? de(r) : null;
		Promise.all([u, new Promise((e) => setTimeout(e, pe("--duration-short2")))]).then(() => {
			n.style.setProperty("--z", "1");
			let e = wr(n);
			n.style.removeProperty("--z"), l(), s() ? ve(() => {
				t(), F(!0, 0);
				let n = a(), r = n && wr(n);
				if (!n || !r || !r.rect.width || !e.url) {
					o();
					return;
				}
				let i = ne(e.ratio, r.ratio);
				n.classList.add("morph-target");
				let s = r.rect, c = ue({
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
	let Ce = (e) => Pn(e, r), R = () => !!(L.st && L.st.focus && L.st.focus.interactive), z = () => {
		er() === r && Q();
	}, we = (e) => !R() || e.altKey;
	n.addEventListener("mousemove", (e) => {
		let t = m && we(e);
		o.classList.toggle("over", t), t && Bn(o, p, Oe()), Ln(i, t ? kn(p, ...Ce(e)) ?? null : null, Oe());
	}), n.addEventListener("mouseleave", () => Rn(i, o)), n.addEventListener("mousedown", (e) => {
		e.button !== 0 || U.moving() || (Ee || !R() && B.z > 1 && !e.altKey ? Ke(e) : R() && !e.altKey && (e.preventDefault(), z(), on(...Ce(e))));
	}), window.addEventListener("mousemove", (e) => {
		an() && sn(...Ce(e));
	}), window.addEventListener("mouseup", (e) => {
		an() && cn(...Ce(e));
	}), n.addEventListener("click", async (t) => {
		if (U.moving()) return;
		if (V) {
			V = !1;
			return;
		}
		if (R() && !t.altKey || !m || !L.st || !L.st.focus) return;
		if (R()) try {
			await O((await P("/viewer/catchup").then((e) => e.json())).treeUrl || E);
		} catch (e) {
			I(k("point.sync.failed", { why: e.message }));
			return;
		}
		await D;
		let n = kn(p, ...Ce(t));
		if (!n) {
			er() === r && Q();
			return;
		}
		let s = L.st, c = s.focus, l = s.board;
		tr({
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
		return Mn(r.offsetWidth, r.offsetHeight, r) || 1;
	}
	function ke() {
		let e = U.pxPerDp();
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
		U.preparing() || ([B.z, B.x, B.y] = Me(Math.min(je(), Math.max(Ae(), e)), r, i), n.classList.toggle("zoom-anim", !!a), n.style.transform = U.zoom(a) || B.z === 1 ? "" : `translate(${B.x}px, ${B.y}px) scale(${B.z})`, t.style.setProperty("--z", String(B.z)), n.classList.toggle("zoomed", B.z > 1), Ne(), T());
	}
	function Ne() {
		let e = ke();
		bn.set({
			pct: Math.round((e ? B.z / e : B.z) * 100),
			real: !!e,
			atFit: B.z === 1
		});
	}
	function Fe(e, t, r, i) {
		let a = n.getBoundingClientRect(), o = a.left - B.x, s = a.top - B.y, c = (t - a.left) / B.z, l = (r - a.top) / B.z, u = Math.min(je(), Math.max(Ae(), e));
		H(u, t - o - c * u, r - s - l * u, i);
	}
	function Ie(e) {
		let n = t.getBoundingClientRect();
		Fe(e, n.left + n.width / 2, n.top + n.height / 2, !0);
	}
	let Le = (e) => Ie(B.z * e), Re = () => Le(1.25), ze = () => Le(1 / 1.25), Be = () => H(1, 0, 0, !0), Ve = !1;
	function He() {
		if (!bn.get().menu) return !1;
		bn.set({ menu: !1 });
		let e = document.getElementById("zoomMenu"), t = document.activeElement;
		return e && t && e.contains(t) && (Ve ? document.getElementById("zoomPct")?.focus({ preventScroll: !0 }) : t.blur()), !0;
	}
	function Ue(e) {
		let t = !bn.get().menu;
		t && (Ve = e), bn.set({ menu: t });
	}
	function We(e) {
		He(), e === "fit" ? Be() : Ie((ke() || 1) * Number(e));
	}
	addEventListener("pointerdown", (e) => {
		let t = document.getElementById("zoomCtl");
		t && t.contains(e.target) || He();
	}), addEventListener("resize", () => {
		g(), H(B.z, B.x, B.y, !1);
	}), r.addEventListener("load", () => {
		b(), g();
	}), t.addEventListener("wheel", (t) => {
		e.hidden || (t.ctrlKey || t.metaKey ? (t.preventDefault(), Fe(B.z * Math.exp(-t.deltaY * .01), t.clientX, t.clientY, !1)) : R() ? (t.preventDefault(), U.moving() || (z(), Ge(t))) : B.z > 1 && (t.preventDefault(), H(B.z, B.x - t.deltaX, B.y - t.deltaY, !1)));
	}, { passive: !1 });
	function Ge(e) {
		let n = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? t.clientHeight : 1, i = Oe() * B.z || 1, [a, o] = Ce(e);
		fn(Math.max(0, Math.min(_ || r.naturalWidth, a)), Math.max(0, Math.min(v || r.naturalHeight, o)), e.deltaX * n / i, e.deltaY * n / i);
	}
	function Ke(e) {
		e.preventDefault();
		let t = e.clientX, r = e.clientY, i = B.x, a = B.y;
		n.classList.add("panning");
		let o = (e) => {
			Math.abs(e.clientX - t) + Math.abs(e.clientY - r) > 3 && (V = !0), H(B.z, i + e.clientX - t, a + e.clientY - r, !1);
		}, s = () => {
			n.classList.remove("panning"), removeEventListener("mousemove", o), removeEventListener("mouseup", s);
		};
		addEventListener("mousemove", o), addEventListener("mouseup", s);
	}
	let qe = (e) => !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
	addEventListener("keydown", (t) => {
		let r = t.target;
		t.code !== "Space" || e.hidden || qe(r) || r?.closest && r.closest("button, [role=button]") || (t.preventDefault(), Ee || (Ee = !0, n.classList.add("grab")));
	}), addEventListener("keyup", (e) => {
		e.code === "Space" && (Ee = !1, n.classList.remove("grab"));
	}), addEventListener("blur", () => {
		Ee = !1, n.classList.remove("grab");
	});
	let U = vr({
		root: s,
		geometry: l,
		shot: r,
		stage: n,
		wrap: t,
		zoomState: () => B,
		preparation(e, t) {
			t && ce(), bn.set({ disabled: e }), e && He();
		},
		firstFrame: me,
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
			}), c.style.setProperty("--im-bezel", e.bezel + "px"), Ne(), T();
		}
	});
	return document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			if (clearTimeout(C), U.suspend(), !y()) return;
			let e = r.getAttribute("src");
			de(r), r.getAttribute("src") === e && r.removeAttribute("src"), r.dataset.url = "";
		} else L.st?.screen === "focus" && j(L.st.focus);
	}), {
		render: j,
		fitStage: g,
		renarrow: h,
		syncHistory: Se,
		morphIn: se,
		morphOut: ye,
		image: () => r,
		zoomIn: Re,
		zoomOut: ze,
		zoomFit: Be,
		zoomMenuPick: We,
		toggleZoomMenu: Ue,
		closeZoomMenu: He,
		closeDeviceMenu: () => U.closeMenu()
	};
}
var xr = (e) => e && e.naturalWidth ? e.naturalWidth / e.naturalHeight : 0, Sr = /* @__PURE__ */ new Map();
function Cr(e) {
	let t = e?.dataset.still;
	if (!t) return null;
	if (!Sr.has(t)) {
		let e = new Image();
		e.src = t, Sr.set(t, e), Sr.size > 8 && Sr.delete(Sr.keys().next().value);
	}
	return Sr.get(t);
}
function wr(e) {
	if (!e) return null;
	let t = e.querySelector("img"), n = getComputedStyle(e), r = t && t.getAttribute("src") || "";
	return {
		el: e,
		rect: e.getBoundingClientRect(),
		radius: he(n),
		shadow: n.boxShadow,
		url: t ? r.startsWith("/stream") ? t.dataset.still || "" : t.currentSrc || r : "",
		ratio: xr(t) || xr(Cr(t))
	};
}
function Tr(e) {
	P("/viewer/focus", { index: e }).catch((e) => ae(k("focus.enter.failed", { why: e.message }), "error"));
}
function Er() {
	L.st && L.st.focus && P("/viewer/exit");
}
function Dr(e) {
	P("/viewer/systemUi", { systemUi: e }).catch((e) => I(k("request.failed", { why: e.message })));
}
// src/session.ts
var Or = () => document.getElementById("boardView"), kr, Ar = null;
function jr(e) {
	return Ar && !e.error && e.screen === "focus" && e.focus?.previewId === Ar.id && (e.busy || !e.focus.streamUrl || e.focus.streamUrl === Ar.stream && e.focus.imageUrl === Ar.image) ? !0 : (Ar = null, !1);
}
var Mr = /* @__PURE__ */ new Map(), Nr = null, Pr = {
	wasBoard: !1,
	arrive: !1,
	file: null
};
function Fr(e) {
	let t = !Or().hidden, n = e.board ? e.board.file : null;
	t && Nr && (e.screen !== "board" || n !== Nr) && Mr.set(Nr, scrollY), Pr = {
		wasBoard: t,
		arrive: e.screen === "board" && (!t || n !== Nr),
		file: n
	}, Nr = n;
}
function Ir(e) {
	let { wasBoard: t, arrive: n, file: r } = Pr;
	kr.render(e.screen === "focus" ? e.focus : null), kr.syncHistory(e), ie(O(e.error)), kr.fitStage(), n ? scrollTo(0, Mr.get(r) || 0) : t && e.screen !== "board" && scrollTo(0, 0), f();
}
var Lr = (e) => {}, Rr = (e) => {
	let t = (e.tabs || []).find((e) => e.active);
	return t ? t.key : null;
};
function zr(e, t, n) {
	let r = (t) => {
		let n = e.tabs.findIndex((e) => e.key === t);
		return n < 0 ? e.tabs.length : n;
	};
	return Math.sign(r(n) - r(t));
}
var Br = (e) => e?.screen === "focus" && e.focus?.interactive ? `${Rr(e)} ${e.board?.focus ?? ""} ${e.focus.previewId}` : null, Vr = !1;
function Hr(e) {
	if (L.st && e.version <= L.st.version) return;
	let t = L.st;
	if (t?.focus?.interactive && e.focus?.interactive && t.focus.previewId === e.focus.previewId && JSON.stringify(t.focus.size) !== JSON.stringify(e.focus.size) && (Ar = {
		id: e.focus.previewId,
		stream: t.focus.streamUrl,
		image: t.focus.imageUrl
	}), L.st = e, Br(t) !== Br(e) && Cn.set({ on: !1 }), ye()) {
		Vr = !0;
		return;
	}
	let n = t && t.screen, r = e.screen, i = t && Rr(t) && Rr(e) && Rr(t) !== Rr(e);
	t && (i || n !== r || t.board && e.board && t.board.focus !== e.board.focus && r === "focus") && Q();
	let a = () => {
		Vr && (Vr = !1, Lr(L.st));
	}, o = () => L.st;
	if (i) {
		let n = document.documentElement;
		n.style.setProperty("--tab-dir", String(zr(t, Rr(t), Rr(e)))), n.classList.add("vt-tab"), ve(() => Lr(o()), a), setTimeout(() => n.classList.remove("vt-tab"), 500);
	} else if (n === "board" && r === "focus") {
		let t = e.board ? wr(g(h(e.board.focus))) : null;
		ve(() => {
			Lr(o()), kr.morphIn(t);
		}, a, { workspace: !0 });
	} else if (n === "focus" && r === "board") {
		let e = null;
		kr.morphOut(() => Lr(o()), a, () => g(e = o().screen === "board" ? b(o().board.focus) : null), () => S(e), () => o().screen === "board");
	} else n === "focus" && r === "focus" && t.board && e.board && t.board.focus !== e.board.focus ? ve(() => Lr(o()), a, { workspace: !0 }) : Lr(e);
}
var Ur = 0, Wr = () => {
	let e = ++Ur;
	M().then((t) => {
		e === Ur && (L.projectFiles = new Map(Object.entries(t.files || {})), _(), kr.renarrow());
	}).catch(() => {});
}, Gr = !1, Kr = () => {}, qr = null, Jr = () => {
	qr?.fail(k("prep.lost")), ae(k("status.lost"), "error"), Kr("lost"), L.st = null;
}, Yr = 6e4, Xr = !1, Zr = 0, Qr = 0, $r = null, ei = (e) => !e.busy && !(e.board?.groups || []).some((e) => e.cards.some((e) => !e.rendered));
function ti() {
	Xr = !0, Kr("restarting"), clearTimeout(Zr), Zr = window.setTimeout(Jr, Yr);
}
function ni(e) {
	if (Xr) {
		if (e.boot === $r) return;
		Qr ||= (clearTimeout(Zr), window.setTimeout(() => location.reload(), Yr)), ei(e) && location.reload();
	} else $r && e.boot !== $r ? location.reload() : ($r = e.boot, Hr(e));
}
function ri({ workspace: e, render: t, onConnection: n, onPreviewFiles: r, prepared: i = null }) {
	kr = e, Lr = (e) => {
		Fr(e), t(e, jr(e));
	}, Kr = n, qr = i, A({
		open: () => {
			Gr && !Xr ? location.reload() : Gr || Wr();
		},
		state: ni,
		ui: (e) => {
			e.kind === "flash" ? I(O(e.text ?? null)) : e.kind === "previewFiles" ? r() : e.kind === "projectFiles" ? Wr() : e.kind === "restart" && !qr && ti();
		},
		error: () => {
			Gr = !0, Xr || Jr();
		}
	});
}
// src/shortcuts.ts
function ii(e, t) {
	return [
		{
			group: e("keys.group.board"),
			rows: [{
				keys: ["ArrowLeft", "ArrowRight"],
				cap: ["←", "→"],
				label: e("keys.card.pick"),
				when: () => t.screen() === "board",
				run: (e) => t.moveCursor(e.key === "ArrowLeft" ? -1 : 1)
			}, {
				keys: ["Enter", "i"],
				cap: ["↩", "I"],
				label: e("keys.card.open"),
				when: () => t.screen() === "board",
				run: () => t.openCursor()
			}]
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
					run: (e) => (oi(e) === "+" ? t.zoomIn : t.zoomOut)()
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
					run: (e) => t.jumpTab(Number(oi(e)))
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
function ai(e) {
	return e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
}
function oi(e) {
	return e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") ? "⇧" + e.key : /^Digit[1-9]$/.test(e.code) && !e.shiftKey ? e.code.slice(5) : e.code === "KeyI" ? "i" : e.code === "Slash" && e.shiftKey ? "?" : e.code === "Equal" ? "+" : e.code === "Minus" ? "-" : e.code === "Digit0" ? "0" : e.key;
}
function si(e, t, n) {
	let r = (r) => {
		if ((r.metaKey || r.ctrlKey) && !r.altKey && !r.shiftKey && r.code === "KeyK" && t.screen() !== "offline") {
			r.preventDefault(), t.openQuickOpen(document.activeElement);
			return;
		}
		if (r.metaKey || r.ctrlKey || r.altKey || ai(r.target)) return;
		let i = oi(r), a = i === "Enter" && r.target instanceof Element && r.target.closest("button, [role=button]");
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
var ci = n(), li = r();
function ui({ pending: e, host: t }) {
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
// src/components/NotificationCapsule.tsx
var di = (0, R.memo)(function({ content: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = (0, R.useSyncExternalStore)(ce, ne), { error: c, log: l, once: u } = e ?? a, d = !!(c.trim() || l.trim()) || !!u;
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
			onClick: F,
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
}), fi = {
	cursor: null,
	returned: null
}, pi = (e, t) => e.groups.flatMap((e) => e.cards).find((e) => e.index === t), mi = 300 / 360, hi = .25, gi = 100, _i = 160, vi = 360, yi = 640, bi = 120;
function xi(e, t, n) {
	let r = (t) => e.reduce((e, n) => e + Math.max(n * t, gi), 0) + n * (e.length - 1);
	if (r(mi) <= t) return {
		s: mi,
		w: r(mi),
		wrap: !1
	};
	if (r(hi) > t) return {
		s: Math.min(mi, ...e.map((e) => e * hi >= gi ? hi : gi / e)),
		w: t,
		wrap: !0
	};
	let i = hi, a = mi;
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
var Si = /* @__PURE__ */ new Map();
function Ci(e, t) {
	let n = t.cards.map((t) => {
		let n = e + "|" + t.previewId, r = Si.get(n);
		return t.widthDp && t.heightDp && Si.set(n, [t.widthDp, t.heightDp]), [t.widthDp || r?.[0], t.heightDp || r?.[1]];
	}), r = n.filter(([e, t]) => e && t).sort((e, t) => t[0] - e[0])[0];
	return n.map(([e, n], i) => {
		let a = t.cards[i].failure && r;
		return [e || (a ? r[0] : vi), n || (a ? r[1] : yi)];
	});
}
function wi(e, t, n) {
	let r = e.clientWidth;
	if (!r) return 0;
	let i = e.querySelectorAll(":scope > .group"), a = i[0]?.querySelector(".board"), o = a && parseFloat(getComputedStyle(a).columnGap) || 24;
	return t.groups.forEach((a, s) => {
		let c = i[s];
		if (!c) return;
		let l = Ci(t.file, a), { s: u, w: d, wrap: f } = xi(l.map((e) => e[0]), r, o);
		c.style.width = f ? "100%" : Math.max(_i, d) + "px", c.querySelector(".board").classList.toggle("spill", f);
		let p = c.querySelector(".sc"), m = u < .8333323333333333, h = a.cards.some((e) => e.dpGuess);
		p.hidden = !m, p.textContent = m ? (h ? "≈" : "") + Math.round(u * 100) + "%" : "", p.title = n("zoom.tip.real") + (h ? " · " + n("board.scale.guess") : ""), a.cards.forEach((t, n) => {
			let r = e.querySelector(`.card[data-i="${t.index}"]`);
			if (!r) return;
			let [i, a] = l[n], o = Math.max(i * u, gi);
			r.style.width = o + "px";
			let s = r.querySelector(".cstage img");
			s.style.width = i * u + "px", s.style.aspectRatio = `auto ${i} / ${a}`;
			let c = r.querySelector(".ph"), d = Math.max(bi, a * u);
			c.style.width = o + "px", c.style.height = d + "px", c.style.setProperty("--lines", String(Math.max(1, Math.floor((d - 55) / 16.7))));
		});
	}), r;
}
var Ti = (e) => /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 12 12",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.1",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: e
}), Ei = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
	x: "3.25",
	y: "1.25",
	width: "5.5",
	height: "9.5",
	rx: "1.2"
}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M5.25 9h1.5" })] }), Di = {
	portrait: Ti(Ei),
	landscape: Ti(/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "1.25",
		y: "3",
		width: "9.5",
		height: "6",
		rx: "1.2"
	})),
	device: Ti(Ei),
	dark: Ti(/* @__PURE__ */ (0, z.jsx)("path", { d: "M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z" })),
	font: /* @__PURE__ */ (0, z.jsx)("span", {
		className: "aa",
		children: "Aa"
	}),
	locale: Ti(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("circle", {
		cx: "6",
		cy: "6",
		r: "4.75"
	}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75" })] })),
	api: Ti(/* @__PURE__ */ (0, z.jsx)("path", { d: "M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5" })),
	systemUi: Ti(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "3.25",
		y: "1.25",
		width: "5.5",
		height: "9.5",
		rx: "1.2"
	}), /* @__PURE__ */ (0, z.jsx)("path", { d: "M3.5 3.25h5" })] }))
}, Oi = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "currentColor",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z" })
});
function ki({ card: e }) {
	let { daemonText: t } = s();
	return /* @__PURE__ */ (0, z.jsx)("span", {
		className: "specs",
		title: e.args,
		children: e.specs.map((e, n) => {
			let r = t(e.text), [i, a] = e.kind === "size" ? r.split("×").map(Number) : [], o = e.kind === "size" ? i > a ? "landscape" : "portrait" : e.kind;
			return /* @__PURE__ */ (0, z.jsxs)("span", {
				className: "spec",
				children: [Di[o] ?? null, /* @__PURE__ */ (0, z.jsxs)("span", { children: [r, e.kind === "size" && /* @__PURE__ */ (0, z.jsx)("span", {
					className: "unit",
					children: "dp"
				})] })]
			}, n);
		})
	});
}
var Ai = (0, R.memo)(function({ card: e, fn: t, cursor: n = !1, returned: r = !1, actions: i }) {
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
		p ? (t.dataset.url !== e.imageUrl && (_e(t, e.imageUrl), u.current.classList.remove("on"), d.current.hidden = !0), t.hidden = !1) : t.hidden = !0;
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
					children: [Oi, /* @__PURE__ */ (0, z.jsx)("span", {
						className: "go-t",
						children: a("card.go")
					})]
				}),
				/* @__PURE__ */ (0, z.jsx)("div", {
					className: "sub",
					children: /* @__PURE__ */ (0, z.jsx)(ki, { card: e })
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
function ji({ group: e, marks: t = fi, actions: n }) {
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
				children: e.cards.map((r) => /* @__PURE__ */ (0, z.jsx)(Ai, {
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
function Mi({ board: e, screen: t, hosts: n, actions: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n?.cards), [l, u] = (0, R.useState)(null), d = n?.view ?? l, f = (0, R.useSyncExternalStore)(T, p), m = (0, R.useRef)({
		board: null,
		live: null
	}), h = (0, R.useMemo)(() => {
		let n = m.current;
		if (t === "focus" && e) return n.live = pi(e, e.focus)?.imageUrl ?? null, n.board;
		let r = e && pi(e, e.focus);
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
		d && (t !== null && (d.hidden = t !== "board"), t !== "focus" && (E(h), h && a && (x.current = wi(a, h, i) || x.current)));
	}, [
		h,
		t,
		d,
		a
	]), (0, R.useEffect)(() => {
		if (!a) return;
		let e = () => {
			v.current && (x.current = wi(a, v.current, b.current) || x.current);
		}, t = new ResizeObserver(() => {
			let t = a.clientWidth;
			t && t !== x.current && e();
		});
		return t.observe(a), y(e), () => {
			t.disconnect(), y(() => {});
		};
	}, [a]);
	let S = h && /* @__PURE__ */ (0, z.jsx)(R.Fragment, { children: h.groups.map((e, t) => /* @__PURE__ */ (0, z.jsx)(ji, {
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
function Ni({ rows: e, host: t }) {
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
function Pi({ state: e, connection: t = null, host: n, bar: r }) {
	let { phrase: i, daemonText: a } = s(), { element: c, place: l } = o(n), u = (0, R.useRef)(!1);
	t === "restarting" && (u.current = !0);
	let d = e?.timing.find((e) => e.head), f = !!e?.timing.some((e) => e.over), p = !!e && (!!e.error || e.stale.length > 0 || !!e.board?.groups.some((e) => e.failed)), m = e ? e.busy ? "busy" : p ? "error" : f ? "over" : d ? "idle" : "none" : "none", h = e ? e.busy ? a(e.boardNote) : d ? d.text : "" : "";
	t === "restarting" && (m = "busy", h = i("status.restarting")), t === "lost" && (m = "error", h = i("status.lost.short"));
	let g = u.current || !!e?.busy;
	return (0, R.useLayoutEffect)(() => {
		c && (e || t) && (c.dataset.state = m);
	}, [
		c,
		e,
		t,
		m
	]), (0, R.useLayoutEffect)(() => {
		r && (e || t) && r.classList.toggle("busy", g);
	}, [
		r,
		e,
		t,
		g
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
			children: h
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
var Fi = {
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
}), Ii = $(/* @__PURE__ */ (0, z.jsx)("path", { d: "M4 4l8 8M12 4l-8 8" })), Li = $(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
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
] })), Ri = {
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
function zi(e) {
	let t = /#L(\d+)$/.exec(e), n = e.replace(/^@/, "").replace(/#L\d+$/, "");
	return t ? `${n.slice(n.lastIndexOf("/") + 1)}:${t[1]}` : n;
}
function Bi(e, t) {
	let n = t && e.startsWith(t + "/") ? e.slice(t.length + 1) : e, r = n.lastIndexOf("/") + 1, i = n.indexOf("/src/");
	return (i > 0 && i < r ? n.slice(0, i) + "/…/" : n.slice(0, r)) + n.slice(r);
}
function Vi(e, t) {
	let n = (e.uchain || e.chain || []).slice(-6).join(" › ");
	return (t.ref ? [
		t.ref,
		e.name,
		n
	] : [t.msg, n]).filter(Boolean).join("\n");
}
var Hi = [.5, 3.2], Ui = 2, Wi = (e) => String(Math.round(e * 10) / 10), Gi = () => typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, Ki = (e) => {
	e.button === 0 && e.target.closest("button") && e.preventDefault();
};
function qi({ row: e, here: t, actions: n, children: r }) {
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
function Ji({ tree: e, actions: t, settled: n }) {
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
			children: c.rows.map((e) => /* @__PURE__ */ (0, z.jsx)(qi, {
				row: e,
				actions: t
			}, e.id))
		})
	}, `fold-${e.id}`) : void 0, m = (e) => /* @__PURE__ */ (0, z.jsx)(qi, {
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
		/* @__PURE__ */ (0, z.jsx)(qi, {
			row: i,
			here: !0,
			actions: t,
			children: h
		}, i.id),
		o.map(m)
	] }), _ = Math.max(0, r.length - Ui), v = r.slice(_).reduceRight((e, n) => /* @__PURE__ */ (0, z.jsx)(qi, {
		row: n,
		actions: t,
		children: /* @__PURE__ */ (0, z.jsx)("ul", {
			className: "pc-group",
			children: e
		})
	}, n.id), g);
	return /* @__PURE__ */ (0, z.jsxs)("ul", {
		className: "pc-tree",
		children: [r.slice(0, _).map((e) => /* @__PURE__ */ (0, z.jsx)(qi, {
			row: e,
			actions: t
		}, e.id)), v]
	});
}
function Yi({ say: e }) {
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
function Xi({ origin: e }) {
	let { phrase: t } = s();
	return e ? e === "compose" ? /* @__PURE__ */ (0, z.jsx)("span", {
		className: "pc-chip compose",
		title: t("point.card.compose.title"),
		children: "Compose"
	}) : /* @__PURE__ */ (0, z.jsx)("span", {
		className: "pc-chip module",
		title: t("point.card.module.title", { module: e.module }),
		children: e.module
	}) : null;
}
function Zi({ box: e }) {
	let t = e.width > 0 && e.height > 0 ? e.width / e.height : 1, n = Math.min(Hi[1], Math.max(Hi[0], t));
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
				Wi(e.width),
				/* @__PURE__ */ (0, z.jsx)("i", { children: "×" }),
				Wi(e.height),
				/* @__PURE__ */ (0, z.jsx)("span", {
					className: "pc-unit",
					children: e.unit
				})
			]
		})]
	});
}
function Qi(e) {
	return e.sizes?.length ? e.sizes.length === 2 ? "size" : e.sizes[0] : e.color ? "color" : {
		padding: "padding",
		clickable: "click",
		text: "text"
	}[e.name] ?? null;
}
function $i({ modifiers: e }) {
	let { phrase: t } = s();
	return /* @__PURE__ */ (0, z.jsx)("div", {
		className: "pc-mods",
		children: /* @__PURE__ */ (0, z.jsx)("ol", {
			className: "pc-scroll",
			tabIndex: 0,
			"aria-label": t("point.card.modifiers"),
			children: e.map((e, n) => {
				let r = Qi(e);
				return /* @__PURE__ */ (0, z.jsxs)("li", { children: [
					r ? /* @__PURE__ */ (0, z.jsx)("span", {
						className: "pc-kind",
						title: t(`point.card.kind.${r}`),
						"aria-label": t(`point.card.kind.${r}`),
						children: Ri[r]
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
function ea({ card: e, actions: t = Fi }) {
	let { phrase: n } = s(), { node: r, say: i, box: a, tree: o, modifiers: c, previews: l, origin: u } = e, d = (0, R.useRef)(null), f = (0, R.useRef)(!1), p = (e) => {
		let t = d.current, n = t?.querySelector(".pc-node.here > .pc-row");
		if (!t || !n) return;
		let r = t.scrollTop + n.getBoundingClientRect().top - t.getBoundingClientRect().top - (t.clientHeight - n.offsetHeight) / 2;
		t.scrollTo({
			top: r,
			behavior: e && !Gi() ? "smooth" : "auto"
		});
	}, m = o?.here.id;
	(0, R.useLayoutEffect)(() => {
		p(f.current), f.current = !0;
	}, [m]);
	let [h, g] = (0, R.useState)(!1);
	(0, R.useEffect)(() => g(!1), [m, r.lineNumber]);
	let _ = i.file ? `${i.file.slice(i.file.lastIndexOf("/") + 1)}:${r.lineNumber}` : i.ref ? zi(i.ref) : "", v = l.length > 1, y = v ? n("point.card.previews", { n: l.length }) : l[0] && n("point.card.jump", { name: l[0].fn }), b = m ?? `${r.name}:${r.lineNumber}`;
	return /* @__PURE__ */ (0, z.jsx)("section", {
		className: "point-card",
		"aria-label": n("point.card.label"),
		onMouseDown: Ki,
		children: /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "pc-body",
			children: [
				/* @__PURE__ */ (0, z.jsxs)("header", {
					className: "pc-head",
					children: [
						/* @__PURE__ */ (0, z.jsxs)("div", {
							className: "pc-id pc-swap",
							title: Vi(r, i),
							children: [/* @__PURE__ */ (0, z.jsxs)("span", {
								className: "pc-nameline",
								children: [/* @__PURE__ */ (0, z.jsx)("span", {
									className: "pc-name",
									children: r.name || r.fileName
								}), /* @__PURE__ */ (0, z.jsx)(Xi, { origin: u })]
							}), i.ref && /* @__PURE__ */ (0, z.jsxs)("span", {
								className: "pc-refline",
								children: [/* @__PURE__ */ (0, z.jsx)("span", {
									className: "pc-ref",
									children: _
								}), /* @__PURE__ */ (0, z.jsx)(Yi, { say: i })]
							})]
						}, `id-${b}`),
						y && /* @__PURE__ */ (0, z.jsxs)("button", {
							type: "button",
							className: "pc-jump",
							title: y,
							"aria-label": y,
							"aria-expanded": v ? h : void 0,
							onClick: () => v ? g((e) => !e) : t.jump(l[0]),
							children: [Li, v && /* @__PURE__ */ (0, z.jsx)("span", { children: l.length })]
						}),
						/* @__PURE__ */ (0, z.jsx)("button", {
							type: "button",
							className: "pc-close",
							title: n("point.card.close"),
							"aria-label": n("point.card.close"),
							onClick: t.close,
							children: Ii
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
							children: [Li, /* @__PURE__ */ (0, z.jsx)("span", { children: e.fn })]
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
						children: /* @__PURE__ */ (0, z.jsx)(Ji, {
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
						children: [/* @__PURE__ */ (0, z.jsx)(Zi, { box: a }), c && c.length > 0 && /* @__PURE__ */ (0, z.jsx)($i, { modifiers: c })]
					}, `detail-${b}`)
				})
			]
		})
	});
}
function ta({ room: e, shot: t, card: n, space: r }) {
	let i = t.left + t.width + r.gap;
	return {
		left: i + n.width <= e.right - r.edge ? i : Math.max(e.left + r.edge, t.left - r.gap - n.width),
		top: Math.max(r.edge, t.top)
	};
}
var na = (e, t) => parseFloat(getComputedStyle(e).getPropertyValue(t)) || 0, ra = (e) => {
	let t = document.getElementById(e);
	return t && !t.hidden && t.offsetWidth ? t.getBoundingClientRect() : null;
};
function ia({ host: e, shot: t, leaving: n = !1, onLeft: r, children: i }) {
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
			gap: na(n, "--space-16"),
			edge: na(n, "--space-8")
		}, i = 0, o = "", s = () => {
			let a = t(), c = e.getBoundingClientRect(), l = "hidden";
			if (a && a.width) {
				let t = ra("rail"), i = ta({
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
function aa({ host: e, shot: t, card: n, actions: r }) {
	let i = (0, R.useRef)(/* @__PURE__ */ new WeakMap()), a = (0, R.useRef)(0), o = (0, R.useRef)(null), [s, c] = (0, R.useState)(!0), l = !!(e && t && n);
	e && t && n && (o.current = {
		host: e,
		shot: t,
		card: n
	}, s && c(!1));
	let u = o.current;
	return !u || s ? null : (i.current.has(u.shot) || i.current.set(u.shot, ++a.current), (0, ci.createPortal)(/* @__PURE__ */ (0, z.jsx)(ia, {
		host: u.host,
		shot: u.shot,
		leaving: !l,
		onLeft: () => c(!0),
		children: /* @__PURE__ */ (0, z.jsx)(ea, {
			card: u.card,
			actions: r
		})
	}, i.current.get(u.shot)), u.host));
}
function oa({ actions: e }) {
	let { host: t, shot: n, card: r } = (0, R.useSyncExternalStore)(Sn.subscribe, Sn.get);
	return /* @__PURE__ */ (0, z.jsx)(aa, {
		host: t,
		shot: n,
		card: r,
		actions: e
	});
}
function sa({ choice: e, repo: t, host: n, actions: r = Fi }) {
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
			children: Bi(e.startsWith(u.repoRoot + "/") ? e.slice(u.repoRoot.length + 1) : e, t)
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
function ca({ screen: e, vacant: t, host: n }) {
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
function la() {
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
var ua = ({ id: e, hidden: t }) => /* @__PURE__ */ (0, z.jsxs)("div", {
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
function da() {
	let e = la();
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
function fa({ marks: e = ga() }) {
	return /* @__PURE__ */ (0, z.jsx)("div", {
		className: "resize-scene",
		id: "resizeScene",
		hidden: !0,
		children: /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "resize-geometry",
			id: "resizeGeometry",
			children: [
				/* @__PURE__ */ (0, z.jsx)(ua, { id: "ua" }),
				/* @__PURE__ */ (0, z.jsx)(ua, {
					id: "ub",
					hidden: !0
				}),
				/* @__PURE__ */ (0, z.jsx)(da, {}),
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
var pa = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "workspace-loading",
	id: "workspaceLoading",
	role: "status",
	hidden: !0,
	ref: e,
	children: t
}), ma = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "sys-bars",
	id: "sysBars",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), ha = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "inset-overlay",
	id: "insetOverlay",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), ga = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "inset-marks",
	id: "insetMarks",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), _a = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "sys-ui",
	id: "sysUiCtl",
	role: "group",
	"data-t-aria-label": "systemUi.label",
	hidden: !0,
	ref: e,
	children: t
}), va = (e, t) => /* @__PURE__ */ (0, z.jsx)("div", {
	className: "zoom at-fit",
	id: "zoomCtl",
	role: "group",
	"data-t-aria-label": "zoom.label",
	ref: e,
	children: t
});
function ya({ loading: e = pa(), bars: t = ma(), inset: n = ha() }) {
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
			n,
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
function ba({ loading: e, bars: t, inset: n, marks: r }) {
	return /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "wrap",
		children: [/* @__PURE__ */ (0, z.jsx)(fa, { marks: r }), /* @__PURE__ */ (0, z.jsx)(ya, {
			loading: e,
			bars: t,
			inset: n
		})]
	});
}
function xa() {
	let e = la(), t = (t, n, r) => /* @__PURE__ */ (0, z.jsxs)("div", {
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
function Sa() {
	let e = la(), t = (t, n, r, i = !1) => /* @__PURE__ */ (0, z.jsx)("button", {
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
var Ca = (e) => /* @__PURE__ */ (0, z.jsx)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), wa = Ca(/* @__PURE__ */ (0, z.jsxs)("g", {
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
})), Ta = Ca(/* @__PURE__ */ (0, z.jsxs)("g", {
	className: "fold-ic",
	children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M3 10h4.5M5.5 7.8 7.7 10l-2.2 2.2M17 10h-4.5M14.5 7.8 12.3 10l2.2 2.2" })]
})), Ea = Ca(/* @__PURE__ */ (0, z.jsxs)("g", {
	className: "unfold-ic",
	children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M7.5 10H3M5.2 7.8 3 10l2.2 2.2M12.5 10H17M14.8 7.8 17 10l-2.2 2.2" })]
})), Da = Ca(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("rect", {
	x: "3.5",
	y: "4",
	width: "13",
	height: "12",
	rx: "1.5"
}), /* @__PURE__ */ (0, z.jsx)("path", {
	d: "M10 4v12",
	strokeDasharray: "1.6 1.6"
})] })), Oa = /* @__PURE__ */ (0, z.jsx)("svg", {
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
function ka() {
	let e = la();
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
					children: [wa, Oa]
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
				children: [Ta, Ea]
			}),
			/* @__PURE__ */ (0, z.jsx)("button", {
				className: "tb-btn",
				id: "dcHinge",
				type: "button",
				"aria-pressed": "true",
				...e.title("posture.hinge.hide"),
				...e.label("posture.hinge"),
				children: Da
			})
		]
	});
}
function Aa() {
	let e = la();
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
				Oa
			]
		}), /* @__PURE__ */ (0, z.jsx)("div", {
			className: "pn-body",
			id: "pnBody",
			inert: !0,
			children: /* @__PURE__ */ (0, z.jsx)(Sa, {})
		})]
	});
}
function ja({ systemUi: e = _a(), zoom: t = va() }) {
	return /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(Aa, {}),
		/* @__PURE__ */ (0, z.jsx)(ka, {}),
		/* @__PURE__ */ (0, z.jsx)(xa, {}),
		e,
		t
	] });
}
// src/components/InsetOverlay.tsx
var Ma = [
	"statusBars",
	"navigationBars",
	"captionBar",
	"displayCutout",
	"systemOverlays"
], Na = [
	"top",
	"right",
	"bottom",
	"left"
];
function Pa(e, t, n) {
	if (!e || !t || n?.kind !== "device") return null;
	let r = n.widthDp, i = n.heightDp, a = Object.fromEntries(Na.map((e) => [e, Math.max(0, ...Ma.map((n) => t.values[n][e]))]));
	return {
		w: r,
		h: i,
		insets: t,
		safe: {
			x: a.left,
			y: a.top,
			w: Math.max(0, r - a.left - a.right),
			h: Math.max(0, i - a.top - a.bottom)
		}
	};
}
function Fa(e, t) {
	let { on: n } = (0, R.useSyncExternalStore)(Cn.subscribe, Cn.get);
	return Pa(n, e, t);
}
function Ia(e, t, n, r) {
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
function La({ deviceInsets: e, size: t, host: n }) {
	let { element: r, place: i } = o(n), a = Fa(e, t);
	if ((0, R.useLayoutEffect)(() => {
		r && (r.hidden = !a);
	}, [r, a]), !a) return i(null, ha);
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
		}), Ma.map((e) => /* @__PURE__ */ (0, z.jsx)("g", {
			className: "io-band",
			"data-kind": e,
			children: Na.filter((t) => a.insets.values[e][t] > 0).map((t) => {
				let { fill: n, line: r } = Ia(t, a.insets.values[e][t], s, c);
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
	}), ha);
}
var Ra = (e) => String(Math.round(e * 100) / 100);
function za({ w: e, h: t, insets: n }) {
	return Na.flatMap((r) => Ma.filter((e) => n.values[e][r] > 0).map((i, a) => {
		let o = n.values[i][r], s = r === "top" || r === "bottom" ? t : e, [c, l] = r === "top" || r === "left" ? [0, o / s] : [1 - o / s, 1];
		return {
			kind: i,
			edge: r,
			value: o,
			lane: a,
			side: r === "top" || r === "bottom" ? "right" : "bottom",
			from: c,
			to: l
		};
	}));
}
var Ba = (e) => `${e * 100}%`;
function Va({ deviceInsets: e, size: t, host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = Fa(e, t);
	if ((0, R.useLayoutEffect)(() => {
		i && (i.hidden = !c);
	}, [i, c]), !c) return a(null, ga);
	let { w: l, h: u, safe: d } = c;
	return a(/* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [za(c).map((e) => {
		let t = e.side === "right" ? {
			top: Ba(e.from),
			height: Ba(e.to - e.from)
		} : {
			left: Ba(e.from),
			width: Ba(e.to - e.from)
		};
		return /* @__PURE__ */ (0, z.jsxs)("div", {
			className: "im-dim",
			"data-kind": e.kind,
			"data-edge": e.edge,
			"data-side": e.side,
			style: {
				...t,
				"--lane": e.lane
			},
			children: [
				/* @__PURE__ */ (0, z.jsx)("i", { className: "im-ext im-from" }),
				/* @__PURE__ */ (0, z.jsx)("i", { className: "im-ext im-to" }),
				/* @__PURE__ */ (0, z.jsx)("span", {
					className: "im-badge",
					children: Ra(e.value)
				})
			]
		}, `${e.kind} ${e.edge}`);
	}), /* @__PURE__ */ (0, z.jsxs)("div", {
		className: "im-safe",
		"data-kind": "safeDrawing",
		style: {
			left: Ba((d.x + d.w / 2) / l),
			top: Ba((d.y + d.h / 2) / u)
		},
		children: [/* @__PURE__ */ (0, z.jsx)("b", { children: r("insetOverlay.safeArea") }), /* @__PURE__ */ (0, z.jsxs)("span", { children: [
			Ra(d.w),
			" × ",
			Ra(d.h)
		] })]
	})] }), ga);
}
var Ha = /* @__PURE__ */ (0, z.jsxs)("svg", {
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
function Ua() {
	let { phrase: e } = s(), { on: t } = (0, R.useSyncExternalStore)(Cn.subscribe, Cn.get), { on: n } = (0, R.useSyncExternalStore)(xn.subscribe, xn.get), r = e("insetOverlay.now", { value: e(t ? "systemUi.on" : "systemUi.off") });
	return /* @__PURE__ */ (0, z.jsx)("button", {
		type: "button",
		id: "insetBtn",
		className: "tb-btn",
		"aria-pressed": t,
		"aria-label": r,
		title: r,
		disabled: n,
		onClick: () => Cn.set({ on: !t }),
		children: Ha
	});
}
// src/components/SystemBars.tsx
function Wa(e, t, n = null) {
	let r = e?.shown ? e.bars : null;
	if (!r?.insets || t?.kind !== "device") return null;
	let i = n?.values.displayCutout, a = be(gr(t)), o = a && a.y < r.insets.statusDp ? {
		x0: a.x,
		x1: a.x + a.w,
		cy: a.y + a.h / 2
	} : null, s = Se[t.device]?.look?.[t.folded ? "cover" : "open"]?.cam, c = a && s?.edge === "bottom" && a.y + a.h >= t.heightDp - .5 ? [a.x, a.x + a.w] : null, l = t.insetProfile?.safeArea, u = t.device === "duo", d = u && l ? l.left > 0 ? "left" : l.right > 0 ? "right" : null : null;
	return {
		device: t.device,
		ios: r.look === "ios",
		w: t.widthDp,
		h: t.heightDp,
		statusDp: r.insets.statusDp,
		navDp: r.insets.navDp,
		side: d,
		sideDp: d && l ? l[d] : 0,
		duo: u,
		folded: t.folded,
		cut: [i?.left ?? 0, i?.right ?? 0],
		radius: Se[t.device]?.look?.[t.folded ? "cover" : "open"]?.radius[0] ?? 0,
		topCam: o,
		lowCam: c
	};
}
var Ga = 24, Ka = 4, qa = .6, Ja = 1e3;
function Ya(e, [t, n, r, i]) {
	if (!e.naturalWidth) return "dark";
	try {
		let a = document.createElement("canvas");
		a.width = Ga, a.height = Ka;
		let o = a.getContext("2d", { willReadFrequently: !0 });
		if (!o) return "dark";
		o.drawImage(e, t * e.naturalWidth, n * e.naturalHeight, Math.max(1, r * e.naturalWidth), Math.max(1, i * e.naturalHeight), 0, 0, Ga, Ka);
		let s = o.getImageData(0, 0, Ga, Ka).data, c = 0, l = 0;
		for (let e = 0; e < s.length; e += 4) s[e + 3] && (c += (.2126 * s[e] + .7152 * s[e + 1] + .0722 * s[e + 2]) / 255, l++);
		return l && c / l <= qa ? "light" : "dark";
	} catch {
		return "dark";
	}
}
function Xa(e, t) {
	let [n, r] = (0, R.useState)(["dark", "dark"]), i = t !== null, { w: a = 1, h: o = 1, statusDp: s = 0, navDp: c = 0, side: l = null, sideDp: u = 0 } = t ?? {};
	return (0, R.useEffect)(() => {
		if (!e || !i) return;
		let t = l ? [
			l === "left" ? 0 : 1 - u / a,
			64 / o,
			u / a,
			64 / o
		] : [
			0,
			0,
			1,
			s / o
		], n = () => r((n) => {
			let r = [Ya(e, t), Ya(e, [
				0,
				1 - c / o,
				1,
				c / o
			])];
			return r[0] === n[0] && r[1] === n[1] ? n : r;
		});
		n(), e.addEventListener("load", n);
		let d = window.setInterval(n, Ja);
		return () => {
			e.removeEventListener("load", n), window.clearInterval(d);
		};
	}, [
		e,
		i,
		a,
		o,
		s,
		c,
		l,
		u
	]), n;
}
var Za = 78.33, Qa = /* @__PURE__ */ (0, z.jsx)(z.Fragment, { children: [
	4.67,
	7,
	9.67,
	12.33
].map((e, t) => /* @__PURE__ */ (0, z.jsx)("rect", {
	x: t * 5.33,
	y: 12.33 - e,
	width: "3.33",
	height: e,
	rx: "1"
}, t)) }), $a = (e, t, n, r) => {
	let i = r * Math.PI / 180;
	return `${(e + n * Math.sin(i)).toFixed(2)} ${(t - n * Math.cos(i)).toFixed(2)}`;
}, eo = (e, t, n, r, i) => n > 0 ? `M${$a(e, t, r, -i)} A${r} ${r} 0 0 1 ${$a(e, t, r, i)} L${$a(e, t, n, i)} A${n} ${n} 0 0 0 ${$a(e, t, n, -i)} Z` : `M${e} ${t} L${$a(e, t, r, -i)} A${r} ${r} 0 0 1 ${$a(e, t, r, i)} Z`, to = .5, no = 35.33, ro = 12.6, io = 41, ao = /* @__PURE__ */ (0, z.jsxs)("g", {
	stroke: "currentColor",
	strokeWidth: to * 2,
	strokeLinejoin: "round",
	children: [
		/* @__PURE__ */ (0, z.jsx)("path", { d: eo(no, ro, 10.5, 12.1, io) }),
		/* @__PURE__ */ (0, z.jsx)("path", { d: eo(no, ro, 6.5, 7.77, io) }),
		/* @__PURE__ */ (0, z.jsx)("path", { d: eo(no, 12.1, 0, 3.43, io) })
	]
}), oo = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
	/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "51.5",
		y: ".17",
		width: "24",
		height: "12",
		rx: "3.7",
		fill: "none",
		stroke: "currentColor",
		opacity: ".4"
	}),
	/* @__PURE__ */ (0, z.jsx)("rect", {
		x: "53",
		y: "1.67",
		width: "21",
		height: "9",
		rx: "2.3"
	}),
	/* @__PURE__ */ (0, z.jsx)("path", {
		d: "M77 4.17h.4a.93.93 0 0 1 .93.93v2.14a.93.93 0 0 1-.93.93H77z",
		opacity: ".5"
	})
] });
function so({ x: e, y: t }) {
	return /* @__PURE__ */ (0, z.jsxs)("g", {
		className: "sb-duo-indicator",
		transform: `translate(${e} ${t})`,
		children: [
			/* @__PURE__ */ (0, z.jsxs)("g", {
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2.5",
				strokeLinecap: "round",
				children: [/* @__PURE__ */ (0, z.jsx)("path", { d: "M-16 9 A18 18 0 1 1 16 9" }), /* @__PURE__ */ (0, z.jsx)("path", { d: "M-8 -1 Q0 -9 8 -1 M-5 2 Q0 -3 5 2" })]
			}),
			/* @__PURE__ */ (0, z.jsx)("circle", {
				cy: "5",
				r: "1.7"
			}),
			/* @__PURE__ */ (0, z.jsxs)("g", {
				opacity: ".35",
				children: [
					/* @__PURE__ */ (0, z.jsx)("circle", {
						cx: "-10",
						cy: "16",
						r: "1.6"
					}),
					/* @__PURE__ */ (0, z.jsx)("circle", {
						cx: "-5",
						cy: "19",
						r: "1.6"
					}),
					/* @__PURE__ */ (0, z.jsx)("circle", {
						cy: "20",
						r: "1.6"
					}),
					/* @__PURE__ */ (0, z.jsx)("circle", {
						cx: "5",
						cy: "19",
						r: "1.6"
					}),
					/* @__PURE__ */ (0, z.jsx)("circle", {
						cx: "10",
						cy: "16",
						r: "1.6"
					})
				]
			})
		]
	});
}
function co({ bars: e }) {
	let t = e.side ? e.side === "left" ? e.sideDp / 2 : e.w - e.sideDp / 2 : e.w - 46, n = e.side ? e.folded ? 124 : 78 : 42;
	return /* @__PURE__ */ (0, z.jsxs)("g", {
		className: "sb-status sb-duo-status",
		"data-edge": e.side ?? "top",
		children: [/* @__PURE__ */ (0, z.jsx)("text", {
			x: e.side ? t : t - 52,
			y: e.side ? n - 40 : n,
			dominantBaseline: "central",
			textAnchor: "middle",
			fontSize: "15",
			fontWeight: 600,
			children: "9:41"
		}), /* @__PURE__ */ (0, z.jsx)(so, {
			x: t,
			y: n
		})]
	});
}
function lo({ bars: e }) {
	if (e.duo) return /* @__PURE__ */ (0, z.jsx)(co, { bars: e });
	let t = Se[e.device]?.status;
	if (!t) return null;
	let n = /* @__PURE__ */ (0, z.jsx)("text", {
		className: "sb-time",
		x: t.time.cx,
		y: t.time.base,
		textAnchor: "middle",
		fontSize: t.time.size,
		fontWeight: 600,
		children: "9:41"
	});
	if (t.left === void 0) return /* @__PURE__ */ (0, z.jsxs)("g", {
		className: "sb-status",
		"data-edge": "top",
		children: [n, /* @__PURE__ */ (0, z.jsxs)("g", {
			className: "sb-icons",
			transform: `translate(${t.right - Za * t.s} ${t.top}) scale(${t.s})`,
			children: [
				Qa,
				ao,
				oo
			]
		})]
	});
	let r = (e) => `translate(${e} ${t.top}) scale(${t.s})`;
	return /* @__PURE__ */ (0, z.jsxs)("g", {
		className: "sb-status",
		"data-edge": "top",
		children: [
			n,
			/* @__PURE__ */ (0, z.jsxs)("g", {
				className: "sb-icons sb-icons-left",
				transform: r(t.left),
				children: [Qa, ao]
			}),
			/* @__PURE__ */ (0, z.jsx)("g", {
				className: "sb-icons sb-icons-right",
				transform: r(t.right - Za * t.s),
				children: oo
			})
		]
	});
}
var uo = 20, fo = 8, po = 46, mo = 13, ho = 14, go = 24, _o = .3, vo = /* @__PURE__ */ (0, z.jsxs)("g", {
	stroke: "currentColor",
	strokeWidth: "1",
	strokeLinejoin: "round",
	children: [
		/* @__PURE__ */ (0, z.jsx)("path", { d: `M8.85 12.5 L${$a(8.85, 12.5, 12, -45)} A12 12 0 0 1 ${$a(8.85, 12.5, 12, 45)} Z` }),
		/* @__PURE__ */ (0, z.jsx)("path", { d: "M22 13 L35 13 L35 0 Z" }),
		/* @__PURE__ */ (0, z.jsx)("rect", {
			x: "41.5",
			y: "-.2",
			width: "3",
			height: "1.6",
			rx: ".5",
			strokeWidth: "0"
		}),
		/* @__PURE__ */ (0, z.jsx)("rect", {
			x: "40",
			y: "1.4",
			width: "6",
			height: "11.6",
			rx: "1.2",
			strokeWidth: "0"
		})
	]
}), yo = {
	w: 108,
	h: 4,
	band: 24
}, bo = 1.3, xo = (e, t) => e > 0 && t < e ? e - Math.sqrt(e * e - (e - Math.max(0, t)) ** 2) : 0;
function So(e) {
	let t = 1 + _o * Math.min(1, Math.max(0, (e.statusDp - go) / 42)), n = e.topCam, r = n && n.x1 < e.w / 2, i = n && n.x0 > e.w / 2, a = n ? n.cy : e.statusDp / 2, o = xo(e.radius, a - ho * t * bo / 2), s = xo(e.radius, a - mo * t / 2);
	return {
		k: t,
		y: a,
		left: Math.max(uo + e.cut[0], o, r ? n.x1 + fo : 0),
		right: Math.min(e.w - uo - e.cut[1], e.w - s, i ? n.x0 - fo : Infinity)
	};
}
function Co({ bars: e }) {
	let { k: t, y: n, left: r, right: i } = So(e);
	return /* @__PURE__ */ (0, z.jsxs)("g", {
		className: "sb-status sb-android-status",
		"data-edge": "top",
		children: [/* @__PURE__ */ (0, z.jsx)("text", {
			className: "sb-time",
			x: r,
			y: n,
			dominantBaseline: "central",
			fontSize: ho * t,
			fontWeight: 500,
			children: "9:41"
		}), /* @__PURE__ */ (0, z.jsx)("g", {
			className: "sb-icons",
			transform: `translate(${i - po * t} ${n - mo / 2 * t}) scale(${t})`,
			children: vo
		})]
	});
}
function wo({ bars: e }) {
	if (e.ios) return /* @__PURE__ */ (0, z.jsx)("rect", {
		className: "sb-handle",
		x: (e.w - 134) / 2,
		y: e.h - 13,
		width: "134",
		height: "5",
		rx: "2.5"
	});
	let t = e.h - Math.min(e.navDp, yo.band) / 2, n = e.lowCam, r = n ? n[0] >= e.w - n[1] ? n[0] / 2 : (n[1] + e.w) / 2 : e.w / 2;
	return /* @__PURE__ */ (0, z.jsx)("rect", {
		className: "sb-handle",
		x: r - yo.w / 2,
		y: t - yo.h / 2,
		width: yo.w,
		height: yo.h,
		rx: yo.h / 2
	});
}
function To({ systemUi: e, size: t, deviceInsets: n = null, host: r }) {
	let { element: i, place: a } = o(r), s = Wa(e, t, n), [c, l] = Xa(i?.parentElement?.querySelector("#shot") ?? null, s);
	return (0, R.useLayoutEffect)(() => {
		i && (i.hidden = !s);
	}, [i, s]), a(s && /* @__PURE__ */ (0, z.jsxs)("svg", {
		viewBox: `0 0 ${s.w} ${s.h}`,
		preserveAspectRatio: "none",
		fill: "currentColor",
		"aria-hidden": "true",
		children: [(s.statusDp > 0 || s.side) && /* @__PURE__ */ (0, z.jsx)("g", {
			className: `sb-ink-${c}`,
			children: s.ios ? /* @__PURE__ */ (0, z.jsx)(lo, { bars: s }) : /* @__PURE__ */ (0, z.jsx)(Co, { bars: s })
		}), !s.duo && s.navDp > 0 && /* @__PURE__ */ (0, z.jsx)("g", {
			className: `sb-ink-${l}`,
			children: /* @__PURE__ */ (0, z.jsx)(wo, { bars: s })
		})]
	}), ma);
}
// src/components/Workspace.tsx
var Eo = {
	exit() {},
	zoomIn() {},
	zoomOut() {},
	zoomFit() {},
	zoomMenuPick() {},
	toggleZoomMenu() {},
	pickSystemUi() {}
};
function Do({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e), { on: i, failed: a } = (0, R.useSyncExternalStore)(xn.subscribe, xn.get);
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
	})] }), pa);
}
var Oo = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M4 8h8" })
}), ko = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M4 8h8M8 4v8" })
}), Ao = (e) => (0, R.useSyncExternalStore)(bn.subscribe, () => bn.get()[e]);
function jo({ real: e, menu: t, disabled: n, actions: r }) {
	let { phrase: i } = s(), a = Ao("pct");
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
var Mo = (0, R.memo)(function({ host: e, actions: t = Eo }) {
	let { phrase: n } = s(), { element: r, place: i } = o(e), a = Ao("real"), c = Ao("atFit"), l = Ao("menu"), u = Ao("disabled");
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
			children: Oo
		}),
		/* @__PURE__ */ (0, z.jsx)(jo, {
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
			children: ko
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
	] }), va);
}), No = /* @__PURE__ */ (0, z.jsxs)("svg", {
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
function Po({ systemUi: e, deviceInsets: t = null, host: n, actions: r = Eo }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), { on: l } = (0, R.useSyncExternalStore)(xn.subscribe, xn.get), u = !e && !t;
	(0, R.useLayoutEffect)(() => {
		a && (a.hidden = u);
	}, [a, u]);
	let d = !!e?.shown, f = i(t ? "insetOverlay.label" : "systemUi.label");
	if ((0, R.useLayoutEffect)(() => {
		a?.setAttribute("aria-label", f);
	}, [a, f]), t) return c(/* @__PURE__ */ (0, z.jsx)(Ua, {}), _a);
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
		children: No
	}), _a);
}
var Fo = 12, Io = 48;
function Lo(e, t) {
	let n = e.querySelector("#backName"), r = t.querySelector("#wsName"), i = t.querySelector("#wsFn"), a = e.parentElement, o = document.getElementById("barR");
	if (!n || !r || !i || !a || !o || (n.style.maxWidth = "", n.style.display = "", t.hidden || !(t.offsetParent instanceof HTMLElement))) return;
	if (getComputedStyle(t).position !== "absolute") {
		t.style.removeProperty("--ws-left"), t.style.removeProperty("--ws-max");
		return;
	}
	let s = t.offsetParent.clientWidth, c = o.offsetLeft - Fo, l = Math.min(Math.max(r.scrollWidth, i.hidden ? 0 : i.scrollWidth) + 1, s * .34), u = Math.min(s / 2 - l / 2, c - l), d = () => {
		let e = 0;
		for (let t of a.children) t instanceof HTMLElement && t.offsetParent && (e = Math.max(e, a.offsetLeft + t.offsetLeft + t.offsetWidth));
		return e + Fo;
	}, f = d();
	if (f > u && !e.hidden) {
		let e = n.offsetWidth - (f - u);
		e < Io ? n.style.display = "none" : n.style.maxWidth = `${e}px`, f = d();
	}
	let p = Math.max(u, f), m = Math.max(0, Math.min(l, c - p));
	t.style.setProperty("--ws-left", `${p + m / 2}px`), t.style.setProperty("--ws-max", `${m}px`);
}
var Ro = /* @__PURE__ */ (0, z.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.8",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, z.jsx)("path", { d: "M10 3.5 5.5 8l4.5 4.5" })
});
function zo({ state: e, hosts: t, actions: n = Eo }) {
	let { phrase: r } = s(), i = o(t?.back), a = o(t?.title), c = e?.screen === "focus" ? e.focus : null, l = c ? (e.tabs || []).find((e) => e.active) : void 0, u = c ? Pe(e?.board, e?.board?.focus) : null;
	(0, R.useLayoutEffect)(() => {
		document.body.classList.toggle("ws", !!c), i.element && (i.element.hidden = !c), a.element && (a.element.hidden = !c, a.element.title = c ? u ? u.title : l ? l.title : c.previewId : ""), i.element && a.element && Lo(i.element, a.element);
	}), (0, R.useLayoutEffect)(() => () => document.body.classList.remove("ws"), []), (0, R.useLayoutEffect)(() => {
		let e = i.element, t = a.element, n = e?.parentElement?.parentElement, r = document.getElementById("barR");
		if (!e || !t) return;
		let o = new ResizeObserver(() => Lo(e, t));
		for (let e of [n, r]) e && o.observe(e);
		return () => o.disconnect();
	}, [i.element, a.element]);
	let d = /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [Ro, /* @__PURE__ */ (0, z.jsx)("span", {
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
function Bo({ screen: e, systemUi: t = null, deviceInsets: n = null, size: r = null, hosts: i, actions: a = Eo }) {
	let { phrase: o } = s(), [c, l] = (0, R.useState)(null), u = i?.view ?? c;
	return (0, R.useLayoutEffect)(() => {
		u && e !== null && (u.hidden = e !== "focus");
	}, [e, u]), i ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(Do, { host: i.loading }),
		/* @__PURE__ */ (0, z.jsx)(To, {
			systemUi: t,
			size: r,
			deviceInsets: n,
			host: i.bars
		}),
		/* @__PURE__ */ (0, z.jsx)(La, {
			deviceInsets: n,
			size: r,
			host: i.inset
		}),
		/* @__PURE__ */ (0, z.jsx)(Va, {
			deviceInsets: n,
			size: r,
			host: i.insetMarks
		}),
		/* @__PURE__ */ (0, z.jsx)(Po, {
			systemUi: t,
			deviceInsets: n,
			host: i.systemUi,
			actions: a
		}),
		/* @__PURE__ */ (0, z.jsx)(Mo, {
			host: i.zoom,
			actions: a
		})
	] }) : /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [/* @__PURE__ */ (0, z.jsx)("section", {
		id: "focusView",
		ref: l,
		children: /* @__PURE__ */ (0, z.jsx)(ba, {
			loading: /* @__PURE__ */ (0, z.jsx)(Do, {}),
			bars: /* @__PURE__ */ (0, z.jsx)(To, {
				systemUi: t,
				size: r,
				deviceInsets: n
			}),
			inset: /* @__PURE__ */ (0, z.jsx)(La, {
				deviceInsets: n,
				size: r
			}),
			marks: /* @__PURE__ */ (0, z.jsx)(Va, {
				deviceInsets: n,
				size: r
			})
		})
	}), /* @__PURE__ */ (0, z.jsx)("div", {
		className: "panel",
		id: "panel",
		role: "toolbar",
		"aria-label": o("panel.label"),
		children: /* @__PURE__ */ (0, z.jsx)(ja, {
			systemUi: /* @__PURE__ */ (0, z.jsx)(Po, {
				systemUi: t,
				deviceInsets: n,
				actions: a
			}),
			zoom: /* @__PURE__ */ (0, z.jsx)(Mo, { actions: a })
		})
	})] });
}
// src/ViewerRoot.tsx
function Vo() {
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
			toggle: e("railToggle"),
			scrim: e("railScrim")
		},
		stale: e("staleBar"),
		buildNotice: e("buildNotice"),
		board: {
			view: e("boardView"),
			cards: e("cards")
		},
		quickOpen: {
			sheet: e("qoSheet"),
			curtain: e("qoCurtain"),
			start: e("startView")
		},
		capsule: e("strip"),
		help: e("help"),
		vacant: e("vacantView"),
		workspace: {
			view: e("focusView"),
			panel: e("panel"),
			systemUi: e("sysUiCtl"),
			bars: e("sysBars"),
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
function Ho({ state: e, draw: t = 0, statusState: n = e, connection: r = null, app: i = null, shortcuts: a = [], hosts: o, board: s, workspace: c, point: l, renderLegacy: u }) {
	return (0, R.useLayoutEffect)(() => {
		e && u(e);
	}, [t]), o ? /* @__PURE__ */ (0, z.jsxs)(z.Fragment, { children: [
		/* @__PURE__ */ (0, z.jsx)(Gt, {
			header: e?.header ?? null,
			tabs: e?.tabs ?? [],
			app: i,
			host: o.app,
			brand: o.brand
		}),
		/* @__PURE__ */ (0, z.jsx)(Pi, {
			state: n,
			connection: r,
			host: o.status,
			bar: o.bar
		}),
		/* @__PURE__ */ (0, z.jsx)(en, { host: o.helpButton }),
		/* @__PURE__ */ (0, z.jsx)(Bt, {
			tabs: e?.tabs ?? null,
			screen: e?.screen ?? null,
			hosts: o.rail
		}),
		/* @__PURE__ */ (0, z.jsx)(Ni, {
			rows: e?.stale ?? null,
			host: o.stale
		}),
		/* @__PURE__ */ (0, z.jsx)(ui, {
			pending: !!e?.buildPending,
			host: o.buildNotice
		}),
		/* @__PURE__ */ (0, z.jsx)(Mi, {
			board: e?.board ?? null,
			screen: e?.screen ?? null,
			hosts: o.board,
			actions: s
		}),
		/* @__PURE__ */ (0, z.jsx)(bt, {
			state: e,
			draw: t,
			connection: r,
			hosts: o.quickOpen
		}),
		/* @__PURE__ */ (0, z.jsx)(ca, {
			screen: e?.screen ?? null,
			vacant: e?.vacant ?? null,
			host: o.vacant
		}),
		/* @__PURE__ */ (0, z.jsx)(Bo, {
			screen: e?.screen ?? null,
			systemUi: e?.focus?.systemUi ?? null,
			deviceInsets: e?.focus?.deviceInsets ?? null,
			size: e?.focus?.size ?? null,
			hosts: o.workspace,
			actions: c
		}),
		/* @__PURE__ */ (0, z.jsx)(zo, {
			state: e,
			hosts: o.workspaceHeader,
			actions: c
		}),
		/* @__PURE__ */ (0, z.jsx)(oa, { actions: l }),
		/* @__PURE__ */ (0, z.jsx)(sa, {
			choice: e?.choice ?? null,
			repo: e?.header?.repo,
			host: o.chooser,
			actions: l
		}),
		/* @__PURE__ */ (0, z.jsx)(di, { host: o.capsule }),
		/* @__PURE__ */ (0, z.jsx)($t, {
			table: a,
			host: o.help
		})
	] }) : null;
}
function Uo({ renderLegacy: e, messages: t, hosts: n, shortcuts: r, board: i, workspace: a, point: o }) {
	let s = document.createElement("div");
	s.hidden = !0, document.body.append(s);
	let c = (0, li.createRoot)(s), l = null, u = null, f = null, p = null, m = 0, h = () => c.render(/* @__PURE__ */ (0, z.jsx)(d.Provider, {
		value: t,
		children: /* @__PURE__ */ (0, z.jsx)(Ho, {
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
	return (0, ci.flushSync)(h), N("/app.json").then((e) => e.json()).then((e) => {
		p = e, h();
	}).catch(() => {
		p = {}, h();
	}), {
		apply(e, t = !1) {
			l = e, t && u || (u = e), m++, (0, ci.flushSync)(h);
		},
		connection(e) {
			f = e, (0, ci.flushSync)(h);
		},
		dispose() {
			c.unmount(), s.remove();
		}
	};
}
// src/main.tsx
var Wo = Kt(), Go = br(yr()), Ko = (e) => {
	Ir(e), Wo?.update(e);
}, qo = () => {
	let { cursor: e } = p();
	e != null && Tr(e);
}, Jo = {
	exit: Er,
	zoomIn: Go.zoomIn,
	zoomOut: Go.zoomOut,
	zoomFit: Go.zoomFit,
	zoomMenuPick: Go.zoomMenuPick,
	toggleZoomMenu: Go.toggleZoomMenu,
	pickSystemUi: Dr
}, Yo = {
	choose: cr,
	cancel: lr,
	follow: mr,
	pick: rr,
	peek: ir,
	jump: ar,
	close: Q
};
sr();
var Xo = {
	screen: () => L.st ? L.st.screen : "offline",
	tabCount: At,
	moveCursor: v,
	openCursor: qo,
	exitFocus: Er,
	stepTab: Ot,
	jumpTab: kt,
	openQuickOpen: ut,
	helpOpen: Zt,
	toggleHelp: Qt,
	zoomIn: Jo.zoomIn,
	zoomOut: Jo.zoomOut,
	zoomFit: Jo.zoomFit
}, Zo = ii(k, Xo);
si(Zo, Xo, {
	chooserOpen: () => !!document.getElementById("chooser")?.classList.contains("on"),
	cancelChoice: lr,
	closeZoomMenu: Go.closeZoomMenu,
	closeDeviceMenu: Go.closeDeviceMenu,
	closeDirPop: Wt,
	closeRailDrawer: Et,
	closeCard: or
});
var Qo = Uo({
	renderLegacy: Ko,
	messages: {
		phrase: k,
		daemonText: O
	},
	hosts: Vo(),
	shortcuts: Zo,
	board: {
		open: Tr,
		point: hr
	},
	workspace: Jo,
	point: Yo
});
ri({
	workspace: Go,
	render: Qo.apply,
	onConnection: Qo.connection,
	onPreviewFiles: () => {
		dt(), Xn();
	},
	prepared: Wo
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
