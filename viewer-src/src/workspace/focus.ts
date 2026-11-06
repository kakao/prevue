// 한 장 화면 — 기기를 쥔 작업 공간(D-57). 가리키기 · 인터랙티브(FR-18) · 확대 · 뒤로 가기. 터치 · 휠을 보내는 것은 input.ts 다.
// 마크업은 React 의 Workspace 가 그리고, 여기서는 그 요소를 받아 스트림 · 좌표 · 틀 모프처럼 잰 뒤에만 정해지는 것을 다룬다.
import { get, post, reportStreamWidth, viewerStream } from '../../legacy/js/api.js';
import { flash, setStatus, setSummary } from '../../legacy/js/capsule.js';
import { frameMorph, freeze, hold, MORPH_LEAD, motionMs, reduced, swapImage, transition } from '../../legacy/js/motion.js';
import { stuckHead } from '../../legacy/js/board.js';
import { cardOf, store } from '../../legacy/js/store.js';
import { phrase } from '../../legacy/js/strings.js';
import type { Focus, ViewerState } from '../state';
import { drag, press, pressing, release, wheel } from './input';
import { byPick, drawBox, flatten, hitIn, narrow, point, posIn, sayOn, setSay, type Hit, type TreeNode } from './point';
import { createResizeController } from './resize';
import { zoomView } from './view';

export type WorkspaceParts = {
  focusView: HTMLElement; wrap: HTMLElement; stage: HTMLElement; shot: HTMLImageElement; box: HTMLElement; pickBox: HTMLElement;
  scene: HTMLElement; geometry: HTMLElement; panel: HTMLElement;
};

export function findWorkspaceParts(): WorkspaceParts {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const stage = $('stage');
  return {
    focusView: $('focusView'), wrap: stage.parentElement!, stage, shot: $<HTMLImageElement>('shot'), box: $('box'), pickBox: $('pickBox'),
    scene: $('resizeScene'), geometry: $('resizeGeometry'), panel: $('panel'),
  };
}

/** 모프의 출발점 · 도착점 — 그리기 전에 잰다. */
export type Frame = { el: HTMLElement; rect: DOMRect; radius: number; shadow: string; url: string; ratio: number };
type Flight = { m: ReturnType<typeof frameMorph>; same: boolean; hidden: HTMLElement[]; entering?: boolean; ready?: boolean; landed?: boolean; lead?: number; giveUp?: number };

export type Workspace = ReturnType<typeof createWorkspace>;

