// 스토리의 재료 — pearl 0번 그림(600×1300px = 360×780dp)의 노드 트리를 눈으로 잡아 본뜬 것이다. 실제로는 데몬이 준 ViewInfo 트리의 bounds 와
// LayoutInfo.getModifierInfo() 의 체인을 쓴다. 그림은 360px 로 보이므로 px 좌표 × 0.6 이 곧 화면 px 이자 dp 다.
import type { TagSay } from '../../viewer-src/src/workspace/view';
import type { CardBox, CardModifier, CardOrigin, CardPreview, CardRow, CardTree } from './PointCard';
import type { Rect } from './PointFloat';

export type Node = {
  id: string; name: string; file: string; line: number; module?: string;
  /** 그림 px 좌표 [왼 · 위 · 오른 · 아래] — 그림이 없는 사슬(긴 사슬)은 비운다 */
  b?: readonly [number, number, number, number];
  mods: CardModifier[]; kids: Node[]; previews?: string[]; pad?: readonly [number, number, number, number]; box?: CardBox;
};
export const SHOT = { width: 360, height: 780 };
const PX = SHOT.width / 600;
const repo = '/Users/me/pearl';
const MENU = `${repo}/feature/menu/src/main/kotlin/com/example/pearl/feature/menu/PearlScreen.kt`;
const CARD = `${repo}/core/ui/src/main/kotlin/com/example/pearl/core/ui/DrinkCard.kt`;
const THEME = `${repo}/core/designsystem/src/main/kotlin/com/example/pearl/core/designsystem/PearlTheme.kt`;
export const REPO = repo;

let seq = 0;
type Spec = Omit<Node, 'id' | 'kids' | 'mods'> & { mods?: CardModifier[]; kids?: Node[] };
const N = (spec: Spec): Node => ({ ...spec, id: `n${seq++}`, mods: spec.mods ?? [], kids: spec.kids ?? [] });

const fill: CardModifier = { name: 'fillMaxWidth', sizes: ['width'] };
const fillSize: CardModifier = { name: 'fillMaxSize', sizes: ['width', 'height'] };
const wrap: CardModifier = { name: 'wrapContent', sizes: ['width', 'height'] };
/** 그린 앱의 색이라 역할 이름이 아니다 — 데몬이 준 값을 그대로 견본으로 쓴다. */
const bg = (hex: string): CardModifier => ({ name: 'background', value: hex, color: hex });
const text = (s: string, file: string, line: number, b: Node['b'], module?: string) => N({ name: 'Text', file, line, b, module, mods: [wrap, { name: 'text', value: `"${s}"` }, { name: 'maxLines', value: '1' }] });

const drink = (x: number, y: number, name: string, price: string) => N({
  name: 'DrinkCard', file: CARD, line: 73, module: ':core:ui', b: [x, y, x + 250, y + 290], previews: ['DrinkCardPreview'],
  mods: [fill, { name: 'aspectRatio', value: '0.86', sizes: ['height'] }, { name: 'clickable', value: `"${name}"` }, bg('#F6F6F5')],
  kids: [
    N({ name: 'Image', file: CARD, line: 80, b: [x, y, x + 250, y + 200], mods: [fill, { name: 'height', value: '120.dp', sizes: ['height'] }, { name: 'clip', value: 'RoundedCornerShape(16.dp)' }] }),
    N({ name: 'Column', file: CARD, line: 88, b: [x, y + 200, x + 250, y + 290], pad: [12, 10, 12, 12], mods: [{ name: 'padding', value: '12, 10, 12, 12' }, fill], kids: [
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
      N({ name: 'Column', file: MENU, line: 70, b: [40, 145, 370, 295], pad: [24, 0, 0, 0], mods: [{ name: 'padding', value: '24, 0, 0, 0' }], kids: [text('Hi, Jamie', MENU, 72, [40, 148, 137, 175]), text("What's your sip today?", MENU, 74, [40, 185, 370, 292])] }),
    ] }),
    N({ name: 'FilterRow', file: MENU, line: 96, module: ':feature:menu', b: [0, 393, 600, 453], pad: [24, 0, 24, 0], mods: [fill, { name: 'padding', value: '24, 0, 24, 0' }], kids: [chip('All', 40, 113), chip('Fruit tea', 131, 258), chip('Milk tea', 272, 399), chip('Matcha', 413, 535)] }),
    N({ name: 'LazyVerticalGrid', file: MENU, line: 104, b: [40, 480, 560, 1300], mods: [fillSize, { name: 'padding', value: '24, 0, 24, 0' }], kids: [
      drink(40, 480, 'Taro Milk Tea', '$5.50'), drink(311, 480, 'Thai Milk Tea', '$5.30'),
      drink(40, 791, 'Matcha Latte', '$5.50'), drink(311, 791, 'Strawberry Yogurt', '$5.80'),
    ] }),
  ] }),
] });

