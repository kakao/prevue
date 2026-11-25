import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

export type CardState = 'done' | 'loading' | 'failed';

export function usePeek() {
  const [s, setS] = useState<{ key: string | null; closing: boolean }>({ key: null, closing: false });
  const open = useCallback((key: string) => setS({ key, closing: false }), []);
  const close = useCallback(() => setS(p => (p.key ? { ...p, closing: true } : p)), []);
  const closed = useCallback(() => setS({ key: null, closing: false }), []);
  return { ...s, open, close, closed };
}

const orient = (e: { currentTarget: HTMLImageElement }) => {
  const i = e.currentTarget;
  (i.closest('.gcard-stack') as HTMLElement).dataset.o = i.naturalWidth < i.naturalHeight ? 'tall' : 'wide';
};

const Arrow = () => <svg viewBox="0 0 16 16" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;

const Stack = () => <svg viewBox="0 0 16 16" aria-hidden><path d="M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;

export const shortLabel = (fn: string, stem: string) => {
  let r = fn.startsWith(stem) ? fn.slice(stem.length) : fn;
  r = r.replace(/^Preview/, '').replace(/Preview$/, '').replace(/^_+|_+$/g, '');
  return r;
};

const measure = document.createElement('canvas').getContext('2d')!;
function middle(text: string, font: string, width: number) {
  measure.font = font;
  if (measure.measureText(text).width <= width) return text;
  let lo = 2, hi = text.length - 1;
  const snap = (i: number, dir: 1 | -1) => { for (let k = 0; k <= 4; k++) { const j = i + dir * k; if (j > 0 && j < text.length && /[A-Z._/]/.test(text[j])) return j; } return i; };
  const cut = (n: number) => { const head = snap(Math.ceil(n * .55), -1), tail = snap(text.length - (n - Math.ceil(n * .55)), 1); return `${text.slice(0, head)}…${text.slice(tail)}`; };
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (measure.measureText(cut(mid)).width <= width) lo = mid; else hi = mid - 1; }
  return cut(lo);
}

