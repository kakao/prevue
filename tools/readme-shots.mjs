#!/usr/bin/env node
// README 그림을 다시 찍는다 — 헤드리스 Chrome 을 CDP 로 몰아 뷰어를 찍고, 창 테두리를 씌워 assets/ 에 쓴다.
//
//   node tools/readme-shots.mjs --nia <nowinandroid> --pearl-a <Pearl 체크아웃> --pearl-b <그 워크트리> [장면...]
//
// --pearl-a · --pearl-b 는 fixtures/pearl 을 따로 떼어 만든 저장소와 그 워크트리다 — 픽스처를 그대로 주면 헤더의 폴더 · 브랜치가
// 이 저장소의 것이 된다. 워크트리 장면이 헤더의 폴더 · 브랜치가 다른 두 창을 찍기 때문이다. 오른쪽 브랜치에만 1열 큰 카드를 커밋해
// '워크트리마다 제 코드로 그린다'가 그림만으로 읽히게 한다.
//   rsync -a --exclude build --exclude .gradle fixtures/pearl/ <dir>/pearl/ && cd <dir>/pearl
//   git init -q -b main && git add -A && git commit -qm init && git worktree add ../pearl-big-cards -b feature/big-cards
//   (pearl-big-cards 의 PearlScreen.kt — GridCells.Fixed(1), DrinkCard(..., aspect = 2.2f) 를 커밋)
// 둘 다 prevue warmup <PearlPreviews.kt> --variant debug --resources-from :app 으로 덤프를 떠 둔다(공개 Maven만).
//
// 장면을 안 주면 전부 찍는다. 데몬이 없으면 이미 뜬 덤프로 --no-open 으로 띄운다 — 사람의 브라우저에 뷰어를 열지 않고,
// Gradle 은 부르지 않는다(덤프가 없으면 멈춘다). 찍은 뒤 데몬은 그대로 둔다 — 다 찍었으면 prevue stop --mine.
// 장면: hero · board · point · files · worktrees · interactive · devices · loop · bench. 바꿀 수 있는 것: --fps(GIF, 15) · --pace(GIF 박자, 0.7)
// · --iw · --ih(interactive 창) · --dw · --dh(devices 창) · --fw · --fh(files 창) · --bw · --bh(hero · board 창) · --at(point 비율) · --sweet(cup 의 Sweetness 줄 비율).
// GIF 장면(files · worktrees · interactive · devices)은 ffmpeg 가 있어야 한다. worktrees 는 크롬을 둘 더 띄우고 두 사본의 Theme.kt · strings.xml 을
// 고쳤다가 되돌린다. 픽스처가 바뀌면 사본을 다시 떼어 온다.
// 의존성 없음: Node 22+ 내장 WebSocket · fetch, macOS Chrome(CHROME 으로 바꾼다).

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PREVUE = join(ROOT, "plugin/bin/prevue");
const OUT = join(ROOT, "assets");
const FAVICON = `data:image/svg+xml;base64,${readFileSync(join(ROOT, "assets/icon.svg")).toString("base64")}`;
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SCALE = 2;   // 1x 는 레티나에서 글자가 뭉개진다
const BAR = 78;    // 크롬 창 머리 — 탭 줄 40 · 주소 줄 38(README 를 보는 사람이 브라우저로 알아보게)
const GAP = 28;    // 창 둘을 나란히 둘 때 사이
const PACE = 0.7;  // GIF 동작 사이 멈춤의 배율 — 애니메이션 속도는 그대로, 넘어가는 박자만 당긴다(--pace 로 바꾼다)

const NIA = {
  foryou: "feature/foryou/impl/src/main/kotlin/com/google/samples/apps/nowinandroid/feature/foryou/impl/ForYouScreen.kt",
  interests: "feature/interests/impl/src/main/kotlin/com/google/samples/apps/nowinandroid/feature/interests/impl/InterestsScreen.kt",
  search: "feature/search/impl/src/main/kotlin/com/google/samples/apps/nowinandroid/feature/search/impl/SearchScreen.kt",
  topic: "feature/topic/impl/src/main/kotlin/com/google/samples/apps/nowinandroid/feature/topic/impl/TopicScreen.kt",
  card: "core/ui/src/main/kotlin/com/google/samples/apps/nowinandroid/core/ui/NewsResourceCard.kt",
};
const PD = "feature/pearl/src/main/kotlin/com/example/pearl/feature/pearl";
const PEARL = {
  previews: `${PD}/PearlPreviews.kt`,
  showcase: `${PD}/showcase/ShowcasePreviews.kt`,
  components: `${PD}/showcase/ComponentPreviews.kt`,
};

