// src/runtime/api.ts
function e(e, t) {
	return fetch(e, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(t || {})
	});
}
var t = (e) => fetch(e), n = Math.random().toString(36).slice(2, 10), r = (e) => `${e}${e.includes("?") ? "&" : "?"}v=${n}`, i = (t) => e("/stream/viewport", {
	width: t,
	viewer: n
}), a = () => fetch("/project-files.json").then((e) => e.json()), o = () => fetch("/preview-files.json").then((e) => e.json());
function s({ open: e, state: t, ui: n, error: r }) {
	let i = null;
	function a() {
		if (document.hidden) {
			i?.close(), i = null;
			return;
		}
		if (i) return;
		let a = new EventSource("/events");
		i = a, a.onopen = () => {
			i === a && e();
		}, a.onmessage = (e) => {
			if (i !== a) return;
			let r = JSON.parse(e.data);
			r.type === "state" ? t(r.state) : r.type === "ui" && n(r.event);
		}, a.onerror = (e) => {
			i === a && r(e);
		};
	}
	document.addEventListener("visibilitychange", a), a();
}
export { s as connect, o as fetchPreviewFiles, a as fetchProjectFiles, t as get, e as post, i as reportStreamWidth, r as viewerStream };