export function createWorkspace({ focusView, wrap, stage, shot, box, pickBox, scene, geometry, panel }: WorkspaceParts) {
  let all: Hit[] = [], nodes: Hit[] = [], ready = false;

  /** 색인이 다시 왔다. 들고 있는 트리를 새 색인으로 다시 거른다. */
  function renarrow() { if (ready) nodes = narrow(all); }

  /**
   * 그림을 창 높이에 맞춘다. stage 의 top 에서 창 바닥까지가 쓸 수 있는 높이다 —
   * 낡음 띠가 뜨면 top 이 내려가므로 고정값(100vh - N)으로 두지 않고 매번 잰다. 캡슐 자리는 늘 비워 둔다.
   */
  function fitStage() {
    if (focusView.hidden) return;
    const css = getComputedStyle(document.documentElement);
    const room = parseInt(css.getPropertyValue('--cap-room')) || 76;
    // stage 는 확대되면 transform 으로 움직이므로 위치는 그 틀(wrap)에서 잰다.
    // 작업 공간은 캔버스를 창 바닥까지 쓴다 — 캡슐 자리는 장면의 맞춤 배율이 비운다(resize-scene.js CAPSULE_ROOM).
    const floating = document.body.classList.contains('resizing-ui');
    const avail = window.innerHeight - wrap.getBoundingClientRect().top - (floating ? 0 : room + 16);
    const min = parseInt(css.getPropertyValue('--stage-min-h')) || 260;
    const h = Math.max(min, Math.round(avail));
    document.documentElement.style.setProperty('--view-h', h + 'px');
    const pad = getComputedStyle(wrap), inner = h - parseFloat(pad.paddingTop) - parseFloat(pad.paddingBottom);
    document.documentElement.style.setProperty('--stage-max-h', inner + 'px');
    resizeUI.relayout();
    if (!wrap.classList.contains('resize-wrap')) sizeShot(inner - 2);
    showZoom();
    reportViewport();
  }

  /*
   * 원래 크기. 조작 중의 스트림은 데몬이 보이는 화소 폭으로 줄여 보내므로(움직이는 동안만 — 멈추면 원래 크기 PNG),
   * 받은 그림의 크기로 자리를 잡으면 그림이 작아지고 좌표 · 박스 · 배율이 어긋난다. 원래 크기는 스트림 전에 뜨는 카드 PNG에서 잰다 —
   * 그 전에 스트림이 먼저 오면 데몬이 폭을 듣기 전이라 첫 장이 원래 크기다(켤 때마다 데몬이 폭을 잊는다). 그래서 원래 크기를 재기 전에는
   * 폭을 알리지 않는다(reportViewport).
   */
  let fullW = 0, fullH = 0;
  const streaming = () => (shot.getAttribute('src') || '').startsWith('/stream');
  function noteFull() {
    if ((shot.getAttribute('src') || '').startsWith('data:')) return;
    if (!shot.naturalWidth || (streaming() && fullW)) return;
    fullW = shot.naturalWidth; fullH = shot.naturalHeight;
    shot.dataset.fullW = String(fullW);
  }
  /** 원래 크기로 맞춤 자리를 잡는다 — 받은 그림이 작아도 같은 자리. 가로 넘침은 CSS max-width 가 자른다. */
  function sizeShot(maxH: number) {
    shot.style.width = fullW ? Math.min(fullW, maxH * fullW / fullH) + 'px' : '';
  }

  /** 데몬에 지금 그리는 화소 폭을 알린다(레이아웃 × dpr × 확대). 바뀔 때만 · 몰아서. */
  let sentW = 0, viewportTimer = 0;
  function reportViewport() {
    // 첫 장이 오기 전의 <img> 폭은 그림의 폭이 아니다 — WebKit(cmux 브라우저 · Safari)은 빈 그림에 깨진 그림 자리(55×21)를 잡는다.
    // 그것을 알리면 데몬이 첫 장부터 110px로 줄여 보내고, 그 첫 장을 원래 크기로 잡아 기기가 손톱만 했다(배율 263%, 확대가 안 먹는 듯 보였다).
    if (document.hidden || !streaming() || focusView.hidden || !fullW) return;
    clearTimeout(viewportTimer);
    viewportTimer = window.setTimeout(() => {
      // 크기 틀이 움직이는 동안의 폭은 도착 폭이 아니다 — 거기서 재면 112px 스트림을 614px 에 늘려 조작 중 화면이 흐렸다. 멈춘 뒤에 잰다
      if (resizeUI.moving()) { reportViewport(); return; }
      const w = Math.round(shot.offsetWidth * devicePixelRatio * zoom.z);
      if (w && w !== sentW) { sentW = w; reportStreamWidth(w).catch(() => {}); }
    }, 120);
  }

  let treeUrl: string | null = null, treeLoad: Promise<void> = Promise.resolve();
  /**
   * 포커스 화면의 트리. PNG와 트리를 함께 받아야 가리키기가 맞는다.
   * 받는 중인 것은 treeLoad 로 들고 있어, 그 사이의 클릭이 옛 트리로 노드를 찾지 않고 기다리게 한다.
   */
  function loadFocusTree(url: string) {
    if (url === treeUrl) return treeLoad;
    treeUrl = url;
    return (treeLoad = fetchTree(url));
  }
  async function fetchTree(url: string) {
    try {
      const d: { failure?: unknown; composeViewInfo?: TreeNode[] } = await get(url).then(r => { if (!r.ok) throw new Error(phrase('focus.tree.http', { status: r.status })); return r.json(); });
      if (url !== treeUrl) return;                     // 그 사이에 새 그림이 왔다
      if (d.failure) { ready = false; return; }        // 실패 문장은 state.error 가 갖는다
      all = flatten(d.composeViewInfo || [], [], []).sort(byPick);
      nodes = narrow(all);
      setSummary(store.projectFiles.size ? '' : phrase('focus.noIndex', { n: all.length }));
      ready = true; box.hidden = true; pickBox.hidden = true;
    } catch (err) { setStatus(phrase('focus.tree.failed', { why: (err as Error).message }), 'error'); }
  }

  function render(f: Focus | null) {
    const interactive = !!(f && f.interactive);
    panel.hidden = !f;
    if (!f) closeZoomMenu();
    stage.classList.toggle('live', interactive);
    ppd = f ? f.pxPerDp || null : null;
    if (!f || f.previewId !== zoomFor) { resizeUI.disable(); zoomFor = f ? f.previewId : null; fullW = fullH = 0; delete shot.dataset.fullW; shot.style.width = ''; setZoom(1, 0, 0, false); }
    if (!f) {
      if (flight?.entering) stopFlight();
      resizeUI.disable();
      // 숨긴 <img>도 MJPEG 를 계속 받는다. 끊지 않으면 탭마다 연결 하나가 남아, 브라우저의 호스트당 연결 여섯을
      // 탭 몇 개가 다 쥐고 의도(POST)가 대기열에서 멈춘다. 스트림이 아니어도 비운다 — 나갈 때 멈춰 세운 정지 그림(motion.js freeze)이
      // 남으면 다음에 다른 카드로 들어갈 때 swapImage 가 그것 위로 크로스페이드하려다 나는 동안 미뤄, 줌 인 내내 앞 카드가 비쳤다.
      if (shot.hasAttribute('src')) { shot.removeAttribute('src'); shot.dataset.url = ''; }
      for (const g of stage.querySelectorAll('img.ghost')) g.remove();   // 사라지는 중인 크로스페이드 옛 그림도 같다
      return;
    }
    const st = store.st!;
    stage.style.cursor = interactive ? 'pointer' : 'crosshair';
    if (f.treeUrl !== treeUrl) loadFocusTree(f.treeUrl);
    if (resizeUI.update(f, st.error)) return;
    setZoom(zoom.z, zoom.x, zoom.y, false);
    // 인터랙티브면 MJPEG 스트림, 아니면 마지막 PNG. 스트림 주소는 태스크가 걸린 뒤에만 온다 — 그 전에는 카드의 마지막 그림이다.
    const want = interactive ? (f.streamUrl ? viewerStream(f.streamUrl) : (st.board && cardOf(st.board.focus)?.imageUrl) || '') : f.imageUrl;
    if (shot.dataset.url !== want) { if (want.startsWith('/stream')) sentW = 0; swapImage(shot, want); }
  }

  /* ---------- 작업 공간 여닫기 — 틀 모프 ---------- */
  /*
   * 들어갈 때는 카드 틀이 캔버스 자리로 커지고, 나올 때는 장식이 먼저 물러난 뒤 지금 프레임을 담은 틀이 카드로 줄어든다.
   * 그동안 실제 캔버스 · 장면의 틀은 숨기고(morph-hold), 몸체 · 치수선 · 패널의 칸은 모프 70%에서 들어온다(deco-off).
   * 움직임 줄이기 · 뒤에 있는 탭 · 출발점이 화면 밖이면 페이드만 한다.
   */
  let flight: Flight | null = null;
  const sameRatio = (a: number, b: number) => a > 0 && b > 0 && Math.abs(a / b - 1) < .01;
  const decorations = (on: boolean, ms: number) => {
    for (const el of [scene, panel]) { el.style.setProperty('--deco-dur', ms + 'ms'); el.classList.toggle('deco-off', !on); }
  };
  function stopFlight() {
    if (!flight) return;
    const f = flight;
    flight = null;
    clearTimeout(f.lead); clearTimeout(f.giveUp);
    f.m.cancel();
    for (const el of f.hidden) el.classList.remove('morph-target');
    focusView.classList.remove('morph-hold');
    decorations(true, 0);
  }
  /** 들어온 틀을 실제 캔버스에 넘긴다. 같은 비율이면 카드 그림이 자리 표시라 첫 장이 올 때 그 위에서 흐려진다. */
  function handOver(f: Flight) {
    if (flight !== f) return;
    flight = null;
    clearTimeout(f.lead); clearTimeout(f.giveUp);
    focusView.classList.remove('morph-hold');
    decorations(true, motionMs('--duration-short4'));
    f.m.finish(f.same ? 150 : 0);
  }
  /** 화면을 그린 직후(전환의 update 안에서) 부른다. src 는 그리기 전에 잰 출발 틀이다. */
  function morphIn(src: Frame | null) {
    stopFlight();
    if (!src || reduced.matches || document.hidden || focusView.hidden || !wrap.classList.contains('resize-wrap')) return;
    const to = stage.getBoundingClientRect();
    if (!to.width || !to.height) return;
    const same = sameRatio(src.ratio, to.width / to.height), cs = getComputedStyle(stage);
    focusView.classList.add('morph-hold');
    decorations(false, 0);
    const m = frameMorph({ from: src.rect, to: () => stage.getBoundingClientRect(), radius: [src.radius, parseFloat(cs.borderTopLeftRadius) || 0],
      shadow: [src.shadow, cs.boxShadow], a: src.url, b: same ? null : '', swapAt: 0, swapMs: 250 });
    const f: Flight = flight = { m, same, hidden: [], entering: true, ready: !resizeUI.preparing(), landed: false };
    f.lead = window.setTimeout(() => { if (flight === f) decorations(true, motionMs('--duration-short4')); }, MORPH_LEAD);
    m.landed.then(() => requestAnimationFrame(() => {
      if (flight !== f) return;
      f.landed = true;
      if (!f.same || f.ready) { handOver(f); return; }
      // 첫 장이 끝내 오지 않아도(스트림이 멎었다) 카드 그림을 붙들고 있지 않는다
      f.giveUp = window.setTimeout(() => handOver(f), 5000);
    }));
  }
  /** 준비가 실패했다 — 자리 표시를 거두고 실패 표시를 보인다. */
  function prepareFailed() { if (flight?.entering) handOver(flight); }
  /** 첫 장이 붙었다. 같은 비율의 모프가 날거나 기다리는 중이면 그 틀이 크로스페이드를 맡는다(참이면 캔버스는 페이드하지 않는다). */
  function firstFrame() {
    const f = flight;
    if (!f || !f.entering || !f.same) return false;
    f.ready = true;
    if (f.landed) handOver(f);
    return true;
  }
  /**
   * 작업 공간에서 나간다. 장식이 --duration-short2 만큼 먼저 물러나고, 지금 프레임을 멈춰 세운 틀이 target()(그린 뒤의 도착 틀)로 줄어든다.
   * 도착 틀이 없으면(화면 밖) 페이드하고 miss()를 부른다 — 보드는 카드 강조다.
   */
  function morphOut(update: () => void, done: () => void, target: () => HTMLElement | null, miss: () => void = () => {}, still: () => boolean = () => true) {
    stopFlight();
    const plain = () => transition(() => { update(); target(); miss(); }, done, { workspace: true, image: shot });
    if (reduced.matches || document.hidden || focusView.hidden || !stage.offsetWidth) { plain(); return; }
    const unlock = hold();
    resizeUI.suspend();   // 크기를 막 바꿨으면 새 첫 장을 붙이려던 일이 남아 있다 — 멈춘 프레임을 덮지 않게 끊는다
    decorations(false, motionMs('--duration-short2'));
    const frozen = streaming() && shot.naturalWidth ? freeze(shot) : null;
    Promise.all([frozen, new Promise(r => setTimeout(r, motionMs('--duration-short2')))]).then(() => {
      // 나는 틀은 확대되지 않는다 — 링 굵기는 확대를 되돌리기 전(--z 1)의 값으로 잰다
      stage.style.setProperty('--z', '1');
      const src = frameOf(stage)!;
      stage.style.removeProperty('--z');
      unlock();
      // 기다리는 사이 다시 들어왔으면 나가지 않는다 — 장식을 되돌리고 지금 상태를 그린다(멈춘 스트림은 다시 붙는다)
      if (!still()) { decorations(true, 0); update(); done(); return; }
      transition(() => {
        update();
        decorations(true, 0);
        let t = target();
        const dst = t && frameOf(t);
        if (!t || !dst || !dst.rect.width || !src.url) { miss(); return; }
        const same = sameRatio(src.ratio, dst.ratio);
        t.classList.add('morph-target');
        let last = dst.rect;
        // 나는 사이 보드를 다시 그려 카드가 바뀌면 새 카드로 간다 — 떨어져 나간 요소는 (0,0)을 잰다
        const to = () => {
          if (!t!.isConnected) { const n = target(); if (n) { n.classList.add('morph-target'); f.hidden = [n]; t = n; } }
          if (t!.isConnected) last = t!.getBoundingClientRect();
          return last;
        };
        // 카드 윗부분이 붙은 묶음 머리 밑에 들어 있으면 틀도 그 밑으로 들어간다 — 층(z)을 내리면 지나는 다른 머리가 틀을 가로로 자른다
        const m = frameMorph({ from: src.rect, to, radius: [src.radius, dst.radius], shadow: [src.shadow, dst.shadow],
          a: src.url, b: dst.url, swapAt: same ? 400 : 0, swapMs: same ? 150 : 250, ceiling: () => stuckHead(t) });
        const f: Flight = flight = { m, same, hidden: [t] };
        m.landed.then(() => requestAnimationFrame(() => { if (flight !== f) return; flight = null; for (const el of f.hidden) el.classList.remove('morph-target'); m.finish(0); }));
      }, done, { workspace: true });
    });
  }

  /*
   * 브라우저 뒤로 가기 = 나가기(W7). 들어온 것을 상태로 받을 때 history 한 칸을 쌓는다 — 다른 탭이 들여보낸 것도 같다.
   * URL 은 그대로다: 화면의 진실은 데몬 상태 하나이고, 주소에 실으면 둘이 된다. 다른 길(버튼 · esc · 탭 옮기기)로 나왔으면
   * 쌓은 칸을 걷어 내되, 그때 오는 popstate 는 나가기가 아니다. 새로고침해도 history.state 가 남아 두 번 쌓지 않는다.
   */
  let skipPop = false;
  const ours = () => !!(history.state && history.state.prevueWs);
  function syncHistory(s: ViewerState) {
    const inWs = !!(s && s.screen === 'focus' && s.focus && s.focus.fromBoard);
    if (inWs && !ours()) {
      // 보드 스크롤은 뷰어가 갖는다(session.ts scrolls). 브라우저에 맡기면 나가는 back() 의 popstate 가 여기서 찍힌 자리 —
      // 보드를 숨긴 뒤라 0 — 로 되돌려, 줄어드는 그림이 돌아갈 카드가 화면 밖으로 사라졌다. 모드는 칸마다라 떠나는 칸에 건다.
      history.scrollRestoration = 'manual';
      history.pushState({ prevueWs: true }, '');
    }
    // back() 은 비동기다 — 도착 전에 상태가 한 번 더 오면 두 번 물러나 Prevue 를 떠난다. 걷는 중이면 다시 걷지 않는다.
    else if (!inWs && ours() && !skipPop) { skipPop = true; history.back(); }
  }
  addEventListener('popstate', () => {
    if (skipPop) { skipPop = false; return; }
    const f = store.st && store.st.screen === 'focus' && store.st.focus;
    if (f && f.fromBoard) post('/viewer/exit');
  });

  /* ---------- 마우스 — 가리키기 · 이동 · 터치(input.ts)로 나눈다 ---------- */
  const pos = (e: MouseEvent) => posIn(e, shot);
  const interactiveNow = () => !!(store.st && store.st.focus && store.st.focus.interactive);
  stage.addEventListener('mousemove', e => {
    if (interactiveNow() || !ready) return;
    const n = hitIn(nodes, ...pos(e)); if (n) drawBox(box, n, layoutScale()); else box.hidden = true;
  });
  stage.addEventListener('mouseleave', () => { box.hidden = true; });

  stage.addEventListener('mousedown', e => {
    if (e.button !== 0 || resizeUI.moving()) return;
    // 이동이 먼저다 — Space 를 누른 채이거나, 보기 모드에서 확대돼 있으면 끌어서 옮긴다. 조작 모드의 드래그는 터치다.
    if (spaceHeld || (!interactiveNow() && zoom.z > 1 && !e.altKey)) { startPan(e); return; }
    if (!interactiveNow() || e.altKey) return;
    e.preventDefault();                       // 이미지 드래그(ghost)가 mousemove를 가로채지 못하게
    press(...pos(e));
  });
  window.addEventListener('mousemove', e => { if (pressing()) drag(...pos(e)); });
  window.addEventListener('mouseup', e => { if (pressing()) release(...pos(e)); });

  stage.addEventListener('click', async e => {
    if (resizeUI.moving()) return;
    if (panned) { panned = false; return; }       // 끌어서 옮긴 끝의 click 은 가리키기가 아니다
    // 인터랙티브 중에도 ⌥+클릭은 가리키기다 — 사람이 조작해 만든 바로 그 상태에서 파일:라인을 얻는다.
    if (interactiveNow() && !e.altKey) return;
    if (!ready || !store.st || !store.st.focus) return;
    // 들고 있는 트리는 마지막으로 쓴 그림의 것이다. 조작으로 바뀌었으면 데몬이 지금 화면으로 맞춘 트리를 받아 그것으로 찾는다.
    if (interactiveNow()) {
      try {
        const r: { treeUrl?: string } = await post('/viewer/catchup').then(r => r.json());
        // 상태가 먼저 같은 트리를 받기 시작했을 수 있다 — 그때도 다 받을 때까지 기다린다.
        await loadFocusTree(r.treeUrl || treeUrl!);
      } catch (err) { flash(phrase('point.sync.failed', { why: (err as Error).message })); return; }
    }
    await treeLoad;                                // 새 그림의 트리를 받는 중이면 그것으로 찾는다
    const n = hitIn(nodes, ...pos(e)); if (!n) return;
    drawBox(pickBox, n, layoutScale());
    const show = sayOn(pickBox, n);
    setSay(show);
    point(n, store.st.focus.previewId, show);
  });

  /* ---------- 확대 · 이동(macOS 미리보기처럼) ---------- */
  /*
   * stage 에 transform(translate · scale)을 건다. 클릭 좌표(posIn)는 화면 사각형을 재므로 그대로 맞고,
   * 박스는 stage 안에 있어 확대 전 레이아웃 배율(layoutScale)로 그린다 — 화면 배율로 그리면 두 번 커진다.
   * 박스 선 · 이름 태그는 --z 로 되돌려 확대해도 가늘다.
   */
  const zoom = { z: 1, x: 0, y: 0 };
  let zoomFor: string | null = null, spaceHeld = false, panned = false, ppd: number | null = null;
  function layoutScale() { const n = fullW || shot.naturalWidth; return n ? shot.offsetWidth / n : 1; }
  /**
   * 실제 크기(1dp = 1 CSS px)의 z. z 는 맞춤 대비 배율이고, 맞춤에서 1dp 는 layoutScale × pxPerDp CSS px 다.
   * 밀도를 모르는 기기(id:)면 null — 배율은 맞춤 기준으로 보이고 `실제 크기`는 메뉴에서 빠진다.
   */
  function realZ() {
    // 작업 공간은 장면이 그린 배율로 잰다 — 스트림 그림에서 거꾸로 재면 프리셋마다 해상도 · 밀도가 달라 보이는 크기는 그대로인데 숫자가 바뀌었다
    const s = resizeUI.pxPerDp();
    if (s) return 1 / s;
    return ppd && (fullW || shot.naturalWidth) ? 1 / (layoutScale() * ppd) : null;
  }
  // 작은 컴포넌트는 맞춤이 곧 PNG 원래 크기라 실제 크기보다 크다 — 그때는 맞춤 아래로도 줄어든다.
  const zMin = () => Math.min(1, realZ() || 1), zMax = () => Math.max(8, (realZ() || 1) * 4);

  /** 그림이 틀 밖으로 다 나가지 않게 — 그림의 가장자리가 틀 가운데를 넘지 않는다. 맞춤보다 작으면 제자리 가운데에 둔다. */
  function clamp(z: number, x: number, y: number): [number, number, number] {
    if (z <= 1) return [z, stage.offsetWidth * (1 - z) / 2, stage.offsetHeight * (1 - z) / 2];
    const w = stage.offsetWidth * z, h = stage.offsetHeight * z;
    const vw = wrap.clientWidth, vh = wrap.clientHeight, ox = stage.offsetLeft, oy = stage.offsetTop;
    return [z, Math.min(vw / 2 - ox, Math.max(vw / 2 - ox - w, x)), Math.min(vh / 2 - oy, Math.max(vh / 2 - oy - h, y))];
  }
  function setZoom(z: number, x: number, y: number, animate: boolean) {
    if (resizeUI.preparing()) return;
    [zoom.z, zoom.x, zoom.y] = clamp(Math.min(zMax(), Math.max(zMin(), z)), x, y);
    stage.classList.toggle('zoom-anim', !!animate);
    stage.style.transform = resizeUI.zoom(animate) || zoom.z === 1 ? '' : `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.z})`;
    // 장면의 무대(.unit .stage)도 함께 받게 공통 틀에 건다
    wrap.style.setProperty('--z', String(zoom.z));
    stage.classList.toggle('zoomed', zoom.z > 1);
    showZoom();
    reportViewport();
  }
  /** 배율 숫자 — 실제 크기 대비. 맞춤 배율이 창 · 그림이 바뀌면 달라지므로 그때마다 다시 쓴다. */
  function showZoom() {
    const r = realZ();
    zoomView.set({ pct: Math.round((r ? zoom.z / r : zoom.z) * 100), real: !!r, atFit: zoom.z === 1 });
  }
  /** (cx, cy) 화면 점을 붙잡은 채 확대한다 — 포인터 아래의 것이 포인터 아래에 남는다. */
  function zoomAt(z2: number, cx: number, cy: number, animate: boolean) {
    const r = stage.getBoundingClientRect(), left = r.left - zoom.x, top = r.top - zoom.y;
    const lx = (cx - r.left) / zoom.z, ly = (cy - r.top) / zoom.z;
    const z = Math.min(zMax(), Math.max(zMin(), z2));
    setZoom(z, cx - left - lx * z, cy - top - ly * z, animate);
  }
  function zoomTo(z: number) {
    const r = wrap.getBoundingClientRect();
    zoomAt(z, r.left + r.width / 2, r.top + r.height / 2, true);
  }
  const zoomCenter = (f: number) => zoomTo(zoom.z * f);
  const zoomIn = () => zoomCenter(1.25), zoomOut = () => zoomCenter(1 / 1.25), zoomFit = () => setZoom(1, 0, 0, true);

  /* 배율을 누르면 목적지 셋 — 맞춤 · 실제 크기 · 200%. 실제 크기가 확대의 이유다("실물에서 이 글자가 이만큼인가"). */
  let zoomByKey = false;
  function closeZoomMenu() {
    if (!zoomView.get().menu) return false;
    zoomView.set({ menu: false });
    // 메뉴 안에 남은 포커스는 키보드로 열었으면 배율로 돌려주고, 아니면 놓는다 — 사라진 메뉴 칸이 다음 Enter 를 받으면 안 된다(D-63).
    const menu = document.getElementById('zoomMenu'), active = document.activeElement as HTMLElement | null;
    if (menu && active && menu.contains(active)) { if (zoomByKey) document.getElementById('zoomPct')?.focus({ preventScroll: true }); else active.blur(); }
    return true;
  }
  /** byKey 면 키보드로 누른 것이다. */
  function toggleZoomMenu(byKey: boolean) {
    const on = !zoomView.get().menu;
    if (on) zoomByKey = byKey;
    zoomView.set({ menu: on });
  }
  function zoomMenuPick(z: string) {
    closeZoomMenu();
    if (z === 'fit') zoomFit();
    else zoomTo((realZ() || 1) * Number(z));
  }
  addEventListener('pointerdown', e => { const ctl = document.getElementById('zoomCtl'); if (!ctl || !ctl.contains(e.target as Node)) closeZoomMenu(); });
  addEventListener('resize', () => { fitStage(); setZoom(zoom.z, zoom.x, zoom.y, false); });
  shot.addEventListener('load', () => { noteFull(); fitStage(); });

  // 핀치는 ctrlKey 가 붙은 wheel 로 온다. ⌘ + 휠도 확대. 조작 중의 그 밖의 휠은 기기 스크롤이고(D-58 — 드래그가 기기 터치인 것처럼),
  // 보기 모드에서는 확대돼 있을 때만 이동이다. 조작 중 확대한 그림을 옮기는 것은 Space + 드래그다.
  wrap.addEventListener('wheel', e => {
    if (focusView.hidden) return;
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomAt(zoom.z * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY, false); }
    else if (interactiveNow()) { e.preventDefault(); if (!resizeUI.moving()) wheelAt(e); }
    else if (zoom.z > 1) { e.preventDefault(); setZoom(zoom.z, zoom.x - e.deltaX, zoom.y - e.deltaY, false); }
  }, { passive: false });

  /** 휠 델타를 그림 px 로 바꾼다. 내용이 휠만큼 따라 움직이게 — 화면 1 CSS px 은 그림 1 / (layoutScale × 확대) px 다. */
  function wheelAt(e: WheelEvent) {
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? wrap.clientHeight : 1;
    const per = layoutScale() * zoom.z || 1;
    const [x, y] = pos(e);
    const w = Math.max(0, Math.min(fullW || shot.naturalWidth, x)), h = Math.max(0, Math.min(fullH || shot.naturalHeight, y));
    wheel(w, h, e.deltaX * unit / per, e.deltaY * unit / per);
  }

  function startPan(e: MouseEvent) {
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = zoom.x, oy = zoom.y;
    stage.classList.add('panning');
    const move = (ev: MouseEvent) => {
      if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 3) panned = true;
      setZoom(zoom.z, ox + ev.clientX - sx, oy + ev.clientY - sy, false);
    };
    const up = () => { stage.classList.remove('panning'); removeEventListener('mousemove', move); removeEventListener('mouseup', up); };
    addEventListener('mousemove', move);
    addEventListener('mouseup', up);
  }

  // Space 를 누른 채면 조작 중에도 끌어서 옮긴다. 입력 중이면 Space 는 글자다.
  const typing = (t: HTMLElement | null) => !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  addEventListener('keydown', e => {
    const t = e.target as HTMLElement | null;
    if (e.code !== 'Space' || focusView.hidden || typing(t) || (t?.closest && t.closest('button, [role=button]'))) return;
    e.preventDefault();
    if (!spaceHeld) { spaceHeld = true; stage.classList.add('grab'); }
  });
  addEventListener('keyup', e => { if (e.code === 'Space') { spaceHeld = false; stage.classList.remove('grab'); } });
  addEventListener('blur', () => { spaceHeld = false; stage.classList.remove('grab'); });

  const resizeUI = createResizeController({
    root: scene, geometry, shot, stage, wrap, zoomState: () => zoom,
    preparation(on, failed) {
      if (failed) prepareFailed();
      zoomView.set({ disabled: on });
      if (on) closeZoomMenu();
    },
    firstFrame,
    originalSize() { const c = store.st?.board && cardOf(store.st.board.focus); return c ? { w: c.widthDp, h: c.heightDp } : null; },
    dimensions(w, h) {
      if (w && h) { fullW = w; fullH = h; shot.dataset.fullW = String(w); sentW = 0; reportViewport(); }
      return { w: fullW, h: fullH };
    },
    layout(r) {
      stage.style.left = r.cx - r.w / 2 + 'px';
      stage.style.top = r.y + 'px';
      stage.style.width = r.w + 'px';
      stage.style.height = r.h + 'px';
      stage.style.borderRadius = r.radius + 'px';
      showZoom();
      reportViewport();
    },
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(viewportTimer);
      resizeUI.suspend();
      if (!streaming()) return;
      const previous = shot.getAttribute('src');
      freeze(shot);
      if (shot.getAttribute('src') === previous) shot.removeAttribute('src');
      shot.dataset.url = '';
    } else if (store.st?.screen === 'focus') render(store.st.focus);
  });

  return {
    render, fitStage, renarrow, syncHistory, morphIn, morphOut,
    image: () => shot,
    zoomIn, zoomOut, zoomFit, zoomMenuPick, toggleZoomMenu, closeZoomMenu,
  };
}

