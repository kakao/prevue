import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { toBoard } from "./daemon.mjs";

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
  const beginFoldProbe = () => evaluate(`window.__foldFrames=[];window.__foldProbe=true;(()=>{
    const tick=()=>{if(!__foldProbe)return;const rig=document.querySelector('#rig'),duo=document.querySelector('#duo');
      if(!rig.hidden)__foldFrames.push(rig.querySelector('.leaf').style.transform);
      if(!duo.hidden)__foldFrames.push(duo.querySelector('.duo-flap').style.clipPath);
      requestAnimationFrame(tick)};requestAnimationFrame(tick)})()`);
  const endFoldProbe = async name => {
    await until(`document.querySelector('#resizeScene').classList.contains('at-rest')`);
    const frames=await evaluate(`__foldProbe=false;__foldFrames`);
    assert(new Set(frames).size>=10, name+' 실제 모션 프레임: '+frames.length);
    console.log(`통과 ${++checked}: ${name} 실제 버튼 → 서버 응답 → 접기 모션`);
  };
  const key = async name => {
    for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: name, code: name });
  };
  // 크기 · 기기 목록은 조작 독의 메뉴 안에 있다(D-167) — 열고 고른다. 고르면 메뉴는 닫힌다.
  const openMenu = async () => {
    if (await evaluate(`document.querySelector('#pnSum').getAttribute('aria-expanded')!=='true'`)) await click("#pnSum");
    await until(`getComputedStyle(document.querySelector('#pnBody')).visibility==='visible' && !document.querySelector('#pnBody').inert`); await pause(250);
  };
  const choose = async sel => { await openMenu(); await click(`#pnPick [data-sel="${sel}"]`); };
  const orient = async orientation => {
    await click("#dcRot");
    await until(`document.querySelector('#dcRot').getAttribute('aria-expanded')==='true'`);
    await pause(250);
    await click(`#dcOrientMenu [data-orientation="${orientation}"]`);
    await until(`__store.st.focus.size?.orientation===${JSON.stringify(orientation)} && !document.querySelector('#stage').classList.contains('resize-hidden')`);
    await until(`document.querySelector('#resizeScene').classList.contains('at-rest')`);
  };
  const pick = async (sel, expected) => {
    await choose(sel);
    await until(`__store.st.focus.size?.${expected}`);
    await until(`!document.querySelector('#stage').classList.contains('resize-hidden') && document.querySelector('#shot').getAttribute('src').startsWith('/stream') && Number(document.querySelector('#rlW').value)===Math.round(__store.st.focus.size.widthDp) && Number(document.querySelector('#rlH').value)===Math.round(__store.st.focus.size.heightDp)`);
  };
  const post = async (path, body) => { const r = await fetch(new URL(path, viewer), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); assert(r.ok, path); };
  await toBoard(viewer);
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
  // 조작 독(D-167) — 헤더는 한 줄이고, 무대 아래 가운데 독에 크기 · 기기 메뉴와 확대가 있다. @Preview 는 가운데 칸이 없다.
  // 기기 독의 폭 상한 — 독의 조작 버튼이 아이콘만이라 가장 넓은 독(펼친 Duo, 영어)이 466px 다(1000 창 실측). 버튼에 글자가 돌아오면 넘는다.
  const DOCK_MAX = 480;
  const dockAt = `(()=>{const p=document.querySelector('#panel'),d=p.getBoundingClientRect();const w=document.documentElement.clientWidth;return Math.abs(d.left+d.width/2-w/2)<=1 && innerHeight-d.bottom>=8 && innerHeight-d.bottom<=24 && d.left>=0 && d.right<=w && d.height<64 && [...p.children].every(c=>{const r=c.getBoundingClientRect();return !r.width||(r.left>=d.left&&r.right<=d.right)})})()`;
  const dockClear = `(()=>{const d=document.querySelector('#panel').getBoundingClientRect(),s=document.querySelector('#stage').getBoundingClientRect();return s.bottom+8<=d.top})()`;
  await check(`${dockAt} && document.querySelector('#panel').contains(document.querySelector('#zoomCtl')) && !document.querySelector('#pnSum').hidden && document.querySelector('#devCtl').hidden && document.querySelector('#pnSl').hidden && ${dockClear}`, "독은 무대 아래 가운데 · 메뉴와 확대만 · 기기를 가리지 않는다");
  await check(`document.querySelector('#bar').getBoundingClientRect().bottom+40>document.querySelector('#focusView').getBoundingClientRect().top`, "헤더 밑에 줄이 없다(헤더 한 줄)");
  await check(`document.querySelector('#pnSum .nm').textContent==='@Preview' && document.querySelector('#pnSum').getAttribute('aria-expanded')==='false' && document.querySelector('#pnBody').inert && getComputedStyle(document.querySelector('#pnBody')).visibility==='hidden'`, "메뉴 버튼은 고른 것의 이름 · 메뉴는 닫혀 있다");
  await openMenu();
  await check(`document.querySelector('#pnSum').getAttribute('aria-expanded')==='true' && document.querySelector('#pnBody').getBoundingClientRect().bottom<=document.querySelector('#pnSum').getBoundingClientRect().top`, "메뉴는 독 위로 열린다");
  await evaluate(`window.__signals={busy:0,liveOff:0};new MutationObserver(()=>{if(document.querySelector('#bar').classList.contains('busy'))__signals.busy++;if(!document.querySelector('#stage').classList.contains('live'))__signals.liveOff++}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','data-state']})`);
  await evaluate(`window.__widths=[];window.__recordWidths=true;function record(){if(!__recordWidths)return;__widths.push(document.querySelector('#stage').offsetWidth);requestAnimationFrame(record)}requestAnimationFrame(record)`);
  await pick("narrow", "widthDp===320");
  await evaluate(`window.__recordWidths=false`);
  await check(`new Set(__widths).size>4`, "크기 틀이 중간 크기를 거쳐 모프");
  await check(`document.querySelector('#rlW').value==='320' && document.querySelector('#rlH').value==='640'`, "프리셋 치수와 실제 그림 도착");
  await check(`document.querySelector('#zoomPct').textContent===Math.round(document.querySelector('#stage').getBoundingClientRect().width/320*100)+'%'`, "배율 숫자는 그린 크기(1dp당 px)와 같다");
  await check(`__signals.busy===0 && __signals.liveOff===0`, "크기 변경 중 진행 표시와 LIVE 깜박임 없음");
  await check(`document.querySelector('#pnSum .nm').textContent==='320×640' && document.querySelector('#pnSum').getAttribute('aria-expanded')==='false' && document.querySelector('#devCtl').hidden && document.querySelector('#pnSl').hidden`, "고르면 메뉴가 닫히고 버튼 이름이 바뀐다 · 프리셋은 가운데 칸 없음");
  const sysUi = `(b=>!!b && !b.querySelector('span') && b.getAttribute('aria-label')==='System UI' && b.getAttribute('aria-pressed')===String(__store.st.focus.systemUi.shown) && b.title.startsWith('System UI — '+(__store.st.focus.systemUi.shown?'On':'Off')+'\\n') && !document.querySelector('#sysUiCtl').hidden)(document.querySelector('#sysUiBtn'))`;
  await check(sysUi, "비기기의 시스템 UI 토글은 아이콘만 · 켬끔은 눌린 모양 · 이름과 값은 툴팁 · aria-label");
  const sysWas = await evaluate(`__store.st.focus.systemUi.shown`);
  await click("#sysUiBtn"); await until(`__store.st.focus.systemUi.shown===${!sysWas} && !document.querySelector('#sysUiBtn').disabled`);
  await check(sysUi, "시스템 UI 를 누르면 눌린 모양과 툴팁이 함께 바뀐다");
  await click("#sysUiBtn"); await until(`__store.st.focus.systemUi.shown===${sysWas} && !document.querySelector('#sysUiBtn').disabled`);
  await choose("custom");
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
  await choose("foldable");
  await until(`__store.st.focus.size?.preset==='foldable' && !document.querySelector('#stage').classList.contains('resize-hidden')`); await pause(300);
  await check(`__store.st.focus.size.preset==='foldable' && document.querySelector('#rlW').value==='673' && document.querySelector('#rlH').value==='841'`, "고치던 숫자는 버리고 고른 프리셋으로");
  await pick("fold8", "device==='fold8'");
  await until(`__store.st.focus.postures.filter(p=>p.size.device==='fold8').length===5`);
  await check(`!document.querySelector('#dcFold').hidden && document.querySelector('#rlW').value==='933'`, "Fold8 펼침과 자세 캐시");
  await check(`document.querySelector('#ruler').classList.contains('device') && !document.querySelector('#rlW').readOnly && document.querySelector('#pnPick [data-sel="fold8"]').title==='Galaxy Z Fold8'`, "기기 치수도 누를 수 있고 기기 칸 툴팁은 전체 이름");
  await evaluate(`document.querySelector('#rlW').focus()`); await pause(300);
  await check(`__store.st.focus.size?.device==='fold8' && !document.querySelector('#devCtl').hidden`, "Tab 으로 숫자에 초점만 와서는 기기를 잃지 않는다");
  await evaluate(`document.querySelector('#rlW').blur()`);
  await check(`!document.querySelector('#sysUiBtn') && !document.querySelector('#sysUiCtl').hidden && document.querySelector('#insetBtn')?.getAttribute('aria-pressed')==='false' && document.querySelector('#insetOverlay').hidden && !!__store.st.focus.deviceInsets?.evidence && __store.st.focus.systemUi.shown`, "기기는 독에 시스템 UI 켬끔 대신 인셋 영역 보기(처음엔 꺼짐) · 시스템 UI 상시 표시");
  await click("#insetBtn");
  await check(`document.querySelector('#insetBtn').getAttribute('aria-pressed')==='true' && !document.querySelector('#insetOverlay').hidden && !document.querySelector('#insetLegend').hidden && ${dockAt}`, "인셋 영역 보기를 켜면 띠 · 범례 · 독은 제자리");
  await check(`!('choice' in __store.st.focus.deviceInsets) && !('applied' in __store.st.focus.deviceInsets) && !('supported' in __store.st.focus.deviceInsets) && __store.st.focus.deviceInsets.values.statusBars.top>0`, "켬끔 필드 없이 인셋을 늘 전달");
  await orient('portrait');
  await beginFoldProbe();
  await click("#dcFold"); await until(`__store.st.focus.size.folded && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await endFoldProbe("Fold8 portrait");
  await check(`__store.st.focus.size.orientation==='landscape-right' && document.querySelector('#rlW').value==='751' && document.querySelector('#rlH').value==='475'`, "펼친 세로를 접으면 손에 든 회전을 이어 커버 가로 오른쪽 · 치수 갱신");
  await check(`document.querySelector('#dcFold').dataset.folded==='true' && document.querySelector('#dcFold').getAttribute('aria-label')==='Unfold' && document.querySelector('#dcFold').title==='Unfold' && document.querySelector('#dcFold .unfold-ic').getBoundingClientRect().width>0 && document.querySelector('#dcFold .fold-ic').closest('svg').getBoundingClientRect().width===0 && document.querySelector('#dcFold').getBoundingClientRect().width===document.querySelector('#dcHinge').getBoundingClientRect().width`, "접은 기기의 접기 버튼은 펼치기 그림과 이름");
  await check(`document.querySelector('#pnSum .nm').textContent==='Fold8' && !!document.querySelector('#pnSum .pn-sil') && !document.querySelector('#devCtl').hidden && document.querySelector('#panel').contains(document.querySelector('#devCtl')) && document.querySelector('#pnSl').hidden && [...document.querySelectorAll('#devCtl .tb-btn')].every(b=>b.innerText.trim()==='' && b.getAttribute('aria-label')) && ${dockAt} && ${dockClear}`, "기기면 독 가운데에 아이콘만인 자세 버튼(이름은 aria-label) · 메뉴 버튼은 윤곽과 이름 · 기기를 가리지 않는다");
  await orient('landscape-left');
  await check(`document.querySelector('#rlW').value==='751' && document.querySelector('#rlH').value==='475'`, "접은 기기의 가로 돌리기");
  await check(`document.querySelector('#dcHinge').getAttribute('aria-pressed')==='true' && document.querySelector('#dcHinge').title==='Hide hinge line' && document.querySelector('#dcHinge').getAttribute('aria-label')==='Hinge line'`, "힌지 선은 켜지면 눌린 모양 · 툴팁은 할 동작");
  await click("#dcHinge"); await check(`document.querySelector('#dcHinge').getAttribute('aria-pressed')==='false' && document.querySelector('#dcHinge').title==='Show hinge line'`, "힌지 선 전환");
  await click("#rlH"); await until(`!__store.st.focus.size?.device && __store.st.focus.size?.widthDp===751 && __store.st.focus.size?.heightDp===475 && document.activeElement===document.querySelector('#rlH')`);
  await check(`document.querySelector('#pnPick [aria-checked="true"]')?.dataset.sel==='custom' && document.querySelector('#devCtl').hidden`, "기기에서 숫자를 누르면 그 크기로 커스텀 · 자세 칸은 걷힘");
  await check(`!!document.querySelector('#sysUiBtn') && !document.querySelector('#insetBtn') && document.querySelector('#insetOverlay').hidden && document.querySelector('#insetLegend').hidden`, "비기기 크기는 시스템 UI 토글 그대로 · 인셋 오버레이는 켜 둔 채여도 숨는다");
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
  await check(`document.querySelector('#insetBtn')?.getAttribute('aria-pressed')==='true' && !document.querySelector('#insetOverlay').hidden`, "비기기 크기를 거쳐 기기로 돌아오면 인셋 영역 보기가 켜진 그대로");
  await check(`document.querySelector('#pnSl').hidden && __store.st.focus.size.widthPx===2853 && __store.st.focus.size.heightPx===2007 && document.querySelector('#rlW').value==='951' && document.querySelector('#rlH').value==='669'`, "Duo 펼침은 공개 해상도와 같은 951×669dp");
  await until(`__store.st.focus.postures.filter(p=>p.size.device==='duo').length===5`);
  await beginFoldProbe();
  await click("#dcFold");
  await until(`__store.st.focus.size.folded && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  await endFoldProbe('Duo landscape-left');
  await until(`document.querySelector('#rlW').value==='466'`);
  await check(`__store.st.focus.size.orientation==='portrait' && document.querySelector('#rlH').value==='678'`, "Duo 펼친 가로(기본)를 접으면 커버 세로");
  await pick("s26", "device==='s26'");
  await check(`__store.st.focus.deviceInsets.posture.startsWith('s26') && __store.st.focus.deviceInsets.values.statusBars.top>0`, "기기 · 접기 · 원본과 커스텀을 거쳐 돌아와도 인셋 전달");
  await orient('landscape-left');
  const cameraLeft = await evaluate(`document.querySelector('#ua .cam').getBoundingClientRect().left`);
  await orient('landscape-right');
  await check(`document.querySelector('#dcOrientMenu [aria-checked="true"]').dataset.orientation==='landscape-right' && __store.st.focus.size.insetProfile.measured.displayCutout.right===37`, "오른쪽 가로 메뉴와 응답 · 비대칭 프로필 일치");
  await check(`document.querySelector('#ua .cam').getBoundingClientRect().left>${cameraLeft}`, "반대 가로는 카메라도 반대편");
  await check(`(b=>b.dataset.orientation==='landscape-right' && b.title==='Landscape right — change orientation' && getComputedStyle(b.querySelector('.turn')).rotate==='90deg')(document.querySelector('#dcRot'))`, "가로 오른쪽은 돌리기 그림이 반대로 눕는다");
  await evaluate(`document.querySelector('#dcRot').focus()`);
  await key('ArrowDown'); await key('Home');
  await check(`document.activeElement.dataset.orientation==='portrait'`, "방향 메뉴의 방향키와 Home");
  await key('Escape');
  await check(`document.activeElement.id==='dcRot' && __store.st.screen==='focus' && document.querySelector('#dcRot').getAttribute('aria-expanded')==='false'`, "Escape는 방향 메뉴만 닫고 버튼에 초점 복원");
  await check(`__store.st.focus.systemUi.shown && __store.st.focus.deviceInsets.values.displayCutout.right===37`, "오른쪽 가로에서도 인셋 전달과 바 표시");

  await check(`document.querySelector('#dcFold').hidden && document.querySelector('#dcHinge').hidden`, "일반 기기는 돌리기만 표시");
  await pick("ip17pm", "device==='ip17pm'");
  await check(`document.querySelector('#rlW').value==='440' && document.querySelector('#rlH').value==='956' && document.querySelector('#pnPick [data-sel="ip17pm"]').title==='iPhone 17 Pro Max'`, "새 기기도 패널에서 골라 스펙 크기로 그린다");
  await pick("tablet", "device==='tablet'");
  await check(`(b=>b.dataset.orientation==='landscape-left' && b.title==='Landscape left — change orientation' && b.getAttribute('aria-label')===b.title && getComputedStyle(b.querySelector('.turn')).rotate==='-90deg' && getComputedStyle(b.querySelector('.tb-chev')).display!=='none')(document.querySelector('#dcRot')) && document.querySelector('#rlW').value==='1280'`, "원래 가로인 태블릿은 돌리기 그림이 가로 왼쪽으로 눕고 이름은 툴팁 · aria-label");
  await orient('portrait');
  await check(`(b=>b.dataset.orientation==='portrait' && b.title==='Portrait — change orientation' && b.getAttribute('aria-label')===b.title && getComputedStyle(b.querySelector('.turn')).rotate==='none' && getComputedStyle(b.querySelector('.tb-chev')).display!=='none')(document.querySelector('#dcRot')) && document.querySelector('#rlH').value==='1280'`, "세운 태블릿은 돌리기 그림이 서고 이름이 세로");
  await pick("foldable", "preset==='foldable'");
  await click("#zoomInBtn"); await pause(300);
  await check(`document.querySelector('#stage').getBoundingClientRect().width > document.querySelector('#stage').offsetWidth`, "그림과 몸체 함께 확대");
  await evaluate(`fetch(__store.st.focus.treeUrl).then(r=>r.json()).then(d=>{const walk=ns=>{for(const n of ns){if(n.name==='Text' && n.fileName==='FilterScreen.kt'&&n.lineNumber===52)return n;const child=walk(n.children||[]);if(child)return child}};window.__pointNode=walk(d.composeViewInfo)})`);
  const at = await evaluate(`(()=>{const n=__pointNode.bounds,r=document.querySelector('#shot').getBoundingClientRect(),k=r.width/Number(document.querySelector('#shot').dataset.fullW);return{x:r.x+(n[0]+n[2])/2*k,y:r.y+(n[1]+n[3])/2*k}})()`);
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1, modifiers: 1 });
  await until(`!document.querySelector('#pickBox').hidden && __store.st.selection?.line===52`);
  await check(`(()=>{const b=document.querySelector('#pickBox').getBoundingClientRect(),r=document.querySelector('#shot').getBoundingClientRect(),n=__pointNode.bounds,k=r.width/Number(document.querySelector('#shot').dataset.fullW);return Math.abs(b.x-(r.x+n[0]*k))<2 && Math.abs(b.y-(r.y+n[1]*k))<2 && Math.abs(b.width-(n[2]-n[0])*k)<2})()`, "확대한 그림에서 가리킨 박스 좌표 일치");
  await check(`!document.querySelector('#zoomCtl').classList.contains('at-fit') && document.querySelector('#panel').contains(document.querySelector('#zoomCtl')) && ${dockAt} && document.elementFromPoint(...(r=>[r.x+r.width/2,r.y+r.height/2])(document.querySelector('#zoomInBtn').getBoundingClientRect()))?.closest('#zoomCtl')`, "확대는 독 오른쪽 끝 · 확대한 그림 위에 뜬다 · 확대 중 맞춤 단추");
  await click("#zoomFitBtn"); await pause(300);
  await check(`document.querySelector('#zoomCtl').classList.contains('at-fit') && document.querySelector('#zoomPct').textContent!=='' && document.querySelector('#zoomFitBtn').getBoundingClientRect().width<1`, "맞춤 단추로 처음 화면 · 단추는 접힌다");
  // 가리킨 결과 카드(D-162)는 그림 오른쪽 위에 먼저 선다 — 낮은 창에서도 아래 가운데 독과 겹치지 않는다.
  const pointAt = async () => {
    const at = await evaluate(`(()=>{const n=__pointNode.bounds,r=document.querySelector('#shot').getBoundingClientRect(),k=r.width/Number(document.querySelector('#shot').dataset.fullW);return{x:r.x+(n[0]+n[2])/2*k,y:r.y+(n[1]+n[3])/2*k}})()`);
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1, modifiers: 1 });
    await until(`!!document.querySelector('.pc-float') && getComputedStyle(document.querySelector('.pc-float')).visibility!=='hidden'`);
  };
  const apart = `(()=>{const c=document.querySelector('.pc-float')?.getBoundingClientRect(),z=document.querySelector('#panel').getBoundingClientRect();return !!c&&c.width>0&&(c.right<=z.left||c.left>=z.right||c.bottom<=z.top||c.top>=z.bottom)})()`;
  for (const [width, height] of [[1440, 1000], [1000, 640]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false }); await pause(400);
    await pointAt(); await pause(400);
    await check(`${apart} && ${dockAt}`, `가리킨 결과 카드와 독이 겹치지 않는다 ${width}×${height}`);
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(300);
  await click("#zoomInBtn"); await pause(300);
  await click("#zoomPct"); await click('#zoomMenu [data-z="fit"]');
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await pick("narrow", "preset==='narrow'");
  await check(`document.querySelector('#rig').hidden && document.querySelector('#duo').hidden && document.querySelector('#ua').style.transform===''`, "움직임 줄이기에서 공간 모션 없음");
  // 커서는 장면이 멈춘 다음 프레임에 폭 숫자로 온다 — 그 전에 Esc 를 누르면 작업 공간에서 나간다
  await choose("custom"); await until(`__store.st.focus.size?.kind==='custom' && document.querySelector('#resizeScene').classList.contains('at-rest') && document.activeElement?.id==='rlW'`);
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
  await choose("fold8"); await until(`__store.st.focus.size?.device==='fold8' && !document.querySelector('#stage').classList.contains('resize-hidden')`); await pause(300);
  await check(`document.querySelector('#pnPick [data-sel="fold8"]').getAttribute('aria-checked')==='true' && ${dockAt} && (r=>r.left>=0&&r.right<=innerWidth)(document.querySelector('#pnBody').getBoundingClientRect())`, "좁은 창(480)에서도 독은 한 줄로 창 안 · 메뉴로 고른다");
  await send("Emulation.setDeviceMetricsOverride", { width: 820, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(300);
  await check(`${dockAt} && document.querySelector('#panel').getBoundingClientRect().width<=${DOCK_MAX} && getComputedStyle(document.querySelector('#dcRot .tb-chev')).display!=='none'`, "820 창에서 독은 한 줄 · 펼친 Fold8 독 폭이 기준 이하 · 돌리기 ▾ 유지");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate(`for(const x of ['s26','narrow','ultra','foldable'])document.querySelector('#pnPick [data-sel="'+x+'"]').click()`);
  await until(`__store.st.focus.size?.preset==='foldable' && !document.querySelector('#stage').classList.contains('resize-hidden') && document.querySelector('#rlW').value==='673' && document.querySelector('#rlH').value==='841'`);
  await check(`document.querySelector('#rlW').value==='673' && document.querySelector('#rlH').value==='841'`, "연타의 마지막 크기 적용");
  await openMenu(); await key("Escape"); await pause(250);
  await check(`document.querySelector('#pnSum').getAttribute('aria-expanded')==='false' && __store.st.screen==='focus' && document.querySelector('#pnSum .nm').textContent==='673×841'`, "Esc 는 메뉴만 닫고 작업 공간에 남는다");
  await openMenu(); await click("#wsTitle"); await pause(250);
  await check(`document.querySelector('#pnSum').getAttribute('aria-expanded')==='false'`, "메뉴 밖을 누르면 닫힌다");
  await pick("ipduo", "device==='duo'");
  // 가장 넓은 독(펼친 Duo — 자세 버튼 셋)도 창 폭마다 한 줄로 든다 — 560 아래 메뉴 버튼은 윤곽만, 확대는 배율만
  await send("Emulation.setDeviceMetricsOverride", { width: 1000, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(300);
  await check(`document.querySelector('#panel').getBoundingClientRect().width<=${DOCK_MAX}`, `펼친 Duo 의 독 폭이 ${DOCK_MAX}px 이하`);
  for (const width of [1000, 760, 700, 480, 360]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(300);
    await check(dockAt, `펼친 Duo 의 독이 ${width} 창에서 한 줄로 창 안`);
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }); await pause(300);
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
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
}
