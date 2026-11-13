import type { ContractState } from './contract-state';

export type Message = string | { t: string; a?: { [key: string]: Message | number | boolean | null } };

// 예제에 없는 실행 상태는 BrowserState·BrowserMapper의 계약으로 보완한다.
type DpSize = { widthDp: number; heightDp: number };
type InsetEdges = { left: number; top: number; right: number; bottom: number };
export type DeviceInsetProfile = {
  safeArea: InsetEdges | null;
  measured: { statusBars: InsetEdges; navigationBars: InsetEdges; captionBar: InsetEdges; displayCutout: InsetEdges } | null;
  evidence: { source: string; kind: string; sourceUrl: string; capturedAt: string | null; conditions: Record<string, string> } | null;
};
export type Size = DpSize & (
  { kind: 'preset' | 'custom'; preset: string | null } |
  { kind: 'device'; device: string; name: string; folded: boolean; landscape: boolean; hingeDp: number | null; dpi: number;
    orientation?: 'portrait' | 'landscape-left' | 'landscape-right'; widthPx?: number; heightPx?: number; insetProfile?: DeviceInsetProfile }
);
type ContractBoard = NonNullable<ContractState['board']>;
type ContractCard = ContractBoard['groups'][number]['cards'][number];
export type Card = Omit<ContractCard, 'ok' | 'imageUrl' | 'treeUrl' | 'failure' | 'widthDp' | 'heightDp' | 'specs'> & {
  ok: boolean | null;
  imageUrl: string | null;
  treeUrl: string | null;
  failure: Message | null;
  widthDp: number | null;
  heightDp: number | null;
  specs: Array<{ kind: string; text: Message }>;
};
export type Board = Omit<ContractBoard, 'groups'> & {
  groups: Array<Omit<ContractBoard['groups'][number], 'cards'> & { cards: Card[] }>;
};
/**
 * 한 장의 시스템 UI — choice 는 고른 값, annotated 는 소스의 showSystemUi, shown 은 지금 바를 그리는가. 인터랙티브가 아니면 null.
 * bars 는 그리는 바 — insets 가 없으면(aosp) 렌더러의 Preview 기본 바, 있으면(기기의 ios · pixel · oneui) 그 높이로 뷰어가 덧그리는 바다.
 */
export type BarInsets = { statusDp: number; navDp: number; source: string; kind: string; sourceUrl: string };
export type SystemUi = { choice: string; annotated: boolean; shown: boolean; bars?: { look: string; insets: BarInsets | null } | null };
export type DeviceInsets = {
  posture: string; basisPosture: string;
  values: { statusBars: InsetEdges; navigationBars: InsetEdges; captionBar: InsetEdges; displayCutout: InsetEdges; systemOverlays: InsetEdges };
  evidence: { source: string; sourceUrl: string; kind: string } };
export type Focus = Omit<NonNullable<ContractState['focus']>, 'size' | 'postures' | 'pxPerDp' | 'systemUi' | 'deviceInsets'> & {
  pxPerDp: number | null;
  size: Size | null;
  systemUi: SystemUi | null;
  deviceInsets?: DeviceInsets | null;
  postures: Array<{ size: Size | (DpSize & { kind: 'original'; preset: string }); imageUrl: string }>;
};
export type ViewerState = Omit<ContractState, 'screen' | 'header' | 'board' | 'focus' | 'stale' | 'boardNote' | 'who' | 'error' | 'settle' | 'vacant' | 'timing' | 'tabs'> & {
  boot?: string;
  screen: 'empty' | 'board' | 'focus' | 'vacant';
  header: Omit<ContractState['header'], 'branch' | 'sourceSet'> & { branch: string | null; sourceSet: string | null };
  board: Board | null;
  focus: Focus | null;
  stale: Array<{ head: Message; why: Message[] }>;
  boardNote: Message | null;
  who: Message | null;
  error: Message | null;
  settle: Message | null;
  vacant: Message | null;
  timing: Array<Omit<ContractState['timing'][number], 'label'> & { label: Message }>;
  tabs: Array<Omit<ContractState['tabs'][number], 'module' | 'sourceSet'> & { module: string | null; sourceSet: string | null }>;
};

/** 지금 보는 파일 — 활성 탭, 탭이 없으면 보드의 파일. 빠른 열기와 카드의 Preview 점프가 "지금 탭이면 데몬에 묻지 않는다"를 가른다. */
export const activeKey = (st: ViewerState | null) => { const t = (st?.tabs || []).find(t => t.active); return t ? t.key : st?.board?.file ?? null; };

export function findCard(board: Board | null | undefined, index: number | null | undefined): Card | null {
  if (!board || index == null) return null;
  for (const group of board.groups) for (const card of group.cards) if (card.index === index) return card;
  return null;
}
