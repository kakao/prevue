export const reduced: MediaQueryList;
export function motionToken(name: string): string;
export function motionMs(name: string): number;
export function swapImage(img: HTMLImageElement, url: string): void;
export function transition(update: () => void, done?: (() => void) | null, options?: { workspace?: boolean; image?: HTMLImageElement | null }): void;
export function transitioning(): boolean;
export function freeze(img: HTMLImageElement): Promise<unknown>;
export function hold(): () => void;
export const MORPH_LEAD: number;
type Rect = { x: number; y: number; width: number; height: number };
export function frameMorph(options: { from: Rect; to(): Rect; radius: [number, number]; shadow: [string, string]; a: string; b?: string | null; swapAt?: number; swapMs?: number; ceiling?: (() => number | null) | null }): {
  el: HTMLElement; landed: Promise<void>; finish(ms?: number): void; cancel(): void;
};
