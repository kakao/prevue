import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, ReactNode } from 'react';
import '../../viewer-src/legacy/style.css';
import en from '../../plugin/viewer/strings/en.json';
import ko from '../../plugin/viewer/strings/ko.json';
import { createMessages, MessagesContext } from '../../viewer-src/src/messages';
import type { PointNode, TagSay } from '../../viewer-src/src/workspace/view';
import { choiceExample, pearlCard } from '../../viewer-src/stories/workspace';
import { PointCard, type CardBox, type CardModifier, type CardRow } from './PointCard';
import { strings } from './strings';
import './stories.css';

// 가리키기 카드 프로토타입 — 상태별 카드와 그림 위에 선 모양. 문구는 뷰어 사전에 프로토타입 문구를 얹어 읽는다.
const messages = { en: createMessages({ ...en, ...strings.en }), ko: createMessages({ ...ko, ...strings.ko }) };
const meta = {
  title: '프로토타입/PointCard',
  decorators: [(Story, context) => <MessagesContext.Provider value={messages[context.globals.language as 'en' | 'ko'] ?? messages.en}><Story /></MessagesContext.Provider>],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const row = (name: string, at: CardRow['at'], previews: string[] = []): CardRow => ({ id: `${at}-${name}`, name, at, previews: previews.map(p => ({ id: p, name: p })) });
const repo = '/Users/me/pearl';
const file = `${repo}/core/ui/src/main/kotlin/com/example/pearl/core/ui/DrinkCard.kt`;
const elsewhere = { ...choiceExample, tabs: [], header: { ...choiceExample.header, repo } };
const say = (line: number, rest: Partial<TagSay> = { copied: true }): TagSay => ({ msg: null, ref: `@${file}#L${line}`, file, ...rest });
const card: PointNode = { name: 'DrinkCard', fileName: 'DrinkCard.kt', lineNumber: 73, bounds: [0, 0, 1, 1] };
/** 그린 앱의 색이라 역할 이름이 아니다 — 데몬이 준 값을 그대로 견본으로 쓴다. */
const tone = (rgb: number) => { const value = `#${rgb.toString(16).toUpperCase().padStart(6, '0')}`; return { value, color: value }; };
// 값은 fixtures/pearl 을 데몬에서 그려 ComposeViewAdapter 의 LayoutInfo.getModifierInfo() 로 읽은 체인이다.
const cardBox: CardBox = { width: 150, height: 174.4 };
const cardMods: CardModifier[] = [
  { name: 'fillMaxWidth', sizes: ['width'] },
  { name: 'aspectRatio', value: '0.86', sizes: ['height'] },
  { name: 'clickable', value: '"Taro Milk Tea"' },
  { name: 'background', ...tone(0xF6F6F5) },
];
const captionMods: CardModifier[] = [{ name: 'padding', value: '12, 10, 12, 12' }, { name: 'fillMaxWidth', sizes: ['width'] }];
const rows = [
  row('PearlTheme', 'up'),
  row('PearlScreen', 'up', ['PearlEmptyPreview', 'PearlLoadingPreview', 'PearlErrorPreview']),
  row('LazyVerticalGrid', 'up'),
  row('DrinkCard', 'here', ['DrinkCardPreview']),
  row('Column', 'down'),
  row('FlavorPanel', 'down'),
];
// 깊이 22 — 나우인안드로이드 화면 트리를 프로젝트 소스 · 크기 있는 노드로 좁힌 깊이다.
const longRows = [
  ...['NiaTheme', 'NiaBackground', 'NiaGradientBackground', 'NiaApp', 'NiaNavigationSuiteScaffold', 'Scaffold', 'Column', 'NiaNavHost', 'NavHost', 'ForYouScreen', 'Box', 'LazyVerticalStaggeredGrid', 'newsFeed', 'NewsResourceCardExpanded', 'Card', 'Column', 'Row', 'NewsResourceHeaderImage', 'Box'].map((name, i) => row(name, 'up', i === 9 ? ['ForYouScreenPopulatedFeed'] : [])).map((r, i) => ({ ...r, id: `${i}` })),
  row('AsyncImage', 'here'),
  row('Image', 'down'),
];
const longMods: CardModifier[] = [{ name: 'fillMaxWidth', sizes: ['width'] }, { name: 'height', value: '180.dp', sizes: ['height'] }, { name: 'clip', value: 'RoundedCornerShape(12.dp)' }, { name: 'background', ...tone(0x6750A4) }, { name: 'semantics' }, { name: 'graphicsLayer' }, { name: 'drawBehind' }, { name: 'paint' }];
const base = { node: card, box: cardBox, modifiers: cardMods, rows, state: elsewhere };
const Case = ({ name, children }: { name: string; children: ReactNode }) => <div className="story-stack"><span className="story-meta">{name}</span>{children}</div>;
/** 첫 Preview 줄을 펼친 모양 — 펼침은 줄이 쥔 상태라 처음 그릴 때 누른다. */
const Expanded = () => <div ref={el => { el?.querySelector<HTMLElement>('.pc-node.up .pc-jump[aria-expanded="false"]')?.click(); }}>
  <PointCard {...base} say={say(73)} tab="tree" />
</div>;
export const States: Story = { render: () => <div className="story-sheets">{['light', 'dark'].map(theme => <section key={theme} className="story-sheet" data-theme={theme}>
  <h2>{theme}</h2>
  <div className="story-cards">
    <Case name="복사됨 · Modifier"><PointCard {...base} say={say(73)} /></Case>
    <Case name="구조 탭"><PointCard {...base} say={say(73)} tab="tree" /></Case>
    <Case name="여백이 있는 노드"><PointCard {...base} node={{ ...card, name: 'Column', lineNumber: 88 }} box={{ width: 150, height: 62.4, padding: [12, 10, 12, 12] }} modifiers={captionMods} say={say(88)} /></Case>
    <Case name="글자 노드"><PointCard {...base} node={{ ...card, name: 'Text', lineNumber: 114 }} box={{ width: 96.3, height: 19 }} modifiers={[{ name: 'wrapContent', sizes: ['width', 'height'] }, { name: 'text', value: '"Taro Milk Tea"' }, { name: 'maxLines', value: '1' }]} say={say(114)} /></Case>
    <Case name="가리키는 중"><PointCard {...base} say={{ msg: null, ref: 'DrinkCard.kt:73' }} /></Case>
    <Case name="다시 복사"><PointCard {...base} say={say(73, { copied: false, again: () => {} })} /></Case>
    <Case name="막힘"><PointCard {...base} say={say(73, { copied: false })} /></Case>
    <Case name="Preview 후보 펼침"><Expanded /></Case>
    <Case name="긴 사슬"><PointCard {...base} node={{ ...card, name: 'AsyncImage', fileName: 'NewsResourceCard.kt', lineNumber: 214 }} box={{ width: 331.4, height: 180 }} modifiers={longMods} rows={longRows} tab="tree" say={{ msg: null, ref: '@/Users/me/pearl/core/ui/src/main/kotlin/NewsResourceCard.kt#L214', file: '/Users/me/pearl/core/ui/src/main/kotlin/NewsResourceCard.kt', copied: true }} /></Case>
    <Case name="색인 없음"><PointCard {...base} rows={null} modifiers={null} say={say(73)} /></Case>
    <Case name="문장"><PointCard {...base} rows={null} say={{ msg: 'DrinkCard.kt:73 — not in the index, so the full path is missing' }} /></Case>
  </div>
</section>)}</div> };

/** 그림 위에서 — 카드는 박스 옆(오른쪽 · 왼쪽 · 아래 순)이고 창 안으로 당긴다. 자리 계산은 다음 작업이라 여기서는 세워 둔다. */
const Placed = ({ theme, frame, at, ...card }: Omit<Parameters<typeof PointCard>[0], 'state' | 'say'> & { theme: string; frame: CSSProperties; at: CSSProperties }) => <section className="story-sheet story-place" data-theme={theme}>
  <h2>{theme}</h2>
  <div className="story-placed">
    <img src={pearlCard.imageUrl!} alt="" />
    <div className="box pick" style={frame} />
    <div className="story-at" style={at}><PointCard {...card} say={say(card.node.lineNumber)} state={elsewhere} /></div>
  </div>
</section>;
const chips = [row('PearlTheme', 'up'), row('PearlScreen', 'up', ['PearlEmptyPreview', 'PearlLoadingPreview', 'PearlErrorPreview']), row('LazyRow', 'here'), row('FilterChip', 'down')];
export const OnPreview: Story = { render: () => <div className="story-sheets">
  <Placed theme="light" node={card} box={cardBox} modifiers={cardMods} rows={rows} frame={{ left: '6.7%', top: '36.9%', width: '41.7%', height: '22.3%' }} at={{ left: 'calc(48.4% + 8px)', top: '36.9%' }} />
  <Placed theme="dark" node={{ ...card, name: 'LazyRow', fileName: 'PearlScreen.kt', lineNumber: 112 }} box={{ width: 360, height: 36.4 }} modifiers={[{ name: 'fillMaxWidth', sizes: ['width'] }, { name: 'padding', value: '24, 0, 24, 0' }]} rows={chips} tab="tree" frame={{ left: '0%', top: '30.3%', width: '100%', height: '5.4%' }} at={{ left: '6.7%', top: 'calc(35.7% + 8px)' }} />
</div> };
