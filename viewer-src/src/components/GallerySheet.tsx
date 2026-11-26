import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { motionMs, motionToken, reduced } from '../runtime/motion';
import { useMessages } from '../messages';
import type { PreviewFile } from '../match';
import { stale, stemOf } from '../gallery/cards';
import type { CardImage, CardView } from '../gallery/queue';
import type { CardText } from './Gallery';
import { Veil } from './Veil';

const SCALE = 1.5, MIN_W = 420, MAX_W = 640, EDGE = 16, STAGE_RATIO = 10 / 16, STAGE_INSET = 40, WIDE = 1.2;

function shortLabel(name: string, stem: string) {
  const r = name.startsWith(stem) ? name.slice(stem.length) : name;
  return r.replace(/^Preview/, '').replace(/Preview$/, '').replace(/^_+|_+$/g, '');
}

function sheetSlots(view: CardView, f: Pick<PreviewFile, 'rel'>): Array<{ shot: CardImage; label: string }> {
  const stem = stemOf(f);
  return view.status === 'done' ? view.front.map(s => ({ shot: s.image, label: s.variant ?? shortLabel(s.name, stem) })) : [];
}

const Arrow = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Folder = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5V12.5h12V5.5H8L6.5 4H2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
const Stack = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;

const onScreen = (r: DOMRect) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0;
const box = (el: Element | null) => el?.getBoundingClientRect() ?? null;

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
  const shell = box(q('.gsheet-shell'))!, media = box(q('.gsheet-mediabg'))!;
  const steps: Step[] = [{ el: q('.gsheet-shell'), kf: morph(hit, shell) }, { el: q('.gsheet-mediabg'), kf: morph(cover, media) }];
  sheet.querySelectorAll('.gsheet-failed, .gsheet-veil').forEach(t => steps.push({ el: t, kf: morph(cover, box(t)!) }));
  const shot = box(card.querySelector('.gcard-shot'));
  if (shot) sheet.querySelectorAll('.gsheet-shot').forEach(t => steps.push({ el: t, kf: reveal(shot, box(t)!) }));
  const offset = (a: string, b: string) => { const f = box(card.querySelector(b)), t = box(q(a)); return f && t ? [f.left - t.left, f.top - t.top] : [0, 0]; };
  const cross = (a: string, b: string) => {
    const t = q(a) as HTMLElement, f = card.querySelector<HTMLElement>(b);
    if (!f) return;
    const fr = box(f)!, tr = box(t)!;
    const ghost = f.cloneNode(true) as HTMLElement;
    ghost.classList.add('gsheet-ghost');
    Object.assign(ghost.style, { position: 'fixed', left: `${fr.left}px`, top: `${fr.top}px`, width: `${fr.width}px`, height: `${fr.height}px`, margin: '0', pointerEvents: 'none' });
    sheet.parentElement!.appendChild(ghost);
    const cutR = Math.max(0, tr.width - fr.width), cutB = Math.max(0, tr.height - fr.height);
    steps.push({ el: t, kf: [{ transform: `translate(${fr.left - tr.left}px, ${fr.top - tr.top}px)`, clipPath: `inset(0 ${cutR}px ${cutB}px 0)` },
      { transform: 'none', clipPath: 'inset(0 0 0 0)' }], op: [0, 1, .3, .8] });
    steps.push({ el: ghost, kf: [{ transform: 'none' }, { transform: `translate(${tr.left - fr.left}px, ${tr.top - fr.top}px)` }], op: [1, 0, 0, .5] });
  };
  dropGhosts(sheet);
  cross('.gsheet-file', '.gcard-file');
  sheet.querySelectorAll('.gsheet-cap').forEach(c => steps.push({ el: c, kf: [{}, {}], fade: true }));
  const to = sheet.querySelector('.gcard-count'), from = card.querySelector('.gcard-count');
  if (to) steps.push(from ? { el: to, kf: shift(box(from)!.left - box(to)!.left, box(from)!.top - box(to)!.top) } : { el: to, kf: [{}, {}], fade: true });
  const [ix, iy] = offset('.gsheet-info', '.gcard-info');
  steps.push({ el: q('.gsheet-info'), kf: shift(ix, iy) });
  cross('.gsheet-pkgrow', '.gcard-pkgrow');
  const mod = sheet.querySelector('.gsheet-mod');
  if (mod) { const [mx, my] = offset('.gsheet-mod', '.gcard-mod'); steps.push({ el: mod, kf: shift(mx, my) }); }
  steps.push({ el: q('.gsheet-go'), kf: shift(hit.right - shell.right, hit.bottom - shell.bottom), fade: true });
  return steps;
}

