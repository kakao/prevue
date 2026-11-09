// 가리키기 카드 스토리의 재료 — pearl 0번 그림(600×1300px = 360×780dp)의 노드 트리를 눈으로 잡아 본뜬 것이다. 실제로는 데몬이 준 트리의 bounds 와
// 레이아웃마다 실은 modifier 체인(ViewInfoJson · ModifierChain)을 쓴다. 그림은 360px 로 보이므로 px 좌표 × 0.6 이 곧 화면 px 이자 dp 다.
// 카드의 내용은 뷰어와 같은 함수(workspace/card.ts)로 짓는다.
import { boxOf, previewsOf, treeOf, type PreviewIndex, type TreeHit } from '../src/workspace/card';
import type { CardModifier, CardOrigin, PointCardData, PointSay } from '../src/workspace/view';

export type Node = {
  name: string; file: string; line: number; module?: string;
  /** 그림 px 좌표 [왼 · 위 · 오른 · 아래] — 그림이 없는 사슬(긴 사슬)은 크기만 준다(size, dp) */
  b?: readonly [number, number, number, number]; size?: readonly [number, number];
  mods: CardModifier[]; kids: Node[]; previews?: string[];
};
export const SHOT = { width: 360, height: 780 };
export const PX = SHOT.width / 600;
const repo = '/Users/me/pearl';
const MENU = `${repo}/feature/menu/src/main/kotlin/com/example/pearl/feature/menu/PearlScreen.kt`;
const CARD = `${repo}/core/ui/src/main/kotlin/com/example/pearl/core/ui/DrinkCard.kt`;
const THEME = `${repo}/core/designsystem/src/main/kotlin/com/example/pearl/core/designsystem/PearlTheme.kt`;
export const REPO = repo;

type Spec = Omit<Node, 'kids' | 'mods'> & { mods?: CardModifier[]; kids?: Node[] };
const N = (spec: Spec): Node => ({ ...spec, mods: spec.mods ?? [], kids: spec.kids ?? [] });

const fill: CardModifier = { name: 'fillMaxWidth', sizes: ['width'] };
const fillSize: CardModifier = { name: 'fillMaxSize', sizes: ['width', 'height'] };
const wrap: CardModifier = { name: 'wrapContent', sizes: ['width', 'height'] };
/** 그린 앱의 색이라 역할 이름이 아니다 — 데몬이 준 값을 그대로 견본으로 쓴다(ModifierChain 의 #RRGGBB · CSS #RRGGBBAA). */
const bg = (hex: string): CardModifier => ({ name: 'background', value: hex, color: `${hex}FF` });
const text = (s: string, file: string, line: number, b: Node['b']) => N({ name: 'Text', file, line, b, mods: [wrap, { name: 'text', value: `"${s}"` }] });

const drink = (x: number, y: number, name: string, price: string) => N({
  name: 'DrinkCard', file: MENU, line: 130, module: ':core:ui', b: [x, y, x + 250, y + 290], previews: ['DrinkCardPreview'],
  mods: [fill, { name: 'aspectRatio', value: '0.86', sizes: ['height'] }, { name: 'clickable', value: `"${name}"` }, bg('#F6F6F5')],
  kids: [
    N({ name: 'Image', file: CARD, line: 80, b: [x, y, x + 250, y + 200], mods: [fill, { name: 'height', value: '120.dp', sizes: ['height'] }, { name: 'clip' }] }),
    N({ name: 'Column', file: CARD, line: 88, b: [x, y + 200, x + 250, y + 290], mods: [{ name: 'padding', value: '12, 10, 12, 12' }, fill], kids: [
      text(name, CARD, 114, [x + 20, y + 215, x + 20 + name.length * 13, y + 242]),
      text(price, CARD, 118, [x + 20, y + 250, x + 72, y + 270]),
    ] }),
  ],
});
const chip = (label: string, x0: number, x1: number) => N({ name: 'FilterChip', file: MENU, line: 131, b: [x0, 393, x1, 453], mods: [{ name: 'height', value: '36.dp', sizes: ['height'] }, { name: 'clickable', value: `"${label}"` }], kids: [text(label, MENU, 136, [x0 + 20, 410, x1 - 20, 437])] });
const icon = (label: string, line: number, x: number) => N({ name: 'IconButton', file: MENU, line, b: [x, 33, x + 80, 113], mods: [{ name: 'size', value: '48.dp', sizes: ['width', 'height'] }, { name: 'clickable', value: `"${label}"` }] });

