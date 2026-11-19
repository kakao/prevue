import { store as e } from "./store.js";
import { reduced as t } from "./motion.js";
// src/runtime/board.ts
var n = () => document.getElementById("cards");
function r(e) {
	return n()?.querySelector(`.card[data-i="${e}"]`) || null;
}
function i(e) {
	return !!e.offsetParent;
}
var a = {
	cursor: null,
	returned: null
}, o = /* @__PURE__ */ new Set();
function s(e) {
	if (!Object.keys(e).every((t) => a[t] === e[t])) {
		a = {
			...a,
			...e
		};
		for (let e of o) e();
	}
}
var c = () => a;
function l(e) {
	return o.add(e), () => o.delete(e);
}
var u = /* @__PURE__ */ new Map();
function d() {
	u.clear();
}
var f = null, p = null;
function m(e) {
	if (p = e ? e.file : p, !e) return;
	let t = e.groups.some((e) => e.cards.some((e) => e.index === a.cursor));
	e.focus === f && t || (f = e.focus, s({ cursor: e.focus }));
}
function h(e) {
	s({ cursor: e });
}
function g(e) {
	let o = n(), c = o ? [...o.querySelectorAll(".card")].filter(i).map((e) => Number(e.dataset.i)) : [];
	if (!c.length) return;
	let l = a.cursor == null ? -1 : c.indexOf(a.cursor), u = l < 0 ? c[0] : c[Math.max(0, Math.min(c.length - 1, l + e))];
	s({ cursor: u }), r(u).scrollIntoView({
		block: "nearest",
		behavior: t.matches ? "auto" : "smooth"
	});
}
var _ = null, v = null, y = 0, b = () => {};
function x(e) {
	b = e;
}
function S(e, t) {
	_ = {
		file: e,
		fn: t
	};
}
function C() {
	_ = null;
}
function w() {
	if (!_ || _.file !== p || !e.st || e.st.screen !== "board") return;
	let { fn: t } = _;
	if (_ = null, !t) return;
	let r = [...n().querySelectorAll(".group")].find((e) => e.dataset.fn === t), i = r && r.querySelector(".card");
	i && (s({ cursor: Number(i.dataset.i) }), v = a.cursor, y = performance.now(), b(), E(r));
}
var T = () => {};
function E(e) {
	T();
	let t = () => {
		let t = getComputedStyle(document.body), n = parseFloat(t.getPropertyValue("--bar-h")) + 8;
		scrollTo(0, Math.max(0, e.getBoundingClientRect().top + scrollY - n));
	}, r = new ResizeObserver(() => requestAnimationFrame(t)), i = () => {
		r.disconnect();
		for (let e of [
			"wheel",
			"touchmove",
			"keydown"
		]) removeEventListener(e, i);
		T = () => {};
	};
	T = i, t(), r.observe(n());
	for (let e of [
		"wheel",
		"touchmove",
		"keydown"
	]) addEventListener(e, i, { passive: !0 });
	setTimeout(i, 2e3);
}
function D(e) {
	let t = r(e);
	return t && i(t) ? t : null;
}
function O(e) {
	let t = performance.now() - y < 1e3 ? v : null;
	v = null;
	let n = r(t ?? e);
	return n && i(n) ? n : null;
}
function k(e) {
	let t = e && e.querySelector(".cstage");
	if (!t) return null;
	let n = t.getBoundingClientRect(), r = getComputedStyle(document.body), i = A(t)?.bottom ?? parseFloat(r.getPropertyValue("--bar-h"));
	return n.width && n.bottom > i && n.top < innerHeight && n.right > 0 && n.left < innerWidth ? t : null;
}
function A(e) {
	let t = e && e.isConnected ? e.closest(".group")?.querySelector(".ghead") : null;
	if (!t) return null;
	let n = t.getBoundingClientRect(), r = getComputedStyle(t);
	if (n.top > parseFloat(r.top) + .5) return null;
	let i = parseFloat(r.getPropertyValue("--fade"));
	return {
		top: n.top + n.height * (Number.isFinite(i) ? i / 100 : 1),
		bottom: n.bottom
	};
}
var j;
function M(e) {
	e && (clearTimeout(j), e.classList.remove("returned"), e.offsetWidth, e.classList.add("returned"), s({ returned: Number(e.dataset.i) }), j = setTimeout(() => s({ returned: null }), 900));
}
export { w as applyReveal, c as boardMarks, C as cancelReveal, D as cardAt, k as cardStage, d as clearTrees, g as moveCursor, x as onRelayout, O as returnCard, S as reveal, M as ringCard, h as setCursor, A as stuckHead, l as subscribeBoard, m as syncBoard, u as trees };
