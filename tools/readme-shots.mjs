#!/usr/bin/env node
// README 그림을 다시 찍는다 — 헤드리스 Chrome 을 CDP 로 몰아 뷰어를 찍고, 창 테두리를 씌워 assets/ 에 쓴다.
//
//   node tools/readme-shots.mjs --nia <nowinandroid> --pearl-a <Pearl 체크아웃> --pearl-b <그 워크트리> --kotlinconf <kotlinconf-app> [장면...]
//
// --kotlinconf 는 JetBrains/kotlinconf-app 체크아웃이다 — board 장면의 Compose Multiplatform 보드(commonMain)를 찍는다.
// 덤프는 prevue warmup 으로 :app:androidApp 을 한 번 떠 둔다(공개 저장소라도 Gradle 을 돌리기 전 승인).
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
// 장면: hero · board · party · pointing · worktrees · match · interactive · devices · loop · bench. 바꿀 수 있는 것: --fps(GIF, 15) · --pace(GIF 박자, 0.7)
// · --mw · --mh(match 가운데 창) · --iw · --ih(interactive 창) · --dw · --dh(devices 창) · --bw · --bh(hero · board 창) · --bare(board 를 뷰어만) · --kw · --kh · --party · --out(party · pointing 의 webp 이름 — 둘이 같이 읽으니 한 장면씩 찍을 때만) · --q(img2webp 필요) · --pw · --ph · --at(pointing 창 · 누를 자리) · --sweet(cup 의 Sweetness 줄 비율).
// GIF 장면(pointing · worktrees · match · interactive · devices)은 ffmpeg 가 있어야 한다. worktrees 는 크롬을 둘 더 띄우고 두 사본의 Theme.kt · strings.xml 을,
// match 는 크롬을 하나 더 띄우고 --pearl-a 의 PearlScreen.kt · Theme.kt 를 고쳤다가 되돌린다. 픽스처가 바뀌면 사본을 다시 떼어 온다.
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
  screen: `${PD}/PearlScreen.kt`,
  theme: "core/designsystem/src/main/kotlin/com/example/pearl/core/designsystem/Theme.kt",
  strings: "feature/pearl/src/main/res/values/strings.xml",
  showcase: `${PD}/showcase/ShowcasePreviews.kt`,
  components: `${PD}/showcase/ComponentPreviews.kt`,
};
const KD = "app/ui-components/src/commonMain/kotlin/org/jetbrains/kotlinconf/ui/components";
const KC = {
  talk: `${KD}/TalkCard.kt`,
  party: `${KD}/PartyAnimation.kt`,
  speaker: `${KD}/SpeakerCard.kt`,
  header: `${KD}/MainHeader.kt`,
  kodee: `${KD}/Kodee.kt`,
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
  if (!repo) throw new Error("저장소 경로가 없다 — --nia · --pearl-a · --pearl-b · --kotlinconf");
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
  await send("Page.enable");
  await send("Runtime.enable");
  // 움직임 줄이기 — 모션이 도는 중간을 찍지 않는다. 멈춘 모양은 같다.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });
  return {
    send, on, evaluate, until, rect, move, click, key,
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
 * extra.bare 면 탭 줄 · 주소창 없이 뷰어만 둥글게 담는다 — 릴리즈 히어로처럼 제목이 이미 "브라우저"를 말하는 그림.
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
    ${extra.bare ? "" : `<div class="strip"><span class="dots"><i></i><i></i><i></i></span>
      <div class="tab"><img src="${FAVICON}" alt=""><span class="tt">${esc(x.title)}</span><span class="x">×</span></div><span class="plus">+</span></div>
    <div class="tools">${icon('<path d="M19 12H5M11 18l-6-6 6-6"/>')}${icon('<path d="M5 12h14M13 18l6-6-6-6"/>').replace('#5f6368', '#bdc1c6')}${icon('<path d="M20 11a8.1 8.1 0 0 0-15.5-2m-.5-4v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>')}
      <div class="omni">${icon('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>')}<span>${esc(addr(x.url))}</span></div></div>`}
    <img class="shot"${x.id ? ` id="${x.id}"` : ""} width="${x.iw || x.w}" height="${x.h - BAR}" src="data:image/png;base64,${x.data}">${x.after || ""}</div>`).join("")}</div>`;
}

/** 창 테두리를 씌워 나란히 놓고 assets/<name>.png 로 쓴다. 바깥은 투명이다. */
async function frame(c, name, wins, bare = false) {
  const W = wins.reduce((s, x) => s + x.w, 0) + GAP * (wins.length - 1);
  const H = Math.max(...wins.map(x => x.h)) - (bare ? BAR : 0);
  const html = windowsHtml(wins, 10, { bg: "transparent", css: "", bare });
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
    async rest(ms = 520) { await to(0.62, 0.62, ms); },   // 손이 처음 놓인 자리 — 끝을 첫 장과 같게 해 GIF 반복을 잇는다
    async tapEl(sel, after = 700) { await toEl(sel, 520); await sleep(140); await press(); await sleep(90); await release(); await sleep(pace(after)); },
    async tap(fx, fy, after = 700) { await to(fx, fy); await sleep(140); await press(); await sleep(90); await release(); await sleep(pace(after)); },
    async drag(fx, fy, tx, ty, ms = 480, after = 1000) { await to(fx, fy); await sleep(140); await press(); await to(tx, ty, ms); await sleep(60); await release(); await sleep(pace(after)); },
  };
}

