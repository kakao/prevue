import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button, IconButton, Input, Pill } from '../src/components/Primitives';
import { createMessages } from '../src/messages';
import en from '../../plugin/viewer/strings/en.json';
import ko from '../../plugin/viewer/strings/ko.json';

const meta = { title: '재료/Tokens' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const colors = ['surface', 'surface-container', 'surface-container-high', 'on-surface', 'on-surface-variant', 'outline', 'outline-variant', 'primary', 'primary-container', 'on-primary', 'pick', 'pick-container', 'live', 'error', 'error-container', 'warning', 'success'];
const types = ['display', 'title-large', 'title-medium', 'title-small', 'body-large', 'body-medium', 'body-small', 'label-large', 'label-medium', 'label-small', 'code', 'code-small'];
export const Colors: Story = { render: () => <div className="story-grid">{colors.map(role => <div className="story-swatch" key={role}><div className="story-color" style={{ background: `var(--${role})` }} /><code>--{role}</code></div>)}</div> };
export const Typography: Story = { render: () => <div className="story-stack">{types.map(role => <div key={role}><code>--type-{role}</code><div style={{ font: `var(--type-${role})` }}>Prevue · Compose Preview · 프리뷰</div></div>)}</div> };
export const ShapeAndSpace: Story = { render: () => <div className="story-grid">{['small', 'medium', 'large', 'full'].map(role => <div key={role} className="story-swatch" style={{ borderRadius: `var(--corner-${role})` }}>--corner-{role}</div>)}{[1, 2, 3, 4].map(level => <div key={level} className="story-swatch" style={{ boxShadow: `var(--elevation-${level})` }}>--elevation-{level}</div>)}{[2, 4, 6, 8, 12, 16, 24, 32, 40].map(space => <div key={space} className="story-swatch"><code>--space-{space}</code><div className="story-color" style={{ width: `var(--space-${space})`, background: 'var(--primary-container)' }} /></div>)}</div> };

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
export const Motion: Story = { render: () => <div className="story-stack">{['short4', 'medium2', 'long1'].map(duration => <Button key={duration} onClick={event => { const button = event.currentTarget; const style = getComputedStyle(button); const raw = style.getPropertyValue(`--duration-${duration}`).trim(); const ms = parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000); const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; button.animate([{ opacity: .4, transform: reduced ? 'none' : 'scale(var(--motion-enter-scale))' }, { opacity: 1, transform: 'none' }], { duration: ms, easing: style.getPropertyValue('--easing-standard').trim() }); }}>--duration-{duration}</Button>)}</div> };
