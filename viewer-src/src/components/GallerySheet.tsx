import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { fetchGallerySheet, type GallerySheetAnswer } from '../runtime/api';
import { motionMs, motionToken, reduced } from '../runtime/motion';
import { useMessages } from '../messages';
import type { PreviewFile } from '../match';
import { stemOf } from '../gallery/cards';
import type { CardView } from '../gallery/queue';
import type { CardText } from './Gallery';

export const SHEET_MAX = 3;
const SCALE = 1.5, MIN_W = 420, MAX_W = 640, EDGE = 16, STAGE_RATIO = 10 / 16, STAGE_INSET = 40, WIDE = 1.2;

export function shortLabel(name: string, stem: string) {
  const r = name.startsWith(stem) ? name.slice(stem.length) : name;
  return r.replace(/^Preview/, '').replace(/Preview$/, '').replace(/^_+|_+$/g, '');
}

type Shot = { url: string; w: number; h: number } | 'failed' | null;

export function sheetSlots(view: CardView, f: Pick<PreviewFile, 'rel' | 'functions'>, answer: GallerySheetAnswer | null) {
  const total = view.status === 'done' || view.status === 'error' ? view.sheets : f.functions.length;
  const n = Math.min(SHEET_MAX, Math.max(1, total, answer?.sheets.length ?? 0));
  const stem = stemOf(f);
  return Array.from({ length: n }, (_, i): { shot: Shot; label: string } => {
    const a = answer?.sheets[i];
    const shot: Shot = i === 0 && view.status === 'done' ? view.image
      : a?.image ?? (answer || (i === 0 && view.status === 'error') ? 'failed' : null);
    const label = a ? a.variant ?? shortLabel(a.name, stem) : answer ? '' : shortLabel(f.functions[i] ?? '', stem);
    return { shot, label };
  });
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
  const shot = box(card.querySelector('.gcard-shot'));
  if (shot) sheet.querySelectorAll('.gsheet-shot').forEach(t => steps.push({ el: t, kf: t.querySelector('img') ? reveal(shot, box(t)!) : morph(shot, box(t)!) }));
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

const dropGhosts = (sheet: HTMLElement) => sheet.parentElement?.querySelectorAll('.gsheet-ghost').forEach(g => g.remove());
const backwards = (kf: Keyframe[]) => kf.slice().reverse().map((k, i, all) => ({ ...k, offset: k.offset == null ? (all.length === 1 ? 1 : i / (all.length - 1)) : 1 - (k.offset as number) }));
const cardOf = (path: string) => document.querySelector<HTMLElement>(`#galleryView .gcard-slot[data-path="${CSS.escape(path)}"] .gcard`);

export function GallerySheet({ file, text, view, closing, onClose, onClosed, onOpen }: {
  file: PreviewFile; text: CardText; view: CardView; closing: boolean; onClose(): void; onClosed(): void; onOpen(): void;
}) {
  const { phrase } = useMessages();
  const sheet = useRef<HTMLElement>(null);
  const [answer, setAnswer] = useState<GallerySheetAnswer | null>(null);
  const [place, setPlace] = useState<CSSProperties | null>(null);
  const slots = sheetSlots(view, file, answer);
  const known = slots.map(s => (s.shot && s.shot !== 'failed' ? s.shot : view.status === 'done' ? view.image : null));
  const flow = known.every(s => s && s.w > s.h * WIDE) ? 'col' : 'row';
  const count = view.status === 'done' ? view.sheets : 0;
  const latest = useRef({ onClosed });
  latest.current = { onClosed };

  useEffect(() => {
    let live = true;
    fetchGallerySheet(file.path).then(a => a ?? { sheets: [] }, () => ({ sheets: [] })).then(a => { if (live) setAnswer(a); });
    return () => { live = false; };
  }, [file.path]);

  useLayoutEffect(() => {
    const root = document.documentElement, body = document.body;
    const keep = [root.style.overflow, body.style.overflow, root.style.scrollbarGutter];
    root.style.scrollbarGutter = 'stable';
    root.style.overflow = body.style.overflow = 'hidden';
    const grid = document.querySelector<HTMLElement>('#galleryView .gallery-in');
    grid?.setAttribute('inert', '');
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
      grid?.removeAttribute('inert');
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
      el.getAnimations({ subtree: true }).forEach(a => { if ((a.effect as KeyframeEffect | null)?.getKeyframes().some(k => 'opacity' in k)) a.cancel(); });
    }).catch(() => undefined);
  }, [place]);

  useLayoutEffect(() => {
    if (!closing) return;
    const c = cardOf(file.path), el = sheet.current!;
    let live = true;
    const finish = () => {
      if (!live) return;
      el.parentElement!.style.visibility = 'hidden';
      document.querySelector('#galleryView .gallery-in')?.removeAttribute('inert');
      if (c) { c.style.visibility = ''; c.querySelector<HTMLElement>('.gcard-hit')?.focus({ preventScroll: true }); }
      latest.current.onClosed();
    };
    const dur = motionMs('--duration-long1'), ease = motionToken('--easing-standard'), quick = motionMs('--duration-short2');
    el.parentElement!.getAnimations({ subtree: true }).forEach(a => a.cancel());
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
      style={place ?? { visibility: 'hidden' }}>
      <span className="gsheet-shell" />
      <span className="gsheet-mediabg" />
      <div className="gsheet-stage" data-flow={flow} style={{ ['--k' as string]: slots.length }}>
        {slots.map((s, i) => <span key={i} className="gsheet-fig" style={{ zIndex: slots.length - i }}>
          <span className="gsheet-shot" data-state={s.shot === 'failed' ? 'failed' : s.shot ? 'done' : 'loading'}>
            {s.shot === 'failed' ? <span className="gsheet-failed">{phrase('gallery.failed')}</span>
              : s.shot ? <img src={s.shot.url} width={s.shot.w} height={s.shot.h} alt="" />
              : <span className="gcard-ph" />}</span>
          {s.label && <span className="gsheet-cap">{s.label}</span>}</span>)}
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
