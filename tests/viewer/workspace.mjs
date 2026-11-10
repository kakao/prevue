import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 실제 픽스처의 첫 프레임을 지연시켜 준비 전후 배치와 입력을 검사한다.
const viewer = process.argv[2];
assert(viewer, "node tests/viewer/workspace.mjs <전용 프리뷰 서버 URL>");
const pause = ms => new Promise(r => setTimeout(r, ms));
const profile = await mkdtemp(join(tmpdir(), "prevue-workspace-check-"));
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
    console.error(await evaluate(`({errors:window.__errors,screen:window.__store?.st?.screen,stage:document.querySelector("#stage")?.outerHTML,body:document.body.className})`));
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
  const post = async (path, body = {}) => {
    const r = await fetch(new URL(path, viewer), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    assert(r.ok, path); return r.json();
  };
  let held = [], hold = false;
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.method !== "Fetch.requestPaused") return;
    if (hold) held.push(m.params.requestId);
    else send("Fetch.continueRequest", { requestId: m.params.requestId }).catch(() => {});
  });
  const pending = async () => {
    for (let i = 0; i < 100 && !held.length; i++) await pause(50);
    assert(held.length, "첫 프레임 지연 요청");
  };
  const resume = async () => {
    hold = false;
    await Promise.all(held.splice(0).map(requestId => send("Fetch.continueRequest", { requestId })));
  };
  const ready = () => until(`!document.querySelector('#resizeScene').classList.contains('preparing') && document.querySelector('#shot').getAttribute('src')?.startsWith('/stream') && !document.querySelector('#stage').classList.contains('resize-hidden')`);
  const exit = async () => {
    const before = await evaluate(`__exits`);
    await click("#back");
    await until(`!document.querySelector('#boardView').hidden && !document.documentElement.classList.contains('vt-workspace') && __exits>${before}`);
  };
  await post("/viewer/exit");
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 640, deviceScaleFactor: 1, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__errors=[];window.__transitions=[];window.__arrivals=[];window.__requests=[];window.__exits=0;
    addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
    const transition=document.startViewTransition?.bind(document);
    if(transition) document.startViewTransition=update=>transition(async()=>{await update();__transitions.push({workspace:document.documentElement.classList.contains('vt-workspace'),hero:[...document.querySelectorAll('img')].some(i=>getComputedStyle(i).viewTransitionName==='hero'),duration:getComputedStyle(document.documentElement,'::view-transition-new(root)').animationDuration});});
    const animate=Element.prototype.animate;
    Element.prototype.animate=function(...args){if(this.id==='shot')__arrivals.push(args[1]);return animate.apply(this,args)};
    const base=window.fetch;window.fetch=async(u,...a)=>{if(/\\/(touch|wheel|resize)$/.test(String(u)))__requests.push(String(u));if(String(u).endsWith('/stream/viewport'))window.__vp=JSON.parse(a[0].body).width;const r=await base(u,...a);if(String(u).endsWith("/exit"))__exits++;return r};
  ` });
  await send("Page.navigate", { url: viewer });
  await until(`!!document.querySelector('.card .go')`);
  await evaluate(`import('/js/store.js').then(m=>window.__store=m.store)`);
  await until(`__store.st?.screen==='board' && document.querySelector('.card img').naturalWidth>0`);
  await pause(400);
  // 프레임마다 실제 캔버스 · 패널 · 모프 틀을 잰다. 패널은 장식이 다 들어온 뒤(불투명 · 제자리)만 센다.
  await evaluate(`document.querySelector(".card .go").scrollIntoView({block:"nearest"});window.__boardScroll=scrollY;window.__frames=[];window.__morphs=[];window.__record=true;
    const R=r=>[r.x,r.y,r.width,r.height];
    function sample(){if(!__record)return;const stage=document.querySelector('#stage'),bar=document.querySelector('#panel'),m=document.querySelector('.morph');
      if(m){const i=m.querySelector('img');__morphs.push({r:R(m.getBoundingClientRect()),fit:getComputedStyle(i).objectFit,ratio:i.naturalWidth/i.naturalHeight,src:i.getAttribute('src'),stage:R(stage.getBoundingClientRect()),deco:getComputedStyle(bar).opacity,head:getComputedStyle(document.querySelector('#back')).opacity,title:getComputedStyle(document.querySelector('#wsTitle')).opacity});}
      if(!document.querySelector('#focusView').hidden&&stage.offsetWidth&&getComputedStyle(bar).opacity==='1'&&getComputedStyle(bar).translate==='none')__frames.push([...R(stage.getBoundingClientRect()),...R(bar.getBoundingClientRect()).slice(0,2)]);
      requestAnimationFrame(sample)}requestAnimationFrame(sample)`);
  const cardRect = await evaluate(`(()=>{const c=document.querySelector('.card[data-i="0"] .cstage'),r=c.getBoundingClientRect(),i=c.querySelector('img');return {r:[r.x,r.y,r.width,r.height],src:i.src,ratio:i.naturalWidth/i.naturalHeight}})()`);
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/*.png?*", requestStage: "Response" }] });
  hold = true;
  await click(".card .go");
  await until(`!document.querySelector('#focusView').hidden && document.querySelector('#stage').offsetWidth>0`);
  await pending(); await pause(1100);
  const near = (a, b, e = .5) => a.every((v, i) => Math.abs(v - b[i]) < e);
  const entry = await evaluate(`__morphs`);
  const stageNow = entry.at(-1).stage, ratio = stageNow[2] / stageNow[3];
  assert(Math.abs(ratio / cardRect.ratio - 1) < .01, "픽스처 첫 카드는 캔버스와 비율이 같다");
  assert(near(entry[0].r, cardRect.r, 1.5), `모프가 카드 틀에서 출발 ${entry[0].r} ${cardRect.r}`);
  assert(near(entry.at(-1).r, stageNow), `모프가 캔버스 틀에 0.5px 안으로 닿음 ${entry.at(-1).r} ${stageNow}`);
  const dist = Math.max(...stageNow.map((v, i) => Math.abs(v - cardRect.r[i])));
  const steps = entry.map((f, i) => i ? Math.max(...f.r.map((v, j) => Math.abs(v - entry[i - 1].r[j]))) : 0);
  if (!steps.every(d => d < dist * .25)) console.error(dist, steps.map(d => d.toFixed(1)).join(" "), entry.slice(0, 4).map(f => f.r.map(Math.round)));
  assert(steps.every(d => d < dist * .25), "모프가 끊기지 않고 이어짐");
  assert(entry.every(f => f.fit === "cover" && Math.abs(f.r[2] / f.r[3] / cardRect.ratio - 1) < .01), "모프 중 그림 비율 유지");
  console.log(`통과 ${++checked}: 카드 틀이 캔버스 틀로 이어져 모프(${entry.length}프레임, 그림 늘림 없음)`);
  assert(entry.filter(f => f.deco === "0").length > 3, "모프 초반에는 장식이 없다"); console.log(`통과 ${++checked}: 장식은 모프 뒤에 들어옴`);
  // 헤더도 패널과 한 묶음이다(D-153 ⑧) — push 가 도는 동안 비치지 않고, 한 번 들어오면 다시 사라지지 않는다
  const heads = entry.map(f => [Number(f.head), Number(f.title)]);
  const rises = heads.every(([b, t], i) => !i || (b >= heads[i - 1][0] - .001 && t >= heads[i - 1][1] - .001));
  assert(entry.filter(f => f.deco === "0").every(f => f.head === "0" && f.title === "0") && heads.at(-1).every(v => v === 1) && rises,
    `헤더가 패널과 함께 모프 뒤에 들어옴 ${JSON.stringify(heads.map(h => h.map(v => v.toFixed(2)).join("/")))}`);
  console.log(`통과 ${++checked}: 헤더(뒤로 · 이름)는 패널과 함께 모프 뒤에 들어옴`);
  await check(`(()=>{const m=document.querySelector('.morph');return m&&m.querySelector('img').src===${JSON.stringify(cardRect.src)}&&getComputedStyle(document.querySelector('#stage')).visibility==='hidden'})()`, "첫 프레임 전에는 카드 그림이 캔버스 자리의 자리 표시");
  await check(`[...document.querySelectorAll('#resizeScene input,#panel button')].every(b=>b.disabled) && !document.querySelector('#back').disabled`, "준비 중 조작 도구만 비활성화하고 출구 유지");
  await click("#stage"); await click("#pnSum"); await evaluate(`document.querySelector('#pnPick [data-sel="narrow"]').click()`); await key("+");
  await check(`__requests.length===0`, "준비 중 터치와 크기 변경 전송 차단");
  const loadingShot = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(join(tmpdir(), "prevue-workspace-loading.png"), Buffer.from(loadingShot.data, "base64"));
  await resume(); await ready(); await pause(400);
  await evaluate(`__record=false`);
  await check(`!document.querySelector('.morph') && getComputedStyle(document.querySelector('#stage')).visibility==='visible'`, "첫 프레임이 오면 자리 표시가 걷히고 실제 스트림");
  await check(`__frames.length>10 && __frames.every(r=>r.every((v,i)=>Math.abs(v-__frames[0][i])<.5))`, "모프가 닿은 뒤 캔버스와 피커의 위치·크기 고정");
  await check(`document.querySelector('#workspaceLoading').hidden && !document.querySelector('#rlW').disabled && __arrivals.length===0`, "준비 완료 시 자리 표시 틀만 흐려지고 조작 활성화");
  await check(`__transitions.length>0 && __transitions.every(t=>!t.hero && t.workspace && t.duration==='0.15s')`, "이미지 Hero 없이 바탕은 150ms 페이드");
  const point = await evaluate(`fetch('/viewer/catchup',{method:'POST'}).then(r=>r.json()).then(d=>fetch(d.treeUrl)).then(r=>r.json()).then(d=>{const ns=[];const walk=xs=>xs.forEach(n=>{if(n.name==='Text'&&n.fileName==='FilterScreen.kt'&&n.lineNumber===52)ns.push(n);walk(n.children||[])});walk(d.composeViewInfo);const n=ns.sort((a,b)=>a.bounds[0]-b.bounds[0])[1].bounds,img=document.querySelector('#shot'),r=img.getBoundingClientRect(),k=r.width/Number(img.dataset.fullW);return{x:r.x+(n[0]+n[2])/2*k,y:r.y+(n[1]+n[3])/2*k}})`);
  for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, ...point, button: "left", clickCount: 1 });
  await pause(650);
  const caught = await post("/viewer/catchup");
  const tree = await fetch(new URL(caught.treeUrl, viewer)).then(r => r.json());
  let cards = 0;
  const walk = xs => xs.forEach(n => { if (n.name === "DrinkCard") cards++; walk(n.children || []); }); walk(tree.composeViewInfo);
  assert.equal(cards, 3, "준비 완료 뒤 실제 터치가 필터를 바꾼다"); console.log(`통과 ${++checked}: 준비 완료 뒤 실제 필터 터치`);
  await post("/viewer/resize", { size: "narrow" }); await ready();
  await until(`document.querySelector('#resizeScene').classList.contains('at-rest')`); await pause(300);
  await until(`__vp===Math.round(document.querySelector('#shot').offsetWidth*devicePixelRatio)`, 3000);
  await check(`__vp===Math.round(document.querySelector('#shot').offsetWidth*devicePixelRatio)`, "크기를 바꾼 뒤 스트림 폭은 멈춘 캔버스 폭으로 알린다");
  await evaluate(`window.__out=[];window.__outRec=true;window.__stageAt=(r=>[r.x,r.y,r.width,r.height])(document.querySelector('#stage').getBoundingClientRect());requestAnimationFrame(function f(){if(!__outRec)return;const m=document.querySelector('.morph'),b=document.querySelector('#panel');__out.push({m:m&&(r=>[r.x,r.y,r.width,r.height])(m.getBoundingClientRect()),st:(r=>[r.x,r.y,r.width,r.height])(document.querySelector('#stage').getBoundingClientRect()),deco:getComputedStyle(b).opacity,head:getComputedStyle(document.querySelector('#back')).opacity,ws:!document.querySelector('#focusView').hidden});requestAnimationFrame(f)})`);
  await exit(); await pause(1000);
  await evaluate(`__outRec=false`);
  const out = await evaluate(`({out:__out,stage:__stageAt,card:(r=>[r.x,r.y,r.width,r.height])(document.querySelector('.card[data-i="0"] .cstage').getBoundingClientRect())})`);
  const flying = out.out.filter(f => f.m);
  const firstFly = out.out.findIndex(f => f.m);
  assert(out.out.slice(0, firstFly).some(f => f.ws && Number(f.deco) < .2 && Number(f.head) < .2), "장식 · 헤더가 틀보다 먼저 물러남");
  assert(flying.length > 5 && near(flying[0].m, out.out[firstFly - 1].st, 1.5) && near(flying.at(-1).m, out.card), `캔버스 틀이 카드 틀로 줄어듦 ${flying.length} ${flying[0]?.m} ${out.out[firstFly - 1]?.st} ${flying.at(-1)?.m} ${out.card}`);
  console.log(`통과 ${++checked}: 장식이 먼저 물러나고 틀이 카드로 줄어듦`);
  await check(`!document.querySelector('.card[data-i="0"].returned') && !document.querySelector('.morph') && getComputedStyle(document.querySelector('.card[data-i="0"] .cstage')).visibility==='visible' && Math.abs(scrollY-__boardScroll)<2 && __store.st.focus===null`, "화면 안 카드로는 링 없이 모프만 하고 보드·스크롤 유지");
  await check(`__transitions.every(t=>!t.hero && t.duration==='0.15s') && !document.querySelector('#shot').hasAttribute('src')`, "복귀에도 Hero와 숨은 스트림 없음");
  // 에이전트가 CLI로 켠 카드가 화면 밖이면 날아갈 곳이 안 보인다 — 페이드와 링으로 대신한다.
  const far = await evaluate(`(()=>{const cs=[...document.querySelectorAll('.card')];const off=c=>{const r=c.querySelector('.cstage').getBoundingClientRect();return r.bottom<0||r.top>innerHeight};
    let c=cs.find(off);if(!c){const sp=document.createElement('div');sp.id='__spacer';sp.style.height='2000px';document.querySelector('#boardView').prepend(sp);scrollTo(0,0);c=cs.find(off)}window.__farScroll=scrollY;return c?Number(c.dataset.i):-1})()`);
  assert(far >= 0, "화면 밖 카드를 만들 수 있다");
  await post("/focus", { index: far, interactive: true }); await ready(); await pause(300);
  await exit(); await pause(300);
  await check(`!!document.querySelector('.card[data-i="${far}"].returned') && !document.querySelector('.morph') && Math.abs(scrollY-__farScroll)<2`, "화면 밖 카드는 페이드와 링, 보드 스크롤 그대로");
  await evaluate(`document.querySelector('#__spacer')?.remove();scrollTo(0,__boardScroll)`);
  // 카드 윗부분이 붙은 묶음 머리 밑에 든 채 돌아오면 줄어드는 틀도 머리 밑으로 들어간다 — 머리 바탕이 흐려지는 띠에서만 비친다
  const tuckRun = async () => {
    await evaluate(`window.__tuck=[];window.__ring=false;window.__tuckRec=true;requestAnimationFrame(function f(){if(!__tuckRec)return;__ring||=!!document.querySelector('.card[data-i="0"].returned');const m=document.querySelector('.morph'),g=document.querySelector('.card[data-i="0"]').closest('.group').querySelector('.ghead'),h=g.getBoundingClientRect();
      if(m){const r=m.getBoundingClientRect(),k=/transparent (-?[\\d.]+)px, rgb\\(0, 0, 0\\) (-?[\\d.]+)px/.exec(m.style.maskImage);__tuck.push({hide:r.y+(k?Number(k[1]):0),clear:r.y+(k?Number(k[2]):0),masked:!!m.style.maskImage,fade:h.top+h.height*parseFloat(getComputedStyle(g).getPropertyValue('--fade'))/100,head:h.bottom,
        stuck:h.top<=parseFloat(getComputedStyle(document.body).getPropertyValue('--bar-h'))+.5,r:[r.x,r.y,r.width,r.height]})}requestAnimationFrame(f)})`);
    await exit(); await pause(1000);
    await evaluate(`__tuckRec=false`);
    return evaluate(`({f:__tuck,card:(r=>[r.x,r.y,r.width,r.height])(document.querySelector('.card[data-i="0"] .cstage').getBoundingClientRect()),ring:__ring})`);
  };
  const enter0 = async () => { await post("/focus", { index: 0, interactive: true }); await ready(); await pause(600); };
  const barH = await evaluate(`parseFloat(getComputedStyle(document.body).getPropertyValue('--bar-h'))`);
  await evaluate(`scrollBy(0,document.querySelector('.card[data-i="0"] .cstage').getBoundingClientRect().top-${barH}+120)`); await pause(200);
  await enter0();
  const tuck = await tuckRun();
  assert(tuck.f.length > 5 && tuck.f.every(f => f.stuck) && !tuck.f[0].masked && tuck.f.some(f => f.masked) && tuck.f.every(f => f.hide >= f.fade - .5 && f.clear >= f.head - .5) && near(tuck.f.at(-1).r, tuck.card),
    `머리 밑 카드로 돌아오는 틀이 머리 밑으로 들어감 ${JSON.stringify(tuck.f.map(f => [Math.round(f.hide), Math.round(f.clear), Math.round(f.fade), Math.round(f.head)]))}`);
  console.log(`통과 ${++checked}: 머리 밑 카드로 돌아오는 틀은 묶음 머리 밑으로 들어감(${tuck.f.length}프레임)`);
  // 머리가 붙지 않았으면 틀을 가리지 않는다
  await evaluate(`scrollTo(0,0)`); await pause(200);
  assert(!(await evaluate(`document.querySelector('.card[data-i="0"]').closest('.group').querySelector('.ghead').getBoundingClientRect().top<=${barH}+.5`)), "맨 위에서는 묶음 머리가 붙지 않는다");
  await enter0();
  const free = await tuckRun();
  assert(free.f.length > 5 && free.f.every(f => !f.masked) && !free.ring, `머리가 붙지 않은 복귀는 가리지 않음 ${free.f.length}`);
  console.log(`통과 ${++checked}: 묶음 머리가 붙지 않은 복귀는 틀을 가리지 않음`);
  // 붙은 머리 밑에만 걸친 카드는 화면 밖과 같다 — 틀이 머리 밑으로 다 사라지지 않게 페이드와 링
  // 여백은 묶음 안에 둔다 — 이름표가 그림 위라(D-151) 한 장짜리 묶음은 그림 아래끝에서 끝나 머리도 함께 밀려 올라간다
  await evaluate(`(()=>{const sp=document.createElement('div');sp.id='__spacer';sp.style.height='2000px';document.querySelector('.card[data-i="0"]').closest('.group').querySelector('.gbody').append(sp);
    const s=document.querySelector('.card[data-i="0"] .cstage');scrollBy(0,s.getBoundingClientRect().bottom-${barH}-20)})()`); await pause(200);
  await check(`(()=>{const r=document.querySelector('.card[data-i="0"] .cstage').getBoundingClientRect(),h=document.querySelector('.card[data-i="0"]').closest('.group').querySelector('.ghead').getBoundingClientRect();return r.bottom>${barH}&&r.bottom<h.bottom})()`, "카드가 붙은 머리 밑에만 걸침");
  await evaluate(`window.__under=scrollY`);
  await enter0();
  const under = await tuckRun();
  assert(under.f.length === 0 && under.ring && Math.abs(await evaluate(`scrollY-__under`)) < 2, `머리 밑에만 걸친 카드는 페이드와 링 ${JSON.stringify(under)}`);
  console.log(`통과 ${++checked}: 붙은 머리 밑에만 걸친 카드로는 페이드와 링`);
  await evaluate(`document.querySelector('#__spacer')?.remove()`);
  await evaluate(`scrollTo(0,__boardScroll)`);
  hold = true;
  await click(".card .go"); await pending();
  await until(`!document.querySelector('#workspaceLoading').hidden`);
  await exit(); await resume(); await pause(300);
  await check(`document.querySelector('#focusView').hidden && !document.querySelector('#shot').hasAttribute('src') && document.querySelector('#workspaceLoading').hidden`, "준비 중 나가도 늦은 첫 프레임이 작업 공간을 되살리지 않음");
  hold = true;
  await click(".card .go"); await pending();
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  await until(`document.hidden`); await resume(); await pause(200);
  await check(`!document.querySelector('#shot').getAttribute('src')?.startsWith('/stream')`, "준비 중 숨겨진 탭은 늦은 프레임으로 스트림을 열지 않음");
  await send("Page.bringToFront"); await ready(); await send("Target.closeTarget", { targetId });
  await check(`!document.querySelector('#rlW').disabled && document.querySelector('#workspaceLoading').hidden`, "탭 복귀 시 준비를 마치고 조작 재개");
  await exit(); hold = true;
  await click(".card .go"); await pending();
  hold = false;
  await Promise.all(held.splice(0).map(requestId => send("Fetch.failRequest", { requestId, errorReason: "Failed" })));
  await until(`document.querySelector('#workspaceLoading').classList.contains('failed')`);
  // 기본 언어는 영어이고 ?lang= 으로 바뀐다(D-110) — 문장을 박지 않고 페이지의 phrase 로 읽는다.
  const failed = await evaluate(`import('/js/strings.js').then(m=>m.phrase('workspace.loading.failed'))`);
  assert(failed && failed !== "workspace.loading.failed", `${await evaluate("document.documentElement.lang")} 사전에 workspace.loading.failed 가 없다`);
  await check(`document.querySelector('#workspaceLoadingText').textContent.includes(${JSON.stringify(failed)}) && !document.querySelector('#back').disabled`, "첫 프레임 실패를 표시하고 복귀 가능");
  await exit();
  // 헤더가 아직 들어오지 않은 동안(모프 70% 전)에도 esc · 브라우저 뒤로 가기는 바로 나간다.
  // 창이 385ms 라 CDP 왕복으로 겨누지 않고 페이지 안에서 기다렸다 바로 누르며, 누른 순간 헤더가 숨어 있었는지 적는다.
  for (const [name, leave] of [["esc", `dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))`], ["브라우저 뒤로 가기", `history.back()`]]) {
    const before = await evaluate(`__exits`);
    const hidden = await evaluate(`new Promise(done=>{document.querySelector('.card .go').click();const t0=performance.now();
      requestAnimationFrame(function f(){const b=document.querySelector('#back');
        if(!document.querySelector('#focusView').hidden&&b.classList.contains('deco-off')&&history.state?.prevueWs){${leave};done(b.classList.contains('deco-off'))}
        else if(performance.now()-t0>3000)done(false);else requestAnimationFrame(f)})})`);
    assert(hidden, `헤더가 숨은 동안 ${name}를 눌렀다`);
    await until(`!document.querySelector('#boardView').hidden && __exits>${before} && __store.st.screen==='board'`);
    checked++; console.log(`통과 ${checked}: 헤더가 들어오기 전에도 ${name}로 나감`);
    await until(`!document.documentElement.classList.contains('vt-workspace') && !document.querySelector('.morph')`); await pause(300);
  }
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await evaluate(`window.__arrivalCount=__arrivals.length;document.startViewTransition=undefined;__frames=[];__record=true;requestAnimationFrame(function sample(){if(!__record)return;if(!document.querySelector('#focusView').hidden){const r=document.querySelector('#stage').getBoundingClientRect();__frames.push([r.x,r.y,r.width,r.height]);if(document.querySelector('#back').classList.contains('deco-off'))window.__lateHead=true}requestAnimationFrame(sample)})`);
  hold = true;
  await click(".card .go"); await pending(); await pause(200); await resume(); await ready(); await pause(200);
  await evaluate(`__record=false`);
  await check(`__arrivals.length===__arrivalCount && __frames.length>5 && __frames.every(r=>r.every((v,i)=>Math.abs(v-__frames[0][i])<.5)) && !document.documentElement.classList.contains('vt-workspace') && !document.querySelector('.morph') && !window.__lateHead`, "움직임 줄이기·View Transitions 미지원에서는 모프 없이 배치 고정, 헤더도 늦추지 않음");
  await exit();
  await post("/focus", { index: 0, interactive: true, size: "narrow" });
  await send("Page.reload");
  await until(`!!document.querySelector('#shot')`);
  await evaluate(`import('/js/store.js').then(m=>window.__store=m.store)`);
  await ready();
  await post("/viewer/resize", { size: "original" });
  await until(`__store.st.focus && !__store.st.focus.size`); await ready();
  await check(`(()=>{const shot=document.querySelector('#shot'),r=shot.getBoundingClientRect();return !__store.st.focus.size && Math.abs(r.width/r.height-shot.naturalWidth/shot.naturalHeight)<.002})()`, "크기를 바꾼 상태로 새로 열어도 원래 프리뷰의 비율 복원");
  await exit();
  // D-155 — FQN 딥링크도 그 파일 보드 위의 한 장이다. 늘 조작이고 뒤로 버튼이 있으며, esc 가 그 파일 보드의 그 카드 자리로 돌아간다.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  const boardFile = await evaluate(`__store.st.board.file`);
  await post("/show", { target: "com.example.pearl.feature.pearl.FilterScreenKt.DrinkFilterPreview", index: null, params: {}, by: "test" });
  await until(`__store.st.screen==='focus' && __store.st.focus.interactive && __store.st.board.file.endsWith('/FilterScreen.kt')`);
  await ready();
  const linked = await evaluate(`__store.st.board.focus`);
  await check(`!document.querySelector('#back').hidden && !document.querySelector('#seg') && __store.st.board.groups.flatMap(g=>g.cards).find(c=>c.index===${linked}).previewId===__store.st.focus.previewId`, "FQN 딥링크 — 그 파일 보드 위 그 카드의 조작 한 장, 뒤로 버튼");
  const beforeEsc = await evaluate(`__exits`);
  await key("Escape");
  await until(`!document.querySelector('#boardView').hidden && __exits>${beforeEsc} && __store.st.screen==='board' && __store.st.board.file.endsWith('/FilterScreen.kt')`);
  await until(`!document.documentElement.classList.contains('vt-workspace') && !document.querySelector('.morph')`);
  await check(`__store.st.board.focus===${linked} && !!document.querySelector('.card[data-i="${linked}"]')`, "FQN 딥링크에서 esc — 그 파일 보드의 그 카드 자리로");
  // I 는 보드에서 카드를 열고 한 장에서 닫는다 — 보기 · 조작을 바꾸는 뜻은 없다(D-155 ②).
  await post("/show", { target: "com.example.pearl.feature.pearl.FilterScreenKt.DrinkFilterPreview", index: null, params: {}, by: "test" });
  await until(`__store.st.screen==='focus' && __store.st.focus.interactive`);
  await ready();
  const beforeI = await evaluate(`__exits`);
  await key("i");
  await until(`!document.querySelector('#boardView').hidden && __exits>${beforeI} && __store.st.screen==='board'`);
  await until(`!document.documentElement.classList.contains('vt-workspace') && !document.querySelector('.morph')`);
  await check(`__store.st.board.focus===${linked}`, "한 장에서 I — 보드의 그 카드 자리로");
  for (const name of ["뒤로 버튼", "브라우저 뒤로", "빠른 열기"]) {
    await post("/show", { target: "com.example.pearl.feature.pearl.FilterScreenKt.DrinkFilterPreview", index: null, params: {}, by: "test" });
    await until(`__store.st.screen==='focus' && __store.st.focus.interactive`);
    await ready();
    await until(`history.state?.prevueWs`);
    const before = await evaluate(`__exits`);
    if (name === "뒤로 버튼") await click("#back");
    else if (name === "브라우저 뒤로") await evaluate(`history.back()`);
    else {
      await key("/");
      await until(`document.querySelector('#q')?.checkVisibility()`);
      await evaluate(`(()=>{const q=document.querySelector('#q');q.value='DrinkFilterPreview';q.dispatchEvent(new Event('input',{bubbles:true}))})()`);
      await until(`!!document.querySelector('#qoIn .qo-row')`);
      await key("Enter");
    }
    await until(`__store.st.screen==='board' && __exits>${before} && !document.querySelector('#boardView').hidden`);
    await until(`!document.documentElement.classList.contains('vt-workspace') && !document.querySelector('.morph')`);
    await check(`__store.st.board.file.endsWith('/FilterScreen.kt') && __store.st.board.focus===${linked} && !!document.querySelector('.card[data-i="${linked}"]') && !document.querySelector('#q')?.checkVisibility()`, `FQN 딥링크에서 ${name} — 같은 파일 보드의 그 카드로`);
  }
  await post("/show", { target: boardFile, index: null, params: {}, by: "test" });
  await until(`__store.st.screen==='board'`);
  await check(`__errors.length===0`, "브라우저 오류 0");
  console.log(`총 ${checked}개 통과`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(r => chrome.exitCode !== null ? r() : chrome.once("exit", r));
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
}
