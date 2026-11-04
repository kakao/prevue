import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { hideReactKeys } from '../host';
import { MessagesContext, type Messages } from '../messages';
import { PreparationProgress } from './PreparationProgress';
import { PreparationBar, PreparationScene } from './PreparationScene';

// 준비 서버는 motion.js 를 내주지 않는다 — 같은 도우미(motionToken · motionMs)를 여기 둔다.
export const sceneEasing = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'ease';
export const sceneMs = (name: string) => {
  const m = /^([\d.]+)(ms|s)$/.exec(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
  return m ? parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1) : 0;
};
// 다 그린 장면이 자리를 잡는 전환과 표시 단계로 넘어가는 타이머가 같은 길이를 쓴다.
export const handoffMs = (fast: boolean) => sceneMs(fast ? '--duration-long4' : '--duration-extra-long4');

const PHASES = ['project', 'environment', 'render', 'drawn'];
const PHASE_TAU = 6000;

export type SceneRequest = { phase?: string; started?: string | number; phaseStarted?: string | number; file?: string | null };
export type Scene = ReturnType<typeof mountScene>;

// 마크업은 React 가 한 번 그리고 다시 그리지 않는다. 단계 글 · 막대 · 매 프레임의 부유 값 · Web Animations 는
// 이 컨트롤러가 요소에 직접 쓴다 — 뷰어에서는 ViewerRoot 의 레이아웃 효과 안에서 불려 React 갱신이 그 자리에서 반영되지 않는데,
// 단계를 바꾼 바로 뒤의 fit() 이 바뀐 글의 높이를 잰다.
export function mountScene(messages: Messages, initial: SceneRequest, parent: HTMLElement = document.body) {
  const { phrase } = messages;
  const host = document.createElement('section');
  host.id = 'preparation';
  host.dataset.screen = 'loading';
  host.dataset.phase = initial.phase || 'environment';
  host.dataset.boardArrival = 'idle';
  const root = createRoot(host);
  hideReactKeys(host);
  flushSync(() => root.render(<MessagesContext.Provider value={messages}>
    <PreparationBar />
    <PreparationScene />
    <PreparationProgress />
  </MessagesContext.Provider>));
  if (!host.firstChild) throw Error('준비 장면은 React 커밋 밖에서 띄운다 — 커밋 안의 flushSync 는 그리지 않는다');
  parent.append(host);
  const find = <T extends Element = HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  const image = find<HTMLImageElement>('.preview');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const lines = ['#headline', '#detail'].map(selector => ({ element: find(selector), text: '', animations: [] as Animation[] }));
  const cells = [...host.querySelectorAll<HTMLElement>('.prep-progress i')];
  const started = Number(initial.started || Date.now());
  let phase: string | null = null, disposed = false, frame = 0, last = 0, clock = 0;
  let phaseAt = Number(initial.phaseStarted || Date.now());
  let time = (Date.now() - Number(initial.started || Date.now())) / 1000;
  let amplitude = 1;
  const animations = new Set<Animation>();

  function text(index: number, next: string) {
    const line = lines[index];
    if (line.text === next) return;
    line.animations.forEach(animation => animation.cancel());
    line.animations = [];
    const hadText = !!line.text;
    line.text = next;
    line.element.textContent = next;
    if (!reduced.matches && hadText) {
      const animation = line.element.animate([
        { opacity: 0, transform: index === 0 ? 'translateY(4px)' : 'none' },
        { opacity: 1, transform: 'none' },
      ], { duration: sceneMs(index === 0 ? '--duration-medium2' : '--duration-short4'), easing: sceneEasing('--easing-decelerate') });
      line.animations.push(animation);
    }
  }

  function setPhase(next: string) {
    if (phase === next || disposed) return;
    if (phase !== null) phaseAt = Date.now();
    phase = next;
    host.dataset.phase = next === 'drawn' ? 'render' : next;
    text(0, ({ project: phrase('prep.phase.project'), environment: phrase('prep.phase.environment'),
      render: phrase('prep.phase.render'), drawn: phrase('prep.phase.drawn') } as Record<string, string>)[next] || next);
    text(1, initial.file ? phrase('prep.next.file', { file: initial.file.split('/').pop() }) : phrase('prep.next.pick'));
    find('#now').textContent = ({ project: phrase('prep.now.project'), environment: phrase('prep.now.environment'),
      render: phrase('prep.now.render') } as Record<string, string>)[next] || '';
    progress();
    syncMotion();
  }

  // 단계가 언제 끝날지 모르므로 지금 칸은 끝에 닿지 않고 다가가기만 한다
  function progress() {
    const step = PHASES.indexOf(phase ?? ''), failed = host.dataset.screen === 'failure';
    const fill = 1 - Math.exp(-(Date.now() - phaseAt) / PHASE_TAU);
    cells.forEach((cell, i) => {
      cell.style.setProperty('--fill', String(i < step || step === 3 ? 1 : i === step ? (fill * .9).toFixed(3) : 0));
      cell.classList.toggle('bad', failed && i === step);
    });
    find('.now').hidden = failed || step === 3;
    find('#clock').textContent = phrase('prep.clock', { s: Math.max(0, Math.floor((Date.now() - started) / 1000)) });
  }

  function syncClock() {
    const running = !disposed && !document.hidden && host.dataset.screen === 'loading';
    if (running && !clock) clock = window.setInterval(progress, 250);
    else if (!running && clock) { clearInterval(clock); clock = 0; }
  }

  function appearance() {
    host.dataset.theme = document.documentElement.dataset.theme || (dark.matches ? 'dark' : 'light');
    host.dataset.reduced = String(reduced.matches);
    if (reduced.matches) {
      lines.forEach(line => line.animations.forEach(animation => animation.cancel()));
      animations.forEach(animation => animation.finish());
    }
    syncMotion();
  }

  function paint() {
    const t = reduced.matches ? 0 : time;
    const a = reduced.matches ? 0 : amplitude;
    const drift = find('.drift');
    drift.style.setProperty('--hover-y', `${Math.sin(t * .8) * a * 8}px`);
    drift.style.setProperty('--hover-ry', `${Math.sin(t * .5) * a * 2}deg`);
    host.querySelectorAll<HTMLElement>('.solid').forEach((solid, i) => {
      const p = t * .9 + i * 1.3;
      for (const [key, value] of Object.entries({ x: `${Math.sin(p * .6) * a * 10}px`, y: `${Math.cos(p) * a * 17}px`,
        r: `${Math.sin(p * .7) * a * 4}deg` })) solid.style.setProperty(`--float-${key}`, value);
    });
    host.style.setProperty('--art-x', `${Math.sin(t * .6) * a * 7}px`);
    host.style.setProperty('--art-r', `${t * 5 % 360}deg`);
  }

  function tick(now: number) {
    frame = 0;
    const delta = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now; time += delta;
    const target = phase === 'project' ? 1 : phase === 'environment' ? .34 : .13;
    amplitude += (target - amplitude) * (1 - Math.exp(-delta * 2.7));
    paint();
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    syncClock();
    const moving = !disposed && !document.hidden && !reduced.matches && host.dataset.screen === 'loading';
    if (moving && !frame) { last = 0; frame = requestAnimationFrame(tick); }
    else if (!moving && frame) { cancelAnimationFrame(frame); frame = 0; }
    if (!moving) paint();
  }

  // #preparation 은 워드마크 줄 아래에서 시작하고 워드마크 줄은 그 안의 fixed 자식이라, 호스트 top 을 빼 호스트 좌표로 잰다.
  function fit(width: number, height: number) {
    const ratio = width / height;
    const scene = find('.scene').getBoundingClientRect();
    const top = host.getBoundingClientRect().top;
    const center = scene.top + scene.height * .52;
    const copyHeight = find('.loading-copy').getBoundingClientRect().height;
    const room = Math.max(40, Math.min(480, innerHeight * .5, (innerHeight - 48 - copyHeight - 48 - center) * 2, (center - top - 24) * 2));
    const small = width <= 260 && height <= 120;
    const strip = !small && height <= 180 && ratio >= 2;
    const limit = small ? Math.min(280, width * 1.5) : strip ? 420 : 500;
    const w = Math.min(limit, innerWidth - 64, room * ratio);
    host.dataset.form = small ? 'button' : strip ? 'strip' : ratio > 1.3 ? 'landscape' : 'screen';
    for (const key of ['model', 'drawn']) {
      host.style.setProperty(`--${key}-w`, `${w}px`);
      host.style.setProperty(`--${key}-h`, `${w / ratio}px`);
    }
    host.style.setProperty('--drawn-copy-top', `${center - top + w / ratio / 2 + 48}px`);
  }

  function fail(reason: string) {
    host.dataset.screen = 'failure';
    host.dataset.interactive = 'false';
    text(0, phrase('prep.failed'));
    text(1, reason);
    find('.failure-help').hidden = false;
    progress();
    syncMotion();
  }

  const observer = new MutationObserver(appearance);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  reduced.addEventListener('change', appearance);
  dark.addEventListener('change', appearance);
  document.addEventListener('visibilitychange', syncMotion);
  appearance(); setPhase(initial.phase || 'environment');
  return { host, image, setPhase, fit, fail, reduced,
    get phaseStarted() { return phaseAt; },
    reveal(fast: boolean) {
      setPhase('drawn');
      host.dataset.screen = 'drawn';
      host.dataset.interactive = 'true';
      host.dataset.boardArrival = 'revealing';
      const duration = handoffMs(fast);
      for (const [key, value] of Object.entries({ 'handoff-duration': duration, 'image-opacity-duration': duration * .68,
        'image-opacity-delay': duration * .1, 'image-filter-duration': duration * .82, 'mock-fade-duration': duration * .47,
        'outline-fade-duration': duration * .64 })) host.style.setProperty(`--${key}`, `${Math.round(value)}ms`);
      image.tabIndex = 0; image.setAttribute('role', 'button'); image.setAttribute('aria-label', phrase('prep.openBoard'));
      syncMotion();
    },
    animate(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
      const animation = element.animate(frames, options);
      animations.add(animation);
      animation.finished.catch(() => {}).finally(() => animations.delete(animation));
      return animation;
    },
    destroy() {
      disposed = true;
      cancelAnimationFrame(frame); clearInterval(clock); observer.disconnect();
      lines.forEach(line => line.animations.forEach(animation => animation.cancel()));
      animations.forEach(animation => animation.cancel());
      document.removeEventListener('visibilitychange', syncMotion);
      reduced.removeEventListener('change', appearance); dark.removeEventListener('change', appearance);
      host.remove();
      // 뷰어에서는 ViewerRoot 의 커밋 안에서 걷힌다 — 그 커밋 중에는 다른 루트를 동기로 내릴 수 없다.
      queueMicrotask(() => root.unmount());
    },
  };
}
