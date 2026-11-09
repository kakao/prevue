import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { Button, IconButton, Input, Pill } from '../src/components/Primitives';
import { createMessages } from '../src/messages';
import en from '../../plugin/viewer/strings/en.json';
import ko from '../../plugin/viewer/strings/ko.json';
import pairs from '../../tests/viewer/contrast-pairs.json';
import { type ContrastRow, measureContrast } from '../../tests/viewer/contrast-measure';

const meta = { title: '재료/Tokens' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const colors = ['surface', 'surface-container', 'surface-container-high', 'state-hover', 'primary-container', 'on-surface', 'on-surface-variant', 'on-surface-disabled',
  'outline', 'outline-variant', 'primary', 'on-primary', 'focus-ring', 'pick', 'pick-container', 'on-pick', 'pick-outline', 'pick-hover', 'pick-hover-line', 'pick-chosen', 'pick-rest', 'live', 'error', 'error-container', 'on-error', 'warning', 'success', 'scrim',
  'device-body', 'device-tone-s26', 'device-tone-pixel9', 'device-tone-fold8', 'device-tone-ultra', 'device-tone-pixelfold', 'device-tone-tablet',
  'device-tone-ip17', 'device-tone-ipair', 'device-tone-ip17pm', 'device-tone-ipduo', 'device-rim', 'device-side', 'device-side-line', 'device-side-edge', 'device-inner', 'device-inner-glow',
  'device-shadow-contact', 'device-shadow-near', 'device-shadow-far', 'art-kmp',
  'avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 'avatar-6', 'avatar-7', 'avatar-8', 'on-avatar'];
const types = ['display', 'title-large', 'title-medium', 'title-small', 'body-large', 'body-medium', 'body-small', 'label-large', 'label-medium', 'label-small', 'code', 'code-small'];
const spaces = [2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64];
// [시간, 이징, 계단 칸 수] — 계단은 --motion-stagger 의 배수만큼 늦게 출발한다.
const motions: [string, string, number?][] = [['short1', 'standard'], ['short2', 'standard'], ['short3', 'standard'], ['short4', 'standard'], ['medium1', 'standard'],
  ['medium2', 'standard'], ['medium2', 'decelerate'], ['medium2', 'accelerate'], ['long1', 'standard'], ['long3', 'standard'], ['long4', 'standard'], ['long4', 'spring'],
  ['extra-long2', 'decelerate'], ['extra-long3', 'standard'], ['extra-long4', 'standard'],
  ['medium2', 'standard', 2], ['medium2', 'standard', 4], ['medium2', 'standard', 6]];

// 라이트 · 다크를 data-theme 로 고정해 나란히 둔다. 툴바의 테마는 이 둘 밖의 면만 바꾼다.
function Sheets({ children }: { children: (sheet: HTMLElement | null) => ReactNode }) {
  return <div className="story-sheets">{['light', 'dark'].map(theme => <Sheet key={theme} theme={theme}>{children}</Sheet>)}</div>;
}
function Sheet({ theme, children }: { theme: string; children: (sheet: HTMLElement | null) => ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [sheet, setSheet] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => setSheet(ref.current), []);
  return <section ref={ref} className="story-sheet" data-theme={theme}><h2>{theme}</h2>{children(sheet)}</section>;
}

function hexOf(sheet: HTMLElement, role: string) {
  if (!getComputedStyle(sheet).getPropertyValue(`--${role}`).trim()) return '—';
  const probe = document.createElement('i');
  probe.style.color = `var(--${role})`;
  sheet.append(probe);
  const c = (getComputedStyle(probe).color.match(/[\d.]+/g) || []).map(Number);
  probe.remove();
  const alpha = c.length > 3 && c[3] < 1 ? [c[3] * 255] : [];
  return '#' + [...c.slice(0, 3), ...alpha].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export const Colors: Story = { render: () => <Sheets>{sheet => <div className="story-swatches">{colors.map(role =>
  <div key={role}><i style={{ background: `var(--${role})` }} /><div><b>--{role}</b><span className="story-meta">{sheet ? hexOf(sheet, role) : ''}</span></div></div>)}</div>}</Sheets> };

// 쌍과 계산은 tests/viewer 의 대비 실측과 한 벌이다. 미달 0 은 그쪽 테스트가 지킨다.
function ContrastTable({ sheet }: { sheet: HTMLElement }) {
  const { rows, missing, unbacked } = measureContrast(pairs, [sheet]);
  const verdict = (row: ContrastRow) => Number.isNaN(row.ratio) ? 'no' : row.need === 0 ? 'na' : row.ratio >= row.need ? 'ok' : 'no';
  return <>
    {missing.length > 0 && <p className="story-contrast"><span className="no">tokens.css 에 없는 역할: {missing.map(role => `--${role}`).join(' · ')}</span></p>}
    {unbacked.length > 0 && <p className="story-contrast"><span className="no">바탕이 끝까지 반투명해 잴 수 없는 쌍: {unbacked.join(' · ')}</span></p>}
    <table className="story-contrast"><thead><tr><th>fg</th><th>bg</th><th>need</th><th>ratio</th></tr></thead><tbody>{rows.map(row =>
      <tr key={row.fg + row.bg}><td>--{row.fg}</td><td>--{row.bg}</td><td>{row.need === 0 ? 'exempt' : `${row.need}:1`}</td><td className={`story-ratio ${verdict(row)}`}>{Number.isNaN(row.ratio) ? '—' : row.ratio.toFixed(2)}</td></tr>)}</tbody></table>
  </>;
}
export const Contrast: Story = { render: () => <Sheets>{sheet => sheet && <ContrastTable sheet={sheet} />}</Sheets> };

export const Typography: Story = { render: () => <div className="story-stack">{types.map(role => <div key={role} className="story-scale"><code>--type-{role}</code><div style={{ font: `var(--type-${role})` }}>Prevue · Compose Preview · 프리뷰</div></div>)}</div> };
export const Spacing: Story = { render: () => <div className="story-stack">{spaces.map(space => <div key={space} className="story-scale"><code>--space-{space}</code><i className="story-bar" style={{ width: `var(--space-${space})` }} /></div>)}</div> };
// 그림자는 light-dark() 라 두 면을 나란히 본다.
export const ShapeAndElevation: Story = { render: () => <Sheets>{() => <div className="story-grid">{['small', 'medium', 'large', 'full'].map(role => <div key={role} className="story-swatch" style={{ borderRadius: `var(--corner-${role})` }}>--corner-{role}</div>)}{[1, 2, 3, 4].map(level => <div key={level} className="story-swatch" style={{ boxShadow: `var(--elevation-${level})` }}>--elevation-{level}</div>)}</div>}</Sheets> };

function Parts({ language }: { language: string }) {
  const { phrase } = createMessages(language === 'ko' ? ko : en);
  const [pressed, setPressed] = useState(false);
  return <div className="story-stack">
    <div className="story-row"><Button variant="primary">{phrase('rail.open')}</Button><Button>{phrase('header.dir.copy')}</Button><Button variant="quiet">{phrase('zoom.fit')}</Button><Button disabled>{phrase('rail.open')}</Button><IconButton label={phrase('header.help')} aria-pressed={pressed} onClick={() => setPressed(!pressed)}>?</IconButton></div>
    <div className="story-row"><Pill>Prevue</Pill><Pill tone="success">✓</Pill><Pill tone="warning">1.32s</Pill><Pill tone="error">{phrase('status.lost.short')}</Pill></div>
    <Input label={phrase('quickopen.field')} placeholder={phrase('quickopen.placeholder')} />
  </div>;
}
export const BasicParts: Story = { render: (_, context) => <Parts language={context.globals.language} /> };

// 움직임 줄이기에서는 이동 · 확대만 빠지고 시간은 그대로다.
function MotionTable() {
  const [play, setPlay] = useState(false);
  return <div className={`story-stack ${play ? 'story-play' : ''}`}>
    {motions.map(([duration, easing, steps]) => <div key={`${duration}-${easing}-${steps ?? 0}`} className="story-motion">
      <code>{duration} · {easing}{steps ? ` · stagger ×${steps}` : ''}</code>
      <div className="story-track"><i className="story-dot" style={{ transition: `left var(--duration-${duration}) var(--easing-${easing})${steps ? ` calc(var(--motion-stagger) * ${steps})` : ''}` }} /></div>
    </div>)}
    <div className="story-row"><Button aria-pressed={play} onClick={() => setPlay(!play)}>play</Button></div>
  </div>;
}
export const Motion: Story = { render: () => <MotionTable /> };

// 들어오는 요소의 확대(--motion-enter-scale) — 움직임 줄이기에서는 1 이라 페이드만 남는다.
export const Enter: Story = { render: () => <div className="story-row">{['short4', 'medium2', 'long1'].map(duration => <Button key={duration} onClick={event => { const button = event.currentTarget; const style = getComputedStyle(button); const raw = style.getPropertyValue(`--duration-${duration}`).trim(); const ms = parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000); button.animate([{ opacity: .4, transform: 'scale(var(--motion-enter-scale))' }, { opacity: 1, transform: 'none' }], { duration: ms, easing: style.getPropertyValue('--easing-standard').trim() }); }}>--duration-{duration}</Button>)}</div> };
