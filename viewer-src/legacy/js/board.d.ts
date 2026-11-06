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
export function reveal(file: string, fn: string | null): void;
export function cancelReveal(): void;
export function applyReveal(): void;
export function cardAt(index: number | null): HTMLElement | null;
export function returnCard(index: number | null): HTMLElement | null;
export function cardStage(card: HTMLElement | null): HTMLElement | null;
export function stuckHead(el: HTMLElement | null): number | null;
export function ringCard(card: HTMLElement | null): void;
