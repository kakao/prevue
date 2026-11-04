import { i as e, n as t, r as n, t as r } from "./react.js";
import { createScene as i, handoffMs as a, i as o, n as s, r as c, sceneEasing as l, sceneMs as u, t as d } from "./preparation-scene.js";
import { fetchPreviewFiles as f, get as p, post as m } from "./api.js";
import { applyReveal as h, boardMarks as g, cancelReveal as _, clearTrees as v, moveCursor as y, onRelayout as b, reveal as x, setCursor as S, subscribeBoard as C, syncBoard as w } from "./board.js";
import { pointCard as T } from "./board-point.js";
import { closeZoomMenu as E, enterFocus as D, exitFocus as O, toggleInteractive as k, zoomFit as A, zoomIn as ee, zoomOut as te } from "./focus.js";
import { drawLegacy as ne, startViewer as re } from "./main.js";
import { store as j } from "./store.js";
import { daemonText as ie, phrase as M } from "./strings.js";
import { capsuleContent as ae, dismissOnce as oe, flash as se, hideOnce as ce, showOnce as le, subscribeCapsule as ue } from "./capsule.js";
import { motionMs as de, motionToken as fe, reduced as pe, swapImage as me } from "./motion.js";
// src/components/FileIcon.tsx
var N = e(), P = t(), he = (e) => e ? e.startsWith("android") ? "android" : "kmp" : "file", ge = /* @__PURE__ */ (0, P.jsx)("path", { d: "M7 13H2.5V1.5h5L10 4V7" }), _e = {
	file: /* @__PURE__ */ (0, P.jsx)("path", { d: "M4 2h5.5L12 4.5V14H4z" }),
	android: /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [ge, /* @__PURE__ */ (0, P.jsxs)("g", {
		className: "mk-android",
		transform: "translate(5.5 6.4) scale(.75)",
		children: [/* @__PURE__ */ (0, P.jsx)("path", {
			fill: "currentColor",
			stroke: "none",
			d: "M2 12a6 6 0 0 1 12 0z"
		}), /* @__PURE__ */ (0, P.jsx)("path", {
			d: "M4.8 6.4 3.4 4.2M11.2 6.4l1.4-2.2",
			strokeWidth: "1.6"
		})]
	})] }),
	kmp: /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [ge, /* @__PURE__ */ (0, P.jsx)("path", {
		className: "mk-kmp",
		fill: "currentColor",
		stroke: "none",
		transform: "translate(7.2 7.2) scale(.18333)",
		d: "M0 22.5629V0.0835311L22.4794 22.5629H0ZM0 25.4372V48H0.0572568L22.6201 25.4372H0ZM25.9906 22.0094L48 0H3.98128L25.9906 22.0094ZM26.0193 26.1028L4.1221 48H47.9164L26.0193 26.1028Z"
	})] })
};
function ve({ kind: e }) {
	return /* @__PURE__ */ (0, P.jsx)("svg", {
		className: "rt-ic",
		viewBox: "0 0 16 16",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "1.4",
		strokeLinejoin: "round",
		strokeLinecap: "round",
		"aria-hidden": "true",
		children: _e[e]
	});
}
// src/match.ts
var F = -1e9, ye = /[/._\-\s]/, be = (e) => e !== e.toLowerCase();
function xe(e, t) {
	if (t === 0) return !0;
	let n = e[t - 1], r = e[t];
	return ye.test(n) || be(r) && !be(n) || /\d/.test(r) && !/\d/.test(n);
}
function Se(e, t) {
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
	let o = Array.from({ length: n }, () => new Float64Array(r).fill(F)), s = Array.from({ length: n }, () => new Int32Array(r).fill(-1));
	for (let e = 0; e < r; e++) a[e] === i[0] && (o[0][e] = 1 + (xe(t, e) ? 8 : 0) + (e === 0 ? 4 : 0) - e * .02);
	for (let e = 1; e < n; e++) {
		let n = F, c = -1;
		for (let l = e; l < r; l++) {
			if (l >= 2 && o[e - 1][l - 2] > n && (n = o[e - 1][l - 2], c = l - 2), a[l] !== i[e]) continue;
			let r = xe(t, l) ? 8 : 0, u = o[e - 1][l - 1] > F ? o[e - 1][l - 1] + 1 + 5 + r : F, d = n > F ? n + 1 + r - 3 : F;
			u >= d && u > F ? (o[e][l] = u, s[e][l] = l - 1) : d > F && (o[e][l] = d, s[e][l] = c);
		}
	}
	let c = F, l = -1;
	for (let e = 0; e < r; e++) o[n - 1][e] > c && (c = o[n - 1][e], l = e);
	if (l < 0) return null;
	let u = Array(n);
	for (let e = n - 1; e >= 0; e--) u[e] = l, l = s[e][l];
	return {
		score: c,
		idx: u
	};
}
var Ce = (e) => e.dir ??= e.rel.slice(0, e.rel.length - e.name.length).toLowerCase(), we = {
	name: 30,
	fn: 15,
	path: 0
};
function Te(e, t) {
	let n = 0, r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Map();
	for (let a of e) {
		let e = null, o = Se(a, t.name);
		o && (e = {
			s: o.score + we.name,
			kind: "name",
			idx: o.idx
		});
		for (let n of t.functions) {
			let t = Se(a, n);
			t && (!e || t.score + we.fn > e.s) && (e = {
				s: t.score + we.fn,
				kind: "fn",
				fn: n,
				idx: t.idx
			});
		}
		if (!e && Ce(t).includes(a.toLowerCase()) && (e = {
			s: 10 + we.path,
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
var Ee = 8, De = 5, Oe = [], ke = (e) => e.map((e) => ({
	...e,
	name: e.rel.split("/").pop()
}));
function Ae(e) {
	if (!e || !e.fns.size) return null;
	let t = null;
	for (let [n, r] of e.fns) (!t || r.size > t[1].size) && (t = [n, r]);
	return {
		fn: t[0],
		idx: t[1],
		more: e.fns.size - 1
	};
}
function je(e, t, n) {
	let r = t.trim().split(/\s+/).filter(Boolean);
	if (!e) return {
		sections: [],
		more: 0,
		empty: !r.length,
		loading: !0
	};
	if (!r.length) {
		let t = new Map(e.map((e) => [e.path, e])), r = e.slice(0, De), i = new Set(r.map((e) => e.path)), a = n.map((e) => t.get(e)).filter((e) => !!e && !i.has(e.path)), o = Ee - r.length, s = a.length < o ? e.slice(De).filter((e) => !a.includes(e)).slice(0, o - a.length) : [], c = [{
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
		let e = Te(r, t);
		e && i.push({
			f: t,
			m: e
		});
	}
	i.sort((e, t) => t.m.score - e.m.score || t.f.mtime - e.f.mtime);
	let a = i.slice(0, Ee).map((e) => ({
		...e,
		fn: Ae(e.m)
	}));
	return {
		sections: a.length ? [{ rows: a }] : [],
		more: Math.max(0, i.length - Ee),
		empty: !1,
		loading: !1
	};
}
function Me({ text: e, idx: t }) {
	if (!t?.size) return e;
	let n = [];
	return [...e].forEach((e, r) => {
		let i = t.has(r), a = n[n.length - 1];
		a && a[1] === i ? a[0] += e : n.push([e, i]);
	}), n.map(([e, t], n) => t ? /* @__PURE__ */ (0, P.jsx)("b", { children: e }, n) : e);
}
var Ne = /* @__PURE__ */ (0, P.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.4",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: /* @__PURE__ */ (0, P.jsx)("path", { d: "M3 8h10M9 4l4 4-4 4" })
}), Pe = (e) => (e || "").replace(/^:/, "").replace(/:/g, "/"), Fe = -1, Ie = -1, Le = !1;
addEventListener("mousemove", (e) => {
	Le = e.screenX !== Fe || e.screenY !== Ie, Fe = e.screenX, Ie = e.screenY;
}, !0);
var Re = (0, N.memo)(function({ files: e, ready: t, query: n, sel: r, recent: i = Oe, fieldRef: a, onQuery: o, onSelect: l, onPick: u, onEscape: d, onLeave: f }) {
	let { phrase: p } = s(), m = (0, N.useRef)(null), h = (0, N.useRef)(null), [g, _] = (0, N.useState)(null), v = (0, N.useRef)({
		fieldRef: a,
		onQuery: o
	});
	v.current = {
		fieldRef: a,
		onQuery: o
	};
	let y = (0, N.useCallback)((e) => {
		_(e), v.current.fieldRef?.(e);
	}, []), b = (0, N.useMemo)(() => e && ke(e), [e]), { sections: x, more: S, empty: C, loading: w } = (0, N.useMemo)(() => je(b, n, i), [
		b,
		n,
		i
	]), T = (0, N.useMemo)(() => x.flatMap((e) => e.rows), [x]), E = Math.min(r, T.length - 1);
	(0, N.useLayoutEffect)(() => {
		r > E && l(E);
	}, [r, E]), (0, N.useLayoutEffect)(() => {
		if (!g) return;
		let e = () => v.current.onQuery(g.value, g.value.trim() ? 0 : -1);
		return g.addEventListener("input", e), () => g.removeEventListener("input", e);
	}, [g]), (0, N.useLayoutEffect)(() => {
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
	}, O = (e, t) => /* @__PURE__ */ (0, P.jsxs)("div", {
		className: t === E ? "qo-row sel" : "qo-row",
		role: "option",
		"aria-selected": t === E,
		"data-i": t,
		style: { "--i": t },
		title: e.f.rel,
		onMouseDown: (e) => e.preventDefault(),
		onMouseMove: () => {
			Le && E !== t && l(t);
		},
		onClick: () => u?.(e),
		children: [
			/* @__PURE__ */ (0, P.jsx)("span", {
				className: "qo-arrow",
				children: Ne
			}),
			/* @__PURE__ */ (0, P.jsx)("span", {
				className: "qo-name",
				children: /* @__PURE__ */ (0, P.jsx)(Me, {
					text: e.f.name,
					idx: e.m?.name
				})
			}),
			e.fn && /* @__PURE__ */ (0, P.jsxs)("span", {
				className: "qo-fn",
				children: [
					"› ",
					/* @__PURE__ */ (0, P.jsx)(Me, {
						text: e.fn.fn,
						idx: e.fn.idx
					}),
					e.fn.more ? /* @__PURE__ */ (0, P.jsx)("span", {
						className: "qo-fn-more",
						children: ` +${e.fn.more}`
					}) : null
				]
			}),
			/* @__PURE__ */ (0, P.jsx)("span", {
				className: "qo-mod",
				children: Pe(e.f.module)
			})
		]
	}, e.f.path), k = null;
	w || !t && !T.length ? k = /* @__PURE__ */ (0, P.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.loading")
	}) : T.length || (k = C ? /* @__PURE__ */ (0, P.jsx)("div", {
		className: "qo-none",
		children: p("quickopen.none")
	}) : /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "qo-none",
		children: [p("quickopen.noMatch", { q: n.trim() }), /* @__PURE__ */ (0, P.jsx)("div", {
			className: "qo-why",
			children: p("quickopen.noMatch.why")
		})]
	}));
	let A = 0;
	return /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "qo-col",
		ref: m,
		onMouseDown: (e) => {
			e.target !== g && e.preventDefault();
		},
		children: [
			/* @__PURE__ */ (0, P.jsxs)("label", {
				className: "qo-field",
				children: [
					/* @__PURE__ */ (0, P.jsxs)("svg", {
						viewBox: "0 0 16 16",
						fill: "none",
						stroke: "currentColor",
						strokeWidth: "1.6",
						strokeLinecap: "round",
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, P.jsx)("circle", {
							cx: "7",
							cy: "7",
							r: "4.5"
						}), /* @__PURE__ */ (0, P.jsx)("path", { d: "m10.5 10.5 3 3" })]
					}),
					/* @__PURE__ */ (0, P.jsx)("input", {
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
					/* @__PURE__ */ (0, P.jsx)("kbd", {
						className: "qo-esc",
						"aria-hidden": "true",
						children: "esc"
					})
				]
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qo-in",
				id: "qoIn",
				role: "listbox",
				"aria-label": p("quickopen.list"),
				ref: h,
				children: [
					k,
					x.map((e, t) => [e.title ? /* @__PURE__ */ (0, P.jsx)("div", {
						className: "qo-h",
						children: p(e.title)
					}, `h${t}`) : null, ...e.rows.map((e) => O(e, A++))]),
					S ? /* @__PURE__ */ (0, P.jsx)("div", {
						className: "qo-foot",
						children: p("quickopen.more", { n: S })
					}) : null
				]
			}),
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "qo-hint",
				children: [/* @__PURE__ */ (0, P.jsxs)("span", {
					className: "qo-keys",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, P.jsx)("span", { children: p("quickopen.keys.move") }),
						/* @__PURE__ */ (0, P.jsx)("span", { children: p("quickopen.keys.open") }),
						/* @__PURE__ */ (0, P.jsx)("span", { children: p("quickopen.keys.close") })
					]
				}), /* @__PURE__ */ (0, P.jsxs)("span", {
					className: "qo-term",
					children: [
						/* @__PURE__ */ (0, P.jsx)("span", { children: p("quickopen.term") }),
						" ",
						/* @__PURE__ */ (0, P.jsxs)("code", { children: [
							"prevue show <",
							/* @__PURE__ */ (0, P.jsx)("span", { children: p("quickopen.term.file") }),
							">"
						] })
					]
				})]
			})
		]
	});
});
function ze({ hosts: e, children: t }) {
	let { place: n } = o(e?.sheet);
	return n(t, (e, t) => /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsx)("div", {
		className: "qo-curtain on",
		id: "qoCurtain"
	}), /* @__PURE__ */ (0, P.jsx)("div", {
		className: "qo-sheet on",
		id: "qoSheet",
		ref: e,
		children: t
	})] }));
}
function Be({ host: e, children: t }) {
	let { phrase: n } = s(), { place: r } = o(e);
	return r(/* @__PURE__ */ (0, P.jsxs)("div", {
		className: "start-in",
		children: [/* @__PURE__ */ (0, P.jsx)("p", {
			className: "start-lead",
			children: n("start.lead")
		}), t]
	}), (e, t) => /* @__PURE__ */ (0, P.jsx)("section", {
		id: "startView",
		className: "start",
		ref: e,
		children: t
	}));
}
var I = {
	open: !1,
	files: null,
	ready: !1,
	query: "",
	sel: -1,
	recent: []
}, Ve = /* @__PURE__ */ new Set();
function L(e, t = !1) {
	if (!Object.keys(e).every((t) => I[t] === e[t]) && (I = {
		...I,
		...e
	}, !t)) for (let e of Ve) e();
}
var He = (e) => (Ve.add(e), () => {
	Ve.delete(e);
}), Ue = () => I, R = null, z = null, B = null, V = !1, H = null, U = 0, W = !1, We = !1, Ge = null, Ke = 0, qe = () => "prevue.recent:" + (j.st?.header.repo || "");
function Je() {
	try {
		return JSON.parse(localStorage.getItem(qe()) || "[]");
	} catch {
		return [];
	}
}
function Ye(e, t = !1) {
	if (!e) return;
	let n = [e, ...Je().filter((t) => t !== e)].slice(0, 20);
	try {
		localStorage.setItem(qe(), JSON.stringify(n));
	} catch {}
	L({ recent: n }, t);
}
async function G() {
	let e = ++Ke, t = await f().then((e) => ({
		ready: e.ready,
		files: e.files
	}), () => ({
		files: [],
		ready: !0
	}));
	e === Ke && L(t);
}
function Xe(e = null) {
	if (V) z?.focus({ preventScroll: !0 }), z?.select();
	else if (R) {
		if (!I.open) {
			let { sheet: t, curtain: n } = R;
			W = !0, H = e && e !== document.body ? e : null, B?.setAttribute("aria-expanded", "true"), t.hidden = !1, n.hidden = !1, t.classList.remove("closing"), L({
				open: !0,
				query: "",
				sel: -1,
				recent: Je()
			}), requestAnimationFrame(() => {
				I.open && (n.classList.add("on"), t.classList.add("on"));
			}), G();
		}
		z?.focus({ preventScroll: !0 }), z?.select();
	}
}
function K(e = !1, t = !1) {
	if (U = 0, !I.open || !R) return;
	let { sheet: n, curtain: r } = R;
	z && (z.value = "", z.blur()), t && H?.isConnected && H.focus({ preventScroll: !0 }), H = null, L({ open: !1 }), B?.setAttribute("aria-expanded", "false"), r.classList.remove("on"), n.classList.remove("on"), e ? (n.hidden = !0, r.hidden = !0) : (n.classList.add("closing"), setTimeout(() => {
		I.open || (n.hidden = !0, r.hidden = !0, n.classList.remove("closing"));
	}, 220));
}
function Ze() {
	(I.open || V) && G();
}
var Qe = (e) => {
	let t = (e?.tabs || []).find((e) => e.active);
	return t ? t.key : e?.board?.file ?? null;
};
function $e() {
	let e = U = performance.now();
	setTimeout(() => {
		U === e && K();
	}, 1500);
}
async function et(e, { phrase: t, daemonText: n }) {
	let r = e.f, i = j.st, a = e.fn ? e.fn.fn : null;
	if (Ye(r.path, !0), r.path === Qe(i)) {
		x(r.path, a), i?.screen === "focus" && i.focus?.fromBoard ? ($e(), m("/viewer/exit")) : (K(), h());
		return;
	}
	x(r.path, a), $e();
	let o = await m("/viewer/open", { file: r.path }).then((e) => e.json()).catch((e) => ({
		ok: !1,
		message: t("open.failed", { why: e.message })
	}));
	o.ok || (U = 0, _(), se(n(o.message) || t("open.cannot")));
}
var tt = (e) => {
	e ? z = e : z && !z.isConnected && (z = null);
}, nt = (e, t) => L({
	query: e,
	sel: t
}), rt = (e) => L({ sel: e }), it = () => {
	V ? z?.blur() : K(!1, !0);
}, at = (e) => {
	I.open && R && e && !R.sheet.contains(e) && e !== B && K();
}, ot = (0, N.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, N.useLayoutEffect)(() => {
		if (!n) return;
		B = n, n.title = t("rail.open.tip"), n.setAttribute("aria-label", t("rail.open.label"));
		let e = (e) => I.open ? K(!1, !0) : Xe(e.detail === 0 ? n : null);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), B = null;
		};
	}, [n, t]), r(/* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
		/* @__PURE__ */ (0, P.jsx)("svg", {
			viewBox: "0 0 16 16",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: "1.6",
			strokeLinecap: "round",
			"aria-hidden": "true",
			children: /* @__PURE__ */ (0, P.jsx)("path", { d: "M8 3.5v9M3.5 8h9" })
		}),
		/* @__PURE__ */ (0, P.jsx)("span", {
			className: "rail-open-t",
			children: t("rail.open")
		}),
		/* @__PURE__ */ (0, P.jsx)("kbd", { children: "⌘K" })
	] }), (e, t) => /* @__PURE__ */ (0, P.jsx)("button", {
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
function st({ state: e, draw: t, connection: n, hosts: r }) {
	let i = s(), a = (0, N.useSyncExternalStore)(He, Ue), o = n !== "lost" && e?.screen === "empty" && !!e.header.repo;
	(0, N.useLayoutEffect)(() => {
		R = r;
		let e = (e) => {
			let t = e.target;
			I.open && !r.sheet.contains(t) && !r.curtain.contains(t) && !B?.contains(t) && K();
		}, t = () => K(!1, !0), n = () => {
			V && !document.hidden && G();
		};
		return document.addEventListener("pointerdown", e, !0), r.curtain.addEventListener("click", t), document.addEventListener("visibilitychange", n), () => {
			document.removeEventListener("pointerdown", e, !0), r.curtain.removeEventListener("click", t), document.removeEventListener("visibilitychange", n), R = null, V = !1;
		};
	}, [r]), (0, N.useLayoutEffect)(() => {
		o !== V && (V = o, o ? (K(!0), W = !0, r.start.hidden = !1, G()) : (r.start.hidden = !0, r.start.classList.remove("enter")), L({
			query: "",
			sel: -1,
			...o ? { recent: Je() } : {}
		}));
	}, [o]), (0, N.useLayoutEffect)(() => {
		if (!e) return;
		let t = Qe(e);
		t && t !== Ge && (Ge = t, Ye(t)), U && e.screen !== "empty" && K(!0);
	}, [t]), (0, N.useLayoutEffect)(() => {
		n === "lost" && K(!0);
	}, [n]), (0, N.useLayoutEffect)(() => {
		W ? ((V ? r.start : r.sheet).classList.add("enter"), (V ? r.sheet : r.start).classList.remove("enter"), W = !1, We = !0, requestAnimationFrame(() => {
			We = !1;
		})) : We || (r.sheet.classList.remove("enter"), r.start.classList.remove("enter"));
	});
	let c = (0, N.useCallback)((e) => et(e, i), [i]), l = /* @__PURE__ */ (0, P.jsx)(Re, {
		files: a.files,
		ready: a.ready,
		query: a.query,
		sel: a.sel,
		recent: a.recent,
		fieldRef: tt,
		onQuery: nt,
		onSelect: rt,
		onPick: c,
		onEscape: it,
		onLeave: at
	});
	return /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsx)(ze, {
		hosts: r,
		children: !o && l
	}), /* @__PURE__ */ (0, P.jsx)(Be, {
		host: r.start,
		children: o && l
	})] });
}
// src/components/FileRail.tsx
var ct = "prevue.sharedOnce", lt = [], q = [];
function ut(e) {
	let t = q.findIndex((e) => e.active), n = q[Math.max(0, Math.min(q.length - 1, t + e))];
	n && !n.active && m("/viewer/tab", { key: n.key });
}
function dt(e) {
	let t = q[e - 1];
	t && !t.active && m("/viewer/tab", { key: t.key });
}
var ft = () => q.length, pt = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
function mt(e) {
	let t = e.match(pt) || [e], n = "";
	for (let e = t.length - 1; e > 0 && !(n && (t[e] + n).length > 12); e--) n = t[e] + n;
	return n.length >= e.length - 2 ? "" : n;
}
var ht = null, J = (e, t) => (ht ??= document.createElement("canvas").getContext("2d"), ht.font = t, ht.measureText(e).width), gt = (e) => {
	let t = getComputedStyle(e);
	return `${t.fontWeight} ${t.fontSize} ${t.fontFamily}`;
};
function _t(e, t, n) {
	if (J(e, n) <= t) return e;
	let r = mt(e), i = r.match(pt) || [], a = i.map((e, t) => i.slice(t).join(""));
	for (let [r, i] of [...a.map((e) => [e, 3]), [a[a.length - 1] || "", 1]]) for (let a = e.length - r.length - 1; a >= i; a--) {
		let i = e.slice(0, a) + "…" + r;
		if (J(i, n) <= t) return i;
	}
	for (let i = 1; i < r.length; i++) {
		let a = e[0] + "…" + r.slice(i);
		if (J(a, n) <= t) return a;
	}
	return e[0] + "…";
}
var vt = 56;
function yt(e, t, n = !1) {
	let r = [...t.querySelectorAll(".rt:not(.leaving)")];
	if (!r.length || e.hidden) return;
	let i = (e, t) => e.querySelector(t), a = gt(i(r[0], ".rt-name")), o = gt(i(r[0], ".rt-mod")), s = parseFloat(getComputedStyle(r[0]).columnGap) || 0, c = (t) => t.dataset.name + "|" + i(t, ".rt-mod").textContent + "|" + e.clientWidth, l = r.filter((e) => n || e.dataset.fitted !== c(e));
	if (!l.length) return;
	for (let e of l) i(e, ".rt-mod").style.maxWidth = "0px";
	let u = l.map((e) => i(e, ".rt-name").clientWidth + (i(e, ".rt-mod").textContent ? s : 0));
	l.forEach((e, t) => {
		let n = i(e, ".rt-name"), r = i(e, ".rt-mod"), l = u[t], d = l;
		if (r.textContent) {
			let t = Math.min(Math.ceil(J(r.textContent, o)), Math.max(l - s - Math.ceil(J(e.dataset.name, a)), vt));
			r.style.maxWidth = t + "px", d = l - s - t;
		} else r.style.maxWidth = "";
		n.textContent = _t(e.dataset.name, d, a), e.dataset.fitted = c(e);
	});
}
function bt({ tab: e, leaving: t, enter: n, onGone: r, observe: i }) {
	let { phrase: a } = s(), o = (0, N.useRef)(null), [l, u] = (0, N.useState)(n);
	(0, N.useLayoutEffect)(() => {
		let e = o.current;
		c(e), i(e, !0);
		let t = 0;
		return l && (t = requestAnimationFrame(() => {
			t = requestAnimationFrame(() => u(!1));
		})), () => {
			cancelAnimationFrame(t), i(e, !1);
		};
	}, []), (0, N.useLayoutEffect)(() => {
		if (!t) return;
		let n = o.current;
		if (pe.matches || document.hidden) {
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
	let d = he(e.sourceSet), f = () => m("/viewer/close", { key: e.key });
	return /* @__PURE__ */ (0, P.jsxs)("div", {
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
			e.active || m("/viewer/tab", { key: e.key });
		},
		onAuxClick: (e) => {
			e.button === 1 && (e.preventDefault(), f());
		},
		children: [
			/* @__PURE__ */ (0, P.jsx)(ve, { kind: d }),
			/* @__PURE__ */ (0, P.jsx)("span", { className: "rt-name" }),
			/* @__PURE__ */ (0, P.jsx)("span", {
				className: "rt-mod",
				children: ((e.dim || "") + (e.module ? " · " + e.module : "")).replace(/^\s*·\s*/, "")
			}),
			/* @__PURE__ */ (0, P.jsx)("button", {
				type: "button",
				className: "rt-x",
				tabIndex: -1,
				"aria-label": a("tabs.close"),
				onClick: (e) => {
					e.stopPropagation(), f();
				},
				children: /* @__PURE__ */ (0, P.jsx)("svg", {
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.6",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, P.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
				})
			})
		]
	});
}
function xt({ tabs: e, screen: t, hosts: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n?.list), [c, l] = (0, N.useState)(null), [u, d] = (0, N.useState)(null), f = n?.rail ?? c, p = n?.empty ?? u, m = (0, N.useRef)(null), h = e ?? lt, g = t !== "focus", _ = (0, N.useRef)(h), [v, y] = (0, N.useState)([]);
	if (_.current !== h) {
		let e = new Set(h.map((e) => e.key)), t = _.current.filter((t) => !e.has(t.key) && !v.some((e) => e.key === t.key));
		(t.length || v.some((t) => e.has(t.key))) && y([...v.filter((t) => !e.has(t.key)), ...t]), _.current = h;
	}
	let b = (e) => y((t) => t.filter((t) => t.key !== e)), x = (0, N.useRef)(!1), S = (0, N.useRef)(null), C = x.current && g && !pe.matches && !document.hidden, w = (0, N.useRef)({
		y: 0,
		stretch: null,
		sliding: !1
	}), T = (e) => {
		let t = m.current, n = w.current;
		if (!t || !i) return;
		let r = i.querySelector(".rt.active:not(.leaving)");
		if (t.hidden = !r, !r) return;
		let a = r.offsetTop;
		e && !pe.matches && a !== n.y ? (n.stretch?.cancel(), n.sliding = !0, (n.stretch = t.animate([{ transform: `translateY(${n.y}px)` }, { transform: `translateY(${a}px)` }], {
			duration: de("--duration-medium2"),
			easing: fe("--easing-standard")
		})).finished.then(() => {
			n.stretch = null, n.sliding = !1;
		}, () => {})) : n.stretch && !e && (n.stretch.cancel(), n.stretch = null, n.sliding = !1), n.y = a, t.style.transform = `translateY(${a}px)`;
	}, E = (0, N.useRef)(T);
	E.current = T;
	let [D] = (0, N.useState)(() => new ResizeObserver(() => E.current(w.current.sliding))), O = (e, t) => {
		e && (t ? D.observe(e) : D.unobserve(e));
	};
	(0, N.useEffect)(() => () => D.disconnect(), [D]), (0, N.useEffect)(() => {
		f && i && document.fonts?.ready.then(() => yt(f, i, !0));
	}, [f, i]), (0, N.useLayoutEffect)(() => {
		if (!e || !f || !i) return;
		f.hidden = !g, n && document.body.classList.toggle("rail-on", g), p && (p.hidden = e.length > 0), yt(f, i), q = e;
		let t = e.find((e) => e.active);
		t && he(t.sourceSet) === "kmp" ? le(ct, () => r("capsule.sharedOnce", { sourceSet: t.sourceSet })) : ce(ct);
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
	}))], A = /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsx)("div", {
		className: "rail-glider instant",
		id: "railGlider",
		ref: m,
		hidden: !0
	}), k.map(({ tab: e, leaving: t }) => /* @__PURE__ */ (0, P.jsx)(bt, {
		tab: e,
		leaving: t,
		enter: C,
		onGone: b,
		observe: O
	}, e.key))] });
	return n ? /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [a(A, () => null), /* @__PURE__ */ (0, P.jsx)(ot, { host: n.open })] }) : /* @__PURE__ */ (0, P.jsxs)("nav", {
		className: "rail",
		id: "rail",
		ref: l,
		"aria-label": r("rail.title"),
		children: [
			/* @__PURE__ */ (0, P.jsx)("h4", {
				className: "rail-h",
				children: r("rail.title")
			}),
			a(A, (e, t) => /* @__PURE__ */ (0, P.jsx)("div", {
				className: "rail-list",
				id: "railList",
				ref: e,
				role: "tablist",
				"aria-orientation": "vertical",
				children: t
			})),
			/* @__PURE__ */ (0, P.jsx)("p", {
				className: "rail-empty",
				id: "railEmpty",
				ref: d,
				hidden: !0,
				children: r("rail.empty")
			}),
			/* @__PURE__ */ (0, P.jsx)(ot, {})
		]
	});
}
// src/components/ProjectHeader.tsx
var St = 8, Ct = (e) => [...e].reduce((e, t) => e * 31 + t.codePointAt(0) >>> 0, 7) % St + 1, Y = () => !1, wt = () => Y();
function Tt({ header: e, tabs: t, app: n, iconUrl: r = "/app-icon.png", host: i, brand: a }) {
	let { phrase: c } = s(), { element: l, place: u } = o(i), [d, f] = (0, N.useState)(!1), [p, h] = (0, N.useState)(null), g = (0, N.useRef)({
		open: !1,
		byKey: !1
	}), _ = (0, N.useRef)(null), v = (0, N.useRef)(null), y = (0, N.useRef)(null), b = e ? n?.name || e.repoLeaf : "";
	(0, N.useLayoutEffect)(() => {
		a && n?.prevue && (a.title = `Prevue ${n.prevue}`);
	}, [a, n]), (0, N.useLayoutEffect)(() => {
		y.current?.style.setProperty("background", e ? `var(--avatar-${Ct(b)})` : "");
	}, [e, b]), (0, N.useLayoutEffect)(() => {
		if (!e || !i) return;
		let n = t.find((e) => e.active);
		document.title = n ? `${n.name} — ${b}` : b;
	}, [
		e,
		i,
		t,
		b
	]), (0, N.useEffect)(() => {
		Y = () => {
			if (!g.current.open) return !1;
			g.current.open = !1;
			let e = document.activeElement;
			return e && v.current?.contains(e) && (g.current.byKey ? _.current?.focus({ preventScroll: !0 }) : e.blur()), h(null), !0;
		};
		let e = (e) => {
			!v.current?.contains(e.target) && e.target !== _.current && Y();
		};
		return addEventListener("pointerdown", e), () => {
			removeEventListener("pointerdown", e), Y = () => !1;
		};
	}, []);
	let x = (e, t) => {
		navigator.clipboard.writeText(e).then(() => se(c("header.copied", {
			what: t,
			text: e
		})), () => se(e));
	}, S = (e) => {
		Y() || (g.current = {
			open: !0,
			byKey: e.detail === 0
		}, h({ left: Math.round(e.currentTarget.getBoundingClientRect().left - (l?.getBoundingClientRect().left ?? 0) - 6) }));
	}, C = e ? [
		e.module,
		e.sourceSet && /* @__PURE__ */ (0, P.jsx)("span", {
			title: c("header.sourceSet", { variant: e.variant }),
			children: e.sourceSet
		}, "ss"),
		e.variant
	].filter(Boolean).flatMap((e, t) => [" · ", /* @__PURE__ */ (0, P.jsx)(N.Fragment, { children: e }, t)]) : [];
	return u(/* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
		/* @__PURE__ */ (0, P.jsx)("span", {
			className: "app-tile",
			id: "appTile",
			ref: y,
			"aria-hidden": "true",
			hidden: d,
			children: [...b][0] || ""
		}),
		/* @__PURE__ */ (0, P.jsx)("img", {
			className: "app-icon",
			id: "appIcon",
			alt: "",
			hidden: !d,
			src: n?.icon ? r : void 0,
			onLoad: () => f(!0)
		}),
		/* @__PURE__ */ (0, P.jsxs)("div", {
			className: "app-t",
			children: [/* @__PURE__ */ (0, P.jsx)("div", {
				className: "app-name",
				id: "appName",
				children: b
			}), /* @__PURE__ */ (0, P.jsxs)("div", {
				className: "proj",
				id: "proj",
				children: [
					/* @__PURE__ */ (0, P.jsx)("button", {
						className: "pj",
						id: "pjDir",
						ref: _,
						type: "button",
						"aria-haspopup": "dialog",
						"aria-expanded": p ? "true" : "false",
						"aria-controls": "dirPop",
						onClick: S,
						children: e?.repoLeaf
					}),
					/* @__PURE__ */ (0, P.jsxs)("button", {
						className: "pj pj-br",
						id: "pjBr",
						type: "button",
						title: c("brand.copyBranch"),
						hidden: !e?.branch,
						onClick: () => x(e?.branch || "", c("header.copy.branch")),
						children: [/* @__PURE__ */ (0, P.jsxs)("svg", {
							viewBox: "0 0 16 16",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: "1.5",
							strokeLinecap: "round",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, P.jsx)("circle", {
									cx: "5",
									cy: "3.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, P.jsx)("circle", {
									cx: "5",
									cy: "12.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, P.jsx)("circle", {
									cx: "11",
									cy: "5.5",
									r: "1.5"
								}),
								/* @__PURE__ */ (0, P.jsx)("path", { d: "M5 5v6M11 7c0 2.5-6 2-6 4" })
							]
						}), /* @__PURE__ */ (0, P.jsx)("span", {
							id: "pjBrName",
							children: e?.branch || ""
						})]
					}),
					/* @__PURE__ */ (0, P.jsx)("span", {
						className: "pj-rest",
						id: "pjRest",
						children: C
					})
				]
			})]
		}),
		/* @__PURE__ */ (0, P.jsxs)("div", {
			className: `pop dir-pop${p ? " on" : ""}`,
			id: "dirPop",
			ref: v,
			role: "dialog",
			"aria-label": c("header.dir"),
			style: p ? { left: `${p.left}px` } : void 0,
			children: [/* @__PURE__ */ (0, P.jsx)("div", {
				className: "dir-path",
				id: "dirPath",
				children: (e?.repo || "").split(/(?<=\/)/).flatMap((e, t) => [e, /* @__PURE__ */ (0, P.jsx)("wbr", {}, t)])
			}), /* @__PURE__ */ (0, P.jsxs)("div", {
				className: "dir-act",
				children: [/* @__PURE__ */ (0, P.jsx)("button", {
					type: "button",
					id: "dirCopy",
					onClick: () => {
						x(e?.repo || "", c("header.copy.path")), Y();
					},
					children: c("header.dir.copy")
				}), /* @__PURE__ */ (0, P.jsx)("button", {
					type: "button",
					id: "dirReveal",
					hidden: n ? !n.reveal : !1,
					onClick: () => {
						m("/viewer/reveal"), Y();
					},
					children: c("header.dir.reveal")
				})]
			})]
		})
	] }), (e, t) => /* @__PURE__ */ (0, P.jsx)("div", {
		className: "app",
		id: "app",
		ref: e,
		children: t
	}));
}
// src/preparation/PreparationScreen.ts
function Et() {
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
		o = !1, h++, v.abort(), m.forEach(clearTimeout), y.forEach((e) => e()), y.clear(), n.destroy(), C(!1), document.documentElement.classList.remove("preparation-cover"), document.removeEventListener("keydown", E, !0), document.removeEventListener("pointerdown", D, !0), document.removeEventListener("wheel", D, !0), removeEventListener("resize", O);
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
	function O() {
		f && !p && n.fit(f.card.widthDp || n.image.naturalWidth, f.card.heightDp || n.image.naturalHeight);
	}
	function k(e) {
		o && !s && (g = !0, _ = d?.board?.gen ?? 0, h++, c = null, n.fail(e));
	}
	async function A() {
		if (o && !s && /^http:\/\/127\.0\.0\.1:\d+\/preparation\/[a-f0-9]{32}$/.test(t.preparationStatus || "")) {
			try {
				let e = await (await fetch(t.preparationStatus, { signal: v.signal })).json();
				if (e.id !== t.id) return;
				if (e.phase === "failure") {
					k(e.errorKey ? M(e.errorKey) : e.error);
					return;
				}
				if (e.finished) return;
			} catch {
				if (!o || s) return;
			}
			S(A, 300);
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
	async function te(e, r) {
		if (await b(), await b(), !o || r !== h) return;
		let i = ee(e, !0);
		if (!i) {
			k(M("prep.image.missing"));
			return;
		}
		let c = new Image();
		c.src = i.card.imageUrl;
		try {
			await c.decode();
		} catch {
			o && r === h && k(M("prep.image.unreadable"));
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
	}), addEventListener("resize", O), A(), {
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
				k(ie(e.error));
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
				k(ie(l.failure) || M("prep.render.failed"));
				return;
			}
			if (r === c) return;
			c = r;
			let u = ++h;
			te(e, u).catch((e) => {
				o && u === h && k(e.message);
			});
		},
		fail: k
	};
}
// src/components/ShortcutHelp.tsx
var X = !1, Z = null, Dt = null, Ot = null, kt = () => X;
function At(e = !X, t = !1) {
	if (!Dt) return;
	let { scrim: n, sheet: r } = Dt;
	e && !X && (Z = t && document.activeElement !== document.body ? document.activeElement : null), X = e, e ? (n.hidden = !1, requestAnimationFrame(() => {
		X && (n.classList.add("on"), r.focus({ preventScroll: !0 }));
	})) : (n.classList.remove("on"), setTimeout(() => {
		X || (n.hidden = !0);
	}, 220), n.contains(document.activeElement) && document.activeElement.blur(), Z && Z.isConnected && Z.focus({ preventScroll: !0 }), Z = null), Ot?.setAttribute("aria-expanded", String(e));
}
var jt = (0, N.memo)(function({ table: e, logo: t = "prevue.svg", host: n }) {
	let { phrase: r } = s(), { element: i, place: a } = o(n), c = (0, N.useRef)(null);
	return (0, N.useLayoutEffect)(() => {
		if (!i || !c.current) return;
		Dt = {
			scrim: i,
			sheet: c.current
		};
		let e = (e) => {
			e.target === i && At(!1);
		};
		return i.addEventListener("click", e), () => {
			i.removeEventListener("click", e), Dt = null;
		};
	}, [i]), a(/* @__PURE__ */ (0, P.jsxs)("div", {
		className: "sheet",
		ref: c,
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "helpTitle",
		tabIndex: -1,
		children: [
			/* @__PURE__ */ (0, P.jsxs)("div", {
				className: "sheet-brand",
				children: [/* @__PURE__ */ (0, P.jsx)("img", {
					src: t,
					alt: ""
				}), "Prevue"]
			}),
			/* @__PURE__ */ (0, P.jsx)("h2", {
				id: "helpTitle",
				children: r("help.title")
			}),
			/* @__PURE__ */ (0, P.jsx)("div", {
				className: "sheet-body",
				children: e.map((e) => [/* @__PURE__ */ (0, P.jsx)("h3", { children: e.group }, `h${e.group}`), /* @__PURE__ */ (0, P.jsx)("dl", { children: e.rows.map((e, t) => [/* @__PURE__ */ (0, P.jsx)("dt", { children: e.cap.map((t, n) => [n && e.combo ? /* @__PURE__ */ (0, P.jsx)("span", {
					className: "plus",
					children: "+"
				}, `p${n}`) : null, /* @__PURE__ */ (0, P.jsx)("kbd", { children: t }, `k${n}`)]) }, `t${t}`), /* @__PURE__ */ (0, P.jsx)("dd", { children: e.label }, `d${t}`)]) }, `l${e.group}`)])
			})
		]
	}), (e, t) => /* @__PURE__ */ (0, P.jsx)("div", {
		className: "scrim",
		id: "help",
		ref: e,
		hidden: !0,
		children: t
	}));
}), Mt = (0, N.memo)(function({ host: e }) {
	let { phrase: t } = s(), { element: n, place: r } = o(e);
	return (0, N.useLayoutEffect)(() => {
		if (!n) return;
		Ot = n, n.title = t("header.help.tip"), n.setAttribute("aria-label", t("header.help"));
		let e = (e) => At(!X, e.detail === 0);
		return n.addEventListener("click", e), () => {
			n.removeEventListener("click", e), Ot = null;
		};
	}, [n, t]), r("?", (e, t) => /* @__PURE__ */ (0, P.jsx)("button", {
		className: "icon-btn",
		id: "helpBtn",
		ref: e,
		type: "button",
		"aria-haspopup": "dialog",
		"aria-expanded": "false",
		children: t
	}));
});
// src/shortcuts.ts
function Nt(e, t) {
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
					run: (e) => (Ft(e) === "+" ? t.zoomIn : t.zoomOut)()
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
					run: (e) => t.jumpTab(Number(Ft(e)))
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
function Pt(e) {
	return e instanceof HTMLElement && (e.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName));
}
function Ft(e) {
	return e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight") ? "⇧" + e.key : /^Digit[1-9]$/.test(e.code) && !e.shiftKey ? e.code.slice(5) : e.code === "KeyI" ? "i" : e.code === "Slash" && e.shiftKey ? "?" : e.code === "Equal" ? "+" : e.code === "Minus" ? "-" : e.code === "Digit0" ? "0" : e.key;
}
function It(e, t, n) {
	let r = (r) => {
		if ((r.metaKey || r.ctrlKey) && !r.altKey && !r.shiftKey && r.code === "KeyK" && t.screen() !== "offline") {
			r.preventDefault(), t.openQuickOpen(document.activeElement);
			return;
		}
		if (r.metaKey || r.ctrlKey || r.altKey || Pt(r.target)) return;
		let i = Ft(r), a = i === "Enter" && r.target instanceof Element && r.target.closest("button, [role=button]");
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
var Lt = n(), Rt = r();
function zt({ pending: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t);
	return (0, N.useLayoutEffect)(() => {
		r && (r.hidden = !e);
	}, [r, e]), i(n("build.notice"), (e, t) => /* @__PURE__ */ (0, P.jsx)("aside", {
		className: "build-notice",
		id: "buildNotice",
		role: "status",
		ref: e,
		hidden: !0,
		children: t
	}));
}
// src/components/NotificationCapsule.tsx
var Bt = (0, N.memo)(function({ content: e, host: t }) {
	let { phrase: n } = s(), { element: r, place: i } = o(t), a = (0, N.useSyncExternalStore)(ue, ae), { error: c, log: l, once: u } = e ?? a, d = !!(c.trim() || l.trim()) || !!u;
	(0, N.useLayoutEffect)(() => {
		r?.classList.toggle("on", d);
	}, [r, d]);
	let [f, ...p] = u ? u.text.split(/(?<=[.。])\s+/) : [];
	return i(/* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsxs)("div", {
		className: "cap-once",
		id: "capOnce",
		hidden: !u,
		children: [/* @__PURE__ */ (0, P.jsx)("span", {
			id: "capOnceText",
			children: u && /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsx)("b", { children: f }), p.length ? " " + p.join(" ") : null] })
		}), /* @__PURE__ */ (0, P.jsx)("button", {
			className: "cap-x",
			id: "capOnceX",
			type: "button",
			title: n("capsule.dismiss"),
			"aria-label": n("capsule.dismiss"),
			onClick: oe,
			children: /* @__PURE__ */ (0, P.jsx)("svg", {
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, P.jsx)("path", { d: "m5 5 6 6M11 5l-6 6" })
			})
		})]
	}), /* @__PURE__ */ (0, P.jsxs)("div", {
		className: "cap-main",
		children: [/* @__PURE__ */ (0, P.jsx)("div", {
			id: "sel",
			className: c ? "error" : "",
			children: c
		}), /* @__PURE__ */ (0, P.jsx)("div", {
			className: "log",
			id: "log",
			children: l
		})]
	})] }), (e, t) => /* @__PURE__ */ (0, P.jsx)("div", {
		className: "capsule",
		id: "strip",
		ref: e,
		role: "status",
		children: t
	}));
}), Vt = {
	cursor: null,
	returned: null
}, Ht = (e, t) => e.groups.flatMap((e) => e.cards).find((e) => e.index === t), Q = 300 / 360, Ut = .25, Wt = 100, Gt = 160, Kt = 360, qt = 640, Jt = 120;
function Yt(e, t, n) {
	let r = (t) => e.reduce((e, n) => e + Math.max(n * t, Wt), 0) + n * (e.length - 1);
	if (r(Q) <= t) return {
		s: Q,
		w: r(Q),
		wrap: !1
	};
	if (r(Ut) > t) return {
		s: Math.min(Q, ...e.map((e) => e * Ut >= Wt ? Ut : Wt / e)),
		w: t,
		wrap: !0
	};
	let i = Ut, a = Q;
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
var Xt = /* @__PURE__ */ new Map();
function Zt(e, t) {
	let n = t.cards.map((t) => {
		let n = e + "|" + t.previewId, r = Xt.get(n);
		return t.widthDp && t.heightDp && Xt.set(n, [t.widthDp, t.heightDp]), [t.widthDp || r?.[0], t.heightDp || r?.[1]];
	}), r = n.filter(([e, t]) => e && t).sort((e, t) => t[0] - e[0])[0];
	return n.map(([e, n], i) => {
		let a = t.cards[i].failure && r;
		return [e || (a ? r[0] : Kt), n || (a ? r[1] : qt)];
	});
}
function Qt(e, t, n) {
	let r = e.clientWidth;
	if (!r) return 0;
	let i = e.querySelectorAll(":scope > .group"), a = i[0]?.querySelector(".board"), o = a && parseFloat(getComputedStyle(a).columnGap) || 24;
	return t.groups.forEach((a, s) => {
		let c = i[s];
		if (!c) return;
		let l = Zt(t.file, a), { s: u, w: d, wrap: f } = Yt(l.map((e) => e[0]), r, o);
		c.style.width = f ? "100%" : Math.max(Gt, d) + "px", c.querySelector(".board").classList.toggle("spill", f);
		let p = c.querySelector(".sc"), m = u < .8333323333333333, h = a.cards.some((e) => e.dpGuess);
		p.hidden = !m, p.textContent = m ? (h ? "≈" : "") + Math.round(u * 100) + "%" : "", p.title = n("zoom.tip.real") + (h ? " · " + n("board.scale.guess") : ""), a.cards.forEach((t, n) => {
			let r = e.querySelector(`.card[data-i="${t.index}"]`);
			if (!r) return;
			let [i, a] = l[n], o = Math.max(i * u, Wt);
			r.style.width = o + "px";
			let s = r.querySelector(".cstage img");
			s.style.width = i * u + "px", s.style.aspectRatio = `auto ${i} / ${a}`;
			let c = r.querySelector(".ph"), d = Math.max(Jt, a * u);
			c.style.width = o + "px", c.style.height = d + "px", c.style.setProperty("--lines", String(Math.max(1, Math.floor((d - 55) / 16.7))));
		});
	}), r;
}
var $ = (e) => /* @__PURE__ */ (0, P.jsx)("svg", {
	viewBox: "0 0 12 12",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.1",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	children: e
}), $t = /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsx)("rect", {
	x: "3.25",
	y: "1.25",
	width: "5.5",
	height: "9.5",
	rx: "1.2"
}), /* @__PURE__ */ (0, P.jsx)("path", { d: "M5.25 9h1.5" })] }), en = {
	portrait: $($t),
	landscape: $(/* @__PURE__ */ (0, P.jsx)("rect", {
		x: "1.25",
		y: "3",
		width: "9.5",
		height: "6",
		rx: "1.2"
	})),
	device: $($t),
	dark: $(/* @__PURE__ */ (0, P.jsx)("path", { d: "M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z" })),
	font: /* @__PURE__ */ (0, P.jsx)("span", {
		className: "aa",
		children: "Aa"
	}),
	locale: $(/* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsx)("circle", {
		cx: "6",
		cy: "6",
		r: "4.75"
	}), /* @__PURE__ */ (0, P.jsx)("path", { d: "M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75" })] })),
	api: $(/* @__PURE__ */ (0, P.jsx)("path", { d: "M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5" })),
	systemUi: $(/* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [/* @__PURE__ */ (0, P.jsx)("rect", {
		x: "3.25",
		y: "1.25",
		width: "5.5",
		height: "9.5",
		rx: "1.2"
	}), /* @__PURE__ */ (0, P.jsx)("path", { d: "M3.5 3.25h5" })] }))
}, tn = /* @__PURE__ */ (0, P.jsx)("svg", {
	viewBox: "0 0 16 16",
	fill: "currentColor",
	children: /* @__PURE__ */ (0, P.jsx)("path", { d: "M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z" })
});
function nn({ card: e }) {
	let { daemonText: t } = s();
	return /* @__PURE__ */ (0, P.jsx)("span", {
		className: "specs",
		title: e.args,
		children: e.specs.map((e, n) => {
			let r = t(e.text), [i, a] = e.kind === "size" ? r.split("×").map(Number) : [], o = e.kind === "size" ? i > a ? "landscape" : "portrait" : e.kind;
			return /* @__PURE__ */ (0, P.jsxs)("span", {
				className: "spec",
				children: [en[o] ?? null, /* @__PURE__ */ (0, P.jsxs)("span", { children: [r, e.kind === "size" && /* @__PURE__ */ (0, P.jsx)("span", {
					className: "unit",
					children: "dp"
				})] })]
			}, n);
		})
	});
}
var rn = (0, N.memo)(function({ card: e, fn: t, cursor: n = !1, returned: r = !1, actions: i }) {
	let { phrase: a, daemonText: o } = s(), c = (0, N.useRef)(null), l = (0, N.useRef)(null), u = (0, N.useRef)(null), d = (0, N.useRef)(null), f = !!(e.ok && e.imageUrl);
	(0, N.useLayoutEffect)(() => {
		if (!i) return;
		let t = new AbortController();
		return i.point(e.index, {
			stage: c.current,
			img: l.current,
			box: u.current,
			pick: d.current
		}, t.signal), () => t.abort();
	}, [i, e.index]), (0, N.useLayoutEffect)(() => {
		let t = l.current;
		f ? (t.dataset.url !== e.imageUrl && (me(t, e.imageUrl), u.current.hidden = !0, d.current.hidden = !0), t.hidden = !1) : t.hidden = !0;
	}, [f, e.imageUrl]);
	let p = !f && e.failure ? o(e.failure) : null;
	return /* @__PURE__ */ (0, P.jsxs)("article", {
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
		children: [/* @__PURE__ */ (0, P.jsxs)("div", {
			className: "cstage",
			ref: c,
			children: [
				/* @__PURE__ */ (0, P.jsx)("img", {
					alt: "",
					hidden: !0,
					ref: l
				}),
				/* @__PURE__ */ (0, P.jsx)("div", {
					className: "box",
					hidden: !0,
					ref: u
				}),
				/* @__PURE__ */ (0, P.jsx)("div", {
					className: "box pick",
					hidden: !0,
					ref: d,
					children: /* @__PURE__ */ (0, P.jsx)("span", { className: "tag" })
				}),
				/* @__PURE__ */ (0, P.jsx)("div", {
					className: p ? "ph bad" : "ph",
					hidden: f,
					title: p ?? "",
					children: p ? /* @__PURE__ */ (0, P.jsx)("span", {
						className: "why",
						children: p
					}) : a("card.waiting")
				})
			]
		}), /* @__PURE__ */ (0, P.jsxs)("div", {
			className: "label",
			children: [
				/* @__PURE__ */ (0, P.jsx)("span", {
					className: "fn",
					title: e.label ? e.label + "\n" + e.title : e.title,
					children: e.label
				}),
				/* @__PURE__ */ (0, P.jsxs)("button", {
					className: "go",
					type: "button",
					title: a("card.go.tip"),
					onClick: () => {
						S(e.index), i?.open(e.index);
					},
					children: [tn, /* @__PURE__ */ (0, P.jsx)("span", {
						className: "go-t",
						children: a("card.go")
					})]
				}),
				/* @__PURE__ */ (0, P.jsxs)("div", {
					className: "sub",
					children: [/* @__PURE__ */ (0, P.jsx)(nn, { card: e }), /* @__PURE__ */ (0, P.jsx)("span", {
						className: "meta",
						children: f ? o(e.meta) : ""
					})]
				})
			]
		})]
	});
});
function an({ group: e, marks: t = Vt, actions: n }) {
	let { phrase: r } = s();
	return /* @__PURE__ */ (0, P.jsxs)("section", {
		className: "group",
		"data-fn": e.name,
		children: [/* @__PURE__ */ (0, P.jsxs)("div", {
			className: "ghead",
			children: [/* @__PURE__ */ (0, P.jsx)("span", {
				className: "gn",
				title: e.name,
				children: e.name
			}), /* @__PURE__ */ (0, P.jsxs)("span", {
				className: "m",
				children: [
					/* @__PURE__ */ (0, P.jsx)("span", {
						className: "n",
						children: r("board.count", { n: e.cards.length })
					}),
					/* @__PURE__ */ (0, P.jsx)("span", {
						className: "sc",
						hidden: !0
					}),
					/* @__PURE__ */ (0, P.jsx)("span", {
						className: "bad",
						children: e.failed ? `· ${r("board.failed", { n: e.failed })}` : ""
					})
				]
			})]
		}), /* @__PURE__ */ (0, P.jsx)("div", {
			className: "gbody",
			children: /* @__PURE__ */ (0, P.jsx)("div", {
				className: "board",
				children: e.cards.map((r) => /* @__PURE__ */ (0, P.jsx)(rn, {
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
function on({ board: e, screen: t, hosts: n, actions: r }) {
	let { phrase: i } = s(), { element: a, place: c } = o(n?.cards), [l, u] = (0, N.useState)(null), d = n?.view ?? l, f = (0, N.useSyncExternalStore)(C, g), p = (0, N.useRef)({
		board: null,
		live: null
	}), m = (0, N.useMemo)(() => {
		let n = p.current;
		if (t === "focus" && e) return n.live = Ht(e, e.focus)?.imageUrl ?? null, n.board;
		let r = e && Ht(e, e.focus);
		return e && n.board?.file === e.file && n.live && r?.imageUrl === n.live ? {
			...n.board,
			focus: e.focus
		} : (n.board = e, n.live = null, e);
	}, [e, t]), h = m ? m.file + "|" + m.groups.map((e) => e.cards.map((e) => e.previewId).join(",")).join("|") : "";
	(0, N.useLayoutEffect)(() => {
		v();
	}, [h]);
	let _ = (0, N.useRef)(m), y = (0, N.useRef)(i), x = (0, N.useRef)(0);
	_.current = m, y.current = i, (0, N.useLayoutEffect)(() => {
		d && (t !== null && (d.hidden = t !== "board"), t !== "focus" && (w(m), m && a && (x.current = Qt(a, m, i) || x.current)));
	}, [
		m,
		t,
		d,
		a
	]), (0, N.useEffect)(() => {
		if (!a) return;
		let e = () => {
			_.current && (x.current = Qt(a, _.current, y.current) || x.current);
		}, t = new ResizeObserver(() => {
			let t = a.clientWidth;
			t && t !== x.current && e();
		});
		return t.observe(a), b(e), () => {
			t.disconnect(), b(() => {});
		};
	}, [a]);
	let S = m && /* @__PURE__ */ (0, P.jsx)(N.Fragment, { children: m.groups.map((e, t) => /* @__PURE__ */ (0, P.jsx)(an, {
		group: e,
		marks: f,
		actions: r
	}, t)) }, h);
	return n ? c(S, () => null) : /* @__PURE__ */ (0, P.jsx)("section", {
		id: "boardView",
		ref: u,
		children: c(S, (e, t) => /* @__PURE__ */ (0, P.jsx)("div", {
			className: "board",
			id: "cards",
			ref: e,
			children: t
		}))
	});
}
// src/components/StaleBanner.tsx
function sn({ rows: e, host: t }) {
	let { daemonText: n } = s(), { element: r, place: i } = o(t), a = (0, N.useRef)([]);
	e?.length && (a.current = e);
	let c = !!e?.length;
	return (0, N.useLayoutEffect)(() => {
		r && e && (r.classList.toggle("on", c), t && document.body.classList.toggle("stale", c));
	}, [
		r,
		t,
		e,
		c
	]), i(/* @__PURE__ */ (0, P.jsx)("div", {
		className: "in",
		children: /* @__PURE__ */ (0, P.jsx)("div", {
			className: "rows",
			id: "staleRows",
			children: a.current.map((e, t) => /* @__PURE__ */ (0, P.jsxs)("div", {
				className: "row",
				children: [/* @__PURE__ */ (0, P.jsx)("span", {
					className: "head",
					children: n(e.head)
				}), /* @__PURE__ */ (0, P.jsx)("span", {
					className: "why",
					children: e.why.map(n).join(" · ")
				})]
			}, t))
		})
	}), (e, t) => /* @__PURE__ */ (0, P.jsx)("div", {
		className: "stalebar",
		id: "staleBar",
		ref: e,
		children: t
	}));
}
// src/components/StatusPill.tsx
function cn({ state: e, connection: t = null, host: n, bar: r }) {
	let { phrase: i, daemonText: a } = s(), { element: c, place: l } = o(n), u = (0, N.useRef)(!1);
	t === "restarting" && (u.current = !0);
	let d = e?.timing.find((e) => e.head), f = !!e?.timing.some((e) => e.over), p = !!e && (!!e.error || e.stale.length > 0 || !!e.board?.groups.some((e) => e.failed)), m = e ? e.busy ? "busy" : p ? "error" : f ? "over" : d ? "idle" : "none" : "none", h = e ? e.busy ? a(e.boardNote) : d ? d.text : "" : "";
	t === "restarting" && (m = "busy", h = i("status.restarting")), t === "lost" && (m = "error", h = i("status.lost.short"));
	let g = u.current || !!e?.busy;
	return (0, N.useLayoutEffect)(() => {
		c && (e || t) && (c.dataset.state = m);
	}, [
		c,
		e,
		t,
		m
	]), (0, N.useLayoutEffect)(() => {
		r && (e || t) && r.classList.toggle("busy", g);
	}, [
		r,
		e,
		t,
		g
	]), l(/* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
		/* @__PURE__ */ (0, P.jsxs)("span", {
			className: "st-ic",
			"aria-hidden": "true",
			children: [
				/* @__PURE__ */ (0, P.jsx)("svg", {
					className: "i-ok",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					children: /* @__PURE__ */ (0, P.jsx)("path", { d: "m3.5 8.5 3 3 6-7" })
				}),
				/* @__PURE__ */ (0, P.jsx)("svg", {
					className: "i-busy",
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "1.8",
					strokeLinecap: "round",
					children: /* @__PURE__ */ (0, P.jsx)("path", { d: "M8 2.5a5.5 5.5 0 1 1-5.5 5.5" })
				}),
				/* @__PURE__ */ (0, P.jsxs)("svg", {
					className: "i-bad",
					viewBox: "0 0 16 16",
					children: [
						/* @__PURE__ */ (0, P.jsx)("circle", {
							cx: "8",
							cy: "8",
							r: "6.5",
							fill: "currentColor"
						}),
						/* @__PURE__ */ (0, P.jsx)("path", {
							className: "mark",
							d: "M8 4.8v3.8",
							strokeWidth: "1.7",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ (0, P.jsx)("circle", {
							className: "mark",
							cx: "8",
							cy: "11.2",
							r: ".95"
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, P.jsx)("span", {
			className: "st-text",
			id: "statusText",
			children: h
		}),
		/* @__PURE__ */ (0, P.jsxs)("div", {
			className: "pop",
			role: "tooltip",
			children: [
				/* @__PURE__ */ (0, P.jsx)("div", {
					className: "note",
					id: "note",
					children: a(e?.boardNote ?? null)
				}),
				/* @__PURE__ */ (0, P.jsx)("div", {
					className: "who",
					id: "who",
					children: a(e?.who ?? null)
				}),
				/* @__PURE__ */ (0, P.jsx)("div", {
					className: "settle",
					id: "settle",
					children: a(e?.settle ?? null)
				}),
				/* @__PURE__ */ (0, P.jsx)("div", {
					className: "timing",
					id: "timing",
					children: e?.timing.flatMap((e, t) => [/* @__PURE__ */ (0, P.jsx)("span", {
						className: e.over ? "over" : void 0,
						children: a(e.label)
					}, `k${t}`), /* @__PURE__ */ (0, P.jsx)("b", {
						className: e.over ? "over" : void 0,
						children: e.text
					}, `v${t}`)])
				}),
				/* @__PURE__ */ (0, P.jsx)("div", {
					className: "where",
					id: "where",
					children: e ? location.host : ""
				})
			]
		})
	] }), (e, t) => /* @__PURE__ */ (0, P.jsx)("div", {
		className: "status",
		id: "status",
		ref: e,
		tabIndex: 0,
		"data-state": "none",
		children: t
	}));
}
// src/ViewerRoot.tsx
function ln() {
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
		help: e("help")
	};
}
function un({ state: e, draw: t = 0, statusState: n = e, connection: r = null, app: i = null, shortcuts: a = [], hosts: o, board: s, renderLegacy: c }) {
	return (0, N.useLayoutEffect)(() => {
		e && c(e);
	}, [t]), o ? /* @__PURE__ */ (0, P.jsxs)(P.Fragment, { children: [
		/* @__PURE__ */ (0, P.jsx)(Tt, {
			header: e?.header ?? null,
			tabs: e?.tabs ?? [],
			app: i,
			host: o.app,
			brand: o.brand
		}),
		/* @__PURE__ */ (0, P.jsx)(cn, {
			state: n,
			connection: r,
			host: o.status,
			bar: o.bar
		}),
		/* @__PURE__ */ (0, P.jsx)(Mt, { host: o.helpButton }),
		/* @__PURE__ */ (0, P.jsx)(xt, {
			tabs: e?.tabs ?? null,
			screen: e?.screen ?? null,
			hosts: o.rail
		}),
		/* @__PURE__ */ (0, P.jsx)(sn, {
			rows: e?.stale ?? null,
			host: o.stale
		}),
		/* @__PURE__ */ (0, P.jsx)(zt, {
			pending: !!e?.buildPending,
			host: o.buildNotice
		}),
		/* @__PURE__ */ (0, P.jsx)(on, {
			board: e?.board ?? null,
			screen: e?.screen ?? null,
			hosts: o.board,
			actions: s
		}),
		/* @__PURE__ */ (0, P.jsx)(st, {
			state: e,
			draw: t,
			connection: r,
			hosts: o.quickOpen
		}),
		/* @__PURE__ */ (0, P.jsx)(Bt, { host: o.capsule }),
		/* @__PURE__ */ (0, P.jsx)(jt, {
			table: a,
			host: o.help
		})
	] }) : null;
}
function dn({ renderLegacy: e, messages: t, hosts: n, shortcuts: r, board: i }) {
	let a = document.createElement("div");
	a.hidden = !0, document.body.append(a);
	let o = (0, Rt.createRoot)(a), s = null, c = null, l = null, u = null, f = 0, m = () => o.render(/* @__PURE__ */ (0, P.jsx)(d.Provider, {
		value: t,
		children: /* @__PURE__ */ (0, P.jsx)(un, {
			state: s,
			draw: f,
			statusState: c,
			connection: l,
			app: u,
			shortcuts: r,
			hosts: n,
			board: i,
			renderLegacy: e
		})
	}));
	return (0, Lt.flushSync)(m), p("/app.json").then((e) => e.json()).then((e) => {
		u = e, m();
	}).catch(() => {
		u = {}, m();
	}), {
		apply(e, t = !1) {
			s = e, t && c || (c = e), f++, (0, Lt.flushSync)(m);
		},
		connection(e) {
			l = e, (0, Lt.flushSync)(m);
		},
		dispose() {
			o.unmount(), a.remove();
		}
	};
}
// src/main.tsx
var fn = Et(), pn = (e) => {
	ne(e), fn?.update(e);
}, mn = {
	screen: () => j.st ? j.st.screen : "offline",
	fromBoard: () => !!j.st?.focus?.fromBoard,
	tabCount: ft,
	moveCursor: y,
	openCursor: () => {
		let { cursor: e } = g();
		e != null && D(e);
	},
	exitFocus: O,
	toggleInteractive: k,
	zoomIn: ee,
	zoomOut: te,
	zoomFit: A,
	stepTab: ut,
	jumpTab: dt,
	openQuickOpen: Xe,
	helpOpen: kt,
	toggleHelp: At
}, hn = Nt(M, mn);
It(hn, mn, {
	chooserOpen: () => !!document.getElementById("chooser")?.classList.contains("on"),
	cancelChoice: () => {
		m("/viewer/cancel");
	},
	closeZoomMenu: E,
	closeDirPop: wt
});
var gn = dn({
	renderLegacy: pn,
	messages: {
		phrase: M,
		daemonText: ie
	},
	hosts: ln(),
	shortcuts: hn,
	board: {
		open: D,
		point: T
	}
});
re(gn.apply, gn.connection, Ze, fn);
try {
	for (let e of Object.keys(localStorage)) e.startsWith("prevue.search:") && localStorage.removeItem(e);
} catch {}
