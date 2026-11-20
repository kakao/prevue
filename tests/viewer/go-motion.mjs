import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDaemon, toBoard } from "./daemon.mjs";

// 카드 호버 때 ▶ 버튼이 펼쳐지는 움직임을 잰다 — 움직임을 줄이면 호버 직후 이미 다 펼쳐져 있고, 기본은 아직 펼쳐지는 중이다.
// 보드가 있는 전용 데몬이면 된다. 펼침은 칸이 200px 이상인 카드에서만 일어나므로 창을 넓게 둔다.
const viewer = process.argv[2];
assert(viewer, "node tests/viewer/go-motion.mjs <전용 프리뷰 서버 URL>");
await requireDaemon(viewer);
await toBoard(viewer);
const pause = ms => new Promise(r => setTimeout(r, ms));
const profile = await mkdtemp(join(tmpdir(), "prevue-go-motion-check-"));
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
  const move = (x, y) => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  // 호버를 보낸 뒤 첫 프레임에서 잰다 — 전환이 돌면 이 순간의 값은 끝값에 못 미친다.
  const measure = `(() => {
    const go = document.querySelector('#cards .card .go'), t = go.querySelector('.go-t'), gs = getComputedStyle(go), ts = getComputedStyle(t);
    return { hovered: go.closest('.card').matches(':hover'), padLeft: parseFloat(gs.paddingLeft), marginLeft: parseFloat(ts.marginLeft),
      textW: t.getBoundingClientRect().width, opacity: parseFloat(ts.opacity) };
  })()`;
  const idle = `document.querySelector('#cards .card .go').getAnimations({ subtree: true }).length === 0`;
  // 첫 프레임 값과, 전환이 다 끝난 뒤 다시 잰 끝값을 함께 돌려준다.
  const hover = async () => {
    const at = await evaluate(`(() => { const r = document.querySelector('#cards .card .cstage').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
    await move(at.x, at.y);
    const first = await evaluate(`new Promise(done => requestAnimationFrame(() => done(${measure})))`);
    await until(idle);
    return { first, end: await evaluate(measure) };
  };
  const settled = `!document.querySelector('#cards .card .go').closest('.card').matches(':hover') && ${idle}`;

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await send("Page.navigate", { url: viewer });
  await until(`!!document.querySelector('#cards .card .cstage img')?.style.width && !!document.querySelector('#cards .card .go .go-t')`, 30_000);
  await move(1, 1);
  await until(settled);

  const reduced = await hover();
  check(reduced.first.hovered && reduced.end.textW > 0, "움직임을 줄여도 카드 호버가 잡히고 글자가 펼쳐진다", reduced);
  check(["padLeft", "marginLeft", "textW"].every(k => reduced.first[k] === reduced.end[k]), "움직임을 줄이면 호버 첫 프레임에 이미 끝까지 펼쳐져 있다", reduced);
  check(reduced.first.opacity < 1 && reduced.end.opacity === 1, "움직임을 줄여도 글자의 페이드는 남는다", reduced);

  await move(1, 1);
  await until(settled);
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await pause(100);
  const normal = await hover();
  check(normal.first.hovered && normal.first.textW < normal.end.textW && normal.first.padLeft < normal.end.padLeft, "기본 설정에서는 펼침 전환이 그대로 돈다", normal);
  await move(1, 1);
  console.log(`▶ 펼침 움직임 검사 ${checked}개 통과`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(r => chrome.exitCode !== null ? r() : chrome.once("exit", r));
  await rm(profile, { recursive: true, force: true });
}