const opt = {}, only = [];
for (let a = process.argv.slice(2), i = 0; i < a.length; i++) a[i].startsWith("--") ? (opt[a[i].slice(2)] = a[++i]) : only.push(a[i]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => s.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const pace = ms => ms * +(opt.pace || PACE);

// ── prevue ───────────────────────────────────────────────────────────────

function prevue(cwd, ...args) {
  const r = spawnSync(PREVUE, args, { cwd, encoding: "utf8", timeout: 240_000 });
  let json = null;
  try { json = JSON.parse(r.stdout); } catch { /* 사용법 등은 JSON 이 아니다 */ }
  return { code: r.status, json, text: (r.stdout || "") + (r.stderr || "") };
}

/** 그 저장소의 데몬을 files 탭으로 맞추고(마지막이 지금 탭) 뷰어 주소를 낸다. 첫 파일은 덤프가 있는 모듈이어야 한다. */
async function viewer(repo, files) {
  if (!repo) throw new Error("저장소 경로가 없다 — --nia · --pearl-a · --pearl-b");
  const abs = files.map(f => join(repo, f));
  const h = prevue(repo, "health", abs[0]).json;
  if (!h) throw new Error(`${abs[0]}: health 가 답하지 않는다`);
  if (!h.daemon) {
    const lack = (h.missing || []).filter(m => m !== "daemon");
    if (lack.length || !h.classpath) throw new Error(`${repo}: 준비가 덜 됐다(${lack.join(", ") || "덤프"}) — 에이전트로 이 저장소의 프리뷰를 한 번 띄운다`);
    const s = prevue(repo, "start", "--classpath", h.classpath, ...(h.resourcesClasspath ? ["--resources-from", h.resourcesClasspath] : []), "--no-open");
    if (s.code) throw new Error(`데몬을 못 띄웠다: ${s.text.slice(0, 400)}`);
  }
  const st = prevue(repo, "status").json;
  await post(st.viewer, "/viewer/exit");                 // 앞 장면이 남긴 작업 공간
  for (const t of st.tabs || []) if (!abs.includes(t.file)) prevue(repo, "close", t.file || t.fqn);
  for (const f of abs) {
    const r = prevue(repo, "show", f);
    if (r.code === 1 && r.json?.cards) {   // 실패한 카드가 있어도 탭은 열렸다 — 보드를 찍는 장면이면 파일을 바꾼다
      const bad = r.json.cards.filter(x => !x.ok).map(x => `${x.index} ${x.name}(${x.failure})`);
      console.warn(`  ${f.split("/").pop()}: 실패한 카드 ${bad.join(", ")}`);
    } else if (r.code !== 0) throw new Error(`show ${f}: ${r.text.slice(0, 400)}`);
  }
  return st.viewer;
}

/** prevue 를 기다리지 않고 띄운다 — 두 워크트리의 wait 를 같은 때 돌리려고. 벽시계 ms 와 JSON 을 낸다. */
function prevueAsync(cwd, ...args) {
  return new Promise((ok, no) => {
    const t = Date.now(), p = spawn(PREVUE, args, { cwd, timeout: 240_000 });
    let out = "", err = "";
    p.stdout.on("data", d => (out += d));
    p.stderr.on("data", d => (err += d));
    p.on("error", no);
    p.on("close", code => { let json = null; try { json = JSON.parse(out); } catch { /* 사용법 등 */ } ok({ code, json, ms: Date.now() - t, text: out + err }); });
  });
}

const post = (base, path, body = {}) =>
  fetch(new URL(path, base), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});

// ── Chrome ───────────────────────────────────────────────────────────────

