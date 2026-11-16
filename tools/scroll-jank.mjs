// 인터랙티브 휠 스크롤 중 프레임 간격을 잰다 — 휠 전 · 휠 중 · 휠 뒤 세 구간의 rAF 간격(중앙값 · p95 · 최대 · 50ms 넘는 프레임 수)과 long task.
// 사용자 보고: "스크롤이 발동하면 그 다음 무조건 정크" — 그래서 휠이 멈춘 뒤 구간(after)까지 따로 낸다.
// 헤드리스(--disable-gpu)라 소프트웨어 래스터 숫자다. 실제 GPU 느낌은 사람이 본다.
//
//   node tools/scroll-jank.mjs <전용 프리뷰 서버 URL> [--index=0] [--size=original] [--runs=3] [--wheel=2500] [--idle=1500]
//
//   --device=<id> [--folded]  기기로 켠다(prevue focus --device 와 같다 — duo · fold8 · s26 …). --keep 은 /focus 를 보내지 않는다
//   --oneway [--delta=40]  한 방향으로만 굴린다(목록 끝에 닿으면 멎는다) — 방향 전환 틱이 섞이지 않는 실제 스크롤 모양
//   --drag [--hz=60]  휠 대신 마우스로 눌러 끈다(터치 드래그)
//   --headed       창 있는 Chrome(GPU 합성)으로 잰다 — 기본은 헤드리스 소프트웨어 래스터
//   --css='<규칙>'  페이지에 규칙을 주입해 A/B 한다(예: '#shot{object-fit:fill!important}')
// 데몬은 이 체크아웃의 plugin/bin/prevue 로 띄운 fixtures/pearl 이어야 한다(tests/viewer/README.md).
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { requireDaemon, toBoard } from '../tests/viewer/daemon.mjs';