const scripted = (el: Element) => el.getAnimations({ subtree: true }).filter(a => !(a instanceof CSSAnimation || a instanceof CSSTransition));
const dropGhosts = (sheet: HTMLElement) => sheet.parentElement?.querySelectorAll('.gsheet-ghost').forEach(g => g.remove());
const backwards = (kf: Keyframe[]) => kf.slice().reverse().map((k, i, all) => ({ ...k, offset: k.offset == null ? (all.length === 1 ? 1 : i / (all.length - 1)) : 1 - (k.offset as number) }));
function shutOutside(layer: HTMLElement) {
  const shut: Element[] = [];
  for (let at: HTMLElement | null = layer; at && at !== document.body; at = at.parentElement) {
    for (const e of at.parentElement?.children ?? []) {
      if (e === at || e.hasAttribute('inert') || e.tagName === 'SCRIPT') continue;
      e.setAttribute('inert', '');
      e.setAttribute('data-sheet-inert', '');
      shut.push(e);
    }
  }
  return shut;
}

function cycleFocus(e: KeyboardEvent<HTMLElement>) {
  if (e.key !== 'Tab') return;
  const stops = [...e.currentTarget.querySelectorAll<HTMLElement>('button')];
  const at = stops.indexOf(document.activeElement as HTMLElement);
  const next = stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length];
  if (!next) return;
  e.preventDefault();
  next.focus();
}

const cardOf = (path: string) => document.querySelector<HTMLElement>(`#galleryView .gcard-slot[data-path="${CSS.escape(path)}"] .gcard`);

