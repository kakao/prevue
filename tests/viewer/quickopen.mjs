import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const state = JSON.parse(await readFile(join(root, 'plugin/contract/viewer.state.board.json'), 'utf8')).example;
state.selection = null;
const files = [{ path: state.board.file, rel: 'app/Cards.kt', module: ':app', mtime: 1, previews: [] }];
const streams = new Set();
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/events') {
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    response.write(`data: ${JSON.stringify({ type: 'state', state })}\n\n`);
    streams.add(response); request.on('close', () => streams.delete(response));
  } else if (path === '/preview-files.json' || path === '/project-files.json') {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(path === '/preview-files.json' ? { ready: true, files } : { files: {} }));
  } else {
    const file = resolve(root, 'plugin/viewer', '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(join(root, 'plugin/viewer') + '/')) { response.writeHead(404).end(); return; }
    try {
      const body = await readFile(file);
      response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream');
      response.end(body);
    } catch { response.writeHead(404).end(); }
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(join(tmpdir(), 'prevue-quickopen-check-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws, checked = 0;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(100); }
  }
  assert(port, 'Chrome 실행');
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { waiting.get(message.id)?.(message); waiting.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id, timer = setTimeout(() => { waiting.delete(n); reject(Error(`${method} 응답 시간 초과`)); }, 8000);
    waiting.set(n, message => { clearTimeout(timer); message.error ? reject(Error(message.error.message)) : resolve(message.result); });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const until = async expression => {
    for (const end = Date.now() + 5000; Date.now() < end; await pause(50)) if (await evaluate(expression)) return;
    console.error(await evaluate(`({errors:__errors,clicks:window.__clicks,bar:document.querySelector('#bar').className,sheet:{hidden:document.querySelector('#qoSheet').hidden,height:document.querySelector('#qoSheet').getBoundingClientRect().height,parent:document.querySelector('#qoSheet').parentElement.id},rows:document.querySelector('#qoIn').innerHTML,hit:(()=>{const r=document.querySelector('#railOpen').getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML})()})`));
    throw Error(`시간 초과: ${expression}`);
  };
  const check = async (expression, name) => { assert(await evaluate(expression), name); console.log(`통과 ${++checked}: ${name}`); };
  const click = async selector => {
    const point = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
  };
  const key = async key => {
    for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key, code: key });
  };
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem(${JSON.stringify('prevue.fold:'+state.board.file)},${JSON.stringify(JSON.stringify(state.board.groups.map(g=>g.name)))});window.__clicks=[];document.addEventListener('click',e=>__clicks.push({id:e.target.closest('[id]')?.id,trusted:e.isTrusted}),true);window.__errors=[];addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));` });
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  await until(`document.querySelector('#rail')?.hidden===false && document.querySelector('#railList .rt')`);
  await evaluate(`document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))`);
  await check(`document.querySelector('#panel').hidden`, '보드는 패널(확대 조절)을 숨김');
  const allOpen = `document.querySelectorAll('#cards .card').length===${state.board.groups.reduce((n,g)=>n+g.cards.length,0)} && [...document.querySelectorAll('#cards .card')].every(el=>el.getBoundingClientRect().height>0 && !el.closest('.collapsed'))`;
  await check(allOpen, '옛 접힘 설정이 있어도 보드 카드 전체 표시');
  await check(`!document.querySelector('#foldAll') && !document.querySelector('#cards .chev,#cards .thumbs')`, '보드 접기 버튼과 장식 제거');
  await click('#cards .ghead');
  await check(allOpen, '묶음 제목을 클릭해도 전체 카드 표시');
  await key('['); await key(']');
  await check(allOpen, '옛 접기 단축키를 눌러도 전체 카드 표시');
  await check(`[...document.querySelectorAll('#cards .ghead')].every(el=>!el.hasAttribute('role') && !el.hasAttribute('tabindex') && !el.hasAttribute('aria-expanded'))`, '묶음 제목은 접기 버튼으로 노출하지 않음');
  await check(`!document.querySelector('#help').textContent.includes('Fold')`, '도움말에서 보드 접기 안내 제거');

  for (const selector of ['#railOpen']) {
    await click(selector);
    await until(`document.querySelector('#qoSheet').getBoundingClientRect().height>0 && document.querySelector('#qoIn .qo-row')`);
    await check(`document.activeElement.id==='q' && document.querySelector('#q').checkVisibility()`, `${selector} 실제 클릭으로 검색 입력에 포커스`);
    await check(`document.querySelector('#qoIn .qo-row').checkVisibility()`, `${selector} 검색 결과 표시`);
    await key('Escape');
    await until(`document.querySelector('#qoSheet').hidden`);
  }
  await key('/');
  await until(`document.querySelector('#q').checkVisibility()`);
  await check(`document.activeElement.id==='q'`, '키보드 단축키로 검색 열기');
  await key('Escape');
  await until(`document.querySelector('#qoSheet').hidden`);
  await check(`['chooser','qoSheet','qoCurtain','help'].every(id=>document.getElementById(id).parentElement===document.body)`, '공용 패널이 확대 조절과 독립된 본문에 위치');

  await key('/');
  await until(`document.querySelector('#qoSheet').classList.contains('on') && document.querySelector('#qoIn .qo-row')`);
  await pause(400);
  await check(`(()=>{const r=document.querySelector('#qoSheet .qo-col').getBoundingClientRect(),bar=document.querySelector('#bar').getBoundingClientRect();return Math.abs(r.left+r.width/2-document.documentElement.clientWidth/2)<=1 && r.top>bar.bottom && r.width===640})()`, '팔레트는 창 가로 가운데, 헤더 아래에 뜬다');
  await check(`(()=>{const c=document.querySelector('#qoCurtain'),r=c.getBoundingClientRect(),bar=document.querySelector('#bar').getBoundingClientRect(),rail=document.querySelector('#rail').getBoundingClientRect(),p=document.querySelector('#qoSheet .qo-col').getBoundingClientRect();
    return getComputedStyle(c).opacity==='1' && Math.round(r.top)===Math.round(bar.bottom) && Math.round(r.left)===Math.round(rail.right) && r.right===document.documentElement.clientWidth && r.bottom===document.documentElement.clientHeight
      && document.elementFromPoint(document.documentElement.clientWidth-20,document.documentElement.clientHeight-20)===c && document.querySelector('#qoSheet').contains(document.elementFromPoint(p.left+p.width/2,p.top+p.height/2))})()`, '막이 레일 오른쪽 본문을 덮고 팔레트는 막 위에 있다');
  await click('#qoCurtain');
  await until(`document.querySelector('#qoSheet').hidden && document.querySelector('#qoCurtain').hidden`);
  await check(`document.activeElement.id!=='q'`, '막을 누르면 팔레트가 닫힌다');
  await key('/');
  await until(`document.querySelector('#qoSheet').classList.contains('on')`);
  await click('#railList .rt');
  await until(`document.querySelector('#qoSheet').hidden`);
  await check(`(()=>{const c=__clicks.at(-1);return c && c.trusted && document.querySelector('#rail').contains(document.getElementById(c.id))})()`, '막이 덮지 않는 레일을 눌러도 팔레트가 닫히고 누름은 레일에 닿는다');
  await key('/');
  await until(`document.querySelector('#qoSheet').classList.contains('on')`);
  await click('#qoSheet .qo-hint');
  await check(`document.activeElement.id==='q'`, '상자의 빈 곳을 눌러도 입력이 포커스를 지킨다');
  await key('Escape');
  await until(`document.querySelector('#qoSheet').hidden`);

  const empty = { ...state, version: state.version + 1, screen: 'empty', tabs: [], board: null, focus: null };
  for (const response of streams) response.write(`data: ${JSON.stringify({ type: 'state', state: empty })}\n\n`);
  await until(`document.querySelector('#startView').hidden===false && document.querySelector('#startView .qo-row')`);
  await pause(600);
  await check(`document.querySelector('#startView .qo-col') && !document.querySelector('#qoSheet .qo-col') && document.querySelector('#startView .qo-field')`, '시작 화면은 팔레트와 같은 상자를 쓴다');
  await check(`(()=>{const c=document.querySelector('#qoCurtain'),b=document.querySelector('#startView .qo-col').getBoundingClientRect(),m=document.querySelector('main').getBoundingClientRect();
    return c.hidden && getComputedStyle(c).opacity==='0' && document.querySelector('#startView').contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)) && Math.abs(b.left+b.width/2-(m.left+m.width/2))<=1})()`, '시작 화면에는 막이 없고 상자는 본문 가운데에 놓인다');
  await check(`__errors.length===0`, '브라우저 오류 없음');
  console.log(`완료: ${checked}개 검사`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  await rm(profile, { recursive: true, force: true });
  for (const response of streams) response.end();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
