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
    ['duo',951,669,466,678], ['pixelfold',851.69,882.87,443.08,994.46],
    ['flip8',360,840,399.16,441.26],
  ];
  // 측정한 자세가 하나뿐인 화면(Flip8 커버)은 세로만 있다 — 펼친 가로에서 접으면 세로로 서며 접힌다(셋째 값 true).
  const FIXED = { flip8: { 'open:portrait':['portrait'], 'open:landscape-left':['portrait',false,true], 'open:landscape-right':['portrait',false,true], 'cover:portrait':['portrait'] } };
  const results = [], landings = [];
  const click = async selector => {
    const at = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)}),r=el.getBoundingClientRect();if(el.hidden||!r.width||!r.height)throw Error('버튼이 숨었다: '+el.id);return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ['mousePressed','mouseReleased']) await send('Input.dispatchMouseEvent', { type, ...at, button: 'left', clickCount: 1 });
  };
  await evaluate(`window.box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    window.snapshot=()=>({body:box(document.querySelector('#ua .stage')),shell:box(document.querySelector('#ua .shell')),
      radii:(c=>['borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'].map(k=>parseFloat(c[k])))(getComputedStyle(document.querySelector('#ua .shell'))),
      ticks:[...document.querySelectorAll('#ua .tick')].filter(e=>Number(e.style.opacity)>0).map(box),cam:box(document.querySelector('#ua .cam')),
      cameraOn:Number(document.querySelector('#ua .cam').style.opacity)>0,
      buttons:[...document.querySelectorAll('#ua .btn')].filter(e=>Number(e.style.opacity)>0).map(box),
      content:box(document.querySelector('#ua .l0')),layout,src:document.querySelector('#ua .l0').src});
    window.reset=st=>{scene.enable(false);scene.setOriginal(360,740,spec(360,740));scene.enable(true);scene.image(st.sel,spec(st.w,st.h));scene.update(st,true);step(time+2000)};
    window.probe=(el,x,y)=>{const p=document.createElement('i');p.style.cssText='position:absolute;width:0;height:0;left:'+x+'%;top:'+y+'%';el.append(p);return p};
    // 이음매 — 책등의 양끝(.3px 겹침 안쪽)이 두 판 뒷면의 힌지 쪽 변 가운데에 붙는다. 앞 화면은 회전축이 틈의 절반만큼 떠 있어 접는 동안 벌어지는 게 맞다.
    window.A=probe(document.querySelector('#rig .leaf .rear'),0,50);window.B=probe(document.querySelector('#rig .base .rear'),100,50);
    const spine=document.querySelector('#rig .spine');
    window.SA=document.createElement('i');SA.style.cssText='position:absolute;width:0;height:0;right:.3px;top:50%';spine.append(SA);
    window.SB=document.createElement('i');SB.style.cssText='position:absolute;width:0;height:0;left:.3px;top:50%';spine.append(SB);
    window.union=(a,b)=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.max(a.x+a.w,b.x+b.w)-Math.min(a.x,b.x),h:Math.max(a.y+a.h,b.y+b.h)-Math.min(a.y,b.y)});
    window.sample=()=>{
      const el=document.querySelector('#rig');
      if(el.hidden)return null;
      const back=window.phase>.5,dist=(p,q)=>{const a=box(p),b=box(q);return Math.hypot(a.x-b.x,a.y-b.y)};
      const error=spine.style.display==='none'?0:Math.max(dist(A,SA),dist(B,SB));
      const base=box(document.querySelector('#rig .base .front .clip')),outer=box(document.querySelector('#rig .leaf .rear .clip'));
      const body=union(box(document.querySelector(back?'#rig .leaf .rear .clip':'#rig .leaf .front .clip')),base);
      const leaf=document.querySelector('#rig .leaf').style.transform,theta=Math.abs(Number(leaf.match(/rotateY\\((-?[\\d.]+)/)[1]));
      const over=Math.max(0,outer.x-base.x,outer.y-base.y,base.x+base.w-outer.x-outer.w,base.y+base.h-outer.y-outer.h);
      const face=document.querySelector(back?'#rig .leaf .rear .clip':'#rig .base .front .clip');
      const cam=box(face.querySelector('.cam')),content=box(face.querySelector(window.atStart||window.cached?'.old':'.neu'));
      return {error,spine:spine.style.display!=='none',body,cam,content,over,theta,buttons:[...el.querySelectorAll('.btn')].filter(e=>Number(e.style.opacity)>0).map(box),angle:el.style.transform,leaf};
    };`);
  // 착지 — 접기의 마지막 프레임과 멈춘 첫 프레임을 화면째 찍어 몸체의 테 · 빛 · 그림자를 견준다. 화면 안과 그 둘레 3px(링 자리)는
  // 그림이 달라 빼고, 외곽선 · 단추 · 힌지 눈금의 2px 띠도 뺀다 — 접기 층은 합성기가 소수점 자리에서 다시 표본해 1px 짜리 선이 반 픽셀 번진다.
  // 차는 1px 이웃 중 가장 가까운 값과 잰다(반 픽셀 어긋남은 차가 아니다).
  await evaluate(`window.decodeAll=()=>Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode().catch(()=>{}))).then(()=>new Promise(r=>setTimeout(r,80)));
    window.landing=async(a,b,o)=>{
      const load=async d=>{const bm=await createImageBitmap(await (await fetch('data:image/png;base64,'+d)).blob()),c=new OffscreenCanvas(bm.width,bm.height),x=c.getContext('2d');x.drawImage(bm,0,0);return x.getImageData(0,0,bm.width,bm.height)};
      const A=await load(a),B=await load(b),W=A.width,H=A.height,{screen:m,shell:sh,radii:R,bands}=o;
      const inside=(r,e,x,y)=>x>=r.x-e&&x<r.x+r.w+e&&y>=r.y-e&&y<r.y+r.h+e;
      const sdf=(x,y)=>{const cx=sh.x+sh.w/2,cy=sh.y+sh.h/2,r=R[x<cx?(y<cy?0:3):(y<cy?1:2)],qx=Math.abs(x+.5-cx)-(sh.w/2-r),qy=Math.abs(y+.5-cy)-(sh.h/2-r);return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r};
      const near=(P,Q,i,x,y)=>{let best=255;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const qx=x+dx,qy=y+dy;if(qx<0||qy<0||qx>=W||qy>=H)continue;const j=(qy*W+qx)*4;best=Math.min(best,Math.max(Math.abs(P[i]-Q[j]),Math.abs(P[i+1]-Q[j+1]),Math.abs(P[i+2]-Q[j+2])))}return best};
      const out={bezel:{max:0,sum:0,n:0},halo:{max:0,sum:0,n:0}};
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){
        if(inside(m,3,x,y)||Math.abs(sdf(x,y))<2||bands.some(b=>inside(b,2,x,y)))continue;
        const i=(y*W+x)*4,d=Math.max(near(A.data,B.data,i,x,y),near(B.data,A.data,i,x,y)),g=out[inside(sh,0,x,y)?'bezel':'halo'];
        if(d>g.max)g.max=d,g.at=[x,y];g.sum+=d;g.n++;
      }
      for(const g of Object.values(out))g.mean=g.sum/g.n;
      return out;
    };`);
  const shoot = async clip => (await send('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 1 } })).data;
  const near = (actual, expected, name, tolerance = .2) => {
    for (const key of ['x','y','w','h']) assert(Math.abs(actual[key]-expected[key])<=tolerance, `${name} ${key}: ${actual[key]} / ${expected[key]}`);
  };
  const pose = (device, folded, orientation, [ow, oh, cw, ch]) => {
    const [w,h]=folded?[cw,ch]:[ow,oh],rot=(orientation!=='portrait')!==(w>h);
    return {sel:device+':'+(folded?'cover':'open')+(rot?':rot':'')+(orientation==='landscape-right'?':right':''),w:rot?h:w,h:rot?w:h};
  };
  // 손에 든 회전 — 펼친 화면이 가로 기본인 Duo · Fold8의 짝. 둘째 값 true는 짝 없이 바로 선 세로로 가는 경우다.
  const HAND = {
    'cover:portrait':['landscape-left'], 'cover:landscape-right':['portrait'], 'cover:landscape-left':['portrait',true],
    'open:landscape-left':['portrait'], 'open:portrait':['landscape-right'], 'open:landscape-right':['portrait',true],
  };
  const handOf = (device, folded, orientation) => FIXED[device] ? FIXED[device][(folded?'cover':'open')+':'+orientation]
    : ['duo','fold8'].includes(device) ? HAND[(folded?'cover':'open')+':'+orientation] : [orientation];
  const flip = (b, c) => ({x:2*c.x-b.x-b.w,y:2*c.y-b.y-b.h,w:b.w,h:b.h});
  const centre = b => ({x:b.x+b.w/2,y:b.y+b.h/2});
  for (const [device, ...size] of devices) {
    for (const orientation of ['portrait','landscape-left','landscape-right']) for (const folded of [false,true]) {
      if (!handOf(device,folded,orientation)) continue;
      const [toOrientation,unpaired=false,upright=false]=handOf(device,folded,orientation);
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
          const duration=1000;
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
          if(upright) assert(turns.size>=10,`${name}: 세로로 서며 접힌다`);
          else assert.equal(turns.size,1,`${name}: 회전 모션 없음 ${[...turns].join(' · ')}`);
          for(const frame of frames){
            const boxes=[frame.body,...frame.buttons];
            assert(boxes.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=1440&&b.y+b.h<=900),`${name}: 모션 중 몸체와 단추가 창 안`);
          }
          const changing = new Set(frames.map(f=>f.leaf));
          assert(changing.size>=10,`${name}: 접는 장의 실제 변형`);
          assert(frames.filter(f=>f.theta>=30&&f.theta<=150).every(f=>f.spine),`${name}: 30~150°에서 책등이 보인다`);
          const worst=Math.max(...frames.map(f=>f.error));assert(worst<.1,`${name}: 이음매 ${worst}px`);
          if(to===cover){
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
          if(cached&&!unpaired){
            const sh=expected.shell,clip={x:Math.max(0,Math.floor(sh.x-40)),y:Math.max(0,Math.floor(sh.y-40))};
            clip.width=Math.min(1440,Math.ceil(sh.x+sh.w+40))-clip.x;clip.height=Math.min(900,Math.ceil(sh.y+sh.h+40))-clip.y;
            const local=b=>({x:b.x-clip.x,y:b.y-clip.y,w:b.w,h:b.h});
            // 라이브 링 — 착지 면의 고리는 멈춘 무대(#stage.live)의 링과 화면에서 같은 굵기다.
            const {ring,stageRing}=await evaluate(`(()=>{const f=document.querySelector(${JSON.stringify(to===cover?'#rig .leaf .rear':'#rig .base .front')}),c=box(f.querySelector('.clip')),r=box(f.querySelector('.ring'));
              // 크기 장면은 조작(interactive) 중에만 켜지고 그때 무대는 .live 다(focus.ts) — 하네스는 그 클래스를 달지 않아 읽을 때만 단다.
              const st=document.querySelector('#stage');st.classList.add('live');
              const spread=getComputedStyle(st).boxShadow.match(/(-?[\\d.]+)px/g)?.map(parseFloat)[3];st.classList.remove('live');
              return {ring:Math.max(c.x-r.x,c.y-r.y,r.x+r.w-c.x-c.w,r.y+r.h-c.y-c.h),stageRing:spread}})()`);
            assert(stageRing>0&&Math.abs(ring-stageRing)<=.1,`${name}: 착지 면의 링 ${ring}px / 멈춘 무대 ${stageRing}px`);
            // 접힌 자국 · 힌지 눈금 — 1px 짜리라 픽셀 판정의 띠에 빠진다. 불투명도와 상자로 견준다(펼침 착지만 보인다).
            const hinge=sel=>evaluate(`[...document.querySelectorAll(${JSON.stringify(sel)})].map(e=>({op:Number(e.style.opacity)*1,...box(e)}))`);
            const rigMarks=to===open?{crease:await hinge('#rig .crease'),ticks:await hinge('#rig .tick')}:null;
            // 하네스는 실제 무대(#stage)를 숨겨 멈춘 쪽에 링이 없다 — 링은 위에서 굵기로 견주고 화면은 둘 다 링 없이 찍는다.
            await evaluate(`document.head.insertAdjacentHTML('beforeend','<style id=landing>#ruler,#rig .ring{visibility:hidden}</style>');decodeAll()`);
            const end=await shoot(clip);
            await evaluate(`step(time+.001);step(time+16);decodeAll()`);
            assert(await evaluate(`document.querySelector('#rig').hidden`),`${name}: 착지한 뒤 멈춘 장면`);
            if(rigMarks){
              const [rc]=rigMarks.crease,[uc]=await hinge('#ua .crease'),uTicks=await hinge('#ua .tick');
              assert(rc.op>.01&&Math.abs(rc.op-uc.op)<=.02,`${name}: 접힌 자국 불투명도 ${rc.op} / ${uc.op}`);
              const mid=b=>[b.x+b.w/2,b.y+b.h/2];
              assert(mid(rc).every((v,i)=>Math.abs(v-mid(uc)[i])<=.5),`${name}: 접힌 자국 자리 ${mid(rc)} / ${mid(uc)}`);
              for(const t of uTicks){
                const m=rigMarks.ticks.find(r=>['x','y','w','h'].every(k=>Math.abs(r[k]-t[k])<=.5));
                assert(m&&Math.abs(m.op-t.op)<=.02,`${name}: 힌지 눈금 ${JSON.stringify(t)} / ${JSON.stringify(rigMarks.ticks)}`);
              }
            }
            const rest=await shoot(clip);
            await evaluate(`document.getElementById('landing').remove()`);
            const d=await evaluate(`landing(${JSON.stringify(end)},${JSON.stringify(rest)},${JSON.stringify({screen:local(expected.body),shell:local(sh),radii:expected.radii,bands:[...expected.buttons,...expected.ticks].map(local)})})`);
            for(const [part,g] of Object.entries(d)) assert(g.mean<=1&&g.max<=32,`${name}: 착지 ${part} 평균 ${g.mean.toFixed(2)} · 최대 ${g.max} @${g.at}`);
            landings.push({name,bezel:+d.bezel.mean.toFixed(2),bezelMax:d.bezel.max,halo:+d.halo.mean.toFixed(2),haloMax:d.halo.max});
          }
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
  // 돌리기 — 카메라는 몸체에 붙어 돈다. 마지막 회전 프레임 · 회전 끝 · 정지 장면의 카메라가 한 자리이고,
  // Duo 커버는 safearea.info occlusion 중심(가로 왼쪽 = 위가 왼쪽, 사이트 이름으로는 Landscape Right)에 선다.
  const SITE_CAM = { 'portrait': [418.17,47.83], 'landscape-left': [47.83,47.83], 'landscape-right': [630.17,418.17] };
  const spins = [['duo',true,[951,669,466,678]], ['ip17',false,[402,874]]];
  for (const [device, folded, size] of spins) {
    const poses = ['portrait','landscape-left','landscape-right'].map(o => ({o, st: pose(device, folded, o, size)}));
    for (const a of poses) for (const b of poses) if (a !== b) {
      const name = `${device} 돌리기 ${a.o} → ${b.o}`;
      await evaluate(`states=${JSON.stringify({[a.st.sel]:a.st,[b.st.sel]:b.st})}`);
      const rest = await evaluate(`reset(${JSON.stringify(b.st)});snapshot()`);
      await evaluate(`reset(${JSON.stringify(a.st)});scene.image(${JSON.stringify(b.st.sel)},spec(${b.st.w},${b.st.h}))`);
      const spun = await evaluate(`(()=>{const start=time;scene.update(${JSON.stringify(b.st)});step(start);const first=document.querySelector('#ua').style.transform;
        step(start+599);const last=snapshot();step(start+600);const end=snapshot();step(start+2600);step(start+4600);
        return {first,turned:document.querySelector('#ua').style.transform!==first,last,end,final:snapshot(),moving:scene.moving()}})()`);
      assert(rest.cameraOn, `${name}: 카메라 표시`);
      assert(spun.turned, `${name}: 몸체가 돌았다`);
      const c = centre(rest.cam);
      for (const [label, cam] of [['마지막 회전 프레임', spun.last.cam], ['회전 끝', spun.end.cam], ['정착', spun.final.cam]]) {
        const k = centre(cam);
        assert(Math.hypot(k.x-c.x, k.y-c.y) <= .5, `${name}: ${label} 카메라 ${JSON.stringify(k)} / 정지 ${JSON.stringify(c)}`);
      }
      assert.equal(spun.moving, false, `${name}: 정착`);
      if (device === 'duo') {
        const s = rest.body.w / b.st.w, [x, y] = SITE_CAM[b.o];
        assert(Math.abs((c.x-rest.body.x)/s-x) <= .5 && Math.abs((c.y-rest.body.y)/s-y) <= .5, `${name}: 사이트 occlusion 중심 ${[(c.x-rest.body.x)/s,(c.y-rest.body.y)/s]} / ${[x,y]}`);
      }
      console.log(`통과 ${++checked}: ${name}`);
    }
  }
  // 돌리기 끄기 — 측정한 자세가 하나뿐인 Flip8 커버에서는 방향 고르기가 숨고, 돌린 자세는 장면이 받지 않는다.
  for (const [sel, w, h, fixed] of [['flip8:cover',399.16,441.26,true], ['flip8:open',360,840,false], ['fold8:cover',475.43,751.24,false]]) {
    await evaluate(`states={};reset(${JSON.stringify({sel,w,h})})`);
    await check(`document.querySelector('#dcOrientation').hidden===${fixed}`, `${sel} 돌리기 ${fixed?'꺼짐':'켜짐'}`);
  }
  await check("scene.sizeOf('flip8:cover:rot')===null&&scene.sizeOf('flip8:cover')!==null", 'flip8 커버의 돌린 자세는 없다');
  // 흐린 채움의 시작 — 그림이 없는 크기로 가면 옛 그림이 원래 dp 자리에서 덮는 크기로 자란다. 틀이 dp와 다를 때(캐시 있는 전환 도중 ·
  // 내용 크기로 줄어든 그림) 한 프레임에 덮는 크기로 튀지 않고, 흐림이 오르는 동안 여러 프레임에 나눠 자란다.
  const A = {sel:'custom:400x700',w:400,h:700}, B = {sel:'custom:600x500',w:600,h:500}, C = {sel:'custom:300x300',w:300,h:300};
  const holds = [
    ['캐시 있는 전환 도중', A, [400,700], `scene.image('${B.sel}',spec(600,500));scene.update(${JSON.stringify(B)});for(let k=16;k<=160;k+=16)step(time+16);`, C],
    ['그림이 틀보다 작다', A, [400,520], '', B],
    ['돌리기 · 그림이 틀보다 작다', {sel:'ip17:open',w:402,h:874}, [402,600], '', {sel:'ip17:open:rot',w:874,h:402}],
  ];
  for (const [name, from, [w, h], before, to] of holds) {
    await evaluate(`states=${JSON.stringify({[from.sel]:from,[to.sel]:to,[B.sel]:B})};scene.enable(false);scene.setOriginal(360,740,spec(360,740));scene.enable(true);scene.image('${from.sel}',spec(${w},${h}));scene.update(${JSON.stringify(from)},true);step(time+2000);${before}`);
    const { boxes, frame } = await evaluate(`(()=>{const l0=()=>box(document.querySelector('#ua .l0')),out=[l0()],frame=box(document.querySelector('#ua .stage'));scene.update(${JSON.stringify(to)});for(let k=0;k<4;k++){step(time+(k?16:.01));out.push(l0())}return {boxes:out,frame}})()`);
    // 옛 코드가 한 프레임에 건너뛰던 거리 — 그때의 틀을 덮는 크기와 원래 dp 크기의 차
    const jump = boxes[0].w * Math.max(frame.w / boxes[0].w, frame.h / boxes[0].h) - boxes[0].w;
    const steps = boxes.slice(1).map((b, i) => Math.max(...['x','y','w','h'].map(k => Math.abs(b[k] - boxes[i][k]))));
    assert(jump > 20, `${name}: 틀과 그림 크기가 다르다 ${jump}`);
    assert(steps[0] <= .5, `${name}: 시작 프레임에 그림 박스가 그대로 ${steps[0]}`);
    assert(Math.max(...steps) <= jump * .25, `${name}: 첫 세 프레임 중 한 프레임에 ${Math.max(...steps).toFixed(1)}px / 덮는 크기까지 ${jump.toFixed(1)}px`);
    console.log(`통과 ${++checked}: 흐린 채움 ${name} — 첫 세 프레임 최대 ${Math.max(...steps).toFixed(1)}px / 덮는 크기까지 ${jump.toFixed(1)}px`);
  }
  await mkdir(join(root,'.cache/fold'),{recursive:true});
  for(const [device,...size] of devices){
    const natural=size[0]>size[1]?'landscape-left':'portrait';
    const from=pose(device,false,natural,size),to=pose(device,true,handOf(device,false,natural)[0],size);
    // 비대칭 표식이 든 실제 그림으로 중간 모션의 육안 확인 자료도 남긴다.
    await evaluate(`states=${JSON.stringify({[from.sel]:from,[to.sel]:to})};reset(${JSON.stringify(from)});scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}));Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode().catch(()=>{})))`);
    await click('#dcFold');
    await evaluate(`step(time+350);Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode().catch(()=>{})))`);
    const shot=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(root,'.cache/fold',device+'-motion.png'),Buffer.from(shot.data,'base64'));
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for (const [device,...size] of devices) {
    for(const orientation of ['portrait','landscape-left','landscape-right']) for(const folded of [false,true]) {
      if (!handOf(device,folded,orientation)) continue;
      const from=pose(device,folded,orientation,size),to=pose(device,!folded,handOf(device,folded,orientation)[0],size);
      for(const cached of [false,true]) {
        await evaluate(`states=${JSON.stringify({[from.sel]:from,[to.sel]:to})};reset(${JSON.stringify(from)});${cached?`scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}))`:""}`);
        await click('#dcFold');
        const reduced=await evaluate(`(()=>{const frames=[];for(let i=0;i<60;i++){if(i===20&&!${cached})scene.image(${JSON.stringify(to.sel)},spec(${to.w},${to.h}));step(time+16);frames.push({rig:!document.querySelector('#rig').hidden})}return frames})()`);
        assert.deepEqual(await evaluate('requests.slice(-1)'),[to.sel],'reduced motion도 손에 든 회전을 잇는 요청');
        assert(reduced.every(f=>!f.rig),'reduced motion은 접기 없이 페이드');
        assert.equal(await evaluate('scene.moving()'),false,'reduced motion 정착');
        console.log(`통과 ${++checked}: reduced motion ${cached?'cached':'waiting'} ${to.sel}`);
      }
    }
  }
  await mkdir(join(root,'.cache/fold'),{recursive:true});
  await writeFile(join(root,'.cache/fold/results.json'),JSON.stringify(results,null,2)+'\n');
  await writeFile(join(root,'.cache/fold/landings.json'),JSON.stringify(landings,null,2)+'\n');
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
