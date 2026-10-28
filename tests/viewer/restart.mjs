// 다시 읽기(warmup → start)로 데몬이 다시 떠도 보던 탭이 이어받는지 본다(D-112).
// node tests/viewer/restart.mjs <뷰어 URL> <프리뷰 파일> [warmup 추가 인자…]
// 데몬은 그 파일의 보드로 미리 떠 있어야 한다. warmup 은 대상 저장소에 Gradle 을 부르므로 픽스처에만 쓴다.
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [viewer, file, ...extra] = process.argv.slice(2);
assert(viewer && file, 'node tests/viewer/restart.mjs <뷰어 URL> <프리뷰 파일> [warmup 추가 인자…]');
const prevue = join(dirname(fileURLToPath(import.meta.url)), '../../plugin/bin/prevue');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const lastJson = out => JSON.parse(out.trim().split('\n').at(-1));
const run = async args => lastJson((await promisify(execFile)(prevue, args, { encoding: 'utf8', env: { ...process.env, NO_OPEN: '1' } })).stdout);
const profile = await mkdtemp(join(tmpdir(), 'prevue-restart-chrome-'));
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
  const until = async (expression, ms = 60000) => {
    for (const end = Date.now() + ms; Date.now() < end; await pause(100)) if (await evaluate(expression).catch(() => false)) return;
    throw Error(`시간 초과: ${expression}`);
  };
  const check = async (expression, label) => { assert(await evaluate(expression), label); console.log(`통과 ${++checked}: ${label}`); };
  const rendered = `(()=>{const c=[...document.querySelectorAll('#boardView .card')];return !document.querySelector('#boardView').hidden&&c.length>0&&c.every(e=>e.querySelector('img')?.complete)})()`;
  const pill = `(document.querySelector('#status').dataset.state+'|'+document.querySelector('#statusText').textContent+'|'+document.querySelector('#strip').classList.contains('on'))`;

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: viewer });
  await until(rendered);
  await evaluate('window.__before = true');
  await check(`document.querySelector('#status').dataset.state !== 'error'`, '보드가 뜬다');

  // warmup 이 데몬을 내리는 동안 · 새 데몬이 뜨기 전까지 표시를 계속 적어 둔다 — 한 번이라도 끊김이면 실패다
  const seen = new Set();
  let watching = true;
  const watch = (async () => { while (watching) { const v = await evaluate(`window.__before ? ${pill} : 'reloaded'`).catch(() => 'navigating'); seen.add(v); await pause(50); } })();
  const warm = await run(['warmup', file, ...extra]);
  assert(warm.ok, `warmup: ${JSON.stringify(warm)}`);
  await until(`window.__before && ${pill}.startsWith('busy|')`, 10000);
  await check(`!document.querySelector('#boardView').hidden && document.querySelectorAll('#boardView .card img').length > 0`, '데몬이 내려가도 보드가 남는다');
  const started = await run(warm.next.replace(/^prevue /, '').split(' '));
  assert.equal(started.reattached, true, `start 가 보던 탭에 맡긴다: ${JSON.stringify(started)}`);
  assert.equal(started.preparationViewer, undefined, '새 준비 화면 주소를 내지 않는다');
  console.log(`통과 ${++checked}: start 가 새 탭을 열지 않는다(reattached)`);
  await until(`!window.__before && ${rendered}`);
  watching = false; await watch;
  const states = [...seen].filter(v => v !== 'reloaded' && v !== 'navigating');
  // 빨간 알약 자체는 옛 데몬의 낡음(Gradle 이 산출물을 다시 쓴다)일 수 있다 — 보는 것은 끊김 문구와 오류 캡슐이다
  assert(!states.some(v => v.split('|')[1] === 'Disconnected' || v.endsWith('|true')), `끊김 · 오류 캡슐이 보였다: ${states.join(' / ')}`);
  assert(states.some(v => v.includes('Restarting')), `다시 시작 표시가 없었다: ${states.join(' / ')}`);
  console.log(`통과 ${++checked}: 끊김 없이 다시 시작 표시 뒤 그 자리에서 새 데몬의 보드로 바뀐다`);
  await check(`document.querySelector('#status').dataset.state !== 'error'`, '새 데몬에 붙어 있다');

  // 숨은 탭은 스트림을 닫아(api.js) 다시 시작 알림을 못 받는다 — 다시 보이면 새 데몬의 화면으로 다시 열어야 한다.
  // 상태 번호는 데몬마다 0부터라 번호로 거르면 옛 화면에 멈춘다.
  await evaluate(`window.__before = true; window.__hidden = true; Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hidden }); document.dispatchEvent(new Event('visibilitychange'))`);
  const hiddenWarm = await run(['warmup', file, ...extra]);
  await run(hiddenWarm.next.replace(/^prevue /, '').split(' '));
  await evaluate(`window.__hidden = false; document.dispatchEvent(new Event('visibilitychange'))`);
  await until(`!window.__before && ${rendered}`);
  console.log(`통과 ${++checked}: 숨어 있던 탭이 다시 보이면 새 데몬의 보드로 다시 연다`);

  // 일부러 내리지 않은 끊김은 지금처럼 바로 끊김이다
  await evaluate('window.__before = true');
  await fetch(new URL('/shutdown', viewer), { method: 'POST', body: '{}' });
  await until(`window.__before && document.querySelector('#statusText').textContent === 'Disconnected'`, 10000);
  console.log(`통과 ${++checked}: 그냥 내린 데몬은 바로 끊김이다`);
} finally {
  ws?.close();
  chrome.kill();
  await pause(300); await rm(profile, { recursive: true, force: true }).catch(() => {});
}