/**
 * 보드처럼 #shot 이 없는 화면의 손 — hand() 는 작업 공간의 그림을 기준으로 해 보드에서는 못 쓴다. 포인터를 미끄러뜨려
 * 요소 한가운데(선택자)나 화면 좌표로 옮기고 누른다.
 */
function glide(c, x, y) {
  const mouse = (type, extra = {}) => c.send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", buttons: 0, ...extra });
  const to = async (tx, ty, n = 32) => {
    const x0 = x, y0 = y;
    for (let i = 1; i <= n; i++) {
      const k = i / n, e = k < 0.5 ? 2 * k * k : 1 - (2 - 2 * k) ** 2 / 2;
      x = x0 + (tx - x0) * e; y = y0 + (ty - y0) * e;
      await mouse("mouseMoved");
      await sleep(16);
    }
  };
  const toEl = async sel => {
    const r = await c.rect(sel);
    if (!r) throw new Error(`${sel} 이 없다`);
    await to(r.x + r.w / 2, r.y + r.h / 2);
  };
  const tap = async () => { await sleep(160); await mouse("mousePressed", { clickCount: 1 }); await sleep(90); await mouse("mouseReleased", { clickCount: 1 }); };
  return {
    at: () => mouse("mouseMoved"),
    async press(sel) { await toEl(sel); await tap(); },
    async pressAt(tx, ty) { await to(tx, ty); await tap(); },
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

/** 프레임을 초당 fps 장 이하로 솎는다 — 짧은 프레임은 다음 프레임에 길이를 넘기고 빠진다. 마지막 프레임은 남긴다. */
function thin(frames, fps) {
  const out = [];
  let carry = 0;
  for (const [i, f] of frames.entries()) {
    carry += f.d;
    if (carry >= 1 / fps || i === frames.length - 1) { out.push({ data: f.data, d: carry }); carry = 0; }
  }
  return out;
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

/** 프레임마다 뷰어만 둥글게 담아(탭 줄 · 주소창 없음, 바깥 투명) 움직이는 WebP 로 묶는다(img2webp, 알파를 담는다). assets/<name>.webp */
async function webpOf(c, name, frames, w, h) {
  await c.send("Emulation.setDeviceMetricsOverride", { width: w, height: h - BAR, deviceScaleFactor: 1, mobile: false });
  await c.send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  await c.send("Page.navigate", { url: "about:blank" });
  await sleep(200);
  const { frameTree } = await c.send("Page.getFrameTree");
  await c.send("Page.setDocumentContent", { frameId: frameTree.frame.id, html: windowsHtml([{ w, h, title: "", url: "", data: frames[0].data }], 10, { bg: "transparent", css: "", bare: true }) });
  const dir = mkdtempSync(join(tmpdir(), "readme-webp-"));
  const args = ["-loop", "0", "-lossy", "-q", String(opt.q || 70), "-m", "6"];
  let secs = 0;
  for (let i = 0; i < frames.length; i++) {
    await c.evaluate(`(() => { const i = document.querySelector(".shot"); i.src = "data:image/png;base64,${frames[i].data}"; return i.decode().then(() => true); })()`);
    writeFileSync(join(dir, `${i}.png`), Buffer.from((await c.send("Page.captureScreenshot", { format: "png" })).data, "base64"));
    args.push("-d", String(Math.max(20, Math.round(frames[i].d * 1000))), join(dir, `${i}.png`));
    secs += frames[i].d;
  }
  await c.send("Emulation.setDefaultBackgroundColorOverride", {});
  const r = spawnSync("img2webp", [...args, "-o", join(OUT, `${name}.webp`)], { encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  if (r.status !== 0) throw new Error(`img2webp: ${r.error?.message || r.stderr}`);
  console.log(`${name}.webp  ${w}×${h - BAR} · ${frames.length}장 · ${secs.toFixed(1)}초`);
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
 * 작업 공간에 들어가 손이 하는 일을 GIF 로 — 1x, 세로로 긴 프리뷰에 맞춘 좁은 창(README 네 칸 폭).
 * 무대 아래 조작 독(D-167)은 그대로 둔다 — 단일 뷰가 지금 어떻게 생겼는지도 그림이 보인다.
 */
async function interactiveGif(c, name, repo, file, fn, act) {
  const url = await viewer(repo, [file]);
  const card = (prevue(repo, "board").json?.cards || []).find(x => x.name === fn);
  if (!card) throw new Error(`${file}: ${fn} 카드가 없다`);
  const w = +(opt.iw || 480), h = +(opt.ih || 860);
  await c.send("Emulation.setDeviceMetricsOverride", { width: w, height: h - BAR, deviceScaleFactor: 1, mobile: false });
  await c.send("Page.navigate", { url });
  await c.until(BOARD);
  await enter(c, card.index);
  await c.evaluate(POINTER);
  const title = await c.evaluate("document.title");
  const frames = await record(c, async () => act(await hand(c)));
  await post(url, "/viewer/exit");
  await gif(c, name, title, url, frames, w, h, w);
}

/**
 * 조작 독에서 크기 · 기기를 바꾸는 GIF — 독이 요점이라 자르지 않는다. 틀이 새 크기로 옮겨 가는 모프를 보이려고 이 장면만 움직임 줄이기를 끈다.
 * setup 은 녹화 전에 첫 장면을 맞춘다 — 끝 장면과 같게 두면 GIF 반복이 끊기지 않는다.
 */
async function devicesGif(c, name, repo, file, fn, act, setup) {
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
    if (setup) { const hd = await hand(c); await setup(hd); await hd.rest(0); }
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

// ── 저장 장면(worktrees · match) — 사본에 실제로 저장하고 prevue wait 결과를 창 아래 터미널 띠에 찍는다 ──

/** 고칠 자리가 사본에 그대로 있을 때만 바꾼다 — 픽스처가 바뀌어 맞는 자리가 없으면 그 자리에서 멈춘다. */
function edit(scene, text, from, to) {
  if (!text.includes(from)) throw new Error(`${scene}: 사본에 ${from} 이 없다 — 장면의 고칠 자리를 다시 맞춘다`);
  return text.replace(from, to);
}

function waited(scene, r) {
  if (r.code !== 0 || !r.json?.cards) throw new Error(`${scene}: prevue wait 종료 ${r.code} — ${r.text.slice(0, 400)}`);
  return `✓ ${r.json.cards.length} previews redrawn · ${(r.ms / 1000).toFixed(1)} s`;
}

/** 따로 띄운 크롬에서 뷰어를 녹화한다 — 시각은 화면 시계(초), 없으면 받은 때. act 는 보드가 다 찬 뒤 녹화 전의 조작 */
async function screencast(cc, url, w, h, act) {
  await cc.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await cc.send("Page.navigate", { url });
  await cc.until(BOARD);
  if (act) await act(cc);
  const title = await cc.evaluate("document.title");
  const frames = [];
  cc.on("Page.screencastFrame", p => {
    frames.push({ data: p.data, t: p.metadata?.timestamp ?? Date.now() / 1000 });
    cc.send("Page.screencastFrameAck", { sessionId: p.sessionId }).catch(() => {});
  });
  await cc.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  return { title, stop: async () => { await cc.send("Page.stopScreencast"); cc.on("Page.screencastFrame", null); return frames; } };
}

/** 시각 t 에 보이던 프레임 — 시각이 늘기만 하는 차례로 부른다 */
const cursor = fs => { let k = 0; return t => { while (k + 1 < fs.length && fs[k + 1].t <= t) k++; return fs[k].data; }; };

/** 에이전트 터미널 띠. 줄은 찍힌 시각과 함께 쌓고, 합칠 때 그 시각까지의 줄 중 끝의 rows 줄만 그린다(띠가 넘치면 위가 밀려 올라간다) */
function terminal(rows = Infinity) {
  const lines = [];
  return {
    say: (text, cls = "") => lines.push([Date.now() / 1000, text, cls]),
    html: (id, who, t) => `<div class="term" id="${id}"><div class="who">${esc(who)}</div>${
      lines.filter(l => l[0] <= t).slice(-rows).map(([, text, cls]) => `<div class="${cls}">${esc(text)}</div>`).join("")}</div>`,
  };
}
const TERM_CSS = th => ` .term { height: ${th}px; box-sizing: border-box; padding: 10px 14px; background: #1d1d1f; color: #e5e5ea;
  font: 13px/1.55 ui-monospace, "SF Mono", Menlo, monospace; } .who { color: #8e8e93; margin-bottom: 4px; } .ok { color: #30d158; } .ed { color: #64d2ff; } .you { color: #ffd60a; } .dim { color: #8e8e93; }`;

/**
 * 녹화를 합친다 — t0..t1 을 GIF 간격으로 나눠(인코더가 어차피 그 간격으로 뽑는다) 시각마다 paint(t) 로 문서를 바꾸고 한 장씩 찍는다.
 * paint 는 함수 몸통 글이다. show(id, png) 로 창 그림을 바꾸고, 기다릴 decode 들을 배열로 돌려준다.
 */
async function composeGif(c, name, page, W, H, t0, t1, paint) {
  await c.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await c.send("Page.navigate", { url: "about:blank" });
  await sleep(200);
  const { frameTree } = await c.send("Page.getFrameTree");
  await c.send("Page.setDocumentContent", { frameId: frameTree.frame.id, html: page });
  const step = 1 / +(opt.fps || 15), sink = gifSink();
  for (let t = t0; t <= t1; t += step) {
    await c.evaluate(`(() => { const show = (id, d) => { const i = document.getElementById(id); i.src = "data:image/png;base64," + d; return i.decode(); };
      return Promise.all((() => { ${paint(t)} })()).then(() => true); })()`);
    sink.add((await c.send("Page.captureScreenshot", { format: "png" })).data, step);
  }
  sink.finish(name, W, H);
}

/** base64 PNG 둘의 다른 픽셀 수 — 크기가 다르면 -1 */
function differ(c, a, b) {
  return c.evaluate(`(async () => {
    const load = d => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = "data:image/png;base64," + d; });
    const [x, y] = await Promise.all([load(${JSON.stringify(a)}), load(${JSON.stringify(b)})]);
    if (x.width !== y.width || x.height !== y.height) return -1;
    const px = i => { const cv = document.createElement("canvas"); cv.width = i.width; cv.height = i.height;
      const g = cv.getContext("2d"); g.drawImage(i, 0, 0); return new Uint32Array(g.getImageData(0, 0, i.width, i.height).data.buffer); };
    const p = px(x), q = px(y); let n = 0;
    for (let k = 0; k < p.length; k++) if (p[k] !== q[k]) n++;
    return n; })()`);
}

// ── 장면 ─────────────────────────────────────────────────────────────────

const SCENES = {
  // 첫 화면 — 탭 셋 · 헤더의 폴더 ⑂ 브랜치 · 알약 ✓ · 묶음 배율
  async hero(c) {
    const url = await viewer(opt.nia, [NIA.foryou, NIA.interests, NIA.card, NIA.foryou]);
    await frame(c, "hero", [await window_(c, url, +(opt.bw || 680), +(opt.bh || 760))]);   // board 와 같은 크기 — README 한 줄에 나란히 놓인다
  },
  // 보드 둘째 — KotlinConf 앱의 commonMain 세션 카드. hero 의 Android 앱 옆에서 Compose Multiplatform 도 같은 보드로 그려진다는 것을 보인다.
  // 레일의 탭 넷이 KMP 표식을 단다. 공유 세트를 처음 열면 뜨는 안내 캡슐은 걷고 찍는다
  async board(c) {
    const url = await viewer(opt.kotlinconf, [KC.speaker, KC.header, KC.kodee, KC.talk]);
    const dismiss = async c => {
      await c.evaluate(`localStorage.setItem("prevue.sharedOnce", "1"); location.reload(); true`);
      await sleep(500);
      await c.until(BOARD);
      await sleep(500);
    };
    await frame(c, "board-kotlinconf", [await window_(c, url, +(opt.bw || 680), +(opt.bh || 760), dismiss)], !!opt.bare);
  },
  // KMP 파티 — KotlinConf 앱 commonMain 의 PartyAnimation 보드에서 포인터가 Dark 카드의 Interactive 를 눌러 작업 공간에 들어가
  // 파티를 보고(3초) ‹ 로 보드에 돌아온다. 처음과 끝이 같은 보드라 반복해도 이음매가 없다. 그 Preview 는 intensity 1 로 고정돼
  // 손대지 않아도 조명 · Kodee · 색종이가 돈다. 창은 좁게(760) 둬 원래 크기 카드가 작업 공간을 채우게 하고, 크기 패널 · 치수선은 걷는다.
  // 뷰어만 담는다(탭 줄 · 주소창 없음). 결과는 assets/<--out, kmp-party>.webp(img2webp). --kw · --kh(창) · --party(초) · --q(품질)
  async party(c) {
    const url = await viewer(opt.kotlinconf, [KC.talk, KC.party]);
    const card = (prevue(opt.kotlinconf, "board").json?.cards || []).find(x => x.name === "PartyAnimationPreview" && x.params?.name === "Dark");
    if (!card) throw new Error("PartyAnimation 의 Dark 카드가 없다");
    const w = +(opt.kw || 760), h = +(opt.kh || 620), party = +(opt.party || 3);
    await c.send("Emulation.setDeviceMetricsOverride", { width: w, height: h - BAR, deviceScaleFactor: 1, mobile: false });
    await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "no-preference" }] });
    try {
      await c.send("Page.navigate", { url });
      await c.until(BOARD);
      await c.evaluate(`localStorage.setItem("prevue.sharedOnce", "1"); location.reload(); true`);
      await sleep(500);
      await c.until(BOARD);
      await c.evaluate(`(() => { const st = document.createElement("style");
        st.textContent = "#panel,#ruler{display:none!important}"; document.head.append(st); return true; })()`);
      // 데운다 — 처음 들어가면 interactive 가 첫 그림을 그리느라 헤더에 Rendering… 이 뜬다. 한 번 들어갔다 나와 두고 찍는다
      await enter(c, card.index);
      await post(url, "/viewer/exit");
      await c.until(BOARD, 20_000);
      await sleep(1500);
      await c.evaluate(POINTER);
      await sleep(800);
      const g = glide(c, w * 0.5, (h - BAR) * 0.55);
      await g.at();
      const go = `.card[data-i="${card.index}"] .go`;
      await c.evaluate(`document.querySelector('${go}').scrollIntoView({ block: "center" }); true`);
      await sleep(600);
      const frames = await record(c, async () => {
        await sleep(900);
        await g.press(go);
        await c.until(FOCUS, 20_000);
        await sleep(party * 1000);
        await g.press("#back");
        await c.until(BOARD, 20_000);
        await c.evaluate(`document.querySelector('${go}').scrollIntoView({ block: "center" }); true`);
        await sleep(400);
      }, 900);
      await webpOf(c, opt.out || "kmp-party", frames, w, h);
    } finally {
      await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });
    }
  },
  // 가리키기 카드 — Pearl 쇼케이스 보드에서 홈 그림의 음료 카드를 누르면 그림 옆에 카드가 선다(이름 · 파일:줄 · 크기 · Modifier · 트리).
  // 트리 줄로 부모를 가리켰다가 옆 음료 카드(형제)로 내려오고, 머리의 🖼 로 그 컴포저블을 부르는 Preview 목록을 펼쳐 다른 파일의 보드로 건너간다.
  // 카드가 커지고 트리가 접히는 모션을 보이려고 움직임 줄이기를 끈다. 한 번 녹화해 README GIF(assets/pointing.gif, 창 테두리)와
  // Release 본문 webp(assets/<--out, pointing>.webp, 뷰어만)를 함께 낸다. --pw · --ph(창) · --at(누를 자리, 그림 안 비율)
  async pointing(c) {
    const repo = opt["pearl-a"];
    const url = await viewer(repo, [PEARL.showcase]);
    const card = (prevue(repo, "board").json?.cards || []).find(x => x.name === "HomeTourPreview");
    if (!card) throw new Error("ShowcasePreviews 의 HomeTourPreview 카드가 없다");
    const w = +(opt.pw || 1280), h = +(opt.ph || 820);
    const named = name => `document.querySelector(".point-card .pc-name")?.textContent === ${JSON.stringify(name)}`;
    const stage = `.card[data-i="${card.index}"] .cstage`;
    const tagged = '[data-rs="go"]';
    // 지금 줄 위에서 가장 가까운 그 이름의 조상 줄에 표지를 단다 — 줄 id 는 그림마다 달라 이름으로 찾는다
    const up = name => `(() => { const here = document.querySelector(".pc-tree .pc-node.here"); if (!here) return false;
      let r = here.parentElement.closest(".pc-node");
      while (r && r.querySelector(":scope > .pc-row .pc-pick").textContent !== ${JSON.stringify(name)}) r = r.parentElement.closest(".pc-node");
      if (!r) return false;
      for (const e of document.querySelectorAll("[data-rs]")) e.removeAttribute("data-rs");
      r.querySelector(":scope > .pc-row .pc-pick").dataset.rs = "go"; return true; })()`;
    // 형제 줄의 차례는 렌더마다 바뀐다(Lazy 그리드의 아이템 순서) — 같은 이름의 형제를 하나씩 가리켜 그림 위 자리를 재고,
    // 지금 것 바로 오른쪽에 있는 줄의 id 를 낸다
    const rightOf = `(async () => { const box = () => document.querySelector(${JSON.stringify(stage + " .box.pick")}).getBoundingClientRect();
      const here = document.querySelector(".pc-tree .pc-node.here"), a = box(), name = here.querySelector(":scope > .pc-row .pc-pick").textContent;
      const ids = [...here.parentElement.children].filter(li => li !== here && li.querySelector(":scope > .pc-row .pc-pick")?.textContent === name).map(li => li.dataset.id);
      let best = null;
      for (const id of ids) {
        document.querySelector('.pc-tree .pc-node[data-id="' + id + '"] > .pc-row .pc-pick').click();
        await new Promise(r => setTimeout(r, 400));
        const b = box();
        if (Math.abs(b.top - a.top) < a.height / 2 && b.left > a.left && (!best || b.left < best.left)) best = { id, left: b.left };
      }
      return best && best.id; })()`;
    await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "no-preference" }] });
    try {
      await c.send("Emulation.setDeviceMetricsOverride", { width: w, height: h - BAR, deviceScaleFactor: 1, mobile: false });
      await c.send("Page.navigate", { url });
      await c.until(BOARD);
      await sleep(800);
      await c.evaluate(POINTER);
      const title = await c.evaluate("document.title");
      const s = await c.rect(`${stage} img`);
      const [fx, fy] = (opt.at || "0.40,0.555").split(",").map(Number);   // Taro 카드의 가격 오른쪽 — 카드 안 글 묶음(Column)이 잡힌다
      // 미리 한 번 가리켜 옆 카드의 줄 id 를 잰다 — 녹화에 담기지 않게 카드를 닫고 시작한다
      await c.click(s.x + s.w * fx, s.y + s.h * fy);
      await c.until(up("DrinkCard"), 10_000);
      await c.evaluate(`document.querySelector('${tagged}').click(); true`);
      await c.until(named("DrinkCard"), 5_000);
      const next = await c.evaluate(rightOf);
      if (!next) throw new Error("pointing: 누른 음료 카드 오른쪽의 형제 DrinkCard 를 트리에서 못 찾았다");
      await c.key("Escape", "Escape");
      await c.until(`!document.querySelector(".point-card")`, 5_000);
      const g = glide(c, w * 0.5, (h - BAR) * 0.8);
      // 트리 패널은 스크롤된다 — 줄이 패널 밖으로 잘려 있으면 그 자리를 눌러도 줄에 닿지 않아, 먼저 패널 안으로 들인다
      const pickRow = async sel => {
        await c.evaluate(`document.querySelector('${sel}').scrollIntoView({ block: "nearest" }); true`);
        await sleep(300);
        await g.press(sel);
      };
      await g.at();
      const frames = await record(c, async () => {
        await sleep(pace(600));
        await g.pressAt(s.x + s.w * fx, s.y + s.h * fy);
        await c.until(up("DrinkCard"), 10_000);
        await sleep(pace(2000));
        await pickRow(tagged);                                               // 조상 — 카드가 DrinkCard 의 크기 · Modifier 로 바뀐다
        await c.until(named("DrinkCard"), 5_000);
        await sleep(pace(1600));
        await pickRow(`.pc-tree .pc-node[data-id="${next}"] > .pc-row .pc-pick`);   // 옆 음료 카드 — 형제로 옮겨 가면 그림 위 표시도 따라간다
        await c.until(`document.querySelector(".pc-tree .pc-node.here")?.dataset.id === ${JSON.stringify(next)}`, 5_000);
        await sleep(pace(1600));
        await g.press(".pc-jump");                                           // 🖼 — 부르는 Preview 가 여럿이면 목록이 펼쳐진다
        await c.until(`!!document.querySelector(".pc-fold[data-open]")`, 5_000);
        await sleep(pace(1000));
        await g.press(`.pc-preview[title^="MenuCardsPreview"]`);
        await c.until(`document.title.startsWith("ComponentPreviews")`, 20_000);
        await sleep(300);
        await c.until(BOARD, 20_000);
        await sleep(pace(2000));
      }, 600);
      await gif(c, "pointing", title, url, frames, w, h);
      await webpOf(c, opt.out || "pointing", thin(frames, 20), w, h);   // 화면 녹화는 초당 30장 가까이 온다 — Release 본문에 싣기엔 무겁다
    } finally {
      await c.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }, { name: "prefers-reduced-motion", value: "reduce" }] });
    }
  },
  // 워크트리 나란히 — 워크트리 둘에 데몬 둘. 두 쪽이 같은 때 저장하면 각자 다시 그리고(①), 한쪽만 저장하면 다른 쪽은 그대로다(②).
  // 뷰어는 iframe 에 담기지 않아 크롬을 둘 더 띄워 각자 녹화하고, 같은 시계(초)로 두 창과 터미널을 한 장씩 합친다.
  async worktrees(c) {
    const A = opt["pearl-a"], B = opt["pearl-b"];
    const ua = await viewer(A, [PEARL.previews]), ub = await viewer(B, [PEARL.previews]);
    const keep = [[join(A, PEARL.theme), readFileSync(join(A, PEARL.theme), "utf8")], [join(B, PEARL.strings), readFileSync(join(B, PEARL.strings), "utf8")]];
    const forest = (hex, light) => edit("worktrees", edit("worktrees", keep[0][1], "Color(0xFF00664F)", `Color(0xFF${hex})`), "Color(0xFF0B7A5F)", `Color(0xFF${light})`);
    const ww = 720, vh = 540, th = 172;
    const label = (dir, n) => `agent ${n} · ${basename(dir)} (${spawnSync("git", ["-C", dir, "branch", "--show-current"], { encoding: "utf8" }).stdout.trim()})`;
    const who = { a: label(A, 1), b: label(B, 2) };
    const ta = terminal(), tb = terminal();
    const browsers = [];
    let ra, rb, fa, fb, t0, t1;
    try {
      const ca = await chrome(); browsers.push(ca);
      const cb = await chrome(); browsers.push(cb);
      [ra, rb] = await Promise.all([screencast(ca, ua, ww, vh), screencast(cb, ub, ww, vh)]);
      await sleep(1500);
      t0 = Date.now() / 1000;
      await sleep(900);
      ta.say("✎ Theme.kt  forest → purple", "ed"); tb.say("✎ strings.xml  headline → \"Big cards, big sips\"", "ed");
      writeFileSync(keep[0][0], forest("5458C4", "6F74DD"));                  // ① 두 쪽이 같은 때 저장한다
      writeFileSync(keep[1][0], edit("worktrees", keep[1][1], "What\\'s your sip today?", "Big cards, big sips"));
      ta.say("$ prevue wait"); tb.say("$ prevue wait");
      const both = await Promise.allSettled([prevueAsync(A, "wait", join(A, PEARL.theme)).then(r => ta.say(waited("worktrees", r), "ok")),
                                             prevueAsync(B, "wait", join(B, PEARL.strings)).then(r => tb.say(waited("worktrees", r), "ok"))]);
      const bad = both.filter(x => x.status === "rejected").map(x => x.reason.message);   // 한쪽이 실패해도 다른 쪽 wait 를 끝까지 기다린 뒤 둘 다 알린다
      if (bad.length) throw new Error(bad.join(" / "));
      await sleep(pace(2600));
      ta.say("✎ Theme.kt  forest → orange", "ed");                           // ② 왼쪽만 — 오른쪽은 그대로다
      writeFileSync(keep[0][0], forest("E8622C", "F07A45"));
      ta.say("$ prevue wait");
      ta.say(waited("worktrees", await prevueAsync(A, "wait", join(A, PEARL.theme))), "ok");
      await sleep(pace(2600));
      t1 = Date.now() / 1000;
      [fa, fb] = await Promise.all([ra.stop(), rb.stop()]);
    } finally {
      for (const [f, t] of keep) writeFileSync(f, t);
      for (const r of await Promise.all([prevueAsync(A, "wait", join(A, PEARL.theme)), prevueAsync(B, "wait", join(B, PEARL.strings))]))   // 다음 장면이 되돌리는 중의 그림을 찍지 않게
        if (r.code !== 0) console.warn(`  worktrees: 되돌린 뒤 wait 종료 ${r.code} — 다음 장면 전에 데몬을 본다: ${r.text.slice(0, 200)}`);
      await Promise.all(browsers.map(b => b.close()));
    }
    if (!fa.length || !fb.length) throw new Error(`worktrees: 녹화된 프레임이 없다(왼쪽 ${fa.length} · 오른쪽 ${fb.length})`);
    const atA = cursor(fa), atB = cursor(fb);
    const page = windowsHtml([
      { w: ww, h: BAR + vh, title: ra.title, url: ua, data: "", id: "ia", after: '<div id="ta"></div>' },
      { w: ww, h: BAR + vh, title: rb.title, url: ub, data: "", id: "ib", after: '<div id="tb"></div>' },
    ], 10, { bg: "#fff", css: ` .row { padding: 16px; }${TERM_CSS(th)}` });
    await composeGif(c, "worktrees", page, ww * 2 + GAP + 32, BAR + vh + th + 32, t0, t1, t => `
      document.getElementById("ta").outerHTML = ${JSON.stringify(ta.html("ta", who.a, t))};
      document.getElementById("tb").outerHTML = ${JSON.stringify(tb.html("tb", who.b, t))};
      return [show("ia", ${JSON.stringify(atA(t))}), show("ib", ${JSON.stringify(atB(t))})];`);
  },
  // 시안 맞추기 — 에이전트가 시안(mockup.png)을 보고 저장할 때마다 Preview 가 바뀌어(여백 → 색 → 글자 크기) 세 번 만에 시안과 같아진다.
  // 시안은 손대지 않은 사본의 PearlListPreview 그림이다. 녹화 전에 세 값을 틀어 두고, 한 값씩 되돌려 저장하며 prevue wait 를 돌린다.
  // 일치 줄은 마지막 그림이 시안과 픽셀까지 같을 때만 찍는다 — 다르면 멈춘다(Prevue 에 비교 명령은 없다. 비교는 에이전트의 일이라 에이전트의 말로 찍는다).
  // 가운데 창은 그 파일의 보드다 — 단일 뷰는 카드가 인터랙티브가 돼 wait 가 다른 카드를 기다리지 않는다. 사람 손(포인터)은 나오지 않는다. --mw · --mh(가운데 창)
  async match(c) {
    const repo = opt["pearl-a"], fn = "PearlListPreview";
    const url = await viewer(repo, [PEARL.previews]);
    const cardOf = cards => (cards || []).find(x => x.name === fn);
    const first = cardOf(prevue(repo, "board").json?.cards);
    if (!first) throw new Error(`PearlPreviews 의 ${fn} 카드가 없다`);
    const mockup = readFileSync(first.image).toString("base64");
    const screen = join(repo, PEARL.screen), theme = join(repo, PEARL.theme);
    const keep = [[screen, readFileSync(screen, "utf8")], [theme, readFileSync(theme, "utf8")]];
    const PAD = ["contentPadding = PaddingValues(start = 24.dp, end = 24.dp,", "contentPadding = PaddingValues(start = 8.dp, end = 8.dp,"];
    const SIZE = ["fontSize = 28.sp,", "fontSize = 22.sp,"];
    const screenWith = (pad, size) => [[PAD, pad], [SIZE, size]].reduce((t, [[a, b], off]) => (off ? edit("match", t, a, b) : t), keep[0][1]);
    const forestOff = edit("match", edit("match", keep[1][1], "Color(0xFF00664F)", "Color(0xFF2E6C8E)"), "Color(0xFF0B7A5F)", "Color(0xFF3C82A6)");
    const ww = +(opt.mw || 580), vh = +(opt.mh || 940) - BAR, th = 192, mw = 250;
    const tm = terminal(7);
    const say = (text, cls) => tm.say(text, cls);
    const save = async (file, text) => {
      writeFileSync(file, text);
      say("$ prevue wait");
      const r = await prevueAsync(repo, "wait", file);
      say(waited("match", r), "ok");
      return r;
    };
    let rec, cc, frames, t0, t1, tMatch;
    try {
      writeFileSync(screen, screenWith(true, true));                         // 녹화 전 — 시안과 세 군데가 다른 화면
      writeFileSync(theme, forestOff);
      waited("match", await prevueAsync(repo, "wait", screen, theme));
      cc = await chrome();
      rec = await screencast(cc, url, ww, vh);
      await sleep(1200);
      t0 = Date.now() / 1000;
      await sleep(pace(900));
      say("> make PearlListPreview match mockup.png", "you");
      await sleep(pace(1600));
      say("≠ grid padding · header color · headline size", "dim");
      await sleep(pace(1200));
      say("✎ PearlScreen.kt  grid padding 8 → 24 dp", "ed");
      await save(screen, screenWith(false, true));
      await sleep(pace(1400));
      say("≠ header color · headline size", "dim");
      await sleep(pace(1000));
      say("✎ Theme.kt  forest #2E6C8E → #00664F", "ed");
      await save(theme, keep[1][1]);
      await sleep(pace(1400));
      say("≠ headline size", "dim");
      await sleep(pace(1000));
      say("✎ PearlScreen.kt  headline 22 → 28 sp", "ed");
      const last = await save(screen, keep[0][1]);
      const done = cardOf(last.json.cards);
      const off = done && await differ(c, mockup, readFileSync(done.image).toString("base64"));
      if (off !== 0) throw new Error(`match: 마지막 그림이 시안과 다르다(다른 픽셀 ${off}) — 틀어 둔 값과 되돌린 값을 맞춘다`);
      await sleep(pace(700));
      say("✓ matches mockup.png", "ok");
      tMatch = Date.now() / 1000;
      await sleep(pace(3000));
      t1 = Date.now() / 1000;
      frames = await rec.stop();
    } finally {
      for (const [f, t] of keep) writeFileSync(f, t);
      const r = await prevueAsync(repo, "wait", screen, theme);
      if (r.code !== 0) console.warn(`  match: 되돌린 뒤 wait 종료 ${r.code} — 다음 장면 전에 데몬을 본다: ${r.text.slice(0, 200)}`);
      await cc?.close();
    }
    if (!frames.length) throw new Error("match: 녹화된 프레임이 없다");
    const at = cursor(frames);
    const mh = Math.round(mw * first.height / first.width);
    const css = ` .row { padding: 16px; align-items: flex-start; }${TERM_CSS(th)}
      .mock { width: ${mw}px; margin-top: ${BAR}px; font: 12px -apple-system, BlinkMacSystemFont, sans-serif; color: #5f6368; }
      .mock .mh { display: flex; justify-content: space-between; margin-bottom: 8px; } .mock .mh b { color: #202124; font-weight: 600; }
      .mock img { display: block; width: ${mw}px; height: ${mh}px; border-radius: 8px; box-shadow: 0 0 0 1px rgba(0,0,0,.12), 0 6px 18px rgba(0,0,0,.08); }
      .mock .eq { color: #1f9d55; font-weight: 600; visibility: hidden; } .mock .eq.on { visibility: visible; }`;
    const page = windowsHtml([{ w: ww, h: BAR + vh, title: rec.title, url, data: "", id: "iv", after: '<div id="tm"></div>' }], 10, { bg: "#fff", css })
      .replace('<div class="row">', `<div class="row"><div class="mock"><div class="mh"><b>mockup.png</b><span class="eq" id="eq">✓ match</span></div><img src="data:image/png;base64,${mockup}" alt=""></div>`);
    await composeGif(c, "match", page, mw + GAP + ww + 32, BAR + vh + th + 32, t0, t1, t => `
      document.getElementById("tm").outerHTML = ${JSON.stringify(tm.html("tm", `agent · ${basename(repo)}`, t))};
      document.getElementById("eq").classList.toggle("on", ${t >= tMatch});
      return [show("iv", ${JSON.stringify(at(t))})];`);
  },
  // 인터랙티브 — 작업 공간에 들어가 누르고 끄는 창 전체. 좌표는 360×780dp 그림 안의 비율(그림을 다시 그리면 다시 잰다)
  async interactive(c) {
    const repo = opt["pearl-a"];
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
  // 크기 · 기기 — 인셋 영역 보기를 켠 채 기기만 바꿔, 기기마다 SafeArea 가 달라지고 화면이 그 안에 다시 서는 것을 보인다.
  // 인셋 보기는 크기 · 자세를 바꿔도 켜진 채다(session.ts insetScope). 녹화 전에 S26 · 인셋 켬을 맞추고 S26 으로 끝내 반복이 이어진다.
  // 기기 목록은 독의 메뉴 안이라(D-167) 메뉴 버튼을 먼저 누른다 — 고르면 메뉴는 닫힌다. 메뉴의 iPhone Duo 는 펼친 채로 열려
  // 커버로 바로 고를 길이 없다 — 그림이 서자마자 접어 펼친 화면을 짧게 지난다. 고를 때마다 그림이 서기를 기다린다.
  async devices(c) {
    const pick = async (h, sel, after = 2000) => { await h.tapEl("#pnSum", 450); await h.tapEl(`#pnPick [data-sel="${sel}"]`, 300); await c.until(FOCUS, 20_000); await sleep(pace(after)); };
    const fold = async (h, after = 2400) => { await h.tapEl("#dcFold", 300); await c.until(FOCUS, 20_000); await sleep(pace(after)); };
    // 고른 직후에는 옛 그림이 아직 서 있어 FOCUS 가 바로 참이다 — 접기 버튼이 보이고 풀릴 때(준비가 끝났을 때)까지 기다린다
    const foldReady = `(() => { const b = document.getElementById("dcFold"); return ${FOCUS} && !!b && b.offsetWidth > 0 && !b.disabled; })()`;
    await devicesGif(c, "devices", opt["pearl-a"], PEARL.showcase, "DevicesPreview", async h => {
      await pick(h, "ip17", 2400);                                           // iPhone 17 — 다이내믹 아일랜드 · 아래 띠
      await pick(h, "ipduo", 0);                                             // 펼친 Duo — 곧바로 접는다
      await c.until(foldReady, 20_000);
      await fold(h);                                                         // 커버 화면
      await fold(h, 2600);                                                   // 펼치면 오른쪽 · 아래 띠
      await pick(h, "s26", 500);                                             // 첫 장면으로
      await h.rest();
    }, async h => {
      await pick(h, "s26", 0);
      await h.tapEl("#insetBtn", 600);
      await sleep(1500);
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
