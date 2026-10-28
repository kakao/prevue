import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 전용 워크트리로 fixtures/pearl의 AdaptivePreviews.kt를 먼저 연다. 첫 카드를 조작한다.
const viewer = process.argv[2];
assert(viewer, "node tests/viewer/resize.mjs <전용 프리뷰 서버 URL>");
const pause = ms => new Promise(r => setTimeout(r, ms));
const profile = await mkdtemp(join(tmpdir(), "prevue-resize-check-"));
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
  const check = async (expression, name) => { assert(await evaluate(expression), name); checked++; console.log(`통과 ${checked}: ${name}`); };
  const click = async (selector, modifiers = 0) => {
    const at = await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1, modifiers });
  };
  const key = async name => {
    for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: name, code: name });
  };
  const pick = async (sel, expected) => {
    await click(`#pnPick [data-sel="${sel}"]`);
    await until(`__store.st.focus.size?.${expected}`);
    await until(`!document.querySelector('#stage').classList.contains('resize-hidden') && document.querySelector('#shot').getAttribute('src').startsWith('/stream') && Number(document.querySelector('#rlW').value)===Math.round(__store.st.focus.size.widthDp) && Number(document.querySelector('#rlH').value)===Math.round(__store.st.focus.size.heightDp)`);
  };
  const post = async (path, body) => { const r = await fetch(new URL(path, viewer), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); assert(r.ok, path); };
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
  await check(`!document.querySelector('#resizeScene').hidden`, "인터랙티브에서 피커 표시");
  await post("/viewer/resize", { size: "original" });
  await until(`!__store.st.focus.size && !document.querySelector('#stage').classList.contains('resize-hidden') && document.querySelector('#resizeScene').classList.contains('at-rest')`);
  await evaluate(`window.__signals={busy:0,liveOff:0};new MutationObserver(()=>{if(document.querySelector('#bar').classList.contains('busy'))__signals.busy++;if(!document.querySelector('#stage').classList.contains('live'))__signals.liveOff++}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','data-state']})`);
  await evaluate(`window.__widths=[];window.__recordWidths=true;function record(){if(!__recordWidths)return;__widths.push(document.querySelector('#stage').offsetWidth);requestAnimationFrame(record)}requestAnimationFrame(record)`);
  await pick("narrow", "widthDp===320");
  await evaluate(`window.__recordWidths=false`);
  await check(`new Set(__widths).size>4`, "크기 틀이 중간 크기를 거쳐 모프");
  await check(`document.querySelector('#rlW').value==='320' && document.querySelector('#rlH').value==='640'`, "프리셋 치수와 실제 그림 도착");
  await check(`document.querySelector('#zoomPct').textContent===Math.round(document.querySelector('#stage').getBoundingClientRect().width/320*100)+'%'`, "배율 숫자는 그린 크기(1dp당 px)와 같다");
  await check(`__signals.busy===0 && __signals.liveOff===0`, "크기 변경 중 진행 표시와 LIVE 깜박임 없음");
  await click('#pnPick [data-sel="custom"]');
  await until(`__store.st.focus.size?.widthDp===320 && !__store.st.focus.size?.preset && document.activeElement===document.querySelector('#rlW')`);
  await check(`document.querySelector('#pnPick [data-sel="custom"]').getAttribute('aria-checked')==='true' && document.querySelector('#ruler').classList.contains('custom')`, "커스텀 칸은 지금 크기로 커스텀 · 폭 숫자에 커서");
  await key("Escape"); await pause(100);
  await click("#rlW"); await evaluate(`document.querySelector('#rlW').value='500'`); await key("Enter");
  await until(`__store.st.focus.size?.widthDp===500 && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await check(`document.querySelector('#ruler').classList.contains('custom') && document.querySelector('#pnPick [aria-checked="true"]')?.dataset.sel==='custom'`, "치수 입력으로 커스텀 전환 · 고른 칸은 커스텀");
  await click("#rlW"); await evaluate(`document.querySelector('#rlW').value='777'`); await key("Escape"); await pause(100);
  await check(`__store.st.focus.size.widthDp===500 && document.querySelector('#rlW').value==='500' && __store.st.screen==='focus'`, "Escape는 입력만 취소");
  await click("#rlW"); await evaluate(`document.querySelector('#rlW').value='320'`); await key("Enter");
  await until(`__store.st.focus.size?.widthDp===320 && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await check(`__store.st.focus.size.preset==='narrow' && document.querySelector('#pnPick [aria-checked="true"]')?.dataset.sel==='narrow'`, "프리셋과 같은 치수를 입력하면 그 프리셋");
  await click("#rlH"); await until(`!__store.st.focus.size?.preset && __store.st.focus.size?.widthDp===320 && document.activeElement===document.querySelector('#rlH')`);
  await check(`document.querySelector('#pnPick [aria-checked="true"]')?.dataset.sel==='custom'`, "프리셋에서 숫자를 누르면 바로 커스텀");
  await check(`document.querySelector('#resizeScene').classList.contains('at-rest') && ![...document.querySelectorAll('#resizeScene .ly')].some(e=>/blur\\([1-9]/.test(e.style.filter))`, "같은 크기 커스텀은 전환 · 흐림 없이");
  await evaluate(`document.querySelector('#rlH').value='999'`);
  await click('#pnPick [data-sel="foldable"]');
  await until(`__store.st.focus.size?.preset==='foldable' && !document.querySelector('#stage').classList.contains('resize-hidden')`); await pause(300);
  await check(`__store.st.focus.size.preset==='foldable' && document.querySelector('#rlW').value==='673' && document.querySelector('#rlH').value==='841'`, "고치던 숫자는 버리고 고른 프리셋으로");
  await pick("fold8", "device==='fold8'");
  await until(`__store.st.focus.postures.filter(p=>p.size.device==='fold8').length===3`);
  await check(`!document.querySelector('#dcFold').hidden && document.querySelector('#rlW').value==='933'`, "Fold8 펼침과 자세 캐시");
  await check(`document.querySelector('#ruler').classList.contains('device') && !document.querySelector('#rlW').readOnly && document.querySelector('#pnPick [data-sel="fold8"]').title==='Galaxy Z Fold8'`, "기기 치수도 누를 수 있고 기기 칸 툴팁은 전체 이름");
  await evaluate(`document.querySelector('#rlW').focus()`); await pause(300);
  await check(`__store.st.focus.size?.device==='fold8' && !document.querySelector('#devCtl').hidden`, "Tab 으로 숫자에 초점만 와서는 기기를 잃지 않는다");
  await evaluate(`document.querySelector('#rlW').blur()`);
  await click("#dcFold"); await until(`__store.st.focus.size.folded && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await check(`document.querySelector('#rlW').value==='475' && document.querySelector('#dcFoldLb').textContent==='Unfold'`, "접기와 치수 갱신");
  await click("#dcRot"); await until(`__store.st.focus.size.landscape && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await check(`document.querySelector('#rlW').value==='751' && document.querySelector('#rlH').value==='475'`, "접은 기기의 가로 돌리기");
  await click("#dcHinge"); await check(`document.querySelector('#dcHinge').getAttribute('aria-pressed')==='false'`, "힌지 선 전환");
  await click("#rlH"); await until(`!__store.st.focus.size?.device && __store.st.focus.size?.widthDp===751 && __store.st.focus.size?.heightDp===475 && document.activeElement===document.querySelector('#rlH')`);
  await check(`document.querySelector('#pnPick [aria-checked="true"]')?.dataset.sel==='custom' && document.querySelector('#devCtl').hidden`, "기기에서 숫자를 누르면 그 크기로 커스텀 · 자세 칸은 걷힘");
  await evaluate(`document.querySelector('#rlH').value='500'`); await key("Enter");
  await until(`__store.st.focus.size?.widthDp===751 && __store.st.focus.size?.heightDp===500 && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await check(`document.querySelector('#rlH').value==='500' && document.querySelector('#pnPick [data-sel="custom"] .d').textContent==='751×500'`, "기기에서 들어간 커스텀 숫자를 바로 고친다");
  // 커스텀 슬라이더(D-99) — 끄는 동안은 틀만 따라오고 요청은 놓을 때 한 번이다. fetch 를 감싸 /viewer/resize 를 센다
  await check(`!document.querySelector('#pnSl').hidden && document.querySelector('#pnSl [data-axis="w"] .v b').textContent==='751' && document.querySelector('#pnSl [data-axis="h"] [role="slider"]').getAttribute('aria-valuenow')==='500'`, "커스텀이면 커스텀 행 아래 폭 · 높이 슬라이더와 지금 값");
  await evaluate(`window.__resizes=0;const __f=window.fetch;window.fetch=(u,o)=>{if(String(u).includes('/viewer/resize'))__resizes++;return __f(u,o)}`);
  const trackAt = async (axis, v) => evaluate(`(()=>{const r=document.querySelector('#pnSl [data-axis="${axis}"] .sl-track').getBoundingClientRect();return {x:r.left+(${v}-240)/1360*r.width,y:r.top+r.height/2}})()`);
  const w0 = await evaluate(`document.querySelector('#ua .stage').offsetWidth`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...(await trackAt("w", 751)), button: "left", buttons: 1, clickCount: 1 });
  for (const v of [800, 900, 1000, 1100, 1200]) { await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...(await trackAt("w", v)), button: "left", buttons: 1 }); await pause(60); }
  await pause(200);
  await check(`__resizes===0 && Math.abs(Number(document.querySelector('#rlW').value)-1200)<=2 && document.querySelector('#ua .stage').offsetWidth>${w0} && !document.querySelector('#resizeScene').classList.contains('at-rest') && ![...document.querySelectorAll('#ua .ly')].some(e=>Number(e.style.opacity)>0 && /blur\\([1-9]/.test(e.style.filter))`, "끄는 동안 요청 0 · 틀과 치수선 숫자만 따라온다(흐림 없음)");
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...(await trackAt("w", 1200)), button: "left", buttons: 0, clickCount: 1 });
  await until(`Math.abs(__store.st.focus.size?.widthDp-1200)<=2 && __store.st.focus.size?.heightDp===500 && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await pause(300);
  await check(`__resizes===1 && document.querySelector('#rlW').value===String(__store.st.focus.size.widthDp)`, "놓을 때 요청 1");
  await evaluate(`window.__resizes=0;document.querySelector('#pnSl [data-axis="h"] [role="slider"]').focus()`);
  for (let i = 0; i < 3; i++) await key("ArrowRight");
  for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: "ArrowUp", code: "ArrowUp", modifiers: 8 });
  await pause(100);
  await check(`__resizes===0 && document.querySelector('#rlH').value==='513' && document.querySelector('#pnSl [data-axis="h"] .v b').textContent==='513'`, "방향키 1dp · Shift 10dp — 누르는 동안 요청 0");
  await until(`__store.st.focus.size?.heightDp===513 && !document.querySelector('#stage').classList.contains('resize-hidden')`); await pause(300);
  await check(`__resizes===1`, "키 입력이 멈추면 요청 1");
  await key("End");
  await until(`__store.st.focus.size?.heightDp===1600 && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await key("Home");
  await until(`__store.st.focus.size?.heightDp===240 && !document.querySelector('#stage').classList.contains('resize-hidden')`); await pause(300);
  await check(`__resizes===3 && document.querySelector('#pnSl [data-axis="h"] [role="slider"]').getAttribute('aria-valuenow')==='240'`, "Home · End 는 240 · 1600");
  await evaluate(`document.querySelector('#pnSl [data-axis="h"] [role="slider"]').blur()`);
  // 요청이 실패하면 끌던 틀과 숫자가 지금 크기로 돌아온다
  await evaluate(`window.__realFetch=window.fetch;window.fetch=(u,o)=>String(u).includes('/viewer/resize')?Promise.resolve(new Response('',{status:500})):__realFetch(u,o)`);
  const wNow = await evaluate(`__store.st.focus.size.widthDp`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...(await trackAt("w", wNow)), button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...(await trackAt("w", 700)), button: "left", buttons: 1 }); await pause(100);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...(await trackAt("w", 700)), button: "left", buttons: 0, clickCount: 1 });
  await until(`document.querySelector('#resizeScene').classList.contains('at-rest') && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await check(`document.querySelector('#rlW').value===String(${wNow}) && document.querySelector('#pnSl [data-axis="w"] .v b').textContent===String(${wNow})`, "요청이 실패하면 틀 · 숫자 · 슬라이더가 지금 크기로 돌아온다");
  await evaluate(`window.fetch=__realFetch;document.activeElement.blur()`);
  await pick("ipduo", "device==='duo'");
  await check(`document.querySelector('#pnSl').hidden`, "기기를 고르면 슬라이더가 접힌다");
  await until(`__store.st.focus.postures.filter(p=>p.size.device==='duo').length===3`);
  await click("#dcFold"); await until(`!document.querySelector('#duo').hidden`);
  await check(`document.querySelector('.duo-flap').style.clipPath.startsWith('path(')`, "Duo 평면 접기 윤곽");
  await until(`__store.st.focus.size.folded && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await pick("s26", "device==='s26'");
  await check(`document.querySelector('#dcFold').hidden && document.querySelector('#dcHinge').hidden`, "일반 기기는 돌리기만 표시");
  await pick("ip17pm", "device==='ip17pm'");
  await check(`document.querySelector('#rlW').value==='440' && document.querySelector('#rlH').value==='956' && document.querySelector('#pnPick [data-sel="ip17pm"]').title==='iPhone 17 Pro Max'`, "새 기기도 패널에서 골라 스펙 크기로 그린다");
  await pick("tablet", "device==='tablet'");
  await check(`document.querySelector('#dcRotLb').textContent==='Upright' && document.querySelector('#rlW').value==='1280'`, "원래 가로인 태블릿은 세우기 단추");
  await click("#dcRot"); await until(`__store.st.focus.size?.landscape && Number(document.querySelector('#rlW').value)===800`);
  await check(`document.querySelector('#dcRotLb').textContent==='Rotate' && document.querySelector('#rlH').value==='1280'`, "세운 태블릿은 돌리기 단추");
  await pick("foldable", "preset==='foldable'");
  await click("#zoomInBtn"); await pause(300);
  await check(`document.querySelector('#stage').getBoundingClientRect().width > document.querySelector('#stage').offsetWidth`, "그림과 몸체 함께 확대");
  await evaluate(`fetch(__store.st.focus.treeUrl).then(r=>r.json()).then(d=>{const walk=ns=>{for(const n of ns){if(n.name==='Text' && n.fileName==='FilterScreen.kt'&&n.lineNumber===51)return n;const child=walk(n.children||[]);if(child)return child}};window.__pointNode=walk(d.composeViewInfo)})`);
  const at = await evaluate(`(()=>{const n=__pointNode.bounds,r=document.querySelector('#shot').getBoundingClientRect(),k=r.width/Number(document.querySelector('#shot').dataset.fullW);return{x:r.x+(n[0]+n[2])/2*k,y:r.y+(n[1]+n[3])/2*k}})()`);
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1, modifiers: 1 });
  await until(`!document.querySelector('#pickBox').hidden && __store.st.selection?.line===51`);
  await check(`(()=>{const b=document.querySelector('#pickBox').getBoundingClientRect(),r=document.querySelector('#shot').getBoundingClientRect(),n=__pointNode.bounds,k=r.width/Number(document.querySelector('#shot').dataset.fullW);return Math.abs(b.x-(r.x+n[0]*k))<2 && Math.abs(b.y-(r.y+n[1]*k))<2 && Math.abs(b.width-(n[2]-n[0])*k)<2})()`, "확대한 그림에서 가리킨 박스 좌표 일치");
  await check(`!document.querySelector('#zoomCtl').classList.contains('at-fit') && (()=>{const z=document.querySelector('#zoomCtl').getBoundingClientRect(),p=document.querySelector('#panel').getBoundingClientRect();return z.left>=p.left && z.right<=p.right && Math.abs(z.bottom-p.bottom)<=16})()`, "확대 줄은 패널 맨 아래 · 확대 중 맞춤 단추");
  await click("#zoomFitBtn"); await pause(300);
  await check(`document.querySelector('#zoomCtl').classList.contains('at-fit') && document.querySelector('#zoomPct').textContent!==''`, "맞춤 단추로 처음 화면 · 단추는 숨는다");
  await click("#zoomInBtn"); await pause(300);
  await click("#zoomPct"); await click('#zoomMenu [data-z="fit"]');
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await pick("narrow", "preset==='narrow'");
  await check(`document.querySelector('#rig').hidden && document.querySelector('#duo').hidden && document.querySelector('#ua').style.transform===''`, "움직임 줄이기에서 공간 모션 없음");
  // 커서는 장면이 멈춘 다음 프레임에 폭 숫자로 온다 — 그 전에 Esc 를 누르면 작업 공간에서 나간다
  await click('#pnPick [data-sel="custom"]'); await until(`__store.st.focus.size?.kind==='custom' && document.querySelector('#resizeScene').classList.contains('at-rest') && document.activeElement?.id==='rlW'`);
  await key("Escape"); await pause(100);
  await evaluate(`window.__widths=[];window.__recordWidths=true;(function rec(){if(!__recordWidths)return;__widths.push(Math.round(document.querySelector('#ua .stage').getBoundingClientRect().width));requestAnimationFrame(rec)})()`);
  const from = await trackAt("w", 320), to = await trackAt("w", 500);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...from, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...to, button: "left", buttons: 1 }); await pause(150);
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...to, button: "left", buttons: 0, clickCount: 1 });
  await until(`Math.abs(__store.st.focus.size?.widthDp-500)<=2 && !document.querySelector('#stage').classList.contains('resize-hidden')`); await pause(300);
  await evaluate(`window.__recordWidths=false`);
  await check(`new Set(__widths).size<=2 && document.querySelector('#ua').style.transform===''`, "움직임 줄이기에서 슬라이더 틀은 이동 · 확대 없이 바뀐다");
  await send("Emulation.setDeviceMetricsOverride", { width: 480, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(200);
  await click('#pnPick [data-sel="fold8"]'); await until(`__store.st.focus.size?.device==='fold8' && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await check(`document.querySelector('#pnPick [data-sel="fold8"]').getAttribute('aria-checked')==='true'`, "좁은 창에서도 패널 목록으로 고른다");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate(`for(const x of ['s26','narrow','ultra','foldable'])document.querySelector('#pnPick [data-sel="'+x+'"]').click()`);
  await until(`__store.st.focus.size?.preset==='foldable' && !document.querySelector('#stage').classList.contains('resize-hidden') && document.querySelector('#rlW').value==='673' && document.querySelector('#rlH').value==='841'`);
  await check(`document.querySelector('#rlW').value==='673' && document.querySelector('#rlH').value==='841'`, "연타의 마지막 크기 적용");
  await check(`__errors.length===0`, "브라우저 오류 0");
  const screenshot = process.env.RESIZE_SCREENSHOT;
  if (screenshot) { const r = await send("Page.captureScreenshot", { format: "png" }); await writeFile(screenshot, Buffer.from(r.data, "base64")); }
  await post("/viewer/exit", {});
  await until(`__store.st.screen==='board' && document.querySelector('#resizeScene').hidden`);
  await check(`!document.body.classList.contains('resizing-ui') && document.querySelector('#stage').parentElement.classList.contains('wrap')`, "보드 복귀 때 피커와 크기 해제");
  console.log(`총 ${checked}개 통과`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(r => chrome.exitCode!==null ? r() : chrome.once("exit", r));
  await rm(profile, { recursive: true, force: true });
}
