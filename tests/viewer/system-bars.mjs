import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { toBoard } from "./daemon.mjs";

// 전용 워크트리로 fixtures/pearl의 AdaptivePreviews.kt를 먼저 연다. 첫 카드를 조작한다.
const viewer = process.argv[2];
assert(viewer, "node tests/viewer/system-bars.mjs <전용 프리뷰 서버 URL>");
const pause = ms => new Promise(r => setTimeout(r, ms));
const profile = await mkdtemp(join(tmpdir(), "prevue-system-bars-"));
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
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }).catch(e=>{throw Error(e.message+": "+expression.slice(0,250))});
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async (expression, ms = 12_000) => {
    for (const end = Date.now() + ms; Date.now() < end; await pause(80)) if (await evaluate(expression)) return;
    console.error(await evaluate(`({errors:__errors,state:__store.st.focus,html:document.querySelector('#stage').outerHTML})`));
    throw Error(`시간 초과: ${expression}`);
  };
  const check = async (expression, name) => { assert(await evaluate(expression), name); checked++; console.log(`통과 ${checked}: ${name}`); };
  const post = async (path, body = {}) => {
    const r = await fetch(new URL(path, viewer), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert(r.ok, path); return r.json();
  };
  const ready = () => until(`__store.st.focus?.interactive && !__store.st.busy && !__store.st.error && !document.querySelector('#stage').classList.contains('resize-hidden') && document.querySelector('#resizeScene').classList.contains('at-rest') && document.querySelector('#shot').getAttribute('src')?.startsWith('/stream')`, 30_000);
  const nodes = async () => {
    const url = await evaluate(`__store.st.focus.treeUrl`);
    const d = await fetch(new URL(url,viewer)).then(r=>r.json());
    const out=[]; const walk=ns=>ns.forEach(n=>{out.push(n);walk(n.children||[])});walk(d.composeViewInfo||[]);return out;
  };
  const mouse = async (at, modifiers = 0) => {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at, modifiers });
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1, modifiers });
  };
  const atNode = bounds => evaluate(`(()=>{const b=${JSON.stringify(bounds)},img=document.querySelector('#shot'),r=img.getBoundingClientRect(),k=r.width/Number(img.dataset.fullW);return {x:r.x+(b[0]+b[2])/2*k,y:r.y+(b[1]+b[3])/2*k}})()`);
  const evidence = '.cache/system-bars';
  await mkdir(evidence, { recursive: true });
  const identity = await fetch(new URL('/identity', viewer)).then(r=>r.json());
  assert.equal(identity.root, fileURLToPath(new URL('../../plugin/', import.meta.url)).replace(/\/$/, ''), '이 워크트리 서버');
  console.log("준비: 보드 복귀");
  await toBoard(viewer);
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errors=[];window.__touches=[];window.__replaying=false;const ES=EventSource;window.EventSource=class extends ES{constructor(...a){super(...a);window.__events=this;this.addEventListener('message',e=>{if(__replaying&&e.isTrusted)e.stopImmediatePropagation()})}};addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));const f=fetch;window.fetch=(u,o)=>{if(String(u).endsWith('/viewer/touch'))__touches.push(JSON.parse(o.body));return f(u,o)}` });
  console.log("준비: 브라우저 이동");
  await send('Page.navigate', { url: viewer });
  await until(`!!document.querySelector('#shot') && !!window.__errors`);
  await evaluate(`import('/js/store.js').then(m=>window.__store=m.store)`);
  await until(`!!__store.st`);
  assert((await evaluate(`__store.st.board.file`)).endsWith('/AdaptivePreviews.kt'), 'AdaptivePearl 픽스처');
  console.log('준비: 인터랙티브 진입');
  await post('/viewer/focus', { index: 0 });
  await ready();
  const smoke = process.argv.includes('--smoke');
  const devices = smoke ? ['duo'] : ['s26','pixel9','ip17','ipair','ip17pm','duo','fold8','ultra','pixelfold','tablet'];
  const foldable = new Set(['duo','fold8','ultra','pixelfold']);
  const ios = new Set(['ip17','ipair','ip17pm','duo']);
  const results = [];
  for (const device of devices) for (const folded of foldable.has(device) ? [false,true] : [false]) for (const orientation of ['portrait','landscape-left','landscape-right']) {
    await post('/viewer/resize', { device, folded, orientation });
    await until(`__store.st.focus?.size?.device===${JSON.stringify(device)} && __store.st.focus.size.folded===${folded} && __store.st.focus.size.orientation===${JSON.stringify(orientation)}`);
    await ready();
    let appearance;
    for (const choice of ['on','off']) {
      await post('/viewer/deviceInsets', { deviceInsets: choice });
      await until(`__store.st.focus.deviceInsets.choice===${JSON.stringify(choice)}`);
      await ready();
      await pause(150);
      const name = `${device}-${folded?'cover':'open'}-${orientation}-${choice}`;
      const state = await evaluate(`__store.st.focus`);
      assert.equal(state.systemUi.shown, true, name);
      assert.equal(state.systemUi.bars.look, ios.has(device) ? 'ios' : 'aosp', name);
      assert.equal(state.deviceInsets.supported, true, name);
      assert.equal(state.deviceInsets.applied, choice, name);
      assert.equal(state.deviceInsets.approximate, true, name);
      assert.equal(state.size.insetProfile.verified, false, name);
      assert(state.deviceInsets.note, name);
      assert(state.deviceInsets.basisPosture, name);
      if (choice==='off') assert(Object.values(state.deviceInsets.values).every(e=>Object.values(e).every(v=>v===0)), name);
      const overlay = await evaluate(`({hidden:document.querySelector('#sysBars').hidden,svg:document.querySelector('#sysBars svg')?.outerHTML,edge:document.querySelector('.sb-status')?.dataset.edge,handle:!!document.querySelector('.sb-handle')})`);
      assert.equal(overlay.hidden, !ios.has(device), name);
      if (ios.has(device)) {
        assert(overlay.handle, name);
        const geometry = overlay.svg.replaceAll(/sb-ink-(light|dark)/g, 'sb-ink');
        if (appearance) assert.equal(geometry, appearance, name); else appearance=geometry;
      }
      if (device==='duo') {
        const expected = !folded && orientation==='portrait' ? 'top' : folded && orientation==='landscape-right' ? 'left' : 'right';
        assert.equal(overlay.edge, expected, name);
        const cam = await evaluate(`(()=>{const c=document.querySelector('#ua .cam');return {opacity:Number(c.style.opacity),left:parseFloat(c.style.left),width:parseFloat(c.style.width),screen:document.querySelector('#ua .stage').getBoundingClientRect().width}})()`);
        assert.equal(cam.opacity>0, folded, name);
        if(folded) assert.equal(cam.left+cam.width/2>cam.screen/2, expected==='right', name);
      }
      const initial = await nodes();
      const all = initial.find(n=>n.name==='Text'&&n.fileName==='FilterScreen.kt'&&n.lineNumber===51);
      assert(all,name);
      await mouse(await atNode(all.bounds));
      await pause(500);
      await post('/viewer/catchup');
      const tree = await nodes();
      const chips = tree.filter(n=>n.name==='Text'&&n.fileName==='FilterScreen.kt'&&n.lineNumber===51);
      assert(chips.length>=2, name);
      const bounds = chips[1].bounds;
      await mouse(await atNode(bounds), 1);
      await until(`__store.st.selection?.line===51 && !document.querySelector('#pickBox').hidden`);
      await check(`(()=>{const p=document.querySelector('#pickBox').getBoundingClientRect(),img=document.querySelector('#shot'),r=img.getBoundingClientRect(),k=r.width/Number(img.dataset.fullW),b=${JSON.stringify(bounds)};return Math.abs(p.left-r.left-b[0]*k)<2&&Math.abs(p.top-r.top-b[1]*k)<2&&Math.abs(p.width-(b[2]-b[0])*k)<2})()`, `${name} 가리키기 박스`);
      const imageBefore=Buffer.from(await fetch(new URL(state.imageUrl,viewer)).then(r=>r.arrayBuffer()));
      await evaluate(`window.__touches=[]`);
      await mouse(await atNode(bounds));
      await until(`__touches.some(t=>t.type==='release')`);
      const touches = await evaluate(`__touches`);
      const center = [(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2];
      const tolerance = await evaluate(`Math.ceil(Number(document.querySelector('#shot').dataset.fullW)/document.querySelector('#shot').getBoundingClientRect().width)`);
      for (const t of touches) assert(Math.abs(t.x-center[0])<=tolerance&&Math.abs(t.y-center[1])<=tolerance&&t.x>=bounds[0]&&t.x<bounds[2]&&t.y>=bounds[1]&&t.y<bounds[3], `${name} 터치 좌표: ${JSON.stringify({touch:t,center,bounds})}`);
      await pause(700);
      await post('/viewer/catchup');
      const imageAfter=Buffer.from(await fetch(new URL(state.imageUrl,viewer)).then(r=>r.arrayBuffer()));
      const changed = await nodes();
      const cards = list => new Set(list.filter(n=>n.name==='DrinkCard').map(n=>n.bounds.join(','))).size;
      assert(!imageBefore.equals(imageAfter), `${name} 실제 필터 조작이 원본 PNG를 바꾼다: ${JSON.stringify({touches,bounds,before:cards(tree),after:cards(changed),state:await evaluate("({busy:__store.st.busy,size:__store.st.focus.size.device})")})}`);
      const shot = await send('Page.captureScreenshot', { format:'png' });
      await writeFile(join(evidence,name+'.png'),Buffer.from(shot.data,'base64'));
      results.push({name,size:state.size,insets:state.deviceInsets,overlay,touches,point:bounds,cardsBefore:cards(tree),cardsAfter:cards(changed)});
      console.log(`${results.length}/84 ${name}: 바 · 인셋 · 가리키기 · 터치 · 실제 조작 통과`);
    }
  }
  assert.equal(results.length,smoke?12:84);
  await post('/viewer/resize',{device:'duo',folded:true,orientation:'portrait'});
  await until(`__store.st.focus.size?.device==='duo' && __store.st.focus.size.folded && __store.st.focus.size.orientation==='portrait'`);
  await ready();
  await check(`!document.querySelector('#sysBars').hidden`, '실패 전 iOS 바 표시');
  await evaluate(`window.__stable=structuredClone(__store.st);window.__replaying=true;const failed=structuredClone(__stable);failed.version++;failed.error='기기 인셋 적용 실패 검증';__events.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:failed})}))`);
  await until(`document.querySelector('#workspaceLoading').classList.contains('failed')`);
  await check(`!document.querySelector('#shot').hasAttribute('src') && getComputedStyle(document.querySelector('#sysBars')).visibility==='hidden' && !document.querySelector('#workspaceLoading').hidden`, '인셋 렌더 실패는 옛 그림과 바를 숨기고 실패를 표시');
  const beforeFailureInput = await evaluate(`__touches.length`);
  const middle = await evaluate(`(()=>{const r=document.querySelector('#stage').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await mouse(middle);
  assert.equal(await evaluate(`__touches.length`),beforeFailureInput,'실패 중 터치 차단');
  await evaluate(`const recovered=structuredClone(__stable);recovered.version+=2;__events.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:recovered})}))`);
  await ready();
  await check(`!document.querySelector('#resizeScene').classList.contains('preparing')`, '복구된 렌더로 그림과 입력을 다시 준비');
  await check(`__errors.length===0`, '브라우저 예외 없음');
  await writeFile(join(evidence,'results.json'),JSON.stringify({node:process.version,identity,results},null,2));
  console.log(`통합 검증 ${results.length}개 완료: ${evidence}`);
} finally {
  ws?.close(); chrome.kill();
  await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:100});
}
