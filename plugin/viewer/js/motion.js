// src/runtime/motion.ts
var e = matchMedia("(prefers-reduced-motion: reduce)"), t = (e) => getComputedStyle(document.documentElement).getPropertyValue(e).trim(), n = (e) => {
	let n = /^([\d.]+)(ms|s)$/.exec(t(e));
	return n ? parseFloat(n[1]) * (n[2] === "s" ? 1e3 : 1) : 0;
}, r = (e) => !!e && e.startsWith("/stream");
function i(e, t) {
	let n = e.getAttribute("src");
	if (e.dataset.url = t, !n || e.hidden || !e.naturalWidth || r(t) || r(n)) {
		e.src = t;
		return;
	}
	let i = new Image();
	i.src = t, i.decode().catch(() => {}).then(() => {
		if (e.dataset.url !== t || e.hidden) return;
		let n = e.cloneNode();
		n.removeAttribute("id"), n.classList.add("ghost"), n.alt = "", Object.assign(n.style, {
			left: e.offsetLeft + "px",
			top: e.offsetTop + "px",
			width: e.offsetWidth + "px",
			height: e.offsetHeight + "px"
		}), e.after(n), e.src = t;
		let r = () => n.remove();
		requestAnimationFrame(() => requestAnimationFrame(() => {
			n.style.opacity = "0";
		})), n.addEventListener("transitionend", r, { once: !0 }), setTimeout(r, 800);
	});
}
var a = !1, o = null;
function s(e, t, { workspace: n = !1, image: i = null } = {}) {
	let s = document.documentElement;
	if (n && s.classList.remove("vt-tab"), !document.startViewTransition || document.hidden || a) {
		s.classList.toggle("vt-workspace", n), e(), n && s.offsetWidth, s.classList.remove("vt-workspace"), t && t();
		return;
	}
	a = !0, i && r(i.dataset.url) && i.naturalWidth ? c(i).then(l) : l();
	function l() {
		o?.skipTransition(), s.classList.toggle("vt-workspace", n);
		let r = document.startViewTransition(e);
		o = r, r.updateCallbackDone.catch(() => {}).finally(() => {
			a = !1, t && t();
		}), r.finished.catch(() => {}).finally(() => {
			o === r && (o = null, s.classList.remove("vt-workspace"));
		});
	}
}
function c(e) {
	try {
		let t = document.createElement("canvas");
		t.width = e.naturalWidth, t.height = e.naturalHeight, t.getContext("2d").drawImage(e, 0, 0), e.src = t.toDataURL("image/jpeg", .92);
	} catch {
		return Promise.resolve();
	}
	return Promise.race([e.decode().catch(() => {}), new Promise((e) => setTimeout(e, 150))]);
}
var l = () => a;
function u() {
	return a = !0, () => {
		a = !1;
	};
}
var d = 2 * Math.PI / .55, f = 385;
function p({ from: e, to: n, radius: r, shadow: i, a, b: o = null, swapAt: s = 0, swapMs: c = 150, ceiling: l = null }) {
	let u = document.createElement("div"), f = new Image(), p = new Image();
	u.className = "morph", f.alt = p.alt = "", p.style.opacity = "0", a ? f.src = a : f.style.opacity = "0", u.append(f, p), u.style.boxShadow = i[0], document.body.append(u);
	let m = 0, h = performance.now(), g = 0, _ = !1, v, y, b = !1, x = new Promise((e) => {
		v = e;
	}), S = (e, t) => Object.assign(u.style, {
		left: e.x + "px",
		top: e.y + "px",
		width: e.width + "px",
		height: e.height + "px",
		borderRadius: t + "px"
	}), C = (e) => {
		let t = l && l(), n = t ? t.bottom - e : 0;
		u.style.maskImage = n > 0 ? `linear-gradient(transparent ${(t.top - e).toFixed(1)}px, #000 ${n.toFixed(1)}px)` : "";
	};
	function w(t) {
		if (g = 0, b) return;
		let i = n();
		m += Math.min(Math.max(0, t - h), 34) / 1e3, h = t;
		let a = _ ? 0 : Math.exp(-d * m) * (1 + d * m), o = Math.max(Math.abs(e.x - i.x), Math.abs(e.y - i.y), Math.abs(e.width - i.width), Math.abs(e.height - i.height)) * a;
		!_ && o < .5 && (a = 0, _ = !0, v());
		let s = i.y + (e.y - i.y) * a;
		S({
			x: i.x + (e.x - i.x) * a,
			y: s,
			width: i.width + (e.width - i.width) * a,
			height: i.height + (e.height - i.height) * a
		}, r[1] + (r[0] - r[1]) * a), C(s), g = requestAnimationFrame(w);
	}
	w(h), requestAnimationFrame(() => {
		u.style.transition = "box-shadow var(--duration-long3) var(--easing-standard)", u.style.boxShadow = i[1];
	}), o !== null && (y = setTimeout(() => {
		o && (p.src = o);
		for (let [e, n] of [[f, 0], [p, +!!o]]) e.animate([{ opacity: e.style.opacity || 1 }, { opacity: n }], {
			duration: c,
			easing: t("--easing-standard"),
			fill: "forwards"
		});
	}, s));
	let T, E = () => {
		T = void 0, _ || b || (document.hidden ? (_ = !0, v()) : T = setTimeout(E, 1200));
	};
	T = setTimeout(E, 1200);
	function D() {
		b = !0, cancelAnimationFrame(g), clearTimeout(y), clearTimeout(T), u.remove(), _ || (_ = !0, v());
	}
	return {
		el: u,
		landed: x,
		finish(e = 0) {
			b || (e ? (u.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: e,
				easing: t("--easing-decelerate"),
				fill: "forwards"
			}).finished.catch(() => {}).then(D), setTimeout(D, e + 400)) : D());
		},
		cancel: D
	};
}
export { f as MORPH_LEAD, p as frameMorph, c as freeze, u as hold, n as motionMs, t as motionToken, e as reduced, i as swapImage, s as transition, l as transitioning };
