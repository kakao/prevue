import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireDaemon, toBoard } from "./daemon.mjs";

// 좁은 창(≤640px)의 레일 서랍과 본문 여백을 잰다. 전용 워크트리로 fixtures/pearl의 PearlPreviews.kt(장이 여럿인 묶음이 있다)를 먼저 연다.
const viewer = process.argv[2];
assert(viewer, "node tests/viewer/narrow.mjs <전용 프리뷰 서버 URL>");
await requireDaemon(viewer);
await toBoard(viewer);
const pause = ms => new Promise(r => setTimeout(r, ms));
const profile = await mkdtemp(join(tmpdir(), "prevue-narrow-check-"));
const chrome = spawn(process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "--remote-debugging-port=0", "about:blank",
], { stdio: "ignore" });
let ws, checked = 0;
try {
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    try { port = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]; } catch { await pause(100); }
  }
  assert(port, "Chrome 실행");
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json());
  ws = new WebSocket(pages.find(p => p.type === "page").webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id, timer = setTimeout(() => { waiting.delete(n); reject(Error(`${method} 응답 시간 초과`)); }, 15_000);
    waiting.set(n, m => { clearTimeout(timer); m.error ? reject(Error(m.error.message)) : resolve(m.result); });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async (expression, ms = 15_000) => {
    for (const end = Date.now() + ms; Date.now() < end; await pause(80)) if (await evaluate(expression)) return;
    throw Error(`시간 초과: ${expression}`);
  };
  const check = (ok, name, detail) => { assert(ok, `${name} — ${JSON.stringify(detail)}`); checked++; console.log(`통과 ${checked}: ${name}`, detail ?? ""); };
  const click = async selector => {
    const at = await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x: at.x, y: at.y, button: "left", clickCount: 1 });
  };
  const key = async (k, code) => { for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: 27 }); };
  const size = async width => {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 800, deviceScaleFactor: 1, mobile: false });
    await until(`innerWidth === ${width}`);
    await pause(400);
  };
  const drawer = `document.body.classList.contains('rail-drawer')`;
  const railShown = `(() => { const r = document.getElementById('rail').getBoundingClientRect(); return getComputedStyle(document.getElementById('rail')).visibility === 'visible' && r.right > 0 && r.left >= 0; })()`;

  await send("Page.enable");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await size(360);
  await send("Page.navigate", { url: viewer });
  await until(`document.querySelectorAll('#cards > .group').length > 0 && [...document.querySelectorAll('#cards .card')].some(c => c.querySelector('.cstage img')?.style.width)`, 30_000);

  for (const width of [360, 480, 640]) {
    await size(width);
    const m = await evaluate(`(() => {
      const main = document.querySelector('main'), cards = document.getElementById('cards'), rows = document.getElementById('staleRows');
      const groups = [...cards.querySelectorAll(':scope > .group')].map(g => [...g.querySelectorAll('.card')].map(c => Math.round(c.getBoundingClientRect().top)));
      const multi = groups.filter(t => t.length > 1);
      return { iw: innerWidth, rail: getComputedStyle(document.body).getPropertyValue('--rail-w').trim(), mainLeft: main.getBoundingClientRect().left,
        multi: multi.length, oneColumn: multi.filter(t => t[0] !== t[1]).length,
        cardLeft: Math.round(cards.querySelector('.card').getBoundingClientRect().left),
        staleText: Math.round(rows.getBoundingClientRect().left + parseFloat(getComputedStyle(rows).paddingLeft)),
        pad: getComputedStyle(main).paddingLeft };
    })()`);
    check(m.iw === width && m.multi > 0, `${width}px 창 · 장이 여럿인 묶음이 있다`, m);
    check(m.mainLeft === 0, `${width}px 창 · 레일이 본문을 밀지 않는다`, { rail: m.rail, mainLeft: m.mainLeft });
    check(m.oneColumn === 0, `${width}px 창 · 묶음의 앞 두 장이 같은 줄에 놓인다`, { multi: m.multi, oneColumn: m.oneColumn });
    check(m.staleText === m.cardLeft && m.pad === "12px", `${width}px 창 · 낡음 띠 글자와 카드의 왼쪽 선이 같다(12px)`, { staleText: m.staleText, cardLeft: m.cardLeft, pad: m.pad });
  }

  await size(480);
  check(!(await evaluate(railShown)), "서랍은 처음에 닫혀 있다");
  check(await evaluate(`getComputedStyle(document.getElementById('railToggle')).display !== 'none'`), "좁은 창 헤더에 레일 단추가 보인다");
  await click("#railToggle");
  await until(`${drawer} && ${railShown}`);
  check(await evaluate(`document.getElementById('railToggle').getAttribute('aria-expanded') === 'true' && document.getElementById('rail').getBoundingClientRect().width === 200`), "단추로 열면 200px 레일이 보드 위에 뜬다");
  await key("Escape", "Escape");
  await until(`!${drawer}`);
  check(await evaluate(`document.getElementById('railToggle').getAttribute('aria-expanded') === 'false'`), "Esc 로 닫힌다");
  await click("#railToggle");
  await until(drawer);
  await click("#railScrim");
  await until(`!${drawer}`);
  check(true, "덮개를 누르면 닫힌다");
  await click("#railToggle");
  await until(`${drawer} && ${railShown}`);
  // 폭이 넓은 창과 같아 줄임 규칙(D-103)이 서랍에서도 이름을 채운다
  check(await evaluate(`[...document.querySelectorAll('#railList .rt:not(.leaving) .rt-name')].every(n => n.textContent.length > 0 && n.scrollWidth <= n.clientWidth)`), "서랍의 줄 이름이 줄임 규칙대로 들어간다");
  await click("#railList .rt.active");
  await until(`!${drawer}`);
  check(true, "파일 줄을 누르면 닫힌다");
  // 단축키 · 빠른 열기로 파일을 바꿔도 닫힌다 — 지금 파일이 바뀌는 길은 하나로 모인다. 탭이 둘 이상일 때만 잰다.
  if (await evaluate(`document.querySelectorAll('#railList .rt:not(.leaving)').length > 1`)) {
    const before = await evaluate(`document.querySelector('#railList .rt.active').dataset.key`);
    const shiftArrow = async k => { for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key: k, code: k, modifiers: 8, windowsVirtualKeyCode: k === "ArrowLeft" ? 37 : 39 }); };
    await click("#railToggle");
    await until(drawer);
    await shiftArrow("ArrowRight");
    await until(`document.querySelector('#railList .rt.active')?.dataset.key !== ${JSON.stringify(before)}`);
    await until(`!${drawer}`);
    check(true, "단축키로 탭을 옮기면 닫힌다");
    await shiftArrow("ArrowLeft");
    await until(`document.querySelector('#railList .rt.active')?.dataset.key === ${JSON.stringify(before)}`);
    await pause(800);   // 탭 전환의 view transition 동안은 클릭이 페이지에 닿지 않는다
  }
  await click("#railToggle");
  await until(drawer);
  await size(900);
  await until(`!${drawer}`);
  const wide = await evaluate(`({ rail: getComputedStyle(document.body).getPropertyValue('--rail-w').trim(), main: document.querySelector('main').getBoundingClientRect().left,
    toggle: getComputedStyle(document.getElementById('railToggle')).display, pad: getComputedStyle(document.querySelector('main')).paddingLeft })`);
  check(wide.rail === "200px" && wide.main === 200 && wide.toggle === "none" && wide.pad === "24px", "넓히면 서랍이 풀리고 원래 레일 · 여백으로 돌아간다", wide);
  console.log(`좁은 창 검사 ${checked}개 통과`);
} finally {
  ws?.close(); chrome.kill();
  await new Promise(r => chrome.exitCode !== null ? r() : chrome.once("exit", r));
  await rm(profile, { recursive: true, force: true });
}
