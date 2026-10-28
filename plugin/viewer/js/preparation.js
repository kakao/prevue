import { createScene, sceneEasing, sceneMs, handoffMs } from './preparation-scene.js';
import { phrase, daemonText } from './strings.js';

export function prepareViewer() {
  const query = new URL(location.href).searchParams;
  if (!query.has('prepare')) return null;
  const request = Object.fromEntries(query);
  const scene = createScene(request);
  const content = [...document.querySelectorAll('body > header, #rail, body > main, #staleBar')];
  let active = true, ready = false, key = null, latest = null, selection = null, leaving = false;
  let timers = [], revision = 0;
  let failed = false;
  let failedGen = 0;
  const failureRequest = new AbortController();
  const waiting = new Set();
  const nextFrame = () => new Promise(resolve => {
    waiting.add(resolve);
    requestAnimationFrame(() => { waiting.delete(resolve); resolve(); });
  });
  const boardKey = s => s.board ? JSON.stringify([s.board.file, s.board.gen, s.board.groups.flatMap(g => g.cards.map(c => [c.previewId, c.imageUrl]))]) : null;
  const schedule = (fn, ms) => { const timer = setTimeout(fn, ms); timers.push(timer); };

  function block(on) {
    document.body.classList.toggle('preparing', on);
    content.forEach(element => {
      element.inert = on;
      if (on) element.setAttribute('aria-hidden', 'true');
      else element.removeAttribute('aria-hidden');
    });
  }

  function dispose() {
    if (!active) return;
    active = false; revision++;
    failureRequest.abort();
    timers.forEach(clearTimeout);
    waiting.forEach(resolve => resolve()); waiting.clear();
    scene.destroy(); block(false);
    document.documentElement.classList.remove('preparation-cover');
    document.removeEventListener('keydown', keyboard, true);
    document.removeEventListener('pointerdown', pointer, true);
    document.removeEventListener('wheel', pointer, true);
    removeEventListener('resize', resize);
    const url = new URL(location.href);
    ['prepare', 'started', 'id', 'file', 'phase', 'phaseStarted', 'preparationStatus'].forEach(name => url.searchParams.delete(name));
    history.replaceState(null, '', url);
  }

  // 보드는 처음부터 준비 화면 아래에 있다 — 준비 화면이 걷히며 화면 안 카드가 차례로 떠오른다(D-102)
  function finish(immediate = false) {
    if (!active || !ready) return;
    if (immediate || !selection) { dispose(); return; }
    if (leaving) return;
    leaving = true;
    timers.forEach(clearTimeout); timers = [];
    document.documentElement.classList.remove('preparation-cover');
    selection.stage.scrollIntoView({ block: 'center', behavior: 'instant' });
    const duration = sceneMs('--duration-extra-long2'), stagger = sceneMs('--motion-stagger');
    const shift = getComputedStyle(document.documentElement).getPropertyValue('--motion-enter-shift').trim() || '0px';
    const cards = [...document.querySelectorAll('.card')].filter(card => {
      const r = card.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    });
    cards.forEach((card, i) => card.animate([
      { opacity: 0, transform: `translateY(${shift})` },
      { opacity: 1, transform: 'none' },
    ], { duration, delay: stagger * i, easing: sceneEasing('--easing-decelerate'), fill: 'backwards' }));
    scene.host.style.pointerEvents = 'none';
    scene.animate(scene.host, [{ opacity: 1 }, { opacity: 0 }], { duration, easing: sceneEasing('--easing-standard'), fill: 'forwards' })
      .finished.then(dispose, dispose);
  }

  function keyboard(event) {
    if (ready && !leaving && ['Enter', ' '].includes(event.key)) {
      event.preventDefault(); event.stopImmediatePropagation(); finish(true);
    }
  }
  function pointer() { if (ready && !leaving) finish(true); }
  function resize() {
    if (selection && !leaving) scene.fit(selection.card.widthDp || scene.image.naturalWidth, selection.card.heightDp || scene.image.naturalHeight);
  }

  function fail(reason) {
    if (!active || ready) return;
    failed = true;
    failedGen = latest?.board?.gen ?? 0;
    revision++; key = null;
    scene.fail(reason);
  }

  async function watchFailure() {
    if (!active || ready || !/^http:\/\/127\.0\.0\.1:\d+\/preparation\/[a-f0-9]{32}$/.test(request.preparationStatus || '')) return;
    try {
      const response = await fetch(request.preparationStatus, { signal: failureRequest.signal });
      const state = await response.json();
      if (state.id !== request.id) return;
      if (state.phase === 'failure') { fail(state.errorKey ? phrase(state.errorKey) : state.error); return; }
      if (state.finished) return;
    } catch { if (!active || ready) return; }
    schedule(watchFailure, 300);
  }

  function center(s, rendered) {
    const cards = s.board?.groups.flatMap(group => group.cards) || [];
    const stages = cards.map(card => ({ card, stage: document.querySelector(`.card[data-i="${card.index}"] .cstage`) }))
      .filter(item => item.stage?.offsetWidth && (!rendered || (item.card.ok && item.card.imageUrl)));
    if (!stages.length) return null;
    const bounds = stages.map(item => item.stage.getBoundingClientRect());
    const x = (Math.min(...bounds.map(r => r.left)) + Math.max(...bounds.map(r => r.right))) / 2;
    const y = (Math.min(...bounds.map(r => r.top)) + Math.max(...bounds.map(r => r.bottom))) / 2;
    return stages.reduce((best, item, i) => {
      const r = bounds[i], distance = Math.hypot(r.x + r.width / 2 - x, r.y + r.height / 2 - y);
      return !best || distance < best.distance ? { ...item, distance } : best;
    }, null);
  }

  async function present(s, turn) {
    await nextFrame(); await nextFrame();
    if (!active || turn !== revision) return;
    const chosen = center(s, true);
    if (!chosen) { fail(phrase('prep.image.missing')); return; }
    const decoded = new Image();
    decoded.src = chosen.card.imageUrl;
    try { await decoded.decode(); }
    catch { if (active && turn === revision) fail(phrase('prep.image.unreadable')); return; }
    if (!active || turn !== revision || boardKey(latest) !== boardKey(s)) return;
    selection = chosen;
    scene.image.src = decoded.src;
    scene.image.dataset.index = chosen.card.index;
    scene.image.alt = chosen.card.title;
    scene.fit(chosen.card.widthDp || decoded.naturalWidth, chosen.card.heightDp || decoded.naturalHeight);
    const fast = Date.now() - Number(request.started) < 1500;
    scene.host.dataset.tempo = fast ? 'fast' : 'normal';
    scene.reveal(fast);
    ready = true; block(false);
    schedule(() => {
      if (!active) return;
      scene.host.dataset.boardArrival = 'presenting';
      schedule(() => finish(), fast ? 800 : 2500);
    }, scene.reduced.matches ? 0 : handoffMs(fast));
  }

  block(true);
  document.documentElement.classList.add('preparation-cover');
  document.addEventListener('keydown', keyboard, true);
  document.addEventListener('pointerdown', pointer, true);
  document.addEventListener('wheel', pointer, { capture: true, passive: true });
  addEventListener('resize', resize);
  watchFailure();
  return {
    update(s) {
      if (!active) return;
      latest = s;
      if (request.file && s.board && s.board.file !== request.file) { dispose(); return; }
      if (failed && s.board && s.board.gen !== failedGen) { dispose(); return; }
      if (failed) return;
      const next = boardKey(s);
      if (ready && (next !== key || s.screen !== 'board')) { dispose(); return; }
      if (ready) return;
      if (s.error) { fail(daemonText(s.error)); return; }
      if (!request.file && s.header.repo && s.screen === 'empty') { dispose(); return; }
      if (s.screen === 'focus' && s.focus?.imageUrl && !s.busy) { dispose(); return; }
      if (!s.board) return;
      scene.setPhase('render');
      const model = center(s, false);
      if (model?.card.widthDp && model.card.heightDp && !ready) scene.fit(model.card.widthDp, model.card.heightDp);
      const cards = s.board.groups.flatMap(group => group.cards);
      if (s.busy || !cards.length || cards.some(card => !card.rendered || card.stale)) return;
      const broken = cards.find(card => card.ok === false);
      if (broken) { fail(daemonText(broken.failure) || phrase('prep.render.failed')); return; }
      if (next === key) return;
      key = next;
      const turn = ++revision;
      present(s, turn).catch(error => { if (active && turn === revision) fail(error.message); });
    },
    fail,
  };
}
