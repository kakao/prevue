// src/runtime/capsule.ts
var e = {
	error: "",
	log: "",
	once: null
}, t = "", n, r = /* @__PURE__ */ new Set();
function i(t) {
	if (!Object.keys(t).every((n) => e[n] === t[n])) {
		e = {
			...e,
			...t
		};
		for (let e of r) e();
	}
}
var a = () => e;
function o(e) {
	return r.add(e), () => r.delete(e);
}
var s = /* @__PURE__ */ new Set(), c = (e) => {
	if (s.has(e)) return !0;
	try {
		if (localStorage.getItem(e)) return s.add(e), !0;
	} catch {}
	return !1;
};
function l(t, n) {
	if (c(t)) return;
	let r = n();
	e.once && e.once.key === t && e.once.text === r || i({ once: {
		key: t,
		text: r
	} });
}
function u(t) {
	e.once && e.once.key === t && i({ once: null });
}
function d() {
	if (e.once) {
		s.add(e.once.key);
		try {
			localStorage.setItem(e.once.key, "1");
		} catch {}
		i({ once: null });
	}
}
function f(e, t) {
	i({ error: t === "error" ? e : "" });
}
function p(e) {
	clearTimeout(n), i({ log: e }), n = setTimeout(() => i({ log: t }), 2500);
}
function m(e) {
	t = e, i({ log: e });
}
function h(t) {
	t ? f(t, "error") : e.error && f("");
}
export { a as capsuleContent, d as dismissOnce, p as flash, u as hideOnce, h as renderError, f as setStatus, m as setSummary, l as showOnce, o as subscribeCapsule };
