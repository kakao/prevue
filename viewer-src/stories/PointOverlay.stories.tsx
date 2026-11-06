import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { PointCard, PointTag, tagTitle, type CardRow } from '../src/components/PointOverlay';
import type { PointNode, TagSay } from '../src/workspace/view';
import { choiceExample, pearlCard, useShot } from './workspace';

// 가리킨 결과 — 카드 시안(D-162)과 지금 뷰어가 쓰는 꼬리표(D-101 · D-105).
// 멘션은 데몬의 가리키기 응답이라 계약 예제 choice 의 파일 · 후보 경로로 짓는다. Pearl 사본에는 ViewInfo 트리가 없어 트리 줄은 fixtures/pearl 의 호출을 본떠 여기서 만든다.
const meta = { title: '가리키기/PointOverlay' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const choice = choiceExample.choice!, path = choice.candidates[0], ref = `@${path}#L${choice.line}`;
const node = { name: 'Text', fileName: choice.fileName, lineNumber: choice.line, bounds: [0, 0, 1, 1], uchain: ['PearlListPreview', 'Column', 'Text'] };
const says: Array<[string, TagSay]> = [
  ['가리키는 중', { msg: null, ref: `${choice.fileName}:${choice.line}` }],
  ['복사됨', { msg: null, ref, copied: true, file: path }],
  ['다시 복사', { msg: null, ref, copied: false, file: path, again: () => {} }],
  ['막힘', { msg: null, ref, copied: false, file: path }],
];
const Tag = ({ say, top }: { say: TagSay; top: number }) => <div className="box pick" style={{ left: '12%', top: `${top}%`, width: '70%', height: '6%' }}>
  <span className="tag" title={tagTitle(node, say)}><PointTag say={say} state={choiceExample} /></span>
</div>;
export const Tags: Story = { render: () => { useShot(pearlCard.imageUrl); return <div className="wrap"><div className="stage" id="stage"><img id="shot" alt="preview" />
  {says.map(([name, say], i) => <Tag key={name} say={say} top={12 + i * 20} />)}
</div></div>; } };

const row = (name: string, at: CardRow['at'], previews: string[] = []): CardRow => ({ id: `${at}-${name}`, name, at, previews: previews.map(p => ({ id: p, name: p })) });
const card: PointNode = { name: 'DrinkCard', fileName: 'DrinkCard.kt', lineNumber: 73, bounds: [0, 0, 1, 1] };
const mention = '@/Users/me/pearl/core/ui/src/main/kotlin/com/example/pearl/core/ui/DrinkCard.kt#L73';
const elsewhere = { ...choiceExample, tabs: [] };
const copied: TagSay = { msg: null, ref: mention, copied: true, file: '/Users/me/pearl/core/ui/src/main/kotlin/com/example/pearl/core/ui/DrinkCard.kt' };
const rows = [
  row('PearlTheme', 'up'),
  row('PearlScreen', 'up', ['PearlEmptyPreview', 'PearlLoadingPreview', 'PearlErrorPreview']),
  row('LazyColumn', 'up'),
  row('DrinkCard', 'here', ['DrinkCardPreview']),
  row('Column', 'down'),
  row('Text', 'down'),
];
// 깊이 22 — 나우인안드로이드 화면 트리를 프로젝트 소스 · 크기 있는 노드로 좁힌 깊이다.
const longRows = [
  ...['NiaTheme', 'NiaBackground', 'NiaGradientBackground', 'NiaApp', 'NiaNavigationSuiteScaffold', 'Scaffold', 'Column', 'NiaNavHost', 'NavHost', 'ForYouScreen', 'Box', 'LazyVerticalStaggeredGrid', 'newsFeed', 'NewsResourceCardExpanded', 'Card', 'Column', 'Row', 'NewsResourceHeaderImage', 'Box'].map((name, i) => row(name, 'up', i === 9 ? ['ForYouScreenPopulatedFeed'] : [])).map((r, i) => ({ ...r, id: `${i}` })),
  row('AsyncImage', 'here'),
  row('Image', 'down'),
  row('AndroidComposeNavigationSuiteWithAReallyLongComposableNameHere', 'down'),
];

const Sheets = () => <div className="story-sheets">{['light', 'dark'].map(theme => <section key={theme} className="story-sheet" data-theme={theme}>
  <h2>{theme}</h2>
  <div className="story-cards">
    <Case name="복사됨"><PointCard node={card} size={[164, 96.4]} say={copied} rows={rows} state={elsewhere} /></Case>
    <Case name="가리키는 중"><PointCard node={card} size={[164, 96.4]} say={{ msg: null, ref: 'DrinkCard.kt:73' }} rows={rows} state={elsewhere} /></Case>
    <Case name="다시 복사"><PointCard node={card} size={[164, 96.4]} say={{ ...copied, copied: false, again: () => {} }} rows={rows} state={elsewhere} /></Case>
    <Case name="막힘"><PointCard node={card} size={[164, 96.4]} say={{ ...copied, copied: false }} rows={rows} state={elsewhere} /></Case>
    <Case name="Preview 후보 펼침"><Expanded /></Case>
    <Case name="긴 사슬"><PointCard node={{ ...card, name: 'AsyncImage', fileName: 'NewsResourceCard.kt', lineNumber: 214 }} size={[331.4, 180]} say={{ ...copied, ref: '@/Users/me/nia/core/ui/src/main/kotlin/NewsResourceCard.kt#L214' }} rows={longRows} state={elsewhere} /></Case>
    <Case name="색인 없음"><PointCard node={card} size={[360, 72]} say={copied} rows={null} state={elsewhere} /></Case>
    <Case name="지금 탭의 파일 · 긴 이름"><PointCard node={{ ...card, name: 'PearlScreenContentWithHeroAndStickyFilterChips', fileName: 'PearlScreenContentWithHeroAndStickyFilterChips.kt', lineNumber: 1208 }} size={[360, 780.2]} say={{ msg: null, ref: '@/Users/me/pearl/PearlScreenContentWithHeroAndStickyFilterChips.kt#L1208', copied: true }} rows={null} state={choiceExample} /></Case>
    <Case name="문장"><PointCard node={card} size={[164, 96.4]} say={{ msg: 'DrinkCard.kt:73 — not in the index, so the full path is missing' }} rows={null} state={choiceExample} /></Case>
  </div>
</section>)}</div>;
const Case = ({ name, children }: { name: string; children: React.ReactNode }) => <div className="story-stack"><span className="story-meta">{name}</span>{children}</div>;
/** 첫 Preview 줄을 펼친 모양 — 펼침은 줄이 쥔 상태라 처음 그릴 때 누른다. */
const Expanded = () => <div ref={el => { el?.querySelector<HTMLElement>('.pc-node.up .pc-jump[aria-expanded="false"]')?.click(); }}>
  <PointCard node={card} size={[164, 96.4]} say={copied} rows={rows} state={elsewhere} />
</div>;
export const States: Story = { render: () => <Sheets /> };

/** 그림 위에서 — 카드는 박스 옆(오른쪽 · 왼쪽 · 아래 순)이고 창 안으로 당긴다. 자리 계산은 다음 작업이라 여기서는 세워 둔다. */
const Placed = ({ theme, node, size, tree, box, at }: { theme: string; node: PointNode; size: [number, number]; tree: CardRow[]; box: React.CSSProperties; at: React.CSSProperties }) => <section className="story-sheet story-place" data-theme={theme}>
  <h2>{theme}</h2>
  <div className="story-placed">
    <img src={pearlCard.imageUrl!} alt="" />
    <div className="box pick" style={box} />
    <div className="story-at" style={at}><PointCard node={node} size={size} say={{ ...copied, ref: `@/Users/me/pearl/${node.fileName}#L${node.lineNumber}` }} rows={tree} state={elsewhere} /></div>
  </div>
</section>;
const chips = [row('PearlTheme', 'up'), row('PearlScreen', 'up', ['PearlEmptyPreview', 'PearlLoadingPreview', 'PearlErrorPreview']), row('LazyRow', 'here'), row('FilterChip', 'down')];
export const OnPreview: Story = { render: () => <div className="story-sheets">
  <Placed theme="light" node={card} size={[150, 174.3]} tree={rows} box={{ left: '6.7%', top: '36.9%', width: '41.7%', height: '22.3%' }} at={{ left: 'calc(48.4% + 8px)', top: '36.9%' }} />
  <Placed theme="dark" node={{ ...card, name: 'LazyRow', fileName: 'PearlScreen.kt', lineNumber: 112 }} size={[360, 36.4]} tree={chips} box={{ left: '0%', top: '30.3%', width: '100%', height: '5.4%' }} at={{ left: '6.7%', top: 'calc(35.7% + 8px)' }} />
</div> };
