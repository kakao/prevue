import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 크기 전환 동안 틀 안 내용을 프레임마다 잰다. 전용 워크트리로 fixtures/pearl의 AdaptivePreviews.kt를 먼저 연다.
const viewer = process.argv[2];
assert(viewer, "node tests/viewer/content.mjs <전용 프리뷰 서버 URL>");
const pause = ms => new Promise(r => setTimeout(r, ms));
const profile = await mkdtemp(join(tmpdir(), "prevue-content-check-"));
const chrome = spawn(process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank",
], { stdio: "ignore" });
let ws, checked = 0;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; } catch { await pause(100); }
  }
  assert(port, "Chrome 실행");
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(pages.find(p => p.type === "page").webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id, timer = setTimeout(() => { waiting.delete(n); reject(Error(`${method} 응답 시간 초과`)); }, 15_000);
    waiting.set(n, m => { clearTimeout(timer); m.error ? reject(Error(m.error.message)) : resolve(m.result); });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async (expression, ms = 15_000) => {
    for (const end = Date.now() + ms; Date.now() < end; await pause(80)) if (await evaluate(expression)) return;
    throw Error(`시간 초과: ${expression}`);
  };
  const check = (ok, name, detail) => { assert(ok, `${name} — ${JSON.stringify(detail)}`); checked++; console.log(`통과 ${checked}: ${name}`, detail ?? ""); };
  const click = async selector => {
    const at = await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1 });
  };
  const key = async name => {
    for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: name, code: name });
  };
  const post = async (path, body) => { const r = await fetch(new URL(path, viewer), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); assert(r.ok, path); };
  const settled = `!document.querySelector('#stage').classList.contains('resize-hidden') && document.querySelector('#shot').getAttribute('src')?.startsWith('/stream') && document.querySelector('#resizeScene').classList.contains('at-rest')`;
  // 그 칸의 미리 그린 그림이 뷰어에 디코드돼 있을 때까지 기다린다 — 캐시가 있는 전환을 재려는 것이다.
  const cached = async match => {
    await until(`__store.st.focus.postures?.some(p=>${match})`, 20_000);
    await evaluate(`Promise.all(__store.st.focus.postures.filter(p=>${match}).map(p=>{const i=new Image();i.src=p.imageUrl;return i.decode()}))`);
    await pause(300);
  };

  // 프레임마다 장면과 실제 스트림의 자리를 적는다.
  const RECORDER = `(() => {
    const R = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const img = el => ({ ...R(el), ow: el.offsetWidth, oh: el.offsetHeight, op: Number(el.style.opacity || 0), blur: Number((/blur\\(([\\d.]+)px\\)/.exec(el.style.filter) || [0, 0])[1]), tf: el.style.transform });
    window.__frames = []; window.__rec = true;
    const tick = () => {
      if (!window.__rec) return;
      const ua = document.querySelector('#ua'), st = ua.querySelector('.stage'), duo = document.querySelector('#duo');
      __frames.push({
        t: performance.now(), moving: document.querySelector('#stage').classList.contains('resize-hidden'),
        uaHidden: ua.hidden, uaTf: ua.style.transform, stage: R(st), bg: st.style.background,
        l0: img(st.querySelector('.l0')), l1: img(st.querySelector('.l1')),
        real: R(document.querySelector('#stage')), shot: R(document.querySelector('#shot')),
        duo: !duo.hidden, clip: duo.querySelector('.duo-flap').style.clipPath, duoBase: duo.querySelector('.duo-base').style.borderRadius, duoBtn: R(duo.querySelector('.btn')), uaBtn: R(ua.querySelector('.btn')), face: duo.querySelector('.duo-face').style.transform,
        loading: !document.querySelector('#workspaceLoading').hidden,
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })()`;
  const record = async () => evaluate(RECORDER);
  const stop = async () => { await pause(150); await evaluate(`window.__rec=false`); return evaluate(`__frames`); };
  const near = (a, b, e = .5) => Math.abs(a.x - b.x) <= e && Math.abs(a.y - b.y) <= e && Math.abs(a.w - b.w) <= e && Math.abs(a.h - b.h) <= e;
  const covers = (a, b, e = .5) => a.x <= b.x + e && a.y <= b.y + e && a.x + a.w >= b.x + b.w - e && a.y + a.h >= b.y + b.h - e;
  const top = f => f.l1.op > .5 ? f.l1 : f.l0;

  // 칠하지 않은 빈칸 — 틀(.stage) 중 그림이 덮지 못한 자리가 가장자리 색(rgb)이 아니라 기본 바탕으로 남는 프레임.
  const gaps = frames => frames.filter(f => f.moving && !f.uaHidden && !f.duo && !(covers(top(f), f.stage) || /^rgb/.test(f.bg)));
  // 장면이 끝나 실제 스트림이 보이는 첫 프레임 — 그 직전 장면의 틀 · 그림과 자리가 같아야 한다.
  const handoff = frames => {
    const i = frames.findIndex((f, k) => k > 0 && frames[k - 1].moving && !f.moving);
    if (i < 0) return null;
    const a = frames[i - 1], b = frames[i];
    return { stage: Math.max(...["x", "y", "w", "h"].map(k => Math.abs(a.stage[k] - b.real[k]))), shot: Math.max(...["x", "y", "w", "h"].map(k => Math.abs(top(a)[k] - b.shot[k]))) };
  };

  // 앞 테스트가 중간에 죽어 인터랙티브 카드를 켜 둔 데몬이어도 보드에서 시작한다
  await post("/viewer/exit", {});
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__errors=[];addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));` });
  await send("Page.navigate", { url: viewer });
  await until(`!!document.querySelector('#shot') && !!window.__errors`);
  await evaluate(`import('/js/store.js').then(m=>window.__store=m.store)`);
  await until(`!!__store.st`);
  await post("/viewer/focus", { index: 0 });
  await until(`__store.st.focus?.interactive && document.querySelector('#shot').naturalWidth > 0`);
  await post("/viewer/resize", { size: "original" });
  await until(`!__store.st.focus.size && ${settled}`);

  // 작아지기(@Preview → 320×640) — 캐시가 있다.
  await cached(`p.size.preset==='narrow'`);
  await record();
  await click(`#pnPick [data-sel="narrow"]`);
  await until(`__store.st.focus.size?.preset==='narrow' && ${settled}`);
  let frames = await stop();
  check(gaps(frames).length === 0, "작아질 때 틀 안 빈칸 없음", { frames: frames.length, gaps: gaps(frames).length });
  const shrinkSwap = frames.findIndex(f => f.moving && f.l1.op > .01);
  const shrinkStart = frames.findIndex(f => f.moving);
  check(shrinkSwap > shrinkStart + 3, "작아질 때는 틀이 닿을 즈음 교체", { start: shrinkStart, swap: shrinkSwap });
  let h = handoff(frames);
  check(h && h.stage <= .5 && h.shot <= .5, "작아진 뒤 장면 → 스트림 0.5px 안", h);

  // 커지기(320×640 → Fold8 펼침) — 캐시가 있다.
  await cached(`p.size.device==='fold8' && !p.size.folded && !p.size.landscape`);
  await record();
  await click(`#pnPick [data-sel="fold8"]`);
  await until(`__store.st.focus.size?.device==='fold8' && ${settled}`);
  frames = await stop();
  check(gaps(frames).length === 0, "커질 때 틀 안 빈칸 없음", { frames: frames.length, gaps: gaps(frames).length });
  const growSwap = frames.findIndex(f => f.moving && f.l1.op > .01), growStart = frames.findIndex(f => f.moving);
  check(growSwap >= 0 && growSwap <= growStart + 3, "커질 때는 처음에 교체", { start: growStart, swap: growSwap });
  check(Math.max(...frames.filter(f => f.moving).map(f => Math.max(f.l0.blur, f.l1.blur))) <= 8.01, "캐시 교체 흐림은 8px 안");
  h = handoff(frames);
  check(h && h.stage <= .5 && h.shot <= .5, "커진 뒤 장면 → 스트림 0.5px 안", h);

  // 돌리기 — 몸체만 돌고 내용은 화면 기준 0°.
  await cached(`p.size.device==='fold8' && !p.size.folded && p.size.landscape`);
  await record();
  await click("#dcRot");
  await until(`__store.st.focus.size?.landscape && ${settled}`);
  frames = await stop();
  const turning = frames.filter(f => /rotate\((-?[\d.]+)deg\)/.test(f.uaTf) && Math.abs(Number(/rotate\((-?[\d.]+)deg\)/.exec(f.uaTf)[1])) > 5);
  const tilt = l => l.op > .01 && l.ow > 0 ? Math.abs(l.w / l.h - l.ow / l.oh) / (l.ow / l.oh) : 0;
  const worst = Math.max(0, ...turning.map(f => Math.max(tilt(f.l0), tilt(f.l1))));
  check(turning.length >= 5 && worst < .01, "돌리는 동안 내용이 똑바로 선다", { frames: turning.length, worst: worst.toFixed(4) });
  const mid = turning.filter(f => f.l1.op > .05 && f.l1.op < .95).map(f => Math.abs(Number(/rotate\((-?[\d.]+)deg\)/.exec(f.uaTf)[1])));
  check(mid.length > 0 && Math.min(...mid) > 25 && Math.max(...mid) < 65, "45° 근처에서 가로 레이아웃으로 교체", { from: Math.min(...mid).toFixed(1), to: Math.max(...mid).toFixed(1) });
  check(turning.every(f => /^rgb/.test(f.bg)), "돌리는 동안 빈 모서리는 가장자리 색");
  h = handoff(frames);
  check(h && h.stage <= .5 && h.shot <= .5, "돌린 뒤 장면 → 스트림 0.5px 안", h);

  // iPhone Duo 접기 — 장 윤곽의 모서리가 눌린 내용과 같은 비율의 타원으로 남는다.
  await post("/viewer/resize", { device: "duo", folded: false, landscape: false });
  await until(`__store.st.focus.size?.device==='duo' && !__store.st.focus.size.folded && ${settled}`);
  await cached(`p.size.device==='duo' && p.size.folded && !p.size.landscape`);
  await record();
  await click("#dcFold");
  await until(`__store.st.focus.size?.folded && ${settled}`);
  frames = await stop();
  // 모서리마다 a C p1 p2 b(3차, K=0.5523) — 꼭짓점은 a + (p1 - a) / K로 되짚는다.
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const corners = clip => {
    const n = clip.match(/-?[\d.]+/g)?.map(Number);
    if (!n || n.length < 32) return null;
    return [0, 1, 2, 3].map(i => { const a = [n[i * 8], n[i * 8 + 1]], p1 = [n[i * 8 + 2], n[i * 8 + 3]], b = [n[i * 8 + 6], n[i * 8 + 7]];
      return { a, b, c: [a[0] + (p1[0] - a[0]) / .5523, a[1] + (p1[1] - a[1]) / .5523] }; });
  };
  const corner = f => {
    const c = corners(f.clip);
    if (!c) return null;
    const sq = Number((/scale[XY]\(([\d.]+)\)/.exec(f.face) || [0, 1])[1]), kF = d(c[1].c, c[2].c) / d(c[0].c, c[3].c);
    const err = [];
    if (d(c[0].a, c[0].c) > 2) err.push(Math.abs(d(c[0].b, c[0].c) / d(c[0].a, c[0].c) - sq));
    if (d(c[1].b, c[1].c) > 2) err.push(Math.abs(d(c[1].a, c[1].c) / d(c[1].b, c[1].c) - sq / kF));
    return { sq, err: Math.max(0, ...err) };
  };
  const duo = frames.filter(f => f.duo && f.clip.startsWith("path(")).map(corner).filter(c => c && c.sq > .05 && c.sq < .97);
  const duoWorst = Math.max(0, ...duo.map(c => c.err));
  check(duo.length >= 5 && duoWorst < .03, "Duo 접는 동안 모서리 반경이 내용과 같은 비율", { frames: duo.length, worst: duoWorst.toFixed(4) });
  // 펼친 쪽 장의 힌지에서 먼 모서리 반경은 접는 내내 같다(기기 모양 모프를 따르지 않는다).
  const baseFar = new Set(frames.filter(f => f.duo).map(f => Number.parseFloat((s => s[1] ?? s[0])(f.duoBase.split(" "))).toFixed(2)));
  check(baseFar.size === 1, "Duo 접는 동안 펼친 쪽 모서리 반경이 그대로", [...baseFar]);
  // 접히는 장의 먼 모서리 반경을 원근 배율로 나누면 앞면 · 뒷면 각각 하나의 값이다.
  const flapFar = new Set(frames.filter(f => f.duo && f.clip.startsWith("path(")).map(f => {
    const c = corners(f.clip), kF = d(c[1].c, c[2].c) / d(c[0].c, c[3].c), rv = d(c[1].b, c[1].c);
    return rv > 2 ? rv / kF : null;
  }).filter(Boolean));
  const groups = [...flapFar].sort((x, y) => x - y).reduce((g, v) => (g.length && v - g[g.length - 1].at(-1) <= 1 ? g[g.length - 1].push(v) : g.push([v]), g), []);
  check(groups.length <= 2, "Duo 접는 동안 접히는 장 반경은 면마다 하나", groups.map(g => `${g[0].toFixed(1)}~${g.at(-1).toFixed(1)}`));
  // 접기가 끝나 멈춘 기기로 바뀌는 프레임에서 옆 단추가 제자리다.
  const end = frames.findIndex((f, k) => k > 0 && frames[k - 1].duo && !f.duo);
  const btnJump = end > 0 ? Math.max(Math.abs(frames[end - 1].duoBtn.x - frames[end].uaBtn.x), Math.abs(frames[end - 1].duoBtn.y - frames[end].uaBtn.y)) : null;
  check(btnJump !== null && btnJump < 1, "Duo 접기가 끝날 때 옆 단추가 제자리", { jump: btnJump?.toFixed(2) });

  // 캐시 없는 크기(커스텀) — 옛 화면을 틀에 채워 24px까지 흐리고, 표시 없이 새 그림이 드러난다.
  await post("/viewer/resize", { size: "foldable" });
  await until(`__store.st.focus.size?.preset==='foldable' && ${settled}`);
  await record();
  // 숫자를 누르면 먼저 같은 치수 커스텀으로 흐림 없이 바뀐다 — 캐시 없는 전환은 크기 요청으로 직접 일으켜 잰다
  await post("/viewer/resize", { size: "517x841" });
  await until(`__store.st.focus.size?.widthDp===517 && ${settled}`);
  frames = await stop();
  const held = frames.filter(f => f.moving && !f.uaHidden && f.l1.op < .01 && f.l0.op > .5);
  check(held.length > 0 && Math.max(...held.map(f => f.l0.blur)) >= 20, "캐시가 없으면 옛 화면을 24px로 흐린다", { frames: held.length, blur: Math.max(0, ...held.map(f => f.l0.blur)) });
  check(held.filter(f => f.l0.blur > 1).every(f => covers(f.l0, f.stage)), "흐린 옛 화면이 틀을 채운다");
  check(frames.every(f => !f.loading), "흐린 자리에 준비 표시 없음");
  const reveal = frames.filter(f => f.moving && f.l1.op > .05);
  check(reveal.length > 0 && reveal[0].l1.blur > 10, "새 그림은 흐림이 걷히며 드러난다", { first: reveal[0]?.l1.blur });
  check(gaps(frames).length === 0, "커스텀 전환 중 틀 안 빈칸 없음");

  check(await evaluate(`__errors.length===0`), "브라우저 오류 0", await evaluate(`__errors`));
  await post("/viewer/exit", {});
  await until(`__store.st.screen==='board'`);
  console.log(`총 ${checked}개 통과`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(r => chrome.exitCode !== null ? r() : chrome.once("exit", r));
  await rm(profile, { recursive: true, force: true });
}