export function GallerySheet({ file, text, view, closing, onClose, onClosed, onOpen }: {
  file: PreviewFile; text: CardText; view: CardView; closing: boolean; onClose(): void; onClosed(): void; onOpen(): void;
}) {
  const { phrase } = useMessages();
  const sheet = useRef<HTMLElement>(null);
  const [place, setPlace] = useState<CSSProperties | null>(null);
  const slots = sheetSlots(view, file);
  const flow = slots.length && slots.every(s => s.shot.w > s.shot.h * WIDE) ? 'col' : 'row';
  const [drawn, setDrawn] = useState(view.status === 'done');
  const ready = view.status === 'error' || (view.status === 'done' && drawn);
  const count = view.status === 'done' ? view.sheets : 0;

  useLayoutEffect(() => {
    const root = document.documentElement, body = document.body;
    const keep = [root.style.overflow, body.style.overflow, root.style.scrollbarGutter];
    root.style.scrollbarGutter = 'stable';
    root.style.overflow = body.style.overflow = 'hidden';
    const shut = shutOutside(sheet.current!.parentElement!);
    const c = cardOf(file.path), r = c?.getBoundingClientRect(), el = sheet.current!;
    const w = Math.min(MAX_W, Math.max(MIN_W, (r?.width ?? MIN_W) * SCALE), innerWidth - EDGE * 2);
    const stage = `${Math.round(w * STAGE_RATIO - STAGE_INSET)}px`;
    el.style.width = `${w}px`;
    el.style.setProperty('--stage-h', stage);
    const h = el.offsetHeight;
    const cx = r ? r.left + r.width / 2 : innerWidth / 2, cy = r ? r.top + r.height / 2 : innerHeight / 2;
    setPlace({ width: w, left: Math.min(Math.max(EDGE, cx - w / 2), innerWidth - w - EDGE), top: Math.max(EDGE, Math.min(cy - h / 2, innerHeight - h - EDGE)),
      ['--stage-h' as string]: stage });
    return () => {
      root.style.overflow = keep[0]; body.style.overflow = keep[1]; root.style.scrollbarGutter = keep[2];
      shut.forEach(e => { e.removeAttribute('inert'); e.removeAttribute('data-sheet-inert'); });
      const card = cardOf(file.path);
      if (card) card.style.visibility = '';
      if (sheet.current) dropGhosts(sheet.current);
    };
  }, []);

  useLayoutEffect(() => {
    if (!place) return;
    const c = cardOf(file.path), el = sheet.current!;
    const dur = motionMs('--duration-long3'), ease = motionToken('--easing-spring'), fade = motionMs('--duration-medium2');
    el.parentElement!.querySelector('.gsheet-scrim')!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade });
    el.querySelector<HTMLElement>('.gsheet-go')?.focus({ preventScroll: true });
    if (!c || reduced.matches || !onScreen(c.getBoundingClientRect())) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade }); return; }
    const runs: Animation[] = [];
    for (const s of plan(c, el)) {
      runs.push(s.el.animate(s.kf, { duration: dur, easing: ease }));
      if (s.fade) s.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade, delay: dur * .35, fill: 'backwards' });
      if (s.op) runs.push(s.el.animate([{ opacity: s.op[0] }, { opacity: s.op[1] }], { delay: dur * s.op[2], duration: dur * (s.op[3] - s.op[2]), fill: 'both' }));
    }
    c.style.visibility = 'hidden';
    Promise.all(runs.map(a => a.finished)).then(() => {
      dropGhosts(el);
      scripted(el).forEach(a => { if ((a.effect as KeyframeEffect | null)?.getKeyframes().some(k => 'opacity' in k)) a.cancel(); });
    }).catch(() => undefined);
  }, [place]);

  useLayoutEffect(() => {
    if (!closing) return;
    const c = cardOf(file.path), el = sheet.current!;
    let live = true;
    const finish = () => {
      if (!live) return;
      el.parentElement!.style.visibility = 'hidden';
      document.querySelectorAll('[data-sheet-inert]').forEach(e => { e.removeAttribute('inert'); e.removeAttribute('data-sheet-inert'); });
      if (c) { c.style.visibility = ''; c.querySelector<HTMLElement>('.gcard-hit')?.focus({ preventScroll: true }); }
      onClosed();
    };
    const dur = motionMs('--duration-long1'), ease = motionToken('--easing-standard'), quick = motionMs('--duration-short2');
    scripted(el.parentElement!).forEach(a => a.cancel());
    if (el.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
    dropGhosts(el);
    el.classList.add('closing');
    const runs: Animation[] = [el.parentElement!.querySelector('.gsheet-scrim')!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur, easing: ease, fill: 'forwards' })];
    if (c && !reduced.matches && onScreen(c.getBoundingClientRect())) {
      for (const s of plan(c, el)) {
        runs.push(s.el.animate(backwards(s.kf), { duration: dur, easing: ease, fill: 'forwards' }));
        if (s.fade) runs.push(s.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: quick, fill: 'forwards' }));
        if (s.op) runs.push(s.el.animate([{ opacity: s.op[1] }, { opacity: s.op[0] }], { delay: dur * (1 - s.op[3]), duration: dur * (s.op[3] - s.op[2]), fill: 'both' }));
      }
    } else {
      runs.push(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: motionMs('--duration-short4'), easing: ease, fill: 'forwards' }));
    }
    Promise.all(runs.map(a => a.finished)).then(finish).catch(() => undefined);
    return () => { live = false; };
  }, [closing]);

  return <div className="gsheet-layer">
    <div className="gsheet-scrim" onClick={onClose} />
    <section ref={sheet} className="gsheet" role="dialog" aria-modal="true" aria-label={text.name} data-cap={slots.some(s => s.label) || undefined}
      style={place ?? { visibility: 'hidden' }} onKeyDown={cycleFocus}>
      <span className="gsheet-shell" />
      <span className="gsheet-mediabg" />
      {view.status === 'error' && <span className="gsheet-failed">{phrase('gallery.failed')}</span>}
      <Veil className="gsheet-veil" ready={ready} />
      <div className="gsheet-stage" data-flow={flow} style={{ ['--k' as string]: slots.length }}>
        {slots.map((s, i) => { const old = stale(file, s.shot); return <span key={i} className="gsheet-fig" data-stale={old || undefined} style={{ zIndex: slots.length - i }}>
          <span className="gsheet-shot">
            {old && <span className="gsheet-old" title={phrase('gallery.stale.why')}>{phrase('gallery.stale')}</span>}
            <img src={s.shot.url} width={s.shot.w} height={s.shot.h} alt="" onLoad={i ? undefined : () => setDrawn(true)} onError={i ? undefined : () => setDrawn(true)} /></span>
          {s.label && <span className="gsheet-cap">{s.label}</span>}</span>; })}
        {count > 1 && <span className="gcard-count" aria-label={phrase('board.count', { n: count })}><Stack />{count}</span>}
      </div>
      <div className="gsheet-body">
        <span className="gsheet-file">{text.name}</span>
        <span className="gsheet-pkgrow"><Folder /><span className="gsheet-pkg">{text.pkg}</span></span>
        <span className="gsheet-foot"><span className="gsheet-meta">{text.mod && <span className="gsheet-mod">{text.mod}</span>}<span className="gsheet-info">{text.changed}</span></span>
          <button className="gsheet-go" type="button" onClick={onOpen}><span>{phrase('gallery.sheet.open')}</span><Arrow /></button></span>
      </div>
      <button className="gsheet-close" type="button" onClick={onClose}>{phrase('gallery.sheet.close')}</button>
    </section>
  </div>;
}