async function chrome() {
  const prof = mkdtempSync(join(tmpdir(), "readme-shots-"));
  const ch = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-color-profile=srgb",
    `--user-data-dir=${prof}`, "--remote-debugging-port=0", "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
  let port = null;
  for (let i = 0; i < 100 && !port; i++) {
    const f = join(prof, "DevToolsActivePort");
    if (existsSync(f)) port = readFileSync(f, "utf8").split("\n")[0]; else await sleep(100);
  }
  if (!port) throw new Error(`Chrome 이 뜨지 않았다: ${CHROME}`);
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const wait = new Map(), events = new Map();
  ws.addEventListener("message", e => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    else if (m.method && events.has(m.method)) events.get(m.method)(m.params);
  });
  const on = (method, fn) => (fn ? events.set(method, fn) : events.delete(method));
  const send = (method, params = {}) => new Promise((ok, no) => {
    const i = ++id;
    wait.set(i, m => (m.error ? no(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evaluate = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const until = async (expr, ms = 30_000) => {
    for (const end = Date.now() + ms; Date.now() < end; await sleep(150)) if (await evaluate(expr).catch(() => false)) return;
    throw new Error(`기다림 시간 초과: ${expr.slice(0, 120)}`);
  };
  const rect = sel => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null;
    const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`);
  // 사람 입력을 흉내 낸다. modifiers: 1 Alt · 2 Ctrl · 4 Meta · 8 Shift
  const move = (x, y, modifiers = 0) => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, modifiers });
  const click = async (x, y, modifiers = 0) => {
    await move(x, y, modifiers);
    for (const type of ["mousePressed", "mouseReleased"]) await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1, modifiers });
  };
  const key = async (key, code, text) => {
    await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, text });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key, code });
  };
  const type = text => send("Input.insertText", { text });
  await send("Page.enable");
  await send("Runtime.enable");
  // 움직임 줄이기 — 모션이 도는 중간을 찍지 않는다. 멈춘 모양은 같다.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });
  return {
    send, on, evaluate, until, rect, move, click, key, type,
    async close() {
      ws.close();
      ch.kill();
      await new Promise(r => ch.once("exit", r));
      rmSync(prof, { recursive: true, force: true, maxRetries: 5 });
    },
  };
}

// 보드가 다 찼다 — 알약이 그리는 중이 아니고 카드 그림이 전부 디코드됐다
const BOARD = `(() => {
  if (document.getElementById("status").dataset.state === "busy") return false;
  const imgs = [...document.querySelectorAll("#cards .card .cstage img")].filter(i => !i.hidden);
  return imgs.length > 0 && imgs.every(i => i.complete && i.naturalWidth > 0);
})()`;
// 작업 공간에 들어와 그림이 섰다
const FOCUS = `(() => { const v = document.getElementById("focusView"), s = document.getElementById("shot");
  return !!v && !v.hidden && v.offsetWidth > 0 && s.complete && s.naturalWidth > 0; })()`;

/** 뷰어 한 화면을 찍는다. act 는 보드가 다 찬 뒤의 조작, crop 이면 창을 그 높이로 자른다(제목 줄 포함). */
async function window_(c, url, w, h, act, crop) {
  await c.send("Emulation.setDeviceMetricsOverride", { width: w, height: h - BAR, deviceScaleFactor: SCALE, mobile: false });
  await c.send("Page.navigate", { url });
  await c.until(BOARD);
  await sleep(500);
  if (act) await act(c);
  const title = await c.evaluate("document.title");
  const clip = crop ? { clip: { x: 0, y: 0, width: w, height: crop - BAR, scale: 1 } } : {};
  const { data } = await c.send("Page.captureScreenshot", { format: "png", ...clip });
  return { data, title, url, w, h: crop || h };
}

/** 카드 index 의 작업 공간에 들어가 그림이 멈출 때까지 기다린다 — 조작 중 스트림이 멈추면 원래 크기 PNG 로 바뀐다. */
async function enter(c, index) {
  await c.evaluate(`fetch("/viewer/focus", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"index":${index}}' }).then(() => true)`);
  await c.until(FOCUS);
  await sleep(3000);
}

/**
 * 크롬 창 테두리를 씌운 창들을 나란히 놓는 문서 — 신호등 · 탭 하나 · 주소창. 그림(data)은 PNG base64 다.
 * radius 0 이면 각진 창(GIF). iw 가 w 보다 넓으면 오른쪽을 자른다. 주소는 뷰어 주소에서 http:// 와 끝 / 를 뗀다.
 */
function windowsHtml(wins, radius = 10, extra = { bg: "transparent", css: "" }) {
  const addr = u => (u || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const icon = d => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5f6368" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  return `<!doctype html><meta charset="utf-8"><style>
    html, body { margin: 0; background: ${extra.bg}; }
    .row { display: flex; gap: ${GAP}px; align-items: flex-start; }
    .win { position: relative; border-radius: ${radius}px; overflow: hidden; background: #fff; font: 12px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif; }
    .win::after { content: ""; position: absolute; inset: 0; border-radius: ${radius}px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.18); pointer-events: none; }
    .strip { height: 40px; display: flex; align-items: flex-end; padding: 0 10px 0 14px; background: #dfe3e8; }
    .dots { display: flex; gap: 8px; align-self: center; margin-right: 22px; } .dots i { display: block; width: 12px; height: 12px; border-radius: 50%; }
    .dots i:nth-child(1) { background: #ff5f57; } .dots i:nth-child(2) { background: #febc2e; } .dots i:nth-child(3) { background: #28c840; }
    .tab { position: relative; height: 32px; width: 240px; min-width: 0; flex-shrink: 1; display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px;
      box-sizing: border-box; background: #fff; border-radius: 9px 9px 0 0; color: #202124; }
    .tab img { width: 16px; height: 16px; border-radius: 4px; }
    .tab .tt { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tab .x { color: #5f6368; font-size: 14px; }
    .plus { align-self: center; margin-left: 10px; color: #5f6368; font-size: 18px; line-height: 1; }
    .tools { height: 37px; display: flex; align-items: center; gap: 14px; padding: 0 12px; background: #fff; border-bottom: 1px solid #dadce0; }
    .omni { flex: 1; height: 28px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border-radius: 14px; background: #f1f3f4; color: #202124; font-size: 13px;
      white-space: nowrap; overflow: hidden; }
    .shot { display: block; }${extra.css}
  </style><div class="row">${wins.map(x => `<div class="win" style="width:${x.w}px">
    <div class="strip"><span class="dots"><i></i><i></i><i></i></span>
      <div class="tab"><img src="${FAVICON}" alt=""><span class="tt">${esc(x.title)}</span><span class="x">×</span></div><span class="plus">+</span></div>
    <div class="tools">${icon('<path d="M19 12H5M11 18l-6-6 6-6"/>')}${icon('<path d="M5 12h14M13 18l6-6-6-6"/>').replace('#5f6368', '#bdc1c6')}${icon('<path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>')}
      <div class="omni">${icon('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>')}<span>${esc(addr(x.url))}</span></div></div>
    <img class="shot"${x.id ? ` id="${x.id}"` : ""} width="${x.iw || x.w}" height="${x.h - BAR}" src="data:image/png;base64,${x.data}">${x.after || ""}</div>`).join("")}</div>`;
}

/** 창 테두리를 씌워 나란히 놓고 assets/<name>.png 로 쓴다. 바깥은 투명이다. */
async function frame(c, name, wins) {
  const W = wins.reduce((s, x) => s + x.w, 0) + GAP * (wins.length - 1);
  const H = Math.max(...wins.map(x => x.h));
  const html = windowsHtml(wins);
  await c.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
  await c.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await c.send("Page.navigate", { url: "about:blank" });
  await sleep(200);
  const { frameTree } = await c.send("Page.getFrameTree");
  await c.send("Page.setDocumentContent", { frameId: frameTree.frame.id, html });
  await c.until(`[...document.images].every(i => i.complete && i.naturalWidth > 0)`);
  const { data } = await c.send("Page.captureScreenshot", { format: "png" });
  await c.send("Emulation.setDefaultBackgroundColorOverride", {});
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`${name}.png  ${W * SCALE}×${H * SCALE}`);
}

// ── 인터랙티브 GIF ───────────────────────────────────────────────────────

// 녹화 중에만 얹는 포인터 — 헤드리스는 커서를 찍지 않아 무엇을 누르고 끄는지 안 보인다. 누르는 동안 둘레에 원이 진다.
const POINTER = `(() => {
  const el = document.createElement("div"), css = document.createElement("style");
  el.id = "rs-pointer";
  el.innerHTML = '<i></i><svg width="20" height="26" viewBox="0 0 20 26"><path d="M2 2v19l5-5 3.6 7.6 3.2-1.5L10.2 15H17z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  css.textContent = "#rs-pointer{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-99px,-99px)}" +
    "#rs-pointer svg{position:absolute;left:-2px;top:-2px}" +
    "#rs-pointer i{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.16);" +
    "box-shadow:0 0 0 1.5px rgba(255,255,255,.9);transform:scale(.4);opacity:0;transition:transform 120ms,opacity 120ms}" +
    "#rs-pointer.down i{transform:scale(1);opacity:1}";
  document.head.append(css); document.body.append(el);
  const at = e => { el.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; };
  addEventListener("mousemove", at, true);
  addEventListener("mousedown", e => { at(e); el.classList.add("down"); }, true);
  addEventListener("mouseup", e => { at(e); el.classList.remove("down"); }, true);
  return true;
})()`;

/** 사람 손처럼 — 포인터를 미끄러뜨려 옮기고, 누르고, 끌고, 뗀다. 좌표는 그림(#shot) 안의 비율이다. */
async function hand(c) {
  let s = await c.rect("#shot");
  let x = s.x + s.w * 0.62, y = s.y + s.h * 0.62, down = false;
  const mouse = (type, extra = {}) => c.send("Input.dispatchMouseEvent", { type, x, y, button: down || type !== "mouseMoved" ? "left" : "none", buttons: down ? 1 : 0, ...extra });
  const to = async (fx, fy, ms = 380) => {
    s = (await c.rect("#shot")) || s;   // 기기를 바꾸면 그림 자리 · 크기가 바뀐다
    const x0 = x, y0 = y, tx = s.x + s.w * fx, ty = s.y + s.h * fy, n = Math.max(1, Math.round(ms / 16));
    for (let i = 1; i <= n; i++) {
      const k = i / n, e = k < 0.5 ? 2 * k * k : 1 - (2 - 2 * k) ** 2 / 2;
      x = x0 + (tx - x0) * e; y = y0 + (ty - y0) * e;
      await mouse("mouseMoved");
      await sleep(16);
    }
  };
  const press = async () => { down = true; await mouse("mousePressed", { clickCount: 1 }); };
  const release = async () => { down = false; await mouse("mouseReleased", { clickCount: 1 }); };
  await mouse("mouseMoved");
  const toEl = async (sel, ms) => {
    s = (await c.rect("#shot")) || s;
    const r = await c.rect(sel);
    if (!r) throw new Error(`${sel} 이 없다`);
    await to((r.x + r.w / 2 - s.x) / s.w, (r.y + r.h / 2 - s.y) / s.h, ms);
  };
  return {
    async tapEl(sel, after = 700) { await toEl(sel, 520); await sleep(140); await press(); await sleep(90); await release(); await sleep(pace(after)); },
    async tap(fx, fy, after = 700) { await to(fx, fy); await sleep(140); await press(); await sleep(90); await release(); await sleep(pace(after)); },
    async drag(fx, fy, tx, ty, ms = 480, after = 1000) { await to(fx, fy); await sleep(140); await press(); await to(tx, ty, ms); await sleep(60); await release(); await sleep(pace(after)); },
  };
}

/** 화면을 녹화한다 — screencast 는 그림이 바뀔 때만 프레임을 주므로 시각을 함께 받아 길이로 쓴다. */
async function record(c, act, hold = 1400) {
  const frames = [];
  c.on("Page.screencastFrame", p => {
    frames.push({ data: p.data, t: p.metadata.timestamp });
    c.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {});
  });
  await c.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  await sleep(700);
  await act();
  await sleep(pace(hold));
  await c.send("Page.stopScreencast");
  c.on("Page.screencastFrame", null);
  return frames.map((f, i) => ({ data: f.data, d: i + 1 < frames.length ? frames[i + 1].t - f.t : hold / 1000 }));
}

/**
 * 프레임마다 창 테두리를 씌워 assets/<name>.gif 로 쓴다(ffmpeg). 창은 각지고 불투명하다 — 투명색이 있으면 인코더가
 * 안 바뀐 픽셀을 비우는 최적화를 못 써 프레임마다 창 전체를 담았다(한 장 6~7MB).
 */
async function gif(c, name, title, url, frames, w, h, iw = w) {
  await c.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await c.send("Page.navigate", { url: "about:blank" });
  await sleep(200);
  const { frameTree } = await c.send("Page.getFrameTree");
  await c.send("Page.setDocumentContent", { frameId: frameTree.frame.id, html: windowsHtml([{ w, iw, h, title, url, data: frames[0].data }], 0) });
  const sink = gifSink();
  for (const f of frames) {
    await c.evaluate(`(() => { const i = document.querySelector(".shot"); i.src = "data:image/png;base64,${f.data}"; return i.decode().then(() => true); })()`);
    sink.add((await c.send("Page.captureScreenshot", { format: "png" })).data, f.d);
  }
  sink.finish(name, w, h);
}

/** GIF 프레임을 받는 대로 임시 폴더에 쓰고 finish 에서 assets/<name>.gif 로 묶는다(ffmpeg) — 프레임을 메모리에 쌓지 않는다. */
function gifSink() {
  const dir = mkdtempSync(join(tmpdir(), "readme-gif-"));
  let list = "", n = 0, secs = 0;
  return {
    add(data, d) {
      writeFileSync(join(dir, `${n}.png`), Buffer.from(data, "base64"));
      list += `file '${n}.png'\nduration ${d.toFixed(3)}\n`;
      n++; secs += d;
    },
    finish(name, w, h) {
      writeFileSync(join(dir, "list.txt"), list + `file '${n - 1}.png'\n`);
      // 사각형 갱신 · 디더링 없음 — 바뀌는 칸만 프레임에 담고 판판한 UI 가 잘 눌린다.
      const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-vf",
        `fps=${opt.fps || 15},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
        "-loop", "0", join(OUT, `${name}.gif`)], { encoding: "utf8" });
      rmSync(dir, { recursive: true, force: true });
      if (r.status !== 0) throw new Error(`ffmpeg: ${r.error?.message || r.stderr}`);
      console.log(`${name}.gif  ${w}×${h} · ${n}장 · ${secs.toFixed(1)}초`);
    },
  };
}

/**
 * 작업 공간에 들어가 손이 하는 일을 GIF 로 — 1x, 세로로 긴 프리뷰에 맞춘 좁은 창(README 세 칸 폭).
 * 오른쪽 패널까지 넣으면 좁은 창에서 그림이 패널에 밀려 작아진다 — 패널 폭만큼 넓게 띄워 그리고 패널은 잘라 낸다.
 */
async function interactiveGif(c, name, repo, file, fn, act) {
  const url = await viewer(repo, [file]);
  const card = (prevue(repo, "board").json?.cards || []).find(x => x.name === fn);
  if (!card) throw new Error(`${file}: ${fn} 카드가 없다`);
  const w = +(opt.iw || 480), h = +(opt.ih || 860), panel = 264;
  await c.send("Emulation.setDeviceMetricsOverride", { width: w + panel, height: h - BAR, deviceScaleFactor: 1, mobile: false });
  await c.send("Page.navigate", { url });
  await c.until(BOARD);
  await enter(c, card.index);
  await c.evaluate(POINTER);
  const cut = Math.floor((await c.rect("#panel"))?.x || w);   // 패널이 아직 숨어 있으면 x 가 0 이다
  const title = await c.evaluate("document.title");
  const frames = await record(c, async () => act(await hand(c)));
  await post(url, "/viewer/exit");
  await gif(c, name, title, url, frames, cut, h, w + panel);
}

/**
 * 패널에서 크기 · 기기를 바꾸는 GIF — 패널이 요점이라 자르지 않는다. 틀이 새 크기로 옮겨 가는 모프를 보이려고 이 장면만 움직임 줄이기를 끈다.
 */
async function devicesGif(c, name, repo, file, fn, act) {
  const url = await viewer(repo, [file]);
  const card = (prevue(repo, "board").json?.cards || []).find(x => x.name === fn);
  if (!card) throw new Error(`${file}: ${fn} 카드가 없다`);
  const w = +(opt.dw || 930), h = +(opt.dh || 860);
  await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "no-preference" }] });
  try {
    await c.send("Emulation.setDeviceMetricsOverride", { width: w, height: h - BAR, deviceScaleFactor: 1, mobile: false });
    await c.send("Page.navigate", { url });
    await c.until(BOARD);
    await enter(c, card.index);
    await c.evaluate(POINTER);
    const title = await c.evaluate("document.title");
    const frames = await record(c, async () => act(await hand(c)), 1800);
    await gif(c, name, title, url, frames, w, h);
  } finally {
    await post(url, "/viewer/exit");
    await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });
  }
}

/** assets/<name>.svg 를 2x PNG 로 — 크기는 SVG 의 width · height 다. 둥근 캔버스 바깥은 투명이다. */
async function svgPng(c, name) {
  const src = readFileSync(join(OUT, `${name}.svg`), "utf8");
  const root = src.match(/<svg\b[^>]*>/)?.[0] || "";
  const attr = k => +(root.match(new RegExp(`\\s${k}="([\\d.]+)"`)) || [])[1];
  const box = (root.match(/viewBox="\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*"/) || []).slice(1).map(Number);
  const W = Math.round(attr("width") || box[0]), H = Math.round(attr("height") || box[1]);
  if (!W || !H) throw new Error(`assets/${name}.svg: 맨 위 <svg> 에 width · height 도 viewBox 도 없다`);
  await c.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: SCALE, mobile: false });
  await c.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await c.send("Page.navigate", { url: `file://${join(OUT, `${name}.svg`)}` });
  await c.until(`location.href.endsWith("/${name}.svg") && document.readyState === "complete"`);   // 앞 SVG 의 complete 를 새 문서로 읽지 않게
  await c.evaluate(`document.fonts ? document.fonts.ready.then(() => true) : true`);
  await sleep(800);
  const { data } = await c.send("Page.captureScreenshot", { format: "png" });
  await c.send("Emulation.setDefaultBackgroundColorOverride", {});
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`${name}.png  ${W * SCALE}×${H * SCALE}`);
}

