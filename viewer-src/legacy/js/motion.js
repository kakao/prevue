// 작업 공간 여닫기는 화면 전체의 짧은 페이드 위에서 틀만 모프한다(frameMorph). 서로 다른 렌더 상태를 같은 그림으로 늘려 잇지 않는다.
export const reduced = matchMedia("(prefers-reduced-motion: reduce)");
// Web Animations · 타이머는 var() 를 못 읽어 tokens.css 의 시간 · 이징을 꺼낸다. 시간 · 이징 토큰에는 light-dark() 가 없어 그대로 읽힌다.
export const motionToken = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// 시간 토큰을 ms 숫자로 — 초로 적어도 맞게 읽고, 못 읽으면 0(바로 끝남)이라 animate() 가 던지지 않는다.
export const motionMs = name => {
  const m = /^([\d.]+)(ms|s)$/.exec(motionToken(name));
  return m ? parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1) : 0;
};
const isStream = u => !!u && u.startsWith("/stream");

/**
 * 새 그림을 옛 그림 위로 크로스페이드한다. 새 그림이 디코드된 뒤에 시작하므로 표시를 늦추지 않는다 —
 * 그 사이 옛 그림이 그대로 보이고, 바뀌는 순간에만 겹친다. 스트림(MJPEG)은 복제하면 연결이 하나 더 열려 바로 바꾼다.
 */
export function swapImage(img, url) {
  const old = img.getAttribute("src");
  img.dataset.url = url;
  if (!old || img.hidden || !img.naturalWidth || isStream(url) || isStream(old)) { img.src = url; return; }
  const pre = new Image();
  pre.src = url;
  pre.decode().catch(() => {}).then(() => {
    if (img.dataset.url !== url || img.hidden) return;
    const ghost = img.cloneNode();
    ghost.removeAttribute("id"); ghost.classList.add("ghost"); ghost.alt = "";
    Object.assign(ghost.style, { left: img.offsetLeft + "px", top: img.offsetTop + "px", width: img.offsetWidth + "px", height: img.offsetHeight + "px" });
    img.after(ghost);
    img.src = url;
    const drop = () => ghost.remove();
    requestAnimationFrame(() => requestAnimationFrame(() => { ghost.style.opacity = "0"; }));
    ghost.addEventListener("transitionend", drop, { once: true });
    setTimeout(drop, 800);   // 탭이 뒤에 있으면 rAF·전환이 멈춘다
  });
}

// 전환 중 도착한 상태는 새 화면을 찍은 뒤 반영한다.
let running = false, active = null;
export function transition(update, done, { workspace = false, image = null } = {}) {
  const root = document.documentElement;
  if (workspace) root.classList.remove("vt-tab");
  if (!document.startViewTransition || document.hidden || running) {
    root.classList.toggle("vt-workspace", workspace);
    update();
    if (workspace) void root.offsetWidth;
    root.classList.remove("vt-workspace");
    done && done();
    return;
  }
  running = true;
  if (image && isStream(image.dataset.url) && image.naturalWidth) freeze(image).then(start);
  else start();
  function start() {
    active?.skipTransition();
    root.classList.toggle("vt-workspace", workspace);
    const vt = document.startViewTransition(update);
    active = vt;
    vt.updateCallbackDone.catch(() => {}).finally(() => { running = false; done && done(); });
    vt.finished.catch(() => {}).finally(() => {
      if (active !== vt) return;
      active = null;
      root.classList.remove("vt-workspace");
    });
  }
}

/**
 * 스트림이 닫힐 때 WebKit이 깨진 그림을 전환에 찍지 않도록 마지막 프레임을 보관한다.
 */
export function freeze(img) {
  try {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    img.src = c.toDataURL("image/jpeg", 0.92);
  } catch { return Promise.resolve(); }
  return Promise.race([img.decode().catch(() => {}), new Promise(r => setTimeout(r, 150))]);
}

export const transitioning = () => running;
/** 전환을 시작하기 전의 준비(장식 물리기 · 정지 그림) 동안 도착한 상태를 붙잡는다. 돌려준 함수로 놓는다. */
export function hold() { running = true; return () => { running = false; }; }

