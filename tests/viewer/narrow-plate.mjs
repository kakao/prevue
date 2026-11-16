import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDaemon, toBoard } from "./daemon.mjs";

// 좁은 판(400px)에서 기기 회전 · 접기의 모든 프레임이 판 안에 드는지, 높이 자 숫자가 잘리지 않는지, 틀이 캡슐과 가운데가 맞는지 잰다.
// 전용 워크트리로 fixtures/pearl의 AdaptivePreviews.kt를 먼저 연다. 첫 카드를 조작한다.
const viewer = process.argv[2];
assert(viewer, "node tests/viewer/narrow-plate.mjs <전용 프리뷰 서버 URL>");
await requireDaemon(viewer);
const pause = ms => new Promise(r => setTimeout(r, ms));
const profile = await mkdtemp(join(tmpdir(), "prevue-narrow-plate-"));
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
  const until = async (expression, ms = 12_000) => {
    for (const end = Date.now() + ms; Date.now() < end; await pause(80)) if (await evaluate(expression)) return;
    throw Error(`시간 초과: ${expression}`);
  };
  const check = (ok, name, detail) => { if (process.env.DIAG && !ok) console.log("실패(진단)", name, JSON.stringify(detail)); else assert(ok, `${name} — ${JSON.stringify(detail)}`); checked++; console.log(`통과 ${checked}: ${name}`, detail ?? ""); };
  const click = async selector => {
    const at = await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1 });
  };
  const post = async (path, body) => { const r = await fetch(new URL(path, viewer), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); assert(r.ok, path); };
  const atRest = `document.querySelector('#resizeScene').classList.contains('at-rest')`;
  const openMenu = async () => {
    if (await evaluate(`document.querySelector('#pnSum').getAttribute('aria-expanded')!=='true'`)) await click("#pnSum");
    await until(`getComputedStyle(document.querySelector('#pnBody')).visibility==='visible' && !document.querySelector('#pnBody').inert`); await pause(250);
  };
  const choose = async sel => { await openMenu(); await evaluate(`document.querySelector('#pnPick [data-sel="${sel}"]').scrollIntoView({ block: 'nearest' })`); await pause(100); await click(`#pnPick [data-sel="${sel}"]`); };
  const orientBy = async orientation => {
    await click("#dcRot");
    await until(`document.querySelector('#dcRot').getAttribute('aria-expanded')==='true'`); await pause(250);
    await click(`#dcOrientMenu [data-orientation="${orientation}"]`);
  };
  // 프레임마다 판(#resizeScene) 밖으로 나간 가장 큰 거리를 쌓는다 — 보이는 유닛(#ua · #ub)과 접기 장치(#rig)의 경계 상자를 본다.
  const begin = () => evaluate(`window.__out=[];window.__probe=true;(()=>{
    const tick=()=>{if(!__probe)return;const s=document.querySelector('#resizeScene').getBoundingClientRect();let out=0;
      for(const el of document.querySelectorAll('#ua .shell,#ua .stage,#ub .shell,#ub .stage,#rig .plate,#rig .slab')){
        const own=el.closest('#ua,#ub,#rig');if(own.hidden||+getComputedStyle(own).opacity<.01||getComputedStyle(el).display==='none')continue;
        const r=el.getBoundingClientRect();if(!r.width)continue;out=Math.max(out,s.left-r.left,r.right-s.right)}
      __out.push(out);requestAnimationFrame(tick)};requestAnimationFrame(tick)})()`);
  const end = async () => { await pause(200); await until(atRest, 15_000); return evaluate(`__probe=false;({frames:__out.length,out:Math.max(...__out)})`); };

  await toBoard(viewer);
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 400, height: 800, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: viewer });
  await until(`!!document.querySelector('#shot')`);
  await evaluate(`import('/js/store.js').then(m=>window.__store=m.store)`);
  await until(`!!__store.st`);
  await post("/viewer/focus", { index: 0 });
  await until(`__store.st.focus?.interactive && document.querySelector('#shot').naturalWidth > 0`);
  await post("/viewer/resize", { size: "original" });
  await until(`!__store.st.focus.size && ${atRest}`);

  await choose("tablet");
  await until(`__store.st.focus.size?.device==='tablet' && ${atRest}`); await pause(400);
  await begin(); await orientBy("portrait");
  const spinOut = await end();
  check(spinOut.frames > 10 && spinOut.out <= 0, "400px 판에서 태블릿 가로 → 세로 회전의 모든 프레임이 판 안", spinOut);
  await begin(); await orientBy("landscape-left");
  const spinBack = await end();
  check(spinBack.frames > 10 && spinBack.out <= 0, "400px 판에서 태블릿 세로 → 가로 회전의 모든 프레임이 판 안", spinBack);

  for (const [dev, label] of [["fold8", "Fold8"], ["pixelfold", "Pixel Fold"]]) {
    await choose(dev);
    await until(`__store.st.focus.size?.device==='${dev}' && ${atRest}`); await pause(400);
    await until(`!document.querySelector('#dcFold').hidden`);
    for (const o of ["portrait", "landscape-left"]) {
      await orientBy(o); await until(`__store.st.focus.size?.orientation==='${o}' && ${atRest}`);
      await begin(); await click("#dcFold"); await until(`__store.st.focus.size.folded`);
      const fold = await end();
      check(fold.frames > 10 && fold.out <= 0, `400px 판에서 ${label} ${o} 접기의 모든 프레임이 판 안`, fold);
      await begin(); await click("#dcFold"); await until(`!__store.st.focus.size.folded`);
      const unfold = await end();
      check(unfold.frames > 10 && unfold.out <= 0, `400px 판에서 ${label} ${o} 펼치기의 모든 프레임이 판 안`, unfold);
    }
  }

  // 정지 자세 — 높이 자 숫자(배지)가 판 왼쪽에서 잘리지 않고, 틀이 아래 캡슐과 가운데가 맞는다.
  await choose("tablet");
  await until(`__store.st.focus.size?.device==='tablet' && ${atRest}`); await pause(400);
  const still = await evaluate(`(()=>{const s=document.querySelector('#resizeScene').getBoundingClientRect(),b=document.querySelector('#rlH').getBoundingClientRect(),f=document.querySelector('#ua .stage').getBoundingClientRect();
    return {badgeLeft:Math.round(b.left-s.left),frameMid:Math.round((f.left+f.right)/2-(s.left+s.right)/2)}})()`);
  check(still.badgeLeft >= 0, "높이 자 배지가 판 왼쪽에서 잘리지 않는다", still);
  check(Math.abs(still.frameMid) <= 2, "틀 가운데가 판 가운데(캡슐)와 2px 안에 맞는다", still);
  const widened = await evaluate(`(()=>{const st=document.createElement('style');st.textContent='.resize-scene .rl-badge{width:9ch !important}';document.head.append(st);return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const s=document.querySelector('#resizeScene').getBoundingClientRect(),b=document.querySelector('#rlH').getBoundingClientRect();st.remove();r({badgeLeft:Math.round(b.left-s.left)})})))})()`);
  check(widened.badgeLeft >= 0, "배지 폭을 9ch로 키워도 높이 자 숫자가 잘리지 않는다", widened);
  console.log(`검사 ${checked}건 통과`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(r => chrome.exitCode !== null ? r() : chrome.once("exit", r));
  await rm(profile, { recursive: true, force: true });
}
