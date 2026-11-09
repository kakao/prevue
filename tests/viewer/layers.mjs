import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 떠 있는 층(D-162) — 가리킨 결과는 그림 밖 옆의 카드가, 후보 고르기는 카드 머리에서 내려오는 팝오버가, 캡슐은 오류 · 알림만.
// 카드의 트리 줄은 그림 클릭과 같고, 가리킨 컴포저블을 부르는 Preview 로 건너가며, Esc · 닫기 · 빈 곳 · 새 그림이면 걷힌다.
// 가짜 데몬이라 데몬 없이 돈다: node tests/viewer/layers.mjs
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REPO = '/repo';
const state = JSON.parse(JSON.stringify(JSON.parse(await readFile(join(root, 'plugin/daemon/daemon/src/test/contract/viewer.state.board.json'), 'utf8')).example).replaceAll('<repo>', REPO));
state.selection = null;
for (const g of state.board.groups) for (const c of g.cards) Object.assign(c, { widthDp: 360, heightDp: 780, imageUrl: `/shot.jpg?c=${c.index}`, treeUrl: `/tree.json?c=${c.index}` });
const FILE = state.board.file;
const CARD = `${REPO}/core/ui/src/main/kotlin/demo/ui/DrinkCard.kt`;
const BADGES = `${REPO}/app/src/main/kotlin/demo/Badges.kt`;
// 그림(480×1040px = 360×780dp)의 트리. 체인은 레이아웃 노드에 붙는다 — Text 는 같은 자리의 Compose 안 노드(Text.kt)가 갖는다.
const node = (name, fileName, lineNumber, bounds, children = [], modifiers) => ({ name, fileName, lineNumber, bounds, ...(modifiers && { modifiers }), children });
const tree = { composeViewInfo: [node('PearlScreen', 'Cards.kt', 5, [0, 0, 480, 1040], [
  node('Title', 'Cards.kt', 20, [24, 8, 300, 40]),
  node('Text', 'Cards.kt', 12, [24, 120, 456, 180], [node('', 'Text.kt', 90, [24, 120, 456, 180], [], [{ name: 'padding', value: '16.dp' }, { name: 'background', value: '#0E6B4F', color: '#0E6B4FFF' }])]),
  node('Label', 'Cards.kt', 14, [24, 200, 456, 230]),
  node('DrinkCard', 'DrinkCard.kt', 31, [24, 260, 240, 400]),
], [{ name: 'fillMaxSize', sizes: ['width', 'height'] }])] };
const projectFiles = { 'Cards.kt': [FILE], 'DrinkCard.kt': [CARD, `${REPO}/feature/pearl/src/main/kotlin/demo/pearl/DrinkCard.kt`] };
const previewFiles = { ready: true, files: [
  { path: FILE, rel: 'app/src/main/kotlin/demo/Cards.kt', module: ':app', mtime: 0, functions: ['Card0', 'Card1'], previews: [{ fn: 'Card0', calls: ['Text'] }, { fn: 'Card1', calls: ['Text'] }] },
  { path: BADGES, rel: 'app/src/main/kotlin/demo/Badges.kt', module: ':app', mtime: 0, functions: ['BadgePreview'], previews: [{ fn: 'BadgePreview', calls: ['Label'] }] },
], composables: [{ name: 'PearlScreen', path: FILE, rel: 'app/src/main/kotlin/demo/Cards.kt', module: ':app' }, { name: 'Label', path: BADGES, rel: 'app/src/main/kotlin/demo/Badges.kt', module: ':lib' }] };