const ratioOf = (img: HTMLImageElement | null | undefined) => img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 0;
const stills = new Map<string, HTMLImageElement>();
/** 스트림 대신 담을 정지 그림의 비율 — 디코드한 적이 있는 것만 안다. */
function still(img: HTMLImageElement | null) {
  const u = img?.dataset.still;
  if (!u) return null;
  if (!stills.has(u)) { const i = new Image(); i.src = u; stills.set(u, i); if (stills.size > 8) stills.delete(stills.keys().next().value!); }
  return stills.get(u)!;
}
/** 모프의 출발점 · 도착점 — 그리기 전에 잰다. 스트림 주소는 담지 않는다(복제하면 연결이 하나 더 열린다). */
export function frameOf(el: HTMLElement | null): Frame | null {
  if (!el) return null;
  const img = el.querySelector('img'), cs = getComputedStyle(el), url = img ? img.getAttribute('src') || '' : '';
  return { el, rect: el.getBoundingClientRect(), radius: parseFloat(cs.borderTopLeftRadius) || 0, shadow: cs.boxShadow,
    url: !img ? '' : url.startsWith('/stream') ? img.dataset.still || '' : img.currentSrc || url, ratio: ratioOf(img) || ratioOf(still(img)) };
}

/* ---------- 의도 ---------- */
/** FR-18. 카드 하나에 태스크를 걸고 그 장만 남긴다. 화면 전환은 돌아올 state 가 한다. */
export function enterFocus(i: number) { post('/viewer/focus', { index: i }).catch(e => setStatus(phrase('focus.enter.failed', { why: (e as Error).message }), 'error')); }
/** 보드로. 보드에서 들어온 한 장에서만 뜻이 있다. 버튼 · esc · 브라우저 뒤로 가기가 모두 이것이다(W7). */
export function exitFocus() { const f = store.st && store.st.focus; if (f && f.fromBoard) post('/viewer/exit'); }
/** 보기 ↔ 조작. 보드에서 들어왔으면 조작이 곧 이 화면이라 끄는 것이 보드로 돌아가는 것이다. */
export function toggleInteractive() {
  const f = store.st && store.st.focus;
  if (!f) return;
  if (f.fromBoard) post('/viewer/exit'); else post('/viewer/interactive', { on: !f.interactive });
}
/** 단건의 보기 | 조작 — 이미 그 모드면 보내지 않는다. */
export function setInteractive(on: boolean) {
  const f = store.st && store.st.focus;
  if (!f || on === !!f.interactive) return;
  post('/viewer/interactive', { on });
}
