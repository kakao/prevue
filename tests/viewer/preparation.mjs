import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toBoard } from './daemon.mjs';

const viewer = process.argv[2];
let bootstrap = process.argv[3];
assert(viewer, 'node tests/viewer/preparation.mjs <전용 픽스처 뷰어 URL> [준비 화면 URL]');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = await mkdtemp(join(tmpdir(), 'prevue-preparation-chrome-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: 'ignore' });
let ws, checked = 0;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(100); }
  }
  assert(port, 'Chrome 실행');
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id, timer = setTimeout(() => { pending.delete(n); reject(Error(`${method} 시간 초과`)); }, 15000);
    pending.set(n, message => { clearTimeout(timer); message.error ? reject(Error(message.error.message)) : resolve(message.result); });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const until = async (expression, ms = 12000) => {
    for (const end = Date.now() + ms; Date.now() < end; await pause(40)) if (await evaluate(expression)) return;
    throw Error(`시간 초과: ${expression}\n${JSON.stringify(await evaluate('({url:location.href,errors:window.__errors,scene:document.querySelector("#preparation")?.outerHTML.slice(0,500)})'))}`);
  };
  const check = async (expression, label) => { assert(await evaluate(expression), label); console.log(`통과 ${++checked}: ${label}`); };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__errors=[];window.__events=[];
    addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
    // /viewer/state 에는 boot 가 없다 — __inject 가 넣는 상태에 실제 SSE 의 boot 를 실어야 뷰어가 데몬이 바뀌었다고 새로 고치지 않는다
    const RealSource=EventSource;window.EventSource=class extends RealSource{constructor(...a){super(...a);__events.push(this);this.addEventListener('message',e=>{try{const b=JSON.parse(e.data).state?.boot;if(b)window.__boot=b}catch{}})}};
    window.__inject=s=>{if(!window.__boot)throw Error('실제 SSE 상태가 아직 오지 않아 boot 를 모른다');__events.at(-1).dispatchEvent(new MessageEvent('message',{data:JSON.stringify({type:'state',state:{...s,boot:__boot}})}))};
  ` });
  let state = await toBoard(viewer);
  if (!state.board) {
    await send('Page.navigate', { url: bootstrap || viewer });
    await until(`!document.querySelector('#preparation') && document.querySelector('#startView')?.hidden===false && document.querySelector('#startView .qo-row')`);
    await check(`!document.querySelector('#q').disabled && !document.querySelector('body>main').inert`, '파일 미지정 준비는 실제 파일 검색으로 연결');
    await evaluate(`document.querySelector('#q').value='PearlPreviews';document.querySelector('#q').dispatchEvent(new Event('input',{bubbles:true}))`);
    await until(`document.querySelector('#startView .qo-row')?.textContent.includes('PearlPreviews')`);
    await evaluate(`document.querySelector('#startView .qo-row').click()`);
    await until(`import('/js/store.js').then(m=>m.store.st?.screen==='board' && !m.store.st.busy)`);
    await check(`!document.querySelector('#boardView').hidden && document.querySelector('.card img').naturalWidth>0`, '실제 파일 검색에서 선택한 프리뷰가 보드로 열림');
    state = await fetch(new URL('/viewer/state', viewer)).then(response => response.json());
    bootstrap = null;
  }
  const file = state.board.file;
  const navigate = async (age = 5000) => {
    const url = new URL(viewer);
    Object.entries({ prepare: '1', id: 'browser-check', started: Date.now() - age, file }).forEach(([key, value]) => url.searchParams.set(key, value));
    await send('Page.navigate', { url: url.href });
  };
  const drawn = () => until(`document.querySelector('#preparation')?.dataset.screen==='drawn' && document.querySelector('#preparation .preview').naturalWidth>0`);
  const done = () => until(`!document.querySelector('#preparation')`);
  // 떠오르기는 1초도 안 걸려 나타나기를 기다리는 일과 읽는 일을 페이지 안 한 번에 한다
  const riseShift = () => evaluate(`new Promise(done=>{const end=performance.now()+9000;(function look(){const k=[...document.querySelectorAll('.card')].flatMap(card=>card.getAnimations()).map(a=>[a.effect.getKeyframes()[0].transform,a.effect.getTiming().duration]);if(k.length||performance.now()>end)done(k);else setTimeout(look,5)})()})`);
  const key = async value => {
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: value, code: value === ' ' ? 'Space' : value });
  };
  if (bootstrap) {
    await send('Page.navigate', { url: bootstrap }); await drawn();
    await check(`location.origin===${JSON.stringify(new URL(viewer).origin)}`, '준비 서버가 같은 요청의 실제 뷰어로 연결');
    await key('Enter'); await done();
  }

  // 실제 PNG 응답을 막아 디코드 전에는 완료 화면이 나올 수 없게 한다.
  let hold = true, held = [];
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method !== 'Fetch.requestPaused') return;
    if (hold) held.push(message.params.requestId);
    else send('Fetch.continueRequest', { requestId: message.params.requestId }).catch(() => {});
  });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/*.png?*', requestStage: 'Response' }] });
  await navigate();
  await until(`document.querySelector('#preparation')?.dataset.phase==='render'`);
  await pause(250);
  await check(`document.querySelector('#preparation').dataset.screen==='loading'`, '이미지 디코드 전에는 첫 렌더 단계 유지');
  hold = false;
  await Promise.all(held.splice(0).map(requestId => send('Fetch.continueRequest', { requestId })));
  await drawn();
  await check(`!document.body.classList.contains('preparing') && !document.querySelector('body>main').inert`, '렌더가 준비되면 보드 조작은 연출 대기 없이 활성화');
  await check(`(()=>{const i=document.querySelector('#preparation .preview');return i.src===document.querySelector('.card[data-i="'+i.dataset.index+'"] .cstage img').src})()`, '완료 이미지와 도착 카드가 같은 실제 PNG');
  await check(`(()=>{const cards=[...document.querySelectorAll('.card .cstage')].map(stage=>({stage,r:stage.getBoundingClientRect()}));const x=(Math.min(...cards.map(c=>c.r.left))+Math.max(...cards.map(c=>c.r.right)))/2,y=(Math.min(...cards.map(c=>c.r.top))+Math.max(...cards.map(c=>c.r.bottom)))/2;cards.sort((a,b)=>Math.hypot(a.r.x+a.r.width/2-x,a.r.y+a.r.height/2-y)-Math.hypot(b.r.x+b.r.width/2-x,b.r.y+b.r.height/2-y));return cards[0].stage.closest('.card').dataset.i===document.querySelector('#preparation .preview').dataset.index})()`, '화면 아래까지 포함한 보드 전체의 중앙 카드 선택');
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 680, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await until(`document.querySelector('#preparation')?.dataset.theme==='dark'`);
  await check(`(()=>{const h=document.querySelector('#preparation');return !('palette' in h.dataset) && h.querySelector('.prep-bar').textContent.trim()==='Prevue' && [...h.querySelectorAll('.prep-progress i')].every(i=>i.style.getPropertyValue('--fill')==='1')})()`, '무채색 그림 하나 · 워드마크 줄 · 완료하면 네 칸이 다 참');
  await until(`document.querySelector('#preparation')?.dataset.boardArrival==='presenting'`);
  await check(`getComputedStyle(document.querySelector('#preparation .preview')).opacity==='1' && getComputedStyle(document.querySelector('#preparation .blueprint')).opacity==='0'`, '표시 단계는 모형 대신 선명한 실제 PNG');
  await until(`Math.abs(document.querySelector('#preparation .loading-copy').getBoundingClientRect().top-document.querySelector('#preparation .preview').getBoundingClientRect().bottom-48)<2`);
  console.log(`통과 ${++checked}: 실제 이미지와 두 줄 안내 간격 48px`);
  await send('Page.captureScreenshot', { format: 'png' }).then(result => writeFile(join(tmpdir(), 'prevue-preparation-drawn.png'), Buffer.from(result.data, 'base64')));
  const fadeMs = await evaluate(`parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--duration-extra-long2'))`);
  const rise = await riseShift();
  assert(rise.length > 0 && rise.every(([t, d]) => t === 'translateY(8px)' && d === fadeMs), JSON.stringify(rise));
  console.log(`통과 ${++checked}: 일반 준비는 자동으로 걷히며 화면 안 카드가 떠오름`);
  await done();
  console.log(`통과 ${++checked}: 떠오른 뒤 준비 화면을 걷음`);

  for (const [age, tempo] of [[0, 'fast'], [5000, 'normal']]) {
    await navigate(age); await drawn();
    await check(`document.querySelector('#preparation').dataset.tempo===${JSON.stringify(tempo)}`, `${tempo} 준비 리듬 선택`);
    await key(tempo === 'fast' ? ' ' : 'Enter'); await done();
    await check(`!document.querySelector('body>main').inert`, `${tempo} 준비에서 키보드 즉시 진입`);
  }

  await navigate(); await drawn();
  await evaluate(`document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`); await done();
  console.log(`통과 ${++checked}: 클릭 즉시 보드 진입`);
  await evaluate(`import('/js/preparation-scene.js').then(m=>{window.scene=m.createScene({file:'Geometry.kt',started:Date.now(),phase:'project'})})`);
  for (const [width, height, form, limit] of [[320, 640, 'screen', 500], [640, 320, 'landscape', 500], [150, 48, 'button', 225], [400, 56, 'strip', 420]]) {
    await evaluate(`scene.setPhase('environment');scene.fit(${width},${height})`);
    await check(`(()=>{const h=scene.host;return h.dataset.form===${JSON.stringify(form)} && parseFloat(h.style.getPropertyValue('--model-w'))<=${limit} && Math.abs(parseFloat(h.style.getPropertyValue('--model-w'))/parseFloat(h.style.getPropertyValue('--model-h'))-${width / height})<.01})()`, `좁은 데스크톱의 ${form} 비율과 크기 상한`);
  }
  await evaluate(`window.title=scene.host.querySelector('#headline');window.detail=scene.host.querySelector('#detail');detail.getAnimations().forEach(a=>a.finish());scene.setPhase('render')`);
  await check(`title.getAnimations().length>0 && detail.getAnimations().length===0`, '단계 변경은 바뀐 제목만 전환');
  await check(`(()=>{const f=()=>[...scene.host.querySelectorAll('.prep-progress i')].map(i=>Number(i.style.getPropertyValue('--fill')));const r=f();scene.setPhase('drawn');const d=f();scene.setPhase('render');return r[0]===1&&r[1]===1&&r[2]<.9&&r[3]===0&&d.every(v=>v===1)&&/^\\d+(초|s)$/.test(scene.host.querySelector('#clock').textContent)})()`, '네 칸 막대 — 지난 칸은 차고 지금 칸은 끝에 닿지 않음');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-color-scheme', value: 'light' }] });
  await until(`scene.host.dataset.reduced==='true'`);
  await check(`scene.host.dataset.reduced==='true' && getComputedStyle(scene.host.querySelector('.layer-front')).transform==='none' && !scene.host.querySelector('#headline').getAnimations().length`, '모션 줄이기는 부유·이동·제목 모션 생략');
  await evaluate(`scene.fail('프로젝트 빌드 실패')`);
  await check(`scene.host.dataset.screen==='failure' && scene.host.querySelector('#detail').textContent.includes('빌드 실패') && !scene.host.querySelector('.failure-help').hidden && !scene.host.querySelector('button') && scene.host.querySelector('.prep-progress i.bad')===scene.host.querySelectorAll('.prep-progress i')[2] && scene.host.querySelector('.now').hidden`, '실패 원인과 요청 문구만 표시하고 재시도 버튼 없음 · 멈춘 칸이 빨강');
  await evaluate(`scene.destroy()`);
  await navigate(); await drawn();
  await check(`document.querySelector('#preparation').dataset.reduced==='true'`, '실제 렌더 전환도 모션 줄이기 적용');
  const fade = await riseShift();
  assert(fade.length > 0 && fade.every(([t, d]) => t === 'translateY(0px)' && d === fadeMs), JSON.stringify(fade));
  console.log(`통과 ${++checked}: 모션 줄이기에서는 이동 없이 페이드만`);
  await done();

  // 실제 상태를 SSE 입구에 넣어 마지막 정상 이미지와 대기 안내를 함께 확인한다.
  await evaluate(`(async()=>{window.real=await fetch('/viewer/state').then(r=>r.json());window.beforeImage=document.querySelector('.card .cstage img').src;__inject({...real,version:real.version+1000,busy:true,buildPending:true,stale:[]})})()`);
  await check(`!document.querySelector('#buildNotice').hidden && document.querySelector('.card .cstage img').src===beforeImage && getComputedStyle(document.querySelector('.card .cstage img')).opacity==='1' && getComputedStyle(document.querySelector('.card .cstage img')).filter==='none'`, '외부 빌드 대기는 정상 PNG를 선명하게 유지하고 작은 안내 표시');
  await evaluate(`__inject({...real,version:real.version+1001})`);
  await check(`document.querySelector('#buildNotice').hidden`, '복구 상태를 받으면 대기 안내 해제');
  await send('Emulation.setEmulatedMedia', { features: [] });
  hold = true;
  await navigate();
  await until(`document.querySelector('#preparation')?.dataset.phase==='render'`);
  await evaluate(`(async()=>{window.actual=await fetch('/viewer/state').then(r=>r.json());__events.at(-1).dispatchEvent(new Event('error'))})()`);
  await until(`document.querySelector('#preparation')?.dataset.screen==='failure'`);
  hold = false;
  await Promise.all(held.splice(0).map(requestId => send('Fetch.continueRequest', { requestId })));
  await evaluate(`__inject({...actual,version:actual.version+1000})`);
  await pause(200);
  await check(`document.querySelector('#preparation')?.dataset.screen==='failure'`, '중단 뒤 도착한 PNG·옛 성공 상태가 실패 화면을 덮지 않음');
  await evaluate(`__inject({...actual,version:actual.version+1001,board:{...actual.board,gen:actual.board.gen+1}})`);
  await done();
  await check(`!document.querySelector('body>main').inert`, '실패 뒤 새 렌더 세대의 재요청은 정상 보드로 연결');
  hold = true;
  await navigate();
  await until(`document.querySelector('#preparation')?.dataset.phase==='render'`);
  await evaluate(`(async()=>{window.actual=await fetch('/viewer/state').then(r=>r.json());__inject({...actual,version:actual.version+1000,board:{...actual.board,file:actual.board.file+'.other'}})})()`);
  await done();
  hold = false;
  await Promise.all(held.splice(0).map(requestId => send('Fetch.continueRequest', { requestId })));
  await pause(200);
  await check(`!document.querySelector('#preparation')`, '파일 변경 뒤 옛 디코드 결과가 준비 화면을 되살리지 않음');
  await check(`__errors.length===0`, '브라우저 오류 없음');
  console.log(`완료: ${checked}개 검사. 스크린숏 ${join(tmpdir(), 'prevue-preparation-drawn.png')}`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(resolve => chrome.once('exit', resolve));
  await rm(profile, { recursive: true, force: true });
}