// 깊이 22 — 나우인안드로이드 화면 트리를 프로젝트 소스 · 크기 있는 노드로 좁힌 깊이다. 그림 좌표가 없어 States 에만 쓴다.
const NEWS = '/Users/me/nowinandroid/core/ui/src/main/kotlin/com/google/samples/apps/nowinandroid/core/ui/NewsResourceCard.kt';
const niaModule: Record<string, string> = { NiaTheme: ':core:designsystem', NiaBackground: ':core:designsystem', NiaGradientBackground: ':core:designsystem', NiaApp: ':app', NiaNavigationSuiteScaffold: ':core:designsystem', NiaNavHost: ':app', ForYouScreen: ':feature:foryou', newsFeed: ':core:ui', NewsResourceCardExpanded: ':core:ui', NewsResourceHeaderImage: ':core:ui' };
export const asyncImage = N({ name: 'AsyncImage', file: NEWS, line: 214, box: { width: 331.4, height: 180 },
  mods: [fill, { name: 'height', value: '180.dp', sizes: ['height'] }, { name: 'clip', value: 'RoundedCornerShape(12.dp)' }, bg('#6750A4'), { name: 'semantics' }, { name: 'graphicsLayer' }, { name: 'drawBehind' }, { name: 'paint' }],
  kids: [N({ name: 'Image', file: NEWS, line: 230, box: { width: 331.4, height: 180 }, mods: [fillSize] })] });
export const nia = ['NiaTheme', 'NiaBackground', 'NiaGradientBackground', 'NiaApp', 'NiaNavigationSuiteScaffold', 'Scaffold', 'Column', 'NiaNavHost', 'NavHost', 'ForYouScreen', 'Box', 'LazyVerticalStaggeredGrid', 'newsFeed', 'NewsResourceCardExpanded', 'Card', 'Column', 'Row', 'NewsResourceHeaderImage', 'Box']
  .reduceRight<Node>((inner, name, i) => N({ name, file: NEWS, line: 40 + i * 7, module: niaModule[name], box: { width: 412, height: 600 - i * 20 }, mods: [fill], kids: [inner], previews: i === 9 ? ['ForYouScreenPopulatedFeed'] : undefined }), asyncImage);

export const flat = (n: Node): Node[] => [n, ...n.kids.flatMap(flat)];
export const find = (root: Node, name: string, nth = 0) => flat(root).filter(n => n.name === name)[nth];
function chain(n: Node, target: Node, path: Node[] = []): Node[] | null {
  if (n === target) return [...path, n];
  for (const k of n.kids) { const r = chain(k, target, [...path, n]); if (r) return r; }
  return null;
}
export const rectOf = (n: Node): Rect | null => n.b ? { left: n.b[0] * PX, top: n.b[1] * PX, width: (n.b[2] - n.b[0]) * PX, height: (n.b[3] - n.b[1]) * PX } : null;
/** 누른 점(그림 px)을 품은 가장 깊은 노드 — 그림의 가리키기와 같다. */
export function hit(n: Node, x: number, y: number): Node | null {
  if (!n.b || x < n.b[0] || x > n.b[2] || y < n.b[1] || y > n.b[3]) return null;
  for (const k of n.kids) { const h = hit(k, x, y); if (h) return h; }
  return n;
}
export const toShot = (x: number, y: number) => [x / PX, y / PX] as const;

const row = (n: Node): CardRow => ({ id: n.id, name: n.name });
/** 노드 하나를 가리켰을 때 카드가 받는 것 — 연결할 때 데몬이 같은 모양을 준다. */
export function cardOf(root: Node, here: Node, { copied = true }: { copied?: boolean } = {}) {
  const path = chain(root, here)!, ups = path.slice(0, -1), parent = ups[ups.length - 1], kin = parent ? parent.kids : [], i = kin.indexOf(here);
  const tree: CardTree = { ups: ups.map(row), here: row(here), before: kin.slice(0, i).map(row), after: kin.slice(i + 1).map(row), downs: here.kids.map(row) };
  const r = rectOf(here), padding = here.pad;
  const box: CardBox = here.box ?? { width: r?.width ?? 0, height: r?.height ?? 0, padding };
  const origin: CardOrigin = here.module ? { module: here.module } : 'compose';
  const previews: CardPreview[] = (here.previews || []).map(p => ({ id: p, name: p }));
  const say: TagSay = { msg: null, ref: `@${here.file}#L${here.line}`, file: here.file, copied };
  return { node: { name: here.name, fileName: here.file.slice(here.file.lastIndexOf('/') + 1), lineNumber: here.line, bounds: [0, 0, 1, 1] }, box, modifiers: here.mods, tree, previews, origin, say, repo: REPO };
}
export const byId = (root: Node, id: string) => flat(root).find(n => n.id === id) ?? null;
