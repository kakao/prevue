import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir, platform, arch, cpus } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { requireDaemon, toBoard } from './daemon.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const viewer = args[0];
assert(viewer && !viewer.startsWith('--'), 'node tests/viewer/baseline.mjs <전용 Pearl 뷰어 URL> [--samples 30] [--output 파일] [--check 기준 JSON]');
assert(typeof WebSocket === 'function', 'Node 22 이상이 필요하다');
assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(viewer).hostname), '전용 로컬 픽스처에서만 실행한다');
await requireDaemon(viewer);
const samples = Number(option('--samples', 30));
assert(Number.isInteger(samples) && samples >= 10, '--samples는 10 이상의 정수');
const output = resolve(option('--output', join(root, '.cache/viewer-baseline', `${Date.now()}.json`)));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const files = async dir => (await Promise.all((await readdir(dir, { withFileTypes: true })).map(entry => {
  const path = join(dir, entry.name);
  return entry.isDirectory() ? files(path) : /\.(js|css)$/.test(entry.name) ? [path] : [];
}))).flat();
const assets = await Promise.all((await files(join(root, 'plugin/viewer'))).sort().map(async path => {
  const data = await readFile(path);
  return { file: path.slice(root.length + 1), rawBytes: data.length, gzipBytes: gzipSync(data, { level: 9 }).length };
}));
const size = {
  rawBytes: assets.reduce((sum, asset) => sum + asset.rawBytes, 0),
  gzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
  assets,
};

// 테스트의 메시지 재생만 가로챈다. 실제 SSE의 boot와 상태 모양은 그대로 쓴다.
function instrument() {
  window.__bench = { states: [], errors: [], warnings: [], replaying: false, serial: 0 };
  const bench = window.__bench;
  addEventListener('error', event => {
    const list = event.message === 'ResizeObserver loop completed with undelivered notifications.' ? bench.warnings : bench.errors;
    list.push(event.message);
  });
  addEventListener('unhandledrejection', event => bench.errors.push(String(event.reason)));
  const NativeSource = EventSource;
  window.EventSource = class extends NativeSource {
    constructor(...args) {
      super(...args);
      bench.source = this;
      this.addEventListener('message', event => {
        if (bench.replaying && event.isTrusted) { event.stopImmediatePropagation(); return; }
        const arrived = performance.now();
        const message = JSON.parse(event.data);
        if (message.type !== 'state') return;
        bench.latest = message.state;
        if (!bench.replaying) bench.states.push(message.state);
        if (bench.pending && message.state.who === bench.pending.marker) bench.pending.arrived = arrived;
      });
    }
  };
  const matches = state => {
    const board = document.querySelector('#boardView');
    const focus = document.querySelector('#focusView');
    const tab = document.querySelector('#railList [aria-selected="true"]');
    if (tab?.dataset.key !== state.tabs.find(tab => tab.active)?.key) return false;
    if (state.screen === 'board') {
      const cards = state.board.groups.flatMap(group => group.cards);
      if (!board || board.hidden || !focus?.hidden || document.querySelectorAll('#cards .card').length !== cards.length) return false;
      return cards.every(card => {
        const node = document.querySelector('#cards .card[data-i="' + card.index + '"]');
        return node && node.querySelector('.fn')?.textContent === card.label &&
          (!card.ok || node.querySelector('.cstage img')?.getAttribute('src') === card.imageUrl);
      });
    }
    return state.screen === 'focus' && focus && !focus.hidden && board?.hidden &&
      document.querySelector('#wsName')?.textContent === (state.focus.name || state.focus.fn || state.focus.previewId) &&
      document.querySelector('#shot')?.getAttribute('src')?.startsWith(state.focus.streamUrl || state.focus.imageUrl);
  };
  const observe = () => {
    const p = bench.pending;
    if (!p?.arrived || document.querySelector('#who')?.textContent !== p.marker || !matches(p.state)) return;
    const domMs = performance.now() - p.arrived;
    bench.pending = null;
    clearTimeout(p.timer);
    p.resolve({ domMs, version: p.state.version });
  };
  new MutationObserver(observe).observe(document, { subtree: true, childList: true, attributes: true, characterData: true });
  bench.replay = state => new Promise((resolve, reject) => {
    if (bench.pending) throw Error('겹친 측정');
    bench.replaying = true;
    const marker = 'viewer-baseline-' + ++bench.serial;
    const next = { ...state, boot: bench.latest.boot, version: bench.latest.version + 1, who: marker };
    const timer = setTimeout(() => { bench.pending = null; reject(Error('DOM 반영 시간 초과: ' + marker)); }, 10000);
    bench.pending = { marker, state: next, timer, resolve };
    bench.source.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'state', state: next }) }));
  });
  bench.idle = () => new Promise((resolve, reject) => {
    const end = performance.now() + 10000;
    const check = () => {
      const moving = document.getAnimations().some(animation => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity);
      if (!moving && !document.querySelector('.morph') && !document.documentElement.classList.contains('vt-tab') && !document.documentElement.classList.contains('vt-workspace')) {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      } else if (performance.now() > end) reject(Error('전환 완료 대기 시간 초과: ' + document.documentElement.className));
      else setTimeout(check, 20);
    };
    check();
  });
}

