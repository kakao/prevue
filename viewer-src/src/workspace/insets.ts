// 인셋 배지가 몸체의 어느 쪽에 서는가 — InsetMarks 가 이 규칙으로 배지를 달고, 장면(resize.ts 의 insetBelow)이 같은 규칙으로 그 자리를 비울지 묻는다.
import type { DeviceInsets } from '../state';

export const INSET_KINDS = ['statusBars', 'navigationBars', 'captionBar', 'displayCutout', 'systemOverlays'] as const;
export const EDGES = ['top', 'right', 'bottom', 'left'] as const;
export type Kind = typeof INSET_KINDS[number];
export type Edge = typeof EDGES[number];
export type Side = 'right' | 'bottom' | 'left' | 'top';

/** 컷아웃은 눈금(#ruler) 바깥 — 위 · 아래 변의 띠는 왼쪽, 왼쪽 · 오른쪽 변의 띠는 위. 나머지 종류는 위 · 아래 변의 띠는 오른쪽, 왼쪽 · 오른쪽 변의 띠는 아래. */
export function sideOf(kind: Kind, edge: Edge): Side {
  const vertical = edge === 'top' || edge === 'bottom';
  if (kind === 'displayCutout') return vertical ? 'left' : 'top';
  return vertical ? 'right' : 'bottom';
}

/** 몸체 아래 줄에 배지가 서는지 — 서면 장면이 조작 독 위로 그 줄의 자리를 비운다. */
export const marksBelow = (insets: DeviceInsets | null | undefined) =>
  !!insets && INSET_KINDS.some(k => EDGES.some(e => sideOf(k, e) === 'bottom' && insets.values[k][e] > 0));
