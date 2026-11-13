import { createMessages as e } from "./messages.js";
// src/runtime/strings.ts
var t = ["en", "ko"], n = (new URL(location.href).searchParams.get("lang") || "").split("-")[0].toLowerCase(), r = t.includes(n) ? n : "en";
document.documentElement.lang = r;
var i = import.meta.url, a = await fetch(new URL(`../strings/${r}.json`, i)).then((e) => e.ok ? e.json() : {}).catch(() => ({})), { phrase: o, daemonText: s } = e(a), c = [
	"title",
	"aria-label",
	"placeholder",
	"alt"
];
function l(e) {
	for (let t of e.querySelectorAll("[data-t]")) t.textContent = o(t.dataset.t);
	for (let t of c) for (let n of e.querySelectorAll(`[data-t-${t}]`)) n.setAttribute(t, o(n.getAttribute(`data-t-${t}`)));
}
l(document);
export { s as daemonText, o as phrase };
