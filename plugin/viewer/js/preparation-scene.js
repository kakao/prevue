import { i as e, n as t, r as n, t as r } from "./react.js";
import { daemonText as i, phrase as a } from "./strings.js";
import { createMessages as o } from "./messages.js";
// src/host.tsx
var s = e(), c = n();
function l(e) {
	let [t, n] = (0, s.useState)(null);
	return {
		element: e ?? t,
		place: (t, r) => e ? (0, c.createPortal)(t, e) : r(n, t)
	};
}
function u(e) {
	for (let t of Object.keys(e)) t.startsWith("__react") && Object.defineProperty(e, t, { enumerable: !1 });
}
// src/messages.ts
var d = (0, s.createContext)(o({})), f = () => (0, s.useContext)(d), p = r(), m = t();
function h() {
	let { phrase: e } = f();
	return /* @__PURE__ */ (0, m.jsxs)("section", {
		className: "loading-copy",
		children: [
			/* @__PURE__ */ (0, m.jsx)("h1", {
				id: "headline",
				role: "status",
				"aria-live": "polite",
				children: e("prep.phase.project")
			}),
			/* @__PURE__ */ (0, m.jsx)("p", {
				id: "detail",
				children: e("prep.detail")
			}),
			/* @__PURE__ */ (0, m.jsxs)("p", {
				className: "now",
				children: [
					/* @__PURE__ */ (0, m.jsx)("span", { id: "now" }),
					" · ",
					/* @__PURE__ */ (0, m.jsx)("span", {
						className: "clock",
						id: "clock"
					})
				]
			}),
			/* @__PURE__ */ (0, m.jsxs)("div", {
				className: "prep-progress",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, m.jsx)("i", {}),
					/* @__PURE__ */ (0, m.jsx)("i", {}),
					/* @__PURE__ */ (0, m.jsx)("i", {}),
					/* @__PURE__ */ (0, m.jsx)("i", {})
				]
			}),
			/* @__PURE__ */ (0, m.jsxs)("div", {
				className: "failure-help",
				hidden: !0,
				children: [/* @__PURE__ */ (0, m.jsx)("span", { children: e("prep.help.lead") }), /* @__PURE__ */ (0, m.jsx)("p", { children: e("prep.help.ask") })]
			})
		]
	});
}
// src/preparation/PreparationScene.tsx
function g() {
	return /* @__PURE__ */ (0, m.jsxs)("div", {
		className: "prep-bar",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, m.jsxs)("svg", {
			viewBox: "0 0 240 240",
			children: [
				/* @__PURE__ */ (0, m.jsx)("polygon", {
					points: "120,40 189.3,80 120,120 50.7,80",
					fill: "currentColor"
				}),
				/* @__PURE__ */ (0, m.jsx)("polygon", {
					points: "189.3,80 189.3,160 120,200 120,120",
					fill: "currentColor",
					opacity: ".62"
				}),
				/* @__PURE__ */ (0, m.jsx)("polygon", {
					points: "50.7,80 120,120 120,200 50.7,160",
					fill: "currentColor",
					opacity: ".34"
				}),
				/* @__PURE__ */ (0, m.jsx)("path", {
					d: "M14 44V14H44M14 196V226H44M226 44V14H196M226 196V226H196",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: "22",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			]
		}), /* @__PURE__ */ (0, m.jsx)("span", { children: "Prevue" })]
	});
}
function _() {
	let { phrase: e } = f();
	return /* @__PURE__ */ (0, m.jsxs)("section", {
		className: "scene",
		"aria-label": e("prep.scene"),
		children: [/* @__PURE__ */ (0, m.jsx)("div", {
			className: "floor",
			"aria-hidden": "true"
		}), /* @__PURE__ */ (0, m.jsx)("div", {
			className: "assembly",
			children: /* @__PURE__ */ (0, m.jsx)("div", {
				className: "layer layer-front",
				children: /* @__PURE__ */ (0, m.jsx)("div", {
					className: "drift",
					children: /* @__PURE__ */ (0, m.jsxs)("div", {
						className: "pane",
						children: [
							/* @__PURE__ */ (0, m.jsx)("div", {
								className: "screen-outline",
								"aria-hidden": "true"
							}),
							/* @__PURE__ */ (0, m.jsxs)("div", {
								className: "blueprint",
								"aria-hidden": "true",
								children: [
									/* @__PURE__ */ (0, m.jsx)("div", {
										className: "piece piece-cover",
										children: /* @__PURE__ */ (0, m.jsx)("div", {
											className: "solid",
											children: /* @__PURE__ */ (0, m.jsxs)("div", {
												className: "cover-art",
												children: [
													/* @__PURE__ */ (0, m.jsx)("span", { className: "art-wave" }),
													/* @__PURE__ */ (0, m.jsx)("span", { className: "art-orbit" }),
													/* @__PURE__ */ (0, m.jsx)("span", { className: "art-dot" }),
													/* @__PURE__ */ (0, m.jsx)("span", { className: "art-pill" })
												]
											})
										})
									}),
									/* @__PURE__ */ (0, m.jsx)("div", {
										className: "piece piece-title",
										children: /* @__PURE__ */ (0, m.jsx)("div", {
											className: "solid",
											children: /* @__PURE__ */ (0, m.jsxs)("span", {
												className: "title-lines",
												children: [/* @__PURE__ */ (0, m.jsx)("i", {}), /* @__PURE__ */ (0, m.jsx)("i", {})]
											})
										})
									}),
									/* @__PURE__ */ (0, m.jsx)("div", {
										className: "piece piece-action",
										children: /* @__PURE__ */ (0, m.jsx)("div", {
											className: "solid",
											children: /* @__PURE__ */ (0, m.jsx)("svg", {
												viewBox: "0 0 24 24",
												children: /* @__PURE__ */ (0, m.jsx)("path", { d: "M7 4h10v16l-5-3-5 3Z" })
											})
										})
									}),
									/* @__PURE__ */ (0, m.jsx)("div", {
										className: "piece piece-meta",
										children: /* @__PURE__ */ (0, m.jsx)("div", { className: "solid" })
									}),
									/* @__PURE__ */ (0, m.jsx)("div", {
										className: "piece piece-copy",
										children: /* @__PURE__ */ (0, m.jsxs)("div", {
											className: "solid",
											children: [
												/* @__PURE__ */ (0, m.jsx)("i", {}),
												/* @__PURE__ */ (0, m.jsx)("i", {}),
												/* @__PURE__ */ (0, m.jsx)("i", {}),
												/* @__PURE__ */ (0, m.jsx)("i", {}),
												/* @__PURE__ */ (0, m.jsx)("i", {}),
												/* @__PURE__ */ (0, m.jsx)("i", {}),
												/* @__PURE__ */ (0, m.jsx)("i", {})
											]
										})
									}),
									/* @__PURE__ */ (0, m.jsx)("div", {
										className: "piece piece-tag",
										children: /* @__PURE__ */ (0, m.jsx)("div", { className: "solid" })
									})
								]
							}),
							/* @__PURE__ */ (0, m.jsx)("img", {
								className: "preview",
								alt: e("prep.image"),
								draggable: !1
							})
						]
					})
				})
			})
		})]
	});
}
// src/preparation/scene.tsx
var v = (e) => getComputedStyle(document.documentElement).getPropertyValue(e).trim() || "ease", y = (e) => {
	let t = /^([\d.]+)(ms|s)$/.exec(getComputedStyle(document.documentElement).getPropertyValue(e).trim());
	return t ? parseFloat(t[1]) * (t[2] === "s" ? 1e3 : 1) : 0;
}, b = (e) => y(e ? "--duration-long4" : "--duration-extra-long4"), x = [
	"project",
	"environment",
	"render",
	"drawn"
], S = 6e3;
function C(e, t, n = document.body) {
	let { phrase: r } = e, i = document.createElement("section");
	i.id = "preparation", i.dataset.screen = "loading", i.dataset.phase = t.phase || "environment", i.dataset.boardArrival = "idle";
	let a = (0, p.createRoot)(i);
	u(i), (0, c.flushSync)(() => a.render(/* @__PURE__ */ (0, m.jsxs)(d.Provider, {
		value: e,
		children: [
			/* @__PURE__ */ (0, m.jsx)(g, {}),
			/* @__PURE__ */ (0, m.jsx)(_, {}),
			/* @__PURE__ */ (0, m.jsx)(h, {})
		]
	}))), n.append(i);
	let o = (e) => i.querySelector(e), s = o(".preview"), l = matchMedia("(prefers-reduced-motion: reduce)"), f = matchMedia("(prefers-color-scheme: dark)"), C = ["#headline", "#detail"].map((e) => ({
		element: o(e),
		text: "",
		animations: []
	})), w = [...i.querySelectorAll(".prep-progress i")], T = Number(t.started || Date.now()), E = null, D = !1, O = 0, k = 0, A = 0, j = Number(t.phaseStarted || Date.now()), M = (Date.now() - Number(t.started || Date.now())) / 1e3, N = 1, P = /* @__PURE__ */ new Set();
	function F(e, t) {
		let n = C[e];
		if (n.text === t) return;
		n.animations.forEach((e) => e.cancel()), n.animations = [];
		let r = !!n.text;
		if (n.text = t, n.element.textContent = t, !l.matches && r) {
			let t = n.element.animate([{
				opacity: 0,
				transform: e === 0 ? "translateY(4px)" : "none"
			}, {
				opacity: 1,
				transform: "none"
			}], {
				duration: y(e === 0 ? "--duration-medium2" : "--duration-short4"),
				easing: v("--easing-decelerate")
			});
			n.animations.push(t);
		}
	}
	function I(e) {
		E === e || D || (E !== null && (j = Date.now()), E = e, i.dataset.phase = e === "drawn" ? "render" : e, F(0, {
			project: r("prep.phase.project"),
			environment: r("prep.phase.environment"),
			render: r("prep.phase.render"),
			drawn: r("prep.phase.drawn")
		}[e] || e), F(1, t.file ? r("prep.next.file", { file: t.file.split("/").pop() }) : r("prep.next.pick")), o("#now").textContent = {
			project: r("prep.now.project"),
			environment: r("prep.now.environment"),
			render: r("prep.now.render")
		}[e] || "", L(), H());
	}
	function L() {
		let e = x.indexOf(E ?? ""), t = i.dataset.screen === "failure", n = 1 - Math.exp(-(Date.now() - j) / S);
		w.forEach((r, i) => {
			r.style.setProperty("--fill", String(i < e || e === 3 ? 1 : i === e ? (n * .9).toFixed(3) : 0)), r.classList.toggle("bad", t && i === e);
		}), o(".now").hidden = t || e === 3, o("#clock").textContent = r("prep.clock", { s: Math.max(0, Math.floor((Date.now() - T) / 1e3)) });
	}
	function R() {
		let e = !D && !document.hidden && i.dataset.screen === "loading";
		e && !A ? A = window.setInterval(L, 250) : !e && A && (clearInterval(A), A = 0);
	}
	function z() {
		i.dataset.theme = document.documentElement.dataset.theme || (f.matches ? "dark" : "light"), i.dataset.reduced = String(l.matches), l.matches && (C.forEach((e) => e.animations.forEach((e) => e.cancel())), P.forEach((e) => e.finish())), H();
	}
	function B() {
		let e = l.matches ? 0 : M, t = l.matches ? 0 : N, n = o(".drift");
		n.style.setProperty("--hover-y", `${Math.sin(e * .8) * t * 8}px`), n.style.setProperty("--hover-ry", `${Math.sin(e * .5) * t * 2}deg`), i.querySelectorAll(".solid").forEach((n, r) => {
			let i = e * .9 + r * 1.3;
			for (let [e, r] of Object.entries({
				x: `${Math.sin(i * .6) * t * 10}px`,
				y: `${Math.cos(i) * t * 17}px`,
				r: `${Math.sin(i * .7) * t * 4}deg`
			})) n.style.setProperty(`--float-${e}`, r);
		}), i.style.setProperty("--art-x", `${Math.sin(e * .6) * t * 7}px`), i.style.setProperty("--art-r", `${e * 5 % 360}deg`);
	}
	function V(e) {
		O = 0;
		let t = k ? Math.min((e - k) / 1e3, .05) : 0;
		k = e, M += t, N += ((E === "project" ? 1 : E === "environment" ? .34 : .13) - N) * (1 - Math.exp(-t * 2.7)), B(), O = requestAnimationFrame(V);
	}
	function H() {
		R();
		let e = !D && !document.hidden && !l.matches && i.dataset.screen === "loading";
		e && !O ? (k = 0, O = requestAnimationFrame(V)) : !e && O && (cancelAnimationFrame(O), O = 0), e || B();
	}
	function U(e, t) {
		let n = e / t, r = o(".scene").getBoundingClientRect(), a = i.getBoundingClientRect().top, s = r.top + r.height * .52, c = o(".loading-copy").getBoundingClientRect().height, l = Math.max(40, Math.min(480, innerHeight * .5, (innerHeight - 48 - c - 48 - s) * 2, (s - a - 24) * 2)), u = e <= 260 && t <= 120, d = !u && t <= 180 && n >= 2, f = u ? Math.min(280, e * 1.5) : d ? 420 : 500, p = Math.min(f, innerWidth - 64, l * n);
		i.dataset.form = u ? "button" : d ? "strip" : n > 1.3 ? "landscape" : "screen";
		for (let e of ["model", "drawn"]) i.style.setProperty(`--${e}-w`, `${p}px`), i.style.setProperty(`--${e}-h`, `${p / n}px`);
		i.style.setProperty("--drawn-copy-top", `${s - a + p / n / 2 + 48}px`);
	}
	function W(e) {
		i.dataset.screen = "failure", i.dataset.interactive = "false", F(0, r("prep.failed")), F(1, e), o(".failure-help").hidden = !1, L(), H();
	}
	let G = new MutationObserver(z);
	return G.observe(document.documentElement, {
		attributes: !0,
		attributeFilter: ["data-theme"]
	}), l.addEventListener("change", z), f.addEventListener("change", z), document.addEventListener("visibilitychange", H), z(), I(t.phase || "environment"), {
		host: i,
		image: s,
		setPhase: I,
		fit: U,
		fail: W,
		reduced: l,
		get phaseStarted() {
			return j;
		},
		reveal(e) {
			I("drawn"), i.dataset.screen = "drawn", i.dataset.interactive = "true", i.dataset.boardArrival = "revealing";
			let t = b(e);
			for (let [e, n] of Object.entries({
				"handoff-duration": t,
				"image-opacity-duration": t * .68,
				"image-opacity-delay": t * .1,
				"image-filter-duration": t * .82,
				"mock-fade-duration": t * .47,
				"outline-fade-duration": t * .64
			})) i.style.setProperty(`--${e}`, `${Math.round(n)}ms`);
			s.tabIndex = 0, s.setAttribute("role", "button"), s.setAttribute("aria-label", r("prep.openBoard")), H();
		},
		animate(e, t, n) {
			let r = e.animate(t, n);
			return P.add(r), r.finished.catch(() => {}).finally(() => P.delete(r)), r;
		},
		destroy() {
			D = !0, cancelAnimationFrame(O), clearInterval(A), G.disconnect(), C.forEach((e) => e.animations.forEach((e) => e.cancel())), P.forEach((e) => e.cancel()), document.removeEventListener("visibilitychange", H), l.removeEventListener("change", z), f.removeEventListener("change", z), i.remove(), queueMicrotask(() => a.unmount());
		}
	};
}
// src/preparation/entry-scene.ts
var w = (e) => C({
	phrase: a,
	daemonText: i
}, e);
export { w as createScene, b as handoffMs, l as i, f as n, u as r, v as sceneEasing, y as sceneMs, d as t };
