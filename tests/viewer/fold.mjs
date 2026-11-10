import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 실제 마크업과 접기 버튼을 쓰고, 프레임 시계만 제어해 모션 양끝과 중간을 함께 잰다.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const markup = (await readFile(join(root, 'plugin/viewer/index.html'), 'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const harness = `<script type="module">
import { createResizeScene } from '/js/resize-scene.js';
document.body.classList.add('resizing-ui');
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
window.requests=[];
window.scene=createResizeScene(document.querySelector('#resizeScene'), {request(sel){requests.push(sel);scene.update(states[sel])},layout(rect,moving){window.layout={...rect,moving}}});
window.spec=(w,h)=>({url:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" fill="white"/><path d="M0 0H80V160H0Z" fill="tomato"/><path d="M'+(w/2-60)+' '+(h/2)+'h120l-40 -40m40 40l-40 40" fill="none" stroke="teal" stroke-width="20"/><circle cx="'+(w-50)+'" cy="'+(h-50)+'" r="40" fill="teal"/></svg>'),dpW:w,dpH:h,edge:'rgb(255,255,255)'});
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
  await check("document.querySelector('#resizeScene').clientHeight>=800",'실제 창 크기의 검사 장면');
  const devices = [
    ['fold8',932.57,704,475.43,751.24], ['ultra',752,834.67,360,840],
    ['ipduo',951,669,466,678], ['pixelfold',851.69,882.87,443.08,994.46],
  ];
  const results = [];
  const click = async selector => {
    const at = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect();if(el.hidden||!r.width||!r.height)throw Error('버튼이 숨었다: '+el.id);return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1 });
  };
  await evaluate(`window.box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    window.snapshot=()=>({body:box(document.querySelector('#ua .stage')),cam:box(document.querySelector('#ua .cam')),
      cameraOn:Number(document.querySelector('#ua .cam').style.opacity)>0,
      buttons:[...document.querySelectorAll('#ua .btn')].filter(e=>Number(e.style.opacity)>0).map(box),
      content:box(document.querySelector('#ua .l0')),layout,src:document.querySelector('#ua .l0').src});
    window.reset=st=>{scene.enable(false);scene.setOriginal(360,740,spec(360,740));scene.enable(true);scene.image(st.sel,spec(st.w,st.h));scene.update(st,true);step(time+2000)};
    window.probe=(el,x,y)=>{const p=document.createElement('i');p.style.cssText='position:absolute;width:0;height:0;left:'+x+'%;top:'+y+'%';el.append(p);return p};
    window.A=probe(document.querySelector('#rig .leaf'),100,100);window.B=probe(document.querySelector('#rig .base'),0,100);
    window.union=(a,b)=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.max(a.x+a.w,b.x+b.w)-Math.min(a.x,b.x),h:Math.max(a.y+a.h,b.y+b.h)-Math.min(a.y,b.y)});
    window.sample=()=>{
      const duo=!document.querySelector('#duo').hidden,rig=!document.querySelector('#rig').hidden;
      if(!duo&&!rig)return null;
      const el=document.querySelector(duo?'#duo':'#rig');
      const matrix=new DOMMatrix(getComputedStyle(el).transform),origin=getComputedStyle(el).transformOrigin.split(' ').map(parseFloat);
      const point=(x,y)=>{const p=new DOMPoint(x-origin[0],y-origin[1]).matrixTransform(matrix);return {x:p.x+origin[0],y:p.y+origin[1]}};
      let error,body,cam,content,over=0,theta=0;
      if(duo){
        const n=document.querySelector('#duo .duo-flap').style.clipPath.match(/-?[\\d.]+/g).map(Number);
        const x=n[24]+(n[26]-n[24])/.5523,y=n[25]+(n[27]-n[25])/.5523;
        const base=document.querySelector('#duo .duo-base'),end=point(parseFloat(base.style.left),parseFloat(base.style.top)+parseFloat(base.style.height));
        const corner=point(x,y);error=Math.hypot(corner.x-end.x,corner.y-end.y);
        const back=window.phase>.5;
        const face=document.querySelector('#duo .duo-face');
        body=union(box(face),box(document.querySelector('#duo .duo-base')));
        cam=box(document.querySelector(back?'#duo .duo-ly .cam':'#duo .duo-scr .cam'));
        content=box(document.querySelector(back?'#duo .duo-ly img':'#duo .duo-scr img'));
      }else{
        const a=box(A),b=box(B);error=Math.hypot(a.x-b.x,a.y-b.y);
        const back=window.phase>.5;
        const base=box(document.querySelector('#rig .base')),outer=box(document.querySelector('#rig .outer'));
        body=union(box(document.querySelector(back?'#rig .outer':'#rig .inner')),base);
        theta=Math.abs(Number(document.querySelector('#rig .leaf').style.transform.match(/-?[\\d.]+/)[0]));
        over=Math.max(0,outer.x-base.x,outer.y-base.y,base.x+base.w-outer.x-outer.w,base.y+base.h-outer.y-outer.h);
        const face=document.querySelector(back?'#rig .outer':'#rig .base .clip');
        cam=box(face.querySelector('.cam'));content=box(face.querySelector(window.atStart||window.cached?'.old':'.neu'));
      }
      return {duo,rig,error,body,cam,content,over,theta,buttons:[...el.querySelectorAll('.btn')].filter(e=>Number(e.style.opacity)>0).map(box),
        angle:el.style.transform,leaf:document.querySelector('#rig .leaf').style.transform,path:document.querySelector('#duo .duo-flap').style.clipPath};
    };`);
  const near = (actual, expected, name, tolerance = .2) => {
    for (const key of ['x','y','w','h']) assert(Math.abs(actual[key]-expected[key])<=tolerance, `${name} ${key}: ${actual[key]} / ${expected[key]}`);
  };
  const pose = (device, folded, orientation, [ow, oh, cw, ch]) => {
    const [w,h]=folded?[cw,ch]:[ow,oh],rot=(orientation!=='portrait')!==(w>h);
    return {sel:device+':'+(folded?'cover':'open')+(rot?':rot':'')+(orientation==='landscape-right'?':right':''),w:rot?h:w,h:rot?w:h};
  };
  // 손에 든 회전 — 펼친 화면이 가로 기본인 Duo · Fold8의 짝. 셋째 값은 짝 없이 바로 선 세로로 가는 경우다.
  const HAND = {
    'cover:portrait':['landscape-left'], 'cover:landscape-right':['portrait'], 'cover:landscape-left':['portrait',true],
    'open:landscape-left':['portrait'], 'open:portrait':['landscape-right'], 'open:landscape-right':['portrait',true],
  };
  const handOf = (device, folded, orientation) => ['ipduo','fold8'].includes(device) ? HAND[(folded?'cover':'open')+':'+orientation] : [orientation];
  const flip = (b, c) => ({x:2*c.x-b.x-b.w,y:2*c.y-b.y-b.h,w:b.w,h:b.h});
  const centre = b => ({x:b.x+b.w/2,y:b.y+b.h/2});
  for (const [device, ...size] of devices) {
    for (const orientation of ['portrait','landscape-left','landscape-right']) for (const folded of [false,true]) {
      const [toOrientation,unpaired=false]=handOf(device,folded,orientation);
      const from=pose(device,folded,orientation,size),to=pose(device,!folded,toOrientation,size),open=folded?to:from,cover=folded?from:to;
      const name=`${device} ${folded?'cover':'open'} ${orientation} → ${toOrientation}`;
      await evaluate(`window.states=${JSON.stringify({[from.sel]:from,[to.sel]:to})}`);
      const refs={};
      for(const st of [from,to]) refs[st.sel]=await evaluate(`reset(${JSON.stringify(st)});snapshot()`);
      for (const arrival of ['late','during','cached']) {
          const cached=arrival==='cached';
          await evaluate(`reset(${JSON.stringify(from)});window.cached=${cached};requests=[];${cached?`scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}));`:''}`);
          const initial=await evaluate('snapshot()');near(initial.body,refs[from.sel].body,'시작 몸체');
          // CDP 포인터로 실제 독의 버튼을 눌러 toggleFold → request → update를 통과한다.
          await click('#dcFold');
          assert.deepEqual(await evaluate('requests'),[to.sel],`${name}: 손에 든 회전을 잇는 요청`);
          const duration=device==='ipduo'?1000:600;
          const motion=await evaluate(`(()=>{
            const start=time,frames=[];window.phase=${from===cover?1:0};window.atStart=true;step(start);const first=sample();window.atStart=false;
            for(let t=0;t<${duration};t+=16){if(t===304&&${arrival==='during'})scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}));window.phase=${to===cover?'t/'+duration:'1-t/'+duration};step(start+t);frames.push(sample())}
            window.phase=${to===cover?1:0};step(start+${duration}-.001);frames.push(sample());
            return {first,frames};
          })()`);
          const {first,frames}=motion;
          assert(first,'시작 접기 장면');
          assert.equal(first.buttons.length,refs[from.sel].buttons.length,'시작 측면 단추 수');
          near(first.body,refs[from.sel].body,`${name}: 시작 몸체`);
          if(refs[from.sel].cameraOn) near(first.cam,refs[from.sel].cam,`${name}: 시작 카메라`);
          first.buttons.forEach((b,i)=>near(b,refs[from.sel].buttons[i],`${name}: 시작 단추 ${i}`));
          near(first.content,refs[from.sel].content,`${name}: 시작 콘텐츠`);
          assert(frames.every(Boolean),`${name}: 매 프레임 접기 장면 표시`);
          // 접는 동안 몸체는 돌지 않는다 — 짝 없는 경우도 180° 돌지 않고 접기만 보인다.
          const turns=new Set([first,...frames].map(f=>f.angle));
          assert.equal(turns.size,1,`${name}: 회전 모션 없음 ${[...turns].join(' · ')}`);
          for(const frame of frames){
            const boxes=[frame.body,...frame.buttons];
            assert(boxes.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=1440&&b.y+b.h<=900),`${name}: 모션 중 몸체와 단추가 창 안`);
          }
          const changing = new Set(frames.map(f=>device==='ipduo'?f.path:f.leaf));
          assert(changing.size>=10,`${name}: 접는 장의 실제 변형`);
          const worst=Math.max(...frames.map(f=>f.error));assert(worst<.1,`${name}: 이음매 ${worst}px`);
          if(device!=='ipduo'&&to===cover){
            const shut=frames.filter(f=>f.theta>=179);assert(shut.length,'다 접힌 프레임');
            assert(Math.max(...shut.map(f=>f.over))<=.5,`${name}: 바닥 반쪽이 커버 밖으로 나오지 않음`);
          }
          const last=frames.at(-1),expected=refs[to.sel],c=centre(expected.body);
          // 마지막 모션 프레임의 몸체·카메라·단추·그림이 정지 장면으로 이어져야 한다. 짝 없는 경우는 정지 자세를 180° 뒤집은 자리에서 끝난다.
          const at=b=>unpaired?flip(b,c):b;
          near(last.body,expected.body,`${name}: 접힌 몸체`);
          if(expected.cameraOn) near(last.cam,at(expected.cam),`${name}: 카메라`);
          assert.equal(last.buttons.length,expected.buttons.length,'모션 중 측면 단추 수');
          const ends=unpaired?expected.buttons.map(at):expected.buttons,used=new Set();
          for(const b of last.buttons){const i=ends.findIndex((e,j)=>!used.has(j)&&['x','y','w','h'].every(k=>Math.abs(b[k]-e[k])<=.2));assert(i>=0,`${name}: 단추 ${JSON.stringify(b)}`);used.add(i)}
          if(arrival!=='late') near(last.content,expected.content,`${name}: 모션 끝 콘텐츠`);
          // 캐시 없음은 몸체가 다 접혀도 그림을 기다린다. 늦은 렌더 도착 뒤 최종 좌표를 따로 잰다.
          const final=await evaluate(`step(time+100);scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}));step(time+1500);step(time+1500);snapshot()`);
          assert.equal(await evaluate('scene.moving()'),false,'렌더 도착 후 정착');
          near(final.body,expected.body,'최종 몸체');near(final.content,expected.content,'최종 콘텐츠');
          if(expected.cameraOn) near(final.cam,expected.cam,'최종 카메라');
          final.buttons.forEach((b,i)=>near(b,expected.buttons[i],`${name}: 최종 단추 ${i}`));
          for(const key of ['w','h','s','y','cx']) assert(Math.abs(final.layout[key]-expected.layout[key])<.2,'최종 콘텐츠 매핑 '+key);
          assert.equal(final.src,expected.src,'최종 그림');
          results.push({device,from:from.sel,arrival,to:to.sel,unpaired,frames:frames.length,seam:worst});
          console.log(`통과 ${++checked}: ${name} ${arrival}${unpaired?' (짝 없음)':''} — ${frames.length}프레임, 이음매 ${worst.toFixed(3)}px`);
      }
    }
  }
  await mkdir(join(root,'.cache/fold'),{recursive:true});
  for(const [device,...size] of devices){
    const natural=size[0]>size[1]?'landscape-left':'portrait';
    const from=pose(device,false,natural,size),to=pose(device,true,handOf(device,false,natural)[0],size);
    // 비대칭 표식이 든 실제 그림으로 중간 모션의 육안 확인 자료도 남긴다.
    await evaluate(`states=${JSON.stringify({[from.sel]:from,[to.sel]:to})};reset(${JSON.stringify(from)});scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}));Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode().catch(()=>{})))`);
    await click('#dcFold');
    await evaluate(`step(time+${device==='ipduo'?350:210});Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode().catch(()=>{})))`);
    const shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(root,'.cache/fold',device+'-motion.png'),Buffer.from(shot.data,'base64'));
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for (const [device,...size] of devices) {
    for(const orientation of ['portrait','landscape-left','landscape-right']) for(const folded of [false,true]) {
      const from=pose(device,folded,orientation,size),to=pose(device,!folded,handOf(device,folded,orientation)[0],size);
      for(const cached of [false,true]) {
        await evaluate(`states=${JSON.stringify({[from.sel]:from,[to.sel]:to})};reset(${JSON.stringify(from)});${cached?`scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}))`:""}`);
        await click('#dcFold');
        const reduced=await evaluate(`(()=>{const frames=[];for(let i=0;i<60;i++){if(i===20&&!${cached})scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}));step(time+16);frames.push({rig:!document.querySelector('#rig').hidden,duo:!document.querySelector('#duo').hidden})}return frames})()`);
        assert.deepEqual(await evaluate('requests.slice(-1)'),[to.sel],'reduced motion도 손에 든 회전을 잇는 요청');
        assert(reduced.every(f=>!f.rig&&!f.duo),'reduced motion은 접기 없이 페이드');
        assert.equal(await evaluate('scene.moving()'),false,'reduced motion 정착');
        console.log(`통과 ${++checked}: reduced motion ${cached?'cached':'waiting'} ${to.sel}`);
      }
    }
  }
  await mkdir(join(root,'.cache/fold'),{recursive:true});
  await writeFile(join(root,'.cache/fold/results.json'),JSON.stringify(results,null,2)+'\n');
  assert.deepEqual(await evaluate('__errors'),[],'브라우저 오류');
  await check('__errors.length===0','브라우저 오류 없음');
  console.log(`완료: ${checked}개 검사`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(resolve => (chrome.exitCode !== null || chrome.signalCode !== null) ? resolve() : chrome.once('exit', resolve));
  await rm(profile, { recursive: true, force: true });
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
