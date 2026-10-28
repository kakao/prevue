import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 떠 있는 층(D-101) — 가리킨 결과는 박스 꼬리표가, 후보 고르기는 꼬리표에서 내려오는 팝오버가, 캡슐은 오류 · 알림만.
// 가짜 데몬이라 데몬 없이 돈다: node tests/viewer/layers.mjs
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REPO = '/repo';
const state = JSON.parse(JSON.stringify(JSON.parse(await readFile(join(root, 'plugin/contract/viewer.state.board.json'), 'utf8')).example).replaceAll('<repo>', REPO));
state.selection = null;
for (const g of state.board.groups) for (const c of g.cards) Object.assign(c, { widthDp: 360, heightDp: 780, imageUrl: `/shot.jpg?c=${c.index}`, treeUrl: `/tree.json?c=${c.index}` });
const FILE = state.board.file;
const CARD = `${REPO}/core/ui/src/main/kotlin/demo/ui/DrinkCard.kt`;
const tree = { composeViewInfo: [{ name: 'PearlScreen', fileName: 'Cards.kt', lineNumber: 5, bounds: [0, 0, 480, 1040], children: [
  { name: 'Title', fileName: 'Cards.kt', lineNumber: 20, bounds: [24, 8, 300, 40], children: [] },
  { name: 'Text', fileName: 'Cards.kt', lineNumber: 12, bounds: [24, 120, 456, 180], children: [] },
  { name: 'Label', fileName: 'Cards.kt', lineNumber: 14, bounds: [24, 200, 456, 230], children: [] },
  { name: 'DrinkCard', fileName: 'DrinkCard.kt', lineNumber: 31, bounds: [24, 260, 240, 400], children: [] },
] }] };

