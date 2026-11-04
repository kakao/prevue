import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureContrast } from './contrast-measure.ts';

// 대비 실측 — tokens.css 의 역할 색을 라이트 · 다크 면에서 풀어 contrast-pairs.json 의 쌍마다 기준을 넘는지 잰다.
// 데몬 없이 돈다(Node 22.18 이상 — 계산을 TS 파일에서 읽는다): node tests/viewer/contrast.mjs [--plant <역할>=<역할> …]
// --plant 는 앞 역할을 뒤 역할로 덮어 미달을 심는다. 그물이 미달을 잡는지 보려는 것이라 이때는 실패해야 맞다.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pairs = JSON.parse(await readFile(join(root, 'tests/viewer/contrast-pairs.json'), 'utf8'));
const args = process.argv.slice(2);
const plants = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--plant' || !/^[\w-]+=[\w-]+$/.test(args[i + 1] || '')) { console.error('쓰는 법: node tests/viewer/contrast.mjs [--plant <역할>=<역할> …]'); process.exit(2); }
  plants.push(args[++i].split('='));
}
const planted = plants.map(([role, to]) => `--${role}: var(--${to});`).join(' ');
const page = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/tokens.css">
<style>.sheet { background: var(--surface); color: var(--on-surface); } ${planted ? `[data-theme] { ${planted} }` : ''}</style></head>
<body><div class="sheet" data-theme="light"></div><div class="sheet" data-theme="dark"></div></body></html>`;

const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/') { response.setHeader('Content-Type', 'text/html'); response.end(page); }
  else if (path === '/tokens.css') { response.setHeader('Content-Type', 'text/css'); response.end(await readFile(join(root, 'plugin/viewer/tokens.css'))); }
  else response.writeHead(404).end();
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(tmpdir(), 'prevue-contrast-check-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: 'ignore' });
const pause = ms => new Promise(ok => setTimeout(ok, ms));

let ws;
let failed = false;
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

  await send('Page.enable');
  await send('Page.navigate', { url: origin + '/' });
  let loaded = false;
  for (const end = Date.now() + 5000; Date.now() < end && !loaded; await pause(50)) {
    loaded = await evaluate(`document.readyState==='complete' && getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()!==''`);
  }
  assert(loaded, 'tokens.css 를 읽지 못했다');
  const { rows, missing, unbacked } = await evaluate(`(${measureContrast})(${JSON.stringify(pairs)}, [...document.querySelectorAll('.sheet')])`);
  for (const row of rows) {
    // NaN 은 CDP 를 지나며 null 이 된다.
    const measured = Number.isFinite(row.ratio);
    const verdict = !measured ? '못 잼' : row.need === 0 ? '면제' : row.ratio >= row.need ? '통과' : '미달';
    console.log(`${verdict}  ${row.theme.padEnd(5)}  --${row.fg} 위 --${row.bg}  ${measured ? `${row.ratio.toFixed(2)}:1` : '—'}${row.need ? ` (기준 ${row.need}:1)` : ''}`);
  }
  const misses = rows.filter(r => Number.isFinite(r.ratio) && r.need > 0 && r.ratio < r.need);
  if (missing.length) { failed = true; console.error(`tokens.css 에 없는 역할: ${missing.map(r => `--${r}`).join(' · ')}`); }
  if (unbacked.length) { failed = true; console.error(`바탕이 끝까지 반투명해 잴 수 없는 쌍(bg 끝에 불투명한 면을 둔다): ${unbacked.join(' · ')}`); }
  if (misses.length) { failed = true; console.error(`미달 ${misses.length}개`); }
  if (!failed) console.log(`완료: ${rows.length}개 쌍, 미달 0`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(ok => chrome.exitCode !== null ? ok() : chrome.once('exit', ok));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  server.closeAllConnections();
  await new Promise(ok => server.close(ok));
}
if (failed) process.exit(1);
