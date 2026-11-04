import type { Board } from '../../src/state';

export type BoardMarks = { cursor: number | null; returned: number | null };
export function boardMarks(): BoardMarks;
export function subscribeBoard(listener: () => void): () => void;
export const trees: Map<string, unknown[]>;
export function clearTrees(): void;
export function syncBoard(board: Board | null): void;
export function setCursor(index: number): void;
export function moveCursor(direction: number): void;
export function onRelayout(relayout: () => void): void;
