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
const asked = [], opened = [];
let inFlight = 0, maxInFlight = 0, delay = 120, brokenImage = null;
const streams = new Set();
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
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(file === FAILED ? { ok: false, sheets: 1, image: null, failure: null }
      : { ok: true, sheets: file === files[0].path ? 3 : 1, image: { url: file === brokenImage ? `/gone.png?n=${asked.length}` : '/prevue.svg', w: 300, h: 650 }, failure: null }));
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
  await check(`document.querySelector('#galleryView .gcard-slot:nth-child(2) .gcard').dataset.state==='failed' && document.querySelector('#galleryView .gcard-slot:nth-child(2) .gcard-failed')`, '그리지 못한 카드는 실패 판');
  const before = asked.length;
  await evaluate(`scrollTo(0, document.documentElement.scrollHeight)`);
  await until(`(${visible}).every(p=>document.querySelector('#galleryView .gcard-slot[data-path="'+CSS.escape(p)+'"] .gcard').dataset.state!=='loading')`);
  const bottom = await evaluate(visible);
  ok(asked.slice(before).every(p => bottom.includes(p)) && asked.length > before, '스크롤해 든 카드를 묻는다');
  ok(new Set(asked).size === asked.length, '한 번 물은 카드는 다시 묻지 않는다');
  await evaluate(`scrollTo(0, 0)`);
  await pause(300);

  await click('#galleryView .gcard-slot:nth-child(3) .gcard-hit');
  await until(`document.querySelector('#galleryView').hidden && document.querySelector('#boardView').hidden===false`);
  ok(opened.at(-1) === files[2].path, '카드를 고르면 그 파일을 연다');
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