export const pearl = N({ name: 'PearlTheme', file: THEME, line: 20, module: ':core:designsystem', b: [0, 0, 600, 1300], mods: [fillSize], kids: [
  N({ name: 'PearlScreen', file: MENU, line: 41, module: ':feature:menu', b: [0, 0, 600, 1300], previews: ['PearlEmptyPreview', 'PearlLoadingPreview', 'PearlErrorPreview'], mods: [fillSize, bg('#FFFFFF')], kids: [
    N({ name: 'PearlHeader', file: MENU, line: 52, module: ':feature:menu', b: [0, 0, 600, 360], mods: [fill, { name: 'height', value: '216.dp', sizes: ['height'] }, bg('#0E6B4F')], kids: [
      icon('Search', 58, 40),
      text('Pearl', MENU, 61, [268, 60, 332, 90]),
      icon('Cart', 64, 480),
      N({ name: 'Column', file: MENU, line: 70, b: [40, 145, 370, 295], mods: [{ name: 'padding', value: '24, 0, 0, 0' }], kids: [text('Hi, Jamie', MENU, 72, [40, 148, 137, 175]), text("What's your sip today?", MENU, 74, [40, 185, 370, 292])] }),
    ] }),
    N({ name: 'FilterRow', file: MENU, line: 96, module: ':feature:menu', b: [0, 393, 600, 453], mods: [fill, { name: 'padding', value: '24, 0, 24, 0' }], kids: [chip('All', 40, 113), chip('Fruit tea', 131, 258), chip('Milk tea', 272, 399), chip('Matcha', 413, 535)] }),
    N({ name: 'LazyVerticalGrid', file: MENU, line: 104, b: [40, 480, 560, 1300], mods: [fillSize, { name: 'padding', value: '24, 0, 24, 0' }], kids: [
      drink(40, 480, 'Taro Milk Tea', '$5.50'), drink(311, 480, 'Thai Milk Tea', '$5.30'),
      drink(40, 791, 'Matcha Latte', '$5.50'), drink(311, 791, 'Strawberry Yogurt', '$5.80'),
    ] }),
  ] }),
] });

// 긴 사슬 — 나우인안드로이드 화면 트리를 프로젝트 소스 · 크기 있는 노드로 좁힌 조상 19칸 아래의 AsyncImage(깊이 20)다. 그림 좌표가 없어 상태 카드에만 쓴다.
const NEWS = '/Users/me/nowinandroid/core/ui/src/main/kotlin/com/google/samples/apps/nowinandroid/core/ui/NewsResourceCard.kt';
const niaModule: Record<string, string> = { NiaTheme: ':core:designsystem', NiaBackground: ':core:designsystem', NiaGradientBackground: ':core:designsystem', NiaApp: ':app', NiaNavigationSuiteScaffold: ':core:designsystem', NiaNavHost: ':app', ForYouScreen: ':feature:foryou', newsFeed: ':core:ui', NewsResourceCardExpanded: ':core:ui', NewsResourceHeaderImage: ':core:ui' };
export const asyncImage = N({ name: 'AsyncImage', file: NEWS, line: 214, size: [331.4, 180],
  mods: [fill, { name: 'height', value: '180.dp', sizes: ['height'] }, { name: 'clip' }, bg('#6750A4'), { name: 'semantics' }, { name: 'graphicsLayer' }, { name: 'drawBehind' }, { name: 'paint' }],
  kids: [N({ name: 'Image', file: NEWS, line: 230, size: [331.4, 180], mods: [fillSize] })] });