// 작업 공간 진입 · 복귀의 틀 모프. 틀(모서리 · 바탕 · 그림자)만 옮기고 그림은 늘리지 않는다 — Hero는 그림을 늘려 뒤틀렸다.
// 크기 틀(resize-scene setFrame)과 같은 0.55초 스프링이되 튕기지 않는다. 튕김은 크기가 바뀐다는 신호로 아낀다.
const MORPH_W0 = 2 * Math.PI / .55;
export const MORPH_LEAD = 385;   // 모프 70% — 장식이 들어오는 때. 치수 숫자가 모프 도중에 바뀌지 않게 한다
/**
 * from(고정 사각형)에서 to()(매 프레임 다시 재는 사각형)로 틀을 옮긴다. 목적지를 매번 재므로 그 사이 보드가 자리를 잡아도 따라간다.
 * a 는 처음 담는 그림, b 는 swapAt ms 에 swapMs 동안 크로스페이드해 갈 그림("" 이면 빈 바탕으로 흐려진다).
 * 그림은 늘리지 않고 틀의 왼쪽 위에 맞춰 덮는다 — 비율이 같으면 틀과 함께 고르게 커지고 줄어든다.
 */
export function frameMorph({ from, to, radius, shadow, a, b = null, swapAt = 0, swapMs = 150 }) {
  const el = document.createElement("div"), ia = new Image(), ib = new Image();
  el.className = "morph"; ia.alt = ib.alt = ""; ib.style.opacity = "0";
  if (a) ia.src = a; else ia.style.opacity = "0";
  el.append(ia, ib);
  el.style.boxShadow = shadow[0];
  document.body.append(el);
  // 스프링 시간은 한 그림에 최대 한 프레임만큼만 간다 — 전환을 찍는 첫 그림처럼 늦게 온 프레임이 틀을 건너뛰게 하지 않는다
  let t = 0, last = performance.now();
  let raf = 0, landed = false, land, timer = 0, gone = false;
  const landedP = new Promise(r => { land = r; });
  const put = (r, rad) => Object.assign(el.style, { left: r.x + "px", top: r.y + "px", width: r.width + "px", height: r.height + "px", borderRadius: rad + "px" });
  function frame(now) {
    raf = 0;
    if (gone) return;
    const T = to();
    t += Math.min(Math.max(0, now - last), 34) / 1000; last = now;
    let k = landed ? 0 : Math.exp(-MORPH_W0 * t) * (1 + MORPH_W0 * t);
    const off = Math.max(Math.abs(from.x - T.x), Math.abs(from.y - T.y), Math.abs(from.width - T.width), Math.abs(from.height - T.height)) * k;
    if (!landed && off < .5) { k = 0; landed = true; land(); }
    put({ x: T.x + (from.x - T.x) * k, y: T.y + (from.y - T.y) * k, width: T.width + (from.width - T.width) * k, height: T.height + (from.height - T.height) * k },
      radius[1] + (radius[0] - radius[1]) * k);
    raf = requestAnimationFrame(frame);
  }
  frame(last);
  // 다음 프레임에 그림자를 목적지 것으로 옮긴다 — 같은 프레임에 바꾸면 전이가 일어나지 않는다
  requestAnimationFrame(() => { el.style.transition = "box-shadow var(--duration-long3) var(--easing-standard)"; el.style.boxShadow = shadow[1]; });
  if (b !== null) timer = setTimeout(() => {
    if (b) ib.src = b;
    for (const [img, op] of [[ia, 0], [ib, b ? 1 : 0]]) img.animate([{ opacity: img.style.opacity || 1 }, { opacity: op }], { duration: swapMs, easing: motionToken("--easing-standard"), fill: "forwards" });
  }, swapAt);
  // 뒤로 간 탭은 rAF 가 멈춘다 — 착지를 기다리는 쪽이 매달리지 않게 숨은 동안만 시간으로 닿는다. 보이는 탭은 느려도 끝까지 이어 간다
  let late = 0;
  const check = () => { late = 0; if (landed || gone) return; if (document.hidden) { landed = true; land(); } else late = setTimeout(check, 1200); };
  late = setTimeout(check, 1200);
  // 걷어도 착지를 기다리는 쪽을 풀어 준다 — 그쪽은 제 비행이 아직 지금 것인지 보고 아무것도 하지 않는다
  function remove() { gone = true; cancelAnimationFrame(raf); clearTimeout(timer); clearTimeout(late); el.remove(); if (!landed) { landed = true; land(); } }
  return {
    el, landed: landedP,
    /** 틀을 걷는다. ms 가 있으면 그동안 흐려지며 사라진다(밑의 실제 그림과 크로스페이드). */
    finish(ms = 0) {
      if (gone) return;
      if (!ms) { remove(); return; }
      const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: motionToken("--easing-decelerate"), fill: "forwards" });
      fade.finished.catch(() => {}).then(remove);
      setTimeout(remove, ms + 400);
    },
    cancel: remove,
  };
}
