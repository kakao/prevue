// src/runtime/store.ts
var e = (e) => document.getElementById(e), t = {
	st: null,
	projectFiles: /* @__PURE__ */ new Map()
};
function n(e) {
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
export { e as $, n as createStore, t as store };