export function MidText({ text, className }: { text: string; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);
  useLayoutEffect(() => {
    const el = ref.current!;
    const fit = () => setShown(middle(text, getComputedStyle(el).font, el.clientWidth));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  return <span ref={ref} className={className} title={shown === text ? undefined : text}>{shown}</span>;
}

const Folder = () => <svg viewBox="0 0 16 16" aria-hidden><path d="M2 4.5V12.5h12V5.5H8L6.5 4H2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;

const Count = ({ n }: { n: number }) => <span className="gcard-count"><Stack />{n}</span>;

export type CardProps = {
  peekKey: string; file: string; info: string; pkg: string; mod: string; state: CardState; images: string[]; previews: string[];
  aspect: string; onPeek?: () => void;
};

export function GalleryCard(p: CardProps) {
  const total = p.state === 'done' ? p.images.length : p.previews.length;
  return (
    <article className="gcard" data-state={p.state} data-peek-key={p.peekKey} aria-busy={p.state === 'loading'}>
      <button className="gcard-hit" aria-haspopup="dialog" onClick={p.onPeek}>
        <span className="gcard-cover" style={{ aspectRatio: p.aspect }}>
          {p.state === 'failed'
            ? <span className="gcard-failed">그리지 못했어요</span>
            : <span className="gcard-deck">
                <span className="gcard-stack" data-o="tall">
                  {(total > 2 ? ['l', 'r'] : total > 1 ? ['r'] : []).map(g => { const src = p.state === 'done' ? p.images[g === 'r' ? 1 : 2] : undefined;
                    return <span key={g} className="gcard-ghost" data-g={g}>{src && <img src={src} alt="" loading="lazy" />}</span>; })}
                  <span className="gcard-shot">
                    {p.state === 'done' && p.images[0] ? <img src={p.images[0]} alt="" onLoad={orient} /> : <span className="gcard-ph" />}</span>
                </span>
              </span>}
          {p.state === 'done' && p.images.length > 1 && <Count n={p.images.length} />}
        </span>
        <span className="gcard-body">
          <MidText className="gcard-file" text={p.file} />
          <span className="gcard-pkgrow"><Folder /><MidText className="gcard-pkg" text={p.pkg} /></span>
          <span className="gcard-foot"><span className="gcard-mod">{p.mod}</span><span className="gcard-info">{p.info}</span></span>
        </span>
      </button>
    </article>
  );
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const ms = (name: string, fallback: number) => parseFloat(css(name)) || fallback;
const visible = (r: DOMRect) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0;
const box = (el: Element | null) => el?.getBoundingClientRect() ?? null;

// 카드 자리 → 시트 자리 한 방향의 키프레임만 만든다. 닫기는 같은 것을 거꾸로 돈다.
const morph = (from: DOMRect, to: DOMRect): Keyframe[] => [
  { transformOrigin: 'top left', transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})` },
  { transformOrigin: 'top left', transform: 'none' }];
const shift = (dx: number, dy: number): Keyframe[] => [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }];

function reveal(from: DOMRect, to: DOMRect): Keyframe[] {
  const sx = from.width / to.width, steps = 16;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps, sc = sx + (1 - sx) * t;
    const shown = from.height + (to.height - from.height) * t;
    const cut = Math.max(0, Math.min(100, (1 - shown / (to.height * sc)) * 100));
    return { offset: t, transformOrigin: 'top left', clipPath: `inset(0 0 ${cut}% 0)`,
      transform: `translate(${(from.left - to.left) * (1 - t)}px, ${(from.top - to.top) * (1 - t)}px) scale(${sc})` };
  });
}

type Step = { el: Element; kf: Keyframe[]; fade?: boolean; op?: [number, number, number, number] };

function plan(card: HTMLElement, sheet: HTMLElement): Step[] {
  const q = (sel: string) => sheet.querySelector(sel)!;
  const hit = box(card.querySelector('.gcard-hit'))!, cover = box(card.querySelector('.gcard-cover'))!;
  const sh = box(q('.gpeek-shell'))!, media = box(q('.gpeek-mediabg'))!;
  const steps: Step[] = [{ el: q('.gpeek-shell'), kf: morph(hit, sh) }, { el: q('.gpeek-mediabg'), kf: morph(cover, media) }];
  const shot0 = box(card.querySelector('.gcard-shot'));
  if (shot0) sheet.querySelectorAll('.gpeek-shot').forEach(t => steps.push({ el: t, kf: t.querySelector('img') ? reveal(shot0, box(t)!) : morph(shot0, box(t)!) }));
  const text = (a: string, b: string) => { const f = box(card.querySelector(b)), t = box(q(a)); return f && t ? [f.left - t.left, f.top - t.top] : [0, 0]; };
  const cross = (a: string, b: string) => {
    const t = q(a) as HTMLElement, f = card.querySelector<HTMLElement>(b);
    if (!f) return;
    const fr = box(f)!, tr = box(t)!;
    const ghost = f.cloneNode(true) as HTMLElement;
    ghost.classList.add('gpeek-ghost');
    Object.assign(ghost.style, { position: 'fixed', left: `${fr.left}px`, top: `${fr.top}px`, width: `${fr.width}px`, height: `${fr.height}px`, margin: '0', pointerEvents: 'none' });
    sheet.parentElement!.appendChild(ghost);
    const cutR = Math.max(0, tr.width - fr.width), cutB = Math.max(0, tr.height - fr.height);
    steps.push({ el: t, kf: [{ transform: `translate(${fr.left - tr.left}px, ${fr.top - tr.top}px)`, clipPath: `inset(0 ${cutR}px ${cutB}px 0)` },
      { transform: 'none', clipPath: 'inset(0 0 0 0)' }], op: [0, 1, .3, .8] });
    steps.push({ el: ghost, kf: [{ transform: 'none' }, { transform: `translate(${tr.left - fr.left}px, ${tr.top - fr.top}px)` }], op: [1, 0, 0, .5] });
  };
  sheet.parentElement!.querySelectorAll('.gpeek-ghost').forEach(g => g.remove());
  cross('.gpeek-file', '.gcard-file');
  sheet.querySelectorAll('.gpeek-cap').forEach(c => steps.push({ el: c, kf: [{}, {}], fade: true }));
  const cc = sheet.querySelector('.gcard-count'), fc = card.querySelector('.gcard-count');
  if (cc) steps.push(fc ? { el: cc, kf: shift(box(fc)!.left - box(cc)!.left, box(fc)!.top - box(cc)!.top) } : { el: cc, kf: [{}, {}], fade: true });
  const [ix, iy] = text('.gpeek-info', '.gcard-info');
  steps.push({ el: q('.gpeek-info'), kf: shift(ix, iy) });
  cross('.gpeek-pkgrow', '.gcard-pkgrow');
  const [mx, my] = text('.gpeek-mod', '.gcard-mod');
  steps.push({ el: q('.gpeek-mod'), kf: shift(mx, my) });
  steps.push({ el: q('.gpeek-go'), kf: shift(hit.right - sh.right, hit.bottom - sh.bottom), fade: true });
  return steps;
}

const backwards = (kf: Keyframe[]) => kf.slice().reverse().map((k, i, all) => ({ ...k, offset: k.offset == null ? (all.length === 1 ? 1 : i / (all.length - 1)) : 1 - (k.offset as number) }));

export type PeekProps = { peekKey: string; closing: boolean; file: string; info: string; pkg: string; mod: string; state: CardState; images: string[]; previews: string[]; labels: string[];
  onClose: () => void; onClosed: () => void; onOpen: () => void };

export function GalleryPeek(p: PeekProps) {
  const total = p.state === 'done' ? p.images.length : p.previews.length;
  const n = Math.max(1, Math.min(3, total || 1));
  const sheet = useRef<HTMLElement>(null);
  const [place, setPlace] = useState<CSSProperties & { '--stage-h'?: string }>({ visibility: 'hidden' });
  const card = () => document.querySelector<HTMLElement>(`[data-peek-key="${CSS.escape(p.peekKey)}"]`);

  useLayoutEffect(() => {
    const root = document.documentElement, body = document.body;
    const keep = [root.style.overflow, body.style.overflow, root.style.scrollbarGutter];
    root.style.scrollbarGutter = 'stable';
    root.style.overflow = body.style.overflow = 'hidden';
    const c = card(), r = c?.getBoundingClientRect(), el = sheet.current!;
    const w = Math.min(640, Math.max(420, (r?.width ?? 380) * 1.5), innerWidth - 32);
    el.style.width = `${w}px`;
    el.style.setProperty('--stage-h', `${Math.round(w * 10 / 16 - 40)}px`);
    const h = el.offsetHeight;
    const cx = r ? r.left + r.width / 2 : innerWidth / 2, cy = r ? r.top + r.height / 2 : innerHeight / 2;
    setPlace({ width: w, left: Math.min(Math.max(16, cx - w / 2), innerWidth - w - 16), top: Math.min(Math.max(16, cy - h / 2), innerHeight - h - 16),
      '--stage-h': `${Math.round(w * 10 / 16 - 40)}px` });
    return () => { root.style.overflow = keep[0]; body.style.overflow = keep[1]; root.style.scrollbarGutter = keep[2]; if (c) c.style.visibility = ''; };
  }, []);

  useLayoutEffect(() => {
    if (place.visibility === 'hidden') return;
    const c = card(), el = sheet.current!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = ms('--duration-long3', 550), ease = css('--easing-spring') || 'ease-out', fade = ms('--duration-medium2', 300);
    let live = true;
    el.style.visibility = 'hidden';
    Promise.all([...el.querySelectorAll('img')].map(i => i.decode().catch(() => undefined))).then(() => {
      if (!live) return;
      const imgs = [...el.querySelectorAll<HTMLImageElement>('.gpeek-shot img')];
      const wide = imgs.length > 0 && imgs.every(i => i.naturalWidth > i.naturalHeight * 1.2);
      const stage = el.querySelector('.gpeek-stage') as HTMLElement;
      stage.dataset.flow = wide ? 'col' : 'row';
      stage.style.setProperty('--k', String(Math.max(1, imgs.length)));
      el.style.visibility = '';
      el.parentElement!.querySelector('.gpeek-scrim')!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade });
      if (!c || reduce || !visible(c.getBoundingClientRect())) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade }); return; }
      const runs: Animation[] = [];
      for (const s of plan(c, el)) {
        runs.push(s.el.animate(s.kf, { duration: dur, easing: ease }));
        if (s.fade) s.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade, delay: dur * .35, fill: 'backwards' });
        if (s.op) runs.push(s.el.animate([{ opacity: s.op[0] }, { opacity: s.op[1] }], { delay: dur * s.op[2], duration: dur * (s.op[3] - s.op[2]), fill: 'both' }));
      }
      Promise.all(runs.map(a => a.finished)).then(() => {
        el.parentElement?.querySelectorAll('.gpeek-ghost').forEach(g => g.remove());
        el.getAnimations({ subtree: true }).forEach(a => { if ((a.effect as KeyframeEffect | null)?.getKeyframes().some(k => 'opacity' in k)) a.cancel(); });
      }).catch(() => undefined);
      c.style.visibility = 'hidden';
    });
    return () => { live = false; };
  }, [place.visibility]);

  useLayoutEffect(() => {
    if (!p.closing) return;
    const c = card(), el = sheet.current!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = ms('--duration-long1', 450), ease = css('--easing-standard') || 'ease', quick = ms('--duration-short2', 100);
    el.parentElement!.getAnimations({ subtree: true }).forEach(a => a.cancel());
    el.classList.add('closing');
    const runs: Animation[] = [el.parentElement!.querySelector('.gpeek-scrim')!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: ease, fill: 'forwards' })];
    if (c && !reduce && visible(c.getBoundingClientRect())) {
      for (const s of plan(c, el)) {
        runs.push(s.el.animate(backwards(s.kf), { duration: dur, easing: ease, fill: 'forwards' }));
        if (s.fade) runs.push(s.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: quick, fill: 'forwards' }));
        if (s.op) runs.push(s.el.animate([{ opacity: s.op[1] }, { opacity: s.op[0] }], { delay: dur * (1 - s.op[3]), duration: dur * (s.op[3] - s.op[2]), fill: 'both' }));
      }
    } else {
      runs.push(el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `scale(${reduce ? 1 : .96})` }], { duration: ms('--duration-short4', 200), easing: ease, fill: 'forwards' }));
    }
    Promise.all(runs.map(a => a.finished)).then(() => { el.parentElement!.style.visibility = 'hidden'; if (c) c.style.visibility = ''; p.onClosed(); });
  }, [p.closing]);

  return (
    <div className="gpeek-layer">
      <div className="gpeek-scrim" onClick={p.onClose} />
      <section ref={sheet} className="gpeek" role="dialog" aria-label={p.file} data-cap={p.labels.some(Boolean) || undefined} style={place as CSSProperties}>
        <span className="gpeek-shell" />
        <span className="gpeek-mediabg" />
        <div className="gpeek-stage">
          {p.state === 'failed' ? <span className="gcard-failed">그리지 못했어요</span>
            : Array.from({ length: n }, (_, i) => <span key={i} className="gpeek-fig" style={{ zIndex: n - i }}>
                <span className="gpeek-shot">{p.state === 'done' && p.images[i] ? <img src={p.images[i]} alt="" /> : <span className="gcard-ph" />}</span>
                {p.labels[i] && <span className="gpeek-cap">{p.labels[i]}</span>}</span>)}
          {p.state === 'done' && p.images.length > 1 && <Count n={p.images.length} />}
        </div>
        <div className="gpeek-body">
          <span className="gpeek-head"><span className="gpeek-file">{p.file}</span></span>
          <span className="gpeek-pkgrow"><Folder /><span className="gpeek-pkg">{p.pkg}</span></span>
          <span className="gpeek-foot"><span className="gpeek-meta"><span className="gpeek-mod">{p.mod}</span><span className="gpeek-info">{p.info}</span></span>
            <button className="gpeek-go" autoFocus onClick={p.onOpen}><span>보드에서 보기</span><Arrow /></button></span>
        </div>
      </section>
    </div>
  );
}
