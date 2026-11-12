import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { requireDaemon, toBoard } from "./daemon.mjs";

// 전용 워크트리로 fixtures/pearl의 AdaptivePreviews.kt를 먼저 연다. 첫 카드를 조작한다.
const viewer = process.argv[2];
assert(viewer, "node tests/viewer/system-bars.mjs <전용 프리뷰 서버 URL>");
await requireDaemon(viewer);
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
  // 띠 · 면 · 치수선의 화면 사각형을 #shot 사각형과 인셋 × pxPerDp ÷ PNG px 로 낸 기대값에 견준다. 오버레이가 쓰는 dp 뷰박스 · 비율과 다른 길(PNG px)로 잰다.
  // 치수선은 몸체 밖(위 · 아래 변은 오른쪽, 왼쪽 · 오른쪽 변은 아래)에 서고, 배지 글은 그 값, 배지끼리 · 조작 독과 겹치지 않고 창 안에 든다.
  const insetGeometry = `(()=>{const st=__store.st.focus,v=st.deviceInsets.values,r=document.querySelector('#shot').getBoundingClientRect(),s=r.width/st.size.widthPx*st.pxPerDp,E=['top','right','bottom','left'],out=[];
    const dp=x=>String(Math.round(x*100)/100);
    const box=(e,t)=>({top:[r.left,r.top,r.width,t],bottom:[r.left,r.bottom-t,r.width,t],left:[r.left,r.top,t,r.height],right:[r.right-t,r.top,t,r.height]})[e];
    const near=(el,exp,tag)=>{const b=el.getBoundingClientRect(),got=[b.left,b.top,b.width,b.height];if(got.some((g,i)=>exp[i]!==null&&Math.abs(g-exp[i])>1))out.push({tag,got,exp})};
    const body=document.querySelector('#ua .shell').getBoundingClientRect();
    let marks=0;
    for(const k of Object.keys(v))for(const e of E){const el=document.querySelector('#insetOverlay [data-kind="'+k+'"] [data-edge="'+e+'"] .io-fill'),dim=document.querySelector('#insetMarks .im-dim[data-kind="'+k+'"][data-edge="'+e+'"]');
      if(!(v[k][e]>0)){if(el||dim)out.push(k+' '+e+' 0인데 띠 · 치수');continue}
      if(!el||!dim){out.push(k+' '+e+' 띠 · 치수 없음');continue}
      marks++;
      near(el,box(e,v[k][e]*s),k+' '+e);
      const b=box(e,v[k][e]*s),d=dim.getBoundingClientRect(),badge=dim.querySelector('.im-badge').textContent;
      if(badge!==dp(v[k][e]))out.push({tag:k+' '+e+' 배지',badge,want:dp(v[k][e])});
      if(e==='top'||e==='bottom'){if(Math.abs(d.top-b[1])>1||Math.abs(d.height-b[3])>1||!(d.left>body.right))out.push({tag:k+' '+e+' 치수선',got:[d.left,d.top,d.height],exp:[body.right,b[1],b[3]]})}
      else if(Math.abs(d.left-b[0])>1||Math.abs(d.width-b[2])>1||!(d.top>body.bottom))out.push({tag:k+' '+e+' 치수선',got:[d.left,d.top,d.width],exp:[b[0],body.bottom,b[2]]})}
    if(document.querySelectorAll('#insetMarks .im-dim').length!==marks)out.push('남는 치수');
    const m=Object.fromEntries(E.map(e=>[e,Math.max(0,...Object.values(v).map(x=>x[e]))]));
    near(document.querySelector('#insetOverlay .io-safe'),[r.left+m.left*s,r.top+m.top*s,r.width-(m.left+m.right)*s,r.height-(m.top+m.bottom)*s],'safeDrawing');
    const safe=document.querySelector('#insetMarks .im-safe'),sw=st.size.widthDp-m.left-m.right,sh=st.size.heightDp-m.top-m.bottom;
    if(!safe||safe.querySelector('b').textContent!=='SAFE AREA'||safe.querySelector('span').textContent!==dp(sw)+' × '+dp(sh))out.push({tag:'SAFE AREA',got:safe?.textContent,want:dp(sw)+' × '+dp(sh)});
    else{const c=safe.getBoundingClientRect(),cx=r.left+(m.left*s+r.width-m.right*s)/2,cy=r.top+(m.top*s+r.height-m.bottom*s)/2;if(Math.abs(c.left+c.width/2-cx)>1||Math.abs(c.top+c.height/2-cy)>1)out.push({tag:'SAFE AREA 자리',got:[c.left+c.width/2,c.top+c.height/2],exp:[cx,cy]})}
    const badges=[...document.querySelectorAll('#insetMarks .im-badge')].map(x=>{const b=x.getBoundingClientRect();return {text:x.textContent,left:b.left,top:b.top,right:b.right,bottom:b.bottom}});
    const dock=document.querySelector('#panel').getBoundingClientRect();
    badges.forEach((a,i)=>{if(a.left<0||a.top<0||a.right>innerWidth||a.bottom>innerHeight)out.push({tag:'배지가 창 밖',a});if(a.left<dock.right&&dock.left<a.right&&a.top<dock.bottom&&dock.top<a.bottom)out.push({tag:'배지가 조작 독 아래',a});badges.slice(i+1).forEach(b=>{if(a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom)out.push({tag:'배지 겹침',a,b})})});
    return out})()`;
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
  const selected=process.argv.find(a=>a.startsWith('--devices='))?.slice(10).split(',');
  const devices = selected ?? (smoke ? ['duo'] : ['s26','pixel9','ip17','ipair','ip17pm','duo','fold8','ultra','pixelfold','tablet']);
  const foldable = new Set(['duo','fold8','ultra','pixelfold']);
  const ios = new Set(['ip17','ipair','ip17pm','duo']), pixel = new Set(['pixel9','pixelfold','tablet']);
  // Android 장면 카메라의 가운데(dp) — 데몬 evidence 파일(windowinsets.info)의 displayCutout.path 를 자세마다 따로 잰 값이다(Pixel 은 원, Samsung 은 상자의 가운데).
  // 장면은 세로 값 하나를 돌리고 뒤집으므로, 자세별 원자료와 견주면 회전 · 반전까지 잡는다. 없는 자세는 카메라가 없다.
  const RAW_CAM = {
    'pixel9-open-portrait': [205.52, 32.95], 'pixel9-open-landscape-left': [32.95, 205.90], 'pixel9-open-landscape-right': [890.48, 205.52],
    'pixelfold-cover-portrait': [221.54, 35.28], 'pixelfold-cover-landscape-left': [35.28, 221.54], 'pixelfold-cover-landscape-right': [959.18, 221.54],
    'pixelfold-open-portrait': [815.38, 32.82], 'pixelfold-open-landscape-left': [32.82, 36.31], 'pixelfold-open-landscape-right': [850.05, 815.38],
    's26-open-portrait': [180, 18.5], 's26-open-landscape-left': [18.5, 180], 's26-open-landscape-right': [761.5, 180],
    'fold8-cover-portrait': [237.71, 19.81], 'fold8-cover-landscape-left': [19.81, 237.71], 'fold8-cover-landscape-right': [731.43, 237.71],
    'ultra-cover-portrait': [180, 18], 'ultra-cover-landscape-left': [18, 180], 'ultra-cover-landscape-right': [822, 180],
  };
  // Android 화면 모서리 반경(dp) — 같은 evidence 파일의 roundedCorners 다. 자세 · 네 모서리가 같아 기기 · 화면마다 하나다. Pixel Tablet 은 원자료가 비어 뺀다.
  const RAW_RADIUS = { 'pixel9-open': 50.29, 'pixelfold-cover': 47.18, 'pixelfold-open': 34.87, 's26-open': 28, 'fold8-cover': 9.9, 'fold8-open': 6.86, 'ultra-cover': 5, 'ultra-open': 5 };
  const total = devices.reduce((n,d)=>n+(foldable.has(d)?6:3),0);
  const results = [];
  for (const device of devices) for (const folded of foldable.has(device) ? [false,true] : [false]) for (const orientation of ['portrait','landscape-left','landscape-right']) {
    await post('/viewer/resize', { device, folded, orientation });
    await until(`__store.st.focus?.size?.device===${JSON.stringify(device)} && __store.st.focus.size.folded===${folded} && __store.st.focus.size.orientation===${JSON.stringify(orientation)}`);
    await ready();
    await pause(150);
    const name = `${device}-${folded?'cover':'open'}-${orientation}`;
    const state = await evaluate(`__store.st.focus`);
    assert.equal(state.systemUi.shown, true, name);
    assert.equal(state.systemUi.bars.look, ios.has(device) ? 'ios' : pixel.has(device) ? 'pixel' : 'oneui', name);
    assert.deepEqual([state.systemUi.bars.insets.statusDp, state.systemUi.bars.insets.navDp], [state.deviceInsets.values.statusBars.top, state.deviceInsets.values.navigationBars.bottom], `${name} 바 높이는 전달 인셋`);
    for (const k of ['choice','applied','supported']) assert(!(k in state.deviceInsets), `${name} ${k}`);
    assert(!('supported' in state.size.insetProfile), name);
    for (const k of ['approximate','note','issue']) assert(!(k in state.deviceInsets), `${name} ${k}`);
    for (const k of ['verified','issue']) assert(!(k in state.size.insetProfile), `${name} ${k}`);
    assert(state.deviceInsets.basisPosture && state.deviceInsets.evidence?.sourceUrl, name);
    assert(Object.values(state.deviceInsets.values).some(e=>Object.values(e).some(v=>v>0)), `${name} 기기 인셋은 늘 전달`);
    const dock = await evaluate(`({button:!!document.querySelector('#sysUiBtn'),hidden:document.querySelector('#sysUiCtl').hidden,inset:document.querySelector('#insetBtn')?.getAttribute('aria-pressed'),title:document.querySelector('#insetBtn')?.title})`);
    assert(!dock.button && !dock.hidden, `${name} 독에 시스템 UI 켬끔 대신 인셋 영역 보기: ${JSON.stringify(dock)}`);
    if (!results.length) {
      assert.equal(dock.inset, 'false', `${name} 인셋 영역 보기는 처음엔 꺼짐`);
      assert(await evaluate(`document.querySelector('#insetOverlay').hidden && document.querySelector('#insetMarks').hidden`), `${name} 끈 동안 오버레이 · 표지 없음`);
      await evaluate(`document.querySelector('#insetBtn').click()`);
      await until(`document.querySelector('#insetBtn').getAttribute('aria-pressed')==='true' && !document.querySelector('#insetOverlay').hidden`);
      const named = await evaluate(`(b=>({title:b.title,label:b.getAttribute('aria-label'),text:b.textContent.trim()}))(document.querySelector('#insetBtn'))`);
      assert(named.title !== dock.title && named.title === named.label && !named.text, `${name} 아이콘만 · 켜면 title · aria-label 이 켬으로: ${JSON.stringify({ before: dock.title, ...named })}`);
    } else assert.equal(dock.inset, 'true', `${name} 기기 변경 · 접기 · 회전에도 켜 둔 채 유지`);
    const insetMiss = await evaluate(insetGeometry);
    assert.deepEqual(insetMiss, [], `${name} 인셋 띠 · safeDrawing 선이 전달한 인셋과 화면 좌표로 맞는다: ${JSON.stringify(insetMiss)}`);
    const overlay = await evaluate(`({hidden:document.querySelector('#sysBars').hidden,svg:document.querySelector('#sysBars svg')?.outerHTML,edge:document.querySelector('.sb-status')?.dataset.edge,handle:!!document.querySelector('.sb-handle'),duo:!!document.querySelector('.sb-duo-indicator')})`);
    assert.equal(overlay.hidden, false, `${name} 기기는 늘 뷰어가 바를 덧그린다`);
    assert.equal(overlay.handle, device!=='duo', name);
    assert.equal(overlay.duo, device==='duo', name);
    assert(await evaluate(`document.querySelectorAll('#sysBars .sb-status').length`) <= 1, `${name} 상태 표시는 많아야 한 벌`);
    if (ios.has(device) && device!=='duo') {
      // 오버레이의 dp 뷰박스가 아니라 #shot · 아일랜드(#ua .cam) · 전달 인셋으로 낸 화면 좌표에 견준다.
      const bars = await evaluate(`(()=>{const st=__store.st.focus,v=st.deviceInsets.values,r=document.querySelector('#shot').getBoundingClientRect(),s=r.width/st.size.widthPx*st.pxPerDp;
        const box=q=>{const e=document.querySelector(q);if(!e)return null;const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom}};
        return {k:s,shot:{l:r.left,t:r.top,r:r.right,b:r.bottom},top:v.statusBars.top*s,bottom:v.navigationBars.bottom*s,time:box('#sysBars .sb-time'),icons:box('#sysBars .sb-icons'),handle:box('#sysBars .sb-handle'),cam:box('#ua .cam')}})()`);
      const { shot, time, icons, handle, cam } = bars, mid = b => (b.t + b.b) / 2;
      assert(handle && handle.t >= shot.b - bars.bottom - 1 && handle.b <= shot.b + 1 && Math.abs((handle.l + handle.r) / 2 - (shot.l + shot.r) / 2) < 1, `${name} 홈 인디케이터가 아래 띠 안 가운데: ${JSON.stringify(bars)}`);
      if (orientation==='portrait') {
        assert(time && icons && cam, `${name} 시각 · 아이콘 · 아일랜드: ${JSON.stringify(bars)}`);
        for (const b of [time, icons]) assert(b.t >= shot.t - 1 && b.b <= shot.t + bars.top + 1 && b.l >= shot.l && b.r <= shot.r, `${name} 상태바가 위 띠 안: ${JSON.stringify(bars)}`);
        assert(time.r < cam.l && icons.l > cam.r, `${name} 상태바가 아일랜드와 겹치지 않는다: ${JSON.stringify(bars)}`);
        assert(Math.abs(mid(icons) - mid(cam)) <= bars.k && Math.abs(mid(time) - mid(cam)) <= 1.5 * bars.k, `${name} 아이콘 ±1dp · 시각 ±1.5dp(글꼴 상자)로 아일랜드 가운데 높이: ${JSON.stringify(bars)}`);
      } else assert(!time && !icons, `${name} 가로에는 상태바가 없다`);
    }
    if (!ios.has(device)) {
      // Android 상태 줄은 모든 자세에서 위 띠 안, 옆 컷아웃 안쪽에 놓이고 보이는 카메라와 겹치지 않는다. 핸들은 아래 띠 안 가운데다.
      // 장면 카메라는 원자료 컷아웃 가운데와 ±0.5dp, 상태 줄의 세로 가운데는 위 띠에서 시작하는 카메라 가운데(아이콘 ±1dp · 시각 ±1.5dp), 그런 카메라가 없으면 띠 가운데다.
      const bars = await evaluate(`(()=>{const st=__store.st.focus,v=st.deviceInsets.values,r=document.querySelector('#shot').getBoundingClientRect(),s=r.width/st.size.widthPx*st.pxPerDp;
        const box=q=>{const e=document.querySelector(q);if(!e)return null;const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom}};
        const c=document.querySelector('#ua .cam');
        return {k:s,radius:parseFloat(getComputedStyle(document.querySelector('#ua .stage')).borderTopLeftRadius),shot:{l:r.left,t:r.top,r:r.right,b:r.bottom},top:v.statusBars.top*s,bottom:v.navigationBars.bottom*s,cutL:v.displayCutout.left*s,cutR:v.displayCutout.right*s,
          time:box('#sysBars .sb-time'),icons:box('#sysBars .sb-icons'),handle:box('#sysBars .sb-handle'),cam:c&&Number(c.style.opacity)>0?box('#ua .cam'):null}})()`);
      const { shot, time, icons, handle, cam } = bars, mid = b => (b.t + b.b) / 2, raw = RAW_CAM[name];
      if (raw) {
        assert(cam, `${name} 카메라가 보인다: ${JSON.stringify(bars)}`);
        const got = [((cam.l + cam.r) / 2 - shot.l) / bars.k, (mid(cam) - shot.t) / bars.k];
        assert(Math.abs(got[0] - raw[0]) <= .5 && Math.abs(got[1] - raw[1]) <= .5, `${name} 장면 카메라가 원자료 컷아웃 가운데 ±0.5dp: ${JSON.stringify({ got, raw })}`);
      } else assert(!cam, `${name} 원자료에 컷아웃이 없으면 카메라도 없다: ${JSON.stringify(bars)}`);
      assert(time && icons && handle, `${name} 시각 · 아이콘 · 핸들: ${JSON.stringify(bars)}`);
      const rowY = cam && cam.t < shot.t + bars.top ? mid(cam) : shot.t + bars.top / 2;
      assert(Math.abs(mid(icons) - rowY) <= bars.k && Math.abs(mid(time) - rowY) <= 1.5 * bars.k, `${name} 상태 줄이 ${cam && cam.t < shot.t + bars.top ? '카메라' : '띠'} 가운데 높이: ${JSON.stringify({ rowY, ...bars })}`);
      for (const b of [time, icons]) assert(b.t >= shot.t - 1 && b.b <= shot.t + bars.top + 1 && b.l >= shot.l + bars.cutL - 1 && b.r <= shot.r - bars.cutR + 1, `${name} 상태 줄이 위 띠 · 옆 컷아웃 안: ${JSON.stringify(bars)}`);
      assert(time.r < icons.l, `${name} 시각과 아이콘이 겹치지 않는다: ${JSON.stringify(bars)}`);
      const apart = (a, b) => a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t;
      if (cam) for (const b of [time, icons]) assert(apart(b, cam), `${name} 상태 줄이 카메라와 겹치지 않는다: ${JSON.stringify(bars)}`);
      assert(handle.t >= shot.b - bars.bottom - 1 && handle.b <= shot.b + 1 && Math.abs((handle.l + handle.r) / 2 - (shot.l + shot.r) / 2) < 1, `${name} 제스처 핸들이 아래 띠 안 가운데: ${JSON.stringify(bars)}`);
      // 화면 모서리는 원자료 반경 ±0.5dp 이고, 시각 · 아이콘 · 핸들 상자의 네 꼭짓점이 그 둥근 화면 안에 있다 — 사각 상자 검사로는 모서리 잘림을 못 잡는다.
      const rawR = RAW_RADIUS[`${device}-${folded?'cover':'open'}`];
      if (rawR != null) assert(Math.abs(bars.radius / bars.k - rawR) <= .5, `${name} 화면 모서리 반경이 원자료 ±0.5dp: ${JSON.stringify({ got: bars.radius / bars.k, raw: rawR })}`);
      const rr = bars.radius, inRound = ([x, y]) => { const cx = Math.min(Math.max(x, shot.l + rr), shot.r - rr), cy = Math.min(Math.max(y, shot.t + rr), shot.b - rr); return Math.hypot(x - cx, y - cy) <= rr + 1; };
      for (const [part, b] of Object.entries({ time, icons, handle })) for (const p of [[b.l, b.t], [b.r, b.t], [b.l, b.b], [b.r, b.b]]) assert(inRound(p), `${name} ${part} 가 둥근 화면 모서리에 잘리지 않는다: ${JSON.stringify({ p, radius: rr, ...bars })}`);
    }
    if (device==='duo') {
      const expected = !folded && orientation==='portrait' ? 'top' : folded && orientation==='landscape-left' ? 'left' : 'right';
      assert.equal(overlay.edge, expected, name);
      const cam = await evaluate(`(()=>{const c=document.querySelector('#ua .cam');return {opacity:Number(c.style.opacity),left:parseFloat(c.style.left),width:parseFloat(c.style.width),screen:document.querySelector('#ua .stage').getBoundingClientRect().width}})()`);
      assert.equal(cam.opacity>0, folded, name);
      if(folded) assert.equal(cam.left+cam.width/2>cam.screen/2, expected==='right', name);
    }
    const tree = await nodes();
    const grid=tree.find(n=>n.name==='LazyVerticalGrid'&&n.fileName==='FilterScreen.kt');
    assert(grid,name);
    const v = state.deviceInsets.values, k = state.pxPerDp;
    const safe = e => Math.max(v.statusBars[e], v.navigationBars[e], v.displayCutout[e]) * k;
    const png = { w: state.size.widthPx, h: state.size.heightPx };
    assert(grid.bounds[0]>=safe('left')-1 && grid.bounds[1]>=safe('top')-1 && grid.bounds[2]<=png.w-safe('right')+2 && grid.bounds[3]<=png.h-safe('bottom')+2,
      `${name} Pearl 메뉴는 전달한 인셋 안에 놓인다: ${JSON.stringify({grid:grid.bounds,png,v,k})}`);
    const chips = tree.filter(n=>n.name==='Text'&&n.fileName==='FilterScreen.kt'&&n.lineNumber===52);
    assert(chips.length>=2, name);
    const bounds = chips[1].bounds;
    await mouse(await atNode(bounds), 1);
    await until(`__store.st.selection?.line===52 && !document.querySelector('#pickBox').hidden`);
    await check(`(()=>{const p=document.querySelector('#pickBox').getBoundingClientRect(),img=document.querySelector('#shot'),r=img.getBoundingClientRect(),k=r.width/Number(img.dataset.fullW),b=${JSON.stringify(bounds)};return Math.abs(p.left-r.left-b[0]*k)<2&&Math.abs(p.top-r.top-b[1]*k)<2&&Math.abs(p.width-(b[2]-b[0])*k)<2})()`, `${name} 가리키기 박스`);
    await mouse({x:12,y:100});
    const allAt=await atNode(chips[0].bounds);
    await until(`!!document.elementFromPoint(${allAt.x},${allAt.y})?.closest('#stage')`);
    await mouse(allAt);
    await pause(700);
    await post('/viewer/catchup');
    await ready();
    await pause(150);
    const touchTree=await nodes();
    const touchBounds=touchTree.filter(n=>n.name==='Text'&&n.fileName==='FilterScreen.kt'&&n.lineNumber===52)[1].bounds;
    const imageBefore=Buffer.from(await fetch(new URL(await evaluate('__store.st.focus.imageUrl'),viewer)).then(r=>r.arrayBuffer()));
    await evaluate(`window.__touches=[]`);
    await mouse(await atNode(touchBounds));
    await until(`__touches.some(t=>t.type==='release')`);
    const touches = await evaluate(`__touches`);
    const center = [(touchBounds[0]+touchBounds[2])/2,(touchBounds[1]+touchBounds[3])/2];
    const tolerance = await evaluate(`Math.ceil(Number(document.querySelector('#shot').dataset.fullW)/document.querySelector('#shot').getBoundingClientRect().width)`);
    for (const t of touches) assert(Math.abs(t.x-center[0])<=tolerance&&Math.abs(t.y-center[1])<=tolerance&&t.x>=touchBounds[0]&&t.x<touchBounds[2]&&t.y>=touchBounds[1]&&t.y<touchBounds[3], `${name} 터치 좌표: ${JSON.stringify({touch:t,center,bounds})}`);
    await pause(700);
    let imageAfter=imageBefore;
    for(const end=Date.now()+5000;imageBefore.equals(imageAfter)&&Date.now()<end;) {
      await pause(150);
      const caught=await post('/viewer/catchup');
      await until(`__store.st.focus.treeUrl===${JSON.stringify(caught.treeUrl)}`);
      imageAfter=Buffer.from(await fetch(new URL(await evaluate('__store.st.focus.imageUrl'),viewer)).then(r=>r.arrayBuffer()));
    }
    const changed = await nodes();
    const cards = list => new Set(list.filter(n=>n.name==='DrinkCard').map(n=>n.bounds.join(','))).size;
    if(imageBefore.equals(imageAfter)) {
      const shot=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(join(evidence,name+'-failed.png'),Buffer.from(shot.data,'base64'));
    }
    assert(!imageBefore.equals(imageAfter), `${name} 실제 필터 조작이 원본 PNG를 바꾼다: ${JSON.stringify({touches,bounds,before:cards(touchTree),after:cards(changed),state:await evaluate("({busy:__store.st.busy,size:__store.st.focus.size.device})")})}`);
    const shot = await send('Page.captureScreenshot', { format:'png' });
    await writeFile(join(evidence,name+'.png'),Buffer.from(shot.data,'base64'));
    results.push({name,size:state.size,insets:state.deviceInsets,overlay,grid:grid.bounds,touches,point:bounds,touchBounds,cardsBefore:cards(touchTree),cardsAfter:cards(changed)});
    console.log(`${results.length}/${total} ${name}: 바 · 인셋 · 가리키기 · 터치 · 실제 조작 통과`);
  }
  assert.equal(results.length,total);
  await post('/viewer/resize',{device:'duo',folded:true,orientation:'portrait'});
  await until(`__store.st.focus.size?.device==='duo' && __store.st.focus.size.folded && __store.st.focus.size.orientation==='portrait'`);
  await ready();
  await check(`!document.querySelector('#sysBars').hidden`, '실패 전 iOS 바 표시');
  await evaluate(`window.__stable=structuredClone(__store.st);window.__replaying=true;const failed=structuredClone(__stable);failed.version++;failed.error='기기 인셋 적용 실패 검증';__events.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:failed})}))`);
  await until(`document.querySelector('#workspaceLoading').classList.contains('failed')`);
  await check(`!document.querySelector('#shot').hasAttribute('src') && getComputedStyle(document.querySelector('#sysBars')).visibility==='hidden' && getComputedStyle(document.querySelector('#insetOverlay')).visibility==='hidden' && getComputedStyle(document.querySelector('#insetMarks')).visibility==='hidden' && !document.querySelector('#workspaceLoading').hidden`, '인셋 렌더 실패는 옛 그림 · 바 · 인셋 띠를 숨기고 실패를 표시');
  const beforeFailureInput = await evaluate(`__touches.length`);
  const middle = await evaluate(`(()=>{const r=document.querySelector('#stage').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await mouse(middle);
  assert.equal(await evaluate(`__touches.length`),beforeFailureInput,'실패 중 터치 차단');
  await evaluate(`const recovered=structuredClone(__stable);recovered.version+=2;__events.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:recovered})}))`);
  await ready();
  await check(`!document.querySelector('#resizeScene').classList.contains('preparing')`, '복구된 렌더로 그림과 입력을 다시 준비');
  // 실제 자료의 captionBar · systemOverlays 는 모두 0 이라 가짜 값을 재생해 띠 · 배지 · 치수선 · SAFE AREA 를 본다.
  await evaluate(`const fake=structuredClone(__store.st);fake.version+=1;fake.focus.deviceInsets.values.captionBar.top=20;fake.focus.deviceInsets.values.systemOverlays.right=96;__events.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:fake})}))`);
  await until(`!!document.querySelector('#insetOverlay [data-kind="captionBar"] [data-edge="top"]') && !!document.querySelector('#insetOverlay [data-kind="systemOverlays"] [data-edge="right"]')`);
  await check(`(${insetGeometry}).length===0 && !!document.querySelector('#insetMarks .im-dim[data-kind="systemOverlays"][data-edge="right"]')`, 'captionBar · systemOverlays 띠 · 배지 · 치수선 · SAFE AREA');
  // 재생한 상태는 version 을 앞질렀다 — 데몬의 다음 상태가 버려지지 않게 되돌린 뒤 실제 이벤트를 다시 받는다.
  await evaluate(`const back=structuredClone(__stable);back.version=__store.st.version+1;__events.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:back})}));__store.st.version=__stable.version;window.__replaying=false`);
  await until(`!document.querySelector('#insetOverlay [data-kind="systemOverlays"] [data-edge="right"]')`);
  await ready();
  // 수명 — 소스 저장(다시 그리기)에도 남고, 인터랙티브를 나갔다 오면 꺼진다. 탭 전환도 한 장을 떠나 보드로 가므로 같은 길이다.
  const version = await evaluate(`__store.st.version`);
  const file = await evaluate('__store.st.board.file');
  await new Promise((resolve, reject) => execFile(fileURLToPath(new URL('../../plugin/bin/prevue', import.meta.url)), ['reload', file], e => e ? reject(e) : resolve()));
  await until(`__store.st.version>${version}`);
  await ready();
  await check(`document.querySelector('#insetBtn').getAttribute('aria-pressed')==='true' && !document.querySelector('#insetOverlay').hidden && (${insetGeometry}).length===0`, '소스를 다시 그려도 켜 둔 채 유지');
  await toBoard(viewer);
  await until(`__store.st.screen==='board'`);
  await post('/viewer/focus', { index: 0 });
  await ready();
  await post('/viewer/resize', { device: 'duo', folded: true, orientation: 'portrait' });
  await until(`__store.st.focus.size?.device==='duo'`);
  await ready();
  await check(`document.querySelector('#insetBtn')?.getAttribute('aria-pressed')==='false' && document.querySelector('#insetOverlay').hidden && document.querySelector('#insetMarks').hidden`, '인터랙티브를 나갔다 오면 꺼짐');
  await check(`__errors.length===0`, '브라우저 예외 없음');
  await writeFile(join(evidence,'results.json'),JSON.stringify({node:process.version,identity,results},null,2));
  console.log(`통합 검증 ${results.length}개 완료: ${evidence}`);
} finally {
  ws?.close(); chrome.kill();
  await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:100});
}
