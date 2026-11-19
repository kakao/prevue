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
  // 치수선은 몸체 밖에 서고(컷아웃은 눈금 바깥), 굵은 배지는 그 변의 최댓값이며, 배지끼리 · 조작 독과 겹치지 않고 창 안에 든다.
  const insetGeometry = `(()=>{const st=__store.st.focus,v=st.deviceInsets.values,r=document.querySelector('#shot').getBoundingClientRect(),s=r.width/st.size.widthPx*st.pxPerDp,E=['top','right','bottom','left'],out=[];
    const dp=x=>String(Math.round(x*100)/100);
    const box=(e,t)=>({top:[r.left,r.top,r.width,t],bottom:[r.left,r.bottom-t,r.width,t],left:[r.left,r.top,t,r.height],right:[r.right-t,r.top,t,r.height]})[e];
    const near=(el,exp,tag)=>{const b=el.getBoundingClientRect(),got=[b.left,b.top,b.width,b.height];if(got.some((g,i)=>exp[i]!==null&&Math.abs(g-exp[i])>1))out.push({tag,got,exp})};
    const body=document.querySelector('#ua .shell').getBoundingClientRect();
    for(const k of Object.keys(v))for(const e of E){const el=document.querySelector('#insetOverlay [data-kind="'+k+'"] [data-edge="'+e+'"] .io-fill');
      if(!(v[k][e]>0)){if(el)out.push(k+' '+e+' 0인데 띠');continue}
      if(!el){out.push(k+' '+e+' 띠 없음');continue}
      near(el,box(e,v[k][e]*s),k+' '+e)}
    // 변마다 값이 있는 종류를 배지로 단다 — 컷아웃은 눈금 바깥(위 · 아래 변은 왼쪽, 왼쪽 · 오른쪽 변은 위), 나머지는 최댓값 하나가 오른쪽 · 아래다. SAFE AREA 를 정하는 값(그 변의 최댓값)만 굵다.
    const K=['statusBars','navigationBars','captionBar','displayCutout','systemOverlays'],LABEL={statusBars:'STATUS',navigationBars:'NAV',captionBar:'CAPTION',displayCutout:'CUTOUT',systemOverlays:'OVERLAY'};
    const m=Object.fromEntries(E.map(e=>[e,Math.max(0,...K.map(k=>v[k][e]))]));
    const ruler=document.querySelector('#ruler'),rh=document.querySelector('#rlH').getBoundingClientRect(),rw=document.querySelector('#rlW').getBoundingClientRect(),shown=ruler&&!ruler.hidden;
    let marks=0;
    for(const e of E){
      const vertical=e==='top'||e==='bottom',others=K.filter(k=>k!=='displayCutout').reduce((a,k)=>v[k][e]>v[a][e]?k:a);
      const want=[[others,vertical?'right':'bottom'],['displayCutout',vertical?'left':'top']].filter(([k])=>v[k][e]>0);
      const dims=[...document.querySelectorAll('#insetMarks .im-dim[data-edge="'+e+'"]')];
      if(dims.length!==want.length){out.push({tag:e+' 치수 수',got:dims.map(d=>d.dataset.kind),want:want.map(w=>w[0])});continue}
      for(const [k,side] of want){
        const dim=dims.find(d=>d.dataset.kind===k);
        if(!dim){out.push({tag:e+' 치수 종류',want:k});continue}
        marks++;
        const b=box(e,v[k][e]*s),d=dim.getBoundingClientRect(),badge=dim.querySelector('.im-val').textContent,label=dim.querySelector('.im-label').textContent,bold=v[k][e]===m[e];
        if(dim.dataset.side!==side)out.push({tag:e+' '+k+' 쪽',got:dim.dataset.side,want:side});
        if(badge!==dp(v[k][e]))out.push({tag:e+' '+k+' 배지',badge,want:dp(v[k][e])});
        if(label!==LABEL[k])out.push({tag:e+' '+k+' 레이블',label,want:LABEL[k]});
        const weight=Number(getComputedStyle(dim.querySelector('.im-badge')).fontWeight);
        if((weight>=600)!==bold)out.push({tag:e+' '+k+' 굵기',weight,bold});
        if(side==='right'){if(Math.abs(d.top-b[1])>1||Math.abs(d.height-b[3])>1||!(d.left>body.right))out.push({tag:e+' '+k+' 치수선',got:[d.left,d.top,d.height],exp:[body.right,b[1],b[3]]})}
        else if(side==='bottom'){if(Math.abs(d.left-b[0])>1||Math.abs(d.width-b[2])>1||!(d.top>body.bottom))out.push({tag:e+' '+k+' 치수선',got:[d.left,d.top,d.width],exp:[b[0],body.bottom,b[2]]})}
        else if(side==='left'){if(Math.abs(d.top-b[1])>1||Math.abs(d.height-b[3])>1||!(d.right<body.left)||(shown&&!(d.right<rh.left)))out.push({tag:e+' '+k+' 치수선',got:[d.right,d.top,d.height],exp:[body.left,b[1],b[3]],ruler:rh.left})}
        else if(Math.abs(d.left-b[0])>1||Math.abs(d.width-b[2])>1||!(d.bottom<body.top)||(shown&&!(d.bottom<rw.top)))out.push({tag:e+' '+k+' 치수선',got:[d.left,d.bottom,d.width],exp:[b[0],body.top,b[2]],ruler:rw.top})}}
    if(document.querySelectorAll('#insetMarks .im-dim').length!==marks)out.push('남는 치수');
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
  const devices = selected ?? (smoke ? ['duo'] : ['s26','s26ultra','a07','pixel9','pixel10xl','ip17','ip17e','ipair','ip17pm','ip18pro','ipse3','duo','fold8','ultra','flip8','pixelfold','tablet','s11ultra']);
  const foldable = new Set(['duo','fold8','ultra','flip8','pixelfold']);
  // 측정한 자세가 하나뿐인 화면 — 돌린 자세가 없다(Flip8 커버).
  const fixed = new Set(['flip8-cover']);
  const ios = new Set(['ip17','ip17e','ipair','ip17pm','ip18pro','ipse3','duo']), pixel = new Set(['pixel9','pixel10xl','pixelfold','tablet']);
  // Android 장면 카메라의 가운데(dp) — 데몬 evidence 파일(windowinsets.info)의 displayCutout.path 를 자세마다 따로 잰 값이다(Pixel 은 원, Samsung 은 상자의 가운데).
  // 장면은 세로 값 하나를 돌리고 뒤집으므로, 자세별 원자료와 견주면 회전 · 반전까지 잡는다. 없는 자세는 카메라가 없다.
  // Flip8 커버는 배제 상자 안에 실물 구멍 셋(플래시 · 렌즈 둘)을 그린다 — [cx, cy, 렌즈] dp. 사이 틈은 화면 내용이 보여야 한다.
  const CUT_HOLES = { 'flip8-cover-portrait': [[206.3, 394.2, false], [271.2, 396.5, true], [351.8, 397.3, true]] };
  const CUT_GAP = { 'flip8-cover-portrait': [227, 395] };
  const RAW_CAM = {
    'pixel9-open-portrait': [205.52, 32.95], 'pixel9-open-landscape-left': [32.95, 205.90], 'pixel9-open-landscape-right': [890.48, 205.52],
    'pixelfold-cover-portrait': [221.54, 35.28], 'pixelfold-cover-landscape-left': [35.28, 221.54], 'pixelfold-cover-landscape-right': [959.18, 221.54],
    'pixelfold-open-portrait': [815.38, 32.82], 'pixelfold-open-landscape-left': [32.82, 36.31], 'pixelfold-open-landscape-right': [850.05, 815.38],
    's26-open-portrait': [180, 18.5], 's26-open-landscape-left': [18.5, 180], 's26-open-landscape-right': [761.5, 180],
    'fold8-cover-portrait': [237.71, 19.81], 'fold8-cover-landscape-left': [19.81, 237.71], 'fold8-cover-landscape-right': [731.43, 237.71],
    'ultra-cover-portrait': [180, 18], 'ultra-cover-landscape-left': [18, 180], 'ultra-cover-landscape-right': [822, 180],
    's26ultra-open-portrait': [192, 18.49], 's26ultra-open-landscape-left': [18.49, 192], 's26ultra-open-landscape-right': [813.51, 192],
    'pixel10xl-open-portrait': [221.35, 32.96], 'pixel10xl-open-landscape-left': [32.96, 221.73], 'pixel10xl-open-landscape-right': [953.29, 221.35],
    // 노치 — 상자 가운데다. A07 은 윗변의 42.67×34.13dp, Tab S11 Ultra 는 세로 자세의 오른쪽 긴 변에 붙은 16×57.14dp 라 가로에서 위(왼쪽 가로) · 아래(오른쪽 가로)로 간다.
    'a07-open-portrait': [192, 17.07], 'a07-open-landscape-left': [17.07, 192], 'a07-open-landscape-right': [836.27, 192],
    's11ultra-open-portrait': [1048, 845.71], 's11ultra-open-landscape-left': [845.71, 8], 's11ultra-open-landscape-right': [845.71, 1048],
    // Flip8 — 펼침은 윗변 20.67×36dp 구멍, 커버는 오른쪽 아래 모서리를 차지하는 218.95×88dp 컷아웃이다.
    'flip8-open-portrait': [180, 18], 'flip8-open-landscape-left': [18, 180], 'flip8-open-landscape-right': [822, 180], 'flip8-cover-portrait': [289.69, 397.26],
  };
  // Android 화면 모서리 반경(dp) — 같은 evidence 파일의 roundedCorners 다. 자세마다 같아 기기 · 화면마다 하나이고, 네 모서리가 다르면 [좌상, 우상, 우하, 좌하](세로 자세)다. Pixel Tablet 은 원자료가 비어 뺀다.
  const RAW_RADIUS = { 'pixel9-open': 50.29, 'pixelfold-cover': 47.18, 'pixelfold-open': 34.87, 's26-open': 28, 'fold8-cover': 9.9, 'fold8-open': 6.86, 'ultra-cover': 5, 'ultra-open': 5, 's26ultra-open': 28.09, 'pixel10xl-open': 50.46, 'a07-open': 36.27, 's11ultra-open': 25.14, 'flip8-open': 22, 'flip8-cover': [5.05, 5.05, 40.84, 40.84],
    // safearea.info 의 그 자세 조건 그대로의 값(pt = dp) — 스펙이 아니라 사이트에서 옮겨 적은 정답지다.
    'ip17-open': 62, 'ipair-open': 62, 'ip17pm-open': 62, 'ip18pro-open': 62, 'ip17e-open': 47.33, 'ipse3-open': 0, 'duo-cover': 59, 'duo-open': 59 };
  // 화면 모서리 반경 — 둥근 스테이지의 border-radius 다.
  const cornerOf = () => evaluate(`(()=>{const st=__store.st.focus,r=document.querySelector('#shot').getBoundingClientRect(),k=r.width/st.size.widthPx*st.pxPerDp;
    const cs=getComputedStyle(document.querySelector('#ua .stage'));
    return {k,radii:['TopLeft','TopRight','BottomRight','BottomLeft'].map(c=>parseFloat(cs['border'+c+'Radius'])),shot:{l:r.left,t:r.top,r:r.right,b:r.bottom}}})()`);
  const total = devices.reduce((n,d)=>n+(foldable.has(d)?(fixed.has(d+'-cover')?4:6):3),0);
  const results = [];
  for (const device of devices) for (const folded of foldable.has(device) ? [false,true] : [false]) for (const orientation of ['portrait','landscape-left','landscape-right']) {
    if (fixed.has(`${device}-${folded?'cover':'open'}`) && orientation !== 'portrait') continue;
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
    assert(Object.values(state.deviceInsets.values).some(e=>Object.values(e).some(v=>v>0)) || (device==='ipse3' && orientation!=='portrait'), `${name} 기기 인셋은 늘 전달(인셋이 실제로 0인 SE 가로만 비어 있다)`);
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
    // 종류가 갈라 서는 자세 — 값이 크게 다른 Flip8 커버 아래 변, 상태바와 컷아웃이 비슷한 Fold8 커버 위 변. 굵은 배지(*)가 SAFE AREA 를 정한다.
    const SPLIT = { 'flip8-cover-portrait': ['bottom:CUTOUT 88*@left', 'bottom:NAV 48@right'], 'fold8-cover-portrait': ['top:STATUS 41.9*@right', 'top:CUTOUT 39.62@left'], 'fold8-cover-landscape-left': [], 'fold8-cover-landscape-right': [] };
    if (SPLIT[name]) {
      const got = await evaluate(`[...document.querySelectorAll('#insetMarks .im-dim')].map(d=>d.dataset.edge+':'+d.querySelector('.im-label').textContent+' '+d.querySelector('.im-val').textContent+(d.dataset.bold==='true'?'*':'')+'@'+d.dataset.side)`);
      for (const w of SPLIT[name]) assert(got.includes(w), `${name} 배지 ${w} 가 서야 한다: ${JSON.stringify(got)}`);
    }
    // 바 · 카메라는 데몬이 원본 PNG에 굽는다(D-189) — 뷰어는 덧그리지 않는다. 자리 수치는 DeviceChromeTest 가 뷰어가 그리던 마지막 판과 67자세 대조한다.
    // 여기서는 PNG 자체를 읽어 장면 카메라 가운데 픽셀이 카메라 색이고, 둥근 화면 모서리 밖이 비었는지 본다.
    const baked = await evaluate(`(async()=>{const st=__store.st.focus,img=new Image();img.src=st.imageUrl;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext('2d');g.drawImage(img,0,0);
      const px=(x,y)=>[...g.getImageData(Math.min(c.width-1,Math.max(0,Math.round(x))),Math.min(c.height-1,Math.max(0,Math.round(y))),1,1).data];
      const shot=document.querySelector('#shot').getBoundingClientRect(),k=c.width/shot.width,cams=[...document.querySelectorAll('#ua .cam')].filter(e=>Number(e.style.opacity)>0).map(e=>e.getBoundingClientRect());
      const gap=${JSON.stringify(CUT_GAP[name] ?? null)};
      return {overlay:!!document.querySelector('#sysBars, .sb-status, .sb-handle'),size:[c.width,c.height],want:[st.size.widthPx,st.size.heightPx],corner:px(0,0),cams:cams.map(b=>px(((b.left+b.right)/2-shot.left)*k,((b.top+b.bottom)/2-shot.top)*k)),
        gap:gap&&px(gap[0]*st.pxPerDp,gap[1]*st.pxPerDp)}})()`);
    assert(!baked.overlay, `${name} 뷰어는 기기 바를 덧그리지 않는다`);
    assert.deepEqual(baked.size, baked.want, `${name} 바를 구워도 PNG 크기는 기기 화면 그대로`);
    baked.cams.forEach(cam => assert.deepEqual(cam.slice(0, 3), [5, 5, 5], `${name} PNG의 카메라 자리가 카메라 색이다: ${JSON.stringify(baked)}`));
    if (baked.gap) assert.notDeepEqual(baked.gap.slice(0, 3), [5, 5, 5], `${name} PNG의 배제 상자 안 구멍 밖은 화면 내용이다: ${JSON.stringify(baked)}`);
    const overlay = baked;
    const corner = await cornerOf();
    if (corner.radii[0] > 2) assert.equal(baked.corner[3], 0, `${name} PNG의 둥근 화면 모서리 밖은 비어 있다: ${JSON.stringify(baked)}`);
    const rawR = RAW_RADIUS[`${device}-${folded?'cover':'open'}`];
    if (rawR != null) {
      // 원자료는 세로(자연) 자세의 네 모서리다 — 고정 화면만 넷이 달라 돌린 자세를 따로 맞출 일이 없다.
      const raw = Array.isArray(rawR) ? rawR : [rawR, rawR, rawR, rawR], got = corner.radii.map(r => r / corner.k);
      assert(raw.every((v, i) => Math.abs(got[i] - v) <= .5), `${name} 화면 모서리 반경이 원자료 ±0.5dp: ${JSON.stringify({ got, raw })}`);
    }
    if (device==='ipse3') {
      // 홈 버튼 기기 — 위 · 아래 베젤이 옆 베젤보다 두껍고 아래 베젤 가운데에 홈 버튼이 있다.
      const s = await evaluate(`(()=>{const r=document.querySelector('#shot').getBoundingClientRect();
        const box=q=>{const e=document.querySelector(q);if(!e)return null;const b=e.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom}};
        return {shot:{l:r.left,t:r.top,r:r.right,b:r.bottom},shell:box('#ua .shell'),home:box('#ua .home')}})()`);
      const { shot, shell, home } = s, cx = (shot.l + shot.r) / 2, cy = (shot.t + shot.b) / 2;
      const gap = { l: shot.l - shell.l, r: shell.r - shot.r, t: shot.t - shell.t, b: shell.b - shot.b };
      const ends = orientation === 'portrait' ? [gap.t, gap.b] : [gap.l, gap.r], sides = orientation === 'portrait' ? [gap.l, gap.r] : [gap.t, gap.b];
      assert(Math.min(...ends) > Math.max(...sides) + 1, `${name} 짧은 두 변의 베젤이 긴 변보다 두껍다: ${JSON.stringify(gap)}`);
      assert(home && home.r - home.l > 4 && Math.abs((home.r - home.l) - (home.b - home.t)) < 1, `${name} 홈 버튼은 원이다: ${JSON.stringify(home)}`);
      const homeAt = orientation === 'portrait' ? Math.abs((home.l + home.r) / 2 - cx) < 1 && home.t >= shot.b && home.b <= shell.b + 1
        : Math.abs((home.t + home.b) / 2 - cy) < 1 && (orientation === 'landscape-left' ? home.l >= shot.r && home.r <= shell.r + 1 : home.r <= shot.l && home.l >= shell.l - 1);
      assert(await evaluate(`+getComputedStyle(document.querySelector('#ua .home')).opacity`) > .9, `${name} 홈 버튼이 실제로 보인다(opacity)`);
      assert(homeAt, `${name} 홈 버튼이 짧은 변 베젤 가운데에 있다: ${JSON.stringify(s)}`);
    }
    if (!ios.has(device)) {
      // 장면 카메라는 원자료 컷아웃 가운데와 ±0.5dp다 — PNG에 구운 카메라도 같은 자리라 위에서 그 픽셀을 본다.
      const bars = await evaluate(`(()=>{const st=__store.st.focus,r=document.querySelector('#shot').getBoundingClientRect(),s=r.width/st.size.widthPx*st.pxPerDp;
        const cams=[...document.querySelectorAll('#ua .cam')].filter(c=>Number(c.style.opacity)>0).map(c=>{const b=c.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom,lens:c.classList.contains('lens')}});
        return {k:s,shot:{l:r.left,t:r.top},cams}})()`);
      const { shot, cams } = bars, raw = RAW_CAM[name], holes = CUT_HOLES[name];
      const centers = cams.map(cam => [((cam.l + cam.r) / 2 - shot.l) / bars.k, ((cam.t + cam.b) / 2 - shot.t) / bars.k]);
      const near = (got, want) => Math.abs(got[0] - want[0]) <= .5 && Math.abs(got[1] - want[1]) <= .5;
      if (holes) {
        // 시스템 컷아웃(원자료)은 상자 하나지만 장면은 그 안의 실물 구멍을 그린다 — 구멍 자리 · 렌즈 여부가 스펙의 holes 다.
        assert(centers.length === holes.length && holes.every(([x, y, lens], i) => near(centers[i], [x, y]) && cams[i].lens === lens), `${name} 장면 구멍이 스펙 holes ±0.5dp: ${JSON.stringify({ centers, holes })}`);
      } else if (raw) {
        assert(centers.length === 1, `${name} 카메라가 하나 보인다: ${JSON.stringify(bars)}`);
        assert(near(centers[0], raw), `${name} 장면 카메라가 원자료 컷아웃 가운데 ±0.5dp: ${JSON.stringify({ got: centers[0], raw })}`);
      } else assert(!cams.length, `${name} 원자료에 컷아웃이 없으면 카메라도 없다: ${JSON.stringify(bars)}`);
    }
    if (device==='duo') {
      const expected = !folded && orientation==='portrait' ? 'top' : folded && orientation==='landscape-left' ? 'left' : 'right';
      const cam = await evaluate(`(()=>{const c=document.querySelector('#ua .cam');return {opacity:Number(c.style.opacity),left:parseFloat(c.style.left),width:parseFloat(c.style.width),screen:document.querySelector('#ua .stage').getBoundingClientRect().width}})()`);
      assert.equal(cam.opacity>0, folded, name);
      if(folded) assert.equal(cam.left+cam.width/2>cam.screen/2, expected==='right', name);
      // 커버 가로는 safearea.info Reserved Regions 의 시스템 자리가 카메라 모서리뿐이다 — 장면 카메라가 그 안에 든다(D-179 로 사이트의 좌우를 맞바꿨다).
      // 상태 표시가 시스템 자리 안인지는 DeviceChromeTest 가 본다.
      const lensAt = { 'duo-cover-landscape-left': [0, 0, 84, 82], 'duo-cover-landscape-right': [594, 384, 84, 82] }[name];
      if (lensAt) {
        const [rx, ry, rw, rh] = lensAt, { shot, k } = corner, lens = await evaluate(`(()=>{const b=document.querySelector('#ua .cam').getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom}})()`);
        const region = { l: shot.l + rx * k, t: shot.t + ry * k, r: shot.l + (rx + rw) * k, b: shot.t + (ry + rh) * k };
        assert(lens.l >= region.l - 1 && lens.t >= region.t - 1 && lens.r <= region.r + 1 && lens.b <= region.b + 1, `${name} 카메라가 사이트의 카메라 모서리 자리 안: ${JSON.stringify({ lens, region })}`);
      }
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
  await evaluate(`window.__stable=structuredClone(__store.st);window.__replaying=true;const failed=structuredClone(__stable);failed.version++;failed.error='기기 인셋 적용 실패 검증';__events.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:failed})}))`);
  await until(`document.querySelector('#workspaceLoading').classList.contains('failed')`);
  await check(`!document.querySelector('#shot').hasAttribute('src') && getComputedStyle(document.querySelector('#insetOverlay')).visibility==='hidden' && getComputedStyle(document.querySelector('#insetMarks')).visibility==='hidden' && !document.querySelector('#workspaceLoading').hidden`, '인셋 렌더 실패는 옛 그림 · 인셋 띠를 숨기고 실패를 표시');
  const beforeFailureInput = await evaluate(`__touches.length`);
  const middle = await evaluate(`(()=>{const r=document.querySelector('#stage').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await mouse(middle);
  assert.equal(await evaluate(`__touches.length`),beforeFailureInput,'실패 중 터치 차단');
  await evaluate(`const recovered=structuredClone(__stable);recovered.version+=2;__events.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:recovered})}))`);
  await ready();
  await check(`!document.querySelector('#resizeScene').classList.contains('preparing')`, '복구된 렌더로 그림과 입력을 다시 준비');
  // 실제 자료의 captionBar · systemOverlays 는 모두 0 이라 가짜 값을 재생해 띠 · 배지 · 치수선 · SAFE AREA 를 본다.
  // captionBar.top 은 statusBars.top 보다 크게 둬 위 변의 배지가 다른 종류로 넘어가는지도 본다.
  await evaluate(`const fake=structuredClone(__store.st);fake.version+=1;const fv=fake.focus.deviceInsets.values;fv.captionBar.top=Math.max(...Object.values(fv).map(x=>x.top))+20;fake.focus.deviceInsets.values.systemOverlays.right=96;__events.dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:fake})}))`);
  await until(`!!document.querySelector('#insetOverlay [data-kind="captionBar"] [data-edge="top"]') && !!document.querySelector('#insetOverlay [data-kind="systemOverlays"] [data-edge="right"]')`);
  await check(`(${insetGeometry}).length===0 && document.querySelector('#insetMarks .im-dim[data-edge="right"]')?.dataset.kind==='systemOverlays'`, 'captionBar · systemOverlays 띠 · 배지 · 치수선 · SAFE AREA');
  await check(`(d=>d?.dataset.kind==='captionBar' && d.dataset.bold==='true' && d.querySelector('.im-label').textContent==='CAPTION')(document.querySelector('#insetMarks .im-dim[data-edge="top"][data-side="right"]'))`, '위 변 오른쪽 배지가 가장 큰 captionBar 로 넘어가 굵다');
  await check(`document.querySelectorAll('#insetMarks .im-dim[data-edge="top"]:not([data-kind="displayCutout"])').length===1`, '한쪽에 컷아웃 아닌 종류가 둘이어도 최댓값 하나만');
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
