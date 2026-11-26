import { Fragment, useLayoutEffect, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { DEVICES, DEVICE_MENU } from '../runtime/devices';
import { useHost } from '../host';
import { useMessages } from '../messages';
import { DP_MAX, DP_MIN, itemName, silhouette, slAt, stepOf, type Axis, type DockView, type SceneDock } from '../runtime/resize-scene';
import { menuHost, postureHost, slidersHost } from './WorkspaceShell';

const useDock = <K extends keyof DockView>(dock: SceneDock, key: K) => useSyncExternalStore(dock.view.subscribe, () => dock.view.get()[key]);

const icon = (d: ReactNode) => <svg className="tb-ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const ROTATE = icon(<g className="turn"><rect x="6.5" y="3" width="7" height="14" rx="1.6" /><circle cx="10" cy="5.8" r=".6" fill="currentColor" /></g>);
const FOLD = icon(<g className="fold-ic"><path d="M10 3.5v13" /><path d="M3 10h4.5M5.5 7.8 7.7 10l-2.2 2.2M17 10h-4.5M14.5 7.8 12.3 10l2.2 2.2" /></g>);
const UNFOLD = icon(<g className="unfold-ic"><path d="M10 3.5v13" /><path d="M7.5 10H3M5.2 7.8 3 10l2.2 2.2M12.5 10H17M14.8 7.8 17 10l-2.2 2.2" /></g>);
const HINGE = icon(<><rect x="3.5" y="4" width="13" height="12" rx="1.5" /><path d="M10 4v12" strokeDasharray="1.6 1.6" /></>);
const CHEVRON = <svg className="tb-chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m4.5 6.5 3.5 3.5 3.5-3.5" /></svg>;
const Silhouette = ({ dev }: { dev: string }) => <svg className="pn-sil" viewBox="0 0 20 20" aria-hidden="true" dangerouslySetInnerHTML={{ __html: silhouette(DEVICES[dev]) }} />;
const ORIENTATIONS = ['portrait', 'landscape-left', 'landscape-right'];

function cycle(e: KeyboardEvent, list: HTMLElement[], at: number) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return -1;
  e.preventDefault(); e.stopPropagation();
  return e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (at + (e.key === 'ArrowUp' ? -1 : 1) + list.length) % list.length;
}

export function SizePicker({ dock }: { dock: SceneDock }) {
  const { phrase } = useMessages();
  const checked = useDock(dock, 'checked'), rows = useDock(dock, 'rows'), locked = useDock(dock, 'locked');
  const list = useRef<HTMLDivElement>(null);
  const choose = (sel: string, byKey = false) => {
    dock.pick(sel, byKey);
    const thumb = document.activeElement;
    if (thumb instanceof HTMLElement && thumb.matches('#pnSl [role="slider"]')) thumb.blur();
  };
  const row = (sel: string, tip?: string, mono = false) => {
    const d = DEVICES[sel];
    return <button className={mono ? 'pn-it mono' : 'pn-it'} type="button" role="radio" data-sel={sel} key={sel} aria-checked={sel === checked}
      title={d ? d.name : tip && phrase(tip)} disabled={locked} onClick={() => { choose(sel); dock.setMenu(false); }}>
      {d && <Silhouette dev={sel} />}<span className="nm">{itemName(sel)}</span><span className="d">{rows[sel] ?? ''}</span>
    </button>;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const all = [...list.current!.querySelectorAll<HTMLElement>('[data-sel]')], at = all.indexOf(e.target as HTMLElement);
    if (at < 0) return;
    const next = cycle(e, all, at);
    if (next < 0) return;
    all[next].focus(); choose(all[next].dataset.sel!, true);
  };
  return <div className="pn-pick" id="pnPick" role="radiogroup" aria-label={phrase('panel.pick')} ref={list} onKeyDown={onKeyDown} onPointerDown={dock.cancelRuler}>
    <section className="pn-sec"><h4 className="pn-h">{phrase('panel.size')}</h4>
      <div className="pn-list">
        {row('original', 'size.original.tip', true)}
        {row('narrow', 'size.narrow.tip')}
        {row('foldable', 'size.foldable.tip')}
        {row('custom', 'size.custom.tip')}
      </div>
    </section>
    <section className="pn-sec"><h4 className="pn-h">{phrase('panel.device')}</h4>
      <div className="pn-list">
        {DEVICE_MENU.map(({ group, ids }) => <Fragment key={group}>
          <h5 className="pn-g">{group}</h5>
          {ids.map(sel => row(sel))}
        </Fragment>)}
      </div>
    </section>
  </div>;
}

