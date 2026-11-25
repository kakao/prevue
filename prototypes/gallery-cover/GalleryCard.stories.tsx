import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, type CSSProperties } from 'react';
import { GalleryCard, GalleryPeek, usePeek, type CardProps } from './GalleryCard';
import './gallery-cover.css';

// 카드 한 장의 세 상태(완료 · 로딩 · 실패)와 펼친 시트. 그림은 design-system 시안의 nowinandroid · pearl 렌더다.

const IMG = import.meta.glob<string>('../design-system/img/**/*.{png,jpg}', { eager: true, query: '?url', import: 'default' });
const pick = (...names: string[]) => names.map(n => Object.entries(IMG).find(([k]) => k.endsWith(`/${n}`))?.[1]).filter((x): x is string => !!x);

type Sample = Pick<CardProps, 'file' | 'info' | 'pkg' | 'mod' | 'images' | 'previews'> & { full: string; labels: string[] };
const SAMPLES: Sample[] = [
  { file: 'ForYouScreen', mod: 'feature/foryou', pkg: 'feature.foryou.impl', full: 'com.google.samples.apps.nowinandroid.feature.foryou.impl', labels: ['PopulatedFeed', 'PopulatedFeed', 'TopicSelection', 'TopicSelection'], info: '3분 전', previews: ['PopulatedFeed', 'TopicSelection'],
    images: pick('ForYouScreenPopulatedFeed-0.png', 'ForYouScreenPopulatedFeed_2-0.png', 'ForYouScreenTopicSelection-0.png', 'ForYouScreenTopicSelection_3-0.png') },
  { file: 'PearlPreviews', mod: 'feature/pearl', pkg: 'feature.pearl', full: 'com.example.pearl.feature.pearl', labels: ['List', 'Empty', 'Loading', 'Error'], info: '1시간 전', previews: ['List', 'Empty', 'Loading', 'Error', 'Landscape'],
    images: pick('PearlListPreview.jpg', 'PearlEmptyPreview.jpg', 'PearlLoadingPreview.jpg', 'PearlErrorPreview.jpg') },
  { file: 'Button', mod: 'core/designsystem', pkg: 'core.designsystem.component', full: 'com.google.samples.apps.nowinandroid.core.designsystem.component', labels: ['NiaButton', 'NiaOutlinedButton', 'NiaButtonLeadingIcon'], info: '어제', previews: ['NiaButton', 'NiaOutlinedButton', 'NiaButtonLeadingIcon'],
    images: pick('NiaButtonPreview-0.png', 'NiaOutlinedButtonPreview-0.png', 'NiaButtonLeadingIconPreview-0.png') },
  { file: 'SearchScreen', mod: 'feature/search', pkg: 'feature.search.impl', full: 'com.google.samples.apps.nowinandroid.feature.search.impl', labels: ['SearchToolbar', 'SearchNotReadyBody'], info: '2일 전', previews: ['SearchToolbar', 'SearchNotReadyBody'],
    images: pick('SearchToolbarPreview-0.png', 'SearchNotReadyBodyPreview-0.png') },
  { file: 'DrinkDetail', mod: 'feature/pearl', pkg: 'feature.pearl.detail', full: 'com.example.pearl.feature.pearl.detail', labels: [''], info: '5일 전', previews: ['DrinkDetail'], images: pick('DrinkDetailPreview.jpg') },
  { file: 'PearlLandscape', mod: 'feature/pearl', pkg: 'feature.pearl', full: 'com.example.pearl.feature.pearl', labels: [''], info: '11월 2일', previews: ['PearlLandscape'], images: pick('PearlLandscapePreview.jpg') },
];

type Args = { cardMin: number; gap: string; aspect: string };

function Sheet({ a }: { a: Args }) {
  const pk = usePeek();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') pk.close(); };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [pk.close]);
  const states: CardProps['state'][] = ['done', 'loading', 'failed'];
  const [st, f] = (pk.key ?? '').split('|');
  const smp = SAMPLES.find(x => x.file === f);
  const grid = (state: CardProps['state']) => <div className="gc-grid" style={{ '--gc-min': `${a.cardMin}px`, '--gc-gap': `var(${a.gap})` } as CSSProperties}>
    {SAMPLES.map(s => <GalleryCard key={s.file} peekKey={`${state}|${s.file}`} {...s} state={state} aspect={a.aspect} onPeek={() => pk.open(`${state}|${s.file}`)} />)}</div>;
  return <div className="gcard-sheet">
    {states.map(x => <section key={x}><h2>{{ done: '완료 — 누르면 카드 자리에서 시트가 떠오르고 묶음이 펼쳐진다', loading: '로딩', failed: '실패' }[x]}</h2>{grid(x)}</section>)}
    {smp && pk.key && <GalleryPeek key={pk.key} peekKey={pk.key} closing={pk.closing} {...smp} pkg={smp.full} state={st as CardProps['state']}
      onClose={pk.close} onClosed={pk.closed} onOpen={() => console.log(`보드: ${smp.file}`)} />}
  </div>;
}

const meta = {
  title: '시안/갤러리 카드',
  args: { cardMin: 300, gap: '--space-24', aspect: '4 / 3' } satisfies Args,
  argTypes: {
    cardMin: { control: { type: 'range', min: 220, max: 420, step: 20 } },
    gap: { control: 'inline-radio', options: ['--space-12', '--space-16', '--space-24', '--space-32'] },
    aspect: { control: 'inline-radio', options: ['4 / 3', '1 / 1', '16 / 10', '3 / 2'] },
  },
  render: args => <Sheet a={args as Args} />,
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const 상태: Story = {};
