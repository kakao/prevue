import { i as e, n as t, r as n, t as r } from "./react.js";
import { createScene as i, handoffMs as a, i as o, n as s, r as c, sceneEasing as l, sceneMs as u, t as d } from "./preparation-scene.js";
import { applyReveal as f, boardMarks as p, cancelReveal as m, cardAt as h, cardStage as g, clearTrees as _, moveCursor as v, onRelayout as y, returnCard as b, reveal as x, ringCard as S, setCursor as C, stuckHead as w, subscribeBoard as T, syncBoard as E, trees as D } from "./board.js";
import { daemonText as O, phrase as k } from "./strings.js";
import { connect as A, fetchPreviewFiles as j, fetchProjectFiles as M, get as ee, post as N, reportStreamWidth as te, viewerStream as ne } from "./api.js";
import { capsuleContent as re, dismissOnce as P, flash as F, hideOnce as ie, renderError as ae, setStatus as oe, setSummary as se, showOnce as ce, subscribeCapsule as le } from "./capsule.js";
import { MORPH_LEAD as ue, frameMorph as de, freeze as fe, hold as pe, motionMs as me, motionToken as he, reduced as ge, swapImage as _e, transition as ve, transitioning as ye } from "./motion.js";
import { cardOf as be, store as I } from "./store.js";
import { createResizeScene as xe } from "./resize-scene.js";
// src/components/FileIcon.tsx
var L = e(), R = t(), z = (e) => e ? e.startsWith("android") ? "android" : "kmp" : "file", Se = /* @__PURE__ */ (0, R.jsx)("path", { d: "M7 13H2.5V1.5h5L10 4V7" }), Ce = {
	file: /* @__PURE__ */ (0, R.jsx)("path", { d: "M4 2h5.5L12 4.5V14H4z" }),
	android: /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [Se, /* @__PURE__ */ (0, R.jsxs)("g", {
		className: "mk-android",
		transform: "translate(5.5 6.4) scale(.75)",
		children: [/* @__PURE__ */ (0, R.jsx)("path", {
			fill: "currentColor",
			stroke: "none",
			d: "M2 12a6 6 0 0 1 12 0z"
		}), /* @__PURE__ */ (0, R.jsx)("path", {
			d: "M4.8 6.4 3.4 4.2M11.2 6.4l1.4-2.2",
			strokeWidth: "1.6"
		})]
	})] }),
	kmp: /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [Se, /* @__PURE__ */ (0, R.jsx)("path", {
		className: "mk-kmp",
		fill: "currentColor",
		stroke: "none",
		transform: "translate(7.2 7.2) scale(.18333)",
		d: "M0 22.5629V0.0835311L22.4794 22.5629H0ZM0 25.4372V48H0.0572568L22.6201 25.4372H0ZM25.9906 22.0094L48 0H3.98128L25.9906 22.0094ZM26.0193 26.1028L4.1221 48H47.9164L26.0193 26.1028Z"
	})] })
};
function we({ kind: e }) {
	return /* @__PURE__ */ (0, R.jsx)("svg", {
		className: "rt-ic",
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.4",
		strokeLinejoin: "round",
		strokeLinecap: "round",
		"aria-hidden": "true",
		children: Ce[e]
	});
}
// src/match.ts
var B = -1e9, Te = /[/._\-\s]/, Ee = (e) => e !== e.toLowerCase();
function De(e, t) {
	if (t === 0) return !0;
	let n = e[t - 1], r = e[t];
	return Te.test(n) || Ee(r) && !Ee(n) || /\d/.test(r) && !/\d/.test(n);
}
function Oe(e, t) {
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
	let o = Array.from({ length: n }, () => new Float64Array(r).fill(B)), s = Array.from({ length: n }, () => new Int32Array(r).fill(-1));
	for (let e = 0; e < r; e++) a[e] === i[0] && (o[0][e] = 1 + (De(t, e) ? 8 : 0) + (e === 0 ? 4 : 0) - e * .02);
	for (let e = 1; e < n; e++) {
		let n = B, c = -1;
		for (let l = e; l < r; l++) {
			if (l >= 2 && o[e - 1][l - 2] > n && (n = o[e - 1][l - 2], c = l - 2), a[l] !== i[e]) continue;
			let r = De(t, l) ? 8 : 0, u = o[e - 1][l - 1] > B ? o[e - 1][l - 1] + 1 + 5 + r : B, d = n > B ? n + 1 + r - 3 : B;
			u >= d && u > B ? (o[e][l] = u, s[e][l] = l - 1) : d > B && (o[e][l] = d, s[e][l] = c);
		}
	}
	let c = B, l = -1;
	for (let e = 0; e < r; e++) o[n - 1][e] > c && (c = o[n - 1][e], l = e);
	if (l < 0) return null;
	let u = Array(n);
	for (let e = n - 1; e >= 0; e--) u[e] = l, l = s[e][l];
	return {
		score: c,
		idx: u
	};
}
var ke = (e) => e.dir ??= e.rel.slice(0, e.rel.length - e.name.length).toLowerCase(), V = {
	name: 30,
	fn: 15,
	path: 0
};
function Ae(e, t) {
	let n = 0, r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of e) {
		let e = null, o = Oe(a, t.name);
		o && (e = {
			s: o.score + V.name,
			kind: "name",
			idx: o.idx
		});
		for (let n of t.functions) {
			let t = Oe(a, n);
			t && (!e || t.score + V.fn > e.s) && (e = {
				s: t.score + V.fn,
				kind: "fn",
				fn: n,
				idx: t.idx
			});
		}
		if (!e && ke(t).includes(a.toLowerCase()) && (e = {
			s: 10 + V.path,
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
// src/components/QuickOpen.tsx
var je = 8, Me = 5, Ne = [], Pe = (e) => e.map((e) => ({
	...e,
	name: e.rel.split("/").pop()
}));
function Fe(e) {
	if (!e || !e.fns.size) return null;
	let t = null;
	for (let [n, r] of e.fns) (!t || r.size > t[1].size) && (t = [n, r]);
	return {
		fn: t[0],
		idx: t[1],
		more: e.fns.size - 1
	};
}
function Ie(e, t, n) {
	let r = t.trim().split(/\s+/).filter(Boolean);
	if (!e) return {
		sections: [],
		more: 0,
		empty: !r.length,
		loading: !0
	};
	if (!r.length) {
		let t = new Map(e.map((e) => [e.path, e])), r = e.slice(0, Me), i = new Set(r.map((e) => e.path)), a = n.map((e) => t.get(e)).filter((e) => !!e && !i.has(e.path)), o = je - r.length, s = a.length < o ? e.slice(Me).filter((e) => !a.includes(e)).slice(0, o - a.length) : [], c = [{
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
		let e = Ae(r, t);
		e && i.push({
			f: t,
			m: e
		});
	}
	i.sort((e, t) => t.m.score - e.m.score || t.f.mtime - e.f.mtime);
	let a = i.slice(0, je).map((e) => ({
		...e,
		fn: Fe(e.m)
	}));
	return {
		sections: a.length ? [{ rows: a }] : [],
		more: Math.max(0, i.length - je),
		empty: !1,
		loading: !1
	};
}
function Le({ text: e, idx: t }) {
	if (!t?.size) return e;
	let n = [];
	return [...e].forEach((e, r) => {
		let i = t.has(r), a = n[n.length - 1];
		a && a[1] === i ? a[0] += e : n.push([e, i]);
	}), n.map(([e, t], n) => t ? /* @__PURE__ */ (0, R.jsx)("b", { children: e }, n) : e);
}
var Re = /* @__PURE__ */ (0, R.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.4",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, R.jsx)("path", { d: "M3 8h10M9 4l4 4-4 4" })
}), ze = (e) => (e || "").replace(/^:/, "").replace(/:/g, "/"), Be = -1, Ve = -1, He = !1;
addEventListener("mousemove", (e) => {
	He = e.screenX !== Be || e.screenY !== Ve, Be = e.screenX, Ve = e.screenY;
}, !0);
var Ue = (0, L.memo)(function({ files: e, ready: t, query: n, sel: r, recent: i = Ne, fieldRef: a, onQuery: o, onSelect: l, onPick: u, onEscape: d, onLeave: f }) {
	let { phrase: p } = s(), m = (0, L.useRef)(null), h = (0, L.useRef)(null), [g, _] = (0, L.useState)(null), v = (0, L.useRef)({
		fieldRef: a,
		onQuery: o
	});
	v.current = {
		fieldRef: a,
		onQuery: o
	};
	let y = (0, L.useCallback)((e) => {
		_(e), v.current.fieldRef?.(e);
	}, []), b = (0, L.useMemo)(() => e && Pe(e), [e]), { sections: x, more: S, empty: C, loading: w } = (0, L.useMemo)(() => Ie(b, n, i), [
		b,
		n,
		i
	]), T = (0, L.useMemo)(() => x.flatMap((e) => e.rows), [x]), E = Math.min(r, T.length - 1);
	(0, L.useLayoutEffect)(() => {
		r > E && l(E);
	}, [r, E]), (0, L.useLayoutEffect)(() => {
		if (!g) return;
		let e = () => v.current.onQuery(g.value, g.value.trim() ? 0 : -1);
		return g.addEventListener("input", e), () => g.removeEventListener("input", e);
	}, [g]), (0, L.useLayoutEffect)(() => {
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
	}, O = (e, t) => /* @__PURE__ */ (0, R.jsxs)("div", {
		className: t === E ? "qo-row sel" : "qo-row",
		role: "option",
		"aria-selected": t === E,
		"data-i": t,
		style: { "--i": t },
		title: e.f.rel,
		onMouseDown: (e) => e.preventDefault(),
		onMouseMove: () => {
			He && E !== t && l(t);
		},
		onClick: () => u?.(e),
		children: [
			/* @__PURE__ */ (0, R.jsx)("span", {
				className: "qo-arrow",
				children: Re
			}),
			/* @__PURE__ */ (0, R.jsx)("span", {
				className: "qo-name",
				children: /* @__PURE__ */ (0, R.jsx)(Le, {
					text: e.f.name,
					idx: e.m?.name
				})
			}),
			e.fn && /* @__PURE__ */ (0, R.jsxs)("span", {
				className: "qo-fn",
				children: [
					"› ",
					/* @__PURE__ */ (0, R.jsx)(Le, {
						text: e.fn.fn,
						idx: e.fn.idx
					}),
					e.fn.more ? /* @__PURE__ */ (0, R.jsx)("span", {
						className: "qo-fn-more",
						children: ` +${e.fn.more}`
					}) : null
				]
			}),
			/* @__PURE__ */ (0, R.jsx)("span", {
				className: "qo-mod",
				children: ze(e.f.module)
			})
		]
	}, e.f.path), k = null;
	w || !t && !T.length ? k = /* @__PURE__ */ (0, R.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.loading")
	}) : T.length || (k = C ? /* @__PURE__ */ (0, R.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.none")
	}) : /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "qo-none",
		children: [p("quickopen.noMatch", { q: n.trim() }), /* @__PURE__ */ (0, R.jsx)("div", {
			className: "qo-why",
			children: p("quickopen.noMatch.why")
		})]
	}));
	let A = 0;
	return /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "qo-col",
		ref: m,
		onMouseDown: (e) => {
			e.target !== g && e.preventDefault();
		},
		children: [
			/* @__PURE__ */ (0, R.jsxs)("label", {
				className: "qo-field",
				children: [
					/* @__PURE__ */ (0, R.jsxs)("svg", {
						viewBox: "0 0 16 16",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinecap: "round",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, R.jsx)("circle", {
							cx: "7",
							cy: "7",
							r: "4.5"
						}), /* @__PURE__ */ (0, R.jsx)("path", { d: "m10.5 10.5 3 3" })]
					}),
					/* @__PURE__ */ (0, R.jsx)("input", {
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
					/* @__PURE__ */ (0, R.jsx)("kbd", {
						className: "qo-esc",
						"aria-hidden": "true",
						children: "esc"
					})
				]
			}),
			/* @__PURE__ */ (0, R.jsxs)("div", {
				className: "qo-in",
				id: "qoIn",
				role: "listbox",
				"aria-label": p("quickopen.list"),
				ref: h,
				children: [
					k,
					x.map((e, t) => [e.title ? /* @__PURE__ */ (0, R.jsx)("div", {
						className: "qo-h",
						children: p(e.title)
					}, `h${t}`) : null, ...e.rows.map((e) => O(e, A++))]),
					S ? /* @__PURE__ */ (0, R.jsx)("div", {
						className: "qo-foot",
						children: p("quickopen.more", { n: S })
					}) : null
				]
			}),
			/* @__PURE__ */ (0, R.jsxs)("div", {
				className: "qo-hint",
				children: [/* @__PURE__ */ (0, R.jsxs)("span", {
					className: "qo-keys",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, R.jsx)("span", { children: p("quickopen.keys.move") }),
						/* @__PURE__ */ (0, R.jsx)("span", { children: p("quickopen.keys.open") }),
						/* @__PURE__ */ (0, R.jsx)("span", { children: p("quickopen.keys.close") })
					]
				}), /* @__PURE__ */ (0, R.jsxs)("span", {
					className: "qo-term",
					children: [
						/* @__PURE__ */ (0, R.jsx)("span", { children: p("quickopen.term") }),
						" ",
						/* @__PURE__ */ (0, R.jsxs)("code", { children: [
							"prevue show <",
							/* @__PURE__ */ (0, R.jsx)("span", { children: p("quickopen.term.file") }),
							">"
						] })
					]
				})]
			})
		]
	});
});
function H({ hosts: e, children: t }) {
	let { place: n } = o(e?.sheet);
	return n(t, (e, t) => /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("div", {
		className: "qo-curtain on",
		id: "qoCurtain"
	}), /* @__PURE__ */ (0, R.jsx)("div", {
		className: "qo-sheet on",
		id: "qoSheet",
		ref: e,
		children: t
	})] }));
}
function We({ host: e, children: t }) {
	let { phrase: n } = s(), { place: r } = o(e);
	return r(/* @__PURE__ */ (0, R.jsxs)("div", {
		className: "start-in",
		children: [/* @__PURE__ */ (0, R.jsx)("p", {
			className: "start-lead",
			children: n("start.lead")
		}), t]
	}), (e, t) => /* @__PURE__ */ (0, R.jsx)("section", {
		id: "startView",
		className: "start",
		ref: e,
		children: t
	}));
}
var U = {
	open: !1,
	files: null,
	ready: !1,
	query: "",
	sel: -1,
	recent: []
}, Ge = /* @__PURE__ */ new Set();
function Ke(e, t = !1) {
	if (!Object.keys(e).every((t) => U[t] === e[t]) && (U = {
		...U,
		...e
	}, !t)) for (let e of Ge) e();
}
var qe = (e) => (Ge.add(e), () => {
	Ge.delete(e);
}), Je = () => U, W = null, G = null, Ye = null, K = !1, Xe = null, Ze = 0, Qe = !1, $e = !1, et = null, tt = 0, nt = () => "prevue.recent:" + (I.st?.header.repo || "");
function rt() {
	try {
		return JSON.parse(localStorage.getItem(nt()) || "[]");
	} catch {
		return [];
	}
}
function it(e, t = !1) {
	if (!e) return;
	let n = [e, ...rt().filter((t) => t !== e)].slice(0, 20);
	try {
		localStorage.setItem(nt(), JSON.stringify(n));
	} catch {}
	Ke({ recent: n }, t);
}
async function at() {
	let e = ++tt, t = await j().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === tt && Ke(t);
}
function ot(e = null) {
	if (K) G?.focus({ preventScroll: !0 }), G?.select();
	else if (W) {
		if (!U.open) {
			let { sheet: t, curtain: n } = W;
			Qe = !0, Xe = e && e !== document.body ? e : null, Ye?.setAttribute("aria-expanded", "true"), t.hidden = !1, n.hidden = !1, t.classList.remove("closing"), Ke({
				open: !0,
				query: "",
				sel: -1,
				recent: rt()
			}), requestAnimationFrame(() => {
				U.open && (n.classList.add("on"), t.classList.add("on"));
			}), at();
		}
		G?.focus({ preventScroll: !0 }), G?.select();
	}
}
function q(e = !1, t = !1) {
	if (Ze = 0, !U.open || !W) return;
	let { sheet: n, curtain: r } = W;
	G && (G.value = "", G.blur()), t && Xe?.isConnected && Xe.focus({ preventScroll: !0 }), Xe = null, Ke({ open: !1 }), Ye?.setAttribute("aria-expanded", "false"), r.classList.remove("on"), n.classList.remove("on"), e ? (n.hidden = !0, r.hidden = !0) : (n.classList.add("closing"), setTimeout(() => {
		U.open || (n.hidden = !0, r.hidden = !0, n.classList.remove("closing"));
	}, 220));
}
function st() {
	(U.open || K) && at();
}
var ct = (e) => {
	let t = (e?.tabs || []).find((e) => e.active);
	return t ? t.key : e?.board?.file ?? null;
};
function lt() {
	let e = Ze = performance.now();
	setTimeout(() => {
		Ze === e && q();
	}, 1500);
}
async function ut(e, { phrase: t, daemonText: n }) {
	let r = e.f, i = I.st, a = e.fn ? e.fn.fn : null;
	if (it(r.path, !0), r.path === ct(i)) {
		x(r.path, a), i?.screen === "focus" && i.focus?.fromBoard ? (lt(), N("/viewer/exit")) : (q(), f());
		return;
	}
	x(r.path, a), lt();
	let o = await N("/viewer/open", { file: r.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	o.ok || (Ze = 0, m(), F(n(o.message) || t("open.cannot")));
}
var dt = (e) => {
	e ? G = e : G && !G.isConnected && (G = null);
}, ft = (e, t) => Ke({
	query: e,
	sel: t
}), pt = (e) => Ke({ sel: e }), mt = () => {
	K ? G?.blur() : q(!1, !0);
}, ht = (e) => {
	U.open && W && e && !W.sheet.contains(e) && e !== Ye && q();
}, gt = (0, L.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, L.useLayoutEffect)(() => {
		if (!n) return;
		Ye = n, n.title = t("rail.open.tip"), n.setAttribute("aria-label", t("rail.open.label"));
		let e = (e) => U.open ? q(!1, !0) : ot(e.detail === 0 ? n : null);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), Ye = null;
		};
	}, [n, t]), r(/* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
		/* @__PURE__ */ (0, R.jsx)("svg", {
			viewBox: "0 0 16 16",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinecap: "round",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, R.jsx)("path", { d: "M8 3.5v9M3.5 8h9" })
		}),
		/* @__PURE__ */ (0, R.jsx)("span", {
			className: "rail-open-t",
			children: t("rail.open")
		}),
		/* @__PURE__ */ (0, R.jsx)("kbd", { children: "⌘K" })
	] }), (e, t) => /* @__PURE__ */ (0, R.jsx)("button", {
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
function _t({ state: e, draw: t, connection: n, hosts: r }) {
	let i = s(), a = (0, L.useSyncExternalStore)(qe, Je), o = n !== "lost" && e?.screen === "empty" && !!e.header.repo;
	(0, L.useLayoutEffect)(() => {
		W = r;
		let e = (e) => {
			let t = e.target;
			U.open && !r.sheet.contains(t) && !r.curtain.contains(t) && !Ye?.contains(t) && q();
		}, t = () => q(!1, !0), n = () => {
			K && !document.hidden && at();
		};
		return document.addEventListener("pointerdown", e, !0), r.curtain.addEventListener("click", t), document.addEventListener("visibilitychange", n), () => {
			document.removeEventListener("pointerdown", e, !0), r.curtain.removeEventListener("click", t), document.removeEventListener("visibilitychange", n), W = null, K = !1;
		};
	}, [r]), (0, L.useLayoutEffect)(() => {
		o !== K && (K = o, o ? (q(!0), Qe = !0, r.start.hidden = !1, at()) : (r.start.hidden = !0, r.start.classList.remove("enter")), Ke({
			query: "",
			sel: -1,
			...o ? { recent: rt() } : {}
		}));
	}, [o]), (0, L.useLayoutEffect)(() => {
		if (!e) return;
		let t = ct(e);
		t && t !== et && (et = t, it(t)), Ze && e.screen !== "empty" && q(!0);
	}, [t]), (0, L.useLayoutEffect)(() => {
		n === "lost" && q(!0);
	}, [n]), (0, L.useLayoutEffect)(() => {
		Qe ? ((K ? r.start : r.sheet).classList.add("enter"), (K ? r.sheet : r.start).classList.remove("enter"), Qe = !1, $e = !0, requestAnimationFrame(() => {
			$e = !1;
		})) : $e || (r.sheet.classList.remove("enter"), r.start.classList.remove("enter"));
	});
	let c = (0, L.useCallback)((e) => ut(e, i), [i]), l = /* @__PURE__ */ (0, R.jsx)(Ue, {
		files: a.files,
		ready: a.ready,
		query: a.query,
		sel: a.sel,
		recent: a.recent,
		fieldRef: dt,
		onQuery: ft,
		onSelect: pt,
		onPick: c,
		onEscape: mt,
		onLeave: ht
	});
	return /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)(H, {
		hosts: r,
		children: !o && l
	}), /* @__PURE__ */ (0, R.jsx)(We, {
		host: r.start,
		children: o && l
	})] });
}
// src/components/FileRail.tsx
var vt = "prevue.sharedOnce", yt = [], bt = [];
function xt(e) {
	let t = bt.findIndex((e) => e.active), n = bt[Math.max(0, Math.min(bt.length - 1, t + e))];
	n && !n.active && N("/viewer/tab", { key: n.key });
}
function St(e) {
	let t = bt[e - 1];
	t && !t.active && N("/viewer/tab", { key: t.key });
}
var Ct = () => bt.length, wt = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
function Tt(e) {
	let t = e.match(wt) || [e], n = "";
	for (let e = t.length - 1; e > 0 && !(n && (t[e] + n).length > 12); e--) n = t[e] + n;
	return n.length >= e.length - 2 ? "" : n;
}
var Et = null, Dt = (e, t) => (Et ??= document.createElement("canvas").getContext("2d"), Et.font = t, Et.measureText(e).width), Ot = (e) => {
	let t = getComputedStyle(e);
	return `${t.fontWeight} ${t.fontSize} ${t.fontFamily}`;
};
function kt(e, t, n) {
	if (Dt(e, n) <= t) return e;
	let r = Tt(e), i = r.match(wt) || [], a = i.map((e, t) => i.slice(t).join(""));
	for (let [r, i] of [...a.map((e) => [e, 3]), [a[a.length - 1] || "", 1]]) for (let a = e.length - r.length - 1; a >= i; a--) {
		let i = e.slice(0, a) + "…" + r;
		if (Dt(i, n) <= t) return i;
	}
	for (let i = 1; i < r.length; i++) {
		let a = e[0] + "…" + r.slice(i);
		if (Dt(a, n) <= t) return a;
	}
	return e[0] + "…";
}
var At = 56;
function jt(e, t, n = !1) {
	let r = [...t.querySelectorAll(".rt:not(.leaving)")];
	if (!r.length || e.hidden) return;
	let i = (e, t) => e.querySelector(t), a = Ot(i(r[0], ".rt-name")), o = Ot(i(r[0], ".rt-mod")), s = parseFloat(getComputedStyle(r[0]).columnGap) || 0, c = (t) => t.dataset.name + "|" + i(t, ".rt-mod").textContent + "|" + e.clientWidth, l = r.filter((e) => n || e.dataset.fitted !== c(e));
	if (!l.length) return;
	for (let e of l) i(e, ".rt-mod").style.maxWidth = "0px";
	let u = l.map((e) => i(e, ".rt-name").clientWidth + (i(e, ".rt-mod").textContent ? s : 0));
	l.forEach((e, t) => {
		let n = i(e, ".rt-name"), r = i(e, ".rt-mod"), l = u[t], d = l;
		if (r.textContent) {
			let t = Math.min(Math.ceil(Dt(r.textContent, o)), Math.max(l - s - Math.ceil(Dt(e.dataset.name, a)), At));
			r.style.maxWidth = t + "px", d = l - s - t;
		} else r.style.maxWidth = "";
		n.textContent = kt(e.dataset.name, d, a), e.dataset.fitted = c(e);
	});
}
function Mt({ tab: e, leaving: t, enter: n, onGone: r, observe: i }) {
	let { phrase: a } = s(), o = (0, L.useRef)(null), [l, u] = (0, L.useState)(n);
	(0, L.useLayoutEffect)(() => {
		let e = o.current;
		c(e), i(e, !0);
		let t = 0;
		return l && (t = requestAnimationFrame(() => {
			t = requestAnimationFrame(() => u(!1));
		})), () => {
			cancelAnimationFrame(t), i(e, !1);
		};
	}, []), (0, L.useLayoutEffect)(() => {
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
	let d = z(e.sourceSet), f = () => N("/viewer/close", { key: e.key });
	return /* @__PURE__ */ (0, R.jsxs)("div", {
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
			e.active || N("/viewer/tab", { key: e.key });
		},
		onAuxClick: (e) => {
			e.button === 1 && (e.preventDefault(), f());
		},
		children: [
			/* @__PURE__ */ (0, R.jsx)(we, { kind: d }),
			/* @__PURE__ */ (0, R.jsx)("span", { className: "rt-name" }),
			/* @__PURE__ */ (0, R.jsx)("span", {
				className: "rt-mod",
				children: ((e.dim || "") + (e.module ? " · " + e.module : "")).replace(/^\s*·\s*/, "")
			}),
			/* @__PURE__ */ (0, R.jsx)("button", {
				type: "button",
				className: "rt-x",
				tabIndex: -1,
				"aria-label": a("tabs.close"),
				onClick: (e) => {
					e.stopPropagation(), f();
				},
				children: /* @__PURE__ */ (0, R.jsx)("svg", {
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, R.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
				})
			})
		]
	});
}
function Nt({ tabs: e, screen: t, hosts: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n?.list), [c, l] = (0, L.useState)(null), [u, d] = (0, L.useState)(null), f = n?.rail ?? c, p = n?.empty ?? u, m = (0, L.useRef)(null), h = e ?? yt, g = t !== "focus", _ = (0, L.useRef)(h), [v, y] = (0, L.useState)([]);
	if (_.current !== h) {
		let e = new Set(h.map((e) => e.key)), t = _.current.filter((t) => !e.has(t.key) && !v.some((e) => e.key === t.key));
		(t.length || v.some((t) => e.has(t.key))) && y([...v.filter((t) => !e.has(t.key)), ...t]), _.current = h;
	}
	let b = (e) => y((t) => t.filter((t) => t.key !== e)), x = (0, L.useRef)(!1), S = (0, L.useRef)(null), C = x.current && g && !ge.matches && !document.hidden, w = (0, L.useRef)({
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
			duration: me("--duration-medium2"),
			easing: he("--easing-standard")
		})).finished.then(() => {
			n.stretch = null, n.sliding = !1;
		}, () => {})) : n.stretch && !e && (n.stretch.cancel(), n.stretch = null, n.sliding = !1), n.y = a, t.style.transform = `translateY(${a}px)`;
	}, E = (0, L.useRef)(T);
	E.current = T;
	let [D] = (0, L.useState)(() => new ResizeObserver(() => E.current(w.current.sliding))), O = (e, t) => {
		e && (t ? D.observe(e) : D.unobserve(e));
	};
	(0, L.useEffect)(() => () => D.disconnect(), [D]), (0, L.useEffect)(() => {
		f && i && document.fonts?.ready.then(() => jt(f, i, !0));
	}, [f, i]), (0, L.useLayoutEffect)(() => {
		if (!e || !f || !i) return;
		f.hidden = !g, n && document.body.classList.toggle("rail-on", g), p && (p.hidden = e.length > 0), jt(f, i), bt = e;
		let t = e.find((e) => e.active);
		t && z(t.sourceSet) === "kmp" ? ce(vt, () => r("capsule.sharedOnce", { sourceSet: t.sourceSet })) : ie(vt);
		let a = t?.key ?? null, o = x.current && g && a !== S.current && S.current !== null;
		S.current = a, x.current = g, T(o);
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
	}))], A = /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("div", {
		className: "rail-glider instant",
		id: "railGlider",
		ref: m,
		hidden: !0
	}), k.map(({ tab: e, leaving: t }) => /* @__PURE__ */ (0, R.jsx)(Mt, {
		tab: e,
		leaving: t,
		enter: C,
		onGone: b,
		observe: O
	}, e.key))] });
	return n ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [a(A, () => null), /* @__PURE__ */ (0, R.jsx)(gt, { host: n.open })] }) : /* @__PURE__ */ (0, R.jsxs)("nav", {
		className: "rail",
		id: "rail",
		ref: l,
		"aria-label": r("rail.title"),
		children: [
			/* @__PURE__ */ (0, R.jsx)("h4", {
				className: "rail-h",
				children: r("rail.title")
			}),
			a(A, (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
				className: "rail-list",
				id: "railList",
				ref: e,
				role: "tablist",
				"aria-orientation": "vertical",
				children: t
			})),
			/* @__PURE__ */ (0, R.jsx)("p", {
				className: "rail-empty",
				id: "railEmpty",
				ref: d,
				hidden: !0,
				children: r("rail.empty")
			}),
			/* @__PURE__ */ (0, R.jsx)(gt, {})
		]
	});
}
// src/components/ProjectHeader.tsx
var Pt = 8, Ft = (e) => [...e].reduce((e, t) => e * 31 + t.codePointAt(0) >>> 0, 7) % Pt + 1, It = () => !1, Lt = () => It();
function Rt({ header: e, tabs: t, app: n, iconUrl: r = "/app-icon.png", host: i, brand: a }) {
	let { phrase: c } = s(), { element: l, place: u } = o(i), [d, f] = (0, L.useState)(!1), [p, m] = (0, L.useState)(null), h = (0, L.useRef)({
		open: !1,
		byKey: !1
	}), g = (0, L.useRef)(null), _ = (0, L.useRef)(null), v = (0, L.useRef)(null), y = e ? n?.name || e.repoLeaf : "";
	(0, L.useLayoutEffect)(() => {
		a && n?.prevue && (a.title = `Prevue ${n.prevue}`);
	}, [a, n]), (0, L.useLayoutEffect)(() => {
		v.current?.style.setProperty("background", e ? `var(--avatar-${Ft(y)})` : "");
	}, [e, y]), (0, L.useLayoutEffect)(() => {
		if (!e || !i) return;
		let n = t.find((e) => e.active);
		document.title = n ? `${n.name} — ${y}` : y;
	}, [
		e,
		i,
		t,
		y
	]), (0, L.useEffect)(() => {
		It = () => {
			if (!h.current.open) return !1;
			h.current.open = !1;
			let e = document.activeElement;
			return e && _.current?.contains(e) && (h.current.byKey ? g.current?.focus({ preventScroll: !0 }) : e.blur()), m(null), !0;
		};
		let e = (e) => {
			!_.current?.contains(e.target) && e.target !== g.current && It();
		};
		return addEventListener("pointerdown", e), () => {
			removeEventListener("pointerdown", e), It = () => !1;
		};
	}, []);
	let b = (e, t) => {
		navigator.clipboard.writeText(e).then(() => F(c("header.copied", {
			what: t,
			text: e
		})), () => F(e));
	}, x = (e) => {
		It() || (h.current = {
			open: !0,
			byKey: e.detail === 0
		}, m({ left: Math.round(e.currentTarget.getBoundingClientRect().left - (l?.getBoundingClientRect().left ?? 0) - 6) }));
	}, S = e ? [
		e.module,
		e.sourceSet && /* @__PURE__ */ (0, R.jsx)("span", {
			title: c("header.sourceSet", { variant: e.variant }),
			children: e.sourceSet
		}, "ss"),
		e.variant
	].filter(Boolean).flatMap((e, t) => [" · ", /* @__PURE__ */ (0, R.jsx)(L.Fragment, { children: e }, t)]) : [];
	return u(/* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
		/* @__PURE__ */ (0, R.jsx)("span", {
			className: "app-tile",
			id: "appTile",
			ref: v,
			"aria-hidden": "true",
			hidden: d,
			children: [...y][0] || ""
		}),
		/* @__PURE__ */ (0, R.jsx)("img", {
			className: "app-icon",
			id: "appIcon",
			alt: "",
			hidden: !d,
			src: n?.icon ? r : void 0,
			onLoad: () => f(!0)
		}),
		/* @__PURE__ */ (0, R.jsxs)("div", {
			className: "app-t",
			children: [/* @__PURE__ */ (0, R.jsx)("div", {
				className: "app-name",
				id: "appName",
				children: y
			}), /* @__PURE__ */ (0, R.jsxs)("div", {
				className: "proj",
				id: "proj",
				children: [
					/* @__PURE__ */ (0, R.jsx)("button", {
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
					/* @__PURE__ */ (0, R.jsxs)("button", {
						className: "pj pj-br",
						id: "pjBr",
						type: "button",
						title: c("brand.copyBranch"),
						hidden: !e?.branch,
						onClick: () => b(e?.branch || "", c("header.copy.branch")),
						children: [/* @__PURE__ */ (0, R.jsxs)("svg", {
							viewBox: "0 0 16 16",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "1.5",
							strokeLinecap: "round",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, R.jsx)("circle", {
									cx: "5",
									cy: "3.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, R.jsx)("circle", {
									cx: "5",
									cy: "12.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, R.jsx)("circle", {
									cx: "11",
									cy: "5.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, R.jsx)("path", { d: "M5 5v6M11 7c0 2.5-6 2-6 4" })
							]
						}), /* @__PURE__ */ (0, R.jsx)("span", {
							id: "pjBrName",
							children: e?.branch || ""
						})]
					}),
					/* @__PURE__ */ (0, R.jsx)("span", {
						className: "pj-rest",
						id: "pjRest",
						children: S
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, R.jsxs)("div", {
			className: `pop dir-pop${p ? " on" : ""}`,
			id: "dirPop",
			ref: _,
			role: "dialog",
			"aria-label": c("header.dir"),
			style: p ? { left: `${p.left}px` } : void 0,
			children: [/* @__PURE__ */ (0, R.jsx)("div", {
				className: "dir-path",
				id: "dirPath",
				children: (e?.repo || "").split(/(?<=\/)/).flatMap((e, t) => [e, /* @__PURE__ */ (0, R.jsx)("wbr", {}, t)])
			}), /* @__PURE__ */ (0, R.jsxs)("div", {
				className: "dir-act",
				children: [/* @__PURE__ */ (0, R.jsx)("button", {
					type: "button",
					id: "dirCopy",
					onClick: () => {
						b(e?.repo || "", c("header.copy.path")), It();
					},
					children: c("header.dir.copy")
				}), /* @__PURE__ */ (0, R.jsx)("button", {
					type: "button",
					id: "dirReveal",
					hidden: n ? !n.reveal : !1,
					onClick: () => {
						N("/viewer/reveal"), It();
					},
					children: c("header.dir.reveal")
				})]
			})]
		})
	] }), (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
		className: "app",
		id: "app",
		ref: e,
		children: t
	}));
}
// src/preparation/PreparationScreen.ts
function zt() {
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
	function ee(e, t) {
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
		let i = ee(e, !0);
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
			let i = ee(e, !1);
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
			N(e, u).catch((e) => {
				o && u === h && j(e.message);
			});
		},
		fail: j
	};
}
// src/components/ShortcutHelp.tsx
var Bt = !1, Vt = null, Ht = null, Ut = null, Wt = () => Bt;
function Gt(e = !Bt, t = !1) {
	if (!Ht) return;
	let { scrim: n, sheet: r } = Ht;
	e && !Bt && (Vt = t && document.activeElement !== document.body ? document.activeElement : null), Bt = e, e ? (n.hidden = !1, requestAnimationFrame(() => {
		Bt && (n.classList.add("on"), r.focus({ preventScroll: !0 }));
	})) : (n.classList.remove("on"), setTimeout(() => {
		Bt || (n.hidden = !0);
	}, 220), n.contains(document.activeElement) && document.activeElement.blur(), Vt && Vt.isConnected && Vt.focus({ preventScroll: !0 }), Vt = null), Ut?.setAttribute("aria-expanded", String(e));
}
var Kt = (0, L.memo)(function({ table: e, logo: t = "prevue.svg", host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = (0, L.useRef)(null);
	return (0, L.useLayoutEffect)(() => {
		if (!i || !c.current) return;
		Ht = {
			scrim: i,
			sheet: c.current
		};
		let e = (e) => {
			e.target === i && Gt(!1);
		};
		return i.addEventListener("click", e), () => {
			i.removeEventListener("click", e), Ht = null;
		};
	}, [i]), a(/* @__PURE__ */ (0, R.jsxs)("div", {
		className: "sheet",
		ref: c,
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "helpTitle",
		tabIndex: -1,
		children: [
			/* @__PURE__ */ (0, R.jsxs)("div", {
				className: "sheet-brand",
				children: [/* @__PURE__ */ (0, R.jsx)("img", {
					src: t,
					alt: ""
				}), "Prevue"]
			}),
			/* @__PURE__ */ (0, R.jsx)("h2", {
				id: "helpTitle",
				children: r("help.title")
			}),
			/* @__PURE__ */ (0, R.jsx)("div", {
				className: "sheet-body",
				children: e.map((e) => [/* @__PURE__ */ (0, R.jsx)("h3", { children: e.group }, `h${e.group}`), /* @__PURE__ */ (0, R.jsx)("dl", { children: e.rows.map((e, t) => [/* @__PURE__ */ (0, R.jsx)("dt", { children: e.cap.map((t, n) => [n && e.combo ? /* @__PURE__ */ (0, R.jsx)("span", {
					className: "plus",
					children: "+"
				}, `p${n}`) : null, /* @__PURE__ */ (0, R.jsx)("kbd", { children: t }, `k${n}`)]) }, `t${t}`), /* @__PURE__ */ (0, R.jsx)("dd", { children: e.label }, `d${t}`)]) }, `l${e.group}`)])
			})
		]
	}), (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
		className: "scrim",
		id: "help",
		ref: e,
		hidden: !0,
		children: t
	}));
}), qt = (0, L.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, L.useLayoutEffect)(() => {
		if (!n) return;
		Ut = n, n.title = t("header.help.tip"), n.setAttribute("aria-label", t("header.help"));
		let e = (e) => Gt(!Bt, e.detail === 0);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), Ut = null;
		};
	}, [n, t]), r("?", (e, t) => /* @__PURE__ */ (0, R.jsx)("button", {
		className: "icon-btn",
		id: "helpBtn",
		ref: e,
		type: "button",
		"aria-haspopup": "dialog",
		"aria-expanded": "false",
		children: t
	}));
}), Jt = Promise.resolve();
async function Yt(e, t, n) {
	let r = await N("/viewer/touch", {
		x: t,
		y: n,
		type: e
	});
	r.ok || F(k("input.touch.failed", { status: r.status }));
}
function Xt(e, t, n) {
	Jt = Jt.then(() => Yt(e, t, n)).catch(() => {});
}
var J = null, Zt = () => !!J;
function Qt(e, t) {
	J = [e, t], Xt("press", e, t);
}
function $t(e, t) {
	J && Math.abs(e - J[0]) + Math.abs(t - J[1]) > 6 && (J = [e, t], rn(e, t));
}
function en(e, t) {
	J && (J = null, Xt("release", e, t));
}
var tn = null, nn = !1;
function rn(e, t) {
	tn = [e, t], nn || (nn = !0, Jt = Jt.then(() => {
		nn = !1;
		let e = tn;
		return tn = null, e ? Yt("drag", e[0], e[1]) : null;
	}).catch(() => {}));
}
var Y = null;
function an(e, t, n, r) {
	Y ? (Y.dx += n, Y.dy += r, Y.x = e, Y.y = t) : (Y = {
		x: e,
		y: t,
		dx: n,
		dy: r
	}, Jt = Jt.then(() => {
		let e = Y;
		return Y = null, N("/viewer/wheel", {
			x: Math.round(e.x),
			y: Math.round(e.y),
			dx: e.dx,
			dy: e.dy
		});
	}).catch(() => {}));
}
// src/workspace/view.ts
function on(e) {
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
var X = on({
	pct: 100,
	real: !1,
	atFit: !0,
	menu: !1,
	disabled: !1
}), sn = on({
	on: !1,
	failed: !1
}), cn = on({
	tag: null,
	node: null,
	say: null
});
// src/workspace/point.ts
function ln(e, t, n, r = []) {
	let i = I.projectFiles.size ? (e) => I.projectFiles.has(e.fileName) : () => !0;
	for (let a of e) {
		let [e, o, s, c] = a.bounds, l = t.concat(a.name ? [a.name] : []), u = a.name && i(a) ? r.concat([a.name]) : r;
		s > e && c > o && a.lineNumber > 0 && n.push({
			...a,
			area: (s - e) * (c - o),
			chain: l,
			uchain: u
		}), ln(a.children || [], l, n, u);
	}
	return n;
}
var un = (e, t) => e.area - t.area || t.chain.length - e.chain.length;
function dn(e) {
	return I.projectFiles.size ? e.filter((e) => I.projectFiles.has(e.fileName)) : e;
}
function fn(e, t, n) {
	return e.find((e) => {
		let [r, i, a, o] = e.bounds;
		return t >= r && t < a && n >= i && n < o;
	});
}
var pn = (e) => +(e.dataset.fullW ?? 0) || e.naturalWidth;
function mn(e) {
	return pn(e) ? e.getBoundingClientRect().width / pn(e) : 1;
}
function hn(e, t) {
	let n = t.getBoundingClientRect(), r = mn(t) || 1;
	return [Math.round((e.clientX - n.left) / r), Math.round((e.clientY - n.top) / r)];
}
function gn(e, t, n) {
	let [r, i, a, o] = t.bounds;
	e.hidden = !1, e.style.left = r * n + "px", e.style.top = i * n + "px", e.style.width = (a - r) * n + "px", e.style.height = (o - i) * n + "px";
}
async function _n(e, t, n) {
	let r = ++Z;
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
		if (r !== Z) return;
		i.ref ? yn(i.ref, n, i.file) : i.needChoice || n(O(i.message ?? null) || `${e.fileName}:${e.lineNumber}`);
	} catch (e) {
		if (r === Z) {
			let t = e.message;
			n(k("point.failed", { why: t })), F(k("point.failed", { why: t }));
		}
	}
}
var Z = 0, vn = (e) => navigator.clipboard ? navigator.clipboard.writeText(e) : Promise.reject(Error(k("point.noClipboard")));
function yn(e, t, n) {
	let r = ++Z, i = () => {
		r === Z && t(k("point.copied", { ref: e }), e, !0, n);
	}, a = () => {
		vn(e).then(i, () => {
			r === Z && t(k("point.copyBlocked", { ref: e }), e, !1, n);
		});
	};
	vn(e).then(i, () => {
		r === Z && t(k("point.copyRetry", { ref: e }), e, !1, n, a);
	});
}
var bn = (e) => {
	e && F(e);
}, xn = bn;
function Sn(e) {
	xn = e;
}
async function Cn(e) {
	let t = await N("/viewer/open", { file: e }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: k("open.failed", { why: e.message })
	}));
	if (t.ok) return;
	let n = O(t.message ?? null);
	if (t.command) {
		let e = t.command;
		vn(e).then(() => F(n), () => F(`${n.split(" — ")[0]} — ${e}`));
	} else F(n);
}
function wn(e) {
	if (!e.dataset.wired) {
		e.dataset.wired = "1";
		for (let t of [
			"mousedown",
			"click",
			"pointerdown",
			"dblclick"
		]) e.addEventListener(t, (e) => e.stopPropagation());
		e.addEventListener("mousedown", (e) => {
			e.button === 0 && e.target.closest("button") && e.preventDefault();
		});
	}
}
function Tn() {
	let e = getComputedStyle(document.documentElement);
	return parseFloat(e.getPropertyValue("--tag-h")) + parseFloat(e.getPropertyValue("--space-4"));
}
function En(e, t) {
	for (let t of document.querySelectorAll(".box.pick")) t !== e && (t.hidden = !0);
	let n = e.querySelector(".tag");
	wn(n), e.style.animation = "none";
	let r = e.getBoundingClientRect(), i = e.parentElement.closest(".cstage, .wrap"), a = i ? i.getBoundingClientRect() : {
		top: -Infinity,
		bottom: Infinity,
		right: Infinity
	}, o = Tn(), s = r.top - a.top >= o, c = a.bottom - r.bottom >= o;
	e.classList.toggle("below", !s && c), e.classList.toggle("inside", !s && !c), n.style.maxWidth = Number.isFinite(a.right) ? `min(var(--tag-max-w), ${Math.max(0, Math.floor(a.right - r.left) - 4)}px)` : "", e.offsetWidth, e.style.animation = "";
	let l = (e, r, i, a, o) => {
		let s = {
			msg: e,
			ref: r,
			copied: i,
			file: a,
			again: o
		};
		cn.set({
			tag: n,
			node: t,
			say: s
		});
	};
	return l(null, `${t.fileName}:${t.lineNumber}`), l;
}
function Dn() {
	for (let e of document.querySelectorAll(".box.pick")) e.hidden = !0;
	cn.set({
		tag: null,
		node: null,
		say: null
	}), xn = bn, Z++;
}
async function On(e) {
	let t = await N("/viewer/choose", { path: e }).then((e) => e.json()).catch(() => ({}));
	t.ref && yn(t.ref, xn, t.file);
}
function kn() {
	N("/viewer/cancel");
}
var An = 8, jn = 16;
function Mn(e) {
	let t = document.documentElement, n = t.clientWidth, r = t.clientHeight, i = e.offsetWidth, a = e.offsetHeight, o = cn.get().tag, s = o && o.isConnected && o.getClientRects().length ? o.getBoundingClientRect() : null, c, l, u = !1;
	s ? (c = s.left, l = s.bottom + An, l + a > r - jn && s.top - An - a >= jn && (l = s.top - An - a, u = !0)) : (c = (n - i) / 2, l = document.getElementById("bar").getBoundingClientRect().bottom + jn), c = Math.max(jn, Math.min(c, n - i - jn)), l = Math.max(jn, Math.min(l, r - a - jn));
	let d = Math.round(c) + "px", f = Math.round(l) + "px";
	e.style.left !== d && (e.style.left = d), e.style.top !== f && (e.style.top = f), e.classList.toggle("up", u);
}
var Nn = !1;
function Pn(e) {
	if (Mn(e), Nn) return;
	Nn = !0;
	let t = () => {
		e.classList.contains("on") ? (Mn(e), requestAnimationFrame(t)) : Nn = !1;
	};
	requestAnimationFrame(t);
}
function Fn(e, { stage: t, img: n, box: r, pick: i }, a) {
	let o = null, s = async () => {
		let t = I.st && I.st.board && be(e);
		if (!t || !t.ok || !t.treeUrl) return null;
		let n = D.get(t.treeUrl);
		if (n) return o = n, o;
		try {
			o = dn(ln((await ee(t.treeUrl).then((e) => e.json())).composeViewInfo || [], [], []).sort(un)), D.set(t.treeUrl, o);
		} catch {
			o = null;
		}
		return o;
	};
	t.addEventListener("mouseenter", () => {
		o = null, s();
	}, { signal: a }), n.addEventListener("mousemove", (e) => {
		if (!o) return;
		let t = fn(o, ...hn(e, n));
		t ? gn(r, t, mn(n)) : r.hidden = !0;
	}, { signal: a }), n.addEventListener("mouseleave", () => {
		r.hidden = !0;
	}, { signal: a }), n.addEventListener("click", async (t) => {
		C(e);
		let r = o || await s();
		if (!r) return;
		let a = fn(r, ...hn(t, n));
		if (!a) return;
		let c = be(e);
		gn(i, a, mn(n));
		let l = En(i, a);
		Sn(l), _n(a, c.previewId, l);
	}, { signal: a });
}
// src/workspace/resize.ts
var In = (e) => e ? e.kind === "device" ? `${e.device === "duo" ? "ipduo" : e.device}:${e.folded ? "cover" : "open"}${e.landscape ? ":rot" : ""}` : e.preset || `custom:${e.widthDp}x${e.heightDp}` : "original";
function Ln(e, t, n) {
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
function Rn({ root: e, geometry: t, shot: n, stage: r, wrap: i, layout: a, dimensions: o, originalSize: s, zoomState: c, preparation: l, firstFrame: u }) {
	let d = null, f = !1, p = null, m = null, h = null, g = null, _ = null, v = 0, y = null, b = !1, x = !1, S = !1, C = null, w = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), E = (e) => (T.has(e.src) || T.set(e.src, Ln(e, e.naturalWidth, e.naturalHeight)), T.get(e.src)), D = xe(e, {
		request: (e) => {
			if (S) return Promise.resolve(!1);
			let [t, n, r] = e.split(":"), i = D.devices.has(t) ? {
				device: t === "ipduo" ? "duo" : t,
				folded: n === "cover",
				landscape: r === "rot"
			} : { size: e.startsWith("custom:") ? e.slice(7) : e };
			return N("/viewer/resize", i).then((e) => {
				if (!e.ok) throw Error(`HTTP ${e.status}`);
				return !0;
			}).catch((e) => (F(k("resize.failed", { why: e.message })), !1));
		},
		layout: (t, n) => {
			if (!f) return;
			let i = c();
			d && i.z !== 1 && (i.x += (1 - i.z) * (d.cx - d.w / 2 - (t.cx - t.w / 2)), i.y += (1 - i.z) * (d.y - t.y)), d = t, a(t), ie(), r.classList.toggle("resize-hidden", n || !b && !S), e.classList.toggle("await-live", !b);
		}
	});
	function O(t, r = !1) {
		S = t, e.classList.toggle("preparing", t), n.setAttribute("aria-busy", String(t && !r)), sn.set({
			on: t,
			failed: r
		});
		for (let n of e.querySelectorAll("input")) n.disabled = t;
		for (let e of document.querySelectorAll("#pnPick button, #devCtl button")) e.disabled = t;
		D.sliderOff(t), l(t, r);
	}
	function A(e, t) {
		let n = m?.pxPerDp || 2.625;
		return {
			url: e.src,
			dpW: t?.widthDp || e.naturalWidth / n,
			dpH: t?.heightDp || e.naturalHeight / n,
			edge: E(e)
		};
	}
	function j() {
		if (n.naturalWidth && m && b) try {
			let e = document.createElement("canvas");
			e.width = n.naturalWidth, e.height = n.naturalHeight, e.getContext("2d").drawImage(n, 0, 0);
			let t = o(), r = m.pxPerDp || 2.625;
			D.image(h, {
				url: e.toDataURL("image/jpeg", .92),
				dpW: m.size?.widthDp || t.w / r,
				dpH: m.size?.heightDp || t.h / r,
				edge: Ln(e, e.width, e.height)
			});
		} catch {}
	}
	function M(e) {
		if (!w.has(e)) {
			let t = new Image();
			t.src = e, w.set(e, t.decode().then(() => t).catch((t) => {
				throw w.delete(e), t;
			}));
		}
		return w.get(e);
	}
	function ee(e) {
		let t = /* @__PURE__ */ new Set([e.imageUrl, ...(e.postures || []).map((e) => e.imageUrl)]);
		for (let e of w.keys()) t.has(e) || w.delete(e);
		let n = new Set([...t].map((e) => new URL(e, location.href).href));
		for (let e of T.keys()) n.has(e) || T.delete(e);
	}
	function te(e) {
		let t = e.size;
		return {
			sel: In(t),
			w: t?.widthDp || y?.w || 411,
			h: t?.heightDp || y?.h || 891
		};
	}
	function re(a, c) {
		if (!a?.interactive) return P(), !1;
		let l = p !== a.previewId;
		if (l && P(), f = !0, r.parentElement !== t && t.append(r), document.body.classList.add("resizing-ui"), i.classList.add("resize-wrap"), l || !p) {
			p = a.previewId, O(!0), n.removeAttribute("src"), n.dataset.url = "";
			let t = s(), r = o(), i = a.pxPerDp || 2.625, c = !!(t?.w && t?.h || r.w && r.h);
			y = {
				w: t?.w || r.w / i || 411,
				h: t?.h || r.h / i || 891,
				img: null
			}, e.classList.toggle("measuring", !a.size && !c), D.setOriginal(y.w, y.h, null), D.enable(!0);
		}
		let d = In(a.size), w = !!m && d !== h;
		w && (j(), x = !0, b = !1, r.classList.add("resize-hidden"));
		let T = m;
		m = a, h = d, T && !w && a.imageUrl !== T.imageUrl && D.clearImages();
		for (let e of a.postures || []) {
			let t = v;
			M(e.imageUrl).then((n) => {
				f && t === v && m?.postures?.some((t) => t.imageUrl === e.imageUrl) && D.image(In(e.size), A(n, e.size));
			}).catch(() => {});
		}
		if (y && D.update(te(a), !T), S && O(!0, !!c), !c && !document.hidden && a.streamUrl && (!x || a.streamUrl !== g || a.imageUrl !== T?.imageUrl) && (a.streamUrl !== g || !b || w)) {
			let t = `${v}:${d}:${a.streamUrl}:${a.imageUrl}`;
			if (_ !== t) {
				_ = t;
				let i = v;
				M(a.imageUrl).then((s) => {
					if (!f || document.hidden || i !== v || _ !== t || h !== d) return;
					let c = a.size;
					if (!c) {
						let e = a.pxPerDp || 2.625;
						y = {
							w: s.naturalWidth / e,
							h: s.naturalHeight / e,
							img: A(s, c)
						}, D.setOriginal(y.w, y.h, y.img), S && D.update(te(a), !0);
					}
					D.image(d, A(s, c)), g = a.streamUrl, x = !1, o(s.naturalWidth, s.naturalHeight), n.onload = () => {
						if (n.onload = null, !f || document.hidden || i !== v || h !== d || g !== a.streamUrl) return;
						b = !0;
						let t = S;
						O(!1), e.classList.remove("await-live", "measuring"), r.classList.toggle("resize-hidden", D.moving()), n.dataset.still = a.imageUrl, n.src = n.dataset.url = ne(a.streamUrl), t && !u() && !ge.matches && (C = n.animate([{ opacity: 0 }, { opacity: 1 }], {
							duration: me("--duration-short3"),
							easing: he("--easing-decelerate")
						}));
					}, n.src = a.imageUrl, n.dataset.url = a.imageUrl;
				}).catch((e) => {
					i === v && (_ = null, S && O(!0, !0), F(k("resize.image.failed", { why: e.message })));
				});
			}
		}
		return ee(a), !0;
	}
	function P() {
		if (f || p) {
			v++, f = !1, p = h = g = _ = null, m = null, y = null, b = x = !1, C?.cancel(), C = null, O(!1), i.append(r), D.enable(!1), w.clear(), T.clear(), e.classList.remove("measuring"), t.style.transform = "", document.body.classList.remove("resizing-ui"), i.classList.remove("resize-wrap"), r.classList.remove("resize-hidden"), n.onload = null;
			for (let e of [
				"left",
				"top",
				"width",
				"height",
				"border-radius"
			]) r.style.removeProperty(e);
		}
	}
	function ie() {
		if (!d) return;
		let e = c(), n = d.cx - d.w / 2, r = d.y;
		t.style.transform = `translate(${e.x + (1 - e.z) * n}px, ${e.y + (1 - e.z) * r}px) scale(${e.z})`;
	}
	return {
		update: re,
		disable: P,
		preparing: () => S,
		suspend() {
			v++, g = _ = null, n.onload = null;
		},
		zoom(e) {
			return f ? (t.classList.toggle("zoom-anim", !!e), ie(), !0) : !1;
		},
		relayout: () => {
			f && D.relayout();
		},
		pxPerDp: () => f && d ? d.s : null,
		moving: () => f && (!b || D.moving())
	};
}
// src/workspace/focus.ts
function zn() {
	let e = (e) => document.getElementById(e), t = e("stage");
	return {
		focusView: e("focusView"),
		wrap: t.parentElement,
		stage: t,
		shot: e("shot"),
		box: e("box"),
		pickBox: e("pickBox"),
		scene: e("resizeScene"),
		geometry: e("resizeGeometry"),
		panel: e("panel"),
		header: [
			e("back"),
			e("wsTitle"),
			e("seg")
		]
	};
}
function Bn({ focusView: e, wrap: t, stage: n, shot: r, box: i, pickBox: a, scene: o, geometry: s, panel: c, header: l }) {
	let u = [], d = [], f = !1;
	function p() {
		f && (d = dn(u));
	}
	function m() {
		if (e.hidden) return;
		let n = getComputedStyle(document.documentElement), r = parseInt(n.getPropertyValue("--cap-room")) || 76, i = document.body.classList.contains("resizing-ui"), a = window.innerHeight - t.getBoundingClientRect().top - (i ? 0 : r + 16), o = parseInt(n.getPropertyValue("--stage-min-h")) || 260, s = Math.max(o, Math.round(a));
		document.documentElement.style.setProperty("--view-h", s + "px");
		let c = getComputedStyle(t), l = s - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
		document.documentElement.style.setProperty("--stage-max-h", l + "px"), H.relayout(), t.classList.contains("resize-wrap") || y(l - 2), Ae(), S();
	}
	let h = 0, g = 0, _ = () => (r.getAttribute("src") || "").startsWith("/stream");
	function v() {
		(r.getAttribute("src") || "").startsWith("data:") || !r.naturalWidth || _() && h || (h = r.naturalWidth, g = r.naturalHeight, r.dataset.fullW = String(h));
	}
	function y(e) {
		r.style.width = h ? Math.min(h, e * h / g) + "px" : "";
	}
	let b = 0, x = 0;
	function S() {
		!document.hidden && _() && !e.hidden && h && (clearTimeout(x), x = window.setTimeout(() => {
			if (H.moving()) {
				S();
				return;
			}
			let e = Math.round(r.offsetWidth * devicePixelRatio * z.z);
			e && e !== b && (b = e, te(e).catch(() => {}));
		}, 120));
	}
	let C = null, T = Promise.resolve();
	function E(e) {
		return e === C ? T : (C = e, T = D(e));
	}
	async function D(e) {
		try {
			let t = await ee(e).then((e) => {
				if (!e.ok) throw Error(k("focus.tree.http", { status: e.status }));
				return e.json();
			});
			if (e !== C) return;
			if (t.failure) {
				f = !1;
				return;
			}
			u = ln(t.composeViewInfo || [], [], []).sort(un), d = dn(u), se(I.projectFiles.size ? "" : k("focus.noIndex", { n: u.length })), f = !0, i.hidden = !0, a.hidden = !0;
		} catch (e) {
			oe(k("focus.tree.failed", { why: e.message }), "error");
		}
	}
	function O(e) {
		let t = !!(e && e.interactive);
		if (c.hidden = !e, e || Re(), n.classList.toggle("live", t), B = e && e.pxPerDp || null, e && e.previewId === Se || (H.disable(), Se = e ? e.previewId : null, h = g = 0, delete r.dataset.fullW, r.style.width = "", V(1, 0, 0, !1)), !e) {
			A?.entering && re(), H.disable(), r.hasAttribute("src") && (r.removeAttribute("src"), r.dataset.url = "");
			for (let e of n.querySelectorAll("img.ghost")) e.remove();
			return;
		}
		let i = I.st;
		if (n.style.cursor = t ? "pointer" : "crosshair", e.treeUrl !== C && E(e.treeUrl), H.update(e, i.error)) return;
		V(z.z, z.x, z.y, !1);
		let a = t ? e.streamUrl ? ne(e.streamUrl) : i.board && be(i.board.focus)?.imageUrl || "" : e.imageUrl;
		r.dataset.url !== a && (a.startsWith("/stream") && (b = 0), _e(r, a));
	}
	let A = null, j = (e, t) => e > 0 && t > 0 && Math.abs(e / t - 1) < .01, M = (e, t) => {
		for (let n of [
			o,
			c,
			...l
		]) n.style.setProperty("--deco-dur", t + "ms"), n.classList.toggle("deco-off", !e);
	};
	function re() {
		if (!A) return;
		let t = A;
		A = null, clearTimeout(t.lead), clearTimeout(t.giveUp), t.m.cancel();
		for (let e of t.hidden) e.classList.remove("morph-target");
		e.classList.remove("morph-hold"), M(!0, 0);
	}
	function P(t) {
		A === t && (A = null, clearTimeout(t.lead), clearTimeout(t.giveUp), e.classList.remove("morph-hold"), M(!0, me("--duration-short4")), t.m.finish(t.same ? 150 : 0));
	}
	function ie(r) {
		if (re(), !r || ge.matches || document.hidden || e.hidden || !t.classList.contains("resize-wrap")) return;
		let i = n.getBoundingClientRect();
		if (!i.width || !i.height) return;
		let a = j(r.ratio, i.width / i.height), o = getComputedStyle(n);
		e.classList.add("morph-hold"), M(!1, 0);
		let s = de({
			from: r.rect,
			to: () => n.getBoundingClientRect(),
			radius: [r.radius, parseFloat(o.borderTopLeftRadius) || 0],
			shadow: [r.shadow, o.boxShadow],
			a: r.url,
			b: a ? null : "",
			swapAt: 0,
			swapMs: 250
		}), c = A = {
			m: s,
			same: a,
			hidden: [],
			entering: !0,
			ready: !H.preparing(),
			landed: !1
		};
		c.lead = window.setTimeout(() => {
			A === c && M(!0, me("--duration-short4"));
		}, ue), s.landed.then(() => requestAnimationFrame(() => {
			A === c && (c.landed = !0, !c.same || c.ready ? P(c) : c.giveUp = window.setTimeout(() => P(c), 5e3));
		}));
	}
	function ae() {
		A?.entering && P(A);
	}
	function ce() {
		let e = A;
		return !e || !e.entering || !e.same ? !1 : (e.ready = !0, e.landed && P(e), !0);
	}
	function le(t, i, a, o = () => {}, s = () => !0) {
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
		let l = pe();
		H.suspend(), M(!1, me("--duration-short2"));
		let u = _() && r.naturalWidth ? fe(r) : null;
		Promise.all([u, new Promise((e) => setTimeout(e, me("--duration-short2")))]).then(() => {
			let e = Wn(n);
			l(), s() ? ve(() => {
				t(), M(!0, 0);
				let n = a(), r = n && Wn(n);
				if (!n || !r || !r.rect.width || !e.url) {
					o();
					return;
				}
				let i = j(e.ratio, r.ratio);
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
				}), l = A = {
					m: c,
					same: i,
					hidden: [n]
				};
				c.landed.then(() => requestAnimationFrame(() => {
					if (A === l) {
						A = null;
						for (let e of l.hidden) e.classList.remove("morph-target");
						c.finish(0);
					}
				}));
			}, i, { workspace: !0 }) : (M(!0, 0), t(), i());
		});
	}
	let he = !1, ye = () => !!(history.state && history.state.prevueWs);
	function xe(e) {
		let t = !!(e && e.screen === "focus" && e.focus && e.focus.fromBoard);
		t && !ye() ? (history.scrollRestoration = "manual", history.pushState({ prevueWs: !0 }, "")) : !t && ye() && !he && (he = !0, history.back());
	}
	addEventListener("popstate", () => {
		if (he) {
			he = !1;
			return;
		}
		let e = I.st && I.st.screen === "focus" && I.st.focus;
		e && e.fromBoard && N("/viewer/exit");
	});
	let L = (e) => hn(e, r), R = () => !!(I.st && I.st.focus && I.st.focus.interactive);
	n.addEventListener("mousemove", (e) => {
		if (R() || !f) return;
		let t = fn(d, ...L(e));
		t ? gn(i, t, Te()) : i.hidden = !0;
	}), n.addEventListener("mouseleave", () => {
		i.hidden = !0;
	}), n.addEventListener("mousedown", (e) => {
		e.button !== 0 || H.moving() || (Ce || !R() && z.z > 1 && !e.altKey ? He(e) : R() && !e.altKey && (e.preventDefault(), Qt(...L(e))));
	}), window.addEventListener("mousemove", (e) => {
		Zt() && $t(...L(e));
	}), window.addEventListener("mouseup", (e) => {
		Zt() && en(...L(e));
	}), n.addEventListener("click", async (e) => {
		if (H.moving()) return;
		if (we) {
			we = !1;
			return;
		}
		if (R() && !e.altKey || !f || !I.st || !I.st.focus) return;
		if (R()) try {
			await E((await N("/viewer/catchup").then((e) => e.json())).treeUrl || C);
		} catch (e) {
			F(k("point.sync.failed", { why: e.message }));
			return;
		}
		await T;
		let t = fn(d, ...L(e));
		if (!t) return;
		gn(a, t, Te());
		let n = En(a, t);
		Sn(n), _n(t, I.st.focus.previewId, n);
	});
	let z = {
		z: 1,
		x: 0,
		y: 0
	}, Se = null, Ce = !1, we = !1, B = null;
	function Te() {
		let e = h || r.naturalWidth;
		return e ? r.offsetWidth / e : 1;
	}
	function Ee() {
		let e = H.pxPerDp();
		return e ? 1 / e : B && (h || r.naturalWidth) ? 1 / (Te() * B) : null;
	}
	let De = () => Math.min(1, Ee() || 1), Oe = () => Math.max(8, (Ee() || 1) * 4);
	function ke(e, r, i) {
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
	function V(e, t, r, i) {
		H.preparing() || ([z.z, z.x, z.y] = ke(Math.min(Oe(), Math.max(De(), e)), t, r), n.classList.toggle("zoom-anim", !!i), n.style.transform = H.zoom(i) || z.z === 1 ? "" : `translate(${z.x}px, ${z.y}px) scale(${z.z})`, n.style.setProperty("--z", String(z.z)), n.classList.toggle("zoomed", z.z > 1), Ae(), S());
	}
	function Ae() {
		let e = Ee();
		X.set({
			pct: Math.round((e ? z.z / e : z.z) * 100),
			real: !!e,
			atFit: z.z === 1
		});
	}
	function je(e, t, r, i) {
		let a = n.getBoundingClientRect(), o = a.left - z.x, s = a.top - z.y, c = (t - a.left) / z.z, l = (r - a.top) / z.z, u = Math.min(Oe(), Math.max(De(), e));
		V(u, t - o - c * u, r - s - l * u, i);
	}
	function Me(e) {
		let n = t.getBoundingClientRect();
		je(e, n.left + n.width / 2, n.top + n.height / 2, !0);
	}
	let Ne = (e) => Me(z.z * e), Pe = () => Ne(1.25), Fe = () => Ne(1 / 1.25), Ie = () => V(1, 0, 0, !0), Le = !1;
	function Re() {
		if (!X.get().menu) return !1;
		X.set({ menu: !1 });
		let e = document.getElementById("zoomMenu"), t = document.activeElement;
		return e && t && e.contains(t) && (Le ? document.getElementById("zoomPct")?.focus({ preventScroll: !0 }) : t.blur()), !0;
	}
	function ze(e) {
		let t = !X.get().menu;
		t && (Le = e), X.set({ menu: t });
	}
	function Be(e) {
		Re(), e === "fit" ? Ie() : Me((Ee() || 1) * Number(e));
	}
	addEventListener("pointerdown", (e) => {
		let t = document.getElementById("zoomCtl");
		t && t.contains(e.target) || Re();
	}), addEventListener("resize", () => {
		m(), V(z.z, z.x, z.y, !1);
	}), r.addEventListener("load", () => {
		v(), m();
	}), t.addEventListener("wheel", (t) => {
		e.hidden || (t.ctrlKey || t.metaKey ? (t.preventDefault(), je(z.z * Math.exp(-t.deltaY * .01), t.clientX, t.clientY, !1)) : R() ? (t.preventDefault(), H.moving() || Ve(t)) : z.z > 1 && (t.preventDefault(), V(z.z, z.x - t.deltaX, z.y - t.deltaY, !1)));
	}, { passive: !1 });
	function Ve(e) {
		let n = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? t.clientHeight : 1, i = Te() * z.z || 1, [a, o] = L(e);
		an(Math.max(0, Math.min(h || r.naturalWidth, a)), Math.max(0, Math.min(g || r.naturalHeight, o)), e.deltaX * n / i, e.deltaY * n / i);
	}
	function He(e) {
		e.preventDefault();
		let t = e.clientX, r = e.clientY, i = z.x, a = z.y;
		n.classList.add("panning");
		let o = (e) => {
			Math.abs(e.clientX - t) + Math.abs(e.clientY - r) > 3 && (we = !0), V(z.z, i + e.clientX - t, a + e.clientY - r, !1);
		}, s = () => {
			n.classList.remove("panning"), removeEventListener("mousemove", o), removeEventListener("mouseup", s);
		};
		addEventListener("mousemove", o), addEventListener("mouseup", s);
	}
	let Ue = (e) => !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
	addEventListener("keydown", (t) => {
		let r = t.target;
		t.code !== "Space" || e.hidden || Ue(r) || r?.closest && r.closest("button, [role=button]") || (t.preventDefault(), Ce || (Ce = !0, n.classList.add("grab")));
	}), addEventListener("keyup", (e) => {
		e.code === "Space" && (Ce = !1, n.classList.remove("grab"));
	}), addEventListener("blur", () => {
		Ce = !1, n.classList.remove("grab");
	});
	let H = Rn({
		root: o,
		geometry: s,
		shot: r,
		stage: n,
		wrap: t,
		zoomState: () => z,
		preparation(e, t) {
			t && ae(), X.set({ disabled: e }), e && Re();
		},
		firstFrame: ce,
		originalSize() {
			let e = I.st?.board && be(I.st.board.focus);
			return e ? {
				w: e.widthDp,
				h: e.heightDp
			} : null;
		},
		dimensions(e, t) {
			return e && t && (h = e, g = t, r.dataset.fullW = String(e), b = 0, S()), {
				w: h,
				h: g
			};
		},
		layout(e) {
			n.style.left = e.cx - e.w / 2 + "px", n.style.top = e.y + "px", n.style.width = e.w + "px", n.style.height = e.h + "px", n.style.borderRadius = e.radius + "px", Ae(), S();
		}
	});
	return document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			if (clearTimeout(x), H.suspend(), !_()) return;
			let e = r.getAttribute("src");
			fe(r), r.getAttribute("src") === e && r.removeAttribute("src"), r.dataset.url = "";
		} else I.st?.screen === "focus" && O(I.st.focus);
	}), {
		render: O,
		fitStage: m,
		renarrow: p,
		syncHistory: xe,
		morphIn: ie,
		morphOut: le,
		image: () => r,
		zoomIn: Pe,
		zoomOut: Fe,
		zoomFit: Ie,
		zoomMenuPick: Be,
		toggleZoomMenu: ze,
		closeZoomMenu: Re
	};
}
var Vn = (e) => e && e.naturalWidth ? e.naturalWidth / e.naturalHeight : 0, Hn = /* @__PURE__ */ new Map();
function Un(e) {
	let t = e?.dataset.still;
	if (!t) return null;
	if (!Hn.has(t)) {
		let e = new Image();
		e.src = t, Hn.set(t, e), Hn.size > 8 && Hn.delete(Hn.keys().next().value);
	}
	return Hn.get(t);
}
function Wn(e) {
	if (!e) return null;
	let t = e.querySelector("img"), n = getComputedStyle(e), r = t && t.getAttribute("src") || "";
	return {
		el: e,
		rect: e.getBoundingClientRect(),
		radius: parseFloat(n.borderTopLeftRadius) || 0,
		shadow: n.boxShadow,
		url: t ? r.startsWith("/stream") ? t.dataset.still || "" : t.currentSrc || r : "",
		ratio: Vn(t) || Vn(Un(t))
	};
}
function Gn(e) {
	N("/viewer/focus", { index: e }).catch((e) => oe(k("focus.enter.failed", { why: e.message }), "error"));
}
function Kn() {
	let e = I.st && I.st.focus;
	e && e.fromBoard && N("/viewer/exit");
}
function qn() {
	let e = I.st && I.st.focus;
	e && (e.fromBoard ? N("/viewer/exit") : N("/viewer/interactive", { on: !e.interactive }));
}
function Jn(e) {
	let t = I.st && I.st.focus;
	t && e !== !!t.interactive && N("/viewer/interactive", { on: e });
}
// src/session.ts
var Yn = () => document.getElementById("boardView"), Q, Xn = null;
function Zn(e) {
	return Xn && !e.error && e.screen === "focus" && e.focus?.previewId === Xn.id && (e.busy || !e.focus.streamUrl || e.focus.streamUrl === Xn.stream && e.focus.imageUrl === Xn.image) ? !0 : (Xn = null, !1);
}
var Qn = /* @__PURE__ */ new Map(), $n = null, er = {
	wasBoard: !1,
	arrive: !1,
	file: null
};
function tr(e) {
	let t = !Yn().hidden, n = e.board ? e.board.file : null;
	t && $n && (e.screen !== "board" || n !== $n) && Qn.set($n, scrollY), er = {
		wasBoard: t,
		arrive: e.screen === "board" && (!t || n !== $n),
		file: n
	}, $n = n;
}
function nr(e) {
	let { wasBoard: t, arrive: n, file: r } = er;
	Q.render(e.screen === "focus" ? e.focus : null), Q.syncHistory(e), ae(O(e.error)), Q.fitStage(), n ? scrollTo(0, Qn.get(r) || 0) : t && e.screen !== "board" && scrollTo(0, 0), f();
}
var $ = (e) => {}, rr = (e) => {
	let t = (e.tabs || []).find((e) => e.active);
	return t ? t.key : null;
};
function ir(e, t, n) {
	let r = (t) => {
		let n = e.tabs.findIndex((e) => e.key === t);
		return n < 0 ? e.tabs.length : n;
	};
	return Math.sign(r(n) - r(t));
}
var ar = !1;
function or(e) {
	if (I.st && e.version <= I.st.version) return;
	let t = I.st;
	if (t?.focus?.interactive && e.focus?.interactive && t.focus.previewId === e.focus.previewId && JSON.stringify(t.focus.size) !== JSON.stringify(e.focus.size) && (Xn = {
		id: e.focus.previewId,
		stream: t.focus.streamUrl,
		image: t.focus.imageUrl
	}), I.st = e, ye()) {
		ar = !0;
		return;
	}
	let n = t && t.screen, r = e.screen, i = t && rr(t) && rr(e) && rr(t) !== rr(e);
	t && (i || n !== r || t.board && e.board && t.board.focus !== e.board.focus && r === "focus") && Dn();
	let a = () => {
		ar && (ar = !1, $(I.st));
	}, o = () => I.st;
	if (i) {
		let n = document.documentElement;
		n.style.setProperty("--tab-dir", String(ir(t, rr(t), rr(e)))), n.classList.add("vt-tab"), ve(() => $(o()), a), setTimeout(() => n.classList.remove("vt-tab"), 500);
	} else if (n === "board" && r === "focus") {
		let t = e.board ? Wn(g(h(e.board.focus))) : null;
		ve(() => {
			$(o()), Q.morphIn(t);
		}, a, { workspace: !0 });
	} else if (n === "focus" && r === "board") {
		let e = null;
		Q.morphOut(() => $(o()), a, () => g(e = o().screen === "board" ? b(o().board.focus) : null), () => S(e), () => o().screen === "board");
	} else if (n === "focus" && r === "focus" && t.focus?.interactive !== e.focus?.interactive) {
		if (t.focus?.interactive) Q.morphOut(() => $(o()), a, () => Q.image().parentElement, void 0, () => o().screen === "focus" && !o().focus?.interactive);
		else {
			let e = Wn(Q.image().parentElement);
			ve(() => {
				$(o()), Q.morphIn(e);
			}, a, { workspace: !0 });
		}
	} else n === "focus" && r === "focus" && t.board && e.board && t.board.focus !== e.board.focus ? ve(() => $(o()), a, { workspace: !0 }) : $(e);
}
var sr = 0, cr = () => {
	let e = ++sr;
	M().then((t) => {
		e === sr && (I.projectFiles = new Map(Object.entries(t.files || {})), _(), Q.renarrow());
	}).catch(() => {});
}, lr = !1, ur = () => {}, dr = null, fr = () => {
	dr?.fail(k("prep.lost")), oe(k("status.lost"), "error"), ur("lost"), I.st = null;
}, pr = 6e4, mr = !1, hr = 0, gr = 0, _r = null, vr = (e) => !e.busy && !(e.board?.groups || []).some((e) => e.cards.some((e) => !e.rendered));
function yr() {
	mr = !0, ur("restarting"), clearTimeout(hr), hr = window.setTimeout(fr, pr);
}
function br(e) {
	if (mr) {
		if (e.boot === _r) return;
		gr ||= (clearTimeout(hr), window.setTimeout(() => location.reload(), pr)), vr(e) && location.reload();
	} else _r && e.boot !== _r ? location.reload() : (_r = e.boot, or(e));
}
function xr({ workspace: e, render: t, onConnection: n, onPreviewFiles: r, prepared: i = null }) {
	Q = e, $ = (e) => {
		tr(e), t(e, Zn(e));
	}, ur = n, dr = i, A({
		open: () => {
			lr && !mr ? location.reload() : lr || cr();
		},
		state: br,
		ui: (e) => {
			e.kind === "flash" ? F(O(e.text ?? null)) : e.kind === "previewFiles" ? r() : e.kind === "projectFiles" ? cr() : e.kind === "restart" && !dr && yr();
		},
		error: () => {
			lr = !0, mr || fr();
		}
	});
}
// src/shortcuts.ts
function Sr(e, t) {
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
					keys: ["Escape"],
					cap: ["esc"],
					label: e("keys.single.back"),
					when: () => t.screen() === "focus" && t.fromBoard(),
					run: () => t.exitFocus()
				},
				{
					keys: ["i"],
					cap: ["I"],
					label: e("keys.single.mode"),
					when: () => t.screen() === "focus",
					run: () => t.toggleInteractive()
				},
				{
					keys: ["+", "-"],
					cap: ["+", "−"],
					label: e("keys.single.zoom"),
					when: () => t.screen() === "focus",
					run: (e) => (wr(e) === "+" ? t.zoomIn : t.zoomOut)()
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
					run: (e) => t.jumpTab(Number(wr(e)))
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
function Cr(e) {
	return e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
}
function wr(e) {
	return e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") ? "⇧" + e.key : /^Digit[1-9]$/.test(e.code) && !e.shiftKey ? e.code.slice(5) : e.code === "KeyI" ? "i" : e.code === "Slash" && e.shiftKey ? "?" : e.code === "Equal" ? "+" : e.code === "Minus" ? "-" : e.code === "Digit0" ? "0" : e.key;
}
function Tr(e, t, n) {
	let r = (r) => {
		if ((r.metaKey || r.ctrlKey) && !r.altKey && !r.shiftKey && r.code === "KeyK" && t.screen() !== "offline") {
			r.preventDefault(), t.openQuickOpen(document.activeElement);
			return;
		}
		if (r.metaKey || r.ctrlKey || r.altKey || Cr(r.target)) return;
		let i = wr(r), a = i === "Enter" && r.target instanceof Element && r.target.closest("button, [role=button]");
		if (!(a && a.matches(":focus-visible"))) {
			if (i === "Escape" && t.helpOpen()) r.preventDefault(), t.toggleHelp(!1);
			else if (i === "Escape" && n.chooserOpen()) r.preventDefault(), n.cancelChoice();
			else if (i === "Escape" && n.closeZoomMenu()) r.preventDefault();
			else if (i === "Escape" && n.closeDirPop()) r.preventDefault();
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
var Er = n(), Dr = r();
function Or({ pending: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t);
	return (0, L.useLayoutEffect)(() => {
		r && (r.hidden = !e);
	}, [r, e]), i(n("build.notice"), (e, t) => /* @__PURE__ */ (0, R.jsx)("aside", {
		className: "build-notice",
		id: "buildNotice",
		role: "status",
		ref: e,
		hidden: !0,
		children: t
	}));
}
// src/components/NotificationCapsule.tsx
var kr = (0, L.memo)(function({ content: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = (0, L.useSyncExternalStore)(le, re), { error: c, log: l, once: u } = e ?? a, d = !!(c.trim() || l.trim()) || !!u;
	(0, L.useLayoutEffect)(() => {
		r?.classList.toggle("on", d);
	}, [r, d]);
	let [f, ...p] = u ? u.text.split(/(?<=[.。])\s+/) : [];
	return i(/* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsxs)("div", {
		className: "cap-once",
		id: "capOnce",
		hidden: !u,
		children: [/* @__PURE__ */ (0, R.jsx)("span", {
			id: "capOnceText",
			children: u && /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("b", { children: f }), p.length ? " " + p.join(" ") : null] })
		}), /* @__PURE__ */ (0, R.jsx)("button", {
			className: "cap-x",
			id: "capOnceX",
			type: "button",
			title: n("capsule.dismiss"),
			"aria-label": n("capsule.dismiss"),
			onClick: P,
			children: /* @__PURE__ */ (0, R.jsx)("svg", {
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, R.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
			})
		})]
	}), /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "cap-main",
		children: [/* @__PURE__ */ (0, R.jsx)("div", {
			id: "sel",
			className: c ? "error" : "",
			children: c
		}), /* @__PURE__ */ (0, R.jsx)("div", {
			className: "log",
			id: "log",
			children: l
		})]
	})] }), (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
		className: "capsule",
		id: "strip",
		ref: e,
		role: "status",
		children: t
	}));
}), Ar = {
	cursor: null,
	returned: null
}, jr = (e, t) => e.groups.flatMap((e) => e.cards).find((e) => e.index === t), Mr = 300 / 360, Nr = .25, Pr = 100, Fr = 160, Ir = 360, Lr = 640, Rr = 120;
function zr(e, t, n) {
	let r = (t) => e.reduce((e, n) => e + Math.max(n * t, Pr), 0) + n * (e.length - 1);
	if (r(Mr) <= t) return {
		s: Mr,
		w: r(Mr),
		wrap: !1
	};
	if (r(Nr) > t) return {
		s: Math.min(Mr, ...e.map((e) => e * Nr >= Pr ? Nr : Pr / e)),
		w: t,
		wrap: !0
	};
	let i = Nr, a = Mr;
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
var Br = /* @__PURE__ */ new Map();
function Vr(e, t) {
	let n = t.cards.map((t) => {
		let n = e + "|" + t.previewId, r = Br.get(n);
		return t.widthDp && t.heightDp && Br.set(n, [t.widthDp, t.heightDp]), [t.widthDp || r?.[0], t.heightDp || r?.[1]];
	}), r = n.filter(([e, t]) => e && t).sort((e, t) => t[0] - e[0])[0];
	return n.map(([e, n], i) => {
		let a = t.cards[i].failure && r;
		return [e || (a ? r[0] : Ir), n || (a ? r[1] : Lr)];
	});
}
function Hr(e, t, n) {
	let r = e.clientWidth;
	if (!r) return 0;
	let i = e.querySelectorAll(":scope > .group"), a = i[0]?.querySelector(".board"), o = a && parseFloat(getComputedStyle(a).columnGap) || 24;
	return t.groups.forEach((a, s) => {
		let c = i[s];
		if (!c) return;
		let l = Vr(t.file, a), { s: u, w: d, wrap: f } = zr(l.map((e) => e[0]), r, o);
		c.style.width = f ? "100%" : Math.max(Fr, d) + "px", c.querySelector(".board").classList.toggle("spill", f);
		let p = c.querySelector(".sc"), m = u < .8333323333333333, h = a.cards.some((e) => e.dpGuess);
		p.hidden = !m, p.textContent = m ? (h ? "≈" : "") + Math.round(u * 100) + "%" : "", p.title = n("zoom.tip.real") + (h ? " · " + n("board.scale.guess") : ""), a.cards.forEach((t, n) => {
			let r = e.querySelector(`.card[data-i="${t.index}"]`);
			if (!r) return;
			let [i, a] = l[n], o = Math.max(i * u, Pr);
			r.style.width = o + "px";
			let s = r.querySelector(".cstage img");
			s.style.width = i * u + "px", s.style.aspectRatio = `auto ${i} / ${a}`;
			let c = r.querySelector(".ph"), d = Math.max(Rr, a * u);
			c.style.width = o + "px", c.style.height = d + "px", c.style.setProperty("--lines", String(Math.max(1, Math.floor((d - 55) / 16.7))));
		});
	}), r;
}
var Ur = (e) => /* @__PURE__ */ (0, R.jsx)("svg", {
	viewBox: "0 0 12 12",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.1",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: e
}), Wr = /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("rect", {
	x: "3.25",
	y: "1.25",
	width: "5.5",
	height: "9.5",
	rx: "1.2"
}), /* @__PURE__ */ (0, R.jsx)("path", { d: "M5.25 9h1.5" })] }), Gr = {
	portrait: Ur(Wr),
	landscape: Ur(/* @__PURE__ */ (0, R.jsx)("rect", {
		x: "1.25",
		y: "3",
		width: "9.5",
		height: "6",
		rx: "1.2"
	})),
	device: Ur(Wr),
	dark: Ur(/* @__PURE__ */ (0, R.jsx)("path", { d: "M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z" })),
	font: /* @__PURE__ */ (0, R.jsx)("span", {
		className: "aa",
		children: "Aa"
	}),
	locale: Ur(/* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("circle", {
		cx: "6",
		cy: "6",
		r: "4.75"
	}), /* @__PURE__ */ (0, R.jsx)("path", { d: "M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75" })] })),
	api: Ur(/* @__PURE__ */ (0, R.jsx)("path", { d: "M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5" })),
	systemUi: Ur(/* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("rect", {
		x: "3.25",
		y: "1.25",
		width: "5.5",
		height: "9.5",
		rx: "1.2"
	}), /* @__PURE__ */ (0, R.jsx)("path", { d: "M3.5 3.25h5" })] }))
}, Kr = /* @__PURE__ */ (0, R.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "currentColor",
	children: /* @__PURE__ */ (0, R.jsx)("path", { d: "M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z" })
});
function qr({ card: e }) {
	let { daemonText: t } = s();
	return /* @__PURE__ */ (0, R.jsx)("span", {
		className: "specs",
		title: e.args,
		children: e.specs.map((e, n) => {
			let r = t(e.text), [i, a] = e.kind === "size" ? r.split("×").map(Number) : [], o = e.kind === "size" ? i > a ? "landscape" : "portrait" : e.kind;
			return /* @__PURE__ */ (0, R.jsxs)("span", {
				className: "spec",
				children: [Gr[o] ?? null, /* @__PURE__ */ (0, R.jsxs)("span", { children: [r, e.kind === "size" && /* @__PURE__ */ (0, R.jsx)("span", {
					className: "unit",
					children: "dp"
				})] })]
			}, n);
		})
	});
}
var Jr = (0, L.memo)(function({ card: e, fn: t, cursor: n = !1, returned: r = !1, actions: i }) {
	let { phrase: a, daemonText: o } = s(), c = (0, L.useRef)(null), l = (0, L.useRef)(null), u = (0, L.useRef)(null), d = (0, L.useRef)(null), f = !!(e.ok && e.imageUrl);
	(0, L.useLayoutEffect)(() => {
		if (!i) return;
		let t = new AbortController();
		return i.point(e.index, {
			stage: c.current,
			img: l.current,
			box: u.current,
			pick: d.current
		}, t.signal), () => t.abort();
	}, [i, e.index]), (0, L.useLayoutEffect)(() => {
		let t = l.current;
		f ? (t.dataset.url !== e.imageUrl && (_e(t, e.imageUrl), u.current.hidden = !0, d.current.hidden = !0), t.hidden = !1) : t.hidden = !0;
	}, [f, e.imageUrl]);
	let p = !f && e.failure ? o(e.failure) : null;
	return /* @__PURE__ */ (0, R.jsxs)("article", {
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
		children: [/* @__PURE__ */ (0, R.jsxs)("div", {
			className: "label",
			children: [
				/* @__PURE__ */ (0, R.jsx)("span", {
					className: "fn",
					title: e.label ? e.label + "\n" + e.title : e.title,
					children: e.label
				}),
				/* @__PURE__ */ (0, R.jsxs)("button", {
					className: "go",
					type: "button",
					title: a("card.go.tip"),
					onClick: () => {
						C(e.index), i?.open(e.index);
					},
					children: [Kr, /* @__PURE__ */ (0, R.jsx)("span", {
						className: "go-t",
						children: a("card.go")
					})]
				}),
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "sub",
					children: /* @__PURE__ */ (0, R.jsx)(qr, { card: e })
				})
			]
		}), /* @__PURE__ */ (0, R.jsxs)("div", {
			className: "cstage",
			ref: c,
			children: [
				/* @__PURE__ */ (0, R.jsx)("img", {
					alt: "",
					hidden: !0,
					ref: l
				}),
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "box",
					hidden: !0,
					ref: u
				}),
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "box pick",
					hidden: !0,
					ref: d,
					children: /* @__PURE__ */ (0, R.jsx)("span", { className: "tag" })
				}),
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: p ? "ph bad" : "ph",
					hidden: f,
					title: p ?? "",
					children: p ? /* @__PURE__ */ (0, R.jsx)("span", {
						className: "why",
						children: p
					}) : a("card.waiting")
				})
			]
		})]
	});
});
function Yr({ group: e, marks: t = Ar, actions: n }) {
	let { phrase: r } = s();
	return /* @__PURE__ */ (0, R.jsxs)("section", {
		className: "group",
		"data-fn": e.name,
		children: [/* @__PURE__ */ (0, R.jsxs)("div", {
			className: "ghead",
			children: [/* @__PURE__ */ (0, R.jsx)("span", {
				className: "gn",
				title: e.name,
				children: e.name
			}), /* @__PURE__ */ (0, R.jsxs)("span", {
				className: "m",
				children: [
					/* @__PURE__ */ (0, R.jsx)("span", {
						className: "n",
						children: r("board.count", { n: e.cards.length })
					}),
					/* @__PURE__ */ (0, R.jsx)("span", {
						className: "sc",
						hidden: !0
					}),
					/* @__PURE__ */ (0, R.jsx)("span", {
						className: "bad",
						children: e.failed ? `· ${r("board.failed", { n: e.failed })}` : ""
					})
				]
			})]
		}), /* @__PURE__ */ (0, R.jsx)("div", {
			className: "gbody",
			children: /* @__PURE__ */ (0, R.jsx)("div", {
				className: "board",
				children: e.cards.map((r) => /* @__PURE__ */ (0, R.jsx)(Jr, {
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
function Xr({ board: e, screen: t, hosts: n, actions: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n?.cards), [l, u] = (0, L.useState)(null), d = n?.view ?? l, f = (0, L.useSyncExternalStore)(T, p), m = (0, L.useRef)({
		board: null,
		live: null
	}), h = (0, L.useMemo)(() => {
		let n = m.current;
		if (t === "focus" && e) return n.live = jr(e, e.focus)?.imageUrl ?? null, n.board;
		let r = e && jr(e, e.focus);
		return e && n.board?.file === e.file && n.live && r?.imageUrl === n.live ? {
			...n.board,
			focus: e.focus
		} : (n.board = e, n.live = null, e);
	}, [e, t]), g = h ? h.file + "|" + h.groups.map((e) => e.cards.map((e) => e.previewId).join(",")).join("|") : "";
	(0, L.useLayoutEffect)(() => {
		_();
	}, [g]);
	let v = (0, L.useRef)(h), b = (0, L.useRef)(i), x = (0, L.useRef)(0);
	v.current = h, b.current = i, (0, L.useLayoutEffect)(() => {
		d && (t !== null && (d.hidden = t !== "board"), t !== "focus" && (E(h), h && a && (x.current = Hr(a, h, i) || x.current)));
	}, [
		h,
		t,
		d,
		a
	]), (0, L.useEffect)(() => {
		if (!a) return;
		let e = () => {
			v.current && (x.current = Hr(a, v.current, b.current) || x.current);
		}, t = new ResizeObserver(() => {
			let t = a.clientWidth;
			t && t !== x.current && e();
		});
		return t.observe(a), y(e), () => {
			t.disconnect(), y(() => {});
		};
	}, [a]);
	let S = h && /* @__PURE__ */ (0, R.jsx)(L.Fragment, { children: h.groups.map((e, t) => /* @__PURE__ */ (0, R.jsx)(Yr, {
		group: e,
		marks: f,
		actions: r
	}, t)) }, g);
	return n ? c(S, () => null) : /* @__PURE__ */ (0, R.jsx)("section", {
		id: "boardView",
		ref: u,
		children: c(S, (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
			className: "board",
			id: "cards",
			ref: e,
			children: t
		}))
	});
}
// src/components/StaleBanner.tsx
function Zr({ rows: e, host: t }) {
	let { daemonText: n } = s(), { element: r, place: i } = o(t), a = (0, L.useRef)([]);
	e?.length && (a.current = e);
	let c = !!e?.length;
	return (0, L.useLayoutEffect)(() => {
		r && e && (r.classList.toggle("on", c), t && document.body.classList.toggle("stale", c));
	}, [
		r,
		t,
		e,
		c
	]), i(/* @__PURE__ */ (0, R.jsx)("div", {
		className: "in",
		children: /* @__PURE__ */ (0, R.jsx)("div", {
			className: "rows",
			id: "staleRows",
			children: a.current.map((e, t) => /* @__PURE__ */ (0, R.jsxs)("div", {
				className: "row",
				children: [/* @__PURE__ */ (0, R.jsx)("span", {
					className: "head",
					children: n(e.head)
				}), /* @__PURE__ */ (0, R.jsx)("span", {
					className: "why",
					children: e.why.map(n).join(" · ")
				})]
			}, t))
		})
	}), (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
		className: "stalebar",
		id: "staleBar",
		ref: e,
		children: t
	}));
}
// src/components/StatusPill.tsx
function Qr({ state: e, connection: t = null, host: n, bar: r }) {
	let { phrase: i, daemonText: a } = s(), { element: c, place: l } = o(n), u = (0, L.useRef)(!1);
	t === "restarting" && (u.current = !0);
	let d = e?.timing.find((e) => e.head), f = !!e?.timing.some((e) => e.over), p = !!e && (!!e.error || e.stale.length > 0 || !!e.board?.groups.some((e) => e.failed)), m = e ? e.busy ? "busy" : p ? "error" : f ? "over" : d ? "idle" : "none" : "none", h = e ? e.busy ? a(e.boardNote) : d ? d.text : "" : "";
	t === "restarting" && (m = "busy", h = i("status.restarting")), t === "lost" && (m = "error", h = i("status.lost.short"));
	let g = u.current || !!e?.busy;
	return (0, L.useLayoutEffect)(() => {
		c && (e || t) && (c.dataset.state = m);
	}, [
		c,
		e,
		t,
		m
	]), (0, L.useLayoutEffect)(() => {
		r && (e || t) && r.classList.toggle("busy", g);
	}, [
		r,
		e,
		t,
		g
	]), l(/* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
		/* @__PURE__ */ (0, R.jsxs)("span", {
			className: "st-ic",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, R.jsx)("svg", {
					className: "i-ok",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					children: /* @__PURE__ */ (0, R.jsx)("path", { d: "m3.5 8.5 3 3 6-7" })
				}),
				/* @__PURE__ */ (0, R.jsx)("svg", {
					className: "i-busy",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, R.jsx)("path", { d: "M8 2.5a5.5 5.5 0 1 1-5.5 5.5" })
				}),
				/* @__PURE__ */ (0, R.jsxs)("svg", {
					className: "i-bad",
					viewBox: "0 0 16 16",
					children: [
						/* @__PURE__ */ (0, R.jsx)("circle", {
							cx: "8",
							cy: "8",
							r: "6.5",
							fill: "currentColor"
						}),
						/* @__PURE__ */ (0, R.jsx)("path", {
							className: "mark",
							d: "M8 4.8v3.8",
							strokeWidth: "1.7",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ (0, R.jsx)("circle", {
							className: "mark",
							cx: "8",
							cy: "11.2",
							r: ".95"
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, R.jsx)("span", {
			className: "st-text",
			id: "statusText",
			children: h
		}),
		/* @__PURE__ */ (0, R.jsxs)("div", {
			className: "pop",
			role: "tooltip",
			children: [
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "note",
					id: "note",
					children: a(e?.boardNote ?? null)
				}),
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "who",
					id: "who",
					children: a(e?.who ?? null)
				}),
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "settle",
					id: "settle",
					children: a(e?.settle ?? null)
				}),
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "timing",
					id: "timing",
					children: e?.timing.flatMap((e, t) => [/* @__PURE__ */ (0, R.jsx)("span", {
						className: e.over ? "over" : void 0,
						children: a(e.label)
					}, `k${t}`), /* @__PURE__ */ (0, R.jsx)("b", {
						className: e.over ? "over" : void 0,
						children: e.text
					}, `v${t}`)])
				}),
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "where",
					id: "where",
					children: e ? location.host : ""
				})
			]
		})
	] }), (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
		className: "status",
		id: "status",
		ref: e,
		tabIndex: 0,
		"data-state": "none",
		children: t
	}));
}
// src/components/PointOverlay.tsx
var $r = {
	openFile() {},
	choose() {},
	cancel() {},
	follow() {}
}, ei = /* @__PURE__ */ (0, R.jsxs)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: [/* @__PURE__ */ (0, R.jsx)("rect", {
		x: "2",
		y: "3.5",
		width: "12",
		height: "9.5",
		rx: "2"
	}), /* @__PURE__ */ (0, R.jsx)("path", { d: "M2 6.5h5.5V3.5" })]
});
function ti(e) {
	let t = /#L(\d+)$/.exec(e), n = e.replace(/^@/, "").replace(/#L\d+$/, "");
	return t ? `${n.slice(n.lastIndexOf("/") + 1)}:${t[1]}` : n;
}
function ni(e, t) {
	let n = t && e.startsWith(t + "/") ? e.slice(t.length + 1) : e, r = n.lastIndexOf("/") + 1, i = n.indexOf("/src/");
	return (i > 0 && i < r ? n.slice(0, i) + "/…/" : n.slice(0, r)) + n.slice(r);
}
function ri(e, t) {
	let n = (e.uchain || e.chain || []).slice(-6).join(" › ");
	return (t.ref ? [
		t.ref,
		e.name,
		n
	] : [t.msg, n]).filter(Boolean).join("\n");
}
function ii({ say: e, state: t, actions: n = $r }) {
	let { phrase: r } = s();
	if (!e.ref) return /* @__PURE__ */ (0, R.jsx)("span", {
		className: "tag-ref",
		children: e.msg || ""
	});
	let i = e.file, a = t?.tabs || [], o = i ? a.find((e) => e.key === i) : void 0, c = !!i && !(o && o.active) && !(!a.length && t?.board?.file === i), l = i ? r(o ? "point.tab.go" : "point.tab.open") + " — " + i.split("/").pop() : "";
	return /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
		/* @__PURE__ */ (0, R.jsx)("span", {
			className: "tag-ref",
			children: ti(e.ref)
		}),
		e.copied ? /* @__PURE__ */ (0, R.jsx)("span", {
			className: "tag-ok",
			children: r("point.tag.copied")
		}) : e.again ? /* @__PURE__ */ (0, R.jsx)("button", {
			type: "button",
			className: "tag-again",
			onClick: e.again,
			children: r("point.tag.retry")
		}) : e.copied === !1 ? /* @__PURE__ */ (0, R.jsx)("span", {
			className: "tag-ok wait",
			children: r("point.tag.blocked")
		}) : null,
		c && /* @__PURE__ */ (0, R.jsx)("button", {
			type: "button",
			className: "tag-open",
			title: l,
			"aria-label": l,
			onClick: () => n.openFile(i),
			children: ei
		})
	] });
}
function ai({ state: e, actions: t }) {
	let { tag: n, node: r, say: i } = (0, L.useSyncExternalStore)(cn.subscribe, cn.get);
	return (0, L.useLayoutEffect)(() => {
		n && r && i && (n.title = ri(r, i));
	}, [
		n,
		r,
		i
	]), !n || !r || !i ? null : (0, Er.createPortal)(/* @__PURE__ */ (0, R.jsx)(ii, {
		say: i,
		state: e,
		actions: t
	}), n);
}
function oi({ choice: e, repo: t, host: n, actions: r = $r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), l = (0, L.useRef)(e);
	e && (l.current = e);
	let u = l.current;
	return (0, L.useLayoutEffect)(() => {
		a && (a.classList.toggle("on", !!e), a.setAttribute("aria-hidden", String(!e)), e ? r.follow(a) : a.contains(document.activeElement) && document.activeElement.blur());
	}, [e, a]), c(u && /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
		/* @__PURE__ */ (0, R.jsx)("h2", { children: i("choose.title", {
			file: u.fileName,
			n: u.candidates.length
		}) }),
		/* @__PURE__ */ (0, R.jsx)("p", { children: i("choose.sub") }),
		u.candidates.map((e) => /* @__PURE__ */ (0, R.jsx)("button", {
			type: "button",
			className: "opt",
			title: e,
			onClick: () => r.choose(e),
			children: ni(e.startsWith(u.repoRoot + "/") ? e.slice(u.repoRoot.length + 1) : e, t)
		}, e)),
		/* @__PURE__ */ (0, R.jsx)("button", {
			type: "button",
			className: "cancel",
			onClick: r.cancel,
			children: i("choose.cancel")
		})
	] }), (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
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
function si({ screen: e, vacant: t, host: n }) {
	let { phrase: r, daemonText: i } = s(), { element: a, place: c } = o(n);
	return (0, L.useLayoutEffect)(() => {
		a && e !== null && (a.hidden = e !== "vacant");
	}, [e, a]), c(/* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("p", {
		className: "vacant-msg",
		id: "vacantMsg",
		children: i(t)
	}), /* @__PURE__ */ (0, R.jsx)("p", {
		className: "vacant-hint",
		children: r("vacant.hint")
	})] }), (e, t) => /* @__PURE__ */ (0, R.jsx)("section", {
		id: "vacantView",
		className: "vacant",
		ref: e,
		children: t
	}));
}
// src/components/WorkspaceShell.tsx
function ci() {
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
var li = ({ id: e, hidden: t }) => /* @__PURE__ */ (0, R.jsxs)("div", {
	className: "unit",
	id: e,
	hidden: t,
	children: [
		/* @__PURE__ */ (0, R.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, R.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, R.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, R.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, R.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, R.jsx)("div", { className: "shell" }),
		/* @__PURE__ */ (0, R.jsx)("div", { className: "outline" }),
		/* @__PURE__ */ (0, R.jsxs)("div", {
			className: "stage",
			children: [
				/* @__PURE__ */ (0, R.jsx)("img", {
					className: "ly l0",
					alt: ""
				}),
				/* @__PURE__ */ (0, R.jsx)("div", { className: "veil" }),
				/* @__PURE__ */ (0, R.jsx)("img", {
					className: "ly l1",
					alt: ""
				}),
				/* @__PURE__ */ (0, R.jsx)("div", { className: "crease" }),
				/* @__PURE__ */ (0, R.jsx)("div", { className: "cam" })
			]
		}),
		/* @__PURE__ */ (0, R.jsx)("div", { className: "tick t-top" }),
		/* @__PURE__ */ (0, R.jsx)("div", { className: "tick t-bot" })
	]
});
function ui() {
	let e = ci();
	return /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "ruler",
		id: "ruler",
		hidden: !0,
		children: [
			/* @__PURE__ */ (0, R.jsxs)("svg", {
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, R.jsx)("path", {
					className: "ext",
					id: "rlExt"
				}), /* @__PURE__ */ (0, R.jsx)("path", {
					className: "dim",
					id: "rlDim"
				})]
			}),
			/* @__PURE__ */ (0, R.jsx)("input", {
				className: "rl-badge",
				id: "rlW",
				type: "text",
				inputMode: "numeric",
				maxLength: 4,
				...e.label("size.w.label"),
				...e.title("size.w.tip")
			}),
			/* @__PURE__ */ (0, R.jsx)("input", {
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
function di() {
	return /* @__PURE__ */ (0, R.jsx)("div", {
		className: "resize-scene",
		id: "resizeScene",
		hidden: !0,
		children: /* @__PURE__ */ (0, R.jsxs)("div", {
			className: "resize-geometry",
			id: "resizeGeometry",
			children: [
				/* @__PURE__ */ (0, R.jsx)(li, { id: "ua" }),
				/* @__PURE__ */ (0, R.jsx)(li, {
					id: "ub",
					hidden: !0
				}),
				/* @__PURE__ */ (0, R.jsx)(ui, {}),
				/* @__PURE__ */ (0, R.jsxs)("div", {
					className: "duo",
					id: "duo",
					hidden: !0,
					children: [
						/* @__PURE__ */ (0, R.jsxs)("div", {
							className: "duo-base",
							children: [/* @__PURE__ */ (0, R.jsx)("div", { className: "duo-band" }), /* @__PURE__ */ (0, R.jsxs)("div", {
								className: "duo-scr",
								children: [/* @__PURE__ */ (0, R.jsx)("img", {
									className: "ly",
									alt: ""
								}), /* @__PURE__ */ (0, R.jsx)("div", { className: "cam" })]
							})]
						}),
						/* @__PURE__ */ (0, R.jsx)("div", { className: "btn" }),
						/* @__PURE__ */ (0, R.jsx)("div", { className: "btn" }),
						/* @__PURE__ */ (0, R.jsxs)("svg", {
							className: "duo-edge",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, R.jsx)("defs", { children: /* @__PURE__ */ (0, R.jsxs)("linearGradient", {
									id: "duoSheen",
									gradientUnits: "userSpaceOnUse",
									children: [
										/* @__PURE__ */ (0, R.jsx)("stop", { offset: "0" }),
										/* @__PURE__ */ (0, R.jsx)("stop", { offset: ".4" }),
										/* @__PURE__ */ (0, R.jsx)("stop", { offset: "1" })
									]
								}) }),
								/* @__PURE__ */ (0, R.jsx)("path", { className: "outl" }),
								/* @__PURE__ */ (0, R.jsx)("path", { className: "houtl" }),
								/* @__PURE__ */ (0, R.jsx)("path", { className: "rim" }),
								/* @__PURE__ */ (0, R.jsx)("path", { className: "rimhi" }),
								/* @__PURE__ */ (0, R.jsx)("path", { className: "body" }),
								/* @__PURE__ */ (0, R.jsx)("path", {
									className: "sheen",
									stroke: "url(#duoSheen)"
								}),
								/* @__PURE__ */ (0, R.jsx)("path", { className: "hinge" }),
								/* @__PURE__ */ (0, R.jsx)("path", {
									className: "hsheen",
									stroke: "url(#duoSheen)"
								}),
								/* @__PURE__ */ (0, R.jsx)("path", { className: "ring" }),
								/* @__PURE__ */ (0, R.jsx)("path", { className: "ring hr" })
							]
						}),
						/* @__PURE__ */ (0, R.jsxs)("div", {
							className: "duo-flap",
							children: [/* @__PURE__ */ (0, R.jsx)("div", { className: "duo-face" }), /* @__PURE__ */ (0, R.jsx)("div", { className: "duo-dark" })]
						})
					]
				}),
				/* @__PURE__ */ (0, R.jsx)("div", {
					className: "rig",
					id: "rig",
					hidden: !0,
					children: /* @__PURE__ */ (0, R.jsxs)("div", {
						className: "lift",
						children: [
							/* @__PURE__ */ (0, R.jsx)("div", { className: "plate" }),
							/* @__PURE__ */ (0, R.jsxs)("div", {
								className: "base",
								children: [
									/* @__PURE__ */ (0, R.jsxs)("div", {
										className: "clip",
										children: [
											/* @__PURE__ */ (0, R.jsx)("img", {
												className: "ly old",
												alt: ""
											}),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "veil" }),
											/* @__PURE__ */ (0, R.jsx)("img", {
												className: "ly neu",
												alt: ""
											}),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "cast" }),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "cam" })
										]
									}),
									/* @__PURE__ */ (0, R.jsx)("div", { className: "edge bez" }),
									/* @__PURE__ */ (0, R.jsx)("div", { className: "edge ring" })
								]
							}),
							/* @__PURE__ */ (0, R.jsxs)("div", {
								className: "leaf",
								children: [
									/* @__PURE__ */ (0, R.jsxs)("div", {
										className: "clip face inner",
										children: [
											/* @__PURE__ */ (0, R.jsx)("img", {
												className: "ly old",
												alt: ""
											}),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "veil" }),
											/* @__PURE__ */ (0, R.jsx)("img", {
												className: "ly neu",
												alt: ""
											}),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "shade" }),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "sheen" }),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "cam" })
										]
									}),
									/* @__PURE__ */ (0, R.jsxs)("div", {
										className: "clip face outer",
										children: [
											/* @__PURE__ */ (0, R.jsx)("img", {
												className: "ly old",
												alt: ""
											}),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "veil" }),
											/* @__PURE__ */ (0, R.jsx)("img", {
												className: "ly neu",
												alt: ""
											}),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "shade" }),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "sheen" }),
											/* @__PURE__ */ (0, R.jsx)("div", { className: "cam" })
										]
									}),
									/* @__PURE__ */ (0, R.jsx)("div", { className: "edge bez" }),
									/* @__PURE__ */ (0, R.jsx)("div", { className: "edge ring" })
								]
							}),
							/* @__PURE__ */ (0, R.jsx)("div", { className: "crease" }),
							/* @__PURE__ */ (0, R.jsx)("div", { className: "tick r-top" }),
							/* @__PURE__ */ (0, R.jsx)("div", { className: "tick r-bot" })
						]
					})
				})
			]
		})
	});
}
var fi = (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
	className: "workspace-loading",
	id: "workspaceLoading",
	role: "status",
	hidden: !0,
	ref: e,
	children: t
}), pi = (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
	className: "zoom at-fit",
	id: "zoomCtl",
	ref: e,
	children: t
});
function mi({ loading: e = fi() }) {
	return /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "stage",
		id: "stage",
		children: [
			/* @__PURE__ */ (0, R.jsx)("img", {
				id: "shot",
				alt: "preview"
			}),
			e,
			/* @__PURE__ */ (0, R.jsx)("div", {
				className: "box",
				id: "box",
				hidden: !0
			}),
			/* @__PURE__ */ (0, R.jsx)("div", {
				className: "box pick",
				id: "pickBox",
				hidden: !0,
				children: /* @__PURE__ */ (0, R.jsx)("span", { className: "tag" })
			})
		]
	});
}
function hi({ loading: e }) {
	return /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "wrap",
		children: [/* @__PURE__ */ (0, R.jsx)(di, {}), /* @__PURE__ */ (0, R.jsx)(mi, { loading: e })]
	});
}
function gi() {
	let e = ci(), t = (t, n, r) => /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "sl",
		"data-axis": t,
		children: [/* @__PURE__ */ (0, R.jsxs)("div", {
			className: "sl-h",
			children: [/* @__PURE__ */ (0, R.jsx)("span", {
				id: t === "w" ? "slWLb" : "slHLb",
				...e.text(n)
			}), /* @__PURE__ */ (0, R.jsxs)("span", {
				className: "v",
				children: [/* @__PURE__ */ (0, R.jsx)("b", {}), /* @__PURE__ */ (0, R.jsx)("small", { children: "dp" })]
			})]
		}), /* @__PURE__ */ (0, R.jsxs)("div", {
			className: "sl-track",
			children: [
				/* @__PURE__ */ (0, R.jsx)("span", { className: "fill" }),
				r.map((e) => /* @__PURE__ */ (0, R.jsxs)("span", {
					className: "tick",
					"data-v": e,
					children: [/* @__PURE__ */ (0, R.jsx)("i", {}), /* @__PURE__ */ (0, R.jsx)("em", { children: e })]
				}, e)),
				/* @__PURE__ */ (0, R.jsx)("span", {
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
	return /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "pn-sl",
		id: "pnSl",
		role: "group",
		...e.label("size.custom.label"),
		hidden: !0,
		children: [t("w", "size.w", [600, 840]), t("h", "size.h", [480, 900])]
	});
}
function _i() {
	let e = ci(), t = (t, n, r, i = !1) => /* @__PURE__ */ (0, R.jsx)("button", {
		className: i ? "pn-it mono" : "pn-it",
		type: "button",
		role: "radio",
		"data-sel": t,
		...n ? e.title(n) : {},
		children: r
	}, t);
	return /* @__PURE__ */ (0, R.jsxs)("div", {
		className: "pn-pick",
		id: "pnPick",
		role: "radiogroup",
		...e.label("panel.pick"),
		children: [/* @__PURE__ */ (0, R.jsxs)("section", {
			className: "pn-sec",
			children: [/* @__PURE__ */ (0, R.jsx)("h4", {
				className: "pn-h",
				...e.text("panel.size")
			}), /* @__PURE__ */ (0, R.jsxs)("div", {
				className: "pn-list",
				children: [
					t("original", "size.original.tip", "@Preview", !0),
					t("narrow", "size.narrow.tip", "320×640"),
					t("foldable", "size.foldable.tip", "673×841"),
					/* @__PURE__ */ (0, R.jsx)("button", {
						className: "pn-it",
						type: "button",
						role: "radio",
						"data-sel": "custom",
						...e.title("size.custom.tip"),
						...e.text("size.custom")
					}),
					/* @__PURE__ */ (0, R.jsx)(gi, {})
				]
			})]
		}), /* @__PURE__ */ (0, R.jsxs)("section", {
			className: "pn-sec",
			children: [/* @__PURE__ */ (0, R.jsx)("h4", {
				className: "pn-h",
				...e.text("panel.device")
			}), /* @__PURE__ */ (0, R.jsxs)("div", {
				className: "pn-list",
				children: [
					/* @__PURE__ */ (0, R.jsx)("h5", {
						className: "pn-g",
						children: "Android"
					}),
					[
						"s26",
						"pixel9",
						"fold8",
						"ultra",
						"pixelfold",
						"tablet"
					].map((e) => t(e)),
					/* @__PURE__ */ (0, R.jsx)("h5", {
						className: "pn-g",
						children: "iPhone"
					}),
					[
						"ip17",
						"ipair",
						"ip17pm",
						"ipduo"
					].map((e) => t(e))
				]
			})]
		})]
	});
}
function vi() {
	let e = ci();
	return /* @__PURE__ */ (0, R.jsxs)("section", {
		className: "pn-sec",
		id: "devCtl",
		role: "group",
		...e.label("posture.label"),
		hidden: !0,
		children: [/* @__PURE__ */ (0, R.jsx)("h4", {
			className: "pn-h",
			...e.text("posture.title")
		}), /* @__PURE__ */ (0, R.jsxs)("div", {
			className: "pn-seg",
			children: [
				/* @__PURE__ */ (0, R.jsx)("button", {
					className: "pn-it",
					id: "dcFold",
					type: "button",
					children: /* @__PURE__ */ (0, R.jsx)("span", {
						id: "dcFoldLb",
						...e.text("posture.fold")
					})
				}),
				/* @__PURE__ */ (0, R.jsx)("button", {
					className: "pn-it",
					id: "dcRot",
					type: "button",
					children: /* @__PURE__ */ (0, R.jsx)("span", {
						id: "dcRotLb",
						...e.text("posture.rotate")
					})
				}),
				/* @__PURE__ */ (0, R.jsx)("button", {
					className: "pn-it",
					id: "dcHinge",
					type: "button",
					"aria-pressed": "true",
					...e.title("posture.hinge"),
					...e.text("posture.hinge")
				})
			]
		})]
	});
}
function yi({ zoom: e = pi() }) {
	return /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
		/* @__PURE__ */ (0, R.jsx)(_i, {}),
		/* @__PURE__ */ (0, R.jsx)(vi, {}),
		e
	] });
}
// src/components/Workspace.tsx
var bi = {
	exit() {},
	setInteractive() {},
	zoomIn() {},
	zoomOut() {},
	zoomFit() {},
	zoomMenuPick() {},
	toggleZoomMenu() {}
};
function xi({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e), { on: i, failed: a } = (0, L.useSyncExternalStore)(sn.subscribe, sn.get);
	return (0, L.useLayoutEffect)(() => {
		n && (n.hidden = !i, n.classList.toggle("failed", a));
	}, [
		n,
		i,
		a
	]), r(/* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("span", {
		className: "workspace-spinner",
		"aria-hidden": "true"
	}), /* @__PURE__ */ (0, R.jsx)("span", {
		id: "workspaceLoadingText",
		children: t(a ? "workspace.loading.failed" : "workspace.loading")
	})] }), fi);
}
var Si = /* @__PURE__ */ (0, R.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, R.jsx)("path", { d: "M4 8h8" })
}), Ci = /* @__PURE__ */ (0, R.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, R.jsx)("path", { d: "M4 8h8M8 4v8" })
});
function wi({ host: e, actions: t = bi }) {
	let { phrase: n } = s(), { element: r, place: i } = o(e), { pct: a, real: c, atFit: l, menu: u, disabled: d } = (0, L.useSyncExternalStore)(X.subscribe, X.get);
	return (0, L.useLayoutEffect)(() => {
		r?.classList.toggle("at-fit", l);
	}, [r, l]), i(/* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
		/* @__PURE__ */ (0, R.jsx)("button", {
			type: "button",
			id: "zoomOutBtn",
			"aria-label": n("zoom.out"),
			title: n("zoom.out.tip"),
			disabled: d,
			onClick: t.zoomOut,
			children: Si
		}),
		/* @__PURE__ */ (0, R.jsxs)("button", {
			type: "button",
			id: "zoomPct",
			className: "z-pct",
			"aria-haspopup": "menu",
			"aria-expanded": u,
			disabled: d,
			title: n(c ? "zoom.tip.real" : "zoom.tip.fit"),
			onClick: (e) => t.toggleZoomMenu(e.detail === 0),
			children: [a, "%"]
		}),
		/* @__PURE__ */ (0, R.jsx)("button", {
			type: "button",
			id: "zoomInBtn",
			"aria-label": n("zoom.in"),
			title: n("zoom.in.tip"),
			disabled: d,
			onClick: t.zoomIn,
			children: Ci
		}),
		/* @__PURE__ */ (0, R.jsx)("span", { className: "z-grow" }),
		/* @__PURE__ */ (0, R.jsx)("button", {
			type: "button",
			id: "zoomFitBtn",
			className: "z-fit",
			title: n("zoom.fit.tip"),
			disabled: d,
			tabIndex: l ? -1 : 0,
			"aria-hidden": l,
			onClick: t.zoomFit,
			children: n("zoom.fit")
		}),
		/* @__PURE__ */ (0, R.jsxs)("div", {
			className: u ? "zoom-menu on" : "zoom-menu",
			id: "zoomMenu",
			role: "menu",
			children: [
				/* @__PURE__ */ (0, R.jsxs)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "fit",
					disabled: d,
					onClick: () => t.zoomMenuPick("fit"),
					children: [/* @__PURE__ */ (0, R.jsx)("span", { children: n("zoom.fit") }), /* @__PURE__ */ (0, R.jsx)("kbd", { children: "0" })]
				}),
				/* @__PURE__ */ (0, R.jsx)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "1",
					hidden: !c,
					disabled: d,
					onClick: () => t.zoomMenuPick("1"),
					children: n("zoom.real")
				}),
				/* @__PURE__ */ (0, R.jsx)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "2",
					disabled: d,
					onClick: () => t.zoomMenuPick("2"),
					children: "200%"
				})
			]
		})
	] }), pi);
}
var Ti = 12, Ei = 48;
function Di(e, t) {
	let n = e.querySelector("#backName"), r = t.querySelector("#wsName"), i = t.querySelector("#wsFn"), a = e.parentElement, o = document.getElementById("barR");
	if (!n || !r || !i || !a || !o || (n.style.maxWidth = "", n.style.display = "", t.hidden || !(t.offsetParent instanceof HTMLElement))) return;
	if (getComputedStyle(t).position !== "absolute") {
		t.style.removeProperty("--ws-left"), t.style.removeProperty("--ws-max");
		return;
	}
	let s = t.offsetParent.clientWidth, c = o.offsetLeft - Ti, l = Math.min(Math.max(r.scrollWidth, i.hidden ? 0 : i.scrollWidth) + 1, s * .34), u = Math.min(s / 2 - l / 2, c - l), d = () => {
		let e = 0;
		for (let t of a.children) t instanceof HTMLElement && t.offsetParent && (e = Math.max(e, a.offsetLeft + t.offsetLeft + t.offsetWidth));
		return e + Ti;
	}, f = d();
	if (f > u && !e.hidden) {
		let e = n.offsetWidth - (f - u);
		e < Ei ? n.style.display = "none" : n.style.maxWidth = `${e}px`, f = d();
	}
	let p = Math.max(u, f), m = Math.max(0, Math.min(l, c - p));
	t.style.setProperty("--ws-left", `${p + m / 2}px`), t.style.setProperty("--ws-max", `${m}px`);
}
var Oi = /* @__PURE__ */ (0, R.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.8",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, R.jsx)("path", { d: "M10 3.5 5.5 8l4.5 4.5" })
});
function ki(e) {
	let t = e.querySelector("button[aria-pressed=\"true\"]");
	if (!t?.offsetWidth) {
		e.style.removeProperty("--seg-x"), e.style.removeProperty("--seg-w");
		return;
	}
	let n = !e.style.getPropertyValue("--seg-w"), r = e.getBoundingClientRect(), i = t.getBoundingClientRect();
	e.classList.toggle("instant", n), e.style.setProperty("--seg-x", `${i.left - r.left}px`), e.style.setProperty("--seg-w", `${i.width}px`), n && (getComputedStyle(e, "::after").width, e.classList.remove("instant"));
}
function Ai({ state: e, hosts: t, actions: n = bi }) {
	let { phrase: r } = s(), i = o(t?.back), a = o(t?.title), c = o(t?.seg), l = e?.screen === "focus" ? e.focus : null, u = l ? (e.tabs || []).find((e) => e.active) : void 0, d = l?.fromBoard && e?.board ? e.board.groups.flatMap((e) => e.cards).find((t) => t.index === e.board.focus) : void 0, f = !!l?.interactive;
	(0, L.useLayoutEffect)(() => {
		document.body.classList.toggle("ws", !!l), i.element && (i.element.hidden = !(l && l.fromBoard)), c.element && (c.element.hidden = !(l && !l.fromBoard)), a.element && (a.element.hidden = !l, a.element.title = l ? d ? d.title : u ? u.title : l.previewId : ""), i.element && a.element && Di(i.element, a.element);
	});
	let p = !!l && !l.fromBoard;
	(0, L.useLayoutEffect)(() => {
		c.element && ki(c.element);
	}, [
		c.element,
		p,
		f
	]), (0, L.useLayoutEffect)(() => {
		let e = c.element;
		if (!e) return;
		let t = new ResizeObserver(() => ki(e));
		return t.observe(e), () => t.disconnect();
	}, [c.element]), (0, L.useLayoutEffect)(() => () => document.body.classList.remove("ws"), []), (0, L.useLayoutEffect)(() => {
		let e = i.element, t = a.element, n = e?.parentElement?.parentElement, r = document.getElementById("barR");
		if (!e || !t) return;
		let o = new ResizeObserver(() => Di(e, t));
		for (let e of [n, r]) e && o.observe(e);
		return () => o.disconnect();
	}, [i.element, a.element]);
	let m = /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [Oi, /* @__PURE__ */ (0, R.jsx)("span", {
		id: "backName",
		children: u ? u.name : r("nav.board")
	})] }), h = /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("span", {
		className: "ws-name",
		id: "wsName",
		children: l ? l.name || l.fn || l.previewId : ""
	}), /* @__PURE__ */ (0, R.jsx)("span", {
		className: "ws-fn",
		id: "wsFn",
		hidden: !l?.name,
		children: l?.name ? l.fn : ""
	})] }), g = /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("button", {
		type: "button",
		"data-on": "false",
		"aria-pressed": !f,
		onClick: () => n.setInteractive(!1),
		children: r("mode.view")
	}), /* @__PURE__ */ (0, R.jsx)("button", {
		type: "button",
		"data-on": "true",
		"aria-pressed": f,
		onClick: () => n.setInteractive(!0),
		children: r("mode.interact")
	})] });
	return (0, L.useLayoutEffect)(() => {
		let e = i.element;
		if (!e) return;
		let t = () => n.exit();
		return e.addEventListener("click", t), () => e.removeEventListener("click", t);
	}, [i.element, n]), /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
		i.place(m, (e, t) => /* @__PURE__ */ (0, R.jsx)("button", {
			className: "back",
			id: "back",
			type: "button",
			ref: e,
			children: t
		})),
		a.place(h, (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
			className: "ws-title",
			id: "wsTitle",
			ref: e,
			children: t
		})),
		c.place(g, (e, t) => /* @__PURE__ */ (0, R.jsx)("div", {
			className: "seg",
			id: "seg",
			ref: e,
			children: t
		}))
	] });
}
function ji({ screen: e, hosts: t, actions: n = bi }) {
	let { phrase: r } = s(), [i, a] = (0, L.useState)(null), o = t?.view ?? i;
	return (0, L.useLayoutEffect)(() => {
		o && e !== null && (o.hidden = e !== "focus");
	}, [e, o]), t ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)(xi, { host: t.loading }), /* @__PURE__ */ (0, R.jsx)(wi, {
		host: t.zoom,
		actions: n
	})] }) : /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [/* @__PURE__ */ (0, R.jsx)("section", {
		id: "focusView",
		ref: a,
		children: /* @__PURE__ */ (0, R.jsx)(hi, { loading: /* @__PURE__ */ (0, R.jsx)(xi, {}) })
	}), /* @__PURE__ */ (0, R.jsx)("aside", {
		className: "panel",
		id: "panel",
		"aria-label": r("panel.label"),
		children: /* @__PURE__ */ (0, R.jsx)(yi, { zoom: /* @__PURE__ */ (0, R.jsx)(wi, { actions: n }) })
	})] });
}
// src/ViewerRoot.tsx
function Mi() {
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
			open: e("railOpen")
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
			zoom: e("zoomCtl"),
			loading: e("workspaceLoading")
		},
		workspaceHeader: {
			back: e("back"),
			title: e("wsTitle"),
			seg: e("seg")
		},
		chooser: e("chooser")
	};
}
function Ni({ state: e, draw: t = 0, statusState: n = e, connection: r = null, app: i = null, shortcuts: a = [], hosts: o, board: s, workspace: c, point: l, renderLegacy: u }) {
	return (0, L.useLayoutEffect)(() => {
		e && u(e);
	}, [t]), o ? /* @__PURE__ */ (0, R.jsxs)(R.Fragment, { children: [
		/* @__PURE__ */ (0, R.jsx)(Rt, {
			header: e?.header ?? null,
			tabs: e?.tabs ?? [],
			app: i,
			host: o.app,
			brand: o.brand
		}),
		/* @__PURE__ */ (0, R.jsx)(Qr, {
			state: n,
			connection: r,
			host: o.status,
			bar: o.bar
		}),
		/* @__PURE__ */ (0, R.jsx)(qt, { host: o.helpButton }),
		/* @__PURE__ */ (0, R.jsx)(Nt, {
			tabs: e?.tabs ?? null,
			screen: e?.screen ?? null,
			hosts: o.rail
		}),
		/* @__PURE__ */ (0, R.jsx)(Zr, {
			rows: e?.stale ?? null,
			host: o.stale
		}),
		/* @__PURE__ */ (0, R.jsx)(Or, {
			pending: !!e?.buildPending,
			host: o.buildNotice
		}),
		/* @__PURE__ */ (0, R.jsx)(Xr, {
			board: e?.board ?? null,
			screen: e?.screen ?? null,
			hosts: o.board,
			actions: s
		}),
		/* @__PURE__ */ (0, R.jsx)(_t, {
			state: e,
			draw: t,
			connection: r,
			hosts: o.quickOpen
		}),
		/* @__PURE__ */ (0, R.jsx)(si, {
			screen: e?.screen ?? null,
			vacant: e?.vacant ?? null,
			host: o.vacant
		}),
		/* @__PURE__ */ (0, R.jsx)(ji, {
			screen: e?.screen ?? null,
			hosts: o.workspace,
			actions: c
		}),
		/* @__PURE__ */ (0, R.jsx)(Ai, {
			state: e,
			hosts: o.workspaceHeader,
			actions: c
		}),
		/* @__PURE__ */ (0, R.jsx)(ai, {
			state: e,
			actions: l
		}),
		/* @__PURE__ */ (0, R.jsx)(oi, {
			choice: e?.choice ?? null,
			repo: e?.header?.repo,
			host: o.chooser,
			actions: l
		}),
		/* @__PURE__ */ (0, R.jsx)(kr, { host: o.capsule }),
		/* @__PURE__ */ (0, R.jsx)(Kt, {
			table: a,
			host: o.help
		})
	] }) : null;
}
function Pi({ renderLegacy: e, messages: t, hosts: n, shortcuts: r, board: i, workspace: a, point: o }) {
	let s = document.createElement("div");
	s.hidden = !0, document.body.append(s);
	let c = (0, Dr.createRoot)(s), l = null, u = null, f = null, p = null, m = 0, h = () => c.render(/* @__PURE__ */ (0, R.jsx)(d.Provider, {
		value: t,
		children: /* @__PURE__ */ (0, R.jsx)(Ni, {
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
	return (0, Er.flushSync)(h), ee("/app.json").then((e) => e.json()).then((e) => {
		p = e, h();
	}).catch(() => {
		p = {}, h();
	}), {
		apply(e, t = !1) {
			l = e, t && u || (u = e), m++, (0, Er.flushSync)(h);
		},
		connection(e) {
			f = e, (0, Er.flushSync)(h);
		},
		dispose() {
			c.unmount(), s.remove();
		}
	};
}
// src/main.tsx
var Fi = zt(), Ii = Bn(zn()), Li = (e) => {
	nr(e), Fi?.update(e);
}, Ri = () => {
	let { cursor: e } = p();
	e != null && Gn(e);
}, zi = {
	exit: Kn,
	setInteractive: Jn,
	zoomIn: Ii.zoomIn,
	zoomOut: Ii.zoomOut,
	zoomFit: Ii.zoomFit,
	zoomMenuPick: Ii.zoomMenuPick,
	toggleZoomMenu: Ii.toggleZoomMenu
}, Bi = {
	openFile: Cn,
	choose: On,
	cancel: kn,
	follow: Pn
}, Vi = {
	screen: () => I.st ? I.st.screen : "offline",
	fromBoard: () => !!I.st?.focus?.fromBoard,
	tabCount: Ct,
	moveCursor: v,
	openCursor: Ri,
	exitFocus: Kn,
	toggleInteractive: qn,
	stepTab: xt,
	jumpTab: St,
	openQuickOpen: ot,
	helpOpen: Wt,
	toggleHelp: Gt,
	zoomIn: zi.zoomIn,
	zoomOut: zi.zoomOut,
	zoomFit: zi.zoomFit
}, Hi = Sr(k, Vi);
Tr(Hi, Vi, {
	chooserOpen: () => !!document.getElementById("chooser")?.classList.contains("on"),
	cancelChoice: kn,
	closeZoomMenu: Ii.closeZoomMenu,
	closeDirPop: Lt
});
var Ui = Pi({
	renderLegacy: Li,
	messages: {
		phrase: k,
		daemonText: O
	},
	hosts: Mi(),
	shortcuts: Hi,
	board: {
		open: Gn,
		point: Fn
	},
	workspace: zi,
	point: Bi
});
xr({
	workspace: Ii,
	render: Ui.apply,
	onConnection: Ui.connection,
	onPreviewFiles: st,
	prepared: Fi
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
