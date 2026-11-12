import { createScene as e } from "./preparation-scene.js";
import { phrase as t } from "./strings.js";
// src/preparation/entry-start.ts
var n = new URL(location.href).searchParams.get("id") ?? "", r;
async function i() {
	try {
		let a = await fetch(`/preparation/${encodeURIComponent(n)}`);
		if (!a.ok) throw Error(t("prep.poll.failed"));
		let o = await a.json();
		if (o.id !== n) throw Error(t("prep.poll.changed"));
		if (r ||= e(o.phase === "failure" ? {
			...o,
			phase: void 0
		} : o), o.phase === "failure") {
			r.fail(o.errorKey ? t(o.errorKey) : o.error ?? "");
			return;
		}
		if (r.setPhase(o.phase), o.viewer) {
			let e = new URL(o.viewer);
			e.searchParams.set("phase", o.phase), e.searchParams.set("phaseStarted", String(r.phaseStarted)), location.replace(e.href);
			return;
		}
		setTimeout(i, 200);
	} catch (n) {
		r ||= e({}), r.fail(n.message + " " + t("prep.retry"));
	}
}
i();