const viewer = process.argv[2];
const args = Object.fromEntries(process.argv.slice(3).map(a => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
if (!viewer) { console.error('node tools/scroll-jank.mjs <URL>'); process.exit(2); }
await requireDaemon(viewer);
const pause = ms => new Promise(r => setTimeout(r, ms));
const index = Number(args.index || 0), size = args.size || 'original', runs = Number(args.runs || 3);
const wheelMs = Number(args.wheel || 2500), idleMs = Number(args.idle || 1500);
const profile = await mkdtemp(join(tmpdir(), 'prevue-scroll-jank-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  ...(args.headed ? [] : ['--headless=new', '--disable-gpu']), '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', '--window-size=1440,900', 'about:blank',
], { stdio: 'ignore' });
let ws, abort;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) { try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(100); } }
  if (!port) throw Error('Chrome 실행');
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const waiting = new Map();
  const traceEvents = []; let traceDone;
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.method === 'Tracing.dataCollected') traceEvents.push(...m.params.value); if (m.method === 'Tracing.tracingComplete') traceDone?.(); if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); } });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id, timer = setTimeout(() => reject(Error(`${method} 응답 시간 초과`)), 20_000);
    waiting.set(n, m => { clearTimeout(timer); m.error ? reject(Error(m.error.message)) : resolve(m.result); });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async (expression, ms = 30_000) => { for (const end = Date.now() + ms; Date.now() < end; await pause(80)) if (await evaluate(expression)) return; throw Error(`시간 초과: ${expression}`); };
  const post = (path, body = {}) => fetch(new URL(path, viewer), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

  await toBoard(viewer);
  await send('Page.enable');
  await send('Page.navigate', { url: viewer });
  await until(`!!document.querySelector('#shot')`);
  await evaluate(`import('/js/store.js').then(m=>window.__store=m.store)`);
  await until(`!!window.__store && !!__store.st`);
  const ready = () => until(`__store.st.focus?.interactive && !__store.st.busy && !__store.st.error && !document.querySelector('#stage').classList.contains('resize-hidden') && document.querySelector('#resizeScene').classList.contains('at-rest') && document.querySelector('#shot').getAttribute('src')?.startsWith('/stream')`);

  if (args.css) await send('Page.addScriptToEvaluateOnNewDocument', { source: `document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(args.css)};document.head.append(s)})` });
  if (args.css) await send('Page.navigate', { url: viewer });
  if (args.css) { await until(`!!document.querySelector('#shot')`); await evaluate(`import('/js/store.js').then(m=>window.__store=m.store)`); await until(`!!window.__store && !!__store.st`); }
  if (!args.keep) await post('/focus', { index, interactive: true, ...(size === 'original' ? {} : { size }), ...(args.device ? { device: args.device, folded: !!args.folded } : {}) });
  await ready(); await pause(Number(args.settle || 800)); // --settle=<ms> 진입 뒤 기다림 — 기기 사전 렌더(QuietFill)가 끝난 뒤를 재려면 길게

  // 페이지 안에서 rAF 간격을 구간 이름표와 함께 모은다.
  await evaluate(`(()=>{window.__j={phase:'before',frames:[],tasks:[],posts:[],urls:{}};const f0=window.fetch;window.fetch=function(u,o){const U=String(u);(__j.urls[__j.phase+' '+((o&&o.method)||'GET')+' '+U.split('?')[0]]??=[]).push(Math.round(performance.now()));if(!U.endsWith('/viewer/wheel')&&!U.endsWith('/viewer/touch'))return f0.apply(this,arguments);const t=performance.now(),ph=__j.phase;return f0.apply(this,arguments).then(r=>{__j.posts.push([ph,performance.now()-t,t]);return r})};let last=performance.now();
    const tick=t=>{window.__j.frames.push([window.__j.phase,t-last]);last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);
    new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__j.tasks.push([window.__j.phase,e.duration]))).observe({type:'longtask',buffered:false});})()`);
  const rect = await evaluate(`(()=>{const r=document.querySelector('#shot').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);

  const stat = (list) => {
    const a = list.map(f => f[1]).sort((x, y) => x - y), q = p => a[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)] ?? 0;
    return { n: a.length, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), max: +(a[a.length - 1] ?? 0).toFixed(1), over50: a.filter(v => v > 50).length };
  };
  const streamUrl = await evaluate(`document.querySelector('#shot').getAttribute('src')`);
  const arrivals = [];
  let phaseNow = 'before';
  abort = new AbortController();
  (async () => {
    const res = await fetch(new URL(streamUrl, viewer), { signal: abort.signal });
    const soi = Buffer.from([0xff, 0xd8, 0xff]);
    let tail = Buffer.alloc(0);
    for await (const chunk of res.body) {
      const now = performance.now(), buf = Buffer.concat([tail, chunk]);
      // 큰 프레임에서 JS 바이트 루프가 뒤처져 도착 시각이 뭉치지 않게 네이티브 indexOf 로 찾는다
      for (let at = buf.indexOf(soi); at >= 0; at = buf.indexOf(soi, at + 3)) arrivals.push([phaseNow, now]);
      tail = buf.subarray(Math.max(0, buf.length - 2));
    }
  })().catch(() => {});
  const results = [];
  for (let run = 0; run < runs; run++) {
    await evaluate(`__j.frames.length=0;__j.tasks.length=0;__j.phase='before'`); phaseNow = 'before'; arrivals.length = 0;
    await pause(idleMs);
    if (args.trace) await send('Tracing.start', { categories: 'cc,viz,blink,toplevel,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
    await evaluate(`__j.phase='wheel'`); phaseNow = 'wheel'; const wheelStart = Date.now();
    if (args.drag) {
      // 실제 마우스로 눌러 끈다(스마트폰 터치처럼) — 뷰어의 mousedown · mousemove · mouseup 경로를 그대로 탄다. 위아래로 번갈아 끌어 끝에 닿지 않게 한다.
      const hz = Number(args.hz || 60), at = y => ({ x: rect.x, y, button: 'left', buttons: 1, clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x, y: rect.y });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at(rect.y) });
      const t0 = Date.now();
      for (let k = 0; Date.now() - t0 < wheelMs; k++) {
        const ph = ((Date.now() - t0) % 1200) / 1200, off = (ph < 0.5 ? ph : 1 - ph) * 2 * 240;
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at(rect.y - off) });
        await pause(1000 / hz);
      }
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at(rect.y) });
    } else {
    // 트랙패드처럼 프레임마다 휠 한 번 — CDP 의 Input.dispatchMouseEvent 는 ~50ms 에 하나로 묶여 실제 부하보다 약하다. 맨 위 · 맨 아래에 닿아 프레임이 멎지 않게 6프레임 아래 · 5프레임 위로 번갈아 조금씩 아래로 흐른다(300ms 씩 바꾸면 맨 위에서 위로 굴리는 구간이 '정크'로 잡힌다).
    await evaluate(`new Promise(done=>{const el=document.querySelector('#shot'),end=performance.now()+${wheelMs};
      let n=0;const tick=t=>{if(t>=end)return done();const dir=${args.oneway?'1':'(n++%11)<6?1:-1'};
        el.dispatchEvent(new WheelEvent('wheel',{deltaY:${Number(args.delta||40)}*dir,deltaMode:0,clientX:${rect.x},clientY:${rect.y},bubbles:true,cancelable:true}));requestAnimationFrame(tick)};requestAnimationFrame(tick)})`);
    }
    await evaluate(`__j.phase='after'`); phaseNow = 'after';
    if (args.trace) {
      traceEvents.length = 0;
      const done = new Promise(r => { traceDone = r; });
      await send('Tracing.end'); await done;
      // 합성기의 그리기(DrawAndSwap) 간격과 이미지 디코드 · 래스터 시간 — rAF 에는 안 잡히는 브라우저 쪽 비용
      const ms = ev => ev.dur / 1000;
      const draws = traceEvents.filter(e => e.name === 'Display::DrawAndSwap' && e.ph === 'X').sort((a, b) => a.ts - b.ts);
      const gaps = draws.slice(1).map((e, k) => ['d', (e.ts - draws[k].ts) / 1000]);
      const sum = name => { const a = traceEvents.filter(e => e.name === name && e.ph === 'X').map(ms).sort((x, y) => x - y); return { n: a.length, total: +a.reduce((x, y) => x + y, 0).toFixed(1), p95: +(a[Math.ceil(a.length * 0.95) - 1] ?? 0).toFixed(2), max: +(a[a.length - 1] ?? 0).toFixed(2) }; };
      console.log(JSON.stringify({ trace: { draw: stat(gaps), decode: sum('ImageDecodeTask'), decodeImage: sum('Decode Image'), raster: sum('RasterTask'), mainFrame: sum('ProxyMain::BeginMainFrame'), paint: sum('Paint') } }));
    }
    await pause(idleMs);
    const j = await evaluate(`({frames:__j.frames,tasks:__j.tasks,posts:__j.posts,urls:__j.urls,res:performance.getEntriesByType('resource').slice(-400).map(e=>[Math.round(e.startTime),Math.round(e.duration),e.initiatorType,e.name.replace(location.origin,'').split('?')[0]])})`);
    if (args.urls) console.log(JSON.stringify({ urls: Object.fromEntries(Object.entries(j.urls).map(([k, v]) => [k, v.length])), res: j.res }));
    const row = { run: run + 1, wheelStart, wheelEnd: wheelStart + wheelMs };
    for (const phase of ['before', 'wheel', 'after']) {
      const at = arrivals.filter(a => a[0] === phase).map(a => a[1]);
      const gaps = at.slice(1).map((t, k) => ['s', t - at[k]]);
      row[phase] = { ...stat(j.frames.filter(f => f[0] === phase)), longtasks: j.tasks.filter(t => t[0] === phase).length, wheelPost: (() => { const p = j.posts.filter(x => x[0] === phase); const st = stat(p.map(x => ['p', x[1]])); const gaps = p.slice(1).map((x, k) => ['g', x[2] - p[k][2]]); return { n: p.length, rttMedian: st.median, rttP95: st.p95, rttMax: st.max, startEveryMs: stat(gaps).median }; })(), stream: { frames: at.length, ...(({ median, p95, max, over50 }) => ({ median, p95, max, over50 }))(stat(gaps)) } };
    }
    results.push(row);
    console.log(JSON.stringify(row));
  }
  console.log(JSON.stringify({ viewer, index, size, runs, wheelMs, idleMs, note: 'headless software raster' }));
} finally {
  try { ws?.close(); } catch {}
  try { abort?.abort(); } catch {}
  chrome.kill();
}