const profile = await mkdtemp(join(tmpdir(), 'prevue-baseline-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: 'ignore' });
let chromeError;
chrome.on('error', error => { chromeError = error; });
let ws, initial, openedKey;
const post = async (path, body = {}) => {
  const response = await fetch(new URL(path, viewer), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert(response.ok, `${path}: HTTP ${response.status}`);
  const result = await response.json();
  assert(result.ok !== false, JSON.stringify(result));
  return result;
};
try {
  let port;
  for (let i = 0; i < 100 && !port && !chromeError && chrome.exitCode === null && chrome.signalCode === null; i++) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(100); }
  }
  assert(port, `Chrome 실행: ${chromeError?.message || chrome.signalCode || chrome.exitCode || 'DevTools 포트 시간 초과'}`);
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
  ws = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { waiting.get(message.id)?.(message); waiting.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id, timer = setTimeout(() => { waiting.delete(n); reject(Error(`${method} 시간 초과`)); }, 30000);
    waiting.set(n, message => { clearTimeout(timer); message.error ? reject(Error(message.error.message)) : resolve(message.result); });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const response = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (response.exceptionDetails) throw Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  const until = async expression => {
    for (const end = Date.now() + 30000; Date.now() < end; await pause(50)) if (await evaluate(expression)) return;
    throw Error(`시간 초과: ${expression}`);
  };
  const stateOf = async file => {
    await until(`__bench.states.some(s=>s.board?.file===${JSON.stringify(file)} && s.screen==='board' && !s.busy && s.board.groups.every(g=>g.cards.every(c=>c.rendered && c.ok)))`);
    return evaluate(`__bench.states.findLast(s=>s.board?.file===${JSON.stringify(file)} && s.screen==='board' && !s.busy && s.board.groups.every(g=>g.cards.every(c=>c.rendered && c.ok)))`);
  };
  const replay = async state => {
    const result = await evaluate(`__bench.replay(${JSON.stringify(state)})`);
    await evaluate('__bench.idle()');
    return result;
  };
  const status = await fetch(new URL('/status', viewer)).then(response => response.json());
  assert.equal(status.root, join(root, 'plugin'), '이 체크아웃의 데몬');
  const current = await fetch(new URL('/viewer/state', viewer)).then(response => response.json());
  const fixture = resolve(root, 'fixtures/pearl/feature/pearl/src/main/kotlin/com/example/pearl/feature/pearl');
  assert.equal(current.board?.file, join(fixture, 'AdaptivePreviews.kt'), '이 체크아웃의 AdaptivePreviews.kt 전용 데몬');
  initial = await toBoard(viewer);
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }, { name: 'prefers-color-scheme', value: 'light' }] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(${instrument.toString()})()` });
  const url = new URL(viewer); url.searchParams.set('lang', 'en');
  await send('Page.navigate', { url: url.href });
  await stateOf(initial.board.file);
  const boardFile = join(fixture, 'PearlPreviews.kt');
  await evaluate('__bench.states=[]');
  await post('/viewer/open', { file: boardFile });
  const board = await stateOf(boardFile);
  const active = board.tabs.find(tab => tab.active);
  if (!initial.tabs.some(tab => tab.key === active.key)) openedKey = active.key;
  assert.equal(board.board.groups.flatMap(group => group.cards).length, 30, 'Pearl 보드 30장');
  await evaluate('__bench.states=[]');
  await post('/viewer/focus', { index: board.board.groups[0].cards[0].index });
  await until(`__bench.states.some(s=>s.screen==='focus' && !s.busy && s.focus?.streamUrl)`);
  const focus = await evaluate(`__bench.states.findLast(s=>s.screen==='focus' && !s.busy && s.focus?.streamUrl)`);
  await evaluate('__bench.states=[]');
  await post('/viewer/exit');
  await stateOf(boardFile);
  await evaluate('__bench.states=[]');
  await post('/viewer/tab', { key: initial.tabs.find(tab => tab.active).key });
  const other = await stateOf(initial.board.file);
  // 이후에는 원래 SSE가 새 버전을 끼워 넣지 않도록 재생 모드에서만 잰다.
  await evaluate('__bench.replaying=true');
  const scenarios = { board: [board], focus: [focus], tab: [board, other] };
  const results = {};
  for (const [name, states] of Object.entries(scenarios)) {
    console.error(`측정: ${name} (예열 5회 + ${samples}회)`);
    await replay(states.at(-1));
    for (let i = 0; i < 5; i++) await replay(states[i % states.length]);
    const values = [];
    for (let i = 0; i < samples; i++) {
      const state = states[(i + 5) % states.length];
      values.push(Number((await replay(state)).domMs.toFixed(3)));
    }
    const sorted = [...values].sort((a, b) => a - b);
    results[name] = {
      samplesMs: values, medianMs: sorted[Math.ceil(sorted.length * .5) - 1], p90Ms: sorted[Math.ceil(sorted.length * .9) - 1], maxMs: sorted.at(-1),
      cards: states.map(state => state.board.groups.flatMap(group => group.cards).length),
    };
  }
  assert.deepEqual(await evaluate('__bench.errors'), [], '브라우저 오류 0');
  const result = {
    format: 1, measuredAt: new Date().toISOString(), revision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    environment: { platform: platform(), arch: arch(), cpu: cpus()[0].model, node: process.version, browser: (await send('Browser.getVersion')).product, viewport: [1440, 900], deviceScaleFactor: 1, reducedMotion: false },
    harnessSha256: createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),
    method: 'synthetic message replay through native EventSource; real Pearl SSE states; version and who marker replaced; arrival to matching DOM MutationObserver; decode and animation completion excluded',
    size, scenarios: results, warnings: await evaluate('__bench.warnings'),
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ output, rawBytes: size.rawBytes, gzipBytes: size.gzipBytes, warnings: result.warnings.length, scenarios: Object.fromEntries(Object.entries(results).map(([name, value]) => [name, { medianMs: value.medianMs, p90Ms: value.p90Ms }])) }, null, 2));
  if (args.includes('--check')) {
    const baseline = JSON.parse(await readFile(resolve(option('--check')), 'utf8'));
    assert(size.rawBytes <= baseline.limits.rawBytes, `JS+CSS 원본 ${size.rawBytes} > ${baseline.limits.rawBytes}`);
    assert(size.gzipBytes <= baseline.limits.gzipBytes, `JS+CSS gzip ${size.gzipBytes} > ${baseline.limits.gzipBytes}`);
    for (const [name, value] of Object.entries(results)) assert(value.p90Ms <= baseline.limits.p90Ms[name], `${name} p90 ${value.p90Ms} > ${baseline.limits.p90Ms[name]}`);
    console.error('기준선 상한 통과');
  }
} finally {
  ws?.close();
  if (!chromeError && chrome.exitCode === null && chrome.signalCode === null) {
    const exited = new Promise(resolve => chrome.once('exit', resolve));
    chrome.kill();
    await exited;
  }
  try {
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  } finally {
    if (initial) {
      await post('/viewer/exit');
      if (openedKey) await post('/viewer/close', { key: openedKey });
      await post('/viewer/tab', { key: initial.tabs.find(tab => tab.active).key });
      await toBoard(viewer);
    }
  }
}
