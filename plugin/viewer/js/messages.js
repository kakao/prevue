// src/runtime/messages.ts
function e(e) {
	function t(t, n = {}) {
		let r = n.n === 1 && e[t + ".one"] || e[t];
		return r == null ? (console.error("prevue: 사전에 없는 키", t), t) : r.replace(/\{(\w+)\}/g, (e, t) => t in n ? String(n[t]) : e);
	}
	function n(e) {
		if (e == null) return "";
		if (typeof e != "object") return String(e);
		let r = Object.fromEntries(Object.entries(e.a || {}).map(([e, t]) => [e, typeof t == "object" && t ? n(t) : t]));
		return t(e.t, r);
	}
	return {
		phrase: t,
		daemonText: n
	};
}
export { e as createMessages };