const streams = new Set();
const push = patch => {
  Object.assign(state, patch, { version: state.version + 1 });
  for (const r of streams) r.write(`data: ${JSON.stringify({ type: 'state', state })}\n\n`);
};
const calls = { point: [], cancel: 0, choose: 0, open: [] };
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
  } else if (path === '/preview-files.json') json(previewFiles);
  else if (path === '/project-files.json') json({ files: projectFiles });
  else if (path === '/tree.json') json(tree);
  else if (path === '/shot.jpg') { response.setHeader('Content-Type', 'image/jpeg'); response.end(await readFile(join(root, 'tests/viewer/img/PearlListPreview.jpg'))); }
  else if (path === '/viewer/point') {
    const b = await body(request); calls.point.push(b);
    await new Promise(ok => setTimeout(ok, delays.get(b.line) || 0));
    if (failPoint) { response.writeHead(500).end('boom'); return; }
    if (b.fileName === 'DrinkCard.kt') {
      push({ choice: { fileName: b.fileName, line: b.line, repoRoot: REPO, candidates: projectFiles['DrinkCard.kt'] } });
      json({ needChoice: true });
    } else json({ ref: `@${FILE}#L${b.line}`, file: FILE });
  } else if (path === '/viewer/choose') { calls.choose++; push({ choice: null }); json({ ref: `@${CARD}#L31`, file: CARD }); }
  else if (path === '/viewer/cancel') { calls.cancel++; push({ choice: null }); json({ ok: true }); }
  else if (path === '/viewer/open') { calls.open.push(await body(request)); json({ ok: true }); }
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
    console.error(await evaluate(`({errors:__errors,card:document.querySelector('.point-card')?.textContent,cap:document.querySelector('#strip').textContent,chooser:document.querySelector('#chooser').className})`));
    throw Error(`시간 초과: ${expression}`);
  };
  const check = async (expression, name) => { assert(await evaluate(expression), name); console.log(`통과 ${++checked}: ${name}`); };
  const mouse = async at => { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1 }); };
  const moveTo = at => send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at });
  const centerOf = selector => evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const click = async selector => mouse(await centerOf(selector));
  const stageAt = c => evaluate(`(()=>{const r=document.querySelectorAll('#cards .card .cstage')[${c}].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const all = tree.composeViewInfo[0].children;
  // 카드 c 의 그림에서 노드 줄 line 의 가운데
  const nodeAt = (c, line) => evaluate(`(()=>{const img=document.querySelectorAll('#cards .card img')[${c}],r=img.getBoundingClientRect(),k=r.width/img.naturalWidth,n=${JSON.stringify(all)}.find(n=>n.lineNumber===${line}).bounds;return {x:r.x+(n[0]+n[2])/2*k,y:r.y+(n[1]+n[3])/2*k}})()`);
  const pointAt = async (c, line) => mouse(await nodeAt(c, line));
  const key = async k => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code: k }); };
  const pick = c => `document.querySelectorAll('#cards .card .box.pick')[${c}]`;
  const card = `document.querySelector('.point-card')`;
  const head = `(${card}?.querySelector('.pc-name')?.textContent ?? '')`;
  const ref = `(${card}?.querySelector('.pc-ref')?.textContent ?? '')`;
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
  // 트리는 마우스가 카드에 들어올 때 받는다 — 그 뒤 고를 수 있는 노드마다 구조 테두리가 선다
  for (const c of [0, 1]) await moveTo(await stageAt(c));
  await pause(300);
  await moveTo(await nodeAt(0, 12));
  await pause(200);
  await check(`(()=>{const m=document.querySelectorAll('#cards .marks')[0],h=document.querySelectorAll('#cards .card .box:not(.pick)')[0];return m.classList.contains('over') && m.querySelectorAll('.ol').length===5 && h.classList.contains('on')})()`,
    '그림 위에 마우스가 있으면 고를 수 있는 노드마다 구조 테두리, 손 아래 노드에 옅은 바탕');

  // 1. 그림을 가리키면 꼬리표 없이 카드가 그림 밖 옆에 뜬다
  await pointAt(0, 12);
  await until(`${head}==='Text' && __copied.length>0`);
  await pause(400);
  await check(`!document.querySelector('.tag') && ${ref}==='Cards.kt:12' && __copied.at(-1)==='@${FILE}#L12'`, '카드가 파일:라인을 말하고 멘션이 클립보드에 간다 — 꼬리표는 없다');
  await check(capsuleQuiet, '가리킨 결과는 캡슐에 뜨지 않는다');
  await check(`(()=>{const c=${card}.getBoundingClientRect(),i=document.querySelectorAll('#cards .card img')[0].getBoundingClientRect();return c.left>=i.right+15 && Math.abs(c.top-i.top)<1 && ${card}.closest('#boardView')})()`,
    '카드는 가리킨 그림 밖 오른쪽에, 위쪽을 그림 위쪽에 맞춰 선다');
  await check(`${card}.querySelector('.pc-chip').textContent==='Compose' && ${card}.querySelector('.pc-dims').textContent==='324×45dp'`, '이름 옆 출처 칩(정의가 없으면 Compose)과 크기(dp)');
  await check(`[...${card}.querySelectorAll('.pc-mods li')].map(l=>l.querySelector('.pc-mod-name').textContent).join()==='padding,background' && !!${card}.querySelector('.pc-shape.padded') && !!${card}.querySelector('.pc-swatch')`,
    'Modifier 체인은 같은 자리의 레이아웃 노드에서 읽고, 여백이 있으면 크기 그림에 점선 상자');
  await check(`${card}.querySelector('.pc-id').title.startsWith('@${FILE}#L12') && ${card}.querySelector('.pc-id').title.includes('PearlScreen › Text')`, '카드 머리 툴팁에 멘션 전체와 조상 사슬');
  await check(`[...${card}.querySelectorAll('.pc-pick')].map(b=>b.textContent+(b.getAttribute('aria-current')?'*':'')).join()==='PearlScreen,Title,Text*,Label,DrinkCard'`,
    '트리는 조상 · 형제 · 가리킨 노드를 그림에서 고를 수 있는 노드로 잇는다(Compose 안 노드는 건너뛴다)');
  await check(`!${card}.querySelector('.pc-rescue') && ${card}.querySelector('.pc-jump').title==='Go to Preview — Card1'`, '복사됐으면 글자 버튼이 없고, 지금 보는 Preview 를 뺀 점프가 머리에 선다');

  // 2. 트리 줄을 누르면 그림 클릭과 같다 — 박스 · 데몬의 선택 · 클립보드가 그 노드로. 줄에 올리면 그림 위에 옅은 바탕.
  const before = calls.point.length;
  const label = `[...${card}.querySelectorAll('.pc-pick')].find(b=>b.textContent==='Label')`;
  await moveTo(await evaluate(`(()=>{const r=${label}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`));
  await pause(150);
  await check(`(()=>{const h=document.querySelectorAll('#cards .card .box:not(.pick)')[0],img=document.querySelectorAll('#cards .card img')[0],k=img.getBoundingClientRect().width/img.naturalWidth;return h.classList.contains('on') && Math.abs(parseFloat(h.style.top)-200*k)<1 && document.querySelectorAll('#cards .marks')[0].classList.contains('peek')})()`,
    '트리 줄에 올리면 그 노드에 옅은 바탕(그림을 떠나 줄로 옮겨도 남는다)');
  await mouse(await evaluate(`(()=>{const r=${label}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`));
  await until(`${head}==='Label' && __copied.at(-1)==='@${FILE}#L14'`);
  assert.equal(calls.point.length, before + 1); assert.equal(calls.point.at(-1).line, 14); assert.equal(calls.point.at(-1).node, 'Label');
  console.log(`통과 ${++checked}: 트리 줄을 누르면 데몬에 그 노드를 가리키고 멘션이 클립보드에 간다`);
  await check(`(()=>{const p=${pick(0)},img=document.querySelectorAll('#cards .card img')[0],k=img.getBoundingClientRect().width/img.naturalWidth;return !p.hidden && Math.abs(parseFloat(p.style.top)-200*k)<1})()`, '고른 박스도 그 노드로 옮긴다');
  await check(`document.activeElement===document.body || !document.activeElement.closest('.point-card')`, '마우스로 누른 카드 단추는 포커스를 쥐지 않는다');
  await check(`${card}.querySelector('.pc-chip').textContent===':lib' && ${card}.querySelector('.pc-jump').title==='Go to Preview — BadgePreview'`, '프로젝트에 정의된 컴포저블은 정의 모듈 칩, 그 Preview 로 점프');

  // 3. 다른 파일의 Preview 로 — 그 파일과 함수를 데몬에 연다
  await click('.pc-jump');
  await until(`!${card}`);
  for (const end = Date.now() + 3000; !calls.open.length && Date.now() < end;) await pause(50);
  assert.deepEqual(calls.open.at(-1), { file: BADGES, fn: 'BadgePreview' });
  console.log(`통과 ${++checked}: 다른 파일의 Preview 점프는 /viewer/open 에 파일과 함수를 보내고 카드를 걷는다`);

  // 4. 같은 파일의 Preview — 데몬에 묻지 않고 그 묶음의 첫 카드에 커서
  await pointAt(0, 12);
  await until(`${head}==='Text' && !!${card}.querySelector('.pc-jump')`);
  const opened = calls.open.length;
  await click('.pc-jump');
  await until(`document.querySelector('#cards .card.cursor')?.dataset.i==='1'`);
  assert.equal(calls.open.length, opened, '지금 탭이면 /viewer/open 을 보내지 않는다');
  await check(`!${card} && ${pick(0)}.hidden`, '같은 파일의 Preview 점프는 그 카드에 커서를 두고 카드 · 박스를 걷는다');

  // 5. Esc · 닫기 · 빈 곳 · 새 그림이면 카드와 박스가 걷히고, 선택과 클립보드는 남는다
  await pointAt(0, 12);
  await until(`${head}==='Text'`);
  let pointed = calls.point.length, copied = await evaluate('__copied.length');
  await key('Escape');
  await until(`!${card}`);
  await check(`${pick(0)}.hidden && __copied.length===${copied}`, 'Esc 로 카드와 박스가 걷히고 클립보드는 그대로');
  assert.equal(calls.point.length, pointed, '걷어도 데몬에 다시 보내지 않는다(선택은 남는다)');
  await pointAt(0, 12); await until(`!!${card}`);
  await click('.pc-close'); await until(`!${card}`);
  await check(`${pick(0)}.hidden`, '닫기 버튼으로 걷힌다');
  await pointAt(0, 12); await until(`!!${card}`);
  await mouse(await evaluate(`(()=>{const r=document.querySelector('#cards').getBoundingClientRect();return {x:r.right-4,y:r.bottom-4}})()`));
  await until(`!${card}`);
  await check(`${pick(0)}.hidden`, '빈 곳을 누르면 걷힌다');
  await pointAt(0, 12); await until(`!!${card}`);
  push({ board: { ...state.board, groups: state.board.groups.map(g => ({ ...g, cards: g.cards.map(c => c.index === 0 ? { ...c, imageUrl: '/shot.jpg?c=0&v=2' } : c) })) } });
  await until(`!${card}`);
  await check(`${pick(0)}.hidden`, '그 카드에 새 그림(새 트리)이 오면 걷힌다');

  // 6. 복사가 막히면 파일 줄 끝에 글자 버튼 — 실제로 누르면 복사된다. 누름은 아래 그림의 가리키기로 새지 않는다.
  await moveTo(await stageAt(0)); await pause(300);
  await evaluate(`__block=1`);
  await pointAt(0, 14);
  await until(`!!${card}?.querySelector('button.pc-rescue')`);
  await check(`${card}.querySelector('.pc-rescue').textContent==='Not copied · click to copy' && ${ref}==='Cards.kt:14'`, '복사가 막히면 파일 줄 끝에 "복사 안 됨 · 눌러서 복사"');
  await check(capsuleQuiet, '막혀도 캡슐은 조용하다');
  const picks = await evaluate(`__picks`);
  pointed = calls.point.length;
  await click('.point-card .pc-rescue');
  await until(`!${card}.querySelector('.pc-rescue') && __copied.at(-1)==='@${FILE}#L14'`);
  await check(`__picks===${picks}`, '글자 버튼을 누르면 복사되고 가리키기로 새지 않는다');
  assert.equal(calls.point.length, pointed, '글자 버튼이 데몬에 가리키기를 보내지 않는다');
  await evaluate(`__block=2`);
  await pointAt(0, 20);
  await until(`!!${card}?.querySelector('button.pc-rescue')`);
  await click('.point-card .pc-rescue');
  await until(`${card}.querySelector('.pc-rescue.off')?.textContent==="Can't copy"`);
  console.log(`통과 ${++checked}: 다시 넣기도 막히면 "복사할 수 없음"으로 남는다`);

  // 7. 늦은 결과가 앞 카드를 덮지 않는다 — 앞 그림의 박스는 걷히고 카드는 뒤 그림 옆으로. 카드는 이웃 그림 위에 설 수 있어 오른쪽 그림을 먼저 누른다.
  await moveTo(await stageAt(1)); await pause(300);
  delays.set(12, 700);
  await pointAt(1, 12);
  await pause(80);
  await moveTo(await stageAt(0)); await pause(150);
  await pointAt(0, 14);
  await until(`${head}==='Label' && __copied.at(-1)==='@${FILE}#L14'`);
  await pause(900);
  await check(`${pick(1)}.hidden && !${pick(0)}.hidden && ${head}==='Label' && __copied.at(-1)==='@${FILE}#L14' && (()=>{const c=${card}.getBoundingClientRect(),i=document.querySelectorAll('#cards .card img')[0].getBoundingClientRect();return c.left>i.right && Math.abs(c.top-i.top)<1})()`,
    '늦게 온 앞 결과가 뒤 카드 · 클립보드를 덮지 않고 앞 그림의 박스는 걷힌다');
  delays.clear();

  // 8. 후보 고르기 — 카드 머리 바로 아래 팝오버. 빈 곳을 눌러도 Esc 로 취소된다(카드보다 먼저).
  await pointAt(0, 31);
  await until(`document.querySelector('#chooser').classList.contains('on')`);
  await pause(300);
  const g = await evaluate(`(()=>{const t=document.querySelector('.point-card .pc-head').getBoundingClientRect(),c=document.querySelector('#chooser').getBoundingClientRect(),W=document.documentElement.clientWidth;return {t:{l:t.left,b:t.bottom},c:{l:c.left,t:c.top,r:c.right,w:c.width},W}})()`);
  assert(Math.abs(g.c.t - g.t.b - 8) <= 1 && Math.abs(g.c.l - Math.min(g.t.l, g.W - g.c.w - 16)) < 1 && g.c.r <= g.W - 16, `후보 고르기 자리 ${JSON.stringify(g)}`);
  console.log(`통과 ${++checked}: 후보 고르기는 카드 머리 아래 8px 에 붙고 창 안에 든다`);
  await check(`document.querySelector('#chooser').parentElement===document.body && document.querySelectorAll('#chooser .opt').length===2 && document.querySelector('#chooser .opt').textContent==='core/ui/…/DrinkCard.kt'`, '후보는 저장소 기준으로 접어 보인다');
  await check(capsuleQuiet, '후보를 고르는 동안 캡슐은 조용하다');
  await click('#chooser h2');
  await key('Escape');
  await until(`!document.querySelector('#chooser').classList.contains('on')`);
  assert.equal(calls.cancel, 1, 'Esc 가 데몬에 취소를 보낸다');
  await check(`!!${card}`, '팝오버 빈 곳을 누른 뒤의 Esc 는 후보 고르기만 취소하고 카드는 남는다');
  const hit = await evaluate(`(()=>{const c=document.querySelector('#chooser').getBoundingClientRect();const e=document.elementFromPoint(c.left+c.width/2,c.top+c.height/2);return !document.querySelector('#chooser').contains(e)})()`);
  assert(hit, '흐려지는 팝오버가 누름을 가로채지 않는다'); console.log(`통과 ${++checked}: 흐려지는 팝오버가 누름을 가로채지 않는다`);

  // 9. 후보를 실제로 누르면 복사되고 카드가 그 경로를 말한다
  await pointAt(0, 31);
  await until(`document.querySelector('#chooser').classList.contains('on')`);
  await pause(300);
  await click('#chooser .opt');
  await until(`__copied.at(-1)==='@${CARD}#L31'`);
  await check(`${head}==='DrinkCard' && ${ref}==='DrinkCard.kt:31' && ${card}.querySelector('.pc-id').title.startsWith('@${CARD}#L31')`, '후보를 고르면 카드가 고른 경로의 멘션을 말한다');
  await until(`!document.querySelector('#chooser').classList.contains('on')`);

  // 10. 오류는 캡슐이 말하고 카드도 성공인 척하지 않는다
  failPoint = true;
  await pointAt(0, 12);
  await until(`document.querySelector('#strip').classList.contains('on')`);
  await check(`document.querySelector('#strip').textContent.includes('Pointing failed') && ${card}.querySelector('.pc-msg').textContent.startsWith('Pointing failed') && !${card}.querySelector('.pc-ref')`, '가리키기 오류는 캡슐이 알리고, 카드도 성공인 척하지 않는다');
  failPoint = false;

  // 11. 움직임 줄이기 — 고른 박스 · 팝오버가 뜨는 동안 프레임마다 이동 · 확대가 없고, 카드 높이는 바로 바뀐다
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await pause(500);                  // 닫힌 팝오버가 옛 설정의 축소에서 새 설정으로 옮겨 가는 전환이 끝나기를 기다린다
  await evaluate(`window.__frames=[];(function f(){const id=m=>m==='none'||m==='matrix(1, 0, 0, 1, 0, 0)';const b=document.querySelector('.box.pick:not([hidden])'),c=document.querySelector('#chooser');
    const v=[getComputedStyle(c).transform,b?getComputedStyle(b).transform:'none'];__frames.push(v.every(id)||v.join('|'));if(__frames.length<90)requestAnimationFrame(f)})()`);
  await pointAt(0, 31);
  await until(`document.querySelector('#chooser').classList.contains('on')`);
  await until(`__frames.length>=90`);
  const moved = await evaluate(`__frames.filter(f=>f!==true)`);
  assert.deepEqual(moved, [], '움직임 줄이기에서 고른 박스 · 팝오버는 프레임마다 제자리');
  console.log(`통과 ${++checked}: 움직임 줄이기에서 고른 박스 · 팝오버는 프레임마다 제자리`);
  await check(`getComputedStyle(document.querySelector('.pc-float .point-card')).transitionDuration==='0s'`, '움직임 줄이기에서 카드 높이는 감쇠 곡선 없이 바로 바뀐다');
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
