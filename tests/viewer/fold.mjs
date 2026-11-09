import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 실제 뷰어의 접기 장면을 독립 실행해 렌더 도착과 관계없이 이음매를 잰다.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const markup = (await readFile(join(root, 'plugin/viewer/index.html'), 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const harness = `<script type="module">
import { createResizeScene } from '/js/resize-scene.js';
document.querySelector('#focusView').hidden=false;
document.querySelector('#focusView').style.cssText='position:absolute;inset:0';
document.querySelector('#focusView .wrap').style.cssText='position:absolute;inset:0';
window.scene=createResizeScene(document.querySelector('#resizeScene'), {request(){},layout(){}});
const url='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/></svg>');
window.spec=(w,h)=>({url,dpW:w,dpH:h,edge:'rgb(255,255,255)'});
scene.setOriginal(360,740,spec(360,740));
scene.enable(true);
window.ready=true;
</script>`;
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/') { response.setHeader('Content-Type','text/html'); response.end(markup+harness); return; }
  const file = resolve(root, 'plugin/viewer', '.' + path);
  if (!file.startsWith(join(root, 'plugin/viewer') + '/')) { response.writeHead(404).end(); return; }
  try {
    const body = await readFile(file);
    response.setHeader('Content-Type', ({'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(file)] || 'application/octet-stream');
    response.end(body);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(join(tmpdir(), 'prevue-fold-check-'));
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
    console.error(await evaluate('window.__errors'));
    throw Error(`시간 초과: ${expression}`);
  };
  const check = async (expression, name) => { assert(await evaluate(expression), name); console.log(`통과 ${++checked}: ${name}`); };
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__errors=[];addEventListener('error',e=>__errors.push(e.message));addEventListener('unhandledrejection',e=>__errors.push(String(e.reason)));` });
  await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}/` });
  await until('window.ready');
  for (const [device, ow, oh, cw, ch] of [['fold8',932.57,704,475.43,751.24],['ultra',752,834.67,360,840],['ipduo',890,626,466,678],['pixelfold',851.69,882.87,443.08,994.46]]) {
    for (const rotated of [false,true]) {
      for (const cached of [false,true]) {
        const suffix=rotated?':rot':'';
        const open=device+':open'+suffix, cover=device+':cover'+suffix;
        const size=(w,h)=>rotated?{w:h,h:w}:{w,h};
        const opened=size(ow,oh), closed=size(cw,ch);
        for(const [sel,dimensions,from,previous] of [[cover,closed,open,opened],[open,opened,cover,closed]]) {
          await evaluate(`scene.enable(false);scene.setOriginal(360,740,spec(360,740));scene.enable(true);
            scene.image(${JSON.stringify(from)},spec(${previous.w},${previous.h}));scene.update(${JSON.stringify({sel:from,...previous})},true)`);
          if(cached) await evaluate(`scene.image(${JSON.stringify(sel)},spec(${dimensions.w},${dimensions.h}))`);
          const frames=await evaluate(`new Promise(resolve=>{
            const leaf=document.querySelector('#rig .leaf'),base=document.querySelector('#rig .base');
            const probe=(parent,x,y)=>{const el=document.createElement('i');el.style.cssText='position:absolute;width:0;height:0;left:'+x+'%;top:'+y+'%';parent.append(el);return el};
            // 원근 변환을 거친 접는 축의 같은 끝점이 화면에서도 이어져야 한다.
            const a=probe(leaf,100,100),b=probe(base,${rotated?100:0},${rotated?0:100});
            const frames=[];const tick=()=>{
              if(${device==='ipduo'} && !document.querySelector('#duo').hidden){
                const path=document.querySelector('#duo .duo-flap').style.clipPath;
                const n=path.match(/-?[\\d.]+/g)?.map(Number);
                if(n?.length===32){
                  const x=n[24]+(n[26]-n[24])/.5523,y=n[25]+(n[27]-n[25])/.5523;
                  const root=document.querySelector('#duo').getBoundingClientRect(),base=document.querySelector('#duo .duo-base').getBoundingClientRect();
                  const bx=${rotated}?base.right:base.left,by=${rotated}?base.top:base.bottom;
                  frames.push({error:Math.hypot(root.x+x-bx,root.y+y-by),path,base:{x:base.x,y:base.y,w:base.width,h:base.height}});
                }
              } else if(!${device==='ipduo'} && !document.querySelector('#rig').hidden){
                const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();
                const L=leaf.getBoundingClientRect(),R=base.getBoundingClientRect();
                const over=${rotated}?Math.max(0,R.bottom-L.bottom,L.top-R.top):Math.max(0,R.right-L.right,L.left-R.left);
                const th=Math.abs(Number(leaf.style.transform.match(/-?[\\d.]+/)?.[0]));
                frames.push({error:Math.hypot(A.x-B.x,A.y-B.y),over,th,leaf:leaf.style.cssText,base:base.style.cssText});
              }
              if(scene.moving())requestAnimationFrame(tick);else{a.remove();b.remove();resolve(frames)}
            };
            scene.update(${JSON.stringify({sel,...dimensions})});
            setTimeout(()=>scene.image(${JSON.stringify(sel)},spec(${dimensions.w},${dimensions.h})),300);
            requestAnimationFrame(tick);
          })`);
          assert(frames.length>=10, '접기 애니메이션 프레임 수');
          const worst=frames.reduce((a,b)=>a.error>b.error?a:b);
          assert(worst.error<=.1, `${device} ${rotated?'가로':'세로'} ${cached?'캐시':'대기'} ${sel}: 하단 이음매 ${JSON.stringify(worst)}`);
          // 다 접힌 마지막 프레임에서 바닥 반쪽이 접힌 장(커버) 밖으로 비어져 나오면 멈추는 순간 단차가 튄다
          if(sel===cover&&device!=='ipduo'){const shut=frames.filter(f=>f.th>=179);assert(shut.length, `${device} ${sel}: 다 접힌 프레임이 없다`);
            const over=Math.max(...shut.map(f=>f.over));assert(over<=.5, `${device} ${rotated?'가로':'세로'} ${sel}: 다 접힌 순간 바닥이 커버 밖으로 ${over.toFixed(2)}px`);}
          checked++;console.log(`통과 ${checked}: ${device} ${rotated?'가로':'세로'} ${cached?'캐시':'대기'} ${sel} — ${frames.length}프레임, 최대 ${worst.error.toFixed(3)}px`);
        }
      }
    }
  }
  await check('__errors.length===0','브라우저 오류 없음');
  console.log(`완료: ${checked}개 검사`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(resolve => chrome.exitCode !== null ? resolve() : chrome.once('exit', resolve));
  await rm(profile, { recursive: true, force: true });
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
