import type { ViewerState } from '../../src/state';

export const store: { st: ViewerState | null; projectFiles: Map<string, string[]> };
export function cardOf(index: number | null): import('../../src/state').Card | null;