// ── 장면 ─────────────────────────────────────────────────────────────────

const SCENES = {
  // 첫 화면 — 탭 셋 · 헤더의 폴더 ⑂ 브랜치 · 알약 ✓ · 묶음 배율
  async hero(c) {
    const url = await viewer(opt.nia, [NIA.foryou, NIA.interests, NIA.card, NIA.foryou]);
    await frame(c, "hero", [await window_(c, url, +(opt.bw || 680), +(opt.bh || 760))]);   // board 와 같은 크기 — README 한 줄에 나란히 놓인다
  },
  // 보드 둘째 — 버블티 앱 Pearl 의 컴포넌트 쇼케이스. 화면 · 카드 · 버튼 · 내비 · 맛 패널이 한 보드에 깔린다
  async board(c) {
    const url = await viewer(opt["pearl-a"], [PEARL.components]);
    await frame(c, "board-pearl", [await window_(c, url, +(opt.bw || 680), +(opt.bh || 760))]);
  },
  // 가리키기 — 작업 공간에서 ⌥+클릭한 박스와 캡슐의 파일:라인 · 사슬
  async point(c) {
    const url = await viewer(opt.nia, [NIA.foryou]);
    await frame(c, "point", [await window_(c, url, 1280, 820, async c => {
      await enter(c, 0);
      const s = await c.rect("#shot");
      const [fx, fy] = (opt.at || "0.34,0.29").split(",").map(Number);   // 첫 뉴스 카드의 제목 — 캡슐 사슬에 NewsResourceTitle
      await c.click(s.x + s.w * fx, s.y + s.h * fy, 1);
      await sleep(1200);
    })]);
    await post(url, "/viewer/exit");
  },
  // 파일 오가기 — 빠른 열기(/)로 파일 이름 · 머리글자를 쳐서 열면 왼쪽 열린 파일 목록에 쌓이고, 숫자 키로 그 사이를 오간다
  async files(c) {
    const url = await viewer(opt.nia, [NIA.foryou]);
    const w = +(opt.fw || 1280), h = +(opt.fh || 760);
    await c.send("Emulation.setDeviceMetricsOverride", { width: w, height: h - BAR, deviceScaleFactor: 1, mobile: false });
    await c.send("Page.navigate", { url });
    await c.until(BOARD);
    await sleep(800);
    const title = await c.evaluate("document.title");
    const typeSlow = async text => { for (const ch of text) { await c.type(ch); await sleep(pace(110)); } };
    const open = async (query, file, settle = 1800) => {                   // 제목이 새 파일로 바뀐 뒤 보드가 찰 때까지 — 앞 보드로 넘어가지 않게
      await c.key("/", "Slash", "/"); await sleep(pace(600));
      await typeSlow(query); await sleep(pace(1500));
      await c.key("Enter", "Enter", "\r");
      await c.until(`document.title.startsWith(${JSON.stringify(file)})`, 60_000);
      await sleep(300); await c.until(BOARD, 60_000); await sleep(pace(settle));
    };
    const frames = await record(c, async () => {
      await open("topic", "TopicScreen");                                    // 파일 이름 — 함수 이름이 맞은 줄도 함께 뜬다
      await open("nrc", "NewsResourceCard");                                 // 머리글자 — NewsResourceCard.kt
      await c.key("1", "Digit1", "1"); await sleep(pace(1600));              // 열린 파일 사이를 숫자 키로
      await c.key("2", "Digit2", "2"); await sleep(pace(1600));
    }, 700);
    await gif(c, "files", title, url, frames, w, h);
  },
  // 워크트리 나란히 — 워크트리 둘에 데몬 둘. 두 쪽이 같은 때 저장하면 각자 다시 그리고(①), 한쪽만 저장하면 다른 쪽은 그대로다(②).
  // 사본 저장소에 실제로 저장하고 prevue wait 를 돌려 그 값을 창 아래 터미널 띠에 찍는다. 끝나면 파일을 되돌리고 다시 그려질 때까지 기다린다.
  // 뷰어는 iframe 에 담기지 않아 크롬을 둘 더 띄워 각자 녹화하고, 같은 시계(초)로 두 창과 터미널을 한 장씩 합친다.
  async worktrees(c) {
    const A = opt["pearl-a"], B = opt["pearl-b"];
    const ua = await viewer(A, [PEARL.previews]), ub = await viewer(B, [PEARL.previews]);
    const theme = "core/designsystem/src/main/kotlin/com/example/pearl/core/designsystem/Theme.kt";
    const strings = "feature/pearl/src/main/res/values/strings.xml";
    const keep = [[join(A, theme), readFileSync(join(A, theme), "utf8")], [join(B, strings), readFileSync(join(B, strings), "utf8")]];
    const edit = (text, from, to) => {                                      // 픽스처가 바뀌어 맞는 자리가 없으면 그 자리에서 멈춘다
      if (!text.includes(from)) throw new Error(`worktrees: 사본에 ${from} 이 없다 — 장면의 고칠 자리를 다시 맞춘다`);
      return text.replace(from, to);
    };
    const forest = (hex, light) => edit(edit(keep[0][1], "Color(0xFF00664F)", `Color(0xFF${hex})`), "Color(0xFF0B7A5F)", `Color(0xFF${light})`);
    const ww = 720, vh = 540, th = 172;
    const label = (dir, n) => `agent ${n} · ${basename(dir)} (${spawnSync("git", ["-C", dir, "branch", "--show-current"], { encoding: "utf8" }).stdout.trim()})`;
    const who = { a: label(A, 1), b: label(B, 2) }, titles = {};
    const lines = { a: [], b: [] };                                          // [시각(초), 글, 종류]
    const say = (k, text, cls = "") => lines[k].push([Date.now() / 1000, text, cls]);
    const waited = r => {
      if (r.code !== 0 || !r.json?.cards) throw new Error(`worktrees: prevue wait 종료 ${r.code} — ${r.text.slice(0, 400)}`);
      return `✓ ${r.json.cards.length} previews redrawn · ${(r.ms / 1000).toFixed(1)} s`;
    };
    const rec = async (cc, url) => {
      await cc.send("Emulation.setDeviceMetricsOverride", { width: ww, height: vh, deviceScaleFactor: 1, mobile: false });
      await cc.send("Page.navigate", { url });
      await cc.until(BOARD);
      titles[cc === browsers[0] ? "a" : "b"] = await cc.evaluate("document.title");
      const frames = [];
      cc.on("Page.screencastFrame", p => {                                // 시각은 화면 시계 — 없으면 받은 때
        frames.push({ data: p.data, t: p.metadata?.timestamp ?? Date.now() / 1000 });
        cc.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {});
      });
      await cc.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
      return async () => { await cc.send("Page.stopScreencast"); cc.on("Page.screencastFrame", null); return frames; };
    };
    const browsers = [];
    let fa, fb, t0, t1;
    try {
      const ca = await chrome(); browsers.push(ca);
      const cb = await chrome(); browsers.push(cb);
      const [stopA, stopB] = await Promise.all([rec(ca, ua), rec(cb, ub)]);
      await sleep(1500);
      t0 = Date.now() / 1000;
      await sleep(900);
      say("a", "✎ Theme.kt  forest → purple", "ed"); say("b", "✎ strings.xml  headline → \"Big cards, big sips\"", "ed");
      writeFileSync(keep[0][0], forest("5458C4", "6F74DD"));                  // ① 두 쪽이 같은 때 저장한다
      writeFileSync(keep[1][0], edit(keep[1][1], "What\\'s your sip today?", "Big cards, big sips"));
      say("a", "$ prevue wait"); say("b", "$ prevue wait");
      const both = await Promise.allSettled([prevueAsync(A, "wait", join(A, theme)).then(r => say("a", waited(r), "ok")),
                                             prevueAsync(B, "wait", join(B, strings)).then(r => say("b", waited(r), "ok"))]);
      const bad = both.filter(x => x.status === "rejected").map(x => x.reason.message);   // 한쪽이 실패해도 다른 쪽 wait 를 끝까지 기다린 뒤 둘 다 알린다
      if (bad.length) throw new Error(bad.join(" / "));
      await sleep(pace(2600));
      say("a", "✎ Theme.kt  forest → orange", "ed");                         // ② 왼쪽만 — 오른쪽은 그대로다
      writeFileSync(keep[0][0], forest("E8622C", "F07A45"));
      say("a", "$ prevue wait");
      say("a", waited(await prevueAsync(A, "wait", join(A, theme))), "ok");
      await sleep(pace(2600));
      t1 = Date.now() / 1000;
      [fa, fb] = await Promise.all([stopA(), stopB()]);
    } finally {
      for (const [f, t] of keep) writeFileSync(f, t);
      for (const r of await Promise.all([prevueAsync(A, "wait", join(A, theme)), prevueAsync(B, "wait", join(B, strings))]))   // 다음 장면이 되돌리는 중의 그림을 찍지 않게
        if (r.code !== 0) console.warn(`  worktrees: 되돌린 뒤 wait 종료 ${r.code} — 다음 장면 전에 데몬을 본다: ${r.text.slice(0, 200)}`);
      await Promise.all(browsers.map(b => b.close()));
    }
    if (!fa.length || !fb.length) throw new Error(`worktrees: 녹화된 프레임이 없다(왼쪽 ${fa.length} · 오른쪽 ${fb.length})`);
    // 합치기 — 바뀐 시각마다 두 창의 마지막 프레임과 그때까지의 터미널 줄로 한 장
    const step = 1 / +(opt.fps || 15), ts = [];                            // 인코더가 어차피 이 간격으로 뽑는다 — 그보다 잘게 합치지 않는다
    for (let t = t0; t <= t1; t += step) ts.push(t);
    const cursor = fs => { let k = 0; return t => { while (k + 1 < fs.length && fs[k + 1].t <= t) k++; return fs[k].data; }; };
    const atA = cursor(fa), atB = cursor(fb);
    const W = ww * 2 + GAP + 32, H = BAR + vh + th + 32;
    const term = (k, t) => `<div class="term" id="t${k}"><div class="who">${esc(who[k])}</div>${
      lines[k].filter(l => l[0] <= t).map(([, text, cls]) => `<div class="${cls}">${esc(text)}</div>`).join("")}</div>`;
    const css = ` .row { padding: 16px; } .term { height: ${th}px; box-sizing: border-box; padding: 10px 14px; background: #1d1d1f; color: #e5e5ea;
      font: 13px/1.55 ui-monospace, "SF Mono", Menlo, monospace; } .who { color: #8e8e93; margin-bottom: 4px; } .ok { color: #30d158; } .ed { color: #64d2ff; }`;
    const page = windowsHtml([
      { w: ww, h: BAR + vh, title: titles.a, url: ua, data: "", id: "ia", after: '<div id="ta"></div>' },
      { w: ww, h: BAR + vh, title: titles.b, url: ub, data: "", id: "ib", after: '<div id="tb"></div>' },
    ], 10, { bg: "#fff", css });
    await c.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await c.send("Page.navigate", { url: "about:blank" });
    await sleep(200);
    const { frameTree } = await c.send("Page.getFrameTree");
    await c.send("Page.setDocumentContent", { frameId: frameTree.frame.id, html: page });
    const sink = gifSink();
    for (const t of ts) {
      const ta = term("a", t), tb = term("b", t);
      await c.evaluate(`(() => { document.getElementById("ta").outerHTML = ${JSON.stringify(ta)};
        document.getElementById("tb").outerHTML = ${JSON.stringify(tb)};
        const a = document.getElementById("ia"), b = document.getElementById("ib");
        a.src = "data:image/png;base64,${atA(t)}"; b.src = "data:image/png;base64,${atB(t)}";
        return Promise.all([a.decode(), b.decode()]).then(() => true); })()`);
      sink.add((await c.send("Page.captureScreenshot", { format: "png" })).data, step);
    }
    sink.finish("worktrees", W, H);
  },
  // 인터랙티브 — 작업 공간에 들어가 누르고 끄는 창 전체. 좌표는 360×780dp 그림 안의 비율(그림을 다시 그리면 다시 잰다)
  async interactive(c) {
    const repo = opt["pearl-a"];
    await interactiveGif(c, "interactive-nav", repo, PEARL.showcase, "NavTourPreview", async h => {
      await h.tap(0.52, 0.94, 1300);                                         // Orders — 알약이 미끄러지고 글자가 펼쳐진다
      await h.tap(0.70, 0.94, 1300);                                         // Saved
      await h.tap(0.83, 0.94, 1300);                                         // Profile
      await h.tap(0.20, 0.94, 1500);                                         // Home
    });
    await interactiveGif(c, "interactive-header", repo, PEARL.showcase, "HomeTourPreview", async h => {
      await h.tap(0.33, 0.326, 1600);                                        // Fruit tea — 머리 색이 번지고 컵이 바뀌고 제목이 바뀐다
      await h.tap(0.585, 0.326, 1600);                                       // Milk tea
      await h.tap(0.83, 0.326, 1600);                                        // Matcha
      await h.tap(0.13, 0.326, 1800);                                        // All
    });
    await interactiveGif(c, "interactive-detail", repo, PEARL.showcase, "HomeTourPreview", async h => {
      await h.tap(0.275, 0.48, 2000);                                        // Taro 카드 — 판이 커지고 컵이 상세 컵 자리로 날아간다
      await h.tap(0.5, 0.943, 2000);                                         // Add to bag — 컵이 가방으로, 배지가 튄다
      await h.tap(0.133, 0.057, 1600);                                       // ← 거꾸로
    });
    await interactiveGif(c, "interactive-cup", repo, PEARL.showcase, "SipPreview", async h => {
      await h.tap(0.795, 0.628, 2600);                                       // Ice Extra — 뚜껑이 열리고 얼음이 떨어져 수면이 오른다
      await h.tap(0.833, 0.728, 2600);                                       // Pearls Extra — 곡선으로 쏟아진다
      await h.tap(0.168, 0.728, 2200);                                       // Pearls None — 휘어 화면 밖으로
      await h.drag(0.5, 0.25, 0.78, 0.25, 420, 200);                         // 컵을 좌우로 끌면 출렁인다
      await h.drag(0.78, 0.25, 0.25, 0.25, 520, 1600);
      await h.drag(0.5, 0.86, 0.5, 0.62, 520, 700);                          // 시트를 올려 Sweetness 를 꺼낸다
      await h.tap(0.12, +(opt.sweet || 0.81), 1200);                         // 0% — 음료 색이 옅어진다
      await h.tap(0.88, +(opt.sweet || 0.81), 1600);                         // 100% — 짙어진다
    });
  },
  // 크기 · 기기 — 600dp 부터 상세가 왼쪽 컵 · 오른쪽 패널로 갈리는 Preview 를 패널에서 기기 · 접기만 바꿔 다시 그린다. 고를 때마다 그림이 서기를 기다린다
  async devices(c) {
    await devicesGif(c, "devices", opt["pearl-a"], PEARL.showcase, "DevicesPreview", async h => {
      const pick = async (sel, after = 2000) => { await h.tapEl(`#pnPick [data-sel="${sel}"]`, 300); await c.until(FOCUS, 20_000); await sleep(pace(after)); };
      await pick("s26");                                                     // 폰 — 컵 아래 고르기
      const fold = async (after = 2400) => { await h.tapEl("#dcFold", 300); await c.until(FOCUS, 20_000); await sleep(pace(after)); };
      await pick("ipduo", 2400);                                             // 펼친 iPhone Duo — 왼쪽 컵 · 오른쪽 패널
      await fold();                                                          // 접으면 커버 — 다시 세로
      await fold();                                                          // 다시 펴면 컵 · 패널
      await pick("tablet", 2600);                                            // 태블릿 가로 — 컵 · 패널
    });
  },
  // 맡기기의 루프 그림 · 벤치마크(두 판 × 영어 · 한국어) — 원본 SVG 를 2x PNG 로. 데몬이 필요 없다
  async loop(c) { for (const n of ["agent-loop", "agent-loop.ko", "agent-loop-before", "agent-loop-before.ko"]) await svgPng(c, n); },
  async bench(c) { for (const n of ["benchmark-vs", "benchmark-redraw", "benchmark-vs.ko", "benchmark-redraw.ko"]) await svgPng(c, n); },
};

const c = await chrome();
try {
  for (const name of only) if (!SCENES[name]) throw new Error(`모르는 장면 ${name} — ${Object.keys(SCENES).join(" · ")}`);
  for (const [name, run] of Object.entries(SCENES)) if (!only.length || only.includes(name)) await run(c);
} finally {
  await c.close();
}
