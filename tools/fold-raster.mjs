// 접는 동안의 래스터 비용을 잰다 — tests/viewer/fold.mjs 와 같은 하네스로 펼친 자연 방향에서 접고,
// 33ms 간격 31프레임을 실제 프레임으로 그리며 CDP 트레이스의 RasterTask 합계(ms)를 낸다.
// 헤드리스(--disable-gpu)라 소프트웨어 래스터 숫자다. 실제 GPU 프레임 시간은 사람이 본다.
//
//   node tools/fold-raster.mjs [--root=<체크아웃>] [--devices=fold8,duo] [--arrivals=cached,late] [--runs=3] [--layers] [--shots=<폴더>]
//
// --root 로 다른 체크아웃(예: git archive 로 푼 develop)의 plugin/viewer 를 같은 조건에서 잰다.
// raster 는 RasterTask, main 은 ProxyMain::BeginMainFrame, draw 는 Display::DrawAndSwap 의 합 — 흐림이 합성 단계로 옮겨 가면
// raster 가 줄어도 draw 가 늘 수 있어 셋을 함께 낸다. 첫 회는 데우기로 버리고 나머지의 중앙값을 낸다.
// --layers 는 둘째 회의 층별 래스터(층 id · 타일 수 · ms · 요소)를 찍는다 — 어느 층이 매 프레임 다시 그려지는지 볼 때 쓴다.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const root = resolve(args.root || join(dirname(fileURLToPath(import.meta.url)), '..'));
const runs = Number(args.runs || 3), shots = args.shots;
const want = (args.devices || 'fold8,ultra,duo,pixelfold,flip8').split(','), arrivals = (args.arrivals || 'cached,late').split(',');
const markup = (await readFile(join(root, 'plugin/viewer/index.html'), 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
// fold.mjs 와 같은 하네스 — 장면의 시계만 쥐고, 프레임은 진짜 rAF 두 번으로 그려지게 기다린다.
const harness = `<script type="module">
import { createResizeScene } from '/js/resize-scene.js';
const realRaf = window.requestAnimationFrame.bind(window);
document.body.classList.add('resizing-ui','ws');
document.querySelector('main').style.cssText='position:fixed;inset:0;width:100%;height:100%;padding:0;margin:0';
document.querySelector('.bar').hidden=true;
document.querySelector('#stage').hidden=true;
document.querySelector('#panel').hidden=false;
document.querySelector('#focusView').hidden=false;
document.querySelector('#focusView').style.cssText='position:absolute;inset:0';
document.querySelector('#focusView .wrap').style.cssText='position:absolute;inset:0;height:100%;margin:0;padding:0';
window.time=0;window.rafs=new Map();let serial=0;
performance.now=()=>time;
window.requestAnimationFrame=fn=>{rafs.set(++serial,fn);return serial};
window.cancelAnimationFrame=id=>rafs.delete(id);
window.step=t=>{time=t;const batch=[...rafs.values()];rafs.clear();batch.forEach(fn=>fn(t))};
window.frame=()=>new Promise(r=>realRaf(()=>realRaf(r)));
window.scene=createResizeScene(document.querySelector('#resizeScene'), {request(sel){scene.update(states[sel])},layout(){}});
window.spec=(w,h)=>({url:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" fill="white"/><path d="M0 0H80V160H0Z" fill="tomato"/><path d="M'+(w/2-60)+' '+(h/2)+'h120l-40 -40m40 40l-40 40" fill="none" stroke="teal" stroke-width="20"/><circle cx="'+(w-50)+'" cy="'+(h-50)+'" r="40" fill="teal"/></svg>'),dpW:w,dpH:h,edge:'rgb(255,255,255)'});
window.reset=st=>{scene.enable(false);scene.setOriginal(360,740,spec(360,740));scene.enable(true);scene.image(st.sel,spec(st.w,st.h));scene.update(st,true);step(time+2000)};
scene.setOriginal(360,740,spec(360,740));
scene.enable(true);
window.ready=true;
</script>`;
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/') { response.setHeader('Content-Type', 'text/html'); response.end(markup + harness); return; }
  const file = resolve(root, 'plugin/viewer', '.' + path);
  if (!file.startsWith(join(root, 'plugin/viewer') + '/')) { response.writeHead(404).end(); return; }
  try {
    const body = await readFile(file);
    response.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream');
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const profile = await mkdtemp(join(tmpdir(), 'prevue-fold-raster-'));
const chrome = spawn(process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank',
], { stdio: 'ignore' });
const pause = ms => new Promise(r => setTimeout(r, ms));
let ws;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) { try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await pause(100); } }
  if (!port) throw Error('Chrome 실행');
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const waiting = new Map(), listeners = new Set();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); } else listeners.forEach(f => f(m));
  });
  const send = (method, params = {}) => new Promise((ok, no) => {
    const n = ++id;
    waiting.set(n, m => m.error ? no(Error(`${method}: ${m.error.message}`)) : ok(m.result));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  for (let i = 0; i < 100 && !(await evaluate('!!window.ready').catch(() => false)); i++) await pause(50);
  // fold.mjs 의 기기 표와 자세 — 펼친 자연 방향에서 접는다. Fold8 · Duo 는 손에 든 회전의 짝으로 접힌다.
  const DEVICES = { fold8: [932.57, 704, 475.43, 751.24], ultra: [752, 834.67, 360, 840], duo: [951, 669, 466, 678], pixelfold: [851.69, 882.87, 443.08, 994.46], flip8: [360, 840, 399.16, 441.26] };
  const COVER = { fold8: 'portrait', duo: 'landscape-right' };
  const pose = (device, folded, orientation, [ow, oh, cw, ch]) => {
    const [w, h] = folded ? [cw, ch] : [ow, oh], rot = (orientation !== 'portrait') !== (w > h);
    return { sel: device + ':' + (folded ? 'cover' : 'open') + (rot ? ':rot' : '') + (orientation === 'landscape-right' ? ':right' : ''), w: rot ? h : w, h: rot ? w : h };
  };
  const layerNames = async () => {
    let layers;
    const grab = m => { if (m.method === 'LayerTree.layerTreeDidChange' && m.params.layers) layers = m.params.layers; };
    listeners.add(grab);
    await send('DOM.getDocument', { depth: -1 });
    await send('LayerTree.enable');
    await evaluate('frame()');
    await pause(200);
    listeners.delete(grab);
    const names = {};
    for (const l of layers || []) {
      let name = '';
      if (l.backendNodeId) {
        const node = (await send('DOM.describeNode', { backendNodeId: l.backendNodeId }).catch(() => null))?.node;
        const attrs = node?.attributes || [], at = attrs.indexOf('class');
        if (node) name = node.localName + (at >= 0 ? '.' + attrs[at + 1].replace(/ /g, '.') : '');
      }
      names[l.layerId] = `${name} ${Math.round(l.width)}x${Math.round(l.height)}`;
    }
    await send('LayerTree.disable');
    return names;
  };
  for (const device of want) for (const arrival of arrivals) {
    const size = DEVICES[device], natural = size[0] > size[1] ? 'landscape-left' : 'portrait';
    const from = pose(device, false, natural, size), to = pose(device, true, COVER[device] || natural, size);
    const sums = [];
    for (let run = 0; run <= runs; run++) {
      await evaluate(`window.states=${JSON.stringify({ [from.sel]: from, [to.sel]: to })};reset(${JSON.stringify(from)});
        ${arrival === 'cached' ? `scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}));` : ''}
        Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode().catch(()=>{}))).then(frame)`);
      const events = [];
      let complete;
      const done = new Promise(r => { complete = r; });
      const collect = m => {
        if (m.method === 'Tracing.dataCollected') events.push(...m.params.value);
        if (m.method === 'Tracing.tracingComplete') complete();
      };
      listeners.add(collect);
      await send('Tracing.start', { categories: 'cc,viz,blink,toplevel,disabled-by-default-devtools.timeline', transferMode: 'ReportEvents' });
      await evaluate(`window.t0=time;scene.update(${JSON.stringify(to)});frame()`);
      let names = null;
      const pictures = [];
      for (let i = 0; i < 31; i++) {
        await evaluate(`step(t0+${i * 33});frame()`);
        if (args.layers && run === 1 && i === 15) names = await layerNames();
        if (shots && run === 1 && i % 5 === 0 && i > 0) pictures.push([i, (await send('Page.captureScreenshot', { format: 'png' })).data]);
      }
      await send('Tracing.end');
      await done;
      listeners.delete(collect);
      if (run === 0) continue;
      const sum = { raster: 0, main: 0, draw: 0 }, perLayer = {};
      for (const e of events) {
        if (e.ph !== 'X' || !e.dur) continue;
        if (e.name === 'RasterTask') {
          sum.raster += e.dur;
          const layer = e.args?.tileData?.layerId ?? '?';
          perLayer[layer] ??= { tiles: 0, us: 0 };
          perLayer[layer].tiles++; perLayer[layer].us += e.dur;
        } else if (e.name === 'ProxyMain::BeginMainFrame') sum.main += e.dur;
        else if (e.name === 'Display::DrawAndSwap') sum.draw += e.dur;
      }
      sums.push(sum);
      if (names) {
        for (const [layer, v] of Object.entries(perLayer).sort((a, b) => b[1].us - a[1].us).slice(0, 15))
          console.log(`  ${layer.padStart(4)} ${String(v.tiles).padStart(4)}타일 ${(v.us / 1000).toFixed(1).padStart(6)}ms  ${names[layer] || ''}`);
      }
      if (pictures.length) {
        await mkdir(shots, { recursive: true });
        for (const [i, data] of pictures) await writeFile(join(shots, `${device}-${arrival}-${String(i).padStart(2, '0')}.png`), Buffer.from(data, 'base64'));
      }
    }
    const median = key => { const v = sums.map(s => s[key] / 1000).sort((a, b) => a - b); return Math.round(v[Math.floor(v.length / 2)]); };
    console.log(`${device} ${arrival}  raster ${median('raster')}ms  main ${median('main')}ms  draw ${median('draw')}ms  (raster ${sums.map(s => Math.round(s.raster / 1000)).join('/')})`);
  }
} finally {
  ws?.close();
  chrome.kill();
  server.close();
  await pause(200);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
