import { i as e, n as t, r as n, t as r } from "./react.js";
import { createScene as i, handoffMs as a, i as o, n as s, r as c, sceneEasing as l, sceneMs as u, t as d } from "./preparation-scene.js";
import { applyReveal as f, boardMarks as p, cancelReveal as m, cardAt as h, cardStage as g, clearTrees as _, moveCursor as v, onRelayout as y, returnCard as b, reveal as x, ringCard as S, setCursor as C, stuckHead as w, subscribeBoard as T, syncBoard as E, trees as D } from "./board.js";
import { daemonText as O, phrase as k } from "./strings.js";
import { connect as A, fetchPreviewFiles as j, fetchProjectFiles as ee, get as te, post as M, reportStreamWidth as ne, viewerStream as re } from "./api.js";
import { capsuleContent as N, dismissOnce as ie, flash as P, hideOnce as ae, renderError as oe, setStatus as se, setSummary as ce, showOnce as le, subscribeCapsule as ue } from "./capsule.js";
import { MORPH_LEAD as de, frameMorph as fe, freeze as pe, hold as me, motionMs as he, motionToken as ge, reduced as _e, swapImage as ve, transition as ye, transitioning as be } from "./motion.js";
import { cardOf as xe, store as F } from "./store.js";
import { createResizeScene as Se } from "./resize-scene.js";
// src/components/FileIcon.tsx
var I = e(), L = t(), R = (e) => e ? e.startsWith("android") ? "android" : "kmp" : "file", Ce = /* @__PURE__ */ (0, L.jsx)("path", { d: "M7 13H2.5V1.5h5L10 4V7" }), we = {
	file: /* @__PURE__ */ (0, L.jsx)("path", { d: "M4 2h5.5L12 4.5V14H4z" }),
	android: /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [Ce, /* @__PURE__ */ (0, L.jsxs)("g", {
		className: "mk-android",
		transform: "translate(5.5 6.4) scale(.75)",
		children: [/* @__PURE__ */ (0, L.jsx)("path", {
			fill: "currentColor",
			stroke: "none",
			d: "M2 12a6 6 0 0 1 12 0z"
		}), /* @__PURE__ */ (0, L.jsx)("path", {
			d: "M4.8 6.4 3.4 4.2M11.2 6.4l1.4-2.2",
			strokeWidth: "1.6"
		})]
	})] }),
	kmp: /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [Ce, /* @__PURE__ */ (0, L.jsx)("path", {
		className: "mk-kmp",
		fill: "currentColor",
		stroke: "none",
		transform: "translate(7.2 7.2) scale(.18333)",
		d: "M0 22.5629V0.0835311L22.4794 22.5629H0ZM0 25.4372V48H0.0572568L22.6201 25.4372H0ZM25.9906 22.0094L48 0H3.98128L25.9906 22.0094ZM26.0193 26.1028L4.1221 48H47.9164L26.0193 26.1028Z"
	})] })
};
function z({ kind: e }) {
	return /* @__PURE__ */ (0, L.jsx)("svg", {
		className: "rt-ic",
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.4",
		strokeLinejoin: "round",
		strokeLinecap: "round",
		"aria-hidden": "true",
		children: we[e]
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
var ke = (e) => e.dir ??= e.rel.slice(0, e.rel.length - e.name.length).toLowerCase(), Ae = {
	name: 30,
	fn: 15,
	path: 0
};
function je(e, t) {
	let n = 0, r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of e) {
		let e = null, o = Oe(a, t.name);
		o && (e = {
			s: o.score + Ae.name,
			kind: "name",
			idx: o.idx
		});
		for (let n of t.functions) {
			let t = Oe(a, n);
			t && (!e || t.score + Ae.fn > e.s) && (e = {
				s: t.score + Ae.fn,
				kind: "fn",
				fn: n,
				idx: t.idx
			});
		}
		if (!e && ke(t).includes(a.toLowerCase()) && (e = {
			s: 10 + Ae.path,
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
var Me = (e) => {
	let t = (e?.tabs || []).find((e) => e.active);
	return t ? t.key : e?.board?.file ?? null;
}, V = 8, Ne = 5, Pe = [], Fe = (e) => e.map((e) => ({
	...e,
	name: e.rel.split("/").pop()
}));
function Ie(e) {
	if (!e || !e.fns.size) return null;
	let t = null;
	for (let [n, r] of e.fns) (!t || r.size > t[1].size) && (t = [n, r]);
	return {
		fn: t[0],
		idx: t[1],
		more: e.fns.size - 1
	};
}
function Le(e, t, n) {
	let r = t.trim().split(/\s+/).filter(Boolean);
	if (!e) return {
		sections: [],
		more: 0,
		empty: !r.length,
		loading: !0
	};
	if (!r.length) {
		let t = new Map(e.map((e) => [e.path, e])), r = e.slice(0, Ne), i = new Set(r.map((e) => e.path)), a = n.map((e) => t.get(e)).filter((e) => !!e && !i.has(e.path)), o = V - r.length, s = a.length < o ? e.slice(Ne).filter((e) => !a.includes(e)).slice(0, o - a.length) : [], c = [{
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
		let e = je(r, t);
		e && i.push({
			f: t,
			m: e
		});
	}
	i.sort((e, t) => t.m.score - e.m.score || t.f.mtime - e.f.mtime);
	let a = i.slice(0, V).map((e) => ({
		...e,
		fn: Ie(e.m)
	}));
	return {
		sections: a.length ? [{ rows: a }] : [],
		more: Math.max(0, i.length - V),
		empty: !1,
		loading: !1
	};
}
function Re({ text: e, idx: t }) {
	if (!t?.size) return e;
	let n = [];
	return [...e].forEach((e, r) => {
		let i = t.has(r), a = n[n.length - 1];
		a && a[1] === i ? a[0] += e : n.push([e, i]);
	}), n.map(([e, t], n) => t ? /* @__PURE__ */ (0, L.jsx)("b", { children: e }, n) : e);
}
var ze = /* @__PURE__ */ (0, L.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.4",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, L.jsx)("path", { d: "M3 8h10M9 4l4 4-4 4" })
}), Be = (e) => (e || "").replace(/^:/, "").replace(/:/g, "/"), Ve = -1, He = -1, Ue = !1;
addEventListener("mousemove", (e) => {
	Ue = e.screenX !== Ve || e.screenY !== He, Ve = e.screenX, He = e.screenY;
}, !0);
var We = (0, I.memo)(function({ files: e, ready: t, query: n, sel: r, recent: i = Pe, fieldRef: a, onQuery: o, onSelect: l, onPick: u, onEscape: d, onLeave: f }) {
	let { phrase: p } = s(), m = (0, I.useRef)(null), h = (0, I.useRef)(null), [g, _] = (0, I.useState)(null), v = (0, I.useRef)({
		fieldRef: a,
		onQuery: o
	});
	v.current = {
		fieldRef: a,
		onQuery: o
	};
	let y = (0, I.useCallback)((e) => {
		_(e), v.current.fieldRef?.(e);
	}, []), b = (0, I.useMemo)(() => e && Fe(e), [e]), { sections: x, more: S, empty: C, loading: w } = (0, I.useMemo)(() => Le(b, n, i), [
		b,
		n,
		i
	]), T = (0, I.useMemo)(() => x.flatMap((e) => e.rows), [x]), E = Math.min(r, T.length - 1);
	(0, I.useLayoutEffect)(() => {
		r > E && l(E);
	}, [r, E]), (0, I.useLayoutEffect)(() => {
		if (!g) return;
		let e = () => v.current.onQuery(g.value, g.value.trim() ? 0 : -1);
		return g.addEventListener("input", e), () => g.removeEventListener("input", e);
	}, [g]), (0, I.useLayoutEffect)(() => {
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
	}, O = (e, t) => /* @__PURE__ */ (0, L.jsxs)("div", {
		className: t === E ? "qo-row sel" : "qo-row",
		role: "option",
		"aria-selected": t === E,
		"data-i": t,
		style: { "--i": t },
		title: e.f.rel,
		onMouseDown: (e) => e.preventDefault(),
		onMouseMove: () => {
			Ue && E !== t && l(t);
		},
		onClick: () => u?.(e),
		children: [
			/* @__PURE__ */ (0, L.jsx)("span", {
				className: "qo-arrow",
				children: ze
			}),
			/* @__PURE__ */ (0, L.jsx)("span", {
				className: "qo-name",
				children: /* @__PURE__ */ (0, L.jsx)(Re, {
					text: e.f.name,
					idx: e.m?.name
				})
			}),
			e.fn && /* @__PURE__ */ (0, L.jsxs)("span", {
				className: "qo-fn",
				children: [
					"› ",
					/* @__PURE__ */ (0, L.jsx)(Re, {
						text: e.fn.fn,
						idx: e.fn.idx
					}),
					e.fn.more ? /* @__PURE__ */ (0, L.jsx)("span", {
						className: "qo-fn-more",
						children: ` +${e.fn.more}`
					}) : null
				]
			}),
			/* @__PURE__ */ (0, L.jsx)("span", {
				className: "qo-mod",
				children: Be(e.f.module)
			})
		]
	}, e.f.path), k = null;
	w || !t && !T.length ? k = /* @__PURE__ */ (0, L.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.loading")
	}) : T.length || (k = C ? /* @__PURE__ */ (0, L.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.none")
	}) : /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "qo-none",
		children: [p("quickopen.noMatch", { q: n.trim() }), /* @__PURE__ */ (0, L.jsx)("div", {
			className: "qo-why",
			children: p("quickopen.noMatch.why")
		})]
	}));
	let A = 0;
	return /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "qo-col",
		ref: m,
		onMouseDown: (e) => {
			e.target !== g && e.preventDefault();
		},
		children: [
			/* @__PURE__ */ (0, L.jsxs)("label", {
				className: "qo-field",
				children: [
					/* @__PURE__ */ (0, L.jsxs)("svg", {
						viewBox: "0 0 16 16",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinecap: "round",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, L.jsx)("circle", {
							cx: "7",
							cy: "7",
							r: "4.5"
						}), /* @__PURE__ */ (0, L.jsx)("path", { d: "m10.5 10.5 3 3" })]
					}),
					/* @__PURE__ */ (0, L.jsx)("input", {
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
					/* @__PURE__ */ (0, L.jsx)("kbd", {
						className: "qo-esc",
						"aria-hidden": "true",
						children: "esc"
					})
				]
			}),
			/* @__PURE__ */ (0, L.jsxs)("div", {
				className: "qo-in",
				id: "qoIn",
				role: "listbox",
				"aria-label": p("quickopen.list"),
				ref: h,
				children: [
					k,
					x.map((e, t) => [e.title ? /* @__PURE__ */ (0, L.jsx)("div", {
						className: "qo-h",
						children: p(e.title)
					}, `h${t}`) : null, ...e.rows.map((e) => O(e, A++))]),
					S ? /* @__PURE__ */ (0, L.jsx)("div", {
						className: "qo-foot",
						children: p("quickopen.more", { n: S })
					}) : null
				]
			}),
			/* @__PURE__ */ (0, L.jsxs)("div", {
				className: "qo-hint",
				children: [/* @__PURE__ */ (0, L.jsxs)("span", {
					className: "qo-keys",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, L.jsx)("span", { children: p("quickopen.keys.move") }),
						/* @__PURE__ */ (0, L.jsx)("span", { children: p("quickopen.keys.open") }),
						/* @__PURE__ */ (0, L.jsx)("span", { children: p("quickopen.keys.close") })
					]
				}), /* @__PURE__ */ (0, L.jsxs)("span", {
					className: "qo-term",
					children: [
						/* @__PURE__ */ (0, L.jsx)("span", { children: p("quickopen.term") }),
						" ",
						/* @__PURE__ */ (0, L.jsxs)("code", { children: [
							"prevue show <",
							/* @__PURE__ */ (0, L.jsx)("span", { children: p("quickopen.term.file") }),
							">"
						] })
					]
				})]
			})
		]
	});
});
function Ge({ hosts: e, children: t }) {
	let { place: n } = o(e?.sheet);
	return n(t, (e, t) => /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("div", {
		className: "qo-curtain on",
		id: "qoCurtain"
	}), /* @__PURE__ */ (0, L.jsx)("div", {
		className: "qo-sheet on",
		id: "qoSheet",
		ref: e,
		children: t
	})] }));
}
function Ke({ host: e, children: t }) {
	let { phrase: n } = s(), { place: r } = o(e);
	return r(/* @__PURE__ */ (0, L.jsxs)("div", {
		className: "start-in",
		children: [/* @__PURE__ */ (0, L.jsx)("p", {
			className: "start-lead",
			children: n("start.lead")
		}), t]
	}), (e, t) => /* @__PURE__ */ (0, L.jsx)("section", {
		id: "startView",
		className: "start",
		ref: e,
		children: t
	}));
}
var H = {
	open: !1,
	files: null,
	ready: !1,
	query: "",
	sel: -1,
	recent: []
}, qe = /* @__PURE__ */ new Set();
function Je(e, t = !1) {
	if (!Object.keys(e).every((t) => H[t] === e[t]) && (H = {
		...H,
		...e
	}, !t)) for (let e of qe) e();
}
var Ye = (e) => (qe.add(e), () => {
	qe.delete(e);
}), Xe = () => H, U = null, W = null, Ze = null, G = !1, Qe = null, $e = 0, et = !1, tt = !1, nt = null, rt = 0, it = () => "prevue.recent:" + (F.st?.header.repo || "");
function at() {
	try {
		return JSON.parse(localStorage.getItem(it()) || "[]");
	} catch {
		return [];
	}
}
function ot(e, t = !1) {
	if (!e) return;
	let n = [e, ...at().filter((t) => t !== e)].slice(0, 20);
	try {
		localStorage.setItem(it(), JSON.stringify(n));
	} catch {}
	Je({ recent: n }, t);
}
async function st() {
	let e = ++rt, t = await j().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === rt && Je(t);
}
function ct(e = null) {
	if (G) W?.focus({ preventScroll: !0 }), W?.select();
	else if (U) {
		if (!H.open) {
			let { sheet: t, curtain: n } = U;
			et = !0, Qe = e && e !== document.body ? e : null, Ze?.setAttribute("aria-expanded", "true"), t.hidden = !1, n.hidden = !1, t.classList.remove("closing"), Je({
				open: !0,
				query: "",
				sel: -1,
				recent: at()
			}), requestAnimationFrame(() => {
				H.open && (n.classList.add("on"), t.classList.add("on"));
			}), st();
		}
		W?.focus({ preventScroll: !0 }), W?.select();
	}
}
function K(e = !1, t = !1) {
	if ($e = 0, !H.open || !U) return;
	let { sheet: n, curtain: r } = U;
	W && (W.value = "", W.blur()), t && Qe?.isConnected && Qe.focus({ preventScroll: !0 }), Qe = null, Je({ open: !1 }), Ze?.setAttribute("aria-expanded", "false"), r.classList.remove("on"), n.classList.remove("on"), e ? (n.hidden = !0, r.hidden = !0) : (n.classList.add("closing"), setTimeout(() => {
		H.open || (n.hidden = !0, r.hidden = !0, n.classList.remove("closing"));
	}, 220));
}
function lt() {
	(H.open || G) && st();
}
function ut() {
	let e = $e = performance.now();
	setTimeout(() => {
		$e === e && K();
	}, 1500);
}
async function dt(e, { phrase: t, daemonText: n }) {
	let r = e.f, i = F.st, a = e.fn ? e.fn.fn : null;
	if (ot(r.path, !0), r.path === Me(i)) {
		x(r.path, a), i?.screen === "focus" && i.focus ? (ut(), M("/viewer/exit")) : (K(), f());
		return;
	}
	x(r.path, a), ut();
	let o = await M("/viewer/open", { file: r.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	o.ok || ($e = 0, m(), P(n(o.message) || t("open.cannot")));
}
var ft = (e) => {
	e ? W = e : W && !W.isConnected && (W = null);
}, pt = (e, t) => Je({
	query: e,
	sel: t
}), mt = (e) => Je({ sel: e }), ht = () => {
	G ? W?.blur() : K(!1, !0);
}, gt = (e) => {
	H.open && U && e && !U.sheet.contains(e) && e !== Ze && K();
}, _t = (0, I.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, I.useLayoutEffect)(() => {
		if (!n) return;
		Ze = n, n.title = t("rail.open.tip"), n.setAttribute("aria-label", t("rail.open.label"));
		let e = (e) => H.open ? K(!1, !0) : ct(e.detail === 0 ? n : null);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), Ze = null;
		};
	}, [n, t]), r(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
		/* @__PURE__ */ (0, L.jsx)("svg", {
			viewBox: "0 0 16 16",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinecap: "round",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, L.jsx)("path", { d: "M8 3.5v9M3.5 8h9" })
		}),
		/* @__PURE__ */ (0, L.jsx)("span", {
			className: "rail-open-t",
			children: t("rail.open")
		}),
		/* @__PURE__ */ (0, L.jsx)("kbd", { children: "⌘K" })
	] }), (e, t) => /* @__PURE__ */ (0, L.jsx)("button", {
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
function vt({ state: e, draw: t, connection: n, hosts: r }) {
	let i = s(), a = (0, I.useSyncExternalStore)(Ye, Xe), o = n !== "lost" && e?.screen === "empty" && !!e.header.repo;
	(0, I.useLayoutEffect)(() => {
		U = r;
		let e = (e) => {
			let t = e.target;
			H.open && !r.sheet.contains(t) && !r.curtain.contains(t) && !Ze?.contains(t) && K();
		}, t = () => K(!1, !0), n = () => {
			G && !document.hidden && st();
		};
		return document.addEventListener("pointerdown", e, !0), r.curtain.addEventListener("click", t), document.addEventListener("visibilitychange", n), () => {
			document.removeEventListener("pointerdown", e, !0), r.curtain.removeEventListener("click", t), document.removeEventListener("visibilitychange", n), U = null, G = !1;
		};
	}, [r]), (0, I.useLayoutEffect)(() => {
		o !== G && (G = o, o ? (K(!0), et = !0, r.start.hidden = !1, st()) : (r.start.hidden = !0, r.start.classList.remove("enter")), Je({
			query: "",
			sel: -1,
			...o ? { recent: at() } : {}
		}));
	}, [o]), (0, I.useLayoutEffect)(() => {
		if (!e) return;
		let t = Me(e);
		t && t !== nt && (nt = t, ot(t)), $e && e.screen !== "empty" && K(!0);
	}, [t]), (0, I.useLayoutEffect)(() => {
		n === "lost" && K(!0);
	}, [n]), (0, I.useLayoutEffect)(() => {
		et ? ((G ? r.start : r.sheet).classList.add("enter"), (G ? r.sheet : r.start).classList.remove("enter"), et = !1, tt = !0, requestAnimationFrame(() => {
			tt = !1;
		})) : tt || (r.sheet.classList.remove("enter"), r.start.classList.remove("enter"));
	});
	let c = (0, I.useCallback)((e) => dt(e, i), [i]), l = /* @__PURE__ */ (0, L.jsx)(We, {
		files: a.files,
		ready: a.ready,
		query: a.query,
		sel: a.sel,
		recent: a.recent,
		fieldRef: ft,
		onQuery: pt,
		onSelect: mt,
		onPick: c,
		onEscape: ht,
		onLeave: gt
	});
	return /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)(Ge, {
		hosts: r,
		children: !o && l
	}), /* @__PURE__ */ (0, L.jsx)(Ke, {
		host: r.start,
		children: o && l
	})] });
}
// src/components/FileRail.tsx
var yt = "prevue.sharedOnce", bt = [], xt = [];
function St(e) {
	let t = xt.findIndex((e) => e.active), n = xt[Math.max(0, Math.min(xt.length - 1, t + e))];
	n && !n.active && M("/viewer/tab", { key: n.key });
}
function Ct(e) {
	let t = xt[e - 1];
	t && !t.active && M("/viewer/tab", { key: t.key });
}
var wt = () => xt.length, Tt = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
function Et(e) {
	let t = e.match(Tt) || [e], n = "";
	for (let e = t.length - 1; e > 0 && !(n && (t[e] + n).length > 12); e--) n = t[e] + n;
	return n.length >= e.length - 2 ? "" : n;
}
var Dt = null, Ot = (e, t) => (Dt ??= document.createElement("canvas").getContext("2d"), Dt.font = t, Dt.measureText(e).width), kt = (e) => {
	let t = getComputedStyle(e);
	return `${t.fontWeight} ${t.fontSize} ${t.fontFamily}`;
};
function At(e, t, n) {
	if (Ot(e, n) <= t) return e;
	let r = Et(e), i = r.match(Tt) || [], a = i.map((e, t) => i.slice(t).join(""));
	for (let [r, i] of [...a.map((e) => [e, 3]), [a[a.length - 1] || "", 1]]) for (let a = e.length - r.length - 1; a >= i; a--) {
		let i = e.slice(0, a) + "…" + r;
		if (Ot(i, n) <= t) return i;
	}
	for (let i = 1; i < r.length; i++) {
		let a = e[0] + "…" + r.slice(i);
		if (Ot(a, n) <= t) return a;
	}
	return e[0] + "…";
}
var jt = 56;
function Mt(e, t, n = !1) {
	let r = [...t.querySelectorAll(".rt:not(.leaving)")];
	if (!r.length || e.hidden) return;
	let i = (e, t) => e.querySelector(t), a = kt(i(r[0], ".rt-name")), o = kt(i(r[0], ".rt-mod")), s = parseFloat(getComputedStyle(r[0]).columnGap) || 0, c = (t) => t.dataset.name + "|" + i(t, ".rt-mod").textContent + "|" + e.clientWidth, l = r.filter((e) => n || e.dataset.fitted !== c(e));
	if (!l.length) return;
	for (let e of l) i(e, ".rt-mod").style.maxWidth = "0px";
	let u = l.map((e) => i(e, ".rt-name").clientWidth + (i(e, ".rt-mod").textContent ? s : 0));
	l.forEach((e, t) => {
		let n = i(e, ".rt-name"), r = i(e, ".rt-mod"), l = u[t], d = l;
		if (r.textContent) {
			let t = Math.min(Math.ceil(Ot(r.textContent, o)), Math.max(l - s - Math.ceil(Ot(e.dataset.name, a)), jt));
			r.style.maxWidth = t + "px", d = l - s - t;
		} else r.style.maxWidth = "";
		n.textContent = At(e.dataset.name, d, a), e.dataset.fitted = c(e);
	});
}
function Nt({ tab: e, leaving: t, enter: n, onGone: r, observe: i }) {
	let { phrase: a } = s(), o = (0, I.useRef)(null), [l, u] = (0, I.useState)(n);
	(0, I.useLayoutEffect)(() => {
		let e = o.current;
		c(e), i(e, !0);
		let t = 0;
		return l && (t = requestAnimationFrame(() => {
			t = requestAnimationFrame(() => u(!1));
		})), () => {
			cancelAnimationFrame(t), i(e, !1);
		};
	}, []), (0, I.useLayoutEffect)(() => {
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
	let d = R(e.sourceSet), f = () => M("/viewer/close", { key: e.key });
	return /* @__PURE__ */ (0, L.jsxs)("div", {
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
			e.active || M("/viewer/tab", { key: e.key });
		},
		onAuxClick: (e) => {
			e.button === 1 && (e.preventDefault(), f());
		},
		children: [
			/* @__PURE__ */ (0, L.jsx)(z, { kind: d }),
			/* @__PURE__ */ (0, L.jsx)("span", { className: "rt-name" }),
			/* @__PURE__ */ (0, L.jsx)("span", {
				className: "rt-mod",
				children: ((e.dim || "") + (e.module ? " · " + e.module : "")).replace(/^\s*·\s*/, "")
			}),
			/* @__PURE__ */ (0, L.jsx)("button", {
				type: "button",
				className: "rt-x",
				tabIndex: -1,
				"aria-label": a("tabs.close"),
				onClick: (e) => {
					e.stopPropagation(), f();
				},
				children: /* @__PURE__ */ (0, L.jsx)("svg", {
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, L.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
				})
			})
		]
	});
}
function Pt({ tabs: e, screen: t, hosts: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n?.list), [c, l] = (0, I.useState)(null), [u, d] = (0, I.useState)(null), f = n?.rail ?? c, p = n?.empty ?? u, m = (0, I.useRef)(null), h = e ?? bt, g = t !== "focus", _ = (0, I.useRef)(h), [v, y] = (0, I.useState)([]);
	if (_.current !== h) {
		let e = new Set(h.map((e) => e.key)), t = _.current.filter((t) => !e.has(t.key) && !v.some((e) => e.key === t.key));
		(t.length || v.some((t) => e.has(t.key))) && y([...v.filter((t) => !e.has(t.key)), ...t]), _.current = h;
	}
	let b = (e) => y((t) => t.filter((t) => t.key !== e)), x = (0, I.useRef)(!1), S = (0, I.useRef)(null), C = x.current && g && !_e.matches && !document.hidden, w = (0, I.useRef)({
		y: 0,
		stretch: null,
		sliding: !1
	}), T = (e) => {
		let t = m.current, n = w.current;
		if (!t || !i) return;
		let r = i.querySelector(".rt.active:not(.leaving)");
		if (t.hidden = !r, !r) return;
		let a = r.offsetTop;
		e && !_e.matches && a !== n.y ? (n.stretch?.cancel(), n.sliding = !0, (n.stretch = t.animate([{ transform: `translateY(${n.y}px)` }, { transform: `translateY(${a}px)` }], {
			duration: he("--duration-medium2"),
			easing: ge("--easing-standard")
		})).finished.then(() => {
			n.stretch = null, n.sliding = !1;
		}, () => {})) : n.stretch && !e && (n.stretch.cancel(), n.stretch = null, n.sliding = !1), n.y = a, t.style.transform = `translateY(${a}px)`;
	}, E = (0, I.useRef)(T);
	E.current = T;
	let [D] = (0, I.useState)(() => new ResizeObserver(() => E.current(w.current.sliding))), O = (e, t) => {
		e && (t ? D.observe(e) : D.unobserve(e));
	};
	(0, I.useEffect)(() => () => D.disconnect(), [D]), (0, I.useEffect)(() => {
		f && i && document.fonts?.ready.then(() => Mt(f, i, !0));
	}, [f, i]), (0, I.useLayoutEffect)(() => {
		if (!e || !f || !i) return;
		f.hidden = !g, n && document.body.classList.toggle("rail-on", g), p && (p.hidden = e.length > 0), Mt(f, i), xt = e;
		let t = e.find((e) => e.active);
		t && R(t.sourceSet) === "kmp" ? le(yt, () => r("capsule.sharedOnce", { sourceSet: t.sourceSet })) : ae(yt);
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
	}))], A = /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("div", {
		className: "rail-glider instant",
		id: "railGlider",
		ref: m,
		hidden: !0
	}), k.map(({ tab: e, leaving: t }) => /* @__PURE__ */ (0, L.jsx)(Nt, {
		tab: e,
		leaving: t,
		enter: C,
		onGone: b,
		observe: O
	}, e.key))] });
	return n ? /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [a(A, () => null), /* @__PURE__ */ (0, L.jsx)(_t, { host: n.open })] }) : /* @__PURE__ */ (0, L.jsxs)("nav", {
		className: "rail",
		id: "rail",
		ref: l,
		"aria-label": r("rail.title"),
		children: [
			/* @__PURE__ */ (0, L.jsx)("h4", {
				className: "rail-h",
				children: r("rail.title")
			}),
			a(A, (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
				className: "rail-list",
				id: "railList",
				ref: e,
				role: "tablist",
				"aria-orientation": "vertical",
				children: t
			})),
			/* @__PURE__ */ (0, L.jsx)("p", {
				className: "rail-empty",
				id: "railEmpty",
				ref: d,
				hidden: !0,
				children: r("rail.empty")
			}),
			/* @__PURE__ */ (0, L.jsx)(_t, {})
		]
	});
}
// src/components/ProjectHeader.tsx
var Ft = 8, It = (e) => [...e].reduce((e, t) => e * 31 + t.codePointAt(0) >>> 0, 7) % Ft + 1, Lt = () => !1, Rt = () => Lt();
function zt({ header: e, tabs: t, app: n, iconUrl: r = "/app-icon.png", host: i, brand: a }) {
	let { phrase: c } = s(), { element: l, place: u } = o(i), [d, f] = (0, I.useState)(!1), [p, m] = (0, I.useState)(null), h = (0, I.useRef)({
		open: !1,
		byKey: !1
	}), g = (0, I.useRef)(null), _ = (0, I.useRef)(null), v = (0, I.useRef)(null), y = e ? n?.name || e.repoLeaf : "";
	(0, I.useLayoutEffect)(() => {
		a && n?.prevue && (a.title = `Prevue ${n.prevue}`);
	}, [a, n]), (0, I.useLayoutEffect)(() => {
		v.current?.style.setProperty("background", e ? `var(--avatar-${It(y)})` : "");
	}, [e, y]), (0, I.useLayoutEffect)(() => {
		if (!e || !i) return;
		let n = t.find((e) => e.active);
		document.title = n ? `${n.name} — ${y}` : y;
	}, [
		e,
		i,
		t,
		y
	]), (0, I.useEffect)(() => {
		Lt = () => {
			if (!h.current.open) return !1;
			h.current.open = !1;
			let e = document.activeElement;
			return e && _.current?.contains(e) && (h.current.byKey ? g.current?.focus({ preventScroll: !0 }) : e.blur()), m(null), !0;
		};
		let e = (e) => {
			!_.current?.contains(e.target) && e.target !== g.current && Lt();
		};
		return addEventListener("pointerdown", e), () => {
			removeEventListener("pointerdown", e), Lt = () => !1;
		};
	}, []);
	let b = (e, t) => {
		navigator.clipboard.writeText(e).then(() => P(c("header.copied", {
			what: t,
			text: e
		})), () => P(e));
	}, x = (e) => {
		Lt() || (h.current = {
			open: !0,
			byKey: e.detail === 0
		}, m({ left: Math.round(e.currentTarget.getBoundingClientRect().left - (l?.getBoundingClientRect().left ?? 0) - 6) }));
	}, S = e ? [
		e.module,
		e.sourceSet && /* @__PURE__ */ (0, L.jsx)("span", {
			title: c("header.sourceSet", { variant: e.variant }),
			children: e.sourceSet
		}, "ss"),
		e.variant
	].filter(Boolean).flatMap((e, t) => [" · ", /* @__PURE__ */ (0, L.jsx)(I.Fragment, { children: e }, t)]) : [];
	return u(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
		/* @__PURE__ */ (0, L.jsx)("span", {
			className: "app-tile",
			id: "appTile",
			ref: v,
			"aria-hidden": "true",
			hidden: d,
			children: [...y][0] || ""
		}),
		/* @__PURE__ */ (0, L.jsx)("img", {
			className: "app-icon",
			id: "appIcon",
			alt: "",
			hidden: !d,
			src: n?.icon ? r : void 0,
			onLoad: () => f(!0)
		}),
		/* @__PURE__ */ (0, L.jsxs)("div", {
			className: "app-t",
			children: [/* @__PURE__ */ (0, L.jsx)("div", {
				className: "app-name",
				id: "appName",
				children: y
			}), /* @__PURE__ */ (0, L.jsxs)("div", {
				className: "proj",
				id: "proj",
				children: [
					/* @__PURE__ */ (0, L.jsx)("button", {
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
					/* @__PURE__ */ (0, L.jsxs)("button", {
						className: "pj pj-br",
						id: "pjBr",
						type: "button",
						title: c("brand.copyBranch"),
						hidden: !e?.branch,
						onClick: () => b(e?.branch || "", c("header.copy.branch")),
						children: [/* @__PURE__ */ (0, L.jsxs)("svg", {
							viewBox: "0 0 16 16",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "1.5",
							strokeLinecap: "round",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, L.jsx)("circle", {
									cx: "5",
									cy: "3.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, L.jsx)("circle", {
									cx: "5",
									cy: "12.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, L.jsx)("circle", {
									cx: "11",
									cy: "5.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, L.jsx)("path", { d: "M5 5v6M11 7c0 2.5-6 2-6 4" })
							]
						}), /* @__PURE__ */ (0, L.jsx)("span", {
							id: "pjBrName",
							children: e?.branch || ""
						})]
					}),
					/* @__PURE__ */ (0, L.jsx)("span", {
						className: "pj-rest",
						id: "pjRest",
						children: S
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, L.jsxs)("div", {
			className: `pop dir-pop${p ? " on" : ""}`,
			id: "dirPop",
			ref: _,
			role: "dialog",
			"aria-label": c("header.dir"),
			style: p ? { left: `${p.left}px` } : void 0,
			children: [/* @__PURE__ */ (0, L.jsx)("div", {
				className: "dir-path",
				id: "dirPath",
				children: (e?.repo || "").split(/(?<=\/)/).flatMap((e, t) => [e, /* @__PURE__ */ (0, L.jsx)("wbr", {}, t)])
			}), /* @__PURE__ */ (0, L.jsxs)("div", {
				className: "dir-act",
				children: [/* @__PURE__ */ (0, L.jsx)("button", {
					type: "button",
					id: "dirCopy",
					onClick: () => {
						b(e?.repo || "", c("header.copy.path")), Lt();
					},
					children: c("header.dir.copy")
				}), /* @__PURE__ */ (0, L.jsx)("button", {
					type: "button",
					id: "dirReveal",
					hidden: n ? !n.reveal : !1,
					onClick: () => {
						M("/viewer/reveal"), Lt();
					},
					children: c("header.dir.reveal")
				})]
			})]
		})
	] }), (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
		className: "app",
		id: "app",
		ref: e,
		children: t
	}));
}
// src/preparation/PreparationScreen.ts
function Bt() {
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
	async function ee() {
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
			S(ee, 300);
		}
	}
	function te(e, t) {
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
	async function M(e, r) {
		if (await b(), await b(), !o || r !== h) return;
		let i = te(e, !0);
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
	}), addEventListener("resize", A), ee(), {
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
			let i = te(e, !1);
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
			M(e, u).catch((e) => {
				o && u === h && j(e.message);
			});
		},
		fail: j
	};
}
// src/components/ShortcutHelp.tsx
var Vt = !1, Ht = null, Ut = null, Wt = null, Gt = () => Vt;
function Kt(e = !Vt, t = !1) {
	if (!Ut) return;
	let { scrim: n, sheet: r } = Ut;
	e && !Vt && (Ht = t && document.activeElement !== document.body ? document.activeElement : null), Vt = e, e ? (n.hidden = !1, requestAnimationFrame(() => {
		Vt && (n.classList.add("on"), r.focus({ preventScroll: !0 }));
	})) : (n.classList.remove("on"), setTimeout(() => {
		Vt || (n.hidden = !0);
	}, 220), n.contains(document.activeElement) && document.activeElement.blur(), Ht && Ht.isConnected && Ht.focus({ preventScroll: !0 }), Ht = null), Wt?.setAttribute("aria-expanded", String(e));
}
var qt = (0, I.memo)(function({ table: e, logo: t = "prevue.svg", host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = (0, I.useRef)(null);
	return (0, I.useLayoutEffect)(() => {
		if (!i || !c.current) return;
		Ut = {
			scrim: i,
			sheet: c.current
		};
		let e = (e) => {
			e.target === i && Kt(!1);
		};
		return i.addEventListener("click", e), () => {
			i.removeEventListener("click", e), Ut = null;
		};
	}, [i]), a(/* @__PURE__ */ (0, L.jsxs)("div", {
		className: "sheet",
		ref: c,
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "helpTitle",
		tabIndex: -1,
		children: [
			/* @__PURE__ */ (0, L.jsxs)("div", {
				className: "sheet-brand",
				children: [/* @__PURE__ */ (0, L.jsx)("img", {
					src: t,
					alt: ""
				}), "Prevue"]
			}),
			/* @__PURE__ */ (0, L.jsx)("h2", {
				id: "helpTitle",
				children: r("help.title")
			}),
			/* @__PURE__ */ (0, L.jsx)("div", {
				className: "sheet-body",
				children: e.map((e) => [/* @__PURE__ */ (0, L.jsx)("h3", { children: e.group }, `h${e.group}`), /* @__PURE__ */ (0, L.jsx)("dl", { children: e.rows.map((e, t) => [/* @__PURE__ */ (0, L.jsx)("dt", { children: e.cap.map((t, n) => [n && e.combo ? /* @__PURE__ */ (0, L.jsx)("span", {
					className: "plus",
					children: "+"
				}, `p${n}`) : null, /* @__PURE__ */ (0, L.jsx)("kbd", { children: t }, `k${n}`)]) }, `t${t}`), /* @__PURE__ */ (0, L.jsx)("dd", { children: e.label }, `d${t}`)]) }, `l${e.group}`)])
			})
		]
	}), (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
		className: "scrim",
		id: "help",
		ref: e,
		hidden: !0,
		children: t
	}));
}), Jt = (0, I.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, I.useLayoutEffect)(() => {
		if (!n) return;
		Wt = n, n.title = t("header.help.tip"), n.setAttribute("aria-label", t("header.help"));
		let e = (e) => Kt(!Vt, e.detail === 0);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), Wt = null;
		};
	}, [n, t]), r("?", (e, t) => /* @__PURE__ */ (0, L.jsx)("button", {
		className: "icon-btn",
		id: "helpBtn",
		ref: e,
		type: "button",
		"aria-haspopup": "dialog",
		"aria-expanded": "false",
		children: t
	}));
}), Yt = Promise.resolve();
async function Xt(e, t, n) {
	let r = await M("/viewer/touch", {
		x: t,
		y: n,
		type: e
	});
	r.ok || P(k("input.touch.failed", { status: r.status }));
}
function Zt(e, t, n) {
	Yt = Yt.then(() => Xt(e, t, n)).catch(() => {});
}
var q = null, Qt = () => !!q;
function $t(e, t) {
	q = [e, t], Zt("press", e, t);
}
function en(e, t) {
	q && Math.abs(e - q[0]) + Math.abs(t - q[1]) > 6 && (q = [e, t], an(e, t));
}
function tn(e, t) {
	q && (q = null, Zt("release", e, t));
}
var nn = null, rn = !1;
function an(e, t) {
	nn = [e, t], rn || (rn = !0, Yt = Yt.then(() => {
		rn = !1;
		let e = nn;
		return nn = null, e ? Xt("drag", e[0], e[1]) : null;
	}).catch(() => {}));
}
var J = null;
function on(e, t, n, r) {
	J ? (J.dx += n, J.dy += r, J.x = e, J.y = t) : (J = {
		x: e,
		y: t,
		dx: n,
		dy: r
	}, Yt = Yt.then(() => {
		let e = J;
		return J = null, M("/viewer/wheel", {
			x: Math.round(e.x),
			y: Math.round(e.y),
			dx: e.dx,
			dy: e.dy
		});
	}).catch(() => {}));
}
// src/workspace/card.ts
var sn = (e) => ({
	id: String(e.id),
	name: e.name || `${e.fileName}:${e.lineNumber}`
});
function cn(e, t) {
	let n = new Map(e.map((e) => [e.id, e])), r = (e) => {
		for (let t = e.ups.length - 1; t >= 0; t--) if (n.has(e.ups[t])) return e.ups[t];
		return null;
	}, i = r(t), a = e.filter((e) => r(e) === i).sort((e, t) => e.id - t.id);
	return {
		ups: t.ups.filter((e) => n.has(e)).map((e) => sn(n.get(e))),
		here: sn(t),
		before: a.filter((e) => e.id < t.id).map(sn),
		after: a.filter((e) => e.id > t.id).map(sn),
		downs: e.filter((e) => r(e) === t.id).sort((e, t) => e.id - t.id).map(sn)
	};
}
function ln(e, t) {
	let [n, r, i, a] = e.bounds, o = t ?? 1;
	return {
		width: (i - n) * o,
		height: (a - r) * o,
		unit: t ? "dp" : "px",
		padded: !!e.mods?.some((e) => e.name === "padding")
	};
}
function un(e) {
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
function dn(e, t) {
	if (!t || !e) return null;
	let n = t.modules.get(e);
	return n ? { module: n } : "compose";
}
function fn(e, t, n) {
	return !t || !e ? [] : (t.callers.get(e) || []).filter((e) => e.file !== n.file || e.fn !== n.fn);
}
// src/workspace/view.ts
function pn(e) {
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
var Y = pn({
	pct: 100,
	real: !1,
	atFit: !0,
	menu: !1,
	disabled: !1
}), mn = pn({
	on: !1,
	failed: !1
}), hn = pn({
	host: null,
	shot: null,
	card: null
}), gn = (e, t) => e.every((e, n) => e === t[n]);
function _n(e) {
	if (e.modifiers) return e.modifiers;
	for (let t of e.children || []) if (gn(t.bounds, e.bounds)) {
		let e = _n(t);
		if (e) return e;
	}
	return null;
}
function vn(e) {
	let t = F.projectFiles.size ? (e) => F.projectFiles.has(e.fileName) : () => !0, n = [], r = (e, i, a, o) => {
		for (let s of e) {
			let { children: e, modifiers: c, ...l } = s, [u, d, f, p] = s.bounds, m = i.concat(s.name ? [s.name] : []), h = s.name && t(s) ? a.concat([s.name]) : a, g = o;
			if (f > u && p > d && s.lineNumber > 0) {
				let e = n.length;
				n.push({
					...l,
					id: e,
					ups: o,
					mods: _n(s),
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
var yn = (e, t) => e.area - t.area || t.chain.length - e.chain.length;
function bn(e) {
	return F.projectFiles.size ? e.filter((e) => F.projectFiles.has(e.fileName)) : e;
}
function xn(e, t, n) {
	return e.find((e) => {
		let [r, i, a, o] = e.bounds;
		return t >= r && t < a && n >= i && n < o;
	});
}
var Sn = (e) => +(e.dataset.fullW ?? 0) || e.naturalWidth;
function Cn(e) {
	return Sn(e) ? e.getBoundingClientRect().width / Sn(e) : 1;
}
function wn(e, t) {
	let n = t.getBoundingClientRect(), r = Cn(t) || 1;
	return [Math.round((e.clientX - n.left) / r), Math.round((e.clientY - n.top) / r)];
}
function Tn(e, t, n) {
	let [r, i, a, o] = t.bounds;
	e.style.left = r * n + "px", e.style.top = i * n + "px", e.style.width = (a - r) * n + "px", e.style.height = (o - i) * n + "px";
}
function En(e, t, n) {
	e.hidden = !1, Tn(e, t, n);
}
function Dn(e, t, n) {
	t ? (Tn(e, t, n), e.classList.add("on")) : e.classList.remove("on");
}
function On(e, t) {
	t.classList.remove("over"), t.classList.contains("peek") || Dn(e, null, 1);
}
var kn = /* @__PURE__ */ new WeakMap();
function An(e, t, n) {
	let r = kn.get(e);
	r && r.list === t && r.s === n || (kn.set(e, {
		list: t,
		s: n
	}), F.projectFiles.size ? e.replaceChildren(...t.map((e) => {
		let t = document.createElement("div");
		return t.className = "ol", Tn(t, e, n), t;
	})) : e.replaceChildren());
}
async function jn(e, t, n) {
	let r = ++X;
	try {
		let i = await M("/viewer/point", {
			fileName: e.fileName,
			line: e.lineNumber,
			node: e.name || null,
			chain: e.chain || [],
			userChain: e.uchain || e.chain || [],
			bounds: e.bounds,
			previewId: t
		}).then((e) => e.json());
		if (r !== X) return;
		i.ref ? Nn(i.ref, n, i.file) : i.needChoice || n(O(i.message ?? null) || `${e.fileName}:${e.lineNumber}`);
	} catch (e) {
		if (r === X) {
			let t = e.message;
			n(k("point.failed", { why: t })), P(k("point.failed", { why: t }));
		}
	}
}
var X = 0, Mn = (e) => navigator.clipboard ? navigator.clipboard.writeText(e) : Promise.reject(Error(k("point.noClipboard")));
function Nn(e, t, n) {
	let r = ++X, i = () => {
		r === X && t(k("point.copied", { ref: e }), e, !0, n);
	}, a = () => {
		Mn(e).then(i, () => {
			r === X && t(k("point.copyBlocked", { ref: e }), e, !1, n);
		});
	};
	Mn(e).then(i, () => {
		r === X && t(k("point.copyRetry", { ref: e }), e, !1, n, a);
	});
}
var Pn = (e) => {
	e && P(e);
}, Fn = Pn, In = null, Ln = null, Rn = 0;
function zn() {
	In = null, Ln = null, Rn++;
}
function Bn() {
	if (In) return Promise.resolve(In);
	let e = Rn;
	return Ln ??= j().then((t) => e === Rn ? (Ln = null, t.ready ? In = un(t) : null) : null, () => (e === Rn && (Ln = null), null));
}
var Z = null, Vn = /* @__PURE__ */ new WeakMap();
function Hn(e) {
	let t = Vn.get(e);
	return t || Vn.set(e, t = () => e.isConnected ? e.getBoundingClientRect() : null), t;
}
var Un = () => Z?.img ?? null;
function Wn(e, t) {
	for (let t of document.querySelectorAll(".box.pick")) t !== e.pick && (t.hidden = !0);
	Z && Z.hover !== e.hover && Dn(Z.hover, null, 1), En(e.pick, t, e.scale()), e.pick.style.animation = "none", e.pick.offsetWidth, e.pick.style.animation = "", Z = {
		...e,
		hit: t,
		shot: Hn(e.img)
	};
	let n = Gn(t);
	Fn = n, jn(t, e.previewId, n);
}
function Gn(e) {
	let t = Z, n = F.projectFiles.size ? cn(t.list, e) : null, r = {
		msg: null,
		ref: `${e.fileName}:${e.lineNumber}`
	}, i = () => ({
		node: e,
		say: r,
		box: ln(e, t.dpPerPx),
		tree: n,
		modifiers: e.mods,
		previews: fn(e.name, In, t.seen),
		origin: dn(e.name, In)
	}), a = () => {
		Z?.hit === e && hn.set({
			host: t.host,
			shot: t.shot,
			card: i()
		});
	};
	return a(), In || Bn().then((e) => {
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
function Kn(e) {
	let t = Z?.list.find((t) => String(t.id) === e.id);
	Z && t && Wn(Z, t);
}
function qn(e) {
	if (!Z) return;
	let t = e ? Z.list.find((t) => String(t.id) === e.id) ?? null : null;
	Dn(Z.hover, t, Z.scale()), t && An(Z.marks, Z.list, Z.scale()), Z.marks.classList.toggle("peek", !!t);
}
async function Jn(e) {
	Q();
	let t = F.st;
	if (x(e.file, e.fn), e.file === Me(t)) {
		t?.screen === "focus" && t.focus ? M("/viewer/exit") : f();
		return;
	}
	let n = await M("/viewer/open", {
		file: e.file,
		fn: e.fn
	}).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: k("open.failed", { why: e.message })
	}));
	n.ok || (m(), P(O(n.message ?? null) || k("open.cannot")));
}
function Q() {
	for (let e of document.querySelectorAll(".box.pick")) e.hidden = !0;
	Z && (Dn(Z.hover, null, 1), Z.marks.classList.remove("peek")), Z = null, hn.set({
		host: null,
		shot: null,
		card: null
	}), Fn = Pn, X++;
}
function Yn() {
	return Z ? (Q(), !0) : !1;
}
function Xn() {
	addEventListener("pointerdown", (e) => {
		if (!Z || e.button !== 0) return;
		let t = e.target;
		t?.closest && t.closest("main") && !t.closest(".point-card, .cstage, #stage") && Q();
	}, !0);
}
async function Zn(e) {
	let t = await M("/viewer/choose", { path: e }).then((e) => e.json()).catch(() => ({}));
	t.ref && Nn(t.ref, Fn, t.file);
}
function Qn() {
	M("/viewer/cancel");
}
var $n = 8, er = 16;
function tr(e) {
	let t = document.documentElement, n = t.clientWidth, r = t.clientHeight, i = e.offsetWidth, a = e.offsetHeight, o = document.querySelector(".pc-float:not([data-leaving]) .pc-head"), s = o && o.getClientRects().length && getComputedStyle(o).visibility !== "hidden" ? o.getBoundingClientRect() : null, c, l, u = !1;
	s ? (c = s.left, l = s.bottom + $n, l + a > r - er && s.top - $n - a >= er && (l = s.top - $n - a, u = !0)) : (c = (n - i) / 2, l = document.getElementById("bar").getBoundingClientRect().bottom + er), c = Math.max(er, Math.min(c, n - i - er)), l = Math.max(er, Math.min(l, r - a - er));
	let d = Math.round(c) + "px", f = Math.round(l) + "px";
	e.style.left !== d && (e.style.left = d), e.style.top !== f && (e.style.top = f), e.classList.toggle("up", u);
}
var nr = !1;
function rr(e) {
	if (tr(e), nr) return;
	nr = !0;
	let t = () => {
		e.classList.contains("on") ? (tr(e), requestAnimationFrame(t)) : nr = !1;
	};
	requestAnimationFrame(t);
}
function ir(e, { stage: t, img: n, box: r, pick: i, marks: a }, o) {
	let s = null, c = !1, l = async () => {
		let t = F.st && F.st.board && xe(e);
		if (!t || !t.ok || !t.treeUrl) return null;
		let n = D.get(t.treeUrl);
		if (n) return s = n, s;
		try {
			s = bn(vn((await te(t.treeUrl).then((e) => e.json())).composeViewInfo || []).sort(yn)), D.set(t.treeUrl, s);
		} catch {
			s = null;
		}
		return s;
	};
	t.addEventListener("mouseenter", () => {
		s = null, c = !0, a.classList.add("over"), l().then((e) => {
			e && c && An(a, e, Cn(n));
		});
	}, { signal: o }), t.addEventListener("mouseleave", () => {
		c = !1, On(r, a);
	}, { signal: o }), n.addEventListener("mousemove", (e) => {
		s && Dn(r, xn(s, ...wn(e, n)) ?? null, Cn(n));
	}, { signal: o }), n.addEventListener("load", () => {
		s = null, Z?.img === n && Q();
	}, { signal: o }), o.addEventListener("abort", () => {
		Z?.img === n && Q();
	}), n.addEventListener("click", async (o) => {
		C(e);
		let c = s || await l();
		if (!c) return;
		let u = xn(c, ...wn(o, n));
		if (!u) {
			Z?.img === n && Q();
			return;
		}
		let d = xe(e), f = Sn(n);
		Wn({
			list: c,
			img: n,
			hover: r,
			pick: i,
			marks: a,
			host: document.getElementById("boardView"),
			scale: () => Cn(n),
			previewId: d.previewId,
			dpPerPx: d.widthDp && f ? d.widthDp / f : null,
			seen: {
				file: F.st?.board?.file ?? null,
				fn: t.closest(".card")?.dataset.fn ?? null
			}
		}, u);
	}, { signal: o });
}
// src/workspace/resize.ts
var ar = (e) => e ? e.kind === "device" ? `${e.device === "duo" ? "ipduo" : e.device}:${e.folded ? "cover" : "open"}${e.landscape ? ":rot" : ""}${e.orientation === "landscape-right" ? ":right" : ""}` : e.preset || `custom:${e.widthDp}x${e.heightDp}` : "original";
function or(e, t, n) {
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
function sr({ root: e, geometry: t, shot: n, stage: r, wrap: i, layout: a, dimensions: o, originalSize: s, zoomState: c, preparation: l, firstFrame: u }) {
	let d = null, f = !1, p = null, m = null, h = null, g = null, _ = null, v = 0, y = null, b = !1, x = !1, S = !1, C = null, w = /* @__PURE__ */ new Map(), T = /* @__PURE__ */ new Map(), E = (e) => (T.has(e.src) || T.set(e.src, or(e, e.naturalWidth, e.naturalHeight)), T.get(e.src)), D = Se(e, {
		request: (e) => {
			if (S) return Promise.resolve(!1);
			let [t, n, ...r] = e.split(":"), i = D.devices.has(t) ? {
				device: t === "ipduo" ? "duo" : t,
				folded: n === "cover",
				orientation: r.includes("right") ? "landscape-right" : D.sizeOf(e).w > D.sizeOf(e).h ? "landscape-left" : "portrait"
			} : { size: e.startsWith("custom:") ? e.slice(7) : e };
			return M("/viewer/resize", i).then((e) => {
				if (!e.ok) throw Error(`HTTP ${e.status}`);
				return !0;
			}).catch((e) => (P(k("resize.failed", { why: e.message })), !1));
		},
		layout: (t, n) => {
			if (!f) return;
			let i = c();
			d && i.z !== 1 && (i.x += (1 - i.z) * (d.cx - d.w / 2 - (t.cx - t.w / 2)), i.y += (1 - i.z) * (d.y - t.y)), d = t, a(t), ae(), r.classList.toggle("resize-hidden", n || !b && !S), e.classList.toggle("await-live", !b);
		}
	});
	function O(t, r = !1) {
		S = t, e.classList.toggle("preparing", t), n.setAttribute("aria-busy", String(t && !r)), mn.set({
			on: t,
			failed: r
		});
		for (let n of e.querySelectorAll("input")) n.disabled = t;
		for (let e of document.querySelectorAll("#pnSum, #pnPick button, #devCtl button")) e.disabled = t;
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
				edge: or(e, e.width, e.height)
			});
		} catch {}
	}
	function ee(e) {
		if (!w.has(e)) {
			let t = new Image();
			t.src = e, w.set(e, t.decode().then(() => t).catch((t) => {
				throw w.delete(e), t;
			}));
		}
		return w.get(e);
	}
	function te(e) {
		let t = /* @__PURE__ */ new Set([e.imageUrl, ...(e.postures || []).map((e) => e.imageUrl)]);
		for (let e of w.keys()) t.has(e) || w.delete(e);
		let n = new Set([...t].map((e) => new URL(e, location.href).href));
		for (let e of T.keys()) n.has(e) || T.delete(e);
	}
	function ne(e) {
		let t = e.size;
		return {
			sel: ar(t),
			w: t?.widthDp || y?.w || 411,
			h: t?.heightDp || y?.h || 891
		};
	}
	function N(a, c) {
		if (!a?.interactive) return ie(), !1;
		let l = p !== a.previewId;
		if (l && ie(), f = !0, r.parentElement !== t && t.append(r), document.body.classList.add("resizing-ui"), i.classList.add("resize-wrap"), l || !p) {
			p = a.previewId, O(!0), n.removeAttribute("src"), n.dataset.url = "";
			let t = s(), r = o(), i = a.pxPerDp || 2.625, c = !!(t?.w && t?.h || r.w && r.h);
			y = {
				w: t?.w || r.w / i || 411,
				h: t?.h || r.h / i || 891,
				img: null
			}, e.classList.toggle("measuring", !a.size && !c), D.setOriginal(y.w, y.h, null), D.enable(!0);
		}
		let d = ar(a.size), w = !!m && d !== h;
		w && (j(), x = !0, b = !1, r.classList.add("resize-hidden"));
		let T = m;
		m = a, h = d, T && !w && a.imageUrl !== T.imageUrl && D.clearImages();
		for (let e of a.postures || []) {
			let t = v;
			ee(e.imageUrl).then((n) => {
				f && t === v && m?.postures?.some((t) => t.imageUrl === e.imageUrl) && D.image(ar(e.size), A(n, e.size));
			}).catch(() => {});
		}
		if (y && D.update(ne(a), !T), c) return b = !1, _ = g = null, n.onload = null, n.removeAttribute("src"), O(!0, !0), r.classList.remove("resize-hidden"), !0;
		if (S && O(!0, !!c), !c && !document.hidden && a.streamUrl && (!x || a.streamUrl !== g || a.imageUrl !== T?.imageUrl) && (a.streamUrl !== g || !b || w)) {
			let t = `${v}:${d}:${a.streamUrl}:${a.imageUrl}`;
			if (_ !== t) {
				_ = t;
				let i = v;
				ee(a.imageUrl).then((s) => {
					if (!f || document.hidden || i !== v || _ !== t || h !== d) return;
					let c = a.size;
					if (!c) {
						let e = a.pxPerDp || 2.625, t = {
							w: s.naturalWidth / e,
							h: s.naturalHeight / e,
							img: A(s, c)
						}, n = y?.w !== t.w || y.h !== t.h;
						y = t, D.setOriginal(y.w, y.h, y.img), (S || n) && D.update(ne(a), S);
					}
					D.image(d, A(s, c)), g = a.streamUrl, x = !1, o(s.naturalWidth, s.naturalHeight), n.onload = () => {
						if (n.onload = null, !f || document.hidden || i !== v || h !== d || g !== a.streamUrl) return;
						b = !0;
						let t = S;
						O(!1), e.classList.remove("await-live", "measuring"), r.classList.toggle("resize-hidden", D.moving()), n.dataset.still = a.imageUrl, n.src = n.dataset.url = re(a.streamUrl), t && !u() && !_e.matches && (C = n.animate([{ opacity: 0 }, { opacity: 1 }], {
							duration: he("--duration-short3"),
							easing: ge("--easing-decelerate")
						}));
					}, n.src = a.imageUrl, n.dataset.url = a.imageUrl;
				}).catch((e) => {
					i === v && (_ = null, S && O(!0, !0), P(k("resize.image.failed", { why: e.message })));
				});
			}
		}
		return te(a), !0;
	}
	function ie() {
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
	function ae() {
		if (!d) return;
		let e = c(), n = d.cx - d.w / 2, r = d.y;
		t.style.transform = `translate(${e.x + (1 - e.z) * n}px, ${e.y + (1 - e.z) * r}px) scale(${e.z})`;
	}
	return {
		update: N,
		disable: ie,
		preparing: () => S,
		suspend() {
			v++, g = _ = null, n.onload = null;
		},
		zoom(e) {
			return f ? (t.classList.toggle("zoom-anim", !!e), ae(), !0) : !1;
		},
		relayout: () => {
			f && D.relayout();
		},
		closeMenu: () => D.closeMenu(),
		pxPerDp: () => f && d ? d.s : null,
		moving: () => f && (!b || D.moving())
	};
}
// src/workspace/focus.ts
function cr() {
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
		geometry: e("resizeGeometry"),
		panel: e("panel"),
		header: [e("back"), e("wsTitle")]
	};
}
function lr({ focusView: e, wrap: t, stage: n, shot: r, box: i, pickBox: a, marks: o, scene: s, geometry: c, panel: l, header: u }) {
	let d = [], f = [], p = !1;
	function m() {
		p && (f = bn(d));
	}
	function h() {
		if (e.hidden) return;
		let n = getComputedStyle(document.documentElement), r = parseInt(n.getPropertyValue("--cap-room")) || 76, i = document.body.classList.contains("resizing-ui"), a = window.innerHeight - t.getBoundingClientRect().top - (i ? 0 : r + 16), o = parseInt(n.getPropertyValue("--stage-min-h")) || 260, s = Math.max(o, Math.round(a));
		document.documentElement.style.setProperty("--view-h", s + "px");
		let c = getComputedStyle(t), l = s - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
		document.documentElement.style.setProperty("--stage-max-h", l + "px"), H.relayout(), t.classList.contains("resize-wrap") || b(l - 2), Ne(), C();
	}
	let g = 0, _ = 0, v = () => (r.getAttribute("src") || "").startsWith("/stream");
	function y() {
		(r.getAttribute("src") || "").startsWith("data:") || !r.naturalWidth || v() && g || (g = r.naturalWidth, _ = r.naturalHeight, r.dataset.fullW = String(g));
	}
	function b(e) {
		r.style.width = g ? Math.min(g, e * g / _) + "px" : "";
	}
	let x = 0, S = 0;
	function C() {
		!document.hidden && v() && !e.hidden && g && (clearTimeout(S), S = window.setTimeout(() => {
			if (H.moving()) {
				C();
				return;
			}
			let e = Math.round(r.offsetWidth * devicePixelRatio * z.z);
			e && e !== x && (x = e, ne(e).catch(() => {}));
		}, 120));
	}
	let T = null, E = Promise.resolve();
	function D(e) {
		return e === T ? E : (T = e, E = O(e));
	}
	async function O(e) {
		try {
			let t = await te(e).then((e) => {
				if (!e.ok) throw Error(k("focus.tree.http", { status: e.status }));
				return e.json();
			});
			if (e !== T) return;
			if (t.failure) {
				p = !1;
				return;
			}
			d = vn(t.composeViewInfo || []).sort(yn), f = bn(d), ce(F.projectFiles.size ? "" : k("focus.noIndex", { n: d.length })), p = !0, Dn(i, null, 1), a.hidden = !0, Un() === r && Q();
		} catch (e) {
			se(k("focus.tree.failed", { why: e.message }), "error");
		}
	}
	function A(e) {
		let t = !!(e && e.interactive);
		if (l.hidden = !e, e || Ve(), n.classList.toggle("live", t), De = e && e.pxPerDp || null, e && e.previewId === B || (H.disable(), B = e ? e.previewId : null, g = _ = 0, delete r.dataset.fullW, r.style.width = "", V(1, 0, 0, !1)), !e) {
			j?.entering && ie(), H.disable(), r.hasAttribute("src") && (r.removeAttribute("src"), r.dataset.url = "");
			for (let e of n.querySelectorAll("img.ghost")) e.remove();
			return;
		}
		let i = F.st;
		if (n.style.cursor = t ? "pointer" : "crosshair", e.treeUrl !== T && D(e.treeUrl), H.update(e, i.error)) return;
		V(z.z, z.x, z.y, !1);
		let a = t ? e.streamUrl ? re(e.streamUrl) : i.board && xe(i.board.focus)?.imageUrl || "" : e.imageUrl;
		r.dataset.url !== a && (a.startsWith("/stream") && (x = 0), ve(r, a));
	}
	let j = null, ee = (e, t) => e > 0 && t > 0 && Math.abs(e / t - 1) < .01, N = (e, t) => {
		for (let n of [
			s,
			l,
			...u
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
		j === t && (j = null, clearTimeout(t.lead), clearTimeout(t.giveUp), e.classList.remove("morph-hold"), N(!0, he("--duration-short4")), t.m.finish(t.same ? 150 : 0));
	}
	function oe(r) {
		if (ie(), !r || _e.matches || document.hidden || e.hidden || !t.classList.contains("resize-wrap")) return;
		let i = n.getBoundingClientRect();
		if (!i.width || !i.height) return;
		let a = ee(r.ratio, i.width / i.height), o = getComputedStyle(n);
		e.classList.add("morph-hold"), N(!1, 0);
		let s = fe({
			from: r.rect,
			to: () => n.getBoundingClientRect(),
			radius: [r.radius, parseFloat(o.borderTopLeftRadius) || 0],
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
			ready: !H.preparing(),
			landed: !1
		};
		c.lead = window.setTimeout(() => {
			j === c && N(!0, he("--duration-short4"));
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
	function ge(t, i, a, o = () => {}, s = () => !0) {
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
		H.suspend(), N(!1, he("--duration-short2"));
		let u = v() && r.naturalWidth ? pe(r) : null;
		Promise.all([u, new Promise((e) => setTimeout(e, he("--duration-short2")))]).then(() => {
			n.style.setProperty("--z", "1");
			let e = pr(n);
			n.style.removeProperty("--z"), l(), s() ? ye(() => {
				t(), N(!0, 0);
				let n = a(), r = n && pr(n);
				if (!n || !r || !r.rect.width || !e.url) {
					o();
					return;
				}
				let i = ee(e.ratio, r.ratio);
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
			}, i, { workspace: !0 }) : (N(!0, 0), t(), i());
		});
	}
	let be = !1, Se = () => !!(history.state && history.state.prevueWs);
	function I(e) {
		let t = !!(e && e.screen === "focus" && e.focus);
		t && !Se() ? (history.scrollRestoration = "manual", history.pushState({ prevueWs: !0 }, "")) : !t && Se() && !be && (be = !0, history.back());
	}
	addEventListener("popstate", () => {
		be ? be = !1 : F.st && F.st.screen === "focus" && F.st.focus && M("/viewer/exit");
	});
	let L = (e) => wn(e, r), R = () => !!(F.st && F.st.focus && F.st.focus.interactive), Ce = () => {
		Un() === r && Q();
	}, we = (e) => !R() || e.altKey;
	n.addEventListener("mousemove", (e) => {
		let t = p && we(e);
		o.classList.toggle("over", t), t && An(o, f, Oe()), Dn(i, t ? xn(f, ...L(e)) ?? null : null, Oe());
	}), n.addEventListener("mouseleave", () => On(i, o)), n.addEventListener("mousedown", (e) => {
		e.button !== 0 || H.moving() || (Te || !R() && z.z > 1 && !e.altKey ? Ge(e) : R() && !e.altKey && (e.preventDefault(), Ce(), $t(...L(e))));
	}), window.addEventListener("mousemove", (e) => {
		Qt() && en(...L(e));
	}), window.addEventListener("mouseup", (e) => {
		Qt() && tn(...L(e));
	}), n.addEventListener("click", async (t) => {
		if (H.moving()) return;
		if (Ee) {
			Ee = !1;
			return;
		}
		if (R() && !t.altKey || !p || !F.st || !F.st.focus) return;
		if (R()) try {
			await D((await M("/viewer/catchup").then((e) => e.json())).treeUrl || T);
		} catch (e) {
			P(k("point.sync.failed", { why: e.message }));
			return;
		}
		await E;
		let n = xn(f, ...L(t));
		if (!n) {
			Un() === r && Q();
			return;
		}
		let s = F.st, c = s.focus, l = s.board;
		Wn({
			list: f,
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
	let z = {
		z: 1,
		x: 0,
		y: 0
	}, B = null, Te = !1, Ee = !1, De = null;
	function Oe() {
		let e = g || r.naturalWidth;
		return e ? r.offsetWidth / e : 1;
	}
	function ke() {
		let e = H.pxPerDp();
		return e ? 1 / e : De && (g || r.naturalWidth) ? 1 / (Oe() * De) : null;
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
	function V(e, r, i, a) {
		H.preparing() || ([z.z, z.x, z.y] = Me(Math.min(je(), Math.max(Ae(), e)), r, i), n.classList.toggle("zoom-anim", !!a), n.style.transform = H.zoom(a) || z.z === 1 ? "" : `translate(${z.x}px, ${z.y}px) scale(${z.z})`, t.style.setProperty("--z", String(z.z)), n.classList.toggle("zoomed", z.z > 1), Ne(), C());
	}
	function Ne() {
		let e = ke();
		Y.set({
			pct: Math.round((e ? z.z / e : z.z) * 100),
			real: !!e,
			atFit: z.z === 1
		});
	}
	function Pe(e, t, r, i) {
		let a = n.getBoundingClientRect(), o = a.left - z.x, s = a.top - z.y, c = (t - a.left) / z.z, l = (r - a.top) / z.z, u = Math.min(je(), Math.max(Ae(), e));
		V(u, t - o - c * u, r - s - l * u, i);
	}
	function Fe(e) {
		let n = t.getBoundingClientRect();
		Pe(e, n.left + n.width / 2, n.top + n.height / 2, !0);
	}
	let Ie = (e) => Fe(z.z * e), Le = () => Ie(1.25), Re = () => Ie(1 / 1.25), ze = () => V(1, 0, 0, !0), Be = !1;
	function Ve() {
		if (!Y.get().menu) return !1;
		Y.set({ menu: !1 });
		let e = document.getElementById("zoomMenu"), t = document.activeElement;
		return e && t && e.contains(t) && (Be ? document.getElementById("zoomPct")?.focus({ preventScroll: !0 }) : t.blur()), !0;
	}
	function He(e) {
		let t = !Y.get().menu;
		t && (Be = e), Y.set({ menu: t });
	}
	function Ue(e) {
		Ve(), e === "fit" ? ze() : Fe((ke() || 1) * Number(e));
	}
	addEventListener("pointerdown", (e) => {
		let t = document.getElementById("zoomCtl");
		t && t.contains(e.target) || Ve();
	}), addEventListener("resize", () => {
		h(), V(z.z, z.x, z.y, !1);
	}), r.addEventListener("load", () => {
		y(), h();
	}), t.addEventListener("wheel", (t) => {
		e.hidden || (t.ctrlKey || t.metaKey ? (t.preventDefault(), Pe(z.z * Math.exp(-t.deltaY * .01), t.clientX, t.clientY, !1)) : R() ? (t.preventDefault(), H.moving() || (Ce(), We(t))) : z.z > 1 && (t.preventDefault(), V(z.z, z.x - t.deltaX, z.y - t.deltaY, !1)));
	}, { passive: !1 });
	function We(e) {
		let n = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? t.clientHeight : 1, i = Oe() * z.z || 1, [a, o] = L(e);
		on(Math.max(0, Math.min(g || r.naturalWidth, a)), Math.max(0, Math.min(_ || r.naturalHeight, o)), e.deltaX * n / i, e.deltaY * n / i);
	}
	function Ge(e) {
		e.preventDefault();
		let t = e.clientX, r = e.clientY, i = z.x, a = z.y;
		n.classList.add("panning");
		let o = (e) => {
			Math.abs(e.clientX - t) + Math.abs(e.clientY - r) > 3 && (Ee = !0), V(z.z, i + e.clientX - t, a + e.clientY - r, !1);
		}, s = () => {
			n.classList.remove("panning"), removeEventListener("mousemove", o), removeEventListener("mouseup", s);
		};
		addEventListener("mousemove", o), addEventListener("mouseup", s);
	}
	let Ke = (e) => !!e && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
	addEventListener("keydown", (t) => {
		let r = t.target;
		t.code !== "Space" || e.hidden || Ke(r) || r?.closest && r.closest("button, [role=button]") || (t.preventDefault(), Te || (Te = !0, n.classList.add("grab")));
	}), addEventListener("keyup", (e) => {
		e.code === "Space" && (Te = !1, n.classList.remove("grab"));
	}), addEventListener("blur", () => {
		Te = !1, n.classList.remove("grab");
	});
	let H = sr({
		root: s,
		geometry: c,
		shot: r,
		stage: n,
		wrap: t,
		zoomState: () => z,
		preparation(e, t) {
			t && le(), Y.set({ disabled: e }), e && Ve();
		},
		firstFrame: ue,
		originalSize() {
			let e = F.st?.board && xe(F.st.board.focus);
			return e ? {
				w: e.widthDp,
				h: e.heightDp
			} : null;
		},
		dimensions(e, t) {
			return e && t && (g = e, _ = t, r.dataset.fullW = String(e), x = 0, C()), {
				w: g,
				h: _
			};
		},
		layout(e) {
			n.style.left = e.cx - e.w / 2 + "px", n.style.top = e.y + "px", n.style.width = e.w + "px", n.style.height = e.h + "px", n.style.borderRadius = e.radius + "px", Ne(), C();
		}
	});
	return document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			if (clearTimeout(S), H.suspend(), !v()) return;
			let e = r.getAttribute("src");
			pe(r), r.getAttribute("src") === e && r.removeAttribute("src"), r.dataset.url = "";
		} else F.st?.screen === "focus" && A(F.st.focus);
	}), {
		render: A,
		fitStage: h,
		renarrow: m,
		syncHistory: I,
		morphIn: oe,
		morphOut: ge,
		image: () => r,
		zoomIn: Le,
		zoomOut: Re,
		zoomFit: ze,
		zoomMenuPick: Ue,
		toggleZoomMenu: He,
		closeZoomMenu: Ve,
		closeDeviceMenu: () => H.closeMenu()
	};
}
var ur = (e) => e && e.naturalWidth ? e.naturalWidth / e.naturalHeight : 0, dr = /* @__PURE__ */ new Map();
function fr(e) {
	let t = e?.dataset.still;
	if (!t) return null;
	if (!dr.has(t)) {
		let e = new Image();
		e.src = t, dr.set(t, e), dr.size > 8 && dr.delete(dr.keys().next().value);
	}
	return dr.get(t);
}
function pr(e) {
	if (!e) return null;
	let t = e.querySelector("img"), n = getComputedStyle(e), r = t && t.getAttribute("src") || "";
	return {
		el: e,
		rect: e.getBoundingClientRect(),
		radius: parseFloat(n.borderTopLeftRadius) || 0,
		shadow: n.boxShadow,
		url: t ? r.startsWith("/stream") ? t.dataset.still || "" : t.currentSrc || r : "",
		ratio: ur(t) || ur(fr(t))
	};
}
function mr(e) {
	M("/viewer/focus", { index: e }).catch((e) => se(k("focus.enter.failed", { why: e.message }), "error"));
}
function hr() {
	F.st && F.st.focus && M("/viewer/exit");
}
function gr(e) {
	M("/viewer/systemUi", { systemUi: e }).catch((e) => P(k("request.failed", { why: e.message })));
}
// src/session.ts
var _r = () => document.getElementById("boardView"), vr, yr = null;
function br(e) {
	return yr && !e.error && e.screen === "focus" && e.focus?.previewId === yr.id && (e.busy || !e.focus.streamUrl || e.focus.streamUrl === yr.stream && e.focus.imageUrl === yr.image) ? !0 : (yr = null, !1);
}
var xr = /* @__PURE__ */ new Map(), Sr = null, Cr = {
	wasBoard: !1,
	arrive: !1,
	file: null
};
function wr(e) {
	let t = !_r().hidden, n = e.board ? e.board.file : null;
	t && Sr && (e.screen !== "board" || n !== Sr) && xr.set(Sr, scrollY), Cr = {
		wasBoard: t,
		arrive: e.screen === "board" && (!t || n !== Sr),
		file: n
	}, Sr = n;
}
function Tr(e) {
	let { wasBoard: t, arrive: n, file: r } = Cr;
	vr.render(e.screen === "focus" ? e.focus : null), vr.syncHistory(e), oe(O(e.error)), vr.fitStage(), n ? scrollTo(0, xr.get(r) || 0) : t && e.screen !== "board" && scrollTo(0, 0), f();
}
var Er = (e) => {}, Dr = (e) => {
	let t = (e.tabs || []).find((e) => e.active);
	return t ? t.key : null;
};
function Or(e, t, n) {
	let r = (t) => {
		let n = e.tabs.findIndex((e) => e.key === t);
		return n < 0 ? e.tabs.length : n;
	};
	return Math.sign(r(n) - r(t));
}
var kr = !1;
function Ar(e) {
	if (F.st && e.version <= F.st.version) return;
	let t = F.st;
	if (t?.focus?.interactive && e.focus?.interactive && t.focus.previewId === e.focus.previewId && JSON.stringify(t.focus.size) !== JSON.stringify(e.focus.size) && (yr = {
		id: e.focus.previewId,
		stream: t.focus.streamUrl,
		image: t.focus.imageUrl
	}), F.st = e, be()) {
		kr = !0;
		return;
	}
	let n = t && t.screen, r = e.screen, i = t && Dr(t) && Dr(e) && Dr(t) !== Dr(e);
	t && (i || n !== r || t.board && e.board && t.board.focus !== e.board.focus && r === "focus") && Q();
	let a = () => {
		kr && (kr = !1, Er(F.st));
	}, o = () => F.st;
	if (i) {
		let n = document.documentElement;
		n.style.setProperty("--tab-dir", String(Or(t, Dr(t), Dr(e)))), n.classList.add("vt-tab"), ye(() => Er(o()), a), setTimeout(() => n.classList.remove("vt-tab"), 500);
	} else if (n === "board" && r === "focus") {
		let t = e.board ? pr(g(h(e.board.focus))) : null;
		ye(() => {
			Er(o()), vr.morphIn(t);
		}, a, { workspace: !0 });
	} else if (n === "focus" && r === "board") {
		let e = null;
		vr.morphOut(() => Er(o()), a, () => g(e = o().screen === "board" ? b(o().board.focus) : null), () => S(e), () => o().screen === "board");
	} else n === "focus" && r === "focus" && t.board && e.board && t.board.focus !== e.board.focus ? ye(() => Er(o()), a, { workspace: !0 }) : Er(e);
}
var jr = 0, Mr = () => {
	let e = ++jr;
	ee().then((t) => {
		e === jr && (F.projectFiles = new Map(Object.entries(t.files || {})), _(), vr.renarrow());
	}).catch(() => {});
}, Nr = !1, Pr = () => {}, Fr = null, Ir = () => {
	Fr?.fail(k("prep.lost")), se(k("status.lost"), "error"), Pr("lost"), F.st = null;
}, Lr = 6e4, Rr = !1, zr = 0, Br = 0, Vr = null, Hr = (e) => !e.busy && !(e.board?.groups || []).some((e) => e.cards.some((e) => !e.rendered));
function Ur() {
	Rr = !0, Pr("restarting"), clearTimeout(zr), zr = window.setTimeout(Ir, Lr);
}
function Wr(e) {
	if (Rr) {
		if (e.boot === Vr) return;
		Br ||= (clearTimeout(zr), window.setTimeout(() => location.reload(), Lr)), Hr(e) && location.reload();
	} else Vr && e.boot !== Vr ? location.reload() : (Vr = e.boot, Ar(e));
}
function Gr({ workspace: e, render: t, onConnection: n, onPreviewFiles: r, prepared: i = null }) {
	vr = e, Er = (e) => {
		wr(e), t(e, br(e));
	}, Pr = n, Fr = i, A({
		open: () => {
			Nr && !Rr ? location.reload() : Nr || Mr();
		},
		state: Wr,
		ui: (e) => {
			e.kind === "flash" ? P(O(e.text ?? null)) : e.kind === "previewFiles" ? r() : e.kind === "projectFiles" ? Mr() : e.kind === "restart" && !Fr && Ur();
		},
		error: () => {
			Nr = !0, Rr || Ir();
		}
	});
}
// src/shortcuts.ts
function Kr(e, t) {
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
					run: (e) => (Jr(e) === "+" ? t.zoomIn : t.zoomOut)()
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
					run: (e) => t.jumpTab(Number(Jr(e)))
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
function qr(e) {
	return e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
}
function Jr(e) {
	return e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") ? "⇧" + e.key : /^Digit[1-9]$/.test(e.code) && !e.shiftKey ? e.code.slice(5) : e.code === "KeyI" ? "i" : e.code === "Slash" && e.shiftKey ? "?" : e.code === "Equal" ? "+" : e.code === "Minus" ? "-" : e.code === "Digit0" ? "0" : e.key;
}
function Yr(e, t, n) {
	let r = (r) => {
		if ((r.metaKey || r.ctrlKey) && !r.altKey && !r.shiftKey && r.code === "KeyK" && t.screen() !== "offline") {
			r.preventDefault(), t.openQuickOpen(document.activeElement);
			return;
		}
		if (r.metaKey || r.ctrlKey || r.altKey || qr(r.target)) return;
		let i = Jr(r), a = i === "Enter" && r.target instanceof Element && r.target.closest("button, [role=button]");
		if (!(a && a.matches(":focus-visible"))) {
			if (i === "Escape" && t.helpOpen()) r.preventDefault(), t.toggleHelp(!1);
			else if (i === "Escape" && n.chooserOpen()) r.preventDefault(), n.cancelChoice();
			else if (i === "Escape" && n.closeZoomMenu()) r.preventDefault();
			else if (i === "Escape" && n.closeDeviceMenu()) r.preventDefault();
			else if (i === "Escape" && n.closeDirPop()) r.preventDefault();
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
var Xr = n(), Zr = r();
function Qr({ pending: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t);
	return (0, I.useLayoutEffect)(() => {
		r && (r.hidden = !e);
	}, [r, e]), i(n("build.notice"), (e, t) => /* @__PURE__ */ (0, L.jsx)("aside", {
		className: "build-notice",
		id: "buildNotice",
		role: "status",
		ref: e,
		hidden: !0,
		children: t
	}));
}
// src/components/NotificationCapsule.tsx
var $r = (0, I.memo)(function({ content: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = (0, I.useSyncExternalStore)(ue, N), { error: c, log: l, once: u } = e ?? a, d = !!(c.trim() || l.trim()) || !!u;
	(0, I.useLayoutEffect)(() => {
		r?.classList.toggle("on", d);
	}, [r, d]);
	let [f, ...p] = u ? u.text.split(/(?<=[.。])\s+/) : [];
	return i(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsxs)("div", {
		className: "cap-once",
		id: "capOnce",
		hidden: !u,
		children: [/* @__PURE__ */ (0, L.jsx)("span", {
			id: "capOnceText",
			children: u && /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("b", { children: f }), p.length ? " " + p.join(" ") : null] })
		}), /* @__PURE__ */ (0, L.jsx)("button", {
			className: "cap-x",
			id: "capOnceX",
			type: "button",
			title: n("capsule.dismiss"),
			"aria-label": n("capsule.dismiss"),
			onClick: ie,
			children: /* @__PURE__ */ (0, L.jsx)("svg", {
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, L.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
			})
		})]
	}), /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "cap-main",
		children: [/* @__PURE__ */ (0, L.jsx)("div", {
			id: "sel",
			className: c ? "error" : "",
			children: c
		}), /* @__PURE__ */ (0, L.jsx)("div", {
			className: "log",
			id: "log",
			children: l
		})]
	})] }), (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
		className: "capsule",
		id: "strip",
		ref: e,
		role: "status",
		children: t
	}));
}), ei = {
	cursor: null,
	returned: null
}, ti = (e, t) => e.groups.flatMap((e) => e.cards).find((e) => e.index === t), ni = 300 / 360, ri = .25, ii = 100, ai = 160, oi = 360, si = 640, ci = 120;
function li(e, t, n) {
	let r = (t) => e.reduce((e, n) => e + Math.max(n * t, ii), 0) + n * (e.length - 1);
	if (r(ni) <= t) return {
		s: ni,
		w: r(ni),
		wrap: !1
	};
	if (r(ri) > t) return {
		s: Math.min(ni, ...e.map((e) => e * ri >= ii ? ri : ii / e)),
		w: t,
		wrap: !0
	};
	let i = ri, a = ni;
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
var ui = /* @__PURE__ */ new Map();
function di(e, t) {
	let n = t.cards.map((t) => {
		let n = e + "|" + t.previewId, r = ui.get(n);
		return t.widthDp && t.heightDp && ui.set(n, [t.widthDp, t.heightDp]), [t.widthDp || r?.[0], t.heightDp || r?.[1]];
	}), r = n.filter(([e, t]) => e && t).sort((e, t) => t[0] - e[0])[0];
	return n.map(([e, n], i) => {
		let a = t.cards[i].failure && r;
		return [e || (a ? r[0] : oi), n || (a ? r[1] : si)];
	});
}
function fi(e, t, n) {
	let r = e.clientWidth;
	if (!r) return 0;
	let i = e.querySelectorAll(":scope > .group"), a = i[0]?.querySelector(".board"), o = a && parseFloat(getComputedStyle(a).columnGap) || 24;
	return t.groups.forEach((a, s) => {
		let c = i[s];
		if (!c) return;
		let l = di(t.file, a), { s: u, w: d, wrap: f } = li(l.map((e) => e[0]), r, o);
		c.style.width = f ? "100%" : Math.max(ai, d) + "px", c.querySelector(".board").classList.toggle("spill", f);
		let p = c.querySelector(".sc"), m = u < .8333323333333333, h = a.cards.some((e) => e.dpGuess);
		p.hidden = !m, p.textContent = m ? (h ? "≈" : "") + Math.round(u * 100) + "%" : "", p.title = n("zoom.tip.real") + (h ? " · " + n("board.scale.guess") : ""), a.cards.forEach((t, n) => {
			let r = e.querySelector(`.card[data-i="${t.index}"]`);
			if (!r) return;
			let [i, a] = l[n], o = Math.max(i * u, ii);
			r.style.width = o + "px";
			let s = r.querySelector(".cstage img");
			s.style.width = i * u + "px", s.style.aspectRatio = `auto ${i} / ${a}`;
			let c = r.querySelector(".ph"), d = Math.max(ci, a * u);
			c.style.width = o + "px", c.style.height = d + "px", c.style.setProperty("--lines", String(Math.max(1, Math.floor((d - 55) / 16.7))));
		});
	}), r;
}
var pi = (e) => /* @__PURE__ */ (0, L.jsx)("svg", {
	viewBox: "0 0 12 12",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.1",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: e
}), mi = /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("rect", {
	x: "3.25",
	y: "1.25",
	width: "5.5",
	height: "9.5",
	rx: "1.2"
}), /* @__PURE__ */ (0, L.jsx)("path", { d: "M5.25 9h1.5" })] }), hi = {
	portrait: pi(mi),
	landscape: pi(/* @__PURE__ */ (0, L.jsx)("rect", {
		x: "1.25",
		y: "3",
		width: "9.5",
		height: "6",
		rx: "1.2"
	})),
	device: pi(mi),
	dark: pi(/* @__PURE__ */ (0, L.jsx)("path", { d: "M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z" })),
	font: /* @__PURE__ */ (0, L.jsx)("span", {
		className: "aa",
		children: "Aa"
	}),
	locale: pi(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("circle", {
		cx: "6",
		cy: "6",
		r: "4.75"
	}), /* @__PURE__ */ (0, L.jsx)("path", { d: "M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75" })] })),
	api: pi(/* @__PURE__ */ (0, L.jsx)("path", { d: "M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5" })),
	systemUi: pi(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("rect", {
		x: "3.25",
		y: "1.25",
		width: "5.5",
		height: "9.5",
		rx: "1.2"
	}), /* @__PURE__ */ (0, L.jsx)("path", { d: "M3.5 3.25h5" })] }))
}, gi = /* @__PURE__ */ (0, L.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "currentColor",
	children: /* @__PURE__ */ (0, L.jsx)("path", { d: "M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z" })
});
function _i({ card: e }) {
	let { daemonText: t } = s();
	return /* @__PURE__ */ (0, L.jsx)("span", {
		className: "specs",
		title: e.args,
		children: e.specs.map((e, n) => {
			let r = t(e.text), [i, a] = e.kind === "size" ? r.split("×").map(Number) : [], o = e.kind === "size" ? i > a ? "landscape" : "portrait" : e.kind;
			return /* @__PURE__ */ (0, L.jsxs)("span", {
				className: "spec",
				children: [hi[o] ?? null, /* @__PURE__ */ (0, L.jsxs)("span", { children: [r, e.kind === "size" && /* @__PURE__ */ (0, L.jsx)("span", {
					className: "unit",
					children: "dp"
				})] })]
			}, n);
		})
	});
}
var vi = (0, I.memo)(function({ card: e, fn: t, cursor: n = !1, returned: r = !1, actions: i }) {
	let { phrase: a, daemonText: o } = s(), c = (0, I.useRef)(null), l = (0, I.useRef)(null), u = (0, I.useRef)(null), d = (0, I.useRef)(null), f = (0, I.useRef)(null), p = !!(e.ok && e.imageUrl);
	(0, I.useLayoutEffect)(() => {
		if (!i) return;
		let t = new AbortController();
		return i.point(e.index, {
			stage: c.current,
			img: l.current,
			box: u.current,
			pick: d.current,
			marks: f.current
		}, t.signal), () => t.abort();
	}, [i, e.index]), (0, I.useLayoutEffect)(() => {
		let t = l.current;
		p ? (t.dataset.url !== e.imageUrl && (ve(t, e.imageUrl), u.current.classList.remove("on"), d.current.hidden = !0), t.hidden = !1) : t.hidden = !0;
	}, [p, e.imageUrl]);
	let m = !p && e.failure ? o(e.failure) : null;
	return /* @__PURE__ */ (0, L.jsxs)("article", {
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
		children: [/* @__PURE__ */ (0, L.jsxs)("div", {
			className: "label",
			children: [
				/* @__PURE__ */ (0, L.jsx)("span", {
					className: "fn",
					title: e.label ? e.label + "\n" + e.title : e.title,
					children: e.label
				}),
				/* @__PURE__ */ (0, L.jsxs)("button", {
					className: "go",
					type: "button",
					title: a("card.go.tip"),
					onClick: () => {
						C(e.index), i?.open(e.index);
					},
					children: [gi, /* @__PURE__ */ (0, L.jsx)("span", {
						className: "go-t",
						children: a("card.go")
					})]
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "sub",
					children: /* @__PURE__ */ (0, L.jsx)(_i, { card: e })
				})
			]
		}), /* @__PURE__ */ (0, L.jsxs)("div", {
			className: "cstage",
			ref: c,
			children: [
				/* @__PURE__ */ (0, L.jsx)("img", {
					alt: "",
					hidden: !0,
					ref: l
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "marks",
					"aria-hidden": "true",
					ref: f
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "box",
					ref: u
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "box pick",
					hidden: !0,
					ref: d
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: m ? "ph bad" : "ph",
					hidden: p,
					title: m ?? "",
					children: m ? /* @__PURE__ */ (0, L.jsx)("span", {
						className: "why",
						children: m
					}) : a("card.waiting")
				})
			]
		})]
	});
});
function yi({ group: e, marks: t = ei, actions: n }) {
	let { phrase: r } = s(), i = e.cards.every((e) => !e.label);
	return /* @__PURE__ */ (0, L.jsxs)("section", {
		className: i ? "group nameless" : "group",
		"data-fn": e.name,
		children: [/* @__PURE__ */ (0, L.jsxs)("div", {
			className: "ghead",
			children: [/* @__PURE__ */ (0, L.jsx)("span", {
				className: "gn",
				title: e.name,
				children: e.name
			}), /* @__PURE__ */ (0, L.jsxs)("span", {
				className: "m",
				children: [
					/* @__PURE__ */ (0, L.jsx)("span", {
						className: "n",
						children: r("board.count", { n: e.cards.length })
					}),
					/* @__PURE__ */ (0, L.jsx)("span", {
						className: "sc",
						hidden: !0
					}),
					/* @__PURE__ */ (0, L.jsx)("span", {
						className: "bad",
						children: e.failed ? `· ${r("board.failed", { n: e.failed })}` : ""
					})
				]
			})]
		}), /* @__PURE__ */ (0, L.jsx)("div", {
			className: "gbody",
			children: /* @__PURE__ */ (0, L.jsx)("div", {
				className: "board",
				children: e.cards.map((r) => /* @__PURE__ */ (0, L.jsx)(vi, {
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
function bi({ board: e, screen: t, hosts: n, actions: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n?.cards), [l, u] = (0, I.useState)(null), d = n?.view ?? l, f = (0, I.useSyncExternalStore)(T, p), m = (0, I.useRef)({
		board: null,
		live: null
	}), h = (0, I.useMemo)(() => {
		let n = m.current;
		if (t === "focus" && e) return n.live = ti(e, e.focus)?.imageUrl ?? null, n.board;
		let r = e && ti(e, e.focus);
		return e && n.board?.file === e.file && n.live && r?.imageUrl === n.live ? {
			...n.board,
			focus: e.focus
		} : (n.board = e, n.live = null, e);
	}, [e, t]), g = h ? h.file + "|" + h.groups.map((e) => e.cards.map((e) => e.previewId).join(",")).join("|") : "";
	(0, I.useLayoutEffect)(() => {
		_();
	}, [g]);
	let v = (0, I.useRef)(h), b = (0, I.useRef)(i), x = (0, I.useRef)(0);
	v.current = h, b.current = i, (0, I.useLayoutEffect)(() => {
		d && (t !== null && (d.hidden = t !== "board"), t !== "focus" && (E(h), h && a && (x.current = fi(a, h, i) || x.current)));
	}, [
		h,
		t,
		d,
		a
	]), (0, I.useEffect)(() => {
		if (!a) return;
		let e = () => {
			v.current && (x.current = fi(a, v.current, b.current) || x.current);
		}, t = new ResizeObserver(() => {
			let t = a.clientWidth;
			t && t !== x.current && e();
		});
		return t.observe(a), y(e), () => {
			t.disconnect(), y(() => {});
		};
	}, [a]);
	let S = h && /* @__PURE__ */ (0, L.jsx)(I.Fragment, { children: h.groups.map((e, t) => /* @__PURE__ */ (0, L.jsx)(yi, {
		group: e,
		marks: f,
		actions: r
	}, t)) }, g);
	return n ? c(S, () => null) : /* @__PURE__ */ (0, L.jsx)("section", {
		id: "boardView",
		ref: u,
		children: c(S, (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
			className: "board",
			id: "cards",
			ref: e,
			children: t
		}))
	});
}
// src/components/StaleBanner.tsx
function xi({ rows: e, host: t }) {
	let { daemonText: n } = s(), { element: r, place: i } = o(t), a = (0, I.useRef)([]);
	e?.length && (a.current = e);
	let c = !!e?.length;
	return (0, I.useLayoutEffect)(() => {
		r && e && (r.classList.toggle("on", c), t && document.body.classList.toggle("stale", c));
	}, [
		r,
		t,
		e,
		c
	]), i(/* @__PURE__ */ (0, L.jsx)("div", {
		className: "in",
		children: /* @__PURE__ */ (0, L.jsx)("div", {
			className: "rows",
			id: "staleRows",
			children: a.current.map((e, t) => /* @__PURE__ */ (0, L.jsxs)("div", {
				className: "row",
				children: [/* @__PURE__ */ (0, L.jsx)("span", {
					className: "head",
					children: n(e.head)
				}), /* @__PURE__ */ (0, L.jsx)("span", {
					className: "why",
					children: e.why.map(n).join(" · ")
				})]
			}, t))
		})
	}), (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
		className: "stalebar",
		id: "staleBar",
		ref: e,
		children: t
	}));
}
// src/components/StatusPill.tsx
function Si({ state: e, connection: t = null, host: n, bar: r }) {
	let { phrase: i, daemonText: a } = s(), { element: c, place: l } = o(n), u = (0, I.useRef)(!1);
	t === "restarting" && (u.current = !0);
	let d = e?.timing.find((e) => e.head), f = !!e?.timing.some((e) => e.over), p = !!e && (!!e.error || e.stale.length > 0 || !!e.board?.groups.some((e) => e.failed)), m = e ? e.busy ? "busy" : p ? "error" : f ? "over" : d ? "idle" : "none" : "none", h = e ? e.busy ? a(e.boardNote) : d ? d.text : "" : "";
	t === "restarting" && (m = "busy", h = i("status.restarting")), t === "lost" && (m = "error", h = i("status.lost.short"));
	let g = u.current || !!e?.busy;
	return (0, I.useLayoutEffect)(() => {
		c && (e || t) && (c.dataset.state = m);
	}, [
		c,
		e,
		t,
		m
	]), (0, I.useLayoutEffect)(() => {
		r && (e || t) && r.classList.toggle("busy", g);
	}, [
		r,
		e,
		t,
		g
	]), l(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
		/* @__PURE__ */ (0, L.jsxs)("span", {
			className: "st-ic",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, L.jsx)("svg", {
					className: "i-ok",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					children: /* @__PURE__ */ (0, L.jsx)("path", { d: "m3.5 8.5 3 3 6-7" })
				}),
				/* @__PURE__ */ (0, L.jsx)("svg", {
					className: "i-busy",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, L.jsx)("path", { d: "M8 2.5a5.5 5.5 0 1 1-5.5 5.5" })
				}),
				/* @__PURE__ */ (0, L.jsxs)("svg", {
					className: "i-bad",
					viewBox: "0 0 16 16",
					children: [
						/* @__PURE__ */ (0, L.jsx)("circle", {
							cx: "8",
							cy: "8",
							r: "6.5",
							fill: "currentColor"
						}),
						/* @__PURE__ */ (0, L.jsx)("path", {
							className: "mark",
							d: "M8 4.8v3.8",
							strokeWidth: "1.7",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ (0, L.jsx)("circle", {
							className: "mark",
							cx: "8",
							cy: "11.2",
							r: ".95"
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, L.jsx)("span", {
			className: "st-text",
			id: "statusText",
			children: h
		}),
		/* @__PURE__ */ (0, L.jsxs)("div", {
			className: "pop",
			role: "tooltip",
			children: [
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "note",
					id: "note",
					children: a(e?.boardNote ?? null)
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "who",
					id: "who",
					children: a(e?.who ?? null)
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "settle",
					id: "settle",
					children: a(e?.settle ?? null)
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "timing",
					id: "timing",
					children: e?.timing.flatMap((e, t) => [/* @__PURE__ */ (0, L.jsx)("span", {
						className: e.over ? "over" : void 0,
						children: a(e.label)
					}, `k${t}`), /* @__PURE__ */ (0, L.jsx)("b", {
						className: e.over ? "over" : void 0,
						children: e.text
					}, `v${t}`)])
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "where",
					id: "where",
					children: e ? location.host : ""
				})
			]
		})
	] }), (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
		className: "status",
		id: "status",
		ref: e,
		tabIndex: 0,
		"data-state": "none",
		children: t
	}));
}
// src/components/PointOverlay.tsx
var Ci = {
	choose() {},
	cancel() {},
	follow() {},
	pick() {},
	peek() {},
	jump() {},
	close() {}
}, $ = (e) => /* @__PURE__ */ (0, L.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), wi = $(/* @__PURE__ */ (0, L.jsx)("path", { d: "M4 4l8 8M12 4l-8 8" })), Ti = $(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
	/* @__PURE__ */ (0, L.jsx)("rect", {
		x: "2",
		y: "3",
		width: "12",
		height: "10",
		rx: "1.5"
	}),
	/* @__PURE__ */ (0, L.jsx)("path", { d: "M2.5 11.5L6 8l2.5 2.5 2-2 3 3" }),
	/* @__PURE__ */ (0, L.jsx)("circle", {
		cx: "10.5",
		cy: "6",
		r: "0.75",
		fill: "currentColor",
		stroke: "none"
	})
] })), Ei = {
	width: $(/* @__PURE__ */ (0, L.jsx)("path", { d: "M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5" })),
	height: $(/* @__PURE__ */ (0, L.jsx)("path", { d: "M8 2v12M5.5 4.5 8 2l2.5 2.5M5.5 11.5 8 14l2.5-2.5" })),
	size: $(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("path", { d: "M2.5 6V2.5H6M10 13.5h3.5V10" }), /* @__PURE__ */ (0, L.jsx)("path", { d: "M2.5 2.5l11 11" })] })),
	padding: $(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("rect", {
		x: "2.5",
		y: "2.5",
		width: "11",
		height: "11",
		rx: "1.5"
	}), /* @__PURE__ */ (0, L.jsx)("rect", {
		x: "5.5",
		y: "5.5",
		width: "5",
		height: "5",
		rx: "0.5",
		strokeDasharray: "1.5 1.5"
	})] })),
	click: $(/* @__PURE__ */ (0, L.jsx)("path", { d: "M5 2.5l7.5 4.8-3.4.9 2 3.4-1.6.9-2-3.4L5 11.5z" })),
	text: $(/* @__PURE__ */ (0, L.jsx)("path", { d: "M3.5 3.5h9M8 3.5v9M6 12.5h4" })),
	color: $(/* @__PURE__ */ (0, L.jsx)("path", { d: "M8 2.5S4 7 4 9.75a4 4 0 0 0 8 0C12 7 8 2.5 8 2.5z" }))
};
function Di(e) {
	let t = /#L(\d+)$/.exec(e), n = e.replace(/^@/, "").replace(/#L\d+$/, "");
	return t ? `${n.slice(n.lastIndexOf("/") + 1)}:${t[1]}` : n;
}
function Oi(e, t) {
	let n = t && e.startsWith(t + "/") ? e.slice(t.length + 1) : e, r = n.lastIndexOf("/") + 1, i = n.indexOf("/src/");
	return (i > 0 && i < r ? n.slice(0, i) + "/…/" : n.slice(0, r)) + n.slice(r);
}
function ki(e, t) {
	let n = (e.uchain || e.chain || []).slice(-6).join(" › ");
	return (t.ref ? [
		t.ref,
		e.name,
		n
	] : [t.msg, n]).filter(Boolean).join("\n");
}
var Ai = [.5, 3.2], ji = 2, Mi = (e) => String(Math.round(e * 10) / 10), Ni = () => typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches, Pi = (e) => {
	e.button === 0 && e.target.closest("button") && e.preventDefault();
};
function Fi({ row: e, here: t, actions: n, children: r }) {
	return /* @__PURE__ */ (0, L.jsxs)("li", {
		className: `pc-node${t ? " here" : ""}`,
		"data-id": e.id,
		children: [/* @__PURE__ */ (0, L.jsx)("div", {
			className: "pc-row",
			onMouseEnter: () => n.peek(e),
			onMouseLeave: () => n.peek(null),
			children: /* @__PURE__ */ (0, L.jsx)("button", {
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
function Ii({ tree: e, actions: t, settled: n }) {
	let { ups: r, here: i, before: a, after: o, downs: s } = e, [c, l] = (0, I.useState)(null), [u, d] = (0, I.useState)(!1), f = (0, I.useRef)(null);
	(0, I.useLayoutEffect)(() => {
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
	let p = (e) => c?.at === e.id ? /* @__PURE__ */ (0, L.jsx)("div", {
		className: "pc-foldout",
		inert: !0,
		onAnimationEnd: (e) => {
			e.target === e.currentTarget && (l(null), n());
		},
		children: /* @__PURE__ */ (0, L.jsx)("ul", {
			className: "pc-group",
			children: c.rows.map((e) => /* @__PURE__ */ (0, L.jsx)(Fi, {
				row: e,
				actions: t
			}, e.id))
		})
	}, `fold-${e.id}`) : void 0, m = (e) => /* @__PURE__ */ (0, L.jsx)(Fi, {
		row: e,
		actions: t,
		children: p(e)
	}, e.id), h = s.length ? /* @__PURE__ */ (0, L.jsx)("div", {
		className: u ? "pc-unfold" : void 0,
		onAnimationEnd: (e) => {
			e.target === e.currentTarget && n();
		},
		children: /* @__PURE__ */ (0, L.jsx)("ul", {
			className: "pc-group",
			children: s.map(m)
		})
	}, `unfold-${i.id}`) : null, g = /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
		a.map(m),
		/* @__PURE__ */ (0, L.jsx)(Fi, {
			row: i,
			here: !0,
			actions: t,
			children: h
		}, i.id),
		o.map(m)
	] }), _ = Math.max(0, r.length - ji), v = r.slice(_).reduceRight((e, n) => /* @__PURE__ */ (0, L.jsx)(Fi, {
		row: n,
		actions: t,
		children: /* @__PURE__ */ (0, L.jsx)("ul", {
			className: "pc-group",
			children: e
		})
	}, n.id), g);
	return /* @__PURE__ */ (0, L.jsxs)("ul", {
		className: "pc-tree",
		children: [r.slice(0, _).map((e) => /* @__PURE__ */ (0, L.jsx)(Fi, {
			row: e,
			actions: t
		}, e.id)), v]
	});
}
function Li({ say: e }) {
	let { phrase: t } = s();
	return e.copied === !1 ? e.again ? /* @__PURE__ */ (0, L.jsx)("button", {
		type: "button",
		className: "pc-rescue",
		title: t("point.card.retry.title", { ref: e.ref ?? "" }),
		onClick: e.again,
		children: t("point.card.retry")
	}) : /* @__PURE__ */ (0, L.jsx)("span", {
		className: "pc-rescue off",
		children: t("point.card.blocked")
	}) : null;
}
function Ri({ origin: e }) {
	let { phrase: t } = s();
	return e ? e === "compose" ? /* @__PURE__ */ (0, L.jsx)("span", {
		className: "pc-chip compose",
		title: t("point.card.compose.title"),
		children: "Compose"
	}) : /* @__PURE__ */ (0, L.jsx)("span", {
		className: "pc-chip module",
		title: t("point.card.module.title", { module: e.module }),
		children: e.module
	}) : null;
}
function zi({ box: e }) {
	let t = e.width > 0 && e.height > 0 ? e.width / e.height : 1, n = Math.min(Ai[1], Math.max(Ai[0], t));
	return /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "pc-size",
		children: [/* @__PURE__ */ (0, L.jsx)("div", {
			className: "pc-glyph",
			children: /* @__PURE__ */ (0, L.jsx)("div", {
				className: `pc-shape${e.padded ? " padded" : ""}`,
				style: { "--ratio": n },
				children: e.padded && /* @__PURE__ */ (0, L.jsx)("i", {})
			})
		}), /* @__PURE__ */ (0, L.jsxs)("div", {
			className: "pc-dims",
			children: [
				Mi(e.width),
				/* @__PURE__ */ (0, L.jsx)("i", { children: "×" }),
				Mi(e.height),
				/* @__PURE__ */ (0, L.jsx)("span", {
					className: "pc-unit",
					children: e.unit
				})
			]
		})]
	});
}
function Bi(e) {
	return e.sizes?.length ? e.sizes.length === 2 ? "size" : e.sizes[0] : e.color ? "color" : {
		padding: "padding",
		clickable: "click",
		text: "text"
	}[e.name] ?? null;
}
function Vi({ modifiers: e }) {
	let { phrase: t } = s();
	return /* @__PURE__ */ (0, L.jsx)("div", {
		className: "pc-mods",
		children: /* @__PURE__ */ (0, L.jsx)("ol", {
			className: "pc-scroll",
			tabIndex: 0,
			"aria-label": t("point.card.modifiers"),
			children: e.map((e, n) => {
				let r = Bi(e);
				return /* @__PURE__ */ (0, L.jsxs)("li", { children: [
					r ? /* @__PURE__ */ (0, L.jsx)("span", {
						className: "pc-kind",
						title: t(`point.card.kind.${r}`),
						"aria-label": t(`point.card.kind.${r}`),
						children: Ei[r]
					}) : /* @__PURE__ */ (0, L.jsx)("span", { className: "pc-kind" }),
					/* @__PURE__ */ (0, L.jsx)("span", {
						className: "pc-mod-name",
						children: e.name
					}),
					(e.value || e.color) && /* @__PURE__ */ (0, L.jsxs)("span", {
						className: "pc-mod-value",
						title: e.value,
						children: [e.color && /* @__PURE__ */ (0, L.jsx)("i", {
							className: "pc-swatch",
							style: { background: e.color }
						}), /* @__PURE__ */ (0, L.jsx)("span", { children: e.value })]
					})
				] }, `${n}-${e.name}`);
			})
		})
	});
}
function Hi({ card: e, actions: t = Ci }) {
	let { phrase: n } = s(), { node: r, say: i, box: a, tree: o, modifiers: c, previews: l, origin: u } = e, d = (0, I.useRef)(null), f = (0, I.useRef)(!1), p = (e) => {
		let t = d.current, n = t?.querySelector(".pc-node.here > .pc-row");
		if (!t || !n) return;
		let r = t.scrollTop + n.getBoundingClientRect().top - t.getBoundingClientRect().top - (t.clientHeight - n.offsetHeight) / 2;
		t.scrollTo({
			top: r,
			behavior: e && !Ni() ? "smooth" : "auto"
		});
	}, m = o?.here.id;
	(0, I.useLayoutEffect)(() => {
		p(f.current), f.current = !0;
	}, [m]);
	let [h, g] = (0, I.useState)(!1);
	(0, I.useEffect)(() => g(!1), [m, r.lineNumber]);
	let _ = i.file ? `${i.file.slice(i.file.lastIndexOf("/") + 1)}:${r.lineNumber}` : i.ref ? Di(i.ref) : "", v = l.length > 1, y = v ? n("point.card.previews", { n: l.length }) : l[0] && n("point.card.jump", { name: l[0].fn }), b = m ?? `${r.name}:${r.lineNumber}`;
	return /* @__PURE__ */ (0, L.jsx)("section", {
		className: "point-card",
		"aria-label": n("point.card.label"),
		onMouseDown: Pi,
		children: /* @__PURE__ */ (0, L.jsxs)("div", {
			className: "pc-body",
			children: [
				/* @__PURE__ */ (0, L.jsxs)("header", {
					className: "pc-head",
					children: [
						/* @__PURE__ */ (0, L.jsxs)("div", {
							className: "pc-id pc-swap",
							title: ki(r, i),
							children: [/* @__PURE__ */ (0, L.jsxs)("span", {
								className: "pc-nameline",
								children: [/* @__PURE__ */ (0, L.jsx)("span", {
									className: "pc-name",
									children: r.name || r.fileName
								}), /* @__PURE__ */ (0, L.jsx)(Ri, { origin: u })]
							}), i.ref && /* @__PURE__ */ (0, L.jsxs)("span", {
								className: "pc-refline",
								children: [/* @__PURE__ */ (0, L.jsx)("span", {
									className: "pc-ref",
									children: _
								}), /* @__PURE__ */ (0, L.jsx)(Li, { say: i })]
							})]
						}, `id-${b}`),
						y && /* @__PURE__ */ (0, L.jsxs)("button", {
							type: "button",
							className: "pc-jump",
							title: y,
							"aria-label": y,
							"aria-expanded": v ? h : void 0,
							onClick: () => v ? g((e) => !e) : t.jump(l[0]),
							children: [Ti, v && /* @__PURE__ */ (0, L.jsx)("span", { children: l.length })]
						}),
						/* @__PURE__ */ (0, L.jsx)("button", {
							type: "button",
							className: "pc-close",
							title: n("point.card.close"),
							"aria-label": n("point.card.close"),
							onClick: t.close,
							children: wi
						})
					]
				}),
				v && /* @__PURE__ */ (0, L.jsx)("div", {
					className: "pc-fold",
					"data-open": h || void 0,
					inert: !h,
					children: /* @__PURE__ */ (0, L.jsx)("ul", {
						className: "pc-previews",
						children: l.map((e) => /* @__PURE__ */ (0, L.jsx)("li", { children: /* @__PURE__ */ (0, L.jsxs)("button", {
							type: "button",
							className: "pc-preview",
							title: `${e.fn} — ${e.rel}`,
							onClick: () => t.jump(e),
							children: [Ti, /* @__PURE__ */ (0, L.jsx)("span", { children: e.fn })]
						}) }, `${e.file}#${e.fn}`))
					})
				}),
				!i.ref && /* @__PURE__ */ (0, L.jsx)("p", {
					className: "pc-msg",
					children: i.msg
				}),
				o && /* @__PURE__ */ (0, L.jsx)("div", {
					className: "pc-panel pc-tree-panel",
					children: /* @__PURE__ */ (0, L.jsx)("div", {
						className: "pc-scroll",
						ref: d,
						children: /* @__PURE__ */ (0, L.jsx)(Ii, {
							tree: o,
							actions: t,
							settled: () => p(!0)
						})
					})
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "pc-panel pc-detail",
					children: /* @__PURE__ */ (0, L.jsxs)("div", {
						className: "pc-detail-in pc-swap",
						children: [/* @__PURE__ */ (0, L.jsx)(zi, { box: a }), c && c.length > 0 && /* @__PURE__ */ (0, L.jsx)(Vi, { modifiers: c })]
					}, `detail-${b}`)
				})
			]
		})
	});
}
function Ui({ room: e, shot: t, card: n, space: r }) {
	let i = t.left + t.width + r.gap;
	return {
		left: i + n.width <= e.right - r.edge ? i : Math.max(e.left + r.edge, t.left - r.gap - n.width),
		top: Math.max(r.edge, t.top)
	};
}
var Wi = (e, t) => parseFloat(getComputedStyle(e).getPropertyValue(t)) || 0, Gi = (e) => {
	let t = document.getElementById(e);
	return t && !t.hidden && t.offsetWidth ? t.getBoundingClientRect() : null;
};
function Ki({ host: e, shot: t, leaving: n = !1, onLeft: r, children: i }) {
	let a = (0, I.useRef)(null), o = (0, I.useRef)(r);
	o.current = r;
	let [s, c] = (0, I.useState)(0), [l, u] = (0, I.useState)(!1);
	(0, I.useLayoutEffect)(() => {
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
	}, []), (0, I.useLayoutEffect)(() => {
		let n = a.current;
		if (!n) return;
		let r = {
			gap: Wi(n, "--space-16"),
			edge: Wi(n, "--space-8")
		}, i = 0, o = "", s = () => {
			let a = t(), c = e.getBoundingClientRect(), l = "hidden";
			if (a && a.width) {
				let t = Gi("rail"), i = Ui({
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
	}, [e, t]), (0, I.useEffect)(() => {
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
	return /* @__PURE__ */ (0, L.jsx)("div", {
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
function qi({ host: e, shot: t, card: n, actions: r }) {
	let i = (0, I.useRef)(/* @__PURE__ */ new WeakMap()), a = (0, I.useRef)(0), o = (0, I.useRef)(null), [s, c] = (0, I.useState)(!0), l = !!(e && t && n);
	e && t && n && (o.current = {
		host: e,
		shot: t,
		card: n
	}, s && c(!1));
	let u = o.current;
	return !u || s ? null : (i.current.has(u.shot) || i.current.set(u.shot, ++a.current), (0, Xr.createPortal)(/* @__PURE__ */ (0, L.jsx)(Ki, {
		host: u.host,
		shot: u.shot,
		leaving: !l,
		onLeft: () => c(!0),
		children: /* @__PURE__ */ (0, L.jsx)(Hi, {
			card: u.card,
			actions: r
		})
	}, i.current.get(u.shot)), u.host));
}
function Ji({ actions: e }) {
	let { host: t, shot: n, card: r } = (0, I.useSyncExternalStore)(hn.subscribe, hn.get);
	return /* @__PURE__ */ (0, L.jsx)(qi, {
		host: t,
		shot: n,
		card: r,
		actions: e
	});
}
function Yi({ choice: e, repo: t, host: n, actions: r = Ci }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), l = (0, I.useRef)(e);
	e && (l.current = e);
	let u = l.current;
	return (0, I.useLayoutEffect)(() => {
		a && (a.classList.toggle("on", !!e), a.setAttribute("aria-hidden", String(!e)), e ? r.follow(a) : a.contains(document.activeElement) && document.activeElement.blur());
	}, [e, a]), c(u && /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
		/* @__PURE__ */ (0, L.jsx)("h2", { children: i("choose.title", {
			file: u.fileName,
			n: u.candidates.length
		}) }),
		/* @__PURE__ */ (0, L.jsx)("p", { children: i("choose.sub") }),
		u.candidates.map((e) => /* @__PURE__ */ (0, L.jsx)("button", {
			type: "button",
			className: "opt",
			title: e,
			onClick: () => r.choose(e),
			children: Oi(e.startsWith(u.repoRoot + "/") ? e.slice(u.repoRoot.length + 1) : e, t)
		}, e)),
		/* @__PURE__ */ (0, L.jsx)("button", {
			type: "button",
			className: "cancel",
			onClick: r.cancel,
			children: i("choose.cancel")
		})
	] }), (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
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
function Xi({ screen: e, vacant: t, host: n }) {
	let { phrase: r, daemonText: i } = s(), { element: a, place: c } = o(n);
	return (0, I.useLayoutEffect)(() => {
		a && e !== null && (a.hidden = e !== "vacant");
	}, [e, a]), c(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("p", {
		className: "vacant-msg",
		id: "vacantMsg",
		children: i(t)
	}), /* @__PURE__ */ (0, L.jsx)("p", {
		className: "vacant-hint",
		children: r("vacant.hint")
	})] }), (e, t) => /* @__PURE__ */ (0, L.jsx)("section", {
		id: "vacantView",
		className: "vacant",
		ref: e,
		children: t
	}));
}
// src/components/WorkspaceShell.tsx
function Zi() {
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
var Qi = ({ id: e, hidden: t }) => /* @__PURE__ */ (0, L.jsxs)("div", {
	className: "unit",
	id: e,
	hidden: t,
	children: [
		/* @__PURE__ */ (0, L.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, L.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, L.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, L.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, L.jsx)("div", { className: "btn" }),
		/* @__PURE__ */ (0, L.jsx)("div", { className: "shell" }),
		/* @__PURE__ */ (0, L.jsx)("div", { className: "outline" }),
		/* @__PURE__ */ (0, L.jsxs)("div", {
			className: "stage",
			children: [
				/* @__PURE__ */ (0, L.jsx)("img", {
					className: "ly l0",
					alt: ""
				}),
				/* @__PURE__ */ (0, L.jsx)("div", { className: "veil" }),
				/* @__PURE__ */ (0, L.jsx)("img", {
					className: "ly l1",
					alt: ""
				}),
				/* @__PURE__ */ (0, L.jsx)("div", { className: "crease" }),
				/* @__PURE__ */ (0, L.jsx)("div", { className: "cam" })
			]
		}),
		/* @__PURE__ */ (0, L.jsx)("div", { className: "tick t-top" }),
		/* @__PURE__ */ (0, L.jsx)("div", { className: "tick t-bot" })
	]
});
function $i() {
	let e = Zi();
	return /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "ruler",
		id: "ruler",
		hidden: !0,
		children: [
			/* @__PURE__ */ (0, L.jsxs)("svg", {
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, L.jsx)("path", {
					className: "ext",
					id: "rlExt"
				}), /* @__PURE__ */ (0, L.jsx)("path", {
					className: "dim",
					id: "rlDim"
				})]
			}),
			/* @__PURE__ */ (0, L.jsx)("input", {
				className: "rl-badge",
				id: "rlW",
				type: "text",
				inputMode: "numeric",
				maxLength: 4,
				...e.label("size.w.label"),
				...e.title("size.w.tip")
			}),
			/* @__PURE__ */ (0, L.jsx)("input", {
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
function ea() {
	return /* @__PURE__ */ (0, L.jsx)("div", {
		className: "resize-scene",
		id: "resizeScene",
		hidden: !0,
		children: /* @__PURE__ */ (0, L.jsxs)("div", {
			className: "resize-geometry",
			id: "resizeGeometry",
			children: [
				/* @__PURE__ */ (0, L.jsx)(Qi, { id: "ua" }),
				/* @__PURE__ */ (0, L.jsx)(Qi, {
					id: "ub",
					hidden: !0
				}),
				/* @__PURE__ */ (0, L.jsx)($i, {}),
				/* @__PURE__ */ (0, L.jsxs)("div", {
					className: "duo",
					id: "duo",
					hidden: !0,
					children: [
						/* @__PURE__ */ (0, L.jsxs)("div", {
							className: "duo-base",
							children: [/* @__PURE__ */ (0, L.jsx)("div", { className: "duo-band" }), /* @__PURE__ */ (0, L.jsxs)("div", {
								className: "duo-scr",
								children: [/* @__PURE__ */ (0, L.jsx)("img", {
									className: "ly",
									alt: ""
								}), /* @__PURE__ */ (0, L.jsx)("div", { className: "cam" })]
							})]
						}),
						/* @__PURE__ */ (0, L.jsx)("div", { className: "btn" }),
						/* @__PURE__ */ (0, L.jsx)("div", { className: "btn" }),
						/* @__PURE__ */ (0, L.jsxs)("svg", {
							className: "duo-edge",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, L.jsxs)("defs", { children: [
									/* @__PURE__ */ (0, L.jsx)("path", { id: "duoSide" }),
									/* @__PURE__ */ (0, L.jsx)("path", { id: "duoHinge" }),
									/* @__PURE__ */ (0, L.jsxs)("linearGradient", {
										id: "duoSheen",
										gradientUnits: "userSpaceOnUse",
										children: [
											/* @__PURE__ */ (0, L.jsx)("stop", { offset: "0" }),
											/* @__PURE__ */ (0, L.jsx)("stop", { offset: ".4" }),
											/* @__PURE__ */ (0, L.jsx)("stop", { offset: "1" })
										]
									})
								] }),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "outl",
									href: "#duoSide"
								}),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "houtl",
									href: "#duoHinge"
								}),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "rim",
									href: "#duoSide"
								}),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "rimhi",
									href: "#duoSide"
								}),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "body",
									href: "#duoSide"
								}),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "sheen",
									href: "#duoSide",
									stroke: "url(#duoSheen)"
								}),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "hinge",
									href: "#duoHinge"
								}),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "hsheen",
									href: "#duoHinge",
									stroke: "url(#duoSheen)"
								}),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "ring",
									href: "#duoSide"
								}),
								/* @__PURE__ */ (0, L.jsx)("use", {
									className: "ring hr",
									href: "#duoHinge"
								})
							]
						}),
						/* @__PURE__ */ (0, L.jsxs)("div", {
							className: "duo-flap",
							children: [/* @__PURE__ */ (0, L.jsx)("div", { className: "duo-face" }), /* @__PURE__ */ (0, L.jsx)("div", { className: "duo-dark" })]
						})
					]
				}),
				/* @__PURE__ */ (0, L.jsx)("div", {
					className: "rig",
					id: "rig",
					hidden: !0,
					children: /* @__PURE__ */ (0, L.jsxs)("div", {
						className: "lift",
						children: [
							/* @__PURE__ */ (0, L.jsx)("div", { className: "plate" }),
							/* @__PURE__ */ (0, L.jsxs)("div", {
								className: "base",
								children: [
									/* @__PURE__ */ (0, L.jsxs)("div", {
										className: "clip",
										children: [
											/* @__PURE__ */ (0, L.jsx)("img", {
												className: "ly old",
												alt: ""
											}),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "veil" }),
											/* @__PURE__ */ (0, L.jsx)("img", {
												className: "ly neu",
												alt: ""
											}),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "cast" }),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "cam" })
										]
									}),
									/* @__PURE__ */ (0, L.jsx)("div", { className: "edge bez" }),
									/* @__PURE__ */ (0, L.jsx)("div", { className: "edge ring" })
								]
							}),
							/* @__PURE__ */ (0, L.jsxs)("div", {
								className: "leaf",
								children: [
									/* @__PURE__ */ (0, L.jsxs)("div", {
										className: "clip face inner",
										children: [
											/* @__PURE__ */ (0, L.jsx)("img", {
												className: "ly old",
												alt: ""
											}),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "veil" }),
											/* @__PURE__ */ (0, L.jsx)("img", {
												className: "ly neu",
												alt: ""
											}),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "shade" }),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "sheen" }),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "cam" })
										]
									}),
									/* @__PURE__ */ (0, L.jsxs)("div", {
										className: "clip face outer",
										children: [
											/* @__PURE__ */ (0, L.jsx)("img", {
												className: "ly old",
												alt: ""
											}),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "veil" }),
											/* @__PURE__ */ (0, L.jsx)("img", {
												className: "ly neu",
												alt: ""
											}),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "shade" }),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "sheen" }),
											/* @__PURE__ */ (0, L.jsx)("div", { className: "cam" })
										]
									}),
									/* @__PURE__ */ (0, L.jsx)("div", { className: "edge bez" }),
									/* @__PURE__ */ (0, L.jsx)("div", { className: "edge ring" })
								]
							}),
							/* @__PURE__ */ (0, L.jsx)("div", { className: "crease" }),
							/* @__PURE__ */ (0, L.jsx)("div", { className: "tick r-top" }),
							/* @__PURE__ */ (0, L.jsx)("div", { className: "tick r-bot" })
						]
					})
				})
			]
		})
	});
}
var ta = (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
	className: "workspace-loading",
	id: "workspaceLoading",
	role: "status",
	hidden: !0,
	ref: e,
	children: t
}), na = (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
	className: "sys-bars",
	id: "sysBars",
	"aria-hidden": "true",
	hidden: !0,
	ref: e,
	children: t
}), ra = (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
	className: "sys-ui",
	id: "sysUiCtl",
	role: "group",
	"data-t-aria-label": "systemUi.label",
	hidden: !0,
	ref: e,
	children: t
}), ia = (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
	className: "zoom at-fit",
	id: "zoomCtl",
	role: "group",
	"data-t-aria-label": "zoom.label",
	ref: e,
	children: t
});
function aa({ loading: e = ta(), bars: t = na() }) {
	return /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "stage",
		id: "stage",
		children: [
			/* @__PURE__ */ (0, L.jsx)("img", {
				id: "shot",
				alt: "preview"
			}),
			e,
			t,
			/* @__PURE__ */ (0, L.jsx)("div", {
				className: "marks",
				id: "marks",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, L.jsx)("div", {
				className: "box",
				id: "box"
			}),
			/* @__PURE__ */ (0, L.jsx)("div", {
				className: "box pick",
				id: "pickBox",
				hidden: !0
			})
		]
	});
}
function oa({ loading: e, bars: t }) {
	return /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "wrap",
		children: [/* @__PURE__ */ (0, L.jsx)(ea, {}), /* @__PURE__ */ (0, L.jsx)(aa, {
			loading: e,
			bars: t
		})]
	});
}
function sa() {
	let e = Zi(), t = (t, n, r) => /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "sl",
		"data-axis": t,
		children: [/* @__PURE__ */ (0, L.jsxs)("div", {
			className: "sl-h",
			children: [/* @__PURE__ */ (0, L.jsx)("span", {
				id: t === "w" ? "slWLb" : "slHLb",
				...e.text(n)
			}), /* @__PURE__ */ (0, L.jsxs)("span", {
				className: "v",
				children: [/* @__PURE__ */ (0, L.jsx)("b", {}), /* @__PURE__ */ (0, L.jsx)("small", { children: "dp" })]
			})]
		}), /* @__PURE__ */ (0, L.jsxs)("div", {
			className: "sl-track",
			children: [
				/* @__PURE__ */ (0, L.jsx)("span", { className: "fill" }),
				r.map((e) => /* @__PURE__ */ (0, L.jsxs)("span", {
					className: "tick",
					"data-v": e,
					children: [/* @__PURE__ */ (0, L.jsx)("i", {}), /* @__PURE__ */ (0, L.jsx)("em", { children: e })]
				}, e)),
				/* @__PURE__ */ (0, L.jsx)("span", {
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
	return /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "pn-sl",
		id: "pnSl",
		role: "group",
		...e.label("size.custom.label"),
		hidden: !0,
		children: [t("w", "size.w", [600, 840]), t("h", "size.h", [480, 900])]
	});
}
function ca() {
	let e = Zi(), t = (t, n, r, i = !1) => /* @__PURE__ */ (0, L.jsx)("button", {
		className: i ? "pn-it mono" : "pn-it",
		type: "button",
		role: "radio",
		"data-sel": t,
		...n ? e.title(n) : {},
		children: r
	}, t);
	return /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "pn-pick",
		id: "pnPick",
		role: "radiogroup",
		...e.label("panel.pick"),
		children: [/* @__PURE__ */ (0, L.jsxs)("section", {
			className: "pn-sec",
			children: [/* @__PURE__ */ (0, L.jsx)("h4", {
				className: "pn-h",
				...e.text("panel.size")
			}), /* @__PURE__ */ (0, L.jsxs)("div", {
				className: "pn-list",
				children: [
					t("original", "size.original.tip", "@Preview", !0),
					t("narrow", "size.narrow.tip", "320×640"),
					t("foldable", "size.foldable.tip", "673×841"),
					/* @__PURE__ */ (0, L.jsx)("button", {
						className: "pn-it",
						type: "button",
						role: "radio",
						"data-sel": "custom",
						...e.title("size.custom.tip"),
						...e.text("size.custom")
					})
				]
			})]
		}), /* @__PURE__ */ (0, L.jsxs)("section", {
			className: "pn-sec",
			children: [/* @__PURE__ */ (0, L.jsx)("h4", {
				className: "pn-h",
				...e.text("panel.device")
			}), /* @__PURE__ */ (0, L.jsxs)("div", {
				className: "pn-list",
				children: [
					/* @__PURE__ */ (0, L.jsx)("h5", {
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
					/* @__PURE__ */ (0, L.jsx)("h5", {
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
var la = (e) => /* @__PURE__ */ (0, L.jsx)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), ua = la(/* @__PURE__ */ (0, L.jsxs)("g", {
	className: "turn",
	children: [/* @__PURE__ */ (0, L.jsx)("rect", {
		x: "6.5",
		y: "3",
		width: "7",
		height: "14",
		rx: "1.6"
	}), /* @__PURE__ */ (0, L.jsx)("circle", {
		cx: "10",
		cy: "5.8",
		r: ".6",
		fill: "currentColor"
	})]
})), da = la(/* @__PURE__ */ (0, L.jsxs)("g", {
	className: "fold-ic",
	children: [/* @__PURE__ */ (0, L.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, L.jsx)("path", { d: "M3 10h4.5M5.5 7.8 7.7 10l-2.2 2.2M17 10h-4.5M14.5 7.8 12.3 10l2.2 2.2" })]
})), fa = la(/* @__PURE__ */ (0, L.jsxs)("g", {
	className: "unfold-ic",
	children: [/* @__PURE__ */ (0, L.jsx)("path", { d: "M10 3.5v13" }), /* @__PURE__ */ (0, L.jsx)("path", { d: "M7.5 10H3M5.2 7.8 3 10l2.2 2.2M12.5 10H17M14.8 7.8 17 10l-2.2 2.2" })]
})), pa = la(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("rect", {
	x: "3.5",
	y: "4",
	width: "13",
	height: "12",
	rx: "1.5"
}), /* @__PURE__ */ (0, L.jsx)("path", {
	d: "M10 4v12",
	strokeDasharray: "1.6 1.6"
})] })), ma = /* @__PURE__ */ (0, L.jsx)("svg", {
	className: "tb-chev",
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: /* @__PURE__ */ (0, L.jsx)("path", { d: "m4.5 6.5 3.5 3.5 3.5-3.5" })
});
function ha() {
	let e = Zi();
	return /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "dock-seg",
		id: "devCtl",
		role: "group",
		...e.label("posture.label"),
		hidden: !0,
		children: [
			/* @__PURE__ */ (0, L.jsxs)("div", {
				className: "orientation-pick",
				id: "dcOrientation",
				children: [/* @__PURE__ */ (0, L.jsxs)("button", {
					className: "tb-btn",
					id: "dcRot",
					type: "button",
					"data-orientation": "portrait",
					"aria-haspopup": "menu",
					"aria-expanded": "false",
					"aria-controls": "dcOrientMenu",
					...e.title("posture.orientation"),
					...e.label("posture.orientation"),
					children: [ua, ma]
				}), /* @__PURE__ */ (0, L.jsx)("div", {
					className: "zoom-menu",
					id: "dcOrientMenu",
					role: "menu",
					...e.label("posture.orientation"),
					inert: !0,
					children: [
						"portrait",
						"landscape-left",
						"landscape-right"
					].map((t) => /* @__PURE__ */ (0, L.jsx)("button", {
						type: "button",
						role: "menuitemradio",
						tabIndex: -1,
						"aria-checked": "false",
						"data-orientation": t,
						...e.text(`posture.${t}`)
					}, t))
				})]
			}),
			/* @__PURE__ */ (0, L.jsxs)("button", {
				className: "tb-btn",
				id: "dcFold",
				type: "button",
				"data-folded": "false",
				...e.title("posture.fold"),
				...e.label("posture.fold"),
				children: [da, fa]
			}),
			/* @__PURE__ */ (0, L.jsx)("button", {
				className: "tb-btn",
				id: "dcHinge",
				type: "button",
				"aria-pressed": "true",
				...e.title("posture.hinge.hide"),
				...e.label("posture.hinge"),
				children: pa
			})
		]
	});
}
function ga() {
	let e = Zi();
	return /* @__PURE__ */ (0, L.jsxs)("div", {
		className: "pn-fold",
		id: "pnFold",
		children: [/* @__PURE__ */ (0, L.jsxs)("button", {
			className: "tb-btn pn-sum",
			id: "pnSum",
			type: "button",
			"aria-haspopup": "true",
			"aria-expanded": "false",
			"aria-controls": "pnBody",
			...e.title("panel.pick"),
			children: [
				/* @__PURE__ */ (0, L.jsx)("span", { className: "pn-sum-sil" }),
				/* @__PURE__ */ (0, L.jsx)("span", { className: "nm" }),
				ma
			]
		}), /* @__PURE__ */ (0, L.jsx)("div", {
			className: "pn-body",
			id: "pnBody",
			inert: !0,
			children: /* @__PURE__ */ (0, L.jsx)(ca, {})
		})]
	});
}
function _a({ systemUi: e = ra(), zoom: t = ia() }) {
	return /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
		/* @__PURE__ */ (0, L.jsx)(ga, {}),
		/* @__PURE__ */ (0, L.jsx)(ha, {}),
		/* @__PURE__ */ (0, L.jsx)(sa, {}),
		e,
		t
	] });
}
// src/components/SystemBars.tsx
function va(e, t) {
	let n = e?.shown ? e.bars : null;
	if (n?.look !== "ios" || !n.insets || t?.kind !== "device") return null;
	let r = t.insetProfile?.safeArea, i = t.device === "duo", a = i && r ? r.left > 0 ? "left" : r.right > 0 ? "right" : null : null;
	return {
		w: t.widthDp,
		h: t.heightDp,
		statusDp: n.insets.statusDp,
		navDp: n.insets.navDp,
		side: a,
		sideDp: a && r ? r[a] : 0,
		duo: i,
		folded: t.folded
	};
}
var ya = 24, ba = 4, xa = .6, Sa = 1e3;
function Ca(e, [t, n, r, i]) {
	if (!e.naturalWidth) return "dark";
	try {
		let a = document.createElement("canvas");
		a.width = ya, a.height = ba;
		let o = a.getContext("2d", { willReadFrequently: !0 });
		if (!o) return "dark";
		o.drawImage(e, t * e.naturalWidth, n * e.naturalHeight, Math.max(1, r * e.naturalWidth), Math.max(1, i * e.naturalHeight), 0, 0, ya, ba);
		let s = o.getImageData(0, 0, ya, ba).data, c = 0, l = 0;
		for (let e = 0; e < s.length; e += 4) s[e + 3] && (c += (.2126 * s[e] + .7152 * s[e + 1] + .0722 * s[e + 2]) / 255, l++);
		return l && c / l <= xa ? "light" : "dark";
	} catch {
		return "dark";
	}
}
function wa(e, t) {
	let [n, r] = (0, I.useState)(["dark", "dark"]), i = t !== null, { w: a = 1, h: o = 1, statusDp: s = 0, navDp: c = 0, side: l = null, sideDp: u = 0 } = t ?? {};
	return (0, I.useEffect)(() => {
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
			let r = [Ca(e, t), Ca(e, [
				0,
				1 - c / o,
				1,
				c / o
			])];
			return r[0] === n[0] && r[1] === n[1] ? n : r;
		});
		n(), e.addEventListener("load", n);
		let d = window.setInterval(n, Sa);
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
var Ta = (e, t, n) => /* @__PURE__ */ (0, L.jsxs)("g", {
	transform: `translate(${e} ${t}) scale(${n})`,
	children: [
		/* @__PURE__ */ (0, L.jsx)("rect", {
			x: "0",
			y: "7",
			width: "3",
			height: "4",
			rx: ".8"
		}),
		/* @__PURE__ */ (0, L.jsx)("rect", {
			x: "4.5",
			y: "5",
			width: "3",
			height: "6",
			rx: ".8"
		}),
		/* @__PURE__ */ (0, L.jsx)("rect", {
			x: "9",
			y: "2.5",
			width: "3",
			height: "8.5",
			rx: ".8"
		}),
		/* @__PURE__ */ (0, L.jsx)("rect", {
			x: "13.5",
			y: "0",
			width: "3",
			height: "11",
			rx: ".8"
		})
	]
}), Ea = (e, t, n) => /* @__PURE__ */ (0, L.jsx)("g", {
	transform: `translate(${e} ${t}) scale(${n})`,
	children: /* @__PURE__ */ (0, L.jsx)("path", { d: "M7.5 11 L0 3.2 A11 11 0 0 1 15 3.2 Z" })
}), Da = (e, t, n) => /* @__PURE__ */ (0, L.jsxs)("g", {
	transform: `translate(${e} ${t}) scale(${n})`,
	children: [
		/* @__PURE__ */ (0, L.jsx)("rect", {
			x: ".5",
			y: ".5",
			width: "22",
			height: "11",
			rx: "3",
			fill: "none",
			stroke: "currentColor",
			opacity: ".45"
		}),
		/* @__PURE__ */ (0, L.jsx)("rect", {
			x: "2",
			y: "2",
			width: "19",
			height: "8",
			rx: "1.8"
		}),
		/* @__PURE__ */ (0, L.jsx)("rect", {
			x: "23.5",
			y: "4",
			width: "1.6",
			height: "4",
			rx: ".8",
			opacity: ".45"
		})
	]
});
function Oa({ x: e, y: t }) {
	return /* @__PURE__ */ (0, L.jsxs)("g", {
		className: "sb-duo-indicator",
		transform: `translate(${e} ${t})`,
		children: [
			/* @__PURE__ */ (0, L.jsxs)("g", {
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2.5",
				strokeLinecap: "round",
				children: [/* @__PURE__ */ (0, L.jsx)("path", { d: "M-16 9 A18 18 0 1 1 16 9" }), /* @__PURE__ */ (0, L.jsx)("path", { d: "M-8 -1 Q0 -9 8 -1 M-5 2 Q0 -3 5 2" })]
			}),
			/* @__PURE__ */ (0, L.jsx)("circle", {
				cy: "5",
				r: "1.7"
			}),
			/* @__PURE__ */ (0, L.jsxs)("g", {
				opacity: ".35",
				children: [
					/* @__PURE__ */ (0, L.jsx)("circle", {
						cx: "-10",
						cy: "16",
						r: "1.6"
					}),
					/* @__PURE__ */ (0, L.jsx)("circle", {
						cx: "-5",
						cy: "19",
						r: "1.6"
					}),
					/* @__PURE__ */ (0, L.jsx)("circle", {
						cy: "20",
						r: "1.6"
					}),
					/* @__PURE__ */ (0, L.jsx)("circle", {
						cx: "5",
						cy: "19",
						r: "1.6"
					}),
					/* @__PURE__ */ (0, L.jsx)("circle", {
						cx: "10",
						cy: "16",
						r: "1.6"
					})
				]
			})
		]
	});
}
function ka({ bars: e }) {
	let t = e.side ? e.side === "left" ? e.sideDp / 2 : e.w - e.sideDp / 2 : e.w - 46, n = e.side ? e.folded ? 124 : 78 : 42;
	return /* @__PURE__ */ (0, L.jsxs)("g", {
		className: "sb-status sb-duo-status",
		"data-edge": e.side ?? "top",
		children: [/* @__PURE__ */ (0, L.jsx)("text", {
			x: e.side ? t : t - 52,
			y: e.side ? n - 40 : n,
			dominantBaseline: "central",
			textAnchor: "middle",
			fontSize: "15",
			fontWeight: 600,
			children: "9:41"
		}), /* @__PURE__ */ (0, L.jsx)(Oa, {
			x: t,
			y: n
		})]
	});
}
function Aa({ bars: e }) {
	if (e.duo) return /* @__PURE__ */ (0, L.jsx)(ka, { bars: e });
	let t = (e.w - 126) / 4, n = e.statusDp / 2 + 2;
	return /* @__PURE__ */ (0, L.jsxs)("g", {
		className: "sb-status",
		"data-edge": "top",
		children: [
			/* @__PURE__ */ (0, L.jsx)("text", {
				x: t,
				y: n,
				dominantBaseline: "central",
				textAnchor: "middle",
				fontSize: "17",
				fontWeight: 600,
				children: "9:41"
			}),
			Ta(e.w - t - 36, n - 5.5, 1),
			Ea(e.w - t - 14, n - 5.5, 1),
			Da(e.w - t + 6, n - 6, 1)
		]
	});
}
function ja({ systemUi: e, size: t, host: n }) {
	let { element: r, place: i } = o(n), a = va(e, t), [s, c] = wa(r?.parentElement?.querySelector("#shot") ?? null, a);
	return (0, I.useLayoutEffect)(() => {
		r && (r.hidden = !a);
	}, [r, a]), i(a && /* @__PURE__ */ (0, L.jsxs)("svg", {
		viewBox: `0 0 ${a.w} ${a.h}`,
		preserveAspectRatio: "none",
		fill: "currentColor",
		"aria-hidden": "true",
		children: [(a.statusDp > 0 || a.side) && /* @__PURE__ */ (0, L.jsx)("g", {
			className: `sb-ink-${s}`,
			children: /* @__PURE__ */ (0, L.jsx)(Aa, { bars: a })
		}), !a.duo && a.navDp > 0 && /* @__PURE__ */ (0, L.jsx)("g", {
			className: `sb-ink-${c}`,
			children: /* @__PURE__ */ (0, L.jsx)("rect", {
				className: "sb-handle",
				x: (a.w - 134) / 2,
				y: a.h - 13,
				width: "134",
				height: "5",
				rx: "2.5"
			})
		})]
	}), na);
}
// src/components/Workspace.tsx
var Ma = {
	exit() {},
	zoomIn() {},
	zoomOut() {},
	zoomFit() {},
	zoomMenuPick() {},
	toggleZoomMenu() {},
	pickSystemUi() {}
};
function Na({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e), { on: i, failed: a } = (0, I.useSyncExternalStore)(mn.subscribe, mn.get);
	return (0, I.useLayoutEffect)(() => {
		n && (n.hidden = !i, n.classList.toggle("failed", a));
	}, [
		n,
		i,
		a
	]), r(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("span", {
		className: "workspace-spinner",
		"aria-hidden": "true"
	}), /* @__PURE__ */ (0, L.jsx)("span", {
		id: "workspaceLoadingText",
		children: t(a ? "workspace.loading.failed" : "workspace.loading")
	})] }), ta);
}
var Pa = /* @__PURE__ */ (0, L.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, L.jsx)("path", { d: "M4 8h8" })
}), Fa = /* @__PURE__ */ (0, L.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.7",
	strokeLinecap: "round",
	children: /* @__PURE__ */ (0, L.jsx)("path", { d: "M4 8h8M8 4v8" })
});
function Ia({ host: e, actions: t = Ma }) {
	let { phrase: n } = s(), { element: r, place: i } = o(e), { pct: a, real: c, atFit: l, menu: u, disabled: d } = (0, I.useSyncExternalStore)(Y.subscribe, Y.get);
	return (0, I.useLayoutEffect)(() => {
		r?.classList.toggle("at-fit", l);
	}, [r, l]), i(/* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
		/* @__PURE__ */ (0, L.jsx)("button", {
			type: "button",
			id: "zoomOutBtn",
			"aria-label": n("zoom.out"),
			title: n("zoom.out.tip"),
			disabled: d,
			onClick: t.zoomOut,
			children: Pa
		}),
		/* @__PURE__ */ (0, L.jsxs)("button", {
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
		/* @__PURE__ */ (0, L.jsx)("button", {
			type: "button",
			id: "zoomInBtn",
			"aria-label": n("zoom.in"),
			title: n("zoom.in.tip"),
			disabled: d,
			onClick: t.zoomIn,
			children: Fa
		}),
		/* @__PURE__ */ (0, L.jsx)("button", {
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
		/* @__PURE__ */ (0, L.jsxs)("div", {
			className: u ? "zoom-menu on" : "zoom-menu",
			id: "zoomMenu",
			role: "menu",
			children: [
				/* @__PURE__ */ (0, L.jsxs)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "fit",
					disabled: d,
					onClick: () => t.zoomMenuPick("fit"),
					children: [/* @__PURE__ */ (0, L.jsx)("span", { children: n("zoom.fit") }), /* @__PURE__ */ (0, L.jsx)("kbd", { children: "0" })]
				}),
				/* @__PURE__ */ (0, L.jsx)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "1",
					hidden: !c,
					disabled: d,
					onClick: () => t.zoomMenuPick("1"),
					children: n("zoom.real")
				}),
				/* @__PURE__ */ (0, L.jsx)("button", {
					type: "button",
					role: "menuitem",
					"data-z": "2",
					disabled: d,
					onClick: () => t.zoomMenuPick("2"),
					children: "200%"
				})
			]
		})
	] }), ia);
}
var La = /* @__PURE__ */ (0, L.jsxs)("svg", {
	className: "tb-ic",
	viewBox: "0 0 20 20",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: [/* @__PURE__ */ (0, L.jsx)("rect", {
		x: "5.5",
		y: "2.5",
		width: "9",
		height: "15",
		rx: "1.8"
	}), /* @__PURE__ */ (0, L.jsx)("path", { d: "M5.5 5.5h9M8.5 15h3" })]
});
function Ra({ systemUi: e, deviceInsets: t = null, host: n, actions: r = Ma }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n), { on: l } = (0, I.useSyncExternalStore)(mn.subscribe, mn.get), u = !e || !!t;
	(0, I.useLayoutEffect)(() => {
		a && (a.hidden = u);
	}, [a, u]);
	let d = !!e?.shown, f = i("systemUi.label");
	if ((0, I.useLayoutEffect)(() => {
		a?.setAttribute("aria-label", f);
	}, [a, f]), t) return c(null, ra);
	let p = d ? e?.bars?.insets : null, m = [
		i("systemUi.now", { value: i(d ? "systemUi.on" : "systemUi.off") }),
		p && i("systemUi.tip.device", {
			status: p.statusDp,
			nav: p.navDp,
			source: `${p.source} (${p.kind})`
		}),
		i("systemUi.tip")
	].filter(Boolean).join("\n");
	return c(/* @__PURE__ */ (0, L.jsx)("button", {
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
		children: La
	}), ra);
}
var za = 12, Ba = 48;
function Va(e, t) {
	let n = e.querySelector("#backName"), r = t.querySelector("#wsName"), i = t.querySelector("#wsFn"), a = e.parentElement, o = document.getElementById("barR");
	if (!n || !r || !i || !a || !o || (n.style.maxWidth = "", n.style.display = "", t.hidden || !(t.offsetParent instanceof HTMLElement))) return;
	if (getComputedStyle(t).position !== "absolute") {
		t.style.removeProperty("--ws-left"), t.style.removeProperty("--ws-max");
		return;
	}
	let s = t.offsetParent.clientWidth, c = o.offsetLeft - za, l = Math.min(Math.max(r.scrollWidth, i.hidden ? 0 : i.scrollWidth) + 1, s * .34), u = Math.min(s / 2 - l / 2, c - l), d = () => {
		let e = 0;
		for (let t of a.children) t instanceof HTMLElement && t.offsetParent && (e = Math.max(e, a.offsetLeft + t.offsetLeft + t.offsetWidth));
		return e + za;
	}, f = d();
	if (f > u && !e.hidden) {
		let e = n.offsetWidth - (f - u);
		e < Ba ? n.style.display = "none" : n.style.maxWidth = `${e}px`, f = d();
	}
	let p = Math.max(u, f), m = Math.max(0, Math.min(l, c - p));
	t.style.setProperty("--ws-left", `${p + m / 2}px`), t.style.setProperty("--ws-max", `${m}px`);
}
var Ha = /* @__PURE__ */ (0, L.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.8",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, L.jsx)("path", { d: "M10 3.5 5.5 8l4.5 4.5" })
});
function Ua({ state: e, hosts: t, actions: n = Ma }) {
	let { phrase: r } = s(), i = o(t?.back), a = o(t?.title), c = e?.screen === "focus" ? e.focus : null, l = c ? (e.tabs || []).find((e) => e.active) : void 0, u = c && e?.board ? e.board.groups.flatMap((e) => e.cards).find((t) => t.index === e.board.focus) : void 0;
	(0, I.useLayoutEffect)(() => {
		document.body.classList.toggle("ws", !!c), i.element && (i.element.hidden = !c), a.element && (a.element.hidden = !c, a.element.title = c ? u ? u.title : l ? l.title : c.previewId : ""), i.element && a.element && Va(i.element, a.element);
	}), (0, I.useLayoutEffect)(() => () => document.body.classList.remove("ws"), []), (0, I.useLayoutEffect)(() => {
		let e = i.element, t = a.element, n = e?.parentElement?.parentElement, r = document.getElementById("barR");
		if (!e || !t) return;
		let o = new ResizeObserver(() => Va(e, t));
		for (let e of [n, r]) e && o.observe(e);
		return () => o.disconnect();
	}, [i.element, a.element]);
	let d = /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [Ha, /* @__PURE__ */ (0, L.jsx)("span", {
		id: "backName",
		children: l ? l.name : r("nav.board")
	})] }), f = /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("span", {
		className: "ws-name",
		id: "wsName",
		children: c ? c.name || c.fn || c.previewId : ""
	}), /* @__PURE__ */ (0, L.jsx)("span", {
		className: "ws-fn",
		id: "wsFn",
		hidden: !c?.name,
		children: c?.name ? c.fn : ""
	})] });
	return (0, I.useLayoutEffect)(() => {
		let e = i.element;
		if (!e) return;
		let t = () => n.exit();
		return e.addEventListener("click", t), () => e.removeEventListener("click", t);
	}, [i.element, n]), /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [i.place(d, (e, t) => /* @__PURE__ */ (0, L.jsx)("button", {
		className: "back",
		id: "back",
		type: "button",
		ref: e,
		children: t
	})), a.place(f, (e, t) => /* @__PURE__ */ (0, L.jsx)("div", {
		className: "ws-title",
		id: "wsTitle",
		ref: e,
		children: t
	}))] });
}
function Wa({ screen: e, systemUi: t = null, deviceInsets: n = null, size: r = null, hosts: i, actions: a = Ma }) {
	let { phrase: o } = s(), [c, l] = (0, I.useState)(null), u = i?.view ?? c;
	return (0, I.useLayoutEffect)(() => {
		u && e !== null && (u.hidden = e !== "focus");
	}, [e, u]), i ? /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
		/* @__PURE__ */ (0, L.jsx)(Na, { host: i.loading }),
		/* @__PURE__ */ (0, L.jsx)(ja, {
			systemUi: t,
			size: r,
			host: i.bars
		}),
		/* @__PURE__ */ (0, L.jsx)(Ra, {
			systemUi: t,
			deviceInsets: n,
			host: i.systemUi,
			actions: a
		}),
		/* @__PURE__ */ (0, L.jsx)(Ia, {
			host: i.zoom,
			actions: a
		})
	] }) : /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [/* @__PURE__ */ (0, L.jsx)("section", {
		id: "focusView",
		ref: l,
		children: /* @__PURE__ */ (0, L.jsx)(oa, {
			loading: /* @__PURE__ */ (0, L.jsx)(Na, {}),
			bars: /* @__PURE__ */ (0, L.jsx)(ja, {
				systemUi: t,
				size: r
			})
		})
	}), /* @__PURE__ */ (0, L.jsx)("div", {
		className: "panel",
		id: "panel",
		role: "toolbar",
		"aria-label": o("panel.label"),
		children: /* @__PURE__ */ (0, L.jsx)(_a, {
			systemUi: /* @__PURE__ */ (0, L.jsx)(Ra, {
				systemUi: t,
				deviceInsets: n,
				actions: a
			}),
			zoom: /* @__PURE__ */ (0, L.jsx)(Ia, { actions: a })
		})
	})] });
}
// src/ViewerRoot.tsx
function Ga() {
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
			systemUi: e("sysUiCtl"),
			bars: e("sysBars"),
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
function Ka({ state: e, draw: t = 0, statusState: n = e, connection: r = null, app: i = null, shortcuts: a = [], hosts: o, board: s, workspace: c, point: l, renderLegacy: u }) {
	return (0, I.useLayoutEffect)(() => {
		e && u(e);
	}, [t]), o ? /* @__PURE__ */ (0, L.jsxs)(L.Fragment, { children: [
		/* @__PURE__ */ (0, L.jsx)(zt, {
			header: e?.header ?? null,
			tabs: e?.tabs ?? [],
			app: i,
			host: o.app,
			brand: o.brand
		}),
		/* @__PURE__ */ (0, L.jsx)(Si, {
			state: n,
			connection: r,
			host: o.status,
			bar: o.bar
		}),
		/* @__PURE__ */ (0, L.jsx)(Jt, { host: o.helpButton }),
		/* @__PURE__ */ (0, L.jsx)(Pt, {
			tabs: e?.tabs ?? null,
			screen: e?.screen ?? null,
			hosts: o.rail
		}),
		/* @__PURE__ */ (0, L.jsx)(xi, {
			rows: e?.stale ?? null,
			host: o.stale
		}),
		/* @__PURE__ */ (0, L.jsx)(Qr, {
			pending: !!e?.buildPending,
			host: o.buildNotice
		}),
		/* @__PURE__ */ (0, L.jsx)(bi, {
			board: e?.board ?? null,
			screen: e?.screen ?? null,
			hosts: o.board,
			actions: s
		}),
		/* @__PURE__ */ (0, L.jsx)(vt, {
			state: e,
			draw: t,
			connection: r,
			hosts: o.quickOpen
		}),
		/* @__PURE__ */ (0, L.jsx)(Xi, {
			screen: e?.screen ?? null,
			vacant: e?.vacant ?? null,
			host: o.vacant
		}),
		/* @__PURE__ */ (0, L.jsx)(Wa, {
			screen: e?.screen ?? null,
			systemUi: e?.focus?.systemUi ?? null,
			deviceInsets: e?.focus?.deviceInsets ?? null,
			size: e?.focus?.size ?? null,
			hosts: o.workspace,
			actions: c
		}),
		/* @__PURE__ */ (0, L.jsx)(Ua, {
			state: e,
			hosts: o.workspaceHeader,
			actions: c
		}),
		/* @__PURE__ */ (0, L.jsx)(Ji, { actions: l }),
		/* @__PURE__ */ (0, L.jsx)(Yi, {
			choice: e?.choice ?? null,
			repo: e?.header?.repo,
			host: o.chooser,
			actions: l
		}),
		/* @__PURE__ */ (0, L.jsx)($r, { host: o.capsule }),
		/* @__PURE__ */ (0, L.jsx)(qt, {
			table: a,
			host: o.help
		})
	] }) : null;
}
function qa({ renderLegacy: e, messages: t, hosts: n, shortcuts: r, board: i, workspace: a, point: o }) {
	let s = document.createElement("div");
	s.hidden = !0, document.body.append(s);
	let c = (0, Zr.createRoot)(s), l = null, u = null, f = null, p = null, m = 0, h = () => c.render(/* @__PURE__ */ (0, L.jsx)(d.Provider, {
		value: t,
		children: /* @__PURE__ */ (0, L.jsx)(Ka, {
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
	return (0, Xr.flushSync)(h), te("/app.json").then((e) => e.json()).then((e) => {
		p = e, h();
	}).catch(() => {
		p = {}, h();
	}), {
		apply(e, t = !1) {
			l = e, t && u || (u = e), m++, (0, Xr.flushSync)(h);
		},
		connection(e) {
			f = e, (0, Xr.flushSync)(h);
		},
		dispose() {
			c.unmount(), s.remove();
		}
	};
}
// src/main.tsx
var Ja = Bt(), Ya = lr(cr()), Xa = (e) => {
	Tr(e), Ja?.update(e);
}, Za = () => {
	let { cursor: e } = p();
	e != null && mr(e);
}, Qa = {
	exit: hr,
	zoomIn: Ya.zoomIn,
	zoomOut: Ya.zoomOut,
	zoomFit: Ya.zoomFit,
	zoomMenuPick: Ya.zoomMenuPick,
	toggleZoomMenu: Ya.toggleZoomMenu,
	pickSystemUi: gr
}, $a = {
	choose: Zn,
	cancel: Qn,
	follow: rr,
	pick: Kn,
	peek: qn,
	jump: Jn,
	close: Q
};
Xn();
var eo = {
	screen: () => F.st ? F.st.screen : "offline",
	tabCount: wt,
	moveCursor: v,
	openCursor: Za,
	exitFocus: hr,
	stepTab: St,
	jumpTab: Ct,
	openQuickOpen: ct,
	helpOpen: Gt,
	toggleHelp: Kt,
	zoomIn: Qa.zoomIn,
	zoomOut: Qa.zoomOut,
	zoomFit: Qa.zoomFit
}, to = Kr(k, eo);
Yr(to, eo, {
	chooserOpen: () => !!document.getElementById("chooser")?.classList.contains("on"),
	cancelChoice: Qn,
	closeZoomMenu: Ya.closeZoomMenu,
	closeDeviceMenu: Ya.closeDeviceMenu,
	closeDirPop: Rt,
	closeCard: Yn
});
var no = qa({
	renderLegacy: Xa,
	messages: {
		phrase: k,
		daemonText: O
	},
	hosts: Ga(),
	shortcuts: to,
	board: {
		open: mr,
		point: ir
	},
	workspace: Qa,
	point: $a
});
Gr({
	workspace: Ya,
	render: no.apply,
	onConnection: no.connection,
	onPreviewFiles: () => {
		lt(), zn();
	},
	prepared: Ja
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