export function DeviceMenu({ dock, host }: { dock: SceneDock; host?: HTMLElement }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const menu = useDock(dock, 'menu'), locked = useDock(dock, 'locked');
  const checked = useDock(dock, 'checked'), sumTitle = useDock(dock, 'sumTitle');
  const sum = useRef<HTMLButtonElement>(null), body = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    element?.classList.toggle('open', menu);
    if (!menu && body.current?.contains(document.activeElement)) sum.current?.focus({ preventScroll: true });
  }, [element, menu]);
  return place(<>
    <button className={checked === 'original' ? 'tb-btn pn-sum mono' : 'tb-btn pn-sum'} id="pnSum" type="button" aria-haspopup="true" aria-expanded={menu} aria-controls="pnBody"
      title={sumTitle || phrase('panel.pick')} disabled={locked} ref={sum} onClick={() => dock.setMenu(!menu)}>
      <span className="pn-sum-sil">{DEVICES[checked] && <Silhouette dev={checked} />}</span><span className="nm">{checked && itemName(checked)}</span>{CHEVRON}
    </button>
    <div className="pn-body" id="pnBody" inert={!menu} ref={body}><SizePicker dock={dock} /></div>
  </>, menuHost);
}

export function DevicePosture({ dock, host }: { dock: SceneDock; host?: HTMLElement }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const posture = useDock(dock, 'posture'), locked = useDock(dock, 'locked'), open = useDock(dock, 'orientMenu');
  const foldable = useDock(dock, 'foldable'), folded = useDock(dock, 'folded'), fixed = useDock(dock, 'orientFixed'), orientation = useDock(dock, 'orientation'), hinge = useDock(dock, 'hinge');
  const rot = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (element) element.hidden = !posture; }, [element, posture]);
  useLayoutEffect(() => {
    const items = [...menu.current?.querySelectorAll<HTMLElement>('[data-orientation]') ?? []];
    if (open) (items.find(b => b.getAttribute('aria-checked') === 'true') ?? items[0])?.focus();
    else if (menu.current?.contains(document.activeElement)) rot.current?.focus({ preventScroll: true });
  }, [open]);
  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') { dock.setOrientMenu(false); return; }
    const items = [...menu.current!.querySelectorAll<HTMLElement>('[data-orientation]')];
    const next = cycle(e, items, items.indexOf(document.activeElement as HTMLElement));
    if (next >= 0) items[next].focus();
  };
  const turn = phrase('posture.orientation.tip', { orientation: phrase(`posture.${orientation}`) });
  const foldName = phrase(folded ? 'posture.unfold' : 'posture.fold');
  return place(<>
    <div className="orientation-pick" id="dcOrientation" hidden={fixed}>
      <button className="tb-btn" id="dcRot" type="button" data-orientation={orientation} aria-haspopup="menu" aria-expanded={open} aria-controls="dcOrientMenu"
        title={turn} aria-label={turn} disabled={locked} ref={rot} onClick={() => dock.setOrientMenu(!open)}
        onKeyDown={e => { if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; e.preventDefault(); e.stopPropagation(); dock.setOrientMenu(true); }}>{ROTATE}{CHEVRON}</button>
      <div className={open ? 'zoom-menu on' : 'zoom-menu'} id="dcOrientMenu" role="menu" aria-label={phrase('posture.orientation')} inert={!open} ref={menu} onKeyDown={onMenuKey}>
        {ORIENTATIONS.map(value => <button key={value} type="button" role="menuitemradio" tabIndex={-1} aria-checked={value === orientation} data-orientation={value} disabled={locked}
          onClick={() => dock.orient(value)}>{phrase(`posture.${value}`)}</button>)}
      </div>
    </div>
    <button className="tb-btn" id="dcFold" type="button" data-folded={folded} title={foldName} aria-label={foldName} hidden={!foldable} disabled={locked} onClick={dock.fold}>{FOLD}{UNFOLD}</button>
    <button className="tb-btn" id="dcHinge" type="button" aria-pressed={hinge} title={phrase(hinge ? 'posture.hinge.hide' : 'posture.hinge.show')} aria-label={phrase('posture.hinge')}
      hidden={!foldable} disabled={locked} onClick={dock.hinge}>{HINGE}</button>
  </>, postureHost);
}

