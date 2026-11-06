import type { ContractState } from './contract-state';

export type Message = string | { t: string; a?: { [key: string]: Message | number | boolean | null } };

// 예제에 없는 실행 상태는 BrowserState·BrowserMapper의 계약으로 보완한다.
type DpSize = { widthDp: number; heightDp: number };
export type Size = DpSize & (
  { kind: 'preset' | 'custom'; preset: string | null } |
  { kind: 'device'; device: string; name: string; folded: boolean; half?: boolean; landscape: boolean; hingeDp: number | null; dpi: number }
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
export type Focus = Omit<NonNullable<ContractState['focus']>, 'size' | 'postures' | 'pxPerDp'> & {
  pxPerDp: number | null;
  size: Size | null;
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