export const nia = ['NiaTheme', 'NiaBackground', 'NiaGradientBackground', 'NiaApp', 'NiaNavigationSuiteScaffold', 'Scaffold', 'Column', 'NiaNavHost', 'NavHost', 'ForYouScreen', 'Box', 'LazyVerticalStaggeredGrid', 'newsFeed', 'NewsResourceCardExpanded', 'Card', 'Column', 'Row', 'NewsResourceHeaderImage', 'Box']
  .reduceRight<Node>((inner, name, i) => N({ name, file: NEWS, line: 40 + i * 7, module: niaModule[name], size: [412, 600 - i * 20], mods: [fill], kids: [inner], previews: i === 9 ? ['ForYouScreenPopulatedFeed'] : undefined }), asyncImage);

/** 한 트리의 고를 수 있는 노드 — 뷰어의 flatten 처럼 트리 순서 id 와 조상 id 를 붙인다. bounds 는 그림 px(긴 사슬은 dp 를 px 로 둔다). */
export type Picked = TreeHit & { node: Node };
export function flat(root: Node): Picked[] {
  const out: Picked[] = [];
  const walk = (n: Node, ups: number[]) => {
    const id = out.length, bounds = n.b ? [...n.b] : [0, 0, n.size![0], n.size![1]];
    out.push({ id, ups, name: n.name, fileName: n.file.slice(n.file.lastIndexOf('/') + 1), lineNumber: n.line, bounds, mods: n.mods, node: n });
    for (const k of n.kids) walk(k, ups.concat([id]));
  };
  walk(root, []);
  return out;
}
export const find = (list: Picked[], name: string, nth = 0) => list.filter(n => n.name === name)[nth];
export const rectOf = (n: Picked) => n.node.b ? { left: n.bounds[0] * PX, top: n.bounds[1] * PX, width: (n.bounds[2] - n.bounds[0]) * PX, height: (n.bounds[3] - n.bounds[1]) * PX } : null;
/** 누른 점(그림 px)을 품은 가장 작은 노드 — 그림의 가리키기와 같다. */
export function hit(list: Picked[], x: number, y: number): Picked | null {
  const inside = list.filter(n => n.node.b && x >= n.bounds[0] && x < n.bounds[2] && y >= n.bounds[1] && y < n.bounds[3]);
  return inside.sort((a, b) => (a.bounds[2] - a.bounds[0]) * (a.bounds[3] - a.bounds[1]) - (b.bounds[2] - b.bounds[0]) * (b.bounds[3] - b.bounds[1]) || b.ups.length - a.ups.length)[0] ?? null;
}

/** 출처와 Preview 는 데몬의 색인이 정한다 — 스토리는 트리에 손으로 붙인 모듈 · Preview 이름으로 같은 모양의 색인을 짓는다. */
function indexFor(list: Picked[]): PreviewIndex {
  const modules = new Map(list.filter(n => n.node.module).map(n => [n.name!, n.node.module!]));
  const callers = new Map(list.filter(n => n.node.previews).map(n => [n.name!, n.node.previews!.map(fn => ({ file: `${repo}/app/src/main/kotlin/Previews.kt`, rel: 'app/src/main/kotlin/Previews.kt', fn }))]));
  return { modules, callers };
}

/** 노드 하나를 가리켰을 때 카드가 받는 것 — 뷰어의 point.ts showCard 와 같은 함수로 짓는다. 긴 사슬은 크기가 dp 라 밀도 1 이다. */
export function cardOf(list: Picked[], here: Picked, { copied = true, bare = false, msg }: { copied?: boolean; bare?: boolean; msg?: string } = {}): PointCardData {
  const index = bare ? null : indexFor(list), name = here.name;
  const say: PointSay = msg ? { msg } : { msg: null, ref: `@${here.node.file}#L${here.lineNumber}`, file: here.node.file, copied, again: copied ? undefined : () => {} };
  const origin: CardOrigin = index ? (index.modules.has(name!) ? { module: index.modules.get(name!)! } : 'compose') : null;
  return {
    node: { ...here, uchain: [...here.ups.map(id => list[id].name!), name!] }, say,
    box: boxOf(here, here.node.b ? PX : 1), tree: bare ? null : treeOf(list, here), modifiers: bare ? null : here.mods,
    previews: previewsOf(name, index, { file: null, fn: null }), origin,
  };
}
