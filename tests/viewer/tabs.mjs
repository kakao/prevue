import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDaemon } from "./daemon.mjs";

// 전용 서버로 연 AdaptivePreviews.kt에서 같은 브라우저의 여러 탭과 실제 터치를 검사한다.
const viewer = process.argv[2];
assert(viewer, "node tests/viewer/tabs.mjs <전용 프리뷰 서버 URL>");
await requireDaemon(viewer);
const pause = ms => new Promise(r => setTimeout(r, ms));
const profile = await mkdtemp(join(tmpdir(), "prevue-tabs-check-"));
const chrome = spawn(process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank",
], { stdio: "ignore" });
const sockets = [];
let checked = 0;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; } catch { await pause(100); }
  }
  assert(port, "Chrome 실행");
  const pages = () => fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  const post = async (path, body) => {
    const r = await fetch(new URL(path, viewer), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert(r.ok, path); return r.json();
  };
  const cdp = async target => {
    const ws = new WebSocket(target.webSocketDebuggerUrl); sockets.push(ws);
    await new Promise(r => ws.addEventListener("open", r, { once: true }));
    let id = 0; const waiting = new Map();
    ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); } });
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const n = ++id, timer = setTimeout(() => reject(Error(`${method} 응답 시간 초과`)), 8000);
      waiting.set(n, m => { clearTimeout(timer); m.error ? reject(Error(m.error.message)) : resolve(m.result); });
      ws.send(JSON.stringify({ id: n, method, params }));
    });
    const evaluate = async expression => {
      const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    };
    const until = async (expression, ms = 8000) => {
      for (const end = Date.now() + ms; Date.now() < end; await pause(80)) if (await evaluate(expression)) return;
      throw Error(`시간 초과: ${expression}`);
    };
    await send("Page.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__errors=[];window.__loads=1;addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));` });
    return { send, evaluate, until, target };
  };
  const check = async (page, expression, name) => { assert(await page.evaluate(expression), name); console.log(`통과 ${++checked}: ${name}`); };
  await post("/viewer/exit", {});
  await post("/focus", { index: 0, interactive: true, size: "original" });
  const first = await cdp((await pages()).find(p => p.type === "page"));
  await first.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await first.send("Page.navigate", { url: viewer });
  await first.until(`document.querySelector('#shot')?.getAttribute('src')?.startsWith('/stream') && document.querySelector('#rlW').value.length>0`);
  const tabs = [first];
  for (let i = 0; i < 3; i++) {
    const { targetId } = await first.send("Target.createTarget", { url: "about:blank" });
    const page = await cdp((await pages()).find(p => p.id === targetId)); tabs.push(page);
    await page.send("Page.navigate", { url: viewer });
  }
  await first.send("Page.bringToFront");
  for (const page of tabs.slice(1)) {
    await page.until(`document.hidden && document.querySelector('#shot')?.getAttribute('src')?.startsWith('/stream')!==true`);
  }
  await check(first, `!document.hidden && document.querySelector('#shot').getAttribute('src').startsWith('/stream')`, "4개 탭 중 보이는 탭만 스트림 유지");
  await first.evaluate(`window.__touches=[];const base=window.fetch;window.fetch=async(u,...a)=>{const entry=String(u).endsWith('/touch')?{done:false,body:JSON.parse(a[0].body)}:null;if(entry)__touches.push(entry);const r=await base(u,...a);if(entry)entry.done=r.ok;return r};`);
  const point = await first.evaluate(`fetch('/viewer/catchup',{method:'POST'}).then(r=>r.json()).then(d=>fetch(d.treeUrl)).then(r=>r.json()).then(d=>{const nodes=[];const walk=ns=>ns.forEach(n=>{if(n.name==='Text'&&n.fileName==='FilterScreen.kt'&&n.lineNumber===52)nodes.push(n);walk(n.children||[])});walk(d.composeViewInfo);const n=nodes.sort((a,b)=>a.bounds[0]-b.bounds[0])[1].bounds;const img=document.querySelector('#shot'),r=img.getBoundingClientRect(),k=r.width/Number(img.dataset.fullW);return{x:r.x+(n[0]+n[2])/2*k,y:r.y+(n[1]+n[3])/2*k}})`);
  for (const type of ["mousePressed", "mouseReleased"]) await first.send("Input.dispatchMouseEvent", { type, ...point, button: "left", clickCount: 1 });
  await first.until(`__touches.length===2 && __touches.every(t=>t.done)`, 2500);
  await check(first, `__touches[0].body.type==='press' && __touches[1].body.type==='release'`, "여러 탭에서도 실제 누름과 뗌의 응답 완료");
  let cards = 0;
  const walk = ns => { for (const n of ns) { if (n.name === "DrinkCard" && n.fileName === "FilterScreen.kt") cards++; walk(n.children || []); } };
  for (const end = Date.now() + 3000; Date.now() < end;) {
    const caught = await post("/viewer/catchup", {});
    const tree = await fetch(new URL(caught.treeUrl, viewer)).then(r => r.json());
    cards = 0; walk(tree.composeViewInfo);
    if (cards === 3) break;
    await pause(100);
  }
  assert.equal(cards, 3, "과일티 칩이 실제 레이아웃을 세 잔으로 바꾼다"); console.log(`통과 ${++checked}: 실제 필터 결과가 세 잔으로 변경`);
  await post("/focus", { index: 0, interactive: true, size: "foldable" });
  const last = tabs.at(-1);
  await last.send("Page.bringToFront");
  await last.until(`document.querySelector('#rlW')?.value==='673' && document.querySelector('#shot').getAttribute('src')?.startsWith('/stream') && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await check(last, `document.querySelector('#rlH').value==='841' && __errors.length===0`, "숨겨진 동안 CLI로 바꾼 크기를 복귀 즉시 반영");
  await first.until(`document.hidden && !document.querySelector('#shot').getAttribute('src').startsWith('/stream')`);
  await last.evaluate(`window.__retained=42`);
  await first.send("Page.bringToFront"); await first.until(`document.querySelector('#rlW').value==='673'`);
  await last.send("Page.bringToFront"); await last.until(`document.querySelector('#shot').getAttribute('src').startsWith('/stream')`);
  await check(last, `__retained===42 && __errors.length===0`, "탭 복귀가 연결 오류나 페이지 재시작으로 처리되지 않음");
  for (const page of tabs) await check(page, `__errors.length===0`, "탭의 브라우저 오류 0");
  console.log(`총 ${checked}개 통과`);
} finally {
  for (const ws of sockets) ws.close(); chrome.kill();
  await new Promise(r => chrome.exitCode !== null ? r() : chrome.once("exit", r));
  await rm(profile, { recursive: true, force: true });
}