const streams = new Set();
const push = patch => {
  Object.assign(state, patch, { version: state.version + 1 });
  for (const r of streams) r.write(`data: ${JSON.stringify({ type: 'state', state })}\n\n`);
};
const calls = { point: 0, cancel: 0, choose: 0 };
const delays = new Map();          // 줄 → 응답을 늦출 ms
let failPoint = false;
const body = request => new Promise(ok => { let s = ''; request.on('data', d => s += d); request.on('end', () => ok(s ? JSON.parse(s) : {})); });
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const json = v => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(v)); };
  if (path === '/events') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    response.write(`data: ${JSON.stringify({ type: 'state', state })}\n\n`);
    streams.add(response); request.on('close', () => streams.delete(response));
  } else if (path === '/preview-files.json') json({ ready: true, files: [] });
  else if (path === '/project-files.json') json({ files: {} });
  else if (path === '/tree.json') json(tree);
  else if (path === '/shot.jpg') { response.setHeader('Content-Type', 'image/jpeg'); response.end(await readFile(join(root, 'prototypes/design-system/img/pearl/PearlListPreview.jpg'))); }
  else if (path === '/viewer/point') {
    const b = await body(request); calls.point++;
    await new Promise(ok => setTimeout(ok, delays.get(b.line) || 0));
    if (failPoint) { response.writeHead(500).end('boom'); return; }
    if (b.fileName === 'DrinkCard.kt') {
      push({ choice: { fileName: b.fileName, line: b.line, repoRoot: REPO, candidates: [CARD, `${REPO}/feature/pearl/src/main/kotlin/demo/pearl/DrinkCard.kt`] } });
      json({ needChoice: true });
    } else json({ ref: `@${FILE}#L${b.line}`, file: FILE });
  } else if (path === '/viewer/choose') { calls.choose++; push({ choice: null }); json({ ref: `@${CARD}#L31`, file: CARD }); }
  else if (path === '/viewer/cancel') { calls.cancel++; push({ choice: null }); json({ ok: true }); }
  else if (path.startsWith('/viewer/')) json({ ok: true });
  else {
    const file = resolve(root, 'plugin/viewer', '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(join(root, 'plugin/viewer') + '/')) { response.writeHead(404).end(); return; }
    try {
      const data = await readFile(file);
      response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream');
      response.end(data);
    } catch { response.writeHead(404).end(); }
  }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'prevue-layers-check-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: 'ignore' });
const pause = ms => new Promise(ok => setTimeout(ok, ms));
let ws, checked = 0;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(100); }
  }
  assert(port, 'Chrome 실행');
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(ok => ws.addEventListener('open', ok, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const n = ++id, timer = setTimeout(() => { waiting.delete(n); fail(Error(`${method} 응답 시간 초과`)); }, 8000);
    waiting.set(n, m => { clearTimeout(timer); m.error ? fail(Error(m.error.message)) : ok(m.result); });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async (expression, ms = 5000) => {
    for (const end = Date.now() + ms; Date.now() < end; await pause(50)) if (await evaluate(expression)) return;
    console.error(await evaluate(`({errors:__errors,tag:[...document.querySelectorAll('.box.pick:not([hidden]) .tag')].map(t=>t.textContent),cap:document.querySelector('#strip').textContent,chooser:document.querySelector('#chooser').className})`));
    throw Error(`시간 초과: ${expression}`);
  };
  const check = async (expression, name) => { assert(await evaluate(expression), name); console.log(`통과 ${++checked}: ${name}`); };
  const mouse = async at => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1 }); };
  const click = async selector => mouse(await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`));
  // 카드 c 의 그림에서 노드 줄 line 의 가운데를 누른다
  const pointAt = async (c, line) => mouse(await evaluate(`(()=>{const img=document.querySelectorAll('#cards .card img')[${c}],r=img.getBoundingClientRect(),k=r.width/img.naturalWidth,n=${JSON.stringify(tree.composeViewInfo[0].children)}.find(n=>n.lineNumber===${line}).bounds;return {x:r.x+(n[0]+n[2])/2*k,y:r.y+(n[1]+n[3])/2*k}})()`));
  const key = async k => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k }); };
  const tag = c => `document.querySelectorAll('#cards .card .box.pick')[${c}]`;
  const tagText = c => `(${tag(c)}.hidden?'':${tag(c)}.querySelector('.tag').textContent)`;
  const capsuleQuiet = `!document.querySelector('#strip').classList.contains('on') && document.querySelector('#strip').textContent.trim()===''`;

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  // 클립보드 막힘은 writeText 를 거절하게 바꿔 재현한다 — __block 만큼 거절하고, 넣은 것은 __copied 에 남긴다.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errors=[];addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));
    window.__block=0;window.__copied=[];const real=navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText=t=>{if(__block>0){__block--;return Promise.reject(new DOMException('blocked','NotAllowedError'))}return real(t).then(()=>{__copied.push(t)})};
    window.__picks=0;document.addEventListener('click',e=>{if(e.target.matches('#cards img'))__picks++},true);` });
  await send('Page.navigate', { url: origin + '/' });
  await until(`document.querySelectorAll('#cards .card img').length===2 && [...document.querySelectorAll('#cards .card img')].every(i=>i.complete&&i.naturalWidth&&!i.hidden)`);
  await evaluate(`document.fonts.ready`);
  await pause(300);
  // 트리는 마우스가 카드에 들어올 때 받는다
  for (const c of [0, 1]) {
    const at = await evaluate(`(()=>{const r=document.querySelectorAll('#cards .card .cstage')[${c}].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at });
  }
  await pause(300);

  // 1. 복사됨은 꼬리표에 뜨고 캡슐에는 뜨지 않는다
  await pointAt(0, 12);
  await until(`${tagText(0)}.includes('copied')`);
  await check(`${tagText(0)}==='Cards.kt:12· ✓ copied' && __copied.at(-1)==='@${FILE}#L12'`, '꼬리표가 파일:라인 · 복사됨을 말하고 멘션이 클립보드에 간다');
  await check(capsuleQuiet, '가리킨 결과는 캡슐에 뜨지 않는다');
  await check(`${tag(0)}.querySelector('.tag').title.startsWith('@${FILE}#L12') && ${tag(0)}.querySelector('.tag').title.includes('PearlScreen › Text')`, '꼬리표 툴팁에 멘션 전체와 조상 사슬');
  await check(`(()=>{const t=${tag(0)}.querySelector('.tag').getBoundingClientRect(),b=${tag(0)}.getBoundingClientRect();return t.bottom<=b.top && t.bottom>=b.top-6})()`, '꼬리표는 박스 바로 위에 붙는다');

  // 2. 위가 좁으면 꼬리표가 아래로, 카드 틀 밖으로 나가지 않는다
  await pointAt(0, 20);
  await until(`${tagText(0)}.includes('Cards.kt:20')`);
  await check(`${tag(0)}.classList.contains('below') && (()=>{const t=${tag(0)}.querySelector('.tag').getBoundingClientRect(),s=${tag(0)}.parentElement.getBoundingClientRect();return t.top>=s.top && t.right<=s.right+1})()`, '카드 위 끝의 박스는 꼬리표를 아래에 달고 틀 안에 둔다');

  // 틀을 채운 노드(뿌리)는 위 · 아래 모두 좁다 — 꼬리표가 박스 안 위 끝에 서서 잘리지 않는다
  await mouse(await evaluate(`(()=>{const r=document.querySelectorAll('#cards .card img')[0].getBoundingClientRect();return {x:r.x+r.width-6,y:r.y+r.height-6}})()`));
  await until(`${tagText(0)}.includes('Cards.kt:5')`);
  await pause(400);                 // 톡 치는 확대가 끝난 뒤 잰다
  await check(`${tag(0)}.classList.contains('inside') && (()=>{const t=${tag(0)}.querySelector('.tag').getBoundingClientRect(),s=${tag(0)}.parentElement.getBoundingClientRect();return t.top>=s.top && t.bottom<=s.bottom && t.right<=s.right+1})()`, '틀을 채운 노드의 꼬리표는 박스 안 위 끝, 틀 안에 선다');

  // 3. 복사가 막히면 꼬리표 끝 "눌러서 복사" — 실제로 누르면 복사된다. 누름은 아래 그림의 가리키기로 새지 않는다.
  await evaluate(`__block=1`);
  await pointAt(0, 14);
  await until(`!!${tag(0)}.querySelector('.tag-again')`);
  await check(`${tag(0)}.querySelector('.tag').lastElementChild.classList.contains('tag-again') && ${tagText(0)}==='Cards.kt:14click to copy'`, '복사가 막히면 꼬리표 끝에 "눌러서 복사"');
  await check(capsuleQuiet, '막혀도 캡슐은 조용하다');
  const picks = await evaluate(`__picks`);
  const pointsBefore = calls.point;
  await click('#cards .card .box.pick:not([hidden]) .tag-again');
  await until(`${tagText(0)}.includes('copied')`);
  await check(`__copied.at(-1)==='@${FILE}#L14' && __picks===${picks}`, '"눌러서 복사"를 실제로 누르면 복사되고 가리키기로 새지 않는다');
  assert.equal(calls.point, pointsBefore, '꼬리표 누름이 데몬에 가리키기를 보내지 않는다');
  await check(`document.activeElement===document.body || !document.activeElement.closest('.tag')`, '마우스로 누른 꼬리표 단추는 포커스를 쥐지 않는다');

  // 4. 늦은 결과가 앞 꼬리표를 덮지 않는다 — 앞 카드의 꼬리표는 걷힌다
  delays.set(12, 700);
  await pointAt(0, 12);
  await pause(80);
  await pointAt(1, 14);
  await until(`${tagText(1)}.includes('copied')`);
  await pause(900);
  await check(`${tag(0)}.hidden && ${tagText(1)}==='Cards.kt:14· ✓ copied' && __copied.at(-1)==='@${FILE}#L14'`, '늦게 온 앞 결과가 뒤 꼬리표 · 클립보드를 덮지 않고 앞 카드 꼬리표는 걷힌다');
  delays.clear();

  // 5. 후보 고르기 — 꼬리표 바로 아래 팝오버. 빈 곳을 눌러도 Esc 로 취소된다.
  await pointAt(1, 31);
  await until(`document.querySelector('#chooser').classList.contains('on')`);
  await pause(300);
  const geo = `(()=>{const t=${tag(1)}.querySelector('.tag').getBoundingClientRect(),c=document.querySelector('#chooser').getBoundingClientRect(),W=document.documentElement.clientWidth;return {t:{l:t.left,b:t.bottom},c:{l:c.left,t:c.top,r:c.right,w:c.width},W}})()`;
  const g = await evaluate(geo);
  assert(Math.abs(g.c.t - g.t.b - 8) <= 1 && Math.abs(g.c.l - Math.min(g.t.l, g.W - g.c.w - 16)) < 1 && g.c.r <= g.W - 16, `후보 고르기 자리 ${JSON.stringify(g)}`);
  console.log(`통과 ${++checked}: 후보 고르기는 꼬리표 아래 8px 에 붙고 창 안에 든다`);
  await check(`document.querySelector('#chooser').parentElement===document.body && document.querySelectorAll('#chooser .opt').length===2 && document.querySelector('#chooser .opt').textContent==='core/ui/…/DrinkCard.kt'`, '후보는 저장소 기준으로 접어 보인다');
  await check(capsuleQuiet, '후보를 고르는 동안 캡슐은 조용하다');
  await click('#chooser h2');
  await key('Escape');
  await until(`!document.querySelector('#chooser').classList.contains('on')`);
  assert.equal(calls.cancel, 1, 'Esc 가 데몬에 취소를 보낸다'); console.log(`통과 ${++checked}: 팝오버 빈 곳을 누른 뒤에도 Esc 로 취소`);
  const hit = await evaluate(`(()=>{const c=document.querySelector('#chooser').getBoundingClientRect();const e=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);return !document.querySelector('#chooser').contains(e)})()`);
  assert(hit, '흐려지는 팝오버가 누름을 가로채지 않는다'); console.log(`통과 ${++checked}: 흐려지는 팝오버가 누름을 가로채지 않는다`);

  // 6. 후보를 실제로 누르면 복사되고 꼬리표가 말한다
  await pointAt(1, 31);
  await until(`document.querySelector('#chooser').classList.contains('on')`);
  await pause(300);
  await click('#chooser .opt');
  await until(`${tagText(1)}.includes('copied')`);
  await check(`${tagText(1)}.startsWith('DrinkCard.kt:31· ✓ copied') && __copied.at(-1)==='@${CARD}#L31' && !!${tag(1)}.querySelector('.tag-open')`, '후보를 고르면 꼬리표가 복사됨과 "탭으로 열기"를 단다');
  await until(`!document.querySelector('#chooser').classList.contains('on')`);

  // 7. 오류는 캡슐이 말한다
  failPoint = true;
  await pointAt(0, 12);
  await until(`document.querySelector('#strip').classList.contains('on')`);
  await check(`document.querySelector('#strip').textContent.includes('Pointing failed') && ${tagText(0)}.startsWith('Pointing failed') && getComputedStyle(${tag(0)}.querySelector('.tag-ref')).textOverflow==='ellipsis'`, '가리키기 오류는 캡슐이 알리고, 꼬리표도 성공인 척하지 않는다(긴 문장은 말줄임)');
  failPoint = false;

  // 8. 움직임 줄이기 — 꼬리표 박스 · 팝오버가 뜨는 동안 프레임마다 이동 · 확대가 없다
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await pause(500);                  // 닫힌 팝오버가 옛 설정의 축소에서 새 설정으로 옮겨 가는 전환이 끝나기를 기다린다
  await evaluate(`window.__frames=[];(function f(){const id=m=>m==='none'||m==='matrix(1, 0, 0, 1, 0, 0)';const b=document.querySelector('.box.pick:not([hidden])'),c=document.querySelector('#chooser');
    const v=[getComputedStyle(c).transform,b?getComputedStyle(b).transform:'none'];__frames.push(v.every(id)||v.join('|'));if(__frames.length<90)requestAnimationFrame(f)})()`);
  await pointAt(1, 31);
  await until(`document.querySelector('#chooser').classList.contains('on')`);
  await until(`__frames.length>=90`);
  const moved = await evaluate(`__frames.filter(f=>f!==true)`);
  assert.deepEqual(moved, [], '움직임 줄이기에서 꼬리표 박스 · 팝오버는 프레임마다 제자리');
  console.log(`통과 ${++checked}: 움직임 줄이기에서 꼬리표 박스 · 팝오버는 프레임마다 제자리`);
  await key('Escape');
  await until(`!document.querySelector('#chooser').classList.contains('on')`);
  await check(`getComputedStyle(document.documentElement).getPropertyValue('--cap-room')==='76px'`, '캡슐 자리(토큰의 합)가 px 로 풀려 읽힌다');
  await check(`__errors.length===0`, '브라우저 오류 없음');
  console.log(`완료: ${checked}개 검사`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(ok => chrome.exitCode !== null ? ok() : chrome.once('exit', ok));
  await rm(profile, { recursive: true, force: true });
  for (const r of streams) r.end();
  server.closeAllConnections();
  await new Promise(ok => server.close(ok));
}
