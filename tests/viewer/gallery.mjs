import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const board = JSON.parse(await readFile(join(root, 'plugin/daemon/daemon/src/test/contract/viewer.state.board.json'), 'utf8')).example;
board.selection = null;
const repo = board.header.repo;
const files = Array.from({ length: 40 }, (_, i) => ({
  path: `${repo}/feature/f${i}/src/main/kotlin/com/example/app/feature/f${i}/Screen${i}.kt`,
  rel: `feature/f${i}/src/main/kotlin/com/example/app/feature/f${i}/Screen${i}.kt`,
  module: `:feature:f${i}:impl`, mtime: 1_800_000_000_000 - i * 60_000, functions: [`Screen${i}Preview`],
}));
const FAILED = files[1].path;
let version = board.version + 1;
const tabOf = path => ({ ...board.tabs[0], key: path, name: path.split('/').pop().replace('.kt', ''), title: path, active: true });
const boardOf = path => ({ ...board, version: version++, screen: 'board', tabs: [tabOf(path)], board: { ...board.board, file: path } });
let current = { ...board, version: version++, screen: 'empty', tabs: [], board: null, focus: null };
const asked = [], opened = [], sheetAsked = [];
const WIDE = files[4].path;
let inFlight = 0, maxInFlight = 0, delay = 120, brokenImage = null;
const streams = new Set();
const notifyFiles = () => { for (const r of streams) r.write(`data: ${JSON.stringify({ type: 'ui', event: { kind: 'previewFiles' } })}\n\n`); };
const push = s => { current = s; for (const r of streams) r.write(`data: ${JSON.stringify({ type: 'state', state: s })}\n\n`); };

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = url.pathname;
  if (path === '/events') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    response.write(`data: ${JSON.stringify({ type: 'state', state: current })}\n\n`);
    streams.add(response); request.on('close', () => streams.delete(response));
  } else if (path === '/gallery/card') {
    const file = url.searchParams.get('file');
    asked.push(file);
    maxInFlight = Math.max(maxInFlight, ++inFlight);
    await new Promise(r => setTimeout(r, delay));
    inFlight--;
    const image = file === WIDE ? { url: '/prevue.svg', w: 650, h: 300 } : { url: '/prevue.svg', w: 300, h: 650 };
    const first = { i: 0, name: 'Screen0Preview', variant: null, image: file === brokenImage ? { ...image, url: `/gone.png?n=${asked.length}` } : image, failure: null };
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(file === FAILED ? { sheets: 1, front: [{ ...first, image: null }] }
      : file === files[0].path || file === WIDE ? { sheets: 3, front: [first, { i: 1, name: 'Screen0DarkPreview', variant: null, image, failure: null }, { i: 2, name: 'Screen0Preview', variant: 'Long', image: null, failure: null }] }
      : { sheets: 1, front: [first] }));
  } else if (path === '/gallery/sheet') {
    sheetAsked.push(url.searchParams.get('file'));
    response.writeHead(404).end();
  } else if (path === '/viewer/open' && request.method === 'POST') {
    let body = ''; for await (const c of request) body += c;
    const { file } = JSON.parse(body);
    opened.push(file);
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ ok: true }));
    push(boardOf(file));
  } else if (path === '/preview-files.json' || path === '/project-files.json') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(path === '/preview-files.json' ? { ready: true, files } : { files: {} }));
  } else if (path.startsWith('/viewer/')) {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ ok: true }));
  } else {
    const file = resolve(root, 'plugin/viewer', '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(join(root, 'plugin/viewer') + '/')) { response.writeHead(404).end(); return; }
    try {
      const body = await readFile(file);
      response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' })[extname(file)] || 'application/octet-stream');
      response.end(body);
    } catch { response.writeHead(404).end(); }
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const profile = await mkdtemp(join(tmpdir(), 'prevue-gallery-check-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: 'ignore' });
const pause = ms => new Promise(r => setTimeout(r, ms));
let ws, checked = 0;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(100); }
  }
  assert(port, 'Chrome 실행');
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); } });
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
  const until = async expression => {
    for (const end = Date.now() + 5000; Date.now() < end; await pause(50)) if (await evaluate(`!!(${expression})`)) return;
    console.error(await evaluate(`({errors:__errors,gallery:document.querySelector('#galleryView').hidden,board:document.querySelector('#boardView').hidden})`));
    throw Error(`시간 초과: ${expression}`);
  };
  const check = async (expression, name) => { assert(await evaluate(`!!(${expression})`), name); console.log(`통과 ${++checked}: ${name}`); };
  const ok = (value, name) => { assert(value, name); console.log(`통과 ${++checked}: ${name}`); };
  const click = async selector => {
    const p = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...p, button: 'left', clickCount: 1 });
  };
  const key = async (key, code = key) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code }); };
  const visible = `[...document.querySelectorAll('#galleryView .gcard-slot')].filter(el=>{const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight}).map(el=>el.dataset.path)`;

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errors=[];addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));` });
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });

  await until(`document.querySelector('#galleryView')?.hidden===false && document.querySelectorAll('#galleryView .gcard').length===${files.length}`);
  await check(`document.querySelector('#boardView').hidden && !document.querySelector('#startView')`, '탭 0개면 갤러리가 시작 화면');
  await check(`document.querySelector('#railAll').classList.contains('on') && document.querySelector('#railAll').getAttribute('aria-current')==='page'`, '갤러리에 있는 동안 레일 「모든 Preview」가 고른 줄');
  await check(`[...document.querySelectorAll('#galleryView .gcard-file')].map(el=>el.title||el.textContent).slice(0,3).join()==='Screen0,Screen1,Screen2'`, '최근 바뀐 순, .kt 를 뗀 이름');
  await check(`document.querySelector('#galleryView .gcard-pkg').textContent==='f0' && document.querySelector('#galleryView .gcard-mod').textContent==='feature/f0'`, '패키지는 공통 머리를 떼고, 모듈은 impl 을 뗀다');
  await check(`document.querySelectorAll('#galleryView .gcard[data-state="loading"] .gcard-ph').length>0`, '그림이 오기 전에는 로딩 판');

  const shown = await evaluate(visible);
  await until(`(${visible}).every(p=>document.querySelector('#galleryView .gcard-slot[data-path="'+CSS.escape(p)+'"] .gcard').dataset.state!=='loading')`);
  await pause(400);
  ok(asked.length > 0 && asked.every(p => shown.includes(p)), '화면에 든 카드만 묻는다');
  ok(asked.length < files.length, '화면 밖 카드는 묻지 않는다');
  ok(maxInFlight === 1, '한 번에 하나씩 묻는다');
  ok(asked.join() === shown.filter(p => asked.includes(p)).join(), '격자 순서로 묻는다');
  await check(`document.querySelector('#galleryView .gcard-slot:nth-child(1) .gcard').dataset.state==='done' && document.querySelector('#galleryView .gcard-slot:nth-child(1) img')`, '완료 카드는 그림');
  await check(`document.querySelector('#galleryView .gcard-slot:nth-child(1) .gcard-count')?.textContent==='3' && !document.querySelector('#galleryView .gcard-slot:nth-child(3) .gcard-count')`, '두 장 이상일 때만 장 수');
  await check(`document.querySelectorAll('#galleryView .gcard-slot:nth-child(1) .gcard-ghost').length===2 && document.querySelectorAll('#galleryView .gcard-slot:nth-child(1) .gcard-ghost img').length===1`, '카드는 앞 세 장을 함께 그려 호버 뒤 판에 두고, 못 그린 장은 빈 판');
  await check(`document.querySelector('#galleryView .gcard-slot:nth-child(2) .gcard').dataset.state==='failed' && document.querySelector('#galleryView .gcard-slot:nth-child(2) .gcard-failed')`, '그리지 못한 카드는 실패 판');
  const before = asked.length;
  await evaluate(`scrollTo(0, document.documentElement.scrollHeight)`);
  await until(`(${visible}).every(p=>document.querySelector('#galleryView .gcard-slot[data-path="'+CSS.escape(p)+'"] .gcard').dataset.state!=='loading')`);
  const bottom = await evaluate(visible);
  ok(asked.slice(before).every(p => bottom.includes(p)) && asked.length > before, '스크롤해 든 카드를 묻는다');
  ok(new Set(asked).size === asked.length, '한 번 물은 카드는 다시 묻지 않는다');
  await evaluate(`scrollTo(0, 0)`);
  await pause(300);

  const count0 = () => asked.filter(x => x === files[0].path).length;
  const sheetUp = `document.querySelector('.gsheet')?.style.visibility!=='hidden' && !!document.querySelector('.gsheet')`;
  const sheetGone = `!document.querySelector('.gsheet-layer')`;
  const watchFrames = `(()=>{window.__out=[];window.__frames=0;const cut=(el,r)=>{const m=/inset\\(([^)]*)\\)/.exec(getComputedStyle(el).clipPath);if(!m)return r;const v=m[1].trim().split(/\\s+/);while(v.length<4)v.push(v[v.length===3?1:v.length===2?0:0]);const n=(x,len)=>x.endsWith('%')?len*parseFloat(x)/100:parseFloat(x)||0;return{left:r.left+n(v[3],r.width),top:r.top+n(v[0],r.height),right:r.right-n(v[1],r.width),bottom:r.bottom-n(v[2],r.height)}};const f=()=>{const s=document.querySelector('.gsheet-shell');if(s){const b=s.getBoundingClientRect();for(const el of document.querySelectorAll('.gsheet-shot,.gsheet-cap,.gsheet-file,.gsheet-pkgrow,.gsheet-info,.gsheet-mod,.gsheet-go,.gsheet .gcard-count')){if(+getComputedStyle(el).opacity<.05)continue;const r=cut(el,el.getBoundingClientRect());if(r.right-r.left<1)continue;if(r.left<b.left-1.5||r.top<b.top-1.5||r.right>b.right+1.5||r.bottom>b.bottom+1.5)__out.push(el.className+' '+__frames)}__frames++}if(__frames<90)requestAnimationFrame(f)};requestAnimationFrame(f)})()`;
  const openedBefore = opened.length;
  await evaluate(watchFrames);
  await click('#galleryView .gcard-slot:nth-child(1) .gcard-hit');
  await until(sheetUp);
  await check(`document.querySelector('#galleryView').hidden===false && document.querySelector('.gsheet[role=dialog][aria-modal=true]').getAttribute('aria-label')==='Screen0'`, '카드를 누르면 그 자리에서 시트가 뜬다');
  ok(opened.length === openedBefore, '시트를 여는 것만으로는 파일을 열지 않는다');
  await check(`getComputedStyle(document.documentElement).overflow==='hidden' && document.documentElement.style.scrollbarGutter==='stable'`, '시트가 열린 동안 뒤 스크롤을 잠근다');
  await check(`document.activeElement?.classList.contains('gsheet-go')`, '포커스는 「보드에서 보기」');
  await check(`document.querySelector('#galleryView .gcard-slot:nth-child(1) .gcard').style.visibility==='hidden'`, '시트가 뜬 동안 카드 자리는 비운다');
  await until(`document.querySelectorAll('.gsheet-fig').length===3 && document.querySelectorAll('.gsheet-shot img').length===2`);
  ok(sheetAsked.length === 0 && count0() === 1, '시트는 카드가 그린 앞 장을 그대로 쓰고 따로 묻지 않는다');
  await check(`[...document.querySelectorAll('.gsheet-cap')].map(c=>c.textContent).join()==='Dark,Long'`, '이름표는 파일 이름 · Preview 를 떼고, 변주는 변주 이름, 남는 것이 없으면 생략');
  await check(`document.querySelectorAll('.gsheet-shot[data-state="failed"] .gsheet-failed').length===1`, '그리지 못한 장은 실패 판');
  await check(`document.querySelector('.gsheet-stage').dataset.flow==='row' && document.querySelector('.gsheet .gcard-count').textContent==='3'`, '세로 그림은 나란히, 장 수는 카드와 같은 알약');
  await check(`document.querySelectorAll('.gsheet-close').length===1 && document.querySelector('.gsheet-close').textContent.length>0`, '화면 읽기용 닫기 단추');
  const stayed = [];
  for (let i = 0; i < 6; i++) { await key('Tab'); stayed.push(await evaluate(`!!document.activeElement?.closest('.gsheet')`)); }
  ok(stayed.every(x => x === true), 'Tab 이 시트 밖으로 나가지 않는다');
  await check(`!!document.querySelector('#rail').closest('[inert]') && !!document.querySelector('#bar').closest('[inert]') && !document.querySelector('.gsheet').closest('[inert]')`, '시트가 떠 있는 동안 헤더 · 레일은 막힌다');
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'k', code: 'KeyK', modifiers: 4 });
  await pause(200);
  await check(`!document.querySelector('#qoSheet').classList.contains('on')`, '시트가 떠 있는 동안 ⌘K 는 빠른 열기를 띄우지 않는다');
  for (let i = 0; i < 100 && await evaluate('__frames') < 90; i++) await pause(30);
  ok((await evaluate('__out')).length === 0, `여는 동안 시트 내용이 틀 밖으로 나가지 않는다 ${(await evaluate('__out')).slice(0, 3)}`);
  await key('/', 'Slash');
  await pause(200);
  await check(`!document.querySelector('#qoSheet').classList.contains('on')`, '시트가 열린 동안 갤러리 키는 먹지 않는다');
  await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 450, deltaX: 0, deltaY: 600 });
  await pause(200);
  ok(await evaluate('scrollY') === 0, '시트가 열린 동안 휠로 뒤가 스크롤되지 않는다');

  await evaluate(watchFrames);
  await key('Escape');
  await until(sheetGone);
  ok((await evaluate('__out')).length === 0, `닫는 동안 시트 내용이 틀 밖으로 나가지 않는다 ${(await evaluate('__out')).slice(0, 3)}`);
  await check(`document.querySelector('#galleryView').hidden===false && document.querySelector('#galleryView .gcard-slot:nth-child(1) .gcard').style.visibility===''`, 'Esc 로 시트를 닫으면 카드가 제자리에 돌아온다');
  await check(`document.activeElement===document.querySelector('#galleryView .gcard-slot:nth-child(1) .gcard-hit')`, '닫으면 포커스가 카드로 돌아온다');
  await check(`getComputedStyle(document.documentElement).overflow!=='hidden' && !document.querySelector('#galleryView .gallery-in').inert`, '닫으면 뒤 스크롤 잠금이 풀린다');

  await click('#galleryView .gcard-slot:nth-child(1) .gcard-hit');
  await until(sheetUp);
  await click('.gsheet-scrim');
  await until(sheetGone);
  ok(true, '바깥을 누르면 시트가 닫힌다');

  await click('#galleryView .gcard-slot:nth-child(2) .gcard-hit');
  await until(sheetUp);
  await evaluate(`document.documentElement.scrollTop=document.documentElement.scrollHeight`);
  await key('Escape');
  await until(sheetGone);
  await evaluate(`scrollTo(0, 0)`);
  await check(`document.querySelector('#galleryView .gcard-slot:nth-child(2) .gcard').style.visibility==='' && document.querySelector('#galleryView .gcard-slot:nth-child(2) .gcard-hit').getBoundingClientRect().height>0`, '카드가 화면 밖일 때 닫아도 카드가 돌아온다');

  await click('#galleryView .gcard-slot:nth-child(5) .gcard-hit');
  await until(sheetUp);
  await until(`document.querySelectorAll('.gsheet-shot img').length===2`);
  await check(`document.querySelector('.gsheet-stage').dataset.flow==='col'`, '모든 그림이 가로면 세로로 쌓는다');
  await key('Escape');
  await until(sheetGone);

  const openedBeforeClosing = opened.length;
  await click('#galleryView .gcard-slot:nth-child(3) .gcard-hit');
  await until(sheetUp);
  await key('Escape');
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, ...(type === 'keyDown' ? { text: '\r' } : {}) });
  await until(sheetGone);
  await pause(300);
  ok(opened.length === openedBeforeClosing && await evaluate(`document.querySelector('#galleryView').hidden===false`), '닫히는 중에 누른 Enter 는 보드를 열지 않는다');
  await check(`!document.querySelector('[data-sheet-inert]') && !document.querySelector('#rail').closest('[inert]')`, '닫으면 바깥 막음이 풀린다');

  await click('#galleryView .gcard-slot:nth-child(3) .gcard-hit');
  await until(sheetUp);
  await evaluate(`document.activeElement.blur()`);
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, ...(type === 'keyDown' ? { text: '\r' } : {}) });
  await until(`document.querySelector('#galleryView').hidden && document.querySelector('#boardView').hidden===false && ${sheetGone}`);
  ok(opened.at(-1) === files[2].path, '시트의 Enter 로 그 파일의 탭과 보드가 열린다');
  await check(`!document.querySelector('#railAll').classList.contains('on') && !document.querySelector('#railGlider').hidden`, '보드에서는 레일의 탭 줄이 고른 줄');

  await click('#railAll');
  await until(`document.querySelector('#galleryView').hidden===false && document.querySelector('#boardView').hidden`);
  await check(`document.querySelector('#railAll').classList.contains('on') && document.querySelector('#railGlider').hidden`, '레일 「모든 Preview」로 갤러리, 그 줄이 고른 줄');
  await until(`document.querySelector('#railList .rt').getBoundingClientRect().height>0`);
  await click('#railList .rt');
  await until(`document.querySelector('#galleryView').hidden && document.querySelector('#boardView').hidden===false`);
  ok(true, '레일의 지금 탭을 누르면 보드로');

  await key('?', 'Slash');
  await until(`document.querySelector('#help').hidden===false`);
  await key('Escape');
  await until(`document.querySelector('#help').hidden`);
  await check(`document.querySelector('#galleryView').hidden && document.querySelector('#boardView').hidden===false`, 'Esc 는 떠 있는 층(도움말)을 먼저 닫는다');
  await key('Escape');
  await until(`document.querySelector('#galleryView').hidden===false`);
  ok(true, '층이 없으면 보드의 Esc 가 갤러리로');
  await check(sheetGone, '보드에서 물러난 갤러리에는 시트가 없다');
  await click('#galleryView .gcard-slot:nth-child(3) .gcard-hit');
  await until(sheetUp);
  await click('.gsheet-go');
  await until(`document.querySelector('#galleryView').hidden && document.querySelector('#boardView').hidden===false && ${sheetGone}`);
  ok(true, '「보드에서 보기」를 누르면 보드로');
  await key('Escape');
  await until(`document.querySelector('#galleryView').hidden===false`);
  await click('#galleryView .gcard-slot:nth-child(3) .gcard-hit');
  await until(sheetUp);
  await key('Escape');
  await until(sheetGone);
  await check(`document.querySelector('#galleryView').hidden===false`, 'Esc 층 — 시트가 먼저 닫히고 갤러리는 남는다');
  await key('Escape');
  await pause(200);
  await check(`document.querySelector('#galleryView').hidden===false`, '갤러리의 Esc 는 아무 데도 가지 않는다');
  await key('/', 'Slash');
  await until(`document.querySelector('#qoSheet').classList.contains('on')`);
  await key('Escape');
  await until(`document.querySelector('#qoSheet').hidden`);
  await check(`document.querySelector('#galleryView').hidden===false`, '갤러리 위의 팔레트를 닫아도 갤러리');

  push(boardOf(files[5].path));
  await until(`document.querySelector('#galleryView').hidden && document.querySelector('#boardView').hidden===false`);
  ok(true, '다른 탭이 열리면(에이전트) 갤러리 층이 닫히고 보드');
  push({ ...boardOf(files[2].path) });
  await pause(300);
  await check(`document.querySelector('#galleryView').hidden`, '옛 탭으로 돌아와도 닫힌 층은 다시 뜨지 않는다');

  const count = p => asked.filter(x => x === p).length;
  const settled = () => until(`!document.querySelector('.vt-tab')`);
  const toGallery = async () => { await settled(); await click('#railAll'); await until(`document.querySelector('#galleryView').hidden===false`); };
  const toBoard = async () => { await settled(); await until(`document.querySelector('#railList .rt.active')?.getBoundingClientRect().height>0`); await click('#railList .rt.active'); await until(`document.querySelector('#galleryView').hidden`); };
  await toGallery();
  await evaluate(`scrollTo(0, 0)`);
  await until(`document.querySelector('#galleryView .gcard-slot:nth-child(1) .gcard').dataset.state==='done'`);
  const firstAsks = count(files[0].path);
  files[0].mtime += 1;
  await toBoard();
  await toGallery();
  await until(`${count(files[0].path)}>0 && document.querySelector('#galleryView .gcard-slot:nth-child(1) .gcard').dataset.state==='done'`);
  for (let i = 0; i < 50 && count(files[0].path) === firstAsks; i++) await pause(50);
  ok(count(files[0].path) === firstAsks + 1, '같은 파일의 mtime 이 바뀌면 그 카드를 다시 묻는다');

  delay = 600;
  for (const f of files) f.mtime += 1;
  await toBoard();
  await toGallery();
  for (let i = 0; i < 100 && !inFlight; i++) await pause(20);
  await toBoard();
  const held = asked.length;
  await pause(1500);
  ok(asked.length === held, '갤러리가 숨으면 줄이 멈춘다');

  await toGallery();
  await evaluate(`scrollTo(0, 0)`);
  for (let i = 0; i < 100 && !inFlight; i++) await pause(20);
  const top = await evaluate(visible);
  await evaluate(`scrollTo(0, document.documentElement.scrollHeight)`);
  const fromScroll = asked.length;
  await until(`(${visible}).every(p=>document.querySelector('#galleryView .gcard-slot[data-path="'+CSS.escape(p)+'"] .gcard').dataset.state!=='loading')`);
  const bottomNow = await evaluate(visible);
  ok(asked.slice(fromScroll).every(p => bottomNow.includes(p) || !top.includes(p)) && asked.length > fromScroll, '화면을 벗어난 대기 카드는 줄에서 빠진다');
  delay = 120;
  await evaluate(`scrollTo(0, 0)`);

  brokenImage = files[3].path;
  const brokenAsks = count(files[3].path);
  files[3].mtime += 1;
  await toBoard();
  await toGallery();
  await until(`${count(files[3].path)}>0 && document.querySelector('#galleryView .gcard-slot:nth-child(4) .gcard').dataset.state==='done'`);
  for (let i = 0; i < 100 && count(files[3].path) < brokenAsks + 2; i++) await pause(50);
  await pause(800);
  ok(count(files[3].path) === brokenAsks + 2, '그림을 받지 못하면 그 카드를 한 번만 다시 묻는다');
  brokenImage = null;

  push({ ...boardOf(files[2].path), tabs: [tabOf(files[2].path), { ...tabOf(files[6].path), active: false }] });
  await until(`document.querySelectorAll('#railList .rt').length===2`);
  await toGallery();
  await settled();
  await key('1', 'Digit1');
  await until(`document.querySelector('#galleryView').hidden && document.querySelector('#boardView').hidden===false`);
  ok(true, '갤러리가 보드 위에 있을 때 지금 탭의 번호를 누르면 보드로');

  push({ ...current, version: version++, screen: 'empty', tabs: [], board: null });
  await until(`document.querySelector('#galleryView').hidden===false`);
  ok(true, '탭을 다 닫으면 다시 갤러리');
  delay = 600;
  for (const f of files) f.mtime += 1;
  notifyFiles();
  for (let i = 0; i < 100 && !inFlight; i++) await pause(20);
  await click('#galleryView .gcard-slot:nth-child(2) .gcard-hit');
  await until(sheetUp);
  for (let i = 0; i < 100 && inFlight; i++) await pause(20);
  const heldBySheet = asked.length;
  await pause(1500);
  ok(asked.length === heldBySheet, '시트가 열린 동안 카드 줄이 멈춘다');
  await key('Escape');
  await until(sheetGone);
  for (let i = 0; i < 100 && asked.length === heldBySheet; i++) await pause(20);
  ok(asked.length > heldBySheet, '시트를 닫으면 카드 줄이 다시 돈다');
  delay = 120;

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await click('#galleryView .gcard-slot:nth-child(1) .gcard-hit');
  await until(`!!document.querySelector('.gsheet-shell')`);
  await check(`(()=>{const as=document.querySelector('.gsheet-layer').getAnimations({subtree:true});return as.length>0&&as.every(a=>a.effect.getKeyframes().every(k=>!('transform' in k)&&!('clipPath' in k)))})()`, '움직임 줄이기에서는 시트가 옮겨 오지 않고 페이드만 한다');
  await key('Escape');
  await until(sheetGone);
  await send('Emulation.setEmulatedMedia', { features: [] });
  await click('#galleryView .gcard-slot:nth-child(1) .gcard-hit');
  await until(sheetUp);
  const gone = await evaluate(`document.querySelector('#galleryView .gcard-slot:nth-child(1)').dataset.path`);
  files.splice(files.findIndex(f => f.path === gone), 1);
  notifyFiles();
  await until(`${sheetGone} && !document.querySelector('#galleryView .gcard-slot[data-path="${gone}"]')`);
  await check(`getComputedStyle(document.documentElement).overflow!=='hidden' && !document.querySelector('#galleryView .gallery-in').inert`, '연 파일이 목록에서 빠지면 시트가 닫히고 잠금이 풀린다');
  await key('/', 'Slash');
  await until(`document.querySelector('#qoSheet').classList.contains('on')`);
  await key('Escape');
  await until(`document.querySelector('#qoSheet').hidden`);
  ok(true, '시트가 닫힌 뒤에는 갤러리 키가 다시 먹는다');

  const kept = (f, i, at, url = '/prevue.svg') => ({ i, name: `${f.path.split('/').pop().replace('.kt', '')}${['', 'Dark', 'Long'][i]}Preview`, variant: null, image: { url, w: 300, h: 650, at }, failure: null });
  const [fresh, old, part] = [files[6], files[7], files[8]];
  part.mtime += 1;
  fresh.shots = { sheets: 3, front: [0, 1, 2].map(i => kept(fresh, i, fresh.mtime + 1000)) };
  old.shots = { sheets: 1, front: [kept(old, 0, old.mtime - 1000)] };
  part.shots = { sheets: 3, front: [kept(part, 0, part.mtime + 1000)] };
  const slot = f => `#galleryView .gcard-slot[data-path="${f.path}"]`;
  const asksBefore = [fresh, old, part].map(f => count(f.path));
  notifyFiles();
  await until(`document.querySelector('${slot(fresh)} .gcard').dataset.state==='done' && document.querySelector('${slot(old)} .gcard').dataset.state==='done'`);
  await evaluate(`document.querySelector('${slot(old)}').scrollIntoView({block:'center'})`);
  await pause(600);
  ok(count(fresh.path) === asksBefore[0] && count(old.path) === asksBefore[1], '앞 장이 모두 캐시에 있는 카드는 그리라고 묻지 않는다');
  await check(`document.querySelector('${slot(fresh)} .gcard-shot img')?.getAttribute('src')==='/prevue.svg' && !document.querySelector('${slot(fresh)} .gcard').dataset.stale`, '캐시가 있는 카드는 로딩 없이 그림부터');
  await check(`document.querySelectorAll('${slot(fresh)} .gcard-ghost img').length===2`, '캐시가 있는 카드의 뒤 판에는 2 · 3번째 장');
  await check(`document.querySelector('${slot(old)} .gcard').dataset.stale==='true' && document.querySelector('${slot(old)} .gcard-old')?.textContent==='Outdated' && !!document.querySelector('${slot(old)} .gcard-old').title`, '그린 뒤 파일이 바뀌면 흐리게 + 「Outdated」');
  await check(`+getComputedStyle(document.querySelector('${slot(old)} .gcard-shot img')).opacity<1`, '낡은 그림은 흐리다');
  const oldShots = old.shots;
  old.shots = { sheets: 1, front: [kept(old, 0, old.mtime + 1000, '/prevue.svg?new')] };
  notifyFiles();
  await until(`document.querySelector('${slot(old)} .gcard-shot img')?.getAttribute('src')==='/prevue.svg?new' && !document.querySelector('${slot(old)} .gcard').dataset.stale && !document.querySelector('${slot(old)} .gcard-old')`);
  ok(true, '보드에서 다시 그려 목록에 새 그림이 오면 갈아 끼우고 흐림이 풀린다');
  old.shots = oldShots;
  notifyFiles();
  await until(`document.querySelector('${slot(old)} .gcard').dataset.stale==='true'`);

  const sheetsBefore = sheetAsked.length;
  await evaluate(`document.querySelector('${slot(fresh)}').scrollIntoView({block:'center'})`);
  await pause(200);
  await evaluate(watchFrames);
  await click(`${slot(fresh)} .gcard-hit`);
  await until(sheetUp);
  await until(`document.querySelectorAll('.gsheet-shot img').length===3`);
  for (let i = 0; i < 100 && await evaluate('__frames') < 90; i++) await pause(30);
  ok((await evaluate('__out')).length === 0, `캐시 장 셋으로 여는 동안 시트 내용이 틀 밖으로 나가지 않는다 ${(await evaluate('__out')).slice(0, 3)}`);
  ok(sheetAsked.length === sheetsBefore && count(fresh.path) === asksBefore[0], '앞 장이 모두 캐시에 있으면 시트도 카드도 그리라고 묻지 않는다');
  await check(`[...document.querySelectorAll('.gsheet-cap')].map(c=>c.textContent).join()==='Dark,Long'`, '캐시 장의 이름표도 함수 이름에서 짓는다');
  await evaluate(watchFrames);
  await key('Escape');
  await until(sheetGone);
  ok((await evaluate('__out')).length === 0, `캐시 장 셋으로 닫는 동안 시트 내용이 틀 밖으로 나가지 않는다 ${(await evaluate('__out')).slice(0, 3)}`);
  await evaluate(`document.querySelector('${slot(old)}').scrollIntoView({block:'center'})`);
  await click(`${slot(old)} .gcard-hit`);
  await until(sheetUp);
  await check(`document.querySelector('.gsheet-fig').dataset.stale==='true' && document.querySelector('.gsheet-old')?.textContent==='Outdated'`, '시트에서도 낡은 장은 흐리게 + 「Outdated」');
  await key('Escape');
  await until(sheetGone);
  await evaluate(`document.querySelector('${slot(part)}').scrollIntoView({block:'center'})`);
  for (let i = 0; i < 100 && count(part.path) === asksBefore[2]; i++) await pause(30);
  await until(`document.querySelector('${slot(part)} .gcard').dataset.state==='done'`);
  ok(count(part.path) === asksBefore[2] + 1, '앞 장 중 하나라도 캐시에 없으면 카드가 앞 장을 다시 묻는다');

  await evaluate(`(()=>{const p=document.createElement('span');p.className='gcard-ph';p.id='phProbe';document.querySelector('#galleryView').append(p)})()`);
  await check(`getComputedStyle(document.querySelector('#phProbe'),'::after').animationName==='gcard-shimmer'`, '로딩 판은 빛이 지나가는 쉬머');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await check(`getComputedStyle(document.querySelector('#phProbe'),'::after').display==='none' && getComputedStyle(document.querySelector('#phProbe')).animationName==='none'`, '움직임 줄이기에서는 멈춘 판');
  await send('Emulation.setEmulatedMedia', { features: [] });
  await evaluate(`document.querySelector('#phProbe').remove()`);
  await check(`__errors.length===0`, '브라우저 오류 없음');
  console.log(`완료: ${checked}개 검사`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(r => chrome.exitCode !== null ? r() : chrome.once('exit', r));
  await rm(profile, { recursive: true, force: true });
  for (const r of streams) r.end();
  server.closeAllConnections();
  await new Promise(r => server.close(r));
}