const KEYS: Record<string, (v: number, step: number) => number> = {
  ArrowRight: (v, s) => v + s, ArrowUp: (v, s) => v + s, ArrowLeft: (v, s) => v - s, ArrowDown: (v, s) => v - s, Home: () => DP_MIN, End: () => DP_MAX,
};

function Slider({ dock, axis, label, ticks }: { dock: SceneDock; axis: Axis; label: string; ticks: number[] }) {
  const { phrase } = useMessages();
  const v = useDock(dock, axis === 'w' ? 'slW' : 'slH'), locked = useDock(dock, 'locked');
  const thumb = useRef<HTMLSpanElement>(null);
  const id = axis === 'w' ? 'slWLb' : 'slHLb', at = slAt(v);
  const valueAt = (track: HTMLElement, x: number) => { const r = track.getBoundingClientRect(); return DP_MIN + Math.min(1, Math.max(0, (x - r.left) / r.width)) * (DP_MAX - DP_MIN); };
  return <div className="sl" data-axis={axis}>
    <div className="sl-h"><span id={id}>{phrase(label)}</span><span className="v"><b>{v}</b><small>dp</small></span></div>
    <div className="sl-track"
      onPointerDown={e => {
        if (e.button !== 0 || locked) return;
        e.preventDefault(); thumb.current!.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
        e.currentTarget.setPointerCapture(e.pointerId); dock.grab(axis, valueAt(e.currentTarget, e.clientX));
      }}
      onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) dock.drag(axis, valueAt(e.currentTarget, e.clientX)); }}
      onPointerUp={() => dock.release(axis)} onLostPointerCapture={() => dock.release(axis)}>
      <span className="fill" style={{ width: at }} />
      {ticks.map(t => <span className="tick" data-v={t} key={t} style={{ left: slAt(t) }}><i /><em>{t}</em></span>)}
      <span className="thumb" role="slider" tabIndex={locked ? -1 : 0} aria-labelledby={id} aria-valuemin={DP_MIN} aria-valuemax={DP_MAX} aria-valuenow={v} aria-valuetext={`${v}dp`}
        aria-disabled={locked} style={{ left: at }} ref={thumb}
        onKeyDown={e => {
          const next = KEYS[e.key]?.(v, stepOf(e.nativeEvent));
          if (next === undefined || locked) return;
          e.preventDefault(); e.stopPropagation(); dock.step(axis, next);
        }}
        onFocus={() => dock.sliderFocus(true)}
        onBlur={e => { if (!(e.relatedTarget instanceof Element && e.relatedTarget.matches('#pnSl [role="slider"]'))) dock.sliderFocus(false); }} />
    </div>
  </div>;
}

export function CustomSizeSliders({ dock, host }: { dock: SceneDock; host?: HTMLElement }) {
  const { element, place } = useHost(host);
  const shown = useDock(dock, 'sliders'), locked = useDock(dock, 'locked');
  useLayoutEffect(() => {
    if (!element) return;
    element.hidden = !shown;
    element.classList.toggle('off', locked);
  }, [element, shown, locked]);
  return place(<>
    <Slider dock={dock} axis="w" label="size.w" ticks={[600, 840]} />
    <Slider dock={dock} axis="h" label="size.h" ticks={[480, 900]} />
  </>, slidersHost);
}
